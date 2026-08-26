# /local-test — Local Testing & Iteration (Phase 4 of 8)

## Purpose

The engine owns this phase and runs the configured command (default: `npm run build && npm run test`). Your job is the iteration half: when it fails, fix the project until it is green.

## Instructions

1. Run `vibe-loop next` to trigger the automated phase.
2. If it passes, stop. Do not advance the state yourself; the engine already did.
3. If it fails:
   - Read the command output the engine streamed
   - Diagnose the failure (build error, failing test, type error)
   - Fix the code, then re-run `vibe-loop next`
   - Repeat until green
4. Never edit `.vibe/state.json` by hand to work around a failure.

## Checklist

- [ ] Production build passes
- [ ] Unit tests pass
- [ ] Lint and typecheck clean

## When done

Nothing to mark manually. The engine advances to db-testing on success.

The next phase is db-testing (automated).
