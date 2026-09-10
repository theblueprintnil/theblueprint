# The Blueprint - Agent execution data model

> entityType: data-layer

## Observations

- Prisma additions (2026-09-04): enums AgentGraphKind, AgentExecutionStatus, RiskSeverity and org-scoped AgentTaskExecution model with @@unique([organizationId, threadId])
- AgentTaskExecution fields: JSON complianceFlags/captions/inputRef, reviewerId, reviewerFeedback, complianceScore; demo PENDING_APPROVAL row seeded for Carter Athletics
- RLS in prisma/rls.sql: members read+insert, OWNER/ADMIN-only update (review); Supabase mirror DDL supabase/migrations/20260904000000_create_agent_execution.sql
- Spec's 'Tenant' maps to repo's Organization; FK stays organizationId per repo convention

## Relations

**Outgoing**

- `mirrors-in` → [[The Blueprint - Supabase SQL foundation]]
- `persists-in` → [[The Blueprint - Docker Postgres]]

**Incoming**

- `contains` ← [[The Blueprint - NIL Athlete Promotion Site]]
- `reads-writes` ← [[The Blueprint - A2A agent engine]]
- `uses` ← [[The Blueprint - Studio approval UI]]