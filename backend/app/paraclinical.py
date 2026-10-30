"""
Module Quản lý & Cung cấp dữ liệu Cận lâm sàng (Lab/LIS) và Chẩn đoán hình ảnh PACS (RIS/PACS)
Tách biệt rõ ràng cho từng bệnh nhân với các chỉ số tham chiếu chuẩn y tế Việt Nam & DICOMweb WADO-RS
"""

from typing import Dict, List, Any


def get_patient_lab_results(patient_id: int, patient_name: str | None = None) -> Dict[str, Any]:
    """
    Trả về danh sách kết quả xét nghiệm cận lâm sàng chi tiết của từng bệnh nhân.
    Dữ liệu được điều chỉnh cá nhân hóa theo từng patient_id.
    """
    p_name = patient_name or f"Bệnh nhân #{patient_id}"
    
    # Biến thiên nhẹ các chỉ số dựa trên patient_id để mỗi bệnh nhân có kết quả chân thực
    is_odd = (patient_id % 2 != 0)
    
    glucose_val = 6.8 if is_odd else 5.2
    glu_flag = "HIGH" if glucose_val > 6.4 else "NORMAL"
    glu_label = "Tăng cao" if glu_flag == "HIGH" else "Bình thường"
    
    hba1c_val = 6.7 if is_odd else 5.4
    hba1c_flag = "HIGH" if hba1c_val > 6.0 else "NORMAL"
    hba1c_label = "Tăng cao" if hba1c_flag == "HIGH" else "Bình thường"

    chol_val = 5.8 if is_odd else 4.6
    chol_flag = "HIGH" if chol_val > 5.2 else "NORMAL"
    chol_label = "Tăng cao" if chol_flag == "HIGH" else "Bình thường"

    trig_val = 2.35 if is_odd else 1.45
    trig_flag = "HIGH" if trig_val > 1.88 else "NORMAL"
    trig_label = "Tăng cao" if trig_flag == "HIGH" else "Bình thường"

    reports = [
        {
            "report_id": f"XN-SH-20261025-{patient_id:03d}",
            "title": "Phiếu Kết Quả Xét Nghiệm Sinh Hóa Máu",
            "category": "biochemistry",
            "category_name": "Sinh hóa máu",
            "sampled_at": "2026-10-25 08:15",
            "result_at": "2026-10-25 09:30",
            "performed_by": "CNXN. Lê Thị Bích (Khoa Xét nghiệm)",
            "doctor_order": "BS.CKII Trần Minh",
            "conclusion": "Đường huyết và mỡ máu tăng nhẹ. Chức năng gan (AST, ALT) và chức năng thận (Creatinine, Ure, eGFR) trong giới hạn bình thường." if is_odd else "Các chỉ số sinh hóa máu (đường huyết, mỡ máu, chức năng gan thận) trong giới hạn bình thường.",
            "indicators": [
                {
                    "code": "GLU",
                    "name": "Định lượng Glucose máu đói (Fasting Glucose)",
                    "value": str(glucose_val),
                    "unit": "mmol/L",
                    "ref_range": "3.9 - 6.4",
                    "flag": glu_flag,
                    "flag_label": glu_label,
                    "note": "Mẫu máu tĩnh mạch buổi sáng chưa ăn"
                },
                {
                    "code": "HBA1C",
                    "name": "Đo tỷ lệ HbA1c (Glycated Hemoglobin)",
                    "value": str(hba1c_val),
                    "unit": "%",
                    "ref_range": "4.0 - 6.0",
                    "flag": hba1c_flag,
                    "flag_label": hba1c_label,
                    "note": "Đánh giá kiểm soát đường huyết 3 tháng"
                },
                {
                    "code": "CHOL",
                    "name": "Định lượng Cholesterol toàn phần",
                    "value": str(chol_val),
                    "unit": "mmol/L",
                    "ref_range": "3.9 - 5.2",
                    "flag": chol_flag,
                    "flag_label": chol_label,
                    "note": None
                },
                {
                    "code": "TRIG",
                    "name": "Định lượng Triglyceride",
                    "value": str(trig_val),
                    "unit": "mmol/L",
                    "ref_range": "0.4 - 1.88",
                    "flag": trig_flag,
                    "flag_label": trig_label,
                    "note": None
                },
                {
                    "code": "HDL",
                    "name": "Định lượng HDL-Cholesterol",
                    "value": "1.18",
                    "unit": "mmol/L",
                    "ref_range": "> 0.90",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "LDL",
                    "name": "Định lượng LDL-Cholesterol",
                    "value": "3.55" if is_odd else "2.70",
                    "unit": "mmol/L",
                    "ref_range": "< 3.40",
                    "flag": "HIGH" if is_odd else "NORMAL",
                    "flag_label": "Tăng cao" if is_odd else "Bình thường",
                    "note": "Yếu tố nguy cơ tim mạch xơ vữa"
                },
                {
                    "code": "AST",
                    "name": "Đo hoạt độ AST / SGOT (Men gan)",
                    "value": "31",
                    "unit": "U/L",
                    "ref_range": "< 37",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "ALT",
                    "name": "Đo hoạt độ ALT / SGPT (Men gan)",
                    "value": "36",
                    "unit": "U/L",
                    "ref_range": "< 41",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "CREA",
                    "name": "Định lượng Creatinine huyết thanh",
                    "value": "82",
                    "unit": "µmol/L",
                    "ref_range": "53 - 106",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "URE",
                    "name": "Định lượng Ure máu (Blood Urea)",
                    "value": "5.4",
                    "unit": "mmol/L",
                    "ref_range": "2.5 - 7.5",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "EGFR",
                    "name": "Độ lọc cầu thận ước tính (eGFR - CKD-EPI)",
                    "value": "98.5",
                    "unit": "mL/min/1.73m²",
                    "ref_range": "> 90.0",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": "Chức năng lọc thận giai đoạn 1 (bình thường)"
                }
            ]
        },
        {
            "report_id": f"XN-HH-20261025-{patient_id:03d}",
            "title": "Tổng Phân Tích Tế Bào Máu Ngoại Vi (CBC)",
            "category": "hematology",
            "category_name": "Huyết học & Tế bào",
            "sampled_at": "2026-10-25 08:15",
            "result_at": "2026-10-25 09:10",
            "performed_by": "CNXN. Hoàng Văn Đức",
            "doctor_order": "BS.CKII Trần Minh",
            "conclusion": "Số lượng và công thức bạch cầu, hồng cầu, tiểu cầu trong giới hạn bình thường. Chưa thấy biểu hiện nhiễm trùng cấp hoặc thiếu máu.",
            "indicators": [
                {
                    "code": "WBC",
                    "name": "Số lượng bạch cầu (White Blood Cells)",
                    "value": "7.35",
                    "unit": "G/L",
                    "ref_range": "4.0 - 10.0",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "NEUT",
                    "name": "Tỷ lệ bạch cầu trung tính (NEUT%)",
                    "value": "62.4",
                    "unit": "%",
                    "ref_range": "43.0 - 76.0",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "LYM",
                    "name": "Tỷ lệ bạch cầu Lympho (LYM%)",
                    "value": "27.8",
                    "unit": "%",
                    "ref_range": "17.0 - 48.0",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "RBC",
                    "name": "Số lượng hồng cầu (Red Blood Cells)",
                    "value": "4.86",
                    "unit": "T/L",
                    "ref_range": "4.0 - 5.8",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "HGB",
                    "name": "Huyết sắc tố (Hemoglobin)",
                    "value": "146",
                    "unit": "g/L",
                    "ref_range": "130 - 175",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "HCT",
                    "name": "Thể tích khối hồng cầu (Hematocrit)",
                    "value": "43.5",
                    "unit": "%",
                    "ref_range": "38.0 - 50.0",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "PLT",
                    "name": "Số lượng tiểu cầu (Platelets)",
                    "value": "242",
                    "unit": "G/L",
                    "ref_range": "150 - 450",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                }
            ]
        },
        {
            "report_id": f"XN-NT-20261025-{patient_id:03d}",
            "title": "Tổng Phân Tích Nước Tiểu (10 Thông Số)",
            "category": "urinalysis",
            "category_name": "Tổng phân tích nước tiểu",
            "sampled_at": "2026-10-25 08:20",
            "result_at": "2026-10-25 09:00",
            "performed_by": "CNXN. Lê Thị Bích",
            "doctor_order": "BS.CKII Trần Minh",
            "conclusion": "Nước tiểu trong, không phát hiện Protein hoặc Bạch cầu niệu. Glucose niệu vết nhẹ, cần theo dõi kiểm soát đường máu.",
            "indicators": [
                {
                    "code": "URI_PRO",
                    "name": "Protein niệu (Proteinuria)",
                    "value": "Âm tính (Negative)",
                    "unit": "",
                    "ref_range": "Âm tính",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "URI_GLU",
                    "name": "Glucose niệu (Glycosuria)",
                    "value": "Vết (Trace)" if is_odd else "Âm tính (Negative)",
                    "unit": "mmol/L",
                    "ref_range": "Âm tính",
                    "flag": "HIGH" if is_odd else "NORMAL",
                    "flag_label": "Cần theo dõi" if is_odd else "Bình thường",
                    "note": "Xuất hiện vết khi đường huyết tăng"
                },
                {
                    "code": "URI_LEU",
                    "name": "Bạch cầu niệu (Leukocyte Esterase)",
                    "value": "Âm tính (Negative)",
                    "unit": "Leu/µL",
                    "ref_range": "Âm tính",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "URI_NIT",
                    "name": "Nitrite",
                    "value": "Âm tính",
                    "unit": "",
                    "ref_range": "Âm tính",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": "Chưa có bằng chứng nhiễm khuẩn tiết niệu"
                },
                {
                    "code": "URI_SG",
                    "name": "Tỷ trọng nước tiểu (Specific Gravity)",
                    "value": "1.018",
                    "unit": "",
                    "ref_range": "1.005 - 1.030",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                },
                {
                    "code": "URI_PH",
                    "name": "Độ pH nước tiểu",
                    "value": "6.0",
                    "unit": "",
                    "ref_range": "5.0 - 8.0",
                    "flag": "NORMAL",
                    "flag_label": "Bình thường",
                    "note": None
                }
            ]
        }
    ]

    # Tính tổng số chỉ số bất thường
    abnormal_count = 0
    for r in reports:
        for ind in r["indicators"]:
            if ind.get("flag") in ["HIGH", "LOW"]:
                abnormal_count += 1

    return {
        "patient_id": patient_id,
        "patient_name": p_name,
        "total_reports": len(reports),
        "abnormal_indicators_count": abnormal_count,
        "reports": reports
    }


def get_patient_pacs_studies(patient_id: int, patient_name: str | None = None) -> Dict[str, Any]:
    """
    Trả về danh sách các ca chụp chẩn đoán hình ảnh PACS / DICOM của từng bệnh nhân.
    Bao gồm liên kết trực tiếp tới bộ đọc phim OHIF Viewer chuẩn DICOMweb WADO-RS.
    """
    p_name = patient_name or f"Bệnh nhân #{patient_id}"
    ohif_base = "https://viewer.ohif.org/viewer"

    studies = [
        {
            "study_id": f"STUDY-XR-{patient_id:03d}-001",
            "modality": "CR",
            "modality_name": "X-Quang Kỹ thuật số",
            "body_part": "Lồng ngực",
            "description": "Chụp X-quang tim phổi thẳng tiêu chuẩn (Chest X-Ray AP/PA)",
            "date": "2026-10-25",
            "institution": "Bệnh viện Đa khoa Quốc tế CareConnect",
            "radiologist": "BS.CKI Nguyễn Văn Hùng (Chuyên khoa CĐHA)",
            "findings": "Hai phế trường thông khí tốt, nhu mô phổi hai bên sáng đều, không thấy tổn thương khu trú dạng nốt mờ hay đông đặc. Cung động mạch chủ bình thường, không phồng vôi hóa. Vòm hoành cong đều, góc sườn hoành hai bên sáng nhọn. Chỉ số tim/lồng ngực < 0.5 (trong giới hạn bình thường).",
            "impression": "Hình ảnh X-Quang tim phổi thẳng trong giới hạn bình thường. Chưa thấy tổn thương phổi cấp tính.",
            "series_count": 1,
            "instances_count": 1,
            "viewer_url": f"{ohif_base}?StudyInstanceUIDs=1.3.6.1.4.1.14519.5.2.1.7009.2403.879445246160784236877209051853",
            "dicom_web_endpoint": "https://d3t6nzsm8abpei.cloudfront.net/dicomweb",
            "study_instance_uid": "1.3.6.1.4.1.14519.5.2.1.7009.2403.879445246160784236877209051853"
        },
        {
            "study_id": f"STUDY-US-{patient_id:03d}-002",
            "modality": "US",
            "modality_name": "Siêu âm Doppler màu",
            "body_part": "Tim & Mạch máu",
            "description": "Siêu âm tim Doppler màu qua thành ngực (Transthoracic Echocardiogram)",
            "date": "2026-10-24",
            "institution": "Bệnh viện Đa khoa Quốc tế CareConnect",
            "radiologist": "ThS.BS Phạm Quỳnh Trang (Khoa Thăm dò chức năng)",
            "findings": "Kích thước các buồng tim trong giới hạn bình thường (Dd = 46mm, Ds = 29mm, Vách liên thất = 9.2mm). Vận động thành tim đồng đều. Chức năng tâm thu thất trái bảo tồn: EF = 64%. Van 2 lá thanh mảnh, hở nhẹ cơ năng 1/4. Van ĐMC 3 mảnh đóng mở tốt. Áp lực ĐMP ước tính PAPs = 22 mmHg (bình thường). Không thấy tràn dịch màng ngoài tim.",
            "impression": "Chức năng tâm thu thất trái tốt (EF = 64%). Hở nhẹ van 2 lá sinh lý 1/4.",
            "series_count": 2,
            "instances_count": 24,
            "viewer_url": f"{ohif_base}?StudyInstanceUIDs=1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463",
            "dicom_web_endpoint": "https://d3t6nzsm8abpei.cloudfront.net/dicomweb",
            "study_instance_uid": "1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463"
        },
        {
            "study_id": f"STUDY-CT-{patient_id:03d}-003",
            "modality": "CT",
            "modality_name": "Cắt lớp vi tính đa dãy",
            "body_part": "Lồng ngực (128 dãy)",
            "description": "Chụp cắt lớp vi tính lồng ngực đa dãy không tiêm cản quang (Chest CT Non-Contrast)",
            "date": "2026-10-15",
            "institution": "Bệnh viện Đa khoa Quốc tế CareConnect",
            "radiologist": "BS.CKII Lê Hoàng Long (Trưởng khoa CĐHA)",
            "findings": "Cửa sổ nhu mô phổi: Hai phế trường thông khí bình thường. Không thấy nốt kính mờ, đám thâm nhiễm hay tổn thương dạng hang. Đường thở thông thoáng. Cửa sổ trung thất: Tuyến ức thoái triển mỡ bình thường. Không thấy hạch to trung thất, rốn phổi. Không thấy tràn dịch màng phổi hai bên. Khung xương lồng ngực không gãy xẹp.",
            "impression": "Chụp cắt lớp vi tính lồng ngực không phát hiện tổn thương nhu mô phổi và trung thất cấp tính.",
            "series_count": 4,
            "instances_count": 142,
            "viewer_url": f"{ohif_base}?StudyInstanceUIDs=1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463",
            "dicom_web_endpoint": "https://d3t6nzsm8abpei.cloudfront.net/dicomweb",
            "study_instance_uid": "1.3.6.1.4.1.14519.5.2.1.7009.2403.334240657131972136850343327463"
        }
    ]

    return {
        "patient_id": patient_id,
        "patient_name": p_name,
        "total_studies": len(studies),
        "viewer_engine": "OHIF Viewer v3 (DICOMweb WADO-RS)",
        "notice": "Hình ảnh chẩn đoán chuẩn DICOM y khoa đầy đủ công cụ zoom, pan, đo khoảng cách, mật độ Hounsfield và tái tạo 3D MPR.",
        "studies": studies
    }
