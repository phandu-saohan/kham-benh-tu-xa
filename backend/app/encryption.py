"""
Mã hóa dữ liệu nhạy cảm (PHI) cấp độ cột theo Nghị định 13/2023/NĐ-CP.

Thiết kế:
- Khóa mã hóa PHÂN BIỆT với SECRET_KEY của JWT (domain separation): ưu tiên PHI_ENCRYPTION_KEY riêng.
- Salt NGẪU NHIÊN sinh cho từng bản ghi và nhúng vào ciphertext (không dùng salt cố định).
- Fernet (AES-128-CBC + HMAC-SHA256) tự sinh IV/auth tag nội bộ cho mỗi lần encrypt.
- Giải mã THẤT BẠI phải raise — tuyệt đối không trả về plaintext/ciphertext im lặng.
"""
import base64
import os as _os  # sinh salt ngẫu nhiên cho từng ciphertext

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import settings

# Độ đệm nhận dạng ứng dụng, tách khóa mã hóa khỏi SECRET_KEY JWT
_KEY_CONTEXT = b"CareConnect:phi-column-encryption:v2"
_SALT_LEN = 16


def _derive_key(salt: bytes) -> bytes:
    secret = settings.PHI_ENCRYPTION_KEY or settings.SECRET_KEY
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=_KEY_CONTEXT + b":" + salt,
        iterations=200_000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret.encode("utf-8")))


def encrypt_sensitive_data(plaintext: str) -> str:
    """
    Mã hóa dữ liệu y tế nhạy cảm (PII / PHI) cấp độ cột.
    Output = urlsafe_b64( salt(16B) + Fernet_token ).
    """
    if not plaintext:
        return ""
    salt = _os.urandom(_SALT_LEN)
    token = Fernet(_derive_key(salt)).encrypt(plaintext.encode("utf-8"))
    return base64.urlsafe_b64encode(salt + token).decode("ascii")


def decrypt_sensitive_data(ciphertext: str) -> str:
    """
    Giải mã dữ liệu y tế nhạy cảm cho người có thẩm quyền.
    Sai khóa / dữ liệu hỏng -> raise (KHÔNG trả về plaintext im lặng).
    """
    if not ciphertext:
        return ""
    try:
        raw = base64.urlsafe_b64decode(ciphertext.encode("ascii"))
    except Exception as exc:
        raise ValueError("Ciphertext không hợp lệ (không đúng base64)") from exc
    if len(raw) <= _SALT_LEN:
        raise ValueError("Ciphertext không hợp lệ (quá ngắn)")
    salt, token = raw[:_SALT_LEN], raw[_SALT_LEN:]
    try:
        return Fernet(_derive_key(salt)).decrypt(token).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("Không giải mã được dữ liệu đã mã hóa: khóa sai hoặc dữ liệu hỏng") from exc
