# HOOK-VOICE — Brand Voice Validation

The third hook. Validates the draft against `brand-voice.md`.

## When to run

At Step 3 of the master prompt, immediately after the draft is saved.

## Process

Read the draft at `content-pack/pages/{SLUG}.md` and mark every item Pass/Fail.
Fix failures in the draft file *before* continuing; do not accumulate them for
later.

## Checklist

| # | Check | Pass / Fail |
| --- | --- | --- |
| 1 | No exclamation points in any copy string (brand-approved ones do not exist yet) | |
| 2 | No hype words: revolutionary, game-changing, #1, guaranteed, unstoppable, insane | |
| 3 | No invented statistics; homepage stats band flagged separately as demo copy | |
| 4 | Sentence length: mostly short declarative sentences, at most one clause | |
| 5 | Terminology matches the glossary (media kit, verification, deal pipeline, disclosure, guardian consent, compliance guardrails, trial) | |
| 6 | No new product nouns invented (e.g., "brand OS", "deal room") without glossary update | |
| 7 | Copy leads with outcome, then feature | |
| 8 | Compliance-aware framing where the page touches rules ("we help you stay organized", "platform is not the authority") | |
| 9 | Identity consistent with the one-line identity (two-sided operating platform) | |
| 10 | Headline follows the accepted pattern (eyebrow → claim with accent → description → two CTAs) | |

## Scoring

All ten items must pass. Any fail → edit the draft, re-run the checklist.
Record the result in the page file front matter:

```
voice-check: passed
```

## Definition of done

All 10 items pass and the front matter records the result.