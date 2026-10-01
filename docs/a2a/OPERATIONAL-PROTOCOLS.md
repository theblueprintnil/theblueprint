# Operational Protocols

The enforceable rules of the A2A layer. Each protocol states its intent, the rules that
must hold, what happens when they are violated, who owns the control, and how
compliance is verified. A protocol is a specification, not a description: where the
repository does not yet satisfy one, `LAYER-STATUS.md` records the gap and the
milestone that closes it.

Protocols are referenced elsewhere as P1 through P12.

## P1 — Agent identity and trust

**Intent**: every agent action is attributable to an authenticated, scoped identity, and
no caller can act outside the authority it was granted.

### Rules

1. Every call to the agent gateway presents a signed JWT. A request with no token, an
   unsigned token, or an expired token is rejected before any other processing.
2. The token carries `sub`, `iss`, `aud`, `exp`, `iat`, `jti`, `tenant_id`, `org_id`,
   and `scopes`. A token missing any of these is malformed and rejected.
3. `tenant_id` and `org_id` must agree. A token asserting different values for the two
   is rejected as tampered.
4. The signature is verified against the key selected by `kid`. An unknown `kid` is
   rejected, never treated as a fallback to a default key.
5. A key with a non-null `revokedAt` is rejected immediately, regardless of `exp`.
6. The requested method declares a required scope. A token lacking it is rejected
   before dispatch, so an unauthorized call costs nothing.
7. `scopes` on the token must be a subset of the `AgentRegistration.scopes` row for
   that agent. A token claiming more than its registration permits is rejected, which
   is what stops a leaked registration from becoming a leaked grant.
8. `jti` is recorded on the ledger entry for the action and is accepted only once per
   task. Reuse within a different task is rejected.
9. Internal hops use a pinned PEM; external callers use JWKS. The two key sets are
   distinct, so a partner key can never mint an internal identity.
10. The shared static bearer token has been permanently removed; there is no fallback
    to shared-secret authentication.

### Violation semantics

Rejection is a hard failure with a stable JSON-RPC error code. No partial processing
occurs, no model is invoked, and no cost is incurred. A rejected call is itself written
to the ledger when an authenticated `sub` was recoverable, and to the security log
otherwise, because a spike in rejections is a signal worth keeping.

### Owner

Platform engineering. Key generation, rotation, and revocation are operational duties
with a runbook, not code paths.

### Verification

Negative tests for each rule: missing token, expired token, unknown `kid`, revoked
`kid`, scope absent, scope exceeding registration, `tenant_id` and `org_id` mismatch,
and `jti` reuse. Each must fail closed.

## P2 — Tenant isolation and data access

**Intent**: a tenant's data is reachable only by that tenant, at every tier, including
the agent tier.

### Rules

1. The organization is resolved from a server-validated source: a session claim for web
   paths, the verified `org_id` claim for agent paths, or a route segment validated
   against the authenticated user's memberships. Never from a request body.
2. Membership is confirmed against stored data, and a revoked or expired membership
   conveys no access.
3. Every read and write goes through a client bound to the resolved identity so RLS
   enforces isolation. The privileged `DATABASE_URL` connection is not used in a
   user-facing or agent request path.
4. Background work that legitimately needs elevated access runs with an explicit,
   audited organization context, and the audit entry names the job, the organization,
   and the reason.
5. Policy expressions never reference `Membership` or `Organization` directly. They use
   the `app_user_role_in(text)` helper, because `FORCE ROW LEVEL SECURITY` on those
   tables causes Postgres `42P17` recursion otherwise.
6. `FORCE ROW LEVEL SECURITY` is enabled on every tenant-owned table, so the guarantee
   applies to the table owner as well.
7. Raw SQL quotes every CamelCase identifier. Prisma `String` keys are Postgres `TEXT`,
   so `current_setting(...)` is never cast to `uuid`.
8. A cross-tenant identifier in a request is treated as an error rather than as a
   not-found, so the API does not leak the existence of other tenants' rows.

### Violation semantics

A cross-tenant attempt is denied by the database, surfaced as a validation error rather
than an authorization error where existence would otherwise leak, and written to the
ledger with the actor and the target.

### Owner

Platform engineering, with the isolation suite as the acceptance gate.

### Verification

`supabase/tests/tenant_isolation.sql` covers read, insert, update, and delete denial
across tenants, plus the append-only guarantees. A gateway-level test asserts that a
token for tenant A cannot read, mutate, or even confirm the existence of a tenant B
task.

## P3 — Age-tier governance and guardian authority

**Intent**: an athlete's age determines what may be automated, and authority over a
minor's commercial activity is held by a recorded, revocable guardian relationship
rather than assumed.

### Rules

1. Age tier is computed server-side from the stored date of birth against the time of
   the action. A tier supplied by a client is ignored and treated as an invalid input.
2. There are three tiers: `8–12`, `13–17`, and `18–24`.
3. **`8–12`**: restricted to drafting and review. Publishing is blocked and data export is
   blocked, and no setting, threshold, or role can lift those blocks. A dual signature is
   required, and `a2a:co-sign` is held by the guardian alone — the athlete's scope set at this
   tier carries only `a2a:read` and `a2a:propose`.
4. **`13–17`**: co-pilot mode. Publishing requires both the athlete's and a guardian's
   approval on the same artifact version, and both parties hold `a2a:co-sign`. High-school and
   NCAA policy checks apply. A revision after one signature invalidates that signature.
5. **`18–24`**: autonomy follows the value threshold in P4 and requires no co-sign.
6. A missing date of birth fails closed: no supervised path is available and no autonomy
   is granted.
7. Guardian authority requires an active `GuardianLink` with a null `revokedAt` and a
   `GuardianConsent` row covering the action's scope. A link without consent conveys
   nothing, and consent without a link is not authority.
8. Guardians are full authenticated users. Authority is never conveyed by a shared link,
   a code, or an unauthenticated form.
9. Revocation is immediate and forward-only. Actions taken before revocation remain
   recorded; actions after it are refused.
10. Every tier resolution, consent check, and co-sign event for a supervised action is
    written to the ledger with the actor, the tier, and the artifact version.
11. Guardian authorisation is a cryptographic signature bound to the artifact version, not
    an ordinary interface confirmation, so a signature cannot be replayed onto content the
    signer never saw.

### Violation semantics

A blocked publish or export raises a permission error naming the tier, so the message is
actionable rather than opaque. A co-sign attempt from a revoked or unconsented guardian
is recorded as a refused attempt, because a pattern of refusals is a signal.

### Owner

Product owner for tier policy; platform engineering for enforcement.

### Verification

Tier resolver unit tests per boundary condition (the day before a birthday, the day
after); an `8–12` publish attempt rejected at every entry point; an `8–12` co-sign attempt
by the athlete rejected, since the guardian alone holds that authority at Youth; a `13–17`
publish with a single signature rejected; a revised artifact invalidating a prior
signature; a revoked `GuardianLink` failing a co-sign attempt.

## P4 — Autonomy and deal-execution threshold

**Intent**: automated action is bounded by a value the tenant explicitly configured, and
every gate decision is explicable after the fact.

### Rules

1. The platform default threshold is `$250`, stored as `25000` minor units.
2. The comparison is strict. A value equal to the threshold is gated; only a value below
   it may proceed unattended.
3. The threshold may be overridden per tenant. A tenant with no stored value resolves to
   the platform default, never to unlimited autonomy.
4. Only a member holding `manage_settings` may change the threshold, verified against
   the canonical permission list and never by an inline role test.
5. Every change records the previous value, the new value, the actor, and the timestamp
   in the ledger.
6. The gate persists the threshold in force, the compared value, and the decision
   (`auto_proceed` or `human_required`) on the execution, so the outcome is explained by
   stored data rather than by re-deriving it later.
7. A kill switch forces every execution to the human gate regardless of value. It is
   independent of the threshold, so incident response never has to corrupt the tenant's
   configured number.
8. Age tier is evaluated before value. The threshold can widen autonomy but can never
   narrow a tier's restriction, so a `13–17` dual-sign applies even below the threshold.
9. A value that cannot be resolved — null, missing, or unparseable — is gated. The gate
   fails closed on missing data.
10. Currency comparisons use integer minor units. No floating-point comparison decides a
    gate.

### Violation semantics

A gated execution settles at `PENDING_APPROVAL` and notifies the approver; it does not
silently stall. An attempt to change the threshold without `manage_settings` is refused
and recorded.

### Owner

Product owner for the default value; tenant `OWNER` or `ADMIN` for overrides.

### Verification

Boundary tests at exactly the threshold, one minor unit below, and one above; a
kill-switch test; a permission test that `MEMBER` is refused and `ADMIN` accepted; a
test asserting the comparison never reads the `Float` column.

## P5 — Compliance enforcement order

**Intent**: rules are applied deterministically before any non-deterministic review, a
serious finding blocks publication, and every verdict names the rule version that
produced it.

### Rules

1. The order is fixed: deterministic evaluation, then mutation, then advisory model
   review, then the gate. No step may be reordered.
2. The deterministic evaluator is authoritative and side-effect free. It returns matched
   rule ids, severities, and a score.
3. Mutations are applied to bring an artifact into compliance before the gate runs. The
   canonical case is disclosure injection: the required tags `#ad` and `#sponsored` are
   inserted before the artifact reaches a human reviewer, so the reviewer sees compliant
   content rather than content they must repair.
4. Every mutation records the rule that required it, because a mutation nobody can
   explain is indistinguishable from corruption.
5. Severity uses the stored `RiskSeverity` set: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
6. A `HIGH` or `CRITICAL` finding blocks publication. The block is enforced at the
   publish path, not merely displayed in the UI, so bypassing the interface does not
   bypass the rule.
7. Advisory model review may add findings and may raise a severity. It can never clear a
   deterministic finding and can never unblock a blocked artifact. The model cannot
   overrule a rule.
8. Every verdict persists the policy snapshot hash that produced it, so a past verdict
   is reproducible after the pack has changed.
9. A rule whose pack has been superseded continues to evaluate under the pack in force
   at the time of the action; a retroactive re-evaluation is a separate, explicit
   operation that records its own snapshot.
10. The evaluator never mutates stored artifacts outside the defined mutation step. A
    read-path evaluation must not write.

### Violation semantics

A blocked publish returns a refusal naming the rule ids and severities. An artifact with
an unresolvable policy snapshot is treated as unevaluated and is therefore blocked,
because "unknown" must not behave like "clean".

### Owner

Compliance lead for rule content; platform engineering for enforcement order.

### Verification

A fixture suite covering each rule id with a positive and negative case; a
blocked-publish test proving the block is enforced below the UI; a test asserting that
an advisory review cannot clear a deterministic finding; a disclosure-injection test
proving the tag exists before the gate runs.

## P6 — Human-in-the-loop and escalation

**Intent**: a human can stop any automated action, the platform never silently stalls,
and repeated disagreement escalates rather than looping.

### Gate catalogue

| Gate | Trigger | Approver | Failure if bypassed |
|---|---|---|---|
| Value gate | Deal value at or above the tenant threshold | Member with review authority | Automated commitment above the tenant's stated tolerance |
| Age gate | Tier is `8–12` or `13–17` | Athlete, plus guardian for `13–17` | A minor's content published without consent |
| Kill switch | Tenant switch enabled | Member with review authority | No override available at all |
| Compliance block | `HIGH` or `CRITICAL` finding | Not approvable; the artifact must change | A rule violation published |
| Revision cap | Loop limit reached | Escalation to an `OWNER` or `ADMIN` | Unbounded generate-review spending |

### Rules

1. A gated execution settles at `PENDING_APPROVAL` and is visible in the approval queue.
   It does not silently expire, and a `staged` task awaiting a guardian is never
   discarded by a timeout.
2. Timeout behaviour is notify, then escalate. No configuration may cause a timeout to
   auto-approve. A deadline can reassign an approval or raise its priority; it can never
   approve.
3. The revision loop is bounded by a per-task cap. Reaching the cap escalates to an
   `OWNER` or `ADMIN` rather than permitting another iteration. The cap value is a
   product decision recorded here once set; until it is set, the cap is treated as
   reached at the first revision that does not converge.
4. Approval requires the role defined by the gate, checked against the canonical
   permission list. An inline role comparison is a defect.
5. A reviewer may not approve their own proposal where the gate exists to check that
   party. Self-approval is refused and recorded.
6. Escalation order for a supervised athlete: reviewer, then guardian, then `ADMIN`. A
   guardian may escalate to an `ADMIN`; an `ADMIN` may not overrule a guardian's refusal
   where the tier requires guardian consent.
7. Every gate decision records the gate that fired, the inputs it evaluated, the actor,
   and the artifact version.
8. An approval binds to a specific artifact version. A revision after approval
   invalidates it and returns the task to the gate.
9. Fail-closed: any error evaluating a gate results in the human gate, never in
   auto-approval.

### Violation semantics

A refused self-approval and a bypass attempt are both recorded. A gate evaluation error
is recorded with the error, and the task is held rather than advanced.

### Owner

Platform engineering for enforcement; product owner for the revision cap and SLA values.

### Verification

Approval by each role at each gate, including refusals; a timeout test proving no
auto-approval path exists; a self-approval refusal; a revision-after-approval
invalidation; an error-injection test proving the gate fails closed.

## P7 — Cost, rate, and abuse governance

**Intent**: a single tenant cannot exhaust shared capacity or run unbounded spend, and
cost is attributable per task.

### Rules

1. The per-tenant rate limit is `100` requests per minute at the edge. Exceeding it
   returns a rate-limit error; it is not absorbed by queueing indefinitely.
2. The per-task cost circuit breaker trips at `$0.02` accumulated cost. A tripped task
   transitions to `FAILED` with the breaker named as the cause, and does not continue to
   the next model call.
3. The breaker is per task, not per tenant, so one runaway task cannot exhaust a tenant's
   budget silently.
4. Plan quotas are enforced from `Entitlement` with usage recorded in `UsageEvent`.
   Consumption is checked before a model call, not after, so a quota breach is refused
   rather than billed.
5. The rate limiter must be shared across processes. The in-memory sliding window in the
   web tier does not satisfy this and is not a control.
6. The semantic cache is checked before routing to a model, at the `0.92` similarity
   threshold. A cache hit records `cacheHit` and does not incur model cost.
7. A cache entry produced under a superseded policy pack is invalid. Pack version change
   invalidates affected cache entries, so a stale compliance verdict is never served.
8. Every task records `costMinorUnits` and writes it to the ledger, so cost is
   attributable to a tenant, an agent, and a task.
9. The breaker threshold and the rate limit are platform constants, not per-tenant
   settings, and changing either requires an ADR.
10. Noisy-neighbour policy: a tenant at its limit is throttled to its own allocation and
    does not degrade other tenants. Shared capacity exhaustion degrades all tenants
    fairly rather than letting the first caller consume the pool.
11. Three axes are limited together, not independently: (a) recursion depth, capped at 5
    nested delegations; (b) concurrent active tasks, capped per tenant so a burst cannot
    occupy the worker pool indefinitely; (c) token and cost budgeting, tracked as aggregate
    spend per tenant per period. A request exceeding any axis is refused on that axis.
12. The rejection contract is explicit: exceeding a limit returns JSON-RPC `-32005 Too Many
    Requests` with an `X-RateLimit-Reset` header, so a client can back off deliberately
    rather than retrying blindly.

### Violation semantics

A tripped breaker fails the task with a specific error, and the task can be retried only
by an explicit action, not automatically. Repeated rate-limit rejections raise an abuse
signal for review.

### Owner

Platform engineering; finance owns plan quota definitions.

### Verification

A breaker test proving the task stops at the threshold; a rate-limit test proving the
limit holds across two processes; a three-axis test proving each axis refuses independently
rather than one axis masking another; a test asserting a limit breach returns `-32005` with
an `X-RateLimit-Reset` header; a quota test proving consumption is checked before dispatch;
a cache-invalidation test proving a superseded pack cannot serve a cached verdict.

## P8 — Audit and integrity

**Intent**: the record of what happened is complete, attributable, and tamper-evident,
and integrity can be verified rather than asserted.

### Rules

1. Sensitive operations write a ledger entry in the same transaction as the operation,
   so an operation cannot commit without its record.
2. Sensitive operations are: any write or mutation, billing or entitlement change,
   role or membership change, threshold change, gate decision, consent grant or
   revocation, co-sign, publish, cancellation, and data export.
3. Each entry captures the actor (type and id), the agent `jti` where an agent acted,
   the scopes in effect, the organization, the action, the target, the outcome, and the
   timestamp.
4. Entries are chained per tenant: `entryHash` covers the organization, the sequence,
   the previous hash, and the canonical payload. `prevHash` links to the prior entry.
5. `sequence` is monotonic per tenant and assigned inside the writing transaction under
   a per-tenant lock, so concurrent writers cannot fork the chain.
6. The table is append-only, enforced by a trigger that rejects `UPDATE` and `DELETE`
   including from privileged roles. Integrity repair appends a correcting entry; it never
   edits history.
7. A verification routine recomputes a tenant's chain and reports the first divergent
   sequence number. Verification is available on demand and runs on a schedule.
8. A verification failure is a security incident, not a data-quality issue, and is
   escalated as such.
9. Retention: entries are retained for the life of the tenant plus the documented
   compliance window. Expiry is handled by archiving a verified chain, never by deleting
   rows in place.
10. The streaming view carries an integrity breadcrumb per event — the sequence and the
    entry hash — so a client can detect a gap rather than trusting the stream.

### Violation semantics

A failed write of an audit entry fails the operation it describes, because an
unrecorded mutation is the outcome the protocol exists to prevent. A chain divergence
raises an alert and halts writes for that tenant pending investigation.

### Owner

Platform engineering; the compliance lead consumes verification output.

### Verification

Append-only assertions in `supabase/tests/tenant_isolation.sql` for both `UPDATE` and
`DELETE`; a chain-verification test that detects a deliberately modified payload; a
concurrency test with two writers that asserts no fork; a test asserting that a failed
audit write rolls back its operation.

## P9 — Incident response and failure semantics

**Intent**: failures degrade predictably, retries do not duplicate work, and recovery
does not require improvisation.

### Rules

1. Redelivery is safe. Every worker path proceeds only from the states it is permitted
   to act on and returns a no-op duplicate result otherwise. This preserves the existing
   behaviour of `run_nil_generation_pipeline` (proceeds only from `QUEUED` or `RUNNING`)
   and `resume_nil_pipeline_after_approval` (only from `APPROVED` or
   `REVISION_REQUESTED`).
2. Every externally triggered operation carries an idempotency key. A repeated key
   returns the original outcome rather than performing the work twice.
3. Core delivery is at-least-once, so every consumer must be idempotent. Correctness
   must not depend on exactly-once delivery.
4. A failed task after the configured attempt count moves to a dead-letter path with its
   payload and error preserved, and is surfaced for operator action. It is not silently
   dropped.
5. Model-provider failures are retried with backoff and then failed, not retried
   indefinitely. A provider outage must not consume a tenant's entire quota.
6. Key rotation is a routine operation with an overlap window: new keys are published
   before they are required, and a retired key is removed only after every caller has
   migrated. Compromise is the only case where a key is revoked without overlap.
7. A tripped cost breaker requires explicit operator action to clear. It never
   self-resets, because a self-resetting breaker on a runaway task is a loop.
8. Degraded mode: if a dependency required for evaluation is unavailable, the affected
   path fails closed. If the audit ledger is unavailable, writes that require an audit
   entry fail rather than proceeding unrecorded.
9. The kill switch is the first-line mitigation for any suspected autonomous misbehaviour
   at a tenant, and it is available without a deploy.
10. Every incident produces a documented timeline from the ledger. Investigation reads
    the ledger; it does not rely on application logs alone.

### Violation semantics

An unhandled error is captured with its failing node and the task transitions to
`FAILED`, which is terminal and requires explicit operator action to retry. No path
auto-approves to clear an error.

### Owner

Platform engineering, with an on-call rotation once external agents are onboarded.

### Verification

Duplicate-delivery tests for both worker paths; an idempotency-key replay test; a
dead-letter test proving the payload survives; a breaker test proving it does not
self-reset; an audit-outage test proving writes fail rather than proceed.

## P10 — Data flywheel and model lifecycle

**Intent**: human corrections are captured as a usable signal without exposing a minor's
data, and no model change reaches a minor's content path unmeasured.

### Rules

1. An approval with edits writes one `EditDelta` row per changed field, capturing the
   before value, the after value, the reviewer, and the reason where given.
2. Deltas are captured against the artifact version that was reviewed, so a delta is
   attributable to a specific proposal rather than to a task in general.
3. Redaction is a precondition for use, not a later step. A delta for a supervised
   athlete's tenant is stored with `redacted` set unless a recorded consent permits
   otherwise.
4. No export path may read a non-redacted delta belonging to a supervised athlete. This
   is enforced in the query, not by policy or convention.
5. Consent constrains use as well as collection: a consent scope that permits review
   does not thereby permit training use.
6. Model changes reach production only through an evaluation harness with a fixed suite,
   a recorded baseline, and a promotion decision. The flywheel supplies the evaluation
   material, which is why capture precedes training.
7. Every run records the model, the prompt-template version, and the policy snapshot, so
   a quality change is attributable to a model change, a prompt change, or a rule change
   rather than to unexplained drift.
8. Rollback is a first-class operation: a model or prompt version can be reverted per
   tenant without a deploy.
9. No fine-tuning is performed until the harness exists. Capture-and-store is the current
   state of this protocol, and that limitation is stated rather than implied.
10. A training export is an audited operation with its own ledger entry naming the scope,
    the purpose, and the requester.

### Violation semantics

An export query returning a non-redacted supervised delta fails the export rather than
raising a warning. A model change without a recorded promotion decision is reverted.

### Owner

Platform engineering for capture and enforcement; product owner for consent scopes.

### Verification

An edit-write test asserting one delta per changed field; a redaction-by-default test for
a supervised tenant; an export-guard test asserting the query cannot return a
non-redacted supervised row; a rollback test per version.

## P11 — Change management

**Intent**: policy, prompt, and model changes are reviewable, versioned, and reversible,
and a past decision can always be explained by the version that produced it.

### Rules

1. Policy packs are versioned files under version control. A change is a diff, not a
   database edit.
2. A pack's content hash is its identity. Any execution or ledger entry referencing that
   hash resolves to the same content forever.
3. A pack is never edited in place once referenced. A correction is a new version with a
   new `effectiveFrom`, and the prior version gets an `effectiveTo`.
4. Changes to rules, prompts, models, or thresholds require an ADR when they alter a
   control's behaviour, and a documented rationale when they do not.
5. The same evaluator contract is implemented in both tiers and verified against a shared
   fixture set. A rule change updates the fixtures in the same change, or the two
   implementations drift silently.
6. Migrations are forward-only and additive where possible. A destructive change is a
   separate, later change after every reader has migrated.
7. Schema changes follow the existing convention: Prisma schema, the RLS file, and a
   Supabase migration mirror, together.
8. Prompt-template versions are recorded on every run. A prompt change with no version
   bump is a defect.
9. Rollback is documented per change type: a pack reverts by effective date, a prompt
   reverts by version, a model reverts per tenant.
10. Documentation in `docs/a2a/` is updated in the same change as the behaviour it
    describes. A stale `LAYER-STATUS.md` row is treated as a defect.

### Violation semantics

An execution referencing an unresolvable policy hash is blocked rather than assumed
compliant, consistent with P5.

### Owner

Platform engineering; the compliance lead approves rule content changes.

### Verification

A pack-change test proving the old hash still resolves; a fixture-parity test run in both
pipelines; a migration test proving additivity; a test asserting that every run carries a
prompt version.

## P12 — External interop

**Intent**: a partner agent can integrate without gaining more authority than it needs,
and the platform's task semantics are discoverable rather than reverse-engineered.

### Rules

1. An agent card is published at `/.well-known/agent.json` describing skills, scopes,
   tier limits, and delegation limits, per `AGENT-CARDS.md`.
2. A card declares capability; it never grants it. The token's `scopes` claim and the
   `AgentRegistration` row are authoritative, and a card claiming more than either is
   rejected.
3. External callers use JWKS; internal hops use a pinned PEM. The key sets are distinct.
4. An external agent is registered with an explicit decision record, a quota, and a
   declared maximum depth of at most 2.
5. External agents are never granted `a2a:sign`, `a2a:admin`, or `a2a:delete`.
6. The task lifecycle is exposed as documented states and transitions. A client is not
   required to infer state from side effects.
7. Cancellation and status retrieval are available to the tenant that owns the task, and
   to no other tenant.
8. Streaming is available for task progress and carries the integrity breadcrumb from P8,
   so a client can detect a gap rather than trusting the stream.
9. Onboarding requires an agreement and a stated purpose. Registration is not
   self-service, because an unaccountable agent acting on a minor's data is the risk this
   protocol bounds.
10. Breaking a transport contract requires a version bump and a documented deprecation
    window, since JSON-RPC error codes and field shapes are public surface.
11. Execution is opaque. A caller receives skill contracts, task lifecycle states, and
    artifacts, and never prompt chains, the internal agent graph, or database schema.

### Violation semantics

A card or scope mismatch is rejected at authentication. An unregistered caller is
rejected regardless of a valid signature, because a valid key is not the same as an
authorised participant.

### Owner

Platform engineering; the product owner approves partner onboarding.

### Verification

Contract tests for each declared method; a lifecycle transition test over the public
surface; a cross-tenant status and cancel denial test; a streaming integrity test; a
registration test proving an unregistered but validly signed token is refused.

## Protocol map

| Protocol | Primary ADR | Related gaps | Milestone |
|---|---|---|---|
| P1 identity and trust | ADR-0002 | G2 | M1 |
| P2 tenant isolation | — | G1 | M1 |
| P3 age and guardian governance | ADR-0006 | G3 | M1 |
| P4 autonomy threshold | ADR-0007 | G4, G10 | M3 |
| P5 compliance order | ADR-0003 | G6 | M3 |
| P6 HITL and escalation | ADR-0007 | G4 | M3 |
| P7 cost and rate governance | ADR-0005 | G7 | M4 |
| P8 audit and integrity | ADR-0004 | G8 | M2 |
| P9 incident and failures | ADR-0001 | — | M4 |
| P10 flywheel and model lifecycle | ADR-0006 | — | M4 |
| P11 change management | ADR-0003 | G11 | Continuous |
| P12 external interop | ADR-0001, ADR-0002 | G9 | M2 |
