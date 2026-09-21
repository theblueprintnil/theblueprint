# ADR-0005 — Redis for the semantic cache, Postgres plus pgvector for embeddings

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: Platform owner
- **Affects**: L5 knowledge engine, L6 model router, `docker-compose.yml`, agent-engine config

## Context

The specification calls for a semantic cache that short-circuits a model call when a
sufficiently similar request has already been answered, at a `0.92` similarity
threshold, and for a knowledge layer holding brand voice and athlete context.

Neither exists. The L5 layer reads static files under `content-pack/`, and the L6
router selects a model from environment configuration with no cache and no
complexity tiering.

Two distinct stores are needed and they have different shapes:

1. A **cache**: small values, short half-life, hit-or-miss lookups on a vector, no
   transactional coupling to business data.
2. A **knowledge store**: longer-lived embeddings joined to tenant and athlete rows,
   where a deleted athlete must not leave retrievable context behind.

The repository already runs Redis in the root `docker-compose.yml` for Celery, used
locally with `REDIS_URL`. On Vercel the tasks layer selects `vercel://` and
`vercel-runtime-cache://` when `VERCEL` is set, so Redis is a local-development
broker rather than a hard production dependency. Postgres is the system of record and
is the only datastore with RLS already enforced.

## Decision

Split by shape rather than choosing one store for both.

- **Semantic cache**: Redis, keyed by tenant plus a hash of the normalized prompt
  and the model identifier, with the embedding-derived similarity compared against
  the `0.92` threshold. Entries carry a TTL and are invalidated on policy-pack
  version change, since a cached answer produced under a superseded policy must not
  be served. Locally, the existing Redis service is used; at the edge, Upstash is the
  drop-in.
- **Knowledge store**: Postgres with the `pgvector` extension. Embeddings live in a
  tenant-scoped table with `organizationId` and `NOT NULL` foreign keys, guarded by
  the same `app_user_role_in` RLS pattern as every other tenant-owned table, so a
  retrieval query cannot cross tenants and athlete deletion cascades to the
  embedding.

Enabling `pgvector` is a migration step, verified in M1 on both the local Docker
Postgres and the hosted Supabase project before any embedding work begins. If the
extension is unavailable on a target, retrieval falls back to Postgres full-text
search rather than to a new service.

## Consequences

### Positive

- Cache misses and knowledge reads have independent failure modes; a Redis outage
  degrades latency without breaking tenant isolation.
- Embeddings inherit RLS, so the isolation guarantee tested by
  `supabase/tests/tenant_isolation.sql` extends to retrieval by construction.
- Policy-pack invalidation means the cache cannot serve a stale compliance verdict,
  which is the one case where a semantic cache would be actively dangerous.
- Local development needs no new service: Redis is already in `docker-compose.yml`.

### Negative / accepted trade-offs

- Two stores to operate and monitor, with two configuration surfaces.
- `pgvector` index tuning (HNSW or IVFFlat parameters) becomes a tuning duty, and a
  poorly chosen index silently degrades recall.
- Cache invalidation correctness now depends on every policy-pack change also
  clearing cache keys, which is a coupling that must be enforced in the pack loader
  rather than remembered by a developer.
- A `0.92` threshold trades correctness for cost; too low and wrong answers are
  served, too high and the cache never hits. It must be measured, not assumed.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Single vector store for cache and knowledge | Forces one durability and isolation profile onto two workloads with opposite needs; a cache has no tenant-isolation requirement that justifies the query cost. |
| Upstash only | Correct at the edge, but diverges from the local compose service and adds a network hop in development. |
| Embeddings in Redis with Redis Stack | Would move tenant-scoped context out of the RLS-governed database, losing the isolation guarantee. |
| No cache initially | Leaves the `$0.02` per-task cost breaker as the only cost control, which is a ceiling rather than an optimization. |

## Swap point

The cache and retrieval interfaces. The router calls
`cacheLookup(normalizedPrompt, model) -> Hit | Miss` and the graph calls
`retrieveContext(tenantId, athleteId) -> chunks`, neither of which names Redis or
pgvector. Upstash is a configuration change behind the cache interface; a dedicated
vector service is a new implementation behind the retrieval interface.

## References

- `docker-compose.yml` — Redis service already present
- `agent-engine/agent_engine/tasks.py` — broker selection between `redis://` and `vercel://`
- `prisma/rls.sql` — `app_user_role_in` pattern to mirror for the embedding table
- `docs/a2a/OPERATIONAL-PROTOCOLS.md` — P7 cost governance