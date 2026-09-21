/**
 * Safe error handling for the AI service layer.
 *
 * The orchestrator and providers throw `AiError` / `ProviderError`. Route
 * handlers convert those to HTTP responses via `toSafeError`, which NEVER
 * exposes provider secrets, API keys, internal stack traces, or upstream
 * error messages. Only a short, user-safe code + message survives.
 *
 * Server-only.
 */

import { ProviderError } from './provider'

export type AiErrorCode =
  | 'forbidden'
  | 'not_found'
  | 'entitlement_denied'
  | 'rate_limited'
  | 'policy_violation'
  | 'invalid_input'
  | 'invalid_output'
  | 'provider_failure'
  | 'unknown'

export interface SafeAiError {
  code: AiErrorCode
  message: string
  /** HTTP status code to return. */
  status: number
}

export class AiError extends Error {
  readonly code: AiErrorCode
  readonly status: number

  constructor(
    code: AiErrorCode,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'AiError'
    this.code = code
    this.status = options.status ?? defaultStatusForCode(code)
  }
}

function defaultStatusForCode(code: AiErrorCode): number {
  switch (code) {
    case 'forbidden':
      return 403
    case 'not_found':
      return 404
    case 'entitlement_denied':
      return 402
    case 'rate_limited':
      return 429
    case 'policy_violation':
      return 403
    case 'invalid_input':
      return 400
    case 'invalid_output':
      return 502
    case 'provider_failure':
      return 502
    default:
      return 500
  }
}

const PROVIDER_CODE_MAP: Record<string, AiErrorCode> = {
  auth: 'provider_failure',
  rate_limited: 'rate_limited',
  quota: 'entitlement_denied',
  timeout: 'provider_failure',
  network: 'provider_failure',
  invalid_response: 'invalid_output',
  schema_validation: 'invalid_output',
  unknown: 'provider_failure',
}

const SAFE_MESSAGES: Partial<Record<AiErrorCode, string>> = {
  provider_failure: 'The AI service is temporarily unavailable. Please try again.',
  invalid_output: 'The AI service returned an unexpected response. Please try again.',
  unknown: 'An unexpected error occurred. Please try again.',
}

/**
 * Convert any error thrown by the orchestrator or a provider into a safe,
 * client-facing error. Provider upstream messages and stack traces are
 * discarded here — they are only available on the server via logs.
 */
export function toSafeError(error: unknown): SafeAiError {
  if (error instanceof AiError) {
    return {
      code: error.code,
      message: SAFE_MESSAGES[error.code] ?? error.message,
      status: error.status,
    }
  }
  if (error instanceof ProviderError) {
    const code = PROVIDER_CODE_MAP[error.code] ?? 'provider_failure'
    return {
      code,
      message:
        SAFE_MESSAGES[code] ?? 'The AI service is temporarily unavailable. Please try again.',
      status: defaultStatusForCode(code),
    }
  }
  // Unknown error: never leak the original message.
  return {
    code: 'unknown',
    message: SAFE_MESSAGES.unknown!,
    status: 500,
  }
}
