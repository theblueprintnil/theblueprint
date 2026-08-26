import { describe, expect, it } from 'vitest'
import {
  PASSWORD_MIN_LENGTH,
  generateSessionToken,
  hashToken,
  normalizeEmail,
  sessionCookieOptions,
  sessionExpiry,
  validateRegisterInput,
} from '../auth'

describe('generateSessionToken', () => {
  it('produces long, unique, url-safe tokens', () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(a).not.toEqual(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('hashToken', () => {
  it('is deterministic and never returns the raw token', () => {
    const token = generateSessionToken()
    expect(hashToken(token)).toBe(hashToken(token))
    expect(hashToken(token)).not.toBe(token)
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('sessionExpiry / sessionCookieOptions', () => {
  it('expires in the future', () => {
    expect(sessionExpiry().getTime()).toBeGreaterThan(Date.now())
  })

  it('hardens the session cookie', () => {
    const options = sessionCookieOptions(new Date())
    expect(options.httpOnly).toBe(true)
    expect(options.sameSite).toBe('lax')
    expect(options.path).toBe('/')
  })
})

describe('validateRegisterInput', () => {
  it('rejects invalid email, short name, and short password', () => {
    expect(validateRegisterInput({ email: 'nope', name: 'Jo', password: 'longenough1' })).toContain(
      'email',
    )
    expect(
      validateRegisterInput({ email: 'a@b.co', name: 'J', password: 'longenough1' }),
    ).toContain('Name')
    expect(
      validateRegisterInput({
        email: 'a@b.co',
        name: 'Jo',
        password: 'x'.repeat(PASSWORD_MIN_LENGTH - 1),
      }),
    ).toContain('Password')
  })

  it('accepts valid input', () => {
    expect(
      validateRegisterInput({ email: 'A@B.co ', name: ' Jo ', password: 'longenough1' }),
    ).toBeNull()
  })

  it('normalizes emails to lowercase', () => {
    expect(normalizeEmail('  Mixed@Case.COM ')).toBe('mixed@case.com')
  })
})
