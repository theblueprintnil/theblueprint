# Brief: Athletes Landing

- route: `athletes` (`/athletes`)
- status: briefed

## 1. Page definition

| Field | Value |
| --- | --- |
| Route | `/athletes` (landing per page map; directory collision flagged) |
| Title (H1 intent) | Turn your name into a brand sponsors can verify |
| Page-map section | 2. Athlete landing page |
| Primary persona | Athlete |
| Secondary personas | Parent / guardian, manager |
| Conversion goal | Start trial (Athlete Pro) |
| Key message | You control a verified brand profile, a shareable media kit, and every deal and approval — in one workspace that keeps guardians in the loop for minors. |

## 2. Required sections (page map)

| Section | Purpose | Component |
| --- | --- | --- |
| Hero | Convert the athlete | `PageHero` |
| Public-ready brand profile | Verified profile the athlete controls | Card grid |
| Content campaigns & sponsorship pitches | Show how the studio supports brand building | Card grid |
| Shareable media kit | The athlete-controlled brand package | Card grid |
| Deals, offers, contract documents | Organization and visibility | Card grid |
| Guardian / manager / agency access | Permission controls | Custom section |
| Athlete Pro plan compare + trial CTA | Plan + conversion | Plan card + `CtaBand` |

## 3. Component mapping

| Page region | Component | Copy fields |
| --- | --- | --- |
| Hero | `PageHero` | eyebrow, title + accent, description, primary CTA (Start your trial), secondary CTA (Browse the directory) |
| Feature blocks | card grids | title, body (6 features) |
| Access & permissions | custom section | H2, body, 3–4 control bullets |
| Plan block | plan card | name, seat scope, 3 features, CTA |
| Closing | `CtaBand` | headline, subcopy, labels |
| SEO | `Metadata` | title, description ≤ 155 chars |

## 4. Compliance flags

- Guardian consent explicit for minors (permission controls section).
- No eligibility claims; "verification" is identity confirmation only.
- Do not claim AI content generation is live at scale; frame the studio around
  campaign organization and sponsorship-pitch drafting as roadmap/sellable value
  without asserting built automation.
- Plan features must match the Athlete Pro tier (brand studio, media kit,
  1–2 seats).

## 5. Open decisions

- `/athletes` route collision — page-map intent is a landing page; code has the
  marketplace directory here. Content follows page-map intent; full resolution
  is a code change owned by the site owner.
- Directory secondary CTA should re-target once the collision resolves.