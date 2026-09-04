from __future__ import annotations

import json
from typing import Any

from psycopg import sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from .config import Settings, get_settings
from .schemas import ComplianceReport, ExecutionStatus


class AgentStateError(RuntimeError):
    pass


_TASK = sql.Identifier("AgentTaskExecution")
_AUDIT = sql.Identifier("AuditLog")


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

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> "Store":
        current = settings or get_settings()
        return cls(dsn=current.database_url)

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
            "SELECT {id}, {org}, {athlete}, {thread}, {status} FROM {task} "
            "WHERE {org_col} = %s AND {id_col} = %s"
        ).format(
            id=_col("id"),
            org=_col("organizationId"),
            athlete=_col("athleteId"),
            thread=_col("threadId"),
            status=_col("status"),
            task=_TASK,
            org_col=_col("organizationId"),
            id_col=_col("id"),
        )
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (organization_id, execution_id))
                return cur.fetchone()

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
        self._expect_updated(query, params, execution_id, ExecutionStatus.PENDING_APPROVAL.value)
        with self._pool.connection() as conn:
            with conn.transaction():
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
        self._expect_updated(query, params, execution_id, ExecutionStatus.PUBLISHED.value)
        with self._pool.connection() as conn:
            with conn.transaction():
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
        self._expect_updated(query, params, execution_id, ExecutionStatus.FAILED.value)
        with self._pool.connection() as conn:
            with conn.transaction():
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

