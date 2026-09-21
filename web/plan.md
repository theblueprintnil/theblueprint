# Plan — Blueprint Pages (19-route build from spec)

## Goals

- Port the web-design design system (brand tokens, gradients, fonts, Logo/PageHero/CtaBand/LegalDocument components).
- Build the 19 pages from the spec as new top-level routes alongside existing /app/*.
- Consolidate auth on Clerk: /login + /signup render Clerk components; remove /register, /sign-in, /sign-up.
- Protect /dashboard/* and /admin/* via clerkMiddleware; enforce ADMIN role on /admin/*.
- Static pages with realistic mock/demo data (no DB wiring this pass).

## Status — COMPLETE

1. ✅ Design system port (globals.css, layout.tsx fonts, src/components/brand/*).
2. ✅ (marketing) group: / , /about, /brands, /privacy, /terms, /nil-compliance + shared layout.
3. ✅ (marketplace) group: /athletes, /athletes/[username].
4. ✅ Auth consolidation: (auth)/login, (auth)/signup with Clerk; old auth routes removed; getSessionUser bridges Clerk->Prisma; middleware rewritten (clerkMiddleware).
5. ✅ Athlete dashboard: dashboard/athlete/{overview, profile/edit, deals, earnings}.
6. ✅ Brand dashboard: dashboard/brand/{overview, campaigns/new, deals/[dealId]}.
7. ✅ Admin: admin/{dashboard, compliance}.
8. ✅ Validation: typecheck, lint, build, unit tests, runtime smoke tests all green.

## Validation results (from web/)

- npm run typecheck — PASS
- npm run lint — PASS (0 errors; 4 pre-existing unused-var warnings)
- npm run build — PASS (42 routes; all 19 spec pages compiled)
- npm run test — PASS (132 passed, 8 DB-gated skipped)
- Smoke tests — public pages 200, unknown athlete 404, /dashboard/* + /admin/* redirect to /login

## Flags / caveats

- Installed `stripe` (was imported by existing /api/billing + webhook routes but missing from package.json).
- Fixed pre-existing lint errors in billing-panel.tsx and billing test fixtures so lint is green.
- Prisma User.passwordHash / Session models stay (no migration); custom session code removed from use.
- e2e spec updated for Clerk routes; full sign-up e2e requires Clerk E2E/test mode.
- Next 16 deprecates `middleware.ts` in favor of `proxy.ts` (warning only; migration is a recommended follow-up).
- Clerk deprecates `createRouteMatcher` in favor of resource-based auth checks (warning only).
