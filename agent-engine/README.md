# Blueprint Agent Engine

LangGraph + Celery orchestration for The Blueprint NIL content generation, compliance auditing, human-in-the-loop approval, and publishing.

## Layout

- `agent_engine/schemas.py` — Pydantic v2 domain models and JSON-RPC 2.0 / A2A envelopes.
- `agent_engine/llm.py` — OmniRoute (OpenAI-compatible) gateway routing to DeepSeek and Z.ai.
- `agent_engine/rules.py` — deterministic FTC / NCAA / brand-exclusivity compliance checks.
- `agent_engine/store.py` — tenant-scoped PostgreSQL persistence (status machine, audit rows).
- `agent_engine/agents_workflow.py` — LangGraph graph with Content, Compliance, HITL pause, and Publisher nodes.
- `agent_engine/tasks.py` — Celery tasks `run_nil_generation_pipeline` and `resume_nil_pipeline_after_approval`.
- `agent_engine/api.py` — FastAPI JSON-RPC 2.0 gateway that dispatches Celery tasks.

## Run locally

1. `python -m venv .venv`
2. Activate the virtual environment.
3. `pip install -r requirements.txt`
4. `cp .env.example .env` and fill in credentials.
5. Start Redis, then:
   - `celery -A agent_engine.tasks worker --loglevel=info`
   - `uvicorn agent_engine.api:app --host 0.0.0.0 --port 8100`

The `AgentTaskExecution` row is created by the Next.js server action under RLS before the gateway is invoked; workers only transition already-created executions inside a single tenant.
