import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
import {
  UserRound,
  ShieldCheck,
  Phone,
  Mail,
  CreditCard,
  Heart,
  AlertTriangle,
  Calendar,
  MapPin,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Lock,
  FileText,
  Activity,
  LogOut,
  Camera,
  QrCode,
  Droplet,
  Weight,
  PhoneCall,
  Clock,
  ChevronRight,
  Sparkles,
  Download,
  KeyRound,
  Users,
  RefreshCw,
  Cpu
} from 'lucide-react'
const SmartDevicesHub = lazy(() => import('./SmartDevicesHub').then(m => ({ default: m.SmartDevicesHub })))
import {
  getMyProfile,
  updateMyProfile,
  ocrMedicalDocument,
  checkBhyt,
  type PatientProfile,
  type User,
  type BhytCheckOut
} from './api'
import { formatDateVN, formatDateTimeVN } from './dateFormatters'
import './patient-sanctuary.css'

interface PatientProfilePageProps {
  currentUser: User
  onLogout: () => void
  onUpdateUser: (updated: User) => void
  onNavigate: (view: string) => void
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

export function PatientProfilePage({
  currentUser,
  onLogout,
  onUpdateUser,
  onNavigate
}: PatientProfilePageProps) {
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'security'>('info')

  // BHYT Synchronization State
  const [syncingBhyt, setSyncingBhyt] = useState(false)
  const [lastBhytSync, setLastBhytSync] = useState<Date | null>(null)
  const [bhytSyncData, setBhytSyncData] = useState<BhytCheckOut | null>(null)
  const [editingBhytCode, setEditingBhytCode] = useState(false)
  const [tempBhytInput, setTempBhytInput] = useState('')

  // Edit form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [identityCard, setIdentityCard] = useState('')
  const [address, setAddress] = useState('')
  const [bhytCode, setBhytCode] = useState('')
  const [bloodType, setBloodType] = useState('')
  const [allergies, setAllergies] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [ethnicity, setEthnicity] = useState('')
  const [provinceCode, setProvinceCode] = useState('')
  const [wardCode, setWardCode] = useState('')
  const [companionName, setCompanionName] = useState('')
  const [companionIdCard, setCompanionIdCard] = useState('')
  const [companionPhone, setCompanionPhone] = useState('')
  const [companionRelationship, setCompanionRelationship] = useState('')
  const [hasMedicalHistory, setHasMedicalHistory] = useState(false)
  const [medicalHistoryIcd10, setMedicalHistoryIcd10] = useState('')
  const [medicalHistoryNotes, setMedicalHistoryNotes] = useState('')
  const [familyHistoryIcd10, setFamilyHistoryIcd10] = useState('')
  const [familyHistoryNotes, setFamilyHistoryNotes] = useState('')
  const [epidemiologicalHistory, setEpidemiologicalHistory] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)
      const data = await getMyProfile()
      setProfile(data)
      setFullName(data.full_name || '')
      setEmail(data.email || '')
      setDateOfBirth(data.date_of_birth || '')
      setGender(data.gender || '')
      setIdentityCard(data.identity_card || '')
      setAddress(data.address || '')
      setBhytCode(data.bhyt_code || '')
      setTempBhytInput(data.bhyt_code || '')
      setBloodType(data.blood_type || '')
      setAllergies(data.allergies || '')
      setEmergencyName(data.emergency_contact_name || '')
      setEmergencyPhone(data.emergency_contact_phone || '')
      setEthnicity(data.ethnicity || '')
      setProvinceCode(data.province_code || '')
      setWardCode(data.ward_code || '')
      setCompanionName(data.companion_name || '')
      setCompanionIdCard(data.companion_id_card || '')
      setCompanionPhone(data.companion_phone || '')
      setCompanionRelationship(data.companion_relationship || '')
      setHasMedicalHistory(!!data.has_medical_history)
      setMedicalHistoryIcd10(data.medical_history_icd10 || '')
      setMedicalHistoryNotes(data.medical_history_notes || '')
      setFamilyHistoryIcd10(data.family_history_icd10 || '')
      setFamilyHistoryNotes(data.family_history_notes || '')
      setEpidemiologicalHistory(data.epidemiological_history || '')
    } catch (e: any) {
      setError(e.message || 'Không thể tải thông tin tài khoản')
    } finally {
      setLoading(false)
    }
  }

  // Handle Avatar Upload with image compression
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const rawBase64 = ev.target?.result as string
        const img = new Image()
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          const maxDim = 320
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.85)

          try {
            await updateMyProfile({ avatar_url: compressed } as any)
            setProfile((prev) => (prev ? { ...prev, avatar_url: compressed } : null))
            onUpdateUser({ ...currentUser, avatar_url: compressed })
            setSuccess('Đã cập nhật ảnh đại diện thành công!')
          } catch (err: any) {
            setError('Lỗi khi lưu ảnh: ' + (err.message || ''))
          }
        }
        img.src = rawBase64
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError('Lỗi khi đọc tệp ảnh: ' + (err.message || ''))
    }
  }

  // Handle AI OCR Scan
  async function handleOcrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setOcrLoading(true)
      setError('')
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result as string
          const res = await ocrMedicalDocument(base64, 'AUTO')
          if (res.success && res.extracted_data) {
            const d = res.extracted_data
            if (d.full_name) setFullName(d.full_name)
            if (d.cccd_number) setIdentityCard(d.cccd_number)
            if (d.bhyt_code) {
              setBhytCode(d.bhyt_code)
              setTempBhytInput(d.bhyt_code)
            }
            if (d.dob) setDateOfBirth(d.dob)
            if (d.gender) setGender(d.gender === 'female' ? 'Nữ' : 'Nam')
            if (d.address) setAddress(d.address)
            setEditing(true)
            setSuccess(`✨ AI đã trích xuất thành công ${res.doc_type_detected}! Vui lòng kiểm tra lại thông tin và bấm "Lưu thay đổi".`)
          } else {
            setError('Không đọc được rõ nét thông tin từ ảnh. Vui lòng chụp thẳng và đủ ánh sáng.')
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
      setError(err.message || 'Lỗi tải ảnh')
      setOcrLoading(false)
    }
  }

  // Save Full Profile
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      setError('Họ và tên không được để trống')
      return
    }

    try {
      setSaving(true)
      setError('')
      const updated = await updateMyProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        date_of_birth: dateOfBirth.trim(),
        gender,
        identity_card: identityCard.trim(),
        address: address.trim(),
        bhyt_code: bhytCode.trim(),
        blood_type: bloodType,
        allergies: allergies.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        ethnicity: ethnicity.trim(),
        province_code: provinceCode.trim(),
        ward_code: wardCode.trim(),
        companion_name: companionName.trim(),
        companion_id_card: companionIdCard.trim(),
        companion_phone: companionPhone.trim(),
        companion_relationship: companionRelationship.trim(),
        has_medical_history: hasMedicalHistory,
        medical_history_icd10: medicalHistoryIcd10.trim(),
        medical_history_notes: medicalHistoryNotes.trim(),
        family_history_icd10: familyHistoryIcd10.trim(),
        family_history_notes: familyHistoryNotes.trim(),
        epidemiological_history: epidemiologicalHistory.trim()
      })
      setProfile(updated)
      setEditing(false)
      setSuccess('Cập nhật hồ sơ bệnh nhân thành công!')
      onUpdateUser({
        ...currentUser,
        full_name: updated.full_name,
        email: updated.email
      })
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu thông tin')
    } finally {
      setSaving(false)
    }
  }

  // Handle BHYT Synchronization with National BHXH Portal
  async function handleSyncBhyt() {
    const codeToSync = (editingBhytCode ? tempBhytInput : (profile?.bhyt_code || bhytCode)).trim()
    if (!codeToSync) {
      setError('Vui lòng nhập hoặc lưu mã thẻ BHYT trước khi đồng bộ')
      return
    }

    setSyncingBhyt(true)
    setError('')
    try {
      const res = await checkBhyt(codeToSync, profile?.full_name || fullName)
      setBhytSyncData(res)
      setLastBhytSync(new Date())

      if (res.is_valid || res.success) {
        setBhytCode(res.bhyt_code)
        setTempBhytInput(res.bhyt_code)
        setEditingBhytCode(false)

        // Save synchronized BHYT to patient profile in database
        const updated = await updateMyProfile({ bhyt_code: res.bhyt_code })
        setProfile(updated)

        setSuccess(`✅ Đồng bộ thành công thẻ BHYT từ Cổng BHXH Việt Nam! Mức hưởng: ${res.benefit_rate_percent}%.`)
      } else {
        setError(`Thẻ BHYT không hợp lệ: ${res.message || 'Vui lòng kiểm tra lại mã thẻ'}`)
      }
    } catch (err: any) {
      console.error('Lỗi khi đồng bộ BHYT:', err)
      setError('Không thể kết nối Cổng Giám định BHYT Quốc gia: ' + (err.message || 'Lỗi mạng'))
    } finally {
      setSyncingBhyt(false)
    }
  }

  const formatBhytCode = (code?: string) => {
    if (!code) return 'CHƯA LIÊN KẾT THẺ'
    const clean = code.replace(/\s+/g, '')
    if (clean.length === 15) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 7)} ${clean.slice(7)}`
    }
    return code
  }

  if (loading) {
    return (
      <div className="ps-scope" style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ps-slate-muted)' }}>
        <Sparkles size={36} color="var(--ps-primary)" style={{ animation: 'spin 2s linear infinite', margin: '0 auto 12px' }} />
        <p style={{ fontSize: '15px', fontWeight: 600 }}>Đang tải dữ liệu hồ sơ cá nhân & thẻ BHYT...</p>
      </div>
    )
  }

  return (
    <div className="ps-scope">
      <div className="ps-profile-viewport" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Alerts */}
        {error && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca'
            }}
          >
            <AlertTriangle size={16} />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
              <X size={15} />
            </button>
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0'
            }}
          >
            <CheckCircle2 size={16} />
            <span style={{ flex: 1 }}>{success}</span>
            <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a' }}>
              <X size={15} />
            </button>
          </div>
        )}

        {/* 1. HERO PROFILE SUMMARY CARD */}
        <section className="ps-hero-card" style={{ padding: '20px 24px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div className="ps-hero-profile">
            <div className="ps-avatar-container" style={{ width: '80px', height: '80px' }}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="ps-avatar-img"
                />
              ) : (
                <div
                  className="ps-avatar-img"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '30px',
                    fontWeight: 800
                  }}
                >
                  {(profile?.full_name || 'B').charAt(0).toUpperCase()}
                </div>
              )}
              <label
                style={{
                  position: 'absolute',
                  right: '-4px',
                  bottom: '-4px',
                  background: 'var(--ps-primary)',
                  color: '#fff',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.25)',
                  zIndex: 2
                }}
                title="Tải ảnh đại diện mới"
              >
                <Camera size={13} />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
              </label>
              <div className="ps-online-dot" />
            </div>

            <div className="ps-user-meta">
              <div className="ps-chips-row" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span className="ps-badge-pid" style={{ borderRadius: '4px', fontSize: '11px', padding: '2px 8px' }}>
                  Mã BN: {profile?.external_patient_id || `CC-PAT-${profile?.id?.toString().padStart(4, '0')}`}
                </span>
                <span className="ps-badge-vneid" style={{ borderRadius: '4px', fontSize: '11px', padding: '2px 8px' }}>
                  <ShieldCheck size={12} /> {profile?.identity_card ? 'Đã xác thực CCCD' : 'Chưa cập nhật CCCD'}
                </span>
                <span className="ps-badge-pid" style={{ borderRadius: '4px', fontSize: '11px', padding: '2px 8px' }}>
                  Bảo vệ dữ liệu NĐ 13/2023
                </span>
              </div>
              <h2 className="ps-greeting-title" style={{ fontSize: '20px', margin: '4px 0 2px' }}>{profile?.full_name || 'Quý bệnh nhân'}</h2>
              <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--ps-slate-muted)', flexWrap: 'wrap' }}>
                <span><Phone size={13} style={{ verticalAlign: '-1px' }} /> {profile?.phone_number || 'Chưa cập nhật SĐT'}</span>
                <span>•</span>
                <span><Mail size={13} style={{ verticalAlign: '-1px' }} /> {profile?.email}</span>
                <span>•</span>
                <span><Calendar size={13} style={{ verticalAlign: '-1px' }} /> Sinh ngày: {formatDateVN(profile?.date_of_birth)}</span>
              </div>
            </div>
          </div>

          <div className="ps-hero-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleOcrUpload}
            />
            <button
              type="button"
              className="ps-btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
              style={{ borderRadius: '6px', fontSize: '12px', padding: '8px 12px' }}
            >
              <Camera size={14} />
              {ocrLoading ? 'AI đang đọc...' : 'Quét OCR CCCD / BHYT'}
            </button>

            {!editing ? (
              <button
                type="button"
                className="ps-btn-primary"
                onClick={() => setEditing(true)}
                style={{ borderRadius: '6px', fontSize: '12px', padding: '8px 14px' }}
              >
                <Edit3 size={14} /> Chỉnh sửa hồ sơ
              </button>
            ) : (
              <button
                type="button"
                className="ps-btn-secondary"
                onClick={() => setEditing(false)}
                style={{ borderRadius: '6px', fontSize: '12px', padding: '8px 14px' }}
              >
                <X size={14} /> Hủy sửa
              </button>
            )}

            <button
              type="button"
              className="ps-btn-secondary"
              onClick={onLogout}
              title="Đăng xuất khỏi thiết bị"
              style={{ borderRadius: '6px', padding: '8px 12px' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </section>

        {/* 2. CARD BẢO HIỂM XÃ HỘI VIỆT NAM (TÍCH HỢP TÍNH NĂNG ĐỒNG BỘ TRỰC TUYẾN) */}
        <section className="ps-bhyt-card-container" style={{ borderRadius: '8px' }}>
          <div className="ps-bhyt-card-watermark">BẢO HIỂM Y TẾ</div>

          <div className="ps-bhyt-top-row">
            <div className="ps-bhyt-agency-block">
              <div className="ps-bhyt-emblem">
                <ShieldCheck size={22} />
              </div>
              <div className="ps-bhyt-titles">
                <b>BẢO HIỂM XÃ HỘI VIỆT NAM</b>
                <span>THẺ BẢO HIỂM Y TẾ ĐIỆN TỬ VSSID • QUY CHUẨN QĐ 130/QĐ-BYT</span>
              </div>
            </div>

            {/* Sync Action & Live Status Badge */}
            <div className="ps-bhyt-actions-bar">
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  background: profile?.bhyt_code ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                <span className="ps-live-dot" style={{ background: profile?.bhyt_code ? '#10b981' : '#ef4444' }} />
                {profile?.bhyt_code ? 'Đang có hiệu lực' : 'Chưa liên kết thẻ'}
              </span>

              {/* NÚT ĐỒNG BỘ BHYT QUỐC GIA */}
              <button
                type="button"
                className="ps-bhyt-sync-btn"
                onClick={handleSyncBhyt}
                disabled={syncingBhyt}
                title="Đồng bộ dữ liệu thẻ và quyền lợi chi trả từ Cổng Giám định BHYT Quốc gia"
              >
                <RefreshCw size={13} className={syncingBhyt ? 'animate-spin' : ''} />
                <span>{syncingBhyt ? 'Đang đồng bộ BHXH...' : 'Đồng bộ thẻ BHYT'}</span>
              </button>
            </div>
          </div>

          {/* BHYT Code & Inline Editor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', margin: '14px 0 6px' }}>
            {!editingBhytCode ? (
              <div className="ps-bhyt-code-number" style={{ margin: 0, borderRadius: '6px' }}>
                {formatBhytCode(profile?.bhyt_code)}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={tempBhytInput}
                  onChange={(e) => setTempBhytInput(e.target.value.toUpperCase())}
                  placeholder="Nhập 15 ký tự mã thẻ BHYT..."
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #bae6fd',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    background: '#ffffff',
                    color: '#0f172a'
                  }}
                />
                <button
                  type="button"
                  className="ps-bhyt-sync-btn"
                  onClick={handleSyncBhyt}
                  disabled={syncingBhyt}
                >
                  <Save size={13} /> Lưu & Đồng bộ
                </button>
                <button
                  type="button"
                  className="ps-bhyt-sync-btn"
                  onClick={() => setEditingBhytCode(false)}
                >
                  <X size={13} /> Hủy
                </button>
              </div>
            )}

            {!editingBhytCode && (
              <button
                type="button"
                className="ps-bhyt-sync-btn"
                onClick={() => {
                  setTempBhytInput(profile?.bhyt_code || '')
                  setEditingBhytCode(true)
                }}
                style={{ padding: '6px 10px', fontSize: '11px' }}
                title="Thay đổi mã thẻ BHYT"
              >
                <Edit3 size={12} /> Đổi mã
              </button>
            )}

            {lastBhytSync && (
              <span className="ps-bhyt-sync-badge">
                <CheckCircle2 size={12} />
                Đã đồng bộ Cổng BHXH lúc: {formatDateTimeVN(lastBhytSync)}
              </span>
            )}
          </div>

          {/* BHYT Details Grid */}
          <div className="ps-bhyt-grid">
            <div className="ps-bhyt-cell">
              <small>Họ và tên</small>
              <strong>{profile?.full_name || 'Bệnh nhân'}</strong>
            </div>

            <div className="ps-bhyt-cell">
              <small>Ngày sinh</small>
              <strong>{formatDateVN(profile?.date_of_birth)}</strong>
            </div>

            <div className="ps-bhyt-cell">
              <small>Giới tính</small>
              <strong>{profile?.gender || 'Chưa cập nhật'}</strong>
            </div>

            <div className="ps-bhyt-cell">
              <small>Mức hưởng BHYT</small>
              <strong style={{ color: '#6ee7b7' }}>
                {bhytSyncData?.benefit_rate_percent ? `${bhytSyncData.benefit_rate_percent}% KCB Đúng Tuyến` : profile?.bhyt_code ? '80% KCB Đúng Tuyến' : 'Chưa liên kết thẻ BHYT'}
              </strong>
            </div>

            <div className="ps-bhyt-cell" style={{ gridColumn: 'span 2' }}>
              <small>Nơi ĐK KCB Ban đầu</small>
              <strong>{bhytSyncData?.primary_healthcare_facility || (profile?.bhyt_code ? 'Chưa đồng bộ Cổng BHXH' : 'Chưa liên kết thẻ BHYT')}</strong>
            </div>

            <div className="ps-bhyt-cell" style={{ gridColumn: 'span 3', borderTop: '1px dashed rgba(255,255,255,0.2)', paddingTop: '10px', marginTop: '6px' }}>
              <small>Thời hạn sử dụng & 5 năm liên tục</small>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '13px' }}>
                <span>Giá trị sử dụng: <strong>{bhytSyncData?.valid_from && bhytSyncData?.valid_to ? `${bhytSyncData.valid_from} đến ${bhytSyncData.valid_to}` : 'Chưa đồng bộ'}</strong></span>
                <span style={{ color: '#a7f3d0' }}>🛡️ {bhytSyncData?.five_years_consecutive || 'Nhấn "Đồng bộ BHXH" để tra cứu thời hạn 5 năm liên tục'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. NEAT TAB NAVIGATION */}
        <div className="ps-profile-tabs">
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
            style={{ borderRadius: '6px' }}
          >
            <UserRound size={16} /> Thông tin Hành chính & CCCD
          </button>
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
            onClick={() => setActiveTab('medical')}
            style={{ borderRadius: '6px' }}
          >
            <Heart size={16} /> Tiền sử Y tế & Sổ sức khỏe
          </button>
          <button
            type="button"
            className={`ps-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
            style={{ borderRadius: '6px' }}
          >
            <ShieldCheck size={16} /> Thiết bị & Bảo mật dữ liệu
          </button>
        </div>

        {/* TAB 1: THÔNG TIN HÀNH CHÍNH & CCCD */}
        {activeTab === 'info' && (
          <section className="ps-hero-card" style={{ display: 'block', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  Thông Tin Hành Chính & Định Danh (QĐ 2682/QĐ-BYT)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ps-slate-muted)' }}>
                  Dữ liệu hành chính chuẩn hóa phục vụ đồng bộ Bệnh án điện tử EMR và Cổng giám định BHYT
                </p>
              </div>

              {!editing && (
                <button
                  type="button"
                  className="ps-btn-secondary"
                  onClick={() => setEditing(true)}
                  style={{ borderRadius: '6px', fontSize: '12px', padding: '6px 14px' }}
                >
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
              )}
            </div>

            {/* Read-only Neat View */}
            {!editing ? (
              <div className="ps-info-display-grid">
                <div className="ps-info-display-card">
                  <span className="ps-info-display-label">Họ và tên</span>
                  <span className="ps-info-display-value">{profile?.full_name || 'Chưa cập nhật'}</span>
                </div>

                <div className="ps-info-display-card">
                  <span className="ps-info-display-label">Số CCCD / Định danh cá nhân</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="ps-info-display-value">{profile?.identity_card || 'Chưa cập nhật'}</span>
                    {profile?.identity_card && (
                      <span style={{ fontSize: '10px', background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Đã xác thực CCCD
                      </span>
                    )}
                  </div>
                </div>

                <div className="ps-info-display-card">
                  <span className="ps-info-display-label">Ngày, tháng, năm sinh</span>
                  <span className="ps-info-display-value">{formatDateVN(profile?.date_of_birth)}</span>
                </div>

                <div className="ps-info-display-card">
                  <span className="ps-info-display-label">Giới tính & Dân tộc</span>
                  <span className="ps-info-display-value">{profile?.gender || 'Chưa cập nhật'}{profile?.ethnicity ? ` · Dân tộc ${profile.ethnicity}` : ''}</span>
                </div>

                <div className="ps-info-display-card">
                  <span className="ps-info-display-label">Số điện thoại liên hệ</span>
                  <span className="ps-info-display-value">{profile?.phone_number || 'Chưa cập nhật'}</span>
                </div>

                <div className="ps-info-display-card">
                  <span className="ps-info-display-label">Địa chỉ Email</span>
                  <span className="ps-info-display-value">{profile?.email || 'Chưa cập nhật'}</span>
                </div>

                <div className="ps-info-display-card" style={{ gridColumn: 'span 2' }}>
                  <span className="ps-info-display-label">Địa chỉ thường trú</span>
                  <span className="ps-info-display-value">{profile?.address || 'Chưa cập nhật'}</span>
                </div>

                <div className="ps-info-display-card" style={{ gridColumn: 'span 2' }}>
                  <span className="ps-info-display-label">Người đi cùng / Giám hộ</span>
                  <span className="ps-info-display-value">
                    {profile?.companion_name
                      ? `${profile.companion_name} (${profile.companion_relationship || 'Người thân'}) · SĐT: ${profile.companion_phone || 'N/A'}`
                      : 'Tự đi khám (Không có người giám hộ đi kèm)'}
                  </span>
                </div>
              </div>
            ) : (
              /* Inline Form View */
              <form onSubmit={handleSave}>
                <div className="ps-form-grid">
                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Họ và tên người bệnh (*)</label>
                    <input
                      type="text"
                      className="ps-form-input"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Ghi rõ họ tên..."
                      style={{ borderRadius: '6px' }}
                    />
                  </div>

                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Ngày sinh (*)</label>
                    <input
                      type="date"
                      className="ps-form-input"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      style={{ borderRadius: '6px' }}
                    />
                  </div>

                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Giới tính (*)</label>
                    <select
                      className="ps-form-input"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ borderRadius: '6px' }}
                    >
                      <option value="Nam">Nam</option>
                      <option value="Nữ">Nữ</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>

                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Số CCCD / Định danh cá nhân (*)</label>
                    <input
                      type="text"
                      className="ps-form-input"
                      value={identityCard}
                      onChange={(e) => setIdentityCard(e.target.value)}
                      placeholder="12 chữ số trên thẻ CCCD gắn chip..."
                      style={{ borderRadius: '6px' }}
                    />
                  </div>

                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Dân tộc</label>
                    <select
                      className="ps-form-input"
                      value={ethnicity}
                      onChange={(e) => setEthnicity(e.target.value)}
                      style={{ borderRadius: '6px' }}
                    >
                      {VIETNAM_ETHNICITIES.map((eth) => (
                        <option key={eth} value={eth}>
                          {eth}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Email liên hệ</label>
                    <input
                      type="email"
                      className="ps-form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ borderRadius: '6px' }}
                    />
                  </div>

                  <div className="ps-input-group full-width">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Địa chỉ thường trú (*)</label>
                    <input
                      type="text"
                      className="ps-form-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                      style={{ borderRadius: '6px' }}
                    />
                  </div>

                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Họ tên người giám hộ / Đi cùng</label>
                    <input
                      type="text"
                      className="ps-form-input"
                      value={companionName}
                      onChange={(e) => setCompanionName(e.target.value)}
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Để trống nếu tự đi khám..."
                      style={{ borderRadius: '6px' }}
                    />
                  </div>

                  <div className="ps-input-group">
                    <label style={{ fontSize: '13px', fontWeight: 600 }}>Quan hệ với người bệnh</label>
                    <select
                      className="ps-form-input"
                      value={companionRelationship}
                      onChange={(e) => setCompanionRelationship(e.target.value)}
                      style={{ borderRadius: '6px' }}
                    >
                      <option value="Bố/Mẹ">Bố/Mẹ</option>
                      <option value="Vợ/Chồng">Vợ/Chồng</option>
                      <option value="Con cái">Con cái</option>
                      <option value="Anh/Chị/Em">Anh/Chị/Em</option>
                      <option value="Người giám hộ pháp lý">Người giám hộ pháp lý</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="ps-btn-secondary"
                    onClick={() => setEditing(false)}
                    style={{ borderRadius: '6px' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="ps-btn-primary"
                    disabled={saving}
                    style={{ borderRadius: '6px' }}
                  >
                    <Save size={15} />
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
                  </button>
                </div>
              </form>
            )}
          </section>
        )}

        {/* TAB 2: TIỀN SỬ Y TẾ & SỔ SỨC KHỎE */}
        {activeTab === 'medical' && (
          <section className="ps-hero-card" style={{ display: 'block', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  Sổ Sức Khỏe & Tiền Sử Y Khoa
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ps-slate-muted)' }}>
                  Thông tin nhóm máu, cảnh báo dị ứng thuốc và lịch sử bệnh mạn tính phục vụ kê đơn an toàn
                </p>
              </div>

              {!editing && (
                <button
                  type="button"
                  className="ps-btn-secondary"
                  onClick={() => setEditing(true)}
                  style={{ borderRadius: '6px', fontSize: '12px', padding: '6px 14px' }}
                >
                  <Edit3 size={14} /> Chỉnh sửa y tế
                </button>
              )}
            </div>

            <div className="ps-info-display-grid">
              <div className="ps-info-display-card">
                <span className="ps-info-display-label">Nhóm máu hệ ABO / Rh</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <Droplet size={18} color="#dc2626" />
                  <span className="ps-info-display-value" style={{ fontSize: '18px', color: '#dc2626' }}>
                    {profile?.blood_type || bloodType}
                  </span>
                </div>
              </div>

              <div className="ps-info-display-card">
                <span className="ps-info-display-label">Thể trạng & Chỉ số BMI</span>
                <span className="ps-info-display-value">
                  {profile?.weight && profile?.height
                    ? `${profile.weight} kg · ${profile.height} cm (BMI: ${(profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)})`
                    : profile?.weight
                      ? `${profile.weight} kg`
                      : profile?.height
                        ? `${profile.height} cm`
                        : 'Chưa đo thể trạng'}
                </span>
              </div>

              <div className="ps-info-display-card" style={{ gridColumn: 'span 2', background: '#fef2f2', borderColor: '#fecaca' }}>
                <span className="ps-info-display-label" style={{ color: '#dc2626' }}>
                  ⚠️ Cảnh báo tiền sử dị ứng thuốc & Thực phẩm
                </span>
                <span className="ps-info-display-value" style={{ color: '#991b1b', fontWeight: 600 }}>
                  {profile?.allergies || 'Chưa ghi nhận tiền sử dị ứng thuốc'}
                </span>
              </div>

              <div className="ps-info-display-card" style={{ gridColumn: 'span 2' }}>
                <span className="ps-info-display-label">Tiền sử bệnh lý mạn tính (ICD-10)</span>
                <span className="ps-info-display-value">
                  {profile?.has_medical_history && (profile.medical_history_icd10 || profile.medical_history_notes)
                    ? `${profile.medical_history_icd10 ? `[${profile.medical_history_icd10}] ` : ''}${profile.medical_history_notes || ''}`
                    : 'Chưa ghi nhận bệnh nền mạn tính'}
                </span>
              </div>

              <div className="ps-info-display-card" style={{ gridColumn: 'span 2' }}>
                <span className="ps-info-display-label">Tiền sử gia đình & Dịch tễ</span>
                <span className="ps-info-display-value">
                  {profile?.family_history_notes || profile?.epidemiological_history || 'Chưa ghi nhận tiền sử gia đình hoặc dịch tễ'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: THIẾT BỊ SINH HIỆU & BẢO MẬT DỮ LIỆU */}
        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Connected IoT Hub */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <Cpu size={20} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Thiết bị Giám sát Sinh hiệu Từ xa (RPM IoT)</h3>
              </div>
              <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Đang tải kết nối thiết bị...</div>}>
                <SmartDevicesHub user={currentUser} embedded={true} onNavigate={onNavigate} />
              </Suspense>
            </div>

            {/* Privacy & Legal Compliance */}
            <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={20} color="#059669" />
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Cam Kết Bảo Mật & Quyền Riêng Tư Y Tế</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', fontSize: '13px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#0f766e', display: 'block', marginBottom: '4px' }}>Nghị định 13/2023/NĐ-CP</strong>
                  <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
                    Dữ liệu y tế và hồ sơ bệnh án được bảo vệ nghiêm ngặt, mã hóa đầu cuối và chỉ chia sẻ cho bác sĩ phụ trách.
                  </p>
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <strong style={{ color: '#0369a1', display: 'block', marginBottom: '4px' }}>Ký số Chứng thư SmartCA PKI</strong>
                  <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>
                    Mọi đơn thuốc điện tử và kết luận cận lâm sàng đều được ký số hợp chuẩn Thông tư 46/2018/TT-BYT.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
