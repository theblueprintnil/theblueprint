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
