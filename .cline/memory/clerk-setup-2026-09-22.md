# Clerk setup — 2026-09-22

- Clerk app: "NIL Athlete AI SAAS" (`app_3IV5oiy9ukCGSs8ANYNwOB1v5vh`), dev instance `ins_3IV5ohAkczMIkC4d1hGNJe9MB6b`, CLI 3.3.0 linked via `clerk init` from `web/`.
- Auth routes unified on `/login` + `/signup` (styled `(auth)` pages); `clerk init`'s boilerplate `/sign-in` + `/sign-up` catch-alls were created then removed as duplicates.
- `web/.env` sets `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup` (documented in `.env.example`).
- `web/src/middleware.ts` matcher includes `'/__clerk/:path*'` after `'/(api|trpc)(.*)'`; route protection `/app/*`, `/dashboard/*`, `/admin/*` → `/login?next=…` verified live.
- `web/src/components/marketing/site-header.tsx` uses `Show`/`SignInButton`/`SignUpButton`/`UserButton` from `@clerk/nextjs` (Clerk v7: `afterSignOutUrl` prop is gone — use plain `<UserButton />`).
- Clerk agent skills installed under `web/.agents/skills/`.
