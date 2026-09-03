# The Blueprint - RLS security layer

> entityType: data-layer

## Observations

- prisma/rls.sql: GRANTs, FORCE RLS, and tenant-scoped policies via SECURITY DEFINER helper app_user_role_in(text)
- scripts/apply-rls.ts strips comments then splits on ';' so function bodies must contain no internal semicolons or the statement is silently dropped
- app_user role is created/refreshed with APP_DB_PASSWORD on each db:rls run; policies fail closed without identity
- Gotchas: direct EXISTS self-references to Membership/Organization trigger 42P17 (RLS recursion); DROP FUNCTION requires CASCADE for idempotent re-runs (2BP01)
- Two-client split in src/lib/db.ts: prismaAuth (privileged DATABASE_URL) for auth/management writes vs prismaApp (RLS-scoped DATABASE_URL_APP app_user); withUser/withOrgContext run set_config('app.current_user_id'/'app.current_org_id') inside a transaction so RLS policies resolve identity per query

## Relations

**Outgoing**

- none

**Incoming**

- `tests` ← [[The Blueprint - Vitest unit suite]]
- `wraps` ← [[The Blueprint - Supabase compat seam]]
- `protected-by` ← [[The Blueprint - Prisma data layer]]