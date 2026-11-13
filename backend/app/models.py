from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Department(Base):
    __tablename__ = "departments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone_number: Mapped[str | None] = mapped_column(String(20), unique=True, index=True, nullable=True)
    full_name: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255))
    refresh_token: Mapped[str | None] = mapped_column(String(500), nullable=True)
    doctor_cchn: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Số Chứng chỉ hành nghề y tế
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    bhyt_code: Mapped[str | None] = mapped_column(String(30), nullable=True)  # Mã thẻ BHYT 15 ký tự
    external_patient_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(30), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    identity_card: Mapped[str | None] = mapped_column(String(30), nullable=True)  # Số CCCD 12 số
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    province_code: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Mã Tỉnh/Thành phố
    district_code: Mapped[str | None] = mapped_column(String(20), nullable=True)  # Mã Quận/Huyện
    ward_code: Mapped[str | None] = mapped_column(String(20), nullable=True)      # Mã Xã/Phường
    ethnicity: Mapped[str | None] = mapped_column(String(50), nullable=True)      # Dân tộc người bệnh
    blood_type: Mapped[str | None] = mapped_column(String(10), nullable=True)  # Nhóm máu A+, B+, O+...
    allergies: Mapped[str | None] = mapped_column(String(300), nullable=True)  # Tiền sử dị ứng
    emergency_contact_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    
    # Thông tin người đi cùng / Người giám hộ (cho trẻ em hoặc ca đặc biệt)
    companion_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    companion_id_card: Mapped[str | None] = mapped_column(String(30), nullable=True)
    companion_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    companion_relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Tiền sử sức khỏe & Dịch tễ (Quyết định 2682/QĐ-BYT)
    has_medical_history: Mapped[bool] = mapped_column(Boolean, default=False)
    medical_history_icd10: Mapped[str | None] = mapped_column(String(300), nullable=True)  # Mã ICD-10 phân cách dấu ;
    medical_history_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    family_history_icd10: Mapped[str | None] = mapped_column(String(300), nullable=True)   # ICD-10 di truyền / gia đình
    family_history_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    epidemiological_history: Mapped[str | None] = mapped_column(Text, nullable=True)       # Tiền sử dịch tễ (lao, truyền nhiễm...)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # Ảnh đại diện

    # Chỉ số sức khỏe & Sinh hiệu mới nhất
    height: Mapped[float | None] = mapped_column(Float, nullable=True)                      # Chiều cao (cm)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)                      # Cân nặng (kg)
    blood_pressure: Mapped[str | None] = mapped_column(String(30), nullable=True)          # Huyết áp (mmHg)
    heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)                 # Nhịp tim (bpm)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)                # Thân nhiệt (°C)
    spo2: Mapped[int | None] = mapped_column(Integer, nullable=True)                       # SpO2 (%)
    blood_glucose: Mapped[float | None] = mapped_column(Float, nullable=True)             # Đường huyết (mmol/L)
    last_his_sync_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True) # Mốc đồng bộ Bệnh án HIS/EMR

    # Thông tin chuyên môn & Thiết lập Bác sĩ (Doctor Subsystem)
    academic_title: Mapped[str | None] = mapped_column(String(100), default="BS.CKII", nullable=True) # Học hàm / Học vị
    specialty: Mapped[str | None] = mapped_column(String(200), default="Nội Tổng Quát & Tim Mạch Chuyển Hóa", nullable=True) # Chuyên khoa
    bio: Mapped[str | None] = mapped_column(Text, nullable=True) # Giới thiệu bác sĩ
    work_room: Mapped[str | None] = mapped_column(String(150), default="Phòng 308 - Khu Khám Quốc tế CareConnect", nullable=True)
    smartca_serial: Mapped[str | None] = mapped_column(String(100), default="5404B6789A120EFA", nullable=True) # Serial chứng thư số SmartCA
    smartca_provider: Mapped[str | None] = mapped_column(String(100), default="VNPT SmartCA (Level 4)", nullable=True) # Nhà cấp SmartCA
    consult_duration: Mapped[int | None] = mapped_column(Integer, default=30, nullable=True) # Thời lượng tư vấn tiêu chuẩn (phút)
    max_patients_per_shift: Mapped[int | None] = mapped_column(Integer, default=12, nullable=True) # Định mức ca tối đa

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class OtpCode(Base):
    __tablename__ = "otp_codes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phone_number: Mapped[str] = mapped_column(String(20), index=True)
    code: Mapped[str] = mapped_column(String(10))
    expires_at: Mapped[object] = mapped_column(DateTime(timezone=True))
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class PatientConsent(Base):
    __tablename__ = "patient_consents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    consent_version: Mapped[str] = mapped_column(String(30), default="2026.1-ND13")
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    consented_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ClinicRoom(Base):
    __tablename__ = "clinic_rooms"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    room_code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    room_type: Mapped[str] = mapped_column(String(50), default="telemedicine") # telemedicine, outpatient, emergency, inpatient, paraclinical
    location: Mapped[str | None] = mapped_column(String(200), default="Tầng 1 - Khu A")
    doctor_in_charge_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    capacity_per_shift: Mapped[int] = mapped_column(Integer, default=15)
    telehealth_station_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    equipment_list: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="active") # active, maintenance, closed
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class DoctorShift(Base):
    __tablename__ = "doctor_shifts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    clinic_room_id: Mapped[int | None] = mapped_column(ForeignKey("clinic_rooms.id"), nullable=True)
    shift_date: Mapped[str] = mapped_column(String(20), index=True) # YYYY-MM-DD
    shift_type: Mapped[str] = mapped_column(String(30)) # morning (07:30-11:30), afternoon (13:30-17:00), evening (18:00-21:00)
    start_time: Mapped[str] = mapped_column(String(10), default="07:30")
    end_time: Mapped[str] = mapped_column(String(10), default="11:30")
    max_patients: Mapped[int] = mapped_column(Integer, default=12) # Giới hạn chống quá tải
    booked_count: Mapped[int] = mapped_column(Integer, default=0)
    room_name: Mapped[str | None] = mapped_column(String(150), default="Phòng khám Telemedicine #07", nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class NurseShift(Base):
    __tablename__ = "nurse_shifts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nurse_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    shift_date: Mapped[str] = mapped_column(String(20), index=True) # YYYY-MM-DD
    shift_type: Mapped[str] = mapped_column(String(30)) # morning (07:00-11:30), afternoon (13:00-17:00), night (17:00-22:00)
    desk_name: Mapped[str] = mapped_column(String(100), default="Bàn Tiếp đón Triage 01")
    start_time: Mapped[str] = mapped_column(String(10), default="07:00")
    end_time: Mapped[str] = mapped_column(String(10), default="11:30")
    max_patients: Mapped[int] = mapped_column(Integer, default=30)
    attended_count: Mapped[int] = mapped_column(Integer, default=0)
    handover_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Appointment(Base):
    __tablename__ = "appointments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    shift_id: Mapped[int | None] = mapped_column(ForeignKey("doctor_shifts.id"), nullable=True)
    nurse_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    nurse_shift_id: Mapped[int | None] = mapped_column(ForeignKey("nurse_shifts.id"), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    starts_at: Mapped[object] = mapped_column(DateTime(timezone=True), index=True)
    reason: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(30), default="scheduled")
    fee_amount: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="VND")
    
    # BHYT & Bảo hiểm bảo lãnh
    bhyt_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    bhyt_rate: Mapped[int] = mapped_column(Integer, default=0) # Mức hưởng % (ví dụ 80)
    bhyt_discount: Mapped[int] = mapped_column(Integer, default=0) # Số tiền BHYT chi trả
    patient_pay_amount: Mapped[int] = mapped_column(Integer, default=0) # Tiền bệnh nhân đồng chi trả

    # Thông tin chung về lượt khám KCB (Quyết định 2682/QĐ-BYT)
    encounter_code: Mapped[str | None] = mapped_column(String(60), nullable=True) # Mã lượt khám quản lý
    hospital_code: Mapped[str | None] = mapped_column(String(100), default="79014 (GLN: 8938500000018)") # Mã cơ sở KCB & GLN
    patient_category: Mapped[str | None] = mapped_column(String(60), default="Bảo hiểm y tế") # Phân loại đối tượng người bệnh
    payment_source: Mapped[str | None] = mapped_column(String(60), default="Quỹ Bảo hiểm y tế") # Nguồn chi trả

    # Người đi cùng / Người giám hộ trong lượt khám
    companion_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    companion_id_card: Mapped[str | None] = mapped_column(String(30), nullable=True)
    companion_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    companion_relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)
    survey_responses: Mapped[str | None] = mapped_column(Text, nullable=True) # Câu hỏi & câu trả lời khảo sát AI đặt khám

    # Phân luồng & Sàng lọc Điều dưỡng (Triage Desk)
    triage_status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, assessed, dispatched
    triage_level: Mapped[str] = mapped_column(String(20), default="normal")    # normal (Xanh), priority (Vàng), emergency (Đỏ)
    pulse: Mapped[int | None] = mapped_column(Integer, nullable=True)          # Mạch (bpm)
    blood_pressure: Mapped[str | None] = mapped_column(String(20), nullable=True) # Huyết áp (mmHg)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)     # Thân nhiệt (°C)
    spo2: Mapped[int | None] = mapped_column(Integer, nullable=True)            # SpO2 (%)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)          # Cân nặng (kg)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)          # Chiều cao (cm)
    blood_glucose: Mapped[float | None] = mapped_column(Float, nullable=True)   # Đường huyết (mmol/L)
    glucose_context: Mapped[str | None] = mapped_column(String(30), nullable=True) # Lúc đói / sau ăn
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)              # Chỉ số khối cơ thể (BMI)
    his_encounter_id: Mapped[str | None] = mapped_column(String(60), nullable=True) # Mã đợt khám trên HIS/EMR
    his_synced_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True) # Mốc đồng bộ HIS
    triage_notes: Mapped[str | None] = mapped_column(Text, nullable=True)      # Nhận định sơ bộ điều dưỡng
    triaged_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    triaged_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    waiting_room_entered_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    waiting_room_called_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    paid_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refund_status: Mapped[str | None] = mapped_column(String(30), nullable=True) # "none", "requested", "completed", "rejected"
    refund_amount: Mapped[int] = mapped_column(Integer, default=0)
    refund_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    account_holder_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    refund_requested_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refunded_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class TelehealthSession(Base):
    __tablename__ = "telehealth_sessions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), unique=True)
    room_name: Mapped[str] = mapped_column(String(120), unique=True)
    status: Mapped[str] = mapped_column(String(30), default="created")
    called_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ClinicalRecord(Base):
    __tablename__ = "clinical_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    symptoms: Mapped[str | None] = mapped_column(Text, nullable=True) # Triệu chứng cơ năng
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True) # Tiền sử dị ứng
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    icd10_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    icd10_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    clinical_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    plan: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Hồ sơ bệnh án chuyên môn theo Luật Khám bệnh, chữa bệnh 2023 & Quyết định 2682/QĐ-BYT
    clinical_examination: Mapped[str | None] = mapped_column(Text, nullable=True) # Kết quả khám bệnh & thăm khám lâm sàng
    paraclinical_results: Mapped[str | None] = mapped_column(Text, nullable=True) # Kết quả cận lâm sàng, xét nghiệm & thăm dò chức năng
    treatment_regimen: Mapped[str | None] = mapped_column(Text, nullable=True)    # Phác đồ điều trị chi tiết
    clinical_evolution: Mapped[str | None] = mapped_column(Text, nullable=True)   # Quá trình diễn biến bệnh lý & chăm sóc
    medical_services_used: Mapped[str | None] = mapped_column(Text, nullable=True)# Danh mục thuốc, trang thiết bị y tế / dịch vụ đã dùng
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    locked_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Chữ ký số SmartCA
    digital_signature: Mapped[str | None] = mapped_column(Text, nullable=True)
    signed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    signer_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    signer_cchn: Mapped[str | None] = mapped_column(String(50), nullable=True)
    cert_serial: Mapped[str | None] = mapped_column(String(100), nullable=True)
    
    his_encounter_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class PrescriptionRef(Base):
    __tablename__ = "prescription_refs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    external_prescription_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Đồng bộ Đơn thuốc điện tử Quốc gia (donthuocquocgia.vn)
    national_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    national_qr_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    synced_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Payment(Base):
    __tablename__ = "payments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    amount: Mapped[int] = mapped_column(Integer)
    currency: Mapped[str] = mapped_column(String(3), default="VND")
    provider: Mapped[str] = mapped_column(String(40), default="vietqr")
    status: Mapped[str] = mapped_column(String(30), default="pending")
    provider_reference: Mapped[str | None] = mapped_column(String(200), nullable=True)
    qr_code_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    paid_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refund_status: Mapped[str | None] = mapped_column(String(30), nullable=True) # "none", "requested", "completed", "rejected"
    bank_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    account_holder_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    refund_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    refund_requested_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refunded_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class IntegrationJob(Base):
    __tablename__ = "integration_jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    system: Mapped[str] = mapped_column(String(30))
    operation: Mapped[str] = mapped_column(String(100))
    external_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="queued")
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(120))
    resource_type: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ConsultationMessage(Base):
    __tablename__ = "consultation_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    sender_role: Mapped[str] = mapped_column(String(30))  # "doctor" | "patient"
    sender_name: Mapped[str] = mapped_column(String(200))
    message_type: Mapped[str] = mapped_column(String(20), default="text")  # "text", "image", "file"
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class SystemSetting(Base):
    __tablename__ = "system_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    target_role: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "all", "patient", "doctor", "nurse", "admin"
    type: Mapped[str | None] = mapped_column(String(50), default="system", nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), default="system")  # "appointment", "prescription", "paraclinical", "ai_alert", "system", "payment"
    priority: Mapped[str] = mapped_column(String(20), default="normal")  # "urgent", "high", "normal", "info"
    action_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AppointmentEvent(Base):
    __tablename__ = "appointment_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    action: Mapped[str] = mapped_column(String(100))  # "create", "pay", "triage", "start_consultation", "prescribe", "sign", "complete", "cancel", "share_lab"
    from_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    to_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    actor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    actor_role: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class BHYTClaim(Base):
    __tablename__ = "bhyt_claims"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), unique=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    ma_lk: Mapped[str] = mapped_column(String(50), unique=True, index=True)  # Mã liên kết KCB BHYT
    ma_the_bhyt: Mapped[str] = mapped_column(String(30))  # 15 ký tự thẻ BHYT
    ma_dkbd: Mapped[str] = mapped_column(String(10), default="79014")  # Mã ĐK KCB ban đầu
    muc_huong: Mapped[int] = mapped_column(Integer, default=80)  # 80%, 95%, 100%
    ma_benh_chinh: Mapped[str] = mapped_column(String(20), default="I10")  # ICD-10
    ma_benh_kem: Mapped[str | None] = mapped_column(String(100), nullable=True)
    t_tongchi: Mapped[float] = mapped_column(Float, default=0.0)
    t_bntt: Mapped[float] = mapped_column(Float, default=0.0)  # Bệnh nhân cùng chi trả
    t_bhyttt: Mapped[float] = mapped_column(Float, default=0.0)  # Quỹ BHYT chi trả
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft, submitted, approved, rejected
    gdbhyt_code: Mapped[str | None] = mapped_column(String(100), nullable=True)  # Mã tiếp nhận cổng GĐBHYT
    xml1_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # Bảng 1: Tổng hợp chi phí
    xml2_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # Bảng 2: Thuốc tân dược / YHCT
    xml3_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # Bảng 3: Dịch vụ kỹ thuật
    xml4_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # Bảng 4: Cận lâm sàng
    xml5_payload: Mapped[str | None] = mapped_column(Text, nullable=True)  # Bảng 5: Diễn biến lâm sàng
    submitted_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ConsultationMember(Base):
    __tablename__ = "consultation_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    doctor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    doctor_name: Mapped[str] = mapped_column(String(200))
    hospital_name: Mapped[str] = mapped_column(String(255), default="Bệnh viện Bạch Mai - Tuyến Trung Ương")
    specialty: Mapped[str] = mapped_column(String(100))  # "Tim mạch can thiệp", "Hô hấp", "Nội tiết"
    role: Mapped[str] = mapped_column(String(30), default="specialist")  # host, specialist, secretary
    status: Mapped[str] = mapped_column(String(30), default="invited")  # invited, accepted, joined, declined
    clinical_opinion: Mapped[str | None] = mapped_column(Text, nullable=True)
    joined_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class RPMVitalLog(Base):
    __tablename__ = "rpm_vital_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    device_type: Mapped[str] = mapped_column(String(50))  # blood_pressure, blood_glucose, spo2, heart_rate, temperature, weight
    device_name: Mapped[str] = mapped_column(String(150))  # Omron HEM-7600T, Accu-Chek Guide, Wellue SpO2
    connection_method: Mapped[str] = mapped_column(String(50), default="bluetooth_ble")  # bluetooth_ble, manual, api_sync
    systolic: Mapped[int | None] = mapped_column(Integer, nullable=True)  # mmHg
    diastolic: Mapped[int | None] = mapped_column(Integer, nullable=True)  # mmHg
    blood_pressure: Mapped[str | None] = mapped_column(String(30), nullable=True) # "120/80"
    pulse: Mapped[int | None] = mapped_column(Integer, nullable=True)  # bpm
    heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)  # bpm (đồng bộ với pulse)
    glucose_value: Mapped[float | None] = mapped_column(Float, nullable=True)  # mmol/L
    glucose_context: Mapped[str | None] = mapped_column(String(30), nullable=True)  # fasting, 2h_postprandial
    spo2_percent: Mapped[float | None] = mapped_column(Float, nullable=True)  # %
    spo2: Mapped[int | None] = mapped_column(Integer, nullable=True)  # % (đồng bộ với spo2_percent)
    temperature_celsius: Mapped[float | None] = mapped_column(Float, nullable=True)  # °C
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)  # kg
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)  # cm
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    bp_mean: Mapped[float | None] = mapped_column(Float, nullable=True)  # Huyết áp trung bình
    battery_level: Mapped[int | None] = mapped_column(Integer, nullable=True)  # % Pin thiết bị BLE
    steps: Mapped[int | None] = mapped_column(Integer, nullable=True)  # Bước chân
    sleep_hours: Mapped[float | None] = mapped_column(Float, nullable=True)  # Thời gian ngủ (giờ)
    is_warning: Mapped[bool] = mapped_column(Boolean, default=False)
    warning_message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    measured_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class FamilyMemberProfile(Base):
    __tablename__ = "family_member_profiles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)  # Chủ tài khoản
    full_name: Mapped[str] = mapped_column(String(200))
    relationship: Mapped[str] = mapped_column(String(50))  # child, parent, spouse, sibling, other
    gender: Mapped[str] = mapped_column(String(20))  # male, female, other
    date_of_birth: Mapped[str] = mapped_column(String(30))  # YYYY-MM-DD
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    national_id: Mapped[str | None] = mapped_column(String(30), nullable=True)  # CCCD hoặc Định danh trẻ em
    bhyt_code: Mapped[str | None] = mapped_column(String(30), nullable=True)  # Mã BHYT 15 ký tự
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)  # A+, B+, O+, AB+
    allergies: Mapped[str | None] = mapped_column(Text, nullable=True)
    chronic_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Quyết định 2682/QĐ-BYT: Thông tin hành chính & Nơi ở
    ethnicity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(300), nullable=True)
    province_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    district_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ward_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    
    # Thông tin người đi cùng / Giám hộ
    companion_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    companion_id_card: Mapped[str | None] = mapped_column(String(30), nullable=True)
    companion_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    companion_relationship: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # Tiền sử sức khỏe & Dịch tễ (QĐ 2682/QĐ-BYT)
    has_medical_history: Mapped[bool] = mapped_column(Boolean, default=False)
    medical_history_icd10: Mapped[str | None] = mapped_column(String(300), nullable=True)
    medical_history_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    family_history_icd10: Mapped[str | None] = mapped_column(String(300), nullable=True)
    family_history_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    epidemiological_history: Mapped[str | None] = mapped_column(Text, nullable=True)
    height: Mapped[float | None] = mapped_column(Float, nullable=True)  # Chiều cao (cm)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)  # Cân nặng (kg)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AIPACSConsultation(Base):
    __tablename__ = "ai_pacs_consultations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    dicom_study_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modality: Mapped[str] = mapped_column(String(20), default="DX")  # CR, DX, CT, MR
    body_part: Mapped[str] = mapped_column(String(50), default="CHEST")
    ai_model_name: Mapped[str] = mapped_column(String(100), default="CareConnect-Gemini-MedVision-CXR")
    primary_finding: Mapped[str] = mapped_column(String(255))
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0
    findings_json: Mapped[str] = mapped_column(Text)  # JSON danh sách bệnh lý nghi ngờ & %
    heatmap_regions_json: Mapped[str | None] = mapped_column(Text, nullable=True)  # Bounding boxes / Grad-CAM coords
    doctor_concurrence: Mapped[str | None] = mapped_column(String(30), default="pending")  # approved, disagreed, pending
    doctor_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

class AppointmentDocument(Base):
    __tablename__ = "appointment_documents"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id"), index=True)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    patient_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    document_type: Mapped[str] = mapped_column(String(50))  # "prescription", "lab_test", "cdha", "other"
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str] = mapped_column(String(500))
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())



class PatientCabinetItem(Base):
    __tablename__ = "patient_cabinet_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(200))
    active_ingredient: Mapped[str | None] = mapped_column(String(200), nullable=True)
    dosage: Mapped[str] = mapped_column(String(100), default="1 viên/lần")
    frequency: Mapped[str] = mapped_column(String(100), default="1 lần/ngày")
    timing: Mapped[str] = mapped_column(String(150), default="Sau ăn sáng 30 phút")
    schedule_slot: Mapped[str] = mapped_column(String(50), default="morning")
    quantity_remaining: Mapped[int] = mapped_column(Integer, default=30)
    total_quantity: Mapped[int] = mapped_column(Integer, default=30)
    unit: Mapped[str] = mapped_column(String(50), default="viên")
    source_type: Mapped[str] = mapped_column(String(50), default="prescription")
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    end_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    last_taken_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True) # e.g. REQ-2026-092
    department: Mapped[str] = mapped_column(String(150)) # e.g. Khoa CĐHA & Thăm dò chức năng
    department_id: Mapped[str] = mapped_column(String(50), index=True) # pacs, pharmacy, lab, it, insurance, nursing
    department_icon: Mapped[str | None] = mapped_column(String(50), default="HelpCircle", nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    patient_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    patient_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="normal") # urgent, high, normal
    status: Mapped[str] = mapped_column(String(30), default="pending") # pending, in_progress, resolved, closed
    doctor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    doctor_name: Mapped[str] = mapped_column(String(200))
    assigned_to: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class SupportTicketMessage(Base):
    __tablename__ = "support_ticket_messages"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("support_tickets.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    sender_name: Mapped[str] = mapped_column(String(200))
    sender_role: Mapped[str] = mapped_column(String(100)) # "Bác sĩ lâm sàng", "Khoa CĐHA", etc.
    content: Mapped[str] = mapped_column(Text)
    is_doctor: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LabTestReport(Base):
    """Bảng lưu trữ Phiếu kết quả Xét nghiệm Cận lâm sàng (LIS)"""
    __tablename__ = "lab_test_reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_code: Mapped[str] = mapped_column(String(80), unique=True, index=True) # e.g. XN-2026-0001
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(50), default="biochemistry") # biochemistry, hematology, urinalysis, immunology, microbiology
    category_name: Mapped[str] = mapped_column(String(150), default="Sinh hóa máu")
    sampled_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    result_at: Mapped[str | None] = mapped_column(String(50), nullable=True)
    performed_by: Mapped[str] = mapped_column(String(200), default="Khoa Xét nghiệm Trung tâm")
    doctor_order: Mapped[str | None] = mapped_column(String(200), nullable=True)
    conclusion: Mapped[str | None] = mapped_column(Text, nullable=True)
    indicators_json: Mapped[str | None] = mapped_column(Text, nullable=True) # JSON array of LabIndicator
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    his_order_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PacsDicomStudy(Base):
    """Bảng lưu trữ Ca chụp Chẩn đoán hình ảnh PACS / DICOM (RIS/PACS)"""
    __tablename__ = "pacs_dicom_studies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    study_code: Mapped[str] = mapped_column(String(100), unique=True, index=True) # e.g. PACS-2026-0001
    study_instance_uid: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"), nullable=True, index=True)
    modality: Mapped[str] = mapped_column(String(30), default="CR") # CR, DX, CT, MR, US
    modality_name: Mapped[str] = mapped_column(String(150), default="X-Quang Kỹ thuật số (CR/DX)")
    body_part: Mapped[str] = mapped_column(String(100), default="CHEST")
    description: Mapped[str] = mapped_column(String(255))
    study_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    institution: Mapped[str] = mapped_column(String(255), default="Bệnh viện Đa khoa CareConnect")
    radiologist: Mapped[str | None] = mapped_column(String(200), nullable=True)
    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    impression: Mapped[str | None] = mapped_column(Text, nullable=True)
    series_count: Mapped[int] = mapped_column(Integer, default=1)
    instances_count: Mapped[int] = mapped_column(Integer, default=1)
    viewer_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dicom_web_endpoint: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PatientMedicalDevice(Base):
    """Bảng lưu trữ Thiết bị đo y tế cá nhân BLE/IoT đã ghép đôi của bệnh nhân"""
    __tablename__ = "patient_medical_devices"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    device_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    device_name: Mapped[str] = mapped_column(String(200))
    device_type: Mapped[str] = mapped_column(String(50)) # blood_pressure, blood_glucose, spo2, thermometer, scale, ecg
    manufacturer: Mapped[str | None] = mapped_column(String(150), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(100), nullable=True)
    connection_method: Mapped[str] = mapped_column(String(50), default="bluetooth_ble") # bluetooth_ble, wifi, manual
    battery_level: Mapped[int | None] = mapped_column(Integer, default=100, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="connected") # connected, disconnected, pairing
    last_synced_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())


class MedicationDoseLog(Base):
    """Bảng lưu trữ Nhật ký uống thuốc theo cử của bệnh nhân"""
    __tablename__ = "medication_dose_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    cabinet_item_id: Mapped[int] = mapped_column(ForeignKey("patient_cabinet_items.id", ondelete="CASCADE"), index=True)
    medicine_name: Mapped[str] = mapped_column(String(200))
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    schedule_slot: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="taken") # taken, skipped, delayed
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    taken_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
