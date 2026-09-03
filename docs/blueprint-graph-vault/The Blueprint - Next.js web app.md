# The Blueprint - Next.js web app

> entityType: architecture-layer

## Observations

- Next 16.3.1 App Router; TypeScript strict, eslint-config-next, prettier, Tailwind v4
- Route structure under src/app: public landing, /login, /register, /onboarding, and /app/* org-scoped area
- middleware.ts matcher /app/:path* redirects to /login?next= when blueprint_session cookie is missing
- Scripts: dev/build/lint/typecheck/test(vitest)/e2e(playwright)/db:rls via tsx scripts/apply-rls.ts

## Relations

**Outgoing**

- `hosts` → [[The Blueprint - Org-scoped app routes]]
- `hosts` → [[The Blueprint - API routes]]
- `hosts` → [[The Blueprint - Auth & sessions]]
- `uses` → [[The Blueprint - Prisma data layer]]

**Incoming**

- `contains` ← [[The Blueprint - NIL Athlete Promotion Site]]
- `realized-in` ← [[The Blueprint - Two-Sided NIL Platform]]
- `runs-on` ← [[The Blueprint - Playwright E2E]]