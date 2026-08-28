/**
 * Provider-agnostic AI provider interface.
 *
 * No UI component or route handler ever imports a concrete provider SDK directly.
 * Everything goes through this interface so the orchestration layer can swap
 * providers (OpenAI, Anthropic, a mock, a self-hosted model) without touching
 * feature code.
 *
 * Server-only. Never import from a Client Component.
 */

import type { z } from 'zod'

/**
 * A single message in a provider-agnostic chat completion request.
 */
export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Parameters passed to a provider. The orchestration layer fills these in
 * from the prompt template + feature definition; feature code never builds
 * raw provider requests.
 */
export interface ProviderRequest {
  /** Model identifier, e.g. "gpt-4o-mini" or "claude-3-5-sonnet". */
  model: string
  messages: ProviderMessage[]
  /**
   * When set, the provider should return strict JSON conforming to this shape.
   * Providers that cannot enforce JSON natively should still be instructed to
   * produce JSON; the orchestrator validates the result with Zod.
   */
  jsonSchema?: Record<string, unknown>
  /** Sampling temperature. Defaults are set by the feature, not the caller. */
  temperature?: number
  /** Hard cap on output tokens. */
  maxOutputTokens?: number
}

/**
 * Raw provider response before orchestration-level validation.
 */
export interface ProviderResponse {
  /** The raw text returned by the model (may be JSON-encoded). */
  content: string
  /** Token usage reported by the provider, when available. */
  usage: {
    inputTokens: number
    outputTokens: number
  }
  /** Provider-reported model identifier (may differ from the requested one). */
  model: string
  /** Optional provider-specific finish reason, for telemetry only. */
  finishReason?: string
}

/**
 * Error thrown by a provider when the call itself fails (network, auth, quota,
 * malformed upstream response). The orchestrator catches this and converts it
 * into a safe, sanitized error for the caller.
 */
export class ProviderError extends Error {
  readonly code: ProviderErrorCode
  readonly retryable: boolean
  /** Original upstream message, kept for server logs only — never returned to the client. */
  readonly upstreamMessage?: string

  constructor(
    code: ProviderErrorCode,
    message: string,
    options: { retryable?: boolean; upstreamMessage?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'ProviderError'
    this.code = code
    this.retryable = options.retryable ?? false
    this.upstreamMessage = options.upstreamMessage
  }
}

export type ProviderErrorCode =
  | 'auth'
  | 'rate_limited'
  | 'quota'
  | 'timeout'
  | 'network'
  | 'invalid_response'
  | 'schema_validation'
  | 'unknown'

/**
 * A provider implementation. Registered in `providers/registry.ts`.
 *
 * Implementations MUST:
 *  - Never log or surface API keys.
 *  - Throw `ProviderError` (not raw SDK errors) for all failure modes.
 *  - Report token usage when the upstream API exposes it; otherwise report 0.
 */
export interface AiProvider {
  /** Stable key used in env config and ai_runs.model, e.g. "openai". */
  readonly key: string
  /** Human label for telemetry/admin UI. */
  readonly label: string
  /** Execute a completion request. */
  complete(request: ProviderRequest): Promise<ProviderResponse>
}

/**
 * Helper for provider implementations: parse + validate a JSON response with a
 * Zod schema, throwing a typed `ProviderError` on failure.
 */
export function parseJsonResponse<T>(
  content: string,
  schema: z.ZodType<T>,
): T {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (cause) {
    throw new ProviderError('invalid_response', 'Model output was not valid JSON.', {
      cause,
      upstreamMessage: content.slice(0, 500),
    })
  }
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new ProviderError('schema_validation', 'Model output failed schema validation.', {
      upstreamMessage: JSON.stringify(result.error.issues).slice(0, 1000),
      cause: result.error,
    })
  }
  return result.data
}
