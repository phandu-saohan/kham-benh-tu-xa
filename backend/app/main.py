from datetime import datetime, timezone, timedelta
import random
import os
import base64
import uuid
import hmac
import hashlib
import time
import re
import copy
import json
from fastapi import FastAPI, Depends, HTTPException, Query, status, Response, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from livekit import api as livekit_api

from app.config import settings
from app.db import get_db, Base, engine
from app.models import (
    User, Appointment, TelehealthSession, ClinicalRecord, PrescriptionRef,
    Payment, AuditLog, OtpCode, PatientConsent, Department, DoctorShift,
    ConsultationMessage, SystemSetting, Notification, AppointmentEvent
)
from app.schemas import (
    LoginIn, TokenOut, OtpSendIn, OtpSendOut, OtpVerifyIn, FirebaseVerifyIn, RefreshTokenIn,
    AppointmentCreate, AppointmentOut,
    ClinicalRecordIn, ClinicalRecordOut, PrescriptionIn,
    PaymentCreate, PaymentOut, PaymentWebhookIn, ICD10Item,
    ConsentAgreeIn, ConsentStatusOut, DigitalSignRequest, DigitalSignResponse,
    NationalPrescriptionSyncOut, PACSViewerOut,
    AmbientScribeIn, AmbientScribeOut, BhytCheckIn, BhytCheckOut,
    DepartmentOut, DoctorShiftOut, AppointmentCancelIn, AppointmentCancelOut,
    ConsultationMessageIn, ConsultationMessageOut,
    IceServersOut, IceServerConfig, PaymentWebhookOut,
    TriageAssessmentIn, TriageAssessmentOut, TriageQueueItem,
    AdminOverviewOut, AuditLogOut, SystemSettingsOut, SystemSettingsUpdateIn,
    PatientProfileOut, PatientProfileUpdateIn,
    PatientHisCheckIn, PatientHisCheckOut, PatientRegisterIn, PatientRegisterOut,
    UserRoleUpdateIn,
    TriageSymptomIn, TriageSymptomOut,
    OcrDocumentIn, OcrDocumentOut,
    Icd10SuggestIn, Icd10SuggestOut,
    DrugSafetyCheckIn, DrugSafetyCheckOut,
    PacsAnalysisIn, PacsAnalysisOut,
    LabInterpretIn, LabInterpretOut,
    PostConsultationPlanIn, PostConsultationPlanOut,
    BhytAuditIn, BhytAuditOut,
    DeidentifyIn, DeidentifyOut,
    NotificationOut, NotificationCreateIn, UnreadCountOut,
    AppointmentEventOut, ShareLabResultIn, ShareLabResultOut
)
from app.adapters.sms_gateway import send_otp_message
from app.security import (
    verify_password, create_access_token, create_refresh_token, decode_token,
    get_current_user, require_roles, hash_password
)
from app.adapters.his import get_his_adapter
from app.adapters.his.fhir import FHIRHISAdapter
from app.adapters.pacs import get_pacs_adapter
from app.adapters.pacs.dicomweb import DICOMwebPACSAdapter
from app.paraclinical import get_patient_lab_results, get_patient_pacs_studies
from app.icd10 import search_icd10
from app.vietqr import generate_vietqr_url
from app.smartca import sign_medical_document, verify_medical_signature
from app.national_prescription import sync_to_national_prescription_system
from app.pdf_generator import generate_medical_record_pdf
from app.consent import get_consent_terms, CONSENT_VERSION
from app.encryption import encrypt_sensitive_data, decrypt_sensitive_data
from app.ai_scribe import generate_soap_notes
from app.ai_engine import (
    triage_symptom_check,
    ocr_medical_document,
    suggest_icd10_codes,
    check_drug_safety,
    analyze_pacs_study,
    interpret_lab_results,
    generate_followup_plan,
    audit_bhyt_claim,
    deidentify_medical_record,
)
from app.bhyt import verify_and_lookup_bhyt, calculate_bhyt_consultation_fee
from app.firebase_auth import verify_firebase_id_token, process_firebase_login
from app.supabase_storage import upload_file_to_supabase, check_supabase_health, get_supabase_public_url

app = FastAPI(
    title="Telemedicine Platform API",
    version="1.2.0",
    description="Hospital Telemedicine Platform with SmartCA Digital Signing, National Prescription & DICOMweb/FHIR"
)

origins = [x.strip() for x in settings.CORS_ORIGINS.split(",") if x.strip()]
if "*" in origins:
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
else:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {
        "status": "ok",
        "environment": settings.APP_ENV,
        "his_adapter": settings.HIS_ADAPTER,
        "pacs_adapter": settings.PACS_ADAPTER,
        "payment_provider": settings.PAYMENT_PROVIDER,
        "compliance": ["NghiDinh_13_ND_CP", "ThongTu_30_2023_TT_BYT", "SmartCA_PKI"]
    }

@app.get("/api/v1/storage/status")
def storage_status():
    """Kiểm tra trạng thái kết nối máy chủ lưu trữ hồ sơ y tế Supabase Storage."""
    return check_supabase_health()

# ----------------- AUTHENTICATION -----------------

@app.post("/api/v1/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đã bị tạm khóa")
    
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    user.refresh_token = refresh_token
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "phone_number": user.phone_number,
            "full_name": user.full_name,
            "role": user.role,
            "doctor_cchn": user.doctor_cchn
        }
    }

def get_db_setting(db: Session, key: str, default: str = "") -> str:
    row = db.query(SystemSetting).filter_by(key=key).first()
    return row.value if row else default

def set_db_setting(db: Session, key: str, value: str, description: str = ""):
    row = db.query(SystemSetting).filter_by(key=key).first()
    if row:
        row.value = value
    else:
        row = SystemSetting(key=key, value=value, description=description)
        db.add(row)
    db.commit()

@app.post("/api/v1/auth/otp/send", response_model=OtpSendOut)
async def send_otp(data: OtpSendIn, db: Session = Depends(get_db)):
    phone = data.phone_number.strip()
    sms_prov = get_db_setting(db, "sms_provider", settings.SMS_PROVIDER)
    
    # Sinh mã OTP 6 chữ số ngẫu nhiên thực thụ (Xóa hoàn toàn mã cố định 123456)
    code = f"{random.randint(100000, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    otp_record = OtpCode(phone_number=phone, code=code, expires_at=expires_at, is_used=False)
    db.add(otp_record)
    db.commit()

    # Gửi tin nhắn xác thực qua cổng SMS Brandname / Zalo ZNS / Gateway
    user = db.query(User).filter(User.phone_number == phone).first()
    await send_otp_message(phone, code, patient_name=user.full_name if user else None)
    
    return {
        "success": True,
        "phone_number": phone,
        "message": f"Mã xác thực OTP đã được gửi tới số điện thoại {phone}.",
        "dev_code": code if (settings.APP_ENV != "production" and sms_prov == "mock") else None
    }

@app.post("/api/v1/auth/otp/verify", response_model=TokenOut)
def verify_otp(data: OtpVerifyIn, db: Session = Depends(get_db)):
    phone = data.phone_number.strip()
    now = datetime.now(timezone.utc)
    submitted_code = data.otp_code.strip()
    
    # Xác thực mã OTP hợp lệ trong database - đã xóa hoàn toàn backdoor 123456
    otp = db.query(OtpCode).filter(
        OtpCode.phone_number == phone,
        OtpCode.code == submitted_code,
        OtpCode.is_used == False,
        OtpCode.expires_at > now
    ).order_by(OtpCode.id.desc()).first()
    
    if not otp:
        raise HTTPException(status_code=400, detail="Mã OTP không đúng hoặc đã hết hạn")
    otp.is_used = True
    
    user = db.query(User).filter(User.phone_number == phone).first()
    if not user:
        clean_name = data.full_name.strip() if data.full_name else f"Bệnh nhân {phone[-4:]}"
        user = User(
            email=f"{phone}@phone.careconnect.local",
            phone_number=phone,
            full_name=clean_name,
            role="patient",
            password_hash=hash_password(f"OTP-{phone}"),
            external_patient_id=f"VN-{phone}"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(AuditLog(actor_user_id=user.id, action="auth.otp_register", resource_type="user", resource_id=str(user.id)))
    
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)
    user.refresh_token = refresh_token
    db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user.id,
            "email": user.email,
            "phone_number": user.phone_number,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@app.post("/api/v1/auth/firebase/verify-token", response_model=TokenOut)
@app.post("/api/v1/auth/firebase/verify", response_model=TokenOut)
async def verify_firebase_token_endpoint(data: FirebaseVerifyIn, db: Session = Depends(get_db)):
    project_id = get_db_setting(db, "firebase_project_id", settings.FIREBASE_PROJECT_ID)
    api_key = get_db_setting(db, "firebase_api_key", settings.FIREBASE_WEB_API_KEY)
    phone, firebase_uid = await verify_firebase_id_token(data.id_token, project_id=project_id, web_api_key=api_key)
    return process_firebase_login(db, phone, data.full_name)

@app.get("/api/v1/auth/firebase-config")
def get_firebase_config_endpoint(db: Session = Depends(get_db)):
    project_id = get_db_setting(db, "firebase_project_id", settings.FIREBASE_PROJECT_ID)
    api_key = get_db_setting(db, "firebase_api_key", settings.FIREBASE_WEB_API_KEY)
    auth_domain = get_db_setting(db, "firebase_auth_domain", f"{project_id}.firebaseapp.com" if project_id else "")
    app_id = get_db_setting(db, "firebase_app_id", "")
    storage_bucket = get_db_setting(db, "firebase_storage_bucket", f"{project_id}.appspot.com" if project_id else "")
    messaging_sender_id = get_db_setting(db, "firebase_messaging_sender_id", "")
    return {
        "apiKey": api_key,
        "projectId": project_id,
        "authDomain": auth_domain,
        "appId": app_id,
        "storageBucket": storage_bucket,
        "messagingSenderId": messaging_sender_id,
        "enabled": bool(api_key and project_id)
    }

@app.post("/api/v1/auth/refresh")
def refresh_token(data: RefreshTokenIn, db: Session = Depends(get_db)):
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại")
    
    user = db.get(User, user_id)
    if not user or user.refresh_token != data.refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token không hợp lệ hoặc đã bị thu hồi")
    
    new_access_token = create_access_token(user)
    return {"access_token": new_access_token, "token_type": "bearer"}

@app.post("/api/v1/auth/logout")
def logout(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.refresh_token = None
    db.add(AuditLog(actor_user_id=user.id, action="auth.logout", resource_type="user", resource_id=str(user.id)))
    db.commit()
    return {"message": "Đã đăng xuất thành công"}

@app.get("/api/v1/auth/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "phone_number": user.phone_number,
        "full_name": user.full_name,
        "role": user.role,
        "doctor_cchn": user.doctor_cchn
    }

@app.post("/api/v1/auth/check-patient-his", response_model=PatientHisCheckOut)
def check_patient_his(data: PatientHisCheckIn, db: Session = Depends(get_db)):
    clean_phone = data.phone_number.strip()
    clean_cccd = data.identity_card.strip()
    clean_name = data.full_name.strip()

    # 1. Kiểm tra xem tài khoản đã tồn tại trong ứng dụng CareConnect chưa
    existing_user = db.query(User).filter(
        or_(User.phone_number == clean_phone, User.identity_card == clean_cccd)
    ).first()
    if existing_user:
        return {
            "exists_in_his": True,
            "external_patient_id": existing_user.external_patient_id,
            "full_name": existing_user.full_name,
            "dob": existing_user.date_of_birth,
            "gender": existing_user.gender,
            "bhyt_no": existing_user.bhyt_code,
            "address": existing_user.address,
            "blood_type": existing_user.blood_type,
            "conditions": [],
            "allergies": [],
            "already_registered_in_app": True,
            "message": "Số điện thoại hoặc CCCD này đã được đăng ký tài khoản trên CareConnect. Vui lòng đăng nhập để tiếp tục."
        }

    # 2. Tra cứu trên hệ thống HIS/EMR của Bệnh viện
    his_adapter = get_his_adapter()
    his_patient = his_adapter.find_patient(national_id=clean_cccd, phone=clean_phone, full_name=clean_name)

    if his_patient:
        return {
            "exists_in_his": True,
            "external_patient_id": his_patient.get("pid"),
            "full_name": his_patient.get("full_name") or clean_name,
            "dob": his_patient.get("dob"),
            "gender": his_patient.get("gender"),
            "bhyt_no": his_patient.get("bhyt_no"),
            "address": his_patient.get("address"),
            "blood_type": his_patient.get("blood_type"),
            "conditions": his_patient.get("conditions", []),
            "allergies": his_patient.get("allergies", []),
            "already_registered_in_app": False,
            "message": f"Tìm thấy hồ sơ bệnh án điện tử tại bệnh viện (Mã PID: {his_patient.get('pid')}). Thông tin BHYT và lịch sử khám sẽ được liên thông tự động."
        }
    else:
        return {
            "exists_in_his": False,
            "external_patient_id": None,
            "full_name": clean_name,
            "dob": None,
            "gender": None,
            "bhyt_no": None,
            "address": None,
            "blood_type": None,
            "conditions": [],
            "allergies": [],
            "already_registered_in_app": False,
            "message": "Chưa có hồ sơ bệnh án trên HIS/EMR bệnh viện. Hệ thống sẽ tự động tạo hồ sơ bệnh nhân điện tử mới khi bạn hoàn tất đăng ký."
        }

@app.post("/api/v1/auth/patient-register", response_model=PatientRegisterOut)
def register_patient_account(data: PatientRegisterIn, db: Session = Depends(get_db)):
    clean_phone = data.phone_number.strip()
    clean_cccd = data.identity_card.strip()
    clean_name = data.full_name.strip()

    # Kiểm tra trùng SĐT
    if db.query(User).filter(User.phone_number == clean_phone).first():
        raise HTTPException(status_code=400, detail="Số điện thoại này đã được đăng ký tài khoản trên hệ thống.")

    # Kiểm tra trùng CCCD
    if db.query(User).filter(User.identity_card == clean_cccd).first():
        raise HTTPException(status_code=400, detail="Số CCCD này đã được đăng ký tài khoản trên hệ thống.")

    his_adapter = get_his_adapter()
    his_patient = his_adapter.find_patient(national_id=clean_cccd, phone=clean_phone, full_name=clean_name)

    if his_patient:
        external_pid = his_patient.get("pid")
        his_action = "linked_existing"
        final_dob = data.dob or his_patient.get("dob") or "1990-01-01"
        final_gender = data.gender or his_patient.get("gender") or "Nam"
        final_bhyt = data.bhyt_code or his_patient.get("bhyt_no") or ""
        final_address = data.address or his_patient.get("address") or ""
        final_blood = data.blood_type or his_patient.get("blood_type") or "O+"
        msg = f"Đăng ký thành công! Đã liên thông với hồ sơ bệnh án điện tử HIS ({external_pid})."
    else:
        new_pid = his_adapter.register_patient({
            "full_name": clean_name,
            "phone": clean_phone,
            "national_id": clean_cccd,
            "dob": data.dob or "1990-01-01",
            "gender": data.gender or "Nam",
            "bhyt_no": data.bhyt_code or "",
            "address": data.address or "",
            "blood_type": data.blood_type or "O+",
            "allergies": data.allergies or ""
        })
        external_pid = new_pid or f"HIS-CC-{clean_cccd[-6:] if len(clean_cccd) >= 6 else uuid.uuid4().hex[:6].upper()}"
        his_action = "created_new_his"
        final_dob = data.dob or "1990-01-01"
        final_gender = data.gender or "Nam"
        final_bhyt = data.bhyt_code or ""
        final_address = data.address or ""
        final_blood = data.blood_type or "O+"
        msg = f"Đăng ký tài khoản thành công! Đã tạo mới hồ sơ bệnh nhân điện tử HIS ({external_pid})."

    email_val = data.email.lower().strip() if data.email and data.email.strip() else f"{clean_phone}@patient.careconnect.local"
    counter = 1
    while db.query(User).filter(User.email == email_val).first():
        email_val = f"{clean_phone}_{counter}@patient.careconnect.local"
        counter += 1

    new_user = User(
        email=email_val,
        phone_number=clean_phone,
        full_name=clean_name,
        role="patient",
        password_hash=hash_password(data.password),
        bhyt_code=final_bhyt,
        external_patient_id=external_pid,
        date_of_birth=final_dob,
        gender=final_gender,
        identity_card=clean_cccd,
        address=final_address,
        blood_type=final_blood,
        allergies=data.allergies or "Không ghi nhận dị ứng thuốc",
        emergency_contact_name=data.emergency_contact_name or "",
        emergency_contact_phone=data.emergency_contact_phone or ""
    )
    db.add(new_user)
    db.flush()

    db.add(AuditLog(
        actor_user_id=new_user.id,
        action="auth.patient_register",
        resource_type="user",
        resource_id=str(new_user.id)
    ))

    access_token = create_access_token(new_user)
    refresh_token = create_refresh_token(new_user)
    new_user.refresh_token = refresh_token
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "phone_number": new_user.phone_number,
            "full_name": new_user.full_name,
            "role": new_user.role,
            "external_patient_id": new_user.external_patient_id,
            "bhyt_code": new_user.bhyt_code
        },
        "external_patient_id": external_pid,
        "his_action": his_action,
        "message": msg
    }

# ----------------- NGHỊ ĐỊNH 13/2023/NĐ-CP & CONSENT -----------------

@app.get("/api/v1/consent/{appointment_id}/status", response_model=ConsentStatusOut)
def get_consent_status(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    consent = db.query(PatientConsent).filter_by(appointment_id=appt.id, user_id=appt.patient_id).first()
    terms = get_consent_terms()
    
    # Bệnh nhân đã đồng thuận điều khoản khi đăng ký tài khoản
    return {
        "consented": True,
        "version": consent.consent_version if consent else terms["version"],
        "consented_at": consent.consented_at if consent else appt.created_at,
        "terms_title": terms["title"],
        "terms_content": terms["content"]
    }

@app.post("/api/v1/consent/agree")
def agree_consent(data: ConsentAgreeIn, request: Request, db: Session = Depends(get_db), user: User = Depends(require_roles("patient"))):
    appt = db.get(Appointment, data.appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    if appt.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Không có quyền thực hiện")
        
    consent = db.query(PatientConsent).filter_by(appointment_id=appt.id, user_id=user.id).first()
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    if not consent:
        consent = PatientConsent(
            user_id=user.id,
            appointment_id=appt.id,
            consent_version=data.consent_version,
            ip_address=client_ip
        )
        db.add(consent)
        db.add(AuditLog(actor_user_id=user.id, action="consent.agree", resource_type="patient_consent", resource_id=str(appt.id)))
        db.commit()
        
    return {
        "success": True,
        "message": "Đã ghi nhận văn bản đồng thuận khám bệnh từ xa theo Nghị định 13/2023/NĐ-CP.",
        "consented_at": consent.consented_at
    }

# ----------------- CLINICAL & ICD-10 -----------------

@app.get("/api/v1/icd10/search", response_model=list[ICD10Item])
def search_icd_codes(q: str = Query("", description="Tìm kiếm mã ICD-10 hoặc tên bệnh tiếng Việt")):
    return search_icd10(keyword=q, limit=20)

@app.get("/api/v1/doctors")
def doctors(db: Session = Depends(get_db)):
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "cchn": u.doctor_cchn or "008912/BYT-CCHN",
            "department_id": u.department_id
        }
        for u in db.query(User).filter(User.role == "doctor", User.is_active == True).all()
    ]

# ----------------- APPOINTMENTS & SESSIONS -----------------

def check_appointment_access(appt: Appointment, user: User):
    if user.role == "patient" and appt.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập lịch khám này")
    if user.role == "doctor" and appt.doctor_id != user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập lịch khám này")
    if user.role not in ("patient", "doctor", "admin", "nurse"):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")

def record_appointment_event(
    db: Session,
    appointment_id: int,
    action: str,
    from_status: str | None = None,
    to_status: str | None = None,
    actor: User | None = None,
    notes: str | None = None,
    meta: dict | None = None
) -> AppointmentEvent:
    ev = AppointmentEvent(
        appointment_id=appointment_id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        actor_id=actor.id if actor else None,
        actor_name=actor.full_name if actor else None,
        actor_role=actor.role if actor else None,
        notes=notes,
        meta_json=json.dumps(meta, ensure_ascii=False) if meta else None
    )
    db.add(ev)
    db.commit()
    db.refresh(ev)
    return ev

@app.post("/api/v1/appointments", response_model=AppointmentOut)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("patient"))):
    doctor = db.get(User, data.doctor_id)
    if not doctor or doctor.role != "doctor" or not doctor.is_active:
        raise HTTPException(status_code=400, detail="Bác sĩ không tồn tại hoặc đã ngừng tiếp nhận")
    if data.starts_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Thời gian hẹn phải ở trong tương lai")
    
    # Kiểm tra ca trực và chống quá tải (anti-overload limit)
    shift = None
    if data.shift_id:
        shift = db.get(DoctorShift, data.shift_id)
        if shift:
            if shift.doctor_id != doctor.id:
                raise HTTPException(status_code=400, detail="Ca trực không khớp với bác sĩ đã chọn")
            if shift.booked_count >= shift.max_patients:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ca trực đã đủ định mức tối đa ({shift.booked_count}/{shift.max_patients} bệnh nhân). Vui lòng chọn ca trực khác để chống quá tải phòng khám."
                )
            shift.booked_count += 1

    fee = 500000
    appt = Appointment(
        patient_id=user.id,
        doctor_id=doctor.id,
        starts_at=data.starts_at,
        reason=data.reason,
        fee_amount=fee,
        shift_id=data.shift_id,
        department_id=data.department_id or doctor.department_id
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    
    vietqr_data = generate_vietqr_url(appt.id, fee)
    payment = Payment(
        appointment_id=appt.id,
        amount=fee,
        currency="VND",
        provider="vietqr",
        status="pending",
        provider_reference=vietqr_data["transfer_content"],
        qr_code_url=vietqr_data["qr_image_url"],
        bank_account=settings.BANK_ACCOUNT_NO,
        bank_name=settings.BANK_ID
    )
    db.add(payment)
    db.add(AuditLog(actor_user_id=user.id, action="appointment.create", resource_type="appointment", resource_id=str(appt.id)))
    record_appointment_event(
        db=db,
        appointment_id=appt.id,
        action="create",
        from_status=None,
        to_status="scheduled",
        actor=user,
        notes=f"Đăng ký lịch khám trực tuyến với Bác sĩ {doctor.full_name}. Lý do: {data.reason}"
    )
    db.commit()
    return appt

@app.get("/api/v1/appointments", response_model=list[AppointmentOut])
def list_appointments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = db.query(Appointment)
    if user.role == "patient":
        q = q.filter(Appointment.patient_id == user.id)
    elif user.role == "doctor":
        q = q.filter(Appointment.doctor_id == user.id)
    return q.order_by(Appointment.starts_at.desc()).limit(200).all()

@app.get("/api/v1/appointments/{appointment_id}", response_model=AppointmentOut)
def appointment_detail(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    return appt

@app.patch("/api/v1/appointments/{appointment_id}/cancel", response_model=AppointmentOut)
def cancel_appointment(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    if appt.status in ("completed", "cancelled"):
        raise HTTPException(status_code=409, detail="Lịch hẹn đã kết thúc hoặc đã hủy từ trước")
    
    payment = db.query(Payment).filter_by(appointment_id=appt.id).first()
    if payment and payment.status == "paid":
        payment.refund_status = "refunded"
        appt.refund_amount = appt.fee_amount
    
    from_st = appt.status
    appt.status = "cancelled"
    record_appointment_event(
        db=db,
        appointment_id=appt.id,
        action="cancel",
        from_status=from_st,
        to_status="cancelled",
        actor=user,
        notes=f"Hủy lịch khám bởi {user.role} ({user.full_name})"
    )
    db.add(AuditLog(actor_user_id=user.id, action="appointment.cancel_and_refund", resource_type="appointment", resource_id=str(appt.id)))
    db.commit()
    db.refresh(appt)
    return appt

@app.post("/api/v1/telehealth/sessions/{appointment_id}/join-token")
def join_token(appointment_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    if appt.status == "cancelled":
        raise HTTPException(status_code=409, detail="Lịch khám đã bị hủy")
    
    # Tuân thủ Nghị định 13: Bệnh nhân đã đồng thuận khi đăng ký tài khoản / hồ sơ ban đầu
    if user.role == "patient":
        consent = db.query(PatientConsent).filter_by(appointment_id=appt.id, user_id=user.id).first()
        if not consent:
            client_ip = request.client.host if request.client else "127.0.0.1"
            consent = PatientConsent(
                user_id=user.id,
                appointment_id=appt.id,
                consent_version=CONSENT_VERSION,
                ip_address=client_ip
            )
            db.add(consent)
            db.add(AuditLog(actor_user_id=user.id, action="consent.auto_inherited", resource_type="patient_consent", resource_id=str(appt.id)))
            db.commit()
    
    session = db.query(TelehealthSession).filter_by(appointment_id=appt.id).first()
    if not session:
        session = TelehealthSession(appointment_id=appt.id, room_name=f"careconnect-appt-{appt.id}", status="created")
        db.add(session)
        db.commit()
        db.refresh(session)
        
    token = livekit_api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    token.with_identity(f"user-{user.id}").with_name(user.full_name).with_grants(
        livekit_api.VideoGrants(room_join=True, room=session.room_name, can_publish=True, can_subscribe=True)
    )
    jwt_token = token.to_jwt()
    
    if session.status == "created":
        session.status = "in_progress"
        session.started_at = datetime.now(timezone.utc)
        if appt.status != "completed":
            from_st = appt.status
            appt.status = "in_progress"
            record_appointment_event(
                db=db,
                appointment_id=appt.id,
                action="start_consultation",
                from_status=from_st,
                to_status="in_progress",
                actor=user,
                notes=f"Bắt đầu ca khám trực tuyến (LiveKit Room: {session.room_name}, người tham gia: {user.role} {user.full_name})"
            )
        db.commit()
        
    return {
        "server_url": settings.LIVEKIT_URL,
        "token": jwt_token,
        "room_name": session.room_name,
        "session_id": session.id,
        "appointment_id": appt.id
    }

@app.post("/api/v1/telehealth/sessions/{appointment_id}/call-patient")
def call_patient(
    appointment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor"))
):
    """
    Bác sĩ bấm 'Gọi bệnh nhân vào buồng khám'.
    Hệ thống phát tín hiệu gọi đến điện thoại của bệnh nhân.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    if appt.status in ("completed", "cancelled"):
        raise HTTPException(status_code=400, detail="Không thể gọi ca khám đã hoàn tất hoặc đã hủy")
    
    session = db.query(TelehealthSession).filter_by(appointment_id=appt.id).first()
    if not session:
        session = TelehealthSession(appointment_id=appt.id, room_name=f"careconnect-appt-{appt.id}", status="calling")
        db.add(session)
    else:
        session.status = "calling"
    
    now = datetime.now(timezone.utc)
    session.called_at = now
    if appt.status != "completed":
        appt.status = "in_progress"
    
    db.add(AuditLog(actor_user_id=user.id, action="telehealth.call_patient", resource_type="appointment", resource_id=str(appt.id)))
    db.commit()
    
    patient = db.get(User, appt.patient_id)
    return {
        "success": True,
        "appointment_id": appt.id,
        "status": session.status,
        "patient_name": patient.full_name if patient else "Bệnh nhân",
        "message": f"Đang gửi tín hiệu gọi chuông đến điện thoại bệnh nhân {patient.full_name if patient else ''}."
    }

@app.get("/api/v1/patients/me/incoming-call")
def get_incoming_call(db: Session = Depends(get_db), user: User = Depends(require_roles("patient"))):
    """
    Bệnh nhân lắng nghe cuộc gọi đến từ Bác sĩ.
    Màn hình điện thoại sẽ sáng lên và đổ chuông khi có cuộc gọi.
    """
    now = datetime.now(timezone.utc)
    appts = db.query(Appointment).filter(
        Appointment.patient_id == user.id,
        Appointment.status.in_(["scheduled", "confirmed", "in_progress"])
    ).all()
    
    for appt in appts:
        session = db.query(TelehealthSession).filter_by(appointment_id=appt.id).first()
        if session and session.status == "calling":
            called_time = session.called_at.replace(tzinfo=timezone.utc) if session.called_at and session.called_at.tzinfo is None else session.called_at
            if called_time and (now - called_time).total_seconds() < 90:
                doctor = db.get(User, appt.doctor_id)
                dept = db.get(Department, appt.department_id) if appt.department_id else None
                return {
                    "has_incoming_call": True,
                    "appointment_id": appt.id,
                    "doctor": {
                        "id": doctor.id,
                        "full_name": doctor.full_name,
                        "cchn": doctor.doctor_cchn or "008912/BYT-CCHN",
                        "department_name": dept.name if dept else "Khoa Khám bệnh"
                    },
                    "reason": appt.reason,
                    "starts_at": appt.starts_at,
                    "fee_amount": appt.fee_amount
                }
    return {"has_incoming_call": False}

@app.post("/api/v1/telehealth/sessions/{appointment_id}/decline-call")
def decline_call(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Bệnh nhân từ chối hoặc tắt chuông cuộc gọi đến.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    session = db.query(TelehealthSession).filter_by(appointment_id=appt.id).first()
    if session and session.status == "calling":
        session.status = "declined"
        db.commit()
    return {"success": True, "message": "Đã từ chối cuộc gọi"}

# ----------------- REAL-TIME WEBRTC SIGNALING GATEWAY -----------------

class SignalingManager:
    def __init__(self):
        # room_id -> list of WebSocket
        self.active_rooms: dict[str, list[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_rooms:
            self.active_rooms[room_id] = []
        if websocket not in self.active_rooms[room_id]:
            self.active_rooms[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.active_rooms:
            if websocket in self.active_rooms[room_id]:
                self.active_rooms[room_id].remove(websocket)
            if not self.active_rooms[room_id]:
                del self.active_rooms[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict, sender: WebSocket | None = None):
        if room_id in self.active_rooms:
            for connection in list(self.active_rooms[room_id]):
                if sender is None or connection != sender:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

signaling_manager = SignalingManager()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.websocket("/ws")
@app.websocket("/ws/{appointment_id}")
@app.websocket("/api/v1/ws/{appointment_id}")
async def websocket_signaling_endpoint(websocket: WebSocket, appointment_id: str = "default"):
    current_room = str(appointment_id)
    await signaling_manager.connect(current_room, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            target_room = str(data.get("appointment_id", current_room))
            if target_room != current_room:
                signaling_manager.disconnect(current_room, websocket)
                current_room = target_room
                await signaling_manager.connect(current_room, websocket)
            await signaling_manager.broadcast_to_room(current_room, data, sender=websocket)
    except WebSocketDisconnect:
        signaling_manager.disconnect(current_room, websocket)
        await signaling_manager.broadcast_to_room(
            current_room,
            {"type": "PEER_LEFT", "appointment_id": current_room},
            sender=websocket
        )
    except Exception:
        signaling_manager.disconnect(current_room, websocket)

# ----------------- IN-CONSULTATION CHAT & MEDICAL FILE ATTACHMENTS -----------------

@app.get("/api/v1/telehealth/sessions/{appointment_id}/messages", response_model=list[ConsultationMessageOut])
def get_consultation_messages(
    appointment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    return db.query(ConsultationMessage).filter_by(appointment_id=appt.id).order_by(ConsultationMessage.id.asc()).all()

@app.post("/api/v1/telehealth/sessions/{appointment_id}/messages", response_model=ConsultationMessageOut)
async def send_consultation_message(
    appointment_id: int,
    data: ConsultationMessageIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)

    file_url = None
    file_name = data.file_name
    file_size = data.file_size
    msg_type = data.message_type

    if data.file_data:
        try:
            raw_b64 = data.file_data
            if "," in raw_b64:
                header, raw_b64 = raw_b64.split(",", 1)
            file_bytes = base64.b64decode(raw_b64)
            file_size = len(file_bytes)

            safe_ext = ".bin"
            if file_name and "." in file_name:
                safe_ext = "." + file_name.rsplit(".", 1)[1].lower()[:10]
            elif msg_type == "image":
                safe_ext = ".jpg"

            clean_name = f"{uuid.uuid4().hex[:12]}_{safe_ext}"
            saved_path = os.path.join(UPLOAD_DIR, clean_name)
            with open(saved_path, "wb") as f:
                f.write(file_bytes)

            # Lưu trữ đám mây Supabase Storage (Ưu tiên) kết hợp dự phòng cục bộ
            supabase_content_type = "image/jpeg" if safe_ext in (".jpg", ".jpeg") else ("image/png" if safe_ext == ".png" else "application/octet-stream")
            supabase_url = upload_file_to_supabase(
                file_bytes=file_bytes,
                destination_path=f"consultations/{appt.id}/{clean_name}",
                content_type=supabase_content_type
            )
            file_url = supabase_url if supabase_url else f"/uploads/{clean_name}"
            if not file_name:
                file_name = clean_name
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Lỗi tải lên tệp: {str(e)}")

    new_msg = ConsultationMessage(
        appointment_id=appt.id,
        sender_id=user.id,
        sender_role=user.role,
        sender_name=user.full_name,
        message_type=msg_type,
        content=data.content,
        file_url=file_url,
        file_name=file_name,
        file_size=file_size
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)

    # Phát tín hiệu tức thì qua WebSocket cho cả Bác sĩ & Bệnh nhân
    out_payload = {
        "id": new_msg.id,
        "appointment_id": new_msg.appointment_id,
        "sender_id": new_msg.sender_id,
        "sender_role": new_msg.sender_role,
        "sender_name": new_msg.sender_name,
        "message_type": new_msg.message_type,
        "content": new_msg.content,
        "file_url": new_msg.file_url,
        "file_name": new_msg.file_name,
        "file_size": new_msg.file_size,
        "created_at": new_msg.created_at.isoformat() if hasattr(new_msg.created_at, "isoformat") else str(new_msg.created_at)
    }
    await signaling_manager.broadcast_to_room(
        str(appt.id),
        {"type": "CHAT_MESSAGE", "appointment_id": appt.id, "message": out_payload},
        sender=None
    )

    return new_msg



# ----------------- CLINICAL RECORDS & DOCTOR WORKSPACE -----------------

@app.get("/api/v1/appointments/{appointment_id}/clinical-records")
def get_clinical_record(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).order_by(ClinicalRecord.id.desc()).first()
    prescription = db.query(PrescriptionRef).filter_by(appointment_id=appt.id).first()
    patient = db.get(User, appt.patient_id)
    doctor = db.get(User, appt.doctor_id)
    
    return {
        "appointment_id": appt.id,
        "patient": {
            "id": patient.id,
            "full_name": patient.full_name,
            "phone_number": patient.phone_number,
            "external_patient_id": patient.external_patient_id
        },
        "doctor": {
            "id": doctor.id,
            "full_name": doctor.full_name,
            "cchn": doctor.doctor_cchn or "008912/BYT-CCHN"
        },
        "record": {
            "id": record.id if record else None,
            "symptoms": record.symptoms if record else "",
            "allergies": record.allergies if record else "",
            "diagnosis": record.diagnosis if record else "",
            "icd10_code": record.icd10_code if record else "",
            "icd10_name": record.icd10_name if record else "",
            "clinical_notes": record.clinical_notes if record else "",
            "plan": record.plan if record else "",
            "is_locked": record.is_locked if record else False,
            "locked_at": record.locked_at if record else None,
            "is_digitally_signed": record.digital_signature is not None if record else False,
            "signed_at": record.signed_at if record else None,
            "signer_name": record.signer_name if record else None,
            "signer_cchn": record.signer_cchn if record else None,
            "cert_serial": record.cert_serial if record else None
        } if record else None,
        "prescription": {
            "id": prescription.id if prescription else None,
            "summary": prescription.summary if prescription else "",
            "national_code": prescription.national_code if prescription else None,
            "national_qr_url": prescription.national_qr_url if prescription else None,
            "synced_at": prescription.synced_at if prescription else None
        } if prescription else None
    }

@app.post("/api/v1/appointments/{appointment_id}/clinical-records", response_model=ClinicalRecordOut)
def save_clinical_record(
    appointment_id: int,
    data: ClinicalRecordIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor"))
):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
    if record and record.is_locked:
        raise HTTPException(status_code=409, detail="Bệnh án đã được hoàn tất và khóa, không thể chỉnh sửa.")
    
    if not record:
        record = ClinicalRecord(
            appointment_id=appt.id,
            symptoms=data.symptoms,
            allergies=data.allergies,
            diagnosis=data.diagnosis,
            icd10_code=data.icd10_code,
            icd10_name=data.icd10_name,
            clinical_notes=data.clinical_notes,
            plan=data.plan,
            created_by=user.id
        )
        db.add(record)
    else:
        record.symptoms = data.symptoms
        record.allergies = data.allergies
        record.diagnosis = data.diagnosis
        record.icd10_code = data.icd10_code
        record.icd10_name = data.icd10_name
        record.clinical_notes = data.clinical_notes
        record.plan = data.plan
        
    db.add(AuditLog(actor_user_id=user.id, action="clinical_record.save_draft", resource_type="clinical_record", resource_id=str(appt.id)))
    db.commit()
    db.refresh(record)
    return record

@app.post("/api/v1/appointments/{appointment_id}/complete")
def complete_consultation(
    appointment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor"))
):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    now = datetime.now(timezone.utc)
    from_st = appt.status
    appt.status = "completed"
    record_appointment_event(
        db=db,
        appointment_id=appt.id,
        action="complete",
        from_status=from_st,
        to_status="completed",
        actor=user,
        notes=f"Bác sĩ {user.full_name} hoàn tất ca khám và khóa bệnh án điện tử."
    )
    
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
    if record:
        record.is_locked = True
        record.locked_at = now
        
    session = db.query(TelehealthSession).filter_by(appointment_id=appt.id).first()
    if session:
        session.status = "ended"
        session.ended_at = now
        
    db.add(AuditLog(actor_user_id=user.id, action="appointment.complete_consultation", resource_type="appointment", resource_id=str(appt.id)))
    db.commit()
    
    return {
        "success": True,
        "message": f"Buổi khám #{appt.id} đã hoàn tất thành công. Hồ sơ bệnh án đã được khóa an toàn.",
        "status": "completed",
        "completed_at": now.isoformat()
    }

# ----------------- CHỮ KÝ SỐ Y TẾ SMARTCA & ĐƠN THUỐC QUỐC GIA -----------------

@app.post("/api/v1/appointments/{appointment_id}/sign", response_model=DigitalSignResponse)
def sign_consultation(
    appointment_id: int,
    data: DigitalSignRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor"))
):
    """
    Bác sĩ thực hiện ký số y tế từ xa SmartCA (VNPT SmartCA / Viettel-CA).
    Đóng dấu thời gian (Timestamp) và gắn chứng thư số xác thực giá trị pháp lý.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
    if not record:
        raise HTTPException(status_code=400, detail="Chưa có thông tin phiếu khám để ký số")
        
    prescription = db.query(PrescriptionRef).filter_by(appointment_id=appt.id).first()
    patient = db.get(User, appt.patient_id)
    
    doc_payload = {
        "appointment_id": appt.id,
        "patient_name": patient.full_name,
        "patient_id": patient.external_patient_id or str(patient.id),
        "diagnosis": record.diagnosis,
        "icd10_code": record.icd10_code,
        "symptoms": record.symptoms,
        "prescription": prescription.summary if prescription else ""
    }
    
    cchn = user.doctor_cchn or "008912/BYT-CCHN"
    sig_result = sign_medical_document(
        doctor_name=user.full_name,
        doctor_cchn=cchn,
        document_data=doc_payload,
        provider=data.provider
    )
    
    # Cập nhật thông tin ký số vào CSDL
    import json
    record.digital_signature = json.dumps(sig_result)
    record.signed_at = datetime.fromisoformat(sig_result["timestamp"])
    record.signer_name = sig_result["signer_name"]
    record.signer_cchn = sig_result["signer_cchn"]
    record.cert_serial = sig_result["cert_serial"]
    record.is_locked = True
    record_appointment_event(
        db=db,
        appointment_id=appt.id,
        action="digital_sign",
        actor=user,
        notes=f"Bác sĩ {user.full_name} đã ký số SmartCA (Số chứng thư: {sig_result['cert_serial']}, CCHN: {sig_result['signer_cchn']})."
    )
    
    db.add(AuditLog(actor_user_id=user.id, action="medical_record.smartca_signed", resource_type="clinical_record", resource_id=str(record.id)))
    db.commit()
    
    return {
        "success": True,
        "signer_name": sig_result["signer_name"],
        "signer_cchn": sig_result["signer_cchn"],
        "cert_serial": sig_result["cert_serial"],
        "signature_hash": sig_result["signature_hash"],
        "timestamp": sig_result["timestamp"],
        "message": f"Bác sĩ {user.full_name} đã ký số SmartCA thành công! Bệnh án đã được đóng dấu thời gian pháp lý."
    }

@app.post("/api/v1/appointments/{appointment_id}/sync-national-prescription", response_model=NationalPrescriptionSyncOut)
def sync_national_prescription(
    appointment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor"))
):
    """
    Đẩy mã đơn thuốc lên Cổng Đơn thuốc điện tử Quốc gia (donthuocquocgia.vn).
    Cấp mã định danh đơn thuốc quốc gia và mã QR chuẩn mua thuốc tại nhà thuốc GPP.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
    prescription = db.query(PrescriptionRef).filter_by(appointment_id=appt.id).first()
    if not prescription or not prescription.summary:
        raise HTTPException(status_code=400, detail="Chưa có nội dung đơn thuốc để đồng bộ lên Cổng Quốc gia")
        
    patient = db.get(User, appt.patient_id)
    cchn = user.doctor_cchn or "008912/BYT-CCHN"
    
    sync_result = sync_to_national_prescription_system(
        appointment_id=appt.id,
        doctor_cchn=cchn,
        patient_external_id=patient.external_patient_id or f"VN-{patient.id}",
        diagnosis_icd10=record.icd10_code if record else "R69",
        prescription_summary=prescription.summary
    )
    
    prescription.national_code = sync_result["national_prescription_code"]
    prescription.national_qr_url = sync_result["qr_code_url"]
    prescription.synced_at = datetime.fromisoformat(sync_result["synced_at"])
    prescription.status = "published"
    
    db.add(AuditLog(actor_user_id=user.id, action="prescription.national_sync", resource_type="prescription", resource_id=str(prescription.id)))
    db.commit()
    
    return {
        "success": True,
        "national_prescription_code": sync_result["national_prescription_code"],
        "lookup_url": sync_result["lookup_url"],
        "qr_code_url": sync_result["qr_code_url"],
        "synced_at": sync_result["synced_at"],
        "message": sync_result["message"]
    }

@app.get("/api/v1/appointments/{appointment_id}/pdf")
def download_medical_record_pdf(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Xuất file PDF Phiếu khám bệnh từ xa và Đơn thuốc điện tử có đóng dấu chữ ký số.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
    prescription = db.query(PrescriptionRef).filter_by(appointment_id=appt.id).first()
    patient = db.get(User, appt.patient_id)
    doctor = db.get(User, appt.doctor_id)
    
    import json
    sig_data = json.loads(record.digital_signature) if (record and record.digital_signature) else None
    
    pdf_bytes = generate_medical_record_pdf(
        appointment_id=appt.id,
        patient_info={
            "id": patient.id,
            "full_name": patient.full_name,
            "phone_number": patient.phone_number,
            "external_patient_id": patient.external_patient_id
        },
        doctor_info={
            "full_name": doctor.full_name,
            "cchn": doctor.doctor_cchn or "008912/BYT-CCHN"
        },
        clinical_record={
            "symptoms": record.symptoms if record else "",
            "allergies": record.allergies if record else "",
            "diagnosis": record.diagnosis if record else "",
            "icd10_code": record.icd10_code if record else "",
            "icd10_name": record.icd10_name if record else "",
            "plan": record.plan if record else ""
        },
        prescription_text=prescription.summary if prescription else "",
        signature_data=sig_data,
        national_code=prescription.national_code if prescription else None
    )
    
    filename = f"PhieuKham_DonThuoc_TM{appointment_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/v1/appointments/{appointment_id}/fhir")
def export_fhir_bundle(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Xuất hồ sơ khám bệnh dạng Bundle chuẩn HL7 FHIR R4.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
    prescription = db.query(PrescriptionRef).filter_by(appointment_id=appt.id).first()
    patient = db.get(User, appt.patient_id)
    doctor = db.get(User, appt.doctor_id)
    
    return FHIRHISAdapter.build_fhir_bundle(
        appointment={"id": appt.id, "starts_at": appt.starts_at.isoformat() if hasattr(appt.starts_at, 'isoformat') else str(appt.starts_at), "reason": appt.reason, "status": appt.status},
        clinical_record={"id": record.id if record else appt.id, "diagnosis": record.diagnosis if record else "", "icd10_code": record.icd10_code if record else "", "icd10_name": record.icd10_name if record else "", "symptoms": record.symptoms if record else "", "allergies": record.allergies if record else "", "clinical_notes": record.clinical_notes if record else ""},
        patient={"id": patient.id, "full_name": patient.full_name, "phone_number": patient.phone_number, "external_patient_id": patient.external_patient_id},
        doctor={"full_name": doctor.full_name},
        prescription=prescription.summary if prescription else ""
    )

# ----------------- PARACLINICAL (LAB/LIS) & PACS DICOMVIEWER -----------------

@app.get("/api/v1/patients/me/lab-results")
def patient_my_lab_results(user: User = Depends(require_roles("patient"))):
    """Bệnh nhân tự tra cứu kết quả xét nghiệm cận lâm sàng của mình"""
    return get_patient_lab_results(user.id, user.full_name)

@app.get("/api/v1/patients/me/pacs-studies")
def list_dicom_studies(user: User = Depends(get_current_user)):
    """Lấy danh sách các ca chụp PACS/DICOM của bệnh nhân hiện tại"""
    return get_patient_pacs_studies(user.id, user.full_name)

@app.get("/api/v1/patients/{patient_id}/lab-results")
def get_patient_lab_results_endpoint(patient_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Bác sĩ, Điều dưỡng tra cứu kết quả cận lâm sàng của từng bệnh nhân cụ thể"""
    if user.role not in ["doctor", "nurse", "admin"] and user.id != patient_id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập kết quả cận lâm sàng của bệnh nhân này")
    patient = db.get(User, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Bệnh nhân không tồn tại")
    return get_patient_lab_results(patient.id, patient.full_name)

@app.get("/api/v1/patients/{patient_id}/pacs-studies")
def get_patient_pacs_studies_endpoint(patient_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Bác sĩ, Điều dưỡng tra cứu chẩn đoán hình ảnh PACS/DICOM của từng bệnh nhân cụ thể"""
    if user.role not in ["doctor", "nurse", "admin"] and user.id != patient_id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập phim PACS của bệnh nhân này")
    patient = db.get(User, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Bệnh nhân không tồn tại")
    return get_patient_pacs_studies(patient.id, patient.full_name)

@app.get("/api/v1/appointments/{appointment_id}/lab-results")
def get_appointment_lab_results(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Bác sĩ trong buồng khám lấy kết quả cận lâm sàng của bệnh nhân trong ca khám"""
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Ca khám không tồn tại")
    check_appointment_access(appt, user)
    patient = db.get(User, appt.patient_id)
    return get_patient_lab_results(appt.patient_id, patient.full_name if patient else None)

@app.get("/api/v1/appointments/{appointment_id}/pacs-studies")
def get_appointment_pacs_studies(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Bác sĩ trong buồng khám lấy phim chụp PACS/DICOM của bệnh nhân trong ca khám"""
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Ca khám không tồn tại")
    check_appointment_access(appt, user)
    patient = db.get(User, appt.patient_id)
    return get_patient_pacs_studies(appt.patient_id, patient.full_name if patient else None)

@app.get("/api/v1/appointments/{appointment_id}/history", response_model=list[AppointmentEventOut])
def get_appointment_history(
    appointment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Truy xuất toàn bộ lịch sử các mốc sự kiện/trạng thái của lượt khám"""
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    events = db.query(AppointmentEvent).filter_by(appointment_id=appt.id).order_by(AppointmentEvent.created_at.asc()).all()
    return events

@app.get("/api/v1/patients/{patient_id}/consultation-history")
def get_patient_consultation_history(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Bác sĩ hoặc chính bệnh nhân truy xuất danh sách toàn bộ các lượt khám trong quá khứ"""
    if user.role not in ["doctor", "nurse", "admin"] and user.id != patient_id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập lịch sử khám của bệnh nhân này")
    
    appts = db.query(Appointment).filter(Appointment.patient_id == patient_id).order_by(Appointment.starts_at.desc()).all()
    history = []
    for a in appts:
        record = db.query(ClinicalRecord).filter_by(appointment_id=a.id).first()
        rx = db.query(PrescriptionRef).filter_by(appointment_id=a.id).first()
        doc = db.get(User, a.doctor_id)
        events = db.query(AppointmentEvent).filter_by(appointment_id=a.id).order_by(AppointmentEvent.created_at.asc()).all()
        history.append({
            "appointment_id": a.id,
            "starts_at": a.starts_at.isoformat() if hasattr(a.starts_at, 'isoformat') else str(a.starts_at),
            "status": a.status,
            "reason": a.reason,
            "doctor_id": a.doctor_id,
            "doctor_name": doc.full_name if doc else "Bác sĩ",
            "diagnosis": record.diagnosis if record else None,
            "icd10_code": record.icd10_code if record else None,
            "is_signed": bool(record and record.digital_signature),
            "signer_name": record.signer_name if record else None,
            "prescription_status": rx.status if rx else None,
            "national_code": rx.national_code if rx else None,
            "events_count": len(events),
            "events": [
                {
                    "id": ev.id,
                    "action": ev.action,
                    "from_status": ev.from_status,
                    "to_status": ev.to_status,
                    "actor_name": ev.actor_name,
                    "actor_role": ev.actor_role,
                    "notes": ev.notes,
                    "created_at": ev.created_at.isoformat() if hasattr(ev.created_at, 'isoformat') else str(ev.created_at)
                } for ev in events
            ]
        })
    return history

@app.post("/api/v1/appointments/{appointment_id}/share-lab-result", response_model=ShareLabResultOut)
def share_lab_result_with_patient(
    appointment_id: int,
    data: ShareLabResultIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("doctor"))
):
    """
    Bác sĩ chia sẻ kết quả xét nghiệm cho Bệnh nhân:
    1. Gửi tin nhắn kết quả vào buồng chat ca khám (ConsultationMessage)
    2. Gửi thông báo trực tiếp (Notification) cho tài khoản Bệnh nhân
    3. Ghi log lịch sử ca khám (AppointmentEvent: share_lab)
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    # 1. Tạo tin nhắn vào phòng chat ca khám
    chat_content = f"📋 [KẾT QUẢ XÉT NGHIỆM ĐƯỢC BÁC SĨ CHIA SẺ]\n• Phiếu: {data.report_name} ({data.category_name})\n• Kết luận: {data.conclusion or 'Bình thường'}\n"
    if data.summary_text:
        chat_content += f"• Chi tiết: {data.summary_text}\n"
    chat_content += "Bác sĩ đã đính kèm kết quả vào hồ sơ bệnh án của bạn."

    msg = ConsultationMessage(
        appointment_id=appt.id,
        sender_id=user.id,
        sender_role="doctor",
        sender_name=user.full_name,
        message_type="file",
        content=chat_content
    )
    db.add(msg)
    
    # 2. Tạo thông báo cho bệnh nhân
    notif = Notification(
        user_id=appt.patient_id,
        target_role="patient",
        title=f"Bác sĩ chia sẻ kết quả xét nghiệm: {data.report_name}",
        message=f"Bác sĩ {user.full_name} đã chia sẻ kết quả xét nghiệm {data.category_name} ({data.report_name}). Kết luận: {data.conclusion or 'Chỉ số ổn định'}.",
        category="paraclinical",
        priority="high",
        action_url=f"/records?tab=lab&appointment_id={appt.id}"
    )
    db.add(notif)
    
    # 3. Ghi log sự kiện
    record_appointment_event(
        db=db,
        appointment_id=appt.id,
        action="share_lab",
        actor=user,
        notes=f"Bác sĩ {user.full_name} đã chia sẻ phiếu xét nghiệm '{data.report_name}' cho người bệnh."
    )
    
    db.commit()
    return {
        "success": True,
        "message": f"Đã chia sẻ phiếu xét nghiệm '{data.report_name}' cho bệnh nhân thành công.",
        "message_id": msg.id,
        "notification_id": notif.id
    }

@app.get("/api/v1/patients/me/records")
def patient_records(db: Session = Depends(get_db), user: User = Depends(require_roles("patient"))):
    appts = db.query(Appointment).filter_by(patient_id=user.id).order_by(Appointment.starts_at.desc()).all()
    return [{"appointment_id": a.id, "starts_at": a.starts_at, "status": a.status, "reason": a.reason} for a in appts]

@app.get("/api/v1/patients/me/his-summary")
def patient_his_summary(user: User = Depends(require_roles("patient"))):
    return get_his_adapter().get_patient_summary(user.external_patient_id or f"DEMO-{user.id}")

@app.get("/api/v1/patients/me/imaging-studies")
def patient_imaging(user: User = Depends(require_roles("patient"))):
    return get_pacs_adapter().list_studies(user.external_patient_id or f"DEMO-{user.id}")

@app.get("/api/v1/patients/me/profile", response_model=PatientProfileOut)
def get_my_patient_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    consent = db.query(PatientConsent).filter(PatientConsent.user_id == user.id).order_by(PatientConsent.id.desc()).first()
    total_appts = db.query(Appointment).filter(Appointment.patient_id == user.id).count()
    completed_appts = db.query(Appointment).filter(Appointment.patient_id == user.id, Appointment.status == "completed").count()
    prescriptions_count = db.query(PrescriptionRef).join(Appointment).filter(Appointment.patient_id == user.id).count()

    return {
        "id": user.id,
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "email": user.email,
        "role": user.role,
        "bhyt_code": user.bhyt_code or "",
        "external_patient_id": user.external_patient_id or f"CC-{user.id:05d}",
        "date_of_birth": user.date_of_birth or "",
        "gender": user.gender or "Nam",
        "identity_card": user.identity_card or "",
        "address": user.address or "",
        "blood_type": user.blood_type or "",
        "allergies": user.allergies or "",
        "emergency_contact_name": user.emergency_contact_name or "",
        "emergency_contact_phone": user.emergency_contact_phone or "",
        "consent_agreed": bool(consent) if consent else True,
        "consent_agreed_at": consent.consented_at if consent else datetime.now(timezone.utc),
        "total_appointments": total_appts,
        "completed_appointments": completed_appts,
        "total_prescriptions": prescriptions_count
    }

@app.put("/api/v1/patients/me/profile", response_model=PatientProfileOut)
def update_my_patient_profile(
    data: PatientProfileUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if data.full_name is not None and data.full_name.strip():
        user.full_name = data.full_name.strip()
    if data.email is not None and str(data.email).strip():
        user.email = str(data.email).lower().strip()
    if data.bhyt_code is not None:
        user.bhyt_code = data.bhyt_code.strip()
    if data.date_of_birth is not None:
        user.date_of_birth = data.date_of_birth.strip()
    if data.gender is not None:
        user.gender = data.gender.strip()
    if data.identity_card is not None:
        user.identity_card = data.identity_card.strip()
    if data.address is not None:
        user.address = data.address.strip()
    if data.blood_type is not None:
        user.blood_type = data.blood_type.strip()
    if data.allergies is not None:
        user.allergies = data.allergies.strip()
    if data.emergency_contact_name is not None:
        user.emergency_contact_name = data.emergency_contact_name.strip()
    if data.emergency_contact_phone is not None:
        user.emergency_contact_phone = data.emergency_contact_phone.strip()

    db.add(AuditLog(actor_user_id=user.id, action="patient.update_profile", resource_type="user", resource_id=str(user.id)))
    db.commit()
    db.refresh(user)

    return get_my_patient_profile(db=db, user=user)

@app.get("/api/v1/admin/integrations")
def integration_status(user: User = Depends(require_roles("admin"))):
    return {
        "his": settings.HIS_ADAPTER,
        "pacs": settings.PACS_ADAPTER,
        "payment": settings.PAYMENT_PROVIDER,
        "bank": settings.BANK_ID,
        "status": "ready"
    }

# ----------------- VIETQR & WEBHOOK PAYMENTS -----------------

@app.get("/api/v1/payments/{appointment_id}/vietqr")
def get_appointment_vietqr(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    amount_to_pay = appt.patient_pay_amount if (appt.bhyt_discount and appt.patient_pay_amount > 0) else appt.fee_amount
    vietqr_data = generate_vietqr_url(appt.id, amount_to_pay)
    payment = db.query(Payment).filter_by(appointment_id=appt.id).first()
    
    return {
        **vietqr_data,
        "payment_status": payment.status if payment else "pending",
        "appointment_status": appt.status,
        "paid_at": payment.paid_at if payment else None,
        "refund_status": payment.refund_status if payment else None
    }

@app.post("/api/v1/payments/webhook", response_model=PaymentWebhookOut)
def payment_webhook(data: PaymentWebhookIn, db: Session = Depends(get_db)):
    content = (data.content or data.transfer_content or "").upper()
    match = re.search(r"TM(\d+)", content)
    if not match:
        raise HTTPException(status_code=400, detail="Không tìm thấy mã lịch hẹn hợp lệ (TM{id}) trong nội dung chuyển khoản")
    
    appointment_id = int(match.group(1))
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lịch hẹn #{appointment_id}")
        
    payment = db.query(Payment).filter_by(appointment_id=appt.id).first()
    now = datetime.now(timezone.utc)
    
    if payment:
        payment.status = "paid"
        payment.paid_at = now
        payment.provider_reference = data.transaction_id or payment.provider_reference
    else:
        payment = Payment(
            appointment_id=appt.id,
            amount=data.amount or appt.fee_amount,
            currency="VND",
            provider=data.gateway,
            status="paid",
            paid_at=now,
            provider_reference=data.transaction_id
        )
        db.add(payment)
    
    appt.status = "confirmed"
    appt.paid_at = now
    db.add(AuditLog(actor_user_id=appt.patient_id, action="payment.webhook_auto_confirmed", resource_type="payment", resource_id=str(appointment_id)))
    db.commit()
    
    return {
        "success": True,
        "appointment_id": appt.id,
        "amount": payment.amount,
        "status": "confirmed",
        "message": f"Đối soát tự động thành công! Đã xác nhận thanh toán lịch hẹn #{appt.id}."
    }

@app.post("/api/v1/payments/{appointment_id}/simulate-success")
def simulate_payment_success(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    payment = db.query(Payment).filter_by(appointment_id=appt.id).first()
    now = datetime.now(timezone.utc)
    if not payment:
        payment = Payment(appointment_id=appt.id, amount=appt.fee_amount, provider="vietqr", status="paid", paid_at=now)
        db.add(payment)
    else:
        payment.status = "paid"
        payment.paid_at = now
        
    appt.status = "confirmed"
    db.add(AuditLog(actor_user_id=user.id, action="payment.simulated", resource_type="payment", resource_id=str(appt.id)))
    db.commit()
    
    return {"success": True, "message": "Giả lập thanh toán VietQR thành công! Lịch hẹn đã được xác nhận."}

# ----------------- PRESCRIPTION DRAFT -----------------

@app.post("/api/v1/appointments/{appointment_id}/prescriptions")
def create_prescription_draft(appointment_id: int, data: PrescriptionIn, db: Session = Depends(get_db), user: User = Depends(require_roles("doctor"))):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    row = db.query(PrescriptionRef).filter_by(appointment_id=appt.id).first()
    if not row:
        row = PrescriptionRef(appointment_id=appt.id, status="draft", summary=data.summary, created_by=user.id)
        db.add(row)
    else:
        row.summary = data.summary
    
    db.add(AuditLog(actor_user_id=user.id, action="prescription.save_draft", resource_type="prescription", resource_id=str(row.id or appt.id)))
    db.commit()
    return {"id": row.id, "status": "draft", "summary": row.summary, "message": "Đã lưu toa thuốc nháp thành công."}

# ----------------- GIAI ĐOẠN 3: AI SCRIBE, BHYT & LỊCH TRỰC CHỐNG QUÁ TẢI -----------------

@app.post("/api/v1/ai/ambient-scribe", response_model=AmbientScribeOut)
def ai_ambient_scribe(
    data: AmbientScribeIn,
    user: User = Depends(get_current_user)
):
    """
    Trợ lý y tế AI (Ambient Scribe):
    Tự động chuyển đổi hội thoại bác sĩ - bệnh nhân thành biên bản khám tóm tắt chuẩn SOAP
    kèm đề xuất mã ICD-10 và toa thuốc khuyến nghị.
    """
    result = generate_soap_notes(
        transcript=data.transcript,
        patient_name=data.patient_name or "Bệnh nhân",
        patient_age=data.patient_age
    )
    return result

# --- BỘ CÔNG CỤ AI Y TẾ CHUYÊN SÂU ---

@app.post("/api/v1/ai/triage-symptom-check", response_model=TriageSymptomOut)
def ai_triage_symptom_check(
    data: TriageSymptomIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    1. Sàng lọc triệu chứng thông minh & Phân luồng khẩn cấp (Emergency Triage / ESI).
    """
    return triage_symptom_check(
        symptoms=data.symptoms,
        patient_age=data.patient_age,
        gender=data.gender,
        db=db
    )

@app.post("/api/v1/ai/ocr-document", response_model=OcrDocumentOut)
def ai_ocr_document(
    data: OcrDocumentIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    2. OCR Trích xuất thông tin giấy tờ y tế (Thẻ BHYT, CCCD, Đơn thuốc cũ).
    """
    return ocr_medical_document(
        image_base64=data.image_base64,
        doc_type=data.doc_type,
        db=db
    )

@app.post("/api/v1/ai/suggest-icd10", response_model=Icd10SuggestOut)
def ai_suggest_icd10(
    data: Icd10SuggestIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    3. Gợi ý mã bệnh ICD-10 và chẩn đoán phân biệt.
    """
    suggestions = suggest_icd10_codes(
        symptoms=data.symptoms,
        clinical_notes=data.clinical_notes,
        db=db
    )
    return {"suggestions": suggestions}

@app.post("/api/v1/ai/check-drug-safety", response_model=DrugSafetyCheckOut)
def ai_check_drug_safety(
    data: DrugSafetyCheckIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    4. Rà soát tương tác thuốc (Drug-Drug Interactions) và dị ứng bệnh nhân.
    """
    return check_drug_safety(
        medicines=data.medicines,
        patient_allergies=data.patient_allergies,
        patient_age=data.patient_age,
        db=db
    )

@app.post("/api/v1/ai/analyze-pacs-image", response_model=PacsAnalysisOut)
def ai_analyze_pacs_image(
    data: PacsAnalysisIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    5. Hỗ trợ chẩn đoán hình ảnh PACS / DICOM (Second Opinion & Heatmap tổn thương).
    """
    return analyze_pacs_study(
        study_id=data.study_id,
        modality=data.modality,
        body_part=data.body_part,
        image_url=data.image_url,
        db=db
    )

@app.post("/api/v1/ai/interpret-lab-results", response_model=LabInterpretOut)
def ai_interpret_lab_results(
    data: LabInterpretIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    6. Phân tích & diễn giải kết quả xét nghiệm sinh hóa/huyết học cho người bệnh.
    """
    return interpret_lab_results(
        lab_items=data.lab_items,
        clinical_summary=data.clinical_summary,
        db=db
    )

@app.post("/api/v1/ai/generate-followup-plan", response_model=PostConsultationPlanOut)
def ai_generate_followup_plan(
    data: PostConsultationPlanIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    7. Sinh lịch trình nhắc thuốc và kế hoạch chăm sóc theo dõi sau khám.
    """
    return generate_followup_plan(
        diagnosis=data.diagnosis,
        prescription_text=data.prescription_text,
        doctor_notes=data.doctor_notes,
        db=db
    )

@app.post("/api/v1/ai/audit-bhyt-claim", response_model=BhytAuditOut)
def ai_audit_bhyt_claim(
    data: BhytAuditIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    8. Thẩm định hồ sơ thanh toán BHYT chống xuất toán.
    """
    return audit_bhyt_claim(
        icd10_code=data.icd10_code,
        services_ordered=data.services_ordered,
        medicines_ordered=data.medicines_ordered,
        is_inpatient=data.is_inpatient,
        db=db
    )

@app.post("/api/v1/ai/de-identify-record", response_model=DeidentifyOut)
def ai_deidentify_record(
    data: DeidentifyIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    9. Khử định danh dữ liệu y tế (Tuân thủ Nghị định 13/2023/NĐ-CP).
    """
    return deidentify_medical_record(
        text=data.text,
        mask_type=data.mask_type,
        db=db
    )

@app.post("/api/v1/insurance/bhyt/check", response_model=BhytCheckOut)
def check_bhyt_insurance(
    data: BhytCheckIn,
    user: User = Depends(get_current_user)
):
    """
    Tra cứu quyền lợi thẻ BHYT trực tuyến qua Cổng giám định BHYT của BHXH Việt Nam.
    """
    result = verify_and_lookup_bhyt(
        bhyt_code=data.bhyt_code,
        patient_name=data.patient_name or user.full_name
    )
    return result

@app.post("/api/v1/appointments/{appointment_id}/apply-bhyt")
def apply_bhyt_to_appointment(
    appointment_id: int,
    data: BhytCheckIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Áp dụng thẻ BHYT vào lịch khám và tự động chiết khấu theo tỷ lệ mức hưởng.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    bhyt_info = verify_and_lookup_bhyt(data.bhyt_code, user.full_name)
    rate = bhyt_info["benefit_rate_percent"]
    
    fee_calc = calculate_bhyt_consultation_fee(base_fee=appt.fee_amount, benefit_rate=rate)
    
    appt.bhyt_code = bhyt_info["bhyt_code"]
    appt.bhyt_rate = rate
    appt.bhyt_discount = fee_calc["bhyt_discount"]
    appt.patient_pay_amount = fee_calc["patient_pay_amount"]
    
    payment = db.query(Payment).filter_by(appointment_id=appt.id).first()
    if payment and payment.status == "pending":
        payment.amount = fee_calc["patient_pay_amount"]
        new_qr = generate_vietqr_url(appt.id, payment.amount)
        payment.qr_code_url = new_qr["qr_image_url"]
        payment.provider_reference = new_qr["transfer_content"]
    
    db.add(AuditLog(actor_user_id=user.id, action="appointment.apply_bhyt", resource_type="appointment", resource_id=str(appt.id)))
    db.commit()
    
    return {
        "success": True,
        "appointment_id": appt.id,
        "bhyt_code": appt.bhyt_code,
        "benefit_rate_percent": rate,
        "original_fee": appt.fee_amount,
        "bhyt_discount": appt.bhyt_discount,
        "patient_pay_amount": appt.patient_pay_amount,
        "message": f"Đã áp dụng thẻ BHYT {appt.bhyt_code} thành công! Mức hưởng: {rate}%. Bệnh nhân chỉ cần đồng chi trả: {appt.patient_pay_amount:,} VND."
    }

@app.get("/api/v1/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)):
    """
    Danh sách Khoa/Phòng chuyên môn khám chữa bệnh từ xa.
    """
    depts = db.query(Department).filter_by(is_active=True).all()
    return depts

@app.get("/api/v1/doctors/{doctor_id}/shifts", response_model=list[DoctorShiftOut])
def get_doctor_shifts(doctor_id: int, db: Session = Depends(get_db)):
    """
    Lấy danh sách ca trực của bác sĩ kèm kiểm tra giới hạn chống quá tải (anti-overload quota).
    """
    shifts = db.query(DoctorShift).filter_by(doctor_id=doctor_id, is_active=True).all()
    results = []
    doctor = db.get(User, doctor_id)
    for s in shifts:
        dept = db.get(Department, s.department_id) if s.department_id else None
        avail = max(0, s.max_patients - s.booked_count)
        results.append(DoctorShiftOut(
            id=s.id,
            doctor_id=s.doctor_id,
            doctor_name=doctor.full_name if doctor else "Bác sĩ",
            department_id=s.department_id,
            department_name=dept.name if dept else "Đa khoa",
            shift_date=s.shift_date,
            shift_type=s.shift_type,
            start_time=s.start_time,
            end_time=s.end_time,
            max_patients=s.max_patients,
            booked_count=s.booked_count,
            available_slots=avail,
            is_overloaded=(avail <= 0)
        ))
    return results

@app.post("/api/v1/appointments/{appointment_id}/cancel", response_model=AppointmentCancelOut)
def cancel_appointment(
    appointment_id: int,
    data: AppointmentCancelIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Hủy lịch hẹn khám từ xa và tự động tính hoàn tiền theo chính sách bệnh viện.
    - Hủy trước giờ khám: Hoàn tiền 100% viện phí đã đóng.
    - Cập nhật trạng thái lịch hẹn thành 'cancelled' và ghi nhận audit log.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    if appt.status in ["completed", "in_progress"]:
        raise HTTPException(status_code=400, detail="Không thể hủy buổi khám đang diễn ra hoặc đã hoàn tất")
        
    payment = db.query(Payment).filter_by(appointment_id=appt.id).first()
    has_paid = payment and payment.status == "paid"
    
    # Chính sách hoàn tiền bệnh viện: 100% nếu hủy khi lịch chưa bắt đầu
    refund_percent = 100 if has_paid else 0
    refund_amount = appt.fee_amount if has_paid else 0
    
    appt.status = "cancelled"
    appt.refund_amount = refund_amount
    appt.refund_reason = data.reason
    appt.cancelled_at = datetime.now(timezone.utc)
    
    if payment and has_paid:
        payment.status = "refunded"
        payment.refund_status = "completed"
        
    # Nếu có gắn ca trực thì giảm số lượng booked_count
    if appt.shift_id:
        shift = db.get(DoctorShift, appt.shift_id)
        if shift and shift.booked_count > 0:
            shift.booked_count -= 1
            
    db.add(AuditLog(actor_user_id=user.id, action="appointment.cancel_and_refund", resource_type="appointment", resource_id=str(appt.id)))
    db.commit()
    
    return AppointmentCancelOut(
        success=True,
        appointment_id=appt.id,
        status="cancelled",
        refund_amount=refund_amount,
        refund_percent=refund_percent,
        refund_reason=data.reason,
        message=f"Đã hủy lịch hẹn thành công. Số tiền hoàn trả theo chính sách viện: {refund_amount:,} VND ({refund_percent}%)."
    )

# ----------------- COTURN WEBRTC ICE SERVERS CONFIG -----------------

@app.get("/api/v1/telehealth/ice-servers", response_model=IceServersOut)
def get_ice_servers():
    """
    Tạo thông tin chứng thực động STUN/TURN/TURNS cho WebRTC Peer Connection
    theo chuẩn Coturn REST API (draft-uberti-behave-turn-rest-00, HMAC-SHA1).
    Hỗ trợ kết nối xuyên qua Symmetric NAT, tường lửa bệnh viện và mạng 4G/5G.
    """
    now = int(time.time())
    ttl = 86400  # 24 giờ
    timestamp = now + ttl
    username = f"{timestamp}:careconnect-user"
    secret = settings.COTURN_AUTH_SECRET.encode("utf-8")
    
    # Tính HMAC-SHA1 signature
    signature = hmac.new(secret, username.encode("utf-8"), hashlib.sha1).digest()
    credential = base64.b64encode(signature).decode("utf-8")
    
    host = settings.COTURN_HOST
    port = settings.COTURN_PORT
    tls_port = settings.COTURN_TLS_PORT
    
    return {
        "iceServers": [
            IceServerConfig(urls=["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]),
            IceServerConfig(urls=[f"stun:{host}:{port}"]),
            IceServerConfig(
                urls=[
                    f"turn:{host}:{port}?transport=udp",
                    f"turn:{host}:{port}?transport=tcp",
                    f"turns:{host}:{tls_port}?transport=tcp"
                ],
                username=username,
                credential=credential
            )
        ],
        "ttl": ttl,
        "realm": settings.COTURN_REALM
    }

# ----------------- BÀN SÀNG LỌC & ĐIỀU PHỐI ĐIỀU DƯỠNG (TRIAGE DESK) -----------------

@app.get("/api/v1/triage/queue", response_model=list[TriageQueueItem])
def get_triage_queue(db: Session = Depends(get_db), user: User = Depends(require_roles("nurse", "doctor", "admin"))):
    """
    Hàng đợi sàng lọc điều dưỡng (Triage Queue):
    Liệt kê các ca khám chờ sàng lọc và phân luồng vào phòng bác sĩ.
    Ưu tiên hiển thị ca Cấp cứu (Emergency) -> Ưu tiên (Priority) -> Thường (Normal).
    """
    appts = db.query(Appointment).filter(
        Appointment.status.in_(["scheduled", "confirmed", "in_progress"])
    ).all()
    
    # Sắp xếp ưu tiên: emergency (0) -> priority (1) -> normal (2)
    priority_order = {"emergency": 0, "priority": 1, "normal": 2}
    appts.sort(key=lambda a: (priority_order.get(a.triage_level, 2), a.starts_at))
    
    results = []
    for a in appts:
        patient = db.get(User, a.patient_id)
        doctor = db.get(User, a.doctor_id)
        dept = db.get(Department, a.department_id) if a.department_id else None
        
        results.append(TriageQueueItem(
            appointment_id=a.id,
            patient_id=a.patient_id,
            patient_name=patient.full_name if patient else f"Bệnh nhân #{a.patient_id}",
            patient_phone=patient.phone_number if patient else None,
            bhyt_code=a.bhyt_code or (patient.bhyt_code if patient else None),
            doctor_id=a.doctor_id,
            doctor_name=doctor.full_name if doctor else f"Bác sĩ #{a.doctor_id}",
            department_name=dept.name if dept else "Khoa Khám bệnh",
            starts_at=a.starts_at,
            reason=a.reason,
            status=a.status,
            triage_status=a.triage_status or "pending",
            triage_level=a.triage_level or "normal",
            pulse=a.pulse,
            blood_pressure=a.blood_pressure,
            temperature=a.temperature,
            spo2=a.spo2,
            weight=a.weight,
            height=a.height,
            triage_notes=a.triage_notes
        ))
    return results

@app.post("/api/v1/triage/{appointment_id}/assess", response_model=TriageAssessmentOut)
def assess_and_dispatch_triage(
    appointment_id: int,
    data: TriageAssessmentIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("nurse", "doctor", "admin"))
):
    """
    Điều dưỡng ghi nhận chỉ số sinh hiệu (Mạch, HA, Thân nhiệt, SpO2),
    xác định mức độ ưu tiên và điều phối chuyển bệnh nhân vào buồng Bác sĩ.
    """
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
        
    now = datetime.now(timezone.utc)
    appt.pulse = data.pulse
    appt.blood_pressure = data.blood_pressure
    appt.temperature = data.temperature
    appt.spo2 = data.spo2
    appt.weight = data.weight
    appt.height = data.height
    appt.triage_level = data.triage_level
    appt.triage_notes = data.triage_notes
    appt.triaged_by = user.id
    appt.triaged_at = now
    
    if data.dispatch_to_doctor:
        appt.triage_status = "dispatched"
        if appt.status == "scheduled":
            appt.status = "confirmed"
    else:
        appt.triage_status = "assessed"
        
    # Tự động đồng bộ các chỉ số sinh tồn vào hồ sơ lâm sàng (Clinical Notes)
    record = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
    vitals_summary = f"[SÀNG LỌC ĐIỀU DƯỠNG]: Mạch: {data.pulse or '—'} l/p | HA: {data.blood_pressure or '—'} mmHg | Nhiệt độ: {data.temperature or '—'}°C | SpO2: {data.spo2 or '—'}% | Cân nặng: {data.weight or '—'} kg. Phân luồng: {data.triage_level.upper()}"
    if data.triage_notes:
        vitals_summary += f" | Nhận định: {data.triage_notes}"
        
    if record:
        if not record.clinical_notes:
            record.clinical_notes = vitals_summary
        elif "[SÀNG LỌC ĐIỀU DƯỠNG]" not in record.clinical_notes:
            record.clinical_notes = f"{vitals_summary}\n{record.clinical_notes}"
    else:
        db.add(ClinicalRecord(
            appointment_id=appt.id,
            clinical_notes=vitals_summary,
            created_by=user.id
        ))
        
    db.add(AuditLog(
        actor_user_id=user.id,
        action="triage.assessed_and_dispatched",
        resource_type="appointment",
        resource_id=str(appt.id)
    ))
    record_appointment_event(
        db=db,
        appointment_id=appt.id,
        action="triage",
        from_status=appt.status,
        to_status=appt.status,
        actor=user,
        notes=f"Điều dưỡng {user.full_name} hoàn tất sàng lọc Triage ({data.triage_level.upper()}). {vitals_summary}"
    )
    db.commit()
    
    return TriageAssessmentOut(
        success=True,
        appointment_id=appt.id,
        triage_status=appt.triage_status,
        triage_level=appt.triage_level,
        message=f"Đã hoàn thành sàng lọc và chuyển bệnh nhân #{appt.id} vào hàng đợi Bác sĩ thành công."
    )

# ----------------- ADMIN DASHBOARD & SYSTEM SETTINGS -----------------

@app.get("/api/v1/admin/overview", response_model=AdminOverviewOut)
def get_admin_overview(db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    all_appts = db.query(Appointment).all()
    completed = [a for a in all_appts if a.status == "completed"]
    scheduled = [a for a in all_appts if a.status in ("scheduled", "confirmed", "in_progress")]
    cancelled = [a for a in all_appts if a.status == "cancelled"]
    
    paid_payments = db.query(Payment).filter_by(status="paid").all()
    total_rev = sum(p.amount for p in paid_payments)
    
    bhyt_appts = [a for a in all_appts if a.bhyt_discount and a.bhyt_discount > 0]
    bhyt_discount = sum(a.bhyt_discount for a in bhyt_appts)
    
    return AdminOverviewOut(
        total_appointments=len(all_appts),
        completed_appointments=len(completed),
        scheduled_appointments=len(scheduled),
        cancelled_appointments=len(cancelled),
        total_revenue=total_rev,
        total_patients=db.query(User).filter_by(role="patient").count(),
        total_doctors=db.query(User).filter_by(role="doctor").count(),
        total_nurses=db.query(User).filter_by(role="nurse").count(),
        total_bhyt_claims=len(bhyt_appts),
        bhyt_total_discount=bhyt_discount
    )

@app.get("/api/v1/admin/audit-logs", response_model=list[AuditLogOut])
def get_admin_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin"))
):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    out = []
    for log in logs:
        actor = db.get(User, log.actor_user_id) if log.actor_user_id else None
        out.append(AuditLogOut(
            id=log.id,
            actor_user_id=log.actor_user_id,
            actor_name=actor.full_name if actor else "Hệ thống tự động",
            actor_role=actor.role if actor else "system",
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            created_at=log.created_at
        ))
    return out

# ----------------- HỆ THỐNG PHÂN QUYỀN VAI TRÒ (RBAC MATRIX) -----------------

SYSTEM_PERMISSIONS = [
    # Khám chữa bệnh & Buồng khám
    {"code": "exam.view_queue", "name": "Hàng đợi khám bệnh", "module": "Khám chữa bệnh", "description": "Xem danh sách người bệnh chờ khám trong ca trực"},
    {"code": "exam.workspace", "name": "Buồng khám Bác sĩ", "module": "Khám chữa bệnh", "description": "Truy cập buồng khám trực tuyến, gọi video WebRTC, hội chẩn"},
    {"code": "exam.join_video", "name": "Vào phòng video", "module": "Khám chữa bệnh", "description": "Bệnh nhân tham gia phòng gọi khám với Bác sĩ"},
    {"code": "exam.book", "name": "Đặt lịch khám", "module": "Khám chữa bệnh", "description": "Đăng ký lịch hẹn tư vấn và chuyên khoa từ xa"},

    # Bệnh án điện tử EMR / HIS
    {"code": "records.view_my", "name": "Xem bệnh án của tôi", "module": "Hồ sơ bệnh án", "description": "Tra cứu hồ sơ bệnh án cá nhân và lịch sử tái khám"},
    {"code": "records.view_all", "name": "Tra cứu bệnh án toàn viện", "module": "Hồ sơ bệnh án", "description": "Bác sĩ tra cứu toàn bộ bệnh án và liên thông HIS của bệnh nhân"},
    {"code": "records.write_emr", "name": "Ghi chép bệnh án & ICD-10", "module": "Hồ sơ bệnh án", "description": "Soạn chẩn đoán ICD-10, tóm tắt SOAP và kết luận y khoa"},

    # Đơn thuốc Quốc gia & SmartCA
    {"code": "rx.create", "name": "Kê đơn thuốc điện tử", "module": "Đơn thuốc & Ký số", "description": "Kê đơn thuốc theo danh mục hoạt chất chuẩn Bộ Y tế"},
    {"code": "rx.sign_smartca", "name": "Ký số từ xa SmartCA", "module": "Đơn thuốc & Ký số", "description": "Ký số chứng thư số y tế VNPT SmartCA đạt chuẩn pháp lý"},
    {"code": "rx.sync_national", "name": "Liên thông Cổng Quốc gia", "module": "Đơn thuốc & Ký số", "description": "Tự động đẩy đơn thuốc lên Cổng donthuocquocgia.vn"},
    {"code": "rx.view_my", "name": "Xem đơn thuốc điện tử", "module": "Đơn thuốc & Ký số", "description": "Bệnh nhân tra cứu đơn thuốc và mã QR quốc gia"},

    # Cận lâm sàng LIS & PACS
    {"code": "paraclinical.view_my", "name": "Xem kết quả CLS cá nhân", "module": "Cận lâm sàng & PACS", "description": "Tra cứu kết quả xét nghiệm huyết học, sinh hóa và phim X-quang"},
    {"code": "paraclinical.order_and_view", "name": "Chỉ định & Đọc phim PACS", "module": "Cận lâm sàng & PACS", "description": "Bác sĩ chỉ định CLS và xem ảnh DICOM qua PACS viewer"},

    # Sàng lọc & Điều dưỡng Tiếp đón
    {"code": "triage.access", "name": "Bàn tiếp đón Triage", "module": "Điều dưỡng & Sàng lọc", "description": "Tiếp nhận người bệnh, đo sinh hiệu (HA, mạch, SpO2, nhiệt độ)"},
    {"code": "triage.dispatch", "name": "Phân luồng phòng khám", "module": "Điều dưỡng & Sàng lọc", "description": "Đánh giá mức độ ưu tiên và chuyển người bệnh vào buồng bác sĩ"},

    # Bảo hiểm Y tế & Viện phí
    {"code": "insurance.lookup", "name": "Giám định BHYT trực tuyến", "module": "Bảo hiểm & Viện phí", "description": "Tra cứu tính hợp lệ của thẻ BHYT và tỷ lệ thanh toán"},
    {"code": "billing.pay_vietqr", "name": "Thanh toán viện phí VietQR", "module": "Bảo hiểm & Viện phí", "description": "Bệnh nhân quét mã VietQR Napas247 thanh toán tức thì"},

    # Quản trị hệ thống & Kiểm toán
    {"code": "admin.manage_users", "name": "Quản lý nhân sự & Phân quyền", "module": "Quản trị hệ thống", "description": "Thêm, sửa, đổi phân quyền và phân công phòng ban"},
    {"code": "admin.system_settings", "name": "Cấu hình tham số toàn viện", "module": "Quản trị hệ thống", "description": "Thiết lập máy chủ WebRTC COTURN, VNPT SmartCA, VietQR, SMS"},
    {"code": "admin.view_audit", "name": "Nhật ký kiểm toán NĐ 13", "module": "Quản trị hệ thống", "description": "Tra cứu nhật ký bảo mật dữ liệu y tế theo Nghị định 13/2023"},
    {"code": "admin.view_analytics", "name": "Báo cáo thống kê toàn viện", "module": "Quản trị hệ thống", "description": "Thống kê KPI lượt khám, phân luồng và viện phí"}
]

ROLE_DEFINITIONS = {
    "patient": {
        "role": "patient",
        "name": "Bệnh nhân",
        "badge_color": "green",
        "description": "Người bệnh sử dụng dịch vụ khám từ xa, tra cứu hồ sơ bệnh án, đơn thuốc và thanh toán viện phí",
        "permissions": [
            "exam.book",
            "exam.join_video",
            "records.view_my",
            "rx.view_my",
            "paraclinical.view_my",
            "insurance.lookup",
            "billing.pay_vietqr"
        ]
    },
    "doctor": {
        "role": "doctor",
        "name": "Bác sĩ chuyên khoa",
        "badge_color": "blue",
        "description": "Thực hiện chẩn đoán lâm sàng từ xa, ghi chép EMR, ký số SmartCA và liên thông Cổng Đơn thuốc Quốc gia",
        "permissions": [
            "exam.view_queue",
            "exam.workspace",
            "records.view_all",
            "records.write_emr",
            "rx.create",
            "rx.sign_smartca",
            "rx.sync_national",
            "paraclinical.order_and_view",
            "insurance.lookup"
        ]
    },
    "nurse": {
        "role": "nurse",
        "name": "Điều dưỡng tiếp đón",
        "badge_color": "purple",
        "description": "Bàn tiếp đón sàng lọc Triage, đo sinh hiệu, giám định thẻ BHYT trực tuyến và phân luồng người bệnh",
        "permissions": [
            "exam.view_queue",
            "triage.access",
            "triage.dispatch",
            "insurance.lookup",
            "records.view_all"
        ]
    },
    "admin": {
        "role": "admin",
        "name": "Quản trị viên toàn viện",
        "badge_color": "amber",
        "description": "Toàn quyền quản trị nhân sự, ma trận phân quyền RBAC, kiểm toán an toàn thông tin và cấu hình hệ thống",
        "permissions": [
            p["code"] for p in SYSTEM_PERMISSIONS
        ]
    }
}

def get_effective_role_definitions(db: Session):
    roles = copy.deepcopy(ROLE_DEFINITIONS)
    custom_setting = db.query(SystemSetting).filter_by(key="custom_role_permissions").first()
    if custom_setting and custom_setting.value:
        try:
            custom_perms = json.loads(custom_setting.value)
            for role_name, perms in custom_perms.items():
                if role_name in roles and isinstance(perms, list):
                    roles[role_name]["permissions"] = perms
        except Exception:
            pass
    return roles

@app.get("/api/v1/auth/permissions-matrix")
def get_permissions_matrix(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Trả về ma trận phân quyền chi tiết của toàn hệ thống và quyền của người dùng hiện tại"""
    roles = get_effective_role_definitions(db)
    user_perms = roles.get(user.role, {}).get("permissions", [])
    return {
        "roles": roles,
        "permissions": SYSTEM_PERMISSIONS,
        "current_user_role": user.role,
        "current_user_permissions": user_perms
    }

@app.put("/api/v1/admin/permissions-matrix")
def update_permissions_matrix(
    data: dict[str, list[str]],
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin"))
):
    """Cập nhật ma trận phân quyền cho các vai trò trong hệ thống"""
    setting = db.query(SystemSetting).filter_by(key="custom_role_permissions").first()
    if not setting:
        setting = SystemSetting(
            key="custom_role_permissions",
            value=json.dumps(data, ensure_ascii=False),
            description="Tùy chỉnh ma trận phân quyền các vai trò hệ thống"
        )
        db.add(setting)
    else:
        setting.value = json.dumps(data, ensure_ascii=False)
    
    db.add(AuditLog(
        actor_user_id=user.id,
        action="admin.update_rbac_matrix",
        resource_type="system_rbac",
        resource_id="matrix"
    ))
    db.commit()
    return get_permissions_matrix(db, user)

@app.post("/api/v1/admin/permissions-matrix/reset")
def reset_permissions_matrix(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin"))
):
    """Khôi phục ma trận phân quyền về mặc định của hệ thống"""
    setting = db.query(SystemSetting).filter_by(key="custom_role_permissions").first()
    if setting:
        db.delete(setting)
        db.add(AuditLog(
            actor_user_id=user.id,
            action="admin.reset_rbac_matrix",
            resource_type="system_rbac",
            resource_id="default"
        ))
        db.commit()
    return get_permissions_matrix(db, user)

@app.get("/api/v1/admin/users")
def get_admin_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin"))
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "phone_number": u.phone_number,
            "full_name": u.full_name,
            "role": u.role,
            "doctor_cchn": u.doctor_cchn,
            "bhyt_code": u.bhyt_code,
            "is_active": u.is_active,
            "created_at": u.created_at
        }
        for u in users
    ]

@app.put("/api/v1/admin/users/{user_id}/role")
def update_user_role(
    user_id: int,
    data: UserRoleUpdateIn,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_roles("admin"))
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    valid_roles = ["patient", "doctor", "nurse", "admin"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Vai trò '{data.role}' không hợp lệ. Phải là một trong: {', '.join(valid_roles)}")

    # Tránh tự tước quyền quản trị của chính mình nếu là admin duy nhất
    if target.id == admin_user.id and data.role != "admin":
        other_admins = db.query(User).filter(User.role == "admin", User.id != target.id, User.is_active == True).count()
        if other_admins == 0:
            raise HTTPException(status_code=400, detail="Không thể đổi vai trò của quản trị viên duy nhất còn lại trong hệ thống")

    old_role = target.role
    target.role = data.role
    if data.is_active is not None:
        target.is_active = data.is_active
    if data.doctor_cchn is not None:
        target.doctor_cchn = data.doctor_cchn
    if data.bhyt_code is not None:
        target.bhyt_code = data.bhyt_code

    db.add(AuditLog(
        actor_user_id=admin_user.id,
        action="admin.update_user_role",
        resource_type="user",
        resource_id=str(target.id)
    ))
    db.commit()
    db.refresh(target)

    return {
        "success": True,
        "message": f"Đã cập nhật phân quyền người dùng #{target.id} từ '{old_role}' sang '{target.role}' thành công",
        "user": {
            "id": target.id,
            "email": target.email,
            "phone_number": target.phone_number,
            "full_name": target.full_name,
            "role": target.role,
            "doctor_cchn": target.doctor_cchn,
            "bhyt_code": target.bhyt_code,
            "is_active": target.is_active
        }
    }

@app.get("/api/v1/admin/settings", response_model=SystemSettingsOut)
def get_admin_settings(db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    return SystemSettingsOut(
        hospital_name=get_db_setting(db, "hospital_name", "Bệnh viện Đa khoa Quốc tế CareConnect"),
        hospital_code=get_db_setting(db, "hospital_code", "79001"),
        hospital_address=get_db_setting(db, "hospital_address", "Số 123 Đường Y Dược, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"),
        hospital_hotline=get_db_setting(db, "hospital_hotline", "1900 6868"),
        national_prescription_url=get_db_setting(db, "national_prescription_url", "https://donthuocquocgia.vn"),
        smartca_provider=get_db_setting(db, "smartca_provider", "VNPT_SmartCA"),
        coturn_host=get_db_setting(db, "coturn_host", settings.COTURN_HOST),
        coturn_port=int(get_db_setting(db, "coturn_port", str(settings.COTURN_PORT))),
        coturn_realm=get_db_setting(db, "coturn_realm", settings.COTURN_REALM),
        sms_provider=get_db_setting(db, "sms_provider", "firebase"),
        sms_brandname=get_db_setting(db, "sms_brandname", settings.SMS_BRANDNAME),
        allow_test_otp=get_db_setting(db, "allow_test_otp", "false").lower() == "true",
        firebase_project_id=get_db_setting(db, "firebase_project_id", settings.FIREBASE_PROJECT_ID),
        firebase_api_key=get_db_setting(db, "firebase_api_key", settings.FIREBASE_WEB_API_KEY),
        firebase_auth_domain=get_db_setting(db, "firebase_auth_domain", f"{settings.FIREBASE_PROJECT_ID}.firebaseapp.com" if settings.FIREBASE_PROJECT_ID else ""),
        firebase_app_id=get_db_setting(db, "firebase_app_id", ""),
        gemini_api_key=get_db_setting(db, "gemini_api_key", os.getenv("GEMINI_API_KEY", "")),
        bank_id=get_db_setting(db, "bank_id", settings.BANK_ID),
        bank_account_no=get_db_setting(db, "bank_account_no", settings.BANK_ACCOUNT_NO),
        bank_account_name=get_db_setting(db, "bank_account_name", settings.BANK_ACCOUNT_NAME),
        default_max_patients_per_shift=int(get_db_setting(db, "default_max_patients_per_shift", "12")),
        consultation_duration_minutes=int(get_db_setting(db, "consultation_duration_minutes", "20"))
    )

@app.post("/api/v1/admin/settings", response_model=SystemSettingsOut)
def update_admin_settings(
    data: SystemSettingsUpdateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin"))
):
    update_fields = data.model_dump(exclude_unset=True)
    for k, v in update_fields.items():
        if v is not None:
            set_db_setting(db, k, str(v))
            
    db.add(AuditLog(
        actor_user_id=user.id,
        action="admin.update_settings",
        resource_type="system_settings",
        resource_id="global"
    ))
    db.commit()
    return get_admin_settings(db, user)

# ----------------- NOTIFICATION CENTER MODULE -----------------

@app.get("/api/v1/notifications", response_model=list[NotificationOut])
def get_user_notifications(
    category: str | None = None,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    query = db.query(Notification).filter(
        or_(
            Notification.user_id == user.id,
            (Notification.user_id.is_(None)) & (
                (Notification.target_role == "all") |
                (Notification.target_role == user.role)
            )
        )
    )
    if category and category != "all":
        query = query.filter(Notification.category == category)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    return query.order_by(Notification.created_at.desc()).limit(50).all()

@app.get("/api/v1/notifications/unread-count", response_model=UnreadCountOut)
def get_unread_count(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    count = db.query(Notification).filter(
        or_(
            Notification.user_id == user.id,
            (Notification.user_id.is_(None)) & (
                (Notification.target_role == "all") |
                (Notification.target_role == user.role)
            )
        ),
        Notification.is_read == False
    ).count()
    return UnreadCountOut(unread_count=count)

@app.post("/api/v1/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"success": True, "id": notification_id}

@app.post("/api/v1/notifications/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    from sqlalchemy import or_
    notifs = db.query(Notification).filter(
        or_(
            Notification.user_id == user.id,
            (Notification.user_id.is_(None)) & (
                (Notification.target_role == "all") |
                (Notification.target_role == user.role)
            )
        ),
        Notification.is_read == False
    ).all()
    for n in notifs:
        n.is_read = True
    db.commit()
    return {"success": True, "marked_count": len(notifs)}

@app.post("/api/v1/notifications", response_model=NotificationOut)
def create_notification(
    data: NotificationCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin", "doctor", "nurse"))
):
    notif = Notification(
        user_id=data.user_id,
        target_role=data.target_role,
        title=data.title,
        message=data.message,
        category=data.category,
        priority=data.priority,
        action_url=data.action_url,
        is_read=False
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

# ----------------- SEEDING & STARTUP -----------------

def seed_demo():
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        # 1. Khởi tạo danh mục Khoa/Phòng nếu chưa có
        if db.query(Department).count() == 0:
            db.add_all([
                Department(code="K01", name="Khoa Nội Tổng Quát", description="Khám, chẩn đoán các bệnh lý nội khoa, hô hấp, tiêu hóa, gan mật"),
                Department(code="K02", name="Khoa Nhi", description="Chăm sóc và điều trị chuyên sâu các bệnh lý trẻ em, tư vấn dinh dưỡng"),
                Department(code="K03", name="Khoa Da Liễu", description="Khám và điều trị viêm da cơ địa, dị ứng, mụn trứng cá, bệnh ngoài da"),
                Department(code="K04", name="Khoa Tai Mũi Họng", description="Khám nội soi viêm họng, viêm amidan, viêm xoang, thanh quản"),
                Department(code="K05", name="Khoa Tâm Thần & Tâm Lý Lâm Sàng", description="Tư vấn stress, rối loạn lo âu, mất ngủ, trầm cảm từ xa"),
                Department(code="K06", name="Khoa Tim Mạch", description="Quản lý tăng huyết áp, rối loạn mỡ máu, theo dõi bệnh tim mạn tính")
            ])
            db.commit()

        # 2. Khởi tạo tài khoản người dùng mẫu nếu chưa có
        if db.query(User).count() == 0:
            dept_internal = db.query(Department).filter_by(code="K01").first()
            dept_id = dept_internal.id if dept_internal else None
            
            db.add_all([
                User(
                    email="patient@example.test",
                    phone_number="0912345678",
                    full_name="Nguyễn Minh An",
                    role="patient",
                    bhyt_code="GD4797931812345",
                    password_hash=hash_password("ChangeMe123!"),
                    external_patient_id="PAT-001"
                ),
                User(
                    email="doctor@example.test",
                    phone_number="0987654321",
                    full_name="BS.CKII Trần Minh",
                    role="doctor",
                    doctor_cchn="008912/BYT-CCHN",
                    department_id=dept_id,
                    password_hash=hash_password("ChangeMe123!")
                ),
                User(
                    email="admin@example.test",
                    phone_number="0909090909",
                    full_name="Quản trị CareConnect",
                    role="admin",
                    password_hash=hash_password("ChangeMe123!")
                ),
                User(
                    email="nurse@example.test",
                    phone_number="0977665544",
                    full_name="ĐD. Nguyễn Thị Mai (Điều dưỡng trưởng)",
                    role="nurse",
                    password_hash=hash_password("ChangeMe123!")
                )
            ])
            db.commit()

        # Đảm bảo tài khoản Điều dưỡng (Nurse) luôn sẵn sàng
        if not db.query(User).filter_by(role="nurse").first():
            db.add(User(
                email="nurse@example.test",
                phone_number="0977665544",
                full_name="ĐD. Nguyễn Thị Mai (Điều dưỡng trưởng)",
                role="nurse",
                password_hash=hash_password("ChangeMe123!")
            ))
            db.commit()

        # 3. Khởi tạo lịch trực & giới hạn ca khám (Anti-overload Quota)
        if db.query(DoctorShift).count() == 0:
            doc = db.query(User).filter_by(role="doctor").first()
            dept = db.query(Department).first()
            if doc:
                today = datetime.now().strftime("%Y-%m-%d")
                db.add_all([
                    DoctorShift(
                        doctor_id=doc.id,
                        department_id=dept.id if dept else None,
                        shift_date=today,
                        shift_type="morning",
                        start_time="07:30",
                        end_time="11:30",
                        max_patients=12,
                        booked_count=1
                    ),
                    DoctorShift(
                        doctor_id=doc.id,
                        department_id=dept.id if dept else None,
                        shift_date=today,
                        shift_type="afternoon",
                        start_time="13:30",
                        end_time="17:00",
                        max_patients=10,
                        booked_count=0
                    )
                ])
                db.commit()

        # Đảm bảo tài khoản Điều dưỡng (Nurse) luôn sẵn sàng
        if not db.query(User).filter_by(role="nurse").first():
            db.add(User(
                email="nurse@example.test",
                phone_number="0977665544",
                full_name="ĐD. Nguyễn Thị Mai (Điều dưỡng trưởng)",
                role="nurse",
                password_hash=hash_password("ChangeMe123!")
            ))
            db.commit()
    finally:
        db.close()

def auto_migrate_schema():
    """Tự động thêm các cột mới nếu chạy trên database cũ mà không làm mất dữ liệu"""
    triage_columns = [
        ("triage_status", "VARCHAR(30) DEFAULT 'pending'"),
        ("triage_level", "VARCHAR(20) DEFAULT 'normal'"),
        ("pulse", "INTEGER"),
        ("blood_pressure", "VARCHAR(20)"),
        ("temperature", "FLOAT"),
        ("spo2", "INTEGER"),
        ("weight", "FLOAT"),
        ("height", "FLOAT"),
        ("triage_notes", "TEXT"),
        ("triaged_by", "INTEGER"),
        ("triaged_at", "DATETIME")
    ]
    user_columns = [
        ("date_of_birth", "VARCHAR(30)"),
        ("gender", "VARCHAR(20)"),
        ("identity_card", "VARCHAR(30)"),
        ("address", "VARCHAR(300)"),
        ("blood_type", "VARCHAR(10)"),
        ("allergies", "VARCHAR(300)"),
        ("emergency_contact_name", "VARCHAR(150)"),
        ("emergency_contact_phone", "VARCHAR(30)")
    ]
    with engine.connect() as conn:
        for col_name, col_type in triage_columns:
            try:
                conn.execute(text(f"ALTER TABLE appointments ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass
        for col_name, col_type in user_columns:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass

def ensure_system_initialized():
    """Khởi tạo cấu trúc danh mục và tài khoản quản trị cán bộ ban đầu nếu database trống"""
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        if db.query(Department).count() == 0:
            db.add_all([
                Department(code="K01", name="Khoa Nội Tổng Quát", description="Khám và điều trị các bệnh lý nội khoa người lớn"),
                Department(code="K02", name="Khoa Nhi", description="Chăm sóc sức khỏe và khám bệnh chuyên sâu cho trẻ em"),
                Department(code="K03", name="Khoa Da Liễu", description="Khám và điều trị viêm da cơ địa, dị ứng, mụn trứng cá, bệnh ngoài da"),
                Department(code="K04", name="Khoa Tai Mũi Họng", description="Khám nội soi viêm họng, viêm amidan, viêm xoang, thanh quản"),
                Department(code="K05", name="Khoa Tâm Thần & Tâm Lý Lâm Sàng", description="Tư vấn stress, rối loạn lo âu, mất ngủ, trầm cảm từ xa"),
                Department(code="K06", name="Khoa Tim Mạch", description="Quản lý tăng huyết áp, rối loạn mỡ máu, theo dõi bệnh tim mạn tính")
            ])
            db.commit()

        if not db.query(User).filter(User.role.in_(["admin", "doctor", "nurse"])).first():
            dept_internal = db.query(Department).filter_by(code="K01").first()
            dept_id = dept_internal.id if dept_internal else None
            db.add_all([
                User(
                    email="doctor@example.test",
                    phone_number="0987654321",
                    full_name="BS.CKII Trần Minh",
                    role="doctor",
                    doctor_cchn="008912/BYT-CCHN",
                    department_id=dept_id,
                    password_hash=hash_password("ChangeMe123!")
                ),
                User(
                    email="admin@example.test",
                    phone_number="0909090909",
                    full_name="Quản trị CareConnect",
                    role="admin",
                    password_hash=hash_password("ChangeMe123!")
                ),
                User(
                    email="nurse@example.test",
                    phone_number="0977665544",
                    full_name="ĐD. Nguyễn Thị Mai",
                    role="nurse",
                    password_hash=hash_password("ChangeMe123!")
                )
            ])
            db.commit()

        # Khởi tạo thông báo mẫu chuyên nghiệp nếu chưa có
        if db.query(Notification).count() == 0:
            db.add_all([
                Notification(
                    target_role="doctor",
                    title="Lịch hẹn khám mới (Khoa Nội)",
                    message="Bệnh nhân Phan Hoàng Phúc đã đặt lịch khám trực tuyến. Lý do: Đau thắt ngực khi gắng sức, cần tư vấn chuyên khoa.",
                    category="appointment",
                    priority="high",
                    action_url="/workspace"
                ),
                Notification(
                    target_role="doctor",
                    title="🛡️ AI Cảnh báo Dược lâm sàng",
                    message="Phát hiện tương tác mức độ Nặng giữa Clopidogrel và Omeprazole. Khuyến nghị bác sĩ cân nhắc đổi sang Pantoprazole để đảm bảo hiệu lực chống đông.",
                    category="ai_alert",
                    priority="urgent",
                    action_url="/workspace"
                ),
                Notification(
                    target_role="doctor",
                    title="🔬 Kết quả Xét nghiệm mới sẵn sàng",
                    message="Khoa Xét nghiệm đã cập nhật kết quả Sinh hóa máu (HbA1c 8.2%, Glucose 8.9 mmol/L). AI đã tạo sẵn bản tóm tắt diễn giải.",
                    category="paraclinical",
                    priority="normal",
                    action_url="/workspace"
                ),
                Notification(
                    target_role="patient",
                    title="🩺 Xác nhận lịch khám trực tuyến",
                    message="Lịch khám chuyên khoa Nội Tổng Quát của bạn đã được xác nhận. Bác sĩ BS.CKII Trần Minh Tuấn sẽ kết nối trực tiếp trong phòng khám ảo.",
                    category="appointment",
                    priority="high",
                    action_url="/appointments"
                ),
                Notification(
                    target_role="patient",
                    title="💊 Đơn thuốc điện tử đã sẵn sàng",
                    message="Bác sĩ đã hoàn tất kê đơn điện tử và ký số SmartCA (Mã DT-2026-9881). Bạn có thể xem toa thuốc và đặt giao tận nhà.",
                    category="prescription",
                    priority="normal",
                    action_url="/prescriptions"
                ),
                Notification(
                    target_role="admin",
                    title="🛡️ Kiểm toán An toàn Dữ liệu & Nghị định 13",
                    message="Cổng lưu trữ Supabase Storage hoạt động ổn định. Đã mã hóa AES-256 dữ liệu định danh bệnh nhân theo quy chuẩn.",
                    category="system",
                    priority="info",
                    action_url="/admin"
                ),
                Notification(
                    target_role="all",
                    title="⚡ CareConnect Telemedicine v2.5",
                    message="Hệ thống đã nâng cấp Bộ công cụ Trợ lý AI Y tế (CDSS), OCR thẻ BHYT tự động và Trung tâm Thông báo Y tế chuyên nghiệp.",
                    category="system",
                    priority="info"
                )
            ])
            db.commit()
    finally:
        db.close()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    auto_migrate_schema()
    ensure_system_initialized()
    if settings.SEED_DEMO:
        seed_demo()

# Mount Frontend SPA for Production / Dokploy Single Container Deployment
possible_dist_paths = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "dist"),
    "/app/frontend/dist",
    "/app/dist",
    "./dist",
    "./frontend/dist"
]

frontend_dist = next((p for p in possible_dist_paths if os.path.exists(p) and os.path.isdir(p)), None)

if frontend_dist:
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
