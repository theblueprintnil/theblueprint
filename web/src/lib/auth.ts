import { createHash, randomBytes } from 'node:crypto'

export const SESSION_COOKIE = 'blueprint_session'
export const SESSION_TTL_DAYS = 30
export const PASSWORD_MIN_LENGTH = 8

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  }
}

export interface RegisterInput {
  email: string
  name: string
  password: string
}

export function validateRegisterInput(input: Partial<RegisterInput>): string | null {
  const email = (input.email ?? '').trim().toLowerCase()
  const name = (input.name ?? '').trim()
  const password = input.password ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'A valid email address is required.'
  if (name.length < 2) return 'Name must be at least 2 characters.'
  if (password.length < PASSWORD_MIN_LENGTH)
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
  return null
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
