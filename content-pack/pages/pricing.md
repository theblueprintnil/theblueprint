# pricing

- status: drafted
- route: `/pricing`
- voice-check: passed
- compliance-check: passed

## Metadata

```
title: Pricing
description: A 7-day, card-required trial for every plan. Cancel anytime. Athlete Pro, Agency Starter, and Agency Growth scale by seats and modules.
```

## PageHero

```
eyebrow: Pricing
title: Plans that grow with
       <accent>your roster.</accent>
description: A 7-day, card-required trial. Cancel anytime. Plans are differentiated by seats and premium modules, with no hidden conversion.
primary-cta: { label: Start your trial, href: /signup }
```

## Section: Plans

```
purpose: Four-tier plan table
component: plan cards (4)
cards:
- Trial
  name: Trial
  price-line: 7 days · card required
  features:
  - Full platform access during the trial
  - Cancel anytime
  cta: { label: Start your trial, href: /signup }

- Athlete Pro
  name: Athlete Pro
  price-line: 1–2 seats
  features:
  - Brand studio and media kit
  - Opportunity inbox
  - Deals, documents, and approvals
  cta: { label: Start your trial, href: /signup }

- Agency Starter
  name: Agency Starter
  price-line: 3–5 seats
  features:
  - Deal workspace
  - Contract vault
  - Approvals and audit trail
  cta: { label: Start your trial, href: /signup }

- Agency Growth
  name: Agency Growth
  price-line: 10–20 seats
  features:
  - More seats for bigger teams
  - Premium module access
  - Advanced reporting
  cta: { label: Contact us, href: #contact }
```

Microcopy under the grid: `Plans and modules are confirmed in your workspace at signup.`

## Section: Premium modules

```
purpose: Module availability (accuracy-gated)
component: modules row
modules:
- Compliance context | Included with Growth; activation confirmed by the platform team.
- Audit exports | Available on paid plans; CSV/PDF export and scheduling roll out progressively.
- White-label | Planned. Not yet available.
- API access | Planned. Not yet available.
note: White-label and API are Release 4 items. Do not present as purchasable today.
```

## Section: Trial and billing terms

```
purpose: Terms clarity
component: terms band
bullets:
- 7-day trial with a credit card required at signup
- Auto-converts to a paid plan unless you cancel before the trial ends
- Cancel anytime from the billing portal; data follows the published retention schedule
- Plans differ by seats and premium modules, not by core workflow
- Included AI credits vary by plan; usage metering is visible in your workspace
- Volume needs beyond a plan tier: contact support for a custom arrangement
```

## Section: FAQ

```
purpose: Answer the common blockers
component: accordion list
faq:
- Q: How does the trial work?
  A: You start a 7-day trial with a card on file. You get full platform access for your workspace type, and you can cancel anytime before the trial ends.
- Q: What happens when the trial ends?
  A: If you have not canceled, the trial converts to the plan you selected and billing begins. We show the conversion date in your workspace before it happens.
- Q: Can I add seats later?
  A: Yes. Seat changes are handled in the billing portal and reflected on the next invoice.
- Q: What are premium modules?
  A: Optional capabilities added to a plan, such as audit exports and compliance context. Availability depends on your plan and is confirmed at signup.
- Q: Can I cancel?
  A: Yes, at any time from the billing portal. Cancellation is effective at the end of your current billing period.
```

## CtaBand

```
headline: Your brand. Your deals. One operating system.
subcopy: Start a 7-day trial. Keep your card, keep your control, cancel anytime.
primary-cta: { label: Start your trial, href: /signup }
secondary-cta: { label: Read the security page, href: /security }
```

## Compliance notes

- White-label and API module features are clearly marked as planned/not
  available, per the MVP ceiling.
- Trial terms match the Terms of Service and billing implementation (7-day,
  card required, auto-convert, cancel anytime).
- Plan-name drift between marketing tiers and billing module names is flagged
  under Open decisions.