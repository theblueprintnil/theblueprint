# Vercel-via-GitHub prep — 2026-09-22

- main = e330301 `chore(deploy): prepare for Vercel deployment via GitHub` (feat/clerk-authentication-setup ff-merged, both branches pushed).
- `web/package.json`: `engines.node` pinned `22.x`; `postinstall: prisma generate` added (Vercel builds generate the Prisma client explicitly).
- `web/src/lib/agent/agent-jwt.ts`: signing key now resolves from inline `AGENT_INTERNAL_JWT_KEY` env var first, file path `AGENT_INTERNAL_JWT_KEY_PATH` second — serverless cannot mount key files; unit test covers the inline path. GO-LIVE.md/web README env lists updated (stale `AGENT_API_TOKEN`/`AGENT_SERVICE_TOKEN` references removed — engine is JWT-only since M2).
- `web/.prettierignore` excludes `.agents/` + `skills/` (vendored Clerk skill content was the only format:check failure source).
- ADR-0008 records the topology: two GitHub-connected Vercel projects, Root Directory `web/` and `agent-engine/`, production branch `main`.
- Gates all green from `web/`: format:check, lint, typecheck, vitest 170 passed/8 skipped, `next build` (41 routes, Turbopack).
- Local-only notes: `prisma generate` can hit EPERM on the query engine DLL while a dev server runs (Windows lock; harmless on Vercel); Next 16 prints the `middleware`→`proxy` deprecation warning — codemod deferred, still functional.
- Next human steps: Vercel import (Root Directory `web/`), set env vars BEFORE first deploy (critical tier fails the build), Supabase cloud + schema bootstrap per GO-LIVE Phases 1–2.
