import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockTx = {
  entitlement: { upsert: ReturnType<typeof vi.fn> }
  organization: { update: ReturnType<typeof vi.fn> }
  auditLog: { create: ReturnType<typeof vi.fn> }
}

const h = vi.hoisted(() => {
  const state = {
    entitlements: new Map<string, { plan: string; seatsLimit: number; aiCreditsMonthly: number; aiCreditsUsed: number; modules: string[] }>(),
    organizations: new Map<string, { demoExpiresAt: Date | null; subscription: { status: string; currentPeriodEnd: Date | null; trialEnd: Date | null; cancelAtPeriodEnd: boolean } | null }>(),
    auditLogs: [] as Array<{ action: string; organizationId: string }>,
    tx: null as null | MockTx,
  }
  return state
})

vi.mock('../../db', () => ({
  prismaAuth: {
    $transaction: vi.fn(async (fn: (tx: never) => Promise<unknown>) => fn(h.tx as never)),
    organization: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const org = h.organizations.get(where.id) ?? null
        if (!org) return null
        const entitlement = h.entitlements.get(where.id) ?? null
        return {
          id: where.id,
          demoExpiresAt: org.demoExpiresAt,
          entitlement: entitlement
            ? { ...entitlement, modules: entitlement.modules }
            : null,
          subscription: org.subscription,
        }
      }),
      update: vi.fn(async () => undefined),
    },
    entitlement: {
      upsert: vi.fn(async ({ where, create }: { where: { organizationId: string }; create: { plan: string; seatsLimit: number; aiCreditsMonthly: number; modules: string[] } }) => {
        h.entitlements.set(where.organizationId, {
          plan: create.plan,
          seatsLimit: create.seatsLimit,
          aiCreditsMonthly: create.aiCreditsMonthly,
          aiCreditsUsed: 0,
          modules: create.modules,
        })
        return undefined
      }),
    },
    subscription: {
      update: vi.fn(async () => undefined),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: { action: string; organizationId: string } }) => {
        h.auditLogs.push({ action: data.action, organizationId: data.organizationId })
        return undefined
      }),
    },
  },
}))

import {
  decide,
  demoExpiryFromNow,
  getEntitlementSnapshot,
  isDemoExpired,
  seedDemoEntitlement,
} from '../entitlements'
import type { EntitlementSnapshot } from '../entitlements'

beforeEach(() => {
  h.entitlements.clear()
  h.organizations.clear()
  h.auditLogs = []
  h.tx = {
    entitlement: { upsert: vi.fn(async () => undefined) },
    organization: { update: vi.fn(async () => undefined) },
    auditLog: {
      create: vi.fn(async ({ data }: { data: { action: string; organizationId: string } }) => {
        h.auditLogs.push({ action: data.action, organizationId: data.organizationId })
        return undefined
      }),
    },
  }
})

describe('demoExpiryFromNow', () => {
  it('is 7 days in the future', () => {
    const now = new Date('2026-08-27T00:00:00Z')
    const expires = demoExpiryFromNow(now)
    expect(expires.toISOString()).toBe('2026-09-03T00:00:00.000Z')
  })
})

describe('isDemoExpired', () => {
  it('returns false when no expiry is set', () => {
    expect(isDemoExpired(null)).toBe(false)
  })
  it('returns true when expiry is in the past', () => {
    expect(isDemoExpired(new Date('2020-01-01'))).toBe(true)
  })
  it('returns false when expiry is in the future', () => {
    expect(isDemoExpired(new Date('2099-01-01'))).toBe(false)
  })
})

describe('seedDemoEntitlement', () => {
  it('creates the demo entitlement and audit event', async () => {
    await seedDemoEntitlement('org-1')
    expect(h.tx!.entitlement.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-1' },
        create: expect.objectContaining({ plan: 'DEMO', seatsLimit: 1 }),
      }),
    )
    expect(h.tx!.organization.update).toHaveBeenCalled()
    expect(h.auditLogs.some((log) => log.action === 'BILLING_DEMO_STARTED')).toBe(true)
  })
})

describe('getEntitlementSnapshot', () => {
  it('returns null for a missing organization', async () => {
    expect(await getEntitlementSnapshot('missing')).toBeNull()
  })

  it('reports demo_active when the demo has not expired', async () => {
    h.organizations.set('org-1', {
      demoExpiresAt: new Date('2099-01-01'),
      subscription: null,
    })
    h.entitlements.set('org-1', {
      plan: 'DEMO',
      seatsLimit: 1,
      aiCreditsMonthly: 25,
      aiCreditsUsed: 0,
      modules: ['opportunities'],
    })
    const snapshot = await getEntitlementSnapshot('org-1')
    expect(snapshot?.status).toBe('demo_active')
    expect(snapshot?.plan).toBe('DEMO')
  })

  it('reports demo_expired when the demo has expired', async () => {
    h.organizations.set('org-2', {
      demoExpiresAt: new Date('2020-01-01'),
      subscription: null,
    })
    h.entitlements.set('org-2', {
      plan: 'DEMO',
      seatsLimit: 1,
      aiCreditsMonthly: 25,
      aiCreditsUsed: 0,
      modules: ['opportunities'],
    })
    const snapshot = await getEntitlementSnapshot('org-2')
    expect(snapshot?.status).toBe('demo_expired')
  })
})

describe('decide', () => {
  const base: EntitlementSnapshot = {
    plan: 'STARTER',
    seatsLimit: 1,
    aiCreditsMonthly: 250,
    aiCreditsUsed: 0,
    modules: ['opportunities', 'studio'],
    status: 'ACTIVE',
    demoExpiresAt: null,
    currentPeriodEnd: null,
    trialEnd: null,
    cancelAtPeriodEnd: false,
  }

  it('allows a feature on the plan with credits remaining', () => {
    expect(decide(base, 'studio').allowed).toBe(true)
  })

  it('blocks a feature not on the plan', () => {
    const decision = decide(base, 'agency')
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toContain('not available')
  })

  it('blocks everything when the demo has expired', () => {
    const decision = decide({ ...base, status: 'demo_expired' }, 'studio')
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toContain('expired')
  })

  it('blocks everything when canceled or unpaid', () => {
    expect(decide({ ...base, status: 'canceled' }, 'studio').allowed).toBe(false)
    expect(decide({ ...base, status: 'unpaid' }, 'studio').allowed).toBe(false)
  })

  it('allows plan features during past_due but warns', () => {
    const decision = decide({ ...base, status: 'past_due' }, 'studio')
    expect(decision.allowed).toBe(true)
    expect(decision.reason).toContain('past due')
  })

  it('blocks when AI credits are exhausted', () => {
    const decision = decide({ ...base, aiCreditsUsed: 250 }, 'studio')
    expect(decision.allowed).toBe(false)
    expect(decision.reason).toContain('AI credits')
  })
})
