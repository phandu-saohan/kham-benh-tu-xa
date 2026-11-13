import React, { useState } from 'react'
import {
  HeartPulse, Stethoscope, ShieldCheck, Phone, Lock, Mail,
  ArrowRight, UserPlus, CheckCircle2, AlertCircle, Eye, EyeOff,
  Sparkles, Building2, ChevronRight, Activity, Shield, KeyRound,
  UserRound, Check
} from 'lucide-react'
import { ConfirmationResult } from 'firebase/auth'
import {
  login,
  sendOtp,
  verifyOtp,
  loginWithFirebaseToken,
  type User
} from './api'
import {
  isFirebaseConfigured,
  setupRecaptcha,
  sendFirebaseOtp,
  verifyFirebaseOtp
} from './firebase'
import './login-page.css'

interface LoginPageProps {
  onSuccess: (user: User) => void
  onNavigateToRegister: () => void
  initialPortal?: 'patient' | 'staff'
}

export function LoginPage({
  onSuccess,
  onNavigateToRegister,
  initialPortal = 'patient'
}: LoginPageProps) {
  const [portal, setPortal] = useState<'patient' | 'staff'>(initialPortal)
  
  // Patient Auth Mode: 'otp' | 'password'
  const [patientAuthMode, setPatientAuthMode] = useState<'otp' | 'password'>('otp')

  // Patient OTP fields
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)

  // Password Login fields (Staff or Patient with password)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Status feedback
  const [error, setError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  // Gửi mã OTP cho bệnh nhân
  async function handleSendOtp() {
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại di động.')
      return
    }
    setError('')
    setSuccessNotice('')
    setIsSendingOtp(true)
    try {
      if (isFirebaseConfigured()) {
        const verifier = setupRecaptcha('login-recaptcha-box')
        if (!verifier) {
          throw new Error('Không thể khởi tạo dịch vụ xác thực Firebase OTP.')
        }
        const confirmResult = await sendFirebaseOtp(phone.trim(), verifier)
        setConfirmationResult(confirmResult)
        setOtpSent(true)
        setOtpCode('')
        setSuccessNotice(`Mã xác thực OTP đã được gửi đến số điện thoại ${phone}.`)
      } else {
        const res = await sendOtp(phone.trim())
        setOtpSent(true)
        setOtpCode('')
        setSuccessNotice(res.message || `Mã xác thực OTP đã gửi đến ${phone}.`)
      }
    } catch (err: any) {
      console.error('Lỗi gửi OTP:', err)
      const msg = err?.message || 'Không thể gửi mã OTP lúc này.'
      if (msg.includes('auth/invalid-phone-number')) {
        setError('Số điện thoại không đúng định dạng. Vui lòng kiểm tra lại (Ví dụ: 0912345678).')
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Bạn đã gửi yêu cầu quá nhiều lần. Vui lòng thử lại sau vài phút.')
      } else {
        setError(msg)
      }
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Xác thực mã OTP
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
      console.error('Lỗi xác thực OTP:', err)
      const msg = err?.message || 'Xác thực OTP không thành công.'
      if (msg.includes('auth/invalid-verification-code')) {
        setError('Mã OTP không chính xác hoặc đã hết hiệu lực.')
      } else {
        setError(msg)
      }
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Đăng nhập bằng Email/SĐT + Mật khẩu
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Vui lòng điền đầy đủ tài khoản và mật khẩu.')
      return
    }
    setError('')
    setIsLoggingIn(true)
    try {
      const u = await login(email.trim(), password)
      onSuccess(u)
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Tài khoản hoặc mật khẩu không chính xác.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="cs-login-viewport">
      <div className="cs-login-single-column">
        
        {/* =================================================================
            BRAND HEADER (Single Column Centered)
            ================================================================= */}
        <header className="cs-login-brand-header">
          <div className="cs-brand-lockup">
            <div className="cs-brand-icon">
              <HeartPulse size={26} color="#ffffff" />
            </div>
            <div className="cs-brand-text">
              <span className="cs-brand-name">CareConnect</span>
              <span className="cs-brand-sub">Bệnh Viện Số & Telemedicine</span>
            </div>
          </div>
          <div className="cs-login-badge-row">
            <span className="cs-badge-compliance">
              <ShieldCheck size={13} color="#059669" /> Chuẩn QĐ 130/QĐ-BYT
            </span>
            <span className="cs-badge-compliance">
              <Lock size={13} color="#0284c7" /> Bảo Mật Nghị Định 13
            </span>
          </div>
        </header>

        {/* =================================================================
            MAIN LOGIN CARD (Single Column Card)
            ================================================================= */}
        <main className="cs-login-card">
          
          {/* Dual Portal Switcher Tabs */}
          <div className="cs-portal-switcher">
            <button
              type="button"
              className={`cs-portal-tab ${portal === 'patient' ? 'active' : ''}`}
              onClick={() => { setPortal('patient'); setError(''); setSuccessNotice(''); }}
            >
              <HeartPulse size={16} />
              <div className="cs-tab-labels">
                <span className="cs-tab-title">Cổng Bệnh Nhân</span>
                <span className="cs-tab-sub">Khám từ xa & Y bạ</span>
              </div>
            </button>

            <button
              type="button"
              className={`cs-portal-tab ${portal === 'staff' ? 'active' : ''}`}
              onClick={() => { setPortal('staff'); setError(''); setSuccessNotice(''); }}
            >
              <Stethoscope size={16} />
              <div className="cs-tab-labels">
                <span className="cs-tab-title">Cán Bộ Y Tế</span>
                <span className="cs-tab-sub">Bác sĩ & Quản trị</span>
              </div>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="cs-login-alert error">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="cs-login-alert success">
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successNotice}</span>
            </div>
          )}

          {/* =============================================================
              PORTAL 1: BỆNH NHÂN (PATIENT PORTAL)
              ============================================================= */}
          {portal === 'patient' && (
            <div className="cs-portal-content">
              <header className="cs-portal-header">
                <div className="cs-portal-badge patient">
                  <span className="cs-dot-live"></span>
                  <span>Cổng Dịch Vụ Bệnh Nhân</span>
                </div>
                <h1>Đăng nhập Phòng khám</h1>
                <p>Truy cập y bạ điện tử, nhận kết quả xét nghiệm và kết nối với bác sĩ chuyên khoa</p>
              </header>

              {/* Sub-mode switcher for Patient: OTP vs Password */}
              <div className="cs-mode-switch">
                <button
                  type="button"
                  className={`cs-mode-btn ${patientAuthMode === 'otp' ? 'active' : ''}`}
                  onClick={() => { setPatientAuthMode('otp'); setError(''); }}
                >
                  <Phone size={14} />
                  <span>Xác thực OTP qua SĐT</span>
                </button>
                <button
                  type="button"
                  className={`cs-mode-btn ${patientAuthMode === 'password' ? 'active' : ''}`}
                  onClick={() => { setPatientAuthMode('password'); setError(''); }}
                >
                  <Lock size={14} />
                  <span>Đăng nhập Mật khẩu</span>
                </button>
              </div>

              {/* Mode A: OTP Verification */}
              {patientAuthMode === 'otp' ? (
                <form onSubmit={handleVerifyOtp} className="cs-login-form">
                  <div className="cs-field-group">
                    <label>Số điện thoại di động đăng ký (hoặc chuyển sang tab Đăng nhập Mật khẩu)</label>
                    <div className="cs-input-with-btn">
                      <div className="cs-input-box">
                        <Phone size={17} className="cs-input-icon" />
                        <input
                          type="text"
                          placeholder="Ví dụ: 0912 345 678 (hoặc gõ email)"
                          value={phone}
                          onChange={e => {
                            const val = e.target.value
                            if (val.includes('@')) {
                              setPatientAuthMode('password')
                              setEmail(val)
                            } else {
                              setPhone(val)
                            }
                          }}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        className={`cs-btn-otp-action ${isSendingOtp ? 'loading' : ''} ${otpSent ? 'sent' : ''}`}
                        onClick={handleSendOtp}
                        disabled={isSendingOtp || !phone.trim()}
                      >
                        {isSendingOtp ? (
                          <>
                            <Activity size={14} className="cs-spin" />
                            <span>Đang gửi...</span>
                          </>
                        ) : otpSent ? (
                          'Gửi lại mã'
                        ) : (
                          'Lấy mã OTP'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Firebase reCAPTCHA container */}
                  <div id="login-recaptcha-box" style={{ margin: '2px 0' }}></div>

                  {otpSent && (
                    <div className="cs-otp-verify-group">
                      <div className="cs-field-group">
                        <label>Mã xác thực OTP (6 chữ số)</label>
                        <div className="cs-input-box">
                          <ShieldCheck size={17} className="cs-input-icon" />
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Nhập 6 số vừa nhận qua SMS"
                            value={otpCode}
                            onChange={e => setOtpCode(e.target.value)}
                            className="cs-input-otp"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="cs-btn-submit-main"
                        disabled={isVerifyingOtp || !otpCode.trim()}
                      >
                        {isVerifyingOtp ? (
                          <>
                            <Activity size={18} className="cs-spin" />
                            <span>Đang kiểm tra OTP...</span>
                          </>
                        ) : (
                          <>
                            <span>Xác nhận & Vào phòng khám</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {!otpSent && (
                    <button
                      type="button"
                      className="cs-btn-submit-main"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || !phone.trim()}
                    >
                      {isSendingOtp ? (
                        <>
                          <Activity size={18} className="cs-spin" />
                          <span>Đang gửi mã...</span>
                        </>
                      ) : (
                        <>
                          <span>Tiếp tục với mã OTP</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  )}
                </form>
              ) : (
                /* Mode B: Password Login for Patient */
                <form onSubmit={handlePasswordLogin} className="cs-login-form">
                  <div className="cs-field-group">
                    <label>Email, Số điện thoại hoặc Số CCCD</label>
                    <div className="cs-input-box">
                      <Mail size={17} className="cs-input-icon" />
                      <input
                        type="text"
                        placeholder="Nhập email, số điện thoại hoặc CCCD đã đăng ký"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="cs-field-group">
                    <label>Mật khẩu</label>
                    <div className="cs-input-box">
                      <Lock size={17} className="cs-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu của bạn"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="cs-btn-eye"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="cs-btn-submit-main"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <Activity size={18} className="cs-spin" />
                        <span>Đang xác thực...</span>
                      </>
                    ) : (
                      <>
                        <span>Đăng nhập Bệnh nhân</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Registration Invitation Box */}
              <div className="cs-register-invitation">
                <div className="cs-invitation-head">
                  <UserPlus size={18} className="cs-invitation-icon" />
                  <div>
                    <strong>Chưa có hồ sơ bệnh nhân tại CareConnect?</strong>
                    <p>Đăng ký định danh bằng CCCD/VNeID để tự động liên thông thẻ BHYT & hồ sơ bệnh án cũ từ HIS</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="cs-btn-register-cta"
                  onClick={onNavigateToRegister}
                >
                  <span>Đăng ký hồ sơ Bệnh nhân mới</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* =============================================================
              PORTAL 2: CÁN BỘ Y TẾ (STAFF & CLINICIAN PORTAL)
              ============================================================= */}
          {portal === 'staff' && (
            <div className="cs-portal-content">
              <header className="cs-portal-header">
                <div className="cs-portal-badge staff">
                  <span className="cs-dot-live staff-dot"></span>
                  <span>Cổng Cán Bộ Y Tế & Điều Hành</span>
                </div>
                <h1>Đăng nhập Cán bộ Viện</h1>
                <p>Dành riêng cho Bác sĩ lâm sàng, Điều dưỡng tiếp đón Triage và Ban Quản trị</p>
              </header>

              <form onSubmit={handlePasswordLogin} className="cs-login-form">
                <div className="cs-field-group">
                  <label>Email cán bộ y tế / Mã nhân viên</label>
                  <div className="cs-input-box">
                    <Mail size={17} className="cs-input-icon" />
                    <input
                      type="email"
                      placeholder="Nhập email công vụ cán bộ y tế"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="cs-field-group">
                  <label>Mật khẩu bảo mật</label>
                  <div className="cs-input-box">
                    <Lock size={17} className="cs-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="cs-btn-eye"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="cs-btn-submit-main staff-submit"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Activity size={18} className="cs-spin" />
                      <span>Đang kiểm tra phân quyền...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập Cán bộ Lâm sàng</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              {/* Clinical Security Notice */}
              <div className="cs-staff-security-box">
                <ShieldCheck size={16} className="cs-shield-icon" />
                <div>
                  <strong>Kiểm Toán & Giám Định Lâm Sàng</strong>
                  <p>Mọi hành động kê đơn SmartCA, đọc hồ sơ EMR và duyệt BHYT đều được ghi nhận Audit Trail theo Thông tư 30/2023/TT-BYT.</p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Compliance Standards */}
          <footer className="cs-login-trust-bar">
            <ShieldCheck size={14} color="#059669" />
            <span>Đạt chuẩn Nghị định 13/2023/NĐ-CP • Ký số SmartCA PKI Bộ Y Tế • Tra cứu BHYT Quốc Gia</span>
          </footer>

        </main>

        {/* Footer Reassurance & Hotline */}
        <footer className="cs-login-single-footer">
          <div className="cs-footer-hotline">
            <Phone size={14} />
            <span>Cấp cứu & Hỗ trợ y tế 24/7: <strong>1900 8888</strong></span>
          </div>
          <div className="cs-footer-cert">
            <span>CareConnect HIS Core v4.2 &bull; BYT Certified</span>
          </div>
        </footer>

      </div>
    </div>
  )
}
