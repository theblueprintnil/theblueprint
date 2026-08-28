/**
 * Redaction / sanitization hooks.
 *
 * Before any input leaves the system for an external model provider, it passes
 * through `sanitizeInput`. The default redactor strips obvious PII patterns
 * (emails, phone numbers, credit-card-like numbers, SSN-like patterns) and
 * replaces them with placeholders. Feature code can register custom redactors
 * for domain-specific sensitive data.
 *
 * The orchestrator stores the *sanitized* input reference on `ai_runs.inputRef`
 * — never the raw input — so the audit trail never contains the original PII.
 *
 * Server-only.
 */

export type Redactor = (text: string) => string

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g
// 16+ digit runs (credit cards, account numbers).
const LONG_NUMBER_RE = /\b\d{16,}\b/g
// SSN-like: 123-45-6789
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g

export function defaultRedactor(text: string): string {
  return text
    .replace(EMAIL_RE, '[REDACTED:email]')
    .replace(SSN_RE, '[REDACTED:ssn]')
    .replace(LONG_NUMBER_RE, '[REDACTED:number]')
    .replace(PHONE_RE, '[REDACTED:phone]')
}

const CUSTOM_REDACTORS: Redactor[] = []

export function registerRedactor(redactor: Redactor): void {
  CUSTOM_REDACTORS.push(redactor)
}

export function clearRedactors(): void {
  CUSTOM_REDACTORS.length = 0
}

export function sanitizeInput(text: string): string {
  let sanitized = defaultRedactor(text)
  for (const redactor of CUSTOM_REDACTORS) {
    sanitized = redactor(sanitized)
  }
  return sanitized
}

/**
 * Recursively sanitize every string value in an arbitrary JSON-serializable
 * input. Used by the orchestrator to scrub prompt inputs before they are
 * rendered into messages and before they are persisted to `ai_runs.inputRef`.
 */
export function sanitizeInputObject<T>(input: T): T {
  if (typeof input === 'string') return sanitizeInput(input) as unknown as T
  if (Array.isArray(input)) return input.map(sanitizeInputObject) as unknown as T
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      out[key] = sanitizeInputObject(value)
    }
    return out as unknown as T
  }
  return input
}
