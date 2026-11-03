import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db, Base, engine
from app.models import User, Appointment, ClinicalRecord, PrescriptionRef
from app.security import hash_password, create_access_token

client = TestClient(app)

def test_cccd_identification():
    print("=== TEST CCCD / VNeID PATIENT RECOGNITION ===")

    # 1. Login as doctor to get token
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "doctor@example.test",
        "password": "ChangeMe123!"
    })
    assert login_resp.status_code == 200, f"Doctor login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Test lookup with plain CCCD (Nguyen Minh An - 079092014829)
    print("\n--- Test 1: Plain 12-digit CCCD ---")
    resp1 = client.post("/api/v1/patients/identify-by-cccd", json={
        "identity_card": "079092014829"
    }, headers=headers)
    assert resp1.status_code == 200, f"Identify failed: {resp1.text}"
    data1 = resp1.json()
    print("Result 1:", data1["message"])
    print("Patient Name:", data1["full_name"])
    print("Patient Type:", data1["patient_type"])
    print("Total Visits:", data1["total_visits"])
    print("BHYT Code:", data1["bhyt_code"])
    assert data1["found"] is True
    assert "Nguyễn Minh An" in data1["full_name"]
    assert data1["vneid_level"] == 2

    # 3. Test lookup with VNeID QR Code raw string
    print("\n--- Test 2: Scanned VNeID QR Code string ---")
    qr_string = "079092014829|024123456|Nguyễn Minh An|16081992|Nam|124 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh|10052021"
    resp2 = client.post("/api/v1/patients/identify-by-cccd", json={
        "identity_card": qr_string
    }, headers=headers)
    assert resp2.status_code == 200, f"Identify QR failed: {resp2.text}"
    data2 = resp2.json()
    print("Result 2:", data2["message"])
    assert data2["found"] is True
    assert data2["identity_card"] == "079092014829"

    # 4. Test lookup with unknown CCCD (New Patient)
    print("\n--- Test 3: Unknown CCCD (New Patient) ---")
    resp3 = client.post("/api/v1/patients/identify-by-cccd", json={
        "identity_card": "099999999999"
    }, headers=headers)
    assert resp3.status_code == 200, f"Identify new failed: {resp3.text}"
    data3 = resp3.json()
    print("Result 3:", data3["message"])
    assert data3["found"] is False
    assert data3["patient_type"] == "new"

    print("\n>>> ALL CCCD / VNeID IDENTIFICATION TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_cccd_identification()
