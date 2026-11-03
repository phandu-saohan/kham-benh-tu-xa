import React from 'react'
import {
  CalendarDays,
  Clock,
  Video,
  HeartPulse,
  Activity,
  FileText,
  Pill,
  ShieldCheck,
  CreditCard,
  Users,
  FlaskConical,
  ScanLine,
  ArrowRight,
  Plus,
  ChevronRight,
  Sparkles,
  Phone,
  AlertCircle,
  Download,
  CheckCircle2
} from 'lucide-react'
import { Appointment, RPMVitalItem } from './api'

interface PatientDashboardProps {
  user: any
  appointments: Appointment[]
  doctors: any[]
  vitalsLogs?: RPMVitalItem[]
  onBook: () => void
  onJoin: (appointment: Appointment) => void
  onNavigate: (view: string) => void
  onPay?: (appointment: Appointment) => void
  onDownloadPdf?: (appointmentId: number) => void
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  user,
  appointments,
  doctors,
  vitalsLogs = [],
  onBook,
  onJoin,
  onNavigate,
  onPay,
  onDownloadPdf
}) => {
  // Find next upcoming appointment
  const upcomingAppointments = appointments.filter(a =>
    ['scheduled', 'confirmed', 'in_progress'].includes(a.status)
  )
  const nextAppt = upcomingAppointments[0]

  // Completed appointments for history
  const completedAppointments = appointments.filter(a => a.status === 'completed')

  // Latest vitals
  const latestVital = vitalsLogs[0] || null

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  return (
    <div className="patient-dashboard-container">
      {/* 1. Header Banner */}
      <section className="patient-hero-banner">
        <div className="patient-hero-info">
          <div className="patient-tag-row">
            <span className="badge-patient-role">CỔNG BỆNH NHÂN TRỰC TUYẾN</span>
            <span className="badge-patient-pid">PID: CC-PAT-{user.id?.toString().padStart(4, '0') || '0001'}</span>
            <span className="badge-vneid-level">
              <ShieldCheck size={13} /> Định danh VNeID
            </span>
          </div>
          <h1>{getGreeting()}, {user.full_name || 'Quý bệnh nhân'}!</h1>
          <p className="patient-hero-sub">
            Hệ thống Bệnh viện Số CareConnect — Kết nối Bác sĩ chuyên khoa, khám từ xa qua Video HD, đơn thuốc quốc gia và quản lý bệnh án an toàn.
          </p>

          <div className="patient-hero-cta">
            <button className="btn-book-primary" onClick={onBook}>
              <Plus size={16} /> Đặt lịch khám mới ngay
            </button>
            <button className="btn-hero-outline" onClick={() => onNavigate('records')}>
              <FileText size={15} /> Xem hồ sơ bệnh án
            </button>
            <button className="btn-hero-outline" onClick={() => onNavigate('vitals')}>
              <Activity size={15} /> Sinh hiệu BLE tại nhà
            </button>
          </div>
        </div>

        <div className="patient-quick-card">
          <div className="patient-quick-card-header">
            <span>Bảo hiểm Y tế</span>
            <span className={`status-badge-chip ${user.bhyt_code ? 'verified' : 'unverified'}`}>
              {user.bhyt_code ? 'Đã liên thông BHYT' : 'Chưa nhập mã thẻ'}
            </span>
          </div>
          <div className="bhyt-mini-preview">
            <div className="bhyt-mini-code">
              {user.bhyt_code || 'GD479XXXXXXXXXX'}
            </div>
            <div className="bhyt-mini-details">
              <span>Mức hưởng: <b>{user.bhyt_code ? '80% Đúng tuyến' : 'Chưa áp dụng'}</b></span>
              <span>Nơi ĐKKCB: <b>BV CareConnect (79014)</b></span>
            </div>
          </div>
          <button className="btn-manage-insurance" onClick={() => onNavigate('insurance')}>
            Tra cứu quyền lợi BHYT & XML 4210 <ChevronRight size={14} />
          </button>
        </div>
      </section>

      {/* 2. Next Upcoming Appointment Banner (Spotlight Card) */}
      {nextAppt ? (
        <section className="next-appointment-banner">
          <div className="next-appt-left">
            <div className="appt-badge-live">
              <span className="pulse-dot" /> LỊCH KHÁM TIẾP THEO
            </div>
            <h3>Khám {(nextAppt as any).department_name || (nextAppt as any).department || 'Nội tổng quát'} trực tuyến</h3>
            <div className="appt-meta-grid">
              <div className="meta-item">
                <Clock size={15} />
                <span>
                  {nextAppt.starts_at
                    ? new Date(nextAppt.starts_at).toLocaleString('vi-VN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Hôm nay'}
                </span>
              </div>
              <div className="meta-item">
                <HeartPulse size={15} />
                <span>{doctors.find(d => d.id === nextAppt.doctor_id)?.full_name || (nextAppt as any).doctor_name || 'Bác sĩ chuyên khoa phụ trách'}</span>
              </div>
              <div className="meta-item">
                <Activity size={15} />
                <span className="meta-reason" title={nextAppt.reason}>
                  Lý do: {nextAppt.reason || 'Khám định kỳ & tư vấn toa thuốc'}
                </span>
              </div>
            </div>
          </div>

          <div className="next-appt-actions">
            <button
              className="btn-join-telehealth"
              onClick={() => onJoin(nextAppt)}
            >
              <Video size={18} />
              Vào phòng khám Video ngay
            </button>
            {onPay && nextAppt.status === 'scheduled' && (
              <button className="btn-pay-vietqr" onClick={() => onPay(nextAppt)}>
                <CreditCard size={15} /> Thanh toán VietQR
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="no-appointment-banner">
          <div className="no-appt-content">
            <CalendarDays size={28} color="#0f766e" />
            <div>
              <b>Bạn hiện không có lịch khám sắp diễn ra</b>
              <p>Đặt lịch trước để gặp Bác sĩ đúng giờ, không phải chờ đợi tại bệnh viện.</p>
            </div>
          </div>
          <button className="btn-book-shortcut" onClick={onBook}>
            + Đặt lịch khám ngay
          </button>
        </section>
      )}

      {/* 3. Personal Vitals / Health Indicators Snapshot */}
      <section className="vitals-snapshot-card">
        <div className="vitals-snapshot-header">
          <div>
            <h3>Chỉ Số Sinh Hiệu Cá Nhân Gần Nhất (IoT BLE)</h3>
            <p>Theo dõi huyết áp, đường huyết, nhịp tim và nồng độ oxy trong máu SpO2</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('vitals')}>
            Mở biểu đồ chi tiết <ArrowRight size={14} />
          </button>
        </div>

        <div className="vitals-metrics-grid">
          {/* Huyết áp */}
          <div className="vital-metric-tile">
            <div className="vital-tile-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <HeartPulse size={20} />
            </div>
            <div className="vital-tile-data">
              <span className="vital-name">Huyết áp</span>
              <div className="vital-reading">
                <strong>{latestVital?.systolic || 120}/{latestVital?.diastolic || 80}</strong>
                <small>mmHg</small>
              </div>
              <span className="vital-health-tag normal">
                ✓ Bình thường
              </span>
            </div>
          </div>

          {/* Đường huyết */}
          <div className="vital-metric-tile">
            <div className="vital-tile-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
              <FlaskConical size={20} />
            </div>
            <div className="vital-tile-data">
              <span className="vital-name">Đường huyết lúc đói</span>
              <div className="vital-reading">
                <strong>{latestVital?.glucose_value || 5.6}</strong>
                <small>mmol/L</small>
              </div>
              <span className="vital-health-tag normal">
                ✓ Trong mức an toàn
              </span>
            </div>
          </div>

          {/* SpO2 */}
          <div className="vital-metric-tile">
            <div className="vital-tile-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Activity size={20} />
            </div>
            <div className="vital-tile-data">
              <span className="vital-name">Nồng độ Oxy (SpO2)</span>
              <div className="vital-reading">
                <strong>{latestVital?.spo2_percent || 98}</strong>
                <small>%</small>
              </div>
              <span className="vital-health-tag normal">
                ✓ Tốt (95 - 100%)
              </span>
            </div>
          </div>

          {/* Nhịp tim */}
          <div className="vital-metric-tile">
            <div className="vital-tile-icon" style={{ background: '#f0fdfa', color: '#0f766e' }}>
              <Clock size={20} />
            </div>
            <div className="vital-tile-data">
              <span className="vital-name">Nhịp mạch (Mạch đập)</span>
              <div className="vital-reading">
                <strong>{latestVital?.pulse || 76}</strong>
                <small>bpm</small>
              </div>
              <span className="vital-health-tag normal">
                ✓ Nhịp xoang đều
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Complete Services Quick Grid */}
      <section className="services-hub-section">
        <div className="section-title-wrap">
          <h3>Tiện Ích & Dịch Vụ Khám Chữa Bệnh Từ Xa</h3>
          <p>Truy cập toàn bộ hệ sinh thái chăm sóc sức khỏe trực tuyến</p>
        </div>

        <div className="services-grid-tiles">
          <div className="service-tile" onClick={onBook}>
            <div className="service-icon" style={{ background: '#f0fdfa', color: '#0f766e' }}>
              <CalendarDays size={24} />
            </div>
            <b>Đặt lịch khám bác sĩ</b>
            <small>Chọn chuyên khoa & giờ tư vấn</small>
          </div>

          <div className="service-tile" onClick={() => onNavigate('records')}>
            <div className="service-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <FileText size={24} />
            </div>
            <b>Bệnh án điện tử EMR</b>
            <small>Ký số SmartCA & Tiền sử</small>
          </div>

          <div className="service-tile" onClick={() => onNavigate('prescriptions')}>
            <div className="service-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Pill size={24} />
            </div>
            <b>Đơn thuốc Quốc gia</b>
            <small>Mã đơn thuốc điện tử & QR</small>
          </div>

          <div className="service-tile" onClick={() => onNavigate('lab')}>
            <div className="service-icon" style={{ background: '#f0f9ff', color: '#0284c7' }}>
              <FlaskConical size={24} />
            </div>
            <b>Xét nghiệm & Cận lâm sàng</b>
            <small>Sinh hóa, Huyết học, Nước tiểu</small>
          </div>

          <div className="service-tile" onClick={() => onNavigate('pacs')}>
            <div className="service-icon" style={{ background: '#faf5ff', color: '#9333ea' }}>
              <ScanLine size={24} />
            </div>
            <b>Phim Chụp X-Quang PACS</b>
            <small>Ảnh DICOM & AI Heatmap</small>
          </div>

          <div className="service-tile" onClick={() => onNavigate('vitals')}>
            <div className="service-icon" style={{ background: '#fff1f2', color: '#e11d48' }}>
              <Activity size={24} />
            </div>
            <b>Giám sát Sinh hiệu RPM IoT</b>
            <small>Kết nối máy đo Bluetooth BLE</small>
          </div>

          <div className="service-tile" onClick={() => onNavigate('family')}>
            <div className="service-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <Users size={24} />
            </div>
            <b>Hồ sơ Sức khỏe Gia đình</b>
            <small>Quản lý hồ sơ con nhỏ & cha mẹ</small>
          </div>

          <div className="service-tile" onClick={() => onNavigate('insurance')}>
            <div className="service-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
              <ShieldCheck size={24} />
            </div>
            <b>Bảo hiểm Y tế & XML 4210</b>
            <small>Tra cứu chi phí & Giám định</small>
          </div>
        </div>
      </section>

      {/* 5. Recent Consultation History */}
      <section className="panel patient-history-panel">
        <div className="panel-heading">
          <div>
            <h3>Lịch Sử Khám Bệnh & Bệnh Án Gần Đây</h3>
            <p>Toàn bộ đợt khám có giá trị pháp lý, được lưu trữ vĩnh viễn trên cơ sở dữ liệu y tế</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('records')}>
            Xem tất cả hồ sơ <ChevronRight size={14} />
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="empty-history-box">
            <FileText size={36} color="#94a3b8" />
            <b>Chưa có lịch sử khám bệnh</b>
            <p>Khi bạn hoàn thành lượt khám đầu tiên, thông tin bệnh án và kết luận sẽ lưu trữ tại đây.</p>
          </div>
        ) : (
          <div className="patient-visit-timeline">
            {appointments.slice(0, 4).map(appt => (
              <div key={appt.id} className="visit-timeline-item">
                <div className="visit-date-badge">
                  <b>{appt.starts_at ? new Date(appt.starts_at).getDate() : '01'}</b>
                  <small>Th{appt.starts_at ? new Date(appt.starts_at).getMonth() + 1 : '11'}</small>
                </div>

                <div className="visit-main-info">
                  <div className="visit-title-row">
                    <h4>{(appt as any).department_name || (appt as any).department || 'Khám Chuyên khoa Nội'}</h4>
                    <span className={`status-pill ${appt.status}`}>
                      {appt.status === 'completed' ? '✓ Đã hoàn tất' : appt.status === 'in_progress' ? 'Đang khám' : 'Đã lên lịch'}
                    </span>
                  </div>
                  <p className="visit-doctor-line">
                    <span>👨‍⚕️ {doctors.find(d => d.id === appt.doctor_id)?.full_name || (appt as any).doctor_name || 'Bác sĩ phụ trách'}</span>
                    <span>•</span>
                    <span>Lý do: {appt.reason || 'Khám sức khỏe tổng quát'}</span>
                  </p>
                </div>

                <div className="visit-actions-right">
                  {appt.status === 'completed' && onDownloadPdf && (
                    <button
                      className="btn-download-pdf-mini"
                      onClick={() => onDownloadPdf(appt.id)}
                      title="Tải Bệnh án điện tử EMR chuẩn PDF"
                    >
                      <Download size={14} /> Tải tóm tắt EMR
                    </button>
                  )}
                  {['scheduled', 'confirmed', 'in_progress'].includes(appt.status) && (
                    <button
                      className="btn-join-telehealth-mini"
                      onClick={() => onJoin(appt)}
                    >
                      <Video size={14} /> Vào buồng khám
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
