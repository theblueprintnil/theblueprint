# The Blueprint - Studio approval UI

> entityType: domain-module

## Observations

- web/src/lib/agent/{types,celery-client,queries,actions}.ts: real "use server" actions (approve/revise/start) enforcing the 7-step authorization sequence; JSON-RPC celery client to the agent-engine gateway
- DB status transitions run under withOrgContext (RLS, OWNER/ADMIN only) BEFORE the gateway dispatch; AGENT_SERVICE_URL/AGENT_SERVICE_TOKEN registered as reserved tier in src/lib/env.ts
- web/src/components/agent/ApprovalCard.tsx: risk badges, recommended edits, reviewer feedback; live approval queue on /app/studio page

## Relations

**Outgoing**

- `uses` → [[The Blueprint - Agent execution data model]]
- `calls` → [[The Blueprint - A2A agent engine]]
- `constrained-by` → [[The Blueprint - Authorization sequence rule]]

**Incoming**

- `contains` ← [[The Blueprint - NIL Athlete Promotion Site]]