import { NextResponse } from 'next/server'
import { getStripe, stripeWebhookSecret } from '@/lib/billing/stripe'
import { processStripeEvent } from '@/lib/billing/webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 })
  }
  const payload = await request.text()
  let event
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      stripeWebhookSecret(),
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature verification failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
  const result = await processStripeEvent({
    id: event.id,
    type: event.type,
    data: { object: event.data.object },
  })
  return NextResponse.json(result)
}
