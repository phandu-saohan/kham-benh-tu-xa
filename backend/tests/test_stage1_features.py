import os
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from app.main import app
from app.db import Base, engine, SessionLocal
from app.models import User, Appointment, ClinicalRecord, Payment

def test_otp_flow_and_registration():
    with TestClient(app) as c:
        # 1. Gửi OTP
        phone = "0988776655"
        r1 = c.post("/api/v1/auth/otp/send", json={"phone_number": phone})
        assert r1.status_code == 200
        data1 = r1.json()
        assert data1["success"] is True
        with SessionLocal() as db:
            from app.models import OtpCode
            otp_obj = db.query(OtpCode).filter(OtpCode.phone_number == phone).order_by(OtpCode.id.desc()).first()
            code = data1.get("dev_code") or (otp_obj.code if otp_obj else "")

        # 2. Xác thực OTP và đăng ký tài khoản tự động
        r2 = c.post("/api/v1/auth/otp/verify", json={
            "phone_number": phone,
            "otp_code": code,
            "full_name": "Bệnh Nhân Thử Nghiệm"
        })
        assert r2.status_code == 200
        token_data = r2.json()
        assert "access_token" in token_data
        assert "refresh_token" in token_data
        assert token_data["user"]["phone_number"] == phone

        # 3. Thử refresh token
        r3 = c.post("/api/v1/auth/refresh", json={"refresh_token": token_data["refresh_token"]})
        assert r3.status_code == 200
        assert "access_token" in r3.json()

def test_icd10_search():
    with TestClient(app) as c:
        # Tìm kiếm theo mã
        r1 = c.get("/api/v1/icd10/search?q=I10")
        assert r1.status_code == 200
        items1 = r1.json()
        assert len(items1) > 0
        assert items1[0]["code"] == "I10"

        # Tìm kiếm theo tên tiếng Việt
        r2 = c.get("/api/v1/icd10/search?q=dạ dày")
        assert r2.status_code == 200
        items2 = r2.json()
        assert any("K29" in x["code"] or "GERD" in x["name"] for x in items2)

def test_doctor_workspace_and_consultation_completion():
    with TestClient(app) as c:
        # Đăng nhập bác sĩ demo
        r_login = c.post("/api/v1/auth/login", json={"email": "doctor@example.test", "password": "ChangeMe123!"})
        doctor_token = r_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {doctor_token}"}

        # Lấy danh sách lịch hẹn
        r_appts = c.get("/api/v1/appointments", headers=headers)
        assert r_appts.status_code == 200
        appts = r_appts.json()
        
        # Nếu chưa có lịch hẹn, lấy patient tạo 1 lịch hẹn
        r_p_login = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        p_token = r_p_login.json()["access_token"]
        future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
        r_create = c.post("/api/v1/appointments", headers={"Authorization": f"Bearer {p_token}"}, json={
            "doctor_id": r_login.json()["user"]["id"],
            "starts_at": future_time,
            "reason": "Ho kéo dài và sốt nhẹ"
        })
        assert r_create.status_code == 200
        appt_id = r_create.json()["id"]

        # 1. Bác sĩ lưu phiếu khám bệnh lâm sàng kèm mã ICD-10
        r_record = c.post(f"/api/v1/appointments/{appt_id}/clinical-records", headers=headers, json={
            "symptoms": "Ho khan 3 ngày, sốt nhẹ về chiều, đau họng",
            "allergies": "Dị ứng Penicillin",
            "diagnosis": "Viêm đường hô hấp trên cấp tính",
            "icd10_code": "J06",
            "icd10_name": "Nhiễm khuẩn hô hấp trên cấp tính",
            "clinical_notes": "Họng đỏ nhẹ, không có mủ amidan, phổi trong",
            "plan": "Nghỉ ngơi, bù nước điện giải, dùng siro ho thảo dược, tái khám nếu sốt cao >38.5C"
        })
        assert r_record.status_code == 200
        rec_data = r_record.json()
        assert rec_data["icd10_code"] == "J06"
        assert rec_data["is_locked"] is False

        # 2. Bác sĩ kê đơn thuốc tóm tắt
        r_pres = c.post(f"/api/v1/appointments/{appt_id}/prescriptions", headers=headers, json={
            "summary": "1. Paracetamol 500mg: 1 viên khi sốt > 38.5C\n2. Siro ho Prospan: 5ml x 3 lần/ngày"
        })
        assert r_pres.status_code == 200

        # 3. Bác sĩ hoàn thành buổi khám (complete)
        r_comp = c.post(f"/api/v1/appointments/{appt_id}/complete", headers=headers)
        assert r_comp.status_code == 200
        assert r_comp.json()["status"] == "completed"

        # 4. Kiểm tra hồ sơ lâm sàng đã bị khóa (Lock)
        r_get_rec = c.get(f"/api/v1/appointments/{appt_id}/clinical-records", headers=headers)
        assert r_get_rec.status_code == 200
        assert r_get_rec.json()["record"]["is_locked"] is True

        # Thử sửa lại sau khi khóa -> Báo lỗi 409
        r_retry_edit = c.post(f"/api/v1/appointments/{appt_id}/clinical-records", headers=headers, json={
            "diagnosis": "Sửa lại sau khi khám"
        })
        assert r_retry_edit.status_code == 409

def test_vietqr_and_webhook():
    with TestClient(app) as c:
        # Lấy token patient
        r_p_login = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        p_token = r_p_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {p_token}"}

        # Tạo lịch hẹn
        future_time = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        r_create = c.post("/api/v1/appointments", headers=headers, json={
            "doctor_id": 2,
            "starts_at": future_time,
            "reason": "Khám sức khỏe tổng quát"
        })
        appt_id = r_create.json()["id"]

        # Lấy thông tin VietQR
        r_qr = c.get(f"/api/v1/payments/{appt_id}/vietqr", headers=headers)
        assert r_qr.status_code == 200
        qr_data = r_qr.json()
        assert "qr_image_url" in qr_data
        assert qr_data["transfer_content"] == f"TM{appt_id}"

        # Giả lập webhook ngân hàng (BẮT BUỘC X-Signature HMAC-SHA256)
        import json as _json
        from conftest import sign_webhook_payload
        payload = {
            "transfer_content": f"CHUYEN TIEN TM{appt_id} NGUYEN MINH AN",
            "amount": 500000,
            "transaction_id": "MB-BANK-998811"
        }
        raw = _json.dumps(payload).encode("utf-8")
        r_webhook = c.post("/api/v1/payments/webhook", content=raw,
                           headers={"Content-Type": "application/json", "X-Signature": sign_webhook_payload(raw)})
        assert r_webhook.status_code == 200
        assert r_webhook.json()["status"] == "confirmed"

        # Kiểm tra lại lịch hẹn đã ở trạng thái confirmed
        r_check = c.get(f"/api/v1/appointments/{appt_id}", headers=headers)
        assert r_check.status_code == 200
        assert r_check.json()["status"] == "confirmed"
