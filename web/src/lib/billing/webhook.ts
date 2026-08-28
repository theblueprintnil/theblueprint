import type { BillingStatus, PlanType } from '@prisma/client'
import { prismaAuth } from '../db'
import { getPlanConfig, planFromStripePriceId } from './plans'
import { applyEntitlementFromSubscription } from './entitlements'

export interface WebhookResult {
  received: boolean
  action: string
  organizationId: string | null
}

const STRIPE_SOURCE = 'stripe'

function toBillingStatus(stripeStatus: string): BillingStatus {
  const map: Record<string, BillingStatus> = {
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'INCOMPLETE_EXPIRED',
    trialing: 'TRIALING',
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
  }
  return map[stripeStatus] ?? 'INCOMPLETE'
}

function asDate(value: number | null | undefined): Date | null {
  if (value == null) return null
  return new Date(value * 1000)
}

export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  const existing = await prismaAuth.webhookEvent.findUnique({ where: { eventId } })
  return Boolean(existing)
}

export async function recordWebhookEvent(
  eventId: string,
  type: string,
  payload: unknown,
): Promise<void> {
  await prismaAuth.webhookEvent.create({
    data: {
      source: STRIPE_SOURCE,
      eventId,
      type,
      payload: payload as never,
      processedAt: new Date(),
    },
  })
}

interface StripeSubscriptionLike {
  id: string
  customer: string
  status: string
  current_period_start: number | null
  current_period_end: number | null
  cancel_at_period_end: boolean
  trial_end: number | null
  items?: {
    data?: Array<{
      price?: { id?: string } | null
    }>
  }
}

interface StripeCustomerLike {
  id: string
  email?: string
  metadata?: Record<string, string | undefined>
}

function readOrganizationIdFromMetadata(metadata: Record<string, string | undefined> | undefined): string | null {
  if (!metadata) return null
  const value = metadata.organizationId ?? metadata.organization_id
  return value && value.trim() !== '' ? value : null
}

async function resolveOrganizationIdFromCustomer(customer: StripeCustomerLike): Promise<string | null> {
  const fromMetadata = readOrganizationIdFromMetadata(customer.metadata)
  if (fromMetadata) return fromMetadata
  const sub = await prismaAuth.subscription.findUnique({
    where: { stripeCustomerId: customer.id },
    select: { organizationId: true },
  })
  return sub?.organizationId ?? null
}

async function resolveOrganizationIdFromSubscription(subscriptionId: string): Promise<string | null> {
  const sub = await prismaAuth.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    select: { organizationId: true },
  })
  return sub?.organizationId ?? null
}

async function upsertSubscription(
  organizationId: string,
  subscription: StripeSubscriptionLike,
  plan: PlanType,
): Promise<void> {
  const config = getPlanConfig(plan)
  await prismaAuth.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items?.data?.[0]?.price?.id ?? null,
      status: toBillingStatus(subscription.status),
      currentPeriodStart: asDate(subscription.current_period_start),
      currentPeriodEnd: asDate(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: asDate(subscription.trial_end),
    },
    update: {
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items?.data?.[0]?.price?.id ?? null,
      status: toBillingStatus(subscription.status),
      currentPeriodStart: asDate(subscription.current_period_start),
      currentPeriodEnd: asDate(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: asDate(subscription.trial_end),
    },
  })
  await applyEntitlementFromSubscription(organizationId, {
    plan,
    status: toBillingStatus(subscription.status),
    seatsLimit: config.seatsLimit,
    aiCreditsMonthly: config.aiCreditsMonthly,
    modules: config.modules,
    currentPeriodStart: asDate(subscription.current_period_start),
    currentPeriodEnd: asDate(subscription.current_period_end),
    trialEnd: asDate(subscription.trial_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })
}

function planFromSubscription(subscription: StripeSubscriptionLike): PlanType {
  const priceId = subscription.items?.data?.[0]?.price?.id
  if (priceId) {
    const plan = planFromStripePriceId(priceId)
    if (plan) return plan
  }
  return 'STARTER'
}

export async function processStripeEvent(event: {
  id: string
  type: string
  data: { object: unknown }
}): Promise<WebhookResult> {
  if (await isWebhookProcessed(event.id)) {
    return { received: true, action: 'duplicate', organizationId: null }
  }

  let organizationId: string | null = null
  let action = 'ignored'

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscriptionLike
        organizationId = await resolveOrganizationIdFromCustomer({
          id: subscription.customer,
        })
        if (!organizationId) {
          organizationId = await resolveOrganizationIdFromSubscription(subscription.id)
        }
        if (organizationId) {
          const plan = planFromSubscription(subscription)
          await upsertSubscription(organizationId, subscription, plan)
          action = 'subscription_synced'
        } else {
          action = 'subscription_no_org'
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as StripeSubscriptionLike
        organizationId = await resolveOrganizationIdFromSubscription(subscription.id)
        if (organizationId) {
          await prismaAuth.subscription.update({
            where: { organizationId },
            data: { status: 'CANCELED', cancelAtPeriodEnd: false },
          })
          await applyEntitlementFromSubscription(organizationId, {
            plan: 'DEMO',
            status: 'CANCELED',
            seatsLimit: getPlanConfig('DEMO').seatsLimit,
            aiCreditsMonthly: getPlanConfig('DEMO').aiCreditsMonthly,
            modules: getPlanConfig('DEMO').modules,
          })
          action = 'subscription_canceled'
        } else {
          action = 'subscription_delete_no_org'
        }
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription?: string | null }
        if (invoice.subscription) {
          organizationId = await resolveOrganizationIdFromSubscription(invoice.subscription)
          if (organizationId) {
            await prismaAuth.subscription.update({
              where: { organizationId },
              data: { status: 'PAST_DUE' },
            })
            await prismaAuth.auditLog.create({
              data: {
                action: 'BILLING_PAYMENT_FAILED',
                entityType: 'Organization',
                entityId: organizationId,
                organizationId,
                details: 'Stripe invoice payment failed.',
              },
            })
            action = 'payment_failed'
          }
        }
        break
      }
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as StripeSubscriptionLike
        organizationId = await resolveOrganizationIdFromSubscription(subscription.id)
        if (organizationId) {
          await prismaAuth.auditLog.create({
            data: {
              action: 'BILLING_TRIAL_ENDING',
              entityType: 'Organization',
              entityId: organizationId,
              organizationId,
              details: 'Stripe trial will end soon.',
            },
          })
          action = 'trial_ending'
        }
        break
      }
      default:
        action = 'unhandled'
        break
    }
  } finally {
    await recordWebhookEvent(event.id, event.type, event.data.object)
  }

  return { received: true, action, organizationId }
}
