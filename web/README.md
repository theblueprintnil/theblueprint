# The Blueprint — Web App

Phase 1 of a multi-tenant NIL operating platform: Next.js 16 (App Router, TypeScript strict) with Tailwind CSS v4, Prisma on PostgreSQL, cookie sessions, organization-based multi-tenancy enforced by Postgres RLS, an owner/admin/member/viewer role model, and a first-organization onboarding flow.

Stripe and AI features are deliberately **out of scope** for Phase 1.

## Prerequisites

- Node.js 22+
- Docker (for local PostgreSQL)

## Setup

```bash
cd web
cp .env.example .env        # fill in real values; see table below
npm install
docker compose up -d        # from the repository root: starts postgres on port 5433
npx prisma db push          # create/sync the schema
npm run db:rls              # create app_user role + apply RLS policies
npx prisma db seed          # demo data
```

### Environment variables

| Variable                        | Required | Purpose                                                                     |
| ------------------------------- | -------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                  | yes      | Privileged Prisma connection used for auth reads, migrations, RLS bootstrap |
| `DATABASE_URL_APP`              | yes      | Row-level-security-scoped `app_user` connection used for all tenant queries |
| `APP_DB_PASSWORD`               | yes      | Password applied to the `app_user` role by `npm run db:rls`                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | reserved | Placeholder for the planned Supabase migration (Phase 2+)                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | reserved | Placeholder for the Supabase browser client                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | reserved | Server-only Supabase key; never expose to the client                        |
| `SESSION_SECRET`                | reserved | Future signing secret for stateless session tokens                          |
| `NEXT_PUBLIC_APP_URL`           | optional | Canonical app URL for redirects/links                                       |

Startup validates that every required variable is present (`src/lib/env.ts`) and fails fast with a readable error otherwise.

## Development

```bash
npm run dev                 # http://localhost:3000
```

Flow: `/register` → `/onboarding` (creates your first organization; you become its OWNER) → `/app/dashboard`. Existing users land in their most recently active organization via the header switcher.

## Scripts

| Command                           | What it does                                                               |
| --------------------------------- | -------------------------------------------------------------------------- |
| `npm run lint`                    | ESLint (flat config, next/core-web-vitals + TS, Prettier-compat last)      |
| `npm run format` / `format:check` | Prettier write/check                                                       |
| `npm run typecheck`               | `tsc --noEmit`                                                             |
| `npm run test`                    | Vitest unit tests                                                          |
| `npm run e2e`                     | Playwright end-to-end suite (auto-starts `next dev`; needs the DB running) |
| `npm run db:rls`                  | Recreates/refreshes `app_user` and applies `prisma/rls.sql`                |

## Testing

Unit tests cover env validation, permission matrix, slug/onboarding validation, organization data layer, and the Supabase-style query facade. DB-dependent specs are gated behind `VIBE_DB_TESTS=1`.

```bash
docker compose up -d                  # from repo root
npx prisma db push && npm run db:rls  # once
npm run test
npm run e2e                           # registers a fresh user end-to-end
```

## Architecture notes

- **Multi-tenancy** — every tenant-owned row carries `organizationId`; access is enforced twice: app-side helpers (`withUser`, `withOrgContext` set `app.current_user_id` / `app.current_org_id` per transaction) and database-side RLS policies (`prisma/rls.sql`). The privileged client is only used for auth/session reads and registration/org-creation boundaries.
- **Roles** — `Membership.role` (`OWNER > ADMIN > MEMBER > VIEWER`) drives a central matrix in `src/lib/permissions.ts`; the workspace persona enum (`Role`) remains separate.
- **Supabase-style seam** — `src/lib/supabase/{client,server,types,errors,rls}.ts` provide a Supabase-flavored data API today, implemented over Prisma; when the platform moves to Supabase Auth/Postgres these modules swap internals without touching feature code.
- **Onboarding gate** — `/app/*` layout redirects to `/onboarding` until the signed-in user belongs to at least one organization.

## Repo-level workflow

Repository root contains `commands/*.md` (phased build workflow), `docs/` design briefs, and `docker-compose.yml` for the local database.
