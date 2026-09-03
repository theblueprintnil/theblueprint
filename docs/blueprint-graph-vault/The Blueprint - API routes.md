# The Blueprint - API routes

> entityType: architecture-layer

## Observations

- src/app/api contains auth/{login,logout,me,register}, billing/{checkout,portal,status}, deals, opportunities, organizations + [id]/switch, stripe/webhook
- Route handlers implement the .clinerules authorization sequence: authenticate -> resolve org -> membership -> role -> entitlement -> RLS-protected access -> audit event
- Server-side only: never trust client-supplied user/org/role ids

## Relations

**Outgoing**

- `runs-through` → [[The Blueprint - Authorization sequence rule]]

**Incoming**

- `hosts` ← [[The Blueprint - Next.js web app]]
- `consumes` ← [[The Blueprint - Org-scoped app routes]]
- `exposed-by` ← [[The Blueprint - Opportunities module]]
- `exposed-by` ← [[The Blueprint - Deal pipeline]]
- `exposed-by` ← [[The Blueprint - Billing & Stripe]]
- `applies-to` ← [[Server-Action Failure Handling]]