import base64
from fastapi.testclient import TestClient
from app.main import app

def test_consultation_chat_messages_and_attachments():
    with TestClient(app) as c:
        # 1. Login as patient
        r_p = c.post("/api/v1/auth/login", json={"email": "patient@example.test", "password": "ChangeMe123!"})
        assert r_p.status_code == 200
        p_token = r_p.json()["access_token"]
        p_headers = {"Authorization": f"Bearer {p_token}"}

        # 2. Login as doctor
        r_d = c.post("/api/v1/auth/login", json={"email": "doctor@example.test", "password": "ChangeMe123!"})
        assert r_d.status_code == 200
        d_token = r_d.json()["access_token"]
        d_headers = {"Authorization": f"Bearer {d_token}"}

        # 3. Create appointment
        r_appt = c.post("/api/v1/appointments", json={
            "doctor_id": r_d.json()["user"]["id"],
            "starts_at": "2026-10-31T09:00:00Z",
            "reason": "Khám phát ban da và dị ứng",
            "fee_amount": 250000
        }, headers=p_headers)
        assert r_appt.status_code == 200
        appt_id = r_appt.json()["id"]

        # 4. Patient sends text message
        r_msg1 = c.post(f"/api/v1/telehealth/sessions/{appt_id}/messages", json={
            "content": "Chào bác sĩ, tôi bị nổi mẩn ngứa ở cánh tay 2 hôm nay.",
            "message_type": "text"
        }, headers=p_headers)
        assert r_msg1.status_code == 200
        msg1_data = r_msg1.json()
        assert msg1_data["sender_role"] == "patient"
        assert "mẩn ngứa" in msg1_data["content"]

        # 5. Patient sends image attachment (Base64)
        mock_image_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00"
        b64_str = "data:image/jpeg;base64," + base64.b64encode(mock_image_bytes).decode("utf-8")
        r_msg2 = c.post(f"/api/v1/telehealth/sessions/{appt_id}/messages", json={
            "content": "Ảnh vùng da bị phát ban",
            "message_type": "image",
            "file_name": "vet_phat_ban.jpg",
            "file_data": b64_str
        }, headers=p_headers)
        assert r_msg2.status_code == 200
        msg2_data = r_msg2.json()
        assert msg2_data["message_type"] == "image"
        assert msg2_data["file_url"].startswith("/uploads/")

        # 6. Doctor views all messages in session
        r_list = c.get(f"/api/v1/telehealth/sessions/{appt_id}/messages", headers=d_headers)
        assert r_list.status_code == 200
        all_msgs = r_list.json()
        assert len(all_msgs) >= 2
        assert any(m["message_type"] == "image" for m in all_msgs)

        # 7. Doctor replies with advice & file
        r_msg3 = c.post(f"/api/v1/telehealth/sessions/{appt_id}/messages", json={
            "content": "Bác sĩ đã xem ảnh, đây là viêm da tiếp xúc dị ứng. Bạn bôi kem dưỡng ẩm và tránh gãi.",
            "message_type": "text"
        }, headers=d_headers)
        assert r_msg3.status_code == 200
        assert r_msg3.json()["sender_role"] == "doctor"
