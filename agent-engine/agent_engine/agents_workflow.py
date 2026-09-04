from __future__ import annotations

import psycopg
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from .config import get_settings
from .llm import OmniRouteClient
from .publisher import PublishGateway
from .rules import compliance_audit
from .schemas import (
    ApprovalDecision,
    ExecutionStatus,
    HumanReviewInput,
    NILBrief,
    NILGraphState,
)
from .store import AgentStateError, Store

_settings = get_settings()
_store = Store.from_settings(_settings)
_llm = OmniRouteClient.from_settings(_settings)
_publisher = PublishGateway.from_settings(_settings)
_graph: object | None = None


def _content_agent_node(state: NILGraphState) -> dict:
    brief = state["brief"]
    previous = state.get("captions") or []
    feedback = state.get("reviewer_feedback")
    _store.set_status(
        state["tenant_id"],
        state["execution_id"],
        ExecutionStatus.RUNNING,
        allowed=(
            ExecutionStatus.QUEUED,
            ExecutionStatus.RUNNING,
            ExecutionStatus.REVISION_REQUESTED,
        ),
    )
    captions = _llm.generate_captions(brief=brief, previous=previous, feedback=feedback)
    return {
        "captions": captions,
        "compliance": None,
        "decision": None,
        "reviewer_id": None,
        "reviewer_feedback": None,
        "status": ExecutionStatus.RUNNING,
    }


def _compliance_agent_node(state: NILGraphState) -> dict:
    brief = state["brief"]
    captions = state["captions"]
    report = compliance_audit(brief, captions, llm=_llm)
    captions_payload = [caption.model_dump(mode="json", by_alias=True) for caption in captions]
    _store.persist_pending_approval(
        state["tenant_id"],
        state["execution_id"],
        report,
        captions_payload,
    )
    return {"compliance": report, "status": ExecutionStatus.PENDING_APPROVAL}


def _hitl_node(state: NILGraphState) -> dict:
    resume_value = interrupt(
        {
            "node": "hitl_node",
            "action": "review_before_publish",
            "executionId": state["execution_id"],
            "tenantId": state["tenant_id"],
            "threadId": state["thread_id"],
        }
    )
    review = HumanReviewInput.model_validate(resume_value)
    return {
        "decision": review.decision,
        "reviewer_id": review.reviewer_id,
        "reviewer_feedback": review.feedback,
    }


def _publisher_agent_node(state: NILGraphState) -> dict:
    brief = state["brief"]
    captions = state.get("captions") or []
    selected = next(
        (caption for caption in captions if caption.selected),
        captions[0] if captions else None,
    )
    if selected is None:
        raise AgentStateError("No caption is available to publish.")
    url = _publisher.publish(brief=brief, caption=selected)
    _store.mark_published(state["tenant_id"], state["execution_id"], url)
    return {"published_post_url": url, "status": ExecutionStatus.PUBLISHED}


def _route_after_review(state: NILGraphState) -> str:
    if state.get("decision") == ApprovalDecision.APPROVED:
        return "publisher_agent_node"
    return "content_agent_node"


def _build_checkpointer() -> PostgresSaver:
    connection = psycopg.connect(_settings.database_url)
    saver = PostgresSaver(connection)
    saver.setup()
    return saver


def _get_graph():
    global _graph
    if _graph is None:
        builder = StateGraph(NILGraphState)
        builder.add_node("content_agent_node", _content_agent_node)
        builder.add_node("compliance_agent_node", _compliance_agent_node)
        builder.add_node("hitl_node", _hitl_node)
        builder.add_node("publisher_agent_node", _publisher_agent_node)
        builder.add_edge(START, "content_agent_node")
        builder.add_edge("content_agent_node", "compliance_agent_node")
        builder.add_edge("compliance_agent_node", "hitl_node")
        builder.add_conditional_edges(
            "hitl_node",
            _route_after_review,
            {
                "content_agent_node": "content_agent_node",
                "publisher_agent_node": "publisher_agent_node",
            },
        )
        builder.add_edge("publisher_agent_node", END)
        _graph = builder.compile(checkpointer=_build_checkpointer())
    return _graph


def thread_config(thread_id: str) -> dict:
    return {"configurable": {"thread_id": thread_id}}


def start_generation(
    *,
    organization_id: str,
    execution_id: str,
    thread_id: str,
    brief: NILBrief,
) -> dict:
    initial: NILGraphState = {
        "tenant_id": organization_id,
        "athlete_id": brief.athlete_id,
        "execution_id": execution_id,
        "thread_id": thread_id,
        "brief": brief,
        "captions": [],
        "status": ExecutionStatus.QUEUED,
    }
    result = _get_graph().invoke(initial, config=thread_config(thread_id))
    return _summarize(result)


def resume_generation(
    *,
    organization_id: str,
    execution_id: str,
    thread_id: str,
    review: HumanReviewInput,
) -> dict:
    expected = (
        ExecutionStatus.APPROVED
        if review.decision == ApprovalDecision.APPROVED
        else ExecutionStatus.REVISION_REQUESTED
    )
    _store.assert_review_target(organization_id, execution_id, expected)
    result = _get_graph().invoke(
        Command(resume=review.model_dump(mode="json", by_alias=True)),
        config=thread_config(thread_id),
    )
    return _summarize(result)


def mark_failed(organization_id: str, execution_id: str, message: str) -> None:
    try:
        _store.mark_failed(organization_id, execution_id, message)
    except AgentStateError:
        pass


def _summarize(state: dict) -> dict:
    raw_status = state.get("status")
    if isinstance(raw_status, ExecutionStatus):
        status = raw_status.value
    elif raw_status is None:
        status = None
    else:
        status = str(raw_status)
    return {
        "executionId": state.get("execution_id"),
        "threadId": state.get("thread_id"),
        "tenantId": state.get("tenant_id"),
        "status": status,
        "awaitingApproval": status == ExecutionStatus.PENDING_APPROVAL.value,
        "publishedPostUrl": state.get("published_post_url"),
    }

