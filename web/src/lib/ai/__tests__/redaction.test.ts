import { describe, expect, it } from 'vitest'
import { sanitizeInput, sanitizeInputObject, registerRedactor, clearRedactors } from '../redaction'

describe('sanitizeInput (default redactor)', () => {
  it('redacts email addresses', () => {
    expect(sanitizeInput('Contact me at jane@example.com')).toBe('Contact me at [REDACTED:email]')
  })

  it('redacts SSN-like patterns', () => {
    expect(sanitizeInput('SSN 123-45-6789 here')).toBe('SSN [REDACTED:ssn] here')
  })

  it('redacts 16+ digit numbers', () => {
    expect(sanitizeInput('Card 4111111111111111 done')).toBe('Card [REDACTED:number] done')
  })

  it('redacts phone numbers', () => {
    expect(sanitizeInput('Call (555) 123-4567')).toBe('Call [REDACTED:phone]')
  })

  it('leaves non-PII text untouched', () => {
    expect(sanitizeInput('Brand Nike, payout $500')).toBe('Brand Nike, payout $500')
  })
})

describe('sanitizeInputObject', () => {
  it('recursively sanitizes string values in objects', () => {
    const input = {
      name: 'Jane',
      email: 'jane@example.com',
      nested: { contact: 'jane@example.com' },
    }
    const result = sanitizeInputObject(input)
    expect(result.email).toBe('[REDACTED:email]')
    expect(result.nested.contact).toBe('[REDACTED:email]')
    expect(result.name).toBe('Jane')
  })

  it('sanitizes strings inside arrays', () => {
    const input = { contacts: ['jane@example.com', '555-123-4567'] }
    const result = sanitizeInputObject(input)
    expect(result.contacts[0]).toBe('[REDACTED:email]')
    expect(result.contacts[1]).toBe('[REDACTED:phone]')
  })

  it('passes through numbers and booleans', () => {
    const input = { count: 5, flag: true }
    expect(sanitizeInputObject(input)).toEqual(input)
  })
})

describe('custom redactors', () => {
  it('applies registered redactors after the default', () => {
    registerRedactor((text) => text.replace(/SECRET/g, '[REDACTED:secret]'))
    expect(sanitizeInput('SECRET value jane@example.com')).toBe(
      '[REDACTED:secret] value [REDACTED:email]',
    )
    clearRedactors()
  })
})
