# The Blueprint - AI assist layer

> entityType: domain-module

## Observations

- Public surface lib/ai/index.ts exports runAiAction, estimateCost, provider types, prompt registry, and actions summarizeOpportunity/generateMediaKitBio/reviewDeal
- Provider adapters: anthropic, openai, and mock, selected through providers/registry; PII redaction in redaction.ts; rate-limit.ts; errors.ts with SafeAiError codes
- AiRun model records status/kind/featureKey/model/tokens/cost/policySnapshotId/reviewRequired/approvalStatus
- Assist-only policy: AI summarizes, drafts, and reviews but never accepts offers or signs contracts; reviewRequired/reviewerId gate material decisions

## Relations

**Outgoing**

- `metered-by` → [[The Blueprint - Billing & Stripe]]
- `constrained-by` → [[The Blueprint - Authorization sequence rule]]

**Incoming**

- `tests` ← [[The Blueprint - Vitest unit suite]]
- `supports` ← [[headroom-ai-install]]