# HOOK-DRAFT — Component-Ready Copy

The second hook. Turns the approved brief into full copy structured for the
site's actual React components.

## When to run

At Step 2 of the master prompt, after the brief is saved.

## Required inputs

- The brief at `content-pack/briefs/{SLUG}.md`
- Brand voice, terminology, personas (`brand-voice.md`)
- Component schemas:

| Component | Properties |
| --- | --- |
| `PageHero` | `eyebrow` (kicker), `title` (ReactNode, includes one brand-gradient accent span), `description` (1–2 sentences), `children` (CTA `Link`s) |
| `CtaBand` | Hardcoded headline currently: "Your brand. Your deals. One operating system." + subcopy + primary link label + secondary link label |
| `LegalDocument` | `title`, `updated`, `intro`, `sections: { heading, paragraphs[] }` |
| Marketing page body | Card grids: `eyebrow` label, H2, array of `{ title, body }` (and optional `{eyebrow, title, body, href, cta}` for audience cards) |
| `metadata` | `title` (plain title; template renders "{title} — The Blueprint"), `description` ≤ 155 chars |

## Writing rules

1. Address the brief's primary persona directly in headings and body copy.
2. Use the platform vocabulary from `brand-voice.md`; never invent new product
   nouns.
3. Keep sentences short and concrete. No exclamation points. No hype.
4. Every claim must be traceable to the actual MVP feature list in
   `HOOK-COMPLIANCE.md`. If a brief section asks for something not built, either
   reframe it around what exists or flag it and omit.
5. CTAs: primary = "Start your trial"; secondary varies by page ("Browse
   athletes", "Book a demo", "Read the compliance guidelines").
6. Microcopy qualifiers where accuracy matters: "7-day trial · credit card
   required · cancel anytime".

## Output format

Write `content-pack/pages/{SLUG}.md` with:

```
# {SLUG}

- status: drafted
- route: {SLUG}
- voice-check: pending
- compliance-check: pending

## Metadata
title: ...
description: ...

## PageHero
eyebrow: ...
title: <line-one>
        <accent>...</accent>
description: ...
primary-cta: { label, href }
secondary-cta: { label, href }

## Section: {name}        ← repeat per brief section
purpose: ...
component: {component-name}
copy:
- source: {field or card index}
  text: ...
```

Deliver every copy string verbatim, keyed to the component field it fills, so a
developer can paste directly.

## Definition of done

- Every brief section has copy.
- Every string is mapped to a component field.
- All strings satisfy the basic voice rules (no exclamation points, no hype,
  terminology consistent).
- The file is saved with status `drafted`.