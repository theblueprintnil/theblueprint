# HOOK-GATE — Human Approval Gate

The fifth hook. Nothing is archived without the human's explicit approval.

## When to run

At Step 5 of the master prompt, after HOOK-VOICE and HOOK-COMPLIANCE pass.

## Process

Present to the human, for the single page under work:

1. **Page summary** — route, title, conversion goal, primary persona.
2. **Copy highlights** — the H1 claim, the description, the CTA labels, one or
   two representative body cards.
3. **Component mapping** — confirm every content region maps to a real
   component and that `metadata.title`/`description` are present.
4. **Validation results** — voice-check and compliance-check status.
5. **Open decisions raised by this page** — list them verbatim.

Then **stop**. Do not generate the next page, do not update the index, do not
save anything new. Wait for one of:

| Human choice | Meaning |
| --- | --- |
| **Approve** | Proceed to HOOK-ARCHIVE. |
| **Revise** | Human gives specific edits → return to HOOK-DRAFT, re-run HOOK-VOICE and HOOK-COMPLIANCE, then present again at this gate. |
| **Reject** | Page is abandoned or deferred → mark it `not-started` with a deferred note in `page-index.md` and select the next page. Do not archive. |

## Definition of done

The human has explicitly approved, revised, or rejected the page. No other
outcome allows the workflow to continue.