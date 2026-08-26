# Phase 1 — Foundation (completed 2026-08-26)

## What exists now
- Next.js 16 App Router + TS strict + Tailwind v4 in `web/`; Prisma on Postgres (Docker root compose, port 5433)
- Auth: bcrypt sessions in `Session` table, cookie `blueprint_session`, middleware guards `/app/*`
- Multi-tenancy: `Organization` + `Membership` models; `organizationId` on Opportunity/Deal/AuditLog; `User.currentOrganizationId`
- Roles: `MembershipRole OWNER/ADMIN/MEMBER/VIEWER` matrix in `src/lib/permissions.ts` (persona enum `Role` kept separate)
- Onboarding gate: `/app/*` layout redirects to `/onboarding` when user has zero orgs
- Env validation: `src/lib/env.ts`, called lazily via `ensureEnv()` inside `db.ts`
- Supabase-style seam: `src/lib/supabase/{client,server,types,errors,rls}.ts` wrapping Prisma/fetch; planned real-supabase swap point
- Tests: Vitest 65/65 (with VIBE_DB_TESTS=1); Playwright 2/2 (`npm run e2e`)
- Quality gates green: tsc, eslint (1 pre-existing warning rls.test), prettier, next build

## Key gotchas discovered
1. **RLS recursion**: policies referencing Membership/Organization must go through the SECURITY DEFINER helper `app_user_role_in(text)` in `prisma/rls.sql`; direct EXISTS self-references trigger Postgres 42P17 because FORCE RLS applies to those tables.
2. **Text IDs**: Prisma String PKs are Postgres TEXT → never cast `current_setting(...)` to `::uuid`; quote every CamelCase identifier (`"userId"`) or Postgres folds to lowercase (42703).
3. **apply-rls splitter** splits raw file on ';', so comments are stripped BEFORE splitting and function bodies must contain no internal semicolons.
4. Supabase decision (user): keep Prisma now, wrap it in supabase-shaped API; Supabase env vars validated as 'reserved' tier.
5. Stale `run-next.mjs dev` processes hold Next build locks ("Another next build is already running").

## Not built (per scope)
Stripe, AI features, member invite emails (step 2 stubbed in UI), email verification, MFA.

## Repository state
- Monorepo as of 2026-08-26: `web/.git` removed (history archived to root `web-history.bundle`, gitignored via `*.bundle`); single repo on branch `main`, initial commit `4ce05a8` "feat: Scaffold multitenant SaaS" (127 files).
- Root `.gitignore` covers node_modules/, .next/, test-results/, coverage/, *.tsbuildinfo, logs, `*-out.txt`, OS junk.
- Gotcha 6: ignore rules cascade — deeper `web/.gitignore` overrides root negations, so `!.env.example` was added INSIDE web/.gitignore under its `.env*` rule or the env example template stays unstaged.

## 2026-08-26 - Tenant data model build
- Added Invitation, Subscription, Entitlement, UsageEvent, AiRun, Project models (reused User/Organization/Membership/AuditLog for profiles/orgs/org_members/audit_events).
- prisma/rls.sql: GRANTs + FORCE RLS + tenant-scoped policies via app_user_role_in for all new tables; UsageEvent insert+select only; Invitation writes OWNER/ADMIN.
- prisma/seed.ts: demo tenant Carter Athletics (STARTER, 3 seats, 100 AI credits, active sub, invite/project/usage/aiRun).
- New test src/lib/__tests__/tenant-model.test.ts (gated by VIBE_DB_TESTS=1): tenant A/B isolation, cross-tenant insert rejected, no-identity fails closed. 4/4 pass on live DB.
- Confirmed 2026-08-26 (option C): tenant-owned tables keep existing `organizationId TEXT` convention. All 7 tenant-owned-by-construction tables (Membership, Invitation, Subscription, Entitlement, UsageEvent, AiRun, Project) have NOT NULL references organizations(id). Opportunity/Deal/AuditLog keep nullable `organizationId` (pre-existing design; still RLS-gated via app_user_role_in).

### New gotchas
- 4. PowerShell Set-Content -Encoding UTF8 writes a BOM that breaks Prisma (P1012). Use [IO.File]::WriteAllText with UTF8Encoding($false).
- 5. apply-rls DROP FUNCTION app_user_role_in fails on re-run (2BP01) -> changed to DROP ... CASCADE (policies recreated after).
- 6. Nested relation names plural in org creates: projects/usageEvents/aiRuns/invitations (TS2561).
- 7. db:rls exit 0 can still mean new statements were silently dropped (empty interpolation var) -> verify rls.sql content directly.
