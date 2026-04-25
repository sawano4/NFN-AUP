from fastapi import Depends, FastAPI

from backend.packages.nfn_shared.auth import require_roles
from backend.packages.nfn_shared.contracts import AlertRecord, ThresholdConfig, ThresholdUpdate
from backend.packages.nfn_shared.enums import Role
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="alert-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "alert-service"}


@app.get("/rules")
def rules(current_user: dict = Depends(require_roles(Role.ADMIN))) -> dict:
    return platform_state.policy_status()


@app.patch("/rules", response_model=ThresholdConfig)
def update_rules(payload: ThresholdUpdate, current_user: dict = Depends(require_roles(Role.ADMIN))) -> ThresholdConfig:
    return ThresholdConfig(**platform_state.update_thresholds(payload))


@app.get("/alerts", response_model=list[AlertRecord])
def list_alerts(current_user: dict = Depends(require_roles(Role.ADMIN))) -> list[AlertRecord]:
    return [AlertRecord(**alert) for alert in platform_state.list_alerts()]
