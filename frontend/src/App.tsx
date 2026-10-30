import { useEffect, useState, useMemo } from 'react'
import {
  CalendarDays, Video, FileText, FlaskConical, Pill, CreditCard,
  LogOut, HeartPulse, Clock, UserRound, ShieldCheck, ArrowRight,
  Plus, X, Phone, Lock, Stethoscope, AlertCircle, RefreshCw, QrCode,
  FileDown, ExternalLink, PenTool, Building2, Sparkles, CheckCircle2,
  HelpCircle, ShieldAlert, Undo2, Activity, Settings, ScanLine
} from 'lucide-react'
import {
  login, sendOtp, verifyOtp, request, cancelAppointment,
  getConsentStatus, downloadMedicalRecordPdf, getPacsDicomStudies,
  checkBhyt, applyBhyt, getDepartments, getDoctorShifts,
  checkIncomingCall, declineIncomingCall,
  getPatientLabResults, getPatientPacsStudies, getMyLabResults, getMyPacsStudies,
  type Appointment, type User, type Department, type DoctorShift,
  type BhytCheckOut, type IncomingCallData, type LabResultsData, type PACSStudiesData
} from './api'
import { VideoRoom } from './VideoRoom'
import { DoctorWorkspace } from './DoctorWorkspace'
import { VietQRModal } from './VietQRModal'
import { ConsentModal } from './ConsentModal'
import { IncomingCallModal } from './IncomingCallModal'
import { TriageDesk } from './TriageDesk'
import { AdminDashboard } from './AdminDashboard'

const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

const dateText = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  
  // Auth state
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp')
  const [phone, setPhone] = useState('0912345678')
  const [otpCode, setOtpCode] = useState('123456')
  const [otpSent, setOtpSent] = useState(false)
  const [otpDevHint, setOtpDevHint] = useState('123456')
  const [patientFullName, setPatientFullName] = useState('')

  const [email, setEmail] = useState('doctor@example.test')
  const [password, setPassword] = useState('ChangeMe123!')

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<{ id: number; full_name: string; cchn?: string; department_id?: number }[]>([])
  const [error, setError] = useState('')
  const [view, setView] = useState('overview')
  
  // Modal states
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [qrAppointment, setQrAppointment] = useState<Appointment | null>(null)
  const [pendingConsentAppointment, setPendingConsentAppointment] = useState<Appointment | null>(null)

  // Giai đoạn 3 States: BHYT, Khoa/Phòng & Lịch trực chống quá tải, Hủy lịch & Hoàn tiền
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)

  const [bhytCode, setBhytCode] = useState('GD4797931812345')
  const [bhytInfo, setBhytInfo] = useState<BhytCheckOut | null>(null)
  const [checkingBhyt, setCheckingBhyt] = useState(false)
  const [applyingBhytId, setApplyingBhytId] = useState<number | null>(null)

  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null)
  const [cancelReasonText, setCancelReasonText] = useState('Bận lịch đột xuất, xin hủy hẹn khám')
  const [cancelling, setCancelling] = useState(false)

  // Cuộc gọi đến từ Bác sĩ (Incoming Call Ringing)
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)

  const [showBooking, setShowBooking] = useState(false)
  const [doctorId, setDoctorId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [reason, setReason] = useState('Tư vấn sức khỏe định kỳ')
  const [hisSummary, setHisSummary] = useState<any>(null)
  const [imaging, setImaging] = useState<any>(null)
  const [toast, setToast] = useState('')

  // Cận lâm sàng & PACS cho từng bệnh nhân
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1)
  const [patientLabData, setPatientLabData] = useState<LabResultsData | null>(null)
  const [patientPacsData, setPatientPacsData] = useState<PACSStudiesData | null>(null)
  const [loadingPatientLab, setLoadingPatientLab] = useState(false)
  const [loadingPatientPacs, setLoadingPatientPacs] = useState(false)
  const [appLabFilter, setAppLabFilter] = useState<string>('all')
  const [appPacsFilter, setAppPacsFilter] = useState<string>('all')

  // Danh sách bệnh nhân độc nhất cho Bác sĩ / Điều dưỡng tra cứu
  const uniquePatients = useMemo(() => {
    const map = new Map<number, { id: number; name: string; phone?: string; bhyt?: string; lastReason?: string }>()
    map.set(1, { id: 1, name: 'Nguyễn Minh An (Demo)', phone: '0912345678', bhyt: 'GD4797931812345', lastReason: 'Khám tim mạch theo dõi' })
    appointments.forEach(a => {
      if (a.patient_id && !map.has(a.patient_id)) {
        map.set(a.patient_id, {
          id: a.patient_id,
          name: (a as any).patient_name || `Bệnh nhân #${a.patient_id}`,
          phone: (a as any).patient_phone,
          bhyt: a.bhyt_code,
          lastReason: a.reason
        })
      }
    })
    return Array.from(map.values())
  }, [appointments])

  // Tải dữ liệu cận lâm sàng & PACS theo từng bệnh nhân được chọn
  useEffect(() => {
    if (!user) return
    if (view === 'lab' || view === 'results') {
      setLoadingPatientLab(true)
      const fetchLab = user.role === 'patient'
        ? getMyLabResults()
        : getPatientLabResults(selectedPatientId)
      fetchLab
        .then(setPatientLabData)
        .catch(console.error)
        .finally(() => setLoadingPatientLab(false))
    }
    if (view === 'pacs' || view === 'results') {
      setLoadingPatientPacs(true)
      const fetchPacs = user.role === 'patient'
        ? getMyPacsStudies()
        : getPatientPacsStudies(selectedPatientId)
      fetchPacs
        .then(setPatientPacsData)
        .catch(console.error)
        .finally(() => setLoadingPatientPacs(false))
    }
  }, [view, user, selectedPatientId])

  async function loadDashboard(current: User) {
    try {
      const [list, depts] = await Promise.all([
        request<Appointment[]>('/api/v1/appointments'),
        getDepartments().catch(() => [])
      ])
      setAppointments(list)
      setDepartments(depts)
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
      } else if (current.role === 'admin') {
        setView('admin')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu')
    }
  }

  // Tải ca trực khi chọn Bác sĩ
  useEffect(() => {
    if (doctorId) {
      getDoctorShifts(Number(doctorId))
        .then(setDoctorShifts)
        .catch(() => setDoctorShifts([]))
    } else {
      setDoctorShifts([])
    }
  }, [doctorId])

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
          reason,
          shift_id: selectedShiftId || undefined,
          department_id: selectedDeptId ? Number(selectedDeptId) : undefined
        })
      })
      setShowBooking(false)
      setSelectedShiftId(null)
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

  // Tra cứu BHYT trực tuyến
  async function handleCheckBhyt() {
    if (!bhytCode.trim()) {
      setError('Vui lòng nhập mã thẻ BHYT')
      return
    }
    setCheckingBhyt(true)
    setError('')
    try {
      const res = await checkBhyt(bhytCode, user?.full_name)
      setBhytInfo(res)
      setToast(res.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tra cứu BHYT thất bại')
    } finally {
      setCheckingBhyt(false)
    }
  }

  // Áp dụng BHYT vào lịch hẹn
  async function handleApplyBhyt(appointmentId: number) {
    if (!bhytCode.trim()) {
      setError('Vui lòng nhập mã thẻ BHYT hợp lệ')
      return
    }
    setApplyingBhytId(appointmentId)
    setError('')
    try {
      const res = await applyBhyt(appointmentId, bhytCode)
      setToast(res.message)
      if (user) await loadDashboard(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể áp dụng BHYT')
    } finally {
      setApplyingBhytId(null)
    }
  }

  // Mở modal Hủy lịch hẹn
  function handleCancelAppointment(a: Appointment) {
    setCancelModalAppt(a)
    setCancelReasonText('Bận lịch đột xuất, xin hủy hẹn khám')
  }

  // Thực hiện Hủy lịch & Hoàn tiền theo chính sách
  async function handleConfirmCancel() {
    if (!cancelModalAppt) return
    setCancelling(true)
    setError('')
    try {
      const res = await cancelAppointment(cancelModalAppt.id, cancelReasonText)
      setToast(res.message)
      setCancelModalAppt(null)
      if (user) await loadDashboard(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể hủy lịch')
    } finally {
      setCancelling(false)
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

  // Lắng nghe cuộc gọi đến từ Bác sĩ (Incoming Call Polling cho Bệnh nhân)
  useEffect(() => {
    if (!user || user.role !== 'patient' || activeAppointment) {
      return
    }

    const interval = setInterval(async () => {
      try {
        const callData = await checkIncomingCall()
        if (callData.has_incoming_call) {
          setIncomingCall(prev => (prev?.appointment_id === callData.appointment_id ? prev : callData))
        } else {
          setIncomingCall(null)
        }
      } catch {}
    }, 2500)

    return () => clearInterval(interval)
  }, [user, activeAppointment])

  // Bệnh nhân bấm nhận cuộc gọi
  async function handleAcceptIncomingCall() {
    if (!incomingCall || !incomingCall.appointment_id) return
    const apptId = incomingCall.appointment_id
    setIncomingCall(null)

    let targetAppt = appointments.find(a => a.id === apptId)
    if (!targetAppt) {
      targetAppt = {
        id: apptId,
        patient_id: user!.id,
        doctor_id: incomingCall.doctor?.id || 0,
        starts_at: incomingCall.starts_at || new Date().toISOString(),
        reason: incomingCall.reason || 'Tư vấn sức khỏe trực tuyến',
        status: 'in_progress',
        fee_amount: incomingCall.fee_amount || 500000,
        currency: 'VND'
      }
    }
    await handleJoinConsultation(targetAppt)
  }

  // Bệnh nhân bấm từ chối cuộc gọi
  async function handleDeclineIncomingCall() {
    if (incomingCall?.appointment_id) {
      declineIncomingCall(incomingCall.appointment_id).catch(() => {})
    }
    setIncomingCall(null)
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
            Bệnh nhân: Nhập SĐT bất kỳ (hoặc <code>0912345678</code>) và nhập mã OTP cố định: <code>123456</code>.
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
            <small>{isPatient ? 'Bệnh nhân' : isDoctor ? `Bác sĩ (${user.doctor_cchn || 'CCHN'})` : user.role === 'nurse' ? 'Điều dưỡng trưởng' : 'Quản trị viên'}</small>
          </div>
        </div>

        <nav>
          {[
            ...(user.role === 'admin' ? [['admin', '⚙️ Quản trị & Cài đặt', Settings]] : []),
            ['overview', 'Tổng quan', HeartPulse],
            ['appointments', 'Lịch hẹn', CalendarDays],
            ...(!isPatient ? [['triage', 'Bàn Sàng lọc (Triage)', Activity]] : []),
            ['records', 'Hồ sơ bệnh án', FileText],
            ['lab', 'Cận lâm sàng (Xét nghiệm)', FlaskConical],
            ['pacs', 'Chẩn đoán hình ảnh PACS', ScanLine],
            ['prescriptions', 'Đơn thuốc Quốc gia', Pill],
            ['insurance', 'Bảo hiểm Y tế (BHYT)', ShieldCheck],
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
                  label="Cận lâm sàng (Xét nghiệm)"
                  sub="Sinh hóa máu, huyết học, nước tiểu"
                  icon={<FlaskConical />}
                  onClick={() => setView('lab')}
                />
                <Quick
                  label="Chẩn đoán hình ảnh PACS"
                  sub="Bộ đọc phim X-Quang, CT, MRI"
                  icon={<ScanLine />}
                  onClick={() => setView('pacs')}
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

        {/* Tab 1: Cận lâm sàng & Xét nghiệm */}
        {(view === 'lab' || view === 'results') && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FlaskConical size={22} color="#0f766e" />
                  <h3 style={{ margin: 0 }}>Phiếu Cận lâm sàng & Kết quả Xét nghiệm</h3>
                </div>
                <p>Theo dõi chỉ số sinh hóa máu, công thức máu và tổng phân tích nước tiểu</p>
              </div>
            </div>

            {/* Thanh chọn Bệnh nhân dành cho Bác sĩ & Điều dưỡng */}
            {!isPatient && (
              <div className="patient-selector-panel" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                      👤 Chọn Bệnh nhân để xem Cận lâm sàng:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {uniquePatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatientId(p.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: selectedPatientId === p.id ? '2px solid #0f766e' : '1px solid #cbd5e1',
                            background: selectedPatientId === p.id ? '#ccfbf1' : '#fff',
                            color: selectedPatientId === p.id ? '#0f766e' : '#334155',
                            fontWeight: selectedPatientId === p.id ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <UserRound size={14} />
                          <span>{p.name}</span>
                          {p.bhyt && <small style={{ opacity: 0.75, fontSize: '11px' }}>({p.bhyt})</small>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Category chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                ['all', `Tất cả (${patientLabData?.reports?.length || 0})`],
                ['biochemistry', 'Sinh hóa máu'],
                ['hematology', 'Huyết học & Tế bào'],
                ['urinalysis', 'Nước tiểu']
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppLabFilter(key)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: appLabFilter === key ? '1px solid #0f766e' : '1px solid #cbd5e1',
                    background: appLabFilter === key ? '#0f766e' : '#f8fafc',
                    color: appLabFilter === key ? '#fff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {loadingPatientLab && <p className="muted">Đang tải kết quả cận lâm sàng của bệnh nhân...</p>}

            {patientLabData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {patientLabData.reports
                  .filter(r => appLabFilter === 'all' || r.category === appLabFilter)
                  .map(report => (
                    <div key={report.report_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                              {report.category_name}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{report.title}</h4>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            Mã: <strong>{report.report_id}</strong> · Lấy mẫu: {report.sampled_at} · Trả KQ: {report.result_at}
                          </small>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                          <div>KTV: <strong>{report.performed_by}</strong></div>
                          <div>BS chỉ định: {report.doctor_order}</div>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 10px' }}>Tên xét nghiệm / Chỉ số</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Kết quả</th>
                              <th style={{ padding: '8px 10px' }}>Đơn vị</th>
                              <th style={{ padding: '8px 10px' }}>Khoảng tham chiếu</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đánh giá</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.indicators.map((ind, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: ind.flag !== 'NORMAL' ? '#fffbeb' : 'transparent' }}>
                                <td style={{ padding: '8px 10px' }}>
                                  <strong style={{ color: '#1e293b' }}>{ind.name}</strong>
                                  <code style={{ marginLeft: 6, fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{ind.code}</code>
                                  {ind.note && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ind.note}</div>}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: ind.flag === 'HIGH' ? '#dc2626' : ind.flag === 'LOW' ? '#d97706' : '#0f172a' }}>
                                  {ind.value}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{ind.unit}</td>
                                <td style={{ padding: '8px 10px', color: '#475569' }}>{ind.ref_range}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  {ind.flag === 'HIGH' && (
                                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                      ▲ Tăng cao
                                    </span>
                                  )}
                                  {ind.flag === 'LOW' && (
                                    <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                      ▼ Giảm thấp
                                    </span>
                                  )}
                                  {ind.flag === 'NORMAL' && (
                                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                      Bình thường
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {report.conclusion && (
                        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #0f766e', fontSize: '12px' }}>
                          <strong style={{ color: '#0f766e' }}>Kết luận chuyên môn:</strong> {report.conclusion}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <div className="notice" style={{ marginTop: '16px' }}>
              <ShieldCheck size={18} />
              Dữ liệu cận lâm sàng được kết nối trực tiếp từ hệ thống LIS bệnh viện theo chuẩn HL7 FHIR bảo vệ quyền riêng tư bệnh nhân.
            </div>
          </section>
        )}

        {/* Tab 2: Chẩn đoán hình ảnh PACS / DICOM */}
        {view === 'pacs' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ScanLine size={22} color="#0284c7" />
                  <h3 style={{ margin: 0 }}>Kết quả Chẩn đoán Hình ảnh PACS / DICOM</h3>
                </div>
                <p>Xem phim X-Quang, Siêu âm, CT Scanner trực tuyến qua trình đọc ảnh y khoa OHIF Viewer</p>
              </div>
            </div>

            {/* Thanh chọn Bệnh nhân dành cho Bác sĩ & Điều dưỡng */}
            {!isPatient && (
              <div className="patient-selector-panel" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>
                      🩻 Chọn Bệnh nhân để xem phim PACS:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {uniquePatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatientId(p.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: selectedPatientId === p.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                            background: selectedPatientId === p.id ? '#e0f2fe' : '#fff',
                            color: selectedPatientId === p.id ? '#0369a1' : '#334155',
                            fontWeight: selectedPatientId === p.id ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <UserRound size={14} />
                          <span>{p.name}</span>
                          {p.bhyt && <small style={{ opacity: 0.75, fontSize: '11px' }}>({p.bhyt})</small>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Modality chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                ['all', `Tất cả (${patientPacsData?.studies?.length || 0})`],
                ['CR', 'X-Quang (CR)'],
                ['US', 'Siêu âm (US)'],
                ['CT', 'Cắt lớp vi tính (CT)']
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppPacsFilter(key)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: appPacsFilter === key ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    background: appPacsFilter === key ? '#0284c7' : '#f8fafc',
                    color: appPacsFilter === key ? '#fff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {loadingPatientPacs && <p className="muted">Đang tải danh sách phim chụp PACS của bệnh nhân...</p>}

            {patientPacsData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {patientPacsData.studies
                  .filter(s => appPacsFilter === 'all' || s.modality === appPacsFilter)
                  .map(study => (
                    <div key={study.study_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: study.modality === 'CT' ? '#fef3c7' : study.modality === 'US' ? '#f3e8ff' : '#e0f2fe',
                              color: study.modality === 'CT' ? '#b45309' : study.modality === 'US' ? '#7e22ce' : '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}>
                              {study.modality}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{study.description}</h4>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            Mã ca: <strong>{study.study_id}</strong> · Bộ phận: <strong>{study.body_part}</strong> · Ngày chụp: <strong>{study.date}</strong> · Đơn vị: {study.institution}
                          </small>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>BS CĐHA:</span>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{study.radiologist}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '12px' }}>
                          <strong style={{ color: '#475569', display: 'block', marginBottom: '4px' }}>📝 Mô tả hình ảnh (Findings):</strong>
                          <p style={{ margin: 0, color: '#1e293b', lineHeight: 1.5 }}>{study.findings}</p>
                        </div>

                        <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #10b981', fontSize: '12px' }}>
                          <strong style={{ color: '#047857', display: 'block', marginBottom: '4px' }}>🎯 Kết luận (Impression):</strong>
                          <p style={{ margin: 0, color: '#064e3b', fontWeight: 600, lineHeight: 1.5 }}>{study.impression}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          type="button"
                          className="primary small-primary"
                          onClick={() => window.open(study.viewer_url, '_blank')}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#0284c7', borderColor: '#0284c7' }}
                        >
                          <ExternalLink size={14} /> Mở phim DICOM (OHIF Viewer)
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="notice" style={{ marginTop: '16px' }}>
              <ShieldCheck size={18} />
              {patientPacsData?.notice || 'Hệ thống PACS hỗ trợ giao thức DICOMweb WADO-RS hiển thị trực tiếp trên trình duyệt.'}
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
                  Bác sĩ sau khi khám có thể kê đơn thuốc điện tử và bấm "Đẩy lên Cổng Quốc gia" để nhận mã đơn thuốc chuẩn <code>{`{Mã CSKCB}-{Năm}-{Mã đơn}`}</code> kèm mã QR quét tại các nhà thuốc đạt chuẩn GPP trên toàn quốc.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: '#1e293b', fontWeight: 700 }}>
                📋 Danh sách đơn thuốc từ các đợt khám của bạn:
              </h4>
              <AppointmentList
                items={appointments.filter(a => a.status === 'completed' || a.status === 'in_progress')}
                doctors={doctors}
                isDoctor={isDoctor}
                onJoin={handleJoinConsultation}
                onPay={setQrAppointment}
                onCancel={handleCancelAppointment}
                onDownloadPdf={handleDownloadPdf}
              />
            </div>
          </section>
        )}

        {/* Tab: Cổng Giám định BHYT & Bảo lãnh viện phí */}
        {view === 'insurance' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Cổng Giám định BHYT & Quyền lợi Bảo hiểm Y tế</h3>
                <p>Tra cứu trực tuyến quyền lợi thẻ BHYT theo chuẩn BHXH Việt Nam (QĐ 1666/QĐ-BHXH)</p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                Nhập mã thẻ BHYT (15 ký tự hoặc mã số BHXH 10 số):
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ví dụ: GD4797931812345 hoặc DN4010123456789..."
                  value={bhytCode}
                  onChange={e => setBhytCode(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  className="primary"
                  onClick={handleCheckBhyt}
                  disabled={checkingBhyt || !bhytCode.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <ShieldCheck size={16} />
                  {checkingBhyt ? 'Đang tra cứu...' : 'Tra cứu thẻ BHYT'}
                </button>
              </div>
            </div>

            {bhytInfo && (
              <div style={{ background: 'linear-gradient(135deg, #0f766e, #115e59)', color: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(15,118,110,0.25)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>BẢO HIỂM XÃ HỘI VIỆT NAM · THẺ BHYT ĐIỆN TỬ VSSID</span>
                    <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700 }}>{bhytInfo.patient_name}</h2>
                  </div>
                  <div style={{ background: '#fef08a', color: '#854d0e', padding: '6px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '14px' }}>
                    Mức hưởng: {bhytInfo.benefit_rate_percent}%
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <span style={{ opacity: 0.8 }}>Mã thẻ BHYT:</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>{bhytInfo.bhyt_code}</div>
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Nhóm đối tượng:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{bhytInfo.object_group}</div>
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Nơi ĐKKCB ban đầu:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{bhytInfo.primary_healthcare_facility}</div>
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Thời hạn sử dụng:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{bhytInfo.valid_from} đến {bhytInfo.valid_to}</div>
                    <small style={{ color: '#99f6e4' }}>{bhytInfo.five_years_consecutive}</small>
                  </div>
                </div>

                <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                  ✅ <strong>Chi trả KCB từ xa:</strong> Đủ điều kiện hưởng BHYT cho các dịch vụ hội chẩn, tư vấn khám bệnh từ xa theo quy định hiện hành của Bộ Y tế.
                </div>
              </div>
            )}

            {/* Danh sách lịch hẹn có thể áp dụng BHYT */}
            <h4 style={{ margin: '20px 0 10px', fontSize: '15px' }}>Lịch hẹn áp dụng quyền lợi BHYT</h4>
            {appointments.filter(a => a.status === 'scheduled').length === 0 ? (
              <p className="muted">Hiện không có lịch hẹn nào đang chờ xử lý chiết khấu BHYT.</p>
            ) : (
              appointments.filter(a => a.status === 'scheduled').map(a => (
                <div className="result-row" key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <b>Lịch hẹn #{a.id}</b>
                    <small>{dateText(a.starts_at)} · {a.reason}</small>
                    {a.bhyt_discount ? (
                      <div style={{ color: '#0d9488', fontSize: '12px', fontWeight: 600, marginTop: '3px' }}>
                        🛡️ Đã áp dụng thẻ BHYT ({a.bhyt_code}): Giảm {a.bhyt_rate}% (-{money(a.bhyt_discount)})
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {a.bhyt_discount ? (
                      <span style={{ fontSize: '13px' }}>
                        Đồng chi trả: <b style={{ color: '#0f766e', fontSize: '15px' }}>{money(a.patient_pay_amount || (a.fee_amount - a.bhyt_discount))}</b>
                      </span>
                    ) : (
                      <>
                        <span>Viện phí gốc: <b>{money(a.fee_amount)}</b></span>
                        <button
                          className="primary"
                          onClick={() => handleApplyBhyt(a.id)}
                          disabled={applyingBhytId === a.id}
                          style={{ padding: '6px 14px', fontSize: '13px' }}
                        >
                          {applyingBhytId === a.id ? 'Đang áp dụng...' : '⚡ Áp dụng thẻ BHYT'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
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

        {/* Tab: Trung tâm Quản trị & Cài đặt Hệ thống (Admin Dashboard) */}
        {view === 'admin' && (
          <section className="panel page-panel">
            <AdminDashboard />
          </section>
        )}

        {/* Tab: Bàn Sàng lọc & Điều phối Điều dưỡng (Triage Desk) */}
        {view === 'triage' && (
          <section className="panel page-panel">
            <TriageDesk />
          </section>
        )}

        {/* Modal đặt lịch khám */}
        {showBooking && (
          <div className="modal-backdrop">
            <form className="modal booking-modal" onSubmit={book}>
              <div className="booking-modal-drag-bar" />
              <div className="booking-modal-header panel-heading">
                <div>
                  <h3>Đặt lịch khám trực tuyến</h3>
                  <p>Chọn chuyên khoa, bác sĩ và ca trực chống quá tải</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setShowBooking(false)}>
                  <X />
                </button>
              </div>

              <div className="booking-modal-body">
                <label>
                  Khoa / Chuyên khoa
                  <select
                    value={selectedDeptId}
                    onChange={e => {
                      setSelectedDeptId(e.target.value)
                      setDoctorId('')
                      setSelectedShiftId(null)
                    }}
                  >
                    <option value="">-- Tất cả chuyên khoa --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Bác sĩ tiếp nhận
                  <select
                    value={doctorId}
                    onChange={e => {
                      setDoctorId(e.target.value)
                      setSelectedShiftId(null)
                    }}
                    required
                  >
                    <option value="">-- Chọn Bác sĩ chuyên khoa --</option>
                    {doctors
                      .filter((d: any) => !selectedDeptId || String(d.department_id) === String(selectedDeptId))
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.full_name} {d.cchn ? `(${d.cchn})` : ''}
                        </option>
                      ))}
                  </select>
                </label>

                {/* Lịch trực chuyên khoa & Hạn ngạch ca khám (Anti-overload) */}
                {doctorId && doctorShifts.length > 0 && (
                  <div className="booking-shift-section">
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                      Chọn Ca trực bác sĩ (Định mức chống quá tải):
                    </label>
                    <div className="booking-shifts-grid">
                      {doctorShifts.map(s => {
                        const isSelected = selectedShiftId === s.id
                        const isFull = s.is_overloaded
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={isFull}
                            onClick={() => {
                              setSelectedShiftId(s.id)
                              setStartsAt(`${s.shift_date}T${s.start_time}:00`)
                            }}
                            className={`shift-card-btn ${isSelected ? 'selected' : ''} ${isFull ? 'full-quota' : ''}`}
                          >
                            <div className="shift-card-title">
                              {s.shift_type === 'morning' ? '☀️ Ca sáng' : s.shift_type === 'afternoon' ? '🌤️ Ca chiều' : '🌙 Ca tối'} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                            </div>
                            <div className="shift-card-date">Ngày: {s.shift_date}</div>
                            <div className={`shift-card-quota ${isFull ? 'danger' : 'success'}`}>
                              {isFull ? '⚠️ ĐÃ ĐỦ ĐỊNH MỨC' : `Còn ${s.available_slots}/${s.max_patients} lượt khám`}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

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
                    rows={3}
                  />
                </label>

                <div className="notice booking-fee-notice">
                  Phí khám chuyên khoa: <strong>500.000 ₫</strong>. Có thể áp dụng giảm trừ thẻ BHYT trực tuyến sau khi tạo lịch.
                </div>
              </div>

              <div className="booking-modal-footer">
                <button className="primary full booking-submit-btn" type="submit">
                  📅 Xác nhận tạo lịch khám
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Hủy lịch hẹn & Hoàn tiền tự động */}
        {cancelModalAppt && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '500px', width: '100%' }}>
              <div className="panel-heading">
                <div>
                  <h3>Hủy lịch khám & Hoàn tiền</h3>
                  <p>Lịch hẹn #{cancelModalAppt.id} · {dateText(cancelModalAppt.starts_at)}</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setCancelModalAppt(null)}>
                  <X />
                </button>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', marginBottom: '14px', fontSize: '13px', color: '#166534' }}>
                <strong>💰 Chính sách hoàn tiền 100%:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li>Hủy trước giờ khám được hoàn <strong>100% viện phí</strong> ({money(cancelModalAppt.fee_amount)}).</li>
                  <li>Kích hoạt hoàn tiền tự động qua Napas 247/VietQR và cập nhật hệ thống.</li>
                </ul>
              </div>

              <label>
                Lý do hủy lịch khám
                <textarea
                  value={cancelReasonText}
                  onChange={e => setCancelReasonText(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Vui lòng cho biết lý do hủy lịch..."
                  rows={3}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setCancelModalAppt(null)}
                  style={{ flex: 1 }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  style={{ flex: 2, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, padding: '10px', cursor: 'pointer' }}
                >
                  {cancelling ? 'Đang hủy...' : 'Xác nhận hủy & Hoàn tiền'}
                </button>
              </div>
            </div>
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

        {/* Màn hình cuộc gọi đến (Bác sĩ gọi - Màn hình điện thoại sáng lên & Đổ chuông) */}
        {incomingCall && (
          <IncomingCallModal
            call={incomingCall}
            onAccept={handleAcceptIncomingCall}
            onDecline={handleDeclineIncomingCall}
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
              {a.bhyt_discount ? (
                <div style={{ color: '#0d9488', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                  🛡️ BHYT chi trả {a.bhyt_rate}% (-{money(a.bhyt_discount)}) · Cần thanh toán: {money(a.patient_pay_amount || (a.fee_amount - a.bhyt_discount))}
                </div>
              ) : null}
              {a.status === 'cancelled' && a.refund_amount ? (
                <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                  💰 Đã hoàn tiền 100% ({money(a.refund_amount)}) {a.refund_reason ? `· Lý do: ${a.refund_reason}` : ''}
                </div>
              ) : null}
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
