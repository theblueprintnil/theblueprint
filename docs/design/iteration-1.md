# Iteration 1 — Design Brief

## One-sentence product idea

The Blueprint is a two-sided NIL operating platform where athletes build a verified personal-brand package (profile, content, media kit) and agencies intake, qualify, negotiate, approve, and track NIL deals through an auditable deal workflow — delivered as one multi-tenant application with role-aware workspaces.

## Target user and core job-to-be-done

| User | Core job-to-be-done |
| --- | --- |
| Athlete (or guardian/manager) | Stand up a credible personal-brand package and safely review opportunities without losing control of commercial decisions. |
| Agency owner / agent / coordinator | Run a representation practice: onboard athletes, intake and qualify opportunities, and drive deals to signature with approvals and an audit trail. |
| Guardian | Approve what a minor athlete can accept, publish, or sign, and see a record of every decision. |

## Main screens (iteration 1)

Every signed-in page uses a shared application shell (from the page map):

```
┌──────────────────────────────────────────────────────────────┐
│ Logo │ Workspace Switcher │ Search │ Alerts │ Help │ Avatar  │
├───────────────┬──────────────────────────────────────────────┤
│ Left Sidebar  │ Page Content                                 │
│               │ Header: title, status, primary action        │
│ Dashboard     │                                              │
│ Brand/Studio  │  Main content area                           │
│ Opportunities │                                              │
│ Deals         │                                              │
│ Documents     │                                              │
│ Team          │                                              │
│ Analytics     │                                              │
│ Billing       │                                              │
│ Settings      │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

1. **Athlete Dashboard** — today-at-a-glance: brand snapshot, recent activity, and the primary widget.
   - *Primary widget: Opportunity Inbox* — queue of opportunities with brand, value band, and status (new / under review / accepted / declined) plus one-click "review deal".
2. **My Brand Profile + Media Kit** — bio, sport, school, audience, brand interests, social links, portfolio; shareable media-kit page via an expiring/revocable public link.
3. **Agency Dashboard** — roster summary and the primary widget.
   - *Primary widget: Deal Pipeline* — kanban across `received → qualified → athlete review → negotiation → contract review → approval → signed → fulfilled → closed`, with per-deal tasks and reminders.
4. **Athlete Roster + Athlete Detail Workspace** — athlete profiles, guardians, deals, documents, permissions.
5. **Opportunity Intake** — shareable agency intake form (`/intake/[agencySlug]`) plus manual entry.
6. **Deals and Contracts** — deal detail room with version history, document vault, and approval requests.
7. **Guardian Portal** — dependent profiles, pending approvals, documents, consent.
8. **Auth and Onboarding** — signup, email verification, workspace-type onboarding, Stripe trial checkout.
9. **Settings** — team seats, billing, workspace, security.

## Must-have features for this iteration only

- Organization-based multi-tenancy: `organization_id` on every tenant-owned record, strict RLS on every tenant-owned table.
- Role-aware shell with a workspace switcher for users holding multiple roles (athlete / agency / guardian).
- Authentication: login, register, email verification, sessions; MFA for agency owners and admins.
- Athlete Studio: profile, content library (upload + metadata), media kit with expiring/revocable share link, opportunity inbox.
- Agency Workspace: roster, athlete detail, opportunity intake (shareable form), deal pipeline, private contract/document vault with server-authorized short-lived signed URLs, deal tasks.
- Guardian identity/consent workflow before a minor can publish, accept an offer, or act commercially.
- Immutable audit events for sensitive actions (offer changes, approvals, contract events).
- Billing scaffold: card-required trial via Stripe Checkout; plans/entitlements differentiated by seats and premium modules.

## Design references and style constraints

- Visual references: `Login Page.png`, `Dashboard Page.png`, `Athlete Profile.png` (mockups in repo root).
- Palette: `colorkit.png` is the source of truth; digitize exact hex values into design tokens (Tailwind theme) at build time rather than guessing colors.
- Tone: security-sensitive B2B application, not a consumer content app. Prioritize permission states, approval queues, secure documents, and deal workflow over a generic dashboard aesthetic (page-map guidance).
- Constraint: role/tenant context must be obvious — no ambiguous "who am I acting as" moments; sensitive actions show audit visibility.
- Accessibility: keyboard-navigable approval and deal flows; honor reduced-motion preference.

## Explicitly out of scope for iteration 1

- AI content studio / campaign generation (planned for a later release).
- Full social-media publishing automation.
- Automated contract signing, AI legal advice, or AI compliance determination.
- Public marketplace with unrestricted brand access.
- Advanced analytics/reports, workflow automation, API/integrations, white-label or custom branding.
- Platform admin console beyond minimal tenant support tooling.
