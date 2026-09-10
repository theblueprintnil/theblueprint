# The Blueprint - Prisma data layer

> entityType: data-layer

## Observations

- Prisma 6.4.0, provider postgresql, env DATABASE_URL; schema.prisma defines User, Organization, Membership, Athlete, Brand, Session, Opportunity, Deal, Invitation, Subscription, Entitlement, WebhookEvent, UsageEvent, AiRun, Project, AuditLog
- 10 enums: Role, OpportunityStatus, DealStatus, MembershipRole, WorkspaceType, InvitationStatus, BillingStatus, PlanType, AiRunStatus, AiApprovalStatus, ProjectStatus
- String PKs are Postgres TEXT; raw SQL must quote CamelCase identifiers or Postgres folds to lowercase (42703)
- db.ts exposes prismaAuth (DATABASE_URL) and app_user client (DATABASE_URL_APP) with set_config scoping inside transactions (runScoped)

## Relations

**Outgoing**

- `protected-by` → [[The Blueprint - RLS security layer]]

**Incoming**

- `uses` ← [[The Blueprint - Next.js web app]]
- `persists-in` ← [[The Blueprint - Auth & sessions]]
- `persists-in` ← [[The Blueprint - Multi-tenancy model]]
- `wraps` ← [[The Blueprint - Supabase compat seam]]
- `reads-writes` ← [[The Blueprint - Public site & dashboards]]