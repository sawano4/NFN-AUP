from fastapi import Depends, FastAPI

from backend.packages.nfn_shared.auth import require_roles
from backend.packages.nfn_shared.contracts import BdcRecord, DepotClassificationCreate, DepotReceiptCreate, ShipmentCreate
from backend.packages.nfn_shared.enums import Role
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="operator-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "operator-service"}


@app.post("/depot/receipts")
def create_receipt(payload: DepotReceiptCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> dict:
    return platform_state.create_receipt(
        actor_email=current_user["email"],
        lot_id=payload.lot_id,
        received_weight_kg=payload.received_weight_kg,
        storage_zone=payload.storage_zone,
        arrival_condition=payload.arrival_condition,
        discrepancy_reason=payload.discrepancy_reason,
    )


@app.post("/depot/classifications")
def classify(payload: DepotClassificationCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> dict:
    return platform_state.classify_lot(
        actor_email=current_user["email"],
        lot_id=payload.lot_id,
        classification=payload.classification,
        vm_percent=payload.vm_percent,
        fiber_state=payload.fiber_state,
        color=payload.color,
    )


@app.post("/shipments", response_model=BdcRecord)
def create_shipment(payload: ShipmentCreate, current_user: dict = Depends(require_roles(Role.DEPOT))) -> BdcRecord:
    shipment = platform_state.create_shipment(
        actor_email=current_user["email"],
        lot_ids=payload.lot_ids,
        humidity_pct=payload.humidity_pct,
        laundry_name=payload.laundry_name,
        transporteur_email=str(payload.transporteur_email),
        destination_email=str(payload.destination_email),
        expected_delivery_at=payload.expected_delivery_at,
    )
    return BdcRecord(**shipment)


@app.get("/bdc/{bdc_id}", response_model=BdcRecord)
def get_bdc(bdc_id: str, current_user: dict = Depends(require_roles(Role.DEPOT, Role.ADMIN))) -> BdcRecord:
    return BdcRecord(**platform_state.get_bdc(bdc_id))

