import base64
import os
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.config import settings

def _get_cipher_suite():
    # Khởi tạo khóa mã hóa AES từ SECRET_KEY hệ thống
    salt = b"CareConnect_PHI_Salt_2026"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100_000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.SECRET_KEY.encode()))
    return Fernet(key)

def encrypt_sensitive_data(plaintext: str) -> str:
    """
    Mã hóa dữ liệu y tế nhạy cảm (PII / PHI) cấp độ cột theo quy định Nghị định 13/2023/NĐ-CP.
    """
    if not plaintext:
        return ""
    cipher = _get_cipher_suite()
    encrypted_bytes = cipher.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")

def decrypt_sensitive_data(ciphertext: str) -> str:
    """
    Giải mã dữ liệu y tế nhạy cảm cho người có thẩm quyền truy cập hợp lệ.
    """
    if not ciphertext:
        return ""
    try:
        cipher = _get_cipher_suite()
        decrypted_bytes = cipher.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except Exception:
        # Nếu dữ liệu cũ chưa mã hóa thì trả về nguyên bản
        return ciphertext
