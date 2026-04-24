from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class SequenceCounters:
    user: int = 4
    lot: int = 42
    source: int = 10
    alert: int = 1
    shipment: int = 18
    document: int = 1
    message: int = 1
    exception: int = 1
    media: int = 1


def _year() -> int:
    return datetime.now(timezone.utc).year


def format_lot_id(number: int) -> str:
    return f"LOT-{_year()}-{number:03d}"


def format_source_id(number: int) -> str:
    return f"SRC-{_year()}-{number:03d}"


def format_alert_id(number: int) -> str:
    return f"ALT-{_year()}-{number:04d}"


def format_bdc_id(number: int) -> str:
    return f"BDC-{_year()}-{number:04d}"


def format_message_id(number: int) -> str:
    return f"MSG-{_year()}-{number:04d}"


def format_user_id(number: int) -> str:
    return f"USR-{_year()}-{number:03d}"


def format_document_id(number: int) -> str:
    return f"DOC-{_year()}-{number:04d}"


def format_exception_id(number: int) -> str:
    return f"EXP-{_year()}-{number:04d}"


def format_media_id(number: int) -> str:
    return f"MED-{_year()}-{number:04d}"
