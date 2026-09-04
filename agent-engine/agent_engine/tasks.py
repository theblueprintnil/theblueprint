from __future__ import annotations

from celery import Celery

from . import agents_workflow as engine
from .config import get_settings
from .schemas import HumanReviewInput, NILBrief

settings = get_settings()

celery_app = Celery("blueprint_agent", broker=settings.redis_url, backend=settings.redis_url)
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


@celery_app.task(name="run_nil_generation_pipeline")
def run_nil_generation_pipeline(
    organization_id: str,
    execution_id: str,
    thread_id: str,
    brief: dict,
) -> dict:
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
