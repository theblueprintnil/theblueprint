# ADR-0006 — Guardians are first-class users; age tier is derived server-side

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: Platform owner
- **Affects**: identity model, `web/prisma/schema.prisma`, `prisma/rls.sql`, guardian portal, HITL gates

## Context

The product serves minors, and the specification defines three age tiers with
different autonomy: `8–12` (no publishing, no export), `13–17` (dual sign required),
and `18–24` (autonomy subject to the value threshold).

The repository has the vocabulary but not the mechanism. `Role` includes `GUARDIAN`
and `WorkspaceType` includes `GUARDIAN_PORTAL`; `web/src/lib/onboarding.ts` already
describes the persona as "approve deals and oversee a minor athlete's commercial
activity"; and `web/src/app/app/guardian/dashboard/page.tsx` exists as a placeholder.

What is absent is any data to act on:

- `Athlete` has `userId`, `name`, `sport`, `school`, `bio`, `avatarUrl`,
  `followerCount`, and `verificationStatus` — no date of birth, so no tier can be
  computed.
- There is no relationship between an athlete and a guardian, and no consent record.
- The HITL gate in the graph is unconditional: it does not vary by age, so a minor's
  content path is identical to an adult's.

Consent cannot be reconstructed after the fact. An athlete's tier at the time of an
action must be provable from stored data, not inferred from a later profile.

## Decision

Guardians are full users with their own authenticated identity, and age tier is
always computed server-side from a stored date of birth.

- **Guardian identity**: a guardian is a `User` with `Role.GUARDIAN`, holding the
  same authenticated identity mechanism as any other user and a membership in the
  athlete's organization. No shadow or passwordless identity is invented; the
  existing `User` model is used, and its required `passwordHash` field is satisfied
  by the normal provisioning path.
- **`Athlete.dateOfBirth`**: nullable at the column level so existing rows are not
  invalidated, but treated as required for any supervised action. Absence of a date
  of birth blocks supervised paths rather than defaulting to adult autonomy — the
  gate fails closed.
- **`GuardianLink`**: the athlete-to-guardian relationship, carrying the
  relationship type, the consent scope granted, how authority was verified, its
  effective date, and a revocation timestamp. A link with a revocation timestamp has
  no authority.
- **Consent records**: append-only, referencing the guardian, the athlete, the scope,
  and the timestamp, so the authority held at the moment of an action is
  reconstructable.
- **Tier resolution**: a server-side function computes the tier from the stored date
  of birth against the execution timestamp. Tier is never accepted from a request.
  Tier is evaluated **at the time of the action**, so an athlete who ages up mid
  engagement gets the new tier for new actions and the prior actions keep the tier
  they were performed under.
- **Tier effects**: `8–12` permits drafting and review but blocks publish and export;
  `13–17` requires both the athlete's and a guardian's approval on the same artifact
  (dual sign); `18–24` follows the value threshold in ADR-0007.
- Every tier resolution and consent check for a supervised action is written to the
  audit ledger.

## Consequences

### Positive

- Guardians have real identities, so their approvals are attributable and
  non-repudiable rather than recorded as an unattributed flag.
- The tier applied to a past action is provable from stored data, which is the
  property a compliance review actually asks for.
- Fail-closed on a missing date of birth means an incomplete profile cannot
  accidentally grant adult autonomy.
- Reuses the existing `Role.GUARDIAN` and `GUARDIAN_PORTAL` vocabulary instead of
  introducing a parallel concept.

### Negative / accepted trade-offs

- Provisioning a guardian now means creating a full user account, so guardian
  onboarding gains the friction of an authenticated signup and the support burden of
  a second identity per minor athlete.
- A missing date of birth blocks supervised actions, which will surface as an
  onboarding failure for existing athlete rows until data is backfilled.
- Age changes over time, so a cached tier is always potentially stale; the resolver
  must run per action, which costs a read on the hot path.
- RLS must extend to `GuardianLink` and consent records, and a recursive policy
  referencing `Athlete` risks the `42P17` recursion failure mode already documented
  for `Membership` and `Organization` — the `app_user_role_in` helper pattern must be
  followed.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Guardian as a flag on the athlete row | No authenticated identity, so an approval cannot be attributed and cannot be repudiated. |
| Guardian as a lightweight co-signer token | Cheaper onboarding, but a shareable link is not an identity and defeats the consent requirement. |
| Age entered as a static tier field | Becomes wrong silently as the athlete ages, and is client-settable, violating the sequence rule. |
| Inferring minor status from school year | Varies by district and jurisdiction, and is not provable to a stated date. |

## Swap point

The tier resolver. Gates call `resolveTier(athleteId, at) -> Tier` and never read
`dateOfBirth` directly, so the derivation (verification source, jurisdictional rules,
or an attestation workflow) can change without touching any gate.

## References

- `web/prisma/schema.prisma` — `Role`, `WorkspaceType`, `Athlete`, `User`
- `web/src/lib/onboarding.ts` — existing guardian persona definition
- `web/src/app/app/guardian/dashboard/page.tsx` — placeholder portal shell
- `prisma/rls.sql` — `app_user_role_in` helper required for recursion-safe policies
- `docs/a2a/OPERATIONAL-PROTOCOLS.md` — P3 age-tier governance and guardian authority