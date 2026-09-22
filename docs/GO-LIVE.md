# Go-Live Runbook

Dependency-ordered production launch checklist for The Blueprint (web + agent-engine). Background and local development live in `web/README.md` and `agent-engine/README.md`; this document only sequences the production steps. Every unchecked box is a human console step unless marked _(workstation)_. Both Vercel projects are GitHub-connected imports of this one repository (see ADR-0008): pushes to `main` auto-deploy Production and pull requests receive Preview deployments.

Run the preflight validator from `web/` between phases:

```bash
npm run preflight              # offline pairing checks (web/.env + ../agent-engine/.env)
npm run preflight -- --connect    # additionally open each configured database connection
npm run preflight -- --probe      # additionally hit the deployed gateway /health + token auth
npm run preflight -- --prod       # enforce live keys (Clerk pk_/sk_live_, Stripe sk_live_, https app URL)
```

## Phase 0 — Local gates _(workstation)_

- [x] `web`: `npm run lint && npm run typecheck && npm run test && npm run build`
- [x] `agent-engine`: `pytest`
- [x] `npm run preflight` reports zero FAIL for the dev environment

## Phase 1 — Provision Supabase Postgres

- [ ] Create the Supabase project (region close to the Vercel deployment)
- [ ] Save the **direct/session** string (`db.<ref>.supabase.co:5432`) — used for schema bootstrap and agent-engine
- [ ] Save the **pooled** string (`...pooler.supabase.com:6543`) — used for web runtime traffic only
- [ ] Set a strong database password

## Phase 2 — Schema + RLS bootstrap _(workstation)_

- [ ] Point `web/.env` `DATABASE_URL` at the **direct** string; choose `APP_DB_PASSWORD`
- [ ] `npx prisma db push`
- [ ] `npm run db:rls`
- [ ] Decision: skip `npx prisma db seed` unless the demo tenant (Carter Athletics) is wanted in production
- [ ] `npm run preflight --connect` — `app_user` connects, database identity confirmed

## Phase 3 — agent-engine on Vercel

- [ ] In the Vercel dashboard: **Add New… → Project → Import** the GitHub repository, set **Root Directory** to `agent-engine/`, Production branch `main`
- [ ] Env vars (Production + Preview): `DATABASE_URL` (**direct** string — privileged, worker/checkpointer only), `AGENT_DATABASE_URL` (RLS-bound `app_agent` connection used by the gateway request path), `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, optional `AGENT_PUBLISH_ENDPOINT`, `AGENT_PUBLIC_BASE_URL` (the deployed engine URL; `REDIS_URL` is not needed — `tasks.py` switches to Vercel Queues when `VERCEL` is set)
- [ ] Web→engine auth (JWT-only since M2; the old `AGENT_API_TOKEN` shared secret no longer exists): register the web dispatcher's RS256 **public** key with the engine via `AGENT_JWKS_PATH` (JWKS document) or `AGENT_PINNED_PEM_DIR` (pinned PEM files) so tokens with `kid=internal-web` verify; keep `AGENT_JWT_ISSUER` and `AGENT_JWT_AUDIENCE` identical on both sides. Public key material is safe to commit to the repo; private keys are not
- [ ] Deploy and verify `GET <engine-url>/health` returns `{"status":"ok"}`
- [ ] **Function duration**: raise the queue-triggered worker function's max duration to **≥ 600 s** (Pro plan) — `task_time_limit=600` / `task_soft_time_limit=540` in `agent_engine/tasks.py`. On Hobby, lower `task_time_limit` instead and redeploy.

## Phase 4 — web on Vercel

- [ ] In the Vercel dashboard: **Add New… → Project → Import** the same GitHub repository as a **second** project, set **Root Directory** to `web/`, Production branch `main`. Framework auto-detects as Next.js; Node 22 comes from `package.json` `engines` and `postinstall` runs `prisma generate` during dependency install
- [ ] Env vars (Production **and** Preview) — set these **before the first deploy**; the build fails fast without the critical tier (`src/lib/env.ts`):
  - Critical: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (Clerk **production** instance), `DATABASE_URL` + `DATABASE_URL_APP` (pooled strings; `app_user` user + `APP_DB_PASSWORD` password), `APP_DB_PASSWORD`
  - App URLs: `NEXT_PUBLIC_APP_URL=https://<domain>`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup`
  - Agent orchestration (Studio dispatch): `AGENT_SERVICE_URL=<engine URL>`, `AGENT_JWT_ISSUER`, `AGENT_JWT_AUDIENCE`, `AGENT_INTERNAL_JWT_KEY` (inline RS256 private PEM — Vercel cannot mount key files; paste with newlines intact) **or** `AGENT_INTERNAL_JWT_KEY_PATH` (workstation/container filesystems only), `AGENT_INTERNAL_JWT_KEY_ID=internal-web`
  - Reserved (app boots without them until billing/Supabase go live): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Deploy and confirm the production URL renders
- [ ] Mirror the Vercel values into `web/.env` and run `npm run preflight --prod --probe` — zero FAIL

## Phase 5 — Clerk production

- [ ] Create the Clerk production instance (keys landed in Phase 4)
- [ ] Register the production domain
- [ ] Add `https://<domain>/onboarding` to allowed redirect URLs
- [ ] Redeploy web if keys changed in this phase

## Phase 6 — Stripe production

- [ ] Create Starter / Growth / Premium products + prices; copy the `price_…` ids
- [ ] Set `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*` in Vercel
- [ ] Create the webhook endpoint `https://<domain>/api/stripe/webhook` with `customer.subscription.created/updated/deleted`, `invoice.payment_failed`, `customer.subscription.trial_will_end`
- [ ] Copy the `whsec_…` signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Redeploy web; `npm run preflight --prod` passes the Stripe check

## Phase 7 — Smoke test

- [ ] `/signup` → `/onboarding` → organization created, signed in as OWNER, 7-day DEMO entitlement
- [ ] Studio dispatch reaches the engine; execution lands in `PENDING_APPROVAL` with a rendered approval card
- [ ] Approve / request revision → resume task transitions the execution (Vercel Queues redelivery-safe)
- [ ] `/app/settings/billing` upgrade → Checkout completes → entitlement updates from the verified webhook only
- [ ] Stripe dashboard shows webhook deliveries returning 2xx

## Notes

- The preflight script cannot read values stored in Vercel; keep the local `.env` mirrors in sync and use `--probe` to verify the deployed token pairing.
- To run a classic Celery worker off-Vercel against the same queues, switch the broker to `vercel-poll://` (see `agent-engine/README.md`).
- `npx prisma db seed` loads a demo tenant; leaving it out of production is the default.

## Post-launch — A2A governance track

Launch does not depend on the A2A governance work, but the deviations below are live in
production the moment the gateway is reachable. They are tracked in
`docs/a2a/LAYER-STATUS.md` and must be closed before any external agent is onboarded.

| Deviation | Live risk | Target |
|---|---|---|
| The gateway authenticates with one shared static bearer (`AGENT_API_TOKEN` / `AGENT_SERVICE_TOKEN`) | No agent attribution, no scopes, no rotation; one leak grants everything | M1, ADR-0002 |
| The gateway resolves the organization from the request body and reads over the privileged `DATABASE_URL` | Bypasses the RLS guarantee that `docs/SECURITY.md` establishes, and violates the `.clinerules` sequence | M1, gap G1 |
| No age model, so no tier can be computed | A minor's content path is identical to an adult's | M1, ADR-0006 |
| Compliance evaluates but never blocks | A `HIGH` finding does not prevent publication | M3, P5 |
| No cost breaker or cross-process rate limit | Unbounded per-task spend and no tenant-level throttle | M4, P7 |

Order matters: agent identity and ingress remediation first, because every later control
depends on knowing who the caller is and which tenant they act for.

### Gates for each milestone

```text
cd web
npm run typecheck && npm run lint && npm run test && npm run build

cd ../agent-engine
.venv\Scripts\python.exe -m pytest

cd ../web
npm run preflight -- --probe
```

A milestone is complete only when all three pass and the corresponding rows in
`docs/a2a/LAYER-STATUS.md` have been updated to reflect verified reality.

See `docs/a2a/README.md` for the full document set and `docs/adr/` for the decision
records.
