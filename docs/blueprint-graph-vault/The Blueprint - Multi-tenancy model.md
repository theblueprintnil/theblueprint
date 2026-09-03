# The Blueprint - Multi-tenancy model

> entityType: domain-module

## Observations

- Organization + Membership (unique userId+organizationId, onDelete Cascade); User.currentOrganizationId; Organization.slug unique and workspaceType enum
- Tenant-owned tables reference organizations(id) NOT NULL: Membership, Invitation, Subscription, Entitlement, UsageEvent, AiRun, Project; Opportunity/Deal/AuditLog keep a nullable organizationId (pre-existing design)
- Onboarding gate: /app/* layout redirects to /onboarding when the user has zero orgs; switching via /api/organizations/[id]/switch
- RLS isolation via app_user_role_in policies: cross-tenant inserts rejected, no-identity access fails closed
- createOrganizationWithOwner (src/lib/organizations.ts) runs one prismaAuth.$transaction: org + OWNER membership + seeded DEMO entitlement + ORGANIZATION_CREATED and BILLING_DEMO_STARTED audit logs; unique slug = slugFromName(name)-<6-char uuid> with collision retries

## Relations

**Outgoing**

- `persists-in` → [[The Blueprint - Supabase SQL foundation]]
- `persists-in` → [[The Blueprint - Prisma data layer]]

**Incoming**

- `enforces` ← [[The Blueprint - RBAC permissions]]
- `creates` ← [[The Blueprint - Onboarding flow]]
- `tests` ← [[The Blueprint - Vitest unit suite]]