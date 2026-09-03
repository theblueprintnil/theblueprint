# The Blueprint - Vibe Loop workflow

> entityType: process

## Observations

- vibe-loop.config.json defines phases: inspiration (/inspire), animate (/animate), main-functionality (/build), local-testing (build + vitest), db-testing (prisma db push + db:rls + seed + VIBE_DB_TESTS), authentication (/auth), deployment (netlify with build fallback), e2e (playwright)
- commands/loop.md drives the iterative loop; interactions delegate to Agentic Strategies slash commands

## Relations

**Outgoing**

- `delegates-to` → [[The Blueprint - Agentic Strategies commands]]

**Incoming**

- none