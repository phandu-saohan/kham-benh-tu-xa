from datetime import datetime
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
    model_config = ConfigDict(from_attributes=True)

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






