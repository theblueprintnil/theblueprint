# The Blueprint - Billing & Stripe

> entityType: domain-module

## Observations

- src/lib/billing/{plans,entitlements,stripe,webhook}.ts; plan tiers DEMO/STARTER/GROWTH/PREMIUM; entitlement snapshot = plan, seats limit, ai credits monthly/used, modules, billing status, demo expiry
- Stripe checkout/portal/status API routes; webhook verifies HMAC signature and dedupes via WebhookEvent.eventId unique constraint
- Subscription model stores stripeCustomerId/stripeSubscriptionId/stripePriceId + BillingStatus; Entitlement is 1:1 with organization
- seedDemoEntitlement upserts a DEMO entitlement and sets organization.demoExpiresAt (14-day demo window)

## Relations

**Outgoing**

- `exposed-by` → [[The Blueprint - API routes]]

**Incoming**

- `metered-by` ← [[The Blueprint - AI assist layer]]
- `tests` ← [[The Blueprint - Vitest unit suite]]