# Brief: Homepage

- route: `index` (`/`)
- status: briefed

## 1. Page definition

| Field | Value |
| --- | --- |
| Route | `/` |
| Title (H1 intent) | Build your NIL brand. Manage your NIL business. |
| Page-map section | 1. Homepage |
| Primary persona | Mixed — athlete recruit and agency/brand decision-maker |
| Secondary personas | Guardian, brand manager |
| Conversion goal | Start the 7-day trial |
| Key message | One platform covers both sides of NIL: athletes build verified brands, brands and agencies run compliant deals — same workspace, audited end to end. |

## 2. Required sections (page map)

| Section | Purpose | Component |
| --- | --- | --- |
| Hero | State the two-sided value; split audience entry | `PageHero` |
| Two entry points | "I'm an Athlete" / "I'm an Agency" | Audience cards |
| Athlete capabilities | content, media kits, sponsorship readiness, deal visibility | Card grid |
| Agency capabilities | roster, intake, negotiations, contracts, approvals | Card grid |
| How it works | 3-step core flow | Steps band |
| Compliance band | disclosure is a workflow, not an afterthought | Custom section |
| Security section | private data, controlled sharing, audit trails, guardian workflows | Custom section |
| Pricing preview | 4-plan teaser pointing at /pricing | Card grid |
| Closing CTA | Start your trial | `CtaBand` |

## 3. Component mapping

| Page region | Component | Copy fields |
| --- | --- | --- |
| Hero | `PageHero` | eyebrow, title + accent, description, primary CTA (Start your trial), secondary CTA (Browse athletes) |
| Two entry points | audience cards | eyebrow, title, body, href, cta |
| How it works | steps band | step number, title, body |
| Compliance | custom band | eyebrow, H2, body, 3 guardrail cards, link |
| Pricing preview | 4 plan cards | plan name, price/seat summary, 3 features, CTA |
| Closing | `CtaBand` | headline, subcopy, primary & secondary link labels |
| SEO | `Metadata` | title, description ≤ 155 chars |

## 4. Compliance flags

- No eligibility or legal claims. "Compliance-ready" framing only.
- Guardian-consent framing present in the security section (minors).
- Stats band ("2,400+ verified athletes") is demo copy — flag for replacement.
- CTA to "Browse athletes" targets the directory at `/athletes`; landing-page
  collision noted under open decisions.

## 5. Open decisions

- `/athletes` route collision (landing vs. directory) — homepage secondary CTA
  keeps pointing at the live directory path for now.
- Stats band numbers are illustrative demo copy; needs real metrics or removal.