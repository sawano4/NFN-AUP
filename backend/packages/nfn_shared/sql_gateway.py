from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import psycopg
from psycopg.rows import dict_row

from fastapi import HTTPException, status

from .auth import decode_token, hash_password, issue_token_pair
from .contracts import SourceRegistrationCreate
from .enums import Role, SourceStatus
from .ids import format_message_id, format_source_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SqlGateway:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn
        self._ensure_schema()

    @classmethod
    def from_env(cls) -> "SqlGateway | None":
        dsn = os.getenv("DATABASE_URL")
        if not dsn:
            return None
        return cls(dsn)

    def _connect(self) -> psycopg.Connection:
        return psycopg.connect(self.dsn, row_factory=dict_row)

    def _ensure_schema(self) -> None:
        statements = [
            """
            CREATE TABLE IF NOT EXISTS nfn_users (
                id UUID PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(20) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                last_login_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS nfn_sources (
                id UUID PRIMARY KEY,
                source_type VARCHAR(20) NOT NULL,
                name VARCHAR(255) NOT NULL,
                berger_number VARCHAR(100) UNIQUE,
                siret VARCHAR(20),
                legal_form VARCHAR(100),
                address TEXT,
                city VARCHAR(100),
                postal_code VARCHAR(10),
                department VARCHAR(100),
                gps_lat NUMERIC(10,8),
                gps_lon NUMERIC(11,8),
                email VARCHAR(255),
                phone VARCHAR(50),
                race_id UUID,
                num_heads INTEGER,
                estimated_volume_kg NUMERIC(10,2),
                shearing_frequency VARCHAR(20),
                avg_shearing_date VARCHAR(20),
                slaughterhouse_number VARCHAR(100),
                slaughterhouse_capacity INTEGER,
                status VARCHAR(20) NOT NULL,
                rejection_motive TEXT,
                validated_by UUID,
                validated_at TIMESTAMPTZ,
                submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS nfn_sequences (
                name TEXT PRIMARY KEY,
                value INTEGER NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS nfn_refresh_tokens (
                refresh_token TEXT PRIMARY KEY,
                user_id UUID NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS nfn_otps (
                email TEXT PRIMARY KEY,
                otp_code TEXT NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS nfn_email_verified (
                email TEXT PRIMARY KEY,
                verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS nfn_notifications (
                message_id TEXT PRIMARY KEY,
                recipient TEXT NOT NULL,
                subject TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS nfn_source_details (
                public_id TEXT PRIMARY KEY,
                races JSONB NOT NULL DEFAULT '[]'::jsonb,
                availability_months JSONB NOT NULL DEFAULT '[]'::jsonb,
                herd_size INTEGER NOT NULL DEFAULT 0
            )
            """,
        ]
        with self._connect() as conn:
            with conn.cursor() as cur:
                for statement in statements:
                    cur.execute(statement)
            conn.commit()
        self.seed_demo_data()

    def _next_sequence(self, name: str) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO nfn_sequences(name, value)
                    VALUES (%s, 1)
                    ON CONFLICT (name)
                    DO UPDATE SET value = nfn_sequences.value + 1
                    RETURNING value
                    """,
                    (name,),
                )
                value = int(cur.fetchone()["value"])
            conn.commit()
        return value

    def seed_demo_data(self) -> None:
        users = [
            ("agent@nfn.example.com", "Agent Demo", Role.AGENT, "agent123"),
            ("depot@nfn.example.com", "Depot Demo", Role.DEPOT, "depot123"),
            ("admin@nfn.example.com", "Admin NFN", Role.ADMIN, "admin123"),
            ("laundry@nfn.example.com", "Laundry Demo", Role.LAUNDRY, "laundry123"),
            ("t1@nfn.example.com", "Transformer T1 Demo", Role.T1, "t1123"),
            ("t2@nfn.example.com", "Transformer T2 Demo", Role.T2, "t2123"),
        ]
        now = utcnow()
        seeded_sources = [
            {
                "public_id": "SRC-2026-001",
                "email": "eleveur1@example.com",
                "source_type": "eleveur",
                "name": "Ferme Ouled Djellal",
                "wilaya": "Djelfa",
                "commune": "Messaad",
                "gps_lat": 34.154,
                "gps_lng": 3.503,
                "phone": None,
                "races": ["Ouled Djellal"],
                "herd_size": 120,
                "availability_months": ["Mars", "Avril"],
                "status": SourceStatus.ACTIVE.value,
                "reason": None,
            },
            {
                "public_id": "SRC-2026-002",
                "email": "eleveur2@example.com",
                "source_type": "eleveur",
                "name": "Cooperative Hamra",
                "wilaya": "Laghouat",
                "commune": "Aflou",
                "gps_lat": 34.111,
                "gps_lng": 2.101,
                "phone": None,
                "races": ["Hamra"],
                "herd_size": 90,
                "availability_months": ["Avril"],
                "status": SourceStatus.ACTIVE.value,
                "reason": None,
            },
        ]
        with self._connect() as conn:
            with conn.cursor() as cur:
                for email, name, role, raw_password in users:
                    cur.execute(
                        """
                        INSERT INTO nfn_users(id, email, hashed_password, full_name, role, is_active, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s)
                        ON CONFLICT (email) DO UPDATE
                        SET hashed_password = EXCLUDED.hashed_password,
                            full_name = EXCLUDED.full_name,
                            role = EXCLUDED.role,
                            is_active = TRUE,
                            updated_at = EXCLUDED.updated_at
                        """,
                        (uuid.uuid5(uuid.NAMESPACE_DNS, email), email, hash_password(raw_password), name, role.value, now, now),
                    )

                for source in seeded_sources:
                    source_id = uuid.uuid5(uuid.NAMESPACE_DNS, source["public_id"])
                    cur.execute(
                        """
                        INSERT INTO nfn_sources(
                            id, source_type, name, berger_number, city, department,
                            gps_lat, gps_lon, email, phone, num_heads,
                            status, rejection_motive, submitted_at, created_at, updated_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (berger_number) DO NOTHING
                        """,
                        (
                            source_id,
                            source["source_type"],
                            source["name"],
                            source["public_id"],
                            source["commune"],
                            source["wilaya"],
                            source["gps_lat"],
                            source["gps_lng"],
                            source["email"],
                            source["phone"],
                            source["herd_size"],
                            source["status"],
                            source["reason"],
                            now,
                            now,
                            now,
                        ),
                    )
                    cur.execute(
                        """
                        INSERT INTO nfn_source_details(public_id, races, availability_months, herd_size)
                        VALUES (%s, %s::jsonb, %s::jsonb, %s)
                        ON CONFLICT (public_id) DO NOTHING
                        """,
                        (source["public_id"], json.dumps(source["races"]), json.dumps(source["availability_months"]), source["herd_size"]),
                    )
                cur.execute(
                    """
                    INSERT INTO nfn_sequences(name, value)
                    VALUES ('source', 2)
                    ON CONFLICT (name) DO UPDATE
                    SET value = GREATEST(nfn_sequences.value, EXCLUDED.value)
                    """
                )
            conn.commit()

    def reset(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("TRUNCATE TABLE nfn_refresh_tokens, nfn_otps, nfn_email_verified, nfn_notifications, nfn_source_details, nfn_sources, nfn_users, nfn_sequences")
            conn.commit()
        self.seed_demo_data()

    def authenticate(self, email: str, password: str) -> dict[str, str]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, email, full_name, role, hashed_password FROM nfn_users WHERE email = %s AND is_active = TRUE",
                    (email,),
                )
                user = cur.fetchone()
                if user is None or user["hashed_password"] != hash_password(password):
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
                role = Role(user["role"])
                user_id = str(user["id"])
                tokens = issue_token_pair(user_id, user["email"], role)
                cur.execute(
                    "INSERT INTO nfn_refresh_tokens(refresh_token, user_id) VALUES (%s, %s) ON CONFLICT (refresh_token) DO NOTHING",
                    (tokens["refresh_token"], user["id"]),
                )
                conn.commit()
                return tokens

    def refresh(self, refresh_token: str) -> dict[str, str]:
        payload = decode_token(refresh_token, expected_type="refresh")
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT user_id FROM nfn_refresh_tokens WHERE refresh_token = %s",
                    (refresh_token,),
                )
                token_row = cur.fetchone()
                if token_row is None:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown refresh token")
                cur.execute(
                    "SELECT id, email, role FROM nfn_users WHERE id = %s AND is_active = TRUE",
                    (payload["sub"],),
                )
                user = cur.fetchone()
                if user is None:
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
                role = Role(user["role"])
                tokens = issue_token_pair(str(user["id"]), user["email"], role)
                cur.execute(
                    "INSERT INTO nfn_refresh_tokens(refresh_token, user_id) VALUES (%s, %s) ON CONFLICT (refresh_token) DO NOTHING",
                    (tokens["refresh_token"], user["id"]),
                )
                conn.commit()
                return tokens

    def get_user_profile(self, user_id: str) -> dict[str, Any]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, email, full_name, role FROM nfn_users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                if user is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
                return {
                    "user_id": str(user["id"]),
                    "email": user["email"],
                    "name": user["full_name"],
                    "role": Role(user["role"]),
                }

    def create_notification(self, recipient: str, subject: str, body: str) -> dict[str, Any]:
        message_id = format_message_id(self._next_sequence("message"))
        now = utcnow()
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO nfn_notifications(message_id, recipient, subject, body, created_at) VALUES (%s, %s, %s, %s, %s)",
                    (message_id, recipient, subject, body, now),
                )
            conn.commit()
        return {
            "message_id": message_id,
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "created_at": now,
        }

    def list_emails(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT message_id, recipient, subject, body, created_at FROM nfn_notifications ORDER BY created_at DESC"
                )
                rows = cur.fetchall()
                return [dict(row) for row in rows]

    def request_otp(self, email: str) -> dict[str, str]:
        seq = self._next_sequence("otp")
        otp_code = f"{(seq * 731) % 1000000:06d}"
        expires_at = utcnow() + timedelta(minutes=10)
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO nfn_otps(email, otp_code, expires_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (email)
                    DO UPDATE SET otp_code = EXCLUDED.otp_code, expires_at = EXCLUDED.expires_at
                    """,
                    (email, otp_code, expires_at),
                )
            conn.commit()
        self.create_notification(email, "NFN verification code", f"Your NFN email OTP is {otp_code}.")
        return {"message": "OTP sent by email"}

    def verify_otp(self, email: str, otp_code: str) -> dict[str, str]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT otp_code, expires_at FROM nfn_otps WHERE email = %s", (email,))
                record = cur.fetchone()
                if record is None or record["expires_at"] < utcnow() or record["otp_code"] != otp_code:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
                cur.execute(
                    "INSERT INTO nfn_email_verified(email) VALUES (%s) ON CONFLICT (email) DO NOTHING",
                    (email,),
                )
            conn.commit()
        return {"message": "Email verified"}

    def create_source_registration(self, payload: SourceRegistrationCreate, require_verified: bool = True) -> dict[str, Any]:
        email = str(payload.email)
        with self._connect() as conn:
            with conn.cursor() as cur:
                if require_verified:
                    cur.execute("SELECT 1 FROM nfn_email_verified WHERE email = %s", (email,))
                    if cur.fetchone() is None:
                        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email must be verified before submission")

                public_id = format_source_id(self._next_sequence("source"))
                now = utcnow()
                source_id = uuid.uuid4()
                cur.execute(
                    """
                    INSERT INTO nfn_sources(
                        id, source_type, name, berger_number, city, department,
                        gps_lat, gps_lon, email, phone, num_heads, status,
                        rejection_motive, submitted_at, created_at, updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        source_id,
                        payload.source_type,
                        payload.name,
                        public_id,
                        payload.commune,
                        payload.wilaya,
                        payload.gps_lat,
                        payload.gps_lng,
                        email,
                        payload.phone,
                        payload.herd_size,
                        SourceStatus.PENDING.value,
                        None,
                        now,
                        now,
                        now,
                    ),
                )
                cur.execute(
                    """
                    INSERT INTO nfn_source_details(public_id, races, availability_months, herd_size)
                    VALUES (%s, %s::jsonb, %s::jsonb, %s)
                    """,
                    (public_id, json.dumps(payload.races), json.dumps(payload.availability_months), payload.herd_size),
                )
            conn.commit()
        return self.get_source(public_id)

    def get_source(self, public_id: str) -> dict[str, Any]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT s.berger_number, s.email, s.source_type, s.name,
                           s.department, s.city, s.gps_lat, s.gps_lon,
                           s.phone, s.status, s.rejection_motive, s.submitted_at,
                           d.races, d.availability_months, d.herd_size
                    FROM nfn_sources s
                    LEFT JOIN nfn_source_details d ON d.public_id = s.berger_number
                    WHERE s.berger_number = %s
                    """,
                    (public_id,),
                )
                row = cur.fetchone()
                if row is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
        return {
            "public_id": row["berger_number"],
            "email": row["email"],
            "source_type": row["source_type"],
            "name": row["name"],
            "wilaya": row["department"],
            "commune": row["city"],
            "gps_lat": float(row["gps_lat"]) if row["gps_lat"] is not None else 0.0,
            "gps_lng": float(row["gps_lon"]) if row["gps_lon"] is not None else 0.0,
            "phone": row["phone"],
            "races": row["races"] or [],
            "herd_size": int(row["herd_size"] or 0),
            "availability_months": row["availability_months"] or [],
            "status": SourceStatus(row["status"]),
            "reason": row["rejection_motive"],
            "created_at": row["submitted_at"],
        }

    def list_sources(self) -> list[dict[str, Any]]:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT berger_number FROM nfn_sources ORDER BY submitted_at DESC")
                public_ids = [row["berger_number"] for row in cur.fetchall()]
        return [self.get_source(public_id) for public_id in public_ids]

    def get_source_status(self, public_id: str) -> dict[str, Any]:
        source = self.get_source(public_id)
        return {
            "public_id": source["public_id"],
            "status": source["status"],
            "reason": source["reason"],
        }

    def list_pending_sources(self) -> list[dict[str, Any]]:
        return [source for source in self.list_sources() if source["status"] == SourceStatus.PENDING]

    def approve_source(self, public_id: str, actor_email: str, comment: str | None = None) -> dict[str, Any]:
        _ = actor_email
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE nfn_sources SET status = %s, rejection_motive = %s, validated_at = NOW(), updated_at = NOW() WHERE berger_number = %s",
                    (SourceStatus.ACTIVE.value, comment, public_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
            conn.commit()
        source = self.get_source(public_id)
        self.create_notification(source["email"], "NFN registration approved", f"Your registration {public_id} has been approved.")
        return source

    def reject_source(self, public_id: str, actor_email: str, reason: str) -> dict[str, Any]:
        _ = actor_email
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE nfn_sources SET status = %s, rejection_motive = %s, validated_at = NOW(), updated_at = NOW() WHERE berger_number = %s",
                    (SourceStatus.REJECTED.value, reason, public_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
            conn.commit()
        source = self.get_source(public_id)
        self.create_notification(source["email"], "NFN registration rejected", f"Your registration {public_id} was rejected: {reason}")
        return source
