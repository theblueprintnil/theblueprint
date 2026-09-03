# HOOK-ARCHIVE — Save, Index, and Advance

The sixth hook. Locks in approved content and prepares the next page.

## When to run

At Step 6 of the master prompt, only after the human chooses Approve at
HOOK-GATE.

## Process

1. **Finalize the page file**
   In `content-pack/pages/{SLUG}.md`, update the front matter:

   ```
   status: approved
   route: {SLUG}
   approved-date: YYYY-MM-DD
   voice-check: passed
   compliance-check: passed
   gate: approved
   ```

2. **Update the page index**
   In `docs/content-playbook/page-index.md`, set the page's status to
   `approved`. If any open decisions were resolved, update the Open decisions
   section (leave unresolved ones with their working assumption).

3. **Record decisions**
   Append any new open decisions raised during this page to the brief and to
   `page-index.md` Open decisions.

4. **Propose the next page**
   State the next target: the first page in the active release group whose
   status is not `approved`. Confirm it with the human before continuing.

## Definition of done

- Page file front matter reads `approved`.
- `page-index.md` reflects approval for this page.
- Open decisions are current.
- The next page is named and confirmed.