"""
Danh mục mã bệnh ICD-10 thường gặp trong khám chữa bệnh ngoại trú & Telemedicine
Tuân theo chuẩn phân loại quốc tế bệnh tật và các vấn đề sức khỏe liên quan (ICD-10 - Bộ Y tế).
"""

ICD10_LIST = [
    {"code": "J00", "name": "Viêm mũi họng cấp (Cảm thường)", "chapter": "Hô hấp"},
    {"code": "J02", "name": "Viêm họng cấp", "chapter": "Hô hấp"},
    {"code": "J03", "name": "Viêm amiđan cấp", "chapter": "Hô hấp"},
    {"code": "J06", "name": "Nhiễm khuẩn hô hấp trên cấp tính", "chapter": "Hô hấp"},
    {"code": "J20", "name": "Viêm phế quản cấp", "chapter": "Hô hấp"},
    {"code": "J45", "name": "Bệnh hen (Hen phế quản)", "chapter": "Hô hấp"},
    {"code": "J30", "name": "Viêm mũi dị ứng và vận mạch", "chapter": "Hô hấp"},
    {"code": "I10", "name": "Bệnh tăng huyết áp vô căn (nguyên phát)", "chapter": "Tim mạch"},
    {"code": "I20", "name": "Cơn đau thắt ngực", "chapter": "Tim mạch"},
    {"code": "I25", "name": "Bệnh tim thiếu máu cục bộ mạn", "chapter": "Tim mạch"},
    {"code": "E11", "name": "Đái tháo đường typ 2 (không phụ thuộc insulin)", "chapter": "Nội tiết - Chuyển hóa"},
    {"code": "E78", "name": "Rối loạn chuyển hóa lipoprotein và tăng lipid máu khác", "chapter": "Nội tiết - Chuyển hóa"},
    {"code": "E03", "name": "Suy giáp khác", "chapter": "Nội tiết - Chuyển hóa"},
    {"code": "E05", "name": "Nhiễm độc giáp (Cường giáp)", "chapter": "Nội tiết - Chuyển hóa"},
    {"code": "K21", "name": "Bệnh trào ngược dạ dày - thực quản (GERD)", "chapter": "Tiêu hóa"},
    {"code": "K29", "name": "Viêm dạ dày và tá tràng", "chapter": "Tiêu hóa"},
    {"code": "K30", "name": "Khó tiêu chức năng", "chapter": "Tiêu hóa"},
    {"code": "K58", "name": "Hội chứng ruột kích thích (IBS)", "chapter": "Tiêu hóa"},
    {"code": "K59.0", "name": "Táo bón chức năng", "chapter": "Tiêu hóa"},
    {"code": "M54.5", "name": "Đau vùng thắt lưng (Đau lưng dưới)", "chapter": "Cơ - Xương - Khớp"},
    {"code": "M54.2", "name": "Đau vùng cổ", "chapter": "Cơ - Xương - Khớp"},
    {"code": "M79.1", "name": "Đau cơ", "chapter": "Cơ - Xương - Khớp"},
    {"code": "M17", "name": "Thoái hóa khớp gối", "chapter": "Cơ - Xương - Khớp"},
    {"code": "M10", "name": "Bệnh Gout", "chapter": "Cơ - Xương - Khớp"},
    {"code": "G43", "name": "Bệnh đau nửa đầu (Migraine)", "chapter": "Thần kinh"},
    {"code": "G44", "name": "Các hội chứng đau đầu khác (Đau đầu căng thẳng)", "chapter": "Thần kinh"},
    {"code": "G47", "name": "Rối loạn giấc ngủ (Mất ngủ)", "chapter": "Thần kinh"},
    {"code": "F41.1", "name": "Rối loạn lo âu lan tỏa", "chapter": "Tâm thần kinh"},
    {"code": "F41.2", "name": "Rối loạn hỗn hợp lo âu và trầm cảm", "chapter": "Tâm thần kinh"},
    {"code": "L20", "name": "Viêm da cơ địa (Atopic dermatitis)", "chapter": "Da liễu"},
    {"code": "L23", "name": "Viêm da tiếp xúc dị ứng", "chapter": "Da liễu"},
    {"code": "L50", "name": "Mày đay (Mề đay cấp/mạn)", "chapter": "Da liễu"},
    {"code": "L70", "name": "Bệnh trứng cá (Mụn trứng cá)", "chapter": "Da liễu"},
    {"code": "H10", "name": "Viêm kết mạc (Đau mắt đỏ)", "chapter": "Mắt"},
    {"code": "H53.1", "name": "Mỏi mắt do điều tiết", "chapter": "Mắt"},
    {"code": "R05", "name": "Ho kéo dài", "chapter": "Triệu chứng chung"},
    {"code": "R50", "name": "Sốt không rõ căn nguyên", "chapter": "Triệu chứng chung"},
    {"code": "R51", "name": "Đau đầu triệu chứng", "chapter": "Triệu chứng chung"},
    {"code": "R53", "name": "Mệt mỏi và suy nhược", "chapter": "Triệu chứng chung"},
    {"code": "B34.2", "name": "Nhiễm Coronavirus, vị trí không xác định", "chapter": "Truyền nhiễm"}
]

def search_icd10(keyword: str = "", limit: int = 15):
    if not keyword:
        return ICD10_LIST[:limit]
    kw = keyword.strip().lower()
    results = [
        item for item in ICD10_LIST
        if kw in item["code"].lower() or kw in item["name"].lower() or kw in item["chapter"].lower()
    ]
    return results[:limit]
