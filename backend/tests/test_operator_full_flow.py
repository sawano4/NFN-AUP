from datetime import datetime, timedelta, timezone

from backend.packages.nfn_shared.platform_state import platform_state


def _collect_lot(client, agent_token: str, lot_id: str, source_id: str = "SRC-2026-001", observed_weight_kg: float = 90.0) -> str:
    sync = client.post(
        "/mobile/sync/batch",
        headers={"Authorization": f"Bearer {agent_token}"},
        json={
            "jobs": [
                {
                    "client_job_id": f"job-{lot_id}",
                    "job_type": "lot_collected",
                    "occurred_at": datetime.now(timezone.utc).isoformat(),
                    "payload": {
                        "lot_id": lot_id,
                        "source_id": source_id,
                        "source_name": "Ferme Ouled Djellal",
                        "observed_weight_kg": observed_weight_kg,
                        "estimated_weight_kg": observed_weight_kg,
                        "cleanliness": "propre",
                        "gps": {"lat": 34.154, "lng": 3.503},
                    },
                }
            ]
        },
    )
    assert sync.status_code == 200
    return lot_id


def test_operator_full_flow_t1(client, tokens):
    bootstrap = client.get("/mobile/bootstrap", headers={"Authorization": f"Bearer {tokens['agent']}"})
    lot_id = bootstrap.json()["reserved_lot_ids"][0]
    _collect_lot(client, tokens["agent"], lot_id)

    receipt = client.post(
        "/operator/depot/receipts",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_id": lot_id,
            "received_weight_kg": 89.0,
            "storage_zone": "A1",
            "arrival_condition": "correct",
            "discrepancy_reason": None,
        },
    )
    assert receipt.status_code == 200

    classification = client.post(
        "/operator/depot/classifications",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_id": lot_id,
            "classification": "Classe A",
            "vm_percent": 3.0,
            "fiber_state": "long",
            "color": "blanc",
        },
    )
    assert classification.status_code == 200

    shipment = client.post(
        "/operator/depot/laundry-shipments",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_ids": [lot_id],
            "humidity_pct": 13.5,
            "laundry_name": "Laverie Centre",
            "transporteur_email": "transport@example.com",
            "destination_email": "laundry@example.com",
            "expected_delivery_at": (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat(),
        },
    )
    assert shipment.status_code == 200
    laundry_bdc = shipment.json()["bdc_id"]

    laundry_receipt = client.post(
        "/operator/laverie/receipts",
        headers={"Authorization": f"Bearer {tokens['laundry']}"},
        json={
            "bdc_id": laundry_bdc,
            "received_weight_kg": 88.0,
            "discrepancy_reason": None,
        },
    )
    assert laundry_receipt.status_code == 200

    wash_run = client.post(
        "/operator/laverie/wash-runs",
        headers={"Authorization": f"Bearer {tokens['laundry']}"},
        json={
            "bdc_id": laundry_bdc,
            "water_temperature_c": 47.0,
            "detergent": "standard",
            "duration_minutes": 75,
            "target_transformer": "T1",
            "override_reason": None,
        },
    )
    assert wash_run.status_code == 200

    output = client.post(
        "/operator/laverie/outputs",
        headers={"Authorization": f"Bearer {tokens['laundry']}"},
        json={
            "bdc_id": laundry_bdc,
            "dry_weight_kg": 55.0,
            "waste_weight_kg": 15.0,
            "water_loss_kg": 18.0,
            "residual_humidity_pct": 13.0,
            "residual_suint_pct": 0.8,
            "ph": 7.0,
            "grade": 2,
            "notes": "Batch T1",
            "transporteur_email": "transport2@example.com",
            "destination_email": "t1@example.com",
            "expected_delivery_at": (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat(),
        },
    )
    assert output.status_code == 200
    transformer_bdc = output.json()["transformer_bdc_id"]
    certificate_id = output.json()["certificate_id"]

    certificate = client.get(
        f"/operator/laverie/certificates/{certificate_id}",
        headers={"Authorization": f"Bearer {tokens['laundry']}"},
    )
    assert certificate.status_code == 200

    transformer_receipt = client.post(
        "/operator/transformer/receipts",
        headers={"Authorization": f"Bearer {tokens['t1']}"},
        json={
            "bdc_id": transformer_bdc,
            "received_weight_kg": 55.0,
            "price_da_per_kg": 250.0,
            "discrepancy_reason": None,
        },
    )
    assert transformer_receipt.status_code == 200

    t1 = client.post(
        "/operator/transformer/t1-productions",
        headers={"Authorization": f"Bearer {tokens['t1']}"},
        json={
            "bdc_id": transformer_bdc,
            "flow_destination": "A1",
            "anti_mite": "sel de bore",
            "binding_fiber_pct": 8.0,
            "fire_retardant": "standard",
            "target_density_kg_m3": 35.0,
            "target_thickness_mm": 50.0,
        },
    )
    assert t1.status_code == 200
    assert t1.json()["final_lot_id"].startswith("FINAL-T1-")

    lot_detail = client.get(
        f"/operator/lots/{lot_id}",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert lot_detail.status_code == 200
    assert lot_detail.json()["status"] == "delivered"

    traceability = client.get(
        f"/operator/lots/{lot_id}/traceability",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert traceability.status_code == 200
    event_types = [event["event_type"] for event in traceability.json()]
    assert "depot.lot_received" in event_types
    assert "laundry.output_recorded" in event_types
    assert "transformer.t1_production_recorded" in event_types


def test_operator_full_flow_t2_and_rbac(client, tokens):
    bootstrap = client.get("/mobile/bootstrap", headers={"Authorization": f"Bearer {tokens['agent']}"})
    lot_id = bootstrap.json()["reserved_lot_ids"][1]
    _collect_lot(client, tokens["agent"], lot_id, source_id="SRC-2026-002", observed_weight_kg=60.0)

    client.post(
        "/operator/depot/receipts",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"lot_id": lot_id, "received_weight_kg": 60.0, "storage_zone": "B1", "arrival_condition": "correct", "discrepancy_reason": None},
    )
    client.post(
        "/operator/depot/classifications",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"lot_id": lot_id, "classification": "Classe B", "vm_percent": 8.0, "fiber_state": "court", "color": "beige"},
    )
    shipment = client.post(
        "/operator/depot/laundry-shipments",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_ids": [lot_id],
            "humidity_pct": 14.0,
            "laundry_name": "Laverie Centre",
            "transporteur_email": "transport@example.com",
            "destination_email": "laundry@example.com",
            "expected_delivery_at": (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat(),
        },
    )
    laundry_bdc = shipment.json()["bdc_id"]
    client.post(
        "/operator/laverie/receipts",
        headers={"Authorization": f"Bearer {tokens['laundry']}"},
        json={"bdc_id": laundry_bdc, "received_weight_kg": 59.0, "discrepancy_reason": None},
    )
    client.post(
        "/operator/laverie/wash-runs",
        headers={"Authorization": f"Bearer {tokens['laundry']}"},
        json={
            "bdc_id": laundry_bdc,
            "water_temperature_c": 45.0,
            "detergent": "soft",
            "duration_minutes": 60,
            "target_transformer": "T2",
            "override_reason": "grade low",
        },
    )
    output = client.post(
        "/operator/laverie/outputs",
        headers={"Authorization": f"Bearer {tokens['laundry']}"},
        json={
            "bdc_id": laundry_bdc,
            "dry_weight_kg": 25.0,
            "waste_weight_kg": 18.0,
            "water_loss_kg": 16.0,
            "residual_humidity_pct": 12.5,
            "residual_suint_pct": 0.9,
            "ph": 6.8,
            "grade": 5,
            "notes": "Batch T2",
            "transporteur_email": "transport2@example.com",
            "destination_email": "t2@example.com",
            "expected_delivery_at": (datetime.now(timezone.utc) + timedelta(hours=12)).isoformat(),
        },
    )
    transformer_bdc = output.json()["transformer_bdc_id"]

    forbidden = client.post(
        "/operator/transformer/receipts",
        headers={"Authorization": f"Bearer {tokens['t1']}"},
        json={"bdc_id": transformer_bdc, "received_weight_kg": 25.0, "price_da_per_kg": 120.0, "discrepancy_reason": None},
    )
    assert forbidden.status_code == 403

    receipt = client.post(
        "/operator/transformer/receipts",
        headers={"Authorization": f"Bearer {tokens['t2']}"},
        json={"bdc_id": transformer_bdc, "received_weight_kg": 25.0, "price_da_per_kg": 120.0, "discrepancy_reason": None},
    )
    assert receipt.status_code == 200

    t2 = client.post(
        "/operator/transformer/t2-receptions",
        headers={"Authorization": f"Bearer {tokens['t2']}"},
        json={"bdc_id": transformer_bdc, "dryness_ok": True, "foreign_bodies_ok": True, "unloading_mode": "vrac"},
    )
    assert t2.status_code == 200
    assert t2.json()["final_lot_id"].startswith("FINAL-T2-")

    alerts = client.get("/admin/alerts", headers={"Authorization": f"Bearer {tokens['admin']}"})
    assert alerts.status_code == 200
    alert_types = {alert["alert_type"] for alert in alerts.json()}
    assert "laundry_yield_low" in alert_types


def test_operator_corrections_and_temperature_alert(client, tokens):
    bootstrap = client.get("/mobile/bootstrap", headers={"Authorization": f"Bearer {tokens['agent']}"})
    lot_id = bootstrap.json()["reserved_lot_ids"][2]
    _collect_lot(client, tokens["agent"], lot_id, observed_weight_kg=70.0)

    client.post(
        "/operator/depot/receipts",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"lot_id": lot_id, "received_weight_kg": 70.0, "storage_zone": "C1", "arrival_condition": "humide", "discrepancy_reason": None},
    )
    missing_reason = client.patch(
        f"/operator/depot/receipts/{lot_id}",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"storage_zone": "C2"},
    )
    assert missing_reason.status_code == 400

    corrected = client.patch(
        f"/operator/depot/receipts/{lot_id}",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"storage_zone": "C2", "correction_reason": "re-slotting after inspection"},
    )
    assert corrected.status_code == 200
    assert corrected.json()["storage_zone"] == "C2"

    temperature = client.post(
        "/operator/depot/stock-temperatures",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"lot_id": lot_id, "temperature_c": 49.0, "note": "hot spot"},
    )
    assert temperature.status_code == 200

    alerts = client.get("/admin/alerts", headers={"Authorization": f"Bearer {tokens['admin']}"})
    assert alerts.status_code == 200
    alert_types = {alert["alert_type"] for alert in alerts.json()}
    assert "stock_temperature" in alert_types


def test_operator_sites_qr_depot_lot_and_csv_report(client, tokens):
    site = client.post(
        "/operator/admin/sites",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={
            "name": "Laverie Test Nord",
            "site_type": "laverie",
            "wilaya": "Tiaret",
            "commune": "Sougueur",
            "address": "Unite test",
            "contact_email": "laundry.nord@example.com",
            "active": True,
        },
    )
    assert site.status_code == 200
    site_id = site.json()["site_id"]

    user = client.post(
        "/operator/admin/users",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={
            "name": "Laverie Nord",
            "email": "laundry.nord@example.com",
            "role": "responsable_laverie",
            "password": "laundry-nord123",
            "site_id": site_id,
        },
    )
    assert user.status_code == 200
    nord_token = client.post("/auth/login", json={"email": "laundry.nord@example.com", "password": "laundry-nord123"}).json()["access_token"]

    lot = client.post(
        "/operator/depot/lots",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "source_id": "SRC-2026-001",
            "source_name": "Ferme Ouled Djellal",
            "observed_weight_kg": 82.0,
            "estimated_weight_kg": 85.0,
            "wool_origin": "tonte",
            "wool_type": "toison entiere",
            "cleanliness": "paille",
            "cleanliness_score": 2,
            "cleanliness_notes": ["paille", "foin"],
            "sheep_race": "Ouled Djellal",
            "humidity_pct": 14.0,
            "packaging_count": 6,
            "packaging_type": "PP",
            "staple_length_mm": 65.0,
            "jarre_pct": 2.0,
        },
    )
    assert lot.status_code == 200
    lot_id = lot.json()["lot_id"]
    assert lot.json()["qr_payload"]

    scan = client.post(
        "/operator/qr/scan",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"qr_payload": lot.json()["qr_payload"], "expected_ref_id": lot_id},
    )
    assert scan.status_code == 200
    assert scan.json()["valid"] is True

    client.post(
        "/operator/depot/receipts",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"lot_id": lot_id, "received_weight_kg": 82.0, "storage_zone": "A1", "arrival_condition": "correct"},
    )
    client.post(
        "/operator/depot/classifications",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"lot_id": lot_id, "classification": "Classe A", "vm_percent": 3.0, "fiber_state": "long", "color": "blanc"},
    )
    shipment = client.post(
        "/operator/depot/laundry-shipments",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "lot_ids": [lot_id],
            "humidity_pct": 14.0,
            "laundry_name": "Laverie Test Nord",
            "transporteur_email": "transport@example.com",
            "destination_email": "laundry.nord@example.com",
            "destination_site_id": site_id,
            "expected_delivery_at": (datetime.now(timezone.utc) + timedelta(hours=8)).isoformat(),
        },
    )
    assert shipment.status_code == 200
    assert shipment.json()["destination_site_id"] == site_id
    assert shipment.json()["qr_payload"]

    incoming_main = client.get("/operator/laverie/incoming-bdcs", headers={"Authorization": f"Bearer {tokens['laundry']}"})
    assert all(item["destination_site_id"] != site_id for item in incoming_main.json())
    incoming_nord = client.get("/operator/laverie/incoming-bdcs", headers={"Authorization": f"Bearer {nord_token}"})
    assert [item["bdc_id"] for item in incoming_nord.json()] == [shipment.json()["bdc_id"]]

    report = client.get("/operator/reports/depot.csv", headers={"Authorization": f"Bearer {tokens['depot']}"})
    assert report.status_code == 200
    assert "integrity_hash" in report.text
    assert lot_id in report.text


def test_operator_policies_create_capacity_and_sla_alerts(client, tokens):
    policy = client.patch(
        "/operator/admin/policies",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={"depot_max_storage_kg": 40.0, "lot_transformation_sla_hours": 1},
    )
    assert policy.status_code == 200

    lot = client.post(
        "/operator/depot/lots",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={
            "source_id": "SRC-2026-001",
            "source_name": "Ferme Ouled Djellal",
            "observed_weight_kg": 82.0,
            "estimated_weight_kg": 82.0,
            "wool_origin": "tonte",
        },
    )
    assert lot.status_code == 200
    lot_id = lot.json()["lot_id"]
    client.post(
        "/operator/depot/receipts",
        headers={"Authorization": f"Bearer {tokens['depot']}"},
        json={"lot_id": lot_id, "received_weight_kg": 82.0, "storage_zone": "A1", "arrival_condition": "correct"},
    )
    platform_state.lots[lot_id]["created_at"] = datetime.now(timezone.utc) - timedelta(hours=2)

    status_response = client.get("/operator/policies", headers={"Authorization": f"Bearer {tokens['depot']}"})
    assert status_response.status_code == 200
    policy_status = status_response.json()
    assert policy_status["depot_capacity"][0]["breached"] is True
    assert policy_status["overdue_lots"][0]["lot_id"] == lot_id

    alerts = client.get("/admin/alerts", headers={"Authorization": f"Bearer {tokens['admin']}"})
    assert alerts.status_code == 200
    alert_types = {alert["alert_type"] for alert in alerts.json()}
    assert "depot_capacity_exceeded" in alert_types
    assert "lot_transformation_sla_exceeded" in alert_types

    report = client.get("/operator/reports/depot.csv", headers={"Authorization": f"Bearer {tokens['depot']}"})
    assert report.status_code == 200
    assert "sla_breached" in report.text
    assert "True" in report.text
