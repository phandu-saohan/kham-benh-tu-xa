import React, { useState, useRef } from 'react'
import {
  HeartPulse, ShieldCheck, UserRound, Phone, CreditCard, Lock,
  ArrowRight, CheckCircle2, AlertCircle, Building2, Eye, EyeOff,
  Sparkles, Calendar, MapPin, Activity, ArrowLeft, Check, AlertTriangle,
  Camera, Stethoscope, Droplets, Users, Shield, FileCheck2, Info, ChevronRight,
  QrCode, RefreshCw, Upload, FileText
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

    if (score <= 2) return { score: 1, text: 'Mật khẩu yếu', color: '#ba1a1a' }
    if (score <= 4) return { score: 2, text: 'Mật khẩu trung bình', color: '#d97706' }
    return { score: 3, text: 'Mật khẩu mạnh & an toàn', color: '#007a53' }
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
            
            // ƯU TIÊN: TỰ ĐỘNG CHECK NGAY VỚI HIS BỆNH VIỆN
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
    <div className="cs-register-viewport">
      <div className="cs-register-layout" style={{ borderRadius: '8px' }}>
        {/* CỘT TRÁI: Nhận diện thương hiệu Y tế & Tiêu chuẩn Quốc gia */}
        <div className="cs-register-sidebar">
          <div>
            <div className="cs-brand-lockup">
              <div className="cs-brand-icon" style={{ borderRadius: '8px' }}>
                <HeartPulse size={26} color="#ffffff" />
              </div>
              <div>
                <span className="cs-brand-name">CareConnect</span>
                <span className="cs-brand-sub">HỒ SƠ SỨC KHỎE ĐIỆN TỬ (BỘ Y TẾ)</span>
              </div>
            </div>

            <div className="cs-reassurance-hero">
              <span className="cs-badge-pill" style={{ borderRadius: '4px' }}>
                <Sparkles size={13} />
                <span>LIÊN THÔNG HIS & ĐỀ ÁN 06/CP</span>
              </span>
              <h2>Hồ Sơ Y Tế Số Điện Tử Chuẩn Quyết Định 2682/QĐ-BYT</h2>
              <p>
                Tự động đối soát số CCCD với hệ thống HIS/EMR bệnh viện, liên thông lịch sử khám, toa thuốc điện tử và quyền lợi BHYT.
              </p>
            </div>

            <div className="cs-pillar-list">
              <div className="cs-pillar-item">
                <div className="cs-pillar-icon" style={{ borderRadius: '6px' }}>
                  <QrCode size={18} />
                </div>
                <div>
                  <strong>Ưu tiên Quét CCCD Gắn Chip</strong>
                  <span>Tự động trích xuất thông tin hành chính và đối soát trực tiếp với dữ liệu viện.</span>
                </div>
              </div>

              <div className="cs-pillar-item">
                <div className="cs-pillar-icon" style={{ borderRadius: '6px' }}>
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <strong>Bảo vệ dữ liệu Nghị định 13/2023</strong>
                  <span>Hồ sơ y bạ được mã hóa an toàn, phân quyền và ký số pháp lý SmartCA PKI.</span>
                </div>
              </div>

              <div className="cs-pillar-item">
                <div className="cs-pillar-icon" style={{ borderRadius: '6px' }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <strong>Cấp Mã PID Y Tế Toàn Quốc</strong>
                  <span>Đồng bộ thẻ BHYT và kết nối phòng khám Telehealth với bác sĩ chuyên khoa.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cs-sidebar-footer">
            <button type="button" className="cs-back-to-login" onClick={onBackToLogin}>
              <ArrowLeft size={16} />
              <span>Đã có tài khoản? Đăng nhập ngay</span>
            </button>
          </div>
        </div>

        {/* CỘT PHẢI: Form Đăng Ký 3 Bước */}
        <div className="cs-register-main">
          <div className="cs-form-topbar">
            <button type="button" className="cs-back-link" onClick={onBackToLogin}>
              <ArrowLeft size={16} />
              <span>Quay lại trang Đăng nhập</span>
            </button>
            <div className="cs-top-chip" style={{ borderRadius: '4px' }}>
              <span className="cs-dot-live" />
              <span>Cổng Tiếp Nhận Bệnh Nhân Trực Tuyến</span>
            </div>
          </div>

          <div className="cs-form-header">
            <h1>Đăng Ký Hồ Sơ Y Tế Bệnh Nhân</h1>
            <p>Khởi tạo hồ sơ sức khỏe cá nhân liên thông Bệnh viện & Cổng BHYT Quốc gia</p>
          </div>

          {/* Stepper Bar 3 Bước */}
          <div className="cs-stepper" style={{ borderRadius: '6px' }}>
            <div
              className={`cs-step-node ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
              onClick={() => setCurrentStep(1)}
            >
              <div className="cs-step-badge">
                {currentStep > 1 ? <Check size={14} /> : '1'}
              </div>
              <div className="cs-step-text">
                <span className="cs-step-title">Quét CCCD & Tra Cứu HIS</span>
                <span className="cs-step-desc">Đối soát bệnh viện</span>
              </div>
            </div>

            <div className="cs-step-line" />

            <div
              className={`cs-step-node ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
              onClick={() => hisChecked && goToStep2()}
            >
              <div className="cs-step-badge">
                {currentStep > 2 ? <Check size={14} /> : '2'}
              </div>
              <div className="cs-step-text">
                <span className="cs-step-title">Hồ Sơ Y Tế & Tiền Sử</span>
                <span className="cs-step-desc">Chuẩn QĐ 2682/QĐ-BYT</span>
              </div>
            </div>

            <div className="cs-step-line" />

            <div
              className={`cs-step-node ${currentStep === 3 ? 'active' : ''}`}
              onClick={() => hisChecked && fullName && goToStep3()}
            >
              <div className="cs-step-badge">3</div>
              <div className="cs-step-text">
                <span className="cs-step-title">Bảo Mật & Kích Hoạt</span>
                <span className="cs-step-desc">Tạo mật khẩu</span>
              </div>
            </div>
          </div>

          {/* Cảnh báo lỗi */}
          {error && (
            <div className="cs-banner error" style={{ borderRadius: '6px', marginBottom: '16px' }}>
              <AlertCircle size={18} />
              <div className="cs-banner-content">
                <strong>Thông báo:</strong> {error}
              </div>
            </div>
          )}

          {/* BƯỚC 1: QUÉT CCCD & TRA CỨU HIS BỆNH VIỆN (ƯU TIÊN SỐ 1) */}
          {currentStep === 1 && (
            <div className="cs-step-content">
              {/* Thẻ Quét CCCD Gắn Chip & VNeID */}
              <div
                style={{
                  background: 'linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%)',
                  border: '1.5px solid #0f766e',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px',
                  boxShadow: '0 2px 8px rgba(15, 118, 110, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      Ưu tiên Quét thẻ CCCD / Mã QR VNeID
                    </h3>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                      Hệ thống tự động đọc CCCD và đối soát ngay với cơ sở dữ liệu HIS của Bệnh viện
                    </p>
                  </div>
                </div>

                {/* Các phương thức quét */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '14px' }}>
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={ocrLoading || checkingHis}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: '#0f766e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px 16px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Upload size={17} />
                    <span>{ocrLoading ? 'Đang đọc ảnh CCCD...' : 'Chụp / Tải ảnh thẻ CCCD (AI OCR)'}</span>
                  </button>

                  {/* Nhập hoặc Quét QR CCCD */}
                  <div style={{ position: 'relative' }}>
                    <QrCode size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#0f766e' }} />
                    <input
                      type="text"
                      placeholder="Dán mã QR hoặc nhập số CCCD 12 số..."
                      value={identityCard}
                      onChange={handleQrPaste}
                      style={{
                        width: '100%',
                        padding: '11px 12px 11px 36px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        background: '#ffffff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Thông báo quét thành công */}
                {ocrSuccessMsg && (
                  <div style={{ marginTop: '12px', padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', color: '#065f46', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{ocrSuccessMsg}</span>
                  </div>
                )}

                {/* Nút Demo Test Nhanh */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    ⚡ Thử nhanh hồ sơ mẫu trên HIS Bệnh viện:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('080180012345', 'Nguyễn Thị Bích Hòa', '0900000001')}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#0f766e', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Bệnh nhân có EMR & BHYT (080180012345 - Bích Hòa)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('079192023456', 'Trần Văn Đạt', '0900000002')}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#0f766e', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Bệnh nhân tái khám (079192023456 - Văn Đạt)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('079201009999', 'Lê Hoàng Nam', '0988776655')}
                      style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Bệnh nhân mới (Chưa có trên HIS)
                    </button>
                  </div>
                </div>
              </div>

              {/* Nút bấm Tra Cứu HIS thủ công nếu cần */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => triggerHisCheck(identityCard, fullName)}
                  disabled={checkingHis || !identityCard.trim()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '9px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={15} className={checkingHis ? 'spin-icon' : ''} />
                  <span>{checkingHis ? 'Đang đối soát HIS...' : 'Đối soát lại với HIS Bệnh viện'}</span>
                </button>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {checkingHis ? 'Đang truy vấn cơ sở dữ liệu bệnh viện...' : 'Tự động kiểm tra sau khi quét CCCD'}
                </span>
              </div>

              {/* KẾT QUẢ ĐỐI SOÁT HIS HIỂN THỊ TRỰC QUAN */}
              {checkingHis && (
                <div style={{ padding: '24px', background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '6px', textAlign: 'center', marginBottom: '20px' }}>
                  <Activity size={28} color="#0f766e" style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontWeight: 700, color: '#0f766e' }}>Đang kết nối cổng liên thông dữ liệu bệnh viện...</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Đang đối soát số CCCD {identityCard} với hồ sơ bệnh án EMR/HIS</div>
                </div>
              )}

              {hisCheckResult && !checkingHis && (
                <div>
                  {hisCheckResult.already_registered_in_app ? (
                    <div style={{ padding: '16px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '6px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 800 }}>
                        <AlertTriangle size={18} />
                        <span>Tài khoản đã tồn tại trên CareConnect</span>
                      </div>
                      <p style={{ margin: '6px 0 12px 0', fontSize: '13px', color: '#78350f' }}>
                        {hisCheckResult.message}
                      </p>
                      <button type="button" className="cs-btn-primary" onClick={onBackToLogin} style={{ borderRadius: '6px' }}>
                        <span>Đăng nhập ngay</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : hisCheckResult.exists_in_his ? (
                    <div style={{ padding: '18px', background: '#ecfdf5', border: '1.5px solid #86efac', borderRadius: '6px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CheckCircle2 size={24} color="#16a34a" />
                          <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#14532d' }}>
                              Đã tìm thấy Hồ sơ Y tế tại Bệnh viện (Mã PID: {hisCheckResult.external_patient_id})
                            </h4>
                            <span style={{ fontSize: '12px', color: '#166534' }}>
                              {hisCheckResult.message}
                            </span>
                          </div>
                        </div>
                        <span style={{ background: '#16a34a', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                          LIÊN THÔNG HIS THÀNH CÔNG
                        </span>
                      </div>

                      {/* Thông tin tự động lấy từ HIS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '14px', background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #bbf7d0', fontSize: '12.5px' }}>
                        <div><span style={{ color: '#64748b' }}>Họ và tên:</span> <strong style={{ color: '#0f172a' }}>{hisCheckResult.full_name || fullName}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Ngày sinh:</span> <strong style={{ color: '#0f172a' }}>{hisCheckResult.dob || dob || 'Theo hồ sơ'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Giới tính:</span> <strong style={{ color: '#0f172a' }}>{hisCheckResult.gender || gender}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Thẻ BHYT:</span> <strong style={{ color: '#0f766e', fontFamily: 'monospace' }}>{hisCheckResult.bhyt_no || 'Chưa liên kết'}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Nhóm máu:</span> <strong style={{ color: '#dc2626' }}>{hisCheckResult.blood_type || 'Chưa xác định'}</strong></div>
                        <div style={{ gridColumn: '1 / -1' }}><span style={{ color: '#64748b' }}>Địa chỉ thường trú:</span> <strong style={{ color: '#0f172a' }}>{hisCheckResult.address || address || 'Theo CCCD'}</strong></div>
                        {hisCheckResult.conditions && hisCheckResult.conditions.length > 0 && (
                          <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                            <span style={{ color: '#64748b', fontWeight: 600 }}>Tiền sử chẩn đoán EMR cũ: </span>
                            <span style={{ color: '#0f766e', fontWeight: 700 }}>
                              {hisCheckResult.conditions.map(c => `${c.code ? `[${c.code}] ` : ''}${c.display || ''}`).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={goToStep2}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#0f766e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '10px 20px',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <span>Tiếp tục: Bổ sung Y bạ & Tiền sử (Bước 2)</span>
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '6px', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 800 }}>
                        <Info size={18} />
                        <span>Chưa có hồ sơ bệnh án cũ tại Bệnh viện</span>
                      </div>
                      <p style={{ margin: '6px 0 12px 0', fontSize: '13px', color: '#0c4a6e' }}>
                        {hisCheckResult.message}
                      </p>
                      <button
                        type="button"
                        onClick={goToStep2}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: '#0284c7',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '9px 18px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <span>Tiếp tục: Bổ sung thông tin Y bạ (Bước 2)</span>
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 2: BỔ SUNG THÔNG TIN Y TẾ CHUẨN QĐ 2682/QĐ-BYT & LUẬT KCB 2023 */}
          {currentStep === 2 && (
            <div className="cs-step-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 1. Thông tin hành chính cá nhân (Bắt buộc) */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '14px' }}>
                    <UserRound size={18} color="#0f766e" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      1. Thông tin hành chính cá nhân (Bắt buộc theo QĐ 2682/QĐ-BYT)
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Họ và tên đầy đủ: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value.toUpperCase())}
                        placeholder="NGUYỄN VĂN A"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Ngày sinh: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Giới tính: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Số CCCD / Định danh cá nhân:
                      </label>
                      <input
                        type="text"
                        value={identityCard}
                        readOnly
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Dân tộc:
                      </label>
                      <select
                        value={ethnicity}
                        onChange={(e) => setEthnicity(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        {VIETNAM_ETHNICITIES.map(eth => (
                          <option key={eth} value={eth}>{eth}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Nhóm máu (ABO & Rh):
                      </label>
                      <select
                        value={bloodType}
                        onChange={(e) => setBloodType(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="O+">O+ (Rh+)</option>
                        <option value="O-">O- (Rh-)</option>
                        <option value="A+">A+ (Rh+)</option>
                        <option value="A-">A- (Rh-)</option>
                        <option value="B+">B+ (Rh+)</option>
                        <option value="B-">B- (Rh-)</option>
                        <option value="AB+">AB+ (Rh+)</option>
                        <option value="AB-">AB- (Rh-)</option>
                      </select>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Nơi ở hiện tại (Địa chỉ chi tiết kèm Mã Tỉnh & Mã Xã):
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Số nhà, tên đường, khu phố..."
                          style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                        <select
                          value={provinceCode}
                          onChange={(e) => setProvinceCode(e.target.value)}
                          style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                          {VIETNAM_PROVINCES.map(p => (
                            <option key={p.code} value={p.code}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={wardCode}
                          onChange={(e) => setWardCode(e.target.value)}
                          placeholder="Mã Phường/Xã..."
                          style={{ padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    {/* Checkbox Người đi cùng / Giám hộ */}
                    <div style={{ gridColumn: '1 / -1', marginTop: '6px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>
                        <input
                          type="checkbox"
                          checked={hasCompanion}
                          onChange={(e) => setHasCompanion(e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>Đăng ký kèm Thông tin người đi cùng / Người giám hộ (đối với trẻ em hoặc trường hợp cần thiết)</span>
                      </label>

                      {hasCompanion && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '10px', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Họ tên người giám hộ:</label>
                            <input type="text" value={companionName} onChange={(e) => setCompanionName(e.target.value)} placeholder="Họ tên người đi cùng..." style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Số CCCD người giám hộ:</label>
                            <input type="text" value={companionIdCard} onChange={(e) => setCompanionIdCard(e.target.value)} placeholder="CCCD 12 số..." style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Số điện thoại:</label>
                            <input type="text" value={companionPhone} onChange={(e) => setCompanionPhone(e.target.value)} placeholder="09xxxx..." style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Mối quan hệ:</label>
                            <select value={companionRelationship} onChange={(e) => setCompanionRelationship(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}>
                              <option value="Bố/Mẹ">Bố / Mẹ</option>
                              <option value="Vợ/Chồng">Vợ / Chồng</option>
                              <option value="Con">Con</option>
                              <option value="Người giám hộ">Người giám hộ hợp pháp</option>
                              <option value="Người thân khác">Người thân khác</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Thông tin tiền sử sức khỏe */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '14px' }}>
                    <HeartPulse size={18} color="#0f766e" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      2. Thông tin tiền sử sức khỏe (Mã ICD-10 & Dịch tễ)
                    </h4>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>
                        <input
                          type="checkbox"
                          checked={hasMedicalHistory}
                          onChange={(e) => setHasMedicalHistory(e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>Người bệnh có tiền sử mắc bệnh mạn tính / điều trị lâu năm</span>
                      </label>

                      {hasMedicalHistory && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Mã bệnh tiền sử ICD-10 (phân cách bằng dấu ;):</label>
                            <input
                              type="text"
                              value={medicalHistoryIcd10}
                              onChange={(e) => setMedicalHistoryIcd10(e.target.value)}
                              placeholder="I10; E11.9; J45..."
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Ghi chú diễn biến bệnh sử bản thân:</label>
                            <input
                              type="text"
                              value={medicalHistoryNotes}
                              onChange={(e) => setMedicalHistoryNotes(e.target.value)}
                              placeholder="Phát hiện năm 2021, đang uống thuốc duy trì..."
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Tiền sử gia đình (Bệnh di truyền theo mã ICD-10):
                        </label>
                        <input
                          type="text"
                          value={familyHistoryIcd10}
                          onChange={(e) => setFamilyHistoryIcd10(e.target.value)}
                          placeholder="Mã ICD-10 (ví dụ: I10; E11)..."
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Tiền sử dịch tễ (tiếp xúc người mắc bệnh lao, sởi...):
                        </label>
                        <input
                          type="text"
                          value={epidemiologicalHistory}
                          onChange={(e) => setEpidemiologicalHistory(e.target.value)}
                          placeholder="Không có / hoặc tiếp xúc gần..."
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '4px' }}>
                          Tiền sử dị ứng thuốc & Thực phẩm:
                        </label>
                        <input
                          type="text"
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                          placeholder="Không ghi nhận / hoặc dị ứng Penicillin, Aspirin, hải sản..."
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Thẻ Bảo Hiểm Y Tế (BHYT) */}
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginBottom: '14px' }}>
                    <ShieldCheck size={18} color="#0f766e" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      3. Thông tin Thẻ Bảo hiểm Y tế (BHYT)
                    </h4>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Mã số thẻ BHYT (15 ký tự):
                    </label>
                    <input
                      type="text"
                      value={bhytCode}
                      onChange={(e) => setBhytCode(e.target.value.toUpperCase())}
                      placeholder="GD4797931812345..."
                      style={{ width: '100%', maxWidth: '360px', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontFamily: 'monospace', fontWeight: 700, color: '#0f766e' }}
                    />
                    <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                      * Người bệnh có thẻ BHYT hợp lệ được hưởng mức giảm trừ chi phí khám trực tuyến 80% theo quy định.
                    </span>
                  </div>
                </div>

                {/* Nút điều hướng */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}
                  >
                    Quay lại Bước 1
                  </button>

                  <button
                    type="button"
                    onClick={goToStep3}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0f766e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px 22px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <span>Tiếp tục: Thiết lập bảo mật & Mật khẩu (Bước 3)</span>
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BƯỚC 3: THIẾT LẬP MẬT KHẨU & KÍCH HOẠT HỒ SƠ */}
          {currentStep === 3 && (
            <form onSubmit={handleRegister} className="cs-step-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '18px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Thiết lập thông tin Đăng nhập & Bảo mật tài khoản
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Số điện thoại đăng nhập chính: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="0912345678"
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 700 }}
                      />
                      <span style={{ fontSize: '11px', color: '#64748b' }}>Dùng làm tài khoản đăng nhập và nhận thông báo lịch khám</span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Email nhận bệnh án điện tử (Tùy chọn):
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="patient@example.com"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Mật khẩu tài khoản: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Tối thiểu 6 ký tự..."
                          required
                          style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {password && (
                        <div style={{ fontSize: '11px', color: pwdStrength.color, marginTop: '3px', fontWeight: 600 }}>
                          {pwdStrength.text}
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                        Xác nhận lại mật khẩu: <span style={{ color: '#dc2626' }}>*</span>
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu..."
                        required
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Cam kết pháp lý */}
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155', lineHeight: 1.5 }}>
                      <input
                        type="checkbox"
                        checked={consentNghiDinh13}
                        onChange={(e) => setConsentNghiDinh13(e.target.checked)}
                        style={{ width: '16px', height: '16px', marginTop: '2px' }}
                      />
                      <span>
                        Tôi cam kết các thông tin khai báo trên là trung thực và đồng ý cho phép hệ thống CareConnect xử lý, lưu trữ dữ liệu cá nhân y tế phục vụ hoạt động khám bệnh, chữa bệnh từ xa theo <strong>Nghị định 13/2023/NĐ-CP</strong> và <strong>Luật Khám bệnh, chữa bệnh 2023</strong>.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Cụm nút hành động */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '9px 16px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}
                  >
                    Quay lại Bước 2
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#0f766e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '12px 28px',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)'
                    }}
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={17} className="spin-icon" />
                        <span>Đang khởi tạo hồ sơ...</span>
                      </>
                    ) : (
                      <>
                        <span>Hoàn tất Đăng Ký & Kích Hoạt Hồ Sơ Y Tế</span>
                        <Check size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
