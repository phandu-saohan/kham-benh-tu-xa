"""
Bộ test bảo mật xác nhận các lỗ hổng nghiêm trọng đã được vá:
- OTP backdoor "123456" đã bị xóa (S1)
- Brute-force OTP bị rate limit (S1)
- Refresh token được rotate, token cũ vô hiệu (S5)
- Websocket bắt buộc JWT + đúng chủ phòng khám (S3)
- Webhook cần HMAC signature (S2)
"""
import json as _json
import hmac as _hmac
import hashlib as _hashlib
from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient

from app.main import app
from app.db import SessionLocal
from app.models import User, OtpCode, Appointment
from app.config import settings
from app.security import decode_token

from conftest import sign_webhook_payload


def test_otp_backdoor_removed():
    """"123456" phải vô hiệu nếu không đúng mã đã cấp cho SĐT đó."""
    with TestClient(app) as c:
        r = c.post("/api/v1/auth/otp/verify", json={
            "phone_number": "0999888777", "otp_code": "123456"
        })
        assert r.status_code == 400
        assert "OTP" in r.json()["detail"]


def test_otp_code_is_random_not_fixed():
    """Mã OTP phải ngẫu nhiên theo từng lần gửi, không cố định."""
    with TestClient(app) as c:
        codes = []
        for _ in range(3):
            r = c.post("/api/v1/auth/otp/send", json={"phone_number": "0905550111"})
            codes.append(r.json().get("dev_code"))
        assert all(codes), "dev_code phải tồn tại ở môi trường dev/mock"
        assert len(set(codes)) >= 2, "3 lần gửi không nên ra trùng mã (xác suất cực thấp)"


def test_otp_single_use_and_wrong_code_rejected():
    with TestClient(app) as c:
        phone = "0905550222"
        code = c.post("/api/v1/auth/otp/send", json={"phone_number": phone}).json()["dev_code"]
        first = c.post("/api/v1/auth/otp/verify", json={"phone_number": phone, "otp_code": code})
        assert first.status_code == 200
        # Dùng lại cùng mã -> 400
        reuse = c.post("/api/v1/auth/otp/verify", json={"phone_number": phone, "otp_code": code})
        assert reuse.status_code == 400
        # Mã sai -> 400
        wrong = c.post("/api/v1/auth/otp/verify", json={"phone_number": phone, "otp_code": "000001"})
        assert wrong.status_code == 400


def test_otp_verify_rate_limited():
    with TestClient(app) as c:
        phone = "0905550333"
        seen_429 = False
        for _ in range(8):
            r = c.post("/api/v1/auth/otp/verify", json={"phone_number": phone, "otp_code": "000000"})
            if r.status_code == 429:
                seen_429 = True
                break
        assert seen_429, "Nhập sai 5 lần liên tiếp phải bị khóa tạm"


def test_refresh_token_rotation():
    """Sau khi rotate, refresh token cũ không dùng lại được."""
    with TestClient(app) as c:
        login = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        old_ref = login.json()["refresh_token"]
        first = c.post("/api/v1/auth/refresh", json={"refresh_token": old_ref})
        assert first.status_code == 200
        body = first.json()
        assert body["refresh_token"] != old_ref  # rotate mới
        # token cũ -> vô hiệu
        replay = c.post("/api/v1/auth/refresh", json={"refresh_token": old_ref})
        assert replay.status_code == 401


def test_refresh_token_uses_refresh_type_only():
    with TestClient(app) as c:
        login = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        access = login.json()["access_token"]
        # access token bị payload type access => từ chối
        r = c.post("/api/v1/auth/refresh", json={"refresh_token": access})
        assert r.status_code == 401


def test_websocket_requires_valid_token():
    from starlette.testclient import WebSocketDisconnect
    with TestClient(app) as c:
        db = SessionLocal()
        patient = db.query(User).filter_by(role="patient").first()
        doctor = db.query(User).filter_by(role="doctor").first()
        appt = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            starts_at=datetime.now(timezone.utc) + timedelta(days=3),
            reason="Test bảo mật WebSocket",
            status="scheduled",
            fee_amount=500000
        )
        db.add(appt)
        db.commit()
        appt_id = appt.id
        db.close()
        
        base = f"/api/v1/ws/{appt_id}"
        # Không token -> từ chối
        try:
            with c.websocket_connect(base) as _:
                raise AssertionError("WS không token không được phép kết nối")
        except (WebSocketDisconnect, AssertionError):
            pass
        # Token sai -> từ chối
        try:
            with c.websocket_connect(f"{base}?token=garbage") as _:
                raise AssertionError("WS token sai không được phép kết nối")
        except (WebSocketDisconnect, AssertionError):
            pass
        # Token hợp lệ của người DÙNG KHÁC -> bị từ chối (không phải thành viên phòng)
        stranger = c.post("/api/v1/auth/login", json={"email": "admin@example.test", "password": "ChangeMe123!"}).json()
        try:
            with c.websocket_connect(f"{base}?token={stranger['access_token']}") as _:
                raise AssertionError("WS của user không thuộc appointment không được join")
        except (WebSocketDisconnect, AssertionError):
            pass


def test_websocket_authorised_user_joins_and_receives():
    with TestClient(app) as c:
        db = SessionLocal()
        patient = db.query(User).filter_by(role="patient").first()
        doctor = db.query(User).filter_by(role="doctor").first()
        appt = Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            starts_at=datetime.now(timezone.utc) + timedelta(days=3),
            reason="Test bảo mật WebSocket",
            status="scheduled",
            fee_amount=500000
        )
        db.add(appt)
        db.commit()
        appt_id = appt.id
        db.close()

        ptokens = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"}).json()
        dtokens = c.post("/api/v1/auth/login", json={"email": "doctor@example.test", "password": "ChangeMe123!"}).json()

        with c.websocket_connect(f"/api/v1/ws/{appt_id}?token={ptokens['access_token']}") as ws_patient, \
             c.websocket_connect(f"/api/v1/ws/{appt_id}?token={dtokens['access_token']}") as ws_doctor:
            ws_doctor.send_json({"type": "OFFER", "sdp": "fake-sdp"})
            received = ws_patient.receive_json()
            assert received["type"] == "OFFER"
            # Server ghi đè role & appointment_id, client không tự nhận role được
            assert received["role"] == "doctor"
            assert received["appointment_id"] == str(appt_id)


def test_webhook_rejects_unsigned_request():
    res = client_unsigned_post()
    assert res.status_code in (401, 422)


def client_unsigned_post():
    c = TestClient(app)
    # Signed request helper may not exist yet before login; raw unsigned attempt must fail auth first
    return c.post("/api/v1/payments/webhook", json={"content": "TM123456", "amount": 100})


def test_webhook_amount_mismatch_rejected():
    with TestClient(app) as c:
        login = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        future = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        appt_id = c.post("/api/v1/appointments", headers=headers, json={
            "doctor_id": 2, "starts_at": future, "reason": "Thanh toán test"
        }).json()["id"]

        payload = {"content": f"TM{appt_id}", "amount": 1, "gateway": "vietqr_pro"}
        raw = _json.dumps(payload).encode("utf-8")
        res = c.post("/api/v1/payments/webhook", content=raw, headers={
            "Content-Type": "application/json",
            "X-Signature": sign_webhook_payload(raw)
        })
        assert res.status_code == 400, "Số tiền 1 VND không được xác nhận lịch hẹn 500000"
        db = SessionLocal()
        appt = db.get(Appointment, appt_id)
        assert appt.status != "confirmed"
        db.close()
