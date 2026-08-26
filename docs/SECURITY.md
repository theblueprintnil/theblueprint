# Security Model — Phase 2 Multi-Tenant Database Foundation

This document describes the Row-Level Security (RLS) design of the Supabase SQL
foundation created in `supabase/migrations/`. It is the canonical Phase-2
tenant-isolation layer for The Blueprint.

> **Two data foundations.** This Supabase schema (`profiles`, `organizations`,
> `organization_members`, ...) is the Phase-2 canonical foundation and is
> independent of the existing Prisma data layer (PascalCase tables + `app_user`
> GUC-based RLS) used by `web/`. Work to migrate the application onto this
> foundation is tracked separately; this layer is the intended end state.

---

## 1. Threat model and guarantees

The core guarantee enforced by the database itself:

> **User A in Org A must never read or mutate data belonging to Org B.**

This is enforced by Row-Level Security on every tenant-owned table plus a
`WITH CHECK` clause on every write that binds the new/updated row's
`organization_id` to an organization the actor actually belongs to. The
guarantee is verified automatically by `supabase/tests/tenant_isolation.sql`.

## 2. Identity and authorization model

- Requests are authenticated by Supabase Auth. Inside RLS expressions the actor
  is resolved via `auth.uid()` (the JWT's `sub` claim).
- A user is a **tenant member** of organization `O` iff a row exists in
  `organization_members` for `(auth.uid(), O)`.
- Authorization is role-based with membership roles:

| Role    | Access scope |
|---------|--------------|
| `owner` | Everything in the tenant, plus managing the organization and membership, billing, entitlements. |
| `admin` | Manages membership, invitations, projects, and (same as owner) read/mutate tenant resources; cannot be elevated to owner by RLS alone. |
| `member` | Least privilege: read tenant resources, create projects / AI runs / usage / audit entries. |
| `viewer` | Read-only tenant access; cannot create or mutate tenant state. |

Two `SECURITY DEFINER` helpers back the policies (defined in migration
`…_0002_add_rls_policies.sql`):

```sql
public.member_role(check_org uuid) -> memberships_role | NULL
public.is_member   (check_org uuid) -> boolean
```

They read `organization_members` keyed on `auth.uid()`. They are **not**
exposed to clients directly.

## 3. Per-table policy matrix

`FORCE ROW LEVEL SECURITY` is enabled on every tenant-owned table, so RLS also
applies to the table owner. Summary:

| Table | SELECT | INSERT | UPDATE / DELETE | Notes |
|-------|--------|--------|-----------------|-------|
| `profiles` | own row (`user_id = auth.uid()`) | own row | own row only | auto-created by `handle_new_user()` trigger on `auth.users` |
| `organizations` | any member | any authenticated user (`created_by = auth.uid()`) | owner only (update/delete) | the tenant root |
| `organization_members` | any member | owner/admin | owner/admin | `last-owner` guard applies |
| `invitations` | any member | owner/admin | owner/admin | unique `(org, email)` |
| `subscriptions` | any member | owner/admin | owner/admin | Stripe mirror (webhooks run as `service_role`) |
| `entitlements` | any member | owner/admin | owner/admin |
| `usage_events` | any member | any member | **none** | append-only ledger |
| `ai_runs` | any member | any member | owner/admin |
| `audit_events` | member/self | member/self | **none** (app roles) | append-only; see §5 |
| `projects` | any member | any member | owner/admin or `owner_user_id` |

"owner/admin" means `member_role(organization_id) IN ('owner','admin')`.
Append-only tables intentionally define **no** UPDATE/DELETE policy for the
authenticated role, so mutations are blocked by RLS even though the role holds
base table grants.
## 4. Cross-tenant write protection

Every insert/update uses a `WITH CHECK` that resolves the target
`organization_id` against the actor's memberships, so a row can never be
written into an organization the actor does not belong to:

```sql
WITH CHECK ( is_member(organization_id) IS TRUE )          -- member-writable tables
WITH CHECK ( member_role(organization_id) IN ('owner','admin') )  -- manage-scoped tables
```

Because `member_role()` resolves the organization *on the row being written*,
attempting to set `organization_id` to another tenant's id is rejected.

### Last-owner guard

A trigger (`prevent_last_owner_removal`) prevents an owner from being removed or
demoted when they are the last `owner` of an organization. It honors the session
flag `app.bulk_teardown = 'on'` so that privileged/system flows (e.g. deleting
the organization itself, which cascades to memberships) are not blocked.

## 5. Append-only audit_events

`audit_events` is an append-only security log:

- `authenticated` may **INSERT** and **SELECT** only.
- No UPDATE/DELETE policy exists for `authenticated`, so logged rows cannot be
  tampered with or deleted by application users.
- `privilleged system operations` run under the Supabase `service_role`
  (BYPASSRLS). A dedicated `audit_events_service_all` policy also grants full
  access to `service_role`, which is how integrity-repair / reconciliation
  operations are permitted — the sole exception to append-only.

`usage_events` is likewise append-only (metering ledger).

## 6. Indexes

Indexes (created in migration `…_0000` and `…_0001`) support the common
tenant-isolated queries:

| Table | Indexes |
|-------|---------|
| `profiles` | `(created_at desc)` |
| `organizations` | `slug` unique; `created_by`; `(created_at desc)` |
| `organization_members` | unique `(org, user)`; `user_id`; `org` |
| `invitations` | unique `token_hash`; unique `(org, email)`; `org`; `email` |
| `subscriptions` | unique `organization_id`; `org`; `status` — plus unique `stripe_customer_id`, unique `stripe_subscription_id` (backing lookups) |
| `entitlements` | unique `organization_id` |
| `usage_events` | `(org, created_at desc)`; `user_id`; `event_type` |
| `ai_runs` | `(org, created_at desc)`; `user_id`; `status`; `model` |
| `audit_events` | `(org, created_at desc)`; `actor_id`; `action`; `(entity_type, entity_id)` |
| `projects` | unique `(org, slug)`; `org`; `owner_user_id`; `status` |

Stripe identifiers carry `CHECK` constraints (`cus_%`, `sub_%`) to reject
obviously invalid billing references at the database boundary.

## 7. Seed data — local development tenant

Migration `…_0003_seed_local_tenant.sql` seeds a development tenant
(`carter-athletics-demo`): an organization, an owner profile + membership, a
starter subscription (`cus_demo`/`sub_demo`), an entitlement (100 AI credits),
an invitation, and a sample project. It is idempotent (`ON CONFLICT DO
NOTHING`).

On a hosted Supabase project the demo *user identity* must be provisioned
through Supabase Auth (the `handle_new_user()` trigger then creates the
profile). Locally (plain Postgres + `bootstrap_local_auth.sql`) the identity is
created directly.

## 8. Automated tenant-isolation tests

`supabase/tests/tenant_isolation.sql` is a fail-red assertion suite
(`psql -v ON_ERROR_STOP=1`). It verifies:

1. User A sees **only** Org A rows.
2. User A **cannot read** an Org B row by primary key.
3. User A **cannot INSERT** into Org B (denied by RLS).
4. User A **cannot UPDATE/DELETE** Org B rows.
5. A `viewer` cannot elevate their own role or create an invitation.
6. `audit_events` is append-only for `authenticated` (INSERT ok, UPDATE/DELETE blocked).
7. `service_role` may perform privileged system operations on the log.

All run idempotently and pass against the migrated local database.

### Running the validation

```text
1. docker compose up -d                              # start blueprint-db (postgres:16 :5433)
2. psql -h localhost -p 5433 -U postgres -d blueprint -f supabase/tests/bootstrap_local_auth.sql
3. for each migration in supabase/migrations/*.sql:
       psql -h localhost -p 5433 -U postgres -d blueprint -v ON_ERROR_STOP=1 -f <migration>
4. psql -h localhost -p 5433 -U postgres -d blueprint  -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation.sql
```

`bootstrap_local_auth.sql` is **local-dev only** and must never be pushed to a
hosted Supabase project (it fabricates a minimal `auth` schema and roles so the
canonical migrations run on plain Postgres).