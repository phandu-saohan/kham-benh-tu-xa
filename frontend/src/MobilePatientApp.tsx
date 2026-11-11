import React, { useState, useEffect, useMemo } from 'react'
import {
  HeartPulse, CalendarDays, Pill, UserRound, Plus, Activity,
  ShieldCheck, Phone, Lock, Eye, EyeOff, ArrowRight, UserPlus,
  CheckCircle2, AlertCircle, Cpu, FlaskConical, ScanLine, FileText,
  Users, CreditCard, ArrowLeft, Video, Clock, QrCode, Bluetooth,
  Thermometer, Wind, Droplets, Scale, ChevronRight, LogOut, Sparkles,
  RefreshCw, ChevronDown, Check, X, Download, Share2, Search,
  Filter, Stethoscope, Building2, Sun, Moon, Trash2, Edit2, Info,
  AlertTriangle, Maximize2, MapPin
} from 'lucide-react'
import { ConfirmationResult } from 'firebase/auth'
import {
  isCapacitorNative,
  login,
  sendOtp,
  verifyOtp,
  loginWithFirebaseToken,
  getMyPrescriptions,
  getMyMedicineCabinet,
  createCabinetItem,
  logTakeCabinetDose,
  getMyLabResults,
  interpretLabResults,
  getMyPacsStudies,
  recordRPMVitals,
  getFamilyMembers,
  createFamilyMember,
  deleteFamilyMember,
  type User,
  type Appointment,
  type RPMVitalItem,
  type Department,
  type LabResultsData,
  type LabReport,
  type PACSStudiesData,
  type PACSStudy,
  type PatientPrescription,
  type CabinetItem,
  type FamilyMemberItem,
  type LabInterpretResult
} from './api'
import {
  isFirebaseConfigured,
  setupRecaptcha,
  sendFirebaseOtp,
  verifyFirebaseOtp
} from './firebase'
import { NotificationCenter } from './NotificationCenter'
import { formatDateVN, formatDateTimeVN } from './dateFormatters'
import { MobileBluetoothView } from './MobileBluetoothView'
import './mobile-patient.css'

export function useIsMobilePatient(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (isCapacitorNative()) return true
    if (typeof window !== 'undefined') return window.innerWidth <= 768
    return false
  })

  useEffect(() => {
    if (isCapacitorNative()) {
      setIsMobile(true)
      return
    }
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return isMobile
}

const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

// ============================================================================
// 1. MOBILE LOGIN COMPONENT (CLEAN, FRIENDLY, TOUCH-OPTIMIZED)
// ============================================================================
interface MobilePatientLoginProps {
  onSuccess: (user: User) => void
  onNavigateToRegister: () => void
}

export function MobilePatientLogin({
  onSuccess,
  onNavigateToRegister
}: MobilePatientLoginProps) {
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // OTP login
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)

  const [error, setError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!identifier.trim() || !password) {
      setError('Vui lòng nhập Email / SĐT / CCCD và mật khẩu.')
      return
    }
    setError('')
    setIsLoggingIn(true)
    try {
      const u = await login(identifier.trim(), password)
      onSuccess(u)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Tài khoản hoặc mật khẩu không chính xác.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  async function handleSendOtp() {
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại di động.')
      return
    }
    setError('')
    setSuccessNotice('')
    setIsSendingOtp(true)
    try {
      if (isFirebaseConfigured() && !isCapacitorNative()) {
        const verifier = setupRecaptcha('mp-login-recaptcha-box')
        if (!verifier) {
          throw new Error('Không thể khởi tạo dịch vụ xác thực OTP.')
        }
        const confirmResult = await sendFirebaseOtp(phone.trim(), verifier)
        setConfirmationResult(confirmResult)
        setOtpSent(true)
        setOtpCode('')
        setSuccessNotice(`Mã xác thực OTP đã gửi đến ${phone}.`)
      } else {
        const res = await sendOtp(phone.trim())
        setOtpSent(true)
        setOtpCode('')
        setSuccessNotice(res.message || `Mã xác thực OTP đã gửi đến ${phone}.`)
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi mã OTP lúc này.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode.trim()) {
      setError('Vui lòng nhập mã OTP gồm 6 chữ số.')
      return
    }
    setError('')
    setIsVerifyingOtp(true)
    try {
      if (confirmationResult) {
        const idToken = await verifyFirebaseOtp(confirmationResult, otpCode.trim())
        const u = await loginWithFirebaseToken(idToken)
        onSuccess(u)
      } else {
        const u = await verifyOtp(phone.trim(), otpCode.trim())
        onSuccess(u)
      }
    } catch (err: any) {
      setError(err?.message || 'Mã OTP không chính xác hoặc đã hết hạn.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  return (
    <div className="mp-login-shell">
      <div className="mp-login-hero">
        <div className="mp-login-brand">
          <div className="mp-login-logo-box">
            <HeartPulse size={26} color="#ffffff" />
          </div>
          <div>
            <div className="mp-login-brand-title">CareConnect</div>
            <div className="mp-login-brand-sub">Ứng dụng Y tế Số & Khám Từ Xa</div>
          </div>
        </div>

        <h1 className="mp-login-hero-heading">Cổng Bệnh Nhân Điện Tử</h1>
        <p className="mp-login-hero-desc">
          Đặt lịch khám trực tuyến, gọi video với bác sĩ chuyên khoa, theo dõi sinh hiệu và tra cứu bệnh án EMR.
        </p>

        <div className="mp-login-pills">
          <span className="mp-login-pill">
            <ShieldCheck size={12} /> Liên thông BHYT & HIS
          </span>
          <span className="mp-login-pill">
            <Lock size={12} /> Bảo mật NĐ 13/2023
          </span>
        </div>
      </div>

      <div className="mp-login-body">
        <div className="mp-login-card">
          <div className="mp-mode-tabs">
            <button
              type="button"
              className={`mp-mode-tab ${authMode === 'password' ? 'active' : ''}`}
              onClick={() => { setAuthMode('password'); setError(''); setSuccessNotice('') }}
            >
              <Lock size={14} /> Tài khoản & Mật khẩu
            </button>
            <button
              type="button"
              className={`mp-mode-tab ${authMode === 'otp' ? 'active' : ''}`}
              onClick={() => { setAuthMode('otp'); setError(''); setSuccessNotice('') }}
            >
              <Phone size={14} /> Mã OTP SĐT
            </button>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '12px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '12px', padding: '10px 12px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successNotice}</span>
            </div>
          )}

          {authMode === 'password' ? (
            <form onSubmit={handlePasswordSubmit}>
              <div className="mp-field-group">
                <label className="mp-field-label">Email, Số điện thoại hoặc Số CCCD</label>
                <div className="mp-input-wrap">
                  <UserRound size={17} className="mp-input-icon" />
                  <input
                    type="text"
                    className="mp-input"
                    placeholder="Nhập Email, SĐT hoặc 12 số CCCD"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="mp-field-group">
                <label className="mp-field-label">Mật khẩu</label>
                <div className="mp-input-wrap">
                  <Lock size={17} className="mp-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="mp-input"
                    placeholder="Nhập mật khẩu của bạn"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="mp-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Hiện/ẩn mật khẩu"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="mp-submit-btn" disabled={isLoggingIn}>
                <span>{isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập ngay'}</span>
                <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="mp-field-group">
                <label className="mp-field-label">Số điện thoại di động</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="mp-input-wrap" style={{ flex: 1 }}>
                    <Phone size={17} className="mp-input-icon" />
                    <input
                      type="tel"
                      className="mp-input"
                      placeholder="Nhập số điện thoại"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    style={{
                      height: '48px',
                      padding: '0 14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#0f766e',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {isSendingOtp ? 'Đang gửi...' : otpSent ? 'Gửi lại' : 'Lấy OTP'}
                  </button>
                </div>
              </div>

              <div id="mp-login-recaptcha-box" />

              {otpSent && (
                <div className="mp-field-group">
                  <label className="mp-field-label">Mã xác thực OTP (6 chữ số)</label>
                  <div className="mp-input-wrap">
                    <ShieldCheck size={17} className="mp-input-icon" />
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className="mp-input"
                      placeholder="Nhập 6 số OTP"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="mp-submit-btn"
                disabled={!otpSent || isVerifyingOtp}
              >
                <span>{isVerifyingOtp ? 'Đang xác thực...' : 'Xác thực & Vào ứng dụng'}</span>
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          <div className="mp-register-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UserPlus size={16} color="#0f766e" /> Chưa có tài khoản bệnh nhân?
              </span>
              <span style={{ fontSize: '10px', fontWeight: 800, background: '#0f766e', color: '#fff', padding: '2px 7px', borderRadius: '999px' }}>
                QUÉT QR CCCD
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#334155', lineHeight: 1.4 }}>
              Đăng ký nhanh bằng thẻ CCCD gắn chip để tự động liên thông hồ sơ bệnh án HIS và thẻ BHYT.
            </p>
            <button type="button" className="mp-register-btn" onClick={onNavigateToRegister}>
              <span>Đăng ký tài khoản Bệnh nhân mới</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 2. MÀN HÌNH LỊCH KHÁM (MOBILE APPOINTMENTS VIEW)
// ============================================================================
interface MobileAppointmentsViewProps {
  appointments: Appointment[]
  doctors?: Array<{ id: number; full_name: string; cchn?: string; department_id?: number }>
  departments?: Department[]
  onOpenBooking: () => void
  onJoinConsultation: (appt: Appointment) => void
  onPayAppointment: (appt: Appointment) => void
  onCancelAppointment?: (appt: Appointment) => void
  onDownloadPdf?: (id: number) => void
  onViewRecord?: (id: number) => void
}

export function MobileAppointmentsView({
  appointments,
  doctors = [],
  departments = [],
  onOpenBooking,
  onJoinConsultation,
  onPayAppointment,
  onCancelAppointment,
  onDownloadPdf,
  onViewRecord
}: MobileAppointmentsViewProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (filterTab === 'upcoming' && !['waiting', 'in_progress', 'confirmed', 'scheduled'].includes(a.status)) return false
      if (filterTab === 'completed' && a.status !== 'completed') return false
      if (filterTab === 'cancelled' && a.status !== 'cancelled') return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchReason = (a.reason || '').toLowerCase().includes(q)
        const matchCode = (a.id.toString()).includes(q)
        const matchDept = (a.department_name || '').toLowerCase().includes(q)
        const docName = doctors.find(d => d.id === a.doctor_id)?.full_name || ''
        const matchDoc = docName.toLowerCase().includes(q)
        if (!matchReason && !matchCode && !matchDept && !matchDoc) return false
      }
      return true
    })
  }, [appointments, filterTab, searchQuery, doctors])

  return (
    <div className="mp-subscreen-body">
      {/* 1. Header Filter Chips */}
      <div className="mp-chips-scroll">
        <button
          type="button"
          className={`mp-chip ${filterTab === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTab('all')}
        >
          Tất cả ({appointments.length})
        </button>
        <button
          type="button"
          className={`mp-chip ${filterTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setFilterTab('upcoming')}
        >
          Sắp khám / Chờ ({appointments.filter(a => ['waiting', 'in_progress', 'confirmed', 'scheduled'].includes(a.status)).length})
        </button>
        <button
          type="button"
          className={`mp-chip ${filterTab === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterTab('completed')}
        >
          Đã khám ({appointments.filter(a => a.status === 'completed').length})
        </button>
        <button
          type="button"
          className={`mp-chip ${filterTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setFilterTab('cancelled')}
        >
          Đã hủy ({appointments.filter(a => a.status === 'cancelled').length})
        </button>
      </div>

      {/* 2. Search */}
      <div className="mp-search-wrap">
        <Search size={16} className="mp-search-icon" />
        <input
          type="text"
          className="mp-search-input"
          placeholder="Tìm theo bác sĩ, chuyên khoa, mã khám..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 3. List of Appointments */}
      {filtered.length === 0 ? (
        <div className="mp-empty-state">
          <div className="mp-empty-icon">
            <CalendarDays size={28} />
          </div>
          <h4 className="mp-empty-title">Chưa có lịch khám nào</h4>
          <p className="mp-empty-desc">
            {searchQuery ? 'Không tìm thấy lượt khám phù hợp với từ khóa.' : 'Đặt lịch khám trực tuyến để được Bác sĩ chuyên khoa tư vấn qua Video Call.'}
          </p>
          <button type="button" className="mp-btn-action mp-btn-primary" onClick={onOpenBooking}>
            <Plus size={16} /> Đặt lịch khám mới ngay
          </button>
        </div>
      ) : (
        filtered.map(a => {
          const doc = doctors.find(d => d.id === a.doctor_id)
          const docName = doc?.full_name || a.doctor_name || `Bác sĩ #${a.doctor_id}`
          const deptName = a.department_name || departments.find(dp => dp.id === a.department_id)?.name || 'Khoa Nội Tổng Quát'
          const isLive = a.status === 'in_progress'
          const isWaiting = a.status === 'waiting'
          const isCompleted = a.status === 'completed'
          const isCancelled = a.status === 'cancelled'
          const isScheduled = a.status === 'scheduled'
          const isPaid = !!a.paid_at || a.payment_status === 'paid'

          return (
            <div key={a.id} className="mp-card">
              <div className="mp-card-top-row">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e' }}>
                  #{a.encounter_code || `LK-${a.id}`}
                </span>
                <span className={`mp-pill ${isLive ? 'teal' : isWaiting ? 'blue' : isCompleted ? 'green' : isCancelled ? 'red' : 'amber'}`}>
                  {isLive ? '● Đang diễn ra' : isWaiting ? 'Đang trong phòng chờ' : isCompleted ? 'Đã hoàn thành' : isCancelled ? 'Đã hủy' : 'Đã lên lịch'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', margin: '8px 0' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f0fdfa', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Stethoscope size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 className="mp-card-title">{docName}</h4>
                  <div className="mp-card-meta">
                    <span>{deptName}</span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} color="#0f766e" />
                      {formatDateTimeVN(a.starts_at)}
                    </span>
                  </div>
                  {a.reason && (
                    <div style={{ fontSize: '12px', color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', marginBottom: '8px' }}>
                      <strong>Lý do khám:</strong> {a.reason}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Viện phí: </span>
                  <strong style={{ color: '#0f172a' }}>{money(a.fee_amount || 150000)}</strong>
                  {a.bhyt_discount ? (
                    <span style={{ color: '#16a34a', marginLeft: '6px', fontWeight: 700 }}>
                      (-{money(a.bhyt_discount)} BHYT)
                    </span>
                  ) : null}
                </div>
                <div>
                  {isPaid ? (
                    <span style={{ color: '#16a34a', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <CheckCircle2 size={13} /> Đã thanh toán
                    </span>
                  ) : (
                    <span style={{ color: '#d97706', fontWeight: 800 }}>
                      Cần thanh toán
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mp-card-actions">
                {!isCompleted && !isCancelled && (
                  <button
                    type="button"
                    className="mp-btn-action mp-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => onJoinConsultation(a)}
                  >
                    {isLive ? <Video size={16} /> : <Clock size={16} />}
                    <span>{isLive ? 'Vào gặp Bác sĩ ngay' : isWaiting ? 'Đang trong phòng chờ' : 'Vào phòng chờ'}</span>
                  </button>
                )}

                {isScheduled && !isPaid && (
                  <button
                    type="button"
                    className="mp-btn-action mp-btn-sky"
                    onClick={() => onPayAppointment(a)}
                  >
                    <CreditCard size={15} /> VietQR
                  </button>
                )}

                {isCompleted && (
                  <>
                    <button
                      type="button"
                      className="mp-btn-action mp-btn-outline"
                      style={{ flex: 1 }}
                      onClick={() => onViewRecord?.(a.id)}
                    >
                      <Eye size={15} /> Xem Bệnh án
                    </button>
                    <button
                      type="button"
                      className="mp-btn-action mp-btn-sky"
                      onClick={() => onDownloadPdf?.(a.id)}
                    >
                      <Download size={15} /> PDF Ký số
                    </button>
                  </>
                )}

                {(isScheduled || a.status === 'confirmed') && onCancelAppointment && (
                  <button
                    type="button"
                    className="mp-btn-action mp-btn-danger-outline"
                    onClick={() => onCancelAppointment(a)}
                  >
                    <X size={14} /> Hủy lịch
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ============================================================================
// 3. MÀN HÌNH ĐƠN THUỐC & TỦ THUỐC (MOBILE PRESCRIPTIONS VIEW)
// ============================================================================
interface MobilePrescriptionsViewProps {
  onDownloadPdf?: (id: number) => void
  onViewRecord?: (id: number) => void
}

export function MobilePrescriptionsView({
  onDownloadPdf,
  onViewRecord
}: MobilePrescriptionsViewProps) {
  const [tab, setTab] = useState<'prescriptions' | 'cabinet'>('prescriptions')
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([])
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [qrModalItem, setQrModalItem] = useState<PatientPrescription | null>(null)
  const [showAddCabinet, setShowAddCabinet] = useState(false)
  const [toast, setToast] = useState('')

  // Form for new cabinet item
  const [newMedName, setNewMedName] = useState('')
  const [newMedDosage, setNewMedDosage] = useState('')
  const [newMedFreq, setNewMedFreq] = useState('')
  const [newMedRemaining, setNewMedRemaining] = useState(30)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const [presData, cabData] = await Promise.all([
          getMyPrescriptions(),
          getMyMedicineCabinet()
        ])
        setPrescriptions(presData)
        setCabinetItems(cabData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleTakeDose(itemId: number) {
    try {
      const res = await logTakeCabinetDose(itemId)
      setCabinetItems(prev => prev.map(c => c.id === itemId ? { ...c, quantity_remaining: res.quantity_remaining, last_taken_at: res.last_taken_at } : c))
      setToast('Đã ghi nhận uống thuốc thành công!')
      setTimeout(() => setToast(''), 2500)
    } catch (err: any) {
      alert(err.message || 'Không thể ghi nhận uống thuốc')
    }
  }

  async function handleAddCabinetItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newMedName.trim()) return
    try {
      const created = await createCabinetItem({
        name: newMedName.trim(),
        dosage: newMedDosage.trim() || '1 viên',
        frequency: newMedFreq.trim() || 'Ngày 2 lần sau ăn',
        schedule_slot: 'morning',
        quantity_remaining: Number(newMedRemaining) || 30,
        total_quantity: Number(newMedRemaining) || 30,
        unit: 'viên',
        status: 'active'
      })
      setCabinetItems([created, ...cabinetItems])
      setShowAddCabinet(false)
      setNewMedName('')
      setNewMedDosage('')
      setNewMedFreq('')
      setToast('Đã thêm thuốc vào Tủ thuốc gia đình!')
      setTimeout(() => setToast(''), 2500)
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm thuốc')
    }
  }

  return (
    <div className="mp-subscreen-body">
      {toast && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}

      {/* Segmented Tabs */}
      <div className="mp-seg-tabs">
        <button
          type="button"
          className={`mp-seg-tab ${tab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setTab('prescriptions')}
        >
          <Pill size={15} /> Đơn thuốc Bác sĩ ({prescriptions.length})
        </button>
        <button
          type="button"
          className={`mp-seg-tab ${tab === 'cabinet' ? 'active' : ''}`}
          onClick={() => setTab('cabinet')}
        >
          <Sun size={15} /> Tủ thuốc Nhắc nhở ({cabinetItems.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Đang tải dữ liệu đơn thuốc...</div>
        </div>
      ) : tab === 'prescriptions' ? (
        prescriptions.length === 0 ? (
          <div className="mp-empty-state">
            <div className="mp-empty-icon"><Pill size={28} /></div>
            <h4 className="mp-empty-title">Chưa có đơn thuốc nào</h4>
            <p className="mp-empty-desc">Sau khi Bác sĩ hoàn thành đợt khám trực tuyến, đơn thuốc điện tử có ký số sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          prescriptions.map(p => (
            <div key={p.appointment_id} className="mp-card">
              <div className="mp-card-top-row">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e' }}>
                  {p.national_code || p.encounter_code || `DT-${p.appointment_id}`}
                </span>
                <span className="mp-pill green">
                  <ShieldCheck size={12} /> {p.is_digitally_signed ? 'Ký số SmartCA' : 'Đơn điện tử'}
                </span>
              </div>

              <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', marginBottom: '2px' }}>
                Bác sĩ: {p.doctor_name}
              </div>
              <div className="mp-card-meta">
                <span>{formatDateVN(p.starts_at)}</span>
                {p.diagnosis && <span>• Chẩn đoán: {p.diagnosis}</span>}
              </div>

              {/* Medicines list */}
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Danh mục thuốc ({p.medications?.length || 0} loại):
                </div>
                {p.medications?.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < (p.medications?.length || 0) - 1 ? '1px solid #e2e8f0' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {idx + 1}. {item.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {item.usage_instructions || item.dosage || 'Uống theo chỉ định'}
                      </div>
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f766e', whiteSpace: 'nowrap' }}>
                      {item.quantity} {item.unit || 'viên'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="mp-card-actions">
                <button
                  type="button"
                  className="mp-btn-action mp-btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setQrModalItem(p)}
                >
                  <QrCode size={15} /> QR Quốc gia
                </button>
                <button
                  type="button"
                  className="mp-btn-action mp-btn-sky"
                  style={{ flex: 1 }}
                  onClick={() => onDownloadPdf?.(p.appointment_id)}
                >
                  <Download size={15} /> Tải PDF
                </button>
              </div>
            </div>
          ))
        )
      ) : (
        /* Cabinet View */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
              Theo dõi uống thuốc hàng ngày
            </span>
            <button
              type="button"
              className="mp-btn-action mp-btn-primary"
              style={{ height: '34px', fontSize: '12px', padding: '0 10px' }}
              onClick={() => setShowAddCabinet(true)}
            >
              <Plus size={14} /> Thêm thuốc
            </button>
          </div>

          {cabinetItems.length === 0 ? (
            <div className="mp-empty-state">
              <div className="mp-empty-icon"><Sun size={28} /></div>
              <h4 className="mp-empty-title">Tủ thuốc đang trống</h4>
              <p className="mp-empty-desc">Thêm các loại thuốc bạn đang sử dụng hàng ngày để nhận thông báo nhắc nhở đúng giờ.</p>
              <button type="button" className="mp-btn-action mp-btn-primary" onClick={() => setShowAddCabinet(true)}>
                <Plus size={15} /> Thêm thuốc vào tủ ngay
              </button>
            </div>
          ) : (
            cabinetItems.map(c => (
              <div key={c.id} className="mp-card">
                <div className="mp-card-top-row">
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>{c.name}</div>
                  <span className={`mp-pill ${c.quantity_remaining <= 5 ? 'red' : 'teal'}`}>
                    Còn {c.quantity_remaining} {c.unit}
                  </span>
                </div>
                <div className="mp-card-meta">
                  <span>Liều dùng: {c.dosage}</span>
                  <span>•</span>
                  <span>{c.frequency}</span>
                </div>
                {c.last_taken_at && (
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginBottom: '8px' }}>
                    ✓ Lần uống gần nhất: {formatDateTimeVN(c.last_taken_at)}
                  </div>
                )}
                <div className="mp-card-actions">
                  <button
                    type="button"
                    className="mp-btn-action mp-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleTakeDose(c.id)}
                  >
                    <Check size={15} /> Đã uống liều hôm nay
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QR Modal */}
      {qrModalItem && (
        <div className="mp-bottom-sheet-backdrop" onClick={() => setQrModalItem(null)}>
          <div className="mp-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="mp-sheet-handle" />
            <div className="mp-sheet-head">
              <h3 className="mp-sheet-title"><QrCode size={18} /> Mã QR Đơn Thuốc Quốc Gia</h3>
              <button type="button" className="mp-sheet-close" onClick={() => setQrModalItem(null)}><X size={16} /></button>
            </div>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ display: 'inline-block', padding: '16px', background: '#fff', border: '2px solid #0f766e', borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)' }}>
                <QrCode size={180} color="#0f766e" />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '12px' }}>
                Mã đơn: {qrModalItem.national_code || qrModalItem.encounter_code || `DT-${qrModalItem.appointment_id}`}
              </div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', lineHeight: 1.4 }}>
                Đưa mã QR này cho bất kỳ nhà thuốc đạt chuẩn GPP trên toàn quốc để mua thuốc theo đơn điện tử.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Cabinet Item Bottom Sheet */}
      {showAddCabinet && (
        <div className="mp-bottom-sheet-backdrop" onClick={() => setShowAddCabinet(false)}>
          <div className="mp-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="mp-sheet-handle" />
            <div className="mp-sheet-head">
              <h3 className="mp-sheet-title"><Plus size={18} /> Thêm Thuốc Vào Tủ Nhắc Nhở</h3>
              <button type="button" className="mp-sheet-close" onClick={() => setShowAddCabinet(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddCabinetItem}>
              <div className="mp-field-group">
                <label className="mp-field-label">Tên thuốc</label>
                <input
                  type="text"
                  className="mp-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="Ví dụ: Amlodipine 5mg, Panadol..."
                  value={newMedName}
                  onChange={e => setNewMedName(e.target.value)}
                  required
                />
              </div>
              <div className="mp-field-group">
                <label className="mp-field-label">Liều dùng</label>
                <input
                  type="text"
                  className="mp-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="Ví dụ: 1 viên, 2 giọt..."
                  value={newMedDosage}
                  onChange={e => setNewMedDosage(e.target.value)}
                />
              </div>
              <div className="mp-field-group">
                <label className="mp-field-label">Tần suất & Cách dùng</label>
                <input
                  type="text"
                  className="mp-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="Ví dụ: Ngày 1 lần sau ăn sáng"
                  value={newMedFreq}
                  onChange={e => setNewMedFreq(e.target.value)}
                />
              </div>
              <div className="mp-field-group">
                <label className="mp-field-label">Số lượng còn lại trong vỉ/hộp</label>
                <input
                  type="number"
                  className="mp-input"
                  style={{ paddingLeft: '14px' }}
                  value={newMedRemaining}
                  onChange={e => setNewMedRemaining(Number(e.target.value))}
                />
              </div>
              <button type="submit" className="mp-btn-action mp-btn-primary" style={{ width: '100%', height: '46px', marginTop: '10px' }}>
                Lưu vào Tủ thuốc
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 4. MÀN HÌNH XÉT NGHIỆM CẬN LÂM SÀNG LIS (MOBILE PARACLINICAL VIEW)
// ============================================================================
export function MobileParaclinicalView() {
  const [labData, setLabData] = useState<LabResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [aiReport, setAiReport] = useState<LabReport | null>(null)
  const [aiResult, setAiResult] = useState<LabInterpretResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await getMyLabResults()
        setLabData(data)
        if (data?.reports?.length > 0) {
          setExpandedReportId(data.reports[0].report_id)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredReports = useMemo(() => {
    if (!labData?.reports) return []
    return labData.reports.filter(r => {
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false
      return true
    })
  }, [labData, categoryFilter])

  async function handleExplainAI(report: LabReport) {
    setAiReport(report)
    setAiResult(null)
    setAiLoading(true)
    try {
      const items = report.indicators.map(ind => ({
        test_name: ind.name,
        code: ind.code,
        value: ind.value,
        unit: ind.unit,
        ref_range: ind.ref_range,
        flag: ind.flag
      }))
      const res = await interpretLabResults(items, report.conclusion)
      setAiResult(res)
    } catch (err: any) {
      alert(err.message || 'Không thể gọi AI giải thích lúc này')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="mp-subscreen-body">
      {/* Category Chips */}
      <div className="mp-chips-scroll">
        <button
          type="button"
          className={`mp-chip ${categoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('all')}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`mp-chip ${categoryFilter === 'biochemistry' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('biochemistry')}
        >
          Sinh hóa máu
        </button>
        <button
          type="button"
          className={`mp-chip ${categoryFilter === 'hematology' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('hematology')}
        >
          Huyết học
        </button>
        <button
          type="button"
          className={`mp-chip ${categoryFilter === 'urinalysis' ? 'active' : ''}`}
          onClick={() => setCategoryFilter('urinalysis')}
        >
          Nước tiểu
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Đang kết nối hệ thống LIS bệnh viện...</div>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="mp-empty-state">
          <div className="mp-empty-icon"><FlaskConical size={28} /></div>
          <h4 className="mp-empty-title">Chưa có kết quả xét nghiệm</h4>
          <p className="mp-empty-desc">Hệ thống sẽ tự động đồng bộ kết quả xét nghiệm khi phòng LIS hoàn thành phân tích mẫu.</p>
        </div>
      ) : (
        filteredReports.map(rep => {
          const isExpanded = expandedReportId === rep.report_id
          const abnormalCount = rep.indicators.filter(i => i.flag === 'HIGH' || i.flag === 'LOW').length

          return (
            <div key={rep.report_id} className="mp-card">
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => setExpandedReportId(isExpanded ? null : rep.report_id)}
              >
                <div className="mp-card-top-row">
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e' }}>
                    {rep.report_id}
                  </span>
                  <span className={`mp-pill ${abnormalCount > 0 ? 'red' : 'green'}`}>
                    {abnormalCount > 0 ? `${abnormalCount} chỉ số cần lưu ý` : 'Tất cả bình thường'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 className="mp-card-title">{rep.title}</h4>
                    <div className="mp-card-meta">
                      <span>{rep.result_at ? formatDateTimeVN(rep.result_at) : 'Vừa cập nhật'}</span>
                      {rep.doctor_order && <span>• BS: {rep.doctor_order}</span>}
                    </div>
                  </div>
                  <ChevronDown
                    size={20}
                    color="#64748b"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                  {rep.indicators.map((ind, i) => (
                    <div key={i} className="mp-indicator-item">
                      <div className="mp-ind-head">
                        <span className="mp-ind-name">{ind.name}</span>
                        <div className="mp-ind-val-box">
                          <span className={`mp-ind-val ${ind.flag}`}>
                            {ind.value}
                          </span>
                          <span className="mp-ind-unit">{ind.unit}</span>
                        </div>
                      </div>
                      <div className="mp-ind-range-sub">
                        Khoảng tham chiếu: {ind.ref_range || 'Bình thường'}
                      </div>
                      <div className="mp-range-track">
                        <div className="mp-range-safe-zone" style={{ left: '25%', width: '50%' }} />
                        <div
                          className={`mp-range-pin ${ind.flag}`}
                          style={{ left: ind.flag === 'HIGH' ? '88%' : ind.flag === 'LOW' ? '12%' : '50%' }}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="mp-card-actions" style={{ marginTop: '12px' }}>
                    <button
                      type="button"
                      className="mp-btn-action mp-btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => handleExplainAI(rep)}
                    >
                      <Sparkles size={16} /> Bác sĩ AI MedGemma giải thích kết quả
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}

      {/* AI Interpretation Modal */}
      {aiReport && (
        <div className="mp-bottom-sheet-backdrop" onClick={() => setAiReport(null)}>
          <div className="mp-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="mp-sheet-handle" />
            <div className="mp-sheet-head">
              <h3 className="mp-sheet-title"><Sparkles size={18} color="#0f766e" /> AI Diễn Giải Kết Quả</h3>
              <button type="button" className="mp-sheet-close" onClick={() => setAiReport(null)}><X size={16} /></button>
            </div>
            {aiLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <RefreshCw size={26} className="spin-icon" style={{ margin: '0 auto 10px', color: '#0f766e' }} />
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>AI MedGemma đang phân tích các chỉ số xét nghiệm...</div>
                <small style={{ color: '#64748b' }}>Đang tổng hợp khuyến nghị dinh dưỡng và lối sống</small>
              </div>
            ) : aiResult ? (
              <div>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#166534', marginBottom: '4px' }}>Tóm tắt tổng quan:</div>
                  <div style={{ fontSize: '13px', color: '#14532d', lineHeight: 1.45 }}>{aiResult.patient_friendly_summary}</div>
                </div>

                {aiResult.lifestyle_advice && aiResult.lifestyle_advice.length > 0 && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af', marginBottom: '6px' }}>Lời khuyên từ Bác sĩ AI:</div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#1e3a8a', lineHeight: 1.5 }}>
                      {aiResult.lifestyle_advice.map((rec: string, idx: number) => (
                        <li key={idx} style={{ marginBottom: '3px' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                  * Kết quả phân tích mang tính tham khảo, vui lòng trao đổi trực tiếp với Bác sĩ phụ trách.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 5. MÀN HÌNH CHẨN ĐOÁN HÌNH ẢNH PACS (MOBILE PACS VIEW)
// ============================================================================
export function MobilePacsView() {
  const [pacsData, setPacsData] = useState<PACSStudiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const data = await getMyPacsStudies()
        setPacsData(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="mp-subscreen-body">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Đang tải phim chụp PACS...</div>
        </div>
      ) : !pacsData?.studies || pacsData.studies.length === 0 ? (
        <div className="mp-empty-state">
          <div className="mp-empty-icon"><ScanLine size={28} /></div>
          <h4 className="mp-empty-title">Chưa có dữ liệu hình ảnh PACS</h4>
          <p className="mp-empty-desc">Các ca chụp X-quang, CT, MRI, Siêu âm sẽ tự động liên thông từ máy chụp của bệnh viện.</p>
        </div>
      ) : (
        pacsData.studies.map(study => (
          <div key={study.study_id} className="mp-card">
            <div className="mp-card-top-row">
              <span className="mp-pill blue">{study.modality}</span>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>{formatDateVN(study.date)}</span>
            </div>

            <h4 className="mp-card-title">{study.description || study.modality_name || 'Chụp X-quang kỹ thuật số'}</h4>
            <div className="mp-card-meta">
              <span>Bác sĩ CĐHA: {study.radiologist || 'Khoa Chẩn Đoán Hình Ảnh'}</span>
            </div>

            {study.viewer_url && (
              <div
                style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000', marginBottom: '10px', cursor: 'pointer' }}
                onClick={() => setFullscreenImage(study.viewer_url)}
              >
                <img
                  src={study.viewer_url}
                  alt={study.description}
                  style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block' }}
                />
                <button
                  type="button"
                  style={{ position: 'absolute', right: '10px', bottom: '10px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Maximize2 size={13} /> Phóng to
                </button>
              </div>
            )}

            {study.findings && (
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', fontSize: '12.5px', color: '#334155', lineHeight: 1.45, marginBottom: '8px' }}>
                <strong>Kết luận:</strong> {study.findings}
              </div>
            )}
          </div>
        ))
      )}

      {/* Fullscreen Viewer */}
      {fullscreenImage && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setFullscreenImage(null)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
            <img src={fullscreenImage} alt="DICOM Study" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 6. MÀN HÌNH SINH HIỆU & THIẾT BỊ BLE (MOBILE VITALS VIEW)
// ============================================================================
interface MobileVitalsViewProps {
  user: User
  rpmVitals: RPMVitalItem[]
  onRefreshVitals?: () => void
  onOpenBleScan?: () => void
}

export function MobileVitalsView({
  user,
  rpmVitals,
  onRefreshVitals,
  onOpenBleScan
}: MobileVitalsViewProps) {
  const [showManualModal, setShowManualModal] = useState(false)
  const [systolic, setSystolic] = useState('')
  const [diastolic, setDiastolic] = useState('')
  const [pulse, setPulse] = useState('')
  const [spo2, setSpo2] = useState('')
  const [glucose, setGlucose] = useState('')
  const [temp, setTemp] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSaveVitals(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await recordRPMVitals({
        patient_id: user.id,
        device_type: 'multi_vital_monitor',
        device_name: 'Nhập thủ công tại nhà',
        systolic: systolic ? Number(systolic) : undefined,
        diastolic: diastolic ? Number(diastolic) : undefined,
        pulse: pulse ? Number(pulse) : undefined,
        spo2_percent: spo2 ? Number(spo2) : undefined,
        glucose_value: glucose ? Number(glucose) : undefined,
        temperature_celsius: temp ? Number(temp) : undefined,
        weight_kg: weight ? Number(weight) : undefined,
        height_cm: height ? Number(height) : undefined,
        connection_method: 'manual_entry'
      })
      setShowManualModal(false)
      onRefreshVitals?.()
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu sinh hiệu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mp-subscreen-body">
      {/* Bluetooth Scanner Banner */}
      {onOpenBleScan && (
        <button
          type="button"
          onClick={onOpenBleScan}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #0f766e 0%, #0284c7 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bluetooth size={20} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 800 }}>Quét Thiết Bị Bluetooth (BLE)</div>
              <div style={{ fontSize: '11px', opacity: 0.9 }}>Kết nối Omron, Accu-Chek, SpO2, Cân điện tử</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </button>
      )}

      {/* Action Buttons Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
        <button
          type="button"
          className="mp-btn-action mp-btn-primary"
          onClick={() => setShowManualModal(true)}
        >
          <Plus size={16} /> Ghi nhận số đo
        </button>
        <button
          type="button"
          className="mp-btn-action mp-btn-sky"
          onClick={onRefreshVitals}
        >
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>

      {/* History Timeline */}
      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
        Nhật ký đo sinh hiệu tại nhà
      </div>

      {rpmVitals.length === 0 ? (
        <div className="mp-empty-state">
          <div className="mp-empty-icon"><Activity size={28} /></div>
          <h4 className="mp-empty-title">Chưa có bản ghi sinh hiệu nào</h4>
          <p className="mp-empty-desc">Bấm nút "Ghi nhận số đo" để lưu chỉ số huyết áp, nhịp tim, đường huyết và liên thông bệnh án.</p>
        </div>
      ) : (
        rpmVitals.map(v => (
          <div key={v.id} className="mp-card">
            <div className="mp-card-top-row">
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                {formatDateTimeVN(v.measured_at)}
              </span>
              <span className="mp-pill teal">
                {v.connection_method === 'camera_ppg' ? '📷 Camera PPG' : v.connection_method === 'bluetooth_ble' ? '📱 Bluetooth BLE' : '✍️ Tự nhập'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', margin: '8px 0' }}>
              {v.systolic && v.diastolic ? (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Huyết áp</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{v.systolic}/{v.diastolic}</div>
                </div>
              ) : null}
              {v.pulse ? (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Nhịp tim</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{v.pulse} bpm</div>
                </div>
              ) : null}
              {v.spo2_percent ? (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>SpO2</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{v.spo2_percent}%</div>
                </div>
              ) : null}
              {v.glucose_value ? (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Đường huyết</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{v.glucose_value}</div>
                </div>
              ) : null}
              {v.temperature_celsius ? (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Thân nhiệt</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{v.temperature_celsius}°C</div>
                </div>
              ) : null}
              {v.weight_kg ? (
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Cân nặng</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{v.weight_kg} kg</div>
                </div>
              ) : null}
            </div>
          </div>
        ))
      )}

      {/* Manual Entry Sheet */}
      {showManualModal && (
        <div className="mp-bottom-sheet-backdrop" onClick={() => setShowManualModal(false)}>
          <div className="mp-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="mp-sheet-handle" />
            <div className="mp-sheet-head">
              <h3 className="mp-sheet-title"><Activity size={18} color="#0f766e" /> Nhập Chỉ Số Sinh Hiệu</h3>
              <button type="button" className="mp-sheet-close" onClick={() => setShowManualModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveVitals}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mp-field-group">
                  <label className="mp-field-label">Huyết áp tâm thu (mmHg)</label>
                  <input type="number" className="mp-input" style={{ paddingLeft: '12px' }} placeholder="120" value={systolic} onChange={e => setSystolic(e.target.value)} />
                </div>
                <div className="mp-field-group">
                  <label className="mp-field-label">Tâm trương (mmHg)</label>
                  <input type="number" className="mp-input" style={{ paddingLeft: '12px' }} placeholder="80" value={diastolic} onChange={e => setDiastolic(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mp-field-group">
                  <label className="mp-field-label">Nhịp tim (BPM)</label>
                  <input type="number" className="mp-input" style={{ paddingLeft: '12px' }} placeholder="75" value={pulse} onChange={e => setPulse(e.target.value)} />
                </div>
                <div className="mp-field-group">
                  <label className="mp-field-label">Nồng độ SpO2 (%)</label>
                  <input type="number" className="mp-input" style={{ paddingLeft: '12px' }} placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="mp-field-group">
                  <label className="mp-field-label">Đường huyết (mmol/L)</label>
                  <input type="number" step="0.1" className="mp-input" style={{ paddingLeft: '12px' }} placeholder="5.6" value={glucose} onChange={e => setGlucose(e.target.value)} />
                </div>
                <div className="mp-field-group">
                  <label className="mp-field-label">Thân nhiệt (°C)</label>
                  <input type="number" step="0.1" className="mp-input" style={{ paddingLeft: '12px' }} placeholder="36.5" value={temp} onChange={e => setTemp(e.target.value)} />
                </div>
              </div>
              <button type="submit" className="mp-btn-action mp-btn-primary" style={{ width: '100%', height: '46px', marginTop: '12px' }} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu chỉ số sinh hiệu'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 7. MÀN HÌNH BỆNH ÁN ĐIỆN TỬ EMR (MOBILE RECORDS VIEW)
// ============================================================================
interface MobileRecordsViewProps {
  appointments: Appointment[]
  doctors?: Array<{ id: number; full_name: string }>
  onViewRecord?: (id: number) => void
  onDownloadPdf?: (id: number) => void
}

export function MobileRecordsView({
  appointments,
  doctors = [],
  onViewRecord,
  onDownloadPdf
}: MobileRecordsViewProps) {
  const completed = appointments.filter(a => a.status === 'completed')

  return (
    <div className="mp-subscreen-body">
      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
        Lịch sử khám bệnh & Bệnh án điện tử EMR
      </div>

      {completed.length === 0 ? (
        <div className="mp-empty-state">
          <div className="mp-empty-icon"><FileText size={28} /></div>
          <h4 className="mp-empty-title">Chưa có bệnh án nào</h4>
          <p className="mp-empty-desc">Sau khi bạn hoàn thành buổi khám với Bác sĩ, toàn bộ hồ sơ chẩn đoán ICD-10 và đơn thuốc ký số sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        completed.map(a => {
          const docName = doctors.find(d => d.id === a.doctor_id)?.full_name || a.doctor_name || `Bác sĩ #${a.doctor_id}`
          return (
            <div key={a.id} className="mp-card">
              <div className="mp-card-top-row">
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e' }}>
                  #{a.encounter_code || `BA-${a.id}`}
                </span>
                <span className="mp-pill green">
                  <ShieldCheck size={12} /> Đã ký số PKI
                </span>
              </div>
              <h4 className="mp-card-title">{docName}</h4>
              <div className="mp-card-meta">
                <span>{formatDateTimeVN(a.starts_at)}</span>
                {a.department_name && <span>• {a.department_name}</span>}
              </div>
              {a.reason && (
                <div style={{ fontSize: '12.5px', color: '#334155', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', marginBottom: '10px' }}>
                  <strong>Lý do khám:</strong> {a.reason}
                </div>
              )}
              <div className="mp-card-actions">
                <button
                  type="button"
                  className="mp-btn-action mp-btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => onViewRecord?.(a.id)}
                >
                  <Eye size={15} /> Xem chi tiết
                </button>
                <button
                  type="button"
                  className="mp-btn-action mp-btn-sky"
                  onClick={() => onDownloadPdf?.(a.id)}
                >
                  <Download size={15} /> Tải PDF
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ============================================================================
// 8. MÀN HÌNH VIỆN PHÍ & VIETQR (MOBILE PAYMENTS VIEW)
// ============================================================================
interface MobilePaymentsViewProps {
  appointments: Appointment[]
  onPayAppointment: (appt: Appointment) => void
}

export function MobilePaymentsView({
  appointments,
  onPayAppointment
}: MobilePaymentsViewProps) {
  const unpaid = appointments.filter(a => a.status === 'scheduled' && !a.paid_at)
  const paid = appointments.filter(a => !!a.paid_at || a.payment_status === 'paid')

  return (
    <div className="mp-subscreen-body">
      {/* Policy banner */}
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', padding: '12px 14px', marginBottom: '14px', fontSize: '12.5px', color: '#166534', lineHeight: 1.45 }}>
        <strong>💰 Cam kết hoàn tiền 100%:</strong> Nếu hủy lịch trước giờ khám, viện phí sẽ được hoàn tự động 100% qua Napas 247/VietQR.
      </div>

      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
        Lịch khám cần thanh toán ({unpaid.length})
      </div>

      {unpaid.length === 0 ? (
        <div className="mp-card" style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
          <CheckCircle2 size={32} color="#16a34a" style={{ margin: '0 auto 8px' }} />
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Tất cả viện phí đã được thanh toán</div>
          <small>Không có khoản thanh toán nào đang chờ xử lý.</small>
        </div>
      ) : (
        unpaid.map(a => (
          <div key={a.id} className="mp-card">
            <div className="mp-card-top-row">
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e' }}>#{a.encounter_code || `LK-${a.id}`}</span>
              <span className="mp-pill amber">Cần thanh toán</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              Viện phí tư vấn khám bệnh từ xa
            </div>
            <div className="mp-card-meta">
              <span>Ngày khám: {formatDateTimeVN(a.starts_at)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 12px' }}>
              <span style={{ fontSize: '13px', color: '#64748b' }}>Số tiền cần thanh toán:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f766e' }}>
                {money(a.patient_pay_amount || a.fee_amount || 150000)}
              </span>
            </div>
            <button
              type="button"
              className="mp-btn-action mp-btn-primary"
              style={{ width: '100%', height: '44px' }}
              onClick={() => onPayAppointment(a)}
            >
              <CreditCard size={16} /> Quét mã VietQR chuyển khoản
            </button>
          </div>
        ))
      )}

      {paid.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
            Biên lai đã thanh toán ({paid.length})
          </div>
          {paid.map(a => (
            <div key={a.id} className="mp-card">
              <div className="mp-card-top-row">
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>#{a.encounter_code || `LK-${a.id}`}</span>
                <span className="mp-pill green">✓ Đã thanh toán</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '12.5px', color: '#475569' }}>{formatDateTimeVN(a.starts_at)}</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{money(a.fee_amount || 150000)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 9. MÀN HÌNH HỒ SƠ CÁ NHÂN & GIA ĐÌNH (MOBILE PROFILE VIEW)
// ============================================================================
interface MobileProfileViewProps {
  user: User
  onUpdateUser?: (u: User) => void
  onLogout: () => void
  initialTab?: 'profile' | 'family' | 'insurance'
}

export function MobileProfileView({
  user,
  onUpdateUser,
  onLogout,
  initialTab = 'profile'
}: MobileProfileViewProps) {
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberItem[]>([])
  const [showAddFamily, setShowAddFamily] = useState(false)
  const [famName, setFamName] = useState('')
  const [famRel, setFamRel] = useState('Con')
  const [famDob, setFamDob] = useState('')

  useEffect(() => {
    async function loadFamily() {
      try {
        const fam = await getFamilyMembers()
        setFamilyMembers(fam)
      } catch (err) {
        console.error(err)
      }
    }
    loadFamily()
  }, [])

  async function handleAddFamily(e: React.FormEvent) {
    e.preventDefault()
    if (!famName.trim()) return
    try {
      const created = await createFamilyMember({
        full_name: famName.trim(),
        relationship: famRel,
        date_of_birth: famDob || undefined
      })
      setFamilyMembers([...familyMembers, created])
      setShowAddFamily(false)
      setFamName('')
    } catch (err: any) {
      alert(err.message || 'Lỗi thêm người thân')
    }
  }

  async function handleDeleteFamily(id: number) {
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ người thân này?')) return
    try {
      await deleteFamilyMember(id)
      setFamilyMembers(familyMembers.filter(f => f.id !== id))
    } catch (err: any) {
      alert(err.message || 'Lỗi xóa')
    }
  }

  return (
    <div className="mp-subscreen-body">
      {/* 1. Profile Hero Card */}
      <div className="mp-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
        <div className="mp-avatar-pill" style={{ width: '56px', height: '56px', fontSize: '22px' }}>
          {user.avatar_url ? <img src={user.avatar_url} alt={user.full_name} /> : (user.full_name || 'B').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 3px', color: '#0f172a' }}>{user.full_name}</h3>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Mã BN: {(user as any).external_patient_id || `HIS-CC-${String(user.id).padStart(4, '0')}`}
          </div>
          <div style={{ fontSize: '12px', color: '#0f766e', fontWeight: 700, marginTop: '2px' }}>
            {user.phone_number || user.email}
          </div>
        </div>
      </div>

      {/* 2. Digital BHYT E-Card */}
      <div className="mp-ecard" style={{ margin: '14px 0' }}>
        <div className="mp-ecard-top">
          <div className="mp-ecard-badges">
            <span className="mp-ecard-badge">BẢO HIỂM Y TẾ VIỆT NAM</span>
            <span className="mp-ecard-badge"><ShieldCheck size={12} /> Hợp lệ 80%</span>
          </div>
        </div>
        <div style={{ fontSize: '12px', opacity: 0.85 }}>Số thẻ BHYT</div>
        <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '1px', margin: '2px 0 10px' }}>
          {user.bhyt_code || 'GD 4 79 1234567890'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', opacity: 0.9 }}>
          <span>Nơi ĐKKCB: Bệnh viện Đa Khoa</span>
          <span>Hạn dùng: 31/12/2026</span>
        </div>
      </div>

      {/* 3. Personal Info Section */}
      <div className="mp-card">
        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
          Thông tin hành chính
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12.5px' }}>
          <div><span style={{ color: '#64748b' }}>Giới tính:</span> <strong>{user.gender || 'Chưa cập nhật'}</strong></div>
          <div><span style={{ color: '#64748b' }}>Ngày sinh:</span> <strong>{user.date_of_birth ? formatDateVN(user.date_of_birth) : 'Chưa cập nhật'}</strong></div>
          <div><span style={{ color: '#64748b' }}>CCCD/ĐDCN:</span> <strong>{user.identity_card ? `***${user.identity_card.slice(-4)}` : 'Chưa cập nhật'}</strong></div>
          <div><span style={{ color: '#64748b' }}>VNeID:</span> <strong style={{ color: '#0f766e' }}>Định danh Mức 2</strong></div>
        </div>
      </div>

      {/* 4. Family Members Section */}
      <div className="mp-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
            Hồ sơ người thân ({familyMembers.length})
          </span>
          <button
            type="button"
            className="mp-btn-action mp-btn-outline"
            style={{ height: '32px', fontSize: '11.5px', padding: '0 8px' }}
            onClick={() => setShowAddFamily(true)}
          >
            <Plus size={13} /> Thêm người thân
          </button>
        </div>

        {familyMembers.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', padding: '12px 0' }}>
            Chưa có người thân nào. Thêm bố mẹ hoặc con cái để đặt khám hộ dễ dàng.
          </div>
        ) : (
          familyMembers.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{f.full_name}</div>
                <div style={{ fontSize: '11.5px', color: '#64748b' }}>Quan hệ: {f.relationship} {f.date_of_birth ? `• ${formatDateVN(f.date_of_birth)}` : ''}</div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteFamily(f.id)}
                style={{ background: 'transparent', border: 'none', color: '#dc2626', padding: '6px', cursor: 'pointer' }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* 5. Logout Card */}
      <div className="mp-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Đăng xuất khỏi ứng dụng</div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>Đảm bảo an toàn bảo mật thông tin y tế</div>
        </div>
        <button
          type="button"
          className="mp-btn-action mp-btn-danger-outline"
          onClick={onLogout}
        >
          <LogOut size={15} /> Thoát
        </button>
      </div>

      {/* Add Family Sheet */}
      {showAddFamily && (
        <div className="mp-bottom-sheet-backdrop" onClick={() => setShowAddFamily(false)}>
          <div className="mp-bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="mp-sheet-handle" />
            <div className="mp-sheet-head">
              <h3 className="mp-sheet-title"><Users size={18} /> Thêm Hồ Sơ Người Thân</h3>
              <button type="button" className="mp-sheet-close" onClick={() => setShowAddFamily(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddFamily}>
              <div className="mp-field-group">
                <label className="mp-field-label">Họ và tên người thân</label>
                <input
                  type="text"
                  className="mp-input"
                  style={{ paddingLeft: '12px' }}
                  placeholder="Nhập họ tên đầy đủ"
                  value={famName}
                  onChange={e => setFamName(e.target.value)}
                  required
                />
              </div>
              <div className="mp-field-group">
                <label className="mp-field-label">Mối quan hệ</label>
                <select
                  className="mp-input"
                  style={{ paddingLeft: '12px' }}
                  value={famRel}
                  onChange={e => setFamRel(e.target.value)}
                >
                  <option value="Con">Con</option>
                  <option value="Bố/Mẹ">Bố / Mẹ</option>
                  <option value="Vợ/Chồng">Vợ / Chồng</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="mp-field-group">
                <label className="mp-field-label">Ngày sinh (nếu có)</label>
                <input
                  type="date"
                  className="mp-input"
                  style={{ paddingLeft: '12px' }}
                  value={famDob}
                  onChange={e => setFamDob(e.target.value)}
                />
              </div>
              <button type="submit" className="mp-btn-action mp-btn-primary" style={{ width: '100%', height: '46px', marginTop: '10px' }}>
                Lưu hồ sơ người thân
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 10. MAIN MOBILE PATIENT SHELL
// ============================================================================
interface MobilePatientShellProps {
  user: User
  view: string
  setView: (v: string) => void
  appointments: Appointment[]
  doctors?: Array<{ id: number; full_name: string; cchn?: string; department_id?: number }>
  departments?: Department[]
  rpmVitals: RPMVitalItem[]
  onOpenBooking: () => void
  onJoinConsultation: (appt: Appointment) => void
  onPayAppointment: (appt: Appointment) => void
  onCancelAppointment?: (appt: Appointment) => void
  onDownloadPdf?: (id: number) => void
  onRefreshVitals?: () => void
  onUpdateUser?: (u: User) => void
  onLogout: () => void
  children?: React.ReactNode
}

const SUBSCREEN_TITLES: Record<string, string> = {
  overview: 'Trang chủ',
  appointments: 'Lịch khám của tôi',
  prescriptions: 'Đơn thuốc & Tủ thuốc',
  paraclinical: 'Xét nghiệm Cận lâm sàng',
  pacs: 'Chẩn đoán hình ảnh PACS',
  records: 'Hồ sơ Bệnh án EMR',
  family: 'Hồ sơ Sức khỏe Gia đình',
  devices: 'Thiết bị Y tế Bluetooth',
  vitals: 'Đo & Theo dõi Sinh hiệu',
  insurance: 'Thẻ BHYT & Giám định',
  payments: 'Thanh toán Viện phí VietQR',
  profile: 'Hồ sơ Cá nhân'
}

export function MobilePatientShell({
  user,
  view,
  setView,
  appointments,
  doctors = [],
  departments = [],
  rpmVitals,
  onOpenBooking,
  onJoinConsultation,
  onPayAppointment,
  onCancelAppointment,
  onDownloadPdf,
  onRefreshVitals,
  onUpdateUser,
  onLogout,
  children
}: MobilePatientShellProps) {
  const isHome = view === 'overview'

  const upcomingAppointments = appointments.filter(a =>
    ['waiting', 'in_progress', 'confirmed', 'scheduled'].includes(a.status)
  )
  const nextAppt = upcomingAppointments[0] || null

  // Latest real vitals (zero demo data)
  const latestBpLog = rpmVitals.find(v => v.systolic && v.diastolic)
  const bpDisplay = latestBpLog ? `${latestBpLog.systolic}/${latestBpLog.diastolic}` : null
  const latestPulseLog = rpmVitals.find(v => v.pulse)
  const pulseDisplay = latestPulseLog?.pulse || null
  const latestSpo2Log = rpmVitals.find(v => v.spo2_percent)
  const spo2Display = latestSpo2Log?.spo2_percent || null
  const latestGlucoseLog = rpmVitals.find(v => v.glucose_value)
  const glucoseDisplay = latestGlucoseLog?.glucose_value || null
  const latestTempLog = rpmVitals.find(v => v.temperature_celsius)
  const tempDisplay = latestTempLog?.temperature_celsius || null
  const latestWeightLog = rpmVitals.find(v => v.weight_kg)
  const weightDisplay = latestWeightLog?.weight_kg || null
  const latestHeightLog = rpmVitals.find(v => v.height_cm)
  const heightDisplay = latestHeightLog?.height_cm || null
  const bmiDisplay =
    weightDisplay && heightDisplay && heightDisplay > 0
      ? (Number(weightDisplay) / Math.pow(Number(heightDisplay) / 100, 2)).toFixed(1)
      : null

  const quickTiles = [
    { id: 'book', label: 'Đặt lịch khám', icon: Plus, bg: '#f0fdfa', color: '#0f766e', action: onOpenBooking },
    { id: 'prescriptions', label: 'Đơn & Tủ thuốc', icon: Pill, bg: '#eff6ff', color: '#0284c7', action: () => setView('prescriptions') },
    { id: 'vitals', label: 'Đo Sinh hiệu', icon: Activity, bg: '#fef2f2', color: '#dc2626', action: () => setView('vitals') },
    { id: 'devices', label: 'Thiết bị BLE', icon: Bluetooth, bg: '#f0fdf4', color: '#16a34a', action: () => setView('devices') },
    { id: 'paraclinical', label: 'Xét nghiệm LIS', icon: FlaskConical, bg: '#fdf4ff', color: '#9333ea', action: () => setView('paraclinical') },
    { id: 'pacs', label: 'Phim PACS AI', icon: ScanLine, bg: '#fff7ed', color: '#ea580c', action: () => setView('pacs') },
    { id: 'records', label: 'Bệnh án EMR', icon: FileText, bg: '#f0f9ff', color: '#0369a1', action: () => setView('records') },
    { id: 'family', label: 'Hồ sơ Gia đình', icon: Users, bg: '#fefce8', color: '#ca8a04', action: () => setView('family') }
  ]

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 11) return 'Chào buổi sáng'
    if (h < 14) return 'Chào buổi trưa'
    if (h < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  return (
    <div className="mp-app-shell">
      {/* 1. Sticky Top Mobile Bar */}
      <header className="mp-top-bar">
        <div className="mp-top-left">
          {!isHome ? (
            <button
              type="button"
              className="mp-back-btn"
              onClick={() => setView('overview')}
              aria-label="Quay lại Trang chủ"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <div className="mp-avatar-pill" onClick={() => setView('profile')}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} />
              ) : (
                (user.full_name || 'B').charAt(0).toUpperCase()
              )}
            </div>
          )}

          <div className="mp-top-titles" onClick={() => isHome && setView('profile')}>
            <div className="mp-top-greeting">
              {isHome ? `${getGreeting()},` : 'CareConnect Bệnh Nhân'}
            </div>
            <div className="mp-top-name">
              {isHome ? user.full_name : (SUBSCREEN_TITLES[view] || 'Chi tiết')}
            </div>
          </div>
        </div>

        <div className="mp-top-right">
          <button type="button" className="mp-top-book-btn" onClick={onOpenBooking}>
            <Plus size={14} /> Đặt khám
          </button>

          <NotificationCenter
            userRole="patient"
            onNavigate={(url) => {
              if (url.includes('appointments') || url.includes('booking')) setView('appointments')
              else if (url.includes('prescriptions')) setView('prescriptions')
              else if (url.includes('paraclinical') || url.includes('labs')) setView('paraclinical')
              else if (url.includes('profile')) setView('profile')
            }}
          />
        </div>
      </header>

      {/* 2. Main Mobile Content Router */}
      {view === 'overview' && (
        <main className="mp-home-container">
          {/* A. Digital Health & BHYT E-Card */}
          <section className="mp-ecard">
            <div className="mp-ecard-top">
              <div className="mp-ecard-badges">
                <span className="mp-ecard-badge">
                  Mã BN: {(user as any).external_patient_id || `HIS-CC-${String(user.id).padStart(4, '0')}`}
                </span>
                <span className="mp-ecard-badge">
                  <ShieldCheck size={12} />
                  {user.bhyt_code ? `BHYT: ${user.bhyt_code}` : 'Chưa liên kết BHYT'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setView('profile')}
                style={{ background: 'rgba(255,255,255,0.18)', border: 'none', color: '#fff', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Hồ sơ &rsaquo;
              </button>
            </div>

            <h2 className="mp-ecard-name">{user.full_name}</h2>
            <div className="mp-ecard-meta">
              <span>SĐT: {user.phone_number || 'Chưa cập nhật'}</span>
              <span>•</span>
              <span>CCCD: {user.identity_card ? `***${user.identity_card.slice(-4)}` : 'Chưa cập nhật'}</span>
            </div>

            <div className="mp-ecard-actions">
              <button type="button" className="mp-ecard-btn-primary" onClick={onOpenBooking}>
                <Plus size={16} /> Đặt lịch khám mới
              </button>
              <button type="button" className="mp-ecard-btn-secondary" onClick={() => setView('payments')}>
                <QrCode size={15} /> Thẻ BHYT & Viện phí
              </button>
            </div>
          </section>

          {/* B. Upcoming Appointment Live Card */}
          {nextAppt ? (
            <section className="mp-upcoming-card">
              <div className="mp-upcoming-header">
                <span className="mp-live-pill">
                  <span className="mp-live-dot" />
                  {nextAppt.status === 'in_progress'
                    ? 'Bác sĩ đang gọi khám'
                    : nextAppt.status === 'waiting'
                      ? 'Đang trong Phòng chờ ảo'
                      : 'Lịch khám sắp tới'}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e' }}>
                  #{nextAppt.encounter_code || `LK-${nextAppt.id}`}
                </span>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                {nextAppt.doctor_name || `Bác sĩ chuyên khoa #${nextAppt.doctor_id}`}
              </div>
              <div style={{ fontSize: '12.5px', color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <Clock size={13} color="#0f766e" />
                <span>{formatDateTimeVN(nextAppt.starts_at)}</span>
                {nextAppt.department_name && <span>• {nextAppt.department_name}</span>}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => onJoinConsultation(nextAppt)}
                  style={{
                    flex: 1.4,
                    height: '42px',
                    borderRadius: '11px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0f766e, #0d9488)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Video size={16} /> Vào Phòng Chờ / Khám
                </button>
                {!nextAppt.paid_at && nextAppt.status === 'scheduled' && (
                  <button
                    type="button"
                    onClick={() => onPayAppointment(nextAppt)}
                    style={{
                      flex: 1,
                      height: '42px',
                      borderRadius: '11px',
                      border: '1.5px solid #0284c7',
                      background: '#f0f9ff',
                      color: '#0369a1',
                      fontWeight: 800,
                      fontSize: '12.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    <CreditCard size={15} /> VietQR
                  </button>
                )}
              </div>
            </section>
          ) : (
            <section className="mp-section-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: '#f8fafc' }}>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>Chưa có lịch hẹn sắp tới</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Đặt lịch khám từ xa có hưởng BHYT chỉ trong 1 phút</div>
              </div>
              <button
                type="button"
                onClick={onOpenBooking}
                style={{
                  border: 'none',
                  background: '#0f766e',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '12px',
                  padding: '9px 14px',
                  borderRadius: '10px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                + Đặt lịch
              </button>
            </section>
          )}

          {/* C. 8-Tile Feature Super-Grid */}
          <section className="mp-section-card">
            <div className="mp-section-head">
              <h3 className="mp-section-title">
                <Sparkles size={16} color="#0f766e" /> Dịch vụ Y tế Số
              </h3>
              <button type="button" className="mp-section-link" onClick={() => setView('payments')}>
                Viện phí VietQR <ChevronRight size={14} />
              </button>
            </div>

            <div className="mp-feature-grid">
              {quickTiles.map(tile => {
                const Icon = tile.icon
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className="mp-feature-tile"
                    onClick={tile.action}
                  >
                    <div className="mp-feature-icon" style={{ background: tile.bg, color: tile.color }}>
                      <Icon size={22} />
                    </div>
                    <span className="mp-feature-label">{tile.label}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* D. Real-Time Vitals 2x2 Grid */}
          <section className="mp-section-card">
            <div className="mp-section-head">
              <h3 className="mp-section-title">
                <HeartPulse size={16} color="#dc2626" /> Sinh hiệu & Sức khỏe tại nhà
              </h3>
              <button type="button" className="mp-section-link" onClick={() => setView('vitals')}>
                Đo / Nhập số đo <ChevronRight size={14} />
              </button>
            </div>

            <div className="mp-vitals-grid">
              <div className="mp-vital-box" onClick={() => setView('vitals')}>
                <div className="mp-vital-top">
                  <span>Huyết áp</span>
                  <HeartPulse size={14} color="#dc2626" />
                </div>
                <div className={`mp-vital-val ${!bpDisplay ? 'empty' : ''}`}>
                  {bpDisplay || 'Chưa đo'}
                  {bpDisplay && <span className="mp-vital-unit">mmHg</span>}
                </div>
                <div className="mp-vital-sub">
                  {bpDisplay ? 'Đã đồng bộ EMR' : 'Chạm để nhập / đo BLE'}
                </div>
              </div>

              <div className="mp-vital-box" onClick={() => setView('vitals')}>
                <div className="mp-vital-top">
                  <span>Nhịp tim</span>
                  <Activity size={14} color="#0f766e" />
                </div>
                <div className={`mp-vital-val ${!pulseDisplay ? 'empty' : ''}`}>
                  {pulseDisplay || 'Chưa đo'}
                  {pulseDisplay && <span className="mp-vital-unit">bpm</span>}
                </div>
                <div className="mp-vital-sub">
                  {pulseDisplay ? 'Đã đồng bộ EMR' : 'Chạm để đo PPG'}
                </div>
              </div>

              <div className="mp-vital-box" onClick={() => setView('vitals')}>
                <div className="mp-vital-top">
                  <span>SpO2 & Thân nhiệt</span>
                  <Wind size={14} color="#0284c7" />
                </div>
                <div className={`mp-vital-val ${!spo2Display && !tempDisplay ? 'empty' : ''}`}>
                  {spo2Display ? `${spo2Display}%` : '--'}
                  <span className="mp-vital-unit">
                    • {tempDisplay ? `${tempDisplay}°C` : '--°C'}
                  </span>
                </div>
                <div className="mp-vital-sub">
                  {spo2Display || tempDisplay ? 'Đã đồng bộ EMR' : 'Chưa có bản ghi'}
                </div>
              </div>

              <div className="mp-vital-box" onClick={() => setView('vitals')}>
                <div className="mp-vital-top">
                  <span>Đường huyết</span>
                  <Droplets size={14} color="#d97706" />
                </div>
                <div className={`mp-vital-val ${!glucoseDisplay ? 'empty' : ''}`}>
                  {glucoseDisplay || 'Chưa đo'}
                  {glucoseDisplay && <span className="mp-vital-unit">mmol/L</span>}
                </div>
                <div className="mp-vital-sub">
                  {glucoseDisplay ? 'Accu-Chek / Nhập tay' : 'Chạm để ghi nhận'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '12px', background: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: '#0f766e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Scale size={14} />
                Thể trạng: {weightDisplay ? `${weightDisplay} kg` : '-- kg'} • {heightDisplay ? `${heightDisplay} cm` : '-- cm'}
                {bmiDisplay ? ` (BMI ${bmiDisplay})` : ''}
              </span>
              <button
                type="button"
                onClick={() => setView('devices')}
                style={{ border: 'none', background: '#0f766e', color: '#fff', borderRadius: '7px', padding: '4px 9px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Thiết bị BLE
              </button>
            </div>
          </section>

          {/* E. Featured Doctors Preview */}
          {doctors.length > 0 && (
            <section className="mp-section-card">
              <div className="mp-section-head">
                <h3 className="mp-section-title">
                  <Stethoscope size={16} color="#0f766e" /> Bác sĩ Chuyên khoa
                </h3>
                <button type="button" className="mp-section-link" onClick={onOpenBooking}>
                  Xem tất cả <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {doctors.slice(0, 4).map(doc => {
                  const dept = departments.find(d => d.id === doc.department_id)?.name || 'Chuyên khoa Nội'
                  return (
                    <div
                      key={doc.id}
                      style={{ flexShrink: 0, width: '150px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', textAlign: 'center' }}
                    >
                      <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                        <UserRound size={22} />
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.full_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dept}
                      </div>
                      <button
                        type="button"
                        onClick={onOpenBooking}
                        style={{ marginTop: '8px', width: '100%', height: '30px', border: 'none', background: '#0f766e', color: '#fff', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Đặt khám
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* F. Hotline & Support */}
          <section className="mp-section-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={18} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Tổng đài Y tế & Cấp cứu</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Hỗ trợ tư vấn 24/7 toàn quốc</div>
              </div>
            </div>
            <a
              href="tel:19009095"
              style={{ background: '#dc2626', color: '#fff', borderRadius: '10px', padding: '7px 12px', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}
            >
              1900 9095
            </a>
          </section>
        </main>
      )}

      {/* Router for Sub-screens */}
      {view === 'appointments' && (
        <MobileAppointmentsView
          appointments={appointments}
          doctors={doctors}
          departments={departments}
          onOpenBooking={onOpenBooking}
          onJoinConsultation={onJoinConsultation}
          onPayAppointment={onPayAppointment}
          onCancelAppointment={onCancelAppointment}
          onDownloadPdf={onDownloadPdf}
        />
      )}

      {view === 'prescriptions' && (
        <MobilePrescriptionsView
          onDownloadPdf={onDownloadPdf}
        />
      )}

      {view === 'paraclinical' && (
        <MobileParaclinicalView />
      )}

      {view === 'pacs' && (
        <MobilePacsView />
      )}

      {view === 'vitals' && (
        <MobileVitalsView
          user={user}
          rpmVitals={rpmVitals}
          onRefreshVitals={onRefreshVitals}
          onOpenBleScan={() => setView('devices')}
        />
      )}

      {view === 'devices' && (
        <MobileBluetoothView
          user={user}
          onBack={() => setView('overview')}
          onRefreshVitals={onRefreshVitals}
        />
      )}

      {view === 'records' && (
        <MobileRecordsView
          appointments={appointments}
          doctors={doctors}
          onDownloadPdf={onDownloadPdf}
        />
      )}

      {view === 'payments' && (
        <MobilePaymentsView
          appointments={appointments}
          onPayAppointment={onPayAppointment}
        />
      )}

      {view === 'insurance' && (
        <MobileProfileView
          user={user}
          onUpdateUser={onUpdateUser}
          onLogout={onLogout}
          initialTab="insurance"
        />
      )}

      {view === 'family' && (
        <MobileProfileView
          user={user}
          onUpdateUser={onUpdateUser}
          onLogout={onLogout}
          initialTab="family"
        />
      )}

      {view === 'profile' && (
        <MobileProfileView
          user={user}
          onUpdateUser={onUpdateUser}
          onLogout={onLogout}
          initialTab="profile"
        />
      )}

      {/* Modals passed as children */}
      {children}

      {/* 3. Fixed 5-Tab Bottom Navigation Bar with Center Booking FAB */}
      <nav className="mp-bottom-nav">
        <button
          type="button"
          className={`mp-tab-btn ${view === 'overview' ? 'active' : ''}`}
          onClick={() => setView('overview')}
        >
          <HeartPulse size={20} />
          <span>Trang chủ</span>
        </button>

        <button
          type="button"
          className={`mp-tab-btn ${view === 'appointments' ? 'active' : ''}`}
          onClick={() => setView('appointments')}
        >
          {upcomingAppointments.length > 0 && (
            <span className="mp-tab-badge">{upcomingAppointments.length}</span>
          )}
          <CalendarDays size={20} />
          <span>Lịch khám</span>
        </button>

        <div className="mp-fab-wrap">
          <button
            type="button"
            className="mp-fab-book"
            onClick={onOpenBooking}
            aria-label="Đặt lịch khám mới"
          >
            <Plus size={24} />
          </button>
          <span className="mp-fab-label">Đặt khám</span>
        </div>

        <button
          type="button"
          className={`mp-tab-btn ${view === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setView('prescriptions')}
        >
          <Pill size={20} />
          <span>Đơn thuốc</span>
        </button>

        <button
          type="button"
          className={`mp-tab-btn ${view === 'profile' ? 'active' : ''}`}
          onClick={() => setView('profile')}
        >
          <UserRound size={20} />
          <span>Cá nhân</span>
        </button>
      </nav>
    </div>
  )
}
