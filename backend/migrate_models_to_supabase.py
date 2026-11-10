import sys
import os
import json
import httpx
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db import Base
import app.models as models
from app.security import hash_password

SUPABASE_HOST = "72.61.123.73"
SUPABASE_PORT = 5432
SUPABASE_USER = "postgres"
SUPABASE_PASS = "tobklteb61gqvbz0adpsyurqmkun1tir"

SUPABASE_API_URL = "https://supabase-supabase-7c4fe6-72-61-123-73.sslip.io"
SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjIxMDY3MTU4MjksImlhdCI6MTc5MTM1NTgyOSwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlzcyI6InN1cGFiYXNlIn0.V3vdSFKXr9uLlYG0QLUYnjtug8AKKoLt6NL_vZCPRxk"

DATABASES_TO_PROVISION = ["telemedicine", "postgres"]

REQUIRED_BUCKETS = [
    {"id": "telemedicine-records", "name": "telemedicine-records", "public": True},
    {"id": "medical-documents", "name": "medical-documents", "public": True},
    {"id": "pacs-dicom", "name": "pacs-dicom", "public": True},
    {"id": "avatars", "name": "avatars", "public": True},
]


try:
    import psycopg
    PG_DRIVER = "postgresql+psycopg"
except ImportError:
    PG_DRIVER = "postgresql+psycopg2"


def ensure_database_exists():
    admin_url = f"{PG_DRIVER}://{SUPABASE_USER}:{SUPABASE_PASS}@{SUPABASE_HOST}:{SUPABASE_PORT}/postgres"
    engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)
    with engine.connect() as conn:
        for db_name in DATABASES_TO_PROVISION:
            res = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :d"), {"d": db_name}).fetchone()
            if not res:
                print(f"[DB] Creating database '{db_name}'...")
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
            else:
                print(f"[DB] Database '{db_name}' exists.")
    engine.dispose()


def run_column_migrations(engine):
    dt_type = "TIMESTAMP WITH TIME ZONE"
    alter_statements = [
        # appointments
        ("appointments", "triage_status", "VARCHAR(30) DEFAULT 'pending'"),
        ("appointments", "triage_level", "VARCHAR(20) DEFAULT 'normal'"),
        ("appointments", "pulse", "INTEGER"),
        ("appointments", "blood_pressure", "VARCHAR(20)"),
        ("appointments", "temperature", "FLOAT"),
        ("appointments", "spo2", "INTEGER"),
        ("appointments", "weight", "FLOAT"),
        ("appointments", "height", "FLOAT"),
        ("appointments", "blood_glucose", "FLOAT"),
        ("appointments", "glucose_context", "VARCHAR(30)"),
        ("appointments", "bmi", "FLOAT"),
        ("appointments", "his_encounter_id", "VARCHAR(60)"),
        ("appointments", "his_synced_at", dt_type),
        ("appointments", "refund_status", "VARCHAR(30)"),
        ("appointments", "bank_name", "VARCHAR(50)"),
        ("appointments", "bank_account", "VARCHAR(50)"),
        ("appointments", "account_holder_name", "VARCHAR(150)"),
        ("appointments", "refund_requested_at", dt_type),
        ("appointments", "refunded_at", dt_type),
        ("appointments", "triage_notes", "TEXT"),
        ("appointments", "triaged_by", "INTEGER"),
        ("appointments", "triaged_at", dt_type),
        ("appointments", "waiting_room_entered_at", dt_type),
        ("appointments", "waiting_room_called_at", dt_type),
        ("appointments", "family_member_id", "INTEGER"),
        ("appointments", "bhyt_code", "VARCHAR(30)"),
        ("appointments", "bhyt_rate", "INTEGER DEFAULT 0"),
        ("appointments", "bhyt_discount", "INTEGER DEFAULT 0"),
        ("appointments", "patient_pay_amount", "INTEGER DEFAULT 0"),
        ("appointments", "nurse_id", "INTEGER"),
        ("appointments", "nurse_shift_id", "INTEGER"),
        ("appointments", "encounter_code", "VARCHAR(60)"),
        ("appointments", "hospital_code", "VARCHAR(100) DEFAULT '79014 (GLN: 8938500000018)'"),
        ("appointments", "patient_category", "VARCHAR(60) DEFAULT 'Bảo hiểm y tế'"),
        ("appointments", "payment_source", "VARCHAR(60) DEFAULT 'Quỹ Bảo hiểm y tế'"),
        ("appointments", "companion_name", "VARCHAR(150)"),
        ("appointments", "companion_id_card", "VARCHAR(30)"),
        ("appointments", "companion_phone", "VARCHAR(30)"),
        ("appointments", "companion_relationship", "VARCHAR(50)"),
        # users
        ("users", "date_of_birth", "VARCHAR(30)"),
        ("users", "gender", "VARCHAR(20)"),
        ("users", "identity_card", "VARCHAR(30)"),
        ("users", "address", "VARCHAR(300)"),
        ("users", "province_code", "VARCHAR(20)"),
        ("users", "district_code", "VARCHAR(20)"),
        ("users", "ward_code", "VARCHAR(20)"),
        ("users", "ethnicity", "VARCHAR(50)"),
        ("users", "blood_type", "VARCHAR(10)"),
        ("users", "allergies", "VARCHAR(300)"),
        ("users", "emergency_contact_name", "VARCHAR(150)"),
        ("users", "emergency_contact_phone", "VARCHAR(30)"),
        ("users", "companion_name", "VARCHAR(150)"),
        ("users", "companion_id_card", "VARCHAR(30)"),
        ("users", "companion_phone", "VARCHAR(30)"),
        ("users", "companion_relationship", "VARCHAR(50)"),
        ("users", "has_medical_history", "BOOLEAN DEFAULT FALSE"),
        ("users", "medical_history_icd10", "VARCHAR(300)"),
        ("users", "medical_history_notes", "TEXT"),
        ("users", "family_history_icd10", "VARCHAR(300)"),
        ("users", "family_history_notes", "TEXT"),
        ("users", "epidemiological_history", "TEXT"),
        ("users", "avatar_url", "TEXT"),
        ("users", "height", "FLOAT"),
        ("users", "weight", "FLOAT"),
        ("users", "blood_pressure", "VARCHAR(30)"),
        ("users", "heart_rate", "INTEGER"),
        ("users", "temperature", "FLOAT"),
        ("users", "spo2", "INTEGER"),
        ("users", "blood_glucose", "FLOAT"),
        ("users", "last_his_sync_at", dt_type),
        ("users", "academic_title", "VARCHAR(100) DEFAULT 'BS.CKII'"),
        ("users", "specialty", "VARCHAR(200) DEFAULT 'Nội Tổng Quát & Tim Mạch Chuyển Hóa'"),
        ("users", "bio", "TEXT"),
        ("users", "work_room", "VARCHAR(150) DEFAULT 'Phòng 308 - Khu Khám Quốc tế CareConnect'"),
        ("users", "smartca_serial", "VARCHAR(100) DEFAULT '5404B6789A120EFA'"),
        ("users", "smartca_provider", "VARCHAR(100) DEFAULT 'VNPT SmartCA (Level 4)'"),
        ("users", "consult_duration", "INTEGER DEFAULT 30"),
        ("users", "max_patients_per_shift", "INTEGER DEFAULT 12"),
        # doctor_shifts
        ("doctor_shifts", "clinic_room_id", "INTEGER"),
        ("doctor_shifts", "room_name", "VARCHAR(150) DEFAULT 'Phòng khám Telemedicine #01'"),
        ("doctor_shifts", "notes", "TEXT"),
        ("doctor_shifts", "created_at", dt_type),
        # rpm_vital_logs
        ("rpm_vital_logs", "blood_pressure", "VARCHAR(30)"),
        ("rpm_vital_logs", "heart_rate", "INTEGER"),
        ("rpm_vital_logs", "spo2", "INTEGER"),
        ("rpm_vital_logs", "height_cm", "FLOAT"),
        ("rpm_vital_logs", "bmi", "FLOAT"),
        ("rpm_vital_logs", "bp_mean", "FLOAT"),
        ("rpm_vital_logs", "battery_level", "INTEGER"),
        ("rpm_vital_logs", "steps", "INTEGER"),
        ("rpm_vital_logs", "sleep_hours", "FLOAT"),
        # payments
        ("payments", "account_holder_name", "VARCHAR(150)"),
        ("payments", "refund_reason", "TEXT"),
        ("payments", "refund_requested_at", dt_type),
        ("payments", "refunded_at", dt_type),
        # family_member_profiles
        ("family_member_profiles", "avatar_url", "TEXT"),
        ("family_member_profiles", "ethnicity", "VARCHAR(50)"),
        ("family_member_profiles", "address", "VARCHAR(300)"),
        ("family_member_profiles", "province_code", "VARCHAR(20)"),
        ("family_member_profiles", "district_code", "VARCHAR(20)"),
        ("family_member_profiles", "ward_code", "VARCHAR(20)"),
        ("family_member_profiles", "companion_name", "VARCHAR(150)"),
        ("family_member_profiles", "companion_id_card", "VARCHAR(30)"),
        ("family_member_profiles", "companion_phone", "VARCHAR(30)"),
        ("family_member_profiles", "companion_relationship", "VARCHAR(50)"),
        ("family_member_profiles", "has_medical_history", "BOOLEAN DEFAULT FALSE"),
        ("family_member_profiles", "medical_history_icd10", "VARCHAR(300)"),
        ("family_member_profiles", "medical_history_notes", "TEXT"),
        ("family_member_profiles", "family_history_icd10", "VARCHAR(300)"),
        ("family_member_profiles", "family_history_notes", "TEXT"),
        ("family_member_profiles", "epidemiological_history", "TEXT"),
        ("family_member_profiles", "height", "FLOAT"),
        ("family_member_profiles", "weight", "FLOAT"),
        # appointment_documents
        ("appointment_documents", "patient_id", "INTEGER"),
        # clinical_records
        ("clinical_records", "clinical_examination", "TEXT"),
        ("clinical_records", "paraclinical_results", "TEXT"),
        ("clinical_records", "treatment_regimen", "TEXT"),
        ("clinical_records", "clinical_evolution", "TEXT"),
        ("clinical_records", "medical_services_used", "TEXT"),
        # audit_logs & notifications
        ("audit_logs", "notes", "TEXT"),
        ("notifications", "type", "VARCHAR(50) DEFAULT 'system'"),
    ]

    with engine.connect() as conn:
        for table_name, col_name, col_type in alter_statements:
            try:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                conn.commit()
            except Exception as e:
                conn.rollback()


def initialize_production_data(engine, db_name: str):
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        # 1. Purge any leftover demo/mock records
        mock_devices = [
            "Omron HEM-7600T Smart BP",
            "Omron HEM-7600T Smart Bluetooth",
            "Accu-Chek Guide Wireless",
            "Roche Accu-Chek Guide Me (FDA K181803)",
            "A&D Medical UA-651BLE (FDA K140683)",
            "Withings BPM Connect (Wi-Fi)",
            "CareConnect Camera PPG Bio-Sensor",
            "Wellue O2Ring Continuous SpO2"
        ]
        db.query(models.RPMVitalLog).filter(models.RPMVitalLog.device_name.in_(mock_devices)).delete(synchronize_session=False)

        demo_family_names = ["Nguyễn Minh Khang (Con trai)", "Trần Thị Lan (Mẹ ruột)", "Nguyễn Hoàng Nam (Em trai)"]
        demo_family_bhyts = ["TE1797931800123", "HT2797931800889", "DN4797931888999"]
        db.query(models.FamilyMemberProfile).filter(
            (models.FamilyMemberProfile.full_name.in_(demo_family_names)) |
            (models.FamilyMemberProfile.bhyt_code.in_(demo_family_bhyts))
        ).delete(synchronize_session=False)

        demo_med_dates = ["2026-10-20", "2026-10-15", "2026-10-04"]
        demo_med_names = ["Micardis 40mg", "Lipitor 20mg", "Glucophage XR 500mg", "Panadol Extra (Đỏ)"]
        db.query(models.PatientCabinetItem).filter(
            models.PatientCabinetItem.name.in_(demo_med_names),
            models.PatientCabinetItem.start_date.in_(demo_med_dates)
        ).delete(synchronize_session=False)

        demo_tickets = db.query(models.SupportTicket).filter(
            (models.SupportTicket.code.in_(["REQ-2026-092", "REQ-2026-088"])) |
            (models.SupportTicket.patient_name.in_(["Demo Patient (BN #9)", "Phan Hoàng Phúc"]))
        ).all()
        if demo_tickets:
            demo_t_ids = [t.id for t in demo_tickets]
            db.query(models.SupportTicketMessage).filter(models.SupportTicketMessage.ticket_id.in_(demo_t_ids)).delete(synchronize_session=False)
            db.query(models.SupportTicket).filter(models.SupportTicket.id.in_(demo_t_ids)).delete(synchronize_session=False)

        db.query(models.Notification).filter(
            (models.Notification.message.like("%Phan Hoàng Phúc%")) |
            (models.Notification.message.like("%Bệnh nhân test%")) |
            (models.Notification.message.like("%Mã DT-2026-9881%")) |
            (models.Notification.message.like("%HbA1c 8.2%%")) |
            (models.Notification.message.like("%Clopidogrel và Omeprazole%")) |
            (models.Notification.message.like("%Trần Minh Tuấn%"))
        ).delete(synchronize_session=False)

        demo_patients = db.query(models.User).filter(
            (models.User.email.in_(["patient@example.test", "0988776655@phone.careconnect.local", "test@gmail.com", "hoa@gmail.com"])) |
            (models.User.phone_number.in_(["0988776655", "0933413486", "0900000001"])) |
            (models.User.external_patient_id == "PAT-001") |
            (models.User.full_name.in_(["Phan Hoàng Phúc", "Bệnh nhân test", "Demo Patient"]))
        ).all()
        for dp in demo_patients:
            demo_appts = db.query(models.Appointment).filter(models.Appointment.patient_id == dp.id).all()
            for da in demo_appts:
                db.query(models.ClinicalRecord).filter(models.ClinicalRecord.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.PrescriptionRef).filter(models.PrescriptionRef.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.Payment).filter(models.Payment.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.PatientConsent).filter(models.PatientConsent.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.TelehealthSession).filter(models.TelehealthSession.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.AppointmentEvent).filter(models.AppointmentEvent.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.AppointmentDocument).filter(models.AppointmentDocument.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.AIPACSConsultation).filter(models.AIPACSConsultation.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.BHYTClaim).filter(models.BHYTClaim.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.ConsultationMessage).filter(models.ConsultationMessage.appointment_id == da.id).delete(synchronize_session=False)
                db.query(models.ConsultationMember).filter(models.ConsultationMember.appointment_id == da.id).delete(synchronize_session=False)
                db.delete(da)
            db.query(models.RPMVitalLog).filter(models.RPMVitalLog.patient_id == dp.id).delete(synchronize_session=False)
            db.query(models.PatientCabinetItem).filter(models.PatientCabinetItem.patient_id == dp.id).delete(synchronize_session=False)
            db.query(models.FamilyMemberProfile).filter(models.FamilyMemberProfile.owner_user_id == dp.id).delete(synchronize_session=False)
            db.query(models.AuditLog).filter(models.AuditLog.actor_user_id == dp.id).delete(synchronize_session=False)
            db.query(models.Notification).filter(models.Notification.user_id == dp.id).delete(synchronize_session=False)
            db.query(models.PatientConsent).filter(models.PatientConsent.user_id == dp.id).delete(synchronize_session=False)
            db.query(models.ConsultationMessage).filter(models.ConsultationMessage.sender_id == dp.id).delete(synchronize_session=False)
            db.query(models.AppointmentEvent).filter(models.AppointmentEvent.actor_id == dp.id).delete(synchronize_session=False)
            db.query(models.AppointmentDocument).filter(
                (models.AppointmentDocument.uploaded_by == dp.id) |
                (models.AppointmentDocument.patient_id == dp.id)
            ).delete(synchronize_session=False)
            db.query(models.BHYTClaim).filter(models.BHYTClaim.patient_id == dp.id).delete(synchronize_session=False)
            db.query(models.LabTestReport).filter(models.LabTestReport.patient_id == dp.id).delete(synchronize_session=False)
            db.query(models.PacsDicomStudy).filter(models.PacsDicomStudy.patient_id == dp.id).delete(synchronize_session=False)
            db.query(models.PatientMedicalDevice).filter(models.PatientMedicalDevice.patient_id == dp.id).delete(synchronize_session=False)
            db.query(models.MedicationDoseLog).filter(models.MedicationDoseLog.patient_id == dp.id).delete(synchronize_session=False)
            db.delete(dp)
        db.commit()

        # 2. Initialize Departments
        if db.query(models.Department).count() == 0:
            db.add_all([
                models.Department(code="K01", name="Khoa Nội Tổng Quát", description="Khám và điều trị các bệnh lý nội khoa người lớn"),
                models.Department(code="K02", name="Khoa Nhi", description="Chăm sóc sức khỏe và khám bệnh chuyên sâu cho trẻ em"),
                models.Department(code="K03", name="Khoa Da Liễu", description="Khám và điều trị viêm da cơ địa, dị ứng, mụn trứng cá, bệnh ngoài da"),
                models.Department(code="K04", name="Khoa Tai Mũi Họng", description="Khám nội soi viêm họng, viêm amidan, viêm xoang, thanh quản"),
                models.Department(code="K05", name="Khoa Tâm Thần & Tâm Lý Lâm Sàng", description="Tư vấn stress, rối loạn lo âu, mất ngủ, trầm cảm từ xa"),
                models.Department(code="K06", name="Khoa Tim Mạch", description="Quản lý tăng huyết áp, rối loạn mỡ máu, theo dõi bệnh tim mạn tính")
            ])
            db.commit()

        # 3. Initialize Staff Accounts (Doctor, Admin, Nurse)
        dept_internal = db.query(models.Department).filter_by(code="K01").first()
        dept_id = dept_internal.id if dept_internal else None

        staff_seeds = [
            {
                "email": "doctor@example.test",
                "phone_number": "0987654321",
                "full_name": "BS.CKII Trần Minh",
                "role": "doctor",
                "doctor_cchn": "008912/BYT-CCHN",
                "department_id": dept_id,
            },
            {
                "email": "admin@example.test",
                "phone_number": "0909090909",
                "full_name": "Quản trị CareConnect",
                "role": "admin",
                "doctor_cchn": None,
                "department_id": None,
            },
            {
                "email": "nurse@example.test",
                "phone_number": "0977665544",
                "full_name": "ĐD. Nguyễn Thị Mai",
                "role": "nurse",
                "doctor_cchn": None,
                "department_id": dept_id,
            },
        ]
        for s in staff_seeds:
            existing = db.query(models.User).filter_by(email=s["email"]).first()
            if not existing:
                db.add(models.User(
                    email=s["email"],
                    phone_number=s["phone_number"],
                    full_name=s["full_name"],
                    role=s["role"],
                    doctor_cchn=s["doctor_cchn"],
                    department_id=s["department_id"],
                    password_hash=hash_password("ChangeMe123!")
                ))
            else:
                if existing.full_name in ("Demo Admin", "Demo Doctor", "Demo Nurse"):
                    existing.full_name = s["full_name"]
        db.commit()

        # 4. Initialize Clinic Rooms
        if db.query(models.ClinicRoom).count() == 0:
            k01 = db.query(models.Department).filter_by(code="K01").first()
            k02 = db.query(models.Department).filter_by(code="K02").first()
            k06 = db.query(models.Department).filter_by(code="K06").first()
            doctor = db.query(models.User).filter_by(role="doctor").first()
            doc_id = doctor.id if doctor else None

            db.add_all([
                models.ClinicRoom(
                    room_code="PK-TELE-01",
                    name="Phòng khám Telemedicine #01 (Khoa Nội)",
                    department_id=k01.id if k01 else None,
                    room_type="telemedicine",
                    location="Tầng 3 - Trung tâm Khám từ xa",
                    doctor_in_charge_id=doc_id,
                    capacity_per_shift=16,
                    telehealth_station_enabled=True,
                    equipment_list="LiveKit Video Station 4K, Ống nghe số Littmann CORE, Monitor sinh hiệu 5 thông số",
                    status="active",
                    notes="Chuyên khám và tư vấn Nội tổng quát qua truyền hình y tế độ phân giải cao"
                ),
                models.ClinicRoom(
                    room_code="PK-TELE-02",
                    name="Phòng khám Telemedicine #02 (Khoa Tim Mạch)",
                    department_id=k06.id if k06 else None,
                    room_type="telemedicine",
                    location="Tầng 3 - Trung tâm Khám từ xa",
                    doctor_in_charge_id=doc_id,
                    capacity_per_shift=14,
                    telehealth_station_enabled=True,
                    equipment_list="LiveKit Video Station, Máy đo ECG 12 chuyển đạo, Holter huyết áp không dây",
                    status="active",
                    notes="Phòng chuyên gia Tim mạch & Tăng huyết áp từ xa"
                ),
                models.ClinicRoom(
                    room_code="PK-NOI-101",
                    name="Buồng khám Nội tổng quát 101",
                    department_id=k01.id if k01 else None,
                    room_type="outpatient",
                    location="Tầng 1 - Khu A (Nhà Khám bệnh)",
                    doctor_in_charge_id=doc_id,
                    capacity_per_shift=20,
                    telehealth_station_enabled=False,
                    equipment_list="Bàn khám tiêu chuẩn, Máy đo huyết áp thủy ngân, Đèn khám họng",
                    status="active",
                    notes="Phòng khám lâm sàng trực tiếp ngoại trú"
                ),
                models.ClinicRoom(
                    room_code="PK-NHI-201",
                    name="Phòng khám Nhi Đồng 201",
                    department_id=k02.id if k02 else None,
                    room_type="telemedicine",
                    location="Tầng 2 - Khối Nhi Khoa",
                    doctor_in_charge_id=None,
                    capacity_per_shift=18,
                    telehealth_station_enabled=True,
                    equipment_list="Webcam 4K, Cân điện tử sơ sinh, Nhiệt kế hồng ngoại đo trán",
                    status="active",
                    notes="Tư vấn và khám bệnh nhi khoa từ xa thân thiện với trẻ"
                ),
                models.ClinicRoom(
                    room_code="PK-TRIAGE-01",
                    name="Bàn Tiếp đón & Sàng lọc Triage 01",
                    department_id=k01.id if k01 else None,
                    room_type="emergency",
                    location="Sảnh chính Tầng trệt",
                    doctor_in_charge_id=None,
                    capacity_per_shift=35,
                    telehealth_station_enabled=True,
                    equipment_list="Máy đo huyết áp Omron BLE, Máy đo đường huyết Accu-Chek, Máy đo SpO2 kẹp ngón, Đầu đọc CCCD Chip",
                    status="active",
                    notes="Tiếp đón, đo sinh hiệu ban đầu và phân luồng cấp cứu / phòng khám"
                ),
                models.ClinicRoom(
                    room_code="PK-CLS-301",
                    name="Phòng Hội chẩn Cận lâm sàng & PACS",
                    department_id=k01.id if k01 else None,
                    room_type="paraclinical",
                    location="Tầng 3 - Khu Công nghệ cao",
                    doctor_in_charge_id=doc_id,
                    capacity_per_shift=10,
                    telehealth_station_enabled=True,
                    equipment_list="Màn hình chẩn đoán Barco 12MP, Trạm AI MedGemma 3 DICOM Reader, Trạm đọc X-quang/CT",
                    status="active",
                    notes="Phòng đọc phim và hội chẩn đa chuyên khoa trực tuyến"
                )
            ])
            db.commit()

        # 5. Initialize Core System Settings
        default_settings = [
            ("hospital_name", "Bệnh viện Đa khoa Quốc tế CareConnect", "Tên cơ sở khám chữa bệnh"),
            ("hospital_code", "79014", "Mã cơ sở KCB BHYT"),
            ("hospital_address", "Số 125 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh", "Địa chỉ bệnh viện"),
            ("hospital_hotline", "1900 6886", "Tổng đài hỗ trợ y tế 24/7"),
            ("national_prescription_url", "https://donthuocquocgia.vn", "Cổng Đơn thuốc Quốc gia Bộ Y tế"),
            ("smartca_provider", "VNPT SmartCA", "Nhà cung cấp Chữ ký số từ xa"),
            ("coturn_host", "turn.medicalcenter.vn", "Máy chủ TURN/STUN WebRTC"),
            ("coturn_port", "3478", "Cổng TURN/STUN"),
            ("coturn_realm", "medicalcenter.vn", "Realm chứng thực WebRTC"),
            ("sms_provider", "vietguys", "Nhà cung cấp SMS Brandname / Zalo ZNS"),
            ("sms_brandname", "CARECONNECT", "Tên định danh SMS Brandname"),
            ("allow_test_otp", "false", "Tắt mã OTP mẫu trong môi trường chạy thật"),
            ("ai_mode", "auto", "Chế độ vận hành AI Lâm sàng (MedGemma 3 / Gemini)"),
        ]
        for k, v, desc in default_settings:
            row = db.query(models.SystemSetting).filter_by(key=k).first()
            if not row:
                db.add(models.SystemSetting(key=k, value=v, description=desc))
        db.commit()
    finally:
        db.close()


def provision_storage_buckets():
    print("\n=== PROVISIONING SUPABASE STORAGE BUCKETS ===")
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json"
    }
    try:
        with httpx.Client(timeout=20.0, verify=False) as client:
            res = client.get(f"{SUPABASE_API_URL}/storage/v1/bucket", headers=headers)
            existing_buckets = []
            if res.status_code == 200:
                existing_buckets = [b.get("id") for b in res.json()]
                print(f"Existing Storage Buckets: {existing_buckets}")
            else:
                print(f"Bucket list returned {res.status_code}: {res.text}")

            for b in REQUIRED_BUCKETS:
                if b["id"] not in existing_buckets:
                    create_res = client.post(
                        f"{SUPABASE_API_URL}/storage/v1/bucket",
                        headers=headers,
                        json=b
                    )
                    print(f"  + Created bucket '{b['id']}': HTTP {create_res.status_code} ({create_res.text})")
                else:
                    print(f"  ✓ Bucket '{b['id']}' already exists (public={b['public']})")
    except Exception as e:
        print(f"Warning checking storage buckets: {e}")


def main():
    ensure_database_exists()

    for db_name in DATABASES_TO_PROVISION:
        print(f"\n=======================================================")
        print(f"PROVISIONING SUPABASE DATABASE: '{db_name}'")
        print(f"=======================================================")
        pg_url = f"{PG_DRIVER}://{SUPABASE_USER}:{SUPABASE_PASS}@{SUPABASE_HOST}:{SUPABASE_PORT}/{db_name}"
        engine = create_engine(pg_url, pool_pre_ping=True)

        Base.metadata.create_all(bind=engine)
        run_column_migrations(engine)
        initialize_production_data(engine, db_name)

        with engine.connect() as conn:
            res = conn.execute(text("""
                SELECT t.table_name,
                       (SELECT count(*) FROM information_schema.columns c
                        WHERE c.table_schema = 'public' AND c.table_name = t.table_name) AS col_count
                FROM information_schema.tables t
                WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_name;
            """))
            tables = res.fetchall()
            print(f"Total tables in '{db_name}' ({len(tables)}):")
            for t_name, col_count in tables:
                try:
                    cnt = conn.execute(text(f'SELECT count(*) FROM "{t_name}"')).scalar()
                except Exception:
                    cnt = -1
                print(f"  - {t_name:<30} | columns: {col_count:<3} | rows: {cnt}")
        engine.dispose()

    provision_storage_buckets()
    print("\n✅ Self-Hosted Supabase Database & Storage Provisioning Complete!")


if __name__ == "__main__":
    main()
