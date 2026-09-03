# Brief: Security & Trust

- route: `security` (`/security`)
- status: briefed

## 1. Page definition

| Field | Value |
| --- | --- |
| Route | `/security` |
| Title (H1 intent) | Built for trust. Because your deals and your minors are on the line. |
| Page-map section | 5. Security and trust |
| Primary persona | Cautious decision-maker (guardian, agency owner, compliance lead) |
| Secondary personas | Brand legal, athlete |
| Conversion goal | Build trust → start trial |
| Key message | Tenant isolation, role-based access, private document handling, and immutable audit trails protect every contract and every minor on the platform. |

## 2. Required sections (page map)

| Section | Purpose | Component |
| --- | --- | --- |
| Hero | Trust framing | `PageHero` |
| Tenant data isolation | Each business's data separated | Feature card grid |
| Role-based access | Owner/admin/member/viewer model | Feature card grid |
| Private document handling | Server-authorized sharing | Feature card grid |
| Guardian & consent workflows | Minor protections | Feature card grid |
| Audit trails | Append-only event history | Feature card grid |
| Data retention & deletion | Published schedule + deletion requests | Feature card grid |
| Security contact | Reporting channel | Custom section |
| Legal links | Privacy, terms, acceptable-use, DPA | Link band |

## 3. Component mapping

| Page region | Component | Copy fields |
| --- | --- | --- |
| Hero | `PageHero` | eyebrow, title + accent, description, primary CTA (Start your trial) |
| Feature blocks | card grid | 6 cards: title, body |
| Contact | custom section | H2, body, contact CTA |
| Legal links | link band | 4 labeled `Link`s |
| Closing | `CtaBand` | headline, subcopy, labels |
| SEO | `Metadata` | title, description ≤ 155 chars |

## 4. Compliance flags

- Security claims must match the implemented controls (RLS tenant isolation,
  role matrix, private storage with server-authorized signed URLs, audit events
  for sensitive actions, retention schedule). Do not claim certifications
  (SOC 2, HIPAA) that do not exist.
- Data retention/deletion wording consistent with the privacy policy.
- Guardian-consent framing present for minors.
- No eligibility/legal claims.

## 5. Open decisions

- Security contact method is not defined in code; use a generic contact CTA and
  flag for the owner to wire up.
- Acceptable-use policy and data-processing terms do not exist as pages yet —
  link to the terms/privacy that exist, flag the rest as planned.