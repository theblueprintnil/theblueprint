# Brief: How It Works

- route: `how-it-works` (`/how-it-works`)
- status: briefed

## 1. Page definition

| Field | Value |
| --- | --- |
| Route | `/how-it-works` |
| Title (H1 intent) | From first profile to final disclosure |
| Page-map section | Public/conversion group: How It Works branch off the homepage |
| Primary persona | Prospect evaluating the platform |
| Secondary personas | Athlete, agency owner, guardian |
| Conversion goal | Start the 7-day trial |
| Key message | The platform works because the three-step core flow is the same for both sides: create a verified profile, discover and connect, then deal, disclose, and deliver — with every step recorded. |

## 2. Required sections

| Section | Purpose | Component |
| --- | --- | --- |
| Hero | Framing | `PageHero` |
| Core 3-step flow | Create / discover / deal | Steps band |
| Athlete path | What an athlete does step by step | Role tabs / cards |
| Agency/brand path | What an agency or brand does step by step | Role tabs / cards |
| Guardian role | How guardians stay in the loop | Custom section |
| Compliance note | Disclosure is built into the workflow | Compliance band |
| Closing CTA | Start the trial | `CtaBand` |

## 3. Component mapping

| Page region | Component | Copy fields |
| --- | --- | --- |
| Hero | `PageHero` | eyebrow, title + accent, description, primary CTA, secondary CTA (Browse athletes) |
| Steps | steps band | step number, title, body |
| Role paths | card grid columns | role name, 3–4 step lines each |
| Guardian | custom section | H2, body, 2–3 bullets |
| Compliance | compliance band | eyebrow, H2, body, guardrail cards |
| Closing | `CtaBand` | headline, subcopy, labels |
| SEO | `Metadata` | title, description ≤ 155 chars |

## 4. Compliance flags

- No eligibility/legal claims. Disclosure framing consistent with compliance
  page.
- Guardian role path reflects the consent/approval workflow for minors.
- Mirror the homepage's step language so both pages stay consistent.

## 5. Open decisions

- No collisions. Reuses existing homepage content patterns to stay consistent.