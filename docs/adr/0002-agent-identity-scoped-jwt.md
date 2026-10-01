# ADR-0002 — Scoped JWT agent identity replaces the shared static bearer token

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: Platform owner
- **Affects**: agent ingress, `agent-engine/agent_engine/api.py`, `web/src/lib/agent/`, `.clinerules` authorization sequence

## Context

The gateway currently authenticates every caller against one shared secret.
`agent-engine/agent_engine/api.py` compares the `Authorization` header to
`AGENT_API_TOKEN`, and `web/src/lib/env.ts` documents the web-side twin,
`AGENT_SERVICE_TOKEN`, as a "shared bearer token used to authenticate Server Action
calls to the agent gateway" (tier `reserved`).

That design has three defects against the A2A specification and the repository's own
`.clinerules`:

1. **No agent identity.** The token identifies no agent, so no audit row can name the
   caller and no action can be attributed or repudiated.
2. **No scoping.** Every holder of the token can invoke every method, including
   mutating ones, with no separation between read, propose, and sign authority.
3. **Tenant resolution is unauthenticated.** Because the token carries no claims, the
   organization must be supplied by the request, which `.clinerules` forbids as
   authoritative input and which step 2 of the mandatory sequence requires be
   server-validated.

External agents are in scope: brand and agency agents may call in.

## Decision

Every caller presents a signed JWT. The gateway verifies the signature and derives
tenant context from the claims, never from the request body.

- **Algorithm**: RS256, with ES256 supported for partner keys that require it.
- **Claims**: `sub` (agent id), `iss`, `aud`, `exp`, `iat`, `jti`, plus `tenant_id`,
  `org_id`, and `scopes`.
- **Scope grammar**: `a2a:read`, `a2a:task:execute`, `a2a:propose`, `a2a:co-sign`,
  `a2a:sign`, `a2a:admin`, `a2a:delete`. A method declares its required scope; a token
  lacking it is rejected before dispatch.
- **Key discovery**: `/.well-known/jwks.json` for external callers; a pinned PEM is
  used for internal Server Action hops so the web tier does not depend on the
  gateway being up to mint a token.
- **`jti`** is recorded so a token can be replayed only within a single task.
- **Depth**: the `tenant_id` claim is compared against the resolved `org_id` before
  any read, making the token's tenant and the target tenant the same by construction.
- **Rotation**: keys carry a `kid` and overlap during rollover; the previous key
  verifies but cannot be used to mint.

Internal callers keep a distinct key and credentials from external callers, so a
leaked partner key cannot impersonate the web tier.

## Consequences

### Positive

- Satisfies steps 1 and 2 of the mandatory authorization sequence at agent ingress:
  identity is authenticated and the organization comes from a server-validated claim.
- Audit rows can name the agent, the acting scope, and the `jti`, giving
  non-repudiation.
- Least privilege becomes enforceable per method; `a2a:sign` can be withheld from
  every automated caller.

### Negative / accepted trade-offs

- Key management is now a real operational duty: generation, storage, rotation, and
  revocation must be runbooked, and `AGENT_API_TOKEN` must remain supported during a
  deprecation window or every deployed client breaks at once.
- Verification adds a dependency on `jose` in both tiers and a JWKS fetch path that
  needs caching and failure handling.
- Clock skew becomes a failure mode; `exp` handling needs explicit tolerance.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Keep the shared bearer and add an `agentId` body field | Client-supplied identity is not authenticatable and violates the sequence rule. |
| mTLS with client certificates | Strong identity, but certificate distribution to external brand and agency partners is a heavier onboarding burden than a signed token over JWKS. |
| Opaque tokens introspected per call | Adds a network round trip to the gateway on every request and leaves identity opaque to audit. |
| Static per-tenant tokens | No rotation story, no scopes, and a single leak compromises a tenant permanently. |

## Swap point

The `_authorize` seam in `agent-engine/agent_engine/api.py`. It currently compares a
string; it becomes a verifier returning a claims object. Every downstream consumer
reads the claims object, so the verification mechanism can change without touching
dispatch, the graph, or the store.

## Resolution

**Confirmed 2026-09-18.** Self-hosted JWKS with a pinned PEM for internal hops. Clerk remains
the human identity provider. The decision was contested by two other candidates: the Gemini
design conversation named Supabase Auth as the agent issuer, and the recovered architecture
deck's hybrid-cloud slide names Auth0. Neither is adopted.

Rationale, in priority order:

1. **It does not depend on Phase 2.** Supabase is still dormant in this repository
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY` are all tier `reserved`), so choosing it would have made M1
   wait on standing up that project.
2. **Verification stays independent.** No third-party availability in the agent request path,
   so a Clerk or Supabase outage cannot stop agent traffic.
3. **Clerk is not repurposed.** It is oriented to human users; issuing machine credentials
   from it would couple agent ingress to the human-auth vendor.
4. **The seam makes it reversible.** `_authorize` in `api.py` becomes a verifier that returns a
   claims object. Swapping the key source later — to Supabase JWKS, Auth0, or anything that
   publishes a JWKS — is a change of key source, not a redesign.

Key separation is explicit: internal Server Action hops use a pinned PEM, external callers use
JWKS, and the two key sets are distinct so a leaked partner key cannot mint an internal
identity. Owned duties that come with this choice: key generation, rotation with an overlap
window, and revocation, all runbooked rather than implemented.

The M1 implementation lands this as two functions at the same seam: `_authenticate` returns the
`AgentPrincipal` claims object (or `None` on the shared-secret path), and `_enforce` binds the
organization id to the claim and checks the method's required scope. Verifier-returning-claims is
exactly the shape specified above; only the name split. Authentication still precedes parameter
validation, preserving the preflight probe's 401-before-`-32602` contract, and the auth mode is
derived from key presence — JWT when JWKS or pinned-PEM keys are configured, shared-secret
otherwise, which is the rule-10 deprecation window expressed as configuration.

**M2 retirement (2026-09-19).** The deprecation window closed. The web dispatcher now mints
short-lived RS256 JWTs (`web/src/lib/agent/agent-jwt.ts`, built on `node:crypto`, so the web
tier takes no new dependency) whose `kid` matches a pinned public PEM in the engine's
`AGENT_PINNED_PEM_DIR`. `AGENT_SERVICE_TOKEN` and `AGENT_API_TOKEN` are removed from both
tiers, and `identity.verify_shared_secret` is deleted. `_authenticate` now always returns an
`AgentPrincipal`: a gateway without configured keys fails closed with 503 rather than
accepting a weaker mode. `jti` is a required claim (P1 rule 2) and is enforced single-use per
task against the ledger (P1 rule 8). `_enforce` additionally verifies the token's scopes are
a subset of the `AgentRegistration.scopes` row and honors the registration's `maxDepth`,
closing the membership and role steps of the `.clinerules` sequence for agent callers.

## Release Governance (2026-09-30)

This architectural shift enables the staged major-track release gate:
1. **Web Launch Gate:** The product launch is blocked on verifying M2 internal web-to-engine RS256 JWT authentication. The launch requires negative-path/key-rotation evidence, server-side organization authorization, RLS-bound engine request access, and a JWT preflight probe. It also actively verifies that no static-token fallback is present.
2. **External A2A Activation Gate:** External A2A ingress is independently disabled after the web launch. It will only be activated once partner identity verification, scopes limits, quota limits, cross-process rate limiting, blocking compliance, and audit evidence controls are fully verified (via JWKS).

## References

- `agent-engine/agent_engine/api.py` — `_authorize`, current shared-secret check
- `web/src/lib/env.ts` — `AGENT_SERVICE_TOKEN` declaration
- `.clinerules` — mandatory authorization sequence, steps 1–2
- `docs/a2a/OPERATIONAL-PROTOCOLS.md` — P1 agent identity and trust