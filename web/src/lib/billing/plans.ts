import type { PlanType } from '@prisma/client'

export type PlanId = PlanType

export interface PlanConfig {
  id: PlanId
  label: string
  description: string
  priceIdEnv: string
  seatsLimit: number
  aiCreditsMonthly: number
  modules: string[]
  highlight?: boolean
}

export const DEMO_DURATION_DAYS = 7

export const PLANS: Record<PlanId, PlanConfig> = {
  DEMO: {
    id: 'DEMO',
    label: 'Demo',
    description: '7-day no-card trial with constrained features.',
    priceIdEnv: '',
    seatsLimit: 1,
    aiCreditsMonthly: 25,
    modules: ['opportunities', 'media-kit'],
  },
  STARTER: {
    id: 'STARTER',
    label: 'Starter',
    description: 'For a single athlete building their brand.',
    priceIdEnv: 'STRIPE_PRICE_STARTER',
    seatsLimit: 1,
    aiCreditsMonthly: 250,
    modules: ['opportunities', 'media-kit', 'studio', 'deals'],
  },
  GROWTH: {
    id: 'GROWTH',
    label: 'Growth',
    description: 'For agencies managing a small roster.',
    priceIdEnv: 'STRIPE_PRICE_GROWTH',
    seatsLimit: 5,
    aiCreditsMonthly: 1500,
    modules: ['opportunities', 'media-kit', 'studio', 'deals', 'agency', 'documents'],
    highlight: true,
  },
  PREMIUM: {
    id: 'PREMIUM',
    label: 'Premium',
    description: 'For larger agencies and guardians with advanced needs.',
    priceIdEnv: 'STRIPE_PRICE_PREMIUM',
    seatsLimit: 25,
    aiCreditsMonthly: 10000,
    modules: [
      'opportunities',
      'media-kit',
      'studio',
      'deals',
      'agency',
      'documents',
      'guardian',
      'reports',
    ],
  },
}

export const PAID_PLANS: PlanConfig[] = [PLANS.STARTER, PLANS.GROWTH, PLANS.PREMIUM]

export function getPlanConfig(plan: PlanId): PlanConfig {
  return PLANS[plan]
}

export function resolveStripePriceId(plan: PlanId, env: Record<string, string | undefined> = process.env): string | null {
  const config = PLANS[plan]
  if (!config.priceIdEnv) return null
  const value = env[config.priceIdEnv]
  return value && value.trim() !== '' ? value : null
}

export function planFromStripePriceId(
  priceId: string,
  env: Record<string, string | undefined> = process.env,
): PlanId | null {
  for (const plan of PAID_PLANS) {
    const configured = resolveStripePriceId(plan.id, env)
    if (configured && configured === priceId) return plan.id
  }
  return null
}
