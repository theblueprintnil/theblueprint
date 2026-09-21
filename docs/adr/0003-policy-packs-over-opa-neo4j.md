# ADR-0003 — Versioned policy packs with an in-repo evaluator, not OPA or Neo4j

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: Platform owner
- **Affects**: L3 policy layer, `agent-engine/agent_engine/rules.py`, `web/src/lib/ai/`, Prisma schema

## Context

Compliance rules are currently code. `agent-engine/agent_engine/rules.py` holds
deterministic FTC, NCAA, and exclusivity checks as Python structures, and the web
tier carries a `ncaa-nil-v1-2026` policy identifier as a literal string. The Prisma
schema already reserves the audit hook: `AiRun.policySnapshotId String?` exists so a
run can record which policy version was evaluated, and `AgentTaskExecution` stores
`complianceScore` and `complianceFlags`.

Two requirements follow from the specification and from the product's compliance
posture:

- NCAA rules change on a season cycle, and state NIL statutes and state
  high-school-association rules change on their own schedules.
- Every execution must be able to prove which rule version produced its verdict.

Hardcoding rules means a redeploy per rule change and no way to reproduce a past
verdict once code has moved on. The specification's target for this layer is OPA or
Cedar over a policy graph, with Neo4j for multi-hop exclusivity analysis.

## Decision

Make rule data the single source of truth, evaluated by a small deterministic engine
in both tiers.

- Policy packs are versioned JSON documents under `policy-packs/`, one per
  jurisdiction: `policy-packs/ncaa-nil-v1-2026.json`, `policy-packs/state/<code>.json`,
  and high-school-association packs as they are added.
- Each pack carries an `id`, a `version`, an `effectiveFrom`, a `jurisdiction`, and a
  list of `rules`. Each rule carries an `id`, a `severity` from the existing
  `RiskSeverity` set (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), a `match` predicate over
  the task inputs, and a `message`.
- A pack's **content hash** is the policy version. Every execution persists that hash
  to `policySnapshotId`, and `AgentTaskExecution` gains its own
  `policySnapshotId` so a run is reproducible without joining `AiRun`.
- The evaluator is deterministic and side-effect free. It returns a verdict object
  with the matched rule ids, the severities, and the score.
- The same evaluator contract is implemented in Python (authoritative, used by the
  graph) and TypeScript (for pre-flight checks and UI preview), verified against a
  shared fixture set so the two cannot drift silently.
- A pack is immutable once a run references its hash. Corrections ship as a new
  version with a new `effectiveFrom`.

OPA, Cedar, and Neo4j are deferred. They are adopted only if exclusivity becomes a
genuine multi-hop graph problem or an external auditor requires a policy language
they can inspect independently.

## Consequences

### Positive

- Rule changes ship as data, without a deploy, and take effect on a stated date.
- Past verdicts are reproducible: the hash on the row identifies the exact rule set.
- Jurisdiction becomes a first-class dimension, which the state-law-first requirement
  depends on.
- The deterministic evaluator is trivially testable with fixtures, unlike a policy
  language's evaluation trace.

### Negative / accepted trade-offs

- Two evaluator implementations can drift; only the shared fixture suite prevents it,
  and that suite must be run in both pipelines or the guarantee is nominal.
- JSON packs cannot express arbitrary multi-hop reasoning, so a genuinely relational
  exclusivity question needs the deferred graph engine.
- Pack schema evolution needs its own versioning discipline, or old hashes stop
  being interpretable.
- Hand-rolled evaluation lacks OPA's independent verifiability, which matters if an
  external audit ever demands the policy engine itself be certified.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| OPA/Cedar now | Real engine and real verification story, but adds a service, a policy language, and an authoring workflow before the rule set has stabilized. |
| Neo4j AuraDB now | Exclusivity is currently a set-membership check, not a multi-hop traversal; the graph cost is not yet earned. |
| Keep rules in `rules.py` | No versioned snapshot, no per-jurisdiction override, and a redeploy per rule change. |
| Rules in the database only | Moves the pack out of version control, losing reviewable diffs for compliance-sensitive content. |

## Swap point

The pack loader and evaluator interface. The graph and the UI call
`evaluate(inputs, pack) -> verdict` and never read pack internals, so an OPA or Cedar
implementation drops in behind the same signature, with the pack hash still recorded
on the execution row.

## References

- `agent-engine/agent_engine/rules.py` — current deterministic checks
- `web/prisma/schema.prisma` — `AiRun.policySnapshotId`, `RiskSeverity`, `AgentTaskExecution.complianceFlags`
- `docs/a2a/OPERATIONAL-PROTOCOLS.md` — P5 compliance enforcement order, P11 change management