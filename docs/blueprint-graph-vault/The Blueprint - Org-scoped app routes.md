# The Blueprint - Org-scoped app routes

> entityType: architecture-layer

## Observations

- /app/layout.tsx gates onboarding, then serves role-aware workspaces: agency/{athletes,content,contracts,dashboard,deals,reports,team}, brand, dashboard, deals, documents, guardian/dashboard, media-kit, opportunities, settings/{billing,security,team,workspace}, studio
- Workspace types: athlete studio, agency workspace, guardian portal, brand
- Client pages consume API routes via SWR and are protected by middleware + layout checks

## Relations

**Outgoing**

- `consumes` → [[The Blueprint - API routes]]
- `built-on` → [[The Blueprint - App UI shell]]

**Incoming**

- `hosts` ← [[The Blueprint - Next.js web app]]