# The Blueprint - Opportunities module

> entityType: domain-module

## Observations

- src/lib/opportunities.ts plus /api/opportunities route; OpportunityStatus OPEN/APPLIED/ACCEPTED/CLOSED
- UI: opportunity-inbox.tsx component powering the /app/opportunities page
- AI integration: summarizeOpportunity action converts source posts into a structured opportunity summary

## Relations

**Outgoing**

- `exposed-by` → [[The Blueprint - API routes]]

**Incoming**

- none