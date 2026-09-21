from __future__ import annotations

import json
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator

from psycopg import sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .audit import GENESIS_PREV_HASH, canonical_json, entry_hash, verify_chain
from .config import Settings, get_settings
from .schemas import ComplianceReport, ExecutionStatus, SPEC_STATE_BY_STATUS, TERMINAL_STATUSES


class AgentStateError(RuntimeError):
    pass


@dataclass(frozen=True)
class AuditActor:
    actor_type: str
    actor_id: str | None
    actor_jti: str | None
    scopes: tuple[str, ...] = ()


ENGINE_ACTOR = AuditActor(
    actor_type="agent",
    actor_id="blueprint-agent-engine",
    actor_jti=None,
    scopes=("a2a:task:execute",),
)


_TASK = sql.Identifier("AgentTaskExecution")
_AUDIT = sql.Identifier("AuditLog")
_LEDGER = sql.Identifier("A2AAuditEntry")
_REGISTRATION = sql.Identifier("AgentRegistration")


def _col(name: str) -> sql.Identifier:
    return sql.Identifier(name)


class Store:
    def __init__(self, dsn: str) -> None:
        self._pool = ConnectionPool(
            dsn,
            min_size=1,
            max_size=5,
            open=False,
            kwargs={"row_factory": dict_row},
        )
        self._open_lock = threading.Lock()
        self._pool_opened = False

    def _ensure_pool_open(self) -> None:
        if self._pool_opened:
            return
        with self._open_lock:
            if not self._pool_opened:
                self._pool.open()
                self._pool_opened = True

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "Store":
        current = settings or get_settings()
        return cls(dsn=current.database_url)

    @classmethod
    def request_store(cls, settings: Settings | None = None) -> "Store":
        current = settings or get_settings()
        return cls(dsn=current.agent_database_url or current.database_url)

    @contextmanager
    def org_transaction(self, organization_id: str) -> Iterator[Any]:
        self._ensure_pool_open()
        with self._pool.connection() as conn:
            with conn.transaction():
                conn.execute(
                    "SELECT set_config('app.current_org_id', %s, true)",
                    (organization_id,),
                )
                yield conn

    def append_audit_entry(
        self,
        conn: Any,
        *,
        organization_id: str,
        action: str,
        actor: AuditActor,
        target_type: str = "AgentTaskExecution",
        target_id: str | None = None,
        outcome: str = "ok",
        payload: dict[str, Any] | None = None,
        link_execution_id: str | None = None,
    ) -> int:
        conn.execute(
            sql.SQL("SELECT pg_advisory_xact_lock(hashtext(%s))"),
            (organization_id,),
        )
        last = conn.execute(
            sql.SQL(
                'SELECT "sequence", "entryHash" FROM {ledger} '
                'WHERE "organizationId" = %s ORDER BY "sequence" DESC LIMIT 1'
            ).format(ledger=_LEDGER),
            (organization_id,),
        ).fetchone()
        if last is None:
            sequence = 1
            prev_hash = GENESIS_PREV_HASH
        else:
            sequence = int(last["sequence"]) + 1
            prev_hash = str(last["entryHash"])
        entry_payload: dict[str, Any] = dict(payload or {})
        if actor.scopes:
            entry_payload["scopes"] = sorted(actor.scopes)
        entry_hash_value = entry_hash(organization_id, sequence, prev_hash, entry_payload)
        inserted = conn.execute(
            sql.SQL(
                'INSERT INTO {ledger} ("id", "organizationId", "sequence", "action", "actorType", '
                '"actorId", "actorJti", "targetType", "targetId", "outcome", "payload", '
                '"prevHash", "entryHash") '
                "VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s) "
                'RETURNING "sequence"'
            ).format(ledger=_LEDGER),
            (
                organization_id,
                sequence,
                action,
                actor.actor_type,
                actor.actor_id,
                actor.actor_jti,
                target_type,
                target_id,
                outcome,
                canonical_json(entry_payload),
                prev_hash,
                entry_hash_value,
            ),
        ).fetchone()
        if link_execution_id is not None:
            conn.execute(
                sql.SQL(
                    'UPDATE {task} SET "auditSequence" = %s, "updatedAt" = now() '
                    'WHERE "organizationId" = %s AND "id" = %s'
                ).format(task=_TASK),
                (sequence, organization_id, link_execution_id),
            )
        return int(inserted["sequence"])

    def _audit(
        self,
        conn: Any,
        *,
        organization_id: str,
        actor_id: str | None,
        action: str,
        entity_id: str,
        details: dict[str, Any],
    ) -> None:
        query = sql.SQL(
            "INSERT INTO {audit} ({action}, {entity_type}, {entity_id}, {actor}, {details}, {org}, {created}) "
            "VALUES (%s, %s, %s, %s, %s, %s, now())"
        ).format(
            audit=_AUDIT,
            action=_col("action"),
            entity_type=_col("entityType"),
            entity_id=_col("entityId"),
            actor=_col("actorId"),
            details=_col("details"),
            org=_col("organizationId"),
            created=_col("createdAt"),
        )
        with conn.cursor() as cur:
            cur.execute(
                query,
                (
                    action,
                    "AgentTaskExecution",
                    entity_id,
                    actor_id,
                    json.dumps(details, ensure_ascii=False),
                    organization_id,
                ),
            )

    def _expect_updated(
        self,
        query: sql.Composed,
        params: list[Any],
        execution_id: str,
        status: str,
    ) -> None:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                rowcount = int(cur.rowcount or 0)
        if rowcount == 0:
            raise AgentStateError(
                f"Execution {execution_id} cannot transition to {status} in this tenant."
            )

    def get_execution(self, organization_id: str, execution_id: str) -> dict[str, Any] | None:
        query = sql.SQL(
            "SELECT {id}, {org}, {athlete}, {thread}, {status}, {a2a}, {depth}, {expires} FROM {task} "
            "WHERE {org_col} = %s AND {id_col} = %s"
        ).format(
            id=_col("id"),
            org=_col("organizationId"),
            athlete=_col("athleteId"),
            thread=_col("threadId"),
            status=_col("status"),
            a2a=_col("a2aTaskId"),
            depth=_col("depth"),
            expires=_col("expiresAt"),
            task=_TASK,
            org_col=_col("organizationId"),
            id_col=_col("id"),
        )
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (organization_id, execution_id))
                return cur.fetchone()

    def get_task(
        self,
        organization_id: str,
        *,
        a2a_task_id: str | None = None,
        execution_id: str | None = None,
    ) -> dict[str, Any] | None:
        if bool(a2a_task_id) == bool(execution_id):
            raise AgentStateError("exactly one of a2a_task_id or execution_id is required")
        if a2a_task_id is not None:
            condition = sql.SQL("{a2a} = %s").format(a2a=_col("a2aTaskId"))
            reference: Any = a2a_task_id
        else:
            condition = sql.SQL("{id} = %s").format(id=_col("id"))
            reference = execution_id
        query = sql.SQL(
            "SELECT {id}, {org}, {thread}, {status}, {a2a}, {parent}, {depth}, {expires}, "
            "{score}, {published}, {error}, {audit_seq}, {created} FROM {task} "
            "WHERE {org_col} = %s AND {condition}"
        ).format(
            id=_col("id"),
            org=_col("organizationId"),
            thread=_col("threadId"),
            status=_col("status"),
            a2a=_col("a2aTaskId"),
            parent=_col("parentTaskId"),
            depth=_col("depth"),
            expires=_col("expiresAt"),
            score=_col("complianceScore"),
            published=_col("publishedPostUrl"),
            error=_col("errorMessage"),
            audit_seq=_col("auditSequence"),
            created=_col("createdAt"),
            task=_TASK,
            org_col=_col("organizationId"),
            condition=condition,
        )
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (organization_id, reference))
                return cur.fetchone()

    def cancel_task(
        self,
        organization_id: str,
        *,
        a2a_task_id: str | None = None,
        execution_id: str | None = None,
        actor: AuditActor,
        reason: str | None = None,
    ) -> dict[str, Any] | None:
        row = self.get_task(
            organization_id, a2a_task_id=a2a_task_id, execution_id=execution_id
        )
        if row is None:
            return None
        terminal = [status.value for status in TERMINAL_STATUSES]
        placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in terminal)
        query = sql.SQL(
            "UPDATE {task} SET {status} = %s, {cancelled} = now(), {completed} = now(), "
            "{updated} = now() WHERE {org} = %s AND {id} = %s AND {status_col} NOT IN ({placeholders})"
        ).format(
            task=_TASK,
            status=_col("status"),
            cancelled=_col("cancelledAt"),
            completed=_col("completedAt"),
            updated=_col("updatedAt"),
            org=_col("organizationId"),
            id=_col("id"),
            status_col=_col("status"),
            placeholders=placeholders,
        )
        payload = {"reason": reason} if reason else None
        details = {"reason": reason} if reason else {}
        with self.org_transaction(organization_id) as conn:
            cur = conn.execute(
                query,
                [ExecutionStatus.CANCELLED.value, organization_id, row["id"], *terminal],
            )
            if int(cur.rowcount or 0) == 0:
                raise AgentStateError(
                    f"Execution {row['id']} cannot transition to CANCELLED in this tenant."
                )
            self.append_audit_entry(
                conn,
                organization_id=organization_id,
                action="TASK_CANCELLED",
                actor=actor,
                target_id=row["id"],
                payload=payload,
                link_execution_id=row["id"],
            )
            self._audit(
                conn,
                organization_id=organization_id,
                actor_id=actor.actor_id if actor.actor_type == "user" else None,
                action="AGENT_EXECUTION_CANCELLED",
                entity_id=row["id"],
                details=details,
            )
        return self.get_task(organization_id, execution_id=row["id"])

    def expire_if_due(self, organization_id: str, execution_id: str) -> bool:
        expirable = [ExecutionStatus.PENDING_APPROVAL.value, ExecutionStatus.INPUT_REQUIRED.value]
        placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in expirable)
        query = sql.SQL(
            "UPDATE {task} SET {status} = %s, {completed} = now(), {updated} = now() "
            "WHERE {org} = %s AND {id} = %s AND {status_col} IN ({placeholders}) "
            "AND {expires} IS NOT NULL AND {expires} < now()"
        ).format(
            task=_TASK,
            status=_col("status"),
            completed=_col("completedAt"),
            updated=_col("updatedAt"),
            org=_col("organizationId"),
            id=_col("id"),
            status_col=_col("status"),
            placeholders=placeholders,
            expires=_col("expiresAt"),
        )
        with self.org_transaction(organization_id) as conn:
            cur = conn.execute(
                query,
                [ExecutionStatus.EXPIRED.value, organization_id, execution_id, *expirable],
            )
            if int(cur.rowcount or 0) == 0:
                return False
            self.append_audit_entry(
                conn,
                organization_id=organization_id,
                action="TASK_EXPIRED",
                actor=ENGINE_ACTOR,
                target_id=execution_id,
                link_execution_id=execution_id,
            )
            self._audit(
                conn,
                organization_id=organization_id,
                actor_id=None,
                action="AGENT_EXECUTION_EXPIRED",
                entity_id=execution_id,
                details={},
            )
            return True

    def record_dispatch(
        self,
        organization_id: str,
        execution_id: str,
        *,
        actor: AuditActor,
        method: str,
        thread_id: str,
        depth: int = 0,
        decision: str | None = None,
        reviewer_id: str | None = None,
    ) -> None:
        payload: dict[str, Any] = {"method": method, "threadId": thread_id, "depth": depth}
        if decision is not None:
            payload["decision"] = decision
        if reviewer_id is not None:
            payload["reviewerId"] = reviewer_id
        with self.org_transaction(organization_id) as conn:
            conn.execute(
                sql.SQL(
                    "UPDATE {task} SET {depth_col} = GREATEST({depth_col}, %s), {updated} = now() "
                    "WHERE {org} = %s AND {id} = %s"
                ).format(
                    task=_TASK,
                    depth_col=_col("depth"),
                    updated=_col("updatedAt"),
                    org=_col("organizationId"),
                    id=_col("id"),
                ),
                (depth, organization_id, execution_id),
            )
            self.append_audit_entry(
                conn,
                organization_id=organization_id,
                action="TASK_DISPATCHED",
                actor=actor,
                target_id=execution_id,
                payload=payload,
                link_execution_id=execution_id,
            )

    def jti_conflicts(self, organization_id: str, jti: str, target_id: str) -> bool:
        with self.org_transaction(organization_id) as conn:
            row = conn.execute(
                sql.SQL(
                    "SELECT 1 AS hit FROM {ledger} "
                    'WHERE "actorJti" = %s AND "targetId" IS DISTINCT FROM %s LIMIT 1'
                ).format(ledger=_LEDGER),
                (jti, target_id),
            ).fetchone()
        return row is not None

    def registration_for(self, organization_id: str, agent_id: str) -> dict[str, Any] | None:
        query = sql.SQL(
            'SELECT "agentId", "orgId", "scopes", "status", "maxDepth", "minTier" '
            "FROM {registration} WHERE {agent_col} = %s LIMIT 1"
        ).format(registration=_REGISTRATION, agent_col=_col("agentId"))
        with self.org_transaction(organization_id) as conn:
            with conn.cursor() as cur:
                cur.execute(query, (agent_id,))
                return cur.fetchone()

    def verify_tenant_chain(self, organization_id: str) -> int | None:
        query = sql.SQL(
            'SELECT "organizationId", "sequence", "prevHash", "entryHash", "payload" '
            "FROM {ledger} WHERE {org} = %s ORDER BY {sequence} ASC"
        ).format(ledger=_LEDGER, org=_col("organizationId"), sequence=_col("sequence"))
        with self.org_transaction(organization_id) as conn:
            with conn.cursor() as cur:
                cur.execute(query, (organization_id,))
                rows = cur.fetchall()
        return verify_chain(rows)

    def set_status(
        self,
        organization_id: str,
        execution_id: str,
        new_status: ExecutionStatus,
        *,
        allowed: tuple[ExecutionStatus, ...] = (),
    ) -> None:
        assignments = [sql.SQL("{status} = %s").format(status=_col("status"))]
        params: list[Any] = [new_status.value]
        if new_status == ExecutionStatus.RUNNING:
            assignments.append(
                sql.SQL(
                    "{started} = CASE WHEN {started} IS NULL THEN now() ELSE {started} END"
                ).format(started=_col("startedAt"))
            )
        assignments.append(sql.SQL("{updated} = now()").format(updated=_col("updatedAt")))
        set_clause = sql.SQL(", ").join(assignments)
        query = sql.SQL(
            "UPDATE {task} SET {set_clause} WHERE {org} = %s AND {id} = %s"
        ).format(
            task=_TASK,
            set_clause=set_clause,
            org=_col("organizationId"),
            id=_col("id"),
        )
        params.extend([organization_id, execution_id])
        if allowed:
            placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in allowed)
            query = sql.SQL("{query} AND {status} IN ({placeholders})").format(
                query=query,
                status=_col("status"),
                placeholders=placeholders,
            )
            params.extend(item.value for item in allowed)
        self._expect_updated(query, params, execution_id, new_status.value)

    def persist_pending_approval(
        self,
        organization_id: str,
        execution_id: str,
        report: ComplianceReport,
        captions: list[dict[str, Any]],
    ) -> None:
        compliance_payload = json.dumps(
            report.model_dump(mode="json", by_alias=True), ensure_ascii=False
        )
        captions_payload = json.dumps(captions, ensure_ascii=False)
        query = sql.SQL(
            "UPDATE {task} SET {status} = %s, {score} = %s, {flags} = %s::jsonb, "
            "{captions} = %s::jsonb, {updated} = now() "
            "WHERE {org} = %s AND {id} = %s AND {status_col} = %s"
        ).format(
            task=_TASK,
            status=_col("status"),
            score=_col("complianceScore"),
            flags=_col("complianceFlags"),
            captions=_col("captions"),
            updated=_col("updatedAt"),
            org=_col("organizationId"),
            id=_col("id"),
            status_col=_col("status"),
        )
        params = [
            ExecutionStatus.PENDING_APPROVAL.value,
            report.score,
            compliance_payload,
            captions_payload,
            organization_id,
            execution_id,
            ExecutionStatus.RUNNING.value,
        ]
        with self._pool.connection() as conn:
            with conn.transaction():
                cur = conn.execute(query, params)
                if int(cur.rowcount or 0) == 0:
                    raise AgentStateError(
                        f"Execution {execution_id} cannot transition to "
                        f"{ExecutionStatus.PENDING_APPROVAL.value} in this tenant."
                    )
                self.append_audit_entry(
                    conn,
                    organization_id=organization_id,
                    action="TASK_PENDING_APPROVAL",
                    actor=ENGINE_ACTOR,
                    target_id=execution_id,
                    payload={
                        "score": report.score,
                        "flagCount": len(report.flags),
                        "flags": [
                            flag.model_dump(mode="json", by_alias=True) for flag in report.flags
                        ],
                    },
                    link_execution_id=execution_id,
                )
                self._audit(
                    conn,
                    organization_id=organization_id,
                    actor_id=None,
                    action="AGENT_EXECUTION_PENDING_APPROVAL",
                    entity_id=execution_id,
                    details={
                        "score": report.score,
                        "flagCount": len(report.flags),
                        "flags": [
                            flag.model_dump(mode="json", by_alias=True) for flag in report.flags
                        ],
                    },
                )

    def mark_published(self, organization_id: str, execution_id: str, url: str) -> None:
        query = sql.SQL(
            "UPDATE {task} SET {status} = %s, {url} = %s, {completed} = now(), {updated} = now() "
            "WHERE {org} = %s AND {id} = %s AND {status_col} = %s"
        ).format(
            task=_TASK,
            status=_col("status"),
            url=_col("publishedPostUrl"),
            completed=_col("completedAt"),
            updated=_col("updatedAt"),
            org=_col("organizationId"),
            id=_col("id"),
            status_col=_col("status"),
        )
        params = [
            ExecutionStatus.PUBLISHED.value,
            url,
            organization_id,
            execution_id,
            ExecutionStatus.APPROVED.value,
        ]
        with self._pool.connection() as conn:
            with conn.transaction():
                cur = conn.execute(query, params)
                if int(cur.rowcount or 0) == 0:
                    raise AgentStateError(
                        f"Execution {execution_id} cannot transition to "
                        f"{ExecutionStatus.PUBLISHED.value} in this tenant."
                    )
                self.append_audit_entry(
                    conn,
                    organization_id=organization_id,
                    action="TASK_PUBLISHED",
                    actor=ENGINE_ACTOR,
                    target_id=execution_id,
                    payload={"publishedPostUrl": url},
                    link_execution_id=execution_id,
                )
                self._audit(
                    conn,
                    organization_id=organization_id,
                    actor_id=None,
                    action="AGENT_EXECUTION_PUBLISHED",
                    entity_id=execution_id,
                    details={"publishedPostUrl": url},
                )

    def mark_failed(self, organization_id: str, execution_id: str, message: str) -> None:
        query = sql.SQL(
            "UPDATE {task} SET {status} = %s, {error} = %s, {completed} = now(), {updated} = now() "
            "WHERE {org} = %s AND {id} = %s AND {status_col} <> %s"
        ).format(
            task=_TASK,
            status=_col("status"),
            error=_col("errorMessage"),
            completed=_col("completedAt"),
            updated=_col("updatedAt"),
            org=_col("organizationId"),
            id=_col("id"),
            status_col=_col("status"),
        )
        params = [
            ExecutionStatus.FAILED.value,
            message[:2000],
            organization_id,
            execution_id,
            ExecutionStatus.FAILED.value,
        ]
        with self._pool.connection() as conn:
            with conn.transaction():
                cur = conn.execute(query, params)
                if int(cur.rowcount or 0) == 0:
                    raise AgentStateError(
                        f"Execution {execution_id} cannot transition to "
                        f"{ExecutionStatus.FAILED.value} in this tenant."
                    )
                self.append_audit_entry(
                    conn,
                    organization_id=organization_id,
                    action="TASK_FAILED",
                    actor=ENGINE_ACTOR,
                    target_id=execution_id,
                    payload={"error": message[:2000]},
                    link_execution_id=execution_id,
                )
                self._audit(
                    conn,
                    organization_id=organization_id,
                    actor_id=None,
                    action="AGENT_EXECUTION_FAILED",
                    entity_id=execution_id,
                    details={"error": message[:2000]},
                )

    def assert_review_target(
        self,
        organization_id: str,
        execution_id: str,
        expected: ExecutionStatus,
    ) -> dict[str, Any]:
        row = self.get_execution(organization_id, execution_id)
        if row is None:
            raise AgentStateError(f"Execution {execution_id} does not exist for this tenant.")
        if row.get("status") != expected.value:
            raise AgentStateError(
                f"Execution {execution_id} is in state {row.get('status')}, expected {expected.value}."
            )
        return row

