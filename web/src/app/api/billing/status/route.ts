import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getMembershipRole } from '@/lib/organizations'
import { getEntitlementSnapshot } from '@/lib/billing/entitlements'
import { PLANS, PAID_PLANS } from '@/lib/billing/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const organizationId = user.currentOrganizationId
  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization.' }, { status: 400 })
  }
  const role = await getMembershipRole(user.id, organizationId)
  if (!role) {
    return NextResponse.json({ error: 'Not a member of this organization.' }, { status: 403 })
  }
  const snapshot = await getEntitlementSnapshot(organizationId)
  if (!snapshot) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
  }
  return NextResponse.json({
    entitlement: snapshot,
    plans: PAID_PLANS.map((plan) => ({
      id: plan.id,
      label: plan.label,
      description: plan.description,
      seatsLimit: plan.seatsLimit,
      aiCreditsMonthly: plan.aiCreditsMonthly,
      modules: plan.modules,
      highlight: plan.highlight ?? false,
    })),
    canUpgrade: role === 'OWNER',
    demoPlan: PLANS.DEMO,
  })
}
