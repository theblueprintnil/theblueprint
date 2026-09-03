# security

- status: drafted
- route: `/security`
- voice-check: passed
- compliance-check: passed

## Metadata

```
title: Security & Trust
description: Tenant data isolation, role-based access, private document handling, guardian consent workflows, and immutable audit trails.
```

## PageHero

```
eyebrow: Security & trust
title: Built for trust.
       <accent>Hardened for the serious stuff.</accent>
description: The Blueprint handles contracts, minors' data, and approval records. Every design decision starts from what it takes to keep those safe.
primary-cta: { label: Start your trial, href: /signup }
secondary-cta: { label: Read the compliance guidelines, href: /nil-compliance }
```

## Section: How data is protected

```
purpose: Six trust pillars from the page map
component: card grid (6)
cards:
- Tenant data isolation | Each athlete and agency business is a tenant. Data is isolated at the database level, so one workspace can never see another's.
- Role-based access | Owner, admin, member, viewer — every seat gets exactly the permissions the workspace owner grants, nothing more.
- Private document handling | Contracts and sensitive documents are stored privately and shared only through server-authorized, expiring links.
- Guardian and consent workflows | Commercial activity for minors requires guardian consent. Approvals are requested, recorded, and never bypassed.
- Audit trails | Sensitive actions — offers, approvals, contract changes, document access — are written to an append-only log with actor and timestamp.
- Retention and deletion | A published retention schedule governs trial and canceled data; deletion requests are honored except where legally required.
```

## Section: Report a concern

```
purpose: Security contact channel
component: custom section
eyebrow: Contact
title: See something? Say something.
body: If you believe a profile or deal misrepresents eligibility or bypasses consent or disclosure requirements, report it from the deal or profile page, or contact the platform team. Reports are reviewed and may lead to suspension or removal of content that violates the guidelines.
cta: { label: Contact the security team, href: #contact }
```

## Section: Related legal documents

```
purpose: Link the trust docs
component: link band
links:
- Privacy Policy | /privacy
- Terms of Service | /terms
- NIL Compliance & Disclosure Guidelines | /nil-compliance
- Acceptable-use policy | planned — link when published
- Data-processing terms | planned — link when published
```

## CtaBand

```
headline: Your brand. Your deals. One operating system.
subcopy: Private by default. Audited by design. Start your 7-day trial.
primary-cta: { label: Start your trial, href: /signup }
secondary-cta: { label: Read the privacy policy, href: /privacy }
```

## Compliance notes

- Every claim maps to an implemented control: RLS tenant isolation, role
  matrix, private storage with server-authorized signed URLs, immutable audit
  events, published retention policy.
- No certifications (SOC 2, HIPAA) are claimed because none exist.
- Acceptable-use and data-processing pages do not exist; marked as planned links.