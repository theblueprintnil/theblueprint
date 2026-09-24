# Vercel-via-GitHub prep — 2026-09-22

- main = e330301 `chore(deploy): prepare for Vercel deployment via GitHub` (feat/clerk-authentication-setup ff-merged, both branches pushed).
- `web/package.json`: `engines.node` pinned `22.x`; `postinstall: prisma generate` added (Vercel builds generate the Prisma client explicitly).
- `web/src/lib/agent/agent-jwt.ts`: signing key now resolves from inline `AGENT_INTERNAL_JWT_KEY` env var first, file path `AGENT_INTERNAL_JWT_KEY_PATH` second — serverless cannot mount key files; unit test covers the inline path. GO-LIVE.md/web README env lists updated (stale `AGENT_API_TOKEN`/`AGENT_SERVICE_TOKEN` references removed — engine is JWT-only since M2).
- `web/.prettierignore` excludes `.agents/` + `skills/` (vendored Clerk skill content was the only format:check failure source).
- ADR-0008 records the topology: two GitHub-connected Vercel projects, Root Directory `web/` and `agent-engine/`, production branch `main`.
- Gates all green from `web/`: format:check, lint, typecheck, vitest 170 passed/8 skipped, `next build` (41 routes, Turbopack).
- Local-only notes: `prisma generate` can hit EPERM on the query engine DLL while a dev server runs (Windows lock; harmless on Vercel); Next 16 prints the `middleware`→`proxy` deprecation warning — codemod deferred, still functional.
- Next human steps: Vercel import (Root Directory `web/`), set env vars BEFORE first deploy (critical tier fails the build), Supabase cloud + schema bootstrap per GO-LIVE Phases 1–2.

## 2026-09-23 — First preview deploy (CLI, no dashboard import yet)

- Vercel project **`blueprint-web`** created via `vercel project add` + `vercel link` from `web/` (team `sroe001-gmailcoms-projects`). NOT GitHub-connected yet (deliberate: no Production env vars, so git auto-builds would fail; `vercel git connect` comes with GO-LIVE Phase 4).
- Preview env seeded (10 vars) from local `web/.env`: 4 Sensitive (DATABASE_URL, DATABASE_URL_APP, APP_DB_PASSWORD, CLERK_SECRET_KEY — all localhost/dev-tier values) + 6 Config visibility (all `NEXT_PUBLIC_*` incl. `NEXT_PUBLIC_APP_URL=https://blueprint-web-sroe001-gmailcoms-projects.vercel.app`). DB pages will 500 at runtime until Supabase swap (GO-LIVE Phases 1–2); rotate the seeded DB creds at that point.
- **Preview URL**: https://blueprint-pjw48xfkc-sroe001-gmailcoms-projects.vercel.app — deployment READY, but **Vercel Deployment Protection (SSO)** is on by default: anonymous visitors hit vercel.com login; owner passes through logged-in. Disable per-project in dashboard for shareable links.
- Pull artifacts: `web/.env.production.local` (gitignored) — real values for Config vars, `[SENSITIVE]` masks for Sensitive ones (CLI never materializes sensitive values locally; runtime injection happens server-side regardless).
- **Commit `39a4492`** `fix(web): declare optional AI SDK deps for clean CI installs`: `openai` + `@anthropic-ai/sdk` as `optionalDependencies` (lazy-imported by provider adapters, doc-comment intent preserved). They had been phantom deps resolving only via parent-dir `node_modules` — local builds/typechecks passed while Vercel's clean install failed TS2307. CHANGELOG updated.
- Local gates rerun green post-fix: `npm install`, `typecheck`, `next build` (41 routes) — all with the pulled preview env.

### Gotchas (Vercel CLI 59.5.0, Windows)

- `vercel env add NAME preview` with value piped via stdin **silently no-ops**: the `? Git branch?` prompt eats EOF and exits 0 without creating anything. Always verify with `vercel env ls preview`; exit codes lie. Working form: `vercel env add NAME preview --value <v> --yes --force`.
- `NEXT_PUBLIC_*` vars reject Sensitive type on Preview — must pass `--no-sensitive --visibility config`.
- `vercel deploy --yes` WITHOUT an explicit target deploys **production** (no git context) — use `--target=preview` for previews.
- CLI's link step appends `.vercel` + `.env*` to `web/.gitignore` — the trailing `.env*` re-ignores `.env.example` (last-match-wins); reverted.
- `vercel env ls` value column shows an encoded envelope (`eyJ2...`), not raw values — don't read anything into it.
- Deploy/build logs are UTF-16LE when PowerShell-redirected (`*> file`); the "Worker timed out / EPIPE" update-checker noise is benign.
