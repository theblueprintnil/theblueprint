# athletes

- status: drafted
- route: `/athletes`
- voice-check: passed
- compliance-check: passed

## Metadata

```
title: For Athletes
description: Build a verified brand profile, a shareable media kit, and an organized record of offers and deals. Guardians stay in the loop for minors.
```

## PageHero

```
eyebrow: For Athletes
title: Your name is a brand.
       <accent>Make it work for you.</accent>
description: Build a verified profile, a media kit you control, and a record of every offer and deal — with guardians in the loop when they need to be.
primary-cta: { label: Start your trial, href: /signup }
secondary-cta: { label: Browse the directory, href: /athletes }
```

Microcopy under CTAs: `7-day trial · credit card required · cancel anytime`

Note: page-map intent is a landing page; the live `/athletes` route is the
marketplace directory. Flagged in Open decisions. Secondary CTA points at the
live directory until the collision is resolved.

## Section: What you build

```
purpose: Core athlete features
component: card grid (6)
cards:
- Verified brand profile | Your sport, school, audience, and story in one profile sponsors can assess without guessing.
- Shareable media kit | A brand package you control — bio, highlights, audience numbers, portfolio, partnership categories. Share with a link and revoke anytime.
- Campaign and pitch drafting | Tools to draft sponsorship pitches and campaign concepts, so you approach brands ready to talk.
- Opportunity inbox | Brand inquiries land in one inbox with fit context you can review before responding.
- Deal and document organization | Offers, contracts, and approvals organized and searchable in one place, with every step documented.
- Access and permissions | Invite a guardian, manager, or agency with permission controls you own.
```

## Section: You decide who sees what

```
purpose: Permission controls and guardian workflow
component: custom section with checklist
eyebrow: Control
title: You decide who sees what
body: Your brand is yours. The platform gives you the controls to share it on your terms.
items:
- Share your media kit with a controlled link and revoke access anytime
- Invite a guardian to approve deals, contracts, and content for minors
- Give agencies or managers exactly the access they need — not more
- Every approval has an author and a timestamp
```

## Section: Athlete Pro plan

```
purpose: Plan comparison + trial CTA
component: plan card
name: Athlete Pro
seats: 1–2 seats
features:
- Brand profile and media kit
- Opportunity inbox
- Deals, documents, and approvals
cta: { label: Start your trial, href: /signup }
microcopy: 7-day trial · credit card required · cancel anytime
```

## CtaBand

```
headline: Your brand. Your deals. One operating system.
subcopy: Build the brand you want sponsors to see, keep every deal organized, and keep your people in the loop.
primary-cta: { label: Start your trial, href: /signup }
secondary-cta: { label: Browse the directory, href: /athletes }
```

## Compliance notes

- "Verified brand profile" refers to identity-confirmation on the platform, not
  eligibility. No claim of NCAA/school/conference approval anywhere.
- Guardian-consent workflow is explicit in the permission section (minors).
- No claim that content generation is automated at scale; framed as drafting
  tools.