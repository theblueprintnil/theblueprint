# The Blueprint - RBAC permissions

> entityType: domain-module

## Observations

- permissions.ts: ROLE_PERMISSIONS literal map for OWNER/ADMIN/MEMBER/VIEWER over Permission union (view, edit_content, manage_content, invite_members, manage_members, manage_settings, delete_organization)
- can(role, permission) and atLeast(role, minimum) implemented via ROLE_ORDER; roleLabel() for display
- Membership table carries MembershipRole; a separate Role enum on User (ATHLETE/BRAND/AGENCY/GUARDIAN/ADMIN) represents persona
- .clinerules mandate that role checks never be hardcoded inline — reference this canonical role list

## Relations

**Outgoing**

- `enforces` → [[The Blueprint - Multi-tenancy model]]

**Incoming**

- `relies-on` ← [[The Blueprint - Auth & sessions]]
- `tests` ← [[The Blueprint - Vitest unit suite]]
- `protected-by` ← [[The Blueprint - Public site & dashboards]]