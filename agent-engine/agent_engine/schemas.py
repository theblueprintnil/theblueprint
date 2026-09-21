from __future__ import annotations

import enum
import uuid
from typing import Any, Literal, TypedDict

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RiskType(str, enum.Enum):
    FTC_DISCLOSURE = "ftc_disclosure"
    NCAA_ELIGIBILITY = "ncaa_eligibility"
    BRAND_EXCLUSIVITY = "brand_exclusivity"
    STATE_LAW = "state_law"
    PLATFORM_POLICY = "platform_policy"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ExecutionStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    PUBLISHED = "PUBLISHED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    INPUT_REQUIRED = "INPUT_REQUIRED"


TERMINAL_STATUSES = (
    ExecutionStatus.PUBLISHED,
    ExecutionStatus.FAILED,
    ExecutionStatus.CANCELLED,
    ExecutionStatus.EXPIRED,
)

SPEC_STATE_BY_STATUS = {
    ExecutionStatus.QUEUED: "created",
    ExecutionStatus.RUNNING: "working",
    ExecutionStatus.PENDING_APPROVAL: "staged",
    ExecutionStatus.APPROVED: "approved",
    ExecutionStatus.REVISION_REQUESTED: "revision-requested",
    ExecutionStatus.PUBLISHED: "completed",
    ExecutionStatus.FAILED: "failed",
    ExecutionStatus.CANCELLED: "cancelled",
    ExecutionStatus.EXPIRED: "expired",
    ExecutionStatus.INPUT_REQUIRED: "input-required",
}


class ApprovalDecision(str, enum.Enum):
    APPROVED = "APPROVED"
    REVISION_REQUESTED = "REVISION_REQUESTED"


class ComplianceFlag(CamelModel):
    risk_type: RiskType
    severity: Severity
    flag_message: str
    recommended_edit: str = ""


class ComplianceReport(CamelModel):
    score: float = Field(ge=0.0, le=1.0)
    flags: list[ComplianceFlag] = Field(default_factory=list)

    def publishable(self) -> bool:
        return not any(
            flag.severity in (Severity.HIGH, Severity.CRITICAL) for flag in self.flags
        )


class CaptionVariant(CamelModel):
    id: str
    platform: str
    text: str
    hashtags: list[str] = Field(default_factory=list)
    selected: bool = False


class NILBrief(CamelModel):
    tenant_id: str
    athlete_id: str
    athlete_name: str
    brand: str
    campaign_title: str
    content_goal: str
    sport: str | None = None
    school: str | None = None
    platforms: list[str] = Field(default_factory=lambda: ["instagram"])
    exclusivity_terms: list[str] = Field(default_factory=list)
    policy_snapshot_id: str = "ncaa-nil-v1-2026"
    deliverables_count: int = 1
    caption_count: int = Field(default=3, ge=1, le=6)
    inspiration: list[str] = Field(default_factory=list)


class HumanReviewInput(CamelModel):
    decision: ApprovalDecision
    reviewer_id: str | None = None
    feedback: str | None = None


class StartRunParams(CamelModel):
    organization_id: str
    execution_id: str
    thread_id: str
    brief: NILBrief


class ResumeRunParams(CamelModel):
    organization_id: str
    execution_id: str
    thread_id: str
    review: HumanReviewInput


class TaskRefParams(CamelModel):
    organization_id: str
    a2a_task_id: str | None = Field(default=None, alias="a2aTaskId")
    execution_id: str | None = None

    @model_validator(mode="after")
    def _require_exactly_one_ref(self) -> "TaskRefParams":
        if bool(self.a2a_task_id) == bool(self.execution_id):
            raise ValueError("exactly one of a2aTaskId or executionId is required")
        return self


class TaskGetParams(TaskRefParams):
    pass


class TaskCancelParams(TaskRefParams):
    reason: str | None = None


class JsonRpcRequest(CamelModel):
    jsonrpc: Literal["2.0"] = "2.0"
    id: str | int
    method: str
    params: dict[str, Any] = Field(default_factory=dict)


class JsonRpcError(CamelModel):
    code: int
    message: str
    data: Any = None


class JsonRpcResponse(CamelModel):
    jsonrpc: Literal["2.0"] = "2.0"
    id: str | int | None = None
    result: Any = None
    error: JsonRpcError | None = None


class A2AContentPart(CamelModel):
    kind: Literal["text", "file", "data"] = "text"
    text: str | None = None
    data: Any = None


class A2AMessage(CamelModel):
    message_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    role: Literal["user", "agent"]
    parts: list[A2AContentPart] = Field(default_factory=list)
    task_id: str | None = None


class A2AArtifact(CamelModel):
    artifact_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    name: str
    kind: Literal["text", "file", "data"] = "text"
    text: str | None = None
    data: Any = None


class A2ATask(CamelModel):
    id: str
    thread_id: str
    tenant_id: str
    status: ExecutionStatus
    state: str
    a2a_task_id: str | None = Field(default=None, alias="a2aTaskId")
    parent_task_id: str | None = None
    depth: int = 0
    created_at: str | None = None
    messages: list[A2AMessage] = Field(default_factory=list)
    artifacts: list[A2AArtifact] = Field(default_factory=list)


class A2ASkill(CamelModel):
    name: str
    input: dict[str, Any] = Field(default_factory=dict)
    output: dict[str, Any] = Field(default_factory=dict)


class A2AAgentCard(CamelModel):
    id: str
    name: str
    version: str
    publisher: str
    description: str
    url: str
    skills: list[A2ASkill] = Field(default_factory=list)
    scopes: list[str] = Field(default_factory=list)
    min_tier: str = "RESTRICTED"
    delegates: list[str] = Field(default_factory=list)
    max_depth: int = 5
    auth: dict[str, str] = Field(default_factory=dict)
    transport: dict[str, Any] = Field(default_factory=dict)


class NILGraphState(TypedDict, total=False):
    tenant_id: str
    athlete_id: str
    execution_id: str
    thread_id: str
    brief: NILBrief
    captions: list[CaptionVariant]
    compliance: ComplianceReport | None
    status: ExecutionStatus
    decision: ApprovalDecision | None
    reviewer_id: str | None
    reviewer_feedback: str | None
    published_post_url: str | None
    error: str | None
