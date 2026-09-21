import { describe, expect, it } from 'vitest'

import { resolveAgeTier } from '../tier'

describe('resolveAgeTier', () => {
  it('fails closed to RESTRICTED when date of birth is missing', () => {
    expect(resolveAgeTier(null)).toBe('RESTRICTED')
    expect(resolveAgeTier(undefined)).toBe('RESTRICTED')
    expect(resolveAgeTier('')).toBe('RESTRICTED')
  })

  it('fails closed on an unparseable date of birth', () => {
    expect(resolveAgeTier('not-a-date')).toBe('RESTRICTED')
  })

  it('fails closed on a date of birth in the future', () => {
    expect(resolveAgeTier(new Date('2030-01-01T00:00:00Z'), new Date('2026-09-18T00:00:00Z'))).toBe(
      'RESTRICTED',
    )
  })

  it('maps an eight year old to YOUTH', () => {
    expect(resolveAgeTier('2018-03-01T00:00:00Z', new Date('2026-09-18T00:00:00Z'))).toBe('YOUTH')
  })

  it('maps the day before a 13th birthday to YOUTH', () => {
    expect(resolveAgeTier('2013-05-11T08:00:00Z', new Date('2026-05-10T12:00:00Z'))).toBe('YOUTH')
  })

  it('maps the 13th birthday itself to JUNIOR', () => {
    expect(resolveAgeTier('2013-05-11T08:00:00Z', new Date('2026-05-11T12:00:00Z'))).toBe('JUNIOR')
  })

  it('maps the day before an 18th birthday to JUNIOR', () => {
    expect(resolveAgeTier('2008-07-03T08:00:00Z', new Date('2026-07-02T12:00:00Z'))).toBe('JUNIOR')
  })

  it('maps the 18th birthday itself to SENIOR', () => {
    expect(resolveAgeTier('2008-07-03T08:00:00Z', new Date('2026-07-03T12:00:00Z'))).toBe('SENIOR')
  })

  it('maps an adult past the target range to SENIOR', () => {
    expect(resolveAgeTier('1998-01-15T00:00:00Z', new Date('2026-01-15T00:00:00Z'))).toBe('SENIOR')
  })

  it('accepts an ISO string date of birth', () => {
    expect(resolveAgeTier('2010-01-15T00:00:00Z', new Date('2026-01-15T00:00:00Z'))).toBe('JUNIOR')
  })

  it('accepts a Date object date of birth', () => {
    expect(resolveAgeTier(new Date('2010-06-01T00:00:00Z'), new Date('2026-06-01T00:00:00Z'))).toBe(
      'JUNIOR',
    )
  })
})
