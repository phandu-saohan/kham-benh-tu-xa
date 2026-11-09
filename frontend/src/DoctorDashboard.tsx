import React, { useState } from 'react'
import {
  Stethoscope,
  CalendarDays,
  Clock,
  User,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Video,
  FileText,
  Search,
  Filter,
  ShieldCheck,
  Building2,
  Users,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Eye,
  Pill,
  ScanLine,
  Flame,
  ArrowUpRight,
  Calendar,
  CreditCard
} from 'lucide-react'
import { Appointment, Department, identifyPatientByCCCD, PatientIdentifyResult } from './api'
import { Pagination } from './Pagination'
import { PatientIdentificationModal } from './PatientIdentificationModal'
import './doctor-sanctuary.css'

interface DoctorDashboardProps {
  doctor: any
  appointments: Appointment[]
  departments: Department[]
  onOpenWorkspace: (appointment: Appointment) => void
  onNavigate: (view: string) => void
  onCallPatient?: (appointment: Appointment) => void
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctor,
  appointments,
  departments,
  onOpenWorkspace,
  onNavigate,
  onCallPatient
}) => {
  const [filterDept, setFilterDept] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(6)

  // Nhận diện Bệnh nhân CCCD / VNeID
  const [selectedIdentifyResult, setSelectedIdentifyResult] = useState<PatientIdentifyResult | null>(null)
  const [showIdentifyModal, setShowIdentifyModal] = useState(false)

  const handleViewPatientEmr = async (appt: Appointment) => {
    try {
      const cccd = (appt as any).identity_card || '079092014829'
      const res = await identifyPatientByCCCD(cccd)
      setSelectedIdentifyResult(res)
      setShowIdentifyModal(true)
    } catch (e) {
      console.error('Lỗi nhận diện CCCD:', e)
    }
  }

  // Current date
  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Filter doctor's appointments
  const myAppointments = appointments.filter(a => {
    // Show appointments assigned to this doctor or department
    return a.doctor_id === doctor.id || doctor.role === 'doctor'
  })

  // Status breakdown
  const inWaitingRoomAppts = myAppointments.filter(a => a.status === 'waiting')
  const waitingAppts = myAppointments.filter(a => ['scheduled', 'confirmed'].includes(a.status))
  const inProgressAppts = myAppointments.filter(a => a.status === 'in_progress')
  const completedAppts = myAppointments.filter(a => a.status === 'completed')

  // Filtered appointments
  const filteredAppointments = myAppointments.filter(a => {
    const apptDept = (a as any).department_name || (a as any).department || (departments.find(d => d.id === a.department_id)?.name) || ''
    const matchDept = filterDept === 'all' || apptDept === filterDept
    const matchStatus = filterStatus === 'all' || a.status === filterStatus
    const patientName = (a as any).patient_name || `Bệnh nhân #${a.patient_id || a.id}`
    const matchSearch =
      searchQuery === '' ||
      patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.reason && a.reason.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.id && a.id.toString().includes(searchQuery))
    return matchDept && matchStatus && matchSearch
  })

  const totalPages = Math.ceil(filteredAppointments.length / pageSize)
  const paginatedAppointments = filteredAppointments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Next patient in line
  const nextPatient = waitingAppts[0] || inProgressAppts[0]

  return (
    <div className="ds-scope">
      <div className="doctor-dashboard-container">
      {/* 1. Clinical Command Center Header */}
      <section className="doctor-hero-banner">
        <div className="doctor-hero-content">
          <div className="doctor-badge-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className="doctor-status-pill online">
              <span className="live-dot" /> ĐANG TRỰC TUYẾN
            </span>
            <span className="doctor-cchn-pill">
              <ShieldCheck size={13} /> CCHN: {doctor.doctor_cchn || '008912/BYT-CCHN'}
            </span>
            <span className="doctor-dept-pill">
              <Building2 size={13} /> Khoa Nội Tổng Quát
            </span>
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', padding: '3px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 600 }}>
              Phòng Telemedicine #07
            </span>
          </div>
          <h1 style={{ margin: '8px 0 6px', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {doctor.full_name || 'BS.CKII Trần Minh'}
          </h1>
          <p className="doctor-hero-sub">
            {todayStr} • Phòng khám trực tuyến Telemedicine & Bệnh án điện tử EMR đạt chuẩn Bộ Y tế.
          </p>

          <div className="doctor-quick-actions" style={{ marginTop: '16px' }}>
            {nextPatient ? (
              <button
                className="btn-start-next"
                onClick={() => onOpenWorkspace(nextPatient)}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 22px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Video size={18} />
                <span>Tiếp nhận bệnh nhân tiếp theo (BN #{nextPatient.id}: {(nextPatient as any).patient_name || `Bệnh nhân #${nextPatient.patient_id || nextPatient.id}`})</span>
                <ArrowUpRight size={17} />
              </button>
            ) : (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.15)',
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '13.5px',
                color: '#ffffff',
                fontWeight: 600,
                backdropFilter: 'blur(8px)'
              }}>
                <CheckCircle2 size={16} color="#6ee7b7" />
                <span>Đã tiếp nhận hết bệnh nhân trong hàng đợi hôm nay</span>
              </div>
            )}
          </div>
        </div>

        <div className="doctor-hero-quota-card">
          <div className="quota-header">
            <span>Ca trực hôm nay</span>
            <span className="quota-tag">Ca sáng 07:30 - 11:30</span>
          </div>
          <div className="quota-progress-wrap">
            <div className="quota-numbers">
              <strong>{completedAppts.length}</strong>
              <small>/ 12 ca tối đa (Chống quá tải)</small>
            </div>
            <div className="quota-bar-track">
              <div
                className="quota-bar-fill"
                style={{ width: `${Math.min(100, (completedAppts.length / 12) * 100)}%` }}
              />
            </div>
          </div>
          <div className="quota-footer">
            <span>Đang chờ: <b>{waitingAppts.length}</b></span>
            <span>Đang khám: <b>{inProgressAppts.length}</b></span>
            <span>Hoàn tất: <b>{completedAppts.length}</b></span>
          </div>
        </div>
      </section>

      {/* 2. Key Clinical Metrics Strip */}
      <section className="doctor-metrics-grid">
        <div
          className={`clinical-metric-card wait ${filterStatus === 'waiting' ? 'active-metric-pill' : ''}`}
          onClick={() => { setFilterStatus(filterStatus === 'waiting' ? 'all' : 'waiting'); setCurrentPage(1); }}
          style={{
            borderLeft: '4px solid #d97706',
            boxShadow: filterStatus === 'waiting' ? '0 0 0 2px #d97706' : undefined,
            cursor: 'pointer'
          }}
        >
          <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-title">Đang ở Phòng Chờ</span>
            <div className="metric-val-row">
              <strong>{inWaitingRoomAppts.length}</strong>
              <span className="badge-micro warning">Đã đo sinh hiệu</span>
            </div>
            <small>Bác sĩ chủ động mời vào</small>
          </div>
        </div>

        <div
          className={`clinical-metric-card wait ${filterStatus === 'scheduled' ? 'active-metric-pill' : ''}`}
          onClick={() => { setFilterStatus(filterStatus === 'scheduled' ? 'all' : 'scheduled'); setCurrentPage(1); }}
          style={{
            boxShadow: filterStatus === 'scheduled' ? '0 0 0 2px #0284c7' : undefined,
            cursor: 'pointer'
          }}
        >
          <div className="metric-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <Clock size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-title">Bệnh nhân chờ khám</span>
            <div className="metric-val-row">
              <strong>{waitingAppts.length}</strong>
              <span className="badge-micro warning">Cần tiếp nhận</span>
            </div>
            <small>Đã sàng lọc sinh hiệu tại bàn Triage</small>
          </div>
        </div>

        <div
          className={`clinical-metric-card active ${filterStatus === 'in_progress' ? 'active-metric-pill' : ''}`}
          onClick={() => { setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress'); setCurrentPage(1); }}
          style={{
            boxShadow: filterStatus === 'in_progress' ? '0 0 0 2px #059669' : undefined,
            cursor: 'pointer'
          }}
        >
          <div className="metric-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
            <Video size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-title">Đang khám trực tuyến</span>
            <div className="metric-val-row">
              <strong>{inProgressAppts.length}</strong>
              <span className="badge-micro live">Buồng gọi mở</span>
            </div>
            <small>WebRTC & Audio HD hai chiều</small>
          </div>
        </div>

        <div
          className={`clinical-metric-card complete ${filterStatus === 'completed' ? 'active-metric-pill' : ''}`}
          onClick={() => { setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed'); setCurrentPage(1); }}
          style={{
            boxShadow: filterStatus === 'completed' ? '0 0 0 2px #2563eb' : undefined,
            cursor: 'pointer'
          }}
        >
          <div className="metric-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-title">Đã hoàn tất & Ký số</span>
            <div className="metric-val-row">
              <strong>{completedAppts.length}</strong>
              <span className="badge-micro info">SmartCA OK</span>
            </div>
            <small>Đã đẩy donthuocquocgia.vn</small>
          </div>
        </div>

        <div className="clinical-metric-card rpm" onClick={() => onNavigate('records')} style={{ cursor: 'pointer' }}>
          <div className="metric-icon-box" style={{ background: '#fdf2f8', color: '#db2777' }}>
            <Activity size={22} />
          </div>
          <div className="metric-data">
            <span className="metric-title">Hồ sơ bệnh án EMR</span>
            <div className="metric-val-row">
              <strong>{appointments.length}</strong>
              <span className="badge-micro purple">NĐ 13/2023</span>
            </div>
            <small>Mã hóa AES-256 an toàn</small>
          </div>
        </div>
      </section>

      {/* 3. Main Live Patient Queue Panel */}
      <section className="panel doctor-queue-panel">
        <div className="panel-heading">
          <div>
            <h3>Hàng Đợi Khám & Điều Phối Bệnh Nhân Hôm Nay</h3>
            <p>Chọn bệnh nhân để mở Phòng khám đa năng, kê đơn BHYT, đọc phim PACS và ký số</p>
          </div>
          <div className="queue-filter-controls">
            <div className="search-input-wrap">
              <Search size={14} />
              <input
                type="text"
                placeholder="Tìm tên BN, mã lịch, triệu chứng..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="select-status"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="waiting">⏳ Đang ở phòng chờ (Đã đo sinh hiệu)</option>
              <option value="scheduled">Chờ khám (Scheduled)</option>
              <option value="confirmed">Đã tiếp nhận (Confirmed)</option>
              <option value="in_progress">Đang khám (In Progress)</option>
              <option value="completed">Đã hoàn thành</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Tabs bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto',
          alignItems: 'center'
        }}>
          {[
            { key: 'all', label: 'Tất cả ca khám', count: myAppointments.length, color: '#0f766e' },
            { key: 'waiting', label: '⏳ Đang ở phòng chờ', count: inWaitingRoomAppts.length, color: '#d97706' },
            { key: 'scheduled', label: 'Chờ tiếp nhận', count: waitingAppts.length, color: '#0284c7' },
            { key: 'in_progress', label: 'Đang khám', count: inProgressAppts.length, color: '#16a34a' },
            { key: 'completed', label: 'Đã hoàn thành', count: completedAppts.length, color: '#475569' }
          ].map(tab => {
            const isSelected = filterStatus === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setFilterStatus(tab.key); setCurrentPage(1); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: isSelected ? 700 : 600,
                  border: isSelected ? `1.5px solid ${tab.color}` : '1px solid #cbd5e1',
                  background: isSelected ? tab.color : '#ffffff',
                  color: isSelected ? '#ffffff' : '#334155',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: isSelected ? `0 2px 6px ${tab.color}33` : 'none'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {paginatedAppointments.length === 0 ? (
          <div className="empty-queue-box">
            <CalendarDays size={44} color="#94a3b8" />
            <b>Không có lượt khám nào phù hợp bộ lọc</b>
            <p>Khi bệnh nhân đăng ký hoặc được chuyển từ Bàn Triage, danh sách sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="doctor-queue-table-wrap">
            <table className="doctor-queue-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>STT</th>
                  <th>Bệnh nhân / Mã PID</th>
                  <th>Giờ khám & Chuyên khoa</th>
                  <th>Phân loại Triage</th>
                  <th>Bảo hiểm Y tế</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác lâm sàng</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAppointments.map((appt, idx) => {
                  const stt = (currentPage - 1) * pageSize + idx + 1
                  const isUrgent = appt.reason?.toLowerCase().includes('đau ngực') || appt.reason?.toLowerCase().includes('khó thở')
                  return (
                    <tr key={appt.id} className={appt.status === 'in_progress' ? 'row-in-progress' : ''}>
                      <td>
                        <span className="queue-stt-chip">{stt}</span>
                      </td>
                      <td>
                        <div className="patient-name-block">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <b>{(appt as any).patient_name || `Bệnh nhân #${appt.patient_id || appt.id}`}</b>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              background: '#fef2f2',
                              color: '#b91c1c',
                              border: '1px solid #fecaca',
                              padding: '1px 5px',
                              borderRadius: '10px'
                            }}>
                              VNeID
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' }}>
                            <span>PID: CC-PAT-{(appt.patient_id || appt.id).toString().padStart(4, '0')}</span>
                            <span>•</span>
                            <span style={{ color: '#047857', fontWeight: 600 }}>🟢 Bệnh nhân cũ</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="appointment-time-block">
                          <span><Clock size={13} /> {appt.starts_at ? new Date(appt.starts_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '08:30'}</span>
                          <small>{(appt as any).department_name || (appt as any).department || (departments.find(d => d.id === appt.department_id)?.name) || 'Nội tổng quát'}</small>
                        </div>
                      </td>
                      <td>
                        {isUrgent ? (
                          <span className="triage-level-badge emergency">
                            <Flame size={12} /> Cấp cứu (Đỏ)
                          </span>
                        ) : (
                          <span className="triage-level-badge standard">
                            <Activity size={12} /> Tiêu chuẩn (Xanh)
                          </span>
                        )}
                        <div className="queue-symptom-text" title={appt.reason}>
                          {appt.reason || 'Khám tổng quát định kỳ'}
                        </div>
                        {(appt.blood_pressure || appt.pulse) && (
                          <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>✓ HA: {appt.blood_pressure || '-'}</span>
                            <span>• Mạch: {appt.pulse || '-'} l/p</span>
                            {appt.spo2 ? <span>• SpO2: {appt.spo2}%</span> : null}
                          </div>
                        )}
                      </td>
                      <td>
                        {appt.bhyt_code ? (
                          <span className="bhyt-verified-pill" title={`Thẻ: ${appt.bhyt_code}`}>
                            <ShieldCheck size={12} /> 80% KCB
                          </span>
                        ) : (
                          <span className="bhyt-none-pill">Viện phí (Thu phí)</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-pill ${appt.status}`}>
                          {appt.status === 'waiting' && '⏳ Đang ở phòng chờ'}
                          {appt.status === 'scheduled' && 'Chờ tiếp nhận'}
                          {appt.status === 'confirmed' && 'Đã sẵn sàng'}
                          {appt.status === 'in_progress' && 'Đang hội chẩn'}
                          {appt.status === 'completed' && 'Đã ký số'}
                          {appt.status === 'cancelled' && 'Đã hủy'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="queue-actions-group" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          {appt.status === 'waiting' ? (
                            <button
                              className="btn-open-workspace"
                              onClick={() => {
                                if (onCallPatient) onCallPatient(appt);
                                onOpenWorkspace(appt);
                              }}
                              title="Mời bệnh nhân từ phòng chờ vào buồng khám"
                              style={{
                                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
                              }}
                            >
                              <Video size={14} /> Mời vào khám
                            </button>
                          ) : appt.status === 'in_progress' ? (
                            <button
                              className="btn-open-workspace"
                              onClick={() => onOpenWorkspace(appt)}
                              title="Vào buồng khám trực tuyến đang diễn ra"
                              style={{
                                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                              }}
                            >
                              <Video size={14} /> Vào khám
                            </button>
                          ) : appt.status !== 'completed' ? (
                            <button
                              className="btn-open-workspace"
                              onClick={() => onOpenWorkspace(appt)}
                              title="Mở Bàn làm việc Bác sĩ"
                              style={{
                                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                fontWeight: 700,
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)'
                              }}
                            >
                              <Stethoscope size={14} /> Mở phòng khám
                            </button>
                          ) : (
                            <button
                              className="btn-view-record"
                              onClick={() => onOpenWorkspace(appt)}
                              title="Xem lại hồ sơ bệnh án đã ký số"
                              style={{
                                background: '#f8fafc',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                padding: '6px 12px',
                                borderRadius: '7px',
                                fontWeight: 600,
                                fontSize: '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                cursor: 'pointer'
                              }}
                            >
                              <FileText size={14} /> Xem bệnh án
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-view-emr-cccd"
                            onClick={() => handleViewPatientEmr(appt)}
                            title="Tra cứu toàn bộ tiền sử bệnh án qua CCCD/VNeID"
                            style={{
                              background: '#f0fdf4',
                              color: '#059669',
                              border: '1px solid #bbf7d0',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <CreditCard size={13} /> Hồ sơ CCCD
                          </button>
                          {onCallPatient && appt.status !== 'completed' && (
                            <button
                              className="btn-call-direct"
                              onClick={() => onCallPatient(appt)}
                              title="Rung chuông điện thoại bệnh nhân"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#0f766e',
                                padding: '6px 8px',
                                borderRadius: '7px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}
                            >
                              <Video size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredAppointments.length > 0 && (
          <div className="queue-pagination-footer">
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={filteredAppointments.length}
            />
          </div>
        )}
      </section>

      {/* 4. Clinical Ecosystem Shortcuts */}
      <section className="doctor-shortcuts-grid">
        <div className="clinical-shortcut-card" onClick={() => onNavigate('pacs')}>
          <div className="shortcut-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
            <ScanLine size={24} />
          </div>
          <div>
            <h4>AI PACS Chẩn Đoán Hình Ảnh</h4>
            <p>Phân tích phim X-quang/CT phổi, bản đồ nhiệt Grad-CAM hỗ trợ phát hiện tổn thương</p>
          </div>
          <ChevronRight size={18} className="shortcut-arrow" />
        </div>

        <div className="clinical-shortcut-card" onClick={() => onNavigate('insurance')}>
          <div className="shortcut-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4>Cổng Giám Định BHYT XML 4210</h4>
            <p>Trích xuất 5 bảng XML (XML 1 - 5), kiểm tra mức hưởng và quyết toán viện phí từ xa</p>
          </div>
          <ChevronRight size={18} className="shortcut-arrow" />
        </div>

        <div className="clinical-shortcut-card" onClick={() => onNavigate('triage')}>
          <div className="shortcut-icon" style={{ background: '#f0fdfa', color: '#0f766e' }}>
            <Activity size={24} />
          </div>
          <div>
            <h4>Bàn Sàng Lọc Sinh Hiệu Triage</h4>
            <p>Xem danh sách bệnh nhân đã được điều dưỡng đo SpO2, huyết áp và phân tầng cấp cứu</p>
          </div>
          <ChevronRight size={18} className="shortcut-arrow" />
        </div>

        <div className="clinical-shortcut-card" onClick={() => onNavigate('records')}>
          <div className="shortcut-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FileText size={24} />
          </div>
          <div>
            <h4>Bệnh Án Điện Tử & Ký Số SmartCA</h4>
            <p>Tra cứu tiền sử bệnh nhân toàn viện, ký số PKI VNPT SmartCA đạt chuẩn Thông tư 30/2023</p>
          </div>
          <ChevronRight size={18} className="shortcut-arrow" />
        </div>
      </section>

      {/* Modal tra cứu Hồ sơ Bệnh án EMR định danh CCCD/VNeID */}
      <PatientIdentificationModal
        result={selectedIdentifyResult}
        isOpen={showIdentifyModal}
        onClose={() => setShowIdentifyModal(false)}
      />
    </div>
  </div>
)
}
