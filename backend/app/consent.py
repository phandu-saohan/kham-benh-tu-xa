from datetime import datetime, timezone

CONSENT_VERSION = "2026.1-ND13"

CONSENT_TEXT_VI = """
VĂN BẢN ĐỒNG THUẬN KHÁM BỆNH TỪ XA & BẢO VỆ DỮ LIỆU CÁ NHÂN
(Căn cứ Luật Khám bệnh, chữa bệnh 2023, Thông tư 30/2023/TT-BYT và Nghị định 13/2023/NĐ-CP)

1. MỤC ĐÍCH & PHẠM VI THU THẬP DỮ LIỆU:
Người bệnh đồng ý cho phép Bệnh viện CareConnect và Bác sĩ chuyên khoa thu thập, xử lý dữ liệu cá nhân y tế (họ tên, số điện thoại, triệu chứng bệnh, tiền sử dị ứng, hình ảnh/video hội chẩn) phục vụ duy nhất cho mục đích tư vấn, chẩn đoán và kê đơn điều trị.

2. ĐẶC THÙ & GIỚI HẠN CỦA KHÁM BỆNH TỪ XA:
- Khám bệnh từ xa không thể thay thế hoàn toàn việc thăm khám trực tiếp tại cơ sở y tế (nghe tim phổi, sờ nắn bụng, làm xét nghiệm xâm lấn).
- KHÔNG SỬ DỤNG dịch vụ khám bệnh từ xa cho các trường hợp CẤP CỨU NGUY KỊCH (đột quỵ, nhồi máu cơ tim, khó thở dữ dội, chấn thương nặng). Khi gặp tình huống khẩn cấp, vui lòng gọi ngay 115 hoặc đến cơ sở y tế gần nhất.

3. BẢO MẬT VÀ QUYỀN CỦA CHỦ THỂ DỮ LIỆU:
Dữ liệu được mã hóa đường truyền WebRTC chuẩn E2EE và lưu trữ bảo mật theo quy định bảo vệ dữ liệu cá nhân. Người bệnh có quyền yêu cầu trích xuất hồ sơ bệnh án cá nhân bất kỳ lúc nào.

Bằng việc chọn "Tôi đã đọc và Đồng ý", người bệnh xác nhận tự nguyện tham gia buổi khám bệnh từ xa và đồng thuận với các điều khoản nêu trên.
"""

def get_consent_terms() -> dict:
    return {
        "version": CONSENT_VERSION,
        "title": "Văn bản Đồng thuận Khám bệnh từ xa & Bảo vệ dữ liệu y tế (Nghị định 13/2023/NĐ-CP)",
        "content": CONSENT_TEXT_VI.strip(),
        "required": True
    }
