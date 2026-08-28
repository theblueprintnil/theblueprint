/**
 * Per-organization rate limiting for AI requests.
 *
 * A simple in-memory sliding-window counter keyed by `organizationId`. This
 * is intentionally process-local — sufficient for a single-server MVP and for
 * tests. The interface is async so it can be swapped for a Redis-backed
 * limiter later without touching the orchestrator.
 *
 * Server-only.
 */

export interface RateLimitDecision {
  allowed: boolean
  /** Requests remaining in the current window. */
  remaining: number
  /** Unix ms timestamp when the window resets. */
  resetsAt: number
}

export interface RateLimiter {
  check(organizationId: string): Promise<RateLimitDecision>
  /** Reset a single org's window — test-only. */
  reset(organizationId: string): Promise<void>
}

const DEFAULT_LIMIT = 20
const WINDOW_MS = 60_000

interface Bucket {
  count: number
  windowStart: number
}

export class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>()
  private readonly limit: number
  private readonly windowMs: number

  constructor(limit: number = DEFAULT_LIMIT, windowMs: number = WINDOW_MS) {
    this.limit = limit
    this.windowMs = windowMs
  }

  async check(organizationId: string): Promise<RateLimitDecision> {
    const now = Date.now()
    let bucket = this.buckets.get(organizationId)
    if (!bucket || bucket.windowStart + this.windowMs <= now) {
      bucket = { count: 0, windowStart: now }
      this.buckets.set(organizationId, bucket)
    }
    if (bucket.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetsAt: bucket.windowStart + this.windowMs,
      }
    }
    bucket.count += 1
    return {
      allowed: true,
      remaining: Math.max(0, this.limit - bucket.count),
      resetsAt: bucket.windowStart + this.windowMs,
    }
  }

  async reset(organizationId: string): Promise<void> {
    this.buckets.delete(organizationId)
  }
}

let activeLimiter: RateLimiter | null = null

export function getRateLimiter(env: Record<string, string | undefined> = process.env): RateLimiter {
  if (activeLimiter) return activeLimiter
  const limit = Number(env.AI_RATE_LIMIT_PER_MINUTE ?? DEFAULT_LIMIT)
  activeLimiter = new InMemoryRateLimiter(Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT)
  return activeLimiter
}

/** Test-only seam to inject a custom limiter (e.g. one that always denies). */
export function __setRateLimiterForTest(limiter: RateLimiter | null): void {
  activeLimiter = limiter
}
