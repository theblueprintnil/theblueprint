# Agent Cards — Inventory, Scopes, and Delegation Rules

Every agent that acts on tenant data has an identity, a defined skill set, a minimum
scope set, and a tier restriction. This document is the authoritative inventory; the
published agent card contract is derived from it.

## Card contract

Each agent publishes a card at `/.well-known/agent.json` (platform-level) and, where a
tenant-specific endpoint exists, per tenant. A card carries:

| Field | Meaning |
|---|---|
| `id` | Stable agent identifier, also the JWT `sub` |
| `name` | Human-readable name |
| `version` | Card version, incremented on capability change |
| `publisher` | `platform` for first-party agents, `external` for partner agents |
| `skills` | Declared capabilities, each with a name and input or output shape |
| `scopes` | The scope set the agent may be granted |
| `minTier` | The lowest age tier the agent may serve |
| `delegates` | Agent ids this agent may invoke, or `[]` |
| `maxDepth` | Delegation depth this agent may create, never above the platform cap of 5 |
| `auth` | `jwks` for external, `pem` for internal hops |

A card is a declaration, not a grant. The token's `scopes` claim is authoritative; a
card claiming a scope the token lacks is rejected. Cards are cached with a short TTL
and re-fetched on `kid` mismatch.

## External skill vocabulary

The public card advertises skills, not internal agents, so an external caller names what it
wants done rather than which component does it. Three skills are public:

| Public skill | What it does | Internal agents invoked |
|---|---|---|
| `generate_post` | Produce draft content for a campaign | `content`, then `compliance` |
| `audit_contract` | Evaluate a proposed deal or contract against policy | `compliance` |
| `propose_deal` | Create a deal proposal for review | `orchestrator`, then `content` |

A skill maps to a sequence of internal agents; the mapping is not published. This is the
opaque execution property required by P12: the caller learns the skill contract and the task
lifecycle, never the prompt chain or the agent graph behind it.

## Platform agents

| Agent | Purpose | Skills | Scopes | Min tier | May delegate to |
|---|---|---|---|---|---|
| `orchestrator` | Validates identity and policy, decomposes a request, dispatches, enforces depth and cost | `plan`, `dispatch`, `status` | `a2a:read`, `a2a:task:execute` | `8–12` (draft paths only) | all platform agents |
| `content` | Drafts captions and assets against brand voice and athlete context | `draft.caption`, `draft.asset` | `a2a:task:execute`, `a2a:propose` | `8–12` | none |
| `compliance` | Evaluates policy packs, mutates artifacts into compliance, blocks on severe findings | `evaluate`, `mutate`, `block` | `a2a:read`, `a2a:propose` | `8–12` | none |
| `guardian-cosigner` | Requests and records guardian authority for supervised actions | `request.cosign`, `verify.cosign` | `a2a:read`, `a2a:co-sign` | `8–17` | none |
| `publisher` | Publishes an approved artifact to its channel | `publish` | `a2a:sign`, `a2a:task:execute` | `18–24` only | none |
| `reviewer-assist` | Summarizes risk and suggests edits for a human reviewer | `summarize`, `suggest` | `a2a:read` | `8–12` | none |

## Scope semantics

| Scope | Grants | Never grants |
|---|---|---|
| `a2a:read` | Reading task state, artifacts, and audit entries within the token's tenant | Any mutation |
| `a2a:task:execute` | Creating and advancing a task within declared skills | Publishing or signing |
| `a2a:propose` | Writing a draft artifact or a proposed mutation | Committing a mutation as final |
| `a2a:co-sign` | Recording a guardian or athlete approval | Publishing, or approving own proposal |
| `a2a:sign` | Committing a final action, including publish | Granted to no automated caller by default |
| `a2a:admin` | Managing agent registrations, scopes, and tenant thresholds | Operating outside the token's tenant |
| `a2a:delete` | Deleting artifacts or tasks within the tenant | Deleting audit entries, which no scope permits |

## Delegation rules

1. Depth is counted from the root task. The platform cap is `5`; a card may declare a
   lower `maxDepth` and the lower value applies.
2. Depth is read from the verified token and the stored task, never from the request
   body. A request asserting a depth lower than its stored ancestry is rejected.
3. `maxDepth` is enforced at dispatch, so an over-deep call fails before any model is
   invoked and before any cost is incurred.
4. A delegation must carry a narrowed or equal scope set. Scope escalation through
   delegation is rejected.
5. `publisher` and `a2a:sign` are never reachable by delegation from an automated
   caller. Publishing is a human-gated action for every tier.
6. Cycles are rejected by ancestry check, not only by a depth counter.
7. Every delegation writes an audit ledger entry naming the parent task, the child
   task, and the depth.

## Tier permissions

| Agent | `8–12` | `13–17` | `18–24` |
|---|---|---|---|
| `orchestrator` | Draft and review paths | Full dispatch, no publish | Full dispatch |
| `content` | Draft only | Draft only | Draft only |
| `compliance` | Evaluate and mutate | Evaluate and mutate | Evaluate and mutate |
| `guardian-cosigner` | Records guardian authority only | Dual-sign path | Not applicable |
| `publisher` | Blocked | Blocked | Enabled after human approval |
| `reviewer-assist` | Allowed | Allowed | Allowed |

No agent has a capability at `8–12` that permits publishing or export. The tier check
precedes every other gate (ADR-0006), so a tier restriction cannot be widened by a
threshold setting.

## External agents

An external agent is registered with a publisher identity, a key, a scope set, a
quota, and a declared `maxDepth` of at most 2. Registration requires an explicit
decision record. External agents are never granted `a2a:sign`, `a2a:admin`, or
`a2a:delete`, and their cards are re-validated on key rotation.

## Related documents

- `docs/adr/0002-agent-identity-scoped-jwt.md` — identity and scope claims
- `docs/adr/0006-age-tier-and-guardian-authority.md` — tier derivation
- `docs/a2a/OPERATIONAL-PROTOCOLS.md` — P1 identity, P3 age governance, P12 interop
