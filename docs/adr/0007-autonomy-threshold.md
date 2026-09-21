# ADR-0007 — A per-tenant autonomy threshold, defaulting to $250

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: Platform owner
- **Affects**: L9 HITL staging, deal pipeline, `Organization`, `Deal`, entitlements

## Context

The specification sets a `$250` auto-approval threshold: below it, an agent may
proceed without human sign-off; at or above it, a human gate applies. The number
exists to bound the blast radius of autonomous action on a minor's commercial
activity.

The repository has the value but no gate. `Deal` carries `amount Float`, `status`
(`DRAFT`, `PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED`), `stage`, and
`deliverables`. `AgentTaskExecution` reaches `PENDING_APPROVAL` through the graph's
interrupt, and that interrupt fires for every execution regardless of value. There is
no threshold column, no comparison, and no record of why a given execution was or was
not gated.

Because the threshold is a policy number rather than a constant, it must be
overridable per tenant — a university compliance office and a solo athlete have
different tolerances — and any override is itself a security-relevant change.

## Decision

Add a per-tenant threshold with a platform default of `$250`, evaluated at the gate.

- **Configuration**: `Organization.autonomyThresholdUsd`, defaulting to `250`. Absence
  of a value resolves to the platform default rather than to unlimited autonomy.
- **Currency handling**: the threshold and the compared deal value are stored as
  integer minor units. `Deal.amount` is currently a `Float`, which cannot represent
  currency exactly; the comparison uses a converted integer value, and migrating
  `Deal.amount` to integer minor units is recorded as follow-on work rather than
  silently tolerated.
- **Comparison**: strict. A value **equal to** the threshold is gated; only a value
  below it may proceed unattended.
- **Change authority**: only a member holding `manage_settings` — `OWNER` or `ADMIN`
  per `web/src/lib/permissions.ts` — may change the threshold. The check references
  the canonical permission list rather than testing a role inline, per `.clinerules`.
- **Change record**: every threshold change writes an audit ledger entry capturing the
  previous value, the new value, the actor, and the timestamp. The change is
  org-scoped and versioned so a past gate decision can be read against the threshold
  in force at that time.
- **Decision record**: each gated execution persists the threshold in force, the
  compared value, and the resulting decision (`auto_proceed` or `human_required`) so
  the outcome is explained by stored data.
- **Kill switch**: a tenant-level switch forces every execution to the human gate
  regardless of value. It is a distinct control from the threshold so that incident
  response does not require setting the threshold to zero.
- **Interaction with age**: the age tier in ADR-0006 is evaluated first. The threshold
  can only widen autonomy, never narrow a tier's restriction: a `13–17` dual-sign
  requirement applies even where the value is below the threshold, and `8–12` never
  publishes at any value.

## Consequences

### Positive

- Autonomous action is bounded by a number that is explicit, per-tenant, and
  auditable rather than implicit in a hardcoded gate.
- The gate decision becomes explainable after the fact from the execution row.
- The kill switch gives incident response a single lever that does not corrupt the
  tenant's configured threshold.
- Failure to read a threshold defaults to the conservative platform value, so a
  configuration error does not silently grant autonomy.

### Negative / accepted trade-offs

- `Deal.amount` remains a `Float` until migrated, so the comparison depends on a
  conversion step that is itself a correctness risk for values near the threshold.
- Threshold changes take effect for future gates only; in-flight executions carry the
  threshold that applied when they were gated, which will look inconsistent to a user
  who changed the setting mid-run.
- A per-tenant override is a governance surface: an `ADMIN` who lowers the threshold
  widens autonomous authority for minors, and audit recording does not prevent that,
  it only attributes it.
- The gate now needs the deal value available at the graph's interrupt point, which
  couples the content graph to the deal pipeline more tightly than today.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Hardcoded `$250` | No per-tenant override, and a rule change requires a deploy. |
| Threshold as an entitlement-plan feature only | Plan-tier mapping cannot express a tenant-specific risk appetite within one plan. |
| Per-deal manual approval setting | Puts the control in the hands of whoever creates the deal, which is the party the gate is meant to check. |
| Value percent-of-asset model | No meaningful asset base exists in the current data model. |

## Swap point

The gate evaluator. The graph calls `shouldGate({ tier, valueMinorUnits, tenant })`
and does not read `Organization` directly, so the policy can gain additional
dimensions (per-sport, per-brand, per-jurisdiction ceilings) behind the same call
without changing the graph or the gate record.

## References

- `web/prisma/schema.prisma` — `Deal.amount`, `DealStatus`, `Organization`
- `web/src/lib/permissions.ts` — `manage_settings`, `OWNER`, `ADMIN`
- `.clinerules` — role checks must reference the canonical role list
- `docs/adr/0006-age-tier-and-guardian-authority.md` — tier is evaluated before value
- `docs/a2a/OPERATIONAL-PROTOCOLS.md` — P4 autonomy and deal-execution threshold