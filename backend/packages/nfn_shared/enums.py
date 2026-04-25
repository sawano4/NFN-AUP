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
    SUSPENDED = "suspended"


class LotStatus(StrEnum):
    COLLECTED = "collected"
    AWAITING_DEPOT_RECEIPT = "awaiting_depot_receipt"
    AT_DEPOT = "at_depot"
    CLASSIFIED = "classified"
    IN_TRANSIT_LAUNDRY = "in_transit_laundry"
    # Admin chain statuses
    AT_LAVERIE = "at_laverie"
    LAVERIE_DONE = "laverie_done"
    IN_TRANSIT_TRANSFORMATEUR = "in_transit_transformateur"
    AT_TRANSFORMATEUR = "at_transformateur"
    TRANSFORMED = "transformed"
    # Operator chain statuses
    AT_LAUNDRY = "at_laundry"
    WASHED = "washed"
    IN_TRANSIT_TRANSFORMER = "in_transit_transformer"
    DELIVERED = "delivered"


class AlertSeverity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertType(StrEnum):
    ESTIMATE_GAP = "estimate_gap"
    RECEIPT_GAP = "receipt_gap"
    BDC_OVERDUE = "bdc_overdue"
    # Admin chain alerts
    LAVERIE_TRANSIT_GAP = "laverie_transit_gap"
    TRANSFORMATEUR_TRANSIT_GAP = "transformateur_transit_gap"
    DEPOT_OVERDUE = "depot_overdue"
    LAVERIE_OVERDUE = "laverie_overdue"
    # Operator chain alerts
    STOCK_TEMPERATURE = "stock_temperature"
    LAUNDRY_RECEIPT_GAP = "laundry_receipt_gap"
    LAUNDRY_YIELD_LOW = "laundry_yield_low"
    MASS_BALANCE_GAP = "mass_balance_gap"
    TRANSFORMER_CONFIRMATION_OVERDUE = "transformer_confirmation_overdue"
    DEPOT_CAPACITY_EXCEEDED = "depot_capacity_exceeded"
    DEPOT_STORAGE_TIME_EXCEEDED = "depot_storage_time_exceeded"
    LAUNDRY_PROCESSING_TIME_EXCEEDED = "laundry_processing_time_exceeded"
    LOT_TRANSFORMATION_SLA_EXCEEDED = "lot_transformation_sla_exceeded"


class SyncJobType(StrEnum):
    LOT_COLLECTED = "lot_collected"
    EXCEPTION_REPORTED = "exception_reported"
    FIELD_SOURCE_CREATED = "field_source_created"
