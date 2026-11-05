import React, { useState, useRef } from 'react'
import {
  HeartPulse, ShieldCheck, UserRound, Phone, CreditCard, Lock,
  ArrowRight, CheckCircle2, AlertCircle, Building2, Eye, EyeOff,
  Sparkles, Calendar, MapPin, Activity, ArrowLeft, Check, AlertTriangle,
  Camera, Stethoscope, Droplets, Users, Shield, FileCheck2, Info, ChevronRight
} from 'lucide-react'
import {
  checkPatientHis,
  registerPatientAccount,
  ocrMedicalDocument,
  type PatientHisCheckResponse,
  type User
} from './api'
import './patient-register.css'

interface PatientRegisterPageProps {
  onSuccess: (data: { access_token: string; refresh_token: string; user: User }) => void
  onBackToLogin: () => void
}

export function PatientRegisterPage({ onSuccess, onBackToLogin }: PatientRegisterPageProps) {
  // Step indicator: 1 = Định danh & CCCD, 2 = Y bạ & BHYT, 3 = Mật khẩu & Kích hoạt
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Step 1: Thông tin cơ bản & Định danh
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [identityCard, setIdentityCard] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Trạng thái kiểm tra HIS/EMR
  const [checkingHis, setCheckingHis] = useState(false)
  const [hisCheckResult, setHisCheckResult] = useState<PatientHisCheckResponse | null>(null)
  const [hisChecked, setHisChecked] = useState(false)

  // Step 2: Y bạ & BHYT & Sức khỏe
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Nam')
  const [bhytCode, setBhytCode] = useState('')
  const [address, setAddress] = useState('')
  const [bloodType, setBloodType] = useState('O+')
  const [allergies, setAllergies] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')

  // Step 3: Mật khẩu & Điều khoản
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [consentNghiDinh13, setConsentNghiDinh13] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Đánh giá độ mạnh mật khẩu
  function getPasswordStrength(pwd: string) {
    if (!pwd) return { score: 0, text: '', color: '' }
    let score = 0
    if (pwd.length >= 6) score += 1
    if (pwd.length >= 8) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score <= 2) return { score: 1, text: 'Mật khẩu yếu', color: '#ba1a1a' }
    if (score <= 4) return { score: 2, text: 'Mật khẩu trung bình', color: '#d97706' }
    return { score: 3, text: 'Mật khẩu mạnh & an toàn', color: '#007a53' }
  }

  const pwdStrength = getPasswordStrength(password)

  // Quét AI OCR từ CCCD / BHYT
  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setOcrLoading(true)
      setError('')
      setOcrSuccessMsg('')
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result as string
          const res = await ocrMedicalDocument(base64, 'AUTO')
          if (res.success && res.extracted_data) {
            const d = res.extracted_data
            if (d.full_name) setFullName(d.full_name)
            if (d.cccd_number) setIdentityCard(d.cccd_number)
            if (d.bhyt_code) setBhytCode(d.bhyt_code)
            if (d.dob) setDob(d.dob)
            if (d.gender) setGender(d.gender === 'female' ? 'Nữ' : 'Nam')
            if (d.address) setAddress(d.address)
            setOcrSuccessMsg('AI đã trích xuất thành công thông tin từ thẻ CCCD/BHYT!')
            setHisChecked(false)
          } else {
            setError('Không nhận diện được rõ nét thông tin từ ảnh. Vui lòng chụp lại ảnh rõ nét.')
          }
        } catch (err: any) {
          setError(err.message || 'Lỗi quét AI OCR')
        } finally {
          setOcrLoading(false)
          if (e.target) e.target.value = ''
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError(err.message || 'Lỗi đọc tệp ảnh')
      setOcrLoading(false)
    }
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
      setOcrSuccessMsg('')
      const res = await checkPatientHis({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        identity_card: identityCard.trim()
      })
      setHisCheckResult(res)
      setHisChecked(true)

      // Nếu có sẵn trên HIS, tự động đổ dữ liệu
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

  // Đi tới bước 2
  function goToStep2() {
    if (!fullName.trim() || !phoneNumber.trim() || !identityCard.trim()) {
      setError('Vui lòng điền đầy đủ Họ tên, Số điện thoại và Số CCCD.')
      return
    }
    if (!hisChecked) {
      setError('Vui lòng thực hiện "Đối soát HIS/EMR Bệnh viện" trước khi tiếp tục.')
      return
    }
    setError('')
    setCurrentStep(2)
  }

  // Đi tới bước 3
  function goToStep3() {
    setError('')
    setCurrentStep(3)
  }

  // Xử lý gửi Form đăng ký
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!hisChecked) {
      setError('Vui lòng hoàn thành bước đối soát hồ sơ HIS/EMR Bệnh viện.')
      setCurrentStep(1)
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
      setError('Bạn cần xác nhận đồng ý với điều khoản bảo vệ dữ liệu cá nhân y tế theo Nghị định 13/2023/NĐ-CP.')
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
        allergies: allergies.trim() || undefined,
        emergency_contact_name: emergencyContactName.trim() || undefined,
        emergency_contact_phone: emergencyContactPhone.trim() || undefined
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
    <div className="cs-register-viewport">
      <div className="cs-register-layout">
        
        {/* =================================================================
            LEFT COLUMN: Clinical Brand & Reassurance Panel (Clinical Sanctuary)
            ================================================================= */}
        <aside className="cs-register-sidebar">
          <div className="cs-brand-lockup">
            <div className="cs-brand-icon">
              <HeartPulse size={26} color="#ffffff" />
            </div>
            <div>
              <span className="cs-brand-name">CareConnect</span>
              <span className="cs-brand-sub">Bệnh Viện Số & Y Tế Từ Xa</span>
            </div>
          </div>

          <div className="cs-reassurance-hero">
            <h2>Hồ Sơ Y Tế Số Đồng Bộ Toàn Diện</h2>
            <p>
              Tạo tài khoản bệnh nhân để kết nối trực tiếp với buồng khám Video Telehealth, 
              liên thông thẻ BHYT quốc gia và đồng bộ y bạ điện tử EMR từ bệnh viện.
            </p>
          </div>

          {/* Clinical Pillars */}
          <div className="cs-pillars-list">
            <div className="cs-pillar-item">
              <div className="cs-pillar-icon"><ShieldCheck size={18} /></div>
              <div>
                <strong>Bảo Mật Chuẩn Nghị Định 13</strong>
                <p>Mã hóa dữ liệu định danh bệnh nhân cấp độ cột bằng tiêu chuẩn AES-256 y tế.</p>
              </div>
            </div>

            <div className="cs-pillar-item">
              <div className="cs-pillar-icon"><Building2 size={18} /></div>
              <div>
                <strong>Liên Thông Trực Tiếp HIS/EMR</strong>
                <p>Tự động nhận diện hồ sơ bệnh án cũ qua số CCCD/VNeID mà không cần khai báo lại.</p>
              </div>
            </div>

            <div className="cs-pillar-item">
              <div className="cs-pillar-icon"><FileCheck2 size={18} /></div>
              <div>
                <strong>Thẻ BHYT & Đơn Thuốc Quốc Gia</strong>
                <p>Tra cứu mức hưởng viện phí tức thì, nhận đơn thuốc ký số SmartCA hợp chuẩn Bộ Y Tế.</p>
              </div>
            </div>
          </div>

          {/* Hotline & Security Badge */}
          <div className="cs-sidebar-footer">
            <div className="cs-hotline-pill">
              <Phone size={14} />
              <span>Hỗ trợ y tế 24/7: <strong>1900 8888</strong></span>
            </div>
            <span className="cs-version-tag">CareConnect HIS Core v4.2 • BYT Certified</span>
          </div>
        </aside>

        {/* =================================================================
            RIGHT COLUMN: Interactive Clinical Sanctuary Form
            ================================================================= */}
        <main className="cs-register-main">
          {/* Top Bar Navigation */}
          <div className="cs-top-bar">
            <button type="button" className="cs-back-link" onClick={onBackToLogin}>
              <ArrowLeft size={16} />
              <span>Quay lại Đăng nhập</span>
            </button>
            <div className="cs-top-chip">
              <span className="cs-dot-live"></span>
              <span>Cổng Tiếp Nhận Bệnh Nhân</span>
            </div>
          </div>

          {/* Form Header */}
          <header className="cs-form-header">
            <h1>Đăng ký Hồ sơ Y tế Bệnh nhân</h1>
            <p>Xác thực định danh công dân & thiết lập y bạ điện tử chăm sóc sức khỏe từ xa</p>
          </header>

          {/* Stepper Progress Bar (Clinical Sanctuary Standard) */}
          <div className="cs-stepper">
            <div 
              className={`cs-step-node ${currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              <div className="cs-step-badge">
                {currentStep > 1 ? <Check size={14} strokeWidth={3} /> : '1'}
              </div>
              <div className="cs-step-meta">
                <span className="cs-step-no">Bước 1</span>
                <span className="cs-step-label">Định danh & HIS</span>
              </div>
            </div>

            <div className={`cs-step-line ${currentStep >= 2 ? 'active' : ''}`} />

            <div 
              className={`cs-step-node ${currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : ''}`}
              onClick={() => { if (hisChecked) setCurrentStep(2) }}
            >
              <div className="cs-step-badge">
                {currentStep > 2 ? <Check size={14} strokeWidth={3} /> : '2'}
              </div>
              <div className="cs-step-meta">
                <span className="cs-step-no">Bước 2</span>
                <span className="cs-step-label">Y bạ & BHYT</span>
              </div>
            </div>

            <div className={`cs-step-line ${currentStep >= 3 ? 'active' : ''}`} />

            <div 
              className={`cs-step-node ${currentStep === 3 ? 'active' : ''}`}
              onClick={() => { if (hisChecked) setCurrentStep(3) }}
            >
              <div className="cs-step-badge">3</div>
              <div className="cs-step-meta">
                <span className="cs-step-no">Bước 3</span>
                <span className="cs-step-label">Bảo mật & Kích hoạt</span>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="cs-form-container">
            
            {/* =============================================================
                STEP 1: ĐỊNH DANH CÔNG DÂN & ĐỐI SOÁT HIS/EMR
                ============================================================= */}
            {currentStep === 1 && (
              <div className="cs-step-pane">
                {/* AI OCR Smart Card Scan Tool */}
                <div className="cs-ocr-banner">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleOcrUpload}
                  />
                  <div className="cs-ocr-content">
                    <div className="cs-ocr-icon">
                      <Camera size={20} />
                    </div>
                    <div>
                      <strong>Quét Tự Động Thẻ Căn Cước / Thẻ BHYT</strong>
                      <p>Sử dụng AI OCR để tự động điền họ tên, số CCCD, ngày sinh và số thẻ BHYT</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cs-btn-ocr"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrLoading}
                  >
                    {ocrLoading ? (
                      <>
                        <Activity size={15} className="cs-spin" />
                        <span>AI đang đọc thẻ...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Chụp / Tải ảnh thẻ</span>
                      </>
                    )}
                  </button>
                </div>

                {ocrSuccessMsg && (
                  <div className="cs-banner-success">
                    <CheckCircle2 size={16} />
                    <span>{ocrSuccessMsg}</span>
                  </div>
                )}

                {/* Form Fields: Step 1 */}
                <div className="cs-field-group">
                  <label>
                    Họ và tên bệnh nhân <span className="cs-req">*</span>
                  </label>
                  <div className="cs-input-box">
                    <UserRound size={17} className="cs-input-icon" />
                    <input
                      type="text"
                      placeholder="Ví dụ: Nguyễn Văn An"
                      value={fullName}
                      onChange={e => { setFullName(e.target.value); setHisChecked(false); }}
                      required
                    />
                  </div>
                </div>

                <div className="cs-grid-2">
                  <div className="cs-field-group">
                    <label>
                      Số điện thoại di động <span className="cs-req">*</span>
                    </label>
                    <div className="cs-input-box">
                      <Phone size={17} className="cs-input-icon" />
                      <input
                        type="tel"
                        placeholder="0912 345 678"
                        value={phoneNumber}
                        onChange={e => { setPhoneNumber(e.target.value); setHisChecked(false); }}
                        required
                      />
                    </div>
                  </div>

                  <div className="cs-field-group">
                    <label>
                      Số CCCD / Định danh VNeID <span className="cs-req">*</span>
                    </label>
                    <div className="cs-input-box">
                      <CreditCard size={17} className="cs-input-icon" />
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="12 chữ số căn cước"
                        value={identityCard}
                        onChange={e => { setIdentityCard(e.target.value); setHisChecked(false); }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* HIS Verification Trigger CTA */}
                <div className="cs-his-action-box">
                  <button
                    type="button"
                    className={`cs-btn-his-check ${checkingHis ? 'loading' : ''} ${hisChecked ? 'checked' : ''}`}
                    onClick={handleCheckHis}
                    disabled={checkingHis || !fullName.trim() || !phoneNumber.trim() || !identityCard.trim()}
                  >
                    {checkingHis ? (
                      <>
                        <Activity size={18} className="cs-spin" />
                        <span>Đang kết nối & đối soát cơ sở dữ liệu HIS/EMR Bệnh viện...</span>
                      </>
                    ) : hisChecked ? (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Đã hoàn tất đối soát HIS (Nhấn để kiểm tra lại)</span>
                      </>
                    ) : (
                      <>
                        <Building2 size={18} />
                        <span>Đối soát hồ sơ trên hệ thống HIS/EMR Bệnh viện</span>
                      </>
                    )}
                  </button>
                  <span className="cs-his-note">
                    * Bệnh viện sử dụng bộ ba: <strong>Họ tên + Số điện thoại + Số CCCD</strong> để định danh chính xác hồ sơ bệnh án.
                  </span>
                </div>

                {/* HIS Check Result Display */}
                {hisChecked && hisCheckResult && (
                  <div className="cs-his-card-wrapper">
                    {hisCheckResult.already_registered_in_app ? (
                      <div className="cs-card-result warn">
                        <div className="cs-card-title">
                          <AlertTriangle size={20} color="#ba1a1a" />
                          <strong>Tài khoản đã tồn tại trên CareConnect</strong>
                        </div>
                        <p>{hisCheckResult.message}</p>
                        <button type="button" className="cs-btn-link-action" onClick={onBackToLogin}>
                          Chuyển đến màn hình Đăng nhập ngay →
                        </button>
                      </div>
                    ) : hisCheckResult.exists_in_his ? (
                      <div className="cs-card-result success">
                        <div className="cs-card-title">
                          <div className="cs-icon-circle-success">
                            <CheckCircle2 size={18} color="#005f40" />
                          </div>
                          <div>
                            <strong>Tìm thấy hồ sơ bệnh án điện tử tại bệnh viện!</strong>
                            <span className="cs-pid-badge">Mã PID: {hisCheckResult.external_patient_id}</span>
                          </div>
                        </div>

                        <div className="cs-his-grid">
                          <div className="cs-his-item">
                            <span className="cs-his-label">Số thẻ BHYT</span>
                            <span className="cs-his-val">{hisCheckResult.bhyt_no || 'Chưa liên kết thẻ'}</span>
                          </div>
                          <div className="cs-his-item">
                            <span className="cs-his-label">Ngày sinh</span>
                            <span className="cs-his-val">{hisCheckResult.dob || 'Theo hồ sơ'}</span>
                          </div>
                          <div className="cs-his-item">
                            <span className="cs-his-label">Giới tính</span>
                            <span className="cs-his-val">{hisCheckResult.gender || 'Theo hồ sơ'}</span>
                          </div>
                          <div className="cs-his-item">
                            <span className="cs-his-label">Nhóm máu</span>
                            <span className="cs-his-val">{hisCheckResult.blood_type || 'Chưa xác định'}</span>
                          </div>
                        </div>

                        {hisCheckResult.conditions && hisCheckResult.conditions.length > 0 && (
                          <div className="cs-his-conditions">
                            <span className="cs-his-label">Tiền sử chẩn đoán EMR:</span>
                            <div className="cs-tags-wrap">
                              {hisCheckResult.conditions.map((c, i) => (
                                <span key={i} className="cs-condition-chip">
                                  {c.display || c.code}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="cs-his-reassure">
                          <ShieldCheck size={15} />
                          <span>Dữ liệu y bạ cũ sẽ được tự động liên thông an toàn sau khi tạo tài khoản.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="cs-card-result info">
                        <div className="cs-card-title">
                          <div className="cs-icon-circle-info">
                            <Sparkles size={18} color="#006398" />
                          </div>
                          <div>
                            <strong>Bệnh nhân đăng ký mới</strong>
                            <span className="cs-new-badge">Sẽ tự động cấp mã PID mới</span>
                          </div>
                        </div>
                        <p>
                          Chưa có thông tin khám trước đây tại cơ sở. Hệ thống sẽ tự động tạo hồ sơ bệnh án điện tử mới 
                          chuẩn quốc gia khi bạn hoàn tất đăng ký.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 1 Actions */}
                <div className="cs-step-actions">
                  <div />
                  <button
                    type="button"
                    className="cs-btn-primary-cta"
                    onClick={goToStep2}
                    disabled={!hisChecked || !!hisCheckResult?.already_registered_in_app}
                  >
                    <span>Tiếp tục: Bổ sung Y bạ</span>
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}

            {/* =============================================================
                STEP 2: BỔ SUNG Y BẠ, BHYT & THÔNG TIN SỨC KHỎE
                ============================================================= */}
            {currentStep === 2 && (
              <div className="cs-step-pane">
                <div className="cs-step-intro">
                  <Stethoscope size={18} className="cs-intro-icon" />
                  <div>
                    <strong>Thông Tin Lâm Sàng & Bảo Hiểm Y Tế</strong>
                    <p>Giúp bác sĩ tiếp cận tiền sử sức khỏe và áp dụng chế độ giảm trừ BHYT chính xác khi khám từ xa.</p>
                  </div>
                </div>

                <div className="cs-grid-2">
                  <div className="cs-field-group">
                    <label>Ngày sinh</label>
                    <div className="cs-input-box">
                      <Calendar size={17} className="cs-input-icon" />
                      <input
                        type="date"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="cs-field-group">
                    <label>Giới tính sinh học</label>
                    <select 
                      value={gender} 
                      onChange={e => setGender(e.target.value)}
                      className="cs-select-box"
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="cs-grid-2">
                  <div className="cs-field-group">
                    <label>Mã thẻ Bảo hiểm Y tế (BHYT)</label>
                    <div className="cs-input-box">
                      <ShieldCheck size={17} className="cs-input-icon" />
                      <input
                        type="text"
                        maxLength={15}
                        placeholder="Ví dụ: GD4797931812345"
                        value={bhytCode}
                        onChange={e => setBhytCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div className="cs-field-group">
                    <label>Nhóm máu</label>
                    <div className="cs-input-box">
                      <Droplets size={17} className="cs-input-icon" />
                      <select 
                        value={bloodType} 
                        onChange={e => setBloodType(e.target.value)}
                        className="cs-select-clean"
                      >
                        <option value="O+">O+ (Phổ biến)</option>
                        <option value="A+">A+</option>
                        <option value="B+">B+</option>
                        <option value="AB+">AB+</option>
                        <option value="O-">O- (Hiếm)</option>
                        <option value="A-">A- (Hiếm)</option>
                        <option value="B-">B- (Hiếm)</option>
                        <option value="AB-">AB- (Hiếm)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="cs-field-group">
                  <label>Địa chỉ thường trú / nơi ở hiện tại</label>
                  <div className="cs-input-box">
                    <MapPin size={17} className="cs-input-icon" />
                    <input
                      type="text"
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cs-field-group">
                  <label>Tiền sử dị ứng thuốc & thực phẩm</label>
                  <div className="cs-input-box">
                    <AlertTriangle size={17} className="cs-input-icon" />
                    <input
                      type="text"
                      placeholder="Ví dụ: Dị ứng Penicillin, Aspirin, hải sản (hoặc để trống nếu không có)"
                      value={allergies}
                      onChange={e => setAllergies(e.target.value)}
                    />
                  </div>
                </div>

                {/* Emergency Contact Information */}
                <div className="cs-emergency-section">
                  <div className="cs-section-subhead">
                    <Users size={16} />
                    <span>Người Liên Hệ Khẩn Cấp (Emergency Contact)</span>
                  </div>
                  <div className="cs-grid-2">
                    <div className="cs-field-group">
                      <label>Họ tên người thân</label>
                      <input
                        type="text"
                        className="cs-plain-input"
                        placeholder="Họ tên người thân (vợ/chồng, cha mẹ...)"
                        value={emergencyContactName}
                        onChange={e => setEmergencyContactName(e.target.value)}
                      />
                    </div>
                    <div className="cs-field-group">
                      <label>SĐT liên hệ khẩn cấp</label>
                      <input
                        type="tel"
                        className="cs-plain-input"
                        placeholder="Số điện thoại người thân"
                        value={emergencyContactPhone}
                        onChange={e => setEmergencyContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2 Actions */}
                <div className="cs-step-actions">
                  <button type="button" className="cs-btn-secondary" onClick={() => setCurrentStep(1)}>
                    <ArrowLeft size={16} />
                    <span>Quay lại Bước 1</span>
                  </button>
                  <button type="button" className="cs-btn-primary-cta" onClick={goToStep3}>
                    <span>Tiếp tục: Mật khẩu</span>
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            )}

            {/* =============================================================
                STEP 3: MẬT KHẨU, PHÁP LÝ & HOÀN TẤT KÍCH HOẠT
                ============================================================= */}
            {currentStep === 3 && (
              <div className="cs-step-pane">
                <div className="cs-step-intro">
                  <Shield size={18} className="cs-intro-icon" />
                  <div>
                    <strong>Thiết Lập Mật Khẩu Đăng Nhập & Bảo Mật</strong>
                    <p>Mật khẩu được mã hóa chuẩn y tế bảo vệ an toàn tuyệt đối hồ sơ bệnh án cá nhân.</p>
                  </div>
                </div>

                <div className="cs-field-group">
                  <label>Email liên hệ (Tùy chọn nhận đơn thuốc PDF)</label>
                  <div className="cs-input-box">
                    <UserRound size={17} className="cs-input-icon" />
                    <input
                      type="email"
                      placeholder="vidu@email.com (không bắt buộc)"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="cs-grid-2">
                  <div className="cs-field-group">
                    <label>
                      Mật khẩu đăng nhập <span className="cs-req">*</span>
                    </label>
                    <div className="cs-input-box">
                      <Lock size={17} className="cs-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Tối thiểu 6 ký tự"
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

                  <div className="cs-field-group">
                    <label>
                      Xác nhận lại mật khẩu <span className="cs-req">*</span>
                    </label>
                    <div className="cs-input-box">
                      <Lock size={17} className="cs-input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập lại chính xác"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {password && (
                  <div className="cs-pwd-meter">
                    <div className="cs-pwd-bar-bg">
                      <div 
                        className="cs-pwd-bar-fill" 
                        style={{ 
                          width: `${(pwdStrength.score / 3) * 100}%`,
                          backgroundColor: pwdStrength.color 
                        }} 
                      />
                    </div>
                    <span className="cs-pwd-text" style={{ color: pwdStrength.color }}>
                      {pwdStrength.text}
                    </span>
                  </div>
                )}

                {/* Decree 13/2023 Consent Card */}
                <label className="cs-consent-card">
                  <input
                    type="checkbox"
                    checked={consentNghiDinh13}
                    onChange={e => setConsentNghiDinh13(e.target.checked)}
                  />
                  <div className="cs-consent-content">
                    <span className="cs-consent-heading">
                      Cam kết Bảo vệ Dữ liệu Cá nhân Y tế (Nghị định 13/2023/NĐ-CP)
                    </span>
                    <p className="cs-consent-text">
                      Tôi xác nhận các thông tin trên là chính xác và đồng ý cho phép Bệnh viện cùng hệ thống CareConnect 
                      xử lý, lưu trữ dữ liệu y tế phục vụ trực tiếp cho công tác khám chữa bệnh từ xa, liên thông kết quả cận lâm sàng 
                      và trích xuất giám định BHYT theo đúng quy định pháp luật.
                    </p>
                  </div>
                </label>

                {/* Step 3 Actions */}
                <div className="cs-step-actions">
                  <button type="button" className="cs-btn-secondary" onClick={() => setCurrentStep(2)}>
                    <ArrowLeft size={16} />
                    <span>Quay lại Bước 2</span>
                  </button>
                  <button
                    type="submit"
                    className="cs-btn-primary-cta submit"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Activity size={18} className="cs-spin" />
                        <span>Đang khởi tạo tài khoản & liên thông y bạ...</span>
                      </>
                    ) : hisCheckResult?.exists_in_his ? (
                      <>
                        <span>Xác Nhận & Liên Thông Y Bạ EMR</span>
                        <ArrowRight size={18} />
                      </>
                    ) : (
                      <>
                        <span>Tạo Mới Tài Khoản & Cấp Mã PID</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error Alert Box */}
            {error && (
              <div className="cs-error-alert">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Footer Quick Link */}
            <footer className="cs-form-footer">
              <span>Đã có tài khoản y tế trên hệ thống?</span>
              <button type="button" className="cs-btn-footer-login" onClick={onBackToLogin}>
                Đăng nhập ngay
              </button>
            </footer>
          </form>
        </main>

      </div>
    </div>
  )
}
