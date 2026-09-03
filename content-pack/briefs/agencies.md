# Brief: Agencies Landing

- route: `agencies` (`/agencies`)
- status: briefed

## 1. Page definition

| Field | Value |
| --- | --- |
| Route | `/agencies` |
| Title (H1 intent) | Run your entire NIL roster from one deal pipeline |
| Page-map section | 3. Agency landing page |
| Primary persona | Agency owner / representation business |
| Secondary personas | Agent, coordinator, compliance lead |
| Conversion goal | Start trial (Agency Starter) or book a demo |
| Key message | Intake athletes, qualify offers, move deals through an audited pipeline, and keep contracts and approvals in one secure vault — with guardians in the loop. |

## 2. Required sections (page map)

| Section | Purpose | Component |
| --- | --- | --- |
| Hero | Convert the agency | `PageHero` |
| Athlete roster | Central athlete management | Card grid |
| Lead & offer intake | Capture incoming opportunities | Card grid |
| Deal pipeline & negotiation | Move deals through stages | Custom section |
| Secure contract vault | Contract organization & access control | Card grid |
| Athlete portal & guardian approvals | Collaboration across roles | Card grid |
| Seat-based pricing & premium modules | Plan upsell | Plan card |
| Book demo + start trial | Conversion | CTAs |

## 3. Component mapping

| Page region | Component | Copy fields |
| --- | --- | --- |
| Hero | `PageHero` | eyebrow, title + accent, description, primary CTA (Start your trial), secondary CTA (Book a demo) |
| Feature blocks | card grids | title, body (6 features) |
| Pipeline | custom staged band | stage names + one-line descriptions |
| Plan block | plan card | name, seats, core features, CTA |
| Closing | `CtaBand` | headline, subcopy, labels |
| SEO | `Metadata` | title, description ≤ 155 chars |

## 4. Compliance flags

- No eligibility or legal claims; contracts/disclosure review stays human.
- Guardian-consent workflow mentioned as part of the athlete portal.
- Premium modules (compliance, white-label, API, audit exports) are plan labels;
  do not present white-label/API as live features.
- Plan features match Agency Starter (deal workspace, contract vault, 3–5 seats).

## 5. Open decisions

- No route collisions. Plan-name drift between page map and billing module
  (Starter/Growth/Premium) tracked — marketing uses page-map tiers, billing
  labels confirmed at signup.
- "Book a demo" has no destination route yet; use as secondary CTA label only
  (target a contact link when created).