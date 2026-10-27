# My NIL — NIL Athlete Promotion Site

Multi-tenant SaaS that helps NIL athletes land and manage brand deals: athlete profile
builder, opportunity marketplace, deal workspace, and an AI content studio with
human-in-the-loop approval.

## Repository layout

| Path            | What it is                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| `web/`          | Next.js 16 app (App Router, Clerk auth, Prisma + Supabase Postgres, Stripe) |
| `agent-engine/` | Python gateway + Celery-style worker backing the AI content studio         |
| `supabase/`     | SQL migrations and tenant-isolation test suites                            |
| `docs/`         | Runbooks, ADRs, security model, product briefs (`docs/GO-LIVE.md` first)    |
| `content-pack/` | Content strategy assets                                                    |
| `scripts/`      | Repo-level helper scripts                                                  |

## Local development (web)

```bash
cd web
npm install
copy .env.example .env
npm run dev
```

Fill `web/.env` per `web/README.md` (database, Clerk, and — when billing is exercised —
Stripe). Local Postgres is available via `docker compose up -d` from the repo root.

## Deployment

Both deployables ship to Vercel from this one GitHub repository, each as its own Vercel
project with a distinct Root Directory:

| Vercel project | Root Directory   | Notes                                              |
| -------------- | ---------------- | -------------------------------------------------- |
| web            | `web/`           | Next.js, Node 22 via `engines`, auto-detected      |
| agent-engine   | `agent-engine/`  | Python functions + Vercel Queues worker            |

The dependency-ordered launch checklist lives in [`docs/GO-LIVE.md`](docs/GO-LIVE.md).
Architecture and security background: [`web/README.md`](web/README.md),
[`agent-engine/README.md`](agent-engine/README.md), [`docs/SECURITY.md`](docs/SECURITY.md),
and decision records in [`docs/adr/`](docs/adr/).