from __future__ import annotations

import json
import logging
import os
import threading
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from backend.packages.nfn_shared.auth import require_roles
from backend.packages.nfn_shared.contracts import (
    AlertCreate,
    AlertRecord,
    AlertUpdate,
    ChatRequest,
    ChatResponse,
    DashboardSummary,
    DepotClassificationUpdate,
    DepotReceiptUpdate,
    DepotSiteCreate,
    DepotSiteUpdate,
    DepotSiteView,
    DocumentCreate,
    DocumentUpdate,
    FieldExceptionUpdate,
    LaverieCreate,
    LaverieUpdate,
    LaverieView,
    LotChainDepotDepartureRecord,
    LotChainDepotRecord,
    LotChainLaverieRecord,
    LotChainLaverieDoneRecord,
    LotChainTransformateurDoneRecord,
    LotChainTransformateurRecord,
    LotChainView,
    LotCreate,
    LotUpdate,
    ResolveAlertRequest,
    SourceApprovalRequest,
    SourceRegistrationCreate,
    SourceRegistrationUpdate,
    SourceRegistrationView,
    SourceRejectionRequest,
    ThresholdConfig,
    ThresholdUpdate,
    TraceabilityEvent,
    TransformateurCreate,
    TransformateurUpdate,
    TransformateurView,
    UserCreate,
    UserProfile,
    UserUpdate,
)
from backend.packages.nfn_shared.enums import Role
from backend.packages.nfn_shared.platform_state import platform_state

logger = logging.getLogger(__name__)


def _alert_background_loop() -> None:
    """Daemon thread: periodically evaluate overdue-alert conditions."""
    while True:
        interval_min = float(platform_state.thresholds.get("alert_check_interval_minutes", 5))
        time.sleep(max(interval_min * 60, 30))          # minimum 30 s to avoid hammering
        try:
            platform_state.refresh_overdue_alerts()
            platform_state._last_alert_check_at = datetime.now(timezone.utc)
            logger.info("Auto-alert check completed.")
        except Exception:
            logger.exception("Error during automatic alert check.")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    t = threading.Thread(target=_alert_background_loop, daemon=True, name="alert-check")
    t.start()
    logger.info("Background alert-check thread started (interval: %s min).",
                platform_state.thresholds.get("alert_check_interval_minutes", 5))
    yield
    # daemon thread stops automatically when the process exits


app = FastAPI(title="admin-service", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_admin = Depends(require_roles(Role.ADMIN))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "admin-service"}


@app.post("/reset-demo", status_code=status.HTTP_200_OK)
def reset_demo_data(current_user: dict = _admin) -> dict[str, str]:
    """Wipe all state and reload demo seed data (lots, sources, infrastructure).
    Use this when the dashboard is blank because the DB held stale/empty state."""
    platform_state.reset_to_seed()
    return {"message": "Données de démonstration rechargées avec succès."}


# ── Dashboard ──────────────────────────────────────────────────────────────

@app.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(current_user: dict = _admin) -> DashboardSummary:
    return DashboardSummary(**platform_state.dashboard_summary())


# ── Users ──────────────────────────────────────────────────────────────────

@app.get("/users", response_model=list[UserProfile])
def list_users(current_user: dict = _admin) -> list[UserProfile]:
    return [UserProfile(**u) for u in platform_state.list_users()]


@app.post("/users", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, current_user: dict = _admin) -> UserProfile:
    return UserProfile(**platform_state.create_user(payload))


@app.put("/users/{user_id}", response_model=UserProfile)
def update_user(user_id: str, payload: UserUpdate, current_user: dict = _admin) -> UserProfile:
    return UserProfile(**platform_state.update_user(user_id, payload))


@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_user(user_id)


# ── Sources ────────────────────────────────────────────────────────────────

@app.get("/sources", response_model=list[SourceRegistrationView])
def list_sources(current_user: dict = _admin) -> list[SourceRegistrationView]:
    return [SourceRegistrationView(**s) for s in platform_state.list_sources()]


@app.get("/sources/pending", response_model=list[SourceRegistrationView])
def pending_sources(current_user: dict = _admin) -> list[SourceRegistrationView]:
    return [SourceRegistrationView(**s) for s in platform_state.list_pending_sources()]


@app.post("/sources", response_model=SourceRegistrationView, status_code=status.HTTP_201_CREATED)
def create_source(payload: SourceRegistrationCreate, current_user: dict = _admin) -> SourceRegistrationView:
    return SourceRegistrationView(**platform_state.create_source_registration(payload, require_verified=False, actor=current_user["email"]))


@app.put("/sources/{public_id}", response_model=SourceRegistrationView)
def update_source(public_id: str, payload: SourceRegistrationUpdate, current_user: dict = _admin) -> SourceRegistrationView:
    return SourceRegistrationView(**platform_state.update_source(public_id, payload, actor=current_user["email"]))


@app.delete("/sources/{public_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_source(public_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_source(public_id)


@app.post("/sources/{public_id}/approve", response_model=SourceRegistrationView)
def approve_source(public_id: str, payload: SourceApprovalRequest, current_user: dict = _admin) -> SourceRegistrationView:
    return SourceRegistrationView(**platform_state.approve_source(public_id, current_user["email"], payload.comment))


@app.post("/sources/{public_id}/reject", response_model=SourceRegistrationView)
def reject_source(public_id: str, payload: SourceRejectionRequest, current_user: dict = _admin) -> SourceRegistrationView:
    return SourceRegistrationView(**platform_state.reject_source(public_id, current_user["email"], payload.reason))


# ── Lots ───────────────────────────────────────────────────────────────────

@app.get("/lots", response_model=list[dict])
def list_lots(current_user: dict = _admin) -> list[dict]:
    return platform_state.list_lots_for_admin()


@app.post("/lots", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_lot(payload: LotCreate, current_user: dict = _admin) -> dict:
    return platform_state.create_lot(payload, actor_email=current_user["email"])


@app.put("/lots/{lot_id}", response_model=dict)
def update_lot(lot_id: str, payload: LotUpdate, current_user: dict = _admin) -> dict:
    return platform_state.update_lot(lot_id, payload, actor_email=current_user["email"])


@app.delete("/lots/{lot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lot(lot_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_lot(lot_id)


@app.get("/lots/{lot_id}/traceability", response_model=list[TraceabilityEvent])
def lot_traceability(lot_id: str, current_user: dict = _admin) -> list[TraceabilityEvent]:
    return [TraceabilityEvent(**e) for e in platform_state.get_lot_traceability(lot_id)]


# ── Lot Chain ──────────────────────────────────────────────────────────────────

@app.get("/lots/{lot_id}/chain", response_model=LotChainView)
def get_lot_chain(lot_id: str, current_user: dict = _admin) -> LotChainView:
    return LotChainView(**platform_state.get_lot_chain(lot_id))


@app.post("/lots/{lot_id}/chain/depot-arrival", response_model=LotChainView)
def chain_depot_arrival(lot_id: str, payload: LotChainDepotRecord, current_user: dict = _admin) -> LotChainView:
    return LotChainView(**platform_state.record_depot_arrival(lot_id, payload, current_user["email"]))


@app.post("/lots/{lot_id}/chain/depot-departure", response_model=LotChainView)
def chain_depot_departure(lot_id: str, payload: LotChainDepotDepartureRecord, current_user: dict = _admin) -> LotChainView:
    return LotChainView(**platform_state.record_depot_departure(lot_id, payload, current_user["email"]))


@app.post("/lots/{lot_id}/chain/laverie-arrival", response_model=LotChainView)
def chain_laverie_arrival(lot_id: str, payload: LotChainLaverieRecord, current_user: dict = _admin) -> LotChainView:
    return LotChainView(**platform_state.record_laverie_arrival(lot_id, payload, current_user["email"]))


@app.post("/lots/{lot_id}/chain/laverie-done", response_model=LotChainView)
def chain_laverie_done(lot_id: str, payload: LotChainLaverieDoneRecord, current_user: dict = _admin) -> LotChainView:
    return LotChainView(**platform_state.record_laverie_done(lot_id, payload, current_user["email"]))


@app.post("/lots/{lot_id}/chain/transformateur-arrival", response_model=LotChainView)
def chain_transformateur_arrival(lot_id: str, payload: LotChainTransformateurRecord, current_user: dict = _admin) -> LotChainView:
    return LotChainView(**platform_state.record_transformateur_arrival(lot_id, payload, current_user["email"]))


@app.post("/lots/{lot_id}/chain/transformateur-done", response_model=LotChainView)
def chain_transformateur_done(lot_id: str, payload: LotChainTransformateurDoneRecord, current_user: dict = _admin) -> LotChainView:
    return LotChainView(**platform_state.record_transformateur_done(lot_id, payload, current_user["email"]))


# ── Alerts ─────────────────────────────────────────────────────────────────

@app.get("/alerts", response_model=list[AlertRecord])
def list_alerts(current_user: dict = _admin) -> list[AlertRecord]:
    platform_state.refresh_overdue_alerts()
    result = []
    for a in platform_state.list_alerts():
        try:
            result.append(AlertRecord(**a))
        except Exception:
            logger.exception("Skipping malformed alert during serialization: %s", a.get("alert_id"))
    return result


@app.post("/alerts", response_model=AlertRecord, status_code=status.HTTP_201_CREATED)
def create_alert(payload: AlertCreate, current_user: dict = _admin) -> AlertRecord:
    return AlertRecord(**platform_state.create_manual_alert(payload))


@app.put("/alerts/{alert_id}", response_model=AlertRecord)
def update_alert(alert_id: str, payload: AlertUpdate, current_user: dict = _admin) -> AlertRecord:
    return AlertRecord(**platform_state.update_alert(alert_id, payload))


@app.delete("/alerts/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_alert(alert_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_alert(alert_id)


@app.post("/alerts/{alert_id}/resolve", response_model=AlertRecord)
def resolve_alert(alert_id: str, payload: ResolveAlertRequest, current_user: dict = _admin) -> AlertRecord:
    return AlertRecord(**platform_state.resolve_alert(alert_id, payload.comment))


# ── Receipts ───────────────────────────────────────────────────────────────

@app.get("/receipts", response_model=list[dict])
def list_receipts(current_user: dict = _admin) -> list[dict]:
    return platform_state.list_receipts()


@app.put("/receipts/{lot_id}", response_model=dict)
def update_receipt(lot_id: str, payload: DepotReceiptUpdate, current_user: dict = _admin) -> dict:
    return platform_state.update_receipt(lot_id, payload, actor_email=current_user["email"])


@app.delete("/receipts/{lot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_receipt(lot_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_receipt(lot_id)


# ── Classifications ────────────────────────────────────────────────────────

@app.get("/classifications", response_model=list[dict])
def list_classifications(current_user: dict = _admin) -> list[dict]:
    return platform_state.list_classifications()


@app.put("/classifications/{lot_id}", response_model=dict)
def update_classification(lot_id: str, payload: DepotClassificationUpdate, current_user: dict = _admin) -> dict:
    return platform_state.update_classification(lot_id, payload, actor_email=current_user["email"])


@app.delete("/classifications/{lot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classification(lot_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_classification(lot_id)


# ── Shipments / BDC ────────────────────────────────────────────────────────

@app.get("/shipments", response_model=list[dict])
def list_shipments(current_user: dict = _admin) -> list[dict]:
    return platform_state.list_shipments()


@app.delete("/shipments/{bdc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shipment(bdc_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_shipment(bdc_id)


# ── Documents ──────────────────────────────────────────────────────────────

@app.get("/documents", response_model=list[dict])
def list_documents(current_user: dict = _admin) -> list[dict]:
    return platform_state.list_documents()


@app.post("/documents", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_document(payload: DocumentCreate, current_user: dict = _admin) -> dict:
    return platform_state.create_document(payload)


@app.put("/documents/{document_id}", response_model=dict)
def update_document(document_id: str, payload: DocumentUpdate, current_user: dict = _admin) -> dict:
    return platform_state.update_document(document_id, payload)


@app.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_document(document_id)


# ── Exceptions ─────────────────────────────────────────────────────────────

@app.get("/exceptions", response_model=list[dict])
def list_exceptions(current_user: dict = _admin) -> list[dict]:
    return platform_state.list_exceptions()


@app.put("/exceptions/{exception_id}", response_model=dict)
def update_exception(exception_id: str, payload: FieldExceptionUpdate, current_user: dict = _admin) -> dict:
    return platform_state.update_exception(exception_id, payload, actor_email=current_user["email"])


@app.delete("/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exception(exception_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_exception(exception_id)


# ── Thresholds ─────────────────────────────────────────────────────────────

@app.get("/thresholds", response_model=ThresholdConfig)
def get_thresholds(current_user: dict = _admin) -> ThresholdConfig:
    return ThresholdConfig(**platform_state.thresholds)


@app.put("/thresholds", response_model=ThresholdConfig)
def update_thresholds(payload: ThresholdUpdate, current_user: dict = _admin) -> ThresholdConfig:
    return ThresholdConfig(**platform_state.update_thresholds(payload))


# ── Notifications ──────────────────────────────────────────────────────────

@app.get("/notifications", response_model=list[dict])
def list_notifications(current_user: dict = _admin) -> list[dict]:
    return platform_state.list_emails()


# ── Depots ─────────────────────────────────────────────────────────────────────

@app.get("/depots", response_model=list[DepotSiteView])
def list_depots(current_user: dict = _admin) -> list[DepotSiteView]:
    return [DepotSiteView(**d) for d in platform_state.list_depots()]


@app.post("/depots", response_model=DepotSiteView, status_code=status.HTTP_201_CREATED)
def create_depot(payload: DepotSiteCreate, current_user: dict = _admin) -> DepotSiteView:
    return DepotSiteView(**platform_state.create_depot(payload))


@app.put("/depots/{depot_id}", response_model=DepotSiteView)
def update_depot(depot_id: str, payload: DepotSiteUpdate, current_user: dict = _admin) -> DepotSiteView:
    return DepotSiteView(**platform_state.update_depot(depot_id, payload))


@app.delete("/depots/{depot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_depot(depot_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_depot(depot_id)


# ── Laveries ───────────────────────────────────────────────────────────────────

@app.get("/laveries", response_model=list[LaverieView])
def list_laveries(current_user: dict = _admin) -> list[LaverieView]:
    return [LaverieView(**l) for l in platform_state.list_laveries()]


@app.post("/laveries", response_model=LaverieView, status_code=status.HTTP_201_CREATED)
def create_laverie(payload: LaverieCreate, current_user: dict = _admin) -> LaverieView:
    return LaverieView(**platform_state.create_laverie(payload))


@app.put("/laveries/{laverie_id}", response_model=LaverieView)
def update_laverie(laverie_id: str, payload: LaverieUpdate, current_user: dict = _admin) -> LaverieView:
    return LaverieView(**platform_state.update_laverie(laverie_id, payload))


@app.delete("/laveries/{laverie_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_laverie(laverie_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_laverie(laverie_id)


# ── Transformateurs ────────────────────────────────────────────────────────────

@app.get("/transformateurs", response_model=list[TransformateurView])
def list_transformateurs(current_user: dict = _admin) -> list[TransformateurView]:
    return [TransformateurView(**t) for t in platform_state.list_transformateurs()]


@app.post("/transformateurs", response_model=TransformateurView, status_code=status.HTTP_201_CREATED)
def create_transformateur(payload: TransformateurCreate, current_user: dict = _admin) -> TransformateurView:
    return TransformateurView(**platform_state.create_transformateur(payload))


@app.put("/transformateurs/{transformateur_id}", response_model=TransformateurView)
def update_transformateur(transformateur_id: str, payload: TransformateurUpdate, current_user: dict = _admin) -> TransformateurView:
    return TransformateurView(**platform_state.update_transformateur(transformateur_id, payload))


@app.delete("/transformateurs/{transformateur_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transformateur(transformateur_id: str, current_user: dict = _admin) -> None:
    platform_state.delete_transformateur(transformateur_id)


# ── KPI Chatbot (Mistral) ──────────────────────────────────────────────────────

def _build_kpi_context() -> str:
    """Snapshot the current platform state into a compact JSON string for the LLM.

    Reads state directly (no refresh_overdue_alerts call) to keep latency low —
    the background thread keeps alerts fresh anyway.
    """
    try:
        from collections import Counter
        # Access raw dicts directly — avoids triggering refresh_overdue_alerts()
        lots   = list(platform_state.lots.values())
        alerts = list(platform_state.alerts.values())
        active_alerts = [
            {
                "type":     str(a.get("alert_type", "")),
                "severity": str(a.get("severity", "")),
                "lot_id":   a.get("lot_id"),
                "message":  (a.get("message") or "")[:120],  # truncate for token budget
            }
            for a in alerts if not a.get("resolved_at")
        ][:8]

        ctx = {
            "kpis": {
                "lots_actifs":           len(lots),
                "alertes_non_traitees":  len(active_alerts),
                "sources_en_attente":    sum(1 for s in platform_state.sources.values()
                                             if s.get("status") == "pending"),
                "bdc_en_retard":         sum(1 for a in active_alerts if a["type"] == "bdc_overdue"),
            },
            "lots_par_statut": dict(Counter(str(l.get("status", "")) for l in lots)),
            "poids_total_kg":  round(sum(float(l.get("observed_weight_kg", 0)) for l in lots), 1),
            "alertes_actives": active_alerts,
            "nb_sources":      len(platform_state.sources),
            "nb_depots":       len(platform_state.depots),
            "nb_laveries":     len(platform_state.laveries),
            "nb_transformateurs": len(platform_state.transformateurs),
        }
        return json.dumps(ctx, ensure_ascii=False, default=str)
    except Exception:
        logger.exception("_build_kpi_context failed")
        return "{}"


@app.post("/chat", response_model=ChatResponse)
async def chat_kpi(payload: ChatRequest, current_user: dict = _admin) -> ChatResponse:
    """KPI assistant — async so the Mistral HTTP call doesn't block the server."""
    import httpx

    api_key = os.getenv("MISTRAL_API_KEY", "")
    if not api_key:
        return ChatResponse(reply=(
            "⚠️ La variable d'environnement **MISTRAL_API_KEY** n'est pas configurée. "
            "Ajoutez-la au service admin pour activer le chatbot."
        ))

    kpi_ctx = _build_kpi_context()

    system_prompt = (
        "Tu es un assistant expert en filière laine pour NFN (Numidian Fiber & Nature). "
        "Tu réponds en français, de façon concise (3-5 phrases max sauf si on te demande plus). "
        "Tu as accès aux données opérationnelles en temps réel ci-dessous (JSON). "
        "Utilise-les pour répondre aux questions sur les KPIs, lots, alertes et coûts. "
        "Si une info est absente des données, dis-le clairement.\n\n"
        f"=== DONNÉES TEMPS RÉEL ===\n{kpi_ctx}\n=========================="
    )

    messages = [{"role": "system", "content": system_prompt}]
    for turn in payload.history[-4:]:          # 4 turns max — smaller context = faster
        if turn.get("role") in {"user", "assistant"}:
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": payload.message})

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": "mistral-small-latest",
                    "messages": messages,
                    "max_tokens": 400,
                    "temperature": 0.2,
                },
            )
        resp.raise_for_status()
        reply = resp.json()["choices"][0]["message"]["content"]
    except httpx.TimeoutException:
        reply = "⏱️ Délai dépassé. Réessayez dans quelques secondes."
    except Exception as exc:
        logger.exception("Mistral API error")
        reply = f"❌ Erreur : {exc}"

    return ChatResponse(reply=reply)
