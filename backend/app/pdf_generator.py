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
    prescription_text: str = "",
    signature_data: dict = None,
    national_code: str = None
) -> bytes:
    """
    Sinh tài liệu PDF chuẩn cho Phiếu khám bệnh từ xa và Đơn thuốc điện tử
    có đóng dấu chữ ký số (Timestamped Digital Signature).
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
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        alignment=TA_CENTER,
        textColor=colors.HexColor('#0f766e'),
        spaceAfter=12
    )
    
    header_left = ParagraphStyle(
        'HeaderLeft',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#1f2937')
    )
    
    header_right = ParagraphStyle(
        'HeaderRight',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        alignment=TA_RIGHT,
        textColor=colors.HexColor('#1f2937')
    )
    
    body_style = ParagraphStyle(
        'Body',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#374151')
    )
    
    section_title = ParagraphStyle(
        'SectionTitle',
        fontName='Helvetica-Bold',
        fontSize=11,
        textColor=colors.HexColor('#0f766e'),
        spaceBefore=10,
        spaceAfter=6
    )
    
    elements = []

    # 1. Header cơ quan & Quốc hiệu
    header_data = [
        [
            Paragraph("<b>BO Y TE - SO Y TE</b><br/>BENH VIEN DAKHOA CARECONNECT<br/>Ma CSKCB: 01099", header_left),
            Paragraph("<b>CONG HOA XA HOI CHU NGHIA VIET NAM</b><br/>Doc lap - Tu do - Hanh phuc<br/><i>Telemedicine Platform</i>", header_right)
        ]
    ]
    t_header = Table(header_data, colWidths=[260, 260])
    t_header.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t_header)
    elements.append(Spacer(1, 15))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#cbd5e1'), spaceAfter=15))

    # 2. Tiêu đề tài liệu
    elements.append(Paragraph("PHIEU KHAM BENH TU XA & DON THUOC DIEN TU", title_style))
    sub_title = f"Ma ho so kham: #TM{appointment_id}"
    if national_code:
        sub_title += f"  |  Ma Don thuoc Quoc gia: {national_code}"
    elements.append(Paragraph(f"<font size=9 color='#64748b'>{sub_title}</font>", ParagraphStyle('Sub', alignment=TA_CENTER, spaceAfter=15)))

    # 3. Thông tin hành chính Bệnh nhân & Bác sĩ
    pid = patient_info.get('external_patient_id') or f"P-{patient_info.get('id', '')}"
    admin_data = [
        [
            Paragraph(f"<b>Ho ten nguoi benh:</b> {patient_info.get('full_name', '')}", body_style),
            Paragraph(f"<b>So dien thoai:</b> {patient_info.get('phone_number', 'Chua cap nhat')}", body_style)
        ],
        [
            Paragraph(f"<b>Ma dinh danh y te (PID):</b> {pid}", body_style),
            Paragraph(f"<b>Ngay gio kham:</b> {datetime.now().strftime('%d/%m/%Y %H:%M')}", body_style)
        ],
        [
            Paragraph(f"<b>Bac si phu trach:</b> {doctor_info.get('full_name', '')}", body_style),
            Paragraph(f"<b>Chung chi hanh nghe (CCHN):</b> {doctor_info.get('cchn', '008912/BYT-CCHN')}", body_style)
        ]
    ]
    t_admin = Table(admin_data, colWidths=[260, 260])
    t_admin.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    elements.append(t_admin)
    elements.append(Spacer(1, 10))

    # 4. Phần khám lâm sàng & Chẩn đoán ICD-10
    elements.append(Paragraph("I. THONG TIN KHAM LAM SANG", section_title))
    symptoms = clinical_record.get('symptoms') or "Binh thuong"
    allergies = clinical_record.get('allergies') or "Chua ghi nhan di ung"
    icd10 = f"[{clinical_record.get('icd10_code', 'R69')}] {clinical_record.get('icd10_name', 'Chua phan loai')}"
    diag = clinical_record.get('diagnosis') or clinical_record.get('icd10_name') or ""
    plan = clinical_record.get('plan') or "Theo doi tai nha, tai kham khi co dau hieu bat thuong."

    clinical_data = [
        [Paragraph("<b>Trieu chung co nang:</b>", body_style), Paragraph(symptoms, body_style)],
        [Paragraph("<b>Tien su di ung:</b>", body_style), Paragraph(allergies, body_style)],
        [Paragraph("<b>Chan doan ICD-10:</b>", body_style), Paragraph(f"<b>{icd10}</b>", body_style)],
        [Paragraph("<b>Dien giai chan doan:</b>", body_style), Paragraph(diag, body_style)],
        [Paragraph("<b>Ke hoach & Huong dan:</b>", body_style), Paragraph(plan, body_style)],
    ]
    t_clinical = Table(clinical_data, colWidths=[130, 390])
    t_clinical.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    elements.append(t_clinical)
    elements.append(Spacer(1, 10))

    # 5. Đơn thuốc điện tử
    elements.append(Paragraph("II. DON THUOC DIEN TU NGOAI TRU", section_title))
    pres_content = prescription_text or "Khong ke don thuoc (tu van che do sinh hoat)."
    t_pres = Table([[Paragraph(pres_content.replace('\n', '<br/>'), body_style)]], colWidths=[520])
    t_pres.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f0fdfa')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#a7f3d0')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_pres)
    elements.append(Spacer(1, 15))

    # 6. Chữ ký số điện tử SmartCA (Timestamped Digital Signature Badge)
    elements.append(Paragraph("III. XAC THUC CHU KY SO PHAP LY", section_title))
    
    if signature_data:
        sig_info = (
            f"<b>[DA KY SO CHUAN Y TE - SMARTCA]</b><br/>"
            f"Nguoi ky: <b>{signature_data.get('signer_name')}</b><br/>"
            f"Chung chi hanh nghe: {signature_data.get('signer_cchn')}<br/>"
            f"Don vi cap: {signature_data.get('ca_provider')} | Serial: {signature_data.get('cert_serial')}<br/>"
            f"Thoi gian ky: {signature_data.get('timestamp')}<br/>"
            f"Ma bam toan ven (Hash): <font size=7>{signature_data.get('signature_hash')}</font>"
        )
    else:
        sig_info = "<i>Ho so ban nhap - Chua ky so dien tu.</i>"

    t_sig = Table([[Paragraph(sig_info, body_style)]], colWidths=[520])
    t_sig.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fefce8')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#fef08a')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(t_sig)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
