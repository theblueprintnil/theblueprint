# HOOK-COMPLIANCE — Compliance & Accuracy Validation

The fourth hook. Enforces the hard rules and the MVP-accuracy ceiling.

## When to run

At Step 4 of the master prompt, after HOOK-VOICE passes.

## MVP feature ceiling

The draft may only claim capabilities that exist in the current build. The
feature list:

- Athlete: verified-ish profile inputs captured, media kit, opportunity inbox,
  deal visibility, approvals, documents.
- Agency: roster, deal pipeline stages, contract/store, tasks, approvals,
  dashboards.
- Guardian: linked accounts, approval queue, document review, consent.
- Onboarding: workspace type, athlete/agency setup, plan, completion.
- Billing: 7-day trial (card required, cancel anytime), Stripe-backed plans
  (Athlete Pro, Agency Starter, Agency Growth), premium modules are plan
  labels, not built features.
- Security: tenant isolation (RLS), role-based access, private document
  storage, audit trails.

Not yet built (do NOT claim): public API, white-label, custom reports,
automation/advanced analytics, AI content generation at scale, compliance
filing.

## Absolute rules (fail = return to HOOK-DRAFT)

| # | Rule |
| --- | --- |
| 1 | Never assert a deal or athlete is NCAA/school/conference eligible or compliant. |
| 2 | Never provide legal, tax, or eligibility advice; always defer to qualified professionals. |
| 3 | Never claim the platform files disclosures or submits paperwork on behalf of anyone. |
| 4 | Never claim automated processes replace human or guardian review or sign-off. |
| 5 | For minors: commercial activity requires guardian consent; copy must state or imply consent workflows, never bypass them. |
| 6 | Never invent or imply product capabilities outside the MVP ceiling above. |
| 7 | "Verification" describes identity-confirmation on the platform only, never eligibility. |
| 8 | "Readiness scores" (if referenced) are profile-completeness indicators, never compliance ratings. |
| 9 | No invented statistics presented as real. Demo copy must be flagged. |
| 10 | Disclaimers present where pages touch rules: footer disclaimer, compliance intro, security/trust claims. |

## Process

1. Read the MVP ceiling and absolute rules.
2. Read the draft at `content-pack/pages/{SLUG}.md`.
3. For every claim, trace it to a feature in the ceiling or to the disclaimer
   of a rule. Untraceable claims fail.
4. If any item fails, annotate the draft with the failure and return to
   HOOK-DRAFT. Do not proceed on a failing page.
5. Record the result:

```
compliance-check: passed
```

## Definition of done

All absolute rules pass and the front matter records the result.