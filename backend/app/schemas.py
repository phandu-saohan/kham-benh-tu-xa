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

class AppointmentOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    starts_at: datetime
    reason: str
    status: str
    fee_amount: int
    currency: str
    paid_at: datetime | None = None
    refund_amount: int = 0
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
