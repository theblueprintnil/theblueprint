# ADR-0004 — A hash-chained audit ledger for agent operations

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: Platform owner
- **Affects**: audit layer, `web/prisma/schema.prisma`, `prisma/rls.sql`, `supabase/migrations/`

## Context

Two audit surfaces exist today and neither provides tamper evidence.

- `AuditLog` in `web/prisma/schema.prisma` stores `action`, `entityType`, `entityId`,
  `actorId`, `details String?`, and `organizationId`. `details` is a nullable string,
  so structured facts must be serialized, and nothing binds one row to the next: a
  row can be edited or deleted and the remaining rows still read as coherent.
- The Supabase foundation's `audit_events` is append-only by policy —
  `authenticated` holds INSERT and SELECT only, with no UPDATE or DELETE policy, and
  `service_role` is the documented exception for integrity repair. Append-only
  prevents application-level mutation but not a privileged operator or direct SQL
  rewriting history.

The specification requires an immutable decision record: for a minor athlete's
content, a deal at value, or a co-sign event, the platform must be able to show that
the recorded sequence is the sequence that happened.

## Decision

Introduce a dedicated append-only ledger with a per-tenant SHA-256 hash chain.

- New table `A2AAuditEntry` holding `organizationId`, a monotonic per-tenant
  `sequence`, `action`, `actorType` (agent or user), `actorId`, the JWT `jti` where an
  agent acted, `targetType`, `targetId`, `outcome`, `payload Json`, `prevHash`,
  `entryHash`, and `createdAt`.
- `entryHash` is `SHA-256(organizationId || sequence || prevHash || canonical(payload))`.
  `prevHash` is the previous entry's `entryHash` for the same tenant, with a
  documented genesis value for `sequence = 1`.
- `sequence` is assigned inside the same transaction as the write, under a per-tenant
  lock, so concurrent writers cannot fork the chain.
- A database trigger rejects any `UPDATE` or `DELETE` on the table, including from
  privileged roles, so append-only is enforced by the engine rather than by policy
  alone. Integrity repair, if ever needed, appends a correcting entry instead of
  editing history.
- A verification routine recomputes the chain for a tenant and reports the first
  divergent sequence number.
- The ledger is written in the same transaction as the operation it describes, per
  the `.clinerules` audit requirement, covering writes, billing changes,
  role and permission changes, and data exports.
- `AuditLog` remains for existing surfaces and is not retrofitted; new agent and
  compliance-sensitive operations write to both until the legacy readers migrate.

## Consequences

### Positive

- Any edit, deletion, or reordering of a ledger row breaks verification at a known
  sequence number, so tampering is detectable rather than merely prohibited.
- Agents become attributable: `actorId` plus `jti` plus `scopes` names who acted and
  under what authority.
- `payload Json` removes the string-serialization workaround and lets the compliance
  UI query structured fields.
- The chain gives the SSE audit stream a natural integrity breadcrumb per event.

### Negative / accepted trade-offs

- Every audited mutation now costs a per-tenant lock and a hash computation, adding
  latency to the hot path.
- The chain is per-tenant, so it provides ordering within a tenant and not a global
  order; cross-tenant sequence comparison is meaningless by design.
- Verification is O(n) per tenant and will need incremental checkpoints as volume
  grows.
- Two audit surfaces coexist during migration, which is a real risk of divergence
  until `AuditLog` readers are retired.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Add hash columns to the existing `AuditLog` | `details` is a `String?` and the table serves unrelated legacy readers; a nullable string column cannot carry canonical payloads for hashing. |
| Rely on RLS append-only alone | Blocks the application, not a privileged role or direct SQL, which is precisely the threat the chain addresses. |
| External append-only store (WORM bucket) | Strong immutability, but adds a second system of record and breaks transactional coupling with the operation being audited. |
| Database-level temporal tables | Preserves history but gives no cryptographic ordering proof and no tamper alarm. |

## Swap point

The ledger writer. All callers go through one `appendAuditEntry` function that owns
sequence allocation and hashing, so the storage target can change without touching
call sites. `AuditLog` retirement is a separate, later migration once its readers are
identified.

## References

- `web/prisma/schema.prisma` — `AuditLog` definition and current `details` column
- `docs/SECURITY.md` — append-only `audit_events` policy and the `service_role` exception
- `prisma/rls.sql` — existing RLS patterns to mirror for the new table
- `docs/a2a/OPERATIONAL-PROTOCOLS.md` — P8 audit and integrity