import React, { useState, useRef, useEffect } from 'react'
import {
  HeartPulse, ShieldCheck, UserRound, Lock,
  CheckCircle2, AlertCircle, Building2, Eye, EyeOff,
  Sparkles, ArrowLeft, Check,
  Camera, Droplets, ChevronRight,
  QrCode, RefreshCw, Upload, Shield, Phone, ArrowRight
} from 'lucide-react'
import jsQR from 'jsqr'
import {
  checkPatientHis,
  registerPatientAccount,
  ocrMedicalDocument,
  type PatientHisCheckResponse,
  type User
} from './api'
import { useIsMobilePatient } from './MobilePatientApp'
import DateOfBirthInput from './DateOfBirthInput'
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

export interface ParsedCccdQr {
  cccd: string
  cmnd?: string
  fullName: string
  dobIso: string
  gender: string
  address: string
  issueDate?: string
  provinceCode: string
}

// Tự động nhận diện mã Tỉnh / Thành phố từ chuỗi địa chỉ
export function detectProvinceCodeFromAddress(addr: string): string {
  if (!addr) return '79'
  const lower = addr.toLowerCase()
  if (lower.includes('hà nội') || lower.includes('ha noi')) return '01'
  if (lower.includes('hồ chí minh') || lower.includes('ho chi minh') || lower.includes('tp.hcm') || lower.includes('tphcm') || lower.includes('sài gòn')) return '79'
  if (lower.includes('đà nẵng') || lower.includes('da nang')) return '48'
  if (lower.includes('hải phòng') || lower.includes('hai phong')) return '31'
  if (lower.includes('cần thơ') || lower.includes('can tho')) return '92'
  if (lower.includes('bình dương') || lower.includes('binh duong')) return '74'
  if (lower.includes('đồng nai') || lower.includes('dong nai')) return '75'
  if (lower.includes('bà rịa') || lower.includes('ba ria') || lower.includes('vũng tàu')) return '77'
  if (lower.includes('thừa thiên') || lower.includes('huế') || lower.includes('hue')) return '46'
  if (lower.includes('ninh bình') || lower.includes('ninh binh')) return '37'
  if (lower.includes('vĩnh phúc') || lower.includes('vinh phuc')) return '26'
  if (lower.includes('lâm đồng') || lower.includes('lam dong') || lower.includes('đà lạt')) return '68'
  if (lower.includes('khánh hòa') || lower.includes('khanh hoa') || lower.includes('nha trang')) return '56'
  if (lower.includes('an giang')) return '89'
  if (lower.includes('trà vinh') || lower.includes('tra vinh')) return '84'
  return '79'
}

// Giải mã chuỗi QR Code CCCD gắn chip theo chuẩn Bộ Công An
// Cú pháp: <Số CCCD>|<Số CMND cũ>|<Họ tên>|<Ngày sinh DDMMYYYY>|<Giới tính>|<Địa chỉ>|<Ngày cấp>
export function parseVietnamCccdQr(raw: string): ParsedCccdQr | null {
  if (!raw || !raw.includes('|')) return null
  const parts = raw.split('|').map(p => p.trim())
  if (parts.length < 2) return null

  const cccd = parts[0] || ''
  const cmnd = parts[1] || ''
  const fullName = (parts[2] || '').toUpperCase()

  const dobRaw = parts[3] || ''
  let dobIso = ''
  if (dobRaw.length === 8 && /^\d+$/.test(dobRaw)) {
    dobIso = `${dobRaw.substring(4, 8)}-${dobRaw.substring(2, 4)}-${dobRaw.substring(0, 2)}`
  } else if (dobRaw.length === 4 && /^\d+$/.test(dobRaw)) {
    dobIso = `${dobRaw}-01-01`
  } else if (dobRaw.includes('/')) {
    const dParts = dobRaw.split('/')
    if (dParts.length === 3) {
      dobIso = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}`
    }
  }

  const genderRaw = parts[4] || ''
  const gender = genderRaw.toLowerCase().includes('nữ') || genderRaw.toLowerCase() === 'female' ? 'Nữ' : 'Nam'
  const address = parts[5] || ''
  const issueDate = parts[6] || ''
  const provinceCode = detectProvinceCodeFromAddress(address)

  return {
    cccd,
    cmnd,
    fullName,
    dobIso,
    gender,
    address,
    issueDate,
    provinceCode
  }
}

// Quét mã QR trực tiếp từ ảnh CCCD bằng jsQR & canvas
export async function scanQrCodeFromImage(imageSrc: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = async () => {
      try {
        const width = img.naturalWidth || img.width
        const height = img.naturalHeight || img.height

        // 1. Quét trên toàn bộ ảnh với canvas
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          resolve(null)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const fullImageData = ctx.getImageData(0, 0, width, height)
        const fullQr = jsQR(fullImageData.data, width, height, { inversionAttempts: 'attemptBoth' })
        if (fullQr && fullQr.data && fullQr.data.includes('|')) {
          resolve(fullQr.data)
          return
        }

        // 2. Quét vùng góc trên bên phải (vị trí in mã QR chuẩn trên thẻ CCCD Việt Nam)
        const cropX = Math.floor(width * 0.4)
        const cropY = 0
        const cropW = Math.floor(width * 0.6)
        const cropH = Math.floor(height * 0.6)

        const cropCanvas = document.createElement('canvas')
        cropCanvas.width = cropW
        cropCanvas.height = cropH
        const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })
        if (cropCtx) {
          cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
          const cropData = cropCtx.getImageData(0, 0, cropW, cropH)
          const cropQr = jsQR(cropData.data, cropW, cropH, { inversionAttempts: 'attemptBoth' })
          if (cropQr && cropQr.data && cropQr.data.includes('|')) {
            resolve(cropQr.data)
            return
          }
        }

        // 3. Quét bằng BarcodeDetector gốc của trình duyệt nếu có hỗ trợ
        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          try {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] })
            const detected = await detector.detect(canvas)
            if (detected && detected.length > 0 && detected[0].rawValue) {
              resolve(detected[0].rawValue)
              return
            }
          } catch {
            // ignore
          }
        }

        if (fullQr && fullQr.data) {
          resolve(fullQr.data)
          return
        }

        resolve(null)
      } catch (err) {
        console.warn('Lỗi giải mã QR code từ canvas:', err)
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = imageSrc
  })
}

export function PatientRegisterPage({ onSuccess, onBackToLogin }: PatientRegisterPageProps) {
  const isMobile = useIsMobilePatient()

  // Step indicator: 1 = Quét CCCD & Tra cứu HIS, 2 = Bổ sung thông tin Y tế chuẩn, 3 = Mật khẩu & Kích hoạt
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Step 1: Quét CCCD & Định danh
  const [identityCard, setIdentityCard] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState('')
  const [scannedCccdData, setScannedCccdData] = useState<ParsedCccdQr | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Trạng thái kiểm tra HIS/EMR Bệnh viện
  const [checkingHis, setCheckingHis] = useState(false)
  const [hisCheckResult, setHisCheckResult] = useState<PatientHisCheckResponse | null>(null)
  const [hisChecked, setHisChecked] = useState(false)

  // Step 2: Bộ dữ liệu chuẩn theo QĐ 2682/QĐ-BYT & Luật KCB 2023
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('Nam')
  const [ethnicity, setEthnicity] = useState('Kinh')
  const [bloodType, setBloodType] = useState('Không rõ')
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

  function getPasswordStrength(pwd: string) {
    if (!pwd) return { text: '', color: '' }
    if (pwd.length < 6) return { text: 'Quá ngắn (Tối thiểu 6 ký tự)', color: '#ef4444' }
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { text: 'Mật khẩu yếu', color: '#f59e0b' }
    if (score === 2) return { text: 'Mật khẩu trung bình', color: '#0284c7' }
    return { text: 'Mật khẩu mạnh & bảo mật', color: '#16a34a' }
  }

  const pwdStrength = getPasswordStrength(password)

  // Tự động kích hoạt đối soát HIS Bệnh viện
  async function triggerHisCheck(cccdToTest: string, nameToTest?: string) {
    const cleanCccd = (cccdToTest || '').trim()
    if (!cleanCccd || cleanCccd.length < 9) return

    setCheckingHis(true)
    setError('')
    try {
      const res = await checkPatientHis({
        identity_card: cleanCccd,
        full_name: (nameToTest || fullName).trim()
      })
      setHisCheckResult(res)
      setHisChecked(true)

      // Nếu tìm thấy trong HIS -> Tự động điền dữ liệu
      if (res.exists_in_his) {
        if (res.full_name && !fullName) setFullName(res.full_name)
        if (res.dob && !dob) setDob(res.dob)
        if (res.gender && !gender) setGender(res.gender)
        if (res.bhyt_no && !bhytCode) setBhytCode(res.bhyt_no)
        if (res.blood_type && bloodType === 'Không rõ') setBloodType(res.blood_type)
        if (res.address && !address) setAddress(res.address)
        if (res.ethnicity && !ethnicity) setEthnicity(res.ethnicity)

        if (res.conditions && res.conditions.length > 0) {
          setHasMedicalHistory(true)
          const icdCodes = res.conditions.map(c => c.code).filter(Boolean).join(', ')
          const descNotes = res.conditions.map(c => c.display).filter(Boolean).join('; ')
          if (icdCodes) setMedicalHistoryIcd10(icdCodes)
          if (descNotes) setMedicalHistoryNotes(descNotes)
        }
      }
    } catch (err: any) {
      console.warn('Lỗi đối soát HIS:', err)
      setHisCheckResult({
        exists_in_his: false,
        already_registered_in_app: false,
        conditions: [],
        allergies: [],
        message: 'Không thể kết nối đến hệ thống HIS đối soát lúc này. Bạn vẫn có thể tiếp tục đăng ký hồ sơ y tế mới.'
      })
      setHisChecked(true)
    } finally {
      setCheckingHis(false)
    }
  }

  // Tải ảnh CCCD / VNeID và trích xuất thông tin tự động bằng AI OCR & QR Scanner
  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setOcrLoading(true)
    setOcrSuccessMsg('')

    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string

          // 1. Quét QR code trực tiếp từ canvas bằng jsQR
          const qrRaw = await scanQrCodeFromImage(base64Data)
          if (qrRaw && qrRaw.includes('|')) {
            const parsed = parseVietnamCccdQr(qrRaw)
            if (parsed && parsed.cccd) {
              setIdentityCard(parsed.cccd)
              setFullName(parsed.fullName)
              if (parsed.dobIso) setDob(parsed.dobIso)
              if (parsed.gender) setGender(parsed.gender)
              if (parsed.address) setAddress(parsed.address)
              if (parsed.provinceCode) setProvinceCode(parsed.provinceCode)

              setScannedCccdData(parsed)
              setOcrSuccessMsg(`Đã giải mã thành công mã QR CCCD của ${parsed.fullName} (${parsed.cccd})! Đang tra cứu HIS...`)
              await triggerHisCheck(parsed.cccd, parsed.fullName)
              return
            }
          }

          // 2. Fallback sang AI Gemini OCR từ backend
          const ocrRes = await ocrMedicalDocument(base64Data, 'cccd_card')
          if (ocrRes && ocrRes.extracted_data) {
            const f = ocrRes.extracted_data
            const scannedCCCD = f.cccd_number || ''
            const scannedName = (f.full_name || '').toUpperCase()

            if (scannedCCCD) setIdentityCard(scannedCCCD)
            if (scannedName) setFullName(scannedName)
            if (f.dob) setDob(f.dob)
            if (f.gender) setGender(f.gender)
            if (f.address) {
              setAddress(f.address)
              setProvinceCode(detectProvinceCodeFromAddress(f.address))
            }

            setOcrSuccessMsg(
              `AI OCR đã nhận diện thành công thẻ CCCD của ${scannedName || scannedCCCD}! Đang đối soát với HIS...`
            )

            if (scannedCCCD && scannedCCCD.trim().length >= 9) {
              await triggerHisCheck(scannedCCCD, scannedName)
            }
          } else {
            setError('Không nhận diện được rõ mã QR trên ảnh CCCD. Bạn có thể chụp lại ảnh rõ nét hơn hoặc nhập trực tiếp 12 số CCCD.')
          }
        } catch (err: any) {
          setError(err.message || 'Lỗi quét mã QR / OCR CCCD')
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
    if (!raw) {
      setIdentityCard('')
      return
    }

    if (raw.includes('|')) {
      const parsed = parseVietnamCccdQr(raw)
      if (parsed && parsed.cccd) {
        setIdentityCard(parsed.cccd)
        setFullName(parsed.fullName)
        if (parsed.dobIso) setDob(parsed.dobIso)
        if (parsed.gender) setGender(parsed.gender)
        if (parsed.address) setAddress(parsed.address)
        if (parsed.provinceCode) setProvinceCode(parsed.provinceCode)

        setScannedCccdData(parsed)
        setOcrSuccessMsg(`Đã giải mã chuỗi QR CCCD của ${parsed.fullName} (${parsed.cccd})!`)
        triggerHisCheck(parsed.cccd, parsed.fullName)
        return
      }
    }

    setIdentityCard(raw)
    if (raw.length === 12) {
      triggerHisCheck(raw, fullName)
    }
  }

  const scrollPageToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const body = document.querySelector('.mp-subscreen-body')
    if (body) body.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Chuyển sang Bước 2
  function goToStep2() {
    if (!identityCard.trim() || identityCard.trim().length < 9) {
      setError('Vui lòng quét hoặc nhập số CCCD hợp lệ (tối thiểu 9 số) trước khi tiếp tục.')
      scrollPageToTop()
      return
    }
    if (!hisChecked) {
      setError('Vui lòng thực hiện kiểm tra đối soát với hệ thống HIS Bệnh viện.')
      scrollPageToTop()
      return
    }
    if (hisCheckResult?.already_registered_in_app) {
      setError('Tài khoản này đã tồn tại trên CareConnect. Vui lòng bấm Đăng nhập.')
      scrollPageToTop()
      return
    }
    setError('')
    setCurrentStep(2)
    scrollPageToTop()
  }

  // Chuyển sang Bước 3
  function goToStep3() {
    if (!fullName.trim()) {
      setError('Vui lòng nhập Họ và tên đầy đủ của người bệnh.')
      scrollPageToTop()
      return
    }
    if (!dob) {
      setError('Vui lòng chọn ngày, tháng, năm sinh của người bệnh.')
      scrollPageToTop()
      return
    }
    setError('')
    setCurrentStep(3)
    scrollPageToTop()
  }

  // Gửi form đăng ký
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!phoneNumber.trim()) {
      setError('Vui lòng nhập Số điện thoại liên lạc chính xác để tạo tài khoản.')
      return
    }

    if (!password || password.length < 6) {
      setError('Mật khẩu đăng nhập tối thiểu 6 ký tự để bảo mật hồ sơ.')
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
        full_name: fullName.trim().toUpperCase(),
        phone_number: phoneNumber.trim(),
        identity_card: identityCard.trim(),
        password: password,
        email: email.trim() || undefined,
        dob: dob || undefined,
        gender: gender || 'Nam',
        bhyt_code: bhytCode.trim() ? bhytCode.trim().toUpperCase() : undefined,
        address: address.trim() || undefined,
        blood_type: bloodType,
        allergies: allergies.trim() || undefined,
        ethnicity: ethnicity || 'Kinh',
        province_code: provinceCode || undefined,
        ward_code: wardCode.trim() || undefined,
        companion_name: hasCompanion && companionName.trim() ? companionName.trim().toUpperCase() : undefined,
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

  // =========================================================================
  // GIAO DIỆN CHUYÊN BIỆT CHO APP MOBILE (NATIVE-FEEL, TIỆN DỤNG, THÂN THIỆN)
  // =========================================================================
  if (isMobile) {
    return (
      <div className="mobile-patient-app" style={{ minHeight: '100vh', background: '#f8fafc' }}>
        {/* Hidden Camera Input */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={handleOcrUpload}
        />

        {/* 1. Sticky Native Top Header */}
        <header
          className="mp-top-header"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="mp-header-back-btn"
              onClick={() => {
                if (currentStep === 1) onBackToLogin()
                else if (currentStep === 2) setCurrentStep(1)
                else if (currentStep === 3) setCurrentStep(2)
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#f1f5f9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                Đăng Ký Hồ Sơ Bệnh Nhân
              </div>
              <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 700 }}>
                {currentStep === 1 && 'Bước 1/3: Quét CCCD & Tra cứu HIS'}
                {currentStep === 2 && 'Bước 2/3: Y bạ & Tiền sử bệnh'}
                {currentStep === 3 && 'Bước 3/3: Mật khẩu & Kích hoạt'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              border: 'none',
              background: '#f0fdfa',
              color: '#0f766e',
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            Đăng nhập
          </button>
        </header>

        {/* 2. Body Container */}
        <div className="mp-subscreen-body" style={{ padding: '14px', maxWidth: '540px', margin: '0 auto', paddingBottom: '90px' }}>
          {/* Progress Segmented Bar */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <div
                onClick={() => {
                  setError('')
                  setCurrentStep(1)
                  scrollPageToTop()
                }}
                style={{ flex: 1, height: '5px', borderRadius: '4px', background: currentStep >= 1 ? '#0f766e' : '#e2e8f0', transition: 'all 0.3s', cursor: 'pointer' }}
              />
              <div
                onClick={() => {
                  if (hisChecked) {
                    setError('')
                    setCurrentStep(2)
                    scrollPageToTop()
                  }
                }}
                style={{ flex: 1, height: '5px', borderRadius: '4px', background: currentStep >= 2 ? '#0f766e' : '#e2e8f0', transition: 'all 0.3s', cursor: hisChecked ? 'pointer' : 'default' }}
              />
              <div
                onClick={() => {
                  if (hisChecked && fullName.trim() && dob) {
                    setError('')
                    setCurrentStep(3)
                    scrollPageToTop()
                  }
                }}
                style={{ flex: 1, height: '5px', borderRadius: '4px', background: currentStep >= 3 ? '#0f766e' : '#e2e8f0', transition: 'all 0.3s', cursor: (hisChecked && fullName.trim() && dob) ? 'pointer' : 'default' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
              <span
                onClick={() => {
                  setError('')
                  setCurrentStep(1)
                  scrollPageToTop()
                }}
                style={{ color: currentStep === 1 ? '#0f766e' : currentStep > 1 ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}
              >
                {currentStep > 1 && <Check size={12} />} 1. Định danh CCCD
              </span>
              <span
                onClick={() => {
                  if (hisChecked) {
                    setError('')
                    setCurrentStep(2)
                    scrollPageToTop()
                  }
                }}
                style={{ color: currentStep === 2 ? '#0f766e' : currentStep > 2 ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px', cursor: hisChecked ? 'pointer' : 'default' }}
              >
                {currentStep > 2 && <Check size={12} />} 2. Hồ sơ Y bạ
              </span>
              <span
                onClick={() => {
                  if (hisChecked && fullName.trim() && dob) {
                    setError('')
                    setCurrentStep(3)
                    scrollPageToTop()
                  }
                }}
                style={{ color: currentStep === 3 ? '#0f766e' : '#94a3b8', cursor: (hisChecked && fullName.trim() && dob) ? 'pointer' : 'default' }}
              >
                3. Bảo mật
              </span>
            </div>
          </div>

          {/* Compliance Mini Badges */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={11} /> QĐ 2682/QĐ-BYT
            </span>
            <span style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', fontSize: '10.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={11} /> NĐ 13/2023/NĐ-CP
            </span>
          </div>

          {/* Error Alert */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', color: '#b91c1c', fontSize: '12.5px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, lineHeight: 1.4 }}>{error}</div>
            </div>
          )}

          {/* =========================================================================
              BƯỚC 1: QUÉT CCCD & ĐỐI SOÁT HIS BỆNH VIỆN
             ========================================================================= */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Hero Card: Quét CCCD Gắn Chip & AI OCR */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #0284c7 100%)',
                  borderRadius: '18px',
                  padding: '20px 16px',
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(15, 118, 110, 0.22)',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ffffff', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Camera size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Chụp / Tải Ảnh Thẻ CCCD</h3>
                    <div style={{ fontSize: '11.5px', opacity: 0.9, marginTop: '2px' }}>Tự động đọc mã QR & trích xuất thông tin y tế</div>
                  </div>
                </div>

                <p style={{ fontSize: '12px', opacity: 0.92, lineHeight: 1.45, margin: '0 0 14px' }}>
                  Hệ thống AI tự động giải mã QR code trên thẻ CCCD gắn chip để tự động điền hồ sơ và đối soát lịch sử khám tại Bệnh viện.
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={ocrLoading || checkingHis}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#ffffff',
                    color: '#0f766e',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)'
                  }}
                >
                  {ocrLoading ? (
                    <>
                      <RefreshCw size={16} className="spin" /> Đang đọc dữ liệu thẻ CCCD...
                    </>
                  ) : (
                    <>
                      <Upload size={16} /> Chụp / Tải ảnh CCCD (Quét QR & OCR)
                    </>
                  )}
                </button>
              </div>

              {/* Card Nhập số CCCD thủ công / Dán QR */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Hoặc nhập số CCCD 12 số / Dán mã QR
                </div>

                <div style={{ position: 'relative', marginBottom: '12px' }}>
                  <QrCode size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#0f766e' }} />
                  <input
                    type="text"
                    value={identityCard}
                    onChange={handleQrPaste}
                    placeholder="Nhập 12 số CCCD hoặc dán chuỗi QR..."
                    style={{
                      width: '100%',
                      height: '46px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      padding: '0 14px 0 38px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#f8fafc',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Nút Tra Cứu HIS Bệnh Viện (Full Width) */}
                <button
                  type="button"
                  onClick={() => triggerHisCheck(identityCard, fullName)}
                  disabled={checkingHis || !identityCard.trim()}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '12px',
                    border: 'none',
                    background: checkingHis ? '#94a3b8' : '#0f766e',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)'
                  }}
                >
                  <RefreshCw size={15} className={checkingHis ? 'spin' : ''} />
                  <span>{checkingHis ? 'Đang đối soát HIS Bệnh viện...' : 'Tra cứu & Đối soát với HIS Bệnh viện'}</span>
                </button>

                <div style={{ textAlign: 'center', fontSize: '11.5px', color: '#64748b', marginTop: '8px', lineHeight: 1.4 }}>
                  Hệ thống tự động tra cứu hồ sơ cũ và BHYT khi quét xong CCCD hoặc nhập đủ 12 số.
                </div>
              </div>

              {/* Thông báo quét thành công */}
              {ocrSuccessMsg && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', padding: '10px 14px', color: '#065f46', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{ocrSuccessMsg}</span>
                </div>
              )}

              {/* Card Dữ liệu đã trích xuất từ QR */}
              {scannedCccdData && (
                <div style={{ background: '#f0fdfa', border: '1.5px solid #ccfbf1', borderRadius: '16px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 800, color: '#0f766e' }}>
                      <CheckCircle2 size={16} /> Đã Trích Xuất Dữ Liệu CCCD
                    </div>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#065f46', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                      TỰ ĐỘNG ĐIỀN
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#334155' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Số CCCD: </span>
                      <b style={{ fontFamily: 'monospace' }}>{scannedCccdData.cccd}</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Họ tên: </span>
                      <b>{scannedCccdData.fullName}</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Ngày sinh: </span>
                      <b>{scannedCccdData.dobIso || 'Theo CCCD'}</b>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Giới tính: </span>
                      <b>{scannedCccdData.gender}</b>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b' }}>Nơi thường trú: </span>
                      <span>{scannedCccdData.address || 'Theo CCCD'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Kết quả đối soát HIS */}
              {hisChecked && hisCheckResult && (
                <div>
                  {hisCheckResult.exists_in_his ? (
                    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                            Đã tìm thấy Hồ sơ Y tế (Mã PID: {hisCheckResult.external_patient_id})
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#15803d', marginTop: '2px' }}>
                            {hisCheckResult.message}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#334155', background: '#ffffff', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                        <div>Họ tên: <b>{hisCheckResult.full_name || fullName}</b></div>
                        <div>Ngày sinh: <b>{hisCheckResult.dob || dob || 'Theo hồ sơ'}</b></div>
                        <div>Giới tính: <b>{hisCheckResult.gender || gender}</b></div>
                        <div>BHYT: <b style={{ color: '#0f766e', fontFamily: 'monospace' }}>{hisCheckResult.bhyt_no || 'Chưa liên kết'}</b></div>
                        <div>Nhóm máu: <b style={{ color: '#dc2626' }}>{hisCheckResult.blood_type || 'Chưa rõ'}</b></div>
                        <div>Dân tộc: <b>{hisCheckResult.ethnicity || ethnicity}</b></div>
                        {hisCheckResult.conditions && hisCheckResult.conditions.length > 0 && (
                          <div style={{ gridColumn: 'span 2', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', color: '#0f766e' }}>
                            Tiền sử EMR: <b>{hisCheckResult.conditions.map(c => c.display).join(', ')}</b>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={goToStep2}
                        style={{
                          width: '100%',
                          height: '46px',
                          borderRadius: '12px',
                          border: 'none',
                          background: '#0f766e',
                          color: '#ffffff',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)'
                        }}
                      >
                        <span>Tiếp tục: Bổ sung Y bạ (Bước 2)</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: '16px', padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 800, fontSize: '13.5px', marginBottom: '6px' }}>
                        <AlertCircle size={18} />
                        <span>Chưa có hồ sơ cũ tại Bệnh viện</span>
                      </div>
                      <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#0c4a6e', lineHeight: 1.45 }}>
                        {hisCheckResult.message || 'Hệ thống sẽ tự động khởi tạo Mã hồ sơ bệnh nhân điện tử mới khi hoàn tất đăng ký.'}
                      </p>
                      <button
                        type="button"
                        onClick={goToStep2}
                        style={{
                          width: '100%',
                          height: '46px',
                          borderRadius: '12px',
                          border: 'none',
                          background: '#0f766e',
                          color: '#ffffff',
                          fontSize: '13.5px',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
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
              BƯỚC 2: BỔ SUNG THÔNG TIN Y TẾ (CHUẨN QĐ 2682/QĐ-BYT)
             ========================================================================= */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Thẻ 1: Thông tin hành chính */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserRound size={16} color="#0f766e" /> 1. Thông tin Hành chính Cá nhân
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Họ và tên người bệnh: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => setFullName(prev => prev.trim().toUpperCase())}
                      placeholder="NGUYỄN VĂN A"
                      required
                      autoComplete="name"
                      autoCorrect="off"
                      spellCheck={false}
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', fontWeight: 700, boxSizing: 'border-box', textTransform: 'uppercase' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Ngày, tháng, năm sinh: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <DateOfBirthInput
                      value={dob}
                      onChange={(isoVal) => setDob(isoVal)}
                      required
                    />
                  </div>

                  {/* Giới tính: 3 nút chọn nhanh */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Giới tính sinh học: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      {['Nam', 'Nữ', 'Khác'].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          style={{
                            height: '40px',
                            borderRadius: '10px',
                            border: gender === g ? '2px solid #0f766e' : '1px solid #cbd5e1',
                            background: gender === g ? '#f0fdfa' : '#ffffff',
                            color: gender === g ? '#0f766e' : '#475569',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nhóm máu: 5 nút chọn nhanh */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Nhóm máu hệ ABO:
                    </label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['A', 'B', 'AB', 'O', 'Không rõ'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => setBloodType(b)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: bloodType === b ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                            background: bloodType === b ? '#fef2f2' : '#ffffff',
                            color: bloodType === b ? '#dc2626' : '#475569',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Dân tộc:
                    </label>
                    <select
                      value={ethnicity}
                      onChange={(e) => setEthnicity(e.target.value)}
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      {VIETNAM_ETHNICITIES.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Địa chỉ thường trú:
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, đường, phường/xã..."
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Tỉnh / Thành phố:
                    </label>
                    <select
                      value={provinceCode}
                      onChange={(e) => setProvinceCode(e.target.value)}
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      {VIETNAM_PROVINCES.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Thẻ 2: Bảo hiểm Y tế */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#0f766e" /> 2. Thẻ Bảo Hiểm Y Tế (BHYT)
                </h4>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Mã số thẻ BHYT (15 ký tự):
                  </label>
                  <input
                    type="text"
                    value={bhytCode}
                    onChange={(e) => setBhytCode(e.target.value)}
                    onBlur={() => setBhytCode(prev => prev.trim().toUpperCase())}
                    placeholder="VD: DN4790123456789"
                    maxLength={15}
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', fontFamily: 'monospace', fontWeight: 700, color: '#0f766e', boxSizing: 'border-box', textTransform: 'uppercase' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Hưởng quyền lợi chi trả BHYT khi đặt lịch khám từ xa theo quy định Bộ Y tế.
                  </div>
                </div>
              </div>

              {/* Thẻ 3: Tiền sử sức khỏe & Dị ứng */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <HeartPulse size={16} color="#dc2626" /> 3. Tiền Sử Bệnh & Dị Ứng
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasMedicalHistory}
                      onChange={(e) => setHasMedicalHistory(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#0f766e' }}
                    />
                    <span>Có tiền sử bệnh mãn tính (Tăng HA, Tiểu đường, Tim mạch...)</span>
                  </label>

                  {hasMedicalHistory && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Mã ICD-10 hoặc Tên bệnh:
                        </label>
                        <input
                          type="text"
                          value={medicalHistoryIcd10}
                          onChange={(e) => setMedicalHistoryIcd10(e.target.value)}
                          placeholder="VD: I10 (Tăng HA), E11 (Tiểu đường type 2)..."
                          style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Ghi chú điều trị / Thuốc đang dùng:
                        </label>
                        <input
                          type="text"
                          value={medicalHistoryNotes}
                          onChange={(e) => setMedicalHistoryNotes(e.target.value)}
                          placeholder="VD: Đang dùng Amlodipine 5mg ngày 1 viên..."
                          style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Tiền sử dị ứng thuốc & thực phẩm:
                    </label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="VD: Dị ứng Penicillin, Paracetamol, hải sản... (Ghi 'Không' nếu không có)"
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Thẻ 4: Người giám hộ / Liên hệ khẩn cấp */}
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={hasCompanion}
                    onChange={(e) => setHasCompanion(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#0f766e' }}
                  />
                  <span>Khai báo Người giám hộ / Người liên hệ khẩn cấp</span>
                </label>

                {hasCompanion && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Họ tên người giám hộ:</label>
                      <input
                        type="text"
                        value={companionName}
                        onChange={(e) => setCompanionName(e.target.value)}
                        onBlur={() => setCompanionName(prev => prev.trim().toUpperCase())}
                        placeholder="NGUYỄN VĂN B"
                        autoCorrect="off"
                        spellCheck={false}
                        style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', fontWeight: 700, boxSizing: 'border-box', textTransform: 'uppercase' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Số điện thoại liên hệ:</label>
                      <input
                        type="tel"
                        value={companionPhone}
                        onChange={(e) => setCompanionPhone(e.target.value)}
                        placeholder="0912345678"
                        style={{ width: '100%', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 10px', fontSize: '12.5px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Action Buttons Row */}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', color: '#b91c1c', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, lineHeight: 1.4 }}>{error}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setCurrentStep(1)
                    scrollPageToTop()
                  }}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowLeft size={15} /> Quay lại
                </button>

                <button
                  type="button"
                  onClick={goToStep3}
                  style={{
                    flex: 1.6,
                    height: '46px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#0f766e',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)'
                  }}
                >
                  <span>Tiếp tục: Bước 3</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              BƯỚC 3: MẬT KHẨU & KÍCH HOẠT HỒ SƠ Y TẾ
             ========================================================================= */}
          {currentStep === 3 && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={16} color="#0f766e" /> Thiết Lập Tài Khoản & Mật Khẩu
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Số điện thoại đăng nhập: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="0912345678"
                      required
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13.5px', fontWeight: 700, boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Email nhận toa thuốc & kết quả:
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="benhnhan@email.com (tùy chọn)"
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Mật khẩu: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự..."
                        required
                        style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 40px 0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {password && (
                      <div style={{ fontSize: '11px', fontWeight: 700, color: pwdStrength.color, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={12} /> {pwdStrength.text}
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Xác nhận lại mật khẩu: <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu..."
                      required
                      style={{ width: '100%', height: '44px', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '0 12px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Thẻ Điều khoản & Pháp lý */}
              <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '14px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#334155', lineHeight: 1.5, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={consentNghiDinh13}
                    onChange={(e) => setConsentNghiDinh13(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#0f766e', marginTop: '2px', flexShrink: 0 }}
                  />
                  <span>
                    Tôi cam kết thông tin khai báo là chính xác và đồng ý điều khoản bảo vệ dữ liệu y tế cá nhân theo <strong>Nghị định 13/2023/NĐ-CP</strong> và <strong>Luật Khám bệnh, chữa bệnh 2023</strong>.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '10px 14px', color: '#b91c1c', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, lineHeight: 1.4 }}>{error}</div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setCurrentStep(2)
                    scrollPageToTop()
                  }}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowLeft size={15} /> Bước 2
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1.8,
                    height: '46px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)'
                  }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="spin" /> Đang tạo hồ sơ...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Hoàn tất & Kích hoạt EMR
                    </>
                  )}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={onBackToLogin}
                  style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Đã có tài khoản? <u>Đăng nhập ngay</u>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  // =========================================================================
  // GIAO DIỆN DESKTOP / WEB TRUYỀN THỐNG (ĐÃ ĐƯỢC TỐI ƯU CĂN CHỈNH)
  // =========================================================================
  return (
    <div className="pr-viewport">
      <div className="pr-single-column">
        {/* Top Header & Brand Lockup */}
        <header className="pr-single-header">
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

          <div className="pr-brand-banner">
            <div className="pr-brand-lockup">
              <div className="pr-brand-icon">
                <HeartPulse size={24} color="#ffffff" />
              </div>
              <div className="pr-brand-text">
                <span className="pr-brand-name">CareConnect</span>
                <span className="pr-brand-sub">HỒ SƠ SỨC KHỎE ĐIỆN TỬ</span>
              </div>
            </div>
            
            <div className="pr-compliance-pills">
              <span className="pr-pill"><ShieldCheck size={12} color="#059669" /> Chuẩn QĐ 2682 & QĐ 130</span>
              <span className="pr-pill"><Shield size={12} color="#0284c7" /> NĐ 13/2023/NĐ-CP</span>
            </div>
          </div>

          <div className="pr-header-title-box">
            <h1>Đăng Ký Hồ Sơ Sức Khỏe Điện Tử</h1>
            <p>Khởi tạo hồ sơ bệnh nhân liên thông hệ thống HIS Bệnh viện & Cổng BHYT Quốc gia</p>
          </div>
        </header>

        {/* Main Single Column Card */}
        <main className="pr-single-card">
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

          {/* BƯỚC 1: QUÉT CCCD & TRA CỨU HIS */}
          {currentStep === 1 && (
            <div>
              <div className="pr-scanner-box">
                <div className="pr-scanner-header">
                  <div className="pr-scanner-icon">
                    <Camera size={20} />
                  </div>
                  <div className="pr-scanner-title">
                    <h3>Chụp / Tải ảnh CCCD & Quét Mã QR Code</h3>
                    <p>Hệ thống tự động giải mã QR code trên CCCD, tự động điền vào form và đối soát với HIS</p>
                  </div>
                </div>

                <div className="pr-scanner-actions">
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
                    <span>{ocrLoading ? 'Đang giải mã QR & OCR ảnh...' : 'Chụp / Tải ảnh CCCD (Quét QR & AI OCR)'}</span>
                  </button>

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

                {ocrSuccessMsg && (
                  <div className="pr-alert success" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span>{ocrSuccessMsg}</span>
                  </div>
                )}

                {scannedCccdData && (
                  <div className="pr-qr-card">
                    <div className="pr-qr-card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} color="#0f766e" />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>
                          Dữ liệu đã trích xuất từ Mã QR CCCD (Tự động điền vào Form)
                        </span>
                      </div>
                      <span className="pr-qr-card-badge">ĐÃ TỰ ĐỘNG ĐIỀN</span>
                    </div>

                    <div className="pr-qr-grid">
                      <div className="pr-qr-grid-item">
                        <span className="label">Số CCCD:</span>
                        <strong style={{ fontFamily: 'monospace' }}>{scannedCccdData.cccd}</strong>
                      </div>
                      <div className="pr-qr-grid-item">
                        <span className="label">Họ và tên:</span>
                        <strong>{scannedCccdData.fullName}</strong>
                      </div>
                      <div className="pr-qr-grid-item">
                        <span className="label">Ngày sinh:</span>
                        <strong>{scannedCccdData.dobIso || 'Chưa có'}</strong>
                      </div>
                      <div className="pr-qr-grid-item">
                        <span className="label">Giới tính:</span>
                        <strong>{scannedCccdData.gender}</strong>
                      </div>
                      <div className="pr-qr-grid-item" style={{ gridColumn: 'span 2' }}>
                        <span className="label">Nơi thường trú:</span>
                        <strong>{scannedCccdData.address || 'Theo CCCD'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tra Cứu HIS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="pr-btn pr-btn-accent"
                    onClick={() => triggerHisCheck(identityCard, fullName)}
                    disabled={checkingHis || !identityCard.trim()}
                  >
                    <RefreshCw size={15} className={checkingHis ? 'pr-spin' : ''} />
                    <span>{checkingHis ? 'Đang đối soát HIS Bệnh viện...' : 'Tra cứu & Đối soát với HIS Bệnh viện'}</span>
                  </button>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--pr-text-muted)' }}>
                  (Hệ thống tự động tra cứu khi quét xong QR CCCD hoặc nhập đủ 12 số)
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

          {/* BƯỚC 2: BỔ SUNG THÔNG TIN Y TẾ */}
          {currentStep === 2 && (
            <div>
              <div className="pr-card">
                <div className="pr-card-header">
                  <div>
                    <h4 className="pr-card-title">
                      <UserRound size={17} color="var(--pr-primary)" />
                      <span>1. Thông tin hành chính cá nhân (Quy định QĐ 2682/QĐ-BYT)</span>
                    </h4>
                    <span className="pr-card-subtitle">Các trường thông tin đồng bộ dữ liệu y bạ viện (Đã điền tự động từ QR CCCD / HIS)</span>
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
                      onChange={(e) => setFullName(e.target.value)}
                      onBlur={() => setFullName(prev => prev.trim().toUpperCase())}
                      placeholder="NGUYỄN VĂN A"
                      required
                      autoComplete="name"
                      autoCorrect="off"
                      spellCheck={false}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">
                      Ngày, tháng, năm sinh: <span className="required">*</span>
                    </label>
                    <DateOfBirthInput
                      className="pr-input"
                      value={dob}
                      onChange={(isoVal) => setDob(isoVal)}
                      required
                    />
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">
                      Giới tính sinh học: <span className="required">*</span>
                    </label>
                    <select
                      className="pr-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">Nhóm máu hệ ABO:</label>
                    <select
                      className="pr-select"
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                    >
                      <option value="Không rõ">Chưa xác định / Không rõ</option>
                      <option value="A">Nhóm máu A</option>
                      <option value="B">Nhóm máu B</option>
                      <option value="AB">Nhóm máu AB</option>
                      <option value="O">Nhóm máu O</option>
                    </select>
                  </div>

                  <div className="pr-form-group">
                    <label className="pr-label">Dân tộc:</label>
                    <select
                      className="pr-select"
                      value={ethnicity}
                      onChange={(e) => setEthnicity(e.target.value)}
                    >
                      {VIETNAM_ETHNICITIES.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>

                  <div className="pr-form-group">
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

                  <div className="pr-form-group pr-col-span-3">
                    <label className="pr-label">Địa chỉ thường trú (Số nhà, đường, thôn/xóm):</label>
                    <input
                      type="text"
                      className="pr-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, phường/xã..."
                    />
                  </div>
                </div>
              </div>

              {/* BHYT */}
              <div className="pr-card">
                <div className="pr-card-header">
                  <div>
                    <h4 className="pr-card-title">
                      <ShieldCheck size={17} color="var(--pr-primary)" />
                      <span>2. Thẻ Bảo hiểm Y tế (BHYT)</span>
                    </h4>
                  </div>
                </div>
                <div className="pr-form-group">
                  <label className="pr-label">Mã số thẻ BHYT (15 ký tự):</label>
                  <input
                    type="text"
                    className="pr-input"
                    value={bhytCode}
                    onChange={(e) => setBhytCode(e.target.value)}
                    onBlur={() => setBhytCode(prev => prev.trim().toUpperCase())}
                    placeholder="VD: DN4790123456789"
                    maxLength={15}
                    autoCorrect="off"
                    spellCheck={false}
                    style={{ fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              {/* Tiền sử & Dị ứng */}
              <div className="pr-card">
                <div className="pr-card-header">
                  <div>
                    <h4 className="pr-card-title">
                      <HeartPulse size={17} color="#dc2626" />
                      <span>3. Tiền sử Bệnh & Dị Ứng</span>
                    </h4>
                  </div>
                </div>

                <div className="pr-form-group">
                  <label className="pr-checkbox-label">
                    <input
                      type="checkbox"
                      checked={hasMedicalHistory}
                      onChange={(e) => setHasMedicalHistory(e.target.checked)}
                    />
                    <span>Có tiền sử bệnh mãn tính (Tăng huyết áp, Đái tháo đường...)</span>
                  </label>
                </div>

                {hasMedicalHistory && (
                  <div className="pr-grid-2" style={{ marginTop: '10px' }}>
                    <div className="pr-form-group">
                      <label className="pr-label">Mã ICD-10 hoặc Tên bệnh:</label>
                      <input
                        type="text"
                        className="pr-input"
                        value={medicalHistoryIcd10}
                        onChange={(e) => setMedicalHistoryIcd10(e.target.value)}
                        placeholder="VD: I10, E11..."
                      />
                    </div>
                    <div className="pr-form-group">
                      <label className="pr-label">Ghi chú điều trị:</label>
                      <input
                        type="text"
                        className="pr-input"
                        value={medicalHistoryNotes}
                        onChange={(e) => setMedicalHistoryNotes(e.target.value)}
                        placeholder="VD: Dùng thuốc thường xuyên..."
                      />
                    </div>
                  </div>
                )}

                <div className="pr-form-group" style={{ marginTop: '12px' }}>
                  <label className="pr-label">Dị ứng thuốc & thực phẩm:</label>
                  <input
                    type="text"
                    className="pr-input"
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="VD: Dị ứng Penicillin, hải sản... (Ghi 'Không' nếu không có)"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pr-action-bar">
                <button type="button" className="pr-btn pr-btn-secondary" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft size={15} /> Quay lại Bước 1
                </button>
                <button type="button" className="pr-btn pr-btn-primary" onClick={goToStep3}>
                  <span>Tiếp tục: Bước 3</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* BƯỚC 3: MẬT KHẨU & KÍCH HOẠT */}
          {currentStep === 3 && (
            <form onSubmit={handleRegister}>
              <div className="pr-card">
                <div className="pr-card-header">
                  <div>
                    <h4 className="pr-card-title">
                      <Lock size={17} color="var(--pr-primary)" />
                      <span>3. Thông tin Đăng nhập & Bảo mật</span>
                    </h4>
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
                          cursor: 'pointer'
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

                  <div className="pr-col-full" style={{ marginTop: '6px', paddingTop: '12px', borderTop: '1px solid var(--pr-border)' }}>
                    <label className="pr-checkbox-label" style={{ alignItems: 'flex-start' }}>
                      <input
                        type="checkbox"
                        checked={consentNghiDinh13}
                        onChange={(e) => setConsentNghiDinh13(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>
                        Tôi cam kết thông tin khai báo trên là chính xác và đồng ý cho phép hệ thống CareConnect xử lý, bảo mật dữ liệu y tế theo quy định tại <strong>Nghị định 13/2023/NĐ-CP</strong> và <strong>Luật Khám bệnh, chữa bệnh 2023</strong>.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pr-action-bar">
                <button type="button" className="pr-btn pr-btn-secondary" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft size={15} /> Quay lại Bước 2
                </button>
                <button
                  type="submit"
                  className="pr-btn pr-btn-primary"
                  disabled={loading}
                  style={{ height: '42px', padding: '0 24px', fontSize: '14px', fontWeight: 700 }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="pr-spin" /> Đang tạo hồ sơ...
                    </>
                  ) : (
                    <>
                      <Check size={17} /> Hoàn tất Đăng Ký & Kích Hoạt
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </main>

        <footer className="pr-single-footer">
          <button type="button" className="pr-btn-link-login" onClick={onBackToLogin}>
            <ArrowLeft size={14} />
            <span>Đã có tài khoản y bạ? <strong>Đăng nhập ngay</strong></span>
          </button>
          <div className="pr-footer-info">
            <span>Hotline hỗ trợ kỹ thuật: <strong>1900 8888</strong> &bull; CareConnect Telemedicine</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
