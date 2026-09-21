import { describe, expect, it } from 'vitest'
import {
  DEMO_DURATION_DAYS,
  PAID_PLANS,
  PLANS,
  getPlanConfig,
  planFromStripePriceId,
  resolveStripePriceId,
} from '../plans'

describe('PLANS', () => {
  it('exposes demo, starter, growth, and premium', () => {
    expect(PLANS.DEMO.id).toBe('DEMO')
    expect(PLANS.STARTER.id).toBe('STARTER')
    expect(PLANS.GROWTH.id).toBe('GROWTH')
    expect(PLANS.PREMIUM.id).toBe('PREMIUM')
  })

  it('demo has no Stripe price env', () => {
    expect(PLANS.DEMO.priceIdEnv).toBe('')
    expect(resolveStripePriceId('DEMO')).toBeNull()
  })

  it('demo duration is 7 days', () => {
    expect(DEMO_DURATION_DAYS).toBe(7)
  })

  it('paid plans list excludes demo', () => {
    expect(PAID_PLANS.map((p) => p.id)).toEqual(['STARTER', 'GROWTH', 'PREMIUM'])
  })

  it('growth is highlighted as popular', () => {
    expect(PLANS.GROWTH.highlight).toBe(true)
    expect(PLANS.STARTER.highlight).toBeUndefined()
  })

  it('seat and credit limits scale up by plan', () => {
    expect(PLANS.STARTER.seatsLimit).toBeLessThan(PLANS.GROWTH.seatsLimit)
    expect(PLANS.GROWTH.seatsLimit).toBeLessThan(PLANS.PREMIUM.seatsLimit)
    expect(PLANS.STARTER.aiCreditsMonthly).toBeLessThan(PLANS.PREMIUM.aiCreditsMonthly)
  })
})

describe('getPlanConfig', () => {
  it('returns the config for a known plan', () => {
    expect(getPlanConfig('STARTER').label).toBe('Starter')
  })
})

describe('resolveStripePriceId', () => {
  it('returns the env value when set', () => {
    expect(resolveStripePriceId('STARTER', { STRIPE_PRICE_STARTER: 'price_123' })).toBe('price_123')
  })

  it('returns null when the env is missing', () => {
    expect(resolveStripePriceId('GROWTH', {})).toBeNull()
  })

  it('returns null for the demo plan', () => {
    expect(resolveStripePriceId('DEMO', {})).toBeNull()
  })
})

describe('planFromStripePriceId', () => {
  it('maps a configured price id back to its plan', () => {
    const env = {
      STRIPE_PRICE_STARTER: 'price_starter',
      STRIPE_PRICE_GROWTH: 'price_growth',
      STRIPE_PRICE_PREMIUM: 'price_premium',
    }
    expect(planFromStripePriceId('price_starter', env)).toBe('STARTER')
    expect(planFromStripePriceId('price_growth', env)).toBe('GROWTH')
    expect(planFromStripePriceId('price_premium', env)).toBe('PREMIUM')
  })

  it('returns null for an unknown price id', () => {
    expect(planFromStripePriceId('price_unknown', {})).toBeNull()
  })
})
