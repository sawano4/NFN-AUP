from __future__ import annotations

import os
import pickle
from typing import Any


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

    def _ensure_table(self, conn: Any) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS app_state (
                    state_key TEXT PRIMARY KEY,
                    payload BYTEA NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )

    def load(self) -> dict[str, Any] | None:
        import psycopg

        with psycopg.connect(self.dsn, autocommit=True) as conn:
            self._ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute("SELECT payload FROM app_state WHERE state_key = %s", (self.state_key,))
                row = cur.fetchone()
                if row is None:
                    return None
                return pickle.loads(bytes(row[0]))

    def save(self, snapshot: dict[str, Any]) -> None:
        import psycopg

        payload = pickle.dumps(snapshot, protocol=pickle.HIGHEST_PROTOCOL)
        with psycopg.connect(self.dsn, autocommit=True) as conn:
            self._ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO app_state (state_key, payload, updated_at)
                    VALUES (%s, %s, NOW())
                    ON CONFLICT (state_key)
                    DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
                    """,
                    (self.state_key, payload),
                )
