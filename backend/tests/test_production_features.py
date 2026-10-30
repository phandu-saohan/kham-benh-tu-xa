from datetime import datetime, timezone
from fastapi.testclient import TestClient
from app.main import app
from app.security import hash_password
from app.models import User, Appointment
from app.db import SessionLocal

client = TestClient(app)

def test_coturn_ice_servers_endpoint():
    res = client.get("/api/v1/telehealth/ice-servers")
    assert res.status_code == 200
    data = res.json()
    assert "iceServers" in data
    assert len(data["iceServers"]) >= 3
    # Check that TURN and TURNS URLs with credentials exist
    turn_server = next((s for s in data["iceServers"] if s.get("username")), None)
    assert turn_server is not None
    assert turn_server["credential"] is not None
    assert any("turns:" in u for u in turn_server["urls"])
    assert data["ttl"] == 86400

def test_payment_webhook_auto_reconciliation():
    db = SessionLocal()
    # Create test appointment
    patient = db.query(User).filter_by(role="patient").first()
    doctor = db.query(User).filter_by(role="doctor").first()
    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        starts_at=datetime(2026, 10, 31, 10, 0, tzinfo=timezone.utc),
        reason="Khám tim mạch theo dõi",
        status="scheduled",
        fee_amount=300000
    )
    db.add(appt)
    db.commit()
    appt_id = appt.id
    db.close()

    # Call webhook simulating bank transfer with message containing TM{appt_id}
    webhook_payload = {
        "transaction_id": "BANK-TX-998877",
        "amount": 300000,
        "content": f"Chuyen khoan vien phi TM{appt_id} Nguyen Minh An",
        "gateway": "vietqr_pro",
        "status": "PAID"
    }
    res = client.post("/api/v1/payments/webhook", json=webhook_payload)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["success"] is True
    assert res_data["appointment_id"] == appt_id
    assert res_data["status"] == "confirmed"

    # Verify appointment in db is confirmed
    db = SessionLocal()
    updated = db.get(Appointment, appt_id)
    assert updated.status == "confirmed"
    assert updated.paid_at is not None
    db.close()

def test_triage_desk_workflow():
    db = SessionLocal()
    patient = db.query(User).filter_by(role="patient").first()
    doctor = db.query(User).filter_by(role="doctor").first()
    nurse = db.query(User).filter_by(role="nurse").first()
    if not nurse:
        nurse = User(
            email="nurse.test@example.test",
            phone_number="0977112233",
            full_name="ĐD. Test",
            role="nurse",
            password_hash=hash_password("ChangeMe123!")
        )
        db.add(nurse)
        db.commit()

    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        starts_at=datetime(2026, 10, 31, 11, 0, tzinfo=timezone.utc),
        reason="Sốt cao co giật nhẹ",
        status="confirmed",
        triage_status="pending"
    )
    db.add(appt)
    db.commit()
    appt_id = appt.id
    nurse_email = nurse.email
    db.close()

    # Nurse login
    login_res = client.post("/api/v1/auth/login", json={"email": nurse_email, "password": "ChangeMe123!"})
    assert login_res.status_code == 200
    nurse_token = login_res.json()["access_token"]

    # 1. Nurse checks triage queue
    headers = {"Authorization": f"Bearer {nurse_token}"}
    q_res = client.get("/api/v1/triage/queue", headers=headers)
    assert q_res.status_code == 200
    queue = q_res.json()
    assert any(q["appointment_id"] == appt_id for q in queue)

    # 2. Nurse records vital signs and classifies as priority
    assess_payload = {
        "pulse": 115,
        "blood_pressure": "135/85",
        "temperature": 39.2,
        "spo2": 94,
        "weight": 52.0,
        "height": 160.0,
        "triage_level": "priority",
        "triage_notes": "Sốt cao 39.2C, thở nhanh, đã uống hạ sốt cách 1h chưa hạ",
        "dispatch_to_doctor": True
    }
    assess_res = client.post(f"/api/v1/triage/{appt_id}/assess", json=assess_payload, headers=headers)
    assert assess_res.status_code == 200
    assert assess_res.json()["success"] is True
    assert assess_res.json()["triage_status"] == "dispatched"
    assert assess_res.json()["triage_level"] == "priority"

    # 3. Verify that appointment has vital signs saved
    db = SessionLocal()
    appt_updated = db.get(Appointment, appt_id)
    assert appt_updated.temperature == 39.2
    assert appt_updated.pulse == 115
    assert appt_updated.spo2 == 94
    assert appt_updated.triage_status == "dispatched"
    db.close()
