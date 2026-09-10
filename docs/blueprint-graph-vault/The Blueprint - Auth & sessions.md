# The Blueprint - Auth & sessions

> entityType: domain-module

## Observations

- Clerk is the active auth path (`@clerk/nextjs ^7.8.2`). `/login` renders `<SignIn />` and `/signup` renders `<SignUp />` under the `(auth)` route group; the legacy `/register`, `/sign-in`, `/sign-up` routes and the bcrypt `/api/auth/*` routes were removed.
- `getSessionUser()` (src/lib/session.ts) bridges Clerk to the Prisma `User` row by email, creating the row on demand (`passwordHash` is a placeholder; legacy `Session`/token utilities were removed).
- middleware.ts uses `clerkMiddleware` with `createRouteMatcher` to protect `/app/*`, `/dashboard/*`, and `/admin/*`; unauthenticated requests are hard-redirected to `/login?next=<path>`. The `/admin/*` layout additionally enforces the `ADMIN` role via `getSessionUser()`.
- The Prisma `User.passwordHash` and `Session` models remain in the schema (no migration) but are no longer used by the active auth path.
- Deployment contract 2026-09-10: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY are critical-tier EnvVarSpecs in src/lib/env.ts (fail-fast at boot), documented in web/.env.example and web/README.md

## Relations

**Outgoing**

- `relies-on` → [[The Blueprint - RBAC permissions]]
- `persists-in` → [[The Blueprint - Prisma data layer]]

**Incoming**

- `hosts` ← [[The Blueprint - Next.js web app]]