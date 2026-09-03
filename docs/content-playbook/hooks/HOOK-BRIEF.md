# HOOK-BRIEF — Page Brief

The first hook of every page. No writing happens before this hook produces a
brief.

## When to run

At Step 1 of the master prompt, immediately after selecting the page.

## Required inputs

- Page route and title (from `page-index.md`)
- Page intent and required sections (from the page map)
- Primary persona (from `brand-voice.md` → Personas)
- Any open decisions already tracked for this route

## Process

Produce a brief with exactly these blocks. Fill `{PAGE}` and `{SLUG}`.

### 1. Page definition

| Field | Value |
| --- | --- |
| Route | `{SLUG}` |
| Title (H1 intent) | `{PAGE}` |
| Page-map section | Which numbered section of the page map covers this page |
| Primary persona | One persona this page converts |
| Secondary personas | Who else reads it |
| Conversion goal | The single action this page drives (e.g., start trial, book demo, browse directory) |
| Key message | One sentence the page must land |

### 2. Required sections

List every section the page map requires, in order. For each: section name,
purpose, and the component schema it will use.

### 3. Component mapping

| Page region | Component | Copy fields needed |
| --- | --- | --- |
| Hero | `PageHero` | eyebrow, title (with accent span), description, primary CTA, secondary CTA |
| Body blocks | card grid / custom sections | card arrays (title, body, optional CTA) |
| Legal-style pages | `LegalDocument` | title, updated, intro, sections[{heading, paragraphs}] |
| Closing CTA | `CtaBand` | headline, subcopy, primary link label, secondary link label |
| SEO | `Metadata` | title (template appends " — The Blueprint"), description ≤ 155 chars |

### 4. Compliance flags

State which compliance absolutes are relevant to this page (eligibility,
guardian consent, disclosures, data handling) and how the copy will respect
them. Default: "No eligibility or legal claims; human/guardian review framing."

### 5. Open decisions

List anything ambiguous (route collision, missing feature, unverified claim)
and the chosen working assumption. These roll up into `page-index.md`.

## Output

Save to `content-pack/briefs/{SLUG}.md` with the blocks above complete.

## Definition of done

- Every required section from the page map is accounted for.
- Every content region names a real component and its copy fields.
- Compliance flags are explicit.
- Open decisions are recorded, not hidden.

After saving, pause briefly so the human can correct scope before drafting.