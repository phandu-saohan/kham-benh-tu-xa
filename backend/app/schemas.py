from datetime import datetime
from typing import Any, Dict, List, Optional
import email_validator
from pydantic import BaseModel, EmailStr, Field, ConfigDict

email_validator.TEST_ENVIRONMENT = True

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class OtpSendIn(BaseModel):
    phone_number: str = Field(min_length=9, max_length=15, pattern=r"^[0-9+]+$")

class OtpSendOut(BaseModel):
    success: bool
    phone_number: str
    message: str
    dev_code: str | None = None

class OtpVerifyIn(BaseModel):
    phone_number: str = Field(min_length=9, max_length=15)
    otp_code: str = Field(min_length=4, max_length=10)
    full_name: str | None = None

class FirebaseVerifyIn(BaseModel):
    id_token: str
    full_name: str | None = None

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: dict

class RefreshTokenIn(BaseModel):
    refresh_token: str

class AppointmentCreate(BaseModel):
    doctor_id: int
    starts_at: datetime
    reason: str = Field(min_length=3, max_length=500)
    shift_id: int | None = None
    department_id: int | None = None

class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    starts_at: datetime
    reason: str
    status: str
    fee_amount: int
    currency: str
    shift_id: int | None = None
    department_id: int | None = None
    bhyt_code: str | None = None
    bhyt_rate: int = 0
    bhyt_discount: int = 0
    patient_pay_amount: int = 0
    paid_at: datetime | None = None
    refund_amount: int = 0
    refund_reason: str | None = None
    cancelled_at: datetime | None = None
    triage_status: str | None = None
    triage_level: str | None = None
    pulse: int | None = None
    blood_pressure: str | None = None
    temperature: float | None = None
    spo2: int | None = None
    weight: float | None = None
    height: float | None = None
    triage_notes: str | None = None
    waiting_room_entered_at: datetime | None = None
    waiting_room_called_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

class ClinicalRecordIn(BaseModel):
    symptoms: str | None = None
    allergies: str | None = None
    diagnosis: str | None = None
    icd10_code: str | None = None
    icd10_name: str | None = None
    clinical_notes: str | None = None
    plan: str | None = None

class ClinicalRecordOut(BaseModel):
    id: int
    appointment_id: int
    symptoms: str | None = None
    allergies: str | None = None
    diagnosis: str | None = None
    icd10_code: str | None = None
    icd10_name: str | None = None
    clinical_notes: str | None = None
    plan: str | None = None
    is_locked: bool = False
    locked_at: datetime | None = None
    status: str = "local_draft"
    warning: str | None = None
    model_config = ConfigDict(from_attributes=True)

class PrescriptionIn(BaseModel):
    summary: str = Field(min_length=3, max_length=5000)

class PaymentCreate(BaseModel):
    appointment_id: int
    amount: int = Field(gt=0)
    currency: str = "VND"

class PaymentOut(BaseModel):
    id: int
    appointment_id: int
    amount: int
    currency: str
    provider: str
    status: str
    qr_code_url: str | None = None
    paid_at: datetime | None = None
    refund_status: str | None = None
    model_config = ConfigDict(from_attributes=True)

class PaymentWebhookIn(BaseModel):
    transfer_content: str  # e.g. "TM12"
    amount: int
    bank_account: str | None = None
    transaction_id: str | None = None

class ICD10Item(BaseModel):
    code: str
    name: str
    chapter: str

# --- GIAI ĐOẠN 2 SCHEMAS ---

class ConsentAgreeIn(BaseModel):
    appointment_id: int
    consent_version: str = "2026.1-ND13"

class ConsentStatusOut(BaseModel):
    consented: bool
    version: str
    consented_at: datetime | None = None
    terms_title: str
    terms_content: str

class DigitalSignRequest(BaseModel):
    provider: str = "VNPT_SmartCA"  # VNPT_SmartCA, Viettel_CA, BKAV_CA

class DigitalSignResponse(BaseModel):
    success: bool
    signer_name: str
    signer_cchn: str
    cert_serial: str
    signature_hash: str
    timestamp: str
    message: str

class NationalPrescriptionSyncOut(BaseModel):
    success: bool
    national_prescription_code: str
    lookup_url: str
    qr_code_url: str
    synced_at: str
    message: str

class PACSViewerOut(BaseModel):
    study_id: str
    modality: str
    description: str
    viewer_url: str
    source: str

class LabIndicatorOut(BaseModel):
    code: str
    name: str
    value: str
    unit: str
    ref_range: str
    flag: str  # NORMAL, HIGH, LOW
    flag_label: str
    note: str | None = None

class LabReportOut(BaseModel):
    report_id: str
    title: str
    category: str
    category_name: str
    sampled_at: str
    result_at: str
    performed_by: str
    doctor_order: str
    conclusion: str
    indicators: list[LabIndicatorOut]

class LabResultsOut(BaseModel):
    patient_id: int
    patient_name: str
    total_reports: int
    abnormal_indicators_count: int
    reports: list[LabReportOut]

class PACSStudyDetailOut(BaseModel):
    study_id: str
    modality: str
    modality_name: str
    body_part: str
    description: str
    date: str
    institution: str
    radiologist: str
    findings: str
    impression: str
    series_count: int
    instances_count: int
    viewer_url: str
    dicom_web_endpoint: str | None = None
    study_instance_uid: str | None = None

class PACSStudiesListOut(BaseModel):
    patient_id: int
    patient_name: str
    total_studies: int
    viewer_engine: str
    notice: str
    studies: list[PACSStudyDetailOut]

# --- GIAI ĐOẠN 3 SCHEMAS: AI SCRIBE, BHYT & LỊCH TRỰC CHỐNG QUÁ TẢI ---

class AmbientScribeIn(BaseModel):
    transcript: str
    patient_name: str | None = None
    patient_age: int = 35

class SoapNote(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str

class AmbientScribeOut(BaseModel):
    success: bool
    soap: SoapNote
    extracted_symptoms: str
    suggested_icd10_code: str
    suggested_icd10_name: str
    prescription_draft: str
    allergies_warning: str

class BhytCheckIn(BaseModel):
    bhyt_code: str
    patient_name: str | None = None

class BhytCheckOut(BaseModel):
    success: bool
    is_valid: bool
    bhyt_code: str
    patient_name: str
    benefit_rate_percent: int
    object_group: str
    primary_healthcare_facility: str
    valid_from: str
    valid_to: str
    five_years_consecutive: str
    telehealth_covered: bool
    message: str

class DepartmentOut(BaseModel):
    id: int
    code: str
    name: str
    description: str | None = None
    is_active: bool

class DoctorShiftOut(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str | None = None
    department_id: int | None = None
    department_name: str | None = None
    shift_date: str
    shift_type: str
    start_time: str
    end_time: str
    max_patients: int
    booked_count: int
    available_slots: int
    is_overloaded: bool

class AppointmentCancelIn(BaseModel):
    reason: str

class AppointmentCancelOut(BaseModel):
    success: bool
    appointment_id: int
    status: str
    refund_amount: int
    refund_percent: int
    refund_reason: str
    message: str

class ConsultationMessageIn(BaseModel):
    content: str | None = None
    message_type: str = "text"  # "text", "image", "file"
    file_name: str | None = None
    file_data: str | None = None  # Base64 string or data URL
    file_size: int | None = None

class ConsultationMessageOut(BaseModel):
    id: int
    appointment_id: int
    sender_id: int
    sender_role: str
    sender_name: str
    message_type: str
    content: str | None = None
    file_url: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- PRODUCTION STAGE SCHEMAS: COTURN ICE, PAYMENT WEBHOOK, TRIAGE DESK ---

class IceServerConfig(BaseModel):
    urls: list[str] | str
    username: str | None = None
    credential: str | None = None

class IceServersOut(BaseModel):
    iceServers: list[IceServerConfig]
    ttl: int
    realm: str

class PaymentWebhookIn(BaseModel):
    transaction_id: str | None = None
    amount: int = 0
    content: str | None = None
    transfer_content: str | None = None
    gateway: str = "vietqr_pro"  # vietqr_pro, payos, vietinbank, mbbank, sepay
    status: str = "PAID"  # PAID, SUCCESS
    signature: str | None = None

class PaymentWebhookOut(BaseModel):
    success: bool
    appointment_id: int
    amount: int
    status: str
    message: str

class TriageAssessmentIn(BaseModel):
    pulse: int | None = None          # Mạch (bpm)
    blood_pressure: str | None = None # Huyết áp (vd: "120/80")
    temperature: float | None = None  # Thân nhiệt (°C)
    spo2: int | None = None           # SpO2 (%)
    weight: float | None = None       # Cân nặng (kg)
    height: float | None = None       # Chiều cao (cm)
    triage_level: str = "normal"      # normal, priority, emergency
    triage_notes: str | None = None
    dispatch_to_doctor: bool = True   # Tự động đẩy vào hàng đợi khám của Bác sĩ
    send_to_waiting_room: bool = True # Đưa bệnh nhân vào phòng chờ ảo để Bác sĩ chủ động gọi

class TriageAssessmentOut(BaseModel):
    success: bool
    appointment_id: int
    triage_status: str
    triage_level: str
    message: str

class TriageQueueItem(BaseModel):
    appointment_id: int
    patient_id: int
    patient_name: str
    patient_phone: str | None = None
    bhyt_code: str | None = None
    doctor_id: int
    doctor_name: str
    department_name: str | None = None
    starts_at: datetime
    reason: str
    status: str
    triage_status: str
    triage_level: str
    pulse: int | None = None
    blood_pressure: str | None = None
    temperature: float | None = None
    spo2: int | None = None
    weight: float | None = None
    height: float | None = None
    triage_notes: str | None = None
    waiting_room_entered_at: datetime | None = None
    model_config = ConfigDict(from_attributes=True)

class WaitingRoomStatusOut(BaseModel):
    appointment_id: int
    status: str
    triage_status: str
    queue_number: int | None = None
    patients_ahead: int = 0
    estimated_wait_minutes: int = 5
    doctor_id: int
    doctor_name: str
    doctor_title: str | None = None
    department_name: str | None = None
    patient_name: str | None = None
    vitals: dict | None = None
    triage_notes: str | None = None
    entered_waiting_at: datetime | None = None
    is_called: bool = False
    called_at: datetime | None = None
    room_name: str | None = None
    message: str

# --- ADMIN DASHBOARD & SYSTEM SETTINGS SCHEMAS ---

class AdminOverviewOut(BaseModel):
    total_appointments: int
    completed_appointments: int
    scheduled_appointments: int
    cancelled_appointments: int
    total_revenue: int
    total_patients: int
    total_doctors: int
    total_nurses: int
    total_bhyt_claims: int
    bhyt_total_discount: int

class AuditLogOut(BaseModel):
    id: int
    actor_user_id: int | None = None
    actor_name: str | None = None
    actor_role: str | None = None
    action: str
    resource_type: str
    resource_id: str | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SystemSettingsOut(BaseModel):
    hospital_name: str
    hospital_code: str
    hospital_address: str
    hospital_hotline: str
    national_prescription_url: str
    smartca_provider: str
    coturn_host: str
    coturn_port: int
    coturn_realm: str
    sms_provider: str
    sms_brandname: str
    allow_test_otp: bool
    firebase_project_id: str | None = None
    firebase_api_key: str | None = None
    firebase_auth_domain: str | None = None
    firebase_app_id: str | None = None
    gemini_api_key: str | None = None
    bank_id: str
    bank_account_no: str
    bank_account_name: str
    default_max_patients_per_shift: int
    consultation_duration_minutes: int

class SystemSettingsUpdateIn(BaseModel):
    hospital_name: str | None = None
    hospital_code: str | None = None
    hospital_address: str | None = None
    hospital_hotline: str | None = None
    national_prescription_url: str | None = None
    smartca_provider: str | None = None
    coturn_host: str | None = None
    coturn_port: int | None = None
    coturn_realm: str | None = None
    sms_provider: str | None = None
    sms_brandname: str | None = None
    allow_test_otp: bool | None = None
    firebase_project_id: str | None = None
    firebase_api_key: str | None = None
    firebase_auth_domain: str | None = None
    firebase_app_id: str | None = None
    gemini_api_key: str | None = None
    bank_id: str | None = None
    bank_account_no: str | None = None
    bank_account_name: str | None = None
    default_max_patients_per_shift: int | None = None
    consultation_duration_minutes: int | None = None

class PatientProfileOut(BaseModel):
    id: int
    full_name: str
    phone_number: str | None = None
    email: str
    role: str
    bhyt_code: str | None = None
    external_patient_id: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    identity_card: str | None = None
    address: str | None = None
    blood_type: str | None = None
    allergies: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    consent_agreed: bool = False
    consent_agreed_at: datetime | None = None
    total_appointments: int = 0
    completed_appointments: int = 0
    total_prescriptions: int = 0

class PatientProfileUpdateIn(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    bhyt_code: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    identity_card: str | None = None
    address: str | None = None
    blood_type: str | None = None
    allergies: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None

class PatientHisCheckIn(BaseModel):
    full_name: str = Field(min_length=1)
    phone_number: str = Field(min_length=9)
    identity_card: str = Field(min_length=9, max_length=15)  # Số CCCD 9 hoặc 12 số

class PatientHisCheckOut(BaseModel):
    exists_in_his: bool
    external_patient_id: str | None = None
    full_name: str | None = None
    dob: str | None = None
    gender: str | None = None
    bhyt_no: str | None = None
    address: str | None = None
    blood_type: str | None = None
    conditions: list[dict] = Field(default_factory=list)
    allergies: list[dict] = Field(default_factory=list)
    already_registered_in_app: bool = False
    message: str

class PatientIdentifyIn(BaseModel):
    identity_card: str = Field(description="Số CCCD 12 số hoặc chuỗi quét mã QR VNeID/CCCD gắn chip")
    phone_number: str | None = Field(default=None, description="Số điện thoại tùy chọn")

class PreviousVisitSummary(BaseModel):
    appointment_id: int
    date: str
    doctor_name: str
    department_name: str
    status: str
    reason: str
    diagnosis: str | None = None
    icd10_code: str | None = None
    has_prescription: bool = False
    has_pacs: bool = False
    has_lab: bool = False

class PatientIdentifyOut(BaseModel):
    found: bool
    patient_type: str  # "existing_with_history" | "existing_no_history" | "his_only" | "new"
    patient_id: int | None = None
    pid: str | None = None
    full_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    identity_card: str | None = None
    vneid_level: int = 2
    is_vneid_verified: bool = True
    phone_number: str | None = None
    bhyt_code: str | None = None
    address: str | None = None
    blood_type: str | None = None
    allergies: str | None = None
    chronic_conditions: list[dict] = Field(default_factory=list)
    total_visits: int = 0
    last_visit: dict | None = None
    visit_history: list[PreviousVisitSummary] = Field(default_factory=list)
    message: str

class PatientRegisterIn(BaseModel):
    full_name: str = Field(min_length=1)
    phone_number: str = Field(min_length=9)
    identity_card: str = Field(min_length=9, max_length=15)
    password: str = Field(min_length=6)
    email: str | None = None
    dob: str | None = None
    gender: str | None = None
    bhyt_code: str | None = None
    address: str | None = None
    blood_type: str | None = None
    allergies: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None

class PatientRegisterOut(BaseModel):
    access_token: str
    refresh_token: str
    user: dict
    external_patient_id: str
    his_action: str  # "linked_existing" | "created_new_his"
    message: str

class UserRoleUpdateIn(BaseModel):
    role: str
    is_active: bool | None = None
    doctor_cchn: str | None = None
    bhyt_code: str | None = None

class PermissionItem(BaseModel):
    code: str
    name: str
    description: str
    module: str

class RoleDefinition(BaseModel):
    role: str
    name: str
    badge_color: str
    description: str
    permissions: list[str]

# --- AI SUITE SCHEMAS ---

class TriageSymptomIn(BaseModel):
    symptoms: str
    patient_age: int = 30
    gender: str = "male"

class TriageSymptomOut(BaseModel):
    urgency_level: str
    urgency_label: str
    emergency_alert: str | None = None
    recommended_department_code: str
    recommended_department_name: str
    explanation: str
    suggested_questions: list[str]

class OcrDocumentIn(BaseModel):
    image_base64: str
    doc_type: str = "AUTO"  # "AUTO", "CCCD", "BHYT", "PRESCRIPTION"

class OcrDocumentOut(BaseModel):
    success: bool
    doc_type_detected: str
    confidence: float
    extracted_data: dict[str, Any]
    raw_text: str | None = None
    note: str | None = None

class Icd10SuggestIn(BaseModel):
    symptoms: str
    clinical_notes: str | None = None

class Icd10SuggestOut(BaseModel):
    suggestions: list[dict[str, Any]]

class DrugSafetyCheckIn(BaseModel):
    medicines: list[str]
    patient_allergies: str | None = None
    patient_age: int | None = None

class DrugSafetyCheckOut(BaseModel):
    is_safe: bool
    risk_level: str
    summary: str
    interactions: list[dict[str, Any]]
    allergy_alerts: list[dict[str, Any]]
    dosage_warnings: list[str]

class PacsAnalysisIn(BaseModel):
    study_id: str | None = None
    modality: str = "CR"
    body_part: str = "CHEST"
    image_url: str | None = None

class PacsAnalysisOut(BaseModel):
    study_id: str
    modality: str
    body_part: str
    abnormal: bool
    abnormality_score: float
    finding: str
    impression: str
    suggested_conditions: list[dict[str, Any]]
    annotated_regions: list[dict[str, Any]]
    recommendation: str
    ai_model_version: str

class LabInterpretIn(BaseModel):
    lab_items: list[dict[str, Any]]
    clinical_summary: str | None = None

class LabInterpretOut(BaseModel):
    overall_status: str
    abnormal_count: int
    patient_friendly_summary: str
    lifestyle_advice: list[str]
    items: list[dict[str, Any]]

class PostConsultationPlanIn(BaseModel):
    diagnosis: str
    prescription_text: str
    doctor_notes: str | None = None

class PostConsultationPlanOut(BaseModel):
    diagnosis: str
    medication_schedule: list[dict[str, Any]]
    monitoring_metrics: list[dict[str, Any]]
    red_flags: list[str]
    re_examination_days: int
    advice: str

class BhytAuditIn(BaseModel):
    icd10_code: str
    services_ordered: list[str] = Field(default_factory=list)
    medicines_ordered: list[str] = Field(default_factory=list)
    is_inpatient: bool = False

class BhytAuditOut(BaseModel):
    audit_passed: bool
    risk_score: float
    status_label: str
    warnings: list[dict[str, Any]]
    recommendations: list[str]

class DeidentifyIn(BaseModel):
    text: str
    mask_type: str = "ANONYMIZE"

class DeidentifyOut(BaseModel):
    sanitized_text: str
    detected_pii_count: int
    pii_types_found: list[str]
    compliance: str

class NotificationOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    target_role: Optional[str] = None
    title: str
    message: str
    category: str = "system"
    priority: str = "normal"
    action_url: Optional[str] = None
    is_read: bool = False
    created_at: Optional[datetime] = None

class NotificationCreateIn(BaseModel):
    user_id: Optional[int] = None
    target_role: Optional[str] = None
    title: str = Field(min_length=2, max_length=255)
    message: str = Field(min_length=2)
    category: str = "system"
    priority: str = "normal"
    action_url: Optional[str] = None

class UnreadCountOut(BaseModel):
    unread_count: int

class AppointmentEventOut(BaseModel):
    id: int
    appointment_id: int
    action: str
    from_status: Optional[str] = None
    to_status: Optional[str] = None
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

class ShareLabResultIn(BaseModel):
    report_id: str
    report_name: str
    category_name: str
    conclusion: Optional[str] = None
    summary_text: Optional[str] = None

class ShareLabResultOut(BaseModel):
    success: bool
    message: str
    message_id: Optional[int] = None
    notification_id: Optional[int] = None

# -------------------------------------------------------------
# 1. Cổng Giám định BHYT Quốc gia (XML 4210 / QĐ 130)
# -------------------------------------------------------------
class BHYTClaimOut(BaseModel):
    id: int
    appointment_id: int
    patient_id: int
    ma_lk: str
    ma_the_bhyt: str
    ma_dkbd: str
    muc_huong: int
    ma_benh_chinh: str
    ma_benh_kem: Optional[str] = None
    t_tongchi: float
    t_bntt: float
    t_bhyttt: float
    status: str
    gdbhyt_code: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class BHYTXML4210Out(BaseModel):
    appointment_id: int
    ma_lk: str
    patient_name: str
    ma_the_bhyt: str
    muc_huong: int
    xml1_tonghop: str
    xml2_chitietthuoc: str
    xml3_chitietdvkt: str
    xml4_chitietcls: str
    xml5_dienbien: str
    summary_financials: dict

# -------------------------------------------------------------
# 2. Hội chẩn Liên viện & Đa chuyên khoa (Multi-Doctor)
# -------------------------------------------------------------
class ConsultationMemberIn(BaseModel):
    doctor_name: str
    hospital_name: str = "Bệnh viện Bạch Mai - Tuyến Trung Ương"
    specialty: str
    role: str = "specialist"  # host, specialist, secretary

class ConsultationMemberOut(BaseModel):
    id: int
    appointment_id: int
    doctor_id: Optional[int] = None
    doctor_name: str
    hospital_name: str
    specialty: str
    role: str
    status: str
    clinical_opinion: Optional[str] = None
    joined_at: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ConsultationOpinionIn(BaseModel):
    clinical_opinion: str

# -------------------------------------------------------------
# 3. Giám sát Sinh hiệu Từ xa (RPM IoT)
# -------------------------------------------------------------
class RPMVitalLogIn(BaseModel):
    device_type: str  # blood_pressure, blood_glucose, spo2, heart_rate, temperature, weight
    device_name: str = "Omron Bluetooth Smart Monitor"
    connection_method: str = "bluetooth_ble"  # bluetooth_ble, manual
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    pulse: Optional[int] = None
    glucose_value: Optional[float] = None
    glucose_context: Optional[str] = "fasting"
    spo2_percent: Optional[float] = None
    temperature_celsius: Optional[float] = None
    weight_kg: Optional[float] = None

class RPMVitalLogOut(BaseModel):
    id: int
    patient_id: int
    device_type: str
    device_name: str
    connection_method: str
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    pulse: Optional[int] = None
    glucose_value: Optional[float] = None
    glucose_context: Optional[str] = None
    spo2_percent: Optional[float] = None
    temperature_celsius: Optional[float] = None
    weight_kg: Optional[float] = None
    is_warning: bool
    warning_message: Optional[str] = None
    measured_at: datetime
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# -------------------------------------------------------------
# 4. Hồ sơ Sức khỏe Gia đình (Family Health Vault)
# -------------------------------------------------------------
class FamilyMemberProfileIn(BaseModel):
    full_name: str
    relationship: str  # child, parent, spouse, sibling, other
    gender: str  # male, female, other
    date_of_birth: str  # YYYY-MM-DD
    phone_number: Optional[str] = None
    national_id: Optional[str] = None
    bhyt_code: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None

class FamilyMemberProfileOut(BaseModel):
    id: int
    owner_user_id: int
    full_name: str
    relationship: str
    gender: str
    date_of_birth: str
    phone_number: Optional[str] = None
    national_id: Optional[str] = None
    bhyt_code: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# -------------------------------------------------------------
# 5. AI PACS Hỗ trợ Chẩn đoán Hình ảnh
# -------------------------------------------------------------
class AIPACSAnalyzeIn(BaseModel):
    appointment_id: int
    dicom_study_id: Optional[str] = "STUDY-CXR-2026-88"
    modality: str = "DX"
    body_part: str = "CHEST"
    image_url: Optional[str] = None

class AIPACSConsultationOut(BaseModel):
    id: int
    appointment_id: int
    dicom_study_id: Optional[str] = None
    modality: str
    body_part: str
    ai_model_name: str
    primary_finding: str
    confidence_score: float
    findings: list[dict]
    heatmap_regions: list[dict]
    doctor_concurrence: Optional[str] = None
    doctor_feedback: Optional[str] = None
    created_at: datetime

class AIPACSFeedbackIn(BaseModel):
    doctor_concurrence: str  # approved, disagreed
    doctor_feedback: Optional[str] = None










