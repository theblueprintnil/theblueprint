# The Blueprint - Public site & dashboards

> entityType: route-group

## Observations

- Route groups added in commit 2a23c3c: (marketing) public pages at /, /about, /brands, /nil-compliance, /privacy, /terms; (marketplace) /athletes browse page
- Role dashboards: /dashboard/athlete and /dashboard/brand outside the org-scoped /app area; /admin/dashboard and /admin/compliance gated to the User ADMIN role by the admin layout
- lib/marketplace/ data layer backs athlete discovery; content-pack/ and docs/content-playbook/ supply the seeded marketing copy

## Relations

**Outgoing**

- `reads-writes` → [[The Blueprint - Prisma data layer]]
- `protected-by` → [[The Blueprint - RBAC permissions]]

**Incoming**

- `contains` ← [[The Blueprint - NIL Athlete Promotion Site]]