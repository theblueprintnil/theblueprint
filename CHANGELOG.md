# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/).

## [Unreleased] — 2026-09-22

### Added

- Vercel-via-GitHub deployment readiness (ADR-0008): root `README.md`, this changelog,
  and `docs/notes/` (relocated the Clerk setup prompt out of the repo root).
- `AGENT_INTERNAL_JWT_KEY` inline PEM support in `web/src/lib/agent/agent-jwt.ts` so the
  web→engine signing key can be supplied as a Vercel env var; unit test coverage added.

### Changed

- `web/package.json`: pinned `engines.node` to `22.x`; added `postinstall: prisma generate`
  so client generation is explicit on Vercel builds.
- `docs/GO-LIVE.md` Phases 3–4 rewritten for GitHub-connected Vercel projects (Root
  Directory `web/` / `agent-engine/`) and the current JWT-only engine auth — the removed
  `AGENT_API_TOKEN`/`AGENT_SERVICE_TOKEN` pairing is no longer referenced.
- `web/.env.example` documents the two key-source options for agent JWT signing.

## [0.1.0] — 2026-09

### Added

- Clerk authentication: `/login` + `/signup` routes, `clerkMiddleware` protecting
  `/app/*`, `/dashboard/*`, `/admin/*`, and signed-in nav controls (`feat(auth)`).
- A2A agent lifecycle: hash-chained audit ledger, JWT-only agent ingress with JWKS /
  pinned-PEM verification, scoped agent identity (`docs/adr/0002`).
- Baseline formatting across `web/` via Prettier.

[Unreleased]: https://github.com/sroe001/The-Blueprint/compare/main...HEAD
[0.1.0]: https://github.com/sroe001/The-Blueprint/releases/tag/v0.1.0