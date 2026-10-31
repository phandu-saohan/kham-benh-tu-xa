import React, { useState } from 'react'
import {
  HeartPulse, ShieldCheck, UserRound, Phone, CreditCard, Lock,
  ArrowRight, CheckCircle2, AlertCircle, Building2, Eye, EyeOff,
  Sparkles, Calendar, MapPin, Activity, ArrowLeft, Check, AlertTriangle
} from 'lucide-react'
import { checkPatientHis, registerPatientAccount, type PatientHisCheckResponse, type User } from './api'

interface PatientRegisterPageProps {
  onSuccess: (data: { access_token: string; refresh_token: string; user: User }) => void
  onBackToLogin: () => void
}

export function PatientRegisterPage({ onSuccess, onBackToLogin }: PatientRegisterPageProps) {
  // Step 1: Thông tin cơ bản
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [identityCard, setIdentityCard] = useState('')

  // Trạng thái kiểm tra HIS
  const [checkingHis, setCheckingHis] = useState(false)
  const [hisCheckResult, setHisCheckResult] = useState<PatientHisCheckResponse | null>(null)
  const [hisChecked, setHisChecked] = useState(false)

  // Step 2 & Bổ sung thông tin
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Nam')
  const [bhytCode, setBhytCode] = useState('')
  const [address, setAddress] = useState('')
  const [bloodType, setBloodType] = useState('O+')
  const [allergies, setAllergies] = useState('')
  const [consentNghiDinh13, setConsentNghiDinh13] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Nạp dữ liệu mẫu nhanh để test
  function fillDemoData(type: 'existing' | 'new') {
    setError('')
    if (type === 'existing') {
      setFullName('Nguyễn Thị Bích Hòa')
      setPhoneNumber('0900000001')
      setIdentityCard('080180012345')
      setPassword('ChangeMe123!')
      setConfirmPassword('ChangeMe123!')
    } else {
      const randDigits = Math.floor(100000 + Math.random() * 900000)
      setFullName('Lê Hoàng Long')
      setPhoneNumber(`0988${randDigits.toString().slice(0, 6)}`)
      setIdentityCard(`079201${randDigits.toString().slice(0, 6)}`)
      setDob('1994-06-15')
      setGender('Nam')
      setBhytCode(`GD479${randDigits.toString().slice(0, 6)}`)
      setAddress('158 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh')
      setPassword('MatKhau@2026')
      setConfirmPassword('MatKhau@2026')
    }
    setHisChecked(false)
    setHisCheckResult(null)
  }

  // Xử lý kiểm tra HIS/EMR
  async function handleCheckHis() {
    if (!fullName.trim() || !phoneNumber.trim() || !identityCard.trim()) {
      setError('Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Số CCCD/VNeID để đối soát.')
      return
    }

    try {
      setCheckingHis(true)
      setError('')
      const res = await checkPatientHis({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        identity_card: identityCard.trim()
      })
      setHisCheckResult(res)
      setHisChecked(true)

      // Nếu có sẵn thông tin trên HIS, tự động điền các trường hồ sơ
      if (res.exists_in_his) {
        if (res.dob) setDob(res.dob)
        if (res.gender) setGender(res.gender)
        if (res.bhyt_no) setBhytCode(res.bhyt_no)
        if (res.address) setAddress(res.address)
        if (res.blood_type) setBloodType(res.blood_type)
        if (res.allergies && res.allergies.length > 0) {
          setAllergies(res.allergies.join(', '))
        }
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kết nối đến hệ thống HIS/EMR Bệnh viện lúc này.')
    } finally {
      setCheckingHis(false)
    }
  }

  // Xử lý đăng ký tài khoản
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!hisChecked) {
      setError('Vui lòng nhấn nút "Kiểm tra hồ sơ trên HIS/EMR Bệnh viện" trước khi hoàn tất đăng ký.')
      return
    }

    if (password.length < 6) {
      setError('Mật khẩu đăng nhập phải có ít nhất 6 ký tự.')
      return
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.')
      return
    }

    if (!consentNghiDinh13) {
      setError('Bạn cần đồng ý với điều khoản bảo vệ dữ liệu cá nhân y tế theo Nghị định 13/2023/NĐ-CP.')
      return
    }

    try {
      setLoading(true)
      const res = await registerPatientAccount({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        identity_card: identityCard.trim(),
        password,
        email: email.trim() || undefined,
        dob: dob || undefined,
        gender: gender || undefined,
        bhyt_code: bhytCode.trim() || undefined,
        address: address.trim() || undefined,
        blood_type: bloodType || undefined,
        allergies: allergies.trim() || undefined
      })

      onSuccess({
        access_token: res.access_token,
        refresh_token: res.refresh_token,
        user: res.user
      })
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo tài khoản bệnh nhân.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="patient-register-page">
      <div className="patient-register-card">
        {/* Top Action & Navigation Bar */}
        <div className="reg-top-nav">
          <button type="button" className="reg-back-btn" onClick={onBackToLogin}>
            <ArrowLeft size={16} />
            <span>Đăng nhập</span>
          </button>
          <div className="reg-brand-badge">
            <HeartPulse size={15} />
            <span>CareConnect HIS</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="reg-hero">
          <h1>Đăng ký tài khoản Bệnh nhân</h1>
          <p>Đối soát định danh & liên thông tự động với hồ sơ Bệnh án điện tử HIS/EMR</p>
        </div>

        {/* Stepper Progress */}
        <div className="reg-stepper">
          <div className={`stepper-item ${!hisChecked ? 'active' : 'completed'}`}>
            <div className="stepper-dot">
              {hisChecked ? <Check size={13} strokeWidth={3} /> : '1'}
            </div>
            <div className="stepper-text">
              <span className="stepper-title">Bước 1</span>
              <span className="stepper-sub">Định danh & HIS</span>
            </div>
          </div>
          <div className={`stepper-divider ${hisChecked ? 'active' : ''}`} />
          <div className={`stepper-item ${hisChecked ? 'active' : ''}`}>
            <div className="stepper-dot">2</div>
            <div className="stepper-text">
              <span className="stepper-title">Bước 2</span>
              <span className="stepper-sub">Mật khẩu & Kích hoạt</span>
            </div>
          </div>
        </div>

        {/* Demo Fast Fill Row */}
        <div className="demo-chip-bar">
          <span className="demo-chip-label">
            <Sparkles size={13} /> Dữ liệu mẫu:
          </span>
          <button
            type="button"
            className="demo-chip-btn"
            onClick={() => fillDemoData('existing')}
            title="Bệnh nhân đã có mã PID và bệnh án tại viện"
          >
            BN đã có hồ sơ HIS
          </button>
          <button
            type="button"
            className="demo-chip-btn"
            onClick={() => fillDemoData('new')}
            title="Bệnh nhân chưa từng khám, cần tạo PID mới"
          >
            Bệnh nhân mới
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleRegister} className="register-form">
          {/* Section 1: Basic Identifiers */}
          <div className="form-section">
            <div className="form-group">
              <label>
                Họ và tên đầy đủ <span className="req">*</span>
              </label>
              <div className="icon-input-wrap">
                <UserRound size={15} className="input-icon" />
                <input
                  type="text"
                  placeholder="Ví dụ: Nguyễn Thị Bích Hòa"
                  value={fullName}
                  onChange={e => { setFullName(e.target.value); setHisChecked(false); }}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>
                  Số điện thoại <span className="req">*</span>
                </label>
                <div className="icon-input-wrap">
                  <Phone size={15} className="input-icon" />
                  <input
                    type="tel"
                    placeholder="0900000001"
                    value={phoneNumber}
                    onChange={e => { setPhoneNumber(e.target.value); setHisChecked(false); }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  Số CCCD / VNeID <span className="req">*</span>
                </label>
                <div className="icon-input-wrap">
                  <CreditCard size={15} className="input-icon" />
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="12 số căn cước"
                    value={identityCard}
                    onChange={e => { setIdentityCard(e.target.value); setHisChecked(false); }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* HIS Check Action Button */}
            <button
              type="button"
              className={`btn-check-his ${checkingHis ? 'loading' : ''} ${hisChecked ? 'checked' : ''}`}
              onClick={handleCheckHis}
              disabled={checkingHis || !fullName.trim() || !phoneNumber.trim() || !identityCard.trim()}
            >
              {checkingHis ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  <span>Đang đối soát dữ liệu trên HIS/EMR Bệnh viện...</span>
                </>
              ) : hisChecked ? (
                <>
                  <CheckCircle2 size={16} />
                  <span>Đã đối soát HIS (Nhấn để kiểm tra lại)</span>
                </>
              ) : (
                <>
                  <Building2 size={16} />
                  <span>Kiểm tra hồ sơ trên HIS/EMR Bệnh viện</span>
                </>
              )}
            </button>
          </div>

          {/* HIS Verification Results */}
          {hisChecked && hisCheckResult && (
            <div className="his-result-box">
              {hisCheckResult.already_registered_in_app ? (
                <div className="his-card warning">
                  <div className="his-card-head">
                    <AlertTriangle size={18} className="icon-warn" />
                    <strong>Tài khoản đã tồn tại trên CareConnect</strong>
                  </div>
                  <p className="his-desc">{hisCheckResult.message}</p>
                  <button type="button" className="btn-secondary-link" onClick={onBackToLogin}>
                    Chuyển sang Đăng nhập ngay →
                  </button>
                </div>
              ) : hisCheckResult.exists_in_his ? (
                <div className="his-card success">
                  <div className="his-card-head">
                    <CheckCircle2 size={18} className="icon-success" />
                    <div className="his-head-title">
                      <strong>Đã liên thông hồ sơ HIS/EMR Bệnh viện!</strong>
                      <span className="his-pid-tag">PID: {hisCheckResult.external_patient_id}</span>
                    </div>
                  </div>
                  <div className="his-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Thẻ BHYT</span>
                      <span className="detail-val">{hisCheckResult.bhyt_no || 'Chưa liên kết'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Ngày sinh</span>
                      <span className="detail-val">{hisCheckResult.dob || 'Theo hồ sơ'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Giới tính</span>
                      <span className="detail-val">{hisCheckResult.gender || 'Theo hồ sơ'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Địa chỉ</span>
                      <span className="detail-val text-truncate">{hisCheckResult.address || 'Đã lưu trên HIS'}</span>
                    </div>
                    {hisCheckResult.conditions && hisCheckResult.conditions.length > 0 && (
                      <div className="detail-item full-span">
                        <span className="detail-label">Tiền sử bệnh án</span>
                        <span className="detail-val tag-list">
                          {hisCheckResult.conditions.map((c, i) => (
                            <span key={i} className="med-tag">{c.display || c.code}</span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="his-footer-note">
                    <ShieldCheck size={14} />
                    <span>Hồ sơ bệnh án điện tử sẽ được đồng bộ tự động vào tài khoản của bạn.</span>
                  </div>
                </div>
              ) : (
                <div className="his-card info">
                  <div className="his-card-head">
                    <Sparkles size={18} className="icon-info" />
                    <div className="his-head-title">
                      <strong>Chưa có hồ sơ trên HIS (Bệnh nhân mới)</strong>
                    </div>
                  </div>
                  <p className="his-desc">
                    Hệ thống CareConnect sẽ tự động khởi tạo hồ sơ bệnh nhân điện tử (PID) mới trên HIS/EMR bệnh viện khi bạn hoàn tất đăng ký.
                  </p>

                  {/* Extra Fields for New Patient */}
                  <div className="extra-fields-box">
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Ngày sinh</label>
                        <div className="icon-input-wrap">
                          <Calendar size={15} className="input-icon" />
                          <input
                            type="date"
                            value={dob}
                            onChange={e => setDob(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Giới tính</label>
                        <select value={gender} onChange={e => setGender(e.target.value)}>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="form-group">
                        <label>Số thẻ Bảo hiểm Y tế (BHYT)</label>
                        <div className="icon-input-wrap">
                          <ShieldCheck size={15} className="input-icon" />
                          <input
                            type="text"
                            maxLength={15}
                            placeholder="GD479..."
                            value={bhytCode}
                            onChange={e => setBhytCode(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Nhóm máu</label>
                        <select value={bloodType} onChange={e => setBloodType(e.target.value)}>
                          <option value="O+">O+</option>
                          <option value="A+">A+</option>
                          <option value="B+">B+</option>
                          <option value="AB+">AB+</option>
                          <option value="O-">O-</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Địa chỉ nơi ở hiện tại</label>
                      <div className="icon-input-wrap">
                        <MapPin size={15} className="input-icon" />
                        <input
                          type="text"
                          placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Password and Account Creation */}
          {hisChecked && !hisCheckResult?.already_registered_in_app && (
            <div className="step-two-container">
              <div className="form-row-2">
                <div className="form-group">
                  <label>
                    Mật khẩu đăng nhập <span className="req">*</span>
                  </label>
                  <div className="icon-input-wrap">
                    <Lock size={15} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Tối thiểu 6 ký tự"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="btn-toggle-eye"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Xác nhận mật khẩu <span className="req">*</span>
                  </label>
                  <div className="icon-input-wrap">
                    <Lock size={15} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Decree 13/2023 Consent */}
              <label className="consent-checkbox-card">
                <input
                  type="checkbox"
                  checked={consentNghiDinh13}
                  onChange={e => setConsentNghiDinh13(e.target.checked)}
                />
                <span className="consent-text">
                  Tôi đồng ý cho phép xử lý dữ liệu cá nhân y tế phục vụ khám chữa bệnh từ xa và liên thông bệnh viện theo quy định tại <strong>Nghị định 13/2023/NĐ-CP</strong>.
                </span>
              </label>

              {/* Submit CTA Button */}
              <button
                className="btn-submit-cta"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Activity size={17} className="animate-spin" />
                    <span>Đang khởi tạo tài khoản & hồ sơ...</span>
                  </>
                ) : hisCheckResult?.exists_in_his ? (
                  <>
                    <span>Xác nhận & Liên thông hồ sơ Bệnh viện</span>
                    <ArrowRight size={17} />
                  </>
                ) : (
                  <>
                    <span>Tạo tài khoản & Khởi tạo hồ sơ HIS mới</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <div className="form-error-alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Navigation Link */}
          <div className="reg-footer-nav">
            <span>Đã có tài khoản y tế? </span>
            <button type="button" className="btn-link-login" onClick={onBackToLogin}>
              Đăng nhập ngay
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
