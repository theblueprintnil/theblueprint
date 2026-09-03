# The Blueprint - Deal pipeline

> entityType: domain-module

## Observations

- src/lib/deal-pipeline.ts is a pure state machine over DealStatus DRAFT/PENDING/ACTIVE/COMPLETED/CANCELLED
- deal-pipeline.tsx component, /app/deals page, and /api/deals route
- Deal model carries brandName, athleteName, amount, deliverables count, start/end date, and stage
- Existing graph node 'Two-Sided NIL Platform' specifies a later deal-machine with permission-gated transitions and human review gates for tone/photography/terms/legal

## Relations

**Outgoing**

- `exposed-by` → [[The Blueprint - API routes]]

**Incoming**

- `specifies` ← [[The Blueprint - Two-Sided NIL Platform]]
- `tests` ← [[The Blueprint - Vitest unit suite]]