# index

- status: drafted
- route: `/`
- voice-check: passed
- compliance-check: passed

## Metadata

```
title: The Blueprint — NIL Operating Platform
description: Athletes build verified brands. Brands and agencies run compliant NIL deals. The two-sided operating platform for name, image, and likeness.
```

## PageHero

```
eyebrow: Two-sided NIL operating platform
title: Build your NIL brand.
       <accent>Manage your NIL business.</accent>
description: One platform where athletes publish verified brands, brands discover the right partners, and every deal moves from brief to disclosure with compliance guardrails intact.
primary-cta: { label: Start your trial, href: /signup }
secondary-cta: { label: Browse athletes, href: /athletes }
```

Microcopy under CTAs: `7-day trial · credit card required · cancel anytime`

## Section: Two entry points

```
purpose: Split the audience into clear paths
component: audience cards (2)
copy:
- card 1
  eyebrow: For Athletes
  title: Build a brand sponsors can verify
  body: A verified profile and shareable media kit with real audience numbers. Get discovered by brands looking for fit, not just follower counts.
  href: /athletes
  cta: Build your brand
- card 2
  eyebrow: For Agencies & Brands
  title: Run compliant deals end to end
  body: Intake athletes and offers, manage a deal pipeline, and keep every contract and approval organized and audit-ready from one workspace.
  href: /agencies
  cta: Run your roster
```

## Section: How it works

```
purpose: Explain the core three-step flow
component: steps band (3)
steps:
- 1 | Create your profile | Athletes publish a verified brand profile and media kit. Agencies set up a workspace with their roster.
- 2 | Discover and connect | Brands and agencies search verified profiles by sport, school, audience, and interests. Athletes review every inquiry in their inbox.
- 3 | Deal, disclose, deliver | Negotiate terms, manage contracts and deliverables, and keep every disclosure audit-ready from one workspace.
```

## Section: Athlete capabilities

```
purpose: Show what athletes get (content, media kits, sponsorship readiness, deal visibility)
component: card grid (4)
cards:
- Verified brand profile | Your sport, school, audience, and story in one profile sponsors can assess without guessing.
- Shareable media kit | The brand package you control — bio, highlights, audience numbers, portfolio — with sharing links you can revoke anytime.
- Sponsorship readiness | A profile completeness view that shows you where your brand package stands before you approach brands.
- Deal visibility | Offers, contracts, and approvals organized and searchable, with every step documented.
```

## Section: Agency and brand capabilities

```
purpose: Show what agencies and brands get (roster, intake, negotiations, contracts, approvals)
component: card grid (4)
cards:
- Athlete roster | Every athlete's profile, brand, and deals in one place.
- Opportunity intake | Structured capture for incoming offers and leads. Nothing gets lost in email.
- Negotiations and contracts | Move deals through pipeline stages with versioned contracts and secure documents.
- Approvals | Guardian and client approvals requested, recorded, and never bypassed.
```

## Section: Security

```
purpose: Private data, controlled sharing, audit trails, guardian workflows
component: card grid (4)
cards:
- Tenant data isolation | Each athlete and agency business is a tenant; data is isolated, never shared across workspaces.
- Controlled sharing | Sensitive documents and media kits are shared only through server-authorized, expiring links.
- Audit trails | Sensitive actions are written to an append-only log with the actor and the timestamp.
- Guardian workflows | For minors, commercial activity requires guardian consent. Approvals are requested and recorded.
```

## Section: Compliance band

```
purpose: Disclosure is a workflow, not an afterthought
component: custom compliance band
eyebrow: Compliance framework
title: Disclosure is a workflow, not an afterthought
body: Every deal carries disclosure checkpoints, verification status, and an audit trail. We help you stay organized — we never make eligibility determinations for you.
cards:
- Verification | School, sport, and eligibility context on every profile.
- Disclosure | Required-tag workflows and reminders per deal and platform.
- Guardrails | State, school, and conference rule reminders.
link: { label: Read the compliance guidelines, href: /nil-compliance }
```

## Section: Pricing preview

```
purpose: Tease four plans and drive to /pricing
component: plan cards (4)
cards:
- Trial | 7 days · card required | Full platform access during the trial | CTA: Start your trial
- Athlete Pro | 1–2 seats | Brand studio, media kit, opportunity inbox | CTA: Start your trial
- Agency Starter | 3–5 seats | Deal workspace, contract vault, approvals | CTA: Start your trial
- Agency Growth | 10–20 seats | More seats, premium modules, advanced reporting | CTA: Compare plans
microcopy: Plans and modules are confirmed in your workspace at signup.
link: { label: See full pricing, href: /pricing }
```

## CtaBand

```
headline: Your brand. Your deals. One operating system.
subcopy: Athletes build verified brands. Brands run compliant campaigns. Start your 7-day trial and see it come together.
primary-cta: { label: Start your trial, href: /signup }
secondary-cta: { label: Browse athletes, href: /athletes }
```

## Notes for implementation

- The existing homepage already uses hero-gradient, audience cards, steps band,
  compliance band, and CtaBand. This content is a targeted refresh: audience
  card 2 and the agency capabilities are new; security and pricing-preview
  sections are new; stats band is removed or blanked (demo numbers).
- Replace/remove the demo stats band ("2,400+ verified athletes") before launch.