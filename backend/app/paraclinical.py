"""
Module Quản lý & Cung cấp dữ liệu Cận lâm sàng (Lab/LIS) và Chẩn đoán hình ảnh PACS (RIS/PACS)
Truy vấn trực tiếp từ dữ liệu thực tế của bệnh nhân trong cơ sở dữ liệu (AppointmentDocument, ClinicalRecord, AIPACSConsultation).
Không sinh dữ liệu demo giả lập cho tài khoản mới.
"""

from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session


def get_patient_lab_results(
    patient_id: int,
    patient_name: str | None = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Trả về danh sách kết quả xét nghiệm cận lâm sàng thực tế của bệnh nhân.
    Nếu bệnh nhân chưa có kết quả xét nghiệm nào trong hệ thống, trả về danh sách rỗng [].
    """
    p_name = patient_name or f"Bệnh nhân #{patient_id}"
    reports: List[Dict[str, Any]] = []

    if db is not None:
        from app.models import Appointment, ClinicalRecord, AppointmentDocument, User

        # 1. Lấy từ hồ sơ tài liệu xét nghiệm đính kèm (AppointmentDocument)
        lab_docs = (
            db.query(AppointmentDocument)
            .filter(
                AppointmentDocument.patient_id == patient_id,
                AppointmentDocument.doc_type == "lab_test"
            )
            .order_by(AppointmentDocument.uploaded_at.desc())
            .all()
        )
        for doc in lab_docs:
            ts_str = doc.uploaded_at.strftime("%Y-%m-%d %H:%M") if hasattr(doc.uploaded_at, "strftime") and doc.uploaded_at else "Đã ghi nhận"
            reports.append({
                "report_id": f"XN-DOC-{doc.id:04d}",
                "title": doc.title or "Phiếu Kết Quả Xét Nghiệm Cận Lâm Sàng",
                "category": "biochemistry",
                "category_name": "Xét nghiệm lâm sàng",
                "sampled_at": ts_str,
                "result_at": ts_str,
                "performed_by": "Khoa Xét nghiệm",
                "doctor_order": "Bác sĩ điều trị",
                "conclusion": doc.notes or "Kết quả xét nghiệm đã được tải lên hồ sơ bệnh án.",
                "indicators": []
            })

        # 2. Lấy từ bệnh án điện tử có ghi nhận kết quả cận lâm sàng (ClinicalRecord)
        appts = (
            db.query(Appointment)
            .filter(Appointment.patient_id == patient_id)
            .order_by(Appointment.starts_at.desc())
            .all()
        )
        for appt in appts:
            rec = db.query(ClinicalRecord).filter_by(appointment_id=appt.id).first()
            if rec and rec.paraclinical_results and rec.paraclinical_results.strip():
                doc_user = db.get(User, appt.doctor_id)
                ts_str = appt.starts_at.strftime("%Y-%m-%d %H:%M") if hasattr(appt.starts_at, "strftime") and appt.starts_at else "Đã ghi nhận"
                reports.append({
                    "report_id": f"XN-EMR-{appt.id:04d}",
                    "title": f"Kết Quả Cận Lâm Sàng Ca Khám #{appt.id}",
                    "category": "biochemistry",
                    "category_name": "Bệnh án EMR",
                    "sampled_at": ts_str,
                    "result_at": ts_str,
                    "performed_by": "Hệ thống HIS/LIS",
                    "doctor_order": doc_user.full_name if doc_user else "Bác sĩ phụ trách",
                    "conclusion": rec.paraclinical_results.strip(),
                    "indicators": []
                })

    abnormal_count = 0
    for r in reports:
        for ind in r.get("indicators", []):
            if ind.get("flag") in ["HIGH", "LOW"]:
                abnormal_count += 1

    return {
        "patient_id": patient_id,
        "patient_name": p_name,
        "total_reports": len(reports),
        "abnormal_indicators_count": abnormal_count,
        "reports": reports
    }


def get_patient_pacs_studies(
    patient_id: int,
    patient_name: str | None = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Trả về danh sách các ca chụp chẩn đoán hình ảnh PACS / DICOM thực tế của bệnh nhân.
    Nếu bệnh nhân chưa có ca chụp nào, trả về danh sách rỗng [].
    """
    p_name = patient_name or f"Bệnh nhân #{patient_id}"
    ohif_base = "https://viewer.ohif.org/viewer"
    studies: List[Dict[str, Any]] = []

    if db is not None:
        from app.models import Appointment, AIPACSConsultation, AppointmentDocument

        # 1. Lấy từ bảng AIPACSConsultation của các ca khám thuộc bệnh nhân
        appts = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()
        appt_ids = [a.id for a in appts]
        if appt_ids:
            pacs_records = (
                db.query(AIPACSConsultation)
                .filter(AIPACSConsultation.appointment_id.in_(appt_ids))
                .order_by(AIPACSConsultation.created_at.desc())
                .all()
            )
            for pr in pacs_records:
                date_str = pr.created_at.strftime("%Y-%m-%d") if hasattr(pr.created_at, "strftime") and pr.created_at else ""
                studies.append({
                    "study_id": pr.dicom_study_id or f"PACS-{pr.id:04d}",
                    "modality": pr.modality or "CR",
                    "modality_name": f"Chẩn đoán hình ảnh ({pr.modality or 'DICOM'})",
                    "body_part": pr.body_part or "Lồng ngực",
                    "description": f"Chụp {pr.modality or 'X-Quang'} {pr.body_part or ''}".strip(),
                    "date": date_str,
                    "institution": "Bệnh viện Đa khoa Quốc tế CareConnect",
                    "radiologist": "Khoa Chẩn đoán hình ảnh",
                    "findings": pr.primary_finding or "Đã ghi nhận hình ảnh DICOM trên hệ thống PACS.",
                    "impression": pr.doctor_feedback or pr.primary_finding or "Chờ bác sĩ chuyên khoa kết luận.",
                    "series_count": 1,
                    "instances_count": 1,
                    "viewer_url": f"{ohif_base}?StudyInstanceUIDs={pr.dicom_study_id}" if pr.dicom_study_id and "." in pr.dicom_study_id else None,
                    "dicom_web_endpoint": "https://d3t6nzsm8abpei.cloudfront.net/dicomweb",
                    "study_instance_uid": pr.dicom_study_id or f"PACS-{pr.id:04d}"
                })

        # 2. Lấy từ tài liệu CĐHA đính kèm (AppointmentDocument)
        cdha_docs = (
            db.query(AppointmentDocument)
            .filter(
                AppointmentDocument.patient_id == patient_id,
                AppointmentDocument.doc_type == "cdha"
            )
            .order_by(AppointmentDocument.uploaded_at.desc())
            .all()
        )
        for doc in cdha_docs:
            date_str = doc.uploaded_at.strftime("%Y-%m-%d") if hasattr(doc.uploaded_at, "strftime") and doc.uploaded_at else ""
            studies.append({
                "study_id": f"CDHA-{doc.id:04d}",
                "modality": "OT",
                "modality_name": "Hồ sơ Chẩn đoán hình ảnh",
                "body_part": "Theo chỉ định",
                "description": doc.title or "Phiếu Chẩn đoán hình ảnh",
                "date": date_str,
                "institution": "Cơ sở Khám chữa bệnh",
                "radiologist": "Bác sĩ CĐHA",
                "findings": doc.notes or "Hình ảnh chẩn đoán đã được đính kèm vào hồ sơ.",
                "impression": doc.notes or "Đã lưu trữ hồ sơ hình ảnh y khoa.",
                "series_count": 1,
                "instances_count": 1,
                "viewer_url": doc.file_url,
                "dicom_web_endpoint": "",
                "study_instance_uid": f"CDHA-{doc.id:04d}"
            })

    return {
        "patient_id": patient_id,
        "patient_name": p_name,
        "total_studies": len(studies),
        "viewer_engine": "OHIF Viewer v3 (DICOMweb WADO-RS)",
        "notice": "Hệ thống lưu trữ và truyền tải hình ảnh y tế chuẩn DICOM PACS.",
        "studies": studies
    }
