# The Blueprint - Authorization sequence rule

> entityType: process

## Observations

- .clinerules 'Authorization Sequence (mandatory)': 1 authenticate 2 resolve org server-side 3 membership valid 4 role sufficient 5 entitlement/plan check 6 RLS-protected access only 7 audit event
- Never trust client-supplied user/org/role ids; service-role access only in audited admin/background jobs
- Applies to every Next.js Server Action, API Route Handler, and background job that touches tenant/org data

## Relations

**Outgoing**

- none

**Incoming**

- `runs-through` ← [[The Blueprint - API routes]]
- `constrained-by` ← [[The Blueprint - AI assist layer]]