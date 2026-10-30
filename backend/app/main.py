from datetime import datetime, timezone, timedelta
import random
import os
from fastapi import FastAPI, Depends, HTTPException, Query, status, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from livekit import api as livekit_api

from app.config import settings
from app.db import get_db, Base, engine
from app.models import (
    User, Appointment, TelehealthSession, ClinicalRecord, PrescriptionRef,
    Payment, AuditLog, OtpCode, PatientConsent
)
from app.schemas import (
    LoginIn, TokenOut, OtpSendIn, OtpSendOut, OtpVerifyIn, RefreshTokenIn,
    AppointmentCreate, AppointmentOut,
    ClinicalRecordIn, ClinicalRecordOut, PrescriptionIn,
    PaymentCreate, PaymentOut, PaymentWebhookIn, ICD10Item,
    ConsentAgreeIn, ConsentStatusOut, DigitalSignRequest, DigitalSignResponse,
    NationalPrescriptionSyncOut, PACSViewerOut
)
from app.security import (
    verify_password, create_access_token, create_refresh_token, decode_token,
    get_current_user, require_roles, hash_password
)
from app.adapters.his import get_his_adapter
from app.adapters.his.fhir import FHIRHISAdapter
from app.adapters.pacs import get_pacs_adapter
from app.adapters.pacs.dicomweb import DICOMwebPACSAdapter
from app.icd10 import search_icd10
from app.vietqr import generate_vietqr_url
from app.smartca import sign_medical_document, verify_medical_signature
from app.national_prescription import sync_to_national_prescription_system
from app.pdf_generator import generate_medical_record_pdf
from app.consent import get_consent_terms, CONSENT_VERSION
from app.encryption import encrypt_sensitive_data, decrypt_sensitive_data

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

@app.post("/api/v1/auth/otp/send", response_model=OtpSendOut)
def send_otp(data: OtpSendIn, db: Session = Depends(get_db)):
    phone = data.phone_number.strip()
    code = "123456" if settings.APP_ENV == "development" else f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    otp_record = OtpCode(phone_number=phone, code=code, expires_at=expires_at, is_used=False)
    db.add(otp_record)
    db.commit()
    
    return {
        "success": True,
        "phone_number": phone,
        "message": f"Mã xác thực OTP đã được gửi tới {phone}. (Mã demo: {code})",
        "dev_code": code if settings.APP_ENV == "development" else None
    }

@app.post("/api/v1/auth/otp/verify", response_model=TokenOut)
def verify_otp(data: OtpVerifyIn, db: Session = Depends(get_db)):
    phone = data.phone_number.strip()
    now = datetime.now(timezone.utc)
    
    otp = db.query(OtpCode).filter(
        OtpCode.phone_number == phone,
        OtpCode.code == data.otp_code.strip(),
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

# ----------------- NGHỊ ĐỊNH 13/2023/NĐ-CP & CONSENT -----------------

@app.get("/api/v1/consent/{appointment_id}/status", response_model=ConsentStatusOut)
def get_consent_status(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    
    consent = db.query(PatientConsent).filter_by(appointment_id=appt.id, user_id=appt.patient_id).first()
    terms = get_consent_terms()
    
    return {
        "consented": consent is not None,
        "version": consent.consent_version if consent else terms["version"],
        "consented_at": consent.consented_at if consent else None,
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
    return [{"id": u.id, "full_name": u.full_name, "cchn": u.doctor_cchn or "008912/BYT-CCHN"} for u in db.query(User).filter(User.role == "doctor", User.is_active == True).all()]

# ----------------- APPOINTMENTS & SESSIONS -----------------

def check_appointment_access(appt: Appointment, user: User):
    if user.role == "patient" and appt.patient_id != user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập lịch khám này")
    if user.role == "doctor" and appt.doctor_id != user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập lịch khám này")
    if user.role not in ("patient", "doctor", "admin"):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")

@app.post("/api/v1/appointments", response_model=AppointmentOut)
def create_appointment(data: AppointmentCreate, db: Session = Depends(get_db), user: User = Depends(require_roles("patient"))):
    doctor = db.get(User, data.doctor_id)
    if not doctor or doctor.role != "doctor" or not doctor.is_active:
        raise HTTPException(status_code=400, detail="Bác sĩ không tồn tại hoặc đã ngừng tiếp nhận")
    if data.starts_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Thời gian hẹn phải ở trong tương lai")
    
    fee = 500000
    appt = Appointment(patient_id=user.id, doctor_id=doctor.id, starts_at=data.starts_at, reason=data.reason, fee_amount=fee)
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
    
    appt.status = "cancelled"
    db.add(AuditLog(actor_user_id=user.id, action="appointment.cancel_and_refund", resource_type="appointment", resource_id=str(appt.id)))
    db.commit()
    db.refresh(appt)
    return appt

@app.post("/api/v1/telehealth/sessions/{appointment_id}/join-token")
def join_token(appointment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    appt = db.get(Appointment, appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Lịch hẹn không tồn tại")
    check_appointment_access(appt, user)
    if appt.status == "cancelled":
        raise HTTPException(status_code=409, detail="Lịch khám đã bị hủy")
    
    # Tuân thủ Nghị định 13: Bệnh nhân bắt buộc phải ký đồng thuận trước khi vào phòng gọi
    if user.role == "patient":
        consent = db.query(PatientConsent).filter_by(appointment_id=appt.id, user_id=user.id).first()
        if not consent:
            raise HTTPException(
                status_code=428,
                detail="Yêu cầu người bệnh ký xác nhận Văn bản đồng thuận khám bệnh từ xa (Nghị định 13/2023/NĐ-CP) trước khi bắt đầu cuộc gọi."
            )
    
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
            appt.status = "in_progress"
        db.commit()
        
    return {
        "server_url": settings.LIVEKIT_URL,
        "token": jwt_token,
        "room_name": session.room_name,
        "session_id": session.id,
        "appointment_id": appt.id
    }

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
    appt.status = "completed"
    
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

# ----------------- PACS DICOMWEB VIEWER -----------------

@app.get("/api/v1/patients/me/pacs-studies")
def list_dicom_studies(user: User = Depends(get_current_user)):
    patient_id = user.external_patient_id or f"DEMO-{user.id}"
    return DICOMwebPACSAdapter.get_patient_studies(patient_id)

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
    
    vietqr_data = generate_vietqr_url(appt.id, appt.fee_amount)
    payment = db.query(Payment).filter_by(appointment_id=appt.id).first()
    
    return {
        **vietqr_data,
        "payment_status": payment.status if payment else "pending",
        "appointment_status": appt.status,
        "paid_at": payment.paid_at if payment else None,
        "refund_status": payment.refund_status if payment else None
    }

@app.post("/api/v1/payments/webhook")
def payment_webhook(data: PaymentWebhookIn, db: Session = Depends(get_db)):
    content = data.transfer_content.upper()
    import re
    match = re.search(r"TM(\d+)", content)
    if not match:
        raise HTTPException(status_code=400, detail="Không tìm thấy mã lịch hẹn hợp lệ trong nội dung chuyển khoản")
    
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
    
    appt.status = "confirmed"
    db.add(AuditLog(actor_user_id=appt.patient_id, action="payment.webhook_confirmed", resource_type="payment", resource_id=str(appointment_id)))
    db.commit()
    
    return {
        "success": True,
        "appointment_id": appt.id,
        "status": "confirmed",
        "message": f"Đã xác nhận thanh toán thành công cho lịch hẹn #{appt.id}"
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

# ----------------- SEEDING & STARTUP -----------------

def seed_demo():
    from app.db import SessionLocal
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            db.add_all([
                User(
                    email="patient@example.test",
                    phone_number="0912345678",
                    full_name="Nguyễn Minh An (Demo)",
                    role="patient",
                    password_hash=hash_password("ChangeMe123!"),
                    external_patient_id="DEMO-P001"
                ),
                User(
                    email="doctor@example.test",
                    phone_number="0987654321",
                    full_name="BS.CKII Trần Minh (Demo)",
                    role="doctor",
                    doctor_cchn="008912/BYT-CCHN",
                    password_hash=hash_password("ChangeMe123!")
                ),
                User(
                    email="admin@example.test",
                    phone_number="0909090909",
                    full_name="Quản trị CareConnect",
                    role="admin",
                    password_hash=hash_password("ChangeMe123!")
                )
            ])
            db.commit()
    finally:
        db.close()

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
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
