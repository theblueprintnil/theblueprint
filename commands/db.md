# /db — DB Testing & Iteration (Phase 5 of 8)

## Purpose

The engine owns this phase and runs the configured command (default: `docker compose up -d && npx prisma migrate dev && npx prisma db seed`). Your job: make the data layer solid and iterate on failures.

## Instructions

1. Run `vibe-loop next` to trigger the automated phase.
2. If it passes, stop — the engine advanced the loop.
3. If it fails, iterate:
   - Postgres not starting: check `docker compose config`, ports, and existing volumes
   - Migration failing: inspect the Prisma schema and migration SQL; fix, re-run
   - Seed failing: fix seed data or script
   - Then re-run `vibe-loop next`
4. Add or update DB integration tests so the schema change is covered before you move on.
5. Never edit `.vibe/state.json` by hand to work around a failure.

## Checklist

- [ ] Local Postgres running (docker compose)
- [ ] Migrations apply cleanly
- [ ] Seed data loads
- [ ] DB integration tests pass

## When done

Nothing to mark manually. The engine advances to authentication on success.

The next phase is authentication (interactive).
