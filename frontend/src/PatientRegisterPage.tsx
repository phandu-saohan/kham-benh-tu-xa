import React, { useState } from 'react'
import {
  HeartPulse, ShieldCheck, UserRound, Phone, CreditCard, Lock,
  ArrowRight, CheckCircle2, AlertCircle, Building2, Eye, EyeOff,
  Sparkles, Calendar, MapPin, Activity, ArrowLeft
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
      const rand = Math.floor(1000 + Math.random() * 9000)
      setFullName('Lê Hoàng Long')
      setPhoneNumber(`098877${rand}`)
      setIdentityCard(`07920100${rand}`)
      setPassword('ChangeMe123!')
      setConfirmPassword('ChangeMe123!')
      setDob('1994-06-15')
      setGender('Nam')
      setAddress('158 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM')
      setBhytCode(`GD479${rand}12345`)
    }
    setHisChecked(false)
    setHisCheckResult(null)
  }

  // B1: Kiểm tra trên hệ thống HIS / EMR Bệnh viện
  async function handleCheckHis(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')

    const cleanName = fullName.trim()
    const cleanPhone = phoneNumber.trim()
    const cleanCccd = identityCard.trim()

    if (!cleanName) {
      setError('Vui lòng nhập họ và tên bệnh nhân.')
      return
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      setError('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 9 số).')
      return
    }
    if (!cleanCccd || cleanCccd.length < 9) {
      setError('Vui lòng nhập số CCCD / VNeID hợp lệ (tối thiểu 9 số).')
      return
    }

    try {
      setCheckingHis(true)
      const res = await checkPatientHis({
        full_name: cleanName,
        phone_number: cleanPhone,
        identity_card: cleanCccd
      })
      setHisCheckResult(res)
      setHisChecked(true)

      // Nếu đã có thông tin trên HIS, tự động điền các trường y tế
      if (res.exists_in_his && !res.already_registered_in_app) {
        if (res.dob) setDob(res.dob)
        if (res.gender) setGender(res.gender)
        if (res.bhyt_no) setBhytCode(res.bhyt_no)
        if (res.address) setAddress(res.address)
        if (res.blood_type) setBloodType(res.blood_type)
        if (res.allergies && res.allergies.length > 0) {
          setAllergies(res.allergies.map(a => `${a.substance || ''} (${a.severity || 'ghi nhận'})`).join(', '))
        }
      }
    } catch (err: any) {
      setError(err.message || 'Không thể kiểm tra dữ liệu trên hệ thống HIS/EMR.')
    } finally {
      setCheckingHis(false)
    }
  }

  // Hoàn tất Đăng ký tài khoản
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!hisChecked) {
      await handleCheckHis()
      return
    }

    if (hisCheckResult?.already_registered_in_app) {
      setError('Số điện thoại hoặc CCCD này đã có tài khoản. Vui lòng quay lại Đăng nhập.')
      return
    }

    if (!password || password.length < 6) {
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
    <main className="login-page patient-register-wrapper">
      <div className="login-card patient-register-card">
        {/* Brand Header */}
        <div className="brand-mark">
          <HeartPulse size={28} />
        </div>
        <p className="eyebrow">CỔNG Y TẾ TRỰC TUYẾN CARECONNECT</p>
        <h1>Đăng ký tài khoản<br />Bệnh nhân trực tuyến</h1>
        <p className="muted">
          Tự động đối soát & liên thông dữ liệu hồ sơ Bệnh án điện tử HIS/EMR Bệnh viện.
        </p>

        {/* Demo Fast Fill Buttons */}
        <div className="demo-chip-bar">
          <span className="demo-chip-label">Thử nghiệm nhanh:</span>
          <button
            type="button"
            className="demo-chip-btn"
            onClick={() => fillDemoData('existing')}
            title="Điền dữ liệu mẫu bệnh nhân đã có hồ sơ tại viện"
          >
            <Sparkles size={13} /> BN đã có hồ sơ HIS
          </button>
          <button
            type="button"
            className="demo-chip-btn"
            onClick={() => fillDemoData('new')}
            title="Điền dữ liệu mẫu bệnh nhân hoàn toàn mới"
          >
            <UserRound size={13} /> Bệnh nhân mới
          </button>
        </div>

        {/* Step 1 Form */}
        <form onSubmit={handleRegister} className="register-form">
          <div className="register-step-badge">
            <span className="step-num">Bước 1</span>
            <strong>Nhập thông tin định danh & Đối soát HIS/EMR</strong>
          </div>

          <label>
            Họ và tên đầy đủ
            <input
              type="text"
              placeholder="Ví dụ: Nguyễn Thị Bích Hòa"
              value={fullName}
              onChange={e => { setFullName(e.target.value); setHisChecked(false); }}
              required
            />
          </label>

          <div className="register-input-row">
            <label>
              Số điện thoại
              <div className="icon-input-wrap">
                <Phone size={15} className="input-icon" />
                <input
                  type="tel"
                  placeholder="Ví dụ: 0900000001"
                  value={phoneNumber}
                  onChange={e => { setPhoneNumber(e.target.value); setHisChecked(false); }}
                  required
                />
              </div>
            </label>

            <label>
              Số Căn cước công dân (12 số CCCD / VNeID)
              <div className="icon-input-wrap">
                <CreditCard size={15} className="input-icon" />
                <input
                  type="text"
                  maxLength={15}
                  placeholder="Ví dụ: 080180012345"
                  value={identityCard}
                  onChange={e => { setIdentityCard(e.target.value); setHisChecked(false); }}
                  required
                />
              </div>
            </label>
          </div>

          {/* Nút bấm kiểm tra HIS/EMR */}
          <div className="his-check-action-wrap">
            <button
              type="button"
              className={`secondary full btn-check-his ${checkingHis ? 'loading' : ''}`}
              onClick={handleCheckHis}
              disabled={checkingHis || !fullName.trim() || !phoneNumber.trim() || !identityCard.trim()}
            >
              {checkingHis ? (
                <>
                  <Activity size={16} className="animate-spin" />
                  Đang đối soát dữ liệu trên HIS/EMR Bệnh viện...
                </>
              ) : (
                <>
                  <Building2 size={16} />
                  Kiểm tra hồ sơ trên HIS/EMR Bệnh viện
                </>
              )}
            </button>
          </div>

          {/* Kết quả đối soát HIS/EMR */}
          {hisChecked && hisCheckResult && (
            <div className="his-result-container">
              {hisCheckResult.already_registered_in_app ? (
                <div className="his-card warning">
                  <div className="his-card-header">
                    <AlertCircle size={20} color="#b45309" />
                    <strong>Tài khoản đã tồn tại trên CareConnect</strong>
                  </div>
                  <p>{hisCheckResult.message}</p>
                  <button type="button" className="primary full" onClick={onBackToLogin}>
                    Chuyển sang Đăng nhập ngay
                  </button>
                </div>
              ) : hisCheckResult.exists_in_his ? (
                <div className="his-card success">
                  <div className="his-card-header">
                    <CheckCircle2 size={20} color="#059669" />
                    <div>
                      <strong>Tìm thấy hồ sơ bệnh án điện tử tại Bệnh viện!</strong>
                      <span className="his-pid-pill">Mã PID: {hisCheckResult.external_patient_id}</span>
                    </div>
                  </div>
                  <p className="his-msg">{hisCheckResult.message}</p>
                  <div className="his-summary-grid">
                    <div>
                      <small>Thẻ BHYT</small>
                      <b>{hisCheckResult.bhyt_no || 'Chưa liên kết BHYT'}</b>
                    </div>
                    <div>
                      <small>Ngày sinh</small>
                      <b>{hisCheckResult.dob || 'Theo hồ sơ'}</b>
                    </div>
                    <div>
                      <small>Giới tính</small>
                      <b>{hisCheckResult.gender || 'Theo hồ sơ'}</b>
                    </div>
                    <div>
                      <small>Địa chỉ thường trú</small>
                      <span>{hisCheckResult.address || 'Đã ghi nhận trên HIS'}</span>
                    </div>
                    {hisCheckResult.conditions && hisCheckResult.conditions.length > 0 && (
                      <div className="full-col">
                        <small>Tiền sử bệnh án EMR</small>
                        <b>{hisCheckResult.conditions.map(c => c.display || c.code).join(', ')}</b>
                      </div>
                    )}
                  </div>
                  <div className="his-sync-notice">
                    <ShieldCheck size={16} color="#059669" />
                    <span>Tài khoản CareConnect sẽ được tự động liên thông với hồ sơ bệnh án gốc tại Bệnh viện.</span>
                  </div>
                </div>
              ) : (
                <div className="his-card info">
                  <div className="his-card-header">
                    <Sparkles size={20} color="#2563eb" />
                    <div>
                      <strong>Chưa có hồ sơ trên HIS/EMR Bệnh viện (Bệnh nhân mới)</strong>
                    </div>
                  </div>
                  <p className="his-msg">{hisCheckResult.message}</p>
                  <p className="his-subtext">
                    Khi bạn hoàn tất đăng ký, hệ thống CareConnect sẽ tự động cấp mã bệnh nhân điện tử mới trên HIS/EMR.
                  </p>

                  {/* Bổ sung thông tin cho bệnh nhân mới */}
                  <div className="new-patient-extra-fields">
                    <div className="register-input-row">
                      <label>
                        Ngày sinh
                        <input
                          type="date"
                          value={dob}
                          onChange={e => setDob(e.target.value)}
                        />
                      </label>
                      <label>
                        Giới tính
                        <select value={gender} onChange={e => setGender(e.target.value)}>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </label>
                    </div>

                    <div className="register-input-row">
                      <label>
                        Số thẻ Bảo hiểm Y tế (nếu có)
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="GD 4 79..."
                          value={bhytCode}
                          onChange={e => setBhytCode(e.target.value)}
                        />
                      </label>
                      <label>
                        Nhóm máu (nếu biết)
                        <select value={bloodType} onChange={e => setBloodType(e.target.value)}>
                          <option value="O+">O+</option>
                          <option value="A+">A+</option>
                          <option value="B+">B+</option>
                          <option value="AB+">AB+</option>
                          <option value="O-">O-</option>
                        </select>
                      </label>
                    </div>

                    <label>
                      Địa chỉ nơi ở hiện tại
                      <input
                        type="text"
                        placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Thiết lập mật khẩu và Hoàn tất */}
          {hisChecked && !hisCheckResult?.already_registered_in_app && (
            <div className="register-step-two">
              <div className="register-step-badge">
                <span className="step-num">Bước 2</span>
                <strong>Thiết lập bảo mật & Hoàn tất tạo tài khoản</strong>
              </div>

              <div className="register-input-row">
                <label>
                  Mật khẩu đăng nhập
                  <div className="icon-input-wrap">
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label>
                  Xác nhận mật khẩu
                  <div className="icon-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </label>
              </div>

              <label className="register-consent-label">
                <input
                  type="checkbox"
                  checked={consentNghiDinh13}
                  onChange={e => setConsentNghiDinh13(e.target.checked)}
                />
                <span>
                  Tôi đồng ý cho phép xử lý dữ liệu cá nhân y tế phục vụ khám bệnh từ xa và liên thông bệnh viện theo quy định tại <b>Nghị định 13/2023/NĐ-CP</b>.
                </span>
              </label>

              <button
                className="primary full btn-submit-register"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Activity size={18} className="animate-spin" />
                    Đang khởi tạo tài khoản...
                  </>
                ) : hisCheckResult?.exists_in_his ? (
                  <>
                    Xác nhận & Liên thông hồ sơ Bệnh viện <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    Tạo tài khoản mới & Khởi tạo hồ sơ HIS <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {error && <div className="alert error">{error}</div>}

          {/* Switch back to Login */}
          <div className="register-footer-switch">
            <span>Đã có tài khoản y tế? </span>
            <button type="button" className="text-link" onClick={onBackToLogin}>
              Đăng nhập ngay
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
