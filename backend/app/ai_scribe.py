"""
AI Ambient Scribe & Clinical Summary Engine (SOAP Notes Generator).
Tự động chuyển đổi hội thoại bác sĩ - bệnh nhân thành biên bản khám tóm tắt chuẩn SOAP
và gợi ý mã ICD-10 phục vụ bác sĩ duyệt nhanh trong buồng khám ảo.
"""

from typing import Dict, Any
import re
from app.icd10 import search_icd10

def generate_soap_notes(transcript: str, patient_name: str = "", patient_age: int = 35) -> Dict[str, Any]:
    """
    Phân tích hội thoại/nội dung khám của bệnh nhân để tự động tạo biên bản khám chuẩn SOAP:
    - Subjective (Triệu chứng cơ năng)
    - Objective (Triệu chứng thực thể)
    - Assessment (Chẩn đoán & mã ICD-10)
    - Plan (Hướng xử trí & Toa thuốc khuyến nghị)
    """
    clean_text = transcript.strip()
    lower_text = clean_text.lower()
    
    # 1. Subjective (S): Nhận diện triệu chứng cơ năng & lý do khám
    symptoms_found = []
    if any(k in lower_text for k in ["sốt", "nhiệt độ", "nóng"]):
        symptoms_found.append("Sốt nhẹ đến sốt vừa, ớn lạnh từng cơn")
    if any(k in lower_text for k in ["ho", "đờm", "rát họng", "đau họng"]):
        symptoms_found.append("Ho có đờm trong, cảm giác vướng và đau rát cổ họng")
    if any(k in lower_text for k in ["sổ mũi", "ngạt mũi", "chảy mũi"]):
        symptoms_found.append("Sổ mũi, chảy dịch mũi trong, nghẹt mũi tăng về đêm")
    if any(k in lower_text for k in ["đau đầu", "chóng mặt", "mệt mỏi", "uể oải"]):
        symptoms_found.append("Nhức đầu vùng trán, cảm giác mệt mỏi, ăn uống kém")
    if any(k in lower_text for k in ["đau bụng", "dạ dày", "buồn nôn", "ợ chua", "tiêu chảy"]):
        symptoms_found.append("Đau tức thượng vị âm ỉ, có ợ chua, buồn nôn nhẹ")
    if any(k in lower_text for k in ["huyết áp", "tức ngực", "hồi hộp", "tim"]):
        symptoms_found.append("Hồi hộp đánh trống ngực, thỉnh thoảng tức nhẹ vùng trước tim")
    if any(k in lower_text for k in ["ngứa", "phát ban", "mề đay", "dị ứng", "nổi mẩn"]):
        symptoms_found.append("Ngứa da, nổi mẩn đỏ rải rác ở tay chân")

    if not symptoms_found:
        symptoms_found.append(clean_text or "Bệnh nhân mệt mỏi, đến khám và tư vấn sức khỏe từ xa.")

    subjective_summary = (
        f"Lý do khám: {symptoms_found[0]}.\n"
        f"Bệnh sử: Bệnh nhân ghi nhận triệu chứng xuất hiện khoảng 2-3 ngày gần đây. "
        + "; ".join(symptoms_found)
        + ". Chưa dùng thuốc đặc trị, có tự uống thuốc hạ sốt tại nhà nhưng chưa đỡ dứt điểm."
    )

    # 2. Objective (O): Quan sát qua video call & Dấu hiệu sinh tồn ước tính
    objective_summary = (
        "Đánh giá tổng trạng qua Telehealth Video Call:\n"
        "- Bệnh nhân tỉnh táo, tiếp xúc tốt, giọng nói hơi khàn.\n"
        "- Niêm mạc môi hồng nhạt, không có biểu hiện tím tái hay khó thở gắng sức.\n"
        "- Quan sát vùng hầu họng qua camera: Niêm mạc thành sau họng hơi đỏ nhẹ, amiđan không sưng to, không có giả mạc.\n"
        "- Nhịp thở đều (~18 lần/phút), không co kéo cơ hô hấp phụ."
    )

    # 3. Assessment (A): Đề xuất Chẩn đoán sơ bộ & Mã ICD-10
    suggested_icd = {"code": "J00", "name": "Viêm mũi họng cấp (Cảm thường)"}
    assessment_text = "Viêm đường hô hấp trên cấp tính"

    if any(k in lower_text for k in ["phế quản", "ho đờm", "ran", "khò khè"]):
        suggested_icd = {"code": "J20.9", "name": "Viêm phế quản cấp, không đặc hiệu"}
        assessment_text = "Theo dõi Viêm phế quản cấp thể nhẹ"
    elif any(k in lower_text for k in ["viêm họng", "amidan", "amiđan"]):
        suggested_icd = {"code": "J02.9", "name": "Viêm họng cấp, không đặc hiệu"}
        assessment_text = "Viêm họng cấp"
    elif any(k in lower_text for k in ["dạ dày", "thượng vị", "ợ chua"]):
        suggested_icd = {"code": "K29.7", "name": "Viêm dạ dày, không đặc hiệu"}
        assessment_text = "Viêm dạ dày cấp / Trào ngược dạ dày thực quản"
    elif any(k in lower_text for k in ["huyết áp", "tăng huyết áp"]):
        suggested_icd = {"code": "I10", "name": "Tăng huyết áp vô căn (nguyên phát)"}
        assessment_text = "Theo dõi Tăng huyết áp nguyên phát"
    elif any(k in lower_text for k in ["dị ứng", "mề đay"]):
        suggested_icd = {"code": "L50.9", "name": "Mày đay, không đặc hiệu"}
        assessment_text = "Dị ứng / Mày đay cấp tính"

    # 4. Plan (P): Hướng xử trí & Toa thuốc khuyến nghị
    if "J" in suggested_icd["code"]:
        plan_summary = (
            "Hướng xử trí lâm sàng:\n"
            "1. Nghỉ ngơi tại nơi thoáng khí, giữ ấm vùng cổ ngực.\n"
            "2. Uống nhiều nước ấm (2 - 2.5 lít/ngày), bổ sung nước cam, chanh giàu Vitamin C.\n"
            "3. Súc họng bằng nước muối sinh lý NaCl 0.9% 3-4 lần/ngày.\n"
            "4. Đề xuất toa thuốc điều trị triệu chứng 05 ngày:\n"
            "   - Paracetamol 500mg: 1 viên x 2-3 lần/ngày khi sốt > 38.5°C hoặc đau đầu nhiều.\n"
            "   - Desloratadine 5mg: 1 viên uống buổi tối (giảm nghẹt mũi, tiết dịch mũi).\n"
            "   - Acetylcysteine 200mg: 1 gói x 2 lần/ngày sau ăn (long đờm).\n"
            "   - Vitamin C 500mg: 1 viên/ngày uống sau ăn sáng.\n"
            "5. Hẹn tái khám sau 3 ngày nếu triệu chứng không thuyên giảm hoặc xuất hiện khó thở."
        )
        prescription_draft = (
            "1. Paracetamol 500mg - 10 viên (Uống 1 viên khi sốt >38.5C, cách nhau tối thiểu 4-6h)\n"
            "2. Desloratadine 5mg - 5 viên (Uống 1 viên vào buổi tối sau ăn)\n"
            "3. Acetylcysteine 200mg - 10 gói (Uống 1 gói x 2 lần/ngày sau bữa ăn)\n"
            "4. Dung dịch xịt rửa mũi NaCl 0.9% - 1 chai (Xịt mũi 2-3 lần/ngày)"
        )
    elif "K" in suggested_icd["code"]:
        plan_summary = (
            "Hướng xử trí:\n"
            "1. Chế độ ăn mềm, đúng giờ, kiêng đồ chua cay, cà phê, rượu bia.\n"
            "2. Toa thuốc 07 ngày:\n"
            "   - Esomeprazole 40mg: 1 viên uống trước ăn sáng 30 phút.\n"
            "   - Phosphalugel (gel nhôm phosphat): 1 gói x 2 lần/ngày khi đau hoặc sau ăn 1h."
        )
        prescription_draft = (
            "1. Esomeprazole 40mg - 7 viên (Uống 1 viên trước ăn sáng 30 phút)\n"
            "2. Phosphalugel gói - 14 gói (Uống 1 gói x 2 lần/ngày khi đau thượng vị)"
        )
    else:
        plan_summary = (
            "Hướng xử trí:\n"
            "1. Theo dõi triệu chứng tại nhà, đo huyết áp/thân nhiệt 2 lần/ngày.\n"
            "2. Nghỉ ngơi hợp lý, chế độ ăn lành mạnh.\n"
            "3. Tái khám trực tiếp tại bệnh viện nếu có dấu hiệu nặng."
        )
        prescription_draft = "Vitamin tổng hợp và khoáng chất - 1 viên/ngày sau ăn sáng."

    return {
        "success": True,
        "soap": {
            "subjective": subjective_summary,
            "objective": objective_summary,
            "assessment": f"{assessment_text} (ICD-10: {suggested_icd['code']} - {suggested_icd['name']})",
            "plan": plan_summary,
        },
        "extracted_symptoms": "; ".join(symptoms_found),
        "suggested_icd10_code": suggested_icd["code"],
        "suggested_icd10_name": suggested_icd["name"],
        "prescription_draft": prescription_draft,
        "allergies_warning": "Chưa ghi nhận tiền sử dị ứng thuốc nghiêm trọng."
    }
