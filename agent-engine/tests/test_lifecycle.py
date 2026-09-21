from __future__ import annotations

import pytest
from pydantic import ValidationError

from agent_engine.schemas import (
    ExecutionStatus,
    SPEC_STATE_BY_STATUS,
    TERMINAL_STATUSES,
    TaskCancelParams,
    TaskGetParams,
)
from agent_engine.tasks import RESUMABLE_STATUSES, RUNNABLE_STATUSES


def test_new_lifecycle_statuses_exist():
    assert ExecutionStatus.CANCELLED.value == "CANCELLED"
    assert ExecutionStatus.EXPIRED.value == "EXPIRED"
    assert ExecutionStatus.INPUT_REQUIRED.value == "INPUT_REQUIRED"


def test_every_status_maps_to_a_spec_state():
    for status in ExecutionStatus:
        assert SPEC_STATE_BY_STATUS[status] != "unknown"
    assert len(SPEC_STATE_BY_STATUS) == len(list(ExecutionStatus))
    assert SPEC_STATE_BY_STATUS[ExecutionStatus.QUEUED] == "created"
    assert SPEC_STATE_BY_STATUS[ExecutionStatus.INPUT_REQUIRED] == "input-required"
    assert SPEC_STATE_BY_STATUS[ExecutionStatus.CANCELLED] == "cancelled"
    assert SPEC_STATE_BY_STATUS[ExecutionStatus.EXPIRED] == "expired"


def test_terminal_statuses_are_exactly_four():
    assert {status.value for status in TERMINAL_STATUSES} == {
        "PUBLISHED",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
    }


def test_redelivery_guards_exclude_terminal_states():
    assert "CANCELLED" not in RUNNABLE_STATUSES
    assert "EXPIRED" not in RUNNABLE_STATUSES
    assert "CANCELLED" not in RESUMABLE_STATUSES
    assert "EXPIRED" not in RESUMABLE_STATUSES
    assert RUNNABLE_STATUSES == {"QUEUED", "RUNNING"}
    assert RESUMABLE_STATUSES == {"APPROVED", "REVISION_REQUESTED"}


def test_task_ref_requires_exactly_one_identifier():
    assert TaskGetParams(organization_id="org-1", a2a_task_id="a2a-1").a2a_task_id == "a2a-1"
    assert TaskGetParams(organization_id="org-1", execution_id="exec-1").execution_id == "exec-1"
    with pytest.raises(ValidationError):
        TaskGetParams(organization_id="org-1")
    with pytest.raises(ValidationError):
        TaskGetParams(organization_id="org-1", a2a_task_id="a2a-1", execution_id="exec-1")


def test_cancel_params_accept_optional_reason():
    params = TaskCancelParams(organization_id="org-1", execution_id="exec-1", reason="stale")
    assert params.reason == "stale"
    assert TaskCancelParams(organization_id="org-1", execution_id="exec-1").reason is None


def test_depth_cap_constant_is_five():
    from agent_engine.identity import MAX_DELEGATION_DEPTH

    assert MAX_DELEGATION_DEPTH == 5
