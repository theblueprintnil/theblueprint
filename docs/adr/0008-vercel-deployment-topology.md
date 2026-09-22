# ADR-0008 — Vercel deployment topology via GitHub

- **Status**: Accepted
- **Date**: 2026-09-22
- **Deciders**: Project owner (with Cline as implementing agent)
- **Affects**: repo root (`README.md`, `CHANGELOG.md`), `web/package.json`, `web/src/lib/agent/agent-jwt.ts`, `web/.env.example`, `docs/GO-LIVE.md`, `agent-engine/` deployment config

## Context

The repository contains two independently deployable units — `web/` (Next.js 16) and
`agent-engine/` (Python gateway + queue worker) — under a root that also holds a stub
`package.json`, docs, and design assets. `docs/GO-LIVE.md` already targets Vercel but
described CLI (`vc deploy`) pushes and a shared-secret web→engine pairing
(`AGENT_SERVICE_TOKEN`/`AGENT_API_TOKEN`) that no longer exists: M2 closed gap G1 with
JWT-only ingress (`agent_engine/api.py` verifies RS256 tokens via `AGENT_JWKS_PATH` or
`AGENT_PINNED_PEM_DIR`; `verify_shared_secret` was deleted). Separately, serverless
runttimes cannot mount arbitrary key files, while `agent-jwt.ts` read its signing key from
`AGENT_INTERNAL_JWT_KEY_PATH` (a workstation path), and Vercel builds of `web/` require the
critical env tier (`src/lib/env.ts`) to be present because prerendering imports `db.ts`.

## Decision

Deploy both units to Vercel as GitHub-connected projects from this single repository:
two Vercel projects importing the same repo, Root Directory `web/` and `agent-engine/`
respectively, Production branch `main`, automatic deploys on push and Preview deployments
for pull requests. Pin Node `22.x` in `web/package.json` `engines` and run
`prisma generate` via `postinstall` so client generation does not depend on Vercel
zero-config detection. Web-side agent JWT signing resolves its private key from the
inline `AGENT_INTERNAL_JWT_KEY` env var first, falling back to
`AGENT_INTERNAL_JWT_KEY_PATH`; exactly one source must be set. Engine-side verification
material is public key data and may be committed to the repo or supplied via env — never
a private key.

## Consequences

### Positive

- One repository, one push, two immutable production deploys; previews per PR.
- Builds fail fast with a readable error when the critical env tier is missing, instead
  of failing at runtime.
- Private key material travels only through encrypted env storage; public key material
  is safe to commit.
- Deterministic Node 22 runtime matching local development.

### Negative / accepted trade-offs

- Two Vercel projects to keep configured in parallel (env vars must be mirrored into
  both Production and Preview of each).
- The Vercel root-directory setting is dashboard state outside version control; a fresh
  import must re-apply it (documented in `docs/GO-LIVE.md` and the root `README.md`).
- Inline PEM env vars need escaping care when pasted into the Vercel dashboard
  (newlines must survive).

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Single Vercel project at repo root | Root `package.json` is a stub; Next.js lives in `web/` and the Python service needs its own build — separate Root Directories are the supported monorepo pattern. |
| Separate repositories per unit | Splits atomic cross-unit changes (JWT contract, audit ledger) that currently ship in one commit. |
| `vc deploy` CLI pushes (previous GO-LIVE wording) | Bypasses GitHub as the source of truth and loses PR-gated preview deploys. |
| Committed private key file for web signing | Private keys never belong in version control. |
| Relying on Vercel's zero-config Prisma detection | Undocumented coupling; `postinstall` is the Prisma-supported path. |

## Swap point

The Vercel Root Directory + Production branch settings per project, and the env var names
`AGENT_INTERNAL_JWT_KEY` / `AGENT_INTERNAL_JWT_KEY_PATH` in
`web/src/lib/agent/agent-jwt.ts` — the resolver accepts either source without touching
callers, and the topology can move to another platform by re-pointing these.

## References

- `docs/GO-LIVE.md` — dependency-ordered launch checklist (Phases 3–4 updated for this ADR)
- `web/src/lib/agent/agent-jwt.ts` / `agent-jwt.test.ts` — signing-key resolution and coverage
- `agent-engine/agent_engine/{api,identity,config}.py` — JWT-only ingress implementation
- `docs/adr/0002-agent-identity-scoped-jwt.md` — the agent identity model this deploys
- `web/src/lib/env.ts` — critical/reserved env tiers enforced at startup