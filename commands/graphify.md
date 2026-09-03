# /graphify — Materialize the Codebase as a Knowledge Graph

## Purpose

Analyze the repository structure and persist a durable, browsable map of the codebase
(entities + typed relations) into the Cline memory knowledge graph via the memory-graph MCP
(`create_entities` / `create_relations`). The graph survives session resets and is
retrievable with `search_nodes` before touch-insensitive tasks.

## Instructions

1. Inventory the repository (read-only, batched):
   - `prisma/schema.prisma` for data models and enums.
   - `src/lib/**` for domain modules, the auth/session seam, and the authorization sequence.
   - `src/app/**` (route tree + `middleware.ts`) for pages, workspaces, and API routes.
   - `.clinerules`, `vibe-loop.config.json`, and `docs/` for process rules.
   - Read `.cline/memory/phase*.md` first so observations record established decisions/gotchas,
     not just file presence.
2. Check for existing nodes (`search_nodes`) before creating; reuse pre-existing entities
   (e.g. "The Blueprint - Two-Sided NIL Platform") and only add invented observations when the
   code confirms them. Namespace all new entities `The Blueprint - <Module>`.
3. Create entity nodes first (max ~10 per call), then relations in one batched call.
4. Relation types are single active-voice verbs: `contains`, `uses`, `hosts`, `guards`,
   `persists-in`, `protected-by`, `wraps`, `reads-writes`, `exposed-by`, `tests`, `runs-on`,
   `specifies`, `realized-in`.
5. Observed gotchas belong in entity observations (they are the highest-value recall).

## Checklist

- [ ] `.cline/memory` read and pre-existing nodes located
- [ ] Data layer, domain modules, routes, and process rules inventoried
- [ ] Entities created with 3-4 factual observations each
- [ ] Relations batched, typed, active-voice — no orphan nodes left behind
- [ ] Full graph re-read confirms nodes resolve and all edges have valid endpoints

## When done

Report in one line: node count, edge count, and any pre-existing entities that were linked
(rather than duplicated). Task complete — suggest a session reset before the next item.