import React from 'react'
import {
  ShieldCheck,
  User,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Stethoscope,
  Building2,
  CheckCircle2,
  X,
  CreditCard,
  Pill,
  Activity,
  HeartPulse,
  ExternalLink,
  ChevronRight,
  Download
} from 'lucide-react'
import { PatientIdentifyResult, PreviousVisitSummary } from './api'

interface PatientIdentificationModalProps {
  result: PatientIdentifyResult | null
  isOpen: boolean
  onClose: () => void
  onSelectForTriage?: (result: PatientIdentifyResult) => void
}

export const PatientIdentificationModal: React.FC<PatientIdentificationModalProps> = ({
  result,
  isOpen,
  onClose,
  onSelectForTriage
}) => {
  if (!isOpen || !result) return null

  const isExisting = result.patient_type === 'existing_with_history'
  const isHisOnly = result.patient_type === 'his_only'
  const isNew = result.patient_type === 'new'

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card clinical-id-modal"
        style={{ maxWidth: '780px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header-v2" style={{
          background: isExisting
            ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
            : isHisOnly
            ? 'linear-gradient(135deg, #0e7490 0%, #0284c7 100%)'
            : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
          color: '#ffffff',
          padding: '20px 24px',
          borderRadius: '16px 16px 0 0',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '18px',
              top: '18px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: '#ffffff',
              color: isExisting ? '#065f46' : '#0e7490',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 800
            }}>
              VNeID Cấp độ 2
            </span>
          </div>

          <h3 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 800, color: '#ffffff' }}>
            {isExisting && '🟢 Hồ sơ Bệnh nhân Cũ - Đã có Lịch sử Bệnh án EMR'}
            {isHisOnly && '🔵 Hồ sơ Bệnh nhân trên HIS Bệnh viện'}
            {isNew && '⚪ Bệnh nhân Mới - Chưa có Hồ sơ tại Viện'}
          </h3>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
            Xác thực qua Căn cước công dân gắn chip / Ứng dụng VNeID định danh điện tử
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 1. Thẻ tóm tắt nhân thân */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Họ và tên bệnh nhân</span>
                <h4 style={{ margin: '2px 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  {result.full_name || 'Chưa xác định'}
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#475569', flexWrap: 'wrap' }}>
                  <span><b>CCCD:</b> {result.identity_card || 'Chưa có'}</span>
                  <span>•</span>
                  <span><b>Ngày sinh:</b> {result.date_of_birth || '1990-01-01'} ({result.gender || 'Nam'})</span>
                  <span>•</span>
                  <span><b>SĐT:</b> {result.phone_number || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  fontWeight: 800,
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '8px'
                }}>
                  Mã PID: {result.pid || 'TẠO MỚI'}
                </span>
                <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
                  {result.total_visits > 0 ? `Đã khám: ${result.total_visits} lần` : 'Lần đầu tiên'}
                </div>
              </div>
            </div>

            {/* Thông tin BHYT & Nhóm máu */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '14px',
              paddingTop: '14px',
              borderTop: '1px solid #e2e8f0'
            }}>
              <div>
                <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Mã thẻ BHYT (15 ký tự)</small>
                <b style={{ color: '#059669', fontSize: '13px' }}>{result.bhyt_code || 'Chưa đăng ký BHYT'}</b>
              </div>
              <div>
                <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Nhóm máu & Rh</small>
                <b style={{ color: '#0f172a', fontSize: '13px' }}>{result.blood_type || 'O+'}</b>
              </div>
              <div>
                <small style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Địa chỉ thường trú</small>
                <span style={{ color: '#334155', fontSize: '12px' }}>{result.address || 'TP. Hồ Chí Minh'}</span>
              </div>
            </div>
          </div>

          {/* 2. Cảnh báo lâm sàng (Dị ứng thuốc & Bệnh mạn tính) */}
          {(result.allergies || (result.chronic_conditions && result.chronic_conditions.length > 0)) && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 700, fontSize: '14px' }}>
                <AlertTriangle size={18} /> CẢNH BÁO TIỀN SỬ DỊ ỨNG & BỆNH LÝ MẠN TÍNH
              </div>
              <div style={{ fontSize: '13px', color: '#92400e' }}>
                <b>Tiền sử dị ứng thuốc:</b> {result.allergies || 'Không ghi nhận dị ứng'}
              </div>
              {result.chronic_conditions && result.chronic_conditions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  <b style={{ fontSize: '12px', color: '#92400e', alignSelf: 'center' }}>Bệnh mạn tính:</b>
                  {result.chronic_conditions.map((c, idx) => (
                    <span key={idx} style={{
                      background: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      {c.code} - {c.display}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Lần khám gần nhất (Spotlight Card) */}
          {result.last_visit && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <b style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stethoscope size={16} /> LẦN KHÁM GẦN NHẤT
                </b>
                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
                  {new Date(result.last_visit.date).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#14532d', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><b>Bác sĩ khám:</b> {result.last_visit.doctor_name} ({result.last_visit.department_name})</div>
                <div><b>Chẩn đoán xác định (ICD-10):</b> {result.last_visit.diagnosis_icd10 ? `${result.last_visit.diagnosis_icd10} - ` : ''}{result.last_visit.diagnosis_text || 'Khám tổng quát'}</div>
              </div>
            </div>
          )}

          {/* 4. Danh sách toàn bộ lịch sử các lần khám trước (EMR Timeline) */}
          <div>
            <h4 style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <FileText size={16} color="#0284c7" /> LỊCH SỬ KHÁM BỆNH & BỆNH ÁN ĐIỆN TỬ ({result.visit_history.length})
            </h4>

            {result.visit_history.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '10px',
                color: '#64748b',
                fontSize: '13px'
              }}>
                Chưa có dữ liệu lượt khám trước đây trên hệ thống.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {result.visit_history.map((v) => (
                  <div
                    key={v.appointment_id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <b style={{ fontSize: '14px', color: '#0f172a' }}>Lượt khám #{v.appointment_id} - {v.department_name}</b>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: v.status === 'completed' ? '#dcfce7' : '#e0f2fe',
                          color: v.status === 'completed' ? '#15803d' : '#0369a1'
                        }}>
                          {v.status === 'completed' ? '✓ Đã hoàn tất' : v.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span><Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> {new Date(v.date).toLocaleString('vi-VN')}</span>
                        <span>•</span>
                        <span>👨‍⚕️ {v.doctor_name}</span>
                        <span>•</span>
                        <span>Lý do: {v.reason}</span>
                      </div>
                      {v.diagnosis && (
                        <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '4px', fontWeight: 600 }}>
                          Chẩn đoán: {v.icd10_code ? `[${v.icd10_code}] ` : ''}{v.diagnosis}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {v.has_prescription && (
                        <span style={{
                          fontSize: '11px',
                          background: '#f0fdf4',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}>
                          <Pill size={12} style={{ display: 'inline', marginRight: '3px' }} /> Đơn thuốc
                        </span>
                      )}
                      {v.has_pacs && (
                        <span style={{
                          fontSize: '11px',
                          background: '#f5f3ff',
                          color: '#7c3aed',
                          border: '1px solid #ddd6fe',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}>
                          PACS
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div style={{
          padding: '16px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          borderRadius: '0 0 16px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Hệ thống liên thông dữ liệu y tế
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onSelectForTriage && (
              <button
                style={{
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => {
                  onSelectForTriage(result)
                  onClose()
                }}
              >
                <CheckCircle2 size={16} /> Điền vào Bàn tiếp đón Triage
              </button>
            )}
            <button
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
