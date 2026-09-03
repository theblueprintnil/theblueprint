# The Blueprint - Vitest unit suite

> entityType: testing

## Observations

- vitest.config.ts; 65+ passing tests per phase1 memory notes, DB-backed tests gated behind VIBE_DB_TESTS=1
- Test files under src/lib/__tests__ (auth, db, deal-pipeline, env, mappers, onboarding, opportunities, organizations, permissions, rls, supabase, tenant-model), lib/ai/__tests__ (orchestrator, provider, rate-limit, redaction, prompts, errors), lib/billing/__tests__ (entitlements, plans, webhook)
- tenant-model.test asserts tenant A/B isolation and cross-tenant insert rejection on a live database
- Test inventory verified 2026-08-30: 12 specs in src/lib/__tests__, 6 in src/lib/ai/__tests__, 4 in src/lib/billing/__tests__ (incl. a fixtures helper); DB-backed specs (tenant-model, rls, db) require VIBE_DB_TESTS=1
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