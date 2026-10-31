from datetime import datetime, timezone
from typing import Optional, Tuple
import httpx
from jose import jwt
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User, AuditLog
from app.security import create_access_token, create_refresh_token, hash_password


async def verify_firebase_id_token(
    id_token: str,
    project_id: Optional[str] = None,
    web_api_key: Optional[str] = None
) -> Tuple[str, str]:
    """
    Xác thực Firebase ID Token:
    1. Nếu có Web API Key: gọi Google Identity Toolkit accounts:lookup API
    2. Nếu có Project ID: xác minh chữ ký RSA với public certs của Google Secure Token
    3. Nếu ở chế độ dev/mock: giải mã claims và kiểm tra thời hạn
    Trả về: (phone_number, firebase_uid)
    """
    id_token = id_token.strip()
    phone = None
    firebase_uid = None

    effective_key = web_api_key or settings.FIREBASE_WEB_API_KEY
    effective_project = project_id or settings.FIREBASE_PROJECT_ID

    # Cách 1: Xác thực qua Google Identity Toolkit API nếu có Web API Key
    if effective_key:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"https://identitytoolkit.googleapis.com/v1/accounts:lookup?key={effective_key}",
                    json={"idToken": id_token}
                )
                if res.status_code == 200:
                    users_list = res.json().get("users", [])
                    if users_list:
                        phone = users_list[0].get("phoneNumber")
                        firebase_uid = users_list[0].get("localId")
                else:
                    raise HTTPException(status_code=400, detail="Token Firebase không hợp lệ hoặc đã hết hạn")
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Không thể kết nối tới Google Identity Toolkit: {str(e)}")

    # Cách 2: Giải mã và xác thực chữ ký JWT với Google Secure Token
    if not phone:
        try:
            claims = jwt.get_unverified_claims(id_token)
            header = jwt.get_unverified_header(id_token)

            now = datetime.now(timezone.utc).timestamp()
            if claims.get("exp", 0) < now:
                raise HTTPException(status_code=400, detail="Mã xác thực Firebase đã hết hạn")

            if effective_project:
                expected_iss = f"https://securetoken.google.com/{effective_project}"
                if claims.get("aud") != effective_project or claims.get("iss") != expected_iss:
                    raise HTTPException(status_code=400, detail="Mã Firebase không khớp với dự án đã cấu hình")

                kid = header.get("kid")
                async with httpx.AsyncClient(timeout=10.0) as client:
                    cert_res = await client.get(
                        "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
                    )
                    if cert_res.status_code == 200:
                        certs = cert_res.json()
                        public_cert = certs.get(kid)
                        if public_cert:
                            verified_claims = jwt.decode(
                                id_token,
                                public_cert,
                                algorithms=["RS256"],
                                audience=effective_project,
                                issuer=expected_iss
                            )
                            claims = verified_claims

            phone = claims.get("phone_number")
            firebase_uid = claims.get("sub")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Không thể xác minh Firebase ID token: {str(e)}")

    if not phone:
        raise HTTPException(status_code=400, detail="Mã xác thực Firebase không chứa số điện thoại hợp lệ")

    return phone, (firebase_uid or "")


def process_firebase_login(db: Session, phone_raw: str, full_name: Optional[str] = None) -> dict:
    """
    Tìm hoặc tạo mới người dùng theo số điện thoại đã xác minh qua Firebase,
    sau đó phát hành JWT access & refresh token.
    """
    phone_clean = phone_raw.strip()
    # Chuyển +84912345678 thành 0912345678 để đồng bộ định dạng trong nước
    local_phone = "0" + phone_clean[3:] if phone_clean.startswith("+84") else phone_clean

    user = db.query(User).filter(
        (User.phone_number == local_phone) | (User.phone_number == phone_clean)
    ).first()

    if not user:
        clean_name = full_name.strip() if full_name else f"Bệnh nhân {local_phone[-4:]}"
        user = User(
            email=f"{local_phone}@phone.careconnect.local",
            phone_number=local_phone,
            full_name=clean_name,
            role="patient",
            password_hash=hash_password(f"FIREBASE-{local_phone}"),
            external_patient_id=f"VN-{local_phone}"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(AuditLog(actor_user_id=user.id, action="auth.firebase_otp_register", resource_type="user", resource_id=str(user.id)))

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
