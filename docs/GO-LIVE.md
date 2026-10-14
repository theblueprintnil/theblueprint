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

- [ ] Point `web/.env` `DATABASE_URL` at the **direct** string; choose `APP_DB_PASSWORD` (see *Create the app login roles* below)
- [ ] `npx supabase db push` — schema bootstrap (the Prisma-schema path `npx prisma db push` is superseded; all DDL lives in `supabase/migrations`)
- [ ] `npm run db:rls`
- [ ] Decision: skip `npx prisma db seed` unless the demo tenant (Carter Athletics) is wanted in production
- [ ] `npm run preflight --connect` — `app_user` connects, database identity confirmed

### Create the app login roles (`app_user`, `app_agent`)

Both are login roles sharing one password — the `APP_DB_PASSWORD` from `web/.env`:

| Role | Consumed by | Connection string |
|------|-------------|-------------------|
| `app_user` | web runtime (RLS-bound `prismaApp`) | `DATABASE_URL_APP` — `postgresql://app_user.<ref>:<APP_DB_PASSWORD>@...pooler.supabase.com:6543/postgres` |
| `app_agent` | agent-engine gateway request path | `AGENT_DATABASE_URL` — `postgresql://app_agent:<APP_DB_PASSWORD>@...pooler.supabase.com:6543/postgres?pgbouncer=true` |

**Workstation path (preferred).** Set in `web/.env`:

```
APP_DB_PASSWORD="<APP_DB_PASSWORD_PLACEHOLDER>"
```

Then run `npm run db:rls` from `web/`. `scripts/apply-rls.ts` creates each missing role via `CREATE ROLE <name> LOGIN PASSWORD '<APP_DB_PASSWORD>'`, refreshes the password via `ALTER ROLE` when the role already exists, then applies every grant, `FORCE ROW LEVEL SECURITY` statement, and policy from `prisma/rls.sql`. This step requires a DDL-capable connection: the **direct/session** string (`db.<ref>.supabase.co:5432`), or — where the IPv6-only direct host is unreachable — the **session-mode pooler** (`aws-0-us-east-1.pooler.supabase.com:5432` with username `postgres.<ref>`). `CREATE ROLE` and DDL fail through the transaction pooler (port 6543).

**Dashboard path (alternative).** When not running from the workstation, execute in the Supabase SQL editor:

```sql
create role app_user  login password '<APP_DB_PASSWORD_PLACEHOLDER>';
create role app_agent login password '<APP_DB_PASSWORD_PLACEHOLDER>';
```

On the local Docker/Prisma foundation, `npm run db:rls` must still run afterward — it detects the existing roles, refreshes the password, and applies the `prisma/rls.sql` grants (schema usage, table CRUD, sequences, policies). On the migrated Supabase remote, do **not** run it — see the compatibility note.

**Compatibility note (2026-10-09).** `prisma/rls.sql` grants target the legacy Prisma-native CamelCase tables (`"Organization"`, `"Membership"`, …). The remote built from `supabase/migrations` uses snake_case tables (`organizations`, `organization_members`, `ai_runs`, …) that carry their own RLS policies, and contains no grants to `app_user`/`app_agent` — `npm run db:rls` against it fails on the first table grant (undefined table). Until the web app migrates onto the Supabase foundation (see `docs/SECURITY.md`, "two data foundations"), create the roles on the remote via the SQL above only; the roles are connection identities for `DATABASE_URL_APP` / `AGENT_DATABASE_URL`. The SQL can also be applied from the workstation without the DB password via the Management API — `POST https://api.supabase.com/v1/projects/<ref>/database/query` with an `Authorization: Bearer <personal-access-token>` header and body `{"query": "<sql>"}` — the same channel the dashboard SQL editor uses (this is how the roles were created on 2026-10-09).

The real `APP_DB_PASSWORD` never enters this document or any committed file; `<APP_DB_PASSWORD_PLACEHOLDER>` stays a placeholder.

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

## A2A governance — staged major-track release gate

The web product cannot launch until the internal web-to-engine trust boundary and
tenant-isolation controls below are verified. External A2A agents remain disabled until the
external-agent activation gate is complete and evidenced. Internal web dispatch and external
A2A ingress are distinct trust boundaries: the former uses the web dispatcher's short-lived
RS256 JWTs and pinned public verification material; the latter requires separately onboarded
external identities and JWKS verification. Neither path accepts a static bearer token.

### Web launch gate — internal M2 dispatch

- [ ] The engine verifies the web dispatcher's RS256 JWT by `kid`, issuer, audience, expiry,
  required claims, scopes, and registered tenant/org binding; no verification keys configured
  fails closed.
- [ ] Valid JWT dispatch succeeds, while expired, malformed, unsigned, tampered, wrong
  issuer/audience/algorithm, and unknown-`kid` JWTs fail before parameter parsing or dispatch.
- [ ] `AGENT_API_TOKEN` and `AGENT_SERVICE_TOKEN` are absent from deployed configuration and
  cannot authenticate; the engine uses public verification material only.
- [ ] The web Server Action completes the authorization sequence before dispatch: server-side
  user authentication, organization membership and canonical role, entitlement, and
  RLS-bound data access. The engine resolves tenant context only from verified claims and uses
  the RLS-bound `app_agent` request store.
- [ ] The preflight `--probe` validates JWT authentication against the deployed engine, and
  the A2A audit ledger records the authenticated actor, organization, action, target, and
  outcome for dispatch and sensitive state transitions.
- [ ] The evidence links are recorded in `docs/a2a/LAYER-STATUS.md` and ADR-0002 before the
  production launch decision.

### External A2A activation gate

External A2A ingress remains disabled after the web launch until all of the following are
verified: partner identity, issuer, JWKS, registration, scope subset, quota, and depth limits;
age-tier and guardian controls for every in-scope athlete; blocking compliance for automated
publishing; per-task cost breakers and cross-process tenant rate limits; and contract,
cross-tenant, and audit-attribution evidence. These controls are activation-blocking for
external agents, not a reason to weaken or defer the internal M2 launch gate.

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
