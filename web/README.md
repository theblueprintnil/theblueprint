# The Blueprint — Web App

Phase 1 + Phase 3 of a multi-tenant NIL operating platform: Next.js 16 (App Router, TypeScript strict) with Tailwind CSS v4, Prisma on PostgreSQL, cookie sessions, organization-based multi-tenancy enforced by Postgres RLS, an owner/admin/member/viewer role model, a first-organization onboarding flow, and a 7-day demo + Stripe Billing entitlement system.

## Prerequisites

- Node.js 22+
- Docker (for local PostgreSQL)
- A Stripe account (test mode) for billing

## Setup

```bash
cd web
cp .env.example .env        # fill in real values; see table below
npm install
docker compose up -d        # from the repository root: starts postgres on port 5433
npx prisma db push          # create/sync the schema
npm run db:rls              # create app_user role + apply RLS policies
npx prisma db seed          # demo data
```

### Environment variables

| Variable                        | Required | Purpose                                                                     |
| ------------------------------- | -------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                  | yes      | Privileged Prisma connection used for auth reads, migrations, RLS bootstrap |
| `DATABASE_URL_APP`              | yes      | Row-level-security-scoped `app_user` connection used for all tenant queries |
| `APP_DB_PASSWORD`               | yes      | Password applied to the `app_user` role by `npm run db:rls`                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | reserved | Placeholder for the planned Supabase migration (Phase 2+)                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | reserved | Placeholder for the Supabase browser client                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | reserved | Server-only Supabase key; never expose to the client                        |
| `SESSION_SECRET`                | reserved | Future signing secret for stateless session tokens                          |
| `STRIPE_SECRET_KEY`             | billing  | Stripe API secret key (server-only; never expose to the browser)            |
| `STRIPE_WEBHOOK_SECRET`         | billing  | Stripe webhook signing secret used to verify event signatures               |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | billing | Stripe publishable key (safe for browser use)                          |
| `STRIPE_PRICE_STARTER`          | billing  | Stripe Price ID for the Starter plan                                        |
| `STRIPE_PRICE_GROWTH`           | billing  | Stripe Price ID for the Growth plan                                         |
| `STRIPE_PRICE_PREMIUM`          | billing  | Stripe Price ID for the Premium plan                                        |
| `NEXT_PUBLIC_APP_URL`           | optional | Canonical app URL for redirects/links                                       |

Startup validates that every required variable is present (`src/lib/env.ts`) and fails fast with a readable error otherwise. Stripe variables are `reserved` so the app still boots without billing configured; upgrade buttons are disabled until the price IDs are set.

## Development

```bash
npm run dev                 # http://localhost:3000
```

Flow: `/register` → `/onboarding` (creates your first organization on the 7-day demo plan; you become its OWNER) → `/app/dashboard`. Existing users land in their most recently active organization via the header switcher. Upgrade from `/app/settings/billing`.

## Stripe billing setup

1. **Create products and prices** in the Stripe Dashboard (test mode) for `Starter`, `Growth`, and `Premium`. Copy each `price_…` ID into the matching `STRIPE_PRICE_*` env var.
2. **Set keys** in `web/.env`:
   - `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API keys.
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — the publishable key (safe for the browser).
   - `STRIPE_WEBHOOK_SECRET` — from the webhook endpoint you create next.
3. **Create a webhook endpoint** in Stripe → Developers → Webhooks:
   - Endpoint URL: `https://<your-host>/api/stripe/webhook` (use `stripe listen` locally).
   - Events to send at minimum:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `customer.subscription.trial_will_end`
4. **Listen locally** for development:
   ```bash
   stripe listen --forward-to http://localhost:3000/api/stripe/webhook
   ```
   Copy the printed `whsec_…` value into `STRIPE_WEBHOOK_SECRET`.
5. **Demo flow** — new organizations start on the `DEMO` plan for 7 days with no card. The owner can upgrade from `/app/settings/billing`, which creates a Stripe Checkout Session. Stripe redirects back to the billing page; entitlements update only after the signed webhook is processed (the redirect alone is **not** proof of payment).
6. **Idempotency** — every webhook event ID is stored in `WebhookEvent` before processing; duplicates are skipped. Entitlements are only mutated from verified webhook handlers or server-side billing logic — never from client code.
7. **Manage billing** — owners can open the Stripe customer portal from the billing page to update cards, invoices, or cancel.

> Never put `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` in client code. Only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is safe for the browser.

## Scripts

| Command                           | What it does                                                               |
| --------------------------------- | -------------------------------------------------------------------------- |
| `npm run lint`                    | ESLint (flat config, next/core-web-vitals + TS, Prettier-compat last)      |
| `npm run format` / `format:check` | Prettier write/check                                                       |
| `npm run typecheck`               | `tsc --noEmit`                                                             |
| `npm run test`                    | Vitest unit tests                                                          |
| `npm run e2e`                     | Playwright end-to-end suite (auto-starts `next dev`; needs the DB running) |
| `npm run db:rls`                  | Recreates/refreshes `app_user` and applies `prisma/rls.sql`                |

## Testing

Unit tests cover env validation, permission matrix, slug/onboarding validation, organization data layer, the Supabase-style query facade, billing plans, entitlement decisions, and Stripe webhook processing. DB-dependent specs are gated behind `VIBE_DB_TESTS=1`.

```bash
docker compose up -d                  # from repo root
npx prisma db push && npm run db:rls  # once
npm run test
npm run e2e                           # registers a fresh user end-to-end
```

## Architecture notes

- **Multi-tenancy** — every tenant-owned row carries `organizationId`; access is enforced twice: app-side helpers (`withUser`, `withOrgContext` set `app.current_user_id` / `app.current_org_id` per transaction) and database-side RLS policies (`prisma/rls.sql`). The privileged client is only used for auth/session reads and registration/org-creation boundaries.
- **Roles** — `Membership.role` (`OWNER > ADMIN > MEMBER > VIEWER`) drives a central matrix in `src/lib/permissions.ts`; the workspace persona enum (`Role`) remains separate.
- **Supabase-style seam** — `src/lib/supabase/{client,server,types,errors,rls}.ts` provide a Supabase-flavored data API today, implemented over Prisma; when the platform moves to Supabase Auth/Postgres these modules swap internals without touching feature code.
- **Onboarding gate** — `/app/*` layout redirects to `/onboarding` until the signed-in user belongs to at least one organization.
- **Billing** — `src/lib/billing/` owns plans (`plans.ts`), Stripe access (`stripe.ts`), entitlement state (`entitlements.ts`), and idempotent webhook processing (`webhook.ts`). New organizations get a 7-day `DEMO` entitlement with no card. Entitlements are only mutated from verified Stripe webhooks or server-side billing logic; the UI reads entitlement state via `/api/billing/status` and never trusts a Stripe redirect as proof of payment.
- **Agent orchestration (content studio)** — `src/lib/agent/` adds tenant-scoped `AgentTaskExecution` flows. Server actions in `actions.ts` enforce the full authorization sequence (Clerk session → org membership → role → entitlement → RLS-scoped write + audit) and dispatch to the agent gateway at `AGENT_SERVICE_URL` over JSON-RPC 2.0. `/app/studio` lists `PENDING_APPROVAL` executions rendered by `components/agent/ApprovalCard.tsx` (caption drafts, compliance score, severity-coded risk badges, recommended edits, reviewer feedback). The Python engine in `../agent-engine` runs the LangGraph workflow (Content → Compliance → HITL pause → Publisher) on Celery/Redis with a Postgres checkpointer keyed by `threadId`.

## Repo-level workflow

Repository root contains `commands/*.md` (phased build workflow), `docs/` design briefs, and `docker-compose.yml` for the local database.
