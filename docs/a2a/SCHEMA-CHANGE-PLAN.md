# Schema Change Plan

Every schema and RLS change the A2A layer requires, in dependency order, with the
validation that must pass before the next change starts.

**Applied status (2026-09-19).** Changes 1–6 are written into `web/prisma/schema.prisma`
and authored as migrations in `supabase/migrations/` — 1–4 in M1, 5–6 in M2
(`20260919000000_a2a_lifecycle_and_audit.sql`). `prisma validate` and `prisma generate`
are green. Changes 7–10 remain plans. One caveat applies to every applied row: **none of
them has been executed against a live database**, because Docker Desktop has not been
running for two consecutive milestones. `npx prisma db push`, `npm run db:rls`, the
Supabase migrations, and `supabase/tests/tenant_isolation.sql` are all still pending; the
rows below are marked `Authored` rather than `Verified` for that reason.

## Conventions

These follow the established conventions recorded in the Phase-1 memory and
`docs/SECURITY.md`.

- Tenant-owned tables carry `organizationId TEXT NOT NULL REFERENCES organizations(id)`.
- RLS policy expressions never reference `Membership` or `Organization` directly; they
  go through the `SECURITY DEFINER` helper `app_user_role_in(text)`, because
  `FORCE ROW LEVEL SECURITY` on those tables causes Postgres `42P17` recursion.
- Identifiers are quoted in raw SQL. Prisma `String` primary keys are Postgres `TEXT`,
  so never cast `current_setting(...)` to `uuid`.
- The RLS applier splits the raw file on `;`, and comments are stripped before
  splitting, so no function body may contain an internal semicolon.
- Currency is stored as integer minor units, never `Float`.
- Write files on Windows with `[IO.File]::WriteAllText` and `UTF8Encoding($false)`;
  a BOM breaks Prisma with `P1012`.

## Change order

| # | Change | Depends on | Milestone | Status |
|---|---|---|---|---|
| 1 | `Athlete.dateOfBirth`, `Athlete.ageTierVerifiedAt` | — | M1 | Authored |
| 2 | `GuardianLink`, `GuardianConsent` | 1 | M1 | Authored |
| 3 | `AgentRegistration`, `AgentKey` | — | M1 | Authored |
| 4 | `Organization.autonomyThresholdMinorUnits`, `Organization.autonomyKillSwitch` | — | M1 | Authored |
| 5 | `AgentExecutionStatus` new values and `AgentTaskExecution` A2A columns | 1, 4 | M2 | Authored |
| 6 | `A2AAuditEntry` with hash chain and append-only trigger | — | M2 | Authored |
| 7 | `PolicyPack` registry table | 5 | M3 | Planned |
| 8 | `Deal` approval columns and `amount` migration to minor units | 4 | M3 | Planned |
| 9 | `EditDelta` ledger | 5 | M4 | Planned |
| 10 | RLS for every new table, plus the Supabase mirror migration | 1–9 | M1–M4 | Partial (1–6 authored, 7–9 planned) |

Rows 1–4 are authored behind M1 and 5–6 behind M2; each is a paired Prisma
change plus Supabase migration. "Authored" means the DDL and its RLS exist in the
repository and pass static validation, but the live-database validation listed per change
has not run.

RLS is authored with each table rather than batched at the end; row 10 exists to
confirm coverage, not to defer it.

## 1 — Athlete age data

Adds the inputs the tier resolver requires (ADR-0006). Nullable so existing rows stay
valid, with the resolver failing closed when absent.

```prisma
model Athlete {
  dateOfBirth      DateTime?
  ageTierVerifiedAt DateTime?
  guardianLinks    GuardianLink[]
  consents         GuardianConsent[]
}
```

`ageTierVerifiedAt` records when the stored date of birth was last confirmed by an
authority (guardian attestation, school verification, or admin attestation) so a tier
derived from an unverified date is distinguishable from a verified one.

**Validation**: `npx prisma db push` against local Docker Postgres applies cleanly;
`npm run db:rls` still exits 0; existing tenant-isolation tests still pass; a tier
resolver unit test asserts that a missing `dateOfBirth` yields the restricted tier.

## 2 — Guardian relation and consent

Creates the authority relationship and its append-only consent record.

```prisma
model GuardianLink {
  id             String    @id @default(uuid())
  organizationId String
  athleteId      String
  guardianUserId String
  relationship   String
  verification   String
  effectiveFrom  DateTime
  revokedAt      DateTime?
  createdAt      DateTime  @default(now())

  @@unique([athleteId, guardianUserId])
  @@index([organizationId])
  @@index([guardianUserId])
}

model GuardianConsent {
  id             String   @id @default(uuid())
  organizationId String
  guardianLinkId String
  scope          String
  grantedByUserId String
  grantedAt      DateTime @default(now())
  revokedAt      DateTime?
  payload        Json?

  @@index([organizationId])
  @@index([guardianLinkId])
}
```

A `GuardianLink` with a non-null `revokedAt` conveys no authority. `GuardianConsent`
is append-only: revocation sets `revokedAt` on the existing row and a new grant is a
new row, so the authority held at a past moment is reconstructable.

**Validation**: a cross-tenant read of `GuardianLink` is denied by RLS; a revoked link
fails an authority check; a consent test asserts that a scope not granted is rejected.

## 3 — Agent registration and keys

Agent identity needs a registry, or scope and key decisions live only in environment
variables.

```prisma
model AgentRegistration {
  id          String   @id @default(uuid())
  agentId     String   @unique
  name        String
  publisher   String
  orgId       String?
  scopes      Json
  minTier     String
  maxDepth    Int      @default(2)
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([orgId])
}

model AgentKey {
  id              String   @id @default(uuid())
  agentId         String
  kid             String   @unique
  algorithm       String
  publicKeyPem    String
  notBefore       DateTime
  notAfter        DateTime?
  revokedAt       DateTime?
  createdAt       DateTime @default(now())

  @@index([agentId])
}
```

`AgentKey.publicKeyPem` holds public material only; private keys never enter the
database. Overlapping `notBefore` windows are what make rotation without downtime
possible, and `revokedAt` is the immediate-compromise path.

**Validation**: a token signed by a revoked `kid` is rejected; a token whose `scopes`
exceed the `AgentRegistration.scopes` row is rejected; a token with a `tenant_id`
differing from the resolved `org_id` is rejected.

## 4 — Autonomy threshold and kill switch

```prisma
model Organization {
  autonomyThresholdMinorUnits Int     @default(25000)
  autonomyKillSwitch          Boolean @default(false)
}
```

`25000` is `$250` in minor units. The default is on the column, so a missing row
value resolves to the platform default rather than to unlimited autonomy, and the
kill switch is independent of the threshold so incident response does not have to
corrupt the tenant's configured number (ADR-0007).

**Validation**: a value equal to the threshold is gated; a value one minor unit below
is auto-proceeded; a tenant with the kill switch on is gated at every value; a
threshold change by a `MEMBER` is rejected and by an `ADMIN` is accepted and audited.

## 5 — A2A lifecycle on executions

**Authored in M2.** Prisma enum values are additive, so existing rows keep their meaning.

```
enum AgentExecutionStatus {
  CANCELLED
  EXPIRED
  INPUT_REQUIRED
}
```

```prisma
model AgentTaskExecution {
  a2aTaskId        String   @unique
  traceId          String?
  parentTaskId     String?
  depth            Int      @default(0)
  costMinorUnits   Int      @default(0)
  ageTier          String?
  policySnapshotId String?
  cosignState      String?
  expiresAt        DateTime?
  cancelledAt      DateTime?
  auditSequence    BigInt?
}
```

Lifecycle mapping from the specification's task states onto the stored enum:

| Specification state | Stored status |
|---|---|
| `created` | `QUEUED` |
| `working` | `RUNNING` |
| `input-required` | `INPUT_REQUIRED` |
| `staged` | `PENDING_APPROVAL` |
| `approved` | `APPROVED` |
| `revision-requested` | `REVISION_REQUESTED` |
| `completed` | `PUBLISHED` |
| `failed` | `FAILED` |
| `cancelled` | `CANCELLED` |
| `expired` | `EXPIRED` |

`depth` defaults to `0` for a root task. `auditSequence` links the execution to the
ledger entry that recorded its final transition, so a task and its audit record can be
cross-checked without a full scan.

**Validation**: both existing redelivery guards still hold — a duplicate delivery of
`run_nil_generation_pipeline` outside `QUEUED` or `RUNNING`, and of
`resume_nil_pipeline_after_approval` outside `APPROVED` or `REVISION_REQUESTED`, each
return the no-op duplicate summary rather than re-executing; a transition out of
`CANCELLED` or `EXPIRED` is rejected; a task at depth 5 cannot spawn a child.

## 6 — Audit ledger with a hash chain

**Authored in M2.** `web/prisma/schema.prisma` carries the model below; the Supabase side
is `supabase/migrations/20260919000000_a2a_lifecycle_and_audit.sql`, which creates
`a2a_audit_entries`, its RLS policies, and the append-only trigger in one file.
`agent-engine/agent_engine/audit.py` is the single canonical implementation of the
hashing rule, and `agent-engine/tests/test_audit_chain.py` covers genesis, ordering,
tamper detection, and per-tenant independence without a database.

```prisma
model A2AAuditEntry {
  id             String   @id @default(uuid())
  organizationId String
  sequence       BigInt
  action         String
  actorType      String
  actorId        String?
  actorJti       String?
  targetType     String?
  targetId       String?
  outcome        String
  payload        Json?
  prevHash       String
  entryHash      String
  createdAt      DateTime @default(now())

  @@unique([organizationId, sequence])
  @@index([organizationId, createdAt])
  @@index([action])
}
```

The append-only trigger is defined in a Supabase migration rather than in
`prisma/rls.sql`. This is deliberate: the RLS applier splits the raw file on `;` and
strips comments before splitting, so a `plpgsql` body containing statement
semicolons cannot live there. Migration files are applied by `psql -v ON_ERROR_STOP=1`
and have no such constraint. On the Prisma path the table still carries grants plus
SELECT and INSERT policies only, which denies `UPDATE` and `DELETE` to the application
role and gives the same protection at the policy layer.

**Validation**: `supabase/tests/tenant_isolation.sql` gains assertions that a
`service_role` `UPDATE` and `DELETE` on `A2AAuditEntry` both fail; a chain
verification test recomputes hashes for a seeded tenant and detects a deliberately
modified payload; sequence allocation under two concurrent writers does not fork.

## 7 — Policy pack registry

The pack files live in version control as JSON; the registry makes the hash a
first-class, joinable fact so a verdict can be traced to a pack without reading the
filesystem (ADR-0003).

```prisma
model PolicyPack {
  id             String   @id @default(uuid())
  packKey        String
  version        String
  jurisdiction   String
  contentHash    String   @unique
  effectiveFrom  DateTime
  effectiveTo    DateTime?
  status         String   @default("ACTIVE")
  createdAt      DateTime @default(now())

  @@unique([packKey, version])
  @@index([jurisdiction, effectiveFrom])
}
```

A pack is immutable once its `contentHash` appears on any execution or ledger entry.
Corrections insert a new version and set `effectiveTo` on the prior row; no pack row
is ever updated in place.

**Validation**: a resolver test selects the pack in force for a given jurisdiction and
timestamp; a test asserts that an execution referencing a superseded hash still
resolves to the original pack content.

## 8 — Deal approval state and currency precision

```prisma
model Deal {
  amountMinorUnits    Int?
  approvalRequired    Boolean  @default(true)
  approvalState       String?
  approverUserId      String?
  approvedAt          DateTime?
  cosignState         String?
  thresholdAtDecision Int?
  policySnapshotId    String?
}
```

`thresholdAtDecision` records the threshold in force when the gate ran, so a decision
remains explicable after the tenant changes the setting (ADR-0007).

The `amount Float` to `amountMinorUnits Int` migration is three ordered steps, not one:
add the new column, backfill by rounding the existing float to minor units and
reconcile any row whose rounding differs by more than one unit, then make the new
column authoritative in code and leave `amount` in place until every reader has
migrated. Dropping `amount` is a separate, later change.

**Validation**: a backfill test asserts the sum of converted values matches the sum of
source values within the documented rounding tolerance; a gate test proves the
comparison uses `amountMinorUnits` and never `amount`; a row with a null
`amountMinorUnits` is gated rather than auto-proceeded.

## 9 — Edit-delta ledger

The flywheel captures what a human changed, not just that they changed something.
`reviewerFeedback` remains as the free-text note; deltas are structured.

```prisma
model EditDelta {
  id               String   @id @default(uuid())
  organizationId   String
  taskExecutionId  String
  reviewerId       String?
  field            String
  beforeValue      String?
  afterValue       String?
  reason           String?
  policySnapshotId String?
  redacted         Boolean  @default(false)
  createdAt        DateTime @default(now())

  @@index([organizationId, createdAt])
  @@index([taskExecutionId])
}
```

Consent and redaction are preconditions, not afterthoughts: a delta from a tenant whose
athlete is in a supervised tier is captured with `redacted` set unless a recorded
consent permits otherwise, and no export path may read a non-redacted row for a
supervised athlete (ADR-0006).

**Validation**: approving with edits writes one delta per changed field; a supervised
athlete's delta is captured redacted by default; a test asserts that no training-export
query returns a non-redacted delta for a supervised athlete.

## 10 — RLS coverage and the Supabase mirror

Each table above gets grants, `FORCE ROW LEVEL SECURITY`, and tenant-scoped policies
authored through the `app_user_role_in(text)` helper, matching the pattern recorded in
`docs/SECURITY.md` and `prisma/rls.sql`.

| Table | SELECT | INSERT | UPDATE or DELETE |
|---|---|---|---|
| `GuardianLink` | member | owner, admin | owner, admin |
| `GuardianConsent` | member | owner, admin | none (append-only) |
| `AgentRegistration` | member | owner, admin | owner, admin |
| `AgentKey` | owner, admin | owner, admin | owner, admin |
| `A2AAuditEntry` | member | member | none (append-only, plus the migration trigger) |
| `PolicyPack` | member (read-only, platform-scoped) | none | none |
| `EditDelta` | member | member | none (append-only) |

`PolicyPack` is platform reference data rather than tenant data: readable by any
authenticated member, writable by no application role, and changed only by migration.

The Supabase mirror is a migration under `supabase/migrations/` carrying the same
tables, the `A2AAuditEntry` append-only trigger, and the isolation assertions added to
`supabase/tests/tenant_isolation.sql`. Both paths are validated, because the Prisma RLS
path and the Supabase foundation path are separate foundations by design.

## Validation commands

Per change:

```text
cd web
npx prisma db push
npm run db:rls
npm run typecheck
npm run lint
npm run test
npm run build
```

For the SQL foundation and the isolation suite:

```text
docker compose up -d
psql -h localhost -p 5433 -U postgres -d blueprint -v ON_ERROR_STOP=1 -f supabase/migrations/<migration>.sql
psql -h localhost -p 5433 -U postgres -d blueprint -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation.sql
```

For the agent engine, where the identity and lifecycle changes land:

```text
cd agent-engine
.venv\Scripts\python.exe -m pytest
```

A change is complete only when all three groups pass and the corresponding row in
`LAYER-STATUS.md` has been updated to match.

## Sequencing note

Changes 1 through 4 are prerequisites for everything after them: without age data there
is no tier, without registration there is no identity, and without the threshold column
there is no gate. Changes 5 and 6 must land together, because a lifecycle transition
without a ledger entry leaves the audit trail with a hole.


