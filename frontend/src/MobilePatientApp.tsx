import React, { useState, useEffect } from 'react'
import {
  HeartPulse, CalendarDays, Pill, UserRound, Plus, Activity,
  ShieldCheck, Phone, Lock, Eye, EyeOff, ArrowRight, UserPlus,
  CheckCircle2, AlertCircle, Cpu, FlaskConical, ScanLine, FileText,
  Users, CreditCard, ArrowLeft, Video, Clock, QrCode, Bluetooth,
  Thermometer, Wind, Droplets, Scale, ChevronRight, LogOut, Sparkles
} from 'lucide-react'
import { ConfirmationResult } from 'firebase/auth'
import {
  isCapacitorNative,
  login,
  sendOtp,
  verifyOtp,
  loginWithFirebaseToken,
  type User,
  type Appointment,
  type RPMVitalItem
} from './api'
import {
  isFirebaseConfigured,
  setupRecaptcha,
  sendFirebaseOtp,
  verifyFirebaseOtp
} from './firebase'
import { NotificationCenter } from './NotificationCenter'
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

interface MobilePatientLoginProps {
  onSuccess: (user: User) => void
  onNavigateToRegister: () => void
}

export function MobilePatientLogin({
  onSuccess,
  onNavigateToRegister
}: MobilePatientLoginProps) {
  const [authMode, setAuthMode] = useState<'password' | 'otp'>('password')

  // Password login (Email / Phone / CCCD)
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

interface MobilePatientShellProps {
  user: User
  view: string
  setView: (v: string) => void
  appointments: Appointment[]
  rpmVitals: RPMVitalItem[]
  onOpenBooking: () => void
  onJoinConsultation: (appt: Appointment) => void
  onPayAppointment: (appt: Appointment) => void
  onLogout: () => void
  children: React.ReactNode
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
  rpmVitals,
  onOpenBooking,
  onJoinConsultation,
  onPayAppointment,
  onLogout,
  children
}: MobilePatientShellProps) {
  const isHome = view === 'overview'

  // Active or upcoming appointment
  const upcomingAppointments = appointments.filter(a =>
    ['waiting', 'in_progress', 'confirmed', 'scheduled'].includes(a.status)
  )
  const nextAppt = upcomingAppointments[0] || null

  // Latest real vitals from DB logs or user profile (ZERO hardcoded sample values)
  const latestBpLog = rpmVitals.find(v => v.systolic && v.diastolic)
  const bpDisplay = latestBpLog
    ? `${latestBpLog.systolic}/${latestBpLog.diastolic}`
    : (user as any).blood_pressure || null

  const latestPulseLog = rpmVitals.find(v => v.pulse)
  const pulseDisplay = latestPulseLog?.pulse || (user as any).heart_rate || null

  const latestSpo2Log = rpmVitals.find(v => v.spo2_percent)
  const spo2Display = latestSpo2Log?.spo2_percent || (user as any).spo2 || null

  const latestGlucoseLog = rpmVitals.find(v => v.glucose_value)
  const glucoseDisplay = latestGlucoseLog?.glucose_value || (user as any).blood_glucose || null

  const latestTempLog = rpmVitals.find(v => v.temperature_celsius)
  const tempDisplay = latestTempLog?.temperature_celsius || (user as any).temperature || null

  const latestWeightLog = rpmVitals.find(v => v.weight_kg)
  const weightDisplay = latestWeightLog?.weight_kg || (user as any).weight || null
  const latestHeightLog = rpmVitals.find(v => v.height_cm)
  const heightDisplay = latestHeightLog?.height_cm || (user as any).height || null
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

      {/* 2. Main Mobile Content */}
      {isHome ? (
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
              <button type="button" className="mp-ecard-btn-secondary" onClick={() => setView('insurance')}>
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
                <span>
                  {new Date(nextAppt.starts_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {new Date(nextAppt.starts_at).toLocaleDateString('vi-VN')}
                </span>
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

          {/* C. 8-Tile Clinical Feature Super-Grid */}
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

          {/* D. Real-Time Vitals 2x2 Grid (100% Real DB Records, 0 Auto-Fill) */}
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
                  {pulseDisplay ? 'Đã đồng bộ EMR' : 'Đo bằng Camera PPG'}
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

          {/* E. Account & Logout Bar */}
          <section className="mp-section-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={() => setView('payments')}>
              <CreditCard size={18} color="#0284c7" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Quản lý Viện phí & Hoàn tiền VietQR</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Tra cứu biên lai điện tử & đối soát BHYT</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: '10px', padding: '7px 11px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              <LogOut size={14} /> Thoát
            </button>
          </section>
          {children}
        </main>
      ) : (
        <main className="mp-subscreen-body">
          {children}
        </main>
      )}

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
