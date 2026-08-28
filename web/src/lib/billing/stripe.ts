import Stripe from 'stripe'

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set. Configure it in web/.env to use billing.')
  }
  cached = new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil' as Stripe.LatestApiVersion,
    typescript: true,
  })
  return cached
}

export function stripeWebhookSecret(): string {
  const value = process.env.STRIPE_WEBHOOK_SECRET
  if (!value) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set. Configure it in web/.env to receive webhooks.')
  }
  return value
}

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
}
