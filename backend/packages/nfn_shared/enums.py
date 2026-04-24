from enum import StrEnum


class Role(StrEnum):
    AGENT = "agent_collecteur"
    DEPOT = "responsable_depot"
    ADMIN = "admin_NFN"
    LAUNDRY = "responsable_laverie"
    T1 = "transformateur_T1"
    T2 = "transformateur_T2"


class SourceStatus(StrEnum):
    PENDING = "pending"
    ACTIVE = "active"
    REJECTED = "rejected"


class LotStatus(StrEnum):
    COLLECTED = "collected"
    AWAITING_DEPOT_RECEIPT = "awaiting_depot_receipt"
    AT_DEPOT = "at_depot"
    CLASSIFIED = "classified"
    IN_TRANSIT_LAUNDRY = "in_transit_laundry"


class AlertSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(StrEnum):
    ESTIMATE_GAP = "estimate_gap"
    RECEIPT_GAP = "receipt_gap"
    BDC_OVERDUE = "bdc_overdue"


class SyncJobType(StrEnum):
    LOT_COLLECTED = "lot_collected"
    EXCEPTION_REPORTED = "exception_reported"
    FIELD_SOURCE_CREATED = "field_source_created"

