from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, Header, HTTPException

from .config import get_settings
from .identity import (
    MAX_DELEGATION_DEPTH,
    AgentPrincipal,
    AgentTokenError,
    AgentTokenExpired,
    load_jwks_public_keys,
    load_pinned_pem,
    verify_agent_token,
)
from .schemas import (
    A2AAgentCard,
    A2ASkill,
    ExecutionStatus,
    JsonRpcError,
    JsonRpcRequest,
    JsonRpcResponse,
    ResumeRunParams,
    SPEC_STATE_BY_STATUS,
    StartRunParams,
    TaskCancelParams,
    TaskGetParams,
)
from .store import AgentStateError, AuditActor, Store
from .tasks import resume_nil_pipeline_after_approval, run_nil_generation_pipeline

app = FastAPI(title="Blueprint Agent Gateway", version="0.2.0")
_settings = get_settings()
_store = Store.from_settings(_settings)
_request_store = Store.request_store(_settings)

JSONRPC_METHOD_NOT_FOUND = -32601
JSONRPC_INVALID_PARAMS = -32602
JSONRPC_DEPTH_EXCEEDED = -32001
JSONRPC_TASK_NOT_FOUND = -32002
JSONRPC_INVALID_TRANSITION = -32003
JSONRPC_JTI_REUSED = -32004


def _build_key_candidates() -> dict[str | None, str]:
    candidates: dict[str | None, str] = {}
    if _settings.agent_jwks_path:
        candidates.update(load_jwks_public_keys(_settings.agent_jwks_path))
    if _settings.agent_pinned_pem_dir:
        for pem_path in sorted(Path(_settings.agent_pinned_pem_dir).glob("*.pem")):
            candidates[pem_path.stem] = load_pinned_pem(pem_path)
    return candidates


_KEY_CANDIDATES = _build_key_candidates()


def _authenticate(authorization: str | None) -> AgentPrincipal:
    token = (authorization or "").strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    if not _KEY_CANDIDATES:
        raise HTTPException(
            status_code=503,
            detail="Agent identity keys are not configured. Shared secrets are retired.",
        )
    try:
        return verify_agent_token(
            token,
            key_candidates=_KEY_CANDIDATES,
            issuer=_settings.agent_jwt_issuer,
            audience=_settings.agent_jwt_audience,
            leeway=_settings.agent_jwt_leeway_seconds,
        )
    except AgentTokenExpired:
        raise HTTPException(status_code=401, detail="Agent token expired.")
    except AgentTokenError:
        raise HTTPException(status_code=401, detail="Invalid agent token.")


def _actor(principal: AgentPrincipal) -> AuditActor:
    return AuditActor(
        actor_type="agent",
        actor_id=principal.agent_id,
        actor_jti=principal.jti,
        scopes=tuple(sorted(principal.scopes)),
    )


def _record_rejection(principal: AgentPrincipal, organization_id: str, reason: str) -> None:
    try:
        with _request_store.org_transaction(principal.org_id) as conn:
            _request_store.append_audit_entry(
                conn,
                organization_id=principal.org_id,
                action="REQUEST_REJECTED",
                actor=_actor(principal),
                target_type="GatewayRequest",
                target_id=None,
                outcome="denied",
                payload={"reason": reason, "requestedOrganizationId": organization_id},
            )
    except Exception:
        pass


def _enforce(principal: AgentPrincipal, organization_id: str, required_scope: str) -> int:
    if organization_id != principal.org_id:
        _record_rejection(principal, organization_id, "org-mismatch")
        raise HTTPException(status_code=403, detail="Cross-tenant organization mismatch.")
    if not principal.has_scope(required_scope):
        _record_rejection(principal, organization_id, f"missing-scope:{required_scope}")
        raise HTTPException(status_code=403, detail=f"Missing required scope: {required_scope}.")
    registration = _request_store.registration_for(principal.org_id, principal.agent_id)
    if registration is None:
        _record_rejection(principal, organization_id, "agent-unregistered")
        raise HTTPException(status_code=403, detail="Agent is not registered.")
    if str(registration.get("status") or "") != "ACTIVE":
        _record_rejection(principal, organization_id, "agent-inactive")
        raise HTTPException(status_code=403, detail="Agent registration is not active.")
    bound_org = registration.get("orgId")
    if bound_org is not None and bound_org != principal.org_id:
        _record_rejection(principal, organization_id, "agent-org-binding")
        raise HTTPException(status_code=403, detail="Agent is not registered for this organization.")
    registered_scopes = set(registration.get("scopes") or [])
    if not set(principal.scopes).issubset(registered_scopes):
        _record_rejection(principal, organization_id, "scopes-exceed-registration")
        raise HTTPException(
            status_code=403,
            detail="Token scopes exceed the agent registration.",
        )
    registered_depth = registration.get("maxDepth")
    return min(
        MAX_DELEGATION_DEPTH,
        registered_depth if isinstance(registered_depth, int) else 0,
    )


def _reply(rpc_id, *, result=None, error=None) -> dict:
    return JsonRpcResponse(id=rpc_id, result=result, error=error).model_dump(
        mode="json", by_alias=True
    )


def _task_view(row: dict) -> dict:
    status = row.get("status")
    try:
        status_enum = ExecutionStatus(status)
    except ValueError:
        status_enum = None
    created = row.get("createdAt")
    if hasattr(created, "isoformat"):
        created_value = created.isoformat()
    else:
        created_value = str(created) if created else None
    audit_sequence = row.get("auditSequence")
    return {
        "executionId": row.get("id"),
        "a2aTaskId": row.get("a2aTaskId"),
        "threadId": row.get("threadId"),
        "status": status,
        "state": SPEC_STATE_BY_STATUS.get(status_enum, "unknown") if status_enum else "unknown",
        "depth": row.get("depth") or 0,
        "createdAt": created_value,
        "publishedPostUrl": row.get("publishedPostUrl"),
        "errorMessage": row.get("errorMessage"),
        "auditSequence": int(audit_sequence) if audit_sequence is not None else None,
    }


def _agent_card() -> A2AAgentCard:
    base = _settings.agent_public_base_url.rstrip("/")
    return A2AAgentCard(
        id="blueprint-nil-agent",
        name="Blueprint NIL Content Agent",
        version="0.2.0",
        publisher="platform",
        description=(
            "Generates compliant athlete content, audits risk, pauses for human "
            "approval, and publishes."
        ),
        url=f"{base}/agent",
        skills=[
            A2ASkill(
                name="generate_post",
                input={"brief": "NILBrief"},
                output={"captions": "CaptionVariant[]", "compliance": "ComplianceReport"},
            ),
            A2ASkill(
                name="audit_contract",
                input={"terms": "ContractTerms"},
                output={"compliance": "ComplianceReport"},
            ),
            A2ASkill(
                name="propose_deal",
                input={"terms": "ContractTerms"},
                output={"proposal": "DealProposal"},
            ),
        ],
        scopes=["a2a:read", "a2a:task:execute", "a2a:propose", "a2a:co-sign"],
        min_tier="YOUTH",
        delegates=[],
        max_depth=MAX_DELEGATION_DEPTH,
        auth={"external": "jwks", "internal": "pinned-pem"},
        transport={
            "protocol": "jsonrpc-2.0",
            "endpoints": {
                "run": "POST /agent/run (agent.run)",
                "resume": "POST /agent/resume (agent.resume)",
                "task": "POST /agent/task (task.get | task.cancel)",
            },
            "states": sorted({state for state in SPEC_STATE_BY_STATUS.values()}),
            "errorCodes": {
                "depthExceeded": JSONRPC_DEPTH_EXCEEDED,
                "taskNotFound": JSONRPC_TASK_NOT_FOUND,
                "invalidTransition": JSONRPC_INVALID_TRANSITION,
                "jtiReused": JSONRPC_JTI_REUSED,
            },
        },
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/.well-known/agent.json")
def well_known_agent_card() -> dict:
    return _agent_card().model_dump(mode="json", by_alias=True)


@app.get("/agent/card")
def agent_card() -> dict:
    return _agent_card().model_dump(mode="json", by_alias=True)


@app.post("/agent/run")
def agent_run(request: JsonRpcRequest, authorization: str | None = Header(default=None)) -> dict:
    principal = _authenticate(authorization)
    if request.method != "agent.run":
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_METHOD_NOT_FOUND,
                message=f"Method {request.method} not found.",
            ),
        )
    try:
        params = StartRunParams.model_validate(request.params)
    except Exception as exc:
        return _reply(
            request.id,
            error=JsonRpcError(code=JSONRPC_INVALID_PARAMS, message=str(exc)),
        )
    max_depth = _enforce(principal, params.organization_id, "a2a:task:execute")
    if _request_store.jti_conflicts(
        params.organization_id, principal.jti, params.execution_id
    ):
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_JTI_REUSED,
                message="Token jti was already used on a different task.",
            ),
        )
    if principal.delegation_depth >= max_depth:
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_DEPTH_EXCEEDED,
                message=f"Delegation depth {principal.delegation_depth} meets the cap {max_depth}.",
            ),
        )
    row = _request_store.get_execution(params.organization_id, params.execution_id)
    if row is None or row.get("threadId") != params.thread_id:
        raise HTTPException(
            status_code=409,
            detail="Execution does not exist for this tenant.",
        )
    if row.get("status") != ExecutionStatus.QUEUED.value:
        return _reply(
            request.id,
            error=JsonRpcError(code=409, message="Execution is not queued for this tenant."),
        )
    _request_store.record_dispatch(
        params.organization_id,
        params.execution_id,
        actor=_actor(principal),
        method="agent.run",
        thread_id=params.thread_id,
        depth=principal.delegation_depth,
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
    principal = _authenticate(authorization)
    if request.method != "agent.resume":
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_METHOD_NOT_FOUND,
                message=f"Method {request.method} not found.",
            ),
        )
    try:
        params = ResumeRunParams.model_validate(request.params)
    except Exception as exc:
        return _reply(
            request.id,
            error=JsonRpcError(code=JSONRPC_INVALID_PARAMS, message=str(exc)),
        )
    max_depth = _enforce(principal, params.organization_id, "a2a:task:execute")
    if _request_store.jti_conflicts(
        params.organization_id, principal.jti, params.execution_id
    ):
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_JTI_REUSED,
                message="Token jti was already used on a different task.",
            ),
        )
    if principal.delegation_depth >= max_depth:
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_DEPTH_EXCEEDED,
                message=f"Delegation depth {principal.delegation_depth} meets the cap {max_depth}.",
            ),
        )
    row = _request_store.get_execution(params.organization_id, params.execution_id)
    if row is None or row.get("threadId") != params.thread_id:
        raise HTTPException(
            status_code=409,
            detail="Execution does not exist for this tenant.",
        )
    allowed = {
        ExecutionStatus.APPROVED.value,
        ExecutionStatus.REVISION_REQUESTED.value,
    }
    if row.get("status") not in allowed:
        return _reply(
            request.id,
            error=JsonRpcError(code=409, message="Execution is not awaiting a resume."),
        )
    _request_store.record_dispatch(
        params.organization_id,
        params.execution_id,
        actor=_actor(principal),
        method="agent.resume",
        thread_id=params.thread_id,
        depth=principal.delegation_depth,
        decision=params.review.decision.value,
        reviewer_id=params.review.reviewer_id,
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


@app.post("/agent/task")
def agent_task(request: JsonRpcRequest, authorization: str | None = Header(default=None)) -> dict:
    principal = _authenticate(authorization)
    if request.method not in ("task.get", "task.cancel"):
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_METHOD_NOT_FOUND,
                message=f"Method {request.method} not found.",
            ),
        )
    if request.method == "task.get":
        return _handle_task_get(request, principal)
    return _handle_task_cancel(request, principal)


def _handle_task_get(request: JsonRpcRequest, principal: AgentPrincipal) -> dict:
    try:
        params = TaskGetParams.model_validate(request.params)
    except Exception as exc:
        return _reply(
            request.id,
            error=JsonRpcError(code=JSONRPC_INVALID_PARAMS, message=str(exc)),
        )
    _enforce(principal, params.organization_id, "a2a:read")
    row = _request_store.get_task(
        params.organization_id,
        a2a_task_id=params.a2a_task_id,
        execution_id=params.execution_id,
    )
    not_found = JsonRpcError(
        code=JSONRPC_TASK_NOT_FOUND,
        message="Task does not exist for this tenant.",
    )
    if row is None:
        return _reply(request.id, error=not_found)
    expirable = {
        ExecutionStatus.PENDING_APPROVAL.value,
        ExecutionStatus.INPUT_REQUIRED.value,
    }
    if row.get("status") in expirable:
        _request_store.expire_if_due(params.organization_id, row["id"])
        row = _request_store.get_task(params.organization_id, execution_id=row["id"])
        if row is None:
            return _reply(request.id, error=not_found)
    return _reply(request.id, result=_task_view(row))


def _handle_task_cancel(request: JsonRpcRequest, principal: AgentPrincipal) -> dict:
    try:
        params = TaskCancelParams.model_validate(request.params)
    except Exception as exc:
        return _reply(
            request.id,
            error=JsonRpcError(code=JSONRPC_INVALID_PARAMS, message=str(exc)),
        )
    _enforce(principal, params.organization_id, "a2a:task:execute")
    target_id = params.execution_id or params.a2a_task_id or ""
    if _request_store.jti_conflicts(params.organization_id, principal.jti, target_id):
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_JTI_REUSED,
                message="Token jti was already used on a different task.",
            ),
        )
    try:
        row = _request_store.cancel_task(
            params.organization_id,
            a2a_task_id=params.a2a_task_id,
            execution_id=params.execution_id,
            actor=_actor(principal),
            reason=params.reason,
        )
    except AgentStateError:
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_INVALID_TRANSITION,
                message="Task is terminal and cannot transition to cancelled.",
            ),
        )
    if row is None:
        return _reply(
            request.id,
            error=JsonRpcError(
                code=JSONRPC_TASK_NOT_FOUND,
                message="Task does not exist for this tenant.",
            ),
        )
    return _reply(request.id, result=_task_view(row))
