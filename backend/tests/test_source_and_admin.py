def test_source_registration_and_admin_approval(client, tokens):
    otp_request = client.post("/source/otp/request", json={"email": "new-source@example.com"})
    assert otp_request.status_code == 200

    outbox = client.get("/notifications/outbox").json()
    otp_email = next(message for message in outbox if message["recipient"] == "new-source@example.com")
    otp_code = otp_email["body"].split()[-1].strip(".")

    verify = client.post(
        "/source/otp/verify",
        json={"email": "new-source@example.com", "otp_code": otp_code},
    )
    assert verify.status_code == 200

    registration = client.post(
        "/source/registrations",
        json={
            "email": "new-source@example.com",
            "source_type": "eleveur",
            "name": "Nouvelle Ferme",
            "wilaya": "El Bayadh",
            "commune": "Brezina",
            "gps_lat": 33.09,
            "gps_lng": 1.2,
            "phone": None,
            "races": ["Rembi"],
            "herd_size": 55,
            "availability_months": ["Mars", "Avril"],
        },
    )
    assert registration.status_code == 200
    public_id = registration.json()["public_id"]

    pending = client.get(
        "/admin/sources/pending",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
    )
    assert pending.status_code == 200
    assert any(item["public_id"] == public_id for item in pending.json())

    approve = client.post(
        f"/admin/sources/{public_id}/approve",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={"comment": "Looks good"},
    )
    assert approve.status_code == 200
    assert approve.json()["status"] == "active"

    status_response = client.get(f"/source/registrations/{public_id}/status")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "active"

