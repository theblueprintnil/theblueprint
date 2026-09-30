# A2A Architecture — Document Set

Working documentation for the agent-to-agent (A2A) layer of The Blueprint (NIL
athlete promotion platform). The source inputs were the A2A technical specification,
the layered architecture blueprint, and the repository itself. Where a specification
control is implemented by an in-repo equivalent, the substitution is recorded as an
ADR and the swap point is named, so a later move to the specification's topology is a
configuration change rather than a rewrite.

## Documents

| Document | Purpose |
|---|---|
| `ARCHITECTURE.md` | Layered topology, control flow, the A2A task lifecycle, contract appendix |
| `OPERATIONAL-PROTOCOLS.md` | P1–P12 as enforceable specifications with named owners and failure semantics |
| `LAYER-STATUS.md` | Living matrix of specification layer against repository reality, plus the gap register |
| `AGENT-CARDS.md` | Agent inventory: identity, skills, scopes, tier permissions, delegation rules |
| `SCHEMA-CHANGE-PLAN.md` | Every required schema and RLS change, in dependency order, with validation per change |
| `SOURCE-RECONCILIATION.md` | The Gemini design conversation as an input: adopted items A1–A15, open conflicts OPEN-1–OPEN-8, rejected code defects C1–C8, and convention mismatches |

## Source inputs

| Source | Role |
|---|---|
| `A2A Setup - Technical Specification.pdf` | Authoritative for the locked parameters below |
| `Comprehensive Technical Blueprint_ The 10-Layer NIL AI SaaS Ecosystem.md` | Authoritative for the layer topology |
| `Blueprint NIL A2A Architecture Design - Google Gemini.txt` | Design input; triaged in `SOURCE-RECONCILIATION.md` |
| `A2A_Architecture_Blueprint.pdf` | 14-slide deck, image-only; recovered and transcribed in `SOURCE-RECONCILIATION.md` §H |

## Decision records

| ADR | Decision |
|---|---|
| `0001` | JSON-RPC 2.0 at the agent-engine gateway is the A2A transport |
| `0002` | JWT-only scoped agent identity with separately gated internal and external ingress |
| `0003` | Versioned policy packs with an in-repo evaluator, not OPA or Neo4j |
| `0004` | A hash-chained audit ledger for agent operations |
| `0005` | Redis for the semantic cache, Postgres plus pgvector for embeddings |
| `0006` | Guardians are first-class users; age tier is derived server-side |
| `0007` | A per-tenant autonomy threshold, defaulting to `$250` |

ADRs live in `docs/adr/`. The template is `docs/adr/template.md`.

## Locked parameters

These values come from the specification and are treated as fixed until an ADR
changes them.

| Parameter | Value |
|---|---|
| Default autonomy threshold | `$250`, gated when equal, per-tenant override |
| Per-task cost circuit breaker | `$0.02` |
| Semantic cache similarity | `0.92` |
| Per-tenant edge rate limit | `100` requests per minute |
| Nested delegation depth cap | `5` |
| Age tiers | `8–12`, `13–17`, `18–24` |
| Scope grammar | `a2a:read`, `a2a:task:execute`, `a2a:propose`, `a2a:co-sign`, `a2a:sign`, `a2a:admin`, `a2a:delete` |

## Reading order

For a reviewer new to the A2A layer: `LAYER-STATUS.md` for what exists and what does
not, then `ARCHITECTURE.md` for how it fits together, then `OPERATIONAL-PROTOCOLS.md`
for the rules each component must enforce. `SCHEMA-CHANGE-PLAN.md` is the
implementation backlog.

## Related documentation

- `docs/SECURITY.md` — Phase-2 Supabase RLS foundation and the tenant-isolation test suite
- `docs/GO-LIVE.md` — dependency-ordered production launch checklist
- `docs/adr/` — architecture decision records
- `docs/blueprint-graph-vault/` — the Obsidian vault of subsystem notes
- `agent-engine/README.md` — gateway, worker, and pipeline operation
- `web/README.md` — web tier operation and deployment

## Scope boundary

This set covers the A2A layer, the governance controls it depends on, and the schema
work those controls require. It does not restate the existing Phase-1 and Phase-2
documentation, and it does not plan the public marketing site.

One source input is excluded: a 17 MB image-only PDF of the architecture blueprint
that contained no extractable text. If it holds binding diagrams or decisions, they
are not represented here, and nothing in this set should be read as superseding them.
