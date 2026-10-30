import urllib.parse
from app.config import settings

def generate_vietqr_url(appointment_id: int, amount: int, memo_prefix: str = "TM") -> dict:
    """
    Sinh mã VietQR động theo chuẩn Napas247 tương thích toàn bộ ứng dụng ngân hàng tại Việt Nam.
    """
    add_info = f"{memo_prefix}{appointment_id}"
    encoded_info = urllib.parse.quote(add_info)
    encoded_name = urllib.parse.quote(settings.BANK_ACCOUNT_NAME)
    
    # VietQR QuickLink standard format
    qr_image_url = (
        f"https://img.vietqr.io/image/{settings.BANK_ID}-{settings.BANK_ACCOUNT_NO}-compact2.png"
        f"?amount={amount}&addInfo={encoded_info}&accountName={encoded_name}"
    )
    
    return {
        "bank_id": settings.BANK_ID,
        "bank_name": "Ngân hàng TMCP Quân đội (MBBank)",
        "account_no": settings.BANK_ACCOUNT_NO,
        "account_name": settings.BANK_ACCOUNT_NAME,
        "amount": amount,
        "currency": "VND",
        "transfer_content": add_info,
        "qr_image_url": qr_image_url,
        "instructions": f"Quét mã QR bằng App Ngân hàng bất kỳ hoặc chuyển khoản đến STK {settings.BANK_ACCOUNT_NO} ({settings.BANK_ID}) với nội dung: {add_info}"
    }
