from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class Api:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def request(self, method: str, path: str, token: str | None = None, body: dict[str, Any] | None = None) -> Any:
        data = None if body is None else json.dumps(body).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        request = Request(f"{self.base_url}{path}", data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=20) as response:
                payload = response.read().decode("utf-8")
                if not payload:
                    return None
                content_type = response.headers.get("content-type", "")
                return json.loads(payload) if "json" in content_type else payload
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"{method} {path} failed: HTTP {exc.code} {detail}") from exc
        except URLError as exc:
            raise RuntimeError(f"Cannot reach {self.base_url}: {exc}") from exc

    def login(self, email: str, password: str) -> str:
        result = self.request("POST", "/auth/login", body={"email": email, "password": password})
        return result["access_token"]


def iso(hours: float = 0) -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat().replace("+00:00", "Z")


def site(api: Api, admin_token: str, name: str, site_type: str, email: str, wilaya: str, commune: str) -> dict[str, Any]:
    return api.request(
        "POST",
        "/operator/admin/sites",
        admin_token,
        {
            "name": name,
            "site_type": site_type,
            "wilaya": wilaya,
            "commune": commune,
            "address": f"Zone operationnelle {commune}",
            "contact_email": email,
            "active": True,
        },
    )


def user(api: Api, admin_token: str, email: str, name: str, role: str, site_id: str) -> dict[str, Any]:
    return api.request(
        "POST",
        "/operator/admin/users",
        admin_token,
        {"email": email, "name": name, "role": role, "password": "seed1234", "site_id": site_id},
    )


def lot_payload(seed: str, idx: int, weight: float, origin: str, source_name: str) -> dict[str, Any]:
    return {
        "source_id": f"SRC-{seed}-{idx:03d}",
        "source_name": source_name,
        "observed_weight_kg": round(weight, 2),
        "estimated_weight_kg": round(weight * random.uniform(1.02, 1.14), 2),
        "cleanliness": random.choice(["paille faible", "terre moyenne", "suint visible", "propre"]),
        "gps": {"lat": round(random.uniform(33.1, 36.4), 5), "lng": round(random.uniform(1.8, 5.2), 5)},
        "producer_identifier": f"PRD-{seed}-{idx:03d}",
        "shearing_date": iso(-random.randint(24, 96)),
        "collection_date": iso(-random.randint(2, 20)),
        "sheep_race": random.choice(["Ouled Djellal", "Rembi", "Hamra"]),
        "wool_origin": origin,
        "wool_type": random.choice(["toison entiere", "laine jarreuse", "laine fine", "melange elevage"]),
        "cleanliness_score": random.randint(1, 5),
        "cleanliness_notes": random.sample(["paille", "foin", "terre", "suint", "vegetaux"], k=2),
        "sanitary_treatment_date": iso(-random.randint(120, 240)),
        "packaging_count": random.randint(4, 12),
        "packaging_type": random.choice(["PP", "jute", "big-bag"]),
        "staple_length_mm": round(random.uniform(45, 92), 1),
        "color": random.choice(["blanc casse", "ecru", "beige clair", "gris"]),
        "jarre_pct": round(random.uniform(1, 9), 1),
        "extraction_method": "tonte manuelle" if origin == "tonte" else "abattage",
        "humidity_pct": round(random.uniform(10, 22), 1),
        "leather_residue_pct": round(random.uniform(0.2, 4.5), 1) if origin == "abattage" else 0.0,
        "quality_score": random.randint(2, 5),
        "specialist_notes": "Donnee synthetique seed operator",
    }


def create_lot(api: Api, token: str, seed: str, idx: int, weight: float, origin: str, source_name: str) -> dict[str, Any]:
    return api.request("POST", "/operator/depot/lots", token, lot_payload(seed, idx, weight, origin, source_name))


def receive(api: Api, token: str, lot: dict[str, Any], received: float | None = None, reason: str | None = None) -> dict[str, Any]:
    return api.request(
        "POST",
        "/operator/depot/receipts",
        token,
        {
            "lot_id": lot["lot_id"],
            "received_weight_kg": round(received if received is not None else lot["observed_weight_kg"], 2),
            "storage_zone": random.choice(["A1", "A2", "B1", "C-sec"]),
            "arrival_condition": random.choice(["correct", "humide", "sacs abimes", "poussiere visible"]),
            "discrepancy_reason": reason,
            "qr_payload": lot["qr_payload"],
        },
    )


def classify(api: Api, token: str, lot: dict[str, Any]) -> dict[str, Any]:
    return api.request(
        "POST",
        "/operator/depot/classifications",
        token,
        {
            "lot_id": lot["lot_id"],
            "classification": random.choice(["A", "B", "C", "A-premium"]),
            "vm_percent": round(random.uniform(1.5, 9.5), 1),
            "fiber_state": random.choice(["souple", "moyen", "jarreux", "sec"]),
            "color": random.choice(["ecru", "blanc casse", "gris clair"]),
        },
    )


def temperature(api: Api, token: str, lot: dict[str, Any], value: float) -> dict[str, Any]:
    return api.request(
        "POST",
        "/operator/depot/stock-temperatures",
        token,
        {"lot_id": lot["lot_id"], "temperature_c": value, "note": "Controle stock synthetique"},
    )


def laundry_bdc(api: Api, depot_token: str, lots: list[dict[str, Any]], laundry: dict[str, Any], hours: float) -> dict[str, Any]:
    return api.request(
        "POST",
        "/operator/depot/laundry-shipments",
        depot_token,
        {
            "lot_ids": [item["lot_id"] for item in lots],
            "humidity_pct": round(random.uniform(12, 18), 1),
            "laundry_name": laundry["name"],
            "transporteur_email": "transport.seed@nfn.example.com",
            "destination_email": laundry["contact_email"],
            "expected_delivery_at": iso(hours),
            "destination_site_id": laundry["site_id"],
            "qr_payload": lots[0]["qr_payload"],
        },
    )


def laundry_receive(api: Api, token: str, bdc: dict[str, Any], multiplier: float = 1.0) -> dict[str, Any]:
    expected = float(bdc["total_weight_kg"])
    gap = abs(multiplier - 1) * 100
    return api.request(
        "POST",
        "/operator/laverie/receipts",
        token,
        {
            "bdc_id": bdc["bdc_id"],
            "received_weight_kg": round(expected * multiplier, 2),
            "discrepancy_reason": "Ecart pesee pont bascule synthetique" if gap > 5 else None,
            "qr_payload": bdc["qr_payload"],
        },
    )


def wash(api: Api, token: str, bdc: dict[str, Any], target: str) -> dict[str, Any]:
    return api.request(
        "POST",
        "/operator/laverie/wash-runs",
        token,
        {
            "bdc_id": bdc["bdc_id"],
            "water_temperature_c": random.choice([42, 48, 55, 62]),
            "detergent": random.choice(["savon neutre", "bio-detergent", "lessive laine basse mousse"]),
            "duration_minutes": random.choice([35, 45, 55, 65]),
            "target_transformer": target,
            "override_reason": "Parametres adaptes au taux de suint" if random.random() < 0.35 else None,
            "qr_payload": bdc["qr_payload"],
        },
    )


def laundry_output(
    api: Api,
    token: str,
    bdc: dict[str, Any],
    transformer: dict[str, Any],
    target: str,
    hours: float,
    anomalous: bool = False,
) -> dict[str, Any]:
    input_weight = float(bdc["total_weight_kg"])
    if anomalous:
        dry = input_weight * 0.50
        waste = input_weight * 0.16
        water = input_weight * 0.20
    else:
        dry = input_weight * random.uniform(0.66, 0.78)
        waste = input_weight * random.uniform(0.08, 0.14)
        water = max(input_weight - dry - waste, 0)
    return api.request(
        "POST",
        "/operator/laverie/outputs",
        token,
        {
            "bdc_id": bdc["bdc_id"],
            "dry_weight_kg": round(dry, 2),
            "waste_weight_kg": round(waste, 2),
            "water_loss_kg": round(water, 2),
            "residual_humidity_pct": round(random.uniform(6.5, 11.5), 1),
            "residual_suint_pct": round(random.uniform(0.4, 2.8), 1),
            "ph": round(random.uniform(6.4, 7.6), 2),
            "grade": random.randint(2, 5),
            "notes": "Sortie laverie synthetique avec bilan matiere",
            "transporteur_email": "transport.transformer.seed@nfn.example.com",
            "destination_email": transformer["contact_email"],
            "expected_delivery_at": iso(hours),
            "transformer_site_id": transformer["site_id"],
            "qr_payload": bdc["qr_payload"],
        },
    )


def latest_transformer_bdc(api: Api, token: str, source_bdc_id: str) -> dict[str, Any]:
    bdcs = api.request("GET", "/operator/bdcs", token)
    matches = [item for item in bdcs if item.get("source_bdc_id") == source_bdc_id or item.get("certificate_id") == f"CERT-{source_bdc_id}"]
    if not matches:
        raise RuntimeError(f"No transformer BDC generated for {source_bdc_id}")
    return sorted(matches, key=lambda item: item["created_at"])[-1]


def transformer_receive(api: Api, token: str, bdc: dict[str, Any], multiplier: float = 1.0) -> dict[str, Any]:
    expected = float(bdc["total_weight_kg"])
    return api.request(
        "POST",
        "/operator/transformer/receipts",
        token,
        {
            "bdc_id": bdc["bdc_id"],
            "received_weight_kg": round(expected * multiplier, 2),
            "price_da_per_kg": round(random.uniform(155, 245), 2),
            "discrepancy_reason": "Recalage pesee entree transformateur synthetique",
            "qr_payload": bdc["qr_payload"],
        },
    )


def transformer_finish(api: Api, token: str, bdc: dict[str, Any], target: str) -> dict[str, Any]:
    if target == "T1":
        return api.request(
            "POST",
            "/operator/transformer/t1-productions",
            token,
            {
                "bdc_id": bdc["bdc_id"],
                "flow_destination": random.choice(["A1", "A2", "A3"]),
                "anti_mite": random.choice(["permethrine faible dose", "traitement vapeur", "aucun"]),
                "binding_fiber_pct": round(random.uniform(8, 16), 1),
                "fire_retardant": random.choice(["borate", "phosphate ammonium", "aucun"]),
                "target_density_kg_m3": round(random.uniform(18, 32), 1),
                "target_thickness_mm": round(random.uniform(45, 120), 1),
                "qr_payload": bdc["qr_payload"],
            },
        )
    return api.request(
        "POST",
        "/operator/transformer/t2-receptions",
        token,
        {
            "bdc_id": bdc["bdc_id"],
            "dryness_ok": random.choice([True, True, True, False]),
            "foreign_bodies_ok": random.choice([True, True, True, False]),
            "unloading_mode": random.choice(["vrac", "balles"]),
            "qr_payload": bdc["qr_payload"],
        },
    )


def build_flow(
    api: Api,
    depot_token: str,
    laundry_token: str,
    transformer_token: str,
    seed: str,
    idx: int,
    laundry_site: dict[str, Any],
    transformer_site: dict[str, Any],
    target: str,
    finish: bool,
    receive_transformer: bool = True,
    anomalous_output: bool = False,
) -> dict[str, Any]:
    lots = [
        create_lot(api, depot_token, seed, idx, random.uniform(72, 118), "tonte" if target == "T1" else "abattage", f"Eleveur seed {idx}A"),
        create_lot(api, depot_token, seed, idx + 1, random.uniform(58, 96), "tonte" if target == "T1" else "abattage", f"Eleveur seed {idx}B"),
    ]
    for lot in lots:
        receive(api, depot_token, lot)
        classify(api, depot_token, lot)
    bdc = laundry_bdc(api, depot_token, lots, laundry_site, 5)
    api.request("POST", "/operator/qr/ingest", laundry_token, {"qr_payload": bdc["qr_payload"]})
    laundry_receive(api, laundry_token, bdc)
    wash(api, laundry_token, bdc, target)
    output = laundry_output(api, laundry_token, bdc, transformer_site, target, -5 if not receive_transformer else 8, anomalous_output)
    transformer_bdc = latest_transformer_bdc(api, transformer_token, output["bdc_id"])
    api.request("POST", "/operator/qr/ingest", transformer_token, {"qr_payload": transformer_bdc["qr_payload"]})
    if receive_transformer:
        transformer_receive(api, transformer_token, transformer_bdc)
        if finish:
            transformer_finish(api, transformer_token, transformer_bdc, target)
    return {"lots": lots, "laundry_bdc": bdc, "output": output, "transformer_bdc": transformer_bdc}


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed the NFN operator backend with synthetic data.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--seed", default=str(int(time.time())))
    args = parser.parse_args()

    random.seed(args.seed)
    api = Api(args.base_url)
    api.request("GET", "/health")

    admin_token = api.login("admin@nfn.example.com", "admin123")
    api.request(
        "PATCH",
        "/operator/admin/policies",
        admin_token,
        {
            "depot_max_storage_kg": 650,
            "depot_max_storage_hours": 12,
            "laundry_max_processing_hours": 12,
            "lot_transformation_sla_hours": 24,
            "stock_temperature_c": 28,
            "receipt_gap_pct": 5,
            "laundry_yield_tonte_pct": 64,
            "laundry_yield_abattage_pct": 52,
            "transformer_confirmation_hours": 48,
        },
    )

    tag = args.seed[-6:]
    sites = {
        "depot_a": site(api, admin_token, f"Depot Synth Nord {tag}", "depot", f"depot.nord.{tag}@nfn.example.com", "Djelfa", "Messaad"),
        "depot_b": site(api, admin_token, f"Depot Synth Sud {tag}", "depot", f"depot.sud.{tag}@nfn.example.com", "Laghouat", "Aflou"),
        "laundry_a": site(api, admin_token, f"Laverie Synth Centre {tag}", "laverie", f"laverie.centre.{tag}@nfn.example.com", "Blida", "Boufarik"),
        "laundry_b": site(api, admin_token, f"Laverie Synth Est {tag}", "laverie", f"laverie.est.{tag}@nfn.example.com", "Setif", "El Eulma"),
        "t1": site(api, admin_token, f"Transformateur T1 Synth {tag}", "transformer_t1", f"t1.synth.{tag}@nfn.example.com", "Alger", "Rouiba"),
        "t2": site(api, admin_token, f"Transformateur T2 Synth {tag}", "transformer_t2", f"t2.synth.{tag}@nfn.example.com", "Oran", "Es Senia"),
    }

    users = {
        "depot_a": user(api, admin_token, f"depot.nord.{tag}@nfn.example.com", f"Resp Depot Nord {tag}", "responsable_depot", sites["depot_a"]["site_id"]),
        "depot_b": user(api, admin_token, f"depot.sud.{tag}@nfn.example.com", f"Resp Depot Sud {tag}", "responsable_depot", sites["depot_b"]["site_id"]),
        "laundry_a": user(api, admin_token, f"laverie.centre.{tag}@nfn.example.com", f"Resp Laverie Centre {tag}", "responsable_laverie", sites["laundry_a"]["site_id"]),
        "laundry_b": user(api, admin_token, f"laverie.est.{tag}@nfn.example.com", f"Resp Laverie Est {tag}", "responsable_laverie", sites["laundry_b"]["site_id"]),
        "t1": user(api, admin_token, f"t1.synth.{tag}@nfn.example.com", f"Operateur T1 {tag}", "transformateur_T1", sites["t1"]["site_id"]),
        "t2": user(api, admin_token, f"t2.synth.{tag}@nfn.example.com", f"Operateur T2 {tag}", "transformateur_T2", sites["t2"]["site_id"]),
    }

    tokens = {key: api.login(value["email"], "seed1234") for key, value in users.items()}

    # Depot A: pending, stock, classified, overdue BDC.
    pending = [create_lot(api, tokens["depot_a"], tag, 10 + i, random.uniform(50, 90), "tonte", "Ferme pending") for i in range(3)]
    api.request("POST", "/operator/qr/ingest", tokens["depot_a"], {"qr_payload": pending[0]["qr_payload"]})

    stock = [create_lot(api, tokens["depot_a"], tag, 20 + i, random.uniform(85, 125), "tonte", "Ferme stock") for i in range(3)]
    for i, lot in enumerate(stock):
        receive(api, tokens["depot_a"], lot, received=lot["observed_weight_kg"] * (1.08 if i == 0 else 1), reason="Humidite forte a l'arrivee" if i == 0 else None)
        temperature(api, tokens["depot_a"], lot, 32.5 if i == 0 else random.uniform(19, 26))

    classified = [create_lot(api, tokens["depot_a"], tag, 30 + i, random.uniform(75, 112), "abattage", "Abattoir classe") for i in range(3)]
    for lot in classified:
        receive(api, tokens["depot_a"], lot)
        classify(api, tokens["depot_a"], lot)

    overdue_laundry_lots = [create_lot(api, tokens["depot_a"], tag, 40 + i, random.uniform(80, 130), "tonte", "Cooperative retard") for i in range(2)]
    for lot in overdue_laundry_lots:
        receive(api, tokens["depot_a"], lot)
        classify(api, tokens["depot_a"], lot)
    overdue_bdc = laundry_bdc(api, tokens["depot_a"], overdue_laundry_lots, sites["laundry_a"], -7)

    # Depot B: full flows, laundry-in-progress, transformer-in-progress.
    build_flow(api, tokens["depot_b"], tokens["laundry_a"], tokens["t1"], tag, 100, sites["laundry_a"], sites["t1"], "T1", finish=True)
    build_flow(api, tokens["depot_b"], tokens["laundry_b"], tokens["t2"], tag, 120, sites["laundry_b"], sites["t2"], "T2", finish=True, anomalous_output=True)
    build_flow(api, tokens["depot_b"], tokens["laundry_a"], tokens["t1"], tag, 140, sites["laundry_a"], sites["t1"], "T1", finish=False, receive_transformer=True)
    build_flow(api, tokens["depot_b"], tokens["laundry_b"], tokens["t2"], tag, 160, sites["laundry_b"], sites["t2"], "T2", finish=False, receive_transformer=False)

    in_laundry_lots = [create_lot(api, tokens["depot_b"], tag, 200 + i, random.uniform(60, 100), "tonte", "Ferme lavage attente") for i in range(2)]
    for lot in in_laundry_lots:
        receive(api, tokens["depot_b"], lot)
        classify(api, tokens["depot_b"], lot)
    in_laundry_bdc = laundry_bdc(api, tokens["depot_b"], in_laundry_lots, sites["laundry_b"], 6)
    laundry_receive(api, tokens["laundry_b"], in_laundry_bdc, multiplier=0.93)
    wash(api, tokens["laundry_b"], in_laundry_bdc, "T2")

    api.request("GET", "/admin/alerts", admin_token)
    policies = api.request("GET", "/operator/policies", admin_token)
    audits = api.request("GET", "/operator/audits", admin_token)
    bdcs = api.request("GET", "/operator/bdcs", admin_token)

    print(
        json.dumps(
            {
                "seed": tag,
                "created_sites": len(sites),
                "created_users": len(users),
                "sample_accounts_password": "seed1234",
                "pending_lots": len(pending),
                "open_overdue_laundry_bdc": overdue_bdc["bdc_id"],
                "total_bdcs_visible_admin": len(bdcs),
                "total_operator_audits_visible_admin": len(audits),
                "audit_summary": policies.get("audit_summary"),
                "bdc_deadlines": len(policies.get("bdc_deadlines", [])),
                "depot_capacity_rows": len(policies.get("depot_capacity", [])),
                "accounts": {key: value["email"] for key, value in users.items()},
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Seed failed: {exc}", file=sys.stderr)
        raise
