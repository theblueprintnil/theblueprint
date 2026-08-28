import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    processedEventIds: new Set<string>(),
    subscriptions: new Map<string, { organizationId: string; stripeCustomerId: string; stripeSubscriptionId: string; status: string }>(),
    entitlements: new Map<string, { plan: string; seatsLimit: number; aiCreditsMonthly: number; modules: string[] }>(),
    auditLogs: [] as Array<{ action: string; organizationId: string }>,
    webhookEvents: [] as Array<{ eventId: string; type: string }>,
    tx: null as null | Record<string, ReturnType<typeof vi.fn>>,
  }
  return state
})

vi.mock('../../db', () => ({
  prismaAuth: {
    $transaction: vi.fn(async (fn: (tx: never) => Promise<unknown>) => fn(h.tx as never)),
    webhookEvent: {
      findUnique: vi.fn(async ({ where }: { where: { eventId: string } }) =>
        h.processedEventIds.has(where.eventId) ? { id: 'cached' } : null,
      ),
      create: vi.fn(async ({ data }: { data: { eventId: string; type: string } }) => {
        h.webhookEvents.push({ eventId: data.eventId, type: data.type })
        h.processedEventIds.add(data.eventId)
        return undefined
      }),
    },
    subscription: {
      findUnique: vi.fn(async ({ where }: { where: { stripeSubscriptionId?: string; stripeCustomerId?: string } }) => {
        if (where.stripeSubscriptionId) {
          for (const sub of h.subscriptions.values()) {
            if (sub.stripeSubscriptionId === where.stripeSubscriptionId) return { organizationId: sub.organizationId }
          }
        }
        if (where.stripeCustomerId) {
          for (const sub of h.subscriptions.values()) {
            if (sub.stripeCustomerId === where.stripeCustomerId) return { organizationId: sub.organizationId }
          }
        }
        return null
      }),
      upsert: vi.fn(async ({ where, create }: { where: { organizationId: string }; create: { stripeCustomerId: string; stripeSubscriptionId: string; status: string } }) => {
        h.subscriptions.set(where.organizationId, {
          organizationId: where.organizationId,
          stripeCustomerId: create.stripeCustomerId,
          stripeSubscriptionId: create.stripeSubscriptionId,
          status: create.status,
        })
        return undefined
      }),
      update: vi.fn(async ({ where, data }: { where: { organizationId: string }; data: { status?: string } }) => {
        const sub = h.subscriptions.get(where.organizationId)
        if (sub && data.status) sub.status = data.status
        return undefined
      }),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: { action: string; organizationId: string } }) => {
        h.auditLogs.push({ action: data.action, organizationId: data.organizationId })
        return undefined
      }),
    },
  },
}))

import { processStripeEvent, isWebhookProcessed } from '../webhook'
import {
  invoicePaymentFailedEvent,
  subscriptionCreatedEvent,
  subscriptionDeletedEvent,
  subscriptionUpdatedEvent,
  trialWillEndEvent,
  unhandledEvent,
} from './fixtures'

beforeEach(() => {
  h.processedEventIds.clear()
  h.subscriptions.clear()
  h.entitlements.clear()
  h.auditLogs = []
  h.webhookEvents = []
  h.tx = {
    entitlement: {
      upsert: vi.fn(async ({ where, create }: { where: { organizationId: string }; create: { plan: string; seatsLimit: number; aiCreditsMonthly: number; modules: string[] } }) => {
        h.entitlements.set(where.organizationId, {
          plan: create.plan,
          seatsLimit: create.seatsLimit,
          aiCreditsMonthly: create.aiCreditsMonthly,
          modules: create.modules,
        })
        return undefined
      }),
    } as any,
    subscription: {
      update: vi.fn(async () => undefined),
    } as any,
    auditLog: {
      create: vi.fn(async ({ data }: { data: { action: string; organizationId: string } }) => {
        h.auditLogs.push({ action: data.action, organizationId: data.organizationId })
        return undefined
      }),
    } as any,
  }
})

describe('isWebhookProcessed', () => {
  it('returns false for unseen events', async () => {
    expect(await isWebhookProcessed('evt_new')).toBe(false)
  })
  it('returns true after an event is processed', async () => {
    await processStripeEvent(subscriptionCreatedEvent())
    expect(await isWebhookProcessed('evt_test_sub_created')).toBe(true)
  })
})

describe('processStripeEvent', () => {
  it('records the event idempotently and skips duplicates', async () => {
    const first = await processStripeEvent(unhandledEvent())
    expect(first.received).toBe(true)
    expect(first.action).toBe('unhandled')
    const second = await processStripeEvent(unhandledEvent())
    expect(second.action).toBe('duplicate')
    expect(h.webhookEvents).toHaveLength(1)
  })

  it('syncs a subscription when the customer metadata resolves the org', async () => {
    // Pre-seed a subscription so the customer lookup resolves the org.
    h.subscriptions.set('org-1', {
      organizationId: 'org-1',
      stripeCustomerId: 'cus_test_1',
      stripeSubscriptionId: 'sub_test_1',
      status: 'trialing',
    })
    const result = await processStripeEvent(subscriptionUpdatedEvent())
    expect(result.action).toBe('subscription_synced')
    expect(result.organizationId).toBe('org-1')
    expect(h.entitlements.get('org-1')?.plan).toBe('STARTER')
  })

  it('creates a subscription from a subscription.created event', async () => {
    h.subscriptions.set('org-2', {
      organizationId: 'org-2',
      stripeCustomerId: 'cus_test_1',
      stripeSubscriptionId: 'sub_test_1',
      status: 'trialing',
    })
    const result = await processStripeEvent(subscriptionCreatedEvent())
    expect(result.action).toBe('subscription_synced')
    expect(h.subscriptions.get('org-2')?.status).toBe('TRIALING')
  })

  it('marks the subscription canceled and reverts entitlements on delete', async () => {
    h.subscriptions.set('org-3', {
      organizationId: 'org-3',
      stripeCustomerId: 'cus_test_1',
      stripeSubscriptionId: 'sub_test_1',
      status: 'ACTIVE',
    })
    const result = await processStripeEvent(subscriptionDeletedEvent())
    expect(result.action).toBe('subscription_canceled')
    expect(h.subscriptions.get('org-3')?.status).toBe('CANCELED')
    expect(h.entitlements.get('org-3')?.plan).toBe('DEMO')
  })

  it('records a payment failure audit event', async () => {
    h.subscriptions.set('org-4', {
      organizationId: 'org-4',
      stripeCustomerId: 'cus_test_1',
      stripeSubscriptionId: 'sub_test_1',
      status: 'ACTIVE',
    })
    const result = await processStripeEvent(invoicePaymentFailedEvent())
    expect(result.action).toBe('payment_failed')
    expect(h.auditLogs.some((log) => log.action === 'BILLING_PAYMENT_FAILED')).toBe(true)
  })

  it('records a trial-ending reminder', async () => {
    h.subscriptions.set('org-5', {
      organizationId: 'org-5',
      stripeCustomerId: 'cus_test_1',
      stripeSubscriptionId: 'sub_test_1',
      status: 'TRIALING',
    })
    const result = await processStripeEvent(trialWillEndEvent())
    expect(result.action).toBe('trial_ending')
    expect(h.auditLogs.some((log) => log.action === 'BILLING_TRIAL_ENDING')).toBe(true)
  })

  it('reports an unhandled event type without throwing', async () => {
    const result = await processStripeEvent(unhandledEvent())
    expect(result.action).toBe('unhandled')
  })
})
