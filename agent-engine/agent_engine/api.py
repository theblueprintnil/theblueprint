from __future__ import annotations

from fastapi import FastAPI, Header, HTTPException

from .config import get_settings
from .schemas import (
    A2AAgentCard,
    ExecutionStatus,
    JsonRpcError,
    JsonRpcRequest,
    JsonRpcResponse,
    ResumeRunParams,
    StartRunParams,
)
from .store import Store
from .tasks import resume_nil_pipeline_after_approval, run_nil_generation_pipeline

app = FastAPI(title="Blueprint Agent Gateway", version="0.1.0")
_settings = get_settings()
_store = Store.from_settings(_settings)


def _authorize(authorization: str | None) -> None:
    if authorization != f"Bearer {_settings.agent_api_token}":
        raise HTTPException(status_code=401, detail="Unauthorized.")


def _reply(rpc_id, *, result=None, error=None) -> dict:
    return JsonRpcResponse(id=rpc_id, result=result, error=error).model_dump(
        mode="json", by_alias=True
    )


def _verify_execution(organization_id: str, execution_id: str, thread_id: str) -> None:
    row = _store.get_execution(organization_id, execution_id)
    if row is None or row.get("threadId") != thread_id:
        raise HTTPException(
            status_code=409,
            detail="Execution does not exist for this tenant.",
        )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/agent/card")
def agent_card() -> dict:
    card = A2AAgentCard(
        name="Blueprint NIL Content Agent",
        description="Generates compliant athlete content, audits risk, pauses for human approval, and publishes.",
        url="/agent",
        version="0.1.0",
    )
    return card.model_dump(mode="json", by_alias=True)


@app.post("/agent/run")
def agent_run(request: JsonRpcRequest, authorization: str | None = Header(default=None)) -> dict:
    _authorize(authorization)
    if request.method != "agent.run":
        return _reply(
            request.id,
            error=JsonRpcError(code=-32601, message=f"Method {request.method} not found."),
        )
    try:
        params = StartRunParams.model_validate(request.params)
    except Exception as exc:
        return _reply(request.id, error=JsonRpcError(code=-32602, message=str(exc)))
    _verify_execution(params.organization_id, params.execution_id, params.thread_id)
    row = _store.get_execution(params.organization_id, params.execution_id)
    if row is None or row.get("status") != ExecutionStatus.QUEUED.value:
        return _reply(
            request.id,
            error=JsonRpcError(code=409, message="Execution is not queued for this tenant."),
        )
    task = run_nil_generation_pipeline.delay(
        params.organization_id,
        params.execution_id,
        params.thread_id,
        params.brief.model_dump(mode="json", by_alias=True),
    )
    return _reply(
        request.id,
        result={"taskId": task.id, "executionId": params.execution_id},
    )


@app.post("/agent/resume")
def agent_resume(request: JsonRpcRequest, authorization: str | None = Header(default=None)) -> dict:
    _authorize(authorization)
    if request.method != "agent.resume":
        return _reply(
            request.id,
            error=JsonRpcError(code=-32601, message=f"Method {request.method} not found."),
        )
    try:
        params = ResumeRunParams.model_validate(request.params)
    except Exception as exc:
        return _reply(request.id, error=JsonRpcError(code=-32602, message=str(exc)))
    _verify_execution(params.organization_id, params.execution_id, params.thread_id)
    row = _store.get_execution(params.organization_id, params.execution_id)
    allowed = {
        ExecutionStatus.APPROVED.value,
        ExecutionStatus.REVISION_REQUESTED.value,
    }
    if row is None or row.get("status") not in allowed:
        return _reply(
            request.id,
            error=JsonRpcError(code=409, message="Execution is not awaiting a resume."),
        )
    task = resume_nil_pipeline_after_approval.delay(
        params.organization_id,
        params.execution_id,
        params.thread_id,
        params.review.model_dump(mode="json", by_alias=True),
    )
    return _reply(
        request.id,
        result={"taskId": task.id, "executionId": params.execution_id},
    )
