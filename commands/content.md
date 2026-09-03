# /content — Generate Website Content via the Content Playbook

## Purpose

Run the content workflow in `docs/content-playbook/` to produce brand-consistent,
compliance-safe, component-ready copy for one website page at a time. The
orchestrator is `master-prompt.md`; hooks gate every stage.

## Instructions

1. **Start or resume**
   - Start a fresh run: load `docs/content-playbook/master-prompt.md` and
     follow its Step 0–6 workflow for the first page in the active release group.
   - Resume: read `docs/content-playbook/page-index.md`, find the first page
     whose status is `not-started`, `briefed`, or `drafted`, and continue from
     whichever hook matches the state of `content-pack/` (no brief → HOOK-BRIEF;
     brief but no draft → HOOK-DRAFT; draft but unvalidated → HOOK-VOICE /
     HOOK-COMPLIANCE; validated → HOOK-GATE).
2. **One page per loop.** Run the six hooks in order:
   `HOOK-BRIEF → HOOK-DRAFT → HOOK-VOICE → HOOK-COMPLIANCE → HOOK-GATE →
   HOOK-ARCHIVE`. Do not start a second page until the gate approves the first.
3. **Write artifacts to disk.**
   - brief → `content-pack/briefs/<slug>.md`
   - draft/approved content → `content-pack/pages/<slug>.md`
   - status update → `docs/content-playbook/page-index.md`
4. **Stop at every gate.** Present the page summary, copy highlights, component
   mapping, and validation results, then wait for the human's choice (approve /
   revise / reject).

## Checklist

- [ ] Brief exists in `content-pack/briefs/`
- [ ] Draft exists in `content-pack/pages/`
- [ ] voice-check and compliance-check pass and are recorded
- [ ] Human approved at the gate
- [ ] `page-index.md` shows the page as `approved`
- [ ] Next page proposed and confirmed

## When done (a page is archived)

```
content complete: <slug> approved
```

The next page is the first non-approved page in the active release group.