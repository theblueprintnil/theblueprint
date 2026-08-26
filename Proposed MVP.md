You have a coherent product definition now: a **two-sided NIL operating platform**—an athlete-facing brand and content studio, plus an agency workspace for deal intake, contracting, approvals, and relationship management. Each individual business is a tenant, and the platform should use a card-required, cancel-anytime trial with plans differentiated chiefly by seats and premium modules.

Because minors, contracts, and sensitive data are in scope, treat the first release as a security-sensitive B2B application—not a consumer content app. Supabase RLS can enforce row-level authorization directly in Postgres, while Vercel provides HTTPS/TLS, DDoS mitigation, firewall protections, and configurable response headers.supabase+1

## **Refined product architecture**

## **Tenant definition**

A tenant is an **individual business**, such as:

* A solo athlete business.  
* An athlete’s parent/guardian-managed business.  
* An NIL agency.  
* A small representation or marketing firm.  
* Later: a school, collective, or brand workspace—only if your compliance model supports it.

Do not make athletes and agencies separate applications. Build one platform with **workspace modes** controlled by tenant type and optional modules.

| Workspace type | Primary user | Core jobs |
| ----- | ----- | ----- |
| Athlete Studio | Athlete, guardian, manager | Build personal brand, create media, manage social content, present media kit, receive opportunities |
| Agency Workspace | Agency owner, agent, coordinator | Intake athletes, receive/manage offers, deal pipeline, contracts, approvals, reporting |
| Shared Deal Room | Athlete \+ agency \+ permitted collaborators | Review a deal, upload documents, negotiate, approve, sign, retain audit history |

The athlete should always have a clear, limited view of their own profile, content assets, offers, approvals, contracts, and activity. Agency staff should have access only when membership, representation relationship, and permissions allow it.

## **Recommended MVP**

Your **first paid outcome** should be:

> Enable athletes to create a verified personal-brand package and enable agencies to receive, qualify, manage, and convert NIL opportunities through an auditable deal workflow.

This is more commercially viable than beginning with generic AI content generation because it connects content creation directly to agency revenue, athlete visibility, brand opportunities, and contract management.

## **Athlete Studio MVP**

* Athlete profile: bio, sport, school, audience, brand interests, social links, portfolio.  
* AI-assisted multimedia campaign creator: social captions, short-form video briefs, image prompts, sponsorship pitch drafts, media-kit text, email copy.  
* Content library with controlled uploads and metadata.  
* Brand/media-kit page that can be shared through an expiring or revocable public link.  
* Opportunity inbox.  
* Deal/offer review page.  
* Guardian approval workflow for minors.  
* Activity timeline and notification center.

## **Agency Workspace MVP**

* Agency profile and team seats.  
* Athlete roster and profile management.  
* Opportunity/deal intake form.  
* Deal pipeline: received → qualified → athlete review → negotiation → contract review → approval → signed → fulfilled → closed.  
* Contract/document vault.  
* Task assignment, role controls, deal notes, and reminders.  
* Shareable athlete profile/media-kit links.  
* AI-assisted opportunity analysis and draft outreach—not autonomous agreement acceptance.  
* Audit history for document access, offer changes, approvals, and contract events.

## **Do not build initially**

* Full social-media publishing automation.  
* Automated contract signing without human review.  
* AI legal advice or compliance determination.  
* A public marketplace with unrestricted brand access.  
* Custom video rendering infrastructure.  
* Complex school/collective dashboards.  
* “Agentic” actions that send outreach, accept terms, or make material decisions without review.

For version one, let AI **assist, organize, draft, summarize, and score**. Keep the human decision-maker responsible for offers, contracts, publishing, and legal/compliance determinations.

## **Plans and entitlement model**

Your pricing should use a base subscription with seat limits and module-based upgrades. That fits both solo athletes and growing agencies without duplicating products.

| Plan | Intended customer | Seats | Included modules | Suggested positioning |
| ----- | ----- | ----- | ----- | ----- |
| Trial | Individual business evaluating platform | 1–2 | Core athlete profile, limited content generation, one deal workspace | 7–14 days, card required, cancel anytime |
| Athlete Pro | Solo athlete or guardian-managed business | 1–2 | Brand studio, media kit, content library, basic opportunity inbox | Personal NIL operating system |
| Agency Starter | Small agency | 3–5 | Roster, deal pipeline, contract vault, athlete portals | Manage a small representation practice |
| Agency Growth | Growing agency | 10–20 | All Starter modules, workflow automation, advanced reporting, API/integrations | Agency operating system |
| Premium/Enterprise | Larger agencies or specialized teams | Custom | Custom policies, white-label, advanced governance, onboarding, priority support | Governed NIL infrastructure |

## **Premium modules**

Make premium modules separate entitlement keys rather than hardcoding them to a plan:

* `content_studio_pro`  
* `social_campaigns`  
* `brand_media_kit`  
* `deal_intake_portal`  
* `contract_workspace`  
* `guardian_approval`  
* `compliance_review`  
* `advanced_ai_analysis`  
* `workflow_automation`  
* `custom_branding`  
* `api_access`  
* `audit_export`  
* `advanced_reporting`  
* `white_label_portal`

Example entitlement configuration:

ts  
`export const entitlements = {`  
  `athlete_trial: {`  
    `maxSeats: 1,`  
    `maxAthletes: 1,`  
    `aiActionsMonthly: 30,`  
    `modules: [`  
      `"brand_media_kit",`  
      `"content_studio_basic",`  
      `"deal_intake_portal",`  
    `],`  
  `},`

  `agency_starter: {`  
    `maxSeats: 5,`  
    `maxAthletes: 25,`  
    `aiActionsMonthly: 1500,`  
    `modules: [`  
      `"brand_media_kit",`  
      `"content_studio_pro",`  
      `"deal_intake_portal",`  
      `"contract_workspace",`  
      `"guardian_approval",`  
    `],`  
  `},`

  `agency_growth: {`  
    `maxSeats: 20,`  
    `maxAthletes: 150,`  
    `aiActionsMonthly: 8000,`  
    `modules: [`  
      `"brand_media_kit",`  
      `"content_studio_pro",`  
      `"deal_intake_portal",`  
      `"contract_workspace",`  
      `"guardian_approval",`  
      `"workflow_automation",`  
      `"advanced_ai_analysis",`  
      `"advanced_reporting",`  
      `"audit_export",`  
      `"api_access",`  
    `],`  
  `},`  
`};`

## **Trial and billing flow**

Because you require a credit card, use Stripe Checkout subscription mode with a trial period and automatic conversion to the paid plan unless the customer cancels. Stripe supports free trial periods in subscription flows, and its subscription events should drive access control—not the success redirect in the browser.stripe+1

## **Recommended trial policy**

* **Duration:** 7 days initially. Test 14 days only if onboarding requires more time.  
* **Card:** Required at checkout.  
* **Conversion:** Auto-convert to the selected plan when the trial ends.  
* **Cancellation:** Self-service billing portal; access continues until trial end.  
* **Reminder:** Email and in-app notification 3 days before trial end.  
* **Downgrade:** If canceled before conversion, tenant moves to read-only or limited free access based on your product strategy.  
* **Data retention:** Keep data for a defined period, such as 30–90 days, then delete or anonymize according to your published policy and legal requirements.

Stripe emits `customer.subscription.trial_will_end` three days before a trial ends, which is appropriate for your reminder workflow.

## **Billing lifecycle**

text  
`User selects plan`  
  `→ Stripe Checkout collects payment method`  
  `→ Stripe creates trial subscription`  
  `→ Webhook verifies subscription`  
  `→ Local subscription and entitlements activate`  
  `→ User accesses trial features`  
  `→ Trial reminder at 3 days remaining`  
  `→ Customer cancels or converts`  
  `→ Stripe webhook changes local entitlements`  
  `→ App permits, limits, or revokes feature access`

Never decide plan access from:

* A URL parameter.  
* A `success=true` browser redirect.  
* A plan value stored only in localStorage.  
* An unverified client-side Stripe response.

## **Sensitive-data security design**

Since you will hold minors’ information, contracts, identity-linked profile data, and potentially financial or legal documents, apply the following design from the beginning.

## **Data classification**

| Data class | Examples | Handling rule |
| ----- | ----- | ----- |
| Public | Approved athlete bio, public social links, published media kit | Shareable only after explicit publication |
| Confidential | Agency notes, lead pipeline, pricing, draft proposals | Tenant-only with RLS and audit trail |
| Restricted | Contracts, guardianship documents, minor data, signatures, IDs | Least privilege, audited access, no public URLs |
| Highly restricted | Payment data, credentials, service keys | Never store raw card data; use Stripe; secrets only in server environment |

## **Required controls**

* Enable RLS on every exposed tenant-owned Supabase table. Supabase describes RLS as policy-based, row-level authorization that works with `auth.uid()` and JWT claims.[supabase](https://supabase.com/features/row-level-security)  
* Put `organization_id` on every business record.  
* Store `tenant_id`, actor, target resource, timestamp, IP or request metadata where appropriate in audit events.  
* Use private Supabase Storage buckets for contracts and sensitive uploads.  
* Create short-lived, signed download URLs only after server-side authorization.  
* Keep a database record for every file: owner, organization, classification, access level, retention state, and checksum.  
* Require MFA for agency owners and administrators.  
* Require guardian identity/consent workflow before a minor can independently publish content, accept an offer, or access protected commercial actions.  
* Prevent AI providers from receiving unnecessary documents or personal data; redact or minimize input before processing.  
* Disable public sharing by default for athlete media kits and documents.  
* Use a separate, tightly controlled internal admin system; platform staff must not automatically have access to tenant documents.  
* Encrypt secrets with your cloud providers and keep all secret keys server-side.  
* Establish deletion, retention, consent, incident response, and access-review policies before external launch.

## **Core data model**

Use the following initial relational model.

text  
`users`  
`profiles`  
`organizations`  
`organization_members`  
`organization_modules`  
`subscriptions`  
`subscription_events`  
`entitlements`  
`usage_events`

`athletes`  
`athlete_guardians`  
`athlete_agency_relationships`  
`athlete_social_accounts`  
`athlete_media_kits`  
`athlete_content_assets`  
`content_campaigns`  
`content_generations`

`brand_contacts`  
`brand_opportunities`  
`deal_offers`  
`deal_participants`  
`deal_tasks`  
`deal_messages`  
`deal_documents`  
`contracts`  
`contract_versions`  
`approval_requests`  
`approval_decisions`

`ai_runs`  
`ai_prompt_templates`  
`audit_events`  
`file_records`  
`notifications`

## **Key relationships**

text  
`Organization`  
  `├─ Organization members`  
  `├─ Subscription / Entitlements`  
  `├─ Athlete roster`  
  `│    ├─ Guardian relationships`  
  `│    ├─ Content assets`  
  `│    ├─ Media kit`  
  `│    └─ Agency relationships`  
  `├─ Brand opportunities`  
  `│    └─ Deals / Offers`  
  `│         ├─ Contract versions`  
  `│         ├─ Participants`  
  `│         ├─ Approval requests`  
  `│         └─ Documents`  
  `└─ Audit / AI / Usage events`

For a deal, record a complete event history. Do not overwrite commercially meaningful terms without preserving the previous version.

text  
`Deal created`  
  `→ Offer submitted`  
  `→ Agency qualification completed`  
  `→ Athlete/guardian review requested`  
  `→ Negotiation or revision`  
  `→ Contract uploaded/reviewed`  
  `→ Required approvals captured`  
  `→ Signed or declined`  
  `→ Deliverables tracked`  
  `→ Deal closed`

## **Cline build prompt**

Paste this into your repository after updating `docs/PRODUCT_BRIEF.md`.

bash  
`cline -p "`  
`You are the principal architect for a security-sensitive, production-oriented NIL SaaS.`

`Read:`  
`- docs/PRODUCT_BRIEF.md`  
`- .cline/rules.md`

`Product:`  
`A multi-tenant NIL operating platform. Each tenant is an individual business.`  
`The platform serves two connected experiences:`  
`1. Athlete Brand Studio: multimedia and multimodal content creation, personal-brand development, media kits, social engagement support, opportunity management, and contract visibility.`  
`2. NIL Agency Workspace: athlete roster management, offer/media-deal intake, deal pipeline, contract collaboration, approval workflows, secure document handling, and auditability.`

`Business model:`  
`- A credit-card-required, cancel-anytime trial.`  
`- Plans differentiated primarily by seats and optional premium modules.`  
`- Vercel deployment, Supabase database/auth/storage, Stripe Billing.`  
`- AI provider abstraction with metered AI usage.`

`Sensitive-data scope:`  
`- minors' information`  
`- guardian relationships and approval records`  
`- contracts and deal documents`  
`- sensitive athlete and agency data`

`Non-negotiable requirements:`  
`- organization-based multi-tenancy`  
`- strict RLS on every tenant-owned table`  
`- organization_id on every tenant-owned record`  
`- private storage for sensitive documents`  
`- server-authorized, short-lived signed URLs for protected downloads`  
`- verified Stripe webhooks as billing source of truth`  
`- RBAC for owner, admin, agent, athlete, guardian, member, viewer`  
`- immutable audit events for sensitive actions`  
`- AI usage tracking, rate limits, and plan/module entitlement checks`  
`- AI assists but never autonomously accepts offers, signs contracts, or publishes material content`  
`- human/guardian approval requirements are represented in the workflow`  
`- all protected operations are verified server-side`

`Produce a complete technical blueprint, but do not write code.`  
`Include:`  
`1. Mermaid architecture diagram`  
`2. Roles and permission matrix`  
`3. Database schema and tenant isolation model`  
`4. RLS policy strategy`  
`5. File upload and document security design`  
`6. Billing, trial, and entitlement lifecycle`  
`7. AI orchestration and audit model`  
`8. Deal/contract workflow state machine`  
`9. MVP scope and deliberate exclusions`  
`10. Phased implementation plan with test gates`  
`11. Security and compliance risk register`  
`12. Vercel/Supabase/Stripe deployment plan`  
