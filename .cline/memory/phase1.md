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

## 2026-09-04 - Phase 5: A2A NIL agent orchestration (content studio approvals)

### What exists now
- Prisma: new enums `AgentGraphKind`, `AgentExecutionStatus`, `RiskSeverity`; new org-scoped `AgentTaskExecution` model (`@@unique([organizationId, threadId])`, JSON complianceFlags/captions/inputRef, reviewerId/reviewerFeedback, complianceScore). RLS in `prisma/rls.sql`: members read+insert, OWNER/ADMIN-only update (review). Mirror DDL `supabase/migrations/20260904000000_create_agent_execution.sql`. Demo `PENDING_APPROVAL` row seeded for Carter Athletics.
- `agent-engine/` (new Python package at repo root): Pydantic v2 camelCase domain + JSON-RPC 2.0/A2A envelopes, OmniRoute OpenAI-compatible gateway (DeepSeek generation + Z.ai compliance), deterministic FTC/NCAA/exclusivity rules (append flags only, never reject), psycopg tenant-scoped store, LangGraph graph `content -> compliance -> hitl_node (interrupt) -> {publisher | content loop}` compiled with `PostgresSaver` keyed by `threadId`, Celery tasks `run_nil_generation_pipeline` / `resume_nil_pipeline_after_approval`, FastAPI JSON-RPC gateway (`/agent/run`, `/agent/resume`, bearer `AGENT_API_TOKEN`), pytest suite.
- Frontend: `web/src/lib/agent/{types,celery-client,queries,actions}.ts` (real `"use server"` actions enforcing the 7-step authz sequence), `web/src/components/agent/ApprovalCard.tsx`, live `/app/studio` approval queue. Root `docker-compose.yml` now includes Redis; `web/.env.example` gained `AGENT_SERVICE_URL`/`AGENT_SERVICE_TOKEN` (registered as reserved in `env.ts`).

### Key gotchas discovered
- The spec's `Tenant` = repo's `Organization`; tenant FK stays `organizationId` per repo convention. Agent workers are background jobs: they use the privileged connection but always filter on `organizationId` and write audit rows (never the user request path).
- psycopg + Prisma CamelCase tables: every identifier must go through `psycopg.sql.Identifier` (quoted), enums are stored as uppercase strings, jsonb writes use `%s::jsonb` with `json.dumps`.
- Celery JSON serializer means task args must be primitives (brief/review passed as camelCase dicts, validated back into Pydantic models in the worker).
- Pydantic `alias_generator=to_camel` + `populate_by_name` matches the DB/UI camelCase contract exactly; dump with `by_alias=True`.
- LangGraph in-node `interrupt()` inside `hitl_node` is the pause; resume via `graph.invoke(Command(resume=review_dict), config=thread_config(threadId))`; state lives in the Postgres checkpointer, domain status lives in `AgentTaskExecution`.
- Next server action DB status transitions run under `withOrgContext` (RLS, owner/admin only) BEFORE the gateway dispatch; worker/store transitions are fail-closed (`mark_published` only from `APPROVED`).
- `editor` exact-match replace fails on CRLF files (seed.ts) - insert by line number instead.
- Validated: prisma validate/generate, tsc clean, eslint 0 errors (4 pre-existing warnings), vitest 132 pass/8 DB-gated skipped, `next build` OK, agent-engine pytest 7/7 (venv at agent-engine/.venv, gitignored), all python modules import clean (tasks/api/agents_workflow).

### To activate locally (not run)
- `npx prisma db push` (web), `npm run db:rls`, reseed (`npx prisma db seed`).
- `docker compose up -d` (postgres + redis), then in `agent-engine`: pip install -r requirements.txt, `celery -A agent_engine.tasks worker`, `uvicorn agent_engine.api:app --port 8100`.
- Add `AGENT_SERVICE_URL`/`AGENT_SERVICE_TOKEN` (== agent-engine `AGENT_API_TOKEN`) and OmniRoute creds to the respective `.env` files.
