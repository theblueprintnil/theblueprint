from __future__ import annotations

import time
from typing import Any

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from agent_engine import api as gateway
from agent_engine.store import AgentStateError

ORG = "org-1"
ISSUER = gateway._settings.agent_jwt_issuer
AUDIENCE = gateway._settings.agent_jwt_audience


class FakeRequestStore:
    def __init__(self) -> None:
        self.tasks: dict[tuple[str, str], dict[str, Any]] = {}
        self.ledger: list[dict[str, Any]] = []
        self.registrations: dict[str, dict[str, Any]] = {}
        self.jti_targets: dict[str, str] = {}
        self.dispatched: list[str] = []

    def get_task(
        self,
        organization_id: str,
        *,
        a2a_task_id: str | None = None,
        execution_id: str | None = None,
    ) -> dict[str, Any] | None:
        for row in self.tasks.values():
            if row["organizationId"] != organization_id:
                continue
            if execution_id is not None and row["id"] == execution_id:
                return dict(row)
            if a2a_task_id is not None and row.get("a2aTaskId") == a2a_task_id:
                return dict(row)
        return None

    def get_execution(self, organization_id: str, execution_id: str) -> dict[str, Any] | None:
        return self.get_task(organization_id, execution_id=execution_id)

    def cancel_task(
        self,
        organization_id: str,
        *,
        a2a_task_id: str | None = None,
        execution_id: str | None = None,
        actor: Any = None,
        reason: str | None = None,
    ) -> dict[str, Any] | None:
        if bool(a2a_task_id) == bool(execution_id):
            raise AgentStateError("exactly one reference is required")
        for stored in self.tasks.values():
            if stored["organizationId"] != organization_id:
                continue
            if (execution_id is not None and stored["id"] == execution_id) or (
                a2a_task_id is not None and stored.get("a2aTaskId") == a2a_task_id
            ):
                if stored["status"] in {"PUBLISHED", "FAILED", "CANCELLED", "EXPIRED"}:
                    raise AgentStateError("terminal")
                stored["status"] = "CANCELLED"
                self.ledger.append({"action": "TASK_CANCELLED", "targetId": stored["id"]})
                return dict(stored)
        return None

    def expire_if_due(self, organization_id: str, execution_id: str) -> bool:
        row = self.tasks.get((organization_id, execution_id))
        if row is None:
            return False
        expires = row.get("expiresAt")
        if (
            row["status"] in {"PENDING_APPROVAL", "INPUT_REQUIRED"}
            and expires is not None
            and expires < time.time()
        ):
            row["status"] = "EXPIRED"
            self.ledger.append({"action": "TASK_EXPIRED", "targetId": execution_id})
            return True
        return False

    def record_dispatch(
        self, organization_id: str, execution_id: str, **kwargs: Any
    ) -> None:
        self.dispatched.append(execution_id)
        self.ledger.append({"action": "TASK_DISPATCHED", "targetId": execution_id})

    def jti_conflicts(self, organization_id: str, jti: str, target_id: str) -> bool:
        return self.jti_targets.get(jti, target_id) != target_id

    def registration_for(self, organization_id: str, agent_id: str) -> dict[str, Any] | None:
        return self.registrations.get(agent_id)

    def append_audit_entry(self, conn: Any, **kwargs: Any) -> int:
        self.ledger.append(
            {
                "action": kwargs.get("action"),
                "targetId": kwargs.get("target_id"),
                "outcome": kwargs.get("outcome"),
            }
        )
        return len(self.ledger)

    class _NoOpContext:
        def __enter__(self) -> None:
            return None

        def __exit__(self, *exc: Any) -> bool:
            return False

    def org_transaction(self, organization_id: str) -> "FakeRequestStore._NoOpContext":
        return self._NoOpContext()


@pytest.fixture(scope="module")
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


@pytest.fixture(scope="module")
def public_pem(rsa_key):
    return (
        rsa_key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("ascii")
    )


class _FakeAsyncResult:
    id = "celery-1"


class _FakeTaskFn:
    @staticmethod
    def delay(*args: Any, **kwargs: Any) -> _FakeAsyncResult:
        return _FakeAsyncResult()


@pytest.fixture
def store(monkeypatch, public_pem):
    fake = FakeRequestStore()
    fake.registrations["agent-outreach"] = {
        "agentId": "agent-outreach",
        "orgId": None,
        "scopes": ["a2a:read", "a2a:task:execute", "a2a:propose"],
        "status": "ACTIVE",
        "maxDepth": 5,
        "minTier": "YOUTH",
    }
    fake.tasks[(ORG, "exec-1")] = {
        "id": "exec-1",
        "organizationId": ORG,
        "threadId": "thread-1",
        "status": "QUEUED",
        "a2aTaskId": "a2a-1",
        "depth": 0,
        "expiresAt": None,
        "createdAt": None,
    }
    monkeypatch.setattr(gateway, "_request_store", fake)
    monkeypatch.setattr(gateway, "_KEY_CANDIDATES", {"k1": public_pem})
    monkeypatch.setattr(gateway, "run_nil_generation_pipeline", _FakeTaskFn)
    monkeypatch.setattr(gateway, "resume_nil_pipeline_after_approval", _FakeTaskFn)
    return fake


@pytest.fixture(scope="module")
def client():
    return TestClient(gateway.app)


def _token(rsa_key, *, scopes=None, org=ORG, agent_id="agent-outreach", depth=0, jti="jti-1"):
    now = int(time.time())
    claims = {
        "sub": "agent-subject-1",
        "iss": ISSUER,
        "aud": AUDIENCE,
        "exp": now + 600,
        "iat": now,
        "jti": jti,
        "tenant_id": org,
        "org_id": org,
        "agent_id": agent_id,
        "scopes": scopes or ["a2a:read", "a2a:task:execute"],
        "delegation_depth": depth,
    }
    return pyjwt.encode(claims, rsa_key, algorithm="RS256", headers={"kid": "k1"})


def _auth(rsa_key, **kwargs):
    return {"authorization": f"Bearer {_token(rsa_key, **kwargs)}"}


def _post(client, path, method, params, headers):
    return client.post(
        path,
        headers=headers,
        json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
    )


def _run_params():
    return {
        "organizationId": ORG,
        "executionId": "exec-1",
        "threadId": "thread-1",
        "brief": {
            "tenantId": ORG,
            "athleteId": "athlete-1",
            "athleteName": "Jordan Carter",
            "brand": "Apex Nutrition",
            "campaignTitle": "Apex Launch",
            "contentGoal": "Announce the partnership.",
        },
    }


def test_well_known_card_matches_contract(client):
    response = client.get("/.well-known/agent.json")
    assert response.status_code == 200
    card = response.json()
    assert card["id"] == "blueprint-nil-agent"
    assert card["publisher"] == "platform"
    assert {skill["name"] for skill in card["skills"]} == {
        "generate_post",
        "audit_contract",
        "propose_deal",
    }
    assert card["maxDepth"] == 5
    assert "a2a:task:execute" in card["scopes"]
    assert card["transport"]["protocol"] == "jsonrpc-2.0"
    assert card["transport"]["errorCodes"]["depthExceeded"] == -32001
    assert client.get("/agent/card").json() == card


def test_missing_token_is_rejected(client, store):
    assert client.post("/agent/task", json={"jsonrpc": "2.0", "id": 1, "method": "task.get", "params": {}}).status_code == 401


def test_shared_secret_style_token_is_rejected(client, store):
    response = client.post(
        "/agent/task",
        headers={"authorization": "Bearer some-static-shared-secret"},
        json={"jsonrpc": "2.0", "id": 1, "method": "task.get", "params": {}},
    )
    assert response.status_code == 401


def test_missing_keys_fail_closed(client, store, monkeypatch):
    monkeypatch.setattr(gateway, "_KEY_CANDIDATES", {})
    response = client.post(
        "/agent/task",
        headers={"authorization": "Bearer anything"},
        json={"jsonrpc": "2.0", "id": 1, "method": "task.get", "params": {}},
    )
    assert response.status_code == 503


def test_task_get_returns_lifecycle_state(client, store, rsa_key):
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": ORG, "a2aTaskId": "a2a-1"},
        _auth(rsa_key),
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["executionId"] == "exec-1"
    assert result["status"] == "QUEUED"
    assert result["state"] == "created"
    assert result["depth"] == 0


def test_task_get_unknown_task_is_uniform_not_found(client, store, rsa_key):
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": ORG, "executionId": "ghost"},
        _auth(rsa_key),
    )
    assert response.status_code == 200
    assert response.json()["error"]["code"] == -32002


def test_task_get_cross_tenant_org_is_rejected_before_lookup(client, store, rsa_key):
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": "org-other", "a2aTaskId": "a2a-1"},
        _auth(rsa_key),
    )
    assert response.status_code == 403
    assert any(entry["action"] == "REQUEST_REJECTED" for entry in store.ledger)


def test_task_get_requires_read_scope(client, store, rsa_key):
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": ORG, "a2aTaskId": "a2a-1"},
        _auth(rsa_key, scopes=["a2a:task:execute"]),
    )
    assert response.status_code == 403


def test_task_cancel_appends_ledger_entry(client, store, rsa_key):
    response = _post(
        client,
        "/agent/task",
        "task.cancel",
        {"organizationId": ORG, "executionId": "exec-1", "reason": "stale campaign"},
        _auth(rsa_key, jti="jti-cancel"),
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["status"] == "CANCELLED"
    assert result["state"] == "cancelled"
    assert any(entry["action"] == "TASK_CANCELLED" for entry in store.ledger)


def test_task_cancel_on_terminal_returns_invalid_transition(client, store, rsa_key):
    store.tasks[(ORG, "exec-1")]["status"] = "PUBLISHED"
    response = _post(
        client,
        "/agent/task",
        "task.cancel",
        {"organizationId": ORG, "executionId": "exec-1"},
        _auth(rsa_key, jti="jti-cancel-2"),
    )
    assert response.status_code == 200
    assert response.json()["error"]["code"] == -32003


def test_task_cancel_with_reused_jti_is_rejected(client, store, rsa_key):
    store.jti_targets["jti-reused"] = "exec-other"
    response = _post(
        client,
        "/agent/task",
        "task.cancel",
        {"organizationId": ORG, "executionId": "exec-1"},
        _auth(rsa_key, jti="jti-reused"),
    )
    assert response.status_code == 200
    assert response.json()["error"]["code"] == -32004


def test_agent_run_depth_at_registered_cap_is_rejected(client, store, rsa_key):
    store.registrations["agent-outreach"]["maxDepth"] = 2
    response = _post(
        client,
        "/agent/run",
        "agent.run",
        _run_params(),
        _auth(rsa_key, depth=2),
    )
    assert response.status_code == 200
    assert response.json()["error"]["code"] == -32001


def test_agent_run_under_depth_cap_dispatches(client, store, rsa_key):
    store.registrations["agent-outreach"]["maxDepth"] = 2
    store.tasks[(ORG, "exec-1")]["status"] = "QUEUED"
    response = _post(
        client,
        "/agent/run",
        "agent.run",
        _run_params(),
        _auth(rsa_key, depth=1, jti="jti-run-1"),
    )
    assert response.status_code == 200
    assert response.json()["result"]["taskId"] == "celery-1"
    assert "exec-1" in store.dispatched


def test_unregistered_agent_is_rejected(client, store, rsa_key):
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": ORG, "a2aTaskId": "a2a-1"},
        _auth(rsa_key, agent_id="agent-ghost"),
    )
    assert response.status_code == 403


def test_token_scopes_exceeding_registration_are_rejected(client, store, rsa_key):
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": ORG, "a2aTaskId": "a2a-1"},
        _auth(rsa_key, scopes=["a2a:read", "a2a:sign"]),
    )
    assert response.status_code == 403


def test_inactive_registration_is_rejected(client, store, rsa_key):
    store.registrations["agent-outreach"]["status"] = "SUSPENDED"
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": ORG, "a2aTaskId": "a2a-1"},
        _auth(rsa_key),
    )
    assert response.status_code == 403


def test_task_get_lazily_expires_overdue_task(client, store, rsa_key):
    store.registrations["agent-outreach"]["status"] = "ACTIVE"
    store.tasks[(ORG, "exec-1")]["status"] = "PENDING_APPROVAL"
    store.tasks[(ORG, "exec-1")]["expiresAt"] = time.time() - 60
    response = _post(
        client,
        "/agent/task",
        "task.get",
        {"organizationId": ORG, "executionId": "exec-1"},
        _auth(rsa_key),
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["status"] == "EXPIRED"
    assert result["state"] == "expired"
    assert any(entry["action"] == "TASK_EXPIRED" for entry in store.ledger)

