# The Blueprint — Content Playbook

A reusable system for creating website content for The Blueprint NIL operating
platform. It produces brand-consistent, compliance-safe, component-ready copy
one page at a time, with approval gates between every stage.

This is the same architectural pattern the Content Engine uses: a lean
orchestrator prompt that loads modular stage prompts on demand, with manual
approval gates. A monolithic 55-page prompt would degrade in quality and become
impossible to resume; this system does not.

## What is inside

```
docs/content-playbook/
├── README.md            ← this file
├── master-prompt.md     ← the orchestrator metaprompt (the only thing loaded at session start)
├── brand-voice.md       ← tone of voice, do/don't, terminology, personas
├── page-index.md        ← the full page inventory, grouped by release, with status
└── hooks/
    ├── HOOK-BRIEF.md       ← page brief, produced before any writing
    ├── HOOK-DRAFT.md       ← component-ready copy, mapped to real UI components
    ├── HOOK-VOICE.md       ← tone validation checklist
    ├── HOOK-COMPLIANCE.md  ← eligibility/legal/guardian/MVP-accuracy validation
    ├── HOOK-GATE.md        ← hard approval pause
    └── HOOK-ARCHIVE.md     ← save approved content, update index, propose next page

content-pack/
├── briefs/              ← one brief per page (generated output)
└── pages/               ← approved, component-ready content per page (generated output)

commands/content.md      ← plain-language runbook: start, resume, approve, commit
```

## How the workflow runs

1. **Start** — load `master-prompt.md` and the reference files it names.
2. **Select a page** — use `page-index.md`; default is the first page in the
   current release group that is not yet `approved`.
3. **HOOK-BRIEF** — produce the page brief and save it to `content-pack/briefs/`.
4. **HOOK-DRAFT** — write the full component-ready copy and save it to
   `content-pack/pages/`.
5. **HOOK-VOICE** and **HOOK-COMPLIANCE** — self-validate against the brand
   voice and the compliance absolutes. Fix failures before proceeding.
6. **HOOK-GATE** — present the page and the validation results to the human.
   Nothing is archived without approval.
7. **HOOK-ARCHIVE** — mark the page approved, update `page-index.md`, propose
   the next page.

One page at a time. Never skip a hook. Never archive past the gate.

## Ground rules

- Content is created for the site as it actually exists today (see the MVP
  feature list in `HOOK-COMPLIANCE.md`). Never promise a capability that is not
  built.
- Compliance absolutes are non-negotiable: no eligibility determinations, no
  legal or tax advice, no automation that replaces human/guardian review.
- Every page's copy must map to a real component schema (`PageHero`,
  `CtaBand`, `LegalDocument`, card grids, `EmptyState`, metadata) so a
  developer can move it into the codebase without rewriting it.

## Current scope

**Release 1 — public/conversion pages (active):**
`/` (homepage refresh), `/athletes`, `/agencies`, `/pricing`, `/security`,
`/how-it-works`.

The remaining pages (auth, onboarding, athlete studio, agency workspace,
guardian portal, settings, platform admin) are inventoried in `page-index.md`
and use the exact same process when their release group becomes active.

## Later upgrade path

If this workflow proves out, the Content Engine could ingest these page files
through its project/API layer. That is a deliberate later step and is out of
scope for the current release.