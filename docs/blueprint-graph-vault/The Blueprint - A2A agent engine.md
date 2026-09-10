# The Blueprint - A2A agent engine

> entityType: service

## Observations

- agent-engine/ Python package at repo root (added 2026-09-04, commit 9666512): LangGraph + Celery orchestration for NIL content generation, compliance auditing, human-in-the-loop approval, and publishing
- LangGraph graph: content -> compliance -> hitl_node (interrupt) -> {publisher | content loop}, compiled with PostgresSaver checkpointer keyed by threadId; resume via Command(resume=review_dict) with thread_config
- Schemas: Pydantic v2 models with alias_generator=to_camel + populate_by_name to match the DB/UI camelCase contract; JSON-RPC 2.0 / A2A envelopes
- LLM: OmniRoute OpenAI-compatible gateway routing DeepSeek (generation) and Z.ai (compliance)
- Compliance: deterministic FTC/NCAA/brand-exclusivity rules in rules.py - append compliance flags + score only, never reject; pytest suite 7/7
- Store: psycopg tenant-scoped persistence - every identifier via psycopg.sql.Identifier (Prisma CamelCase tables), enums stored as uppercase strings, jsonb via %s::jsonb + json.dumps
- Celery tasks run_nil_generation_pipeline / resume_nil_pipeline_after_approval; JSON serializer means task args must be primitives (camelCase dicts re-validated in worker)
- FastAPI JSON-RPC gateway on :8100 exposing /agent/run and /agent/resume behind bearer AGENT_API_TOKEN; workers transition status fail-closed (mark_published only from APPROVED)
- Deploys on Vercel (2026-09-10): pyproject.toml declares [tool.vercel] entrypoint agent_engine.api:app plus [[tool.vercel.subscribers]] entrypoint worker:app; tasks.py selects broker vercel:// and backend vercel-runtime-cache:// when VERCEL is set, keeping REDIS_URL for local dev
- Tasks are redelivery-safe: run_nil_generation_pipeline proceeds only from QUEUED/RUNNING and resume_nil_pipeline_after_approval only from APPROVED/REVISION_REQUESTED; duplicate deliveries return a no-op summary with duplicate=true instead of re-executing

## Relations

**Outgoing**

- `reads-writes` → [[The Blueprint - Agent execution data model]]
- `runs-on` → [[The Blueprint - Docker Postgres]]

**Incoming**

- `contains` ← [[The Blueprint - NIL Athlete Promotion Site]]
- `calls` ← [[The Blueprint - Studio approval UI]]