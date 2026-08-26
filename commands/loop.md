# /loop — The Major Vibe Coding Design Loop

## Purpose

Coordinate the full loop across all eight phases. You (the agent) handle the interactive phases; the `vibe-loop` engine automates the rest and tracks state in `.vibe/state.json`.

## The loop

```
inspiration -> animate* -> main-functionality -> local-testing
     ^                                                |
     |                                                v
     +-- e2e <-- deployment <-- authentication <-- db-testing

* animate is optional (dashed in the original design); skip with "vibe-loop skip"
```

Narrative: *We start with an inspiration design; build main functionality; test it locally; push to DB; authenticate; deploy; and finally run E2E tests.* Then the loop closes and the next iteration begins.

## Engine commands

| Command | Role |
| --- | --- |
| `vibe-loop init` | Write config, state file, and copy this command pack into a project |
| `vibe-loop status` | Show phase markers, current phase, and checklists |
| `vibe-loop next` | Run the current phase (automated) or print the agent handoff (interactive) |
| `vibe-loop loop` | Auto-run consecutive automated phases until the next gate |
| `vibe-loop done <phase>` | Mark an interactive phase complete (called after you finish it) |
| `vibe-loop skip` | Skip the current phase, only if optional |
| `vibe-loop reset` | Close a finished iteration; loop back to inspiration (iteration + 1) |
| `vibe-loop run <phase>` | Re-run any phase's command directly |
| `vibe-loop config` | Print the effective merged config |

## Phase ownership

| Phase | Type | Who acts |
| --- | --- | --- |
| inspiration | interactive | Agent (`/inspire`), then `vibe-loop done inspiration` |
| animate | interactive, optional | Agent (`/animate`), `vibe-loop done animate` or `vibe-loop skip` |
| main-functionality | interactive | Agent (`/build`), then `vibe-loop done main-functionality` |
| local-testing | automated | Engine (`npm run build && npm run test` by default) |
| db-testing | automated | Engine (`docker compose up -d && npx prisma migrate dev && npx prisma db seed` by default) |
| authentication | interactive | Agent (`/auth`), then `vibe-loop done authentication` |
| deployment | automated | Engine (`netlify deploy --prod`, build-check fallback) |
| e2e | automated | Engine (`npx playwright test` by default) |

## Standing instructions

1. Always check state first: run `vibe-loop status`.
2. Never skip a required phase or run phases out of order; the engine enforces this.
3. When an automated phase fails, diagnose and fix the project, then re-run `vibe-loop next`.
4. After e2e passes, the iteration is complete. Offer the loop-back: `vibe-loop reset`.
5. Keep `.vibe/` out of version control.
