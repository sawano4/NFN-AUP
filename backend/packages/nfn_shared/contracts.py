from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field

from .enums import AlertSeverity, AlertType, LotStatus, Role, SourceStatus, SyncJobType


class MessageResponse(BaseModel):
    message: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class UserProfile(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    role: Role


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    role: Role
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    name: str | None = None
    role: Role | None = None
    password: str | None = Field(default=None, min_length=6)


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(min_length=6, max_length=6)


class SourceRegistrationCreate(BaseModel):
    email: EmailStr
    source_type: str
    name: str
    wilaya: str
    commune: str
    gps_lat: float
    gps_lng: float
    phone: str | None = None
    races: list[str] = Field(default_factory=list)
    herd_size: int
    availability_months: list[str] = Field(default_factory=list)


class SourceRegistrationUpdate(BaseModel):
    email: EmailStr | None = None
    source_type: str | None = None
    name: str | None = None
    wilaya: str | None = None
    commune: str | None = None
    gps_lat: float | None = None
    gps_lng: float | None = None
    phone: str | None = None
    races: list[str] | None = None
    herd_size: int | None = None
    availability_months: list[str] | None = None
    status: SourceStatus | None = None
    reason: str | None = None


class SourceRegistrationView(BaseModel):
    public_id: str
    email: EmailStr
    source_type: str
    name: str
    wilaya: str
    commune: str
    gps_lat: float
    gps_lng: float
    races: list[str]
    herd_size: int
    availability_months: list[str]
    status: SourceStatus
    reason: str | None = None
    created_at: datetime


class SourceStatusView(BaseModel):
    public_id: str
    status: SourceStatus
    reason: str | None = None


class SourceApprovalRequest(BaseModel):
    comment: str | None = None


class SourceRejectionRequest(BaseModel):
    reason: str = Field(min_length=3)


class TourStop(BaseModel):
    source_id: str
    source_name: str
    estimated_weight_kg: float
    wilaya: str
    gps_lat: float
    gps_lng: float
    status: str


class ThresholdConfig(BaseModel):
    estimate_gap_pct: float
    receipt_gap_pct: float
    bdc_overdue_hours: int


class ThresholdUpdate(BaseModel):
    estimate_gap_pct: float | None = None
    receipt_gap_pct: float | None = None
    bdc_overdue_hours: int | None = None


class BootstrapResponse(BaseModel):
    agent_name: str
    generated_at: datetime
    thresholds: ThresholdConfig
    sources: list[SourceRegistrationView]
    today_tour: list[TourStop]
    reserved_lot_ids: list[str]


class LotCreate(BaseModel):
    lot_id: str | None = None
    source_id: str
    source_name: str | None = None
    observed_weight_kg: float
    estimated_weight_kg: float
    cleanliness: str | None = None
    gps: dict[str, float] = Field(default_factory=dict)
    status: LotStatus = LotStatus.AWAITING_DEPOT_RECEIPT


class LotUpdate(BaseModel):
    source_id: str | None = None
    source_name: str | None = None
    observed_weight_kg: float | None = None
    estimated_weight_kg: float | None = None
    cleanliness: str | None = None
    gps: dict[str, float] | None = None
    status: LotStatus | None = None


class LotView(BaseModel):
    lot_id: str
    source_id: str
    source_name: str
    observed_weight_kg: float
    estimated_weight_kg: float
    status: LotStatus
    created_at: datetime


class FieldExceptionCreate(BaseModel):
    source_id: str
    reason: str
    note: str | None = None
    gps: dict[str, float] = Field(default_factory=dict)


class FieldExceptionUpdate(BaseModel):
    reason: str | None = None
    note: str | None = None
    gps: dict[str, float] | None = None


class FieldExceptionView(BaseModel):
    exception_id: str
    source_id: str
    reason: str
    note: str | None = None
    gps: dict[str, float] = Field(default_factory=dict)
    created_at: datetime


class MediaUploadRequest(BaseModel):
    filename: str
    content_type: str


class MediaCreate(BaseModel):
    filename: str
    content_type: str


class MediaUpdate(BaseModel):
    filename: str | None = None
    content_type: str | None = None
    status: str | None = None


class MediaRecord(BaseModel):
    media_key: str
    upload_url: str
    filename: str
    content_type: str
    status: str
    created_at: datetime


class MediaUploadResponse(BaseModel):
    upload_url: str
    media_key: str


class SyncJob(BaseModel):
    client_job_id: str
    job_type: SyncJobType
    payload: dict[str, Any]
    occurred_at: datetime


class SyncBatchRequest(BaseModel):
    jobs: list[SyncJob]


class SyncBatchResponse(BaseModel):
    accepted_job_ids: list[str]
    duplicate_job_ids: list[str]
    generated_lot_ids: list[str]


class AlertCreate(BaseModel):
    alert_type: AlertType
    severity: AlertSeverity
    lot_id: str | None = None
    message: str
    actors: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AlertUpdate(BaseModel):
    severity: AlertSeverity | None = None
    message: str | None = None
    actors: list[str] | None = None
    resolved_comment: str | None = None
    resolved_at: datetime | None = None
    metadata: dict[str, Any] | None = None


class AlertRecord(BaseModel):
    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    lot_id: str | None = None
    message: str
    actors: list[str]
    created_at: datetime
    resolved_at: datetime | None = None
    resolved_comment: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class ResolveAlertRequest(BaseModel):
    comment: str = Field(min_length=3)


class TraceabilityEvent(BaseModel):
    event_type: str
    actor: str
    occurred_at: datetime
    lot_id: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)


class DashboardSummary(BaseModel):
    active_lots: int
    unresolved_alerts: int
    pending_sources: int
    bdc_overdue: int
    pipeline_weights: dict[str, float]


class DepotReceiptCreate(BaseModel):
    lot_id: str
    received_weight_kg: float
    storage_zone: str
    arrival_condition: str
    discrepancy_reason: str | None = None


class DepotReceiptUpdate(BaseModel):
    received_weight_kg: float | None = None
    storage_zone: str | None = None
    arrival_condition: str | None = None
    discrepancy_reason: str | None = None


class DepotReceiptView(BaseModel):
    lot_id: str
    received_weight_kg: float
    storage_zone: str
    arrival_condition: str
    discrepancy_reason: str | None = None
    delta_pct: float
    created_at: datetime


class DepotClassificationCreate(BaseModel):
    lot_id: str
    classification: str
    vm_percent: float
    fiber_state: str
    color: str


class DepotClassificationUpdate(BaseModel):
    classification: str | None = None
    vm_percent: float | None = None
    fiber_state: str | None = None
    color: str | None = None


class DepotClassificationView(BaseModel):
    lot_id: str
    classification: str
    vm_percent: float
    fiber_state: str
    color: str
    created_at: datetime


class ShipmentCreate(BaseModel):
    lot_ids: list[str]
    humidity_pct: float
    laundry_name: str
    transporteur_email: EmailStr
    destination_email: EmailStr
    expected_delivery_at: datetime


class ShipmentUpdate(BaseModel):
    lot_ids: list[str] | None = None
    humidity_pct: float | None = None
    laundry_name: str | None = None
    transporteur_email: EmailStr | None = None
    destination_email: EmailStr | None = None
    expected_delivery_at: datetime | None = None


class BdcRecord(BaseModel):
    bdc_id: str
    lot_ids: list[str]
    total_weight_kg: float
    humidity_pct: float
    laundry_name: str
    transporteur_email: EmailStr
    destination_email: EmailStr
    expected_delivery_at: datetime
    pdf_url: str
    created_at: datetime


class DocumentCreate(BaseModel):
    document_id: str | None = None
    title: str
    kind: str = "generic"
    lines: list[str] = Field(default_factory=list)


class DocumentUpdate(BaseModel):
    title: str | None = None
    kind: str | None = None
    lines: list[str] | None = None


class DocumentRecord(BaseModel):
    document_id: str
    title: str
    kind: str
    lines: list[str]
    pdf_url: str
    created_at: datetime
    updated_at: datetime


class EmailMessageCreate(BaseModel):
    recipient: EmailStr
    subject: str
    body: str


class EmailMessageUpdate(BaseModel):
    recipient: EmailStr | None = None
    subject: str | None = None
    body: str | None = None


class EmailMessage(BaseModel):
    message_id: str
    recipient: EmailStr
    subject: str
    body: str
    created_at: datetime
