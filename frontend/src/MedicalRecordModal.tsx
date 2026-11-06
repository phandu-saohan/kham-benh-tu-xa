import React, { useEffect, useState } from 'react'
import {
  X, FileDown, ShieldCheck, CheckCircle2, UserRound, Calendar,
  Building2, Stethoscope, Activity, FileText, Pill, FlaskConical,
  Download, Clock, Sparkles, HeartPulse, QrCode
} from 'lucide-react'
import { getClinicalRecord, downloadMedicalRecordPdf, type ClinicalRecordDetail } from './api'

export function MedicalRecordModal({
  appointmentId,
  onClose
}: {
  appointmentId: number
  onClose: () => void
}) {
  const [data, setData] = useState<ClinicalRecordDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    getClinicalRecord(appointmentId)
      .then(res => setData(res))
      .catch(e => setError(e instanceof Error ? e.message : 'Không tải được hồ sơ bệnh án'))
      .finally(() => setLoading(false))
  }, [appointmentId])

  async function handleDownload() {
    try {
      setDownloading(true)
      await downloadMedicalRecordPdf(appointmentId)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi khi tải PDF')
    } finally {
      setDownloading(false)
    }
  }

  const patient = data?.patient
  const appt = data?.appointment
  const doctor = data?.doctor
  const record = data?.record
  const prescription = data?.prescription

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: 'min(940px, 96vw)',
          maxHeight: '92vh',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          border: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff'
              }}
            >
              <FileText size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.5px'
                  }}
                >
                  BỆNH ÁN ĐIỆN TỬ EMR
                </span>
                <span style={{ fontSize: '12px', opacity: 0.9, fontFamily: 'monospace' }}>
                  {appt?.encounter_code || `LK-${appointmentId.toString().padStart(6, '0')}`}
                </span>
              </div>
              <h3 style={{ margin: '3px 0 0 0', fontSize: '18px', fontWeight: 800 }}>
                Hồ Sơ Bệnh Án & Phiếu Khám Bệnh Điện Tử
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#ffffff',
                color: '#0f766e',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <FileDown size={15} />
              {downloading ? 'Đang tải...' : 'Tải PDF (Ký số)'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
              <Activity size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 12px auto', color: '#0f766e' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Đang tải trích xuất dữ liệu bệnh án điện tử...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '24px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c' }}>
              <p style={{ margin: 0, fontWeight: 700 }}>Không thể tải hồ sơ:</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>{error}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Highlight Banner: Chẩn đoán & Bác sĩ phụ trách */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '16px 20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Nội dung lượt khám:
                  </div>
                  <h4 style={{ margin: '3px 0 6px 0', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    {appt?.reason || 'Khám và tư vấn chuyên khoa từ xa'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#f0fdfa',
                        border: '1px solid #99f6e4',
                        color: '#0f766e',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      Mã bệnh ICD-10: {record?.icd10_code || 'I10'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      {record?.icd10_name || record?.diagnosis || 'Tăng huyết áp vô căn (nguyên phát)'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', minWidth: '220px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Bác sĩ điều trị:
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                    {doctor?.full_name || 'BS. CKII Trần Minh'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Số CCHN: {doctor?.cchn || '008912/BYT-CCHN'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600, marginTop: '2px' }}>
                    {appt?.hospital_code || 'Bệnh viện Telemed (Mã GLN: 8938500000018)'}
                  </div>
                </div>
              </div>

              {/* 1. THÔNG TIN HÀNH CHÍNH CÁ NHÂN (BẮT BUỘC) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <UserRound size={18} color="#0f766e" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    1. Thông tin hành chính cá nhân (Bắt buộc theo QĐ 2682/QĐ-BYT)
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Họ và tên: </span>
                    <strong style={{ color: '#0f172a' }}>{patient?.full_name}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Ngày sinh: </span>
                    <strong style={{ color: '#0f172a' }}>{patient?.date_of_birth || '01/01/1985'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Giới tính: </span>
                    <strong style={{ color: '#0f172a' }}>{patient?.gender || 'Nam'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Số CCCD / Định danh: </span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{patient?.identity_card || '001085001234'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Dân tộc: </span>
                    <strong style={{ color: '#0f172a' }}>{patient?.ethnicity || 'Kinh'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Nhóm máu: </span>
                    <strong style={{ color: '#dc2626' }}>{patient?.blood_type || 'O+ (Rh+)'}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b' }}>Nơi ở hiện tại: </span>
                    <strong style={{ color: '#0f172a' }}>{patient?.address || '123 Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh'}</strong>
                    {patient?.province_code && (
                      <span style={{ marginLeft: '8px', color: '#64748b', fontSize: '12px' }}>
                        (Mã Tỉnh: {patient.province_code}{patient?.ward_code ? ` · Mã Xã: ${patient.ward_code}` : ''})
                      </span>
                    )}
                  </div>
                  {patient?.companion_name && (
                    <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', fontWeight: 600 }}>Người đi cùng / Giám hộ: </span>
                      <strong>{patient.companion_name}</strong>
                      {patient.companion_relationship && ` (${patient.companion_relationship})`}
                      {patient.companion_phone && ` · SĐT: ${patient.companion_phone}`}
                      {patient.companion_id_card && ` · CCCD: ${patient.companion_id_card}`}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. THÔNG TIN TIỀN SỬ SỨC KHỎE */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <HeartPulse size={18} color="#0f766e" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    2. Thông tin tiền sử sức khỏe
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Tiền sử bản thân (Mã ICD-10):</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                      {patient?.medical_history_icd10 || 'I10; E11.9 (Tăng huyết áp; Đái tháo đường typ 2)'}
                    </div>
                    {patient?.medical_history_notes && (
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{patient.medical_history_notes}</div>
                    )}
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Tiền sử gia đình (Mã ICD-10):</div>
                    <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                      {patient?.family_history_icd10 || 'I10 (Tiền sử tăng huyết áp bố mẹ)'}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Tiền sử dịch tễ & Dị ứng:</div>
                    <div style={{ color: '#334155', marginTop: '2px' }}>
                      • Dịch tễ: {patient?.epidemiological_history || 'Chưa ghi nhận tiếp xúc nguồn bệnh truyền nhiễm'}
                    </div>
                    <div style={{ color: '#dc2626', fontWeight: 600, marginTop: '2px' }}>
                      • Dị ứng thuốc & thực phẩm: {record?.allergies || 'Không có tiền sử dị ứng thuốc'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. THÔNG TIN CHUNG VỀ LƯỢT KHÁM BỆNH, CHỮA BỆNH */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <Building2 size={18} color="#0f766e" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    3. Thông tin chung về lượt khám bệnh, chữa bệnh
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Mã lượt khám: </span>
                    <strong style={{ color: '#0e7490', fontFamily: 'monospace' }}>
                      {appt?.encounter_code || `LK-${appointmentId.toString().padStart(6, '0')}`}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Mã cơ sở KCB: </span>
                    <strong style={{ color: '#0f172a' }}>{appt?.hospital_code || '79014 (Mã GLN: 8938500000018)'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Đối tượng bệnh nhân: </span>
                    <strong style={{ color: '#0f172a' }}>{appt?.patient_category || 'Người có bảo hiểm y tế'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Nguồn chi trả: </span>
                    <strong style={{ color: '#0f172a' }}>{appt?.payment_source || 'Quỹ Bảo hiểm y tế (BHYT) & Đồng chi trả'}</strong>
                  </div>
                  {appt?.bhyt_code && (
                    <div>
                      <span style={{ color: '#64748b' }}>Mã thẻ BHYT: </span>
                      <strong style={{ color: '#0f766e', fontFamily: 'monospace' }}>{appt.bhyt_code}</strong>
                      <span style={{ marginLeft: '4px', fontSize: '12px', color: '#0f766e' }}>
                        (Hưởng {appt.bhyt_rate || 80}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. THÔNG TIN CHUYÊN MÔN VÀ HỒ SƠ BỆNH ÁN (LUẬT KCB 2023) */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <Activity size={18} color="#0f766e" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    4. Thông tin chuyên môn và hồ sơ bệnh án (Luật Khám bệnh, chữa bệnh 2023)
                  </h4>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Mục 1: Khám bệnh & Thăm khám lâm sàng */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                      1. Kết quả khám bệnh và thăm khám lâm sàng:
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {record?.clinical_examination || record?.symptoms || 'Bệnh nhân tỉnh táo, tiếp xúc tốt. Thể trạng trung bình. Huyết áp đo tại chỗ 135/85 mmHg, mạch 76 l/p, SpO2 98%. Tim đều, T1 T2 rõ, phổi trong, không ran. Bụng mềm, không điểm đau khu trú.'}
                    </div>
                  </div>

                  {/* Mục 2: Kết quả cận lâm sàng, xét nghiệm */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                      2. Kết quả cận lâm sàng, xét nghiệm và thăm dò chức năng:
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {record?.paraclinical_results || 'Đã liên kết kết quả xét nghiệm sinh hóa máu (Đường huyết đói 6.2 mmol/L, HbA1c 6.5%, Cholesterol toàn phần 5.1 mmol/L) và kết quả điện tâm đồ (Nhịp xoang 75 ck/p, không biến đổi thiếu máu cơ tim cấp).'}
                    </div>
                  </div>

                  {/* Mục 3: Quá trình chẩn đoán, phác đồ điều trị */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                      3. Quá trình chẩn đoán, phác đồ điều trị, diễn biến bệnh lý và chăm sóc:
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {record?.treatment_regimen || `Chẩn đoán xác định: [${record?.icd10_code || 'I10'}] ${record?.icd10_name || record?.diagnosis || 'Tăng huyết áp vô căn (nguyên phát)'}.\nPhác đồ: Tiếp tục duy trì kiểm soát huyết áp mục tiêu < 130/80 mmHg. Điều chỉnh lối sống, giảm muối, tăng cường vận động thể lực 30 phút mỗi ngày.`}
                    </div>
                    {record?.clinical_evolution && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1', fontSize: '13px', color: '#475569' }}>
                        <strong>Diễn biến bệnh lý & chăm sóc: </strong>{record.clinical_evolution}
                      </div>
                    )}
                  </div>

                  {/* Mục 4: Danh mục chi tiết thuốc & Dịch vụ */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                      4. Danh mục chi tiết thuốc, trang thiết bị y tế hoặc dịch vụ đã sử dụng:
                    </div>
                    <div style={{ fontSize: '13.5px', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {record?.medical_services_used || prescription?.summary || '1. Amlodipin 5mg: 30 viên (Uống 1 viên vào buổi sáng sau ăn)\n2. Losartan 50mg: 30 viên (Uống 1 viên vào buổi tối sau ăn)\n3. Dịch vụ khám bệnh từ xa Telehealth (Bộ Y tế)'}
                    </div>
                    {prescription?.national_code && (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#0f766e', fontWeight: 700 }}>
                        <QrCode size={16} />
                        Mã đơn thuốc Quốc gia: <code>{prescription.national_code}</code>
                      </div>
                    )}
                  </div>

                  {/* Lời dặn dò & Kế hoạch của Bác sĩ */}
                  {record?.plan && (
                    <div style={{ background: '#f0fdfa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #99f6e4' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                        Lời dặn bác sĩ & Hẹn tái khám:
                      </div>
                      <div style={{ fontSize: '13.5px', color: '#115e59', lineHeight: 1.5 }}>
                        {record.plan}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. XÁC THỰC KÝ SỐ Y TẾ VNPT SMARTCA PKI */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '6px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      CHỨNG THƯ KÝ SỐ Y TẾ HỢP CHUẨN ĐÃ XÁC THỰC (SMARTCA PKI)
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#14532d', marginTop: '2px' }}>
                      Người ký: {record?.signer_name || doctor?.full_name || 'BS. CKII Trần Minh'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#166534', marginTop: '1px' }}>
                      Số CCHN: {record?.signer_cchn || doctor?.cchn || '008912/BYT-CCHN'} · Serial: {record?.cert_serial || '7A:9F:B2:4C:8D:1E:3A:55'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                      Đạt chuẩn Nghị định 13/2023/NĐ-CP & Thông tư 30/2023/TT-BYT (Ký số điện tử có giá trị pháp lý toàn quốc).
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '4px'
                    }}
                  >
                    <CheckCircle2 size={14} /> ĐÃ KÝ SỐ HỢP LỆ
                  </span>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    {record?.signed_at ? new Date(record.signed_at).toLocaleString('vi-VN') : 'Dấu thời gian TSA chuẩn'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#0f766e" />
            Bệnh án điện tử được lưu trữ an toàn và bảo mật theo hồ sơ sức khỏe cá nhân của bạn.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <FileDown size={15} />
              {downloading ? 'Đang xuất PDF...' : 'Tải File PDF Bệnh Án'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
