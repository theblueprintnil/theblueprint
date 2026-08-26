# Product Brief

## Product
[The Blueprint]: AI operating system for [athletes, their guardians, and brand representatives].

## Ideal customer
[Youth athletes who are looking to create and/or enhance their Name, Image, and Likeness brand management business.]

## Core outcome
[Create compliant, reviewable athlete-brand workflows in minutes.]

## Tenant
An organization account. A tenant can have multiple members.

## Initial roles
- owner
- admin
- member
- viewer

## Plans
- demo: 7 days, 1 workspace, 2 users, 25 AI actions
- starter: 5 users, 500 AI actions/month
- growth: 20 users, 3,000 AI actions/month, integrations
- premium: custom seats, custom AI limits, priority support

## Non-negotiables
- Every tenant-owned record has organization_id.
- Every data read/write is tenant-isolated in the database.
- Billing is verified by Stripe webhooks, never browser redirects.
- AI output is logged with tenant, user, model, cost/usage, and request metadata.
- High-risk AI actions require human approval.
- Every consequential AI action must record its source inputs, policy/plan version, human approval state, and audit event.