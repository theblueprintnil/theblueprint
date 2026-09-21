# A2A Architecture

The architecture of the agent-to-agent layer: how a request enters, how trust is
established, how work is dispatched and gated, and how the result is recorded. The
specification's ten-layer topology is preserved as the organizing structure; where a
layer is implemented by an in-repo component rather than the specification's named
product, the substitution is recorded in `docs/adr/` and the swap point is named here.

Companion documents: `LAYER-STATUS.md` for what exists, `OPERATIONAL-PROTOCOLS.md` for
the rules each component must enforce, `AGENT-CARDS.md` for the agent inventory, and
`SCHEMA-CHANGE-PLAN.md` for the data changes.

## 1. Topology

```
L1  Interface            web/  Next.js 16 App Router
                         public site · /app/studio · /app/guardian · /admin/compliance
                              |
L2  Business logic       web/src/lib  Clerk auth · permissions.ts · entitlements · deals
                         Prisma 6.4 on Postgres with RLS (app_user_role_in)
                              |
                         ---- trust boundary: signed JWT, scopes, RLS-bound reads ----
                              |
L4  Orchestration        agent-engine  FastAPI JSON-RPC 2.0 :8100
                         task adapter · identity verify · depth cap · cost guard
                         LangGraph 4-node graph with PostgresSaver checkpointer
                         Celery worker: redis:// locally, vercel:// on Vercel
                              |
L3  Policy               policy-packs/*.json  versioned, jurisdiction-scoped
                         deterministic evaluator (Python authoritative, TypeScript mirror)
                              |
L5  Knowledge            Postgres + pgvector, tenant-scoped, RLS-guarded
                              |
L6  Router               OmniRoute OpenAI-compatible gateway
                         complexity tiering · semantic cache (Redis, 0.92) · $0.02 breaker
                              |
L7  Serving              generation model · compliance model (provider-agnostic)
                              |
L8  Guardrails           evaluate -> mutate to compliance -> advisory review -> block
                              |
L9  HITL                 value gate · age gate · guardian co-sign · bounded revisions
                              |
L10 Flywheel             edit-delta ledger -> redaction -> eval gate -> export (later)
```

Cross-cutting: the `A2AAuditEntry` hash chain records every mutation in the same
transaction as the operation, and agent identity is a scoped JWT at every hop.

## 2. Trust boundaries

There are exactly three, and each one changes what may be trusted.

| Boundary | Crossing | What is verified |
|---|---|---|
| Public to web | Browser to Next.js | Clerk session, then organization membership and role per the `.clinerules` sequence |
| Web to agent engine | Server Action to JSON-RPC gateway | Signed JWT over a pinned PEM, plus scope and tenant claims |
| External agent to agent engine | Partner agent to JSON-RPC gateway | Signed JWT over JWKS, plus registration row, scope subset, quota, and depth |

The critical property is that the second and third boundaries are verified the same
way, so there is no path where an external caller receives weaker scrutiny than an
internal one.

### The authorization sequence at agent ingress

`.clinerules` mandates a seven-step sequence for anything touching org-scoped data.
The gateway currently deviates from it (gap G1 in `LAYER-STATUS.md`). The target
sequence at ingress:

1. **Authenticate** — verify the JWT signature against the registered key.
2. **Resolve the organization** — from the token's `org_id` claim, never from the
   request body.
3. **Confirm membership** — the token's `sub` must hold an active membership in the
   resolved organization.
4. **Confirm the role** — checked against the canonical list in
   `web/src/lib/permissions.ts`, never by an inline role test.
5. **Confirm entitlement** — plan, feature flag, and quota via `Entitlement` and
   `UsageEvent`.
6. **Execute under RLS** — all reads and writes go through a client bound to the
   resolved identity. The privileged `DATABASE_URL` connection is not used in a
   request path.
7. **Audit** — a ledger entry is appended in the same transaction.

A failure at any of steps 1 through 5 returns before step 6, so no operation can run
with partial authority. This ordering is why the preflight probe's reliance on
auth-before-parse stays valid: unauthenticated requests still fail at step 1, and the
probe never reaches dispatch.

## 3. Deployment topology and swap points

| Concern | Now | Swap point | Recorded in |
|---|---|---|---|
| Policy engine | JSON packs plus in-repo evaluator | OPA or Cedar; Neo4j if exclusivity becomes multi-hop | ADR-0003 |
| Vector store | Postgres plus pgvector | Dedicated vector service | ADR-0005 |
| Semantic cache | Redis locally, Upstash at the edge | Cloudflare AI Gateway | ADR-0005 |
| Guardrail middleware | Deterministic evaluator plus advisory model review | NeMo Guardrails | ADR-0003 |
| Compute | Vercel functions plus Docker Postgres | AWS ECS, SageMaker | ADR-0001 |
| Transport | JSON-RPC 2.0 at the gateway | Alternate binding behind the task adapter | ADR-0001 |

Each row is a configuration or adapter change because the calling code depends on an
interface rather than on the product.

## 4. Task lifecycle

The specification's task states are stored on `AgentExecutionStatus`. The mapping is a
one-to-one table in `SCHEMA-CHANGE-PLAN.md`; this section defines the transitions and
who may cause them.

```
created ──> working ──> staged ──> approved ──> completed
   │           │          │           │
   │           │          ├─> revision-requested ──> working
   │           │          └─> input-required ──> working
   │           │
   └───────────┴─> cancelled        failed ──> (terminal)
                                    expired ──> (terminal)
```

| Transition | May be caused by | Guard |
|---|---|---|
| `created` to `working` | Worker on task pickup | Task is in `QUEUED`; redelivery outside this window is a no-op |
| `working` to `staged` | Graph reaching the HITL node | Gate evaluation recorded; artifact version pinned |
| `working` to `input-required` | Graph needing an input it cannot invent | Requested input is named and persisted |
| `working` to `failed` | Unhandled error or breaker trip | Error captured with the failing node |
| `staged` to `approved` | Human reviewer, or gate auto-approval below threshold | Reviewer holds the required role; tier permits; threshold satisfied |
| `staged` to `revision-requested` | Human reviewer | Feedback recorded; delta captured (L10) |
| `staged` to `cancelled` | Athlete, guardian, or admin | Actor holds authority over the task |
| `approved` to `completed` | Publisher after a successful publish | Publish confirmed; only reachable at the `18–24` tier |
| any non-terminal to `expired` | Scheduler past `expiresAt` | No silent expiry of a `staged` task awaiting a guardian: expiry notifies rather than discards |
| `cancelled`, `failed`, `expired` | — | Terminal; no transition out |

### Properties that must hold

1. **Redelivery safety.** Both existing guards survive: `run_nil_generation_pipeline`
   proceeds only from `QUEUED` or `RUNNING`, and `resume_nil_pipeline_after_approval`
   only from `APPROVED` or `REVISION_REQUESTED`. A duplicate delivery returns the no-op
   duplicate summary. New states must not widen these windows.
2. **No transition without a ledger entry.** A status change writes its audit entry in
   the same transaction, so a task cannot advance without an attributable record.
3. **Terminal states are absorbing.** `CANCELLED`, `FAILED`, and `EXPIRED` accept no
   further transition, which is what makes cancellation a real control rather than a
   cosmetic flag.
4. **Publishing is human-gated at every tier.** The `publisher` agent holds
   `a2a:sign`, no automated caller is granted it, and the `8–12` tier blocks the node
   outright (see `AGENT-CARDS.md`).
5. **Revision loops are bounded.** A revision cap forces escalation to a human owner
   rather than permitting an unbounded generate-review loop. The cap is counted per
   task, not per reviewer.

## 5. Contracts

Three contracts govern the hand-offs inside the engine. The Python implementations are
authoritative and live alongside the gateway; the TypeScript mirrors exist so the web
tier can validate before dispatch and render previews without calling the engine.
Drift between the two is caught by a shared fixture set exercised in both pipelines,
not by convention.

### Contract 1 — Orchestration to router

The orchestration layer hands the router a task it should serve.

| Field | Type | Notes |
|---|---|---|
| `a2aTaskId` | string | Stable task identity for the whole lifecycle |
| `tenantId` | string | Must equal the token's `org_id`; a mismatch fails closed |
| `taskKind` | enum | Declared skill being invoked |
| `complexityTier` | enum | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`; advisory, the router may override |
| `inputs` | object | Validated against the skill's declared input shape |
| `parentTaskId` | string, optional | Present only for a delegation |
| `depth` | integer | Read from stored ancestry, never from the request |

### Contract 2 — Router to guardrails

The router reports what it did, including whether the cache served it.

| Field | Type | Notes |
|---|---|---|
| `a2aTaskId` | string | Unchanged from contract 1 |
| `model` | string | The model actually used, after any tier override |
| `cacheHit` | boolean | True when the semantic cache answered |
| `costMinorUnits` | integer | Accumulated cost for this task; the breaker reads this |
| `artifact` | object | The proposed output, unmodified |
| `sourceCitations` | array | Context chunks used, for traceability |

### Contract 3 — Guardrails to graph

The guardrail layer hands the graph a verdict and a possibly mutated artifact.

| Field | Type | Notes |
|---|---|---|
| `a2aTaskId` | string | Unchanged |
| `policySnapshotId` | string | Content hash of the pack that was evaluated |
| `findings` | array | Each with rule id, severity from `RiskSeverity`, and message |
| `artifact` | object | Post-mutation artifact; may differ from contract 2 |
| `mutations` | array | Each mutation applied, with the rule that required it |
| `blocked` | boolean | True when a `HIGH` or `CRITICAL` finding forbids publication |
| `advisoryReview` | object, optional | Non-deterministic model review, never a gate by itself |

### Adopted field vocabulary

Where the source names a field explicitly, that name is authoritative:
`complexityTier`, `maxCostThresholdUsd` (hard cap `0.02`),
`cachePolicy.{allowSemanticCache, similarityThreshold}`,
`promptPayload.{systemPrompt, userPrompt, contextChunks}`,
`executionMetadata.{modelSelected, provider, costUsd, latencyMs}`,
`rawGenerationOutput.content`, `complianceRules.requireFtcDisclosure`,
`auditSummary.{passed, mutationsApplied}`, `finalAssetPayload.auditedContent`,
`platformFormatting.ftcTagInjected`. Contract 3's `status` is one of `PASSED`,
`PASSED_WITH_MUTATIONS`, or `REJECTED_VIOLATION`. The provider enum is one of `openai`,
`anthropic`, `replicate`, `fal`, or `vllm`; OmniRoute remains the single egress
regardless of which provider serves a request.

The ordering inside contract 3 is the mechanism, not an implementation detail: the
deterministic evaluator and its mutations run before the advisory review, and the
advisory review can add findings but can never clear a deterministic `blocked`. A model
cannot talk the platform out of a rule.

## 6. Control flows

### Flow A — Internal content generation

1. A user acts in `/app/studio`; a Server Action authenticates the Clerk session.
2. The action resolves the organization from the session and the `blueprint_org`
   cookie, then validates membership, role, and entitlement.
3. The action obtains an internal JWT over the pinned PEM and calls the gateway.
4. The gateway verifies the token, confirms the tenant claim, resolves the pack in
   force for the tenant's jurisdiction, and creates the task at `QUEUED`.
5. The worker picks up the task, transitions to `RUNNING`, retrieves context, calls the
   router, and runs guardrails.
6. The graph reaches the HITL node and evaluates the gates in order: age tier, then
   value threshold, then kill switch.
7. A gated task settles at `PENDING_APPROVAL` and renders as an `ApprovalCard`. An
   ungated task proceeds to publish only if the tier permits it, and never at `8–12`.
8. Every transition writes a ledger entry in the same transaction.

### Flow B — External agent task

1. A partner agent authenticates with its signed JWT and calls the gateway.
2. The gateway verifies the signature against the registered key, checks `kid`
   revocation, and confirms the requested scope is present.
3. The registration row is read; the requested scopes must be a subset of the row's
   scopes, and the tenant must match the token claim.
4. The rate limit and the remaining quota are checked before any model call.
5. From here the flow is Flow A, with the external agent as the actor recorded in the
   ledger. External agents can never reach publishing.

### Flow C — Delegation

1. A task dispatches a child task, passing a scope set no broader than its own.
2. The adapter rejects the call if the child's depth would exceed the lower of the
   platform cap of 5 and the parent's declared `maxDepth`.
3. The adapter rejects cycles by ancestry check, not by depth alone.
4. The child task records `parentTaskId` and its depth, and the delegation is written
   to the ledger with both task identities.

### Flow D — Guardian co-sign

1. A task for a `13–17` athlete reaches the gate and requires dual sign.
2. The `guardian-cosigner` agent requests authority from the guardian's own account;
   the request is recorded, not inferred.
3. The guardian approves; the approval is recorded against the `GuardianLink` and its
   consent scope, with the guardian as the actor.
4. Both signatures must be present on the same artifact version. A revision after one
   signature invalidates it, which is what prevents a signature from being carried onto
   content the signer did not see.

### Flow E — Cancellation

1. An athlete, guardian, or admin with authority requests cancellation.
2. The authority check runs before the state change, using the canonical permission
   list.
3. The task transitions to `CANCELLED`, which is absorbing: no further transition is
   accepted, so a cancelled task cannot be resurrected by a redelivery.
4. The in-flight worker observes the terminal state and stops rather than overwriting
   it, which is the same guard the existing redelivery safety relies on.

## 7. Layer-to-component map

Where each layer's specification intent lands in the repository.

| Layer | Component | Path |
|---|---|---|
| L1 Interface | Next.js App Router surfaces | `web/src/app/**` |
| L1 Interface | Approval queue UI | `web/src/app/app/studio/`, `web/src/components/agent/ApprovalCard.tsx` |
| L2 Business logic | Server Actions and the authorization sequence | `web/src/lib/agent/actions.ts` |
| L2 Business logic | Role and permission matrix | `web/src/lib/permissions.ts` |
| L2 Business logic | Entitlements and plan limits | `web/src/lib/billing/entitlements.ts` |
| L2 Business logic | Tenant isolation | `prisma/rls.sql`, `supabase/migrations/` |
| L3 Policy | Deterministic checks today | `agent-engine/agent_engine/rules.py` |
| L3 Policy | Versioned packs (new) | `policy-packs/*.json` |
| L4 Orchestration | JSON-RPC gateway | `agent-engine/agent_engine/api.py` |
| L4 Orchestration | Task contracts | `agent-engine/agent_engine/schemas.py` |
| L4 Orchestration | Worker and redelivery guards | `agent-engine/agent_engine/tasks.py` |
| L4 Orchestration | Graph and checkpointer | `agent-engine/agent_engine/agents_workflow.py`, `agent-engine/agent_engine/store.py` |
| L4 Orchestration | Web-side client | `web/src/lib/agent/celery-client.ts` |
| L4 Orchestration | Task queries and types | `web/src/lib/agent/queries.ts`, `web/src/lib/agent/types.ts` |
| L6 Router | Provider gateway | OmniRoute (OpenAI-compatible) |
| L6 Router | Provider registry in the web tier | `web/src/lib/ai/` |
| L7 Serving | Model selection | `agent-engine/agent_engine/config.py` |
| L9 HITL | Graph interrupt and gate evaluation | `agent-engine/agent_engine/agents_workflow.py` |
| L9 HITL | Reviewer actions | `web/src/lib/agent/actions.ts` |
| L10 Flywheel | Reviewer feedback today | `AgentTaskExecution.reviewerFeedback` |
| L10 Flywheel | Delta ledger (new) | `EditDelta` per `SCHEMA-CHANGE-PLAN.md` |
| Audit | Legacy log | `AuditLog` in `web/prisma/schema.prisma` |
| Audit | Append-only foundation log | `audit_events` in `supabase/migrations/` |
| Audit | Hash-chained ledger (new) | `A2AAuditEntry` per `SCHEMA-CHANGE-PLAN.md` |

## 8. Non-goals

Stating these prevents scope drift and false expectations.

- **Not a payment platform.** The threshold gates internal approval only. No escrow,
  no payment rail, and no e-signature integration (ADR-0007).
- **Not a compliance authority.** The platform evaluates against policy packs and
  blocks publication on a rule violation. It never certifies that a deal is compliant,
  which the marketing copy and terms already state.
- **Not fine-tuning yet.** The flywheel captures and stores redacted deltas. Training
  waits for an evaluation harness, because an unmeasured model change in a minor's
  content path is a risk without a control (ADR-0006).
- **Not a multi-hop policy engine.** Exclusivity is set membership today. The graph
  engine arrives only if the problem becomes genuinely relational (ADR-0003).
- **Not externally certified.** Agent cards and a JWKS endpoint make external
  integration possible; they do not constitute an onboarding program, which needs a
  partner agreement and quota negotiation.

## 9. Open items

| Item | Blocking | Where it resolves |
|---|---|---|
| The `A2A_Architecture_Blueprint.pdf` source is image-only and unread | Nothing yet | OCR pass, or a text re-supply |
| Launch jurisdiction for state rules is unnamed | M3 | Product decision |
| Revision-loop cap value is unset | M3 | Product decision, recorded in P6 |
| Semantic cache hit-rate and cost-per-task baselines are unmeasured | M4 | Measurement after M3 lands |
| The FastAPI ingress still resolves tenant from the request body | M1 | Remediation tracked as gap G1 |
