import { BillingPanel } from '@/components/billing-panel'
import { getEntitlementSnapshot } from '@/lib/billing/entitlements'
import { getMembershipRole } from '@/lib/organizations'
import { getSessionUser } from '@/lib/session'
import { PAID_PLANS, PLANS, resolveStripePriceId } from '@/lib/billing/plans'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  const organizationId = user.currentOrganizationId
  if (!organizationId) redirect('/onboarding')
  const role = await getMembershipRole(user.id, organizationId)
  const snapshot = await getEntitlementSnapshot(organizationId)
  const serializableSnapshot = snapshot
    ? {
        ...snapshot,
        demoExpiresAt: snapshot.demoExpiresAt ? snapshot.demoExpiresAt.toISOString() : null,
        currentPeriodEnd: snapshot.currentPeriodEnd ? snapshot.currentPeriodEnd.toISOString() : null,
        trialEnd: snapshot.trialEnd ? snapshot.trialEnd.toISOString() : null,
      }
    : null
  const params = await searchParams
  const stripeConfigured = Boolean(resolveStripePriceId('STARTER'))
  const plans = PAID_PLANS.map((plan) => ({
    id: plan.id,
    label: plan.label,
    description: plan.description,
    seatsLimit: plan.seatsLimit,
    aiCreditsMonthly: plan.aiCreditsMonthly,
    modules: plan.modules,
    highlight: plan.highlight ?? false,
    priceConfigured: Boolean(resolveStripePriceId(plan.id)),
  }))
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Billing</h1>
        <p className="text-sm text-zinc-500">
          Manage your plan, seats, and Stripe subscription. Demo organizations get a 7-day no-card
          trial.
        </p>
      </div>
      <BillingPanel
        snapshot={serializableSnapshot}
        role={role}
        plans={plans}
        demoPlan={PLANS.DEMO}
        stripeConfigured={stripeConfigured}
        statusParam={params.status}
      />
    </div>
  )
}

