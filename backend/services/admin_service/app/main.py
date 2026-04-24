from fastapi import Depends, FastAPI

from backend.packages.nfn_shared.auth import require_roles
from backend.packages.nfn_shared.contracts import (
    AlertRecord,
    DashboardSummary,
    ResolveAlertRequest,
    SourceApprovalRequest,
    SourceRegistrationView,
    SourceRejectionRequest,
    TraceabilityEvent,
)
from backend.packages.nfn_shared.enums import Role
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="admin-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "admin-service"}


@app.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(current_user: dict = Depends(require_roles(Role.ADMIN))) -> DashboardSummary:
    summary = platform_state.dashboard_summary()
    return DashboardSummary(**summary)


@app.get("/alerts", response_model=list[AlertRecord])
def alerts(current_user: dict = Depends(require_roles(Role.ADMIN))) -> list[AlertRecord]:
    return [AlertRecord(**alert) for alert in platform_state.list_alerts()]


@app.post("/alerts/{alert_id}/resolve", response_model=AlertRecord)
def resolve_alert(alert_id: str, payload: ResolveAlertRequest, current_user: dict = Depends(require_roles(Role.ADMIN))) -> AlertRecord:
    alert = platform_state.resolve_alert(alert_id, payload.comment)
    return AlertRecord(**alert)


@app.get("/sources/pending", response_model=list[SourceRegistrationView])
def pending_sources(current_user: dict = Depends(require_roles(Role.ADMIN))) -> list[SourceRegistrationView]:
    return [SourceRegistrationView(**source) for source in platform_state.list_pending_sources()]


@app.post("/sources/{public_id}/approve", response_model=SourceRegistrationView)
def approve_source(
    public_id: str,
    payload: SourceApprovalRequest,
    current_user: dict = Depends(require_roles(Role.ADMIN)),
) -> SourceRegistrationView:
    source = platform_state.approve_source(public_id, current_user["email"], payload.comment)
    return SourceRegistrationView(**source)


@app.post("/sources/{public_id}/reject", response_model=SourceRegistrationView)
def reject_source(
    public_id: str,
    payload: SourceRejectionRequest,
    current_user: dict = Depends(require_roles(Role.ADMIN)),
) -> SourceRegistrationView:
    source = platform_state.reject_source(public_id, current_user["email"], payload.reason)
    return SourceRegistrationView(**source)


@app.get("/lots/{lot_id}/traceability", response_model=list[TraceabilityEvent])
def lot_traceability(lot_id: str, current_user: dict = Depends(require_roles(Role.ADMIN))) -> list[TraceabilityEvent]:
    return [TraceabilityEvent(**event) for event in platform_state.get_lot_traceability(lot_id)]

