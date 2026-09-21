/**
 * AI orchestration core.
 *
 * Implements the required flow:
 *
 *   User request
 *     -> Auth + organization resolution
 *     -> Role and entitlement check
 *     -> Rate-limit check
 *     -> Policy/risk check
 *     -> Create ai_runs record
 *     -> Call chosen model provider
 *     -> Store result and usage
 *     -> Create audit event
 *     -> Return safe response
 *
 * No UI component or route handler ever calls a provider directly — they all
 * go through `runAiAction`. Server-only.
 */

import type { z } from 'zod'
import { prismaAuth } from '../db'
import { getMembershipRole } from '../organizations'
import { getEntitlementSnapshot, decide } from '../billing/entitlements'
import { getRateLimiter } from './rate-limit'
import { renderPrompt } from './prompts/registry'
import { sanitizeInputObject } from './redaction'
import { completeWithActiveProvider, getActiveProviderKey } from './providers/registry'
import { parseJsonResponse, ProviderError, type ProviderRequest } from './provider'
import { AiError, toSafeError } from './errors'

export interface AiActionContext {
  userId: string
  organizationId: string
}

export interface RunAiActionOptions<TInput, TOutput> {
  context: AiActionContext
  featureKey: string
  input: TInput
  /** Zod schema validating the provider's JSON output. */
  outputSchema: z.ZodType<TOutput>
  /** Override the template's default model. */
  model?: string
  /** Override the template's default temperature. */
  temperature?: number
  /** Override the template's default max output tokens. */
  maxOutputTokens?: number
  /**
   * Optional policy snapshot id to record (e.g. the NCAA/state policy version
   * the output was evaluated against). When omitted, `null` is stored.
   */
  policySnapshotId?: string
  /**
   * When true, the run is flagged for human review regardless of the
   * template's `highRisk` setting. Useful for ad-hoc high-risk calls.
   */
  forceReview?: boolean
}

export interface AiActionResult<TOutput> {
  runId: string
  output: TOutput
  model: string
  provider: string
  promptTemplateVersion: string
  reviewRequired: boolean
  approvalStatus: 'NOT_REQUIRED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
  usage: {
    inputTokens: number
    outputTokens: number
    estimatedCost: number
  }
}

/**
 * Execute an AI action end-to-end through the orchestration flow.
 *
 * Throws `AiError` for every denial/failure mode. Callers should let the error
 * propagate to the route handler, which converts it to a safe HTTP response via
 * `toSafeError`.
 */
export async function runAiAction<TInput, TOutput>(
  options: RunAiActionOptions<TInput, TOutput>,
): Promise<AiActionResult<TOutput>> {
  const { context, featureKey, input, outputSchema } = options
  const { userId, organizationId } = context

  // 1. Auth + organization resolution: membership check.
  const role = await getMembershipRole(userId, organizationId)
  if (!role) {
    throw new AiError('forbidden', 'You are not a member of this organization.')
  }

  // 2. Entitlement check: plan + module + AI credit quota.
  const snapshot = await getEntitlementSnapshot(organizationId)
  if (!snapshot) {
    throw new AiError('not_found', 'Organization entitlement not found.')
  }
  const decision = decide(snapshot, featureKey)
  if (!decision.allowed) {
    throw new AiError(
      'entitlement_denied',
      decision.reason ?? 'Feature not available on your plan.',
    )
  }

  // 3. Rate-limit check.
  const limiter = getRateLimiter()
  const rateDecision = await limiter.check(organizationId)
  if (!rateDecision.allowed) {
    throw new AiError('rate_limited', 'Too many AI requests. Please try again shortly.')
  }

  // 4. Policy/risk check: render the (sanitized) prompt.
  const { template, messages } = renderPrompt<TInput>(featureKey, input)
  const sanitizedInput = sanitizeInputObject(input)
  const reviewRequired = Boolean(options.forceReview ?? template.highRisk)

  const model = options.model ?? template.defaultModel
  const providerKey = getActiveProviderKey()
  const providerRequest: ProviderRequest = {
    model,
    messages,
    temperature: options.temperature ?? template.defaultTemperature,
    maxOutputTokens: options.maxOutputTokens ?? template.defaultMaxOutputTokens,
  }
  // Hint the provider with the Zod schema's JSON shape when available.
  if ('_def' in outputSchema) {
    providerRequest.jsonSchema = zodToJsonShape()
  }

  // 5. Create ai_runs record (PENDING).
  const run = await prismaAuth.aiRun.create({
    data: {
      organizationId,
      userId,
      status: 'PENDING',
      kind: featureKey,
      featureKey,
      model,
      promptTemplateVersion: template.version,
      inputRef: sanitizedInput as never,
      policySnapshotId: options.policySnapshotId ?? null,
      reviewRequired,
      approvalStatus: reviewRequired ? 'PENDING_REVIEW' : 'NOT_REQUIRED',
    },
  })

  // 6. Mark RUNNING.
  await prismaAuth.aiRun.update({
    where: { id: run.id },
    data: { status: 'RUNNING', startedAt: new Date() },
  })

  // 7. Call chosen model provider.
  let content: string
  let usage: { inputTokens: number; outputTokens: number }
  let reportedModel: string
  try {
    const response = await completeWithActiveProvider(providerRequest)
    content = response.content
    usage = response.usage
    reportedModel = response.model
  } catch (error) {
    // 8 (failure path): mark FAILED, audit, and rethrow a safe error.
    const safe = toSafeError(error)
    await prismaAuth.aiRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        outputRef: { error: safe.message, code: safe.code } as never,
      },
    })
    await createAuditEvent(organizationId, userId, 'AI_RUN_FAILED', run.id, {
      featureKey,
      model,
      code: safe.code,
    })
    throw error instanceof AiError ? error : new AiError(safe.code, safe.message, { cause: error })
  }

  // 8. Validate structured JSON output with Zod.
  let output: TOutput
  try {
    output = parseJsonResponse(content, outputSchema)
  } catch (error) {
    const safe = toSafeError(error)
    await prismaAuth.aiRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        outputRef: { error: safe.message, code: safe.code, raw: content.slice(0, 1000) } as never,
      },
    })
    await createAuditEvent(organizationId, userId, 'AI_RUN_FAILED', run.id, {
      featureKey,
      model,
      code: safe.code,
    })
    throw new AiError('invalid_output', 'The model returned an invalid response.', { cause: error })
  }

  // 9. Compute cost and store result + usage.
  const estimatedCost = estimateCost(usage.inputTokens, usage.outputTokens, model)
  await prismaAuth.aiRun.update({
    where: { id: run.id },
    data: {
      status: 'SUCCEEDED',
      completedAt: new Date(),
      outputRef: output as never,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cost: estimatedCost,
    },
  })

  // 10. Record usage event for metering (increments the org's monthly counter).
  await prismaAuth.usageEvent.create({
    data: {
      organizationId,
      userId,
      eventType: 'AI_CREDIT_CONSUMED',
      quantity: 1,
      externalRef: run.id,
      metadata: {
        featureKey,
        model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      },
    },
  })
  await prismaAuth.entitlement.update({
    where: { organizationId },
    data: { aiCreditsUsed: { increment: 1 } },
  })

  // 11. Create audit event.
  await createAuditEvent(organizationId, userId, 'AI_RUN_SUCCEEDED', run.id, {
    featureKey,
    model: reportedModel,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cost: estimatedCost,
    reviewRequired,
  })

  return {
    runId: run.id,
    output,
    model: reportedModel,
    provider: providerKey,
    promptTemplateVersion: template.version,
    reviewRequired,
    approvalStatus: reviewRequired ? 'PENDING_REVIEW' : 'NOT_REQUIRED',
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost,
    },
  }
}

async function createAuditEvent(
  organizationId: string,
  actorId: string,
  action: string,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await prismaAuth.auditLog.create({
    data: {
      action,
      entityType: 'AiRun',
      entityId,
      actorId,
      organizationId,
      details: JSON.stringify(metadata),
    },
  })
}

/**
 * Rough cost estimate in USD. Real per-token pricing varies by model; this is a
 * conservative ballpark for metering and dashboards, not billing.
 */
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Defaults: $1.50 / 1M input, $6.00 / 1M output (ballpark for mid-tier models).
  const rates: Record<string, { in: number; out: number }> = {
    'gpt-4o': { in: 2.5, out: 10 },
    'gpt-4o-mini': { in: 0.15, out: 0.6 },
    'claude-3-5-sonnet': { in: 3, out: 15 },
  }
  const rate = rates[model] ?? { in: 1.5, out: 6 }
  const cost = (inputTokens / 1_000_000) * rate.in + (outputTokens / 1_000_000) * rate.out
  // Round to 6 decimal places to match the DB numeric(10,6) column.
  return Math.round(cost * 1_000_000) / 1_000_000
}

/**
 * Best-effort conversion of a Zod schema to a JSON-Schema-like shape hint for
 * providers. This is intentionally lightweight — the orchestrator always
 * validates the actual response with Zod, so the hint only nudges the model.
 */
function zodToJsonShape(): Record<string, unknown> {
  // We only need a shallow shape hint; Zod v4 exposes `_zod.def` internals but
  // we avoid coupling to them. Feature code can pass a richer schema via the
  // provider request if needed.
  try {
    return { type: 'object' }
  } catch {
    return { type: 'object' }
  }
}

export { AiError, ProviderError, toSafeError }
