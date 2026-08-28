import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Unit tests for the AI orchestration layer.
 *
 * Covers the five required scenarios:
 *  1. Entitlement denial (feature not on plan / credits exhausted)
 *  2. Cross-tenant denial (user not a member of the org)
 *  3. Malformed model output (fails Zod validation)
 *  4. Usage exhaustion (monthly AI credits used up)
 *  5. Provider failure (upstream error is sanitized)
 *
 * The orchestrator's dependencies (db, organizations, entitlements, rate
 * limiter, provider) are all mocked so the tests run hermetically.
 */

const h = vi.hoisted(() => {
  const state = {
    // Membership
    membershipRoles: new Map<string, string | null>(),
    // Entitlement snapshots keyed by org id.
    snapshots: new Map<
      string,
      {
        plan: string
        seatsLimit: number
        aiCreditsMonthly: number
        aiCreditsUsed: number
        modules: string[]
        status: string
        demoExpiresAt: Date | null
        currentPeriodEnd: Date | null
        trialEnd: Date | null
        cancelAtPeriodEnd: boolean
      }
    >(),
    // Rate limiter
    rateAllowed: true,
    rateRemaining: 19,
    // Provider
    providerContent: '{"summary":"ok","fitScore":80,"redFlags":[],"suggestedResponse":"yes"}',
    providerUsage: { inputTokens: 10, outputTokens: 5 },
    providerModel: 'gpt-4o-mini',
    providerError: null as Error | null,
    // ai_runs + audit + usage persistence
    aiRuns: [] as Array<Record<string, unknown>>,
    auditLogs: [] as Array<Record<string, unknown>>,
    usageEvents: [] as Array<Record<string, unknown>>,
    entitlementUpdates: [] as Array<{ organizationId: string; increment: number }>,
  }
  return state
})

vi.mock('../../db', () => ({
  prismaAuth: {
    aiRun: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const record = { id: `run-${h.aiRuns.length + 1}`, ...data }
        h.aiRuns.push(record)
        return record
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const run = h.aiRuns.find((r) => r.id === where.id)
        if (run) Object.assign(run, data)
        return run
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        h.auditLogs.push(data)
        return undefined
      }),
    },
    usageEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        h.usageEvents.push(data)
        return undefined
      }),
    },
    entitlement: {
      update: vi.fn(async ({ where, data }: { where: { organizationId: string }; data: { aiCreditsUsed: { increment: number } } }) => {
        h.entitlementUpdates.push({ organizationId: where.organizationId, increment: data.aiCreditsUsed.increment })
        return undefined
      }),
    },
  },
}))

vi.mock('../../organizations', () => ({
  getMembershipRole: vi.fn(async (userId: string, organizationId: string) =>
    h.membershipRoles.get(`${userId}:${organizationId}`) ?? null,
  ),
}))

vi.mock('../../billing/entitlements', () => ({
  getEntitlementSnapshot: vi.fn(async (organizationId: string) => {
    const snap = h.snapshots.get(organizationId)
    return snap ? { ...snap } : null
  }),
  decide: vi.fn((snapshot: { status: string; modules: string[]; aiCreditsUsed: number; aiCreditsMonthly: number }, feature: string) => {
    if (snapshot.status === 'demo_expired') return { allowed: false, reason: 'Your demo has expired.' }
    if (!snapshot.modules.includes(feature)) return { allowed: false, reason: 'Feature not on your plan.' }
    if (snapshot.aiCreditsUsed >= snapshot.aiCreditsMonthly) return { allowed: false, reason: 'AI credits exhausted.' }
    return { allowed: true, reason: null }
  }),
}))

vi.mock('../rate-limit', () => ({
  getRateLimiter: () => ({
    check: vi.fn(async () => ({
      allowed: h.rateAllowed,
      remaining: h.rateRemaining,
      resetsAt: Date.now() + 60_000,
    })),
    reset: vi.fn(async () => undefined),
  }),
}))

vi.mock('../providers/registry', () => ({
  getActiveProviderKey: () => 'mock',
  completeWithActiveProvider: vi.fn(async () => {
    if (h.providerError) throw h.providerError
    return {
      content: h.providerContent,
      usage: h.providerUsage,
      model: h.providerModel,
      finishReason: 'stop',
    }
  }),
}))

import { runAiAction } from '../orchestrator'
import { AiError, toSafeError } from '../errors'
import { ProviderError } from '../provider'
import { z } from 'zod'
// Side-effect: register built-in prompt templates.
import '../prompts/templates'

const OUTPUT_SCHEMA = z.object({
  summary: z.string(),
  fitScore: z.number(),
  redFlags: z.array(z.string()),
  suggestedResponse: z.string(),
})

const CTX = { userId: 'user-1', organizationId: 'org-1' }
const INPUT = {
  opportunityTitle: 'Test Deal',
  brandName: 'Brand',
  payout: 500,
  sport: 'Basketball',
  description: 'Great deal',
  deadline: '2026-12-01',
}

function setSnapshot(orgId: string, overrides: Partial<NonNullable<ReturnType<typeof Object>> & Record<string, unknown>> = {}) {
  h.snapshots.set(orgId, {
    plan: 'STARTER',
    seatsLimit: 1,
    aiCreditsMonthly: 250,
    aiCreditsUsed: 0,
    modules: ['opportunity.summary', 'media-kit.bio', 'deals.review'],
    status: 'active',
    demoExpiresAt: null,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  } as never)
}

beforeEach(() => {
  h.membershipRoles.clear()
  h.snapshots.clear()
  h.aiRuns = []
  h.auditLogs = []
  h.usageEvents = []
  h.entitlementUpdates = []
  h.rateAllowed = true
  h.rateRemaining = 19
  h.providerContent = '{"summary":"ok","fitScore":80,"redFlags":[],"suggestedResponse":"yes"}'
  h.providerUsage = { inputTokens: 10, outputTokens: 5 }
  h.providerModel = 'gpt-4o-mini'
  h.providerError = null
  // Default happy-path setup.
  h.membershipRoles.set('user-1:org-1', 'OWNER')
  setSnapshot('org-1')
})

describe('AI orchestrator — entitlement denial', () => {
  it('rejects when the feature is not on the plan', async () => {
    setSnapshot('org-1', { modules: ['media-kit.bio'] })
    await expect(
      runAiAction({
        context: CTX,
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'entitlement_denied' })
  })

  it('does not create an ai_runs record on entitlement denial', async () => {
    setSnapshot('org-1', { modules: [] })
    await expect(
      runAiAction({
        context: CTX,
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toThrow()
    expect(h.aiRuns).toHaveLength(0)
  })
})

describe('AI orchestrator — cross-tenant denial', () => {
  it('rejects when the user is not a member of the organization', async () => {
    h.membershipRoles.delete('user-1:org-1')
    // user-1 is NOT a member of org-2 (no entry set).
    setSnapshot('org-2')
    await expect(
      runAiAction({
        context: { userId: 'user-1', organizationId: 'org-2' },
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
    expect(h.aiRuns).toHaveLength(0)
  })

  it('rejects when querying another org even if a member of a different one', async () => {
    h.membershipRoles.set('user-1:org-1', 'OWNER')
    h.membershipRoles.set('user-1:org-2', null) // explicitly not a member
    setSnapshot('org-1')
    setSnapshot('org-2')
    await expect(
      runAiAction({
        context: { userId: 'user-1', organizationId: 'org-2' },
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'forbidden' })
  })
})

describe('AI orchestrator — malformed model output', () => {
  it('fails when the provider returns non-JSON', async () => {
    h.providerContent = 'this is not json'
    await expect(
      runAiAction({
        context: CTX,
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'invalid_output' })
    // The run should be marked FAILED with the error captured.
    const failedRun = h.aiRuns.find((r) => r.status === 'FAILED')
    expect(failedRun).toBeDefined()
  })

  it('fails when the JSON does not match the schema', async () => {
    h.providerContent = '{"summary":"ok"}' // missing required fields
    await expect(
      runAiAction({
        context: CTX,
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'invalid_output' })
    expect(h.auditLogs.some((log) => log.action === 'AI_RUN_FAILED')).toBe(true)
  })
})

describe('AI orchestrator — usage exhaustion', () => {
  it('rejects when monthly AI credits are exhausted', async () => {
    setSnapshot('org-1', { aiCreditsMonthly: 100, aiCreditsUsed: 100 })
    await expect(
      runAiAction({
        context: CTX,
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'entitlement_denied' })
    expect(h.aiRuns).toHaveLength(0)
  })

  it('allows when credits are one below the limit', async () => {
    setSnapshot('org-1', { aiCreditsMonthly: 100, aiCreditsUsed: 99 })
    const result = await runAiAction({
      context: CTX,
      featureKey: 'opportunity.summary',
      input: INPUT,
      outputSchema: OUTPUT_SCHEMA,
    })
    expect(result.output).toBeDefined()
    expect(h.entitlementUpdates).toHaveLength(1)
    expect(h.entitlementUpdates[0].increment).toBe(1)
  })
})

describe('AI orchestrator — provider failure', () => {
  it('sanitizes a provider error and marks the run FAILED', async () => {
    h.providerError = new ProviderError('auth', 'OpenAI authentication failed: sk-xxx', {
      upstreamMessage: 'Invalid API key sk-proj-SECRET123',
    })
    await expect(
      runAiAction({
        context: CTX,
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'provider_failure' })
    const failedRun = h.aiRuns.find((r) => r.status === 'FAILED')
    expect(failedRun).toBeDefined()
    // The stored error must not contain the secret.
    const stored = JSON.stringify(failedRun?.outputRef)
    expect(stored).not.toContain('sk-proj-SECRET123')
  })

  it('toSafeError never leaks upstream messages', () => {
    const providerError = new ProviderError('unknown', 'internal: connection reset by peer', {
      upstreamMessage: 'ECONNRESET at 10.0.0.5:443',
    })
    const safe = toSafeError(providerError)
    expect(safe.message).not.toContain('ECONNRESET')
    expect(safe.message).not.toContain('10.0.0.5')
    expect(safe.status).toBe(502)
  })
})

describe('AI orchestrator — happy path', () => {
  it('returns the validated output and records usage + audit', async () => {
    const result = await runAiAction({
      context: CTX,
      featureKey: 'opportunity.summary',
      input: INPUT,
      outputSchema: OUTPUT_SCHEMA,
    })
    expect(result.output.summary).toBe('ok')
    expect(result.output.fitScore).toBe(80)
    expect(result.usage.inputTokens).toBe(10)
    expect(result.usage.outputTokens).toBe(5)
    expect(h.usageEvents).toHaveLength(1)
    expect(h.auditLogs.some((log) => log.action === 'AI_RUN_SUCCEEDED')).toBe(true)
    const succeededRun = h.aiRuns.find((r) => r.status === 'SUCCEEDED')
    expect(succeededRun).toBeDefined()
  })

  it('flags high-risk features for review', async () => {
    h.providerContent = JSON.stringify({
      riskLevel: 'medium',
      issues: ['missing termination clause'],
      recommendations: ['add exclusivity window'],
      complianceNotes: ['verify state NIL law'],
    })
    const result = await runAiAction({
      context: CTX,
      featureKey: 'deals.review',
      input: {
        dealTitle: 'D',
        brandName: 'B',
        athleteName: 'A',
        amount: 1000,
        deliverables: 3,
        startDate: '2026-09-01',
        endDate: '2026-12-01',
      },
      outputSchema: z.object({
        riskLevel: z.enum(['low', 'medium', 'high']),
        issues: z.array(z.string()),
        recommendations: z.array(z.string()),
        complianceNotes: z.array(z.string()),
      }),
    })
    expect(result.reviewRequired).toBe(true)
    expect(result.approvalStatus).toBe('PENDING_REVIEW')
  })
})

describe('AI orchestrator — rate limiting', () => {
  it('rejects when the rate limit is exceeded', async () => {
    h.rateAllowed = false
    await expect(
      runAiAction({
        context: CTX,
        featureKey: 'opportunity.summary',
        input: INPUT,
        outputSchema: OUTPUT_SCHEMA,
      }),
    ).rejects.toMatchObject({ code: 'rate_limited' })
    expect(h.aiRuns).toHaveLength(0)
  })
})
