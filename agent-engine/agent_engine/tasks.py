from __future__ import annotations

import os

from celery import Celery

from . import agents_workflow as engine
from .config import get_settings
from .schemas import ExecutionStatus, HumanReviewInput, NILBrief
from .store import Store

settings = get_settings()
_store = Store.from_settings(settings)

_on_vercel = bool(os.environ.get("VERCEL"))
celery_app = Celery(
    "blueprint_agent",
    broker="vercel://" if _on_vercel else settings.redis_url,
    backend="vercel-runtime-cache://" if _on_vercel else settings.redis_url,
)
celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_time_limit=600,
    task_soft_time_limit=540,
    result_expires=86400,
    broker_connection_retry_on_startup=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
)


def _current_status(organization_id: str, execution_id: str) -> str | None:
    row = _store.get_execution(organization_id, execution_id)
    if row is None:
        return None
    return str(row.get("status"))


def _noop_result(organization_id: str, execution_id: str, thread_id: str) -> dict:
    status = _current_status(organization_id, execution_id)
    return {
        "executionId": execution_id,
        "threadId": thread_id,
        "tenantId": organization_id,
        "status": status,
        "awaitingApproval": status == ExecutionStatus.PENDING_APPROVAL.value,
        "publishedPostUrl": None,
        "duplicate": True,
    }


def _already_advanced(organization_id: str, execution_id: str, allowed: set[str]) -> bool:
    status = _current_status(organization_id, execution_id)
    return status not in allowed


@celery_app.task(name="run_nil_generation_pipeline")
def run_nil_generation_pipeline(
    organization_id: str,
    execution_id: str,
    thread_id: str,
    brief: dict,
) -> dict:
    runnable = {ExecutionStatus.QUEUED.value, ExecutionStatus.RUNNING.value}
    if _already_advanced(organization_id, execution_id, runnable):
        return _noop_result(organization_id, execution_id, thread_id)
    try:
        brief_model = NILBrief.model_validate(brief)
        return engine.start_generation(
            organization_id=organization_id,
            execution_id=execution_id,
            thread_id=thread_id,
            brief=brief_model,
        )
    except Exception as exc:
        engine.mark_failed(organization_id, execution_id, str(exc))
        raise


@celery_app.task(name="resume_nil_pipeline_after_approval")
def resume_nil_pipeline_after_approval(
    organization_id: str,
    execution_id: str,
    thread_id: str,
    review: dict,
) -> dict:
    resumable = {ExecutionStatus.APPROVED.value, ExecutionStatus.REVISION_REQUESTED.value}
    if _already_advanced(organization_id, execution_id, resumable):
        return _noop_result(organization_id, execution_id, thread_id)
    try:
        review_model = HumanReviewInput.model_validate(review)
        return engine.resume_generation(
            organization_id=organization_id,
            execution_id=execution_id,
            thread_id=thread_id,
            review=review_model,
        )
    except Exception as exc:
        engine.mark_failed(organization_id, execution_id, str(exc))
        raise
