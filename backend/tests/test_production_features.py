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

def test_admin_dashboard_and_settings_api():
    # 1. Login as admin
    login_res = client.post("/api/v1/auth/login", json={"email": "admin@example.test", "password": "ChangeMe123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get overview stats
    ov_res = client.get("/api/v1/admin/overview", headers=headers)
    assert ov_res.status_code == 200
    ov_data = ov_res.json()
    assert "total_appointments" in ov_data
    assert "total_patients" in ov_data
    assert "total_doctors" in ov_data
    assert "total_nurses" in ov_data

    # 3. Get users list
    u_res = client.get("/api/v1/admin/users", headers=headers)
    assert u_res.status_code == 200
    users = u_res.json()
    assert len(users) >= 3
    assert any(u["role"] == "admin" for u in users)

    # 4. Get system settings
    st_res = client.get("/api/v1/admin/settings", headers=headers)
    assert st_res.status_code == 200
    st_data = st_res.json()
    assert "hospital_code" in st_data
    assert "allow_test_otp" in st_data
    assert "coturn_host" in st_data

    # 5. Update system settings
    update_payload = {
        "hospital_code": "01002",
        "hospital_name": "Bệnh viện Đa khoa Trung ương BV-TW",
        "allow_test_otp": True,
        "default_max_patients_per_shift": 15
    }
    up_res = client.post("/api/v1/admin/settings", json=update_payload, headers=headers)
    assert up_res.status_code == 200
    assert up_res.json()["hospital_code"] == "01002"
    assert up_res.json()["hospital_name"] == "Bệnh viện Đa khoa Trung ương BV-TW"

    # 6. Verify updated settings persist
    st_res2 = client.get("/api/v1/admin/settings", headers=headers)
    assert st_res2.status_code == 200
    st_data2 = st_res2.json()
    assert st_data2["hospital_code"] == "01002"
    assert st_data2["hospital_name"] == "Bệnh viện Đa khoa Trung ương BV-TW"
    assert st_data2["allow_test_otp"] is True
    assert st_data2["default_max_patients_per_shift"] == 15

    # 7. Verify non-admin gets 403 Forbidden
    patient_res = client.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
    if patient_res.status_code == 200:
        p_token = patient_res.json()["access_token"]
        p_headers = {"Authorization": f"Bearer {p_token}"}
        forbidden_res = client.get("/api/v1/admin/settings", headers=p_headers)
        assert forbidden_res.status_code == 403

def test_patient_specific_paraclinical_and_pacs():
    # 1. Doctor login
    doc_res = client.post("/api/v1/auth/login", json={"email": "doctor@example.test", "password": "ChangeMe123!"})
    assert doc_res.status_code == 200
    doc_token = doc_res.json()["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    db = SessionLocal()
    patient = db.query(User).filter_by(role="patient").first()
    p_id = patient.id
    db.close()

    # 2. Doctor queries patient's lab results
    lab_res = client.get(f"/api/v1/patients/{p_id}/lab-results", headers=doc_headers)
    assert lab_res.status_code == 200
    lab_data = lab_res.json()
    assert lab_data["patient_id"] == p_id
    assert "reports" in lab_data
    assert len(lab_data["reports"]) >= 3
    # Check that biochemistry report has Glucose and HbA1c
    bio_report = next(r for r in lab_data["reports"] if r["category"] == "biochemistry")
    assert any(ind["code"] == "GLU" for ind in bio_report["indicators"])
    assert any(ind["code"] == "HBA1C" for ind in bio_report["indicators"])

    # 3. Doctor queries patient's PACS studies
    pacs_res = client.get(f"/api/v1/patients/{p_id}/pacs-studies", headers=doc_headers)
    assert pacs_res.status_code == 200
    pacs_data = pacs_res.json()
    assert pacs_data["patient_id"] == p_id
    assert "studies" in pacs_data
    assert len(pacs_data["studies"]) >= 3
    # Check that studies have modalities CR, US, CT with OHIF viewer URLs
    modalities = [s["modality"] for s in pacs_data["studies"]]
    assert "CR" in modalities
    assert "US" in modalities
    assert "CT" in modalities
    for study in pacs_data["studies"]:
        assert "viewer_url" in study
        assert "viewer.ohif.org" in study["viewer_url"]
        assert "findings" in study
        assert "impression" in study


