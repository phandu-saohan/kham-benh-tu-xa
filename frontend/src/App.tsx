import { useEffect, useState } from 'react'
import {
  CalendarDays, Video, FileText, FlaskConical, Pill, CreditCard,
  LogOut, HeartPulse, Clock, UserRound, ShieldCheck, ArrowRight,
  Plus, X, Phone, Lock, Stethoscope, AlertCircle, RefreshCw, QrCode,
  FileDown, ExternalLink, PenTool
} from 'lucide-react'
import {
  login, sendOtp, verifyOtp, request, cancelAppointment,
  getConsentStatus, downloadMedicalRecordPdf, getPacsDicomStudies,
  type Appointment, type User
} from './api'
import { VideoRoom } from './VideoRoom'
import { DoctorWorkspace } from './DoctorWorkspace'
import { VietQRModal } from './VietQRModal'
import { ConsentModal } from './ConsentModal'

const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

const dateText = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  
  // Auth state
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp')
  const [phone, setPhone] = useState('0912345678')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpDevHint, setOtpDevHint] = useState('')
  const [patientFullName, setPatientFullName] = useState('')

  const [email, setEmail] = useState('doctor@example.test')
  const [password, setPassword] = useState('ChangeMe123!')

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<{ id: number; full_name: string }[]>([])
  const [error, setError] = useState('')
  const [view, setView] = useState('overview')
  
  // Modal states
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [qrAppointment, setQrAppointment] = useState<Appointment | null>(null)
  const [pendingConsentAppointment, setPendingConsentAppointment] = useState<Appointment | null>(null)

  const [showBooking, setShowBooking] = useState(false)
  const [doctorId, setDoctorId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [reason, setReason] = useState('Tư vấn sức khỏe định kỳ')
  const [hisSummary, setHisSummary] = useState<any>(null)
  const [imaging, setImaging] = useState<any>(null)
  const [toast, setToast] = useState('')

  async function loadDashboard(current: User) {
    try {
      const list = await request<Appointment[]>('/api/v1/appointments')
      setAppointments(list)
      if (current.role === 'patient') {
        const [his, pacsData] = await Promise.all([
          request<any>('/api/v1/patients/me/his-summary').catch(() => null),
          getPacsDicomStudies().catch(() => null)
        ])
        setHisSummary(his)
        setImaging(pacsData)
        setDoctors(await request('/api/v1/doctors'))
      } else if (current.role === 'doctor') {
        const pacsData = await getPacsDicomStudies().catch(() => null)
        setImaging(pacsData)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu')
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('tm_token')
    if (saved) {
      request<User>('/api/v1/auth/me')
        .then(u => {
          setUser(u)
          return loadDashboard(u)
        })
        .catch(() => {
          localStorage.removeItem('tm_token')
          localStorage.removeItem('tm_refresh_token')
        })
    }
  }, [])

  // Đăng nhập bằng Email + Mật khẩu
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const u = await login(email, password)
      setUser(u)
      await loadDashboard(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại')
    }
  }

  // Gửi mã OTP
  async function handleSendOtp() {
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại')
      return
    }
    setError('')
    try {
      const res = await sendOtp(phone)
      setOtpSent(true)
      if (res.dev_code) {
        setOtpDevHint(res.dev_code)
        setOtpCode(res.dev_code)
      }
      setToast(res.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không gửi được OTP')
    }
  }

  // Xác thực mã OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const u = await verifyOtp(phone, otpCode, patientFullName)
      setUser(u)
      await loadDashboard(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xác thực OTP không thành công')
    }
  }

  function logout() {
    localStorage.removeItem('tm_token')
    localStorage.removeItem('tm_refresh_token')
    setUser(null)
    setAppointments([])
    setView('overview')
    setActiveAppointment(null)
    setQrAppointment(null)
    setPendingConsentAppointment(null)
  }

  // Đặt lịch khám mới
  async function book(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await request<Appointment>('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: Number(doctorId),
          starts_at: new Date(startsAt).toISOString(),
          reason
        })
      })
      setShowBooking(false)
      setToast('Lịch hẹn đã được khởi tạo! Mời bạn quét mã VietQR để thanh toán xác nhận.')
      if (user) await loadDashboard(user)
      setQrAppointment(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đặt được lịch')
    }
  }

  // Xử lý vào phòng khám (Bệnh nhân cần ký đồng thuận NĐ 13 nếu chưa ký)
  async function handleJoinConsultation(a: Appointment) {
    if (user?.role === 'doctor') {
      setActiveAppointment(a)
      return
    }

    // Bệnh nhân: Kiểm tra trạng thái đồng thuận
    try {
      const res = await getConsentStatus(a.id)
      if (res.consented) {
        setActiveAppointment(a)
      } else {
        setPendingConsentAppointment(a)
      }
    } catch {
      setActiveAppointment(a)
    }
  }

  // Hủy lịch hẹn
  async function handleCancelAppointment(a: Appointment) {
    if (!confirm(`Bạn có chắc chắn muốn hủy lịch hẹn #${a.id}?`)) return
    try {
      await cancelAppointment(a.id)
      setToast(`Đã hủy lịch hẹn #${a.id}. ${a.status === 'confirmed' ? 'Hệ thống đã kích hoạt hoàn tiền tự động.' : ''}`)
      if (user) await loadDashboard(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể hủy lịch')
    }
  }

  // Tải file PDF
  async function handleDownloadPdf(appointmentId: number) {
    try {
      await downloadMedicalRecordPdf(appointmentId)
      setToast('Đang tải xuống file PDF Phiếu khám & Đơn thuốc...')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải PDF')
    }
  }

  // 1. Màn hình Đăng nhập
  if (!user) {
    return (
      <main className="login-page">
        <div className="login-card">
          <div className="brand-mark">
            <HeartPulse size={28} />
          </div>
          <p className="eyebrow">CỔNG Y TẾ TRỰC TUYẾN CARECONNECT</p>
          <h1>Chăm sóc sức khỏe,<br />chuẩn hóa & tin cậy.</h1>
          <p className="muted">
            Khám từ xa chuẩn Thông tư 30/2023 · Ký số SmartCA · Đơn thuốc Quốc gia · VietQR.
          </p>

          <div className="auth-tab-switch">
            <button
              type="button"
              className={`auth-tab ${authMode === 'otp' ? 'active' : ''}`}
              onClick={() => { setAuthMode('otp'); setError(''); }}
            >
              <Phone size={15} /> Số điện thoại (OTP)
            </button>
            <button
              type="button"
              className={`auth-tab ${authMode === 'password' ? 'active' : ''}`}
              onClick={() => { setAuthMode('password'); setError(''); }}
            >
              <Lock size={15} /> Bác sĩ / Quản trị
            </button>
          </div>

          {authMode === 'otp' ? (
            <form onSubmit={handleVerifyOtp} className="login-form">
              <label>
                Số điện thoại
                <div className="phone-input-wrap">
                  <input
                    type="tel"
                    placeholder="Ví dụ: 0912345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn-send-otp"
                    onClick={handleSendOtp}
                  >
                    {otpSent ? 'Gửi lại mã' : 'Lấy mã OTP'}
                  </button>
                </div>
              </label>

              {otpSent && (
                <>
                  <label>
                    Mã xác thực OTP (6 chữ số)
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Nhập 6 số OTP"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      required
                    />
                  </label>
                  {otpDevHint && (
                    <div className="otp-hint-badge">
                      Mã OTP thử nghiệm nhanh: <b>{otpDevHint}</b>
                    </div>
                  )}
                  <button className="primary full" type="submit">
                    Xác nhận & Đăng nhập <ArrowRight size={17} />
                  </button>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handlePasswordLogin} className="login-form">
              <label>
                Email y tế
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </label>
              <button className="primary full" type="submit">
                Đăng nhập tài khoản y tế <ArrowRight size={17} />
              </button>
            </form>
          )}

          {error && <p className="error">{error}</p>}
          <div className="demo-hint">
            Bác sĩ mẫu: <code>doctor@example.test</code> (Mật khẩu: <code>ChangeMe123!</code>)<br />
            Bệnh nhân: Nhập SĐT bất kỳ hoặc <code>0912345678</code> và bấm "Lấy mã OTP".
          </div>
        </div>
      </main>
    )
  }

  // 2. Màn hình Buồng khám Bác sĩ (Split-view Doctor Workspace)
  if (activeAppointment && user.role === 'doctor') {
    return (
      <DoctorWorkspace
        appointment={activeAppointment}
        user={user}
        onBack={() => setActiveAppointment(null)}
        onCompleted={() => {
          setActiveAppointment(null)
          loadDashboard(user)
        }}
      />
    )
  }

  // 3. Màn hình Phòng gọi video Bệnh nhân
  if (activeAppointment && user.role === 'patient') {
    return (
      <VideoRoom
        appointment={activeAppointment}
        onBack={() => setActiveAppointment(null)}
        user={user}
      />
    )
  }

  const isPatient = user.role === 'patient'
  const isDoctor = user.role === 'doctor'
  const upcoming = appointments.filter(a => ['scheduled', 'confirmed', 'in_progress'].includes(a.status))

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark small">
            <HeartPulse size={21} />
          </div>
          <div>
            <b>CareConnect</b>
            <small>Telemedicine V1.2</small>
          </div>
        </div>

        <div className="profile">
          <div className="avatar">
            <UserRound />
          </div>
          <div>
            <b>{user.full_name}</b>
            <small>{isPatient ? 'Bệnh nhân' : isDoctor ? `Bác sĩ (${user.doctor_cchn || 'CCHN'})` : 'Quản trị viên'}</small>
          </div>
        </div>

        <nav>
          {[
            ['overview', 'Tổng quan', HeartPulse],
            ['appointments', 'Lịch hẹn', CalendarDays],
            ['records', 'Hồ sơ bệnh án', FileText],
            ['results', 'Cận lâm sàng & PACS', FlaskConical],
            ['prescriptions', 'Đơn thuốc Quốc gia', Pill],
            ['payments', 'Thanh toán VietQR', CreditCard]
          ].map(([id, label, Icon]: any) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'selected' : ''}`}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="secure-note">
            <ShieldCheck size={17} />
            <span>
              Nghị định 13/2023/NĐ-CP<br />
              <small>Mã hóa dữ liệu & SmartCA</small>
            </span>
          </div>
          <button className="nav-item" onClick={logout}>
            <LogOut size={18} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">HỆ THỐNG Y TẾ TỪ XA CHUẨN QUỐC GIA</p>
            <h2>
              {isPatient
                ? `Xin chào, ${user.full_name}`
                : `Buồng làm việc: ${user.full_name}`}
            </h2>
          </div>
          <div className="top-actions">
            <span className="status-dot" /> SmartCA & Cổng Đơn thuốc sẵn sàng
            <button className="avatar small-avatar">
              <UserRound size={17} />
            </button>
          </div>
        </header>

        {error && (
          <div className="alert error">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}
        {toast && (
          <div className="alert success">
            {toast}
            <button onClick={() => setToast('')}><X size={16} /></button>
          </div>
        )}

        {/* Tab: Tổng quan */}
        {view === 'overview' && (
          <>
            <section className="welcome-card">
              <div>
                <span className="pill-label">GIAI ĐOẠN 2: PHÁP LÝ & TÍCH HỢP BỆNH VIỆN</span>
                <h1>
                  {isPatient
                    ? 'Chăm sóc sức khỏe toàn diện từ xa.'
                    : 'Bắt đầu các ca tư vấn trực tuyến hôm nay.'}
                </h1>
                <p>
                  {isPatient
                    ? 'Bệnh án ký số SmartCA, cấp mã Đơn thuốc quốc gia và ảnh chụp PACS/DICOM trực tuyến.'
                    : 'Ký số từ xa VNPT SmartCA, tự động đẩy đơn thuốc lên Cổng donthuocquocgia.vn và xuất PDF.'}
                </p>
                <button
                  className="white-button"
                  onClick={() => (isPatient ? setShowBooking(true) : setView('appointments'))}
                >
                  {isPatient ? 'Đặt lịch khám ngay' : 'Xem buồng khám hôm nay'} <ArrowRight size={16} />
                </button>
              </div>
              <div className="welcome-art">
                <div className="art-circle">
                  <HeartPulse size={70} />
                </div>
                <div className="art-bubble bubble-one">
                  <Video />
                </div>
                <div className="art-bubble bubble-two">
                  <CalendarDays />
                </div>
              </div>
            </section>

            <section className="stats-grid">
              <Stat icon={<CalendarDays />} label="Tổng lịch hẹn" value={appointments.length} hint="Tất cả hồ sơ" />
              <Stat icon={<Clock />} label="Sắp diễn ra" value={upcoming.length} hint="Cần tiếp nhận" />
              <Stat
                icon={<FileText />}
                label="Đã hoàn tất"
                value={appointments.filter(a => a.status === 'completed').length}
                hint="Đã ký số SmartCA"
              />
              <Stat icon={<ShieldCheck />} label="Pháp lý Y tế" value="Đạt chuẩn" hint="NĐ 13 & SmartCA" />
            </section>

            <section className="content-grid">
              <div className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Lịch khám gần nhất</h3>
                    <p>Theo dõi và tham gia buồng khám trực tuyến</p>
                  </div>
                  {isPatient && (
                    <button className="text-button" onClick={() => setShowBooking(true)}>
                      + Đặt lịch khám
                    </button>
                  )}
                </div>
                <AppointmentList
                  items={appointments.slice(0, 5)}
                  doctors={doctors}
                  isDoctor={isDoctor}
                  onJoin={handleJoinConsultation}
                  onPay={setQrAppointment}
                  onCancel={handleCancelAppointment}
                  onDownloadPdf={handleDownloadPdf}
                />
              </div>

              <div className="panel side-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Truy cập nhanh</h3>
                    <p>Hệ sinh thái bệnh viện</p>
                  </div>
                </div>
                <Quick
                  label="Chữ ký số Bác sĩ (SmartCA)"
                  sub="Ký số bệnh án & đơn thuốc"
                  icon={<PenTool />}
                  onClick={() => setView('records')}
                />
                <Quick
                  label="Xem phim PACS/DICOM (OHIF)"
                  sub="Bộ đọc phim X-Quang, CT trực tuyến"
                  icon={<FlaskConical />}
                  onClick={() => setView('results')}
                />
                <Quick
                  label="Đơn thuốc Quốc gia"
                  sub="donthuocquocgia.vn & Mã QR"
                  icon={<Pill />}
                  onClick={() => setView('prescriptions')}
                />
                <div className="mock-banner">
                  <ShieldCheck size={18} />
                  <span>
                    <b>Tuân thủ Pháp lý Y tế</b>
                    <small>Nghị định 13/2023/NĐ-CP & TT 30/2023</small>
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Tab: Lịch hẹn */}
        {view === 'appointments' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Danh sách lịch hẹn</h3>
                <p>Khởi động buồng khám hoặc thanh toán VietQR</p>
              </div>
              {isPatient && (
                <button className="primary" onClick={() => setShowBooking(true)}>
                  <Plus size={16} /> Đặt lịch khám mới
                </button>
              )}
            </div>
            <AppointmentList
              items={appointments}
              doctors={doctors}
              isDoctor={isDoctor}
              onJoin={handleJoinConsultation}
              onPay={setQrAppointment}
              onCancel={handleCancelAppointment}
              onDownloadPdf={handleDownloadPdf}
            />
          </section>
        )}

        {/* Tab: Hồ sơ bệnh án */}
        {view === 'records' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Hồ sơ bệnh án điện tử</h3>
                <p>Hồ sơ đã hoàn tất, ký số SmartCA và có thể trích xuất PDF</p>
              </div>
            </div>
            <AppointmentList
              items={appointments.filter(a => a.status === 'completed' || a.status === 'in_progress')}
              doctors={doctors}
              isDoctor={isDoctor}
              onJoin={handleJoinConsultation}
              onPay={setQrAppointment}
              onCancel={handleCancelAppointment}
              onDownloadPdf={handleDownloadPdf}
            />
            <div className="notice">
              <ShieldCheck size={18} />
              Bệnh án đã được mã hóa bảo vệ theo Nghị định 13/2023/NĐ-CP và có giá trị pháp lý khi được ký số SmartCA.
            </div>
          </section>
        )}

        {/* Tab: Cận lâm sàng & PACS */}
        {view === 'results' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Kết quả chẩn đoán hình ảnh PACS / DICOM</h3>
                <p>Tích hợp bộ đọc ảnh y khoa trực tuyến OHIF Viewer</p>
              </div>
            </div>
            {(imaging?.studies || []).map((s: any) => (
              <div className="result-row" key={s.study_id}>
                <div className="result-icon">
                  <FlaskConical />
                </div>
                <div className="grow">
                  <b>{s.description}</b>
                  <small>{s.modality} · {s.date} · Đơn vị: {s.institution} · Mã ca chụp: {s.study_id}</small>
                </div>
                {s.viewer_url ? (
                  <button
                    className="primary small-primary"
                    onClick={() => window.open(s.viewer_url, '_blank')}
                  >
                    <ExternalLink size={14} /> Mở OHIF Viewer
                  </button>
                ) : (
                  <span className="tag">Metadata</span>
                )}
              </div>
            ))}
            <div className="notice">
              <ShieldCheck size={18} />
              {imaging?.notice || 'Hệ thống PACS hỗ trợ giao thức DICOMweb WADO-RS hiển thị trực tiếp trên trình duyệt.'}
            </div>
          </section>
        )}

        {/* Tab: Đơn thuốc Quốc gia */}
        {view === 'prescriptions' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Toa thuốc điện tử Quốc gia</h3>
                <p>Đơn thuốc được kê từ các buổi khám trực tuyến có mã QR liên kết Cổng Quốc gia</p>
              </div>
            </div>
            <div className="prescription-demo-card">
              <div className="rx-badge">Rx</div>
              <div>
                <b>Hệ thống Quản lý Kê đơn thuốc điện tử Quốc gia (Bộ Y tế)</b>
                <p className="muted">
                  Bác sĩ sau khi khám có thể bấm "Đẩy lên Cổng Quốc gia" để nhận mã đơn thuốc chuẩn <code>{`{Mã CSKCB}-{Năm}-{Mã đơn}`}</code> kèm mã QR quét tại các nhà thuốc đạt chuẩn GPP.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Tab: Thanh toán VietQR */}
        {view === 'payments' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Thanh toán trực tuyến VietQR (Napas 247)</h3>
                <p>Khớp tiền tự động qua số tài khoản bệnh viện</p>
              </div>
            </div>
            {appointments.map(a => (
              <div className="result-row" key={a.id}>
                <div className="result-icon">
                  <CreditCard />
                </div>
                <div className="grow">
                  <b>Lịch hẹn #{a.id}</b>
                  <small>{dateText(a.starts_at)} · {a.reason}</small>
                  {a.refund_amount ? (
                    <span className="refund-badge">Đã hoàn lại: {money(a.refund_amount)}</span>
                  ) : null}
                </div>
                <b>{money(a.fee_amount)}</b>
                {a.status === 'confirmed' || a.status === 'completed' ? (
                  <span className="status confirmed">Đã thanh toán</span>
                ) : a.status === 'cancelled' ? (
                  <span className="status cancelled">Đã hủy</span>
                ) : (
                  <button className="primary" onClick={() => setQrAppointment(a)}>
                    <QrCode size={15} /> Quét VietQR
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Modal đặt lịch khám */}
        {showBooking && (
          <div className="modal-backdrop">
            <form className="modal" onSubmit={book}>
              <div className="panel-heading">
                <div>
                  <h3>Đặt lịch khám trực tuyến</h3>
                  <p>Chọn bác sĩ chuyên khoa và khung giờ thuận tiện</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setShowBooking(false)}>
                  <X />
                </button>
              </div>

              <label>
                Bác sĩ tiếp nhận
                <select value={doctorId} onChange={e => setDoctorId(e.target.value)} required>
                  <option value="">-- Chọn Bác sĩ chuyên khoa --</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Ngày và giờ khám
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={e => setStartsAt(e.target.value)}
                  required
                />
              </label>

              <label>
                Lý do khám / Triệu chứng ban đầu
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Mô tả triệu chứng bệnh của bạn..."
                />
              </label>

              <div className="notice">
                Phí khám chuyên khoa: <strong>500.000 ₫</strong>. Thanh toán chuyển khoản tự động qua VietQR sau khi tạo lịch.
              </div>

              <button className="primary full" type="submit">
                Xác nhận tạo lịch khám
              </button>
            </form>
          </div>
        )}

        {/* Modal VietQR thanh toán tự động */}
        {qrAppointment && (
          <VietQRModal
            appointment={qrAppointment}
            onClose={() => setQrAppointment(null)}
            onPaymentSuccess={() => {
              setQrAppointment(null)
              setToast('Thanh toán VietQR thành công! Lịch hẹn đã được xác nhận.')
              if (user) loadDashboard(user)
            }}
          />
        )}

        {/* Modal văn bản đồng thuận Nghị định 13/2023/NĐ-CP */}
        {pendingConsentAppointment && (
          <ConsentModal
            appointmentId={pendingConsentAppointment.id}
            onClose={() => setPendingConsentAppointment(null)}
            onAgreed={() => {
              const appt = pendingConsentAppointment
              setPendingConsentAppointment(null)
              setActiveAppointment(appt)
            }}
          />
        )}
      </main>
    </div>
  )
}

function Stat({ icon, label, value, hint }: any) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

function Quick({ label, sub, icon, onClick }: any) {
  return (
    <button className="quick-row" onClick={onClick}>
      <div className="quick-icon">{icon}</div>
      <span>
        <b>{label}</b>
        <small>{sub}</small>
      </span>
      <ArrowRight size={16} />
    </button>
  )
}

function Empty({ text }: any) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText />
      </div>
      <b>Chưa có dữ liệu</b>
      <p>{text}</p>
    </div>
  )
}

function AppointmentList({
  items,
  doctors,
  isDoctor,
  onJoin,
  onPay,
  onCancel,
  onDownloadPdf
}: any) {
  if (!items.length) {
    return <Empty text="Chưa có lịch hẹn nào. Hãy đặt lịch mới để bắt đầu khám." />
  }

  return (
    <div className="appointment-list">
      {items.map((a: Appointment) => {
        const docName = doctors.find((d: any) => d.id === a.doctor_id)?.full_name || `Bác sĩ #${a.doctor_id}`
        const statusMap: Record<string, string> = {
          scheduled: 'Chờ thanh toán',
          confirmed: 'Đã xác nhận',
          in_progress: 'Đang khám',
          completed: 'Đã hoàn tất',
          cancelled: 'Đã hủy'
        }

        return (
          <div className="appointment-row" key={a.id}>
            <div className="date-block">
              <b>{new Date(a.starts_at).toLocaleDateString('vi-VN', { day: '2-digit' })}</b>
              <small>TH {new Date(a.starts_at).toLocaleDateString('vi-VN', { month: '2-digit' })}</small>
            </div>

            <div className="appointment-info">
              <b>{docName}</b>
              <small>{dateText(a.starts_at)}</small>
              <span className="reason">{a.reason}</span>
            </div>

            <span className={`status ${a.status}`}>
              {statusMap[a.status] || a.status}
            </span>

            <div className="row-actions">
              {/* Nút vào khám hoặc gọi video */}
              {!['completed', 'cancelled'].includes(a.status) && (
                <button className="small-primary" onClick={() => onJoin(a)}>
                  {isDoctor ? <Stethoscope size={15} /> : <Video size={15} />}
                  {isDoctor ? 'Vào buồng khám' : 'Vào khám'}
                </button>
              )}

              {/* Nút tải PDF nếu đã hoàn tất */}
              {a.status === 'completed' && (
                <button
                  className="small-pdf"
                  onClick={() => onDownloadPdf(a.id)}
                  title="Tải Phiếu khám & Đơn thuốc PDF có ký số"
                >
                  <FileDown size={15} /> PDF
                </button>
              )}

              {/* Nút thanh toán VietQR nếu là bệnh nhân và chưa thanh toán */}
              {!isDoctor && a.status === 'scheduled' && (
                <button
                  className="small-qr"
                  onClick={() => onPay(a)}
                  title="Thanh toán chuyển khoản VietQR"
                >
                  <QrCode size={15} /> Trả phí
                </button>
              )}

              {/* Nút hủy lịch */}
              {['scheduled', 'confirmed'].includes(a.status) && (
                <button
                  className="small-cancel"
                  onClick={() => onCancel(a)}
                  title="Hủy lịch hẹn"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
