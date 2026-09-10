# The Blueprint - Playwright E2E

> entityType: testing

## Observations

- playwright.config.ts with e2e/onboarding.spec.ts registered as npm run e2e
- e2e/onboarding.spec.ts (3 tests): /signup renders the Clerk registration form, /login renders the Clerk sign-in form, and unauthenticated visits to /app/dashboard redirect to /login?next=%2Fapp%2Fdashboard

## Relations

**Outgoing**

- `tests` → [[The Blueprint - Onboarding flow]]
- `runs-on` → [[The Blueprint - Next.js web app]]

**Incoming**

- none