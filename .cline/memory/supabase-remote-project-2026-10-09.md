# Supabase Remote Project Switch — 2026-10-09

## Current remote database

- Project: **supabase-the-blueprint**, ref **`ntbtiqznrkxgdoxtrswc`**, region East US (North Virginia)
- Org: `vercel_icfg_g90DQx8ehusri3QzZ8XFDj3V` (account reached via a personal access token; NOT the keyring browser-login account, which owns 3 unrelated projects)
- URL: `https://ntbtiqznrkxgdoxtrswc.supabase.co`
- Publishable key: `sb_publishable_n-HSoHsf0iV92wVrFWMz9Q_HFbeO2k5`
- All 9 migrations in `supabase/migrations` applied 2026-10-09 via `npx supabase db push --yes` and verified with `migration list --linked` (Local = Remote on all rows)

## History

- Old ref `xtirahfgkjmsvasekpyu` no longer exists under any accessible account; env files previously pointed at it. All runtime env files (`web/.env`, `web/.env.local`, `agent-engine/.env`) were repointed to the new ref on 2026-10-09.
- `DEPLOYMENT-PREVIEW.md` still contains the OLD project's URL/DB password in plaintext (docs only, not runtime) — do not copy values from it.

## Gotchas discovered

- `npx supabase db push` prompts `[Y/n]` for confirmation even in a seemingly non-interactive shell; without `--yes` it can hang invisibly. Always use `supabase db push --yes` from Cline.
- CLI token lives in Windows Credential Manager, not `~/.supabase/access-token`; `supabase logout` from Cline's shell hangs. Use `SUPABASE_ACCESS_TOKEN` env var per-command when needed.
- `db-setup.cmd` at repo root is STALE: points at renamed folder `The Blueprint - NIL Athlete Promotion Site` and runs `prisma db push --force-reset`, which would DROP the migrated schema. Do not run it.

## Still open after the switch

- `app_user` / `app_agent` roles: CREATED and VERIFIED 2026-10-09 on the fresh DB. Created via the Supabase Management API SQL endpoint (`POST https://api.supabase.com/v1/projects/ntbtiqznrkxgdoxtrswc/database/query`, Bearer PAT, body `{"query": "<sql>"}` — same channel as the dashboard SQL editor) because the postgres password kept failing. Both roles login with `APP_DB_PASSWORD` (the existing `Bp_Prev_2026_xK9mQ7wL3nR8tY4pV` from `web/.env`) — verified with a node `pg` script through `aws-0-us-east-1.pooler.supabase.com:6543` as `app_user.<ref>` and `app_agent.<ref>`, so `DATABASE_URL_APP` and `AGENT_DATABASE_URL` in the env files work as-is.
- Connection strings in env files still carry the old project's passwords (`qLgRnaZEN41r1wWT` for postgres role, `Bp_Prev_2026_...` for app roles) — replace with the new project's DB password if it differs.
- Direct host `db.ntbtiqznrkxgdoxtrswc.supabase.co:5432` is UNREACHABLE from this workstation (P1001 — IPv6-only direct endpoint); the session-mode pooler `aws-0-us-east-1.pooler.supabase.com:5432` (username `postgres.<ref>`) is the DDL-capable substitute. The transaction pooler (6543) rejects `CREATE ROLE`/DDL.
- The OLD project's postgres password (`qLgRnaZEN41r1wWT`) is NOT valid on the new project; user-provided values `HluK0PI0bvxtIQto` and `t7dZAzffdgDmf1Rh` were ALSO rejected (raw pg driver, both pooler ports) — dashboard resets are evidently landing on a different project/account (verify the URL contains `ntbtiqznrkxgdoxtrswc` when resetting). Rotation via Management API is IMPOSSIBLE: password endpoints 404; `ALTER ROLE postgres PASSWORD` via SQL endpoint fails `42501: only superusers can alter privileged roles`.
- WORKAROUND deployed 2026-10-09: role **`blueprint_admin`** created via the Management API SQL channel (strong generated password, stored ONLY in the env files), granted ALL on all tables/sequences/functions in `public` + schema USAGE/CREATE + postgres default privileges for future objects. Both privileged `DATABASE_URL`s wired to it and VERIFIED connecting from the exact env-file strings: `web/.env` → `blueprint_admin.<ref>@aws-0-us-east-1.pooler.supabase.com:6543` (txn pooler, pgbouncer=true), `agent-engine/.env` → `...:5432` (session pooler). To revert to the standard `postgres` role once a real password exists: fix the two env lines and optionally drop `blueprint_admin`. Future `supabase db push` is unaffected (CLI uses the access token, not the DB password).
- `npx prisma db execute` HANGS indefinitely on this workstation once past auth against the pooler (both `--stdin` and `--file`, session and transaction modes). Use a node `pg` one-liner instead (`pg` installed into `web/node_modules` with `--no-save --no-package-lock`). Management API `database/query` is the no-password alternative for privileged SQL.
- Remote schema is snake_case (migrations: `organizations`, `organization_members`, `ai_runs`, `agent_registrations`, ...) with its own RLS policies; `web/prisma/rls.sql` targets CamelCase Prisma tables that DO NOT exist remotely → `npm run db:rls` fails there on the first grant. Roles on the remote must be created via SQL directly (documented in GO-LIVE.md Phase 2 compatibility note).
