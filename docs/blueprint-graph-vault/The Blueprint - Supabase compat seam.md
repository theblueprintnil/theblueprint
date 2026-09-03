# The Blueprint - Supabase compat seam

> entityType: architecture-layer

## Observations

- src/lib/supabase/{client,server,types,errors,rls}.ts wrap Prisma to present a Supabase-shaped API surface
- rls.ts re-exports withUser/withOrgContext from db.ts which run set_config-based scoping inside transactions
- Decision (user): keep Prisma now and wrap it in a supabase-shaped seam; future real-Supabase swap is isolated to this seam
- env.ts validates Supabase env vars as 'reserved' tier

## Relations

**Outgoing**

- `wraps` → [[The Blueprint - RLS security layer]]
- `wraps` → [[The Blueprint - Prisma data layer]]

**Incoming**

- `tests` ← [[The Blueprint - Vitest unit suite]]