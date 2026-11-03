import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app.main import app, seed_demo, auto_migrate_schema
from app.db import SessionLocal, engine
from app.models import User, Appointment, Base

Base.metadata.create_all(bind=engine)
auto_migrate_schema()
seed_demo()
client = TestClient(app)

print("=== TEST VIRTUAL WAITING ROOM WORKFLOW ===")

# 1. Login as Nurse
nurse_login = client.post("/api/v1/auth/login", json={"email": "nurse@example.test", "password": "ChangeMe123!"})
assert nurse_login.status_code == 200, f"Nurse login failed: {nurse_login.text}"
nurse_token = nurse_login.json()["access_token"]
nurse_headers = {"Authorization": f"Bearer {nurse_token}"}

# 2. Login as Doctor
doc_login = client.post("/api/v1/auth/login", json={"email": "doctor@example.test", "password": "ChangeMe123!"})
assert doc_login.status_code == 200, f"Doctor login failed: {doc_login.text}"
doc_token = doc_login.json()["access_token"]
doc_headers = {"Authorization": f"Bearer {doc_token}"}

# 3. Login as Patient
pat_login = client.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
assert pat_login.status_code == 200, f"Patient login failed: {pat_login.text}"
pat_token = pat_login.json()["access_token"]
pat_headers = {"Authorization": f"Bearer {pat_token}"}

# 4. Find or create an appointment for patient
db = SessionLocal()
appt = db.query(Appointment).filter_by(patient_id=1).first()
assert appt is not None, "Appointment not found"
appt_id = appt.id
db.close()

# 5. Nurse assesses vitals and sends to waiting room
triage_payload = {
    "pulse": 76,
    "blood_pressure": "120/80",
    "temperature": 36.6,
    "spo2": 99,
    "weight": 68.0,
    "height": 172.0,
    "triage_level": "normal",
    "triage_notes": "Bệnh nhân tỉnh táo, tiếp xúc tốt. Huyết áp ổn định.",
    "send_to_waiting_room": True
}
res_assess = client.post(f"/api/v1/triage/{appt_id}/assess", json=triage_payload, headers=nurse_headers)
print("1. Nurse Assessment Response:", res_assess.json())
assert res_assess.status_code == 200
assert res_assess.json()["triage_status"] == "waiting_room"

# 6. Patient checks waiting room status
res_wait = client.get(f"/api/v1/appointments/{appt_id}/waiting-status", headers=pat_headers)
print("2. Patient Waiting Room Status:", res_wait.json())
assert res_wait.status_code == 200
wait_data = res_wait.json()
assert wait_data["status"] == "waiting"
assert wait_data["is_called"] is False
assert wait_data["vitals"]["blood_pressure"] == "120/80"
print(f"   -> Patient in waiting room: Queue #{wait_data['queue_number']}, Wait ~{wait_data['estimated_wait_minutes']} mins")

# 7. Doctor calls patient from waiting room
res_call = client.post(f"/api/v1/telehealth/sessions/{appt_id}/call-patient", headers=doc_headers)
print("3. Doctor Calls Patient:", res_call.json())
assert res_call.status_code == 200

# 8. Patient checks waiting room status again -> is_called should be True!
res_wait2 = client.get(f"/api/v1/appointments/{appt_id}/waiting-status", headers=pat_headers)
wait_data2 = res_wait2.json()
print("4. Patient Status after Call:", wait_data2["is_called"], "Status:", wait_data2["status"])
assert wait_data2["is_called"] is True
assert wait_data2["status"] == "in_progress"

print("\n>>> ALL WAITING ROOM TESTS PASSED SUCCESSFULLY! <<<")
