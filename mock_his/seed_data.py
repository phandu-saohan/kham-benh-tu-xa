"""
Dữ liệu seed 100% TỔNG HỢP (synthetic) cho Mock HIS Server.
Không chứa dữ liệu bệnh nhân thật. Tên/CCCD/SDT đều là mẫu ngẫu nhiên.
"""

SEED_DEPARTMENTS = [
    {"id": "DP-01", "name": "Khoa Nội tổng quát", "code": "NOI_TQ"},
    {"id": "DP-02", "name": "Khoa Tim mạch", "code": "TIM_MAC"},
    {"id": "DP-03", "name": "Khoa Nhi", "code": "NHI"},
    {"id": "DP-04", "name": "Khoa Da liễu", "code": "DA_LIEU"},
    {"id": "DP-05", "name": "Y tế dự phòng & COVID-19", "code": "YTDP"},
]

SEED_DOCTORS = [
    {"id": "BS-001", "name": "Nguyễn Văn Hải", "department_id": "DP-01", "title": "BS. Chuyên khoa I"},
    {"id": "BS-002", "name": "Trần Thị Mai", "department_id": "DP-02", "title": "BS. Chuyên khoa II"},
    {"id": "BS-003", "name": "Lê Quốc Cường", "department_id": "DP-03", "title": "BS. Chuyên khoa I"},
    {"id": "BS-004", "name": "Phạm Ngọc Lan", "department_id": "DP-04", "title": "BS. Chuyên khoa I"},
]

# Bệnh nhân tổng hợp. PID dùng để test ánh xạ mã bệnh nhân telemedicine -> HIS.
SEED_PATIENTS = [
    {
        "pid": "HIS-2024-0001",
        "full_name": "Nguyễn Thị Bích Hòa",
        "gender": "female",
        "dob": "1980-04-12",
        "phone": "0900000001",
        "national_id": "080180012345",
        "bhyt_no": "GD4812345678001",
        "address": "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh",
        "conditions": [
            {"icd10_code": "I10", "display": "Tăng huyết áp vô căn (lành tính)", "note": "Theo dõi huyết áp thường quy"},
        ],
        "allergies": [{"substance": "Penicillin", "severity": "moderate"}],
    },
    {
        "pid": "HIS-2024-0002",
        "full_name": "Trần Văn Đạt",
        "gender": "male",
        "dob": "1992-09-25",
        "phone": "0900000002",
        "national_id": "079192023456",
        "bhyt_no": "",
        "address": "45 Nguyễn Trãi, Thanh Xuân, Hà Nội",
        "conditions": [],
        "allergies": [],
    },
    {
        "pid": "HIS-2024-0003",
        "full_name": "Lê Minh Khuê",
        "gender": "female",
        "dob": "2016-03-08",
        "phone": "0900000003",
        "national_id": None,
        "bhyt_no": "TB6512345678003",
        "address": "88 Nguyễn Huệ, Hải Châu, Đà Nẵng",
        "conditions": [
            {"icd10_code": "J45.9", "display": "Hen suyễn không xác định", "note": "Cấp cứu 2 lần 2023"},
        ],
        "allergies": [{"substance": "Phấn hoa", "severity": "mild"}],
    },
]

SEED_ENCOUNTERS = [
    {
        "pid": "HIS-2024-0001",
        "doctor_id": "BS-002",
        "department_id": "DP-02",
        "started_at": "2024-11-20T08:30:00",
        "status": "finished",
        "reason": "Tái khám tăng huyết áp",
    },
    {
        "pid": "HIS-2024-0001",
        "doctor_id": "BS-001",
        "department_id": "DP-01",
        "started_at": "2025-06-02T14:00:00",
        "status": "finished",
        "reason": "Đau đầu kéo dài",
    },
]
