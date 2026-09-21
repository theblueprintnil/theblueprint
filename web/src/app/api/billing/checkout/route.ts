import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/session'
import { getMembershipRole } from '@/lib/organizations'
import { prismaAuth } from '@/lib/db'
import { getStripe, appBaseUrl } from '@/lib/billing/stripe'
import { PLANS, resolveStripePriceId } from '@/lib/billing/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as { plan?: string } | null
  const planId = body?.plan as keyof typeof PLANS | undefined
  if (!planId || !PLANS[planId] || planId === 'DEMO') {
    return NextResponse.json({ error: 'A valid paid plan is required.' }, { status: 400 })
  }
  const priceId = resolveStripePriceId(planId)
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe price for ${planId} is not configured.` },
      { status: 500 },
    )
  }
  const organizationId = user.currentOrganizationId
  if (!organizationId) {
    return NextResponse.json({ error: 'No active organization.' }, { status: 400 })
  }
  const role = await getMembershipRole(user.id, organizationId)
  if (role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Only the organization owner can upgrade billing.' },
      { status: 403 },
    )
  }
  const organization = await prismaAuth.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  })
  if (!organization) {
    return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
  }
  const stripe = getStripe()
  const customer =
    organization.subscription?.stripeCustomerId ??
    (
      await stripe.customers.create({
        email: user.email,
        metadata: { organizationId, userId: user.id },
      })
    ).id
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { organizationId, plan: planId },
    subscription_data: { metadata: { organizationId, plan: planId } },
    success_url: `${appBaseUrl()}/app/settings/billing?status=success`,
    cancel_url: `${appBaseUrl()}/app/settings/billing?status=canceled`,
  })
  return NextResponse.json({ url: session.url })
}
