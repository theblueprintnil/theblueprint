# Supabase SDK Integration — 2026-10-01

## Decision

Adopted an additive, minimal Supabase SDK integration for Storage and Realtime only. The Supabase dashboard wizard's Next.js instructions (`utils/supabase/*`, cookie session middleware, todos demo page) were deliberately rejected: `@supabase/ssr` exists for Supabase Auth sessions, which conflict with Clerk, and its PostgREST data path bypasses the GUC-based RLS context (`app.current_user_id` / `app.current_org_id` on `app_user`), so queries would return empty or denied rows.

## Changes

- `web/`: installed `@supabase/supabase-js` (dependencies only; `@supabase/ssr` intentionally not installed).
- New `web/src/lib/supabase/sdk.ts`: `createStorageBrowserClient()` (publishable key, `persistSession`/`autoRefreshToken`/`detectSessionInUrl` disabled) and `createServerSupabaseClient()` (`SUPABASE_SERVICE_ROLE_KEY`, server-only, for signed URLs). No code comments per house style.
- New `web/src/lib/__tests__/supabase-sdk.test.ts`: 5 unit tests (missing-env failures, client construction).
- Renamed `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `web/.env.example`, `web/src/lib/env.ts` ENV_SPECS, and the `web/README.md` environment table. No code consumed the old name.
- `web/.env` (gitignored): added `NEXT_PUBLIC_SUPABASE_URL=https://xtirahfgkjmsvasekpyu.supabase.co` and the publishable key. Project ref verified to match the `DATABASE_URL` pooler username before wiring.
- CHANGELOG entries under Unreleased (Added + Changed).

## Untouched on purpose

`src/middleware.ts` (Clerk), the Prisma facade in `src/lib/supabase/` (`client.ts`, `server.ts`, `rls.ts`, `errors.ts`, `types.ts`), Prisma schema/migrations, existing API routes.

## Validation

`tsc --noEmit` clean; vitest suite 175 passed / 8 skipped, including the 5 new tests.

## Follow-ups

- `SUPABASE_SERVICE_ROLE_KEY` is not yet set in `web/.env`; add it only when server-side signed URLs are first needed (server-only, never `NEXT_PUBLIC_*`).
- Storage buckets and their policies are uncreated; uploads/downloads for media kits are future work.
- `npx skills add supabase/agent-skills` hung with no output twice over 5 minutes and was killed; nothing was installed into `web/skills/`. Retry later or install manually if wanted.
- Changes are uncommitted; commit via the `/commit` convention.
