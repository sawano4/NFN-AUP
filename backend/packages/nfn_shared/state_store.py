from __future__ import annotations

import dataclasses
import os
from datetime import datetime
from enum import Enum
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from .enums import AlertSeverity, AlertType, LotStatus, Role, SourceStatus, SyncJobType
from .ids import SequenceCounters


ENUMS: dict[str, type[Enum]] = {
    "AlertSeverity": AlertSeverity,
    "AlertType": AlertType,
    "LotStatus": LotStatus,
    "Role": Role,
    "SourceStatus": SourceStatus,
    "SyncJobType": SyncJobType,
}


class PostgresStateStore:
    def __init__(self, dsn: str, state_key: str = "platform_state_v1") -> None:
        self.dsn = dsn
        self.state_key = state_key

    @classmethod
    def from_env(cls) -> "PostgresStateStore | None":
        dsn = os.getenv("DATABASE_URL")
        if not dsn:
            return None
        return cls(dsn=dsn)

    def _connect(self) -> psycopg.Connection:
        return psycopg.connect(self.dsn, row_factory=dict_row)

    def _ensure_table(self, conn: psycopg.Connection) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS app_state (
                    state_key TEXT PRIMARY KEY,
                    state_payload JSONB,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute("ALTER TABLE app_state ADD COLUMN IF NOT EXISTS state_payload JSONB")
            cur.execute("ALTER TABLE app_state ADD COLUMN IF NOT EXISTS payload BYTEA")
            cur.execute("ALTER TABLE app_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()")

    def _encode(self, value: Any) -> Any:
        if isinstance(value, datetime):
            return {"__type__": "datetime", "value": value.isoformat()}
        if isinstance(value, Enum):
            return {"__type__": "enum", "class": value.__class__.__name__, "value": value.value}
        if isinstance(value, set):
            return {"__type__": "set", "items": [self._encode(item) for item in sorted(value)]}
        if isinstance(value, SequenceCounters):
            return {"__type__": "SequenceCounters", "value": dataclasses.asdict(value)}
        if isinstance(value, dict):
            return {str(key): self._encode(item) for key, item in value.items()}
        if isinstance(value, list):
            return [self._encode(item) for item in value]
        if isinstance(value, tuple):
            return [self._encode(item) for item in value]
        return value

    def _decode(self, value: Any) -> Any:
        if isinstance(value, list):
            return [self._decode(item) for item in value]
        if not isinstance(value, dict):
            return value
        type_name = value.get("__type__")
        if type_name == "datetime":
            return datetime.fromisoformat(value["value"])
        if type_name == "enum":
            enum_cls = ENUMS[value["class"]]
            return enum_cls(value["value"])
        if type_name == "set":
            return {self._decode(item) for item in value["items"]}
        if type_name == "SequenceCounters":
            return SequenceCounters(**value["value"])
        return {key: self._decode(item) for key, item in value.items()}

    def load(self) -> dict[str, Any] | None:
        with self._connect() as conn:
            self._ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute("SELECT state_payload FROM app_state WHERE state_key = %s", (self.state_key,))
                row = cur.fetchone()
                if row is None or row["state_payload"] is None:
                    return None
                return self._decode(row["state_payload"])

    def save(self, snapshot: dict[str, Any]) -> None:
        payload = self._encode(snapshot)
        with self._connect() as conn:
            self._ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO app_state (state_key, state_payload, payload, updated_at)
                    VALUES (%s, %s, %s, NOW())
                    ON CONFLICT (state_key)
                    DO UPDATE SET state_payload = EXCLUDED.state_payload, updated_at = NOW()
                    """,
                    (self.state_key, Jsonb(payload), b""),
                )
            conn.commit()
