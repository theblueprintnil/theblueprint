# The Blueprint - Vitest unit suite

> entityType: testing

## Observations

- vitest.config.ts; DB-backed tests gated behind VIBE_DB_TESTS=1
- Test files under src/lib/__tests__ (db, deal-pipeline, env, mappers, onboarding, opportunities, organizations, permissions, rls, supabase, tenant-model), lib/ai/__tests__ (errors, orchestrator, prompts, provider, rate-limit, redaction), lib/billing/__tests__ (entitlements, plans, webhook)
- tenant-model.test asserts tenant A/B isolation and cross-tenant insert rejection on a live database
- Suite verified 2026-09-10: 20 spec files / 141 tests (133 passing + 8 DB-gated skips behind VIBE_DB_TESTS=1); env.test asserts the Clerk keys are critical-tier
- Successor of the retired 'Unit Test Harness' approach (Playwright-based unit runner) - current harness is vitest.config.ts + npm run test

## Relations

**Outgoing**

- `tests` → [[The Blueprint - RBAC permissions]]
- `tests` → [[The Blueprint - RLS security layer]]
- `tests` → [[The Blueprint - Multi-tenancy model]]
- `tests` → [[The Blueprint - Billing & Stripe]]
- `tests` → [[The Blueprint - AI assist layer]]
- `tests` → [[The Blueprint - Deal pipeline]]
- `tests` → [[The Blueprint - Supabase compat seam]]

**Incoming**

- none