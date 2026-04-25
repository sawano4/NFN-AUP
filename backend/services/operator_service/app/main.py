from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import PlainTextResponse

from backend.packages.nfn_shared.auth import require_roles
from backend.packages.nfn_shared.contracts import (
    BdcRecord,
    DepotClassificationCreate,
    DepotClassificationUpdate,
    DepotClassificationView,
    DepotReceiptCreate,
    DepotReceiptUpdate,
    DepotReceiptView,
    LaundryOutputCreate,
    LaundryOutputView,
    LaundryReceiptCreate,
    LaundryReceiptView,
    LotCreate,
    LotView,
    OperatorSiteCreate,
    OperatorSiteView,
    PurityCertificateView,
    QrScanRequest,
    QrScanResult,
    ShipmentCreate,
    StockLotView,
    StockTemperatureCreate,
    StockTemperatureView,
    T1ProductionCreate,
    T1ProductionView,
    T2ReceptionCreate,
    T2ReceptionView,
    ThresholdConfig,
    ThresholdUpdate,
    TraceabilityEvent,
    TransformerReceiptCreate,
    TransformerReceiptView,
    UserCreate,
    UserProfile,
    WashRunCreate,
    WashRunUpdate,
    WashRunView,
)
from backend.packages.nfn_shared.enums import Role
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="operator-service", version="0.2.0")


def _user_site_id(current_user: dict) -> str | None:
    return platform_state.get_user_profile(current_user["sub"]).get("site_id")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "operator-service"}


@app.get("/sites", response_model=list[OperatorSiteView])
def list_sites(site_type: str | None = None, current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> list[OperatorSiteView]:
    return [OperatorSiteView(**site) for site in platform_state.list_operator_sites(site_type)]


@app.post("/admin/sites", response_model=OperatorSiteView)
def create_site(payload: OperatorSiteCreate, current_user: dict = Depends(require_roles(Role.ADMIN))) -> OperatorSiteView:
    return OperatorSiteView(**platform_state.create_operator_site(payload))


@app.get("/admin/users", response_model=list[UserProfile])
def list_operator_users(current_user: dict = Depends(require_roles(Role.ADMIN))) -> list[UserProfile]:
    return [UserProfile(**user) for user in platform_state.list_users()]


@app.post("/admin/users", response_model=UserProfile)
def create_operator_user(payload: UserCreate, current_user: dict = Depends(require_roles(Role.ADMIN))) -> UserProfile:
    return UserProfile(**platform_state.create_user(payload))


@app.post("/qr/scan", response_model=QrScanResult)
def scan_qr(payload: QrScanRequest, current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> QrScanResult:
    return QrScanResult(**platform_state.scan_qr_payload(payload))


@app.get("/policies")
def policies(current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> dict:
    site_id = None if current_user["role"] == Role.ADMIN.value else _user_site_id(current_user)
    return platform_state.policy_status(site_id)


@app.patch("/admin/policies", response_model=ThresholdConfig)
def update_policies(payload: ThresholdUpdate, current_user: dict = Depends(require_roles(Role.ADMIN))) -> ThresholdConfig:
    return ThresholdConfig(**platform_state.update_thresholds(payload))


@app.get("/reports/{scope}.csv", response_class=PlainTextResponse)
def export_report(scope: str, current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> PlainTextResponse:
    site_id = None if current_user["role"] == Role.ADMIN.value else _user_site_id(current_user)
    csv_text = platform_state.operator_report_csv(scope, site_id)
    return PlainTextResponse(
        csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="nfn-{scope}-report.csv"'},
    )


@app.get("/depot/pending-receipts", response_model=list[StockLotView])
def pending_receipts(current_user: dict = Depends(require_roles(Role.DEPOT, Role.ADMIN))) -> list[StockLotView]:
    site_id = None if current_user["role"] == Role.ADMIN.value else _user_site_id(current_user)
    return [StockLotView(**item) for item in platform_state.list_pending_receipts(site_id)]


@app.post("/depot/lots", response_model=LotView)
def create_depot_lot(payload: LotCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> LotView:
    lot = platform_state.create_lot(payload, actor_email=current_user["email"], publish_event_name="depot.lot_created")
    return LotView(**lot)


@app.post("/depot/receipts", response_model=DepotReceiptView)
def create_receipt(payload: DepotReceiptCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> DepotReceiptView:
    receipt = platform_state.create_receipt(
        actor_email=current_user["email"],
        lot_id=payload.lot_id,
        received_weight_kg=payload.received_weight_kg,
        storage_zone=payload.storage_zone,
        arrival_condition=payload.arrival_condition,
        discrepancy_reason=payload.discrepancy_reason,
        qr_payload=payload.qr_payload,
    )
    return DepotReceiptView(**receipt)


@app.patch("/depot/receipts/{lot_id}", response_model=DepotReceiptView)
def update_receipt(lot_id: str, payload: DepotReceiptUpdate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> DepotReceiptView:
    return DepotReceiptView(**platform_state.update_receipt(lot_id, payload, current_user["email"]))


@app.get("/depot/stock", response_model=list[StockLotView])
def depot_stock(current_user: dict = Depends(require_roles(Role.DEPOT, Role.ADMIN))) -> list[StockLotView]:
    site_id = None if current_user["role"] == Role.ADMIN.value else _user_site_id(current_user)
    return [StockLotView(**item) for item in platform_state.list_stock_lots(site_id)]


@app.post("/depot/stock-temperatures", response_model=StockTemperatureView)
def stock_temperature(payload: StockTemperatureCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> StockTemperatureView:
    return StockTemperatureView(**platform_state.record_stock_temperature(current_user["email"], payload))


@app.get("/depot/stock-temperatures", response_model=list[StockTemperatureView])
def list_stock_temperatures(lot_id: str | None = None, current_user: dict = Depends(require_roles(Role.DEPOT, Role.ADMIN))) -> list[StockTemperatureView]:
    return [StockTemperatureView(**item) for item in platform_state.list_stock_temperature_logs(lot_id)]


@app.post("/depot/classifications", response_model=DepotClassificationView)
def classify(payload: DepotClassificationCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> DepotClassificationView:
    classification = platform_state.classify_lot(
        actor_email=current_user["email"],
        lot_id=payload.lot_id,
        classification=payload.classification,
        vm_percent=payload.vm_percent,
        fiber_state=payload.fiber_state,
        color=payload.color,
    )
    return DepotClassificationView(**classification)


@app.patch("/depot/classifications/{lot_id}", response_model=DepotClassificationView)
def update_classification(lot_id: str, payload: DepotClassificationUpdate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> DepotClassificationView:
    return DepotClassificationView(**platform_state.update_classification(lot_id, payload, current_user["email"]))


@app.post("/depot/laundry-shipments", response_model=BdcRecord)
def create_laundry_shipment(payload: ShipmentCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> BdcRecord:
    shipment = platform_state.create_shipment(
        actor_email=current_user["email"],
        lot_ids=payload.lot_ids,
        humidity_pct=payload.humidity_pct,
        laundry_name=payload.laundry_name,
        transporteur_email=str(payload.transporteur_email),
        destination_email=str(payload.destination_email),
        expected_delivery_at=payload.expected_delivery_at,
        kind="laundry",
        source_stage="depot",
        destination_stage="laundry",
        destination_site_id=payload.destination_site_id,
        qr_payload=payload.qr_payload,
    )
    return BdcRecord(**shipment)


@app.get("/laverie/incoming-bdcs", response_model=list[BdcRecord])
def incoming_laundry_bdcs(current_user: dict = Depends(require_roles(Role.LAUNDRY, Role.ADMIN))) -> list[BdcRecord]:
    site_id = None if current_user["role"] == Role.ADMIN.value else _user_site_id(current_user)
    return [BdcRecord(**item) for item in platform_state.list_open_bdcs("laundry", site_id)]


@app.post("/laverie/receipts", response_model=LaundryReceiptView)
def receive_laundry_shipment(payload: LaundryReceiptCreate, current_user: dict = Depends(require_roles(Role.LAUNDRY))) -> LaundryReceiptView:
    return LaundryReceiptView(**platform_state.receive_laundry_shipment(current_user["email"], payload))


@app.post("/laverie/wash-runs", response_model=WashRunView)
def create_wash_run(payload: WashRunCreate, current_user: dict = Depends(require_roles(Role.LAUNDRY))) -> WashRunView:
    return WashRunView(**platform_state.create_wash_run(current_user["email"], payload))


@app.patch("/laverie/wash-runs/{bdc_id}", response_model=WashRunView)
def update_wash_run(bdc_id: str, payload: WashRunUpdate, current_user: dict = Depends(require_roles(Role.LAUNDRY))) -> WashRunView:
    return WashRunView(**platform_state.update_wash_run(bdc_id, payload, current_user["email"]))


@app.post("/laverie/outputs", response_model=LaundryOutputView)
def laundry_output(payload: LaundryOutputCreate, current_user: dict = Depends(require_roles(Role.LAUNDRY))) -> LaundryOutputView:
    return LaundryOutputView(**platform_state.record_laundry_output(current_user["email"], payload))


@app.get("/laverie/certificates/{certificate_id}", response_model=PurityCertificateView)
def certificate_detail(certificate_id: str, current_user: dict = Depends(require_roles(Role.LAUNDRY, Role.ADMIN, Role.T1, Role.T2))) -> PurityCertificateView:
    return PurityCertificateView(**platform_state.get_purity_certificate(certificate_id))


@app.get("/transformer/incoming-bdcs", response_model=list[BdcRecord])
def incoming_transformer_bdcs(current_user: dict = Depends(require_roles(Role.T1, Role.T2, Role.ADMIN))) -> list[BdcRecord]:
    role = current_user["role"]
    site_id = None if role == Role.ADMIN.value else _user_site_id(current_user)
    all_bdcs = [BdcRecord(**item) for item in platform_state.list_open_bdcs("transformer", site_id)]
    if role == Role.T1.value:
        return [item for item in all_bdcs if item.destination_stage == "t1"]
    if role == Role.T2.value:
        return [item for item in all_bdcs if item.destination_stage == "t2"]
    return all_bdcs


@app.post("/transformer/receipts", response_model=TransformerReceiptView)
def transformer_receipt(
    payload: TransformerReceiptCreate,
    current_user: dict = Depends(require_roles(Role.T1, Role.T2)),
) -> TransformerReceiptView:
    shipment = platform_state.get_bdc(payload.bdc_id)
    if current_user["role"] == Role.T1.value and shipment["destination_stage"] != "t1":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="T1 cannot receive a T2 shipment")
    if current_user["role"] == Role.T2.value and shipment["destination_stage"] != "t2":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="T2 cannot receive a T1 shipment")
    return TransformerReceiptView(**platform_state.receive_transformer_shipment(current_user["email"], payload))


@app.post("/transformer/t1-productions", response_model=T1ProductionView)
def t1_production(payload: T1ProductionCreate, current_user: dict = Depends(require_roles(Role.T1))) -> T1ProductionView:
    return T1ProductionView(**platform_state.create_t1_production(current_user["email"], payload))


@app.post("/transformer/t2-receptions", response_model=T2ReceptionView)
def t2_reception(payload: T2ReceptionCreate, current_user: dict = Depends(require_roles(Role.T2))) -> T2ReceptionView:
    return T2ReceptionView(**platform_state.create_t2_reception(current_user["email"], payload))


@app.get("/bdcs", response_model=list[BdcRecord])
def list_bdcs(current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> list[BdcRecord]:
    site_id = None if current_user["role"] == Role.ADMIN.value else _user_site_id(current_user)
    return [BdcRecord(**item) for item in platform_state.list_shipments(site_id)]


@app.get("/bdcs/open", response_model=list[BdcRecord])
def list_open_bdcs(current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> list[BdcRecord]:
    site_id = None if current_user["role"] == Role.ADMIN.value else _user_site_id(current_user)
    return [BdcRecord(**item) for item in platform_state.list_open_bdcs(site_id=site_id)]


@app.get("/bdc/{bdc_id}", response_model=BdcRecord)
def get_bdc(bdc_id: str, current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> BdcRecord:
    return BdcRecord(**platform_state.get_bdc(bdc_id))


@app.get("/lots/{lot_id}")
def lot_detail(lot_id: str, current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> dict:
    return platform_state.get_lot_detail(lot_id)


@app.get("/lots/{lot_id}/traceability", response_model=list[TraceabilityEvent])
def lot_traceability(lot_id: str, current_user: dict = Depends(require_roles(Role.DEPOT, Role.LAUNDRY, Role.T1, Role.T2, Role.ADMIN))) -> list[TraceabilityEvent]:
    return [TraceabilityEvent(**event) for event in platform_state.get_lot_traceability(lot_id)]


@app.post("/shipments", response_model=BdcRecord)
def backward_compatible_shipment(payload: ShipmentCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> BdcRecord:
    shipment = platform_state.create_shipment(
        actor_email=current_user["email"],
        lot_ids=payload.lot_ids,
        humidity_pct=payload.humidity_pct,
        laundry_name=payload.laundry_name,
        transporteur_email=str(payload.transporteur_email),
        destination_email=str(payload.destination_email),
        expected_delivery_at=payload.expected_delivery_at,
        kind="laundry",
        source_stage="depot",
        destination_stage="laundry",
    )
    return BdcRecord(**shipment)
