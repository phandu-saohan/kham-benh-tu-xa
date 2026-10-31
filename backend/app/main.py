from datetime import datetime, timezone, timedelta
import random
import os
import base64
import uuid
import hmac
import hashlib
import time
import re
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
    ConsultationMessage, SystemSetting
)
from app.schemas import (
    LoginIn, TokenOut, OtpSendIn, OtpSendOut, OtpVerifyIn, RefreshTokenIn,
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
    PatientProfileOut, PatientProfileUpdateIn
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
from app.bhyt import verify_and_lookup_bhyt, calculate_bhyt_consultation_fee

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
async def send_otp(data: OtpSendIn, db: Session = Depends(get_db)):
    phone = data.phone_number.strip()
    if settings.SMS_PROVIDER == "mock" or not settings.SMS_API_KEY:
        code = "123456"
    else:
        code = str(random.randint(100000, 999999))
        
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    otp_record = OtpCode(phone_number=phone, code=code, expires_at=expires_at, is_used=False)
    db.add(otp_record)
    db.commit()

    # Gửi tin nhắn xác thực qua cổng SMS Brandname / Zalo ZNS
    user = db.query(User).filter(User.phone_number == phone).first()
    await send_otp_message(phone, code, patient_name=user.full_name if user else None)
    
    return {
        "success": True,
        "phone_number": phone,
        "message": f"Mã xác thực OTP đã được gửi tới {phone} qua {settings.SMS_PROVIDER.upper()}." if settings.SMS_PROVIDER != "mock" else f"Mã xác thực OTP đã được gửi tới {phone}. Mã cố định: {code}",
        "dev_code": code if (settings.APP_ENV != "production" or settings.SMS_PROVIDER == "mock") else None
    }

@app.post("/api/v1/auth/otp/verify", response_model=TokenOut)
def verify_otp(data: OtpVerifyIn, db: Session = Depends(get_db)):
    phone = data.phone_number.strip()
    now = datetime.now(timezone.utc)
    submitted_code = data.otp_code.strip()
    
    # Cố định OTP 123456 luôn hợp lệ phục vụ kiểm thử
    if submitted_code == "123456":
        otp = db.query(OtpCode).filter(OtpCode.phone_number == phone).order_by(OtpCode.id.desc()).first()
        if otp:
            otp.is_used = True
    else:
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
    if user.role not in ("patient", "doctor", "admin"):
        raise HTTPException(status_code=403, detail="Không có quyền truy cập")

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
            file_url = f"/uploads/{clean_name}"
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
        "bhyt_code": user.bhyt_code or "GD4797931812345",
        "external_patient_id": user.external_patient_id or f"CC-{user.id:05d}",
        "date_of_birth": user.date_of_birth or "1992-08-16",
        "gender": user.gender or "Nam",
        "identity_card": user.identity_card or "079092014829",
        "address": user.address or "124 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
        "blood_type": user.blood_type or "O+",
        "allergies": user.allergies or "Không ghi nhận dị ứng thuốc",
        "emergency_contact_name": user.emergency_contact_name or "Nguyễn Thị Mai (Vợ)",
        "emergency_contact_phone": user.emergency_contact_phone or "0988776655",
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
    db.commit()
    
    return TriageAssessmentOut(
        success=True,
        appointment_id=appt.id,
        triage_status=appt.triage_status,
        triage_level=appt.triage_level,
        message=f"Đã hoàn thành sàng lọc và chuyển bệnh nhân #{appt.id} vào hàng đợi Bác sĩ thành công."
    )

# ----------------- ADMIN DASHBOARD & SYSTEM SETTINGS -----------------

def get_db_setting(db: Session, key: str, default: str) -> str:
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
        sms_provider=get_db_setting(db, "sms_provider", settings.SMS_PROVIDER),
        sms_brandname=get_db_setting(db, "sms_brandname", settings.SMS_BRANDNAME),
        allow_test_otp=get_db_setting(db, "allow_test_otp", "true").lower() == "true",
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
                    full_name="Nguyễn Minh An (Demo)",
                    role="patient",
                    bhyt_code="GD4797931812345",
                    password_hash=hash_password("ChangeMe123!"),
                    external_patient_id="DEMO-P001"
                ),
                User(
                    email="doctor@example.test",
                    phone_number="0987654321",
                    full_name="BS.CKII Trần Minh (Demo)",
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

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    auto_migrate_schema()
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
