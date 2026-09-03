# The Blueprint - Supabase SQL foundation

> entityType: data-layer

## Observations

- Phase-2 canonical tenant-isolation schema in supabase/migrations/ (20260826 tenant core, metering+audit, RLS policies, seed local tenant; 20260827 ai_runs orchestration) - camelCase tables (profiles, organizations, organization_members, invitations, subscriptions, entitlements, usage_events, ai_runs, audit_events, projects), identity via auth.uid()
- All tenant-owned tables are FORCE RLS with WITH CHECK binding organization_id to a member org; policies are backed by SECURITY DEFINER helpers public.member_role(check_org uuid) and public.is_member(check_org uuid), never exposed client-side
- supabase/tests/tenant_isolation.sql is a fail-red psql suite (ON_ERROR_STOP=1): cross-tenant SELECT/INSERT/UPDATE/DELETE denied, viewer cannot self-elevate or invite, audit_events append-only except service_role
- bootstrap_local_auth.sql is local-dev only (never on hosted Supabase); demo tenant carter-athletics-demo seeded idempotently with owner, starter sub (cus_demo/sub_demo), 100 AI credits entitlement

## Relations

**Outgoing**

- `runs-on` → [[The Blueprint - Docker Postgres]]

**Incoming**

- `specifies` ← [[The Blueprint - Two-Sided NIL Platform]]
- `persists-in` ← [[The Blueprint - Multi-tenancy model]]