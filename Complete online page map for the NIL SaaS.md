# Complete online page map for the NIL SaaS

Below is a complete online page map for the NIL SaaS. It is designed as one application with role-aware experiences for athletes, guardians, agencies, and later brand partners—rather than separate disconnected products.

flowchart TD  
    A\[Public Website\] \--\> B\[Sign Up / Start Trial\]  
    A \--\> C\[Log In\]  
    B \--\> D\[Stripe Checkout: Card Required\]  
    D \--\> E\[Workspace Onboarding\]  
    C \--\> F{Role and Workspace Context}

    E \--\> F

    F \--\> G\[Athlete Brand Studio\]  
    F \--\> H\[Agency Workspace\]  
    F \--\> I\[Guardian Portal\]  
    F \--\> J\[Platform Admin\]

    G \--\> G1\[Athlete Dashboard\]  
    G \--\> G2\[My Brand Profile\]  
    G \--\> G3\[Content Studio\]  
    G \--\> G4\[Media Kit\]  
    G \--\> G5\[Opportunities\]  
    G \--\> G6\[Deals and Contracts\]  
    G \--\> G7\[Team and Access\]  
    G \--\> G8\[Billing and Settings\]

    H \--\> H1\[Agency Dashboard\]  
    H \--\> H2\[Athlete Roster\]  
    H \--\> H3\[Athlete Detail Workspace\]  
    H \--\> H4\[Deal Pipeline\]  
    H \--\> H5\[Opportunity Intake\]  
    H \--\> H6\[Contracts and Documents\]  
    H \--\> H7\[Content and Campaigns\]  
    H \--\> H8\[Agency Team\]  
    H \--\> H9\[Reports and Analytics\]  
    H \--\> H10\[Billing and Settings\]

    I \--\> I1\[Guardian Dashboard\]  
    I \--\> I2\[Dependent Athlete Profile\]  
    I \--\> I3\[Pending Approvals\]  
    I \--\> I4\[Documents and Contracts\]  
    I \--\> I5\[Consent and Permissions\]

    J \--\> J1\[Platform Overview\]  
    J \--\> J2\[Tenant Administration\]  
    J \--\> J3\[Support and Impersonation Controls\]  
    J \--\> J4\[Audit and Security\]  
    J \--\> J5\[Plan and Entitlement Administration\]

## **Navigation system**

Every signed-in page uses a shared application shell:

┌───────────────────────────────────────────────────────────────────┐  
│ Logo │ Workspace Switcher │ Global Search │ Alerts │ Help │ Avatar │  
├───────────────┬───────────────────────────────────────────────────┤  
│ Left Sidebar  │ Page Content                                     │  
│               │                                                   │  
│ Dashboard     │ Header: title, current status, primary action     │  
│ Brand/Studio  │                                                   │  
│ Opportunities │ Main content area                                 │  
│ Deals         │                                                   │  
│ Documents     │                                                   │  
│ Team          │                                                   │  
│ Analytics     │                                                   │  
│ Billing       │                                                   │  
│ Settings      │                                                   │  
└───────────────┴───────────────────────────────────────────────────┘

The workspace switcher is critical. A user may be an athlete with a personal workspace, an agency team member, and a guardian. The current organization and role determine what data and actions are available.

## **Public and conversion pages**

flowchart LR  
    A\[Homepage\] \--\> B\[How It Works\]  
    A \--\> C\[For Athletes\]  
    A \--\> D\[For NIL Agencies\]  
    A \--\> E\[Pricing\]  
    A \--\> F\[Security and Trust\]  
    A \--\> G\[Resource Center\]  
    A \--\> H\[Sign In\]  
    A \--\> I\[Start Trial\]

    I \--\> J\[Choose Plan\]  
    J \--\> K\[Create Account\]  
    K \--\> L\[Stripe Checkout\]  
    L \--\> M\[Trial Confirmation\]  
    M \--\> N\[Workspace Onboarding\]

### **1\. Homepage — `/`**

**Purpose:** Explain the two-sided platform and move qualified users to a card-required trial.

Primary sections:

* Hero: “Build your NIL brand. Manage your NIL business.”  
* Two entry points: **I’m an Athlete** and **I’m an Agency**.  
* Athlete capabilities: content, media kits, sponsorship readiness, deal visibility.  
* Agency capabilities: athlete roster, opportunity intake, negotiations, contracts, approvals.  
* Security section: private data, controlled sharing, audit trails, guardian workflows.  
* Pricing preview.  
* Call to action: **Start your trial**.

### **2\. Athlete landing page — `/athletes`**

**Purpose:** Convert individual athletes, parents, or managers.

Key blocks:

* Create a public-ready personal brand profile.  
* Generate content campaigns and sponsorship pitches.  
* Build a shareable media kit.  
* Organize deals, offers, and contract documents.  
* Invite a guardian, manager, or agency with permission controls.  
* Athlete Pro plan comparison and trial CTA.

### **3\. Agency landing page — `/agencies`**

**Purpose:** Convert agencies and representation businesses.

Key blocks:

* Agency athlete roster.  
* Lead and offer intake.  
* Deal pipeline and negotiation management.  
* Secure contract vault.  
* Athlete portal and guardian approvals.  
* Seat-based pricing and premium module upsells.  
* Book demo and start-trial paths.

### **4\. Pricing — `/pricing`**

┌─────────────────────────────────────────────────────────────────┐  
│ Plans                                                          │  
├──────────────┬───────────────┬────────────────┬─────────────────┤  
│ Trial        │ Athlete Pro   │ Agency Starter │ Agency Growth   │  
│ 7 days       │ 1–2 seats     │ 3–5 seats      │ 10–20 seats     │  
│ Card needed  │ Brand Studio  │ Deal Workspace │ Automation/API  │  
│ Cancel anytime│ Media kit    │ Contract vault │ Analytics       │  
├──────────────┴───────────────┴────────────────┴─────────────────┤  
│ Premium Modules: compliance, white-label, API, audit exports    │  
└─────────────────────────────────────────────────────────────────┘

The page should clearly show:

* Trial duration.  
* Card-required condition.  
* Auto-conversion date and billing terms.  
* Cancellation flow.  
* Seat count.  
* Included AI credits.  
* Module availability.  
* Overages/add-on policy if applicable.

### **5\. Security and trust — `/security`**

This is a conversion page and a necessary trust asset because you handle contracts and minor data.

Sections:

* Tenant data isolation.  
* Role-based access.  
* Private document handling.  
* Guardian and consent workflows.  
* Audit trails.  
* Data retention and deletion approach.  
* Security-contact channel.  
* Links to privacy policy, terms, acceptable-use policy, and data-processing terms.

## **Authentication and onboarding pages**

flowchart TD  
    A\[Create Account\] \--\> B\[Verify Email\]  
    B \--\> C\[Choose Workspace Type\]  
    C \--\> D{Workspace Type}  
    D \--\> E\[Athlete Setup\]  
    D \--\> F\[Agency Setup\]  
    E \--\> G\[Choose Trial Plan\]  
    F \--\> G  
    G \--\> H\[Stripe Checkout\]  
    H \--\> I\[Trial Activated\]  
    I \--\> J\[Invite Team / Guardian / Agency\]  
    J \--\> K\[First Value Action\]

### **6\. Create account — `/signup`**

Fields:

* Name.  
* Email.  
* Password or passwordless authentication.  
* Terms and privacy acknowledgments.  
* Age/guardian qualification question.  
* Intended workspace type: Athlete, Agency, Manager/Parent.

### **7\. Verify email — `/verify-email`**

* Email verification state.  
* Resend verification.  
* Help/support link.  
* Do not allow sensitive document actions until email verification is complete.

### **8\. Select workspace type — `/onboarding/workspace-type`**

┌─────────────────────────────────────────────────────┐  
│ What are you building?                              │  
│                                                     │  
│ \[ Athlete Brand Studio \]                             │  
│ Build your profile, media kit, content, and deals.  │  
│                                                     │  
│ \[ NIL Agency Workspace \]                             │  
│ Manage athletes, opportunities, contracts, team.    │  
│                                                     │  
│ \[ Parent / Guardian \]                                │  
│ Support and approve an athlete's NIL activities.    │  
└─────────────────────────────────────────────────────┘

### **9\. Athlete onboarding — `/onboarding/athlete`**

Collect only what is necessary at first:

* Name and preferred display name.  
* Sport, school, graduation year.  
* State and relevant eligibility context.  
* Age range; if minor, guardian invitation is required.  
* Social channels.  
* Brand interests and content categories.  
* Existing agency relationship, if any.  
* Consent and visibility preferences.

### **10\. Agency onboarding — `/onboarding/agency`**

Fields:

* Business/legal name.  
* Brand name.  
* Primary contact.  
* Website and operating state(s).  
* Agency type and athlete count.  
* Primary use case: talent management, outreach, contracting, campaign operations.  
* Invite initial team members.  
* Optional initial roster import.

### **11\. Choose plan — `/onboarding/plan`**

* Recommended plan based on workspace type.  
* Seat selector for agency plans.  
* Premium modules as optional add-ons.  
* Clear trial terms.  
* “Continue to secure checkout.”

### **12\. Secure trial checkout — Stripe-hosted**

Do not recreate payment fields inside your app. Send the customer to Stripe Checkout.

Your app passes:

Tenant ID  
Selected plan price ID  
Seat quantity  
Selected premium modules  
Trial duration  
Success URL  
Cancel URL  
Customer email

Stripe should collect the card and create the subscription trial. Your Stripe webhook activates the local tenant entitlements after server-side verification. Stripe documents Checkout-based trials separately from its newer Trial Offer API, so use the subscription-trial integration appropriate to your selected Checkout implementation. [docs.stripe](https://docs.stripe.com/billing/subscriptions/trials/free-trials)

### **13\. Trial activated — `/onboarding/complete`**

This page should show:

* Trial start and end date.  
* Selected plan.  
* Seat count.  
* Included modules.  
* AI usage allowance.  
* “Cancel anytime” billing management route.  
* First-action CTA based on workspace.

For athletes: **Build your media kit.**

For agencies: **Add your first athlete** or **create your first opportunity.**

## **Athlete Brand Studio pages**

flowchart TD  
    A\[Athlete Dashboard\] \--\> B\[My Brand Profile\]  
    A \--\> C\[Content Studio\]  
    A \--\> D\[Media Kit\]  
    A \--\> E\[Opportunities\]  
    A \--\> F\[Deals\]  
    A \--\> G\[Documents\]  
    A \--\> H\[Approvals\]  
    A \--\> I\[Settings\]

    C \--\> C1\[Content Campaign\]  
    C \--\> C2\[AI Content Generator\]  
    C \--\> C3\[Asset Library\]  
    D \--\> D1\[Media Kit Editor\]  
    D \--\> D2\[Share Settings\]  
    E \--\> E1\[Opportunity Detail\]  
    F \--\> F1\[Deal Room\]

### **14\. Athlete dashboard — `/app/dashboard`**

┌─────────────────────────────────────────────────────────────────┐  
│ Welcome, Athlete Name                              Trial: 5 days │  
├───────────────────┬───────────────────────┬─────────────────────┤  
│ Brand Readiness   │ Opportunities          │ Active Deals        │  
│ Profile: 82%      │ 3 new                 │ 2 require review    │  
│ Media kit: Ready  │ 1 high fit             │ 1 contract pending  │  
├───────────────────┴───────────────────────┴─────────────────────┤  
│ Quick actions:                                                   │  
│ \[Create Content\] \[Update Media Kit\] \[Review Offer\] \[Invite Team\]│  
├─────────────────────────────────────────────────────────────────┤  
│ Upcoming tasks / recent activity / usage balance                 │  
└─────────────────────────────────────────────────────────────────┘

Include:

* Brand-readiness score—not a legal or eligibility determination.  
* Trial status and upgrade CTA.  
* Pending guardian approvals.  
* New offers and contracts requiring attention.  
* AI credits used and remaining.  
* Recent content and performance indicators if integrated.

### **15\. My Brand Profile — `/app/brand/profile`**

Tabs:

* Identity and biography.  
* Sports and athlete highlights.  
* Audience and social accounts.  
* Interests, causes, and brand categories.  
* Portfolio highlights.  
* Availability and collaboration preferences.  
* Privacy and public-sharing preferences.  
* Profile completeness.

The page needs two modes:

* **Edit mode:** private, authenticated.  
* **Preview mode:** exactly what a brand or agency can see.

### **16\. Content Studio — `/app/studio`**

This is the athlete’s AI and multimedia production workspace.

┌────────────────────────────────────────────────────────────────┐  
│ Content Studio                            AI Credits: 22 / 30  │  
├───────────────────┬────────────────────────────────────────────┤  
│ Campaign Brief    │ Draft Canvas                               │  
│ Goal              │ Caption / script / storyboard / images     │  
│ Platform          │                                            │  
│ Audience          │ \[Generate\] \[Regenerate\] \[Save Draft\]       │  
│ Brand Voice       │ \[Send for Review\] \[Add to Campaign\]        │  
│ Content Type      │                                            │  
├───────────────────┴────────────────────────────────────────────┤  
│ Asset Library │ Campaign Calendar │ Saved Templates │ History   │  
└────────────────────────────────────────────────────────────────┘

Subpages:

* `/app/studio/new` — campaign brief and creation workflow.  
* `/app/studio/campaigns` — campaign list and calendar.  
* `/app/studio/campaigns/[id]` — campaign workspace.  
* `/app/studio/assets` — uploaded media, AI outputs, folder/tag system.  
* `/app/studio/templates` — approved prompts and brand templates.  
* `/app/studio/history` — generation history, revisions, usage, approvals.

### **17\. Media Kit — `/app/media-kit`**

Tabs:

* Overview.  
* Athletic highlights.  
* Audience/social metrics.  
* Content portfolio.  
* Brand values and partnership categories.  
* Previous partnerships.  
* Downloadable/exportable version.  
* Share links.  
* Visibility and access controls.

### **18\. Media-kit editor — `/app/media-kit/edit`**

Page elements:

* Drag/reorder sections.  
* Upload hero image and approved video.  
* Add social metrics.  
* Add partnership history.  
* Toggle sections on/off.  
* Preview mobile and desktop.  
* Save version.  
* Request guardian/agency review if required.

### **19\. Share settings — `/app/media-kit/share`**

Must support:

* Private.  
* Link-accessible.  
* Password protected.  
* Expiration date.  
* Recipient/email-restricted access.  
* Watermarked export if enabled.  
* Revoke access.  
* View analytics.  
* Audit log of views/downloads for protected sharing.

### **20\. Opportunities inbox — `/app/opportunities`**

┌────────────────────────────────────────────────────────────────┐  
│ Opportunities                              Filters / Search     │  
├────────────────────────────────────────────────────────────────┤  
│ New: Brand X campaign        $X range      Needs review         │  
│ In Review: Local sponsor     Deliverables  Guardian approval    │  
│ Negotiating: Sports brand    Contract      Agency managing      │  
│ Closed: Past campaign        Completed     Archive              │  
└────────────────────────────────────────────────────────────────┘

Filters:

* Status.  
* Brand category.  
* Compensation range.  
* Deal type.  
* Due date.  
* Agency-managed/self-managed.  
* Guardian approval required.

### **21\. Opportunity detail — `/app/opportunities/[id]`**

Sections:

* Brand/company profile.  
* Opportunity summary.  
* Compensation and deliverables.  
* Dates and obligations.  
* Attached documents.  
* AI-generated summary with source-linked evidence.  
* Fit analysis—clearly labeled as advisory.  
* Questions and comments.  
* Decision controls: request changes, decline, approve for negotiation.  
* Guardian/agency permission status.

### **22\. Athlete deals — `/app/deals`**

A simplified view of the agency deal pipeline centered on the athlete’s own deals.

Columns:

Received → Reviewing → Negotiating → Contract Review  
→ Awaiting Approval → Signed → Active → Completed

### **23\. Athlete deal room — `/app/deals/[id]`**

┌─────────────────────────────────────────────────────────────────┐  
│ Deal: Brand Campaign                         Status: Negotiating │  
├────────────────────┬────────────────────────────────────────────┤  
│ Deal summary       │ Timeline / activity                         │  
│ Compensation       │ Offer received                              │  
│ Deliverables       │ Agent requested revisions                   │  
│ Dates              │ Guardian approval pending                   │  
│ Participants       │ Contract version uploaded                   │  
├────────────────────┴────────────────────────────────────────────┤  
│ Tabs: Overview | Offer | Documents | Messages | Approvals | Log  │  
└─────────────────────────────────────────────────────────────────┘

### **24\. Athlete documents — `/app/documents`**

* Contract folders.  
* Deal documents.  
* Media rights documents.  
* Guardian consent records.  
* Signed agreements.  
* Secure download and upload controls.  
* Version history.  
* Access audit log.

### **25\. Athlete approvals — `/app/approvals`**

* Content approval requests.  
* Deal approval requests.  
* Contract review requests.  
* Guardian-required items.  
* Agency-required items.  
* Approval decisions and timestamps.  
* Decline/revision comments.

## **Agency Workspace pages**

flowchart TD  
    A\[Agency Dashboard\] \--\> B\[Athlete Roster\]  
    A \--\> C\[Opportunity Intake\]  
    A \--\> D\[Deal Pipeline\]  
    A \--\> E\[Contract Workspace\]  
    A \--\> F\[Content and Campaigns\]  
    A \--\> G\[Tasks\]  
    A \--\> H\[Analytics\]  
    A \--\> I\[Team and Access\]

    B \--\> B1\[Athlete Detail\]  
    B1 \--\> B2\[Athlete Profile\]  
    B1 \--\> B3\[Athlete Deals\]  
    B1 \--\> B4\[Athlete Content\]  
    B1 \--\> B5\[Athlete Documents\]  
    C \--\> C1\[New Opportunity\]  
    D \--\> D1\[Deal Detail Room\]  
    E \--\> E1\[Contract Detail\]

### **26\. Agency dashboard — `/app/agency/dashboard`**

┌────────────────────────────────────────────────────────────────┐  
│ Agency Dashboard                         Seats: 3 / 5           │  
├───────────────┬─────────────────┬──────────────┬───────────────┤  
│ Active Roster │ Pipeline Value  │ Open Deals   │ Pending Review │  
│ 18 athletes   │ $XX,XXX         │ 12           │ 4 contracts   │  
├───────────────┴─────────────────┴──────────────┴───────────────┤  
│ Pipeline snapshot                                                │  
│ \[Received\] \[Qualified\] \[Negotiating\] \[Contract\] \[Signed\]        │  
├────────────────────────────────────────────────────────────────┤  
│ Priority alerts: approvals, expiring documents, new offers      │  
├────────────────────────────────────────────────────────────────┤  
│ Quick actions: \[Add Athlete\] \[New Opportunity\] \[Upload Contract\]│  
└────────────────────────────────────────────────────────────────┘

### **27\. Athlete roster — `/app/agency/athletes`**

Table and card views:

* Athlete name.  
* Sport and school.  
* Status.  
* Guardian-required status.  
* Profile completion.  
* Current opportunities.  
* Active deals.  
* Contract status.  
* Agency relationship status.  
* Last activity.

Actions:

* Add athlete.  
* Invite athlete to claim/access their profile.  
* Import athlete list.  
* Assign agent.  
* Archive relationship.  
* Filter by sport, school, status, assigned agent, and location.

### **28\. Add athlete — `/app/agency/athletes/new`**

Steps:

1. Athlete identity and contact information.  
2. Athlete role and agency relationship.  
3. Guardian information if required.  
4. Sport/school profile.  
5. Permissions and consent.  
6. Invite athlete to platform.  
7. Document upload, if necessary.

Do not automatically grant full agency access to athlete data without capturing the representation relationship, dates, and permissions.

### **29\. Athlete detail workspace — `/app/agency/athletes/[id]`**

┌────────────────────────────────────────────────────────────────┐  
│ Athlete: Name │ Sport │ Status │ Assigned Agent │ Profile 82%   │  
├────────────────────────────────────────────────────────────────┤  
│ Tabs: Overview | Brand Profile | Content | Opportunities | Deals │  
│       Contracts | Documents | Guardians | Activity | Permissions │  
├────────────────────────────────────────────────────────────────┤  
│ Current tab content                                             │  
└────────────────────────────────────────────────────────────────┘

Important subpages:

* `/overview` — summary, tasks, brand readiness, deal activity.  
* `/brand` — profile and media kit view.  
* `/content` — athlete-created and agency-approved campaign work.  
* `/deals` — all athlete deal records.  
* `/documents` — secure vault.  
* `/guardians` — guardian relationship and approvals.  
* `/permissions` — agency access scope and relationship dates.  
* `/activity` — audit-friendly history.

### **30\. Opportunity intake — `/app/agency/opportunities`**

This page receives opportunities from internal users, brand contacts, or external intake links.

Views:

* Opportunity inbox.  
* Unassigned leads.  
* Required information alerts.  
* Duplicate detection.  
* Qualification queue.  
* Intake sources.  
* SLA timers.

### **31\. New opportunity — `/app/agency/opportunities/new`**

Fields:

* Brand/business name.  
* Contact information.  
* Campaign type.  
* Eligible athletes or roster criteria.  
* Compensation.  
* Deliverables.  
* Dates and deadlines.  
* Contract/brief attachments.  
* Exclusivity requirements.  
* Usage rights.  
* Geographic requirements.  
* Communication history.  
* Internal assignee.

### **32\. External opportunity intake — `/intake/[agency-slug]`**

A public but protected form for brands or partners.

Requirements:

* Branded agency page.  
* CAPTCHA/rate limits.  
* Required business contact fields.  
* Clear privacy notice.  
* Opportunity requirements.  
* File upload controls.  
* No access to internal agency data.  
* Confirmation screen.  
* Optional account creation only after submission.

### **33\. Deal pipeline — `/app/agency/deals`**

┌─────────────────────────────────────────────────────────────────────────┐  
│ Deal Pipeline  \[New Deal\]  \[Filters\]  \[Search\]                          │  
├──────────┬───────────┬─────────────┬───────────┬─────────┬──────────────┤  
│ Received │ Qualified │ Negotiating │ Contract  │ Approval│ Signed       │  
│ Deal A   │ Deal B    │ Deal C      │ Deal D    │ Deal E  │ Deal F       │  
│ Deal G   │           │             │           │         │              │  
└──────────┴───────────┴─────────────┴───────────┴─────────┴──────────────┘

The board should be accompanied by a list/table mode for agencies that need filtering and reporting.

### **34\. Deal detail room — `/app/agency/deals/[id]`**

This is the commercial control center.

Tabs:

* Overview.  
* Offer terms.  
* Athletes and participants.  
* Negotiation notes.  
* Tasks.  
* Documents.  
* Contract versions.  
* Approvals.  
* Messages.  
* Deliverables.  
* Audit timeline.

Page-level actions:

* Assign owner.  
* Add athlete.  
* Request athlete review.  
* Request guardian approval.  
* Upload revised offer.  
* Create contract review request.  
* Move deal stage only when permitted.  
* Mark declined, canceled, or signed.

### **35\. Contracts workspace — `/app/agency/contracts`**

┌────────────────────────────────────────────────────────────────┐  
│ Contracts                                      \[Upload Contract\]│  
├────────────────────────────────────────────────────────────────┤  
│ Draft │ Review │ Awaiting Approval │ Signed │ Expiring │ Archive │  
├────────────────────────────────────────────────────────────────┤  
│ Search • Athlete • Brand • Date • Contract Type • Status        │  
└────────────────────────────────────────────────────────────────┘

### **36\. Contract detail — `/app/agency/contracts/[id]`**

Sections:

* Contract metadata.  
* Parties and signatories.  
* Version history.  
* Relationship to deal.  
* Secure document preview.  
* Clause/risk extraction, labeled AI-assisted and subject to review.  
* Required approvals.  
* Signing status.  
* Expiration/renewal dates.  
* Access history.  
* Export/download with access controls.

### **37\. Content and campaigns — `/app/agency/content`**

Agency-level visibility into athlete content work.

Views:

* All athletes’ campaigns.  
* Content requiring review.  
* Brand campaign assets.  
* Approved templates.  
* Campaign calendar.  
* Assets and files.  
* Brand-specific approval requirements.

### **38\. Tasks and approvals — `/app/agency/tasks`**

Unified operational queue:

* Assigned tasks.  
* Expiring offers.  
* Missing documents.  
* Pending guardian approvals.  
* Pending athlete reviews.  
* Contract review deadlines.  
* Incomplete onboarding.  
* Content approvals.

### **39\. Agency analytics — `/app/agency/analytics`**

Initial metrics:

* Deal pipeline by stage.  
* Offers received by source.  
* Conversion by athlete.  
* Deal value and estimated revenue.  
* Contract cycle time.  
* Content output and campaign completion.  
* Athlete profile/media-kit readiness.  
* AI usage by feature and team member.  
* Seat utilization.  
* Module utilization.

Avoid presenting AI-scored “athlete value” as a definitive recommendation in the MVP.

### **40\. Agency reports — `/app/agency/reports`**

* Pipeline report.  
* Athlete activity report.  
* Contract status report.  
* Deal revenue report.  
* Compliance/approval completion report.  
* Usage/billing report.  
* Export history.

Premium-gate CSV/PDF exports, custom report scheduling, and audit exports.

## **Guardian portal pages**

flowchart LR  
    A\[Guardian Dashboard\] \--\> B\[Dependent Athletes\]  
    A \--\> C\[Approval Queue\]  
    A \--\> D\[Contracts and Documents\]  
    A \--\> E\[Consent Settings\]  
    A \--\> F\[Account Security\]

### **41\. Guardian dashboard — `/app/guardian/dashboard`**

Show only the guardian’s linked athlete(s):

* Pending approvals.  
* New offers.  
* Contracts requiring review.  
* Content approval requests if configured.  
* Agency relationship changes.  
* Upcoming important dates.

### **42\. Dependent athlete profile — `/app/guardian/athletes/[id]`**

* Read-only or limited-edit profile access.  
* Athlete public media kit preview.  
* Agency relationship status.  
* Content visibility settings.  
* Deals and documents.  
* Permission history.

### **43\. Approval queue — `/app/guardian/approvals`**

┌───────────────────────────────────────────────────────────────┐  
│ Pending Approvals                                               │  
├───────────────────────────────────────────────────────────────┤  
│ Contract review request       Athlete Name      Due: Date       │  
│ Brand campaign approval       Athlete Name      Due: Date       │  
│ Public media-kit sharing      Athlete Name      Due: Date       │  
├───────────────────────────────────────────────────────────────┤  
│ \[Review\] \[Request Changes\] \[Approve\] \[Decline\]                 │  
└───────────────────────────────────────────────────────────────┘

Each approval must record:

* Guardian identity.  
* Scope of approval.  
* Version of the item reviewed.  
* Timestamp.  
* Decision.  
* Comment.  
* Any required reapproval after material changes.

### **44\. Guardian documents — `/app/guardian/documents`**

* Agreements and consent records.  
* Offer attachments.  
* Contract versions.  
* Secure document review.  
* Download restrictions as needed.  
* Audit history.

### **45\. Consent and permissions — `/app/guardian/consent`**

* Who can access athlete information.  
* Agency relationship permissions.  
* Media-kit/public visibility.  
* Content review requirements.  
* Communication preferences.  
* Data retention/deletion requests.  
* Consent version history.

## **Shared administrative pages**

### **46\. Team management — `/app/settings/team`**

Used by athlete businesses and agencies.

* Current members.  
* Seat usage.  
* Invite member.  
* Pending invitations.  
* Role assignment.  
* Remove member.  
* Transfer organization ownership.  
* Require MFA policy.  
* Activity history.

Roles should differ by workspace type:

| Role | Athlete tenant | Agency tenant |
| ----- | ----- | ----- |
| Owner | Athlete, guardian, business owner | Agency owner |
| Admin | Manager/authorized adult | Operations admin |
| Agent | Optional | Manages assigned athletes/deals |
| Athlete | Primary athlete | Athlete portal user |
| Guardian | Approver/limited collaborator | Linked approver |
| Member | Limited collaborator | Coordinator/team member |
| Viewer | Read-only | Read-only reporting or review |

### **47\. Billing and plans — `/app/settings/billing`**

┌────────────────────────────────────────────────────────────────┐  
│ Current Plan: Agency Starter       Trial ends: August XX        │  
├────────────────────────────────────────────────────────────────┤  
│ Seats: 3 of 5                   AI use: 650 of 1,500            │  
│ Modules: Contract Workspace, Guardian Approval                  │  
├────────────────────────────────────────────────────────────────┤  
│ \[Manage Billing\] \[Change Plan\] \[Add Seats\] \[Add Modules\]        │  
├────────────────────────────────────────────────────────────────┤  
│ Payment history | Invoices | Subscription events | Usage        │  
└────────────────────────────────────────────────────────────────┘

Only tenant owners should access this page. The Stripe customer portal should handle payment method updates, subscription cancellation, invoices, and other payment-account actions.

### **48\. Workspace settings — `/app/settings/workspace`**

* Legal business name.  
* Display name and branding.  
* Address and operating states.  
* Notification settings.  
* Default deal settings.  
* Default approval policies.  
* Data retention configuration.  
* Public sharing defaults.  
* Integration settings.  
* API keys if premium-enabled.

### **49\. Security settings — `/app/settings/security`**

* MFA enrollment and enforcement.  
* Active sessions.  
* Device/session revocation.  
* Login history.  
* Team security policy.  
* Data-access notifications.  
* Audit-log access.  
* Security contact.

### **50\. Notifications — `/app/notifications`**

* New offers.  
* Deal assignments.  
* Approval requests.  
* Contract uploads.  
* Trial ending.  
* Payment/billing changes.  
* Team invitations.  
* Security events.  
* Notification channel preferences.

## **Platform operator pages**

These are separate from normal tenant pages and should use a distinct authorization boundary.

flowchart TD  
    A\[Platform Admin Dashboard\] \--\> B\[Tenant Administration\]  
    A \--\> C\[Billing Operations\]  
    A \--\> D\[Support Cases\]  
    A \--\> E\[Security Monitoring\]  
    A \--\> F\[Audit Events\]  
    A \--\> G\[Module Catalog\]  
    A \--\> H\[Feature Flags\]

### **51\. Platform admin dashboard — `/platform-admin`**

* Tenant count.  
* Trial-to-paid conversion.  
* Active subscriptions.  
* AI usage/cost.  
* Error rate.  
* Storage usage.  
* Security alerts.  
* Support queue.

### **52\. Tenant administration — `/platform-admin/tenants`**

* Search tenant.  
* Subscription state.  
* User count.  
* Plan/modules.  
* Support status.  
* Tenant-level audit summary.  
* Suspend/reactivate workflow with reason and audit log.

Do not allow broad document browsing by platform staff. Make privileged access exceptional, time-limited, ticket-linked, and visible in tenant audit logs.

### **53\. Support access request — `/platform-admin/support-access`**

A controlled alternative to unrestricted impersonation:

* Support ticket reference.  
* Tenant approval where possible.  
* Access reason.  
* Approved scope.  
* Expiration.  
* Full activity logging.  
* Automatic revocation.

### **54\. Platform security — `/platform-admin/security`**

* Failed-login patterns.  
* Suspicious downloads.  
* Permission changes.  
* Webhook failures.  
* Storage access anomalies.  
* Admin activity.  
* Security incident workflow.

### **55\. Plans and modules — `/platform-admin/catalog`**

* Stripe price mappings.  
* Plan definitions.  
* Seat rules.  
* Entitlement templates.  
* Premium modules.  
* AI quotas.  
* Feature flags.  
* Trial policy.  
* Controlled promotions.

## **Route structure**

/  
 /athletes  
 /agencies  
 /pricing  
 /security  
 /resources  
 /terms  
 /privacy  
 /acceptable-use  
 /login  
 /signup  
 /verify-email

 /onboarding/workspace-type  
 /onboarding/athlete  
 /onboarding/agency  
 /onboarding/plan  
 /onboarding/complete

 /app/dashboard  
 /app/brand/profile  
 /app/studio  
 /app/studio/new  
 /app/studio/campaigns  
 /app/studio/campaigns/\[campaignId\]  
 /app/studio/assets  
 /app/studio/templates  
 /app/studio/history  
 /app/media-kit  
 /app/media-kit/edit  
 /app/media-kit/share  
 /app/opportunities  
 /app/opportunities/\[opportunityId\]  
 /app/deals  
 /app/deals/\[dealId\]  
 /app/documents  
 /app/approvals  
 /app/notifications

 /app/agency/dashboard  
 /app/agency/athletes  
 /app/agency/athletes/new  
 /app/agency/athletes/\[athleteId\]  
 /app/agency/athletes/\[athleteId\]/brand  
 /app/agency/athletes/\[athleteId\]/content  
 /app/agency/athletes/\[athleteId\]/deals  
 /app/agency/athletes/\[athleteId\]/documents  
 /app/agency/athletes/\[athleteId\]/guardians  
 /app/agency/athletes/\[athleteId\]/permissions  
 /app/agency/opportunities  
 /app/agency/opportunities/new  
 /app/agency/deals  
 /app/agency/deals/\[dealId\]  
 /app/agency/contracts  
 /app/agency/contracts/\[contractId\]  
 /app/agency/content  
 /app/agency/tasks  
 /app/agency/analytics  
 /app/agency/reports

 /intake/\[agencySlug\]  
 /intake/\[agencySlug\]/submitted

 /app/guardian/dashboard  
 /app/guardian/athletes/\[athleteId\]  
 /app/guardian/approvals  
 /app/guardian/documents  
 /app/guardian/consent

 /app/settings/team  
 /app/settings/billing  
 /app/settings/workspace  
 /app/settings/security

 /platform-admin  
 /platform-admin/tenants  
 /platform-admin/support-access  
 /platform-admin/security  
 /platform-admin/catalog

## **Recommended build order**

Do not build all 55 pages at once. Build the page system in these releases.

### **Release 1: Sellable foundation**

* Public homepage, athlete/agency pages, pricing, security page.  
* Sign-up, verification, onboarding, Stripe trial checkout.  
* Athlete and agency dashboards.  
* Athlete profile and media kit.  
* Agency roster and athlete detail workspace.  
* Opportunity intake and basic deal pipeline.  
* Team, billing, workspace settings.  
* Security controls, tenant isolation, audit logs.

### **Release 2: Deal execution**

* Deal detail room.  
* Secure document vault.  
* Contract workspace and version history.  
* Guardian invitations and approvals.  
* Notification center.  
* Public brand/partner intake form.

### **Release 3: AI and content advantage**

* Content Studio.  
* Campaign planning.  
* AI drafting and multimedia asset workflow.  
* Content approvals.  
* AI deal/contract summarization with human review.  
* Usage metering and premium AI modules.

### **Release 4: Scale and differentiation**

* Advanced analytics.  
* Workflow automation.  
* API/integrations.  
* Custom branding and white-label.  
* Platform operations console.  
* Premium reporting and audit exports.

The visual reference below is useful for the athlete media-kit and agency-dashboard direction, but your interface should prioritize permission states, approval queues, secure documents, and deal workflow rather than simply copying a generic dashboard aesthetic.

