# The Blueprint - Two-Sided NIL Platform

> entityType: architecture

## Observations

- Single Next.js App Router monolith hosting role-aware workspaces by tenant type: athlete studio (/app/studio), agency workspace (/app/agency/*), guardian portal (/app/guardian/dashboard), brand (/app/brand) - all under the /app org-scoped shell
- Multi-tenant isolation on two parallel foundations: Prisma RLS (app_user + app.current_user_id/app.current_org_id GUCs, prisma/rls.sql) plus a Phase-2 Supabase SQL foundation in supabase/migrations (auth.uid() + member_role/is_member SECURITY DEFINER helpers)
- App shell: src/app/app/layout.tsx redirects to /onboarding when the user has zero orgs, then renders AppShell = Header (organization switcher honoring the blueprint_org cookie) + Sidebar + main content
- RBAC: src/lib/permissions.ts ROLE_PERMISSIONS literal map over MembershipRole OWNER/ADMIN/MEMBER/VIEWER with can(role, permission) + atLeast(role); see [[The Blueprint - RBAC permissions]]
- Deal flow today: pure state machine over DealStatus in src/lib/deal-pipeline.ts (see [[The Blueprint - Deal pipeline]]); the design brief specifies a later permission-gated legal deal-machine with human review
- Stripe: src/lib/billing/{stripe,webhook,entitlements,plans}.ts with idempotent events via WebhookEvent; see [[The Blueprint - Billing & Stripe]]
- AI assist-only: src/lib/ai/orchestrator.ts runAiAction runs membership -> entitlement -> rate-limit -> PII redaction -> ai_runs -> provider -> store -> usage-event -> audit; never accepts offers or signs contracts
- Validation gate: npm run typecheck -> lint -> test (vitest) -> build; strict TS, @/* alias, Tailwind-first, no new runtime deps

## Relations

**Outgoing**

- `specifies` → [[The Blueprint - Deal pipeline]]
- `realized-in` → [[The Blueprint - Next.js web app]]
- `specifies` → [[The Blueprint - Supabase SQL foundation]]

**Incoming**

- none