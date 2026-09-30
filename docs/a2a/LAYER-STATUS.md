# Layer Status — Specification Against Repository

Living document. Each row records what the specification intends for a layer, what
the repository actually contains, and the gap identifier that tracks the difference.
Update this file whenever a layer's status changes; it is the entry point for anyone
asking "is this built yet".

- **Verified**: 2026-09-21
- **Repository**: branch `main`; M2 fully live-validated 2026-09-21 against the local
  Docker Postgres (`blueprint-db:5433`): `prisma db push`, `db:rls` (129 statements,
  `app_user` + `app_agent`), the Supabase canonical chain including
  `20260904000000` and `20260919000000`, and `supabase/tests/tenant_isolation.sql`
  9/9 PASS including the append-only ledger (8) and cross-tenant denial (9);
  `ENGINE_DB_TESTS=1` pytest 69/69 and `VIBE_DB_TESTS=1` vitest 177/177 with zero
  skips. Fixes landed during validation: `Store` pool lazy-open (`store.py`), grants
  added to `20260904`/`20260919`, and the missing canonical `athletes` migration
  authored as `20260903000000`
- **Method**: direct inspection of `web/`, `agent-engine/`, `prisma/schema.prisma`,
  and the blueprint vault. Status is assigned from code, not from intent.

## The ten layers

| Layer | Specification intent | Repository reality | Status |
|---|---|---|---|
| L1 User and interface | Athlete, agency, brand, guardian, and admin surfaces; studio approval queue | Next.js 16 App Router in `web/`; marketing and app route groups; `/app/studio` approval queue wired to real Server Actions; `ApprovalCard.tsx` renders risk badges and reviewer feedback; `/app/guardian/dashboard` and `/admin/compliance` are `PagePlaceholder` shells | Partial |
| L2 Business logic | Org resolution, RBAC, entitlements, deal pipeline | Prisma 6.4 on Postgres with RLS; Clerk auth; `permissions.ts` canonical role matrix; `billing/entitlements.ts`; `deal-pipeline.ts` | Partial |
| L3 Policy graph | Versioned policy registry with a provable snapshot per verdict | Deterministic FTC, NCAA, and exclusivity checks in `rules.py`; `ncaa-nil-v1-2026` as a literal string; `AiRun.policySnapshotId` and, since M2, `AgentTaskExecution.policySnapshotId` (populated on create) exist, but there is still no pack registry and the value is a free literal rather than a foreign key | Partial |
| L4 Orchestration | A2A task lifecycle, delegation with depth cap, resumable graphs | LangGraph 4-node graph (content, compliance, HITL, publisher) with `PostgresSaver`; Celery with `redis://` locally and `vercel://` on Vercel; FastAPI JSON-RPC 2.0 gateway on `:8100`; redelivery-safe status guards; M2 adds `task.get`/`task.cancel`, `CANCELLED`/`EXPIRED`/`INPUT_REQUIRED` lifecycle, lazy expiry, and depth-cap enforcement against the registration row | Partial |
| L5 Knowledge engine | Brand voice and athlete context retrieval | Static `content-pack/` files; no embedding store, no retrieval path | Missing |
| L6 Model router | Complexity tiering, semantic cache, cost accounting | OmniRoute OpenAI-compatible gateway; model selected from environment config; no cache, no tiering, no per-task cost accounting | Missing |
| L7 Model serving | Generation and compliance models behind one interface | OmniRoute routes to DeepSeek (generation) and Z.ai (compliance); a separate TypeScript provider registry (`openai`, `anthropic`, `mock`) exists in the web tier | Partial |
| L8 Guardrails | Evaluate, mutate to compliance, advisory review, block publication | `rules.py` flags and scores only; it never mutates an artifact and never blocks a publish | Partial |
| L9 Human-in-the-loop | Value gate, age gate, guardian co-sign, bounded revision loop | LangGraph `interrupt()` plus `ApprovalCard.tsx` and OWNER, ADMIN review actions; the interrupt is unconditional and no age or value dimension exists | Partial |
| L10 Data flywheel | Edit deltas, redaction, evaluation gate, training export | `reviewerFeedback` string on `AgentTaskExecution`; no delta capture, no export, no eval harness | Missing |


## Cross-cutting controls

| Control | Specification intent | Repository reality | Status |
|---|---|---|---|
| Audit | Hash-chained, append-only, streaming, tamper-evident | `A2AAuditEntry` ledger live in code on both foundations: per-tenant SHA-256 chain (`audit.py`), sequence allocation under `pg_advisory_xact_lock`, append-only trigger in `supabase/migrations/20260919000000_a2a_lifecycle_and_audit.sql`, `verify_tenant_chain`, `auditSequence` link on executions, isolation assertions (8)/(9); dual-writes `AuditLog` during migration; no SSE stream yet | Partial |
| Agent identity | Scoped JWT with tenant and org claims, JWKS rotation, non-repudiation | M2 JWT-only gateway: `identity.py` verifies RS256/ES256 into `AgentPrincipal` with required `jti`; `_enforce` checks org claim, method scope, `AgentRegistration` status/org-binding/scope-subset/maxDepth; `jti` is single-use per task via the ledger. The registered web dispatcher mints internal RS256 JWTs verified with pinned public material. External JWKS onboarding and activation evidence remain disabled pending the external gate. | Partial |
| Tenant isolation | RLS-bound access at every tier; no privileged connection in a request path | Prisma RLS with `app_user_role_in` and `FORCE ROW LEVEL SECURITY`; the gateway request path runs on the RLS-bound `app_agent` store with `set_config('app.current_org_id', …)` per transaction (`Store.request_store`); the Celery worker and LangGraph checkpointer keep the privileged DSN as the documented, ledger-audited background-job exception; `app_agent` grants limited to the A2A tables | Partial |
| Cost and rate governance | Per-tenant rate limit, per-task breaker, plan quotas | In-memory TypeScript sliding window in `ai/rate-limit.ts` that does not cross processes; no breaker; `costMinorUnits` column now exists but nothing writes it yet | Missing |
| External interop | Agent card, task endpoint, streaming, cancellation | Card at `/.well-known/agent.json` (full AGENT-CARDS contract, `/agent/card` alias); `task.get` and `task.cancel` JSON-RPC methods with uniform cross-tenant not-found; stable error codes `-32001`..`-32004` published in the card; no streaming yet | Partial |

## Gap register

Ordered by blocking severity. Each gap names the milestone that closes it.

| ID | Gap | Severity | Milestone |
|---|---|---|---|
| G1 | Agent ingress resolved tenant identity from the request body and read over the privileged connection — **Closed (M2)**: JWT-only ingress (`verify_shared_secret` deleted, no key configured ⇒ 503 fail-closed), org derived from the verified `org_id`/`tenant_id` claim and re-checked against the `AgentRegistration` row; the gateway request path runs on the RLS-bound `app_agent` store (`AGENT_DATABASE_URL` + `Store.request_store` + `org_transaction` with `set_config('app.current_org_id', …)`), so the privileged DSN never appears in a user-facing handler. Background exception documented: the Celery worker and the LangGraph checkpointer keep the privileged DSN and write ledger rows | Closed | M2 |
| G2 | Shared static bearer token: no agent identity, no scopes, no rotation, no non-repudiation — **Closed (M2)**: `identity.py` verifies RS256/ES256 scoped JWTs (JWKS x5c + pinned PEM) into an `AgentPrincipal`, `jti` is required, scopes are matched per method, token scopes must be a subset of the registration row's, and reuse of a `jti` inside a task is rejected `-32004`. `AGENT_API_TOKEN` and `AGENT_SERVICE_TOKEN` are removed from both tiers and the web mints internal RS256 JWTs from a pinned `node:crypto` signer; no shared-secret path remains | Closed | M2 |
| G3 | Age data and the fail-closed `resolveAgeTier` are implemented and live-validated; guardian and age-tier gates are not yet enforced in the HITL flow. This does not block internal web launch when minors are out of scope, but it blocks external A2A activation for any in-scope minor. | Partial | M3 / External activation |
| G4 | HITL interrupt is unconditional; no value gate, age gate, or guardian co-sign | High | M3 |
| G5 | `AgentTaskExecution` cannot express the A2A lifecycle: no `CANCELLED`, `EXPIRED`, or `INPUT_REQUIRED`; no `a2aTaskId`, `parentTaskId`, `depth`, `costUsd`, `ageTier`, or `policySnapshotId` — **Applied (M2)**: enum extended and all eight columns added (`prisma/schema.prisma` plus migration `20260919000000`); `tasks.py` RUNNABLE/RESUMABLE guards, `store.cancel_task`/`expire_if_due`/`record_dispatch`, `SPEC_STATE_BY_STATUS` maps engine states onto A2A spec states, and `task.get`/`task.cancel` are wired end to end in `api.py` and the web `celery-client.ts`; `actions.ts` sets the fields on create and `cancelAgentExecution` transitions to `CANCELLED` | Applied | M2 |
| G6 | Compliance evaluates but never mutates and never blocks; no disclosure injection | High | M3 |
| G7 | No cost breaker, no cross-process rate limit, no per-task cost accounting | High | M4 |
| G8 | `AuditLog.details` is a `String`, not `Json`, and carries no chain, sequence, or tamper evidence — **Applied (M2)**: new `A2AAuditEntry` model (org-scoped `seq`, `prevHash`, `entryHash`, canonical `payload` JSON) with `audit.py` computing `SHA-256(org|seq|prevHash|canonical payload)`, sequence allocation under `pg_advisory_xact_lock(hashtext(org))`, a plpgsql `BEFORE UPDATE OR DELETE` append-only trigger in the migration (privileged roles included), `verify_chain` plus `verify_tenant_chain`, and `auditSequence` on each execution so a task links to its ledger rows. `AuditLog` is still dual-written and is not yet chained (M3/M4 residual) | Applied | M2 |
| G9 | External A2A activation has incomplete governance evidence — **Internal M2 is launch-gated separately**: `GET /.well-known/agent.json` serves the card (plus `/agent/card`), and `POST /agent/task` implements `task.get` and `task.cancel` with uniform cross-tenant not-found. External ingress remains disabled until partner identity/issuer/JWKS/registration, age and guardian controls where applicable, blocking compliance, cost/rate governance, streaming, and audit evidence meet the external activation gate in `docs/GO-LIVE.md`. | Partial | External activation |
| G10 | `Deal.amount` is a `Float`, so currency comparison near the `$250` threshold is inexact | Medium | M3 |
| G11 | Deployment divergence: the specification assumes Cloudflare AI Gateway, Neo4j AuraDB, AWS ECS, and NeMo Guardrails; the repository runs Vercel, Docker Postgres, and local OmniRoute | Low | Documented swap points |

## Source inputs recovered

| Input | State |
|---|---|
| `A2A_Architecture_Blueprint.pdf` (17 MB, 14 pages) | **Recovered.** Previously excluded as image-only. Every page is an embedded 1376x768 screenshot with a zero-length text layer, so no text-extraction path exists, but the page images were read directly and the whole deck is now transcribed in `SOURCE-RECONCILIATION.md` §H. It is not redundant: it supplies the age-gated permission matrix, the three-axis limit model, the `-32005` rejection contract, the tenant isolation workload models, and a third IdP candidate. |

## Maintenance rule

A row moves out of `Missing` or `Partial` only when the capability is verifiable in
the repository and covered by a test named in `SCHEMA-CHANGE-PLAN.md` or
`OPERATIONAL-PROTOCOLS.md`. Intentions do not move rows.
