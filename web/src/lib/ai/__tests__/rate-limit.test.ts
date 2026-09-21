import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryRateLimiter } from '../rate-limit'

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter

  beforeEach(() => {
    limiter = new InMemoryRateLimiter(3, 60_000)
  })

  it('allows up to the limit then denies', async () => {
    const a = await limiter.check('org-1')
    const b = await limiter.check('org-1')
    const c = await limiter.check('org-1')
    const d = await limiter.check('org-1')
    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
    expect(c.allowed).toBe(true)
    expect(d.allowed).toBe(false)
    expect(d.remaining).toBe(0)
  })

  it('tracks remaining count', async () => {
    const first = await limiter.check('org-1')
    expect(first.remaining).toBe(2)
    const second = await limiter.check('org-1')
    expect(second.remaining).toBe(1)
  })

  it('isolates buckets per organization', async () => {
    for (let i = 0; i < 3; i++) await limiter.check('org-1')
    const other = await limiter.check('org-2')
    expect(other.allowed).toBe(true)
  })

  it('resets a bucket', async () => {
    for (let i = 0; i < 3; i++) await limiter.check('org-1')
    const denied = await limiter.check('org-1')
    expect(denied.allowed).toBe(false)
    await limiter.reset('org-1')
    const after = await limiter.check('org-1')
    expect(after.allowed).toBe(true)
  })
})
