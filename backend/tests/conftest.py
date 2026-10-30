import os
import pytest
from app.db import Base, engine, SessionLocal
from app.models import User, Department, DoctorShift, Appointment, ClinicalRecord, PrescriptionRef, Payment, PatientConsent, OtpCode
from app.security import hash_password

@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Reset all tables before each test
    db.query(PatientConsent).delete()
    db.query(PrescriptionRef).delete()
    db.query(ClinicalRecord).delete()
    db.query(Payment).delete()
    db.query(Appointment).delete()
    db.query(DoctorShift).delete()
    db.query(Department).delete()
    db.query(OtpCode).delete()
    db.query(User).delete()
    db.commit()

    # Seed default standard test users
    dept = Department(code="K01", name="Khoa Nội Tổng Quát", description="Khoa Nội")
    db.add(dept)
    db.commit()

    patient = User(
        email="patient@example.test",
        phone_number="0912345678",
        full_name="Demo Patient",
        role="patient",
        bhyt_code="GD4797931812345",
        password_hash=hash_password("ChangeMe123!"),
        external_patient_id="DEMO-P001"
    )
    doctor = User(
        email="doctor@example.test",
        phone_number="0987654321",
        full_name="Demo Doctor",
        role="doctor",
        doctor_cchn="008912/BYT-CCHN",
        department_id=dept.id,
        password_hash=hash_password("ChangeMe123!")
    )
    admin = User(
        email="admin@example.test",
        phone_number="0909090909",
        full_name="Demo Admin",
        role="admin",
        password_hash=hash_password("ChangeMe123!")
    )
    db.add_all([patient, doctor, admin])
    db.commit()
    
    # Add default shift
    shift = DoctorShift(
        doctor_id=doctor.id,
        department_id=dept.id,
        shift_date="2026-10-31",
        shift_type="morning",
        start_time="07:30",
        end_time="11:30",
        max_patients=12,
        booked_count=2
    )
    db.add(shift)
    db.commit()
    db.close()
    
    yield
