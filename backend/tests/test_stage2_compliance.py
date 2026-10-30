import io
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User, Appointment, ClinicalRecord, PrescriptionRef, PatientConsent
from app.encryption import encrypt_sensitive_data, decrypt_sensitive_data

def test_phi_encryption():
    # Kiểm tra mã hóa và giải mã dữ liệu nhạy cảm
    raw_data = "Số định danh y tế / Bệnh án tuyệt mật: Bệnh nhân có tiền sử dị ứng sốc phản vệ"
    encrypted = encrypt_sensitive_data(raw_data)
    assert encrypted != raw_data
    decrypted = decrypt_sensitive_data(encrypted)
    assert decrypted == raw_data

def test_consent_flow_nd13():
    with TestClient(app) as c:
        # Đăng nhập patient
        r_p = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        p_token = r_p.json()["access_token"]
        headers = {"Authorization": f"Bearer {p_token}"}

        # Tạo lịch hẹn
        future_time = (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()
        r_appt = c.post("/api/v1/appointments", headers=headers, json={
            "doctor_id": 2,
            "starts_at": future_time,
            "reason": "Khám tim mạch"
        })
        appt_id = r_appt.json()["id"]

        # Thử lấy join token LiveKit khi CHƯA ký đồng thuận -> Phải trả về mã 428 Precondition Required
        r_token_fail = c.post(f"/api/v1/telehealth/sessions/{appt_id}/join-token", headers=headers)
        assert r_token_fail.status_code == 428
        assert "Nghị định 13" in r_token_fail.json()["detail"]

        # Kiểm tra API lấy thông tin đồng thuận
        r_status = c.get(f"/api/v1/consent/{appt_id}/status", headers=headers)
        assert r_status.status_code == 200
        assert r_status.json()["consented"] is False

        # Người bệnh ký xác nhận đồng thuận
        r_agree = c.post("/api/v1/consent/agree", headers=headers, json={
            "appointment_id": appt_id,
            "consent_version": "2026.1-ND13"
        })
        assert r_agree.status_code == 200
        assert r_agree.json()["success"] is True

        # Sau khi ký đồng thuận -> Lấy join token thành công
        r_token_ok = c.post(f"/api/v1/telehealth/sessions/{appt_id}/join-token", headers=headers)
        assert r_token_ok.status_code == 200
        assert "token" in r_token_ok.json()

def test_smartca_digital_signing_and_pdf():
    with TestClient(app) as c:
        # Đăng nhập bác sĩ và bệnh nhân
        r_doc = c.post("/api/v1/auth/login", json={"email": "doctor@example.test", "password": "ChangeMe123!"})
        doc_token = r_doc.json()["access_token"]
        doc_id = r_doc.json()["user"]["id"]
        headers = {"Authorization": f"Bearer {doc_token}"}

        r_pat = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        pat_token = r_pat.json()["access_token"]

        # Tạo lịch hẹn
        future_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        r_appt = c.post("/api/v1/appointments", headers={"Authorization": f"Bearer {pat_token}"}, json={
            "doctor_id": doc_id,
            "starts_at": future_time,
            "reason": "Đau đầu Migraine cần khám"
        })
        appt_id = r_appt.json()["id"]

        # Bác sĩ tạo/lưu bệnh án cho lịch hẹn
        c.post(f"/api/v1/appointments/{appt_id}/clinical-records", headers=headers, json={
            "symptoms": "Đau đầu dữ dội vùng thái dương, buồn nôn",
            "allergies": "Không",
            "diagnosis": "Đau nửa đầu Migraine",
            "icd10_code": "G43",
            "icd10_name": "Bệnh đau nửa đầu (Migraine)",
            "plan": "Uống thuốc giảm đau, tránh ánh sáng mạnh, ngủ đủ giấc"
        })
        
        c.post(f"/api/v1/appointments/{appt_id}/prescriptions", headers=headers, json={
            "summary": "1. Paracetamol 500mg: 1 viên x 2 lần/ngày khi đau\n2. Magie B6: 1 viên x 2 lần/ngày sau ăn"
        })

        # 1. Bác sĩ thực hiện Ký số SmartCA
        r_sign = c.post(f"/api/v1/appointments/{appt_id}/sign", headers=headers, json={
            "provider": "VNPT_SmartCA"
        })
        assert r_sign.status_code == 200
        sig_data = r_sign.json()
        assert sig_data["success"] is True
        assert "signature_hash" in sig_data
        assert sig_data["signer_cchn"] == "008912/BYT-CCHN"

        # 2. Bác sĩ đồng bộ lên Cổng Đơn thuốc điện tử Quốc gia
        r_sync = c.post(f"/api/v1/appointments/{appt_id}/sync-national-prescription", headers=headers)
        assert r_sync.status_code == 200
        sync_data = r_sync.json()
        assert sync_data["success"] is True
        assert "01099-" in sync_data["national_prescription_code"]
        assert "donthuocquocgia.vn" in sync_data["lookup_url"]

        # 3. Xuất file PDF Bệnh án & Đơn thuốc
        r_pdf = c.get(f"/api/v1/appointments/{appt_id}/pdf", headers=headers)
        assert r_pdf.status_code == 200
        assert r_pdf.headers["content-type"] == "application/pdf"
        assert len(r_pdf.content) > 1000  # File PDF hợp lệ
        assert r_pdf.content.startswith(b"%PDF")

        # 4. Xuất FHIR R4 Bundle
        r_fhir = c.get(f"/api/v1/appointments/{appt_id}/fhir", headers=headers)
        assert r_fhir.status_code == 200
        fhir_bundle = r_fhir.json()
        assert fhir_bundle["resourceType"] == "Bundle"
        resource_types = [entry["resource"]["resourceType"] for entry in fhir_bundle["entry"]]
        assert "Patient" in resource_types
        assert "Encounter" in resource_types
        assert "Condition" in resource_types
        assert "MedicationRequest" in resource_types

def test_dicomweb_pacs_viewer():
    with TestClient(app) as c:
        r_p = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        headers = {"Authorization": f"Bearer {r_p.json()['access_token']}"}

        r_pacs = c.get("/api/v1/patients/me/pacs-studies", headers=headers)
        assert r_pacs.status_code == 200
        pacs_data = r_pacs.json()
        assert len(pacs_data["studies"]) > 0
        assert "viewer_url" in pacs_data["studies"][0]
        assert "viewer.ohif.org" in pacs_data["studies"][0]["viewer_url"]
