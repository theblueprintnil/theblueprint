import type { BillingStatus, PlanType } from '@prisma/client'
import { prismaAuth } from '../db'
import { DEMO_DURATION_DAYS, PLANS, getPlanConfig } from './plans'

export type BillingSnapshotStatus =
  | BillingStatus
  | 'demo_active'
  | 'demo_expired'
  | 'canceled'
  | 'unpaid'
  | 'past_due'

export interface EntitlementSnapshot {
  plan: PlanType
  seatsLimit: number
  aiCreditsMonthly: number
  aiCreditsUsed: number
  modules: string[]
  status: BillingSnapshotStatus
  demoExpiresAt: Date | null
  currentPeriodEnd: Date | null
  trialEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export interface EntitlementDecision {
  allowed: boolean
  reason: string | null
}

export function demoExpiryFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + DEMO_DURATION_DAYS * 24 * 60 * 60 * 1000)
}

export function isDemoExpired(expiresAt: Date | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false
  return expiresAt.getTime() <= now.getTime()
}

export async function seedDemoEntitlement(
  organizationId: string,
  now: Date = new Date(),
): Promise<void> {
  const plan = PLANS.DEMO
  await prismaAuth.$transaction(async (tx) => {
    await tx.entitlement.upsert({
      where: { organizationId },
      create: {
        organizationId,
        plan: plan.id,
        seatsLimit: plan.seatsLimit,
        aiCreditsMonthly: plan.aiCreditsMonthly,
        aiCreditsUsed: 0,
        modules: plan.modules,
      },
      update: {},
    })
    await tx.organization.update({
      where: { id: organizationId },
      data: { demoExpiresAt: demoExpiryFromNow(now) },
    })
    await tx.auditLog.create({
      data: {
        action: 'BILLING_DEMO_STARTED',
        entityType: 'Organization',
        entityId: organizationId,
        organizationId,
        details: `Demo plan granted for ${DEMO_DURATION_DAYS} days.`,
      },
    })
  })
}

export async function getEntitlementSnapshot(organizationId: string): Promise<EntitlementSnapshot | null> {
  const row = await prismaAuth.organization.findUnique({
    where: { id: organizationId },
    include: { entitlement: true, subscription: true },
  })
  if (!row) return null
  const entitlement = row.entitlement
  const plan: PlanType = entitlement?.plan ?? 'DEMO'
  const config = getPlanConfig(plan)
  const demoExpired = isDemoExpired(row.demoExpiresAt)
  let status: EntitlementSnapshot['status']
  if (plan === 'DEMO') {
    status = demoExpired ? 'demo_expired' : 'demo_active'
  } else if (row.subscription) {
    status = row.subscription.status
  } else {
    status = 'demo_active'
  }
  return {
    plan,
    seatsLimit: entitlement?.seatsLimit ?? config.seatsLimit,
    aiCreditsMonthly: entitlement?.aiCreditsMonthly ?? config.aiCreditsMonthly,
    aiCreditsUsed: entitlement?.aiCreditsUsed ?? 0,
    modules: (entitlement?.modules as string[] | null) ?? config.modules,
    status,
    demoExpiresAt: row.demoExpiresAt,
    currentPeriodEnd: row.subscription?.currentPeriodEnd ?? null,
    trialEnd: row.subscription?.trialEnd ?? null,
    cancelAtPeriodEnd: row.subscription?.cancelAtPeriodEnd ?? false,
  }
}

function normalizeBillingStatus(status: BillingSnapshotStatus): string {
  const map: Record<BillingSnapshotStatus, string> = {
    demo_active: 'DEMO_ACTIVE',
    demo_expired: 'DEMO_EXPIRED',
    canceled: 'CANCELED',
    unpaid: 'UNPAID',
    past_due: 'PAST_DUE',
    INCOMPLETE: 'INCOMPLETE',
    INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
    TRIALING: 'TRIALING',
    ACTIVE: 'ACTIVE',
    PAST_DUE: 'PAST_DUE',
    CANCELED: 'CANCELED',
    UNPAID: 'UNPAID',
  }
  return map[status] ?? status.toString().toUpperCase()
}

export function decide(
  snapshot: EntitlementSnapshot,
  feature: string,
  now: Date = new Date(),
): EntitlementDecision {
  const status = normalizeBillingStatus(snapshot.status)

  if (status === 'DEMO_EXPIRED') {
    return { allowed: false, reason: 'Your demo has expired. Upgrade to continue.' }
  }
  if (status === 'CANCELED' || status === 'UNPAID') {
    return { allowed: false, reason: 'Your subscription is no longer active.' }
  }
  if (status === 'PAST_DUE') {
    // Allow limited access while Stripe retries payment, but block paid-only modules.
    if (!snapshot.modules.includes(feature)) {
      return { allowed: false, reason: 'This feature is not available on your current plan.' }
    }
    return { allowed: true, reason: 'Payment is past due — please update your billing details.' }
  }
  if (!snapshot.modules.includes(feature)) {
    return { allowed: false, reason: 'This feature is not available on your current plan.' }
  }
  if (snapshot.aiCreditsUsed >= snapshot.aiCreditsMonthly) {
    return { allowed: false, reason: 'You have used all of your AI credits for this period.' }
  }
  return { allowed: true, reason: null }
}

export async function applyEntitlementFromSubscription(
  organizationId: string,
  input: {
    plan: PlanType
    status: BillingStatus
    seatsLimit: number
    aiCreditsMonthly: number
    modules: string[]
    currentPeriodStart?: Date | null
    currentPeriodEnd?: Date | null
    trialEnd?: Date | null
    cancelAtPeriodEnd?: boolean
  },
): Promise<void> {
  await prismaAuth.$transaction(async (tx) => {
    await tx.entitlement.upsert({
      where: { organizationId },
      create: {
        organizationId,
        plan: input.plan,
        seatsLimit: input.seatsLimit,
        aiCreditsMonthly: input.aiCreditsMonthly,
        aiCreditsUsed: 0,
        modules: input.modules,
      },
      update: {
        plan: input.plan,
        seatsLimit: input.seatsLimit,
        aiCreditsMonthly: input.aiCreditsMonthly,
        modules: input.modules,
      },
    })
    if (input.currentPeriodStart || input.currentPeriodEnd || input.trialEnd || input.cancelAtPeriodEnd) {
      await tx.subscription.update({
        where: { organizationId },
        data: {
          ...(input.currentPeriodStart ? { currentPeriodStart: input.currentPeriodStart } : {}),
          ...(input.currentPeriodEnd ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
          ...(input.trialEnd ? { trialEnd: input.trialEnd } : {}),
          ...(typeof input.cancelAtPeriodEnd === 'boolean'
            ? { cancelAtPeriodEnd: input.cancelAtPeriodEnd }
            : {}),
          status: input.status,
        },
      })
    }
    await tx.auditLog.create({
      data: {
        action: 'BILLING_ENTITLEMENT_UPDATED',
        entityType: 'Organization',
        entityId: organizationId,
        organizationId,
        details: `Plan set to ${input.plan} (${input.status}).`,
      },
    })
  })
}

export async function expireDemos(now: Date = new Date()): Promise<number> {
  const result = await prismaAuth.organization.findMany({
    where: {
      demoExpiresAt: { lte: now },
      entitlement: { plan: 'DEMO' },
    },
    select: { id: true },
  })
  for (const org of result) {
    await prismaAuth.auditLog.create({
      data: {
        action: 'BILLING_DEMO_EXPIRED',
        entityType: 'Organization',
        entityId: org.id,
        organizationId: org.id,
        details: 'Demo period ended; gated features disabled.',
      },
    })
  }
  return result.length
}
