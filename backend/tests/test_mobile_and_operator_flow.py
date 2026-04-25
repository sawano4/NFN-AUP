from datetime import datetime, timedelta, timezone


def test_mobile_to_depot_flow_creates_alerts_and_bdc(client, tokens):
    bootstrap = client.get(
        "/mobile/bootstrap",
        headers={"Authorization": f"Bearer {tokens['agent']}"},
    )
    assert bootstrap.status_code == 200
    reserved_lot_id = bootstrap.json()["reserved_lot_ids"][0]

    sync = client.post(
        "/mobile/sync/batch",
        headers={"Authorization": f"Bearer {tokens['agent']}"},
        json={
            "jobs": [
                {
                    "client_job_id": "job-1",
                    "job_type": "lot_collected",
                    "occurred_at": datetime.now(timezone.utc).isoformat(),
                    "payload": {
                        "lot_id": reserved_lot_id,
                        "source_id": "SRC-2026-001",
                        "source_name": "Ferme Ouled Djellal",
                        "observed_weight_kg": 80,
                        "estimated_weight_kg": 100,
                        "cleanliness": "paille",
                        "gps": {"lat": 34.154, "lng": 3.503},
                    },
                }
            ]
        },
    )
    assert sync.status_code == 200
    assert reserved_lot_id in sync.json()["generated_lot_ids"]

    receipt = client.post(
        "/operator/depot/receipts",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_id": reserved_lot_id,
            "received_weight_kg": 70,
            "storage_zone": "A1",
            "arrival_condition": "humide",
            "discrepancy_reason": "Lot humide a l'arrivee",
        },
    )
    assert receipt.status_code == 200

    classify = client.post(
        "/operator/depot/classifications",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_id": reserved_lot_id,
            "classification": "Classe A",
            "vm_percent": 4.5,
            "fiber_state": "long",
            "color": "blanc",
        },
    )
    assert classify.status_code == 200

    shipment = client.post(
        "/operator/shipments",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_ids": [reserved_lot_id],
            "humidity_pct": 14,
            "laundry_name": "Laverie Demo",
            "transporteur_email": "transport@example.com",
            "destination_email": "laverie@example.com",
            "expected_delivery_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(),
        },
    )
    assert shipment.status_code == 200
    bdc_id = shipment.json()["bdc_id"]

    alerts = client.get(
        "/admin/alerts",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert alerts.status_code == 200
    alert_types = {alert["alert_type"] for alert in alerts.json()}
    assert "estimate_gap" in alert_types
    assert "receipt_gap" in alert_types
    assert "bdc_overdue" in alert_types

    traceability = client.get(
        f"/admin/lots/{reserved_lot_id}/traceability",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert traceability.status_code == 200
    event_types = [event["event_type"] for event in traceability.json()]
    assert event_types == ["lot.collected", "depot.lot_received", "depot.lot_classified"]

    bdc = client.get(
        f"/operator/bdc/{bdc_id}",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
    )
    assert bdc.status_code == 200
    assert bdc.json()["pdf_url"].endswith(".pdf")


def test_seed_data_covers_all_alert_types(client, tokens):
    alerts = client.get(
        "/admin/alerts",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert alerts.status_code == 200

    alert_types = {alert["alert_type"] for alert in alerts.json()}
    assert {
        "estimate_gap",
        "receipt_gap",
        "bdc_overdue",
        "depot_overdue",
        "laverie_overdue",
        "laverie_transit_gap",
        "transformateur_transit_gap",
    }.issubset(alert_types)
