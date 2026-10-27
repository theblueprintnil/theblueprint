export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ServiceUnavailableError extends Error {
  readonly retryAfter: number | undefined
  readonly isTransient: boolean

  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'ServiceUnavailableError'
    this.retryAfter = retryAfter
    this.isTransient = true
  }
}

export class DatabaseConnectionError extends Error {
  readonly isTransient: boolean

  constructor(message: string, isTransient = true) {
    super(message)
    this.name = 'DatabaseConnectionError'
    this.isTransient = isTransient
  }
}