# Brief: Pricing

- route: `pricing` (`/pricing`)
- status: briefed

## 1. Page definition

| Field | Value |
| --- | --- |
| Route | `/pricing` |
| Title (H1 intent) | Simple plans for athletes and agencies |
| Page-map section | 4. Pricing |
| Primary persona | Decision-maker (athlete, guardian, agency owner) |
| Secondary personas | Agent coordinator, finance lead |
| Conversion goal | Start the 7-day trial |
| Key message | A card-required, cancel-anytime trial, with plans differentiated by seats and premium modules — no hidden conversion. |

## 2. Required sections (page map)

| Section | Purpose | Component |
| --- | --- | --- |
| Plan table | Trial / Athlete Pro / Agency Starter / Agency Growth | Plan cards grid |
| Trial terms | 7-day duration, card required, auto-conversion, cancellation flow | Terms band |
| Seat counts | 1–2 / 3–5 / 10–20 seats per tier | Part of plan cards |
| AI credits & modules | Included credits + module availability | Plan cards + modules row |
| Premium modules | compliance, white-label, API, audit exports | Modules row (accuracy-gated) |
| FAQ | Trial, billing, cancellation, overages | Accordion list |

## 3. Component mapping

| Page region | Component | Copy fields |
| --- | --- | --- |
| Hero | `PageHero` | eyebrow, title + accent, description, primary CTA (Start your trial) |
| Plan table | 4 plan cards | name, price/seat line, feature list (3–5), CTA |
| Modules | modules row | module name + availability line |
| Terms | terms band | bullet list (trial, conversion, cancel) |
| FAQ | accordion | question + answer pairs |
| Closing | `CtaBand` | headline, subcopy, labels |
| SEO | `Metadata` | title, description ≤ 155 chars |

## 4. Compliance flags

- Premium modules: white-label and API are not built — do not present as live
  features. Label modules accurately and note activation by the platform team.
- No invented pricing/seat claims beyond page-map values.
- Trial terms must match reality: 7-day, card required, cancel anytime,
  auto-converts unless canceled (matches Terms + Billing).
- Plan-name drift (page map Athlete Pro/Agency Starter/Agency Growth vs. billing
  Starter/Growth/Premium) flagged, not silently reconciled.

## 5. Open decisions

- Plan-name drift between marketing tiers and billing module names — confirm the
  canonical public names with the site owner.
- Premium module availability wording must be reviewed before launch (white-label,
  API are Release 4 items).