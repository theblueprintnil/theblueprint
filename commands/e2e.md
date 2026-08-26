# /e2e — E2E Tests, Misc Designs, Landing Page (Phase 8 of 8)

## Purpose

The engine runs the E2E suite (default: `npx playwright test`). You own the two things bundled with it in the original design: misc design polish and the landing page. Then the loop closes.

## Instructions

1. Make sure the E2E suite covers the critical flows: register, login, dashboard loads with real widget data, logout.
2. Run `vibe-loop next` to trigger the automated phase.
3. If tests fail, fix the app or the tests, then re-run `vibe-loop next` until green.
4. Polish the misc designs:
   - Landing page at `/` matches the iteration's design brief
   - Styled 404 page
   - Consistent spacing, typography, and states across screens
5. When the phase passes, the iteration is complete. Offer the loop-back to the user:

```
vibe-loop reset
```

That increments the iteration and returns the loop to inspiration with everything you learned this round.

## Checklist

- [ ] Playwright E2E suite green
- [ ] Landing page polished
- [ ] Misc design cleanups done
