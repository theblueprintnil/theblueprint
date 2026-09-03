# Page Index — The Blueprint

Complete inventory of pages from the page map, grouped by the map's recommended
build order. Status values: `not-started`, `briefed`, `drafted`, `approved`,
`implemented`. One page is worked at a time; update this file at every
HOOK-ARCHIVE.

## Release 1 — Sellable foundation (active)

| Route | Page | Status | Notes |
| --- | --- | --- | --- |
| `/` | Homepage (refresh) | drafted | Two-sided platform; entry points for athlete + agency |
| `/athletes` | Athlete landing | drafted | ROUTE COLLISION: code uses `/athletes` as marketplace directory (see Open decisions) |
| `/agencies` | Agency landing | drafted | New page |
| `/pricing` | Pricing | drafted | Trial / Athlete Pro / Agency Starter / Agency Growth + premium modules |
| `/security` | Security & trust | drafted | Conversion + trust asset |
| `/how-it-works` | How It Works | drafted | New page |

Supporting marketing pages that already exist and are `implemented`:

| Route | Page | Status | Notes |
| --- | --- | --- | --- |
| `/about` | About | implemented | Mission, values, pillars |
| `/brands` | For Brands | implemented | Primary brand-conversion page today |
| `/nil-compliance` | NIL Compliance | implemented | LegalDocument |
| `/privacy` | Privacy Policy | implemented | LegalDocument |
| `/terms` | Terms of Service | implemented | LegalDocument |
| `/login`, `/signup` | Auth | implemented | In `(auth)` route group |

## Release 1 — Auth & onboarding (not active)

| Route | Page |
| --- | --- |
| `/verify-email` | Verify email |
| `/onboarding/workspace-type` | Choose workspace type |
| `/onboarding/athlete` | Athlete setup |
| `/onboarding/agency` | Agency setup |
| `/onboarding/plan` | Choose trial plan |
| `/onboarding/complete` | Onboarding complete |

## Release 1 — Athlete brand studio (not active)

| Route | Page |
| --- | --- |
| `/app/dashboard` | Athlete dashboard |
| `/app/brand/profile` | My brand profile |
| `/app/studio` | Content studio |
| `/app/studio/new` | New campaign brief |
| `/app/studio/campaigns` | Campaign list/calendar |
| `/app/studio/campaigns/[campaignId]` | Campaign workspace |
| `/app/studio/assets` | Asset library |
| `/app/studio/templates` | Saved templates |
| `/app/studio/history` | Generation history |
| `/app/media-kit` | Media kit |
| `/app/media-kit/edit` | Media kit editor |
| `/app/media-kit/share` | Share settings |
| `/app/opportunities` | Opportunities inbox |
| `/app/opportunities/[opportunityId]` | Opportunity detail |
| `/app/deals` | Athlete deals |
| `/app/deals/[dealId]` | Deal room |
| `/app/documents` | Athlete documents |
| `/app/approvals` | Athlete approvals |
| `/app/notifications` | Notification center |

## Release 1 — Agency workspace (not active)

| Route | Page |
| --- | --- |
| `/app/agency/dashboard` | Agency dashboard |
| `/app/agency/athletes` | Athlete roster |
| `/app/agency/athletes/new` | Add athlete |
| `/app/agency/athletes/[athleteId]` | Athlete detail workspace |
| `/app/agency/athletes/[athleteId]/brand` | Athlete brand |
| `/app/agency/athletes/[athleteId]/content` | Athlete content |
| `/app/agency/athletes/[athleteId]/deals` | Athlete deals |
| `/app/agency/athletes/[athleteId]/documents` | Athlete documents |
| `/app/agency/athletes/[athleteId]/guardians` | Guardian relationships |
| `/app/agency/athletes/[athleteId]/permissions` | Permissions |
| `/app/agency/opportunities` | Opportunity intake |
| `/app/agency/opportunities/new` | New opportunity |
| `/app/agency/deals` | Deal pipeline |
| `/app/agency/deals/[dealId]` | Deal detail room |
| `/app/agency/contracts` | Contract vault |
| `/app/agency/contracts/[contractId]` | Contract detail |
| `/app/agency/content` | Content & campaigns |
| `/app/agency/tasks` | Tasks & approvals |
| `/app/agency/analytics` | Agency analytics |
| `/app/agency/reports` | Agency reports |
| `/intake/[agencySlug]` | Public intake form |
| `/intake/[agencySlug]/submitted` | Intake submitted |

## Release 1 — Guardian portal (not active)

| Route | Page |
| --- | --- |
| `/app/guardian/dashboard` | Guardian dashboard |
| `/app/guardian/athletes/[athleteId]` | Dependent athlete profile |
| `/app/guardian/approvals` | Approval queue |
| `/app/guardian/documents` | Contracts & documents |
| `/app/guardian/consent` | Consent settings |

## Release 1 — Settings (not active)

| Route | Page |
| --- | --- |
| `/app/settings/team` | Team & seats |
| `/app/settings/billing` | Billing |
| `/app/settings/workspace` | Workspace |
| `/app/settings/security` | Account security |

## Release 4 — Platform admin (not active)

| Route | Page |
| --- | --- |
| `/platform-admin` | Platform overview |
| `/platform-admin/tenants` | Tenant administration |
| `/platform-admin/support-access` | Support & impersonation controls |
| `/platform-admin/security` | Audit & security |
| `/platform-admin/catalog` | Plan & entitlement administration |

## Open decisions (tracked from briefs)

1. **`/athletes` route collision** — the page map wants an athlete landing page
   at `/athletes`, but code currently uses `/athletes` as the marketplace
   directory (with `/brands` as the brand-conversion page). Options: (a) move
   the directory to `/marketplace/athletes` and make `/athletes` the landing
   page; (b) keep `/athletes` as directory and give the landing page a new slug
   such as `/for-athletes`. Decision owner: site owner. Content is written to
   the page-map intent and the collision is flagged in each brief.
2. **Header navigation** — current header links About / Athletes / For Brands /
   NIL Compliance. Page map implies How It Works, For Athletes, For Agencies,
   Pricing, Security. Header updates are a code change, tracked separately.
3. **Stats band** — homepage stats ("2,400+ verified athletes") are illustrative
   demo copy and must be replaced with real metrics or removed before launch.