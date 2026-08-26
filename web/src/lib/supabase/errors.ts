export interface SupabaseErrorLike {
  message: string
  code?: string
  details?: string | null
  hint?: string | null
}

export class DataError extends Error implements SupabaseErrorLike {
  readonly code?: string
  readonly details: string | null
  readonly hint: string | null

  constructor(message: string, options: { code?: string; details?: string; hint?: string } = {}) {
    super(message)
    this.name = 'DataError'
    this.code = options.code
    this.details = options.details ?? null
    this.hint = options.hint ?? null
  }

  toSketch(): SupabaseErrorLike {
    return { message: this.message, code: this.code, details: this.details, hint: this.hint }
  }
}

export function isDataError(value: unknown): value is DataError {
  return value instanceof DataError
}
