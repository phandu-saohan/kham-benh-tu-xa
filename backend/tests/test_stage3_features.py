import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app
from app.db import SessionLocal
from app.models import User, Appointment, Department, DoctorShift
from app.security import create_access_token

client = TestClient(app)

def test_ai_ambient_scribe():
    db = SessionLocal()
    doctor = db.query(User).filter_by(role="doctor").first()
    token = create_access_token(doctor)
    db.close()
    
    dialog = (
        "Bác sĩ: Chào anh, hôm nay anh cảm thấy thế nào?\n"
        "Bệnh nhân: Dạ chào bác sĩ, tôi bị sốt 38.5 độ từ 2 hôm nay, ho nhiều có đờm và đau rát cổ họng, người uể oải mệt mỏi lắm."
    )
    
    res = client.post(
        "/api/v1/ai/ambient-scribe",
        json={"transcript": dialog, "patient_name": "Nguyễn Văn S3", "patient_age": 40},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "soap" in data
    assert "subjective" in data["soap"]
    assert "objective" in data["soap"]
    assert "assessment" in data["soap"]
    assert "plan" in data["soap"]
    assert data["suggested_icd10_code"].startswith("J")  # Nhóm bệnh hô hấp ICD-10
    assert "prescription_draft" in data

def test_bhyt_insurance_lookup_and_apply():
    db = SessionLocal()
    patient = db.query(User).filter_by(role="patient").first()
    doctor = db.query(User).filter_by(role="doctor").first()
    token = create_access_token(patient)
    
    # 1. Tra cứu quyền lợi thẻ BHYT
    res_check = client.post(
        "/api/v1/insurance/bhyt/check",
        json={"bhyt_code": "GD4797931812345", "patient_name": patient.full_name},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_check.status_code == 200
    check_data = res_check.json()
    assert check_data["is_valid"] is True
    assert check_data["benefit_rate_percent"] == 80
    assert "TP. Hồ Chí Minh" in check_data["primary_healthcare_facility"]
    
    # 2. Tạo lịch hẹn và áp dụng thẻ BHYT
    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        starts_at=datetime.now(timezone.utc),
        reason="Khám BHYT từ xa",
        fee_amount=500000
    )
    db.add(appt)
    db.commit()
    appt_id = appt.id
    db.close()
    
    res_apply = client.post(
        f"/api/v1/appointments/{appt_id}/apply-bhyt",
        json={"bhyt_code": "GD4797931812345"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_apply.status_code == 200
    apply_data = res_apply.json()
    assert apply_data["success"] is True
    assert apply_data["benefit_rate_percent"] == 80
    assert apply_data["bhyt_discount"] == 400000  # 80% của 500,000 VND
    assert apply_data["patient_pay_amount"] == 100000  # Đồng chi trả 20%

def test_departments_and_doctor_shifts_quota():
    db = SessionLocal()
    doctor = db.query(User).filter_by(role="doctor").first()
    db.close()
    
    # 1. Danh sách Khoa/Phòng
    res_depts = client.get("/api/v1/departments")
    assert res_depts.status_code == 200
    depts = res_depts.json()
    assert len(depts) >= 1
    assert depts[0]["code"] == "K01"
    
    # 2. Ca trực bác sĩ kèm Anti-overload quota
    res_shifts = client.get(f"/api/v1/doctors/{doctor.id}/shifts")
    assert res_shifts.status_code == 200
    shifts = res_shifts.json()
    assert len(shifts) >= 1
    s = shifts[0]
    assert s["max_patients"] == 12
    assert s["booked_count"] == 2
    assert s["available_slots"] == 10
    assert s["is_overloaded"] is False

def test_appointment_cancellation_and_refund():
    db = SessionLocal()
    patient = db.query(User).filter_by(role="patient").first()
    doctor = db.query(User).filter_by(role="doctor").first()
    token = create_access_token(patient)
    
    appt = Appointment(
        patient_id=patient.id,
        doctor_id=doctor.id,
        starts_at=datetime.now(timezone.utc),
        reason="Hẹn tái khám nhưng bận việc đột xuất",
        fee_amount=300000,
        status="confirmed"
    )
    db.add(appt)
    db.commit()
    appt_id = appt.id
    db.close()
    
    res = client.post(
        f"/api/v1/appointments/{appt_id}/cancel",
        json={"reason": "Bệnh nhân có lịch công tác khẩn cấp"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["status"] == "cancelled"
    assert "hoàn trả" in data["message"].lower()
