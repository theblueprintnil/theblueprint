import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getMembershipRole } from '@/lib/organizations'
import { prismaAuth } from '@/lib/db'
import { getStripe, appBaseUrl } from '@/lib/billing/stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const organizationId = user.currentOrganizationId
  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization.' }, { status: 400 })
  }
  const role = await getMembershipRole(user.id, organizationId)
  if (role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only the organization owner can manage billing.' },
      { status: 403 },
    )
  }
  const organization = await prismaAuth.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  })
  if (!organization || !organization.subscription?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No Stripe customer exists for this organization yet.' },
      { status: 404 },
    )
  }
  const session = await getStripe().billingPortal.sessions.create({
    customer: organization.subscription.stripeCustomerId,
    return_url: `${appBaseUrl()}/app/settings/billing`,
  })
  return NextResponse.json({ url: session.url })
}
