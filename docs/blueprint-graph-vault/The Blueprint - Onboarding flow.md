# The Blueprint - Onboarding flow

> entityType: domain-module

## Observations

- src/lib/onboarding.ts: validateOnboardingInput enforces org name 2-60 chars, slugFromName requires alphanumerics, workspaceType required
- WORKSPACE_TYPES: ATHLETE_STUDIO, AGENCY_WORKSPACE, GUARDIAN_PORTAL
- /onboarding page with onboarding-form.tsx; org creation wires OWNER membership plus a seeded demo entitlement
- Playwright spec e2e/onboarding.spec.ts covers register -> onboarding flow

## Relations

**Outgoing**

- `creates` → [[The Blueprint - Multi-tenancy model]]

**Incoming**

- `tests` ← [[The Blueprint - Playwright E2E]]