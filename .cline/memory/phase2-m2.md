# Phase 2 — M2: A2A lifecycle, hash-chained audit ledger, JWT-only ingress

Code-complete 2026-09-19 on branch `main`, commit `463ec70` + uncommitted M2 working tree.

## What landed

**Schema (both foundations).** `AgentExecutionStatus` gained `CANCELLED` / `EXPIRED` /
`INPUT_REQUIRED`; `AgentTaskExecution` gained `a2aTaskId` (unique), `traceId`, `parentTaskId`,
`depth`, `costMinorUnits`, `ageTier`, `policySnapshotId`, `cosignState`, `expiresAt`,
`cancelledAt`, `auditSequence` (BigInt). New `A2AAuditEntry`: org-scoped `sequence`, `action`,
`actorType`/`actorId`/`actorJti`, `targetType`/`targetId`, `outcome`, canonical `payload` Json,
`prevHash`, `entryHash`; `@@unique([organizationId, sequence])`.
- `web/prisma/schema.prisma` — models already reflected the M2 fields (M1 era), so M2 added
  the enum values and `A2AAuditEntry`.
- `web/prisma/rls.sql` — `app_agent` login role grants + policies on the A2A tables.
- `web/scripts/apply-rls.ts` — refactored to `ensureLoginRole()`, provisioning **both**
  `app_user` and `app_agent` idempotently.
- `supabase/migrations/20260919000000_a2a_lifecycle_and_audit.sql` — enum values, columns,
  `a2a_audit_entries`, RLS, and the append-only trigger in one file.
- `supabase/tests/tenant_isolation.sql` — section 8 (append-only, including privileged roles)
  and section 9 (cross-tenant denial).

**Engine.** `audit.py` (new) is the single hashing authority: canonical JSON, `entry_hash`,
`verify_chain`, genesis `prevHash` = 64×`'0'`. `store.py` rewritten around
`AuditActor`, `request_store`, `org_transaction` (`set_config('app.current_org_id', …)`),
`append_audit_entry` (sequence under `pg_advisory_xact_lock(hashtext(org))`,
`SHA-256(org|seq|prevHash|canonical payload)`, dual-writes `AuditLog`), plus `get_task`,
`cancel_task`, `expire_if_due`, `record_dispatch`, `jti_conflicts`, `registration_for`,
`verify_tenant_chain`. **Ledger rows are written inside the same transaction as the state
transition.** `api.py` is JWT-only (503 when no key is configured), enforces registration
status / org binding / scope subset / `maxDepth` / `jti` single-use, serves the card, and
exposes `task.get` + `task.cancel`. `identity.py` requires `jti`; `verify_shared_secret` is
deleted. `config.py` adds `agent_database_url` + `agent_public_base_url` and drops
`agent_api_token`. `schemas.py` carries the full agent card, `TaskGetParams`/`TaskCancelParams`,
`TERMINAL_STATUSES`, `SPEC_STATE_BY_STATUS`.

**Web.** `src/lib/agent/agent-jwt.ts` (new) mints RS256 JWTs with `node:crypto` — no new
dependency — and `agent-jwt.test.ts` covers it. `celery-client.ts` mints JWTs per dispatch and
adds `dispatchGetTask`/`dispatchCancelTask`. `actions.ts` sets `a2aTaskId`, `ageTier`,
`policySnapshotId`, `depth` on create and adds `cancelAgentExecution`. `AGENT_SERVICE_TOKEN` /
`AGENT_API_TOKEN` are gone from `env.ts`, both `preflight.ts` copies, and both `.env.example`
files.

## Validation (2026-09-19)

| Gate | Result |
|---|---|
| `agent-engine` pytest | **68 passed, 1 skipped** (skip = DB-gated concurrency test), 2 benign warnings |
| `npx prisma validate` / `generate` | valid |
| `npm run typecheck` | clean (after the two fixes below) |
| `npm run lint` | clean |
| `npm run test` (vitest) | **169 passed, 8 skipped** (net +3 from `agent-jwt.test.ts`) |
| `npm run build` | exit 0 |
| Live DB gates | **Not run — Docker Desktop down for a second consecutive milestone.** `prisma db push` (still clearing the deferred M1 push), `npm run db:rls`, migration `20260919000000`, `supabase/tests/tenant_isolation.sql`, and the `ENGINE_DB_TESTS` chain test are all pending. |

Two typecheck failures found and fixed in `agent-jwt.ts`: `readFileSync` was imported from
`node:crypto` (it lives in `node:fs`), and `resolvePrivateKey` returned `cachedKey` whose type
was narrowed to `string | null` by the module-level `let` (fixed by returning a local).

## Gotchas discovered

1. **Pydantic alias digit boundary.** `to_camel('a2a_task_id')` produces `a2ATaskId`, not
   `a2aTaskId`. Silent in validation terms — the field just never populates. Fix used:
   explicit `Field(alias="a2aTaskId")` on `TaskRefParams` and `A2ATask`. Any future
   `a2a*` field must repeat this.
2. **plpgsql cannot live in `rls.sql`.** The applier strips comments then splits on `;`, so a
   trigger function body is destroyed. Functions with internal semicolons must go in a
   `supabase/migrations/` file; `rls.sql` stays simple-statement-only.
3. **Role switching needs membership.** `SET LOCAL ROLE service_role` in a test fails because
   the session user is not a member of that role. `tenant_isolation.sql` section 9 dropped the
   role switch; fixture inserts run on the superuser connection instead.
4. **Fake stores must copy, not alias.** `FakeRequestStore` initially returned the same dict it
   stored, so mutations during a transition leaked into assertions. Copy on read.
5. **Chunked editor edits.** Edits above ~6 KB time out; split large doc updates into multiple
   smaller `editor` calls.

## Residuals handed to M3

- **TS chain mirror.** The ledger is engine-authoritative; the web tier writes `AuditLog` only.
  A TypeScript mirror of the hashing rule (or dropping the dual-write) is an M3 decision.
- **Streaming.** `tasks/sendSubscribe` / SSE is the last external-interop gap (G9 remainder).
- **JWKS endpoint.** Identity is file-based (pinned PEM dir + JWKS directory); no
  `/.well-known/jwks.json` HTTP route yet. ADR-0002 allows a key-source swap at the
  `_authenticate` seam.
- **Tier/guardian gates into HITL.** `ageTier` is now stored but not consumed by the graph;
  M3 wires the tier + guardian co-sign gates into the LangGraph HITL node with policy packs.
- **`AuditLog` is not chained** and still carries `details String`; it is dual-written only.

## Files touched

- Engine: `api.py`, `audit.py` (new), `config.py`, `identity.py`, `schemas.py`, `store.py`,
  `tasks.py`, `.env.example`, `README.md`,
  `tests/{test_audit_chain,test_identity,test_interop,test_lifecycle}.py`.
- Supabase: `migrations/20260919000000_a2a_lifecycle_and_audit.sql` (new),
  `tests/tenant_isolation.sql`.
- Web: `.env.example`, `prisma/schema.prisma`, `prisma/rls.sql`, `scripts/apply-rls.ts`,
  `scripts/preflight.ts`, `src/lib/env.ts`, `src/lib/preflight.ts`,
  `src/lib/agent/{actions,agent-jwt,agent-jwt.test,celery-client}.ts`.
- Docs: `docs/a2a/LAYER-STATUS.md`, `docs/a2a/SCHEMA-CHANGE-PLAN.md`,
  `docs/adr/0002-agent-identity-scoped-jwt.md`.

## Live-DB validation 2026-09-21 (deferred gates closed)

Docker finally up (`blueprint-db` + `blueprint-redis`). All twice-deferred gates ran green:
`prisma db push` (M1+M2 schema), `db:rls` (129 statements, `app_user` refreshed +
`app_agent` created), canonical chain `20260903000000`→`20260919000000`,
`tenant_isolation.sql` **9/9 PASS**, `VIBE_DB_TESTS=1` vitest **177/177 (0 skips)**,
`ENGINE_DB_TESTS=1` pytest **69/69 (0 skips)**, `next build` exit 0 (41 pages),
offline preflight **10 pass / 0 fail**, Playwright **3/3**, lint+typecheck+prettier clean
after a repo-wide `npm run format` (80-file drift, split into its own commit).

### Bugs the deferred gates caught (fixed same day)

1. **`store.py` pool never opened.** `ConnectionPool(..., open=False)` with no
   `open()` anywhere — `PoolClosed` on first DB touch. Would have broken the deployed
   engine's first request. Fixed with a thread-safe lazy `_ensure_pool_open()` called
   from `org_transaction` (the single pool consumer).
2. **Canonical `athletes` migration was missing.** `20260904000000` FK-references
   `public.athletes`, which no canonical migration created. Authored
   `supabase/migrations/20260903000000_create_athletes.sql` mirroring the Prisma
   `Athlete` model (owner-scoped RLS, org-mate read via membership join, no invented
   org column).
3. **Grants missing on post-20260826 canonical tables.** `20260826000002` granted
   only then-existing tables; `agent_task_executions` and `a2a_audit_entries` had
   policies but no privileges (section 9 died on `permission denied`). Added
   `grant` blocks to `20260904`, `20260919`, and the new `20260903` (ledger gets
   `select, insert` only — deliberate, the trigger enforces append-only).

### New gotchas

- **Two-track local DB:** Prisma (PascalCase, the app + GO-LIVE production path) and
  Supabase-canonical (snake_case + `auth.users`, future hosted swap) coexist in
  `blueprint-db`. `prisma db push` full-syncs and **drops the snake family** (P4002
  on `profiles→auth.users` blocks introspection first). Working order: drop that FK +
  canonical helper functions (cascade) → `db push --accept-data-loss` → re-apply
  canonical migrations. Reconciling the tracks permanently is an open M3+ decision.
- **`prisma db push` hangs silently** behind `Select-Object` when it wants the
  data-loss confirmation; kill the node PIDs and rerun with `--accept-data-loss`
  after previewing via `prisma migrate diff --script`.
- **psycopg_pool lazy-open pattern:** construct with `open=False` at import time,
  open on first `org_transaction` under a lock (import-time connect is slow/fragile).
