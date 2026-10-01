# Vercel readiness session — 2026-10-01

## Outcome

- `npm run preflight` reports zero FAIL (9 pass, 3 warn, 1 skip) for the dev environment — GO-LIVE Phase 0 restored.
- Full gates green from `web/`: typecheck 0, lint 0, vitest 176 passed / 8 skipped (new preflight test included), `next build` 41 routes.

## Root causes fixed

1. `web/scripts/preflight.ts` treated `process.env` as an override for `agent-engine/.env`. Prisma Client auto-loads `web/.env` into `process.env` at import, so the web pooled `DATABASE_URL` silently replaced the engine's direct string and forced a false pooler FAIL. The engine env is now file-authoritative (`parseEnvFile` directly).
2. `web/src/lib/preflight.ts` `checkAppConnectionPairing` only accepted the literal `app_user` username. It now also accepts the Supavisor project-suffixed form `app_user.<ref>` (unit test added). Live `--connect` proved the suffixed login maps to role `app_user`.
3. `web/.env` `DATABASE_URL_APP` switched to `app_user.xtirahfgkjmsvasekpyu@…pooler…:6543` — plain `app_user` cannot route through the shared regional pooler; this also unblocks `checkEngineDbShared` ref resolution (the test fixtures already encoded this shape).
4. `agent-engine/.env` `DATABASE_URL` switched to the direct string `db.xtirahfgkjmsvasekpyu.supabase.co:5432` (username `postgres`); stale `AGENT_API_TOKEN` removed from both envs — engine is JWT-only since M2 and the go-live gate requires the static tokens absent.

## Caveats

- `preflight --connect` engine check fails from this workstation: Supabase direct connections are IPv6-only and this network lacks IPv6 egress. Vercel functions have IPv6; the config is correct for deployment.
- The `AGENT_SERVICE_TOKEN` pairing check now reports WARN with pre-M2 wording; the `--probe` JWT check supersedes it once the engine is deployed.
- Known deferred warnings: turbopack workspace-root inference (root `package-lock.json`), `middleware`→`proxy` deprecation codemod.

## Commits

- `docs(a2a): record permanent static-token removal and staged release gates`
- `fix(web): keep agent-engine env authoritative and accept Supavisor app_user usernames in preflight`
- `feat(web): add Supabase SDK clients for storage and realtime`
- `chore: record Vercel readiness session in project memory`

## Remaining before production deploy (GO-LIVE)

Phases 3–7: deploy agent-engine to Vercel, git-connect `blueprint-web` with Production env vars, Clerk/Stripe production keys, smoke tests, and M2 gate evidence in `docs/a2a/LAYER-STATUS.md`.
