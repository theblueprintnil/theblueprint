# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/).

## [Unreleased] — 2026-09-30

### Added

- Minimal Supabase SDK integration for storage and realtime only: `@supabase/supabase-js` added to `web/`, with browser (publishable key) and server (service-role key) client factories in `web/src/lib/supabase/sdk.ts` and unit tests in `web/src/lib/__tests__/supabase-sdk.test.ts`. Relational data still flows through the Prisma facade and Clerk remains the sole auth provider.
- A2A Go-Live Governance and staged major-track release gate applied to `docs/GO-LIVE.md` and `docs/adr/0002-agent-identity-scoped-jwt.md`. The product launch now independently strictly gates internal web-to-engine JWT auth separately from external A2A ingress.

### Changed

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` renamed to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` across `web/.env.example`, `web/src/lib/env.ts`, and the `web/README.md` environment table to match current Supabase key naming.
- Documentation reconciled for A2A deployment governance (JWT-only engine auth across architecture documentation, ADRs, and protocols; no shared-secret static token fallback).
- Vercel-via-GitHub deployment readiness (ADR-0008): root `README.md`, this changelog,
  and `docs/notes/` (relocated the Clerk setup prompt out of the repo root).
- `AGENT_INTERNAL_JWT_KEY` inline PEM support in `web/src/lib/agent/agent-jwt.ts` so the
  web→engine signing key can be supplied as a Vercel env var; unit test coverage added.
- `keys/internal-web.public.pem` committed so agent-engine can verify web→engine JWTs via
  `AGENT_PINNED_PEM_DIR`; private keys stay out of the repository.
- First Vercel preview deployment of `web` (CLI-created project `blueprint-web`, not yet
  git-connected); deployment session recorded in `.cline/memory/`.

### Changed

- `web/package.json`: pinned `engines.node` to `22.x`; added `postinstall: prisma generate`
  so client generation is explicit on Vercel builds.
- `docs/GO-LIVE.md` Phases 3–4 rewritten for GitHub-connected Vercel projects (Root
  Directory `web/` / `agent-engine/`) and the current JWT-only engine auth — the removed
  `AGENT_API_TOKEN`/`AGENT_SERVICE_TOKEN` pairing is no longer referenced.
- `web/.env.example` documents the two key-source options for agent JWT signing.
- `.gitignore`: excludes private JWT keys (`keys/*.private.pem`) and the local-only Vercel
  deploy notes that hold live credentials.

### Fixed

- `web/package.json`: declared the lazily-imported AI SDKs (`openai`, `@anthropic-ai/sdk`) as
  `optionalDependencies` — they previously resolved only via a parent-directory `node_modules`
  on the workstation, failing Vercel's clean-install typecheck with TS2307.
- `web/scripts/preflight.ts` now treats `agent-engine/.env` as authoritative: Prisma's automatic `.env` loading injects the web pooled `DATABASE_URL` into `process.env`, which silently overrode the engine direct connection string during preflight and produced a false pooler failure.

## [0.1.0] — 2026-09

### Added

- Clerk authentication: `/login` + `/signup` routes, `clerkMiddleware` protecting
  `/app/*`, `/dashboard/*`, `/admin/*`, and signed-in nav controls (`feat(auth)`).
- A2A agent lifecycle: hash-chained audit ledger, JWT-only agent ingress with JWKS /
  pinned-PEM verification, scoped agent identity (`docs/adr/0002`).
- Baseline formatting across `web/` via Prettier.

[Unreleased]: https://github.com/sroe001/The-Blueprint/compare/main...HEAD
[0.1.0]: https://github.com/sroe001/The-Blueprint/releases/tag/v0.1.0