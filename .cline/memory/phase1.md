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

## 2026-09-10 - Deployment readiness: Clerk env contract, Vercel (web + agent-engine), vault refresh

### What changed (commits 5f5f3d1..ff79392)
- Clerk keys `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY` added as **critical** EnvVarSpecs in `src/lib/env.ts` (+ test, `.env.example`, README table) - the fail-fast gate now covers auth. bcryptjs removed entirely; `prisma/seed.ts` rewritten as UTF-8 (was UTF-16/BOM -> ESLint "binary" parse error) with `passwordHash: 'clerk-managed'` (matches `session.ts` placeholder). 4 unused-var lint warnings cleared (rls.test opportunityA, orchestrator.test AiError import, zodToJsonShape param, decide() now param). `web/package.json` gained `engines.node >=22`.
- agent-engine deploys on Vercel per official docs (verified 2026-09-10): `pyproject.toml` needs `[project].dependencies` (Vercel ignores requirements.txt when both exist - .vercelignore excludes requirements.txt), `requires-python >=3.12`, `[tool.vercel] entrypoint = "agent_engine.api:app"` (web), `[[tool.vercel.subscribers]] entrypoint = "worker:app"` (Celery worker -> private queue-triggered function). `tasks.py` picks broker `vercel://` + backend `vercel-runtime-cache://` when env `VERCEL` is set; Redis path untouched for local dev. `vercel dev` (CLI >= 58.9.0) runs both locally.
- **Redelivery safety (Vercel Queues is at-least-once):** both Celery tasks now pre-check `AgentTaskExecution.status` (run: QUEUED/RUNNING; resume: APPROVED/REVISION_REQUESTED) and return a no-op `duplicate: true` summary otherwise - previously a redelivered task would re-run and `mark_failed` could flip PENDING_APPROVAL/PUBLISHED executions to FAILED. No countdown/eta anywhere (Queues does not defer them). `vercel-poll://` broker is the documented escape hatch for a classic worker elsewhere.
- Knowledge graph + `docs/blueprint-graph-vault/` refreshed to match code: 32 nodes (30 project + 2 external) / 57 typed relations, README stats fixed, new node "Public site & dashboards" (marketing/marketplace/dashboard/admin routes), stale observations corrected (7-day demo not 14, Vitest 20 files/141 tests, Playwright = 3 Clerk smoke tests, Docker compose includes Redis), `docs/graph-vault` path refs fixed to `docs/blueprint-graph-vault`.
- `web/README.md` gained a "Deploy to Vercel" section (Root Directory `web/`, Supabase Postgres recommended, bootstrap = prisma db push + db:rls from workstation, Clerk production instance, Stripe webhook at `/api/stripe/webhook`, `AGENT_SERVICE_URL`/`AGENT_SERVICE_TOKEN` wiring).

### Key gotchas discovered
- Vercel Celery topic naming: named app `blueprint_agent` publishes to `celery-blueprint_agent-<queue>`; a subscriber with no `topics` filter consumes every declared queue - no extra config needed for our single default queue.
- Tasks must fit the queue-triggered function max duration; `task_time_limit=600` requires maxDuration >= 600s (Pro) or lowering the limit on Hobby.
- `agent_engine/api.py` gateway pre-checks mirror the task guards (run only when QUEUED; resume only when APPROVED/REVISION_REQUESTED) - keep them in sync if statuses change.
- Obsidian vault files lagged the MCP graph (NIL-site node had 3 of 9 relations); regenerate from the graph, don't hand-trust the files.

### Validated
typecheck clean; eslint 0/0; vitest 133 pass + 8 DB-gated skip (141 total, 20 files); `next build` exit 0; agent-engine pytest 7/7 + module import ok (broker resolves redis:// locally).

## 2026-09-14 - Go-live preflight validator + runbook

### What changed
- `web/src/lib/preflight.ts` — pure pairing checks: web critical vars (reuses `collectEnvIssues`), placeholder markers (`YOUR_`, `GENERATE_A_LONG_RANDOM_STRING`, `_xxx`, `APP_PASSWORD`, `USER:PASSWORD@HOST`, `example.com`), `DATABASE_URL_APP` embeds app_user + password equal to `APP_DB_PASSWORD`, web/engine same-database (Supabase project-ref extracted from `db.<ref>.supabase.co` host or `pooler` username `<user>.<ref>`), engine string must be session/direct (rejects `:6543`/`pgbouncer`/`pooler.`), `AGENT_SERVICE_URL` parses http(s), `AGENT_SERVICE_TOKEN` == engine `AGENT_API_TOKEN`, OmniRoute creds present + non-placeholder, Clerk pk/sk mode consistency (mix = fail; test+`--prod` = fail), Stripe completeness + live prefixes under `--prod`, `AGENT_PUBLISH_ENDPOINT` warn-if-unset, `NEXT_PUBLIC_APP_URL` prod gate. `runPreflight` + `summarizePreflight` aggregate.
- `web/scripts/preflight.ts` (`npm run preflight`) — parses `web/.env` + `../agent-engine/.env` (real `process.env` wins per key); flags `--prod` `--connect` `--probe`. `--connect` = throwaway `PrismaClient({ datasourceUrl })` running `SELECT current_user, current_database()` per string (expects `app_user` on `DATABASE_URL_APP`). `--probe` = `GET /health` then `POST /agent/run` with empty params: 401 = token mismatch, 200 + JSON-RPC `-32602` = token accepted (auth runs before param validation in `api.py`, so the probe dispatches nothing).
- `docs/GO-LIVE.md` — 8-phase dependency-ordered launch checklist (gates → Supabase → bootstrap → agent-engine incl. worker maxDuration ≥ 600 s → web → Clerk domain/redirect → Stripe prices+webhook → smoke test).
- `web/README.md` — preflight paragraph in Deploy section + scripts-table row; `web/package.json` gained `preflight` script.

### Gotchas
- Editor payload cap 6000 chars: split large file creations; same-file sequential appends must chain via unique tail anchors across responses.
- `npx --prefix web` does NOT set cwd (unlike `npm --prefix web run`) — prettier resolved from repo root and matched nothing; use `Push-Location web; ...; Pop-Location`.
- Two command strings in one run_commands batch can race (a `--write` and `--check` produced false warnings); keep dependent commands sequential within one string.
- No CHANGELOG.md exists at repo root; changelog entry skipped by design decision to note.

### Validated
tsc 0; eslint 0/0; vitest 163 total (155 pass + 8 DB-gated skip; 21 files; `preflight.test.ts` 22/22); prettier check clean on all touched files; `npm run preflight` exit 0 against the real dev env (5 pass / 2 warn / 6 skip — no local `agent-engine/.env`); `--prod` correctly exit-1s on dev Clerk keys + missing `NEXT_PUBLIC_APP_URL`.

## 2026-09-17 - OmniRoute wiring + local gateway up

### What changed
- `agent-engine/.env`: `OMNIROUTE_BASE_URL=http://localhost:20128/v1`, `OMNIROUTE_API_KEY=<real key>` (TODO comment removed). Preflight placeholders + omniroute checks now PASS.
- Gateway running: `.venv\Scripts\python.exe -m uvicorn agent_engine.api:app --host 0.0.0.0 --port 8100` from `agent-engine/` (background Start-Process; logs `gateway-out.txt` / `gateway-err.txt`, gitignored via `gateway-*.txt` in agent-engine/.gitignore).
- `npm run preflight -- --probe` = 12 pass / 0 fail / 2 warn / 1 skip; live token round-trip PASS.

### Key facts
- OmniRoute (open-source AI gateway, Next.js) lives at `C:\Users\S Roe\OmniRoute`, runs via `npm run dev`, port 20128, OpenAI-compatible `/v1/*`, API key auth enforced (401 without valid key despite `REQUIRE_API_KEY=false` in its .env).
- OmniRoute data store: `C:\Users\S Roe\.omniroute\storage.sqlite` (better-sqlite3); `api_keys` table stores the raw key in the `key` column (key "OmniRoute API Key", created 2026-09-06).

### Gotchas
- Docker Desktop daemon down → Postgres :5433 and Redis :6379 unreachable; `/health` + probe auth need neither, but real pipeline runs do (start Docker Desktop, `docker compose up -d`, then `celery -A agent_engine.tasks worker --loglevel=info`).
- OmniRoute `/v1/models` catalog uses namespaced ids (`ds/deepseek-v4-pro*`, `auto/*`, `agnes/*`); `deepseek-chat` / `glm-4-plus` are NOT exact ids in the catalog — confirm model resolution at first real pipeline run (OmniRoute may alias them).
- OmniRoute provider creds warn "[Encryption] Failed to decrypt credential(s) [apiKey]" (STORAGE_ENCRYPTION_KEY empty) — provider re-auth may be needed for actual LLM calls.

## 2026-09-18 - A2A architecture + operational protocols (M0 docs)

### What changed
- New `docs/a2a/` set: `README.md` (index + locked parameters), `ARCHITECTURE.md` (topology, trust boundaries, task lifecycle, 3 contracts, 5 control flows, layer-to-component map, non-goals, open items), `OPERATIONAL-PROTOCOLS.md` (P1-P12), `LAYER-STATUS.md` (10-layer matrix + cross-cutting + gap register G1-G11), `AGENT-CARDS.md` (agent inventory, scope semantics, delegation, tier matrix), `SCHEMA-CHANGE-PLAN.md` (10 ordered changes with per-change validation).
- New `docs/adr/`: `template.md` + ADR-0001 transport (JSON-RPC 2.0 at the gateway), 0002 scoped JWT identity, 0003 policy packs over OPA/Neo4j, 0004 audit hash chain, 0005 Redis cache + pgvector, 0006 age tier + guardian authority, 0007 per-tenant `$250` threshold.
- `docs/GO-LIVE.md` gained a "Post-launch — A2A governance track" section: 5 live deviations + per-milestone gates.
- M0 is documentation only; no code or schema changed.

### Verified facts used by the docs
- `Role` enum has `GUARDIAN`; `WorkspaceType` has `GUARDIAN_PORTAL`; `/app/guardian/dashboard` is a `PagePlaceholder`. No `dateOfBirth`, no guardian relation, no consent record anywhere.
- `AgentExecutionStatus` = QUEUED, RUNNING, PENDING_APPROVAL, APPROVED, REVISION_REQUESTED, PUBLISHED, FAILED (no CANCELLED/EXPIRED/INPUT_REQUIRED).
- `AiRun.policySnapshotId String?` exists; `AgentTaskExecution` has NO `policySnapshotId`; `AuditLog.details` is `String?` (not Json).
- `Deal.amount` is `Float` (currency precision gap); `Deal` has no approval/co-sign columns.
- `permissions.ts` canonical matrix: OWNER/ADMIN/MEMBER/VIEWER over view, edit_content, manage_content, invite_members, manage_members, manage_settings, delete_organization. `manage_settings` = OWNER+ADMIN.
- Gateway auth is a shared static bearer compared as a string in `api.py:_authorize`; web-side twin `AGENT_SERVICE_TOKEN` in `src/lib/env.ts` (tier `reserved`).
- `web` npm scripts confirmed: build, lint, test, typecheck, preflight, db:rls, e2e, format, format:check, dev, start. `format:check` = `prettier --check .` run from `web/`, so root `docs/` is NOT prettier-gated.
- `agent-engine` has `.venv/Scripts/python.exe` + `pyproject.toml`; no `pytest.ini` (pytest config lives in pyproject).

### Gotchas
- Editor payload cap is 6000 chars; `build`-sized docs must be split. Two attempts failed over cap: `LAYER-STATUS.md` (6393) and `SCHEMA-CHANGE-PLAN.md` append (6013), and a P1-P3 protocol draft (7321). Keep chunks under ~5000 to leave headroom.
- Table-heavy markdown makes very long single lines: `LAYER-STATUS.md` is only ~28 physical lines though it renders as a big matrix — use `insert_line` at EOF, not a guessed line number.
- `prisma/rls.sql` cannot host a `plpgsql` trigger: the applier splits on `;` after stripping comments, so function bodies may contain no internal semicolons. Append-only triggers for `A2AAuditEntry` must live in `supabase/migrations/` (applied by `psql -v ON_ERROR_STOP=1`); the Prisma path gets grants + SELECT/INSERT-only policies as the equivalent control.
- `search_codebase` regex queries returned broad fuzzy matches (matched unrelated docs/content-pack lines) rather than exact hits; reading `prisma/schema.prisma` and `permissions.ts` directly was the reliable path.

### Blocked / excluded
- `A2A_Architecture_Blueprint.pdf` (17 MB, 14 pages) is image-only with zero extractable text; excluded from scope and flagged in `docs/a2a/README.md` and `LAYER-STATUS.md`. No new copy appeared in Downloads. OCR in act mode or a text re-supply is required to fold it in.

### Validated
- File inventory: `docs/a2a/` 6 files + `docs/adr/` 8 files = 14 files, 116566 B total. All 12 protocols present (`## P1` … `## P12` verified by heading scan); 11 gap rows G1-G11 present.
- Gates re-run after the doc pass (docs-only change, so this confirms no regression): `npm run typecheck` exit 0, `npm run lint` exit 0, `npm run test -- --reporter=dot` exit 0 = 19 files passed / 2 skipped, 155 tests passed / 8 skipped of 163. Matches the documented baseline.
- Prettier not re-run: `format:check` is `prettier --check .` from `web/`, and no file under `web/` was touched.
- Working tree: new `docs/a2a/` and `docs/adr/`; modified `docs/GO-LIVE.md`, `.cline/memory/phase1.md`. Nothing under `web/` or `agent-engine/` changed.

## 2026-09-18 (2) - Gemini source ingested clean + reconciliation

### What changed
- Ingested `C:\Users\S Roe\Downloads\Blueprint NIL A2A Architecture Design - Google Gemini.txt` (854 lines, 27738 chars) — the clean text of the conversation I previously only had as a degraded pypdf extraction (~44 KB). The clean copy restored material the extraction lost, notably the author's own answers to Gemini's 3 clarifying questions.
- New `docs/a2a/SOURCE-RECONCILIATION.md`: adopted items A1-A15, open conflicts OPEN-1..OPEN-8, rejected code defects C1-C8, convention mismatches, per-step disposition of the source's 7 steps, and what proceeds vs what waits.
- `docs/a2a/README.md`: added the reconciliation doc row + a "Source inputs" table.
- `docs/a2a/AGENT-CARDS.md`: new "External skill vocabulary" section (`generate_post`, `audit_contract`, `propose_deal` mapped to internal agents).
- `docs/a2a/ARCHITECTURE.md`: contract 1 `complexityHint` -> `complexityTier` (`LOW|MEDIUM|HIGH|CRITICAL`); new "Adopted field vocabulary" block with the source's exact field names.
- `docs/a2a/SCHEMA-CHANGE-PLAN.md`: `traceId` added to change 5.
- `docs/a2a/OPERATIONAL-PROTOCOLS.md`: P12 rule 11 added (opaque execution).

### NEW facts recovered from the clean source (previously unknown)
- The author answered Gemini's 3 questions: (1) Python = serverless containers (Gemini framed as AWS ECS/Fargate), (2) IdP = Supabase Auth asymmetric JWKS, (3) Neo4j = local Docker container. NONE of these were in my earlier PDF extraction.
- Source's public skill names, JSON-RPC method names (`a2a.task.create|status|cancel`), complexity tier enum, and full Zod field names.
- Source's hash chain is GLOBAL (`ORDER BY sequence_number DESC LIMIT 1`, global BIGSERIAL), not per-tenant — a real divergence from ADR-0004.

### Conflicts found (all unresolved, need user decisions)
- OPEN-1 IdP: source says Supabase Auth JWKS; repo live IdP is Clerk (`CLERK_SECRET_KEY` tier critical at web/src/lib/env.ts:29) and all Supabase keys are tier `reserved` (env.ts:34/:39/:44). Blocks M1 start.
- OPEN-2 Python placement: source AWS ECS/Fargate vs repo already on Vercel (`[tool.vercel]`, `vercel://`, worker maxDuration >= 600s).
- OPEN-3 Neo4j: source local Docker `neo4j:latest` vs ADR-0003 deferral.
- OPEN-4 A2A adapter placement: source `web/src/app/api/a2a` vs ADR-0001 (adapter in agent-engine).
- OPEN-5 ID prefixes `ath_`/`org_`/`cmp_` vs 17 models all `@default(uuid())`; RLS reads TEXT and must not cast to uuid.
- OPEN-6 `campaignId` mandatory in source contract 1 but NO Campaign model exists (verified model list of 17).
- OPEN-7 audit chain granularity + `a2a_audit_logs` snake_case vs `A2AAuditEntry`; global chain leaks cross-tenant volume via sequence gaps.
- OPEN-8 hash formula: source `payload::text || seq || prev` (bare concat, ambiguous preimage) vs hardened delimited+canonical formula.

### Defects rejected in the source's sample code
- C1 (Critical): SSE route reads `tenantId` from a query param with NO auth and uses `SUPABASE_SERVICE_ROLE_KEY` in a user-facing handler — fails .clinerules steps 1,2,3,6 at once.
- C2: client hook imports `createHash` from `node:crypto` in a React client component (browser cannot).
- C3: client recomputes `JSON.stringify(payload)` while the trigger hashed `payload::text` — verification would always report tampering.
- C4: BEFORE INSERT trigger reading the last row globally races under concurrency and forks the chain.
- C5: `vllm` as a dependency of a "lightweight Docker image" on AWS Fargate — Fargate has no GPU.
- C6: `mutations.py` (Python) placed inside the Next.js TS tree.
- C7: `runtime = "edge"` holding a long-lived Supabase Realtime subscription from module scope.
- C8: global BIGSERIAL leaks tenant volume.

### Gotchas
- Re-confirmed editor cap: a 6985-char append to SOURCE-RECONCILIATION.md was rejected; splits needed at ~4500-5000 chars.
- PowerShell `Select-String -Path ... -Pattern "runtime\s*=\s*'edge'"` fails with "positional parameter cannot be found that accepts argument 'edge\\'"; quoting single quotes inside a double-quoted PowerShell string is fragile — use `Get-ChildItem ... | Select-String -Pattern` with a scriptblock or avoid quotes in the pattern.
- `Get-ChildItem -Recurse -Include` returns paths that break when piped to `Get-Content` for `[param]`-style dirs (PowerShell treats `[` as a wildcard) — pipe individual file objects instead.
- Shell integration dropped output twice on multi-statement commands; single-purpose commands captured reliably.

### Validated
- Gates re-run earlier this session on the unchanged code tree: typecheck 0, lint 0, vitest 155 passed / 8 skipped (163). No file under `web/` or `agent-engine/` has been modified in either M0 pass.
- Verified via grep that `complexityHint` no longer appears in docs (renamed), and that 12 protocol headings / 11 gap rows / 12 protocol-map rows remain intact.

## 2026-09-18 (3) - Excluded PDF recovered; deck transcribed

### The recovery
- `C:\Users\S Roe\Downloads\A2A_Architecture_Blueprint.pdf` (17,302,100 bytes, 14 pages) was previously excluded as image-only. It is NOT redundant and the earlier exclusion was a real coverage gap.
- No OCR available: no `tesseract` / `ocrmypdf` / `pdftoppm` / `magick` on PATH; `pytesseract`, `pdf2image`, `fitz`, `pdfplumber`, `markitdown`, `docling` all MISSING. Only `pypdf` and `PIL` present.
- **Working recovery path (repeatable, no new tooling)**: `pypdf` `PdfReader` -> `page.images` -> write raw bytes -> `PIL` downscale to max width 1400 -> PNG -> read the images directly with the vision/OCR tool. Script: `%TEMP%\bp_extract.py`, output `%TEMP%\bp_pages\pNN_1_small.png`. Every page was exactly one 1376x768 embedded image with `extract_text()` length 0.
- Vision extraction via `zai-mcp-server__extract_text_from_screenshot` worked. 60s MCP timeout: batches of 7 mostly succeeded; batches of 3 reliable. Retried the 2 timeouts individually.

### Deck contents (title: "THE BLUEPRINT: AUTONOMOUS A2A ARCHITECTURE")
- Authoritative **layer -> technology map**: L1 Next.js/WS/SSE; L2 Node/FastAPI + Postgres RLS; L3 Neo4j+OPA; L4 LangGraph/Celery/Redis; L5 pgvector+Supabase Storage; L6 RouteLLM+semantic cache; L7 OpenAI/Claude/Fal.ai/vLLM; L8 NeMo Guardrails+LangSmith; L9 PostgreSQL/Celery; L10 Unsloth/AutoTrain/S3. Zones 1-4.
- **Hybrid cloud zones**: Cloudflare (edge proxy + L6 router/cache in Redis), Vercel (L1/L2/L9), Supabase (L2 **Auth0** + Postgres RLS, L5 pgvector+S3), AWS (L3 Neo4j AuraDB, L4 Fargate+LangGraph, L8 guardrails ECS, L10 SageMaker/Modal).
- **Age-gated matrix (authoritative)**: Youth 8-12 Restricted draft-only, scopes read+propose, COPPA, dual signature, guardian SOLE co-sign; Junior 13-17 Co-Pilot, +co-sign, dual sig mandatory; Senior 18-24 Full Autonomous Delegate, read+`a2a:execute`+sign, auto-execute under thresholds e.g. <$250.
- **3-axis limit model**: recursion depth (cap 5), concurrent active tasks (sample 35/40), token/cost budgeting (sample 75% monthly cap). Rejection = JSON-RPC **-32005 Too Many Requests** + **X-RateLimit-Reset** header. Upstash Redis sliding window.
- Tenant isolation models: Pooled A2A Service (app-level namespaces, L6), Pod-per-Tenant (network/container, enterprise), Dynamic Ephemeral (Firecracker microVMs, L4, destroyed post-task).
- HITL states: GENERATING -> AUDITING -> STAGED_FOR_REVIEW (persisted to Redis), interrupt() on pass; Path A approve -> COMPLETED -> publish; Path B edit -> publish + L10 delta capture.
- Audit: table named `a2a_audit_log_entries` (a THIRD name vs `a2a_audit_logs` and my `A2AAuditEntry`); hash = payload chained with previous_hash.
- FTC: injects **both `#ad` and `#sponsored`**. Guardian auth = **cryptographic signature**.
- Cost routing: cache hit $0 / ~10ms; low complexity -> open-weight SLMs on vLLM; high -> Claude 3.5 Sonnet / GPT-4o.

### Corrections applied to protocols
- **P3 corrected**: dual signature now required at `8–12` as well as `13–17` (my earlier version restricted dual-sign to 13-17 — the deck contradicts that). Added rule 11: guardian authorisation is a cryptographic signature bound to the artifact version. Verification extended with the 8-12 athlete co-sign refusal.
- **P5**: disclosure injection now covers `#ad` AND `#sponsored`.
- **P7**: rules 11-12 added — three-axis limit model + the `-32005` / `X-RateLimit-Reset` rejection contract.
- **LAYER-STATUS.md / README.md**: excluded-input status cleared, now "recovered".

### New open items + defect
- OPEN-9 IdP now has THREE candidates: Clerk (live), Supabase Auth (conversation), **Auth0 (deck slide 3)**.
- OPEN-10 routing targets, OPEN-11 Redis task state vs PostgresSaver, OPEN-12 audit table naming, OPEN-13 scope name (`a2a:execute` deck vs `a2a:task:execute` spec), OPEN-14 isolation models.
- **C9 (Critical)**: slide 6's claims->`x-tenant-id` header must be UNCONDITIONALLY overwritten by the edge; if client-supplied `x-tenant-id` is forwarded, the RLS binding enforces the wrong tenant. Same class as C1.
- H16 records six places where the source documents contradict each other (IdP, task method name, audit table name, hash preimage, scope name, where L6 runs).

## 2026-09-18 (4) - M1 IMPLEMENTED: scoped JWT identity, ingress remediation, schema changes 1-4

### What changed (all gates green)
- `agent-engine/agent_engine/identity.py` (NEW, 188 lines): PyJWT RS256/ES256 verifier. REQUIRED_CLAIMS = sub/iss/aud/exp/iat/tenant_id/org_id/agent_id/scopes; delegation_depth capped at 5; scopes accepted as list or delimited string; ADMIN_SCOPE wildcard via `has_scope`; `load_jwks_public_keys` (x5c cert chain -> PEM); `load_pinned_pem`; `key_fingerprint` (sha256 of SPKI DER); `verify_shared_secret` constant-time. Deps `pyjwt[crypto]` + `cryptography` added to pyproject (both already in venv).
- `agent-engine/agent_engine/config.py`: + agent_jwt_issuer / agent_jwt_audience / agent_jwt_leeway_seconds / agent_jwks_path / agent_pinned_pem_dir.
- `agent-engine/agent_engine/api.py`: `_authorize` replaced by `_authenticate` (bearer strip -> JWT verify -> AgentPrincipal; shared-secret constant-time fallback; `_AUTH_MODE` derived from key presence) + `_enforce` (403 on body-org vs claim-org mismatch; 403 on missing required scope). Both routes capture the principal before the method check (auth-before-parse preserved for the preflight probe's 401-before-`-32602` contract) and call `_enforce(principal, params.organization_id, "a2a:task:execute")` after param validation.
- `agent-engine/tests/test_identity.py` (NEW): 29 tests - happy path, admin wildcard, 9-way parametrized missing-claim, empty/non-string scopes, string/list scope equivalence, expiry, issuer/audience mismatch, depth cap/at-cap/non-int, alg=none, HS256, unknown kid, no-kid tries-all, tampered payload, ES256, JWKS x5c roundtrip (self-signed cert built in-test), pinned PEM + fingerprint, shared-secret matrix.
- `web/prisma/schema.prisma`: Athlete.dateOfBirth + ageTierVerifiedAt; Organization.autonomyThresholdMinorUnits @default(25000) + autonomyKillSwitch @default(false); NEW GuardianLink, GuardianConsent, AgentRegistration, AgentKey — plan changes 1-4 verbatim, plain-string FKs, no @relation (so no back-relation edits anywhere). `prisma validate` green.
- `web/prisma/rls.sql`: grants + ENABLE/FORCE RLS + org-scoped policies for the four new tables via app_user_role_in. GuardianConsent is append-only (SELECT+INSERT policies, no UPDATE/DELETE). AgentKey gets NO app_user grant — org-less table, privileged-path managed, deny-by-default under FORCE RLS.
- `web/src/lib/agent/tier.ts` (NEW) + `__tests__/tier.test.ts` (NEW, 11 tests): `resolveAgeTier` fails closed (missing/unparseable/future DOB -> RESTRICTED; <=12 YOUTH; <=17 JUNIOR; >=18 SENIOR).
- `agent-engine/.env.example`: + 5 AGENT_JWT_* lines.
- `docs/adr/0002`: Resolution addendum documenting the `_authenticate`/`_enforce` split and the key-presence-derived auth mode. `docs/a2a/LAYER-STATUS.md`: G1/G2/G3 -> Partial with specifics.

### Validation results
- Engine: py_compile exit 0; pytest **36/36 green** (7 rules + 29 identity). One benign InsecureKeyLengthWarning from the intentional 13-byte HS256 rejection key.
- Web: `prisma validate` green; `prisma generate` ok; `typecheck` 0; `lint` 0; **vitest 166 passed / 8 skipped (174)** — 20 files passed; `next build` exit 0.
- DEFERRED (Docker Desktop not running — pipe missing): `npx prisma db push`, `npm run db:rls`, `supabase/tests/tenant_isolation.sql`. Recorded in LAYER-STATUS G3. Run when Docker is up.

### Gotchas
- Test-fixture bug caught by the gate: I wrote a boundary test asserting JUNIOR for a 2015 birth date against 2026 (= age 11 = YOUTH). Arithmetic-first when writing age fixtures; the resolver was right, the test was wrong. Fixed to 2010 (age 16).
- The patch-script approach (m1_apply.py) was abandoned mid-build: once exact file contents were in context, direct editor calls were strictly better, and the script's Organization fields had drifted from plan change 4 (it guessed `autonomyThresholdUsd`+`complianceJurisdiction`; the plan specifies `autonomyThresholdMinorUnits Int @default(25000)` + `autonomyKillSwitch Boolean`). The plan document is authoritative over any working notes. Scratch script deleted.
- ADR-0002's "_authorize seam" now ships as two functions; ADR updated so docs match code.

### Deliberate interpretations (flagged, not silent)
- `resolveAgeTier` maps >=18 to SENIOR, treating 24 as market focus rather than a cutoff; tiers only cover 8-24 in the sources, and RESTRICTED-for-adults would fail the product's purpose.
- Auth mode derives from key presence rather than a new env flag — the deprecation window expressed as configuration (web's celery-client is unchanged and still sends AGENT_SERVICE_TOKEN, which remains valid).

### Residuals -> M2
- G1 remainder: shared-secret window still trusts body org; store still uses privileged DATABASE_URL in the request path — close with the RLS-bound store session + audit ledger (M2).
- G2 remainder: retire the shared secret once the web dispatcher mints internal-PEM JWTs (M2).
- Tier/guardian gates are not yet wired into the LangGraph HITL node — that is M3 with policy packs.

