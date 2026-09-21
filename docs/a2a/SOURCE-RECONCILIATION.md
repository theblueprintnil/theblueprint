# Source Reconciliation — Gemini A2A Architecture Design

This document treats the Gemini design conversation as a first-class input and records
exactly what was taken from it, what conflicts with locked decisions, what is rejected
on technical grounds, and what remains open. Nothing here silently overrides an ADR;
where the source disagrees with a decision record, the disagreement is listed as an
open item with an ID.

## Source inventory

| Source | Form | Quality | Status |
|---|---|---|---|
| `Blueprint NIL A2A Architecture Design - Google Gemini.txt` | 854 lines, 27,738 chars | Clean text | Authoritative copy |
| Same conversation as `Blueprint NIL A2A Architecture Design - Google Gemini.pdf` | ~44 KB normalized | Degraded extraction | Superseded by the `.txt` |
| `A2A Setup - Technical Specification.pdf` | ~21 KB extracted | Good | Authoritative for parameters |
| `Comprehensive Technical Blueprint_ The 10-Layer NIL AI SaaS Ecosystem.md` | ~15 KB | Good | Authoritative for topology |
| `A2A_Architecture_Blueprint.pdf` | 17 MB, 14 pages | Zero extractable text | Excluded, image-only |

The `.txt` restores material the PDF extraction lost: the author's own answers to the
three clarifying questions at the end of the conversation, the full Zod contract bodies
with exact field names, the complete SQL migration, the complete SSE route, and the
folder layout. Any earlier reading of this source that omitted those is superseded.

## A. Additional inputs adopted

These do not conflict with a decision record and are folded into the design.

| # | Input from source | Where it lands |
|---|---|---|
| A1 | Public skill vocabulary: `generate_post`, `audit_contract`, `propose_deal` | `AGENT-CARDS.md` — external card skills, mapped to internal agents |
| A2 | Complexity tiers `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` | Contract 1 replaces `complexityHint`; the four values mirror `RiskSeverity` |
| A3 | Exact Zod field names: `maxCostThresholdUsd`, `cachePolicy.{allowSemanticCache, similarityThreshold}`, `promptPayload.{systemPrompt, userPrompt, contextChunks}`, `executionMetadata.{modelSelected, provider, costUsd, latencyMs}`, `rawGenerationOutput.content`, `complianceRules.requireFtcDisclosure` | Contract 1 and 2 appendices |
| A4 | Contract 3 shape: `status` as `PASSED \| PASSED_WITH_MUTATIONS \| REJECTED_VIOLATION`; `auditSummary.{passed, mutationsApplied}`; `finalAssetPayload.auditedContent`; `platformFormatting.ftcTagInjected` | Contract 3 appendix |
| A5 | Provider vocabulary: `openai`, `anthropic`, `replicate`, `fal`, `vllm` | L7 provider registry; supersedes the narrower web-tier list |
| A6 | JSON-RPC public methods: `a2a.task.create`, `a2a.task.status`, `a2a.task.cancel` | P12 public surface, ADR-0001 left these unnamed |
| A7 | Trigger errcode `RESTRICT_VIOLATION` for the append-only guard | P8 and change 6 — more precise than a bare raise |
| A8 | `pgcrypto` plus `digest(x, 'sha256')` as the hashing primitives | Change 6 migration requirements |
| A9 | SSE operational details: 15-second heartbeat, `X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`, `text/event-stream` | P8 rule 10, P12 rule 8 |
| A10 | Client verification return shape `{ isValid, failedIndex }` | Admin compliance view breadcrumb |
| A11 | "A2A opaque execution layer" as an explicit stated property | P12 — prompts, chains, and schema are never exposed to callers |
| A12 | Downstream isolation headers `x-tenant-id`, `x-agent-id`, `x-org-id` derived from verified claims | P1 — claims become headers after verification, never before |
| A13 | `traceId` distinct from `threadId`: trace correlates a request, thread groups a task | New column in change 5; `threadId` already exists on `AgentTaskExecution` |
| A14 | Agent card must state authentication and scopes, not only skills | `AGENT-CARDS.md` card contract |
| A15 | Editorial: publish the card, do not publish internal structure | Reinforces ADR-0001 and P12 |

## B. Open conflicts requiring a decision

Each of these is a genuine disagreement between the source and a locked decision or a
verified repository fact. None is resolved by assumption.

### OPEN-1 — Identity provider for agent tokens

**Source**: Supabase Auth with asymmetric RS256/ES256 keys, verified against
`https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`. The author selected
"Supabase Auth" when asked.

**Repository**: the live human IdP is Clerk — `CLERK_SECRET_KEY` is declared at tier
`critical` in `web/src/lib/env.ts:29`. Supabase is declared but dormant:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` are all tier `reserved` (`env.ts:34`, `:39`, `:44`).
`docs/SECURITY.md` describes the Supabase schema as the Phase-2 intended end state, and
the Phase-1 record notes the decision to keep Prisma wrapped in a Supabase-shaped API.

**Conflict**: ADR-0002 specifies JWKS served from this project's own domain plus a pinned
PEM for internal hops. The source specifies Supabase Auth as the issuer.

**Why it matters**: it decides whether M1 can start immediately or waits on standing up
the Supabase project, and whether humans (Clerk) and agents (Supabase) have two distinct
issuers.

**RESOLVED 2026-09-18 — self-hosted JWKS plus a pinned PEM; Clerk stays the human IdP.** Both
alternatives were rejected for the reasons recorded in ADR-0002's Resolution section. OPEN-9
added a third candidate (Auth0) and is resolved the same way. M1 is unblocked and does not
depend on provisioning Supabase.

### OPEN-2 — Python runtime placement

**Source**: AWS ECS / Fargate serverless containers, chosen to isolate LangGraph and NeMo
from Next.js and to escape API-route timeouts.

**Repository**: `agent-engine` is already deployed to Vercel, with `[tool.vercel]`
entrypoints in `pyproject.toml`, a `vercel://` broker and `vercel-runtime-cache://`
backend selected when `VERCEL` is set, and a worker `maxDuration` raised to at least 600 s
in `docs/GO-LIVE.md` Phase 3.

**Conflict**: ADR-0001 records AWS ECS and SageMaker as documented swap points, not the
current target.

**Note**: Vercel Functions are serverless containers, so the author's answer may already
be satisfied. The substantive question is whether a second compute plane is wanted now.

### OPEN-3 — Neo4j policy graph

**Source**: local Docker `neo4j:latest` on ports 7474 and 7687 for development, Neo4j
AuraDB in staging and production, with Cypher rules for brand exclusivity.

**Repository**: no graph database. Exclusivity is a set-membership check in
`agent-engine/agent_engine/rules.py`.

**Conflict**: ADR-0003 defers Neo4j until exclusivity becomes a genuine multi-hop
traversal. The source's own example — a signed Nike athlete must not promote Adidas — is
a single-hop brand-versus-brand lookup, which is set membership.

**Why it matters**: a local Docker container is nearly free to add and would fix the
Cypher contract early, which is the source's stated benefit. The cost is a second
datastore in the local compose file and a schema to maintain.

### OPEN-4 — A2A adapter placement

**Source**: inbound surface in Next.js at `src/app/api/a2a/route.ts` with task and SSE
subroutes, plus `src/lib/a2a/` for auth, contracts, guardrails, orchestrator, and
security.

**Conflict**: ADR-0001 places the adapter inside `agent-engine` so one component
validates identity, RLS context, cost, and policy before dispatch, and so orchestration
is not duplicated. The source's layout would put a second orchestration path in the web
tier and re-cross the trust boundary.

**Why it matters**: it decides where the agent trust boundary is enforced, and whether the
inbound surface inherits the Next.js runtime limits the source itself wanted to escape.

### OPEN-5 — Identifier prefix convention

**Source**: `tenantId` must start with `ath_`, `orgId` with `org_`, `campaignId` with
`cmp_`, enforced in Zod.

**Repository**: all 17 models use `@default(uuid())` and store plain UUIDs. The RLS file
reads `current_setting(...)` as quoted `TEXT` and must never cast to `uuid`, and a
recorded gotcha is that Prisma `String` keys are Postgres `TEXT`.

**Conflict**: prefixes would require changing primary-key generation, migrating every
existing row, and would break the RLS predicates that compare against those keys.

**Why it matters**: it is a repo-wide migration for a cosmetic affordance, unless the
prefixes are confined to the external contract.

### OPEN-6 — `campaignId` references a non-existent entity

**Source**: `campaignId` is mandatory in `TenantContextSchema` and propagated through all
three contracts.

**Repository**: there is no `Campaign` model. Verified model list: `User`, `Organization`,
`Membership`, `Athlete`, `Brand`, `Opportunity`, `Deal`, `Session`, `AuditLog`,
`Invitation`, `Subscription`, `Entitlement`, `WebhookEvent`, `UsageEvent`, `AiRun`,
`Project`, `AgentTaskExecution`. A page exists at
`web/src/app/dashboard/brand/campaigns/new/page.tsx`, but it renders a static checklist
with no backing table.

**Why it matters**: a mandatory field pointing at nothing forces either a new model or a
contract change, and under the source's design it is required on every task.

### OPEN-7 — Audit chain granularity and table naming

**Source**: table `public.a2a_audit_logs` in snake_case, with a **global** chain — the hash
trigger runs `SELECT entry_hash ... ORDER BY sequence_number DESC LIMIT 1` with no tenant
predicate, and `sequence_number` is a global `BIGSERIAL`.

**Recorded design**: `A2AAuditEntry`, PascalCase with quoted identifiers per repository
convention, per-tenant chain, per-tenant sequence assigned under a per-tenant lock
(ADR-0004, P8, change 6).

**Two concrete objections to the source's global chain**:

1. Cross-tenant volume leak. A tenant reading its own rows sees gaps in a global sequence,
   which discloses other tenants' activity volume. `docs/SECURITY.md` treats tenant
   isolation as the core guarantee, and this leaks metadata across it.
2. Write coupling. Every tenant's append touches the same tail row, so one tenant's write
   volume slows another. This contradicts P7's noisy-neighbour rule.

**Why it matters**: it is a security and isolation decision, not a formatting preference.

### OPEN-8 — Hash formula ambiguity

**Source**: `entry_hash = SHA256(payload + sequence_number + previous_hash)`, computed in
SQL as `NEW.payload::text || NEW.sequence_number::text || NEW.previous_hash` — bare
concatenation with no delimiters, no tenant, and `jsonb::text` as the payload
serialization.

**Recorded design**: `SHA-256(organizationId || sequence || prevHash || canonical(payload))`
with explicit delimiters and canonical serialization.

**Objection**: bare concatenation is ambiguous. A payload of `ab` with sequence `1` and a
payload of `a` with sequence `b1` can produce an identical preimage, so two different
entries can share a hash and a substituted entry need not break the chain. `jsonb::text`
also does not guarantee a deterministic key order for all inputs, so the same logical
payload may not recompute to the same digest.

**Why it matters**: an ambiguous preimage undermines the tamper-evidence property the
ledger exists to provide.

## C. Technical defects in the source's proposed code

These are rejected as written. Each is a defect in the sample code, not a difference of
opinion, and each is fixable without abandoning the source's intent.

| # | Defect | Severity | Required fix |
|---|---|---|---|
| C1 | The SSE route reads `tenantId` from a query parameter, performs no authentication, and uses `SUPABASE_SERVICE_ROLE_KEY` in a user-facing route handler | Critical | Authenticate the caller, resolve the organization server-side from the session, and read through an RLS-bound client. `.clinerules` forbids client-supplied org ids as authoritative and forbids service-role queries in user-facing handlers |
| C2 | The client hook imports `createHash` from `node:crypto` inside a React client component | High | Use Web Crypto (`crypto.subtle.digest`) in the browser, or verify server-side and stream the verdict |
| C3 | Client verification recomputes `JSON.stringify(payload) + sequence` while the trigger hashed `payload::text \|\| sequence::text` | High | One canonical serialization used by both sides, or persist the canonical string at write time and verify against it |
| C4 | The hash trigger runs `BEFORE INSERT` reading the last row globally, while `sequence_number` is assigned by a global `BIGSERIAL` | High | Serialize appends per tenant (advisory lock or per-tenant sequence) so two concurrent inserts cannot fork the chain or observe each other's tail |
| C5 | `vllm` is listed as a dependency of a "lightweight Docker image" on AWS Fargate | High | vLLM requires a GPU; Fargate offers none. Self-hosted inference needs a GPU-capable target (EC2 GPU, SageMaker, or EKS with GPU nodes) |
| C6 | `mutations.py`, a Python file, is placed inside the Next.js TypeScript tree at `src/lib/a2a/guardrails/mutations.py` | Medium | The FTC mutation belongs in the Python engine, which is the component that runs it |
| C7 | `runtime = "edge"` on a handler that holds a long-lived Supabase Realtime subscription opened from module scope with a service key | Medium | Use the Node runtime and open the client per request; edge execution limits are a poor fit for persistent subscriptions |
| C8 | `sequence_number BIGSERIAL NOT NULL UNIQUE` on a global chain | Medium | Per-tenant sequence. Gaps in a global counter disclose other tenants' volume (see OPEN-7) |

### The most serious one

C1 is worth stating plainly, because the source's architecture is otherwise sound and this
single route would undo it. The route as written would let any caller pass
`?tenantId=<any value>` and stream another tenant's audit trail, using credential that
bypasses every RLS policy in `prisma/rls.sql` and the Phase-2 foundation. It fails steps 1,
2, 3, and 6 of the mandatory `.clinerules` sequence simultaneously. It is also the exact
pattern P2 rule 3 and P8 exist to prevent.

The intent — a real-time stream with integrity breadcrumbs — is kept. The implementation
changes to: authenticate, resolve the tenant from verified claims, read through the
RLS-bound client, and attach the sequence and entry hash to each event so a client can
detect a gap (P8 rule 10).

### Also noted, not defects

- The source's `BEGIN; ... COMMIT;` wrapper in the migration is unnecessary (a migration
  already runs in a transaction) but harmless.
- `gen_random_uuid()` is built into Postgres 13 and later, so only `digest()` genuinely
  needs `pgcrypto`. The extension requirement stands.
- The source's `RETURN NEW;` omission inside `fn_prevent_a2a_audit_tampering` is correct
  as written, since the function raises before returning.

## D. Convention mismatches — repository convention wins

| Source | Repository convention | Resolution |
|---|---|---|
| `public/.well-known/agent.json` as a static file | Static assets live in `web/public/` and cannot vary by caller | Serve the card from a route so scopes and tiers can be reflected per caller; a static file is acceptable only for the platform-level card |
| `src/app/api/a2a/...` | The Next.js app is rooted at `web/` | Paths are `web/src/app/...` |
| `db/migrations/0001_*.sql` | Migrations live in `supabase/migrations/` when psql-applied, and `web/prisma/` for the schema | Use the existing locations. The append-only trigger must live in a migration, not `prisma/rls.sql`, because the RLS applier splits on `;` |
| `src/lib/a2a/orchestrator/graph.ts` as the LangGraph state machine | LangGraph is Python in `agent-engine/agent_engine/agents_workflow.py` | The engine holds the graph; TypeScript holds contract mirrors and UI only |
| `a2a_audit_logs` snake_case | Prisma models are PascalCase with quoted identifiers in raw SQL | `A2AAuditEntry` via Prisma, quoted in raw SQL (OPEN-7) |
| LangGraph backed by "Celery and Upstash Redis" | Celery with `redis://` locally and `vercel://` on Vercel | Keep the existing broker selection; Upstash applies to the cache and rate limiter only |
| Anthropic and OpenAI as the routing targets | OmniRoute is the gateway, routing to DeepSeek and Z.ai | The provider enum is a vocabulary (A5); OmniRoute remains the single egress |
| AWS S3 and SageMaker for the flywheel | Vercel plus Supabase Postgres | Capture stays in Postgres per ADR-0006 and P10; an export target is deferred |

## E. Source step-by-step against the recorded design

| Source step | Disposition | Where it lives now |
|---|---|---|
| 1. Discovery layer, agent card, skills, scopes | Adopted, path corrected, skill names added (A1, A14, OPEN-4 for placement) | `AGENT-CARDS.md`, P12 |
| 2. Edge authentication and multi-tenant middleware | Adopted except the issuer (OPEN-1); claim-to-header mapping kept (A12) | ADR-0002, P1, P2 |
| 3. JSON-RPC transport and task state machine | Adopted; method names added (A6); complexity tiers corrected (A2) | ADR-0001, `ARCHITECTURE.md` §4 and §5 |
| 4. Policy graph and cost governance | Partially adopted. Cost breaker, rate limit, depth cap, and cache are in. Neo4j remains open (OPEN-3) | ADR-0003, ADR-0005, P4, P7 |
| 5. NeMo guardrails and FTC mutation | Intent adopted, tooling deferred. Mutation and disclosure injection are required behaviour regardless of whether NeMo ships | P5, ADR-0003 (swap point names NeMo) |
| 6. HITL staging gate | Adopted; already matches the recorded gate design | P6, `ARCHITECTURE.md` Flow D |
| 7. Hash chaining and immutable ledger | Intent adopted, implementation corrected (OPEN-7, OPEN-8, C3, C4, C8) | ADR-0004, P8, change 6 |

## F. What can proceed, and what waits

**Proceeds now, no open item required:**

- A1, A2, A4, A5, A6, A7, A9, A10, A11, A13, A14, A15 folded into the existing documents
  as edits, since none of them contradicts a decision record.
- C1 through C8 recorded as required corrections to any code derived from the source.

**Waits on an answer:** OPEN-1 through OPEN-8. Of these, OPEN-1 is the only one that
blocks M1 start, because it decides how agent tokens are signed and verified. OPEN-4 and
OPEN-7 change where code lives and how the ledger is keyed, so they should be settled
before M2. OPEN-2, OPEN-3, OPEN-5, and OPEN-6 can be answered later without stalling.

**Not adopted, by prior decision:** the Llama 3 fine-tune and the S3/SageMaker export
path. Flywheel work stays capture-and-store until an evaluation harness exists
(ADR-0006, P10 rule 9). Routing stays provider-agnostic through OmniRoute.

**Excluded:** `A2A_Architecture_Blueprint.pdf` remains image-only and unread. Nothing here
should be read as superseding whatever it may contain.

## G. Decision brief — the three Gemini-era answers

The author's three answers (OPEN-2, OPEN-1, OPEN-3) were given before this session's
design pass. Each is walked through with the repository facts that bear on it. Your
decision governs; nothing below is applied yet.

### G1 — Python runtime: AWS ECS/Fargate versus Vercel

**What exists**: the engine is light and pure-Python. Dependencies are `langgraph`,
`langgraph-checkpoint-postgres`, `celery[redis]`, `redis`, `httpx`, `psycopg[binary]`,
`psycopg-pool`, `pydantic`, `pydantic-settings`, `fastapi`, `uvicorn[standard]`. There is
**no LLM SDK**, because inference goes out over HTTP to OmniRoute via `httpx`. There is
**no GPU or native-heavy dependency**: zero references to `vllm`, `torch`, `transformers`,
or `sagemaker` anywhere in `agent_engine/`. Both Vercel entrypoints are already declared in
`pyproject.toml` (`agent_engine.api:app` and `worker:app`).

**The source's three stated reasons, tested**:

| Stated reason | Status against this repository |
|---|---|
| Escape Next.js API-route timeouts | Already handled. Dispatch is a queue worker, not an API route, and `docs/GO-LIVE.md` Phase 3 raises worker `maxDuration` to at least 600 s with `task_time_limit=600` |
| Isolate stateful LangGraph execution | Already handled. `agent-engine/` is its own Vercel project, separate from `web/` |
| Run native deps such as `vllm` | Not applicable. `vllm` is unused, and Fargate has no GPU, so the example defeats the argument |

**Options**:

| Option | Gain | Cost |
|---|---|---|
| Stay on Vercel (current) | No new infrastructure; deploy already proven; single vendor | Serverless duration ceiling; `vercel://` broker coupling; a heavy future dependency may not fit a bundle |
| Move to Fargate now | No duration ceiling; long-lived workers; direct path to GPU targets later | Second pipeline, container registry, VPC and secrets, a second observability surface, all for a benefit that is speculative today |

**Recommendation**: stay on Vercel through M3. Revisit when a specific trigger fires. The
engine is HTTP-only and light, so Fargate's benefit is speculative while its operational
cost is immediate.

**Named triggers** for revisiting: NeMo Guardrails lands (a large dependency tree that may
not bundle serverlessly), worker durations approach the plan ceiling, or self-hosted
inference is adopted — noting that GPU inference rules out Fargate as well and points to
SageMaker or GPU EC2/EKS.

### G2 — Agent-token issuer: Supabase Auth versus self-hosted keys

**What exists**: the human IdP is Clerk (`@clerk/nextjs` is a web dependency and
`CLERK_SECRET_KEY` is tier `critical`). Supabase is declared but dormant — `env.ts` marks
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` as `reserved`, and `@supabase/supabase-js` is **not** a
dependency, so the source's SSE snippet would not even resolve its import. The engine holds
one shared secret, `agent_api_token`, with no JWT library, no key material, and no issuer
or audience settings. Neither tier has `jose`, so both ADR-0002 and the source's plan need
a new dependency.

**Key point**: the agent issuer does **not** have to be the human IdP. The natural split is
humans on Clerk and agents on a dedicated issuer. That makes the remaining question
managed-versus-owned, not architectural.

| Option | Gain | Cost |
|---|---|---|
| A. Self-hosted JWKS plus pinned PEM (ADR-0002) | No new infrastructure; no Phase-2 dependency, so M1 starts immediately; verification makes no network call to a third party; trust boundary stays inside ours | We own key generation, rotation, and revocation runbooks |
| B. Supabase Auth as issuer | Managed rotation, a real issuer identity, console-based partner keys, aligned with the Phase-2 foundation | Requires provisioning the Supabase project first, adds `@supabase/supabase-js`, creates a second identity plane beside Clerk, and adds a third-party dependency in the request path |
| C. Clerk issues agent tokens too | One IdP, no second plane | Couples agent ingress to the human-auth vendor, so a Clerk outage stops agent traffic; Clerk is oriented to human users, so agent registration and rotation would be shoehorned |

**Recommendation**: **A** for M1. It unblocks M1 immediately, keeps the verifier dependency-free,
and the seam in `api.py` means swapping to Supabase JWKS later is a key-source change, not
a redesign. Choose **B** only if you specifically want managed rotation and a partner
console and are willing to provision Supabase as part of M1.

### G3 — Neo4j: adopt now, or defer with a trigger

**What exists**: exclusivity is `agent-engine/agent_engine/rules.py` lines 96–104. It
iterates `brief.exclusivity_terms`, tests whether a caption mentions each term, and emits a
`RiskType.BRAND_EXCLUSIVITY` finding with a remediation message. It is string containment
against a list supplied by the brief.

There is no brand-relationship data to traverse. The `Brand` model holds `name`, `industry`,
`logoUrl`, and `verified` — no competitor set, no category, no parent company, no contract.
`docker-compose.yml` runs only `redis:7-alpine` and `postgres:16-alpine`.

**The source's own example is not a graph question.** "A signed Nike athlete must not
promote Adidas" is resolved by the brief's exclusivity terms, which is what the code already
does. Neo4j earns its place only when the answer requires traversal that a list cannot
express — for example agency to roster to athlete to contract to brand to parent company to
sibling brand to competitor category, with time-bounded exclusivity windows.

**Two objections the source does not address**:

1. **Dual source of truth.** The design keeps brand exclusivity in Neo4j while brands,
   athletes, and contracts live in Postgres. The same business fact then exists twice with
   no reconciliation or freshness story.
2. **Isolation regression.** Neo4j has no equivalent of the row-level policies in
   `prisma/rls.sql` and the Phase-2 foundation, so tenant isolation would move from
   database-enforced to query-construction-enforced — a step backwards from the guarantee in
   `docs/SECURITY.md`.

| Option | Gain | Cost |
|---|---|---|
| A. No Neo4j; exclusivity stays data-driven via policy packs (change 7) | Uses the datastore already present; reuses RLS-enforced isolation; no sync problem | Cannot express multi-hop traversal |
| B. Local Docker Neo4j now | Fixes the Cypher contract early; trivial AuraDB move later; matches the source | Second datastore plus schema, seeds, and backups; dual-write or projection job; isolation moves out of RLS |
| C. Postgres recursive CTE first, Neo4j on a named trigger | Answers multi-hop questions with the existing Postgres and RLS; no second store; no sync problem | Cypher ergonomics are better for dense graphs; a later migration is real work |

**Recommendation**: **C**. Prove a genuine traversal question with a recursive CTE before
adding a datastore. Adopt Neo4j when a named trigger fires: a traversal exceeding roughly
three hops is needed in the hot path, Cypher expressiveness becomes the bottleneck, or an
external auditor requires an inspectable policy language.

### G4 — Summary

| Item | Recommendation | Reversible later | Blocks anything now |
|---|---|---|---|
| G1 runtime | Stay on Vercel; trigger-based revisit | Yes — the engine is containerisable and its deps are light | No |
| G2 token issuer | Self-hosted JWKS plus pinned PEM | Yes — the `_authorize` seam takes a different key source | Yes — decides how M1 is built |
| G3 Neo4j | Postgres recursive CTE first, named trigger for Neo4j | Yes — policy packs keep the rules as data | No |

Only G2 changes what M1 looks like. G1 and G3 can be deferred without stalling.

## H. The recovered 14-slide deck

Deck title: **"THE BLUEPRINT: AUTONOMOUS A2A ARCHITECTURE — MULTI-TENANT TOPOLOGY, AGENT
PROTOCOLS, AND GOVERNANCE BASELINES"**. Recovered after the earlier exclusion. File is
17,302,100 bytes, 14 pages, unencrypted, no metadata, and every page is a single embedded
1376x768 screenshot with a text layer of length zero. No OCR binary is installed on this
machine (no `tesseract`, no `ocrmypdf`, no `pdftoppm`) and no OCR Python package is present
(`pytesseract`, `pdf2image`, `fitz`, `pdfplumber`, `markitdown`, `docling` all missing), so
the recovery path was: extract the embedded page images with `pypdf`, downscale with
`Pillow`, and read the images directly. That path needs no new tooling and is repeatable.

### H1 — Slide inventory

| Slide | Content |
|---|---|
| 1 | Title slide; decorative fragments `AGENT_A_PROTOCOL: /POST/EXECUTE`, `GOVERNANCE_RULESET` with `ACCESS_LEVEL: "STRICT"`, `AUDIT_LOG: "TRUE"` |
| 2 | Systematic decomposition of the 10-layer stack, with zones |
| 3 | Hybrid cloud compute and network boundaries |
| 4 | The Agent-to-Agent (A2A) opaque execution paradigm |
| 5 | A2A discovery and execution lifecycle |
| 6 | Multi-tenant context propagation via edge middleware |
| 7 | JSON-RPC data contracts mutation pipeline |
| 8 | Age-gated compliance and permission matrix |
| 9 | Human-in-the-loop (HITL) staging gate state machine |
| 10 | Immutable audit ledger via cryptographic hash chains |
| 11 | Cost governance and dynamic model routing |
| 12 | Noisy neighbor defense and rate limiting |
| 13 | Tenant isolation workload models |
| 14 | End-to-end synthesis, 7-step worked scenario |

### H2 — Layer to technology mapping (slide 2, authoritative)

| Layer | Role | Technology named |
|---|---|---|
| L1 | Edge UI, role-aware workspaces | Next.js, WebSockets/SSE |
| L2 | Multi-tenant business logic, RBAC, tenant isolation | Node/FastAPI, Postgres RLS |
| L3 | Dynamic context and policy graph, deterministic NIL rules | Neo4j, OPA |
| L4 | Agentic orchestration, task state machine | LangGraph, Celery, Redis |
| L5 | Knowledge and vector engine, unstructured RAG | pgvector, Supabase Storage |
| L6 | Model routing and cache, inference middleware | RouteLLM, semantic cache |
| L7 | Model serving, LLM endpoints | OpenAI, Claude, Fal.ai, vLLM |
| L8 | Compliance guardrails and audit, FTC `#ad` rules | NeMo Guardrails, LangSmith |
| L9 | HITL staging gate, human approval state machine | PostgreSQL, Celery |
| L10 | Data flywheel, continuous fine-tuning | Unsloth, AutoTrain, S3 |

Zone grouping as presented: Zone 1 Interface and Logic (L1, L2, L9); Zone 2 Execution and
Orchestration (L3, L4); Zone 3 Intelligence and Routing (L5, L6, L7, L10); Zone 4 Governance
(L8). Note that the grouping is not sequential — L9 sits in Zone 1 and L10 in Zone 3.

### H3 — Hybrid cloud zones (slide 3)

| Zone | Provider | Layers hosted | Notes |
|---|---|---|---|
| 1 | Cloudflare | Edge security and proxy; Layer 6 model router and semantic cache (Redis) | Layer 6 is placed at the edge, not in the app |
| 2 | Vercel | L1 App Router and serverless APIs, L2, L9 HITL staging gate | Matches the current repository for L1 and L2 |
| 3 | Supabase | **Layer 2: Auth0** and Postgres RLS; L5 pgvector and S3 asset storage | See OPEN-9 — this slide names Auth0, not Supabase Auth |
| 4 | AWS | L3 Neo4j AuraDB, L4 Fargate Celery workers and LangGraph engine, L8 guardrail checks (ECS middleware), L10 SageMaker or Modal fine-tuning | The separation from Vercel that OPEN-2 covers |

### H4 — Discovery and execution lifecycle (slide 5)

Four steps: **Discovery** (`GET /.well-known/agent.json`, returns the Agent Card manifest
outlining skills and auth requirements); **Initiation** (`POST /api/a2a/task`; the remote
agent parses a JSON-RPC 2.0 `message/send` payload and assigns a unique `task_id`);
**Execution and Feedback** (SSE streaming or webhook push, transitioning between `working`
and `input-required`); **Resolution** (state marked `completed`, deliverables returned in
an `artifacts` array).

Two naming notes: the method is given as `message/send`, which is A2A-spec style and
differs from the conversation's `a2a.task.create`, and the task identifier is `task_id`
rather than `a2aTaskId`.

### H5 — Edge middleware and context propagation (slide 6)

Inbound: the client presents an asymmetric RS256/ES256 JWKS token. Edge interception using
`jose` verifies signature and expiry at the edge, validates mandatory scopes (slide names
`a2a:execute`), and extracts claims. Injected downstream headers: `x-tenant-id` ("binds
worker to PostgreSQL RLS policies"), `x-agent-id` ("identifies delegating client entity"),
and `x-org-id` ("enforces enterprise organization bounds").

This is adopted as the internal hop convention (A12), with one mandatory hardening that the
slide omits — see defect **C9** below.

### H6 — Age-gated compliance and permission matrix (slide 8, authoritative)

| Tier | Agent authority | Mandatory JWT scopes | Deal execution rules |
|---|---|---|---|
| Youth (8–12) | Restricted (draft only) | `a2a:read`, `a2a:propose` | COPPA enforced. Dual signature required. Parent/Guardian Agent holds **sole** `a2a:co-sign` authority |
| Junior (13–17) | Co-Pilot Mode | `a2a:read`, `a2a:propose`, `a2a:co-sign` | High School and NCAA policy checks. Dual signatures mandatory at the HITL staging gate |
| Senior (18–24) | Full Autonomous Delegate | `a2a:read`, `a2a:execute`, `a2a:sign` | Full negotiation authority. Auto-executes standard deals under custom thresholds (e.g. below `$250`) |

**This corrects P3.** My protocol restricted dual-signature to the `13–17` tier only. The
deck requires a dual signature for Youth as well, and places `a2a:co-sign` with the guardian
alone at that tier. The corrected rule is strictly more protective and has been applied.

### H7 — HITL staging gate state machine (slide 9)

States as named: `GENERATING` to `AUDITING` to `STAGED_FOR_REVIEW` (persisted to Redis),
with `interrupt()` called once guardrails pass. Path A: user approves, graph resumes,
`COMPLETED`, publish. Path B: user edits, graph resumes, publish, and the edit triggers
Layer 10 to capture edit deltas for model tuning.

Note the source persists mid-flight task state to **Redis**, while the repository uses a
`PostgresSaver` checkpointer with Redis as the broker — see OPEN-11.

### H8 — Immutable audit ledger (slide 10)

High-privilege A2A skills, with `admin_delete` and contract execution named as examples, are
logged to a PostgreSQL table the slide calls **`a2a_audit_log_entries`**. A raw SQL migration
trigger explicitly blocks `UPDATE` and `DELETE`. Each entry hashes its own payload chained
with `previous_hash`, illustrated as `0xAB12…` to `0xCD34…` to `0xEF56…`, and tampering with
any historical block breaks the chain and surfaces visual alerts in the audit UI.

Three separate table names now exist across the source set: `a2a_audit_log_entries` here,
`a2a_audit_logs` in the conversation's SQL, and `A2AAuditEntry` in the recorded design — see
OPEN-12. The hash formula here ("its own payload with the previous_hash") is also simpler
than the conversation's (which added `sequence_number`), so the source is internally
inconsistent about the preimage as well.

### H9 — Cost governance and dynamic model routing (slide 11)

Semantic cache intercepts first: a vector lookup for high-similarity historical prompts,
with standard `#ad` placement checks given as the example, and a cache hit yielding zero API
cost at roughly 10ms latency. On a miss, RouteLLM splits by complexity: simple caption
generation to fast open-weight SLMs hosted on vLLM, and complex contract analysis or rate
sheet negotiation to frontier models (Claude 3.5 Sonnet or GPT-4o). The cache is Redis.

The intent is adopted (ADR-0005) but the routing targets differ from the repository, which
egresses only through OmniRoute to DeepSeek and Z.ai — see OPEN-10. The `~10ms` and `$0`
figures are the source's claims, not measurements, and `$0.00253` appears on slide 7 as a
sample per-task cost, which is an eighth of the `$0.02` breaker.

### H10 — Noisy neighbor defense: the three-axis limit model (slide 12)

Telemetry gauges shown: `LEVEL 8/5` under "MAX RECURSIVE DELEGATION EXCEEDED", `35/40
WORKFLOWS`, and `75% / MONTHLY CAP`. The mechanism is an Upstash Redis sliding window
enforcing strict tenant boundaries, and the rejection contract is specific: **JSON-RPC
`-32005 Too Many Requests` with an `X-RateLimit-Reset` header**.

The 3-axis model:

1. **Task execution depth** — hard limit on recursive delegation levels (drawn as
   Agent A → B → C).
2. **Concurrent active tasks** — caps simultaneous asynchronous workflows in the `working`
   state (the sample `35/40` implies a cap of 40).
3. **Token and cost budgeting** — aggregate API spend tracked per tenant session (the sample
   shows 75% of a monthly cap).

Axis 1 is already recorded as the depth cap of 5. Axes 2 and 3 are **new** and have been
folded into P7, along with the `-32005` code and the `X-RateLimit-Reset` header. My previous
P7 covered only a per-minute request limit and a per-task cost breaker.

### H11 — Tenant isolation workload models (slide 13)

| Model | Efficiency | Isolation level | Blueprint use case |
|---|---|---|---|
| Pooled A2A Service | Very high | Application-level (namespaces), gateway interception | Layer 6 stateless routing |
| Pod-per-Tenant | Low | Network and container (enterprise tiers) | Custom fine-tuned models |
| Dynamic Ephemeral | Balanced | Hardware (Firecracker microVMs) | Layer 4 LangGraph tasks, destroyed post-task |

This answers the isolation escape-hatch question that the earlier plan left open. It endorses
pooled application-level isolation for stateless routing, which is what the repository's
shared-schema RLS already provides, and reserves stronger isolation for enterprise custom
models and for ephemeral Layer 4 execution destroyed after each task. It is recorded as the
documented multi-tenancy model rather than as a required change.

### H12 — End-to-end synthesis (slide 14)

Worked scenario: a 16-year-old athlete agent receives a brand proposal.

1. Edge auth, age check — JWT inspected, Junior tier (`13–17`) identified, `a2a:co-sign`
   flagged mandatory.
2. Policy graph, NCAA check — Neo4j evaluates the proposal against university exclusivity
   rules.
3. Model router, cache check — Redis verifies whether the brand brief was parsed recently.
4. Guardrails, FTC check — NeMo intercepts output and forcibly injects **`#ad` and
   `#sponsored`**.
5. HITL staging, dual co-sign — LangGraph halts and awaits an explicit **parent/guardian
   cryptographic signature**.
6. Audit log — PostgreSQL writes an immutable SHA-256 block recording the final approved
   contract.
7. Data flywheel — human edits to the social copy are exported to S3 for future fine-tuning.

Two specifics worth carrying forward: both disclosure tags are injected (`#ad` **and**
`#sponsored`), and the guardian authorisation is described as a **cryptographic signature**
rather than an ordinary UI approval. P5 has been updated for the tag set; P3 notes the
signature expectation.

### H13 — New open items raised by the deck

| ID | Item | Detail |
|---|---|---|
| OPEN-9 | **RESOLVED 2026-09-18 — third IdP candidate.** Slide 3 says "Layer 2: Auth0 & Postgres RLS" | Clerk (live), Supabase Auth (conversation), and Auth0 (deck) were all considered; self-hosted JWKS plus a pinned PEM was chosen. Clerk remains the human IdP. See ADR-0002 Resolution |
| OPEN-10 | Layer 7 routing targets: OpenAI, Claude, Fal.ai, vLLM, with Claude 3.5 Sonnet or GPT-4o for high complexity | The repository egresses only through OmniRoute to DeepSeek and Z.ai. Adopt as vocabulary, or treat as a target list |
| OPEN-11 | Mid-flight task state persisted to **Redis** | The repository uses a `PostgresSaver` checkpointer with Redis as the broker, which the Phase-1 record chose deliberately. Redis-only state would weaken durability for an approval awaiting a guardian |
| OPEN-12 | Audit table named `a2a_audit_log_entries` here, `a2a_audit_logs` in the conversation SQL | Recorded design uses `A2AAuditEntry` under repository PascalCase convention. Pick one name |
| OPEN-13 | Scope name `a2a:execute` (deck, slides 6 and 8) versus `a2a:task:execute` (technical specification, and P1 as written) | The two source documents disagree. One grammar must win |
| OPEN-14 | Isolation workload models split across three tiers, with enterprise pod-per-tenant and ephemeral microVMs for Layer 4 | Adopt as the documented multi-tenancy model, or keep single-model shared-schema RLS with an escape hatch |

### H14 — New defect

| # | Defect | Severity | Required fix |
|---|---|---|---|
| C9 | Slide 6 converts verified claims into `x-tenant-id`, `x-agent-id`, and `x-org-id` headers and states that `x-tenant-id` binds the worker to Postgres RLS policies. If inbound client-supplied headers of the same names are not stripped, a caller sets its own tenant and the RLS binding enforces the wrong isolation | Critical | The edge middleware must unconditionally overwrite all three headers after verification, and reject or discard any client-supplied value for them. A test must assert that a request carrying its own `x-tenant-id` cannot change the resolved tenant |

C9 is the same class of failure as C1: the mechanism is sound, but only if the trust boundary
is where the slide assumes it is. Header-based context propagation is safe when the verifier
sets the header and unsafe when it merely forwards one.

### H15 — Actions taken from this deck

| Action | Applied to |
|---|---|
| Dual signature now required for `8–12` as well as `13–17`, with `a2a:co-sign` held solely by the guardian at Youth | P3 |
| Disclosure injection covers `#ad` and `#sponsored` | P5 |
| Three-axis limit model added: recursion depth, concurrent active tasks, token and cost budgeting | P7 |
| Rejection contract added: JSON-RPC `-32005` with `X-RateLimit-Reset` | P7 |
| Decks transcribed; excluded-input status cleared | `LAYER-STATUS.md`, `README.md`, this document |
| Layer-to-technology mapping and hybrid cloud zones recorded | This document |

### H16 — Standing discrepancies inside the source set

Recorded so they are not mistaken for agreement later. The source documents disagree with
each other on: the IdP (Supabase Auth versus Auth0), the task method name
(`a2a.task.create` versus `message/send`), the audit table name (`a2a_audit_logs` versus
`a2a_audit_log_entries`), the hash preimage (with or without `sequence_number`), the scope
name (`a2a:task:execute` versus `a2a:execute`), and where Layer 6 runs (application versus
Cloudflare edge). Where they conflict, the technical specification governs the locked
parameters and the repository governs current state.
