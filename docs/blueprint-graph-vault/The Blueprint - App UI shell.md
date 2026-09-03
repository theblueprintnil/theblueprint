# The Blueprint - App UI shell

> entityType: ui-layer

## Observations

- app-shell.tsx, header.tsx, sidebar.tsx, organization-switcher.tsx, state.tsx; shared page-placeholder.tsx, status-badge.tsx, billing-panel.tsx
- Uses SWR for client-side data fetching; cn() utility merges Tailwind classes
- Sidebar navigation adapts per workspace type; organization switcher sets currentOrganizationId

## Relations

**Outgoing**

- none

**Incoming**

- `built-on` ← [[The Blueprint - Org-scoped app routes]]