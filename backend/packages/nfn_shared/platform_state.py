from __future__ import annotations

import base64
import logging
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status

from .auth import decode_token, hash_password, issue_token_pair
from .contracts import (
    AlertCreate,
    AlertUpdate,
    BdcRecord,
    DashboardSummary,
    DepotClassificationCreate,
    DepotClassificationUpdate,
    DepotReceiptCreate,
    DepotReceiptUpdate,
    DepotSiteCreate,
    DepotSiteUpdate,
    DocumentCreate,
    DocumentUpdate,
    EmailMessageCreate,
    EmailMessageUpdate,
    FieldExceptionCreate,
    FieldExceptionUpdate,
    LaverieCreate,
    LaverieUpdate,
    LotChainDepotDepartureRecord,
    LotChainDepotRecord,
    LotChainLaverieRecord,
    LotChainLaverieDoneRecord,
    LotChainTransformateurDoneRecord,
    LotChainTransformateurRecord,
    LotCreate,
    LotUpdate,
    SourceRegistrationCreate,
    SourceRegistrationUpdate,
    ThresholdConfig,
    ThresholdUpdate,
    TourStop,
    TransformateurCreate,
    TransformateurUpdate,
    UserCreate,
    UserUpdate,
)
from .enums import AlertSeverity, AlertType, LotStatus, Role, SourceStatus, SyncJobType
from .ids import (
    SequenceCounters,
    format_alert_id,
    format_bdc_id,
    format_depot_id,
    format_document_id,
    format_exception_id,
    format_laverie_id,
    format_lot_id,
    format_media_id,
    format_message_id,
    format_source_id,
    format_transformateur_id,
    format_user_id,
)
from .state_store import PostgresStateStore


logger = logging.getLogger(__name__)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _safe_pdf(lines: list[str]) -> bytes:
    escaped_lines = [line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines]
    commands = ["BT", "/F1 12 Tf", "50 780 Td", "16 TL"]
    for index, line in enumerate(escaped_lines):
        if index == 0:
            commands.append(f"({line}) Tj")
        else:
            commands.append("T*")
            commands.append(f"({line}) Tj")
    commands.append("ET")
    stream = "\n".join(commands).encode("utf-8")
    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj\n",
        f"4 0 obj << /Length {len(stream)} >> stream\n".encode("utf-8") + stream + b"\nendstream\nendobj\n",
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("utf-8"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("utf-8"))
    pdf.extend(
        (
            f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF"
        ).encode("utf-8")
    )
    return bytes(pdf)


@dataclass
class PlatformState:
    counters: SequenceCounters = field(default_factory=SequenceCounters)

    _STATE_FIELDS = (
        "counters",
        "users",
        "refresh_tokens",
        "otps",
        "email_verified",
        "sources",
        "lots",
        "exceptions",
        "media",
        "lot_events",
        "sync_jobs_seen",
        "receipts",
        "classifications",
        "shipments",
        "documents",
        "alerts",
        "notifications",
        "storage_zones",
        "thresholds",
        "tours_by_agent",
        "depots",
        "laveries",
        "transformateurs",
        "lot_chains",
    )

    _PERSIST_AFTER_METHODS = {
        "reset",
        "authenticate",
        "refresh",
        "create_user",
        "update_user",
        "delete_user",
        "create_notification",
        "send_email",
        "update_email",
        "delete_email",
        "request_otp",
        "verify_otp",
        "create_source_registration",
        "update_source",
        "delete_source",
        "approve_source",
        "reject_source",
        "build_mobile_bootstrap",
        "create_lot",
        "update_lot",
        "delete_lot",
        "create_exception",
        "update_exception",
        "delete_exception",
        "create_media",
        "reserve_media_upload",
        "update_media",
        "delete_media",
        "sync_batch",
        "create_receipt",
        "update_receipt",
        "delete_receipt",
        "classify_lot",
        "update_classification",
        "delete_classification",
        "create_shipment",
        "update_shipment",
        "delete_shipment",
        "create_alert",
        "create_manual_alert",
        "refresh_overdue_alerts",
        "update_alert",
        "delete_alert",
        "evaluate_alerts",
        "resolve_alert",
        "update_thresholds",
        "create_document",
        "update_document",
        "delete_document",
        "publish_event",
        "create_depot",
        "update_depot",
        "delete_depot",
        "create_laverie",
        "update_laverie",
        "delete_laverie",
        "create_transformateur",
        "update_transformateur",
        "delete_transformateur",
        "record_depot_arrival",
        "record_depot_departure",
        "record_laverie_arrival",
        "record_laverie_done",
        "record_transformateur_arrival",
        "record_transformateur_done",
    }

    def __getattribute__(self, name: str) -> Any:
        attr = object.__getattribute__(self, name)
        if name.startswith("_") or not callable(attr):
            return attr
        persist_methods = object.__getattribute__(self, "_PERSIST_AFTER_METHODS")
        if name not in persist_methods:
            return attr

        def _wrapped(*args: Any, **kwargs: Any) -> Any:
            result = attr(*args, **kwargs)
            object.__getattribute__(self, "_persist_state")()
            return result

        return _wrapped

    def __post_init__(self) -> None:
        self._store = PostgresStateStore.from_env()
        self._suspend_persist = True
        self._persist_warning_emitted = False
        self.reset()
        if self._store is not None:
            if self._load_state():
                # State loaded from DB — re-seed if DB was empty or stale (no lots).
                if not self.lots:
                    self._seed_infrastructure()
                    self._seed_sources()
                    self._seed_tours()
                    self._seed_mock_lots()
                    # Persist AFTER suspend is lifted so _persist_state actually runs.
            else:
                pass  # fresh DB — will persist below after suspend is lifted
        self._suspend_persist = False
        # Persist whatever state we ended up with (seed or loaded).
        if self._store is not None:
            self._persist_state()

    def reset_to_seed(self) -> None:
        """Wipe all runtime state, re-apply demo seed data, and persist to DB.
        Called by the admin /reset-demo endpoint.

        Bypasses __getattribute__ wrappers via object.__getattribute__ so that
        no partial-state persist is triggered mid-seed, and the final persist
        is not suppressed by _suspend_persist."""
        was_suspended = self._suspend_persist
        self._suspend_persist = True
        try:
            # Call reset() directly — avoids the _PERSIST_AFTER_METHODS wrapper
            # that would fire _persist_state() before seed data is fully built.
            object.__getattribute__(self, "reset")()
        finally:
            self._suspend_persist = was_suspended
        # Now data is fully seeded in memory — persist to DB.
        object.__getattribute__(self, "_persist_state")()

    def _snapshot_state(self) -> dict[str, Any]:
        return {field_name: deepcopy(getattr(self, field_name)) for field_name in self._STATE_FIELDS}

    def _restore_state(self, snapshot: dict[str, Any]) -> None:
        for field_name in self._STATE_FIELDS:
            if field_name in snapshot:
                setattr(self, field_name, snapshot[field_name])

    def _load_state(self) -> bool:
        try:
            snapshot = self._store.load()
        except Exception:
            logger.exception("Failed to load platform state from PostgreSQL")
            return False
        if snapshot is None:
            return False
        self._restore_state(snapshot)
        return True

    def _persist_state(self) -> None:
        if self._suspend_persist or self._store is None:
            return
        try:
            self._store.save(self._snapshot_state())
        except Exception:
            if not self._persist_warning_emitted:
                logger.exception("Failed to persist platform state to PostgreSQL; continuing in-memory")
                self._persist_warning_emitted = True

    def reset(self) -> None:
        self.counters = SequenceCounters()
        self.users: dict[str, dict[str, Any]] = {
            "user-agent": {
                "user_id": "user-agent",
                "email": "agent@nfn.example.com",
                "name": "Agent Demo",
                "role": Role.AGENT,
                "password_hash": hash_password("agent123"),
            },
            "user-depot": {
                "user_id": "user-depot",
                "email": "depot@nfn.example.com",
                "name": "Depot Demo",
                "role": Role.DEPOT,
                "password_hash": hash_password("depot123"),
            },
            "user-admin": {
                "user_id": "user-admin",
                "email": "admin@nfn.example.com",
                "name": "Admin NFN",
                "role": Role.ADMIN,
                "password_hash": hash_password("admin123"),
            },
        }
        self.refresh_tokens: dict[str, str] = {}
        self.otps: dict[str, dict[str, Any]] = {}
        self.email_verified: set[str] = set()
        self.sources: dict[str, dict[str, Any]] = {}
        self.lots: dict[str, dict[str, Any]] = {}
        self.exceptions: dict[str, dict[str, Any]] = {}
        self.media: dict[str, dict[str, Any]] = {}
        self.lot_events: dict[str, list[dict[str, Any]]] = {}
        self.sync_jobs_seen: set[str] = set()
        self.receipts: dict[str, dict[str, Any]] = {}
        self.classifications: dict[str, dict[str, Any]] = {}
        self.shipments: dict[str, dict[str, Any]] = {}
        self.documents: dict[str, dict[str, Any]] = {}
        self.alerts: dict[str, dict[str, Any]] = {}
        self.notifications: dict[str, dict[str, Any]] = {}
        self.storage_zones = ["A1", "A2", "B1", "B2", "C1", "C2"]
        self.depots: dict[str, dict[str, Any]] = {}
        self.laveries: dict[str, dict[str, Any]] = {}
        self.transformateurs: dict[str, dict[str, Any]] = {}
        self.lot_chains: dict[str, dict[str, Any]] = {}
        self.thresholds = {
            "estimate_gap_pct": 10.0,
            "receipt_gap_pct": 5.0,
            "bdc_overdue_hours": 24,
            "laverie_transit_gap_pct": 3.0,
            "laverie_overdue_hours": 24,
            "depot_overdue_hours": 48,
            "alert_check_interval_minutes": 5,
        }
        # Non-persisted runtime flag — updated by the background alert-check thread
        self._last_alert_check_at: datetime | None = None
        self._seed_sources()
        self._seed_tours()
        self._seed_infrastructure()
        self._seed_mock_lots()

    def _seed_sources(self) -> None:
        now = utcnow()
        seeded = [
            # ── Hauts Plateaux — actifs ───────────────────────────────────────
            {"public_id": "SRC-2026-001", "email": "bouguetaia.aissa@agri.dz",   "source_type": "eleveur",
             "name": "Ferme Bouguetaia Aïssa",            "wilaya": "Djelfa",    "commune": "Messaad",
             "gps_lat": 34.154, "gps_lng": 3.503, "phone": "0550 41 23 07",
             "races": ["Ouled Djellal"], "herd_size": 145, "availability_months": ["Mars", "Avril"],
             "status": SourceStatus.ACTIVE, "reason": None, "created_at": now - timedelta(days=60)},
            {"public_id": "SRC-2026-002", "email": "khelil.freres@agri.dz",      "source_type": "eleveur",
             "name": "GAEC Frères Khelil",                "wilaya": "Laghouat",  "commune": "Aflou",
             "gps_lat": 34.111, "gps_lng": 2.101, "phone": "0661 88 54 29",
             "races": ["Hamra"], "herd_size": 95, "availability_months": ["Avril"],
             "status": SourceStatus.ACTIVE, "reason": None, "created_at": now - timedelta(days=55)},
            {"public_id": "SRC-2026-003", "email": "remila.exploitation@agri.dz","source_type": "eleveur",
             "name": "Exploitation Agropastorale Remila", "wilaya": "Tiaret",    "commune": "Frenda",
             "gps_lat": 35.047, "gps_lng": 1.055, "phone": "0770 32 61 45",
             "races": ["Ouled Djellal", "Rembi"], "herd_size": 210, "availability_months": ["Mars", "Avril", "Mai"],
             "status": SourceStatus.ACTIVE, "reason": None, "created_at": now - timedelta(days=30)},
            {"public_id": "SRC-2026-004", "email": "mekhalouf.fils@agri.dz",     "source_type": "eleveur",
             "name": "EARL Mekhalouf & Fils",             "wilaya": "El Bayadh", "commune": "Brezina",
             "gps_lat": 33.104, "gps_lng": 1.272, "phone": "0660 17 39 82",
             "races": ["Ouled Djellal"], "herd_size": 175, "availability_months": ["Avril", "Mai"],
             "status": SourceStatus.ACTIVE, "reason": None, "created_at": now - timedelta(days=25)},
            {"public_id": "SRC-2026-005", "email": "coop.sersou@agri.dz",        "source_type": "cooperative",
             "name": "Coopérative Agropastorale Sersou",  "wilaya": "Tiaret",    "commune": "Tiaret",
             "gps_lat": 35.370, "gps_lng": 1.320, "phone": "046 42 15 73",
             "races": ["Rembi"], "herd_size": 380, "availability_months": ["Mars", "Avril"],
             "status": SourceStatus.ACTIVE, "reason": None, "created_at": now - timedelta(days=20)},
            {"public_id": "SRC-2026-008", "email": "aures.laine@agri.dz",        "source_type": "cooperative",
             "name": "Coopérative Aurès Laine",           "wilaya": "Batna",     "commune": "Arris",
             "gps_lat": 35.170, "gps_lng": 6.601, "phone": "033 74 28 56",
             "races": ["Berbère"], "herd_size": 140, "availability_months": ["Mai", "Juin"],
             "status": SourceStatus.ACTIVE, "reason": None, "created_at": now - timedelta(days=15)},
            # ── En attente de validation ──────────────────────────────────────
            {"public_id": "SRC-2026-006", "email": "amrani.hamid@agri.dz",       "source_type": "eleveur",
             "name": "Ferme Amrani Hamid",                "wilaya": "M'Sila",    "commune": "Sidi Aïssa",
             "gps_lat": 35.882, "gps_lng": 3.770, "phone": "0550 63 17 94",
             "races": ["Ouled Djellal"], "herd_size": 85, "availability_months": ["Avril"],
             "status": SourceStatus.PENDING, "reason": None, "created_at": now - timedelta(days=3)},
            {"public_id": "SRC-2026-007", "email": "eleveurs.ain-sefra@agri.dz", "source_type": "eleveur",
             "name": "Groupement d'Éleveurs Aïn Sefra",  "wilaya": "Naâma",     "commune": "Aïn Sefra",
             "gps_lat": 32.748, "gps_lng": -0.588, "phone": "0770 09 44 31",
             "races": ["Hamra", "Ouled Djellal"], "herd_size": 440, "availability_months": ["Mars", "Avril", "Mai"],
             "status": SourceStatus.PENDING, "reason": None, "created_at": now - timedelta(days=1)},
        ]
        for source in seeded:
            self.sources[source["public_id"]] = source
        self.counters.source = 9

    def _seed_tours(self) -> None:
        self.tours_by_agent = {
            "agent@nfn.example.com": [
                {
                    "source_id": "SRC-2026-001",
                    "source_name": "Ferme Bouguetaia Aïssa",
                    "estimated_weight_kg": 320.0,
                    "wilaya": "Djelfa",
                    "gps_lat": 34.154,
                    "gps_lng": 3.503,
                    "status": "a_faire",
                },
                {
                    "source_id": "SRC-2026-002",
                    "source_name": "GAEC Frères Khelil",
                    "estimated_weight_kg": 158.0,
                    "wilaya": "Laghouat",
                    "gps_lat": 34.111,
                    "gps_lng": 2.101,
                    "status": "a_faire",
                },
            ]
        }

    def _sorted_records(self, items: dict[str, dict[str, Any]], field_name: str = "created_at") -> list[dict[str, Any]]:
        return sorted((deepcopy(item) for item in items.values()), key=lambda item: item.get(field_name, utcnow()), reverse=True)

    def _get_required(self, mapping: dict[str, dict[str, Any]], key: str, resource_name: str) -> dict[str, Any]:
        record = mapping.get(key)
        if record is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource_name} not found")
        return record

    def _remove_alerts_for_lot(self, lot_id: str) -> None:
        for alert_id in [key for key, value in self.alerts.items() if value.get("lot_id") == lot_id]:
            del self.alerts[alert_id]

    def _rebuild_shipment_document(self, bdc_id: str) -> None:
        shipment = self._get_required(self.shipments, bdc_id, "Shipment")
        lines = [
            f"NFN Bon de commande {bdc_id}",
            f"Lots: {', '.join(shipment['lot_ids']) if shipment['lot_ids'] else 'None'}",
            f"Poids total: {shipment['total_weight_kg']:.1f} kg",
            f"Humidite: {shipment['humidity_pct']:.1f}%",
            f"Destination: {shipment['laundry_name']}",
            f"Livraison attendue: {shipment['expected_delivery_at'].isoformat()}",
        ]
        document = self.documents.get(bdc_id)
        pdf_bytes = _safe_pdf(lines)
        now = utcnow()
        if document is None:
            self.documents[bdc_id] = {
                "document_id": bdc_id,
                "title": f"NFN Bon de commande {bdc_id}",
                "kind": "bdc",
                "lines": lines,
                "pdf_url": f"/documents/{bdc_id}.pdf",
                "content_base64": base64.b64encode(pdf_bytes).decode("utf-8"),
                "created_at": now,
                "updated_at": now,
            }
        else:
            document["title"] = f"NFN Bon de commande {bdc_id}"
            document["kind"] = "bdc"
            document["lines"] = lines
            document["content_base64"] = base64.b64encode(pdf_bytes).decode("utf-8")
            document["updated_at"] = now

    def _create_document_record(self, document_id: str, title: str, kind: str, lines: list[str]) -> dict[str, Any]:
        now = utcnow()
        document = {
            "document_id": document_id,
            "title": title,
            "kind": kind,
            "lines": lines,
            "pdf_url": f"/documents/{document_id}.pdf",
            "content_base64": base64.b64encode(_safe_pdf(lines)).decode("utf-8"),
            "created_at": now,
            "updated_at": now,
        }
        self.documents[document_id] = document
        return document

    # Auth / Users
    def authenticate(self, email: str, password: str) -> dict[str, str]:
        user = next((item for item in self.users.values() if item["email"] == email), None)
        if user is None or user["password_hash"] != hash_password(password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        tokens = issue_token_pair(user["user_id"], user["email"], user["role"])
        self.refresh_tokens[tokens["refresh_token"]] = user["user_id"]
        return tokens

    def refresh(self, refresh_token: str) -> dict[str, str]:
        payload = decode_token(refresh_token, expected_type="refresh")
        if refresh_token not in self.refresh_tokens:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown refresh token")
        user = self.users[payload["sub"]]
        tokens = issue_token_pair(user["user_id"], user["email"], user["role"])
        self.refresh_tokens[tokens["refresh_token"]] = user["user_id"]
        return tokens

    def get_user_profile(self, user_id: str) -> dict[str, Any]:
        user = self._get_required(self.users, user_id, "User")
        return {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
        }

    def list_users(self) -> list[dict[str, Any]]:
        return [self.get_user_profile(user_id) for user_id in sorted(self.users.keys())]

    def create_user(self, payload: UserCreate) -> dict[str, Any]:
        if any(user["email"] == str(payload.email) for user in self.users.values()):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User email already exists")
        user_id = format_user_id(self.counters.user)
        self.counters.user += 1
        self.users[user_id] = {
            "user_id": user_id,
            "email": str(payload.email),
            "name": payload.name,
            "role": payload.role,
            "password_hash": hash_password(payload.password),
        }
        return self.get_user_profile(user_id)

    def update_user(self, user_id: str, payload: UserUpdate) -> dict[str, Any]:
        user = self._get_required(self.users, user_id, "User")
        updates = payload.model_dump(exclude_unset=True)
        if "email" in updates:
            next_email = str(updates["email"])
            if any(item["email"] == next_email and item["user_id"] != user_id for item in self.users.values()):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User email already exists")
            user["email"] = next_email
        if "name" in updates:
            user["name"] = updates["name"]
        if "role" in updates:
            user["role"] = updates["role"]
        if "password" in updates and updates["password"] is not None:
            user["password_hash"] = hash_password(updates["password"])
        return self.get_user_profile(user_id)

    def delete_user(self, user_id: str) -> dict[str, str]:
        self._get_required(self.users, user_id, "User")
        del self.users[user_id]
        self.refresh_tokens = {token: current_user_id for token, current_user_id in self.refresh_tokens.items() if current_user_id != user_id}
        return {"message": f"User {user_id} deleted"}

    # Notifications
    def create_notification(self, payload: EmailMessageCreate) -> dict[str, Any]:
        message = {
            "message_id": format_message_id(self.counters.message),
            "recipient": str(payload.recipient),
            "subject": payload.subject,
            "body": payload.body,
            "created_at": utcnow(),
        }
        self.counters.message += 1
        self.notifications[message["message_id"]] = message
        return deepcopy(message)

    def send_email(self, recipient: str, subject: str, body: str) -> dict[str, Any]:
        return self.create_notification(EmailMessageCreate(recipient=recipient, subject=subject, body=body))

    def list_emails(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.notifications)

    def get_email(self, message_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.notifications, message_id, "Email message"))

    def update_email(self, message_id: str, payload: EmailMessageUpdate) -> dict[str, Any]:
        message = self._get_required(self.notifications, message_id, "Email message")
        updates = payload.model_dump(exclude_unset=True)
        if "recipient" in updates:
            message["recipient"] = str(updates["recipient"])
        if "subject" in updates:
            message["subject"] = updates["subject"]
        if "body" in updates:
            message["body"] = updates["body"]
        return deepcopy(message)

    def delete_email(self, message_id: str) -> dict[str, str]:
        self._get_required(self.notifications, message_id, "Email message")
        del self.notifications[message_id]
        return {"message": f"Email message {message_id} deleted"}

    # Source service
    def request_otp(self, email: str) -> dict[str, str]:
        otp_code = f"{(self.counters.message * 731) % 1000000:06d}"
        self.otps[email] = {"otp_code": otp_code, "expires_at": utcnow() + timedelta(minutes=10)}
        self.send_email(email, "NFN verification code", f"Your NFN email OTP is {otp_code}.")
        return {"message": "OTP sent by email"}

    def verify_otp(self, email: str, otp_code: str) -> dict[str, str]:
        record = self.otps.get(email)
        if record is None or record["expires_at"] < utcnow() or record["otp_code"] != otp_code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP")
        self.email_verified.add(email)
        return {"message": "Email verified"}

    def create_source_registration(self, payload: SourceRegistrationCreate, require_verified: bool = True, actor: str = "source-service") -> dict[str, Any]:
        email = str(payload.email)
        if require_verified and email not in self.email_verified:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email must be verified before submission")
        public_id = format_source_id(self.counters.source)
        self.counters.source += 1
        registration = {
            "public_id": public_id,
            "email": email,
            "source_type": payload.source_type,
            "name": payload.name,
            "wilaya": payload.wilaya,
            "commune": payload.commune,
            "gps_lat": payload.gps_lat,
            "gps_lng": payload.gps_lng,
            "phone": payload.phone,
            "races": payload.races,
            "herd_size": payload.herd_size,
            "availability_months": payload.availability_months,
            "status": SourceStatus.PENDING,
            "reason": None,
            "created_at": utcnow(),
        }
        self.sources[public_id] = registration
        self.publish_event("source.registered", actor=actor, details={"source_id": public_id, "name": payload.name, "email": email})
        return deepcopy(registration)

    def list_sources(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.sources)

    def get_source(self, public_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.sources, public_id, "Source"))

    def get_source_status(self, public_id: str) -> dict[str, Any]:
        source = self._get_required(self.sources, public_id, "Source")
        return {"public_id": public_id, "status": source["status"], "reason": source["reason"]}

    def update_source(self, public_id: str, payload: SourceRegistrationUpdate, actor: str = "source-service") -> dict[str, Any]:
        source = self._get_required(self.sources, public_id, "Source")
        updates = payload.model_dump(exclude_unset=True)
        if "email" in updates:
            source["email"] = str(updates["email"])
        for key in ("source_type", "name", "wilaya", "commune", "gps_lat", "gps_lng", "phone", "races", "herd_size", "availability_months", "status", "reason"):
            if key in updates:
                source[key] = updates[key]
        self.publish_event("source.updated", actor=actor, details={"source_id": public_id, "changes": updates})
        return deepcopy(source)

    def delete_source(self, public_id: str) -> dict[str, str]:
        self._get_required(self.sources, public_id, "Source")
        del self.sources[public_id]
        return {"message": f"Source {public_id} deleted"}

    def list_pending_sources(self) -> list[dict[str, Any]]:
        return [deepcopy(source) for source in self.sources.values() if source["status"] == SourceStatus.PENDING]

    def approve_source(self, public_id: str, actor_email: str, comment: str | None = None) -> dict[str, Any]:
        source = self._get_required(self.sources, public_id, "Source")
        source["status"] = SourceStatus.ACTIVE
        source["reason"] = comment
        self.send_email(source["email"], "NFN registration approved", f"Your registration {public_id} has been approved.")
        self.publish_event("source.approved", actor=actor_email, details={"source_id": public_id, "comment": comment})
        return deepcopy(source)

    def reject_source(self, public_id: str, actor_email: str, reason: str) -> dict[str, Any]:
        source = self._get_required(self.sources, public_id, "Source")
        source["status"] = SourceStatus.REJECTED
        source["reason"] = reason
        self.send_email(source["email"], "NFN registration rejected", f"Your registration {public_id} was rejected: {reason}")
        self.publish_event("source.rejected", actor=actor_email, details={"source_id": public_id, "reason": reason})
        return deepcopy(source)

    # Mobile service
    def build_mobile_bootstrap(self, agent_email: str) -> dict[str, Any]:
        agent = next((user for user in self.users.values() if user["email"] == agent_email), None)
        if agent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
        reserved_lot_ids = [format_lot_id(self.counters.lot + offset) for offset in range(5)]
        self.counters.lot += 5
        return {
            "agent_name": agent["name"],
            "generated_at": utcnow(),
            "thresholds": ThresholdConfig(**self.thresholds),
            "sources": [source for source in self.list_sources() if source["status"] == SourceStatus.ACTIVE],
            "today_tour": [TourStop(**tour) for tour in self.tours_by_agent.get(agent_email, [])],
            "reserved_lot_ids": reserved_lot_ids,
        }

    def list_lots(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.lots)

    def get_lot(self, lot_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.lots, lot_id, "Lot"))

    def create_lot(self, payload: LotCreate, actor_email: str, publish_event_name: str = "lot.collected") -> dict[str, Any]:
        lot_id = payload.lot_id or format_lot_id(self.counters.lot)
        if payload.lot_id is None:
            self.counters.lot += 1
        if lot_id in self.lots:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Lot already exists")
        source = self.sources.get(payload.source_id)
        source_name = payload.source_name or (source["name"] if source else "Unknown source")
        created = {
            "lot_id": lot_id,
            "source_id": payload.source_id,
            "source_name": source_name,
            "observed_weight_kg": float(payload.observed_weight_kg),
            "estimated_weight_kg": float(payload.estimated_weight_kg),
            "status": payload.status,
            "created_at": utcnow(),
            "details": {
                "cleanliness": payload.cleanliness,
                "gps": payload.gps,
            },
        }
        self.lots[lot_id] = created
        self.publish_event(
            publish_event_name,
            actor=actor_email,
            lot_id=lot_id,
            details={
                "source_id": payload.source_id,
                "source_name": source_name,
                "observed_weight_kg": float(payload.observed_weight_kg),
                "estimated_weight_kg": float(payload.estimated_weight_kg),
                "cleanliness": payload.cleanliness,
                "gps": payload.gps,
            },
        )
        return deepcopy(created)

    def update_lot(self, lot_id: str, payload: LotUpdate, actor_email: str) -> dict[str, Any]:
        lot = self._get_required(self.lots, lot_id, "Lot")
        updates = payload.model_dump(exclude_unset=True)
        for key in ("source_id", "source_name", "observed_weight_kg", "estimated_weight_kg", "status"):
            if key in updates:
                lot[key] = updates[key]
        if "cleanliness" in updates or "gps" in updates:
            lot.setdefault("details", {})
            if "cleanliness" in updates:
                lot["details"]["cleanliness"] = updates["cleanliness"]
            if "gps" in updates:
                lot["details"]["gps"] = updates["gps"]
        self.publish_event("lot.updated", actor=actor_email, lot_id=lot_id, details=updates)
        # Re-evaluate weight gap whenever weights are touched so the alert fires immediately
        if "observed_weight_kg" in updates or "estimated_weight_kg" in updates:
            estimated = float(lot.get("estimated_weight_kg") or 0)
            observed  = float(lot.get("observed_weight_kg")  or 0)
            if estimated > 0:
                delta_pct = abs(observed - estimated) / estimated * 100
                threshold = float(self.thresholds.get("estimate_gap_pct", 10.0))
                if delta_pct > threshold:
                    # Only create alert if no active ESTIMATE_GAP alert exists for this lot
                    active_for_lot = any(
                        a["alert_type"] == AlertType.ESTIMATE_GAP
                        and a["lot_id"] == lot_id
                        and a["resolved_at"] is None
                        for a in self.alerts.values()
                    )
                    if not active_for_lot:
                        severity = AlertSeverity.CRITICAL if delta_pct > threshold * 2 else AlertSeverity.WARNING
                        self.create_alert(
                            alert_type=AlertType.ESTIMATE_GAP,
                            severity=severity,
                            lot_id=lot_id,
                            message=f"Lot {lot_id} : écart estimation/collecte de {delta_pct:.1f}% après mise à jour (seuil : {threshold:.0f}%).",
                            actors=[actor_email, "admin@nfn.example.com"],
                            metadata={"lot_id": lot_id, "bdc_id": None, "delta_pct": round(delta_pct, 2),
                                      "observed_weight_kg": observed, "estimated_weight_kg": estimated},
                        )
        return deepcopy(lot)

    def delete_lot(self, lot_id: str) -> dict[str, str]:
        self._get_required(self.lots, lot_id, "Lot")
        del self.lots[lot_id]
        self.lot_events.pop(lot_id, None)
        self.receipts.pop(lot_id, None)
        self.classifications.pop(lot_id, None)
        self.lot_chains.pop(lot_id, None)
        self._remove_alerts_for_lot(lot_id)
        for shipment in self.shipments.values():
            if lot_id in shipment["lot_ids"]:
                shipment["lot_ids"] = [current for current in shipment["lot_ids"] if current != lot_id]
                shipment["total_weight_kg"] = sum(float(self.lots[item]["observed_weight_kg"]) for item in shipment["lot_ids"] if item in self.lots)
                self._rebuild_shipment_document(shipment["bdc_id"])
        return {"message": f"Lot {lot_id} deleted"}

    def list_exceptions(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.exceptions)

    def get_exception(self, exception_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.exceptions, exception_id, "Exception"))

    def create_exception(self, payload: FieldExceptionCreate, actor_email: str) -> dict[str, Any]:
        exception_id = format_exception_id(self.counters.exception)
        self.counters.exception += 1
        exception = {
            "exception_id": exception_id,
            "source_id": payload.source_id,
            "reason": payload.reason,
            "note": payload.note,
            "gps": payload.gps,
            "created_at": utcnow(),
        }
        self.exceptions[exception_id] = exception
        self.publish_event("lot.exception_reported", actor=actor_email, details={"source_id": payload.source_id, "reason": payload.reason, "gps": payload.gps})
        return deepcopy(exception)

    def update_exception(self, exception_id: str, payload: FieldExceptionUpdate, actor_email: str) -> dict[str, Any]:
        exception = self._get_required(self.exceptions, exception_id, "Exception")
        updates = payload.model_dump(exclude_unset=True)
        for key in ("reason", "note", "gps"):
            if key in updates:
                exception[key] = updates[key]
        self.publish_event("exception.updated", actor=actor_email, details={"exception_id": exception_id, "changes": updates})
        return deepcopy(exception)

    def delete_exception(self, exception_id: str) -> dict[str, str]:
        self._get_required(self.exceptions, exception_id, "Exception")
        del self.exceptions[exception_id]
        return {"message": f"Exception {exception_id} deleted"}

    def list_media(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.media)

    def get_media(self, media_key: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.media, media_key, "Media"))

    def create_media(self, filename: str, content_type: str) -> dict[str, Any]:
        media_key = f"mobile/{format_media_id(self.counters.media)}-{filename}"
        self.counters.media += 1
        media = {
            "media_key": media_key,
            "upload_url": f"https://minio.local/{media_key}",
            "filename": filename,
            "content_type": content_type,
            "status": "pending_upload",
            "created_at": utcnow(),
        }
        self.media[media_key] = media
        return deepcopy(media)

    def reserve_media_upload(self, filename: str, content_type: str) -> dict[str, Any]:
        media = self.create_media(filename, content_type)
        return {"upload_url": media["upload_url"], "media_key": media["media_key"]}

    def update_media(self, media_key: str, filename: str | None = None, content_type: str | None = None, status_value: str | None = None) -> dict[str, Any]:
        media = self._get_required(self.media, media_key, "Media")
        if filename is not None:
            media["filename"] = filename
        if content_type is not None:
            media["content_type"] = content_type
        if status_value is not None:
            media["status"] = status_value
        return deepcopy(media)

    def delete_media(self, media_key: str) -> dict[str, str]:
        self._get_required(self.media, media_key, "Media")
        del self.media[media_key]
        return {"message": f"Media {media_key} deleted"}

    def sync_batch(self, actor_email: str, jobs: list[dict[str, Any]]) -> dict[str, Any]:
        accepted: list[str] = []
        duplicates: list[str] = []
        generated_lot_ids: list[str] = []
        for job in jobs:
            client_job_id = job["client_job_id"]
            if client_job_id in self.sync_jobs_seen:
                duplicates.append(client_job_id)
                continue
            self.sync_jobs_seen.add(client_job_id)
            accepted.append(client_job_id)
            payload = job["payload"]
            if job["job_type"] == SyncJobType.LOT_COLLECTED:
                lot = self.create_lot(
                    LotCreate(
                        lot_id=payload.get("lot_id"),
                        source_id=payload["source_id"],
                        source_name=payload.get("source_name"),
                        observed_weight_kg=float(payload["observed_weight_kg"]),
                        estimated_weight_kg=float(payload.get("estimated_weight_kg", payload["observed_weight_kg"])),
                        cleanliness=payload.get("cleanliness"),
                        gps=payload.get("gps", {}),
                        status=LotStatus.AWAITING_DEPOT_RECEIPT,
                    ),
                    actor_email=actor_email,
                )
                generated_lot_ids.append(lot["lot_id"])
            elif job["job_type"] == SyncJobType.EXCEPTION_REPORTED:
                self.create_exception(
                    FieldExceptionCreate(
                        source_id=payload["source_id"],
                        reason=payload["reason"],
                        note=payload.get("note"),
                        gps=payload.get("gps", {}),
                    ),
                    actor_email=actor_email,
                )
            elif job["job_type"] == SyncJobType.FIELD_SOURCE_CREATED:
                self.create_source_registration(
                    SourceRegistrationCreate(
                        email=payload["email"],
                        source_type=payload["source_type"],
                        name=payload["name"],
                        wilaya=payload["wilaya"],
                        commune=payload["commune"],
                        gps_lat=float(payload["gps_lat"]),
                        gps_lng=float(payload["gps_lng"]),
                        phone=payload.get("phone"),
                        races=payload.get("races", []),
                        herd_size=int(payload.get("herd_size", 0)),
                        availability_months=payload.get("availability_months", []),
                    ),
                    require_verified=False,
                    actor=actor_email,
                )
        return {
            "accepted_job_ids": accepted,
            "duplicate_job_ids": duplicates,
            "generated_lot_ids": generated_lot_ids,
        }

    # Operator service
    def list_receipts(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.receipts)

    def get_receipt(self, lot_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.receipts, lot_id, "Receipt"))

    def create_receipt(
        self,
        actor_email: str,
        lot_id: str,
        received_weight_kg: float,
        storage_zone: str,
        arrival_condition: str,
        discrepancy_reason: str | None,
    ) -> dict[str, Any]:
        lot = self._get_required(self.lots, lot_id, "Lot")
        expected = float(lot["observed_weight_kg"])
        delta_pct = abs(float(received_weight_kg) - expected) / max(expected, 1) * 100
        if delta_pct > self.thresholds["receipt_gap_pct"] and not discrepancy_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Discrepancy reason is required when weight gap exceeds threshold",
            )
        receipt = {
            "lot_id": lot_id,
            "received_weight_kg": float(received_weight_kg),
            "storage_zone": storage_zone,
            "arrival_condition": arrival_condition,
            "discrepancy_reason": discrepancy_reason,
            "delta_pct": delta_pct,
            "created_at": utcnow(),
        }
        self.receipts[lot_id] = receipt
        lot["status"] = LotStatus.AT_DEPOT
        self.publish_event(
            "depot.lot_received",
            actor=actor_email,
            lot_id=lot_id,
            details={
                "expected_weight_kg": expected,
                "received_weight_kg": float(received_weight_kg),
                "storage_zone": storage_zone,
                "arrival_condition": arrival_condition,
                "discrepancy_reason": discrepancy_reason,
            },
        )
        return deepcopy(receipt)

    def update_receipt(self, lot_id: str, payload: DepotReceiptUpdate, actor_email: str) -> dict[str, Any]:
        receipt = self._get_required(self.receipts, lot_id, "Receipt")
        updates = payload.model_dump(exclude_unset=True)
        lot = self._get_required(self.lots, lot_id, "Lot")
        if "received_weight_kg" in updates:
            receipt["received_weight_kg"] = float(updates["received_weight_kg"])
        for key in ("storage_zone", "arrival_condition", "discrepancy_reason"):
            if key in updates:
                receipt[key] = updates[key]
        expected = float(lot["observed_weight_kg"])
        receipt["delta_pct"] = abs(receipt["received_weight_kg"] - expected) / max(expected, 1) * 100
        if receipt["delta_pct"] > self.thresholds["receipt_gap_pct"] and not receipt.get("discrepancy_reason"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discrepancy reason is required when weight gap exceeds threshold")
        self.publish_event("depot.receipt_updated", actor=actor_email, lot_id=lot_id, details=updates)
        return deepcopy(receipt)

    def delete_receipt(self, lot_id: str) -> dict[str, str]:
        self._get_required(self.receipts, lot_id, "Receipt")
        del self.receipts[lot_id]
        if lot_id in self.lots:
            self.lots[lot_id]["status"] = LotStatus.AWAITING_DEPOT_RECEIPT
        return {"message": f"Receipt for {lot_id} deleted"}

    def list_classifications(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.classifications)

    def get_classification(self, lot_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.classifications, lot_id, "Classification"))

    def classify_lot(self, actor_email: str, lot_id: str, classification: str, vm_percent: float, fiber_state: str, color: str) -> dict[str, Any]:
        self._get_required(self.lots, lot_id, "Lot")
        record = {
            "lot_id": lot_id,
            "classification": classification,
            "vm_percent": float(vm_percent),
            "fiber_state": fiber_state,
            "color": color,
            "created_at": utcnow(),
        }
        self.classifications[lot_id] = record
        self.lots[lot_id]["status"] = LotStatus.CLASSIFIED
        self.publish_event("depot.lot_classified", actor=actor_email, lot_id=lot_id, details={"classification": classification, "vm_percent": vm_percent, "fiber_state": fiber_state, "color": color})
        return deepcopy(record)

    def update_classification(self, lot_id: str, payload: DepotClassificationUpdate, actor_email: str) -> dict[str, Any]:
        classification = self._get_required(self.classifications, lot_id, "Classification")
        updates = payload.model_dump(exclude_unset=True)
        for key in ("classification", "vm_percent", "fiber_state", "color"):
            if key in updates:
                classification[key] = updates[key]
        self.publish_event("depot.classification_updated", actor=actor_email, lot_id=lot_id, details=updates)
        return deepcopy(classification)

    def delete_classification(self, lot_id: str) -> dict[str, str]:
        self._get_required(self.classifications, lot_id, "Classification")
        del self.classifications[lot_id]
        if lot_id in self.lots:
            self.lots[lot_id]["status"] = LotStatus.AT_DEPOT
        return {"message": f"Classification for {lot_id} deleted"}

    def list_shipments(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.shipments)

    def get_bdc(self, bdc_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.shipments, bdc_id, "BDC"))

    def create_shipment(self, actor_email: str, lot_ids: list[str], humidity_pct: float, laundry_name: str, transporteur_email: str, destination_email: str, expected_delivery_at: datetime) -> dict[str, Any]:
        missing = [lot_id for lot_id in lot_ids if lot_id not in self.classifications]
        if missing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Lots must be classified before shipment: {', '.join(missing)}")
        bdc_id = format_bdc_id(self.counters.shipment)
        self.counters.shipment += 1
        total_weight = sum(float(self.lots[lot_id]["observed_weight_kg"]) for lot_id in lot_ids)
        shipment = {
            "bdc_id": bdc_id,
            "lot_ids": lot_ids,
            "total_weight_kg": total_weight,
            "humidity_pct": float(humidity_pct),
            "laundry_name": laundry_name,
            "transporteur_email": transporteur_email,
            "destination_email": destination_email,
            "expected_delivery_at": expected_delivery_at,
            "pdf_url": f"/documents/{bdc_id}.pdf",
            "created_at": utcnow(),
        }
        self.shipments[bdc_id] = shipment
        for lot_id in lot_ids:
            self.lots[lot_id]["status"] = LotStatus.IN_TRANSIT_LAUNDRY
        self._rebuild_shipment_document(bdc_id)
        self.send_email(transporteur_email, f"NFN BDC {bdc_id}", f"Your BDC {bdc_id} is ready.")
        self.send_email(destination_email, f"NFN incoming shipment {bdc_id}", f"Shipment {bdc_id} is expected.")
        self.publish_event("bdc.issued", actor=actor_email, details={"bdc_id": bdc_id, "lot_ids": lot_ids, "expected_delivery_at": expected_delivery_at.isoformat()})
        return deepcopy(shipment)

    def update_shipment(self, bdc_id: str, payload: dict[str, Any], actor_email: str) -> dict[str, Any]:
        shipment = self._get_required(self.shipments, bdc_id, "Shipment")
        updates = deepcopy(payload)
        if "lot_ids" in updates:
            missing = [lot_id for lot_id in updates["lot_ids"] if lot_id not in self.classifications]
            if missing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Lots must be classified before shipment: {', '.join(missing)}")
            shipment["lot_ids"] = updates["lot_ids"]
            shipment["total_weight_kg"] = sum(float(self.lots[lot_id]["observed_weight_kg"]) for lot_id in shipment["lot_ids"])
        for key in ("humidity_pct", "laundry_name", "transporteur_email", "destination_email", "expected_delivery_at"):
            if key in updates:
                shipment[key] = updates[key]
        self._rebuild_shipment_document(bdc_id)
        self.publish_event("bdc.updated", actor=actor_email, details={"bdc_id": bdc_id, "changes": updates})
        return deepcopy(shipment)

    def delete_shipment(self, bdc_id: str) -> dict[str, str]:
        shipment = self._get_required(self.shipments, bdc_id, "Shipment")
        for lot_id in shipment["lot_ids"]:
            if lot_id in self.lots:
                self.lots[lot_id]["status"] = LotStatus.CLASSIFIED
        del self.shipments[bdc_id]
        self.documents.pop(bdc_id, None)
        return {"message": f"Shipment {bdc_id} deleted"}

    # Alerts / admin
    def create_alert(self, alert_type: AlertType, severity: AlertSeverity, lot_id: str | None, message: str, actors: list[str], metadata: dict[str, Any]) -> dict[str, Any]:
        alert = {
            "alert_id": format_alert_id(self.counters.alert),
            "alert_type": alert_type,
            "severity": severity,
            "lot_id": lot_id,
            "message": message,
            "actors": actors,
            "created_at": utcnow(),
            "resolved_at": None,
            "resolved_comment": None,
            "metadata": metadata,
        }
        self.counters.alert += 1
        self.alerts[alert["alert_id"]] = alert
        for actor in actors:
            if "@" in actor:
                self.send_email(actor, f"NFN alert {alert['alert_id']}", message)
        return deepcopy(alert)

    def create_manual_alert(self, payload: AlertCreate) -> dict[str, Any]:
        return self.create_alert(payload.alert_type, payload.severity, payload.lot_id, payload.message, payload.actors, payload.metadata)

    def _active_alert_types_per_lot(self) -> dict[str, set[str]]:
        """Return {lot_id: {alert_type_str, ...}} for every active (unresolved) alert."""
        result: dict[str, set[str]] = {}
        for alert in self.alerts.values():
            if alert.get("resolved_at") is None and alert.get("lot_id"):
                result.setdefault(alert["lot_id"], set()).add(str(alert.get("alert_type", "")))
        return result

    def _active_bdc_ids(self) -> set[str]:
        """Return bdc_ids that already have an active BDC_OVERDUE alert."""
        result: set[str] = set()
        for alert in self.alerts.values():
            if alert.get("resolved_at") is None and str(alert.get("alert_type", "")) == str(AlertType.BDC_OVERDUE):
                meta = alert.get("metadata") or {}
                if meta.get("bdc_id"):
                    result.add(meta["bdc_id"])
        return result

    def refresh_overdue_alerts(self) -> None:
        now = utcnow()
        # Pre-compute deduplication helpers (safe — never raises)
        active_per_lot = self._active_alert_types_per_lot()
        active_bdc_ids = self._active_bdc_ids()

        # ── BDC overdue ──────────────────────────────────────────────────────
        try:
            for shipment in self.shipments.values():
                if shipment.get("expected_delivery_at", now) < now and shipment["bdc_id"] not in active_bdc_ids:
                    self.create_alert(
                        alert_type=AlertType.BDC_OVERDUE,
                        severity=AlertSeverity.WARNING,
                        lot_id=shipment["lot_ids"][0] if shipment.get("lot_ids") else None,
                        message=f"BDC {shipment['bdc_id']} est en retard de livraison.",
                        actors=["admin@nfn.example.com"],
                        metadata={"bdc_id": shipment["bdc_id"], "lot_id": None},
                    )
        except Exception:
            logger.exception("refresh_overdue_alerts: BDC overdue check failed")

        # ── Depot overdue ────────────────────────────────────────────────────
        try:
            depot_overdue_h = float(self.thresholds.get("depot_overdue_hours", 48))
            for lot_id, chain in self.lot_chains.items():
                if chain.get("depot_arrival_at") and chain.get("depot_departure_at") is None:
                    lot = self.lots.get(lot_id)
                    if lot and lot.get("status") in {LotStatus.AT_DEPOT, LotStatus.CLASSIFIED}:
                        hours_in = (now - chain["depot_arrival_at"]).total_seconds() / 3600
                        if hours_in > depot_overdue_h and str(AlertType.DEPOT_OVERDUE) not in active_per_lot.get(lot_id, set()):
                            self.create_alert(
                                alert_type=AlertType.DEPOT_OVERDUE,
                                severity=AlertSeverity.WARNING,
                                lot_id=lot_id,
                                message=f"Lot {lot_id} stationne au dépôt depuis {hours_in:.0f}h sans départ enregistré (seuil : {depot_overdue_h:.0f}h).",
                                actors=["admin@nfn.example.com"],
                                metadata={"lot_id": lot_id, "bdc_id": None, "hours_in_depot": round(hours_in, 1)},
                            )
        except Exception:
            logger.exception("refresh_overdue_alerts: depot overdue check failed")

        # ── Laverie overdue ──────────────────────────────────────────────────
        try:
            laverie_overdue_h = float(self.thresholds.get("laverie_overdue_hours", 24))
            for lot_id, chain in self.lot_chains.items():
                if chain.get("laverie_arrival_at") and chain.get("laverie_exit_at") is None:
                    lot = self.lots.get(lot_id)
                    if lot and lot.get("status") == LotStatus.AT_LAVERIE:
                        hours_in = (now - chain["laverie_arrival_at"]).total_seconds() / 3600
                        if hours_in > laverie_overdue_h and str(AlertType.LAVERIE_OVERDUE) not in active_per_lot.get(lot_id, set()):
                            self.create_alert(
                                alert_type=AlertType.LAVERIE_OVERDUE,
                                severity=AlertSeverity.WARNING,
                                lot_id=lot_id,
                                message=f"Lot {lot_id} est à la laverie depuis {hours_in:.0f}h sans déclaration de fin (seuil : {laverie_overdue_h:.0f}h).",
                                actors=["admin@nfn.example.com"],
                                metadata={"lot_id": lot_id, "bdc_id": None, "hours_in_laverie": round(hours_in, 1)},
                            )
        except Exception:
            logger.exception("refresh_overdue_alerts: laverie overdue check failed")

        # ── Estimate gap (collecte vs estimation) ────────────────────────────
        try:
            estimate_gap_pct = float(self.thresholds.get("estimate_gap_pct", 10.0))
            for lot_id, lot in self.lots.items():
                try:
                    estimated = float(lot.get("estimated_weight_kg") or 0)
                    observed  = float(lot.get("observed_weight_kg")  or 0)
                except (TypeError, ValueError):
                    continue
                if estimated <= 0:
                    continue
                delta_pct = abs(observed - estimated) / estimated * 100
                if delta_pct > estimate_gap_pct and str(AlertType.ESTIMATE_GAP) not in active_per_lot.get(lot_id, set()):
                    severity = AlertSeverity.CRITICAL if delta_pct > estimate_gap_pct * 2 else AlertSeverity.WARNING
                    self.create_alert(
                        alert_type=AlertType.ESTIMATE_GAP,
                        severity=severity,
                        lot_id=lot_id,
                        message=f"Lot {lot_id} : écart estimation/collecte de {delta_pct:.1f}% (seuil : {estimate_gap_pct:.0f}%).",
                        actors=["admin@nfn.example.com"],
                        metadata={"lot_id": lot_id, "bdc_id": None, "delta_pct": round(delta_pct, 2),
                                  "observed_weight_kg": observed, "estimated_weight_kg": estimated},
                    )
        except Exception:
            logger.exception("refresh_overdue_alerts: estimate gap check failed")

        # ── Receipt gap (dépôt) ──────────────────────────────────────────────
        try:
            receipt_gap_pct = float(self.thresholds.get("receipt_gap_pct", 5.0))
            for lot_id, receipt in self.receipts.items():
                try:
                    delta = abs(float(receipt.get("delta_pct") or 0))
                except (TypeError, ValueError):
                    continue
                if delta > receipt_gap_pct and str(AlertType.RECEIPT_GAP) not in active_per_lot.get(lot_id, set()):
                    received = float(receipt.get("received_weight_kg") or 0)
                    self.create_alert(
                        alert_type=AlertType.RECEIPT_GAP,
                        severity=AlertSeverity.CRITICAL,
                        lot_id=lot_id,
                        message=f"Lot {lot_id} : écart de réception dépôt de {delta:.1f}% (seuil : {receipt_gap_pct:.0f}%).",
                        actors=["admin@nfn.example.com"],
                        metadata={"lot_id": lot_id, "bdc_id": None, "delta_pct": round(delta, 2),
                                  "received_weight_kg": received},
                    )
        except Exception:
            logger.exception("refresh_overdue_alerts: receipt gap check failed")

    def list_alerts(self) -> list[dict[str, Any]]:
        self.refresh_overdue_alerts()
        return self._sorted_records(self.alerts)

    def get_alert(self, alert_id: str) -> dict[str, Any]:
        self.refresh_overdue_alerts()
        return deepcopy(self._get_required(self.alerts, alert_id, "Alert"))

    def update_alert(self, alert_id: str, payload: AlertUpdate) -> dict[str, Any]:
        alert = self._get_required(self.alerts, alert_id, "Alert")
        updates = payload.model_dump(exclude_unset=True)
        for key in ("severity", "message", "actors", "resolved_comment", "resolved_at", "metadata"):
            if key in updates:
                alert[key] = updates[key]
        return deepcopy(alert)

    def delete_alert(self, alert_id: str) -> dict[str, str]:
        self._get_required(self.alerts, alert_id, "Alert")
        del self.alerts[alert_id]
        return {"message": f"Alert {alert_id} deleted"}

    def evaluate_alerts(self, event: dict[str, Any]) -> None:
        event_type = event["event_type"]
        details = event["details"]
        if event_type == "lot.collected":
            estimated = float(details["estimated_weight_kg"])
            observed = float(details["observed_weight_kg"])
            delta_pct = abs(observed - estimated) / max(estimated, 1) * 100
            if delta_pct > self.thresholds["estimate_gap_pct"]:
                severity = AlertSeverity.CRITICAL if delta_pct > self.thresholds["estimate_gap_pct"] * 2 else AlertSeverity.WARNING
                self.create_alert(AlertType.ESTIMATE_GAP, severity, event["lot_id"], f"Collected weight gap is {delta_pct:.1f}% for {event['lot_id']}.", [event["actor"], "admin@nfn.example.com"], {"delta_pct": round(delta_pct, 2), **details})
        elif event_type == "depot.lot_received":
            expected = float(details["expected_weight_kg"])
            received = float(details["received_weight_kg"])
            delta_pct = abs(received - expected) / max(expected, 1) * 100
            if delta_pct > self.thresholds["receipt_gap_pct"]:
                self.create_alert(AlertType.RECEIPT_GAP, AlertSeverity.CRITICAL, event["lot_id"], f"Depot receipt gap is {delta_pct:.1f}% for {event['lot_id']}.", [event["actor"], "admin@nfn.example.com"], {"delta_pct": round(delta_pct, 2), **details})

    def resolve_alert(self, alert_id: str, comment: str) -> dict[str, Any]:
        alert = self._get_required(self.alerts, alert_id, "Alert")
        alert["resolved_at"] = utcnow()
        alert["resolved_comment"] = comment
        return deepcopy(alert)

    def get_lot_traceability(self, lot_id: str) -> list[dict[str, Any]]:
        if lot_id not in self.lot_events:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lot timeline not found")
        return deepcopy(self.lot_events[lot_id])

    def dashboard_summary(self) -> dict[str, Any]:
        self.refresh_overdue_alerts()
        pipeline = {
            "collecte": 0.0,
            "depot": 0.0,
            "transit_laverie": 0.0,
        }
        for lot in self.lots.values():
            weight = float(lot["observed_weight_kg"])
            if lot["status"] in {LotStatus.COLLECTED, LotStatus.AWAITING_DEPOT_RECEIPT}:
                pipeline["collecte"] += weight
            elif lot["status"] in {LotStatus.AT_DEPOT, LotStatus.CLASSIFIED}:
                pipeline["depot"] += weight
            elif lot["status"] == LotStatus.IN_TRANSIT_LAUNDRY:
                pipeline["transit_laverie"] += weight
        unresolved = [alert for alert in self.alerts.values() if alert["resolved_at"] is None]
        overdue = [alert for alert in unresolved if alert["alert_type"] == AlertType.BDC_OVERDUE]
        return {
            "active_lots": len(self.lots),
            "unresolved_alerts": len(unresolved),
            "pending_sources": len([source for source in self.sources.values() if source["status"] == SourceStatus.PENDING]),
            "bdc_overdue": len(overdue),
            "pipeline_weights": pipeline,
            "last_alert_check_at": self._last_alert_check_at,
        }

    def update_thresholds(self, payload: ThresholdUpdate) -> dict[str, Any]:
        updates = payload.model_dump(exclude_unset=True)
        self.thresholds.update(updates)
        return deepcopy(self.thresholds)

    def list_lots_for_admin(self) -> list[dict[str, Any]]:
        return self.list_lots()

    # Documents
    def list_documents(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.documents, field_name="updated_at")

    def get_document(self, document_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.documents, document_id, "Document"))

    def create_document(self, payload: DocumentCreate) -> dict[str, Any]:
        document_id = payload.document_id or format_document_id(self.counters.document)
        if payload.document_id is None:
            self.counters.document += 1
        if document_id in self.documents:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document already exists")
        return deepcopy(self._create_document_record(document_id, payload.title, payload.kind, payload.lines))

    def update_document(self, document_id: str, payload: DocumentUpdate) -> dict[str, Any]:
        document = self._get_required(self.documents, document_id, "Document")
        updates = payload.model_dump(exclude_unset=True)
        if "title" in updates:
            document["title"] = updates["title"]
        if "kind" in updates:
            document["kind"] = updates["kind"]
        if "lines" in updates:
            document["lines"] = updates["lines"]
        document["content_base64"] = base64.b64encode(_safe_pdf(document["lines"])).decode("utf-8")
        document["updated_at"] = utcnow()
        return deepcopy(document)

    def delete_document(self, document_id: str) -> dict[str, str]:
        self._get_required(self.documents, document_id, "Document")
        del self.documents[document_id]
        return {"message": f"Document {document_id} deleted"}

    # ── Lot Chain Tracking ────────────────────────────────────────────────────

    def _ensure_chain(self, lot_id: str) -> dict[str, Any]:
        """Return (and create if needed) the chain record for a lot."""
        self._get_required(self.lots, lot_id, "Lot")
        if lot_id not in self.lot_chains:
            self.lot_chains[lot_id] = {
                "lot_id": lot_id,
                "depot_id": None, "depot_arrival_weight_kg": None, "depot_arrival_at": None,
                "depot_departure_weight_kg": None, "depot_departure_at": None,
                "laverie_id": None, "laverie_arrival_weight_kg": None, "laverie_arrival_at": None,
                "laverie_exit_weight_kg": None, "laverie_exit_at": None,
                "transformateur_id": None, "transformateur_arrival_weight_kg": None, "transformateur_arrival_at": None,
                "transformateur_exit_weight_kg": None, "transformateur_exit_at": None,
            }
        return self.lot_chains[lot_id]

    def get_lot_chain(self, lot_id: str) -> dict[str, Any]:
        self._get_required(self.lots, lot_id, "Lot")
        return deepcopy(self.lot_chains.get(lot_id) or {"lot_id": lot_id})

    def record_depot_arrival(self, lot_id: str, payload: LotChainDepotRecord, actor_email: str) -> dict[str, Any]:
        chain = self._ensure_chain(lot_id)
        self._get_required(self.depots, payload.depot_id, "Dépôt")
        ts = payload.arrival_at or utcnow()
        chain["depot_id"] = payload.depot_id
        chain["depot_arrival_weight_kg"] = float(payload.arrival_weight_kg)
        chain["depot_arrival_at"] = ts
        self.lots[lot_id]["status"] = LotStatus.AT_DEPOT
        self.publish_event("chain.depot_arrived", actor=actor_email, lot_id=lot_id,
                           details={"depot_id": payload.depot_id, "arrival_weight_kg": float(payload.arrival_weight_kg)})
        return deepcopy(chain)

    def record_depot_departure(self, lot_id: str, payload: LotChainDepotDepartureRecord, actor_email: str) -> dict[str, Any]:
        chain = self._ensure_chain(lot_id)
        if not chain.get("depot_arrival_at"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Enregistrer d'abord l'arrivée au dépôt.")
        ts = payload.departure_at or utcnow()
        chain["depot_departure_weight_kg"] = float(payload.departure_weight_kg)
        chain["depot_departure_at"] = ts
        self.lots[lot_id]["status"] = LotStatus.IN_TRANSIT_LAUNDRY
        self.publish_event("chain.depot_departed", actor=actor_email, lot_id=lot_id,
                           details={"departure_weight_kg": float(payload.departure_weight_kg)})
        return deepcopy(chain)

    def record_laverie_arrival(self, lot_id: str, payload: LotChainLaverieRecord, actor_email: str) -> dict[str, Any]:
        chain = self._ensure_chain(lot_id)
        if not chain.get("depot_departure_at"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Enregistrer d'abord le départ du dépôt.")
        self._get_required(self.laveries, payload.laverie_id, "Laverie")
        ts = payload.arrival_at or utcnow()
        chain["laverie_id"] = payload.laverie_id
        chain["laverie_arrival_weight_kg"] = float(payload.arrival_weight_kg)
        chain["laverie_arrival_at"] = ts
        self.lots[lot_id]["status"] = LotStatus.AT_LAVERIE
        # ── Weight gap alert: depot exit → laverie entry ──────────────────
        dep_w = chain.get("depot_departure_weight_kg")
        if dep_w and dep_w > 0:
            gap_pct = abs(float(payload.arrival_weight_kg) - dep_w) / dep_w * 100
            threshold = float(self.thresholds.get("laverie_transit_gap_pct", 3.0))
            if gap_pct > threshold:
                self.create_alert(
                    alert_type=AlertType.LAVERIE_TRANSIT_GAP,
                    severity=AlertSeverity.CRITICAL if gap_pct > threshold * 2 else AlertSeverity.WARNING,
                    lot_id=lot_id,
                    message=(f"Lot {lot_id} : écart de poids {gap_pct:.1f}% entre la sortie dépôt "
                             f"({dep_w:.1f} kg) et l'entrée laverie ({payload.arrival_weight_kg:.1f} kg) "
                             f"— seuil : {threshold:.1f}%."),
                    actors=[actor_email, "admin@nfn.example.com"],
                    metadata={"lot_id": lot_id, "bdc_id": None, "depot_departure_kg": dep_w,
                              "laverie_arrival_kg": float(payload.arrival_weight_kg), "gap_pct": round(gap_pct, 2)},
                )
        self.publish_event("chain.laverie_arrived", actor=actor_email, lot_id=lot_id,
                           details={"laverie_id": payload.laverie_id, "arrival_weight_kg": float(payload.arrival_weight_kg)})
        return deepcopy(chain)

    def record_laverie_done(self, lot_id: str, payload: LotChainLaverieDoneRecord, actor_email: str) -> dict[str, Any]:
        chain = self._ensure_chain(lot_id)
        if not chain.get("laverie_arrival_at"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Enregistrer d'abord l'arrivée à la laverie.")
        ts = payload.exit_at or utcnow()
        chain["laverie_exit_weight_kg"] = float(payload.exit_weight_kg)
        chain["laverie_exit_at"] = ts
        self.lots[lot_id]["status"] = LotStatus.LAVERIE_DONE
        self.publish_event("chain.laverie_done", actor=actor_email, lot_id=lot_id,
                           details={"exit_weight_kg": float(payload.exit_weight_kg)})
        return deepcopy(chain)

    def record_transformateur_arrival(self, lot_id: str, payload: LotChainTransformateurRecord, actor_email: str) -> dict[str, Any]:
        chain = self._ensure_chain(lot_id)
        if not chain.get("laverie_exit_at"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Enregistrer d'abord la fin de laverie.")
        self._get_required(self.transformateurs, payload.transformateur_id, "Transformateur")
        ts = payload.arrival_at or utcnow()
        chain["transformateur_id"] = payload.transformateur_id
        chain["transformateur_arrival_weight_kg"] = float(payload.arrival_weight_kg)
        chain["transformateur_arrival_at"] = ts
        self.lots[lot_id]["status"] = LotStatus.AT_TRANSFORMATEUR
        # ── Weight gap alert: laverie exit → transformateur entry ─────────
        lav_w = chain.get("laverie_exit_weight_kg")
        if lav_w and lav_w > 0:
            gap_pct = abs(float(payload.arrival_weight_kg) - lav_w) / lav_w * 100
            threshold = float(self.thresholds.get("laverie_transit_gap_pct", 3.0))
            if gap_pct > threshold:
                self.create_alert(
                    alert_type=AlertType.TRANSFORMATEUR_TRANSIT_GAP,
                    severity=AlertSeverity.CRITICAL if gap_pct > threshold * 2 else AlertSeverity.WARNING,
                    lot_id=lot_id,
                    message=(f"Lot {lot_id} : écart de poids {gap_pct:.1f}% entre la sortie laverie "
                             f"({lav_w:.1f} kg) et l'entrée transformateur ({payload.arrival_weight_kg:.1f} kg) "
                             f"— seuil : {threshold:.1f}%."),
                    actors=[actor_email, "admin@nfn.example.com"],
                    metadata={"lot_id": lot_id, "bdc_id": None, "laverie_exit_kg": lav_w,
                              "transformateur_arrival_kg": float(payload.arrival_weight_kg), "gap_pct": round(gap_pct, 2)},
                )
        self.publish_event("chain.transformateur_arrived", actor=actor_email, lot_id=lot_id,
                           details={"transformateur_id": payload.transformateur_id, "arrival_weight_kg": float(payload.arrival_weight_kg)})
        return deepcopy(chain)

    def record_transformateur_done(self, lot_id: str, payload: LotChainTransformateurDoneRecord, actor_email: str) -> dict[str, Any]:
        chain = self._ensure_chain(lot_id)
        if not chain.get("transformateur_arrival_at"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Enregistrer d'abord l'arrivée au transformateur.")
        ts = payload.exit_at or utcnow()
        chain["transformateur_exit_weight_kg"] = float(payload.exit_weight_kg)
        chain["transformateur_exit_at"] = ts
        self.lots[lot_id]["status"] = LotStatus.TRANSFORMED
        self.publish_event("chain.transformed", actor=actor_email, lot_id=lot_id,
                           details={"exit_weight_kg": float(payload.exit_weight_kg)})
        return deepcopy(chain)

    def _seed_mock_lots(self) -> None:
        """Seed realistic lots/receipts/shipments/chains so refresh_overdue_alerts
        naturally fires ESTIMATE_GAP, RECEIPT_GAP, DEPOT_OVERDUE, LAVERIE_OVERDUE
        and BDC_OVERDUE alerts, while chain records generate transit gap alerts
        (LAVERIE_TRANSIT_GAP, TRANSFORMATEUR_TRANSIT_GAP) without manual alert creation.

        Weight rationale (raw wool / tête / tonte):
          Ouled Djellal ≈ 2.5 kg/tête · Rembi ≈ 2.2 kg/tête
          Hamra ≈ 1.8 kg/tête · Berbère ≈ 1.6 kg/tête
        """
        now = utcnow()

        # ── Lots ──────────────────────────────────────────────────────────
        seed_lots = [
            # LOT-001: Ferme Bouguetaia — 145 têtes OD → ~362 kg constaté,
            #   mais estimé à 290 kg → écart 24.8 % → ESTIMATE_GAP + RECEIPT_GAP
            {"lot_id": "LOT-2026-001",
             "source_id": "SRC-2026-001", "source_name": "Ferme Bouguetaia Aïssa",
             "observed_weight_kg": 362.0, "estimated_weight_kg": 290.0,
             "status": LotStatus.AT_DEPOT,
             "created_at": now - timedelta(days=12),
             "details": {"cleanliness": "3", "gps": {"lat": 34.154, "lng": 3.503}}},

            # LOT-002: Exploitation Remila — 210 têtes OD+Rembi → 498 kg, normal
            {"lot_id": "LOT-2026-002",
             "source_id": "SRC-2026-003", "source_name": "Exploitation Agropastorale Remila",
             "observed_weight_kg": 498.0, "estimated_weight_kg": 492.0,
             "status": LotStatus.AWAITING_DEPOT_RECEIPT,
             "created_at": now - timedelta(days=2),
             "details": {"cleanliness": "4", "gps": {"lat": 35.047, "lng": 1.055}}},

            # LOT-003: EARL Mekhalouf — 175 têtes OD → 432 kg, au dépôt depuis 75 h
            #   → DEPOT_OVERDUE (seuil 48 h)
            {"lot_id": "LOT-2026-003",
             "source_id": "SRC-2026-004", "source_name": "EARL Mekhalouf & Fils",
             "observed_weight_kg": 432.0, "estimated_weight_kg": 428.0,
             "status": LotStatus.AT_DEPOT,
             "created_at": now - timedelta(days=8),
             "details": {"cleanliness": "3", "gps": {"lat": 33.104, "lng": 1.272}}},

            # LOT-004: Coopérative Sersou — 380 têtes Rembi → 646 kg, en laverie
            #   depuis 36 h sans déclaration terminée → LAVERIE_OVERDUE (seuil 24 h)
            {"lot_id": "LOT-2026-004",
             "source_id": "SRC-2026-005", "source_name": "Coopérative Agropastorale Sersou",
             "observed_weight_kg": 646.0, "estimated_weight_kg": 638.0,
             "status": LotStatus.AT_LAVERIE,
             "created_at": now - timedelta(days=10),
             "details": {"cleanliness": "5", "gps": {"lat": 35.370, "lng": 1.320}}},

            # LOT-005: GAEC Frères Khelil — 95 têtes Hamra → 171 kg, classifié,
            #   fait partie d'un BDC en retard → BDC_OVERDUE
            {"lot_id": "LOT-2026-005",
             "source_id": "SRC-2026-002", "source_name": "GAEC Frères Khelil",
             "observed_weight_kg": 171.0, "estimated_weight_kg": 168.0,
             "status": LotStatus.CLASSIFIED,
             "created_at": now - timedelta(days=14),
             "details": {"cleanliness": "3", "gps": {"lat": 34.111, "lng": 2.101}}},

            # LOT-006: Coopérative Aurès Laine — 140 têtes Berbère → 224 kg,
            #   collecté ce matin, en transit vers dépôt
            {"lot_id": "LOT-2026-006",
             "source_id": "SRC-2026-008", "source_name": "Coopérative Aurès Laine",
             "observed_weight_kg": 224.0, "estimated_weight_kg": 220.0,
             "status": LotStatus.COLLECTED,
             "created_at": now - timedelta(hours=18),
             "details": {"cleanliness": "4", "gps": {"lat": 35.170, "lng": 6.601}}},

            # LOT-007: Ferme Amrani — 85 têtes OD → 212 kg,
            #   dépôt → laverie avec perte transit 6.7 % → LAVERIE_TRANSIT_GAP
            {"lot_id": "LOT-2026-007",
             "source_id": "SRC-2026-006", "source_name": "Ferme Amrani Hamid",
             "observed_weight_kg": 212.0, "estimated_weight_kg": 210.0,
             "status": LotStatus.AT_LAVERIE,
             "created_at": now - timedelta(days=4),
             "details": {"cleanliness": "3", "gps": {"lat": 35.882, "lng": 3.770}}},

            # LOT-008: Groupement Aïn Sefra — collecte partielle, 440 têtes
            #   Hamra+OD → 382 kg, perte laverie → transformateur 5.9 %
            #   → TRANSFORMATEUR_TRANSIT_GAP
            {"lot_id": "LOT-2026-008",
             "source_id": "SRC-2026-007", "source_name": "Groupement d'Éleveurs Aïn Sefra",
             "observed_weight_kg": 382.0, "estimated_weight_kg": 378.0,
             "status": LotStatus.AT_TRANSFORMATEUR,
             "created_at": now - timedelta(days=5),
             "details": {"cleanliness": "2", "gps": {"lat": 32.748, "lng": -0.588}}},
        ]
        for lot in seed_lots:
            self.lots[lot["lot_id"]] = lot
            self.lot_events[lot["lot_id"]] = []
        self.counters.lot = 9

        # ── Réception dépôt: LOT-001 — 330 kg reçus vs 362 kg constatés
        #    écart = 8.8 % → RECEIPT_GAP ──────────────────────────────────
        self.receipts["LOT-2026-001"] = {
            "lot_id": "LOT-2026-001",
            "received_weight_kg": 330.0,
            "storage_zone": "B3",
            "arrival_condition": "acceptable",
            "discrepancy_reason": "Bâches mal fixées — pertes en cours de route (RN1 Messaad–M'Sila)",
            "delta_pct": round(abs(330.0 - 362.0) / 362.0 * 100, 2),   # ≈ 8.8 %
            "created_at": now - timedelta(days=10),
        }

        # ── Classification pour LOT-005 (nécessaire pour l'expédition) ────
        self.classifications["LOT-2026-005"] = {
            "lot_id": "LOT-2026-005",
            "classification": "Laine fine type A",
            "vm_percent": 11.8,
            "fiber_state": "souple",
            "color": "blanc cassé",
            "created_at": now - timedelta(days=12),
        }

        # ── BDC-2026-001: livraison attendue il y a 2 jours → BDC_OVERDUE ─
        self.shipments["BDC-2026-001"] = {
            "bdc_id": "BDC-2026-001",
            "lot_ids": ["LOT-2026-005"],
            "total_weight_kg": 171.0,
            "humidity_pct": 13.2,
            "laundry_name": "Laverie Industrielle Aïn Oussera",
            "transporteur_email": "dispatch@transit-hoggar.dz",
            "destination_email": "reception@trf-sba.dz",
            "expected_delivery_at": now - timedelta(days=2),
            "created_at": now - timedelta(days=5),
        }
        self.counters.shipment = 2

        # ── Chaînes de traçabilité ─────────────────────────────────────────

        # LOT-001: arrivé au dépôt M'Sila il y a 10 jours, non expédié
        self.lot_chains["LOT-2026-001"] = {
            "lot_id": "LOT-2026-001",
            "depot_id": "DPT-2026-003",
            "depot_arrival_weight_kg": 330.0,
            "depot_arrival_at": now - timedelta(days=10),
            "depot_departure_at": None,
        }

        # LOT-003: arrivé au dépôt Tiaret il y a 75 h, départ non enregistré
        #   → DEPOT_OVERDUE
        self.lot_chains["LOT-2026-003"] = {
            "lot_id": "LOT-2026-003",
            "depot_id": "DPT-2026-004",
            "depot_arrival_weight_kg": 432.0,
            "depot_arrival_at": now - timedelta(hours=75),
            "depot_departure_at": None,
        }

        # LOT-004: passé par dépôt El Bayadh, en laverie depuis 36 h
        #   sans déclaration de fin → LAVERIE_OVERDUE
        self.lot_chains["LOT-2026-004"] = {
            "lot_id": "LOT-2026-004",
            "depot_id": "DPT-2026-001",
            "depot_arrival_weight_kg": 646.0,
            "depot_arrival_at": now - timedelta(hours=108),
            "depot_departure_weight_kg": 644.0,
            "depot_departure_at": now - timedelta(hours=84),
            "laverie_id": "LAV-2026-001",
            "laverie_arrival_weight_kg": 644.0,
            "laverie_arrival_at": now - timedelta(hours=36),
            "laverie_exit_at": None,
        }

        # LOT-007: dépôt Naâma → laverie, perte transit 6.7 %
        #   (départ 212 kg, arrivée laverie 198 kg) → LAVERIE_TRANSIT_GAP
        self.record_depot_arrival(
            "LOT-2026-007",
            LotChainDepotRecord(
                depot_id="DPT-2026-002",
                arrival_weight_kg=212.0,
                arrival_at=now - timedelta(hours=16),
            ),
            actor_email="depot@nfn.dz",
        )
        self.record_depot_departure(
            "LOT-2026-007",
            LotChainDepotDepartureRecord(
                departure_weight_kg=212.0,
                departure_at=now - timedelta(hours=15),
            ),
            actor_email="depot@nfn.dz",
        )
        self.record_laverie_arrival(
            "LOT-2026-007",
            LotChainLaverieRecord(
                laverie_id="LAV-2026-001",
                arrival_weight_kg=198.0,        # 6.6 % de perte en transit
                arrival_at=now - timedelta(hours=12),
            ),
            actor_email="depot@nfn.dz",
        )

        # LOT-008: dépôt Batna → laverie → transformateur,
        #   perte laverie→trf 5.9 % → TRANSFORMATEUR_TRANSIT_GAP
        self.record_depot_arrival(
            "LOT-2026-008",
            LotChainDepotRecord(
                depot_id="DPT-2026-005",
                arrival_weight_kg=382.0,
                arrival_at=now - timedelta(hours=36),
            ),
            actor_email="depot@nfn.dz",
        )
        self.record_depot_departure(
            "LOT-2026-008",
            LotChainDepotDepartureRecord(
                departure_weight_kg=380.0,
                departure_at=now - timedelta(hours=30),
            ),
            actor_email="depot@nfn.dz",
        )
        self.record_laverie_arrival(
            "LOT-2026-008",
            LotChainLaverieRecord(
                laverie_id="LAV-2026-001",
                arrival_weight_kg=380.0,
                arrival_at=now - timedelta(hours=28),
            ),
            actor_email="depot@nfn.dz",
        )
        self.record_laverie_done(
            "LOT-2026-008",
            LotChainLaverieDoneRecord(
                exit_weight_kg=340.0,           # perte au lavage 10.5 % (normal)
                exit_at=now - timedelta(hours=26),
            ),
            actor_email="laverie@nfn.dz",
        )
        self.record_transformateur_arrival(
            "LOT-2026-008",
            LotChainTransformateurRecord(
                transformateur_id="TRF-2026-001",
                arrival_weight_kg=320.0,        # 5.9 % de perte en transit → alerte
                arrival_at=now - timedelta(hours=24),
            ),
            actor_email="trf@nfn.dz",
        )

    # ── Infrastructure seeding ────────────────────────────────────────────────

    def _seed_infrastructure(self) -> None:
        now = utcnow()
        # 5 Dépôts
        seed_depots = [
            {"depot_id": "DPT-2026-001", "name": "Dépôt Central El Bayadh",
             "wilaya": "El Bayadh",  "commune": "El Bayadh",
             "gps_lat": 33.683, "gps_lng":  1.007,
             "responsible_name": "Benmoussa Kaddour",
             "phone": "049 78 14 02", "surface_m2": 2000.0, "location_cost_da_per_m2": 60.0,  "created_at": now},
            {"depot_id": "DPT-2026-002", "name": "Dépôt Agropassoral Naâma",
             "wilaya": "Naâma",      "commune": "Naâma",
             "gps_lat": 33.267, "gps_lng": -0.312,
             "responsible_name": "Tahir Lakhdar",
             "phone": "049 52 33 67", "surface_m2": 1500.0, "location_cost_da_per_m2": 55.0,  "created_at": now},
            {"depot_id": "DPT-2026-003", "name": "Dépôt Régional M'Sila",
             "wilaya": "M'Sila",     "commune": "M'Sila",
             "gps_lat": 35.705, "gps_lng":  4.544,
             "responsible_name": "Belkacem Djilali",
             "phone": "035 55 91 23", "surface_m2": 2500.0, "location_cost_da_per_m2": 58.0,  "created_at": now},
            {"depot_id": "DPT-2026-004", "name": "Dépôt Sersou — Tiaret",
             "wilaya": "Tiaret",     "commune": "Tiaret",
             "gps_lat": 35.370, "gps_lng":  1.320,
             "responsible_name": "Hadj Aoued Mohamed",
             "phone": "046 41 07 58", "surface_m2": 2200.0, "location_cost_da_per_m2": 57.0,  "created_at": now},
            {"depot_id": "DPT-2026-005", "name": "Dépôt Aurès — Batna",
             "wilaya": "Batna",      "commune": "Batna",
             "gps_lat": 35.555, "gps_lng":  6.174,
             "responsible_name": "Cherif Boudissa",
             "phone": "033 86 44 19", "surface_m2": 2800.0, "location_cost_da_per_m2": 65.0,  "created_at": now},
        ]
        for d in seed_depots:
            self.depots[d["depot_id"]] = d
        self.counters.depot = 6

        # 2 Laveries
        seed_laveries = [
            {"laverie_id": "LAV-2026-001",
             "name": "Laverie Industrielle Aïn Oussera",
             "wilaya": "Djelfa", "commune": "Aïn Oussera",
             "gps_lat": 35.082, "gps_lng": 2.908,
             "responsible_name": "Zerrouki Hocine",
             "phone": "027 63 22 45", "cleaning_cost_per_kg_da": 18.5, "created_at": now},
            {"laverie_id": "LAV-2026-002",
             "name": "Laverie Hassi Behbeh",
             "wilaya": "Djelfa", "commune": "Hassi Behbeh",
             "gps_lat": 34.618, "gps_lng": 3.386,
             "responsible_name": "Ouali Moussa",
             "phone": "027 71 08 93", "cleaning_cost_per_kg_da": 17.0, "created_at": now},
        ]
        for l in seed_laveries:
            self.laveries[l["laverie_id"]] = l
        self.counters.laverie = 3

        # 2 Transformateurs
        seed_transformateurs = [
            {"transformateur_id": "TRF-2026-001",
             "name": "Filature & Tissage Sidi Bel Abbès",
             "wilaya": "Sidi Bel Abbès", "commune": "Sidi Bel Abbès",
             "gps_lat": 35.189, "gps_lng": -0.628,
             "responsible_name": "Benali Farouk",
             "phone": "048 54 37 11", "type": "T1", "created_at": now},
            {"transformateur_id": "TRF-2026-002",
             "name": "Atelier Laineux Bouasaâda",
             "wilaya": "M'Sila", "commune": "Bouasaâda",
             "gps_lat": 35.213, "gps_lng": 4.175,
             "responsible_name": "Djameleddine Rahmani",
             "phone": "035 33 60 87", "type": "T2", "created_at": now},
        ]
        for t in seed_transformateurs:
            self.transformateurs[t["transformateur_id"]] = t
        self.counters.transformateur = 3

    # ── Depot Sites ───────────────────────────────────────────────────────────

    def list_depots(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.depots)

    def get_depot(self, depot_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.depots, depot_id, "Dépôt"))

    def create_depot(self, payload: DepotSiteCreate) -> dict[str, Any]:
        depot_id = format_depot_id(self.counters.depot)
        self.counters.depot += 1
        depot = {
            "depot_id": depot_id,
            "name": payload.name,
            "wilaya": payload.wilaya,
            "commune": payload.commune,
            "gps_lat": float(payload.gps_lat),
            "gps_lng": float(payload.gps_lng),
            "responsible_name": payload.responsible_name,
            "phone": payload.phone,
            "surface_m2": float(payload.surface_m2),
            "location_cost_da_per_m2": float(payload.location_cost_da_per_m2),
            "created_at": utcnow(),
        }
        self.depots[depot_id] = depot
        return deepcopy(depot)

    def update_depot(self, depot_id: str, payload: DepotSiteUpdate) -> dict[str, Any]:
        depot = self._get_required(self.depots, depot_id, "Dépôt")
        updates = payload.model_dump(exclude_unset=True)
        for key in ("name", "wilaya", "commune", "gps_lat", "gps_lng", "responsible_name", "phone", "surface_m2", "location_cost_da_per_m2"):
            if key in updates:
                depot[key] = updates[key]
        return deepcopy(depot)

    def delete_depot(self, depot_id: str) -> dict[str, str]:
        self._get_required(self.depots, depot_id, "Dépôt")
        del self.depots[depot_id]
        return {"message": f"Dépôt {depot_id} supprimé"}

    # ── Laveries ──────────────────────────────────────────────────────────────

    def list_laveries(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.laveries)

    def get_laverie(self, laverie_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.laveries, laverie_id, "Laverie"))

    def create_laverie(self, payload: LaverieCreate) -> dict[str, Any]:
        laverie_id = format_laverie_id(self.counters.laverie)
        self.counters.laverie += 1
        laverie = {
            "laverie_id": laverie_id,
            "name": payload.name,
            "wilaya": payload.wilaya,
            "commune": payload.commune,
            "gps_lat": float(payload.gps_lat),
            "gps_lng": float(payload.gps_lng),
            "responsible_name": payload.responsible_name,
            "phone": payload.phone,
            "cleaning_cost_per_kg_da": float(payload.cleaning_cost_per_kg_da),
            "created_at": utcnow(),
        }
        self.laveries[laverie_id] = laverie
        return deepcopy(laverie)

    def update_laverie(self, laverie_id: str, payload: LaverieUpdate) -> dict[str, Any]:
        laverie = self._get_required(self.laveries, laverie_id, "Laverie")
        updates = payload.model_dump(exclude_unset=True)
        for key in ("name", "wilaya", "commune", "gps_lat", "gps_lng", "responsible_name", "phone", "cleaning_cost_per_kg_da"):
            if key in updates:
                laverie[key] = updates[key]
        return deepcopy(laverie)

    def delete_laverie(self, laverie_id: str) -> dict[str, str]:
        self._get_required(self.laveries, laverie_id, "Laverie")
        del self.laveries[laverie_id]
        return {"message": f"Laverie {laverie_id} supprimée"}

    # ── Transformateurs ───────────────────────────────────────────────────────

    def list_transformateurs(self) -> list[dict[str, Any]]:
        return self._sorted_records(self.transformateurs)

    def get_transformateur(self, transformateur_id: str) -> dict[str, Any]:
        return deepcopy(self._get_required(self.transformateurs, transformateur_id, "Transformateur"))

    def create_transformateur(self, payload: TransformateurCreate) -> dict[str, Any]:
        transformateur_id = format_transformateur_id(self.counters.transformateur)
        self.counters.transformateur += 1
        transformateur = {
            "transformateur_id": transformateur_id,
            "name": payload.name,
            "wilaya": payload.wilaya,
            "commune": payload.commune,
            "gps_lat": float(payload.gps_lat),
            "gps_lng": float(payload.gps_lng),
            "responsible_name": payload.responsible_name,
            "phone": payload.phone,
            "type": payload.type,
            "created_at": utcnow(),
        }
        self.transformateurs[transformateur_id] = transformateur
        return deepcopy(transformateur)

    def update_transformateur(self, transformateur_id: str, payload: TransformateurUpdate) -> dict[str, Any]:
        transformateur = self._get_required(self.transformateurs, transformateur_id, "Transformateur")
        updates = payload.model_dump(exclude_unset=True)
        for key in ("name", "wilaya", "commune", "gps_lat", "gps_lng", "responsible_name", "phone", "type"):
            if key in updates:
                transformateur[key] = updates[key]
        return deepcopy(transformateur)

    def delete_transformateur(self, transformateur_id: str) -> dict[str, str]:
        self._get_required(self.transformateurs, transformateur_id, "Transformateur")
        del self.transformateurs[transformateur_id]
        return {"message": f"Transformateur {transformateur_id} supprimé"}

    # Events / traceability
    def publish_event(self, event_type: str, actor: str, lot_id: str | None = None, details: dict[str, Any] | None = None) -> None:
        event = {
            "event_type": event_type,
            "actor": actor,
            "occurred_at": utcnow(),
            "lot_id": lot_id,
            "details": details or {},
        }
        if lot_id is not None:
            self.lot_events.setdefault(lot_id, []).append(event)
        self.evaluate_alerts(event)


platform_state = PlatformState()
