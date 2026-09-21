# Blueprint Agent Engine

LangGraph + Celery orchestration for The Blueprint NIL content generation, compliance auditing, human-in-the-loop approval, and publishing.

## Layout

- `agent_engine/schemas.py` — Pydantic v2 domain models and JSON-RPC 2.0 / A2A envelopes.
- `agent_engine/audit.py` — canonical JSON, SHA-256 chain hashing, and chain verification for the A2A audit ledger.
- `agent_engine/llm.py` — OmniRoute (OpenAI-compatible) gateway routing to DeepSeek and Z.ai.
- `agent_engine/rules.py` — deterministic FTC / NCAA / brand-exclusivity compliance checks.
- `agent_engine/store.py` — tenant-scoped PostgreSQL persistence (status machine, hash-chained `A2AAuditEntry` ledger, RLS-bound `app_agent` request sessions).
- `agent_engine/agents_workflow.py` — LangGraph graph with Content, Compliance, HITL pause, and Publisher nodes.
- `agent_engine/tasks.py` — Celery tasks `run_nil_generation_pipeline` and `resume_nil_pipeline_after_approval` with redelivery-safe status guards.
- `agent_engine/api.py` — FastAPI JSON-RPC 2.0 gateway: `/.well-known/agent.json` card, `agent.run`, `agent.resume`, and `task.get` / `task.cancel` on `/agent/task`.
- `worker.py` — subscriber entrypoint re-exporting the Celery app for Vercel.

## Run locally (Redis broker)

1. `python -m venv .venv`
2. Activate the virtual environment.
3. `pip install -r requirements.txt`
4. `cp .env.example .env` and fill in credentials.
5. Start Redis (root `docker compose up -d` starts Postgres and Redis), then:
   - `celery -A agent_engine.tasks worker --loglevel=info`
   - `uvicorn agent_engine.api:app --host 0.0.0.0 --port 8100`

Locally the Celery broker and result backend are `REDIS_URL` (default `redis://localhost:6379/0`).

## Deploy on Vercel (Vercel Queues broker)

`pyproject.toml` declares the whole service: `[tool.vercel] entrypoint = "agent_engine.api:app"` builds the FastAPI gateway as the web function, and `[[tool.vercel.subscribers]] entrypoint = "worker:app"` compiles the Celery worker into a private queue-triggered function. When the `VERCEL` environment variable is set, `tasks.py` uses `vercel://` as the broker and `vercel-runtime-cache://` as the result backend, so no Redis needs to be provisioned. Dependencies come from the `pyproject.toml` `dependencies` array (`.vercelignore` excludes `requirements.txt` so the build reads a single dependency source).

1. Create a Vercel project rooted at `agent-engine/`.
2. Set env vars: `DATABASE_URL`, `AGENT_DATABASE_URL` (the RLS-bound `app_agent` connection for the gateway request path), `AGENT_PINNED_PEM_DIR` (pinned public PEMs), `AGENT_JWT_ISSUER`, `AGENT_JWT_AUDIENCE`, `OMNIROUTE_BASE_URL`, `OMNIROUTE_API_KEY`, and `AGENT_PUBLISH_ENDPOINT` when publishing is enabled. There is no shared token any more; the gateway rejects every caller without a verifiable JWT. `REDIS_URL` is not needed.
3. `DATABASE_URL` must point at hosted Postgres (Supabase recommended). The LangGraph `PostgresSaver.setup()` DDL and the pooled worker connections prefer the session/direct connection string over a transaction-mode pooler.
4. Deploy with `vc deploy`, or run `vercel dev` (CLI >= 58.9.0) to run the gateway and the worker locally against Vercel Queues.
5. Vercel Queues is at-least-once: both tasks re-check `AgentTaskExecution.status` before running and return a no-op summary (`"duplicate": true`) on redelivery instead of re-executing or flipping a terminal status to FAILED.
6. Tasks must finish inside the function max duration; `task_time_limit` is 600s, so raise the queue-triggered function's max duration to at least 600s (Pro plan) or lower the limit on Hobby.
7. To run a classic `celery worker` against the same queues from another host, switch the broker to `vercel-poll://` (poll mode).

The `AgentTaskExecution` row is created by the Next.js server action under RLS before the gateway is invoked; workers only transition already-created executions inside a single tenant.
