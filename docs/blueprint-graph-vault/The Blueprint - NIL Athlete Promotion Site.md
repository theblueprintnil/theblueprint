# The Blueprint - NIL Athlete Promotion Site

> entityType: project

## Observations

- NIL athlete promotion SaaS monorepo; root contains web/ Next.js app, docker-compose Postgres, docs/, commands/, scripts/
- Git remote: github.com/sroe001/The-Blueprint---NIL-Athlete-Promotion-Site.git on branch main
- Product concept: two-sided NIL platform connecting athletes, brands, agencies, guardians for name/image/likeness deals
- Root package.json has no runtime deps; real app lives under web/ (Next 16.3.1, React 19.2.8, Prisma 6.4)
- Monorepo layout verified 2026-08-30: web/ (Next.js 16 + Prisma), supabase/ (Phase-2 SQL foundation), docs/ (Product_Brief, IMPLEMENTATION_PLAN, SECURITY, design/iteration-1), commands/, scripts/, root docker-compose.yml (Postgres 16 on :5433)
- Snapshot captured by /graphify on branch main (worktree clean except untracked commands/graphify.md); entity/edge map also mirrored to docs/graph-vault as an Obsidian vault

## Relations

**Outgoing**

- `contains` → [[The Blueprint - Next.js web app]]
- `contains` → [[The Blueprint - Docker Postgres]]
- `contains` → [[The Blueprint - Obsidian graph vault]]

**Incoming**

- none