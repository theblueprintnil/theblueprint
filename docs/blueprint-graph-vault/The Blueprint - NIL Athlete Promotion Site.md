# The Blueprint - NIL Athlete Promotion Site

> entityType: project

## Observations

- NIL athlete promotion SaaS monorepo; root contains web/ Next.js app, docker-compose Postgres, docs/, commands/, scripts/
- Git remote: github.com/sroe001/The-Blueprint---NIL-Athlete-Promotion-Site.git on branch main
- Product concept: two-sided NIL platform connecting athletes, brands, agencies, guardians for name/image/likeness deals
- Root package.json has no runtime deps; real app lives under web/ (Next 16.3.1, React 19.2.8, Prisma 6.4)
- Monorepo layout verified 2026-08-30: web/ (Next.js 16 + Prisma), supabase/ (Phase-2 SQL foundation), docs/ (Product_Brief, IMPLEMENTATION_PLAN, SECURITY, design/iteration-1), commands/, scripts/, root docker-compose.yml (Postgres 16 on :5433)
- Vault refresh 2026-09-09: Phase-5 A2A agent orchestration (commit 9666512, 2026-09-04) and content pack/route restructure (commit 2a23c3c, 2026-09-03) added as entities; Obsidian vault lives at docs/blueprint-graph-vault/ (renamed from docs/graph-vault)
- Monorepo now includes agent-engine/ (Python LangGraph+Celery service), content-pack/, docs/content-playbook/, Redis service in root docker-compose.yml
- Deployment decision 2026-09-10: Vercel hosts web (Next.js project rooted at web/) and agent-engine (FastAPI entrypoint agent_engine.api:app + Celery subscriber worker:app on Vercel Queues); production Postgres planned on Supabase

## Relations

**Outgoing**

- `contains` → [[The Blueprint - Next.js web app]]
- `contains` → [[The Blueprint - Docker Postgres]]
- `contains` → [[The Blueprint - Agentic Strategies commands]]
- `contains` → [[The Blueprint - Obsidian graph vault]]
- `contains` → [[The Blueprint - A2A agent engine]]
- `contains` → [[The Blueprint - Agent execution data model]]
- `contains` → [[The Blueprint - Studio approval UI]]
- `contains` → [[The Blueprint - Content pack]]
- `contains` → [[The Blueprint - Public site & dashboards]]

**Incoming**

- none