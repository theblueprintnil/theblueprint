# The Blueprint - Docker Postgres

> entityType: infrastructure

## Observations

- Root docker-compose.yml: postgres:16-alpine, container blueprint-db, host port 5433:5432, named volume postgres_data
- supabase/migrations mirror the Prisma data model plus RLS for parity: 20260826 tenant core/metering/policies/seed, 20260827 ai runs orchestration

## Relations

**Outgoing**

- none

**Incoming**

- `contains` ← [[The Blueprint - NIL Athlete Promotion Site]]
- `runs-on` ← [[The Blueprint - Supabase SQL foundation]]