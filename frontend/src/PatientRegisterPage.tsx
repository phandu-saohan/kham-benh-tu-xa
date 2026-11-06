import React, { useState, useRef } from 'react'
import {
  HeartPulse, ShieldCheck, UserRound, Lock,
  CheckCircle2, AlertCircle, Building2, Eye, EyeOff,
  Sparkles, ArrowLeft, Check,
  Camera, Droplets, ChevronRight,
  QrCode, RefreshCw, Upload, Shield
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

const VIETNAM_ETHNICITIES = [
  'Kinh', 'Tày', 'Thái', 'Mường', 'H\'Mông', 'Dao', 'Khmer', 'Nùng', 'Hoa', 'Gia Rai',
  'Ê Đê', 'Ba Na', 'Xơ Đăng', 'Sán Dìu', 'Hre', 'Cơ Ho', 'Chăm', 'Sán Chay', 'Cơ Tu',
  'Giáy', 'Giẻ Triêng', 'Tà Ôi', 'Mạ', 'Kháng', 'Co', 'Ta Ôi', 'Khác'
]

const VIETNAM_PROVINCES = [
  { code: '01', name: '01 - TP. Hà Nội' },
  { code: '79', name: '79 - TP. Hồ Chí Minh' },
  { code: '48', name: '48 - TP. Đà Nẵng' },
  { code: '31', name: '31 - TP. Hải Phòng' },
  { code: '92', name: '92 - TP. Cần Thơ' },
  { code: '74', name: '74 - Tỉnh Bình Dương' },
  { code: '75', name: '75 - Tỉnh Đồng Nai' },
  { code: '77', name: '77 - Tỉnh Bà Rịa - Vũng Tàu' },
  { code: '46', name: '46 - Tỉnh Thừa Thiên Huế' },
  { code: '37', name: '37 - Tỉnh Ninh Bình' },
  { code: '26', name: '26 - Tỉnh Vĩnh Phúc' },
  { code: '68', name: '68 - Tỉnh Lâm Đồng' },
  { code: '56', name: '56 - Tỉnh Khánh Hòa' },
  { code: '89', name: '89 - Tỉnh An Giang' },
  { code: '84', name: '84 - Tỉnh Trà Vinh' }
]

export function PatientRegisterPage({ onSuccess, onBackToLogin }: PatientRegisterPageProps) {
  // Step indicator: 1 = Quét CCCD & Tra cứu HIS, 2 = Bổ sung thông tin Y tế chuẩn, 3 = Mật khẩu & Kích hoạt
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Step 1: Quét CCCD & Định danh
  const [identityCard, setIdentityCard] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Trạng thái kiểm tra HIS/EMR Bệnh viện
  const [checkingHis, setCheckingHis] = useState(false)
  const [hisCheckResult, setHisCheckResult] = useState<PatientHisCheckResponse | null>(null)
  const [hisChecked, setHisChecked] = useState(false)

  // Step 2: Bộ dữ liệu chuẩn theo QĐ 2682/QĐ-BYT & Luật KCB 2023
  // 1. Hành chính
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Nam')
  const [ethnicity, setEthnicity] = useState('Kinh')
  const [bloodType, setBloodType] = useState('O+')
  const [address, setAddress] = useState('')
  const [provinceCode, setProvinceCode] = useState('79')
  const [wardCode, setWardCode] = useState('')
  
  // Người đi cùng / Giám hộ
  const [hasCompanion, setHasCompanion] = useState(false)
  const [companionName, setCompanionName] = useState('')
  const [companionIdCard, setCompanionIdCard] = useState('')
  const [companionPhone, setCompanionPhone] = useState('')
  const [companionRelationship, setCompanionRelationship] = useState('Bố/Mẹ')

  // 2. Tiền sử sức khỏe & Dịch tễ
  const [hasMedicalHistory, setHasMedicalHistory] = useState(false)
  const [medicalHistoryIcd10, setMedicalHistoryIcd10] = useState('')
  const [medicalHistoryNotes, setMedicalHistoryNotes] = useState('')
  const [familyHistoryIcd10, setFamilyHistoryIcd10] = useState('')
  const [familyHistoryNotes, setFamilyHistoryNotes] = useState('')
  const [epidemiologicalHistory, setEpidemiologicalHistory] = useState('')
  const [allergies, setAllergies] = useState('')

  // 3. BHYT
  const [bhytCode, setBhytCode] = useState('')

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

    if (score <= 2) return { score: 1, text: 'Mật khẩu yếu', color: '#dc2626' }
    if (score <= 4) return { score: 2, text: 'Mật khẩu trung bình', color: '#d97706' }
    return { score: 3, text: 'Mật khẩu mạnh & đạt chuẩn bảo mật', color: '#16a34a' }
  }

  const pwdStrength = getPasswordStrength(password)

  // Hàm tự động check HIS bệnh viện bằng CCCD
  async function triggerHisCheck(cccdToTest: string, nameToTest?: string) {
    const cleanCCCD = cccdToTest.trim()
    if (!cleanCCCD || cleanCCCD.length < 9) {
      setError('Vui lòng nhập hoặc quét số CCCD hợp lệ (9 đến 12 số).')
      return
    }

    try {
      setCheckingHis(true)
      setError('')
      const res = await checkPatientHis({
        identity_card: cleanCCCD,
        full_name: nameToTest?.trim() || fullName.trim() || undefined,
        phone_number: phoneNumber.trim() || undefined
      })
      setHisCheckResult(res)
      setHisChecked(true)

      // TỰ ĐỘNG ĐỔ DỮ LIỆU TỪ HIS VÀO CÁC Ô THÔNG TIN (PRE-FILL)
      if (res.full_name && (!fullName || fullName.trim() === '')) {
        setFullName(res.full_name)
      }
      if (res.phone_number && (!phoneNumber || phoneNumber.trim() === '')) {
        setPhoneNumber(res.phone_number)
      }
      if (res.dob) setDob(res.dob)
      if (res.gender) setGender(res.gender === 'Nữ' || res.gender === 'female' ? 'Nữ' : 'Nam')
      if (res.bhyt_no) setBhytCode(res.bhyt_no)
      if (res.address) setAddress(res.address)
      if (res.blood_type) setBloodType(res.blood_type)
      if (res.ethnicity) setEthnicity(res.ethnicity)
      if (res.province_code) setProvinceCode(res.province_code)
      if (res.ward_code) setWardCode(res.ward_code)

      // Tiền sử EMR cũ từ bệnh viện
      if (res.conditions && res.conditions.length > 0) {
        setHasMedicalHistory(true)
        const codes = res.conditions.map(c => c.code || '').filter(Boolean).join('; ')
        if (codes) setMedicalHistoryIcd10(codes)
        const notes = res.conditions.map(c => c.display || c.note || '').filter(Boolean).join(', ')
        if (notes) setMedicalHistoryNotes(notes)
      }

      // Cảnh báo dị ứng từ bệnh viện
      if (res.allergies && res.allergies.length > 0) {
        const algs = res.allergies.map(a => a.substance || (typeof a === 'string' ? a : '')).filter(Boolean).join(', ')
        if (algs) setAllergies(algs)
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối đối soát với hệ thống HIS Bệnh viện')
    } finally {
      setCheckingHis(false)
    }
  }

  // Quét AI OCR từ ảnh thẻ CCCD / BHYT
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
            const scannedCCCD = d.cccd_number || identityCard
            const scannedName = d.full_name || fullName

            if (d.full_name) setFullName(d.full_name)
            if (d.cccd_number) setIdentityCard(d.cccd_number)
            if (d.bhyt_code) setBhytCode(d.bhyt_code)
            if (d.dob) setDob(d.dob)
            if (d.gender) setGender(d.gender === 'female' ? 'Nữ' : 'Nam')
            if (d.address) setAddress(d.address)

            setOcrSuccessMsg('AI đã nhận diện thành công CCCD! Đang đối soát với HIS bệnh viện...')
            
            // TỰ ĐỘNG CHECK NGAY VỚI HIS BỆNH VIỆN
            if (scannedCCCD && scannedCCCD.trim().length >= 9) {
              await triggerHisCheck(scannedCCCD, scannedName)
            }
          } else {
            setError('Không nhận diện được rõ nét thông tin từ ảnh. Vui lòng chụp lại ảnh CCCD rõ nét hơn.')
          }
        } catch (err: any) {
          setError(err.message || 'Lỗi quét AI OCR CCCD')
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

  // Quét hoặc dán chuỗi QR Code CCCD / VNeID chuẩn Bộ Công An
  function handleQrPaste(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.trim()
    if (!raw) return

    // Chuẩn QR CCCD: CCCD|CMND|Họ tên|DDMMYYYY|Giới tính|Địa chỉ|Ngày cấp
    if (raw.includes('|')) {
      const parts = raw.split('|').map(p => p.trim())
      if (parts.length >= 1) {
        const cccd = parts[0]
        const name = parts[2] || ''
        const dobRaw = parts[3] || ''
        let dobIso = ''
        if (dobRaw.length === 8 && /^\d+$/.test(dobRaw)) {
          dobIso = `${dobRaw.substring(4, 8)}-${dobRaw.substring(2, 4)}-${dobRaw.substring(0, 2)}`
        }
        const gnd = parts[4] || ''
        const addr = parts[5] || ''

        setIdentityCard(cccd)
        if (name) setFullName(name)
        if (dobIso) setDob(dobIso)
        if (gnd) setGender(gnd === 'Nữ' ? 'Nữ' : 'Nam')
        if (addr) setAddress(addr)

        setOcrSuccessMsg(`Đã trích xuất mã QR CCCD của ${name || cccd}! Đang đối soát với HIS...`)
        triggerHisCheck(cccd, name)
        return
      }
    }

    setIdentityCard(raw)
    if (raw.length === 12) {
      triggerHisCheck(raw, fullName)
    }
  }

  // Chọn bộ dữ liệu Test nhanh trên HIS Bệnh viện
  function handleSelectPreset(presetCCCD: string, presetName: string, presetPhone: string) {
    setIdentityCard(presetCCCD)
    setFullName(presetName)
    setPhoneNumber(presetPhone)
    setOcrSuccessMsg(`Đã nạp mẫu thử nghiệm ${presetName}. Đang tự động đối soát với HIS bệnh viện...`)
    triggerHisCheck(presetCCCD, presetName)
  }

  // Chuyển sang Bước 2
  function goToStep2() {
    if (!identityCard.trim() || identityCard.trim().length < 9) {
      setError('Vui lòng quét hoặc nhập số CCCD hợp lệ trước khi tiếp tục.')
      return
    }
    if (!hisChecked) {
      setError('Vui lòng thực hiện kiểm tra đối soát với hệ thống HIS Bệnh viện.')
      return
    }
    if (hisCheckResult?.already_registered_in_app) {
      setError('Tài khoản này đã tồn tại trên CareConnect. Vui lòng bấm Đăng nhập.')
      return
    }
    setError('')
    setCurrentStep(2)
  }

  // Chuyển sang Bước 3
  function goToStep3() {
    if (!fullName.trim()) {
      setError('Vui lòng nhập Họ và tên đầy đủ của người bệnh.')
      return
    }
    if (!dob) {
      setError('Vui lòng chọn ngày, tháng, năm sinh của người bệnh.')
      return
    }
    setError('')
    setCurrentStep(3)
  }

  // Gửi Form đăng ký chính thức
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!phoneNumber.trim() || phoneNumber.trim().length < 9) {
      setError('Vui lòng nhập Số điện thoại hợp lệ (tối thiểu 9 số) để tạo tài khoản.')
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
        password: password,
        email: email.trim() || undefined,
        dob: dob || undefined,
        gender: gender || 'Nam',
        bhyt_code: bhytCode.trim() || undefined,
        address: address.trim() || undefined,
        blood_type: bloodType,
        allergies: allergies.trim() || undefined,
        ethnicity: ethnicity || 'Kinh',
        province_code: provinceCode || undefined,
        ward_code: wardCode.trim() || undefined,
        companion_name: hasCompanion ? companionName.trim() : undefined,
        companion_id_card: hasCompanion ? companionIdCard.trim() : undefined,
        companion_phone: hasCompanion ? companionPhone.trim() : undefined,
        companion_relationship: hasCompanion ? companionRelationship : undefined,
        has_medical_history: hasMedicalHistory,
        medical_history_icd10: hasMedicalHistory ? medicalHistoryIcd10.trim() : undefined,
        medical_history_notes: hasMedicalHistory ? medicalHistoryNotes.trim() : undefined,
        family_history_icd10: familyHistoryIcd10.trim() || undefined,
        family_history_notes: familyHistoryNotes.trim() || undefined,
        epidemiological_history: epidemiologicalHistory.trim() || undefined
      })

      onSuccess(res)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi đăng ký tài khoản hồ sơ y tế.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pr-viewport">
      <div className="pr-container">
        {/* CỘT TRÁI: Nhận diện thương hiệu Y tế & Tiêu chuẩn Quốc gia */}
        <div className="pr-sidebar">
          <div>
            <div className="pr-brand-lockup">
              <div className="pr-brand-icon">
                <HeartPulse size={24} color="#ffffff" />
              </div>
              <div>
                <span className="pr-brand-name">CareConnect</span>
                <span className="pr-brand-sub">HỒ SƠ SỨC KHỎE ĐIỆN TỬ</span>
              </div>
            </div>

            <div className="pr-hero">
              <div className="pr-badge-pill">
                <Sparkles size={12} />
                <span>LIÊN THÔNG HIS & ĐỀ ÁN 06/CP</span>
              </div>
              <h2>Hồ Sơ Y Tế Số Điện Tử Chuẩn QĐ 2682/QĐ-BYT</h2>
              <p>
                Tự động đối soát CCCD với HIS/EMR bệnh viện, đồng bộ lịch sử khám chữa bệnh, toa thuốc điện tử và quyền lợi BHYT.
              </p>
            </div>

            <div className="pr-features-list">
              <div className="pr-feature-item">
                <div className="pr-feature-icon">
                  <QrCode size={16} />
                </div>
                <div>
                  <strong>Ưu tiên Quét CCCD Gắn Chip</strong>
                  <span>Tự động trích xuất thông tin hành chính và đối soát trực tiếp với dữ liệu viện.</span>
                </div>
              </div>

              <div className="pr-feature-item">
                <div className="pr-feature-icon">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong>Bảo vệ dữ liệu Nghị định 13/2023</strong>
                  <span>Hồ sơ y bạ được mã hóa an toàn, phân quyền và xác thực đa lớp.</span>
                </div>
              </div>

              <div className="pr-feature-item">
                <div className="pr-feature-icon">
                  <Building2 size={16} />
                </div>
                <div>
                  <strong>Cấp Mã PID Y Tế Bệnh Viện</strong>
                  <span>Đồng bộ thẻ BHYT và kết nối phòng khám Telehealth với bác sĩ chuyên khoa.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pr-sidebar-footer">
            <button type="button" className="pr-btn-sidebar-login" onClick={onBackToLogin}>
              <ArrowLeft size={15} />
              <span>Đã có tài khoản? Đăng nhập ngay</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: Form Đăng Ký 3 Bước */}
        <div className="pr-main">
          <div className="pr-topbar">
            <button type="button" className="pr-back-link" onClick={onBackToLogin}>
              <ArrowLeft size={15} />
              <span>Quay lại Đăng nhập</span>
            </button>
            <div className="pr-badge-tag">
              <span className="pr-dot-live" />
              <span>Tiếp Nhận Người Bệnh Trực Tuyến</span>
            </div>
          </div>

          <div className="pr-header">
            <h1>Đăng Ký Hồ Sơ Sức Khỏe Điện Tử</h1>
            <p>Khởi tạo hồ sơ bệnh nhân liên thông hệ thống HIS Bệnh viện & Cổng BHYT Quốc gia</p>
          </div>

          {/* Stepper Bar 3 Bước */}
          <div className="pr-stepper">
            <div
              className={`pr-step-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              <div className="pr-step-num">
                {currentStep > 1 ? <Check size={14} /> : '1'}
              </div>
              <div className="pr-step-labels">
                <span className="pr-step-title">Quét CCCD & Tra Cứu HIS</span>
                <span className="pr-step-desc">Đối soát bệnh viện</span>
              </div>
            </div>

            <div className="pr-step-divider" />

            <div
              className={`pr-step-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
              onClick={() => hisChecked && goToStep2()}
            >
              <div className="pr-step-num">
                {currentStep > 2 ? <Check size={14} /> : '2'}
              </div>
              <div className="pr-step-labels">
                <span className="pr-step-title">Hồ Sơ Y Tế & Tiền Sử</span>
                <span className="pr-step-desc">Chuẩn QĐ 2682/QĐ-BYT</span>
              </div>
            </div>

            <div className="pr-step-divider" />

            <div
              className={`pr-step-item ${currentStep === 3 ? 'active' : ''}`}
              onClick={() => hisChecked && fullName && goToStep3()}
            >
              <div className="pr-step-num">3</div>
              <div className="pr-step-labels">
                <span className="pr-step-title">Bảo Mật & Kích Hoạt</span>
                <span className="pr-step-desc">Tạo mật khẩu</span>
              </div>
            </div>
          </div>

          {/* Cảnh báo lỗi */}
          {error && (
            <div className="pr-alert error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Thông báo:</strong> {error}
              </div>
            </div>
          )}

          {/* =========================================================================
              BƯỚC 1: QUÉT CCCD & TRA CỨU HIS BỆNH VIỆN (ƯU TIÊN SỐ 1)
             ========================================================================= */}
          {currentStep === 1 && (
            <div>
              {/* Thẻ Quét CCCD Gắn Chip & VNeID */}
              <div className="pr-scanner-box">
                <div className="pr-scanner-header">
                  <div className="pr-scanner-icon">
                    <Camera size={20} />
                  </div>
                  <div className="pr-scanner-title">
                    <h3>Ưu tiên Quét thẻ CCCD / Mã QR VNeID</h3>
                    <p>Hệ thống tự động đọc thông tin và đối soát trực tiếp với cơ sở dữ liệu HIS viện</p>
                  </div>
                </div>

                {/* Các phương thức quét */}
                <div className="pr-scanner-actions">
                  {/* Nút Upload / Chụp ảnh CCCD */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handleOcrUpload}
                  />
                  <button
                    type="button"
                    className="pr-btn pr-btn-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrLoading || checkingHis}
                  >
                    <Upload size={16} />
                    <span>{ocrLoading ? 'Đang đọc thẻ CCCD...' : 'Chụp / Tải ảnh CCCD (AI OCR)'}</span>
                  </button>

                  {/* Nhập hoặc Quét QR CCCD */}
                  <div className="pr-input-icon-wrap">
                    <QrCode size={17} className="pr-input-icon" />
                    <input
                      type="text"
                      className="pr-input"
                      placeholder="Dán mã QR hoặc nhập số CCCD 12 số..."
                      value={identityCard}
                      onChange={handleQrPaste}
                    />
                  </div>
                </div>

                {/* Thông báo quét thành công */}
                {ocrSuccessMsg && (
                  <div className="pr-alert success" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{ocrSuccessMsg}</span>
                  </div>
                )}

                {/* Nút Demo Test Nhanh */}
                <div className="pr-presets-bar">
                  <span className="pr-presets-title">⚡ Thử nhanh hồ sơ mẫu trên HIS Bệnh viện:</span>
                  <div className="pr-presets-chips">
                    <button
                      type="button"
                      className="pr-btn-preset"
                      onClick={() => handleSelectPreset('080180012345', 'Nguyễn Thị Bích Hòa', '0900000001')}
                    >
                      Bệnh nhân có EMR & BHYT (080180012345 - Bích Hòa)
                    </button>
                    <button
                      type="button"
                      className="pr-btn-preset"
                      onClick={() => handleSelectPreset('079192023456', 'Trần Văn Đạt', '0900000002')}
                    >
                      Bệnh nhân tái khám (079192023456 - Văn Đạt)
                    </button>
                    <button
                      type="button"
                      className="pr-btn-preset"
                      onClick={() => handleSelectPreset('079201009999', 'Lê Hoàng Nam', '0988776655')}
                    >
                      Bệnh nhân mới (Chưa có trên HIS)
                    </button>
                  </div>
                </div>
              </div>

              {/* Bấm Tra Cứu HIS thủ công nếu cần */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
                <button
                  type="button"
                  className="pr-btn pr-btn-accent"
                  onClick={() => triggerHisCheck(identityCard, fullName)}
                  disabled={checkingHis || !identityCard.trim()}
                >
                  <RefreshCw size={15} className={checkingHis ? 'pr-spin' : ''} />
                  <span>{checkingHis ? 'Đang đối soát HIS Bệnh viện...' : 'Tra cứu & Đối soát với HIS Bệnh viện'}</span>
                </button>
                <span style={{ fontSize: '12px', color: 'var(--pr-text-muted)' }}>
                  (Hệ thống tự động tra cứu khi nhập đủ 12 số CCCD)
                </span>
              </div>

              {/* Kết quả đối soát HIS */}
              {hisChecked && hisCheckResult && (
                <div>
                  {hisCheckResult.exists_in_his ? (
                    <div className="pr-his-card found">
                      <div className="pr-his-header">
                        <div className="pr-his-title-block">
                          <CheckCircle2 size={22} color="#16a34a" />
                          <div>
                            <h4>Đã tìm thấy Hồ sơ Y tế tại Bệnh viện (Mã PID: {hisCheckResult.external_patient_id})</h4>
                            <span>{hisCheckResult.message}</span>
                          </div>
                        </div>
                        <span className="pr-his-tag">LIÊN THÔNG HIS THÀNH CÔNG</span>
                      </div>

                      {/* Thông tin tự động lấy từ HIS */}
                      <div className="pr-his-data-grid">
                        <div className="pr-his-data-item">
                          <span className="label">Họ và tên:</span>
                          <strong>{hisCheckResult.full_name || fullName}</strong>
                        </div>
                        <div className="pr-his-data-item">
                          <span className="label">Ngày sinh:</span>
                          <strong>{hisCheckResult.dob || dob || 'Theo hồ sơ'}</strong>
                        </div>
                        <div className="pr-his-data-item">
                          <span className="label">Giới tính:</span>
                          <strong>{hisCheckResult.gender || gender}</strong>
                        </div>
                        <div className="pr-his-data-item">
                          <span className="label">Thẻ BHYT:</span>
                          <strong style={{ color: 'var(--pr-primary)', fontFamily: 'monospace' }}>
                            {hisCheckResult.bhyt_no || 'Chưa liên kết'}
                          </strong>
                        </div>
                        <div className="pr-his-data-item">
                          <span className="label">Nhóm máu:</span>
                          <strong style={{ color: '#dc2626' }}>{hisCheckResult.blood_type || 'Chưa xác định'}</strong>
                        </div>
                        <div className="pr-his-data-item">
                          <span className="label">Dân tộc:</span>
                          <strong>{hisCheckResult.ethnicity || ethnicity}</strong>
                        </div>
                        <div className="pr-his-data-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="label">Địa chỉ thường trú:</span>
                          <strong>{hisCheckResult.address || address || 'Theo CCCD'}</strong>
                        </div>
                        {hisCheckResult.conditions && hisCheckResult.conditions.length > 0 && (
                          <div className="pr-his-data-item" style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
                            <span className="label" style={{ fontWeight: 600 }}>Tiền sử EMR bệnh viện:</span>
                            <strong style={{ color: 'var(--pr-primary)' }}>
                              {hisCheckResult.conditions.map(c => `${c.code ? `[${c.code}] ` : ''}${c.display || ''}`).join(', ')}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" className="pr-btn pr-btn-primary" onClick={goToStep2}>
                          <span>Tiếp tục: Bổ sung Y bạ & Tiền sử (Bước 2)</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pr-his-card not-found">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 700, fontSize: '14px' }}>
                        <AlertCircle size={18} />
                        <span>Chưa có hồ sơ bệnh án cũ tại Bệnh viện</span>
                      </div>
                      <p style={{ margin: '6px 0 12px 0', fontSize: '13px', color: '#0c4a6e', lineHeight: 1.45 }}>
                        {hisCheckResult.message}
                      </p>
                      <button type="button" className="pr-btn pr-btn-accent" onClick={goToStep2}>
                        <span>Tiếp tục: Khởi tạo hồ sơ mới (Bước 2)</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              BƯỚC 2: BỔ SUNG THÔNG TIN Y TẾ CHUẨN QĐ 2682/QĐ-BYT & LUẬT KCB 2023
             ========================================================================= */}
          {currentStep === 2 && (
            <div>
              {/* 1. Thông tin hành chính cá nhân (Bắt buộc) */}
              <div className="pr-card">
                <div className="pr-card-header">
                  <div>
                    <h4 className="pr-card-title">
                      <UserRound size={17} color="var(--pr-primary)" />
                      <span>1. Thông tin hành chính cá nhân (Quy định QĐ 2682/QĐ-BYT)</span>
                    </h4>
                    <span className="pr-card-subtitle">Các trường thông tin đồng bộ dữ liệu y bạ viện</span>
                  </div>
                </div>

                <div className="pr-grid-3">
                  <div className="pr-form-group">
                    <label className="pr-label">
                      Họ và tên người bệnh: <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      className="pr-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value.toUpperCase())}
                      placeholder="NGUYỄN VĂN A"
                      required
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">
                      Ngày, tháng, năm sinh: <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      className="pr-input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">
                      Giới tính: <span className="required">*</span>
                    </label>
                    <select
                      className="pr-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">Số CCCD / Định danh:</label>
                    <input
                      type="text"
                      className="pr-input monospace"
                      value={identityCard}
                      readOnly
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">Mã số thẻ BHYT (nếu có):</label>
                    <input
                      type="text"
                      className="pr-input monospace"
                      value={bhytCode}
                      onChange={(e) => setBhytCode(e.target.value.toUpperCase())}
                      placeholder="DN479..."
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">Nhóm máu:</label>
                    <select
                      className="pr-select"
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                    >
                      <option value="A+">Nhóm A (Rh+)</option>
                      <option value="A-">Nhóm A (Rh-)</option>
                      <option value="B+">Nhóm B (Rh+)</option>
                      <option value="B-">Nhóm B (Rh-)</option>
                      <option value="AB+">Nhóm AB (Rh+)</option>
                      <option value="AB-">Nhóm AB (Rh-)</option>
                      <option value="O+">Nhóm O (Rh+)</option>
                      <option value="O-">Nhóm O (Rh-)</option>
                    </select>
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">Dân tộc:</label>
                    <select
                      className="pr-select"
                      value={ethnicity}
                      onChange={(e) => setEthnicity(e.target.value)}
                    >
                      {VIETNAM_ETHNICITIES.map(eth => (
                        <option key={eth} value={eth}>{eth}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pr-form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="pr-label">Tỉnh / Thành phố:</label>
                    <select
                      className="pr-select"
                      value={provinceCode}
                      onChange={(e) => setProvinceCode(e.target.value)}
                    >
                      {VIETNAM_PROVINCES.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pr-form-group pr-col-full">
                    <label className="pr-label">Địa chỉ thường trú / Số nhà, Phường/Xã:</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                      <input
                        type="text"
                        className="pr-input"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Số nhà, tên đường, khu phố..."
                      />
                      <input
                        type="text"
                        className="pr-input"
                        value={wardCode}
                        onChange={(e) => setWardCode(e.target.value)}
                        placeholder="Mã Phường / Xã..."
                      />
                    </div>
                  </div>

                  {/* Checkbox Người đi cùng / Giám hộ */}
                  <div className="pr-col-full" style={{ marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed var(--pr-border)' }}>
                    <label className="pr-checkbox-label">
                      <input
                        type="checkbox"
                        checked={hasCompanion}
                        onChange={(e) => setHasCompanion(e.target.checked)}
                      />
                      <span>Đăng ký kèm Người đi cùng / Người giám hộ hợp pháp (trẻ em hoặc người cao tuổi)</span>
                    </label>

                    {hasCompanion && (
                      <div className="pr-sub-panel">
                        <div className="pr-grid-4">
                          <div className="pr-form-group">
                            <label className="pr-label">Họ tên người giám hộ:</label>
                            <input
                              type="text"
                              className="pr-input"
                              value={companionName}
                              onChange={(e) => setCompanionName(e.target.value)}
                              placeholder="Họ tên người đi cùng..."
                            />
                          </div>
                          <div className="pr-form-group">
                            <label className="pr-label">Số CCCD người giám hộ:</label>
                            <input
                              type="text"
                              className="pr-input monospace"
                              value={companionIdCard}
                              onChange={(e) => setCompanionIdCard(e.target.value)}
                              placeholder="CCCD 12 số..."
                            />
                          </div>
                          <div className="pr-form-group">
                            <label className="pr-label">Số điện thoại liên hệ:</label>
                            <input
                              type="text"
                              className="pr-input"
                              value={companionPhone}
                              onChange={(e) => setCompanionPhone(e.target.value)}
                              placeholder="09xxxx..."
                            />
                          </div>
                          <div className="pr-form-group">
                            <label className="pr-label">Mối quan hệ:</label>
                            <select
                              className="pr-select"
                              value={companionRelationship}
                              onChange={(e) => setCompanionRelationship(e.target.value)}
                            >
                              <option value="Bố/Mẹ">Bố / Mẹ</option>
                              <option value="Vợ/Chồng">Vợ / Chồng</option>
                              <option value="Con">Con</option>
                              <option value="Người giám hộ">Người giám hộ hợp pháp</option>
                              <option value="Người thân khác">Người thân khác</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Tiền sử sức khỏe & Dịch tễ */}
              <div className="pr-card">
                <div className="pr-card-header">
                  <div>
                    <h4 className="pr-card-title">
                      <HeartPulse size={17} color="var(--pr-primary)" />
                      <span>2. Tiền sử sức khỏe & Dịch tễ (Mã ICD-10 & Bệnh mạn tính)</span>
                    </h4>
                    <span className="pr-card-subtitle">Hỗ trợ Bác sĩ hội chẩn và ra phác đồ điều trị an toàn</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label className="pr-checkbox-label">
                      <input
                        type="checkbox"
                        checked={hasMedicalHistory}
                        onChange={(e) => setHasMedicalHistory(e.target.checked)}
                      />
                      <span>Người bệnh có tiền sử bệnh mạn tính / đang điều trị lâu năm</span>
                    </label>

                    {hasMedicalHistory && (
                      <div className="pr-sub-panel">
                        <div className="pr-grid-2">
                          <div className="pr-form-group">
                            <label className="pr-label">Mã bệnh tiền sử ICD-10 (phân cách bằng dấu ;):</label>
                            <input
                              type="text"
                              className="pr-input monospace"
                              value={medicalHistoryIcd10}
                              onChange={(e) => setMedicalHistoryIcd10(e.target.value)}
                              placeholder="I10; E11.9; J45..."
                            />
                          </div>
                          <div className="pr-form-group">
                            <label className="pr-label">Ghi chú diễn biến bệnh sử bản thân:</label>
                            <input
                              type="text"
                              className="pr-input"
                              value={medicalHistoryNotes}
                              onChange={(e) => setMedicalHistoryNotes(e.target.value)}
                              placeholder="Phát hiện năm 2021, đang uống thuốc duy trì..."
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pr-grid-2">
                    <div className="pr-form-group">
                      <label className="pr-label">Tiền sử gia đình (Mã ICD-10 di truyền):</label>
                      <input
                        type="text"
                        className="pr-input"
                        value={familyHistoryIcd10}
                        onChange={(e) => setFamilyHistoryIcd10(e.target.value)}
                        placeholder="Mã ICD-10 (ví dụ: I10; E11)..."
                      />
                    </div>

                    <div className="pr-form-group">
                      <label className="pr-label">Tiền sử dịch tễ tiếp xúc:</label>
                      <input
                        type="text"
                        className="pr-input"
                        value={epidemiologicalHistory}
                        onChange={(e) => setEpidemiologicalHistory(e.target.value)}
                        placeholder="Không có / hoặc tiếp xúc gần ca mắc..."
                      />
                    </div>

                    <div className="pr-form-group pr-col-full">
                      <label className="pr-label">
                        <Droplets size={15} color="#dc2626" />
                        <span>Tiền sử dị ứng thuốc & thực phẩm:</span>
                      </label>
                      <input
                        type="text"
                        className="pr-input"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="Ví dụ: Dị ứng Penicillin, Paracetamol, hải sản... (Ghi 'Không' nếu không có)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Cụm nút hành động */}
              <div className="pr-action-bar">
                <button
                  type="button"
                  className="pr-btn pr-btn-secondary"
                  onClick={() => setCurrentStep(1)}
                >
                  <ArrowLeft size={15} />
                  <span>Quay lại Bước 1</span>
                </button>

                <button
                  type="button"
                  className="pr-btn pr-btn-primary"
                  onClick={goToStep3}
                >
                  <span>Tiếp tục: Thiết lập bảo mật tài khoản (Bước 3)</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              BƯỚC 3: MẬT KHẨU BẢO MẬT & ĐIỀU KHOẢN PHÁP LÝ NGHỊ ĐỊNH 13
             ========================================================================= */}
          {currentStep === 3 && (
            <form onSubmit={handleRegister}>
              <div className="pr-card">
                <div className="pr-card-header">
                  <div>
                    <h4 className="pr-card-title">
                      <Lock size={17} color="var(--pr-primary)" />
                      <span>3. Thông tin Đăng nhập & Bảo mật Tài khoản</span>
                    </h4>
                    <span className="pr-card-subtitle">Sử dụng Số điện thoại và Mật khẩu để đăng nhập hồ sơ trên ứng dụng</span>
                  </div>
                </div>

                <div className="pr-grid-2">
                  <div className="pr-form-group">
                    <label className="pr-label">
                      Số điện thoại đăng nhập: <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      className="pr-input"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0912345678"
                      required
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">Email nhận thông báo y tế:</label>
                    <input
                      type="email"
                      className="pr-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="benhnhan@email.com"
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">
                      Mật khẩu đăng nhập: <span className="required">*</span>
                    </label>
                    <div className="pr-input-icon-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="pr-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự..."
                        required
                        style={{ paddingRight: '36px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {password && (
                      <div className="pr-pwd-strength" style={{ color: pwdStrength.color }}>
                        <Shield size={13} />
                        <span>{pwdStrength.text}</span>
                      </div>
                    )}
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">
                      Xác nhận lại mật khẩu: <span className="required">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="pr-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu..."
                      required
                    />
                  </div>

                  {/* Cam kết pháp lý */}
                  <div className="pr-col-full" style={{ marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--pr-border)' }}>
                    <label className="pr-checkbox-label" style={{ alignItems: 'flex-start', color: 'var(--pr-text-body)', fontWeight: 500, lineHeight: 1.5 }}>
                      <input
                        type="checkbox"
                        checked={consentNghiDinh13}
                        onChange={(e) => setConsentNghiDinh13(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>
                        Tôi cam kết thông tin khai báo trên là chính xác và đồng ý cho phép hệ thống CareConnect xử lý, bảo mật dữ liệu y tế theo quy định tại <strong>Nghị định 13/2023/NĐ-CP</strong> về bảo vệ dữ liệu cá nhân và <strong>Luật Khám bệnh, chữa bệnh số 15/2023/QH15</strong>.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cụm nút hành động */}
              <div className="pr-action-bar">
                <button
                  type="button"
                  className="pr-btn pr-btn-secondary"
                  onClick={() => setCurrentStep(2)}
                >
                  <ArrowLeft size={15} />
                  <span>Quay lại Bước 2</span>
                </button>

                <button
                  type="submit"
                  className="pr-btn pr-btn-primary"
                  disabled={loading}
                  style={{ height: '42px', padding: '0 24px', fontSize: '14px', fontWeight: 700 }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="pr-spin" />
                      <span>Đang khởi tạo hồ sơ y tế...</span>
                    </>
                  ) : (
                    <>
                      <span>Hoàn tất Đăng Ký & Kích Hoạt Hồ Sơ Y Tế</span>
                      <Check size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
