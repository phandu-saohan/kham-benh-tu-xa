import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

def generate_medical_record_pdf(
    appointment_id: int,
    patient_info: dict,
    doctor_info: dict,
    clinical_record: dict,
    encounter_info: dict = None,
    prescription_text: str = "",
    signature_data: dict = None,
    national_code: str = None
) -> bytes:
    """
    Sinh tài liệu PDF chuẩn cho Hồ sơ bệnh án & Đơn thuốc điện tử
    tuân thủ Quyết định 2682/QĐ-BYT và Luật Khám bệnh, chữa bệnh 2023.
    Bao gồm 4 phần:
    1. Thông tin hành chính cá nhân (Bắt buộc)
    2. Thông tin tiền sử sức khỏe & Dịch tễ
    3. Thông tin chung về lượt khám KCB
    4. Thông tin chuyên môn & Hồ sơ bệnh án
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0f766e'),
        spaceAfter=6
    )
    
    header_left = ParagraphStyle(
        'HeaderLeft',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1f2937')
    )
    
    header_right = ParagraphStyle(
        'HeaderRight',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#1f2937')
    )
    
    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#374151')
    )
    
    section_title = ParagraphStyle(
        'SectionTitle',
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=colors.HexColor('#0f766e'),
        spaceBefore=8,
        spaceAfter=4
    )
    
    elements = []

    # 1. Header cơ quan & Quốc hiệu
    cskcb = (encounter_info or {}).get('hospital_code', '79014 (GLN: 8938500000018)')
    header_data = [
        [
            Paragraph(f"<b>BO Y TE - SO Y TE</b><br/>BENH VIEN DAKHOA CARECONNECT<br/>Ma CSKCB: {cskcb}", header_left),
            Paragraph("<b>CONG HOA XA HOI CHU NGHIA VIET NAM</b><br/>Doc lap - Tu do - Hanh phuc<br/><i>Telemedicine Platform - QD 2682/QD-BYT</i>", header_right)
        ]
    ]
    t_header = Table(header_data, colWidths=[260, 260])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=10))

    # 2. Tiêu đề tài liệu
    elements.append(Paragraph("HO SO BENH AN VA DON THUOC DIEN TU TU XA", title_style))
    enc_code = (encounter_info or {}).get('encounter_code') or f"LK-{appointment_id:06d}"
    sub_title = f"Ma luot kham: {enc_code}  |  Ma ho so: #TM{appointment_id}"
    if national_code:
        sub_title += f"  |  Ma Don thuoc QG: {national_code}"
    elements.append(Paragraph(f"<font size=8.5 color='#64748b'>{sub_title}</font>", ParagraphStyle('Sub', alignment=TA_CENTER, spaceAfter=10)))

    # 3. PHẦN 1: THÔNG TIN HÀNH CHÍNH CÁ NHÂN (BẮT BUỘC)
    elements.append(Paragraph("1. THONG TIN HANH CHINH NGUOI BENH (BAT BUOC)", section_title))
    pid = patient_info.get('external_patient_id') or f"CC-{patient_info.get('id', '')}"
    full_name = patient_info.get('full_name', '')
    dob = patient_info.get('date_of_birth', 'Chua ro')
    gender = patient_info.get('gender', 'Nam')
    cccd = patient_info.get('identity_card', 'Chua cap nhat')
    ethnicity = patient_info.get('ethnicity', 'Kinh')
    blood = patient_info.get('blood_type', 'O+')
    address = patient_info.get('address', 'Chua cap nhat')
    prov_code = patient_info.get('province_code', '')
    ward_code = patient_info.get('ward_code', '')
    addr_text = f"{address} (Ma Tinh: {prov_code or '79'} | Ma Xa: {ward_code or '26740'})" if (prov_code or ward_code) else address

    companion_name = patient_info.get('companion_name') or "Khong co"
    companion_id = patient_info.get('companion_id_card') or "Khong co"
    companion_phone = patient_info.get('companion_phone') or "Khong co"
    companion_rel = patient_info.get('companion_relationship') or "Nguoi than"
    comp_text = f"{companion_name} (Quan he: {companion_rel} - CCCD: {companion_id} - SDT: {companion_phone})" if companion_name != "Khong co" else "Khong co nguoi di cung"

    admin_table_data = [
        [
            Paragraph(f"<b>Ho va ten:</b> {full_name}", body_style),
            Paragraph(f"<b>Ngay sinh:</b> {dob}  |  <b>Gioi tinh:</b> {gender}", body_style)
        ],
        [
            Paragraph(f"<b>So CCCD / Dinh danh:</b> {cccd}", body_style),
            Paragraph(f"<b>Dan toc:</b> {ethnicity}  |  <b>Nhom mau:</b> {blood}", body_style)
        ],
        [
            Paragraph(f"<b>Noi o hien tai:</b> {addr_text}", body_style),
            Paragraph(f"<b>Ma dinh danh y te (PID):</b> {pid}", body_style)
        ],
        [
            Paragraph(f"<b>Nguoi di cung / Giam ho:</b> {comp_text}", body_style),
            Paragraph(f"<b>SDT lien lac nguoi benh:</b> {patient_info.get('phone_number', '')}", body_style)
        ]
    ]
    t_admin = Table(admin_table_data, colWidths=[270, 250])
    t_admin.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    elements.append(t_admin)
    elements.append(Spacer(1, 6))

    # 4. PHẦN 2: THÔNG TIN TIỀN SỬ SỨC KHỎE
    elements.append(Paragraph("2. THONG TIN TIEN SU SUC KHOE & DICH TE", section_title))
    has_med = "Co" if patient_info.get('has_medical_history') else "Khong"
    med_icd = patient_info.get('medical_history_icd10') or "Chua ghi nhan ma ICD-10"
    fam_icd = patient_info.get('family_history_icd10') or "Chua ghi nhan tien su di truyen"
    epi_text = patient_info.get('epidemiological_history') or "Khong tiep xuc voi nguoi mac benh truyen nhiem (Lao, Soi, Cum...)"
    allergies = patient_info.get('allergies') or "Chua ghi nhan di ung"

    history_data = [
        [
            Paragraph("<b>Tien su ban than:</b>", body_style),
            Paragraph(f"Mac benh tien su: <b>{has_med}</b>  |  Ma ICD-10 tien su: <b>{med_icd}</b> (Di ung: {allergies})", body_style)
        ],
        [
            Paragraph("<b>Tien su gia dinh:</b>", body_style),
            Paragraph(f"Benh ly di truyen gia dinh (ICD-10): <b>{fam_icd}</b>", body_style)
        ],
        [
            Paragraph("<b>Tien su dich te:</b>", body_style),
            Paragraph(epi_text, body_style)
        ]
    ]
    t_history = Table(history_data, colWidths=[120, 400])
    t_history.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(t_history)
    elements.append(Spacer(1, 6))

    # 5. PHẦN 3: THÔNG TIN CHUNG VỀ LƯỢT KHÁM BỆNH, CHỮA BỆNH
    elements.append(Paragraph("3. THONG TIN CHUNG VE LUOT KHAM BENH, CHUA BENH", section_title))
    cskcb_code = (encounter_info or {}).get('hospital_code') or "79014 (GLN: 8938500000018)"
    patient_cat = (encounter_info or {}).get('patient_category') or "Bao hiem y te"
    pay_src = (encounter_info or {}).get('payment_source') or "Quy Bao hiem y te"
    bhyt_code = (encounter_info or {}).get('bhyt_code') or patient_info.get('bhyt_code') or "Khong ap dung"

    encounter_data = [
        [
            Paragraph(f"<b>Ma luot kham:</b> {enc_code}", body_style),
            Paragraph(f"<b>Ma co so KCB (GLN):</b> {cskcb_code}", body_style)
        ],
        [
            Paragraph(f"<b>Doi tuong benh nhan:</b> {patient_cat}", body_style),
            Paragraph(f"<b>Nguon chi tra:</b> {pay_src} (The BHYT: {bhyt_code})", body_style)
        ],
        [
            Paragraph(f"<b>Bac si phu trach:</b> {doctor_info.get('full_name', '')}", body_style),
            Paragraph(f"<b>Chung chi hanh nghe (CCHN):</b> {doctor_info.get('cchn', '008912/BYT-CCHN')}", body_style)
        ]
    ]
    t_enc = Table(encounter_data, colWidths=[260, 260])
    t_enc.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0f9ff')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#bae6fd')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#bae6fd')),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
    ]))
    elements.append(t_enc)
    elements.append(Spacer(1, 6))

    # 6. PHẦN 4: THÔNG TIN CHUYÊN MÔN VÀ HỒ SƠ BỆNH ÁN (LUẬT KCB 2023)
    elements.append(Paragraph("4. THONG TIN CHUYEN MON VA HO SO BENH AN (LUAT KHAM BENH, CHUA BENH 2023)", section_title))
    symptoms = clinical_record.get('symptoms') or "Binh thuong"
    icd10 = f"[{clinical_record.get('icd10_code', 'R69')}] {clinical_record.get('icd10_name', 'Chua phan loai')}"
    diag = clinical_record.get('diagnosis') or clinical_record.get('icd10_name') or ""
    clinical_exam = clinical_record.get('clinical_examination') or clinical_record.get('clinical_notes') or "Quan sat video: tri giac tinh tao, tiep xuc tot, khong dau hieu suy ho hap cap."
    paraclinical = clinical_record.get('paraclinical_results') or "Chua co chi dinh can lam sang xam lan."
    treatment = clinical_record.get('treatment_regimen') or clinical_record.get('plan') or "Dieu tri noi khoa, tu van dinh duong va theo doi tai nha."
    evolution = clinical_record.get('clinical_evolution') or "Dien bien on dinh trong suot phien tu van."
    services = clinical_record.get('medical_services_used') or "Kham benh tu xa chuyen khoa (Ma DV: 01.0001); Ket noi Telemedicine SmartCA PKI."

    clinical_data = [
        [Paragraph("<b>Kham benh & Lam sang:</b>", body_style), Paragraph(f"Lý do khám: {symptoms}<br/>Thăm khám: {clinical_exam}", body_style)],
        [Paragraph("<b>Can lam sang & Xet nghiem:</b>", body_style), Paragraph(paraclinical, body_style)],
        [Paragraph("<b>Chan doan ICD-10:</b>", body_style), Paragraph(f"<b>{icd10}</b> - {diag}", body_style)],
        [Paragraph("<b>Phac do & Dien bien:</b>", body_style), Paragraph(f"Phác đồ: {treatment}<br/>Diễn biến & Chăm sóc: {evolution}", body_style)],
        [Paragraph("<b>Dich vu & Trang thiet bi:</b>", body_style), Paragraph(services, body_style)],
    ]
    t_clinical = Table(clinical_data, colWidths=[130, 390])
    t_clinical.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    elements.append(t_clinical)
    elements.append(Spacer(1, 6))

    # 7. Đơn thuốc điện tử ngoại trú
    elements.append(Paragraph("DANH MUC THUOC KE DON (DON THUOC DIEN TU)", section_title))
    pres_content = prescription_text or "Khong ke don thuoc (tu van che do sinh hoat)."
    t_pres = Table([[Paragraph(pres_content.replace('\n', '<br/>'), body_style)]], colWidths=[520])
    t_pres.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdfa')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#a7f3d0')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_pres)
    elements.append(Spacer(1, 8))

    # 8. Xác thực chữ ký số SmartCA PKI
    if signature_data:
        sig_info = (
            f"<b>[DA KY SO CHUAN Y TE - SMARTCA PKI THEO THONG TU 30/2023/TT-BYT]</b><br/>"
            f"Nguoi ky: <b>{signature_data.get('signer_name')}</b> | CCHN: {signature_data.get('signer_cchn')}<br/>"
            f"Don vi CA: {signature_data.get('ca_provider')} | Serial: {signature_data.get('cert_serial')} | Thoi gian: {signature_data.get('timestamp')}<br/>"
            f"Ma bam toan ven SHA-256: <font size=6.5 color='#0e7490'>{signature_data.get('signature_hash')}</font>"
        )
    else:
        sig_info = "<i>Ho so ban nhap dien tu - Cho bac si ky so SmartCA.</i>"

    t_sig = Table([[Paragraph(sig_info, body_style)]], colWidths=[520])
    t_sig.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fefce8')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fef08a')),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    elements.append(t_sig)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
