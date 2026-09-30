# A2A go-live governance — 2026-09-30

- Release policy: staged major-track gate. The web product launch is blocked on verified M2 internal web-to-engine RS256 JWT authentication, negative-path/key-rotation evidence, no static-token fallback, server-side organization authorization, RLS-bound engine request access, JWT preflight probe, and audit attribution.
- External A2A ingress is independently disabled after web launch until partner identity/issuer/JWKS/registration, scoped limits, age and guardian controls where applicable, blocking compliance, cost breakers, cross-process rate limiting, streaming, and audit evidence are complete.
- Documentation reconciled: `docs/GO-LIVE.md`, `docs/a2a/{README,ARCHITECTURE,OPERATIONAL-PROTOCOLS,LAYER-STATUS}.md`, ADR-0002, and `CHANGELOG.md`.
- No new ADR was created because the authentication architecture did not change; ADR-0002 now records the release-governance application.