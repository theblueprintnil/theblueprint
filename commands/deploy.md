# /deploy — Deployment (Phase 7 of 8)

## Purpose

The engine owns this phase. Default behavior: if the Netlify CLI is on PATH it runs `netlify deploy --prod`; otherwise it falls back to `npm run build` as a pre-deploy check. Your job: prepare the host and iterate on failures.

## Instructions

1. Before triggering, make sure:
   - The project has a `netlify.toml` (or the host's equivalent) with the Next.js runtime plugin
   - Production `DATABASE_URL` and auth secrets are set in the host's environment variables
   - `.env.example` documents every variable with placeholder values
2. Run `vibe-loop next` to trigger the automated phase.
3. If it fails, iterate:
   - Build failing in prod mode: fix env-dependent code paths, re-run
   - Netlify CLI missing: install it (`npm i -g netlify-cli`) or accept the build-check fallback for now
   - Never disable the phase by editing state manually
4. After a real deploy, smoke-test the production URL.

## Checklist

- [ ] Environment variables set on the host
- [ ] Production database reachable
- [ ] Deployment succeeds and the site responds

## When done

Nothing to mark manually. The engine advances to e2e on success.

The next phase is e2e (automated, and the last of the iteration).
