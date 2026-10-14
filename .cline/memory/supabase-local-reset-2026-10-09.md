# Supabase local reset — 2026-10-09

## Windows port blocker (fixed permanently)

`supabase start` failed with `ports are not available ... 54322: bind: An attempt was made to access a socket in a way forbidden by its access permissions`. All default Supabase ports (54320–54332) were inside WinNAT dynamic exclusion ranges (Hyper-V grabs contiguous blocks like 53918–54517 after reboots; ranges shift each boot). Fix (elevated, script logged to `%TEMP%\winnat-fix.log`): `net stop winnat` → `netsh int ipv4 add excludedportrange protocol=tcp startport=54320 numberofports=16` → `net start winnat`. The administered exclusion `54320–54335` now persists across reboots, so the stack's ports are permanently reserved for Supabase.

## Migration repair

`supabase/migrations/20261009194021_init_nil_blueprint_schema.sql` (untracked, never successfully applied) was a botched concatenation: lines 1–1116 = canonical idempotent org-scoped squash (ends `commit;`), lines 1118–1237 = a raw RLS-less NIL marketplace draft (unguarded `CREATE TYPE deal_status` with different enum values, duplicate `profiles`/`deals`/`audit_events`, plus unique `user_role`, `athlete_profiles`, `brand_profiles`, `payout_transactions`, `compliance_logs`). Fresh-DB apply died at statement 277 (`type "deal_status" already exists`).

Resolution: truncated the migration to its first 1116 lines; the draft section is preserved verbatim at `docs/schema/nil-marketplace-schema-draft.sql` for future design work. Rationale: zero code references to the draft tables, and the draft violated the tenant-isolation/RLS guardrails (no org scoping, no policies, no `app_user` grants) — the canonical track per `phase2-m2.md` notes is the snake_case org-scoped schema.

## Validation

`npx supabase db reset` exit 0 on branch `feat/agent-system`; 9 migrations applied; 22 public tables; `deal_status` = draft,pending,active,completed,cancelled; no draft types/tables present. Stack healthy at 127.0.0.1:54321 (API) / 54322 (DB) / 54323 (Studio). Note: CLI uses `npx supabase db query -f file.sql` (no `db sql` subcommand in this version). No global `supabase/seed.sql` exists; seeding comes from `20260826000003_seed_local_tenant.sql`.
