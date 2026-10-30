import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

async def send_otp_message(
    phone_number: str,
    otp_code: str,
    patient_name: str | None = None
) -> dict:
    """
    Gửi mã xác thực OTP qua cổng SMS Brandname hoặc Zalo ZNS.
    Hỗ trợ 3 chế độ:
    - 'mock': Môi trường test/demo (tự động thành công, in log).
    - 'esms': Cổng eSMS Việt Nam (Đầu số Brandname Viettel, Vina, Mobi).
    - 'zalo_zns': Dịch vụ tin nhắn Zalo Notification Service chính thức.
    """
    provider = settings.SMS_PROVIDER.lower()
    
    # 1. Chế độ Mock / Staging
    if provider == "mock" or not settings.SMS_API_KEY:
        logger.info(f"[OTP MOCK GATEWAY] Gửi OTP {otp_code} tới SĐT: {phone_number} (Tên: {patient_name or 'Bệnh nhân'})")
        return {
            "success": True,
            "provider": "mock",
            "message": f"Mã OTP {otp_code} đã được phát hành giả lập thành công.",
            "transaction_id": f"mock-{phone_number}-{otp_code}"
        }

    # 2. Cổng eSMS Việt Nam
    if provider == "esms":
        payload = {
            "ApiKey": settings.SMS_API_KEY,
            "SecretKey": settings.SMS_SECRET_KEY,
            "Phone": phone_number,
            "Content": f"[{settings.SMS_BRANDNAME}] Ma xac thuc dang nhap Telemedicine cua quy khach la: {otp_code}. Ma co hieu luc trong 5 phut.",
            "SmsType": "2",  # 2: CSKH Brandname
            "Brandname": settings.SMS_BRANDNAME,
            "SendDate": ""
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post("http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json", json=payload)
                data = res.json()
                if data.get("CodeResult") == "100":
                    return {
                        "success": True,
                        "provider": "esms",
                        "message": "Đã gửi SMS OTP thành công qua eSMS.",
                        "transaction_id": data.get("SMSID")
                    }
                else:
                    logger.error(f"eSMS Error: {data}")
                    return {
                        "success": False,
                        "provider": "esms",
                        "message": f"Lỗi eSMS: {data.get('ErrorMessage')}",
                        "transaction_id": None
                    }
        except Exception as e:
            logger.error(f"Failed to connect to eSMS: {e}")
            return {"success": False, "provider": "esms", "message": str(e), "transaction_id": None}

    # 3. Cổng Zalo Notification Service (ZNS)
    if provider == "zalo_zns":
        # Chuẩn hóa SĐT định dạng 84...
        formatted_phone = phone_number
        if formatted_phone.startswith("0"):
            formatted_phone = "84" + formatted_phone[1:]

        payload = {
            "phone": formatted_phone,
            "template_id": settings.ZALO_TEMPLATE_ID or "default_otp_template",
            "template_data": {
                "otp": otp_code,
                "patient_name": patient_name or "Quý khách",
                "valid_minutes": "5"
            },
            "tracking_id": f"zns-{phone_number}-{otp_code}"
        }
        headers = {
            "Content-Type": "application/json",
            "access_token": settings.SMS_API_KEY
        }
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post("https://business.openapi.zalo.me/message/template", json=payload, headers=headers)
                data = res.json()
                if data.get("error") == 0:
                    return {
                        "success": True,
                        "provider": "zalo_zns",
                        "message": "Đã gửi Zalo ZNS OTP thành công.",
                        "transaction_id": data.get("data", {}).get("msg_id")
                    }
                else:
                    logger.error(f"Zalo ZNS Error: {data}")
                    return {
                        "success": False,
                        "provider": "zalo_zns",
                        "message": f"Lỗi Zalo ZNS: {data.get('message')}",
                        "transaction_id": None
                    }
        except Exception as e:
            logger.error(f"Failed to connect to Zalo ZNS: {e}")
            return {"success": False, "provider": "zalo_zns", "message": str(e), "transaction_id": None}

    return {"success": False, "provider": provider, "message": "Nhà cung cấp SMS không được hỗ trợ", "transaction_id": None}
