# ADR-0001 — JSON-RPC 2.0 at the agent-engine gateway is the A2A transport

- **Status**: Accepted
- **Date**: 2026-09-18
- **Deciders**: Platform owner
- **Affects**: L4 orchestration, agent ingress, `agent-engine/`, `web/src/lib/agent/`

## Context

The A2A specification requires a task-oriented envelope carrying agent identity,
tenant context, a task identifier, and a result or artifact set. It does not mandate
a wire protocol; it mandates the message semantics.

The repository already runs an agent gateway: a FastAPI application at
`agent-engine/agent_engine/api.py` speaking JSON-RPC 2.0 on port `:8100`, with a
`/health` probe and an `/agent/run` dispatch method. The web tier already holds a
matching client at `web/src/lib/agent/celery-client.ts`, and `web/scripts/preflight.ts`
already probes the gateway by asserting that an unauthenticated call returns `401`
while an authenticated call returns a JSON-RPC `-32602` parameter error (auth
precedes parameter validation, so the probe never dispatches a task).

Replacing this envelope would require rewriting the gateway, the client, the
preflight probe, and the Server Actions that call it, with no gain in task
semantics.

## Decision

Keep JSON-RPC 2.0 as the A2A transport. Implement the specification's task model as
the request/response payload contract rather than as a new protocol layer.

The envelope carries: a request `id`, the method name, and a `params` object holding
`a2aTaskId`, the validated agent identity claims, the task inputs, and the
`parentTaskId` where the call is a delegation. Responses return either a `result`
carrying task state plus artifacts, or a JSON-RPC `error` with a stable code for
each failure class (unauthenticated, unauthorized scope, depth exceeded, quota
exceeded, policy blocked).

## Consequences

### Positive

- No rewrite of `api.py`, `celery-client.ts`, or the preflight probe; the new
  contract is additive.
- The existing auth-before-parse ordering keeps the probe non-dispatching, which
  stays a usable liveness check.
- Task identity arrives as a payload field, so the same transport serves internal
  Server Action dispatch and external agent calls without branching.

### Negative / accepted trade-offs

- The public agent card must describe task semantics inside JSON-RPC rather than
  offering the Google A2A HTTP+JSON binding, so an external caller expecting the
  canonical binding needs a thin adapter.
- JSON-RPC error codes are now part of the public contract and must be treated as
  versioned API surface.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Adopt the Google A2A HTTP+JSON envelopes wholesale | Discards a working gateway and its client for a protocol whose task semantics can be expressed in the existing envelope. |
| REST resource endpoints per task | Loses the single-method dispatch that the preflight probe and Server Actions depend on. |
| gRPC | Adds a toolchain and codegen step for a low-volume internal hop. |

## Swap point

The transport adapter inside `agent-engine/agent_engine/api.py`. It converts an
inbound request into an internal task command. A different wire binding replaces the
adapter while the task command, the graph, and the store stay unchanged.

## References

- `agent-engine/agent_engine/api.py` — FastAPI gateway, `_authorize`, JSON-RPC dispatch
- `web/src/lib/agent/celery-client.ts` — web-side JSON-RPC client
- `web/scripts/preflight.ts` — `--probe` gateway and token-pairing check
- `docs/a2a/ARCHITECTURE.md` — contract appendix