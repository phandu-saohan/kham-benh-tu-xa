import React, { useState, useEffect, useRef } from 'react'
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
  Users
} from 'lucide-react'
import { SmartDevicesHub } from './SmartDevicesHub'
import {
  getMyProfile,
  updateMyProfile,
  ocrMedicalDocument,
  type PatientProfile,
  type User
} from './api'
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
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'devices' | 'history' | 'privacy'>('info')

  // Edit form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('Nam')
  const [identityCard, setIdentityCard] = useState('')
  const [address, setAddress] = useState('')
  const [bhytCode, setBhytCode] = useState('')
  const [bloodType, setBloodType] = useState('O+')
  const [allergies, setAllergies] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [ethnicity, setEthnicity] = useState('Kinh')
  const [provinceCode, setProvinceCode] = useState('79')
  const [wardCode, setWardCode] = useState('')
  const [companionName, setCompanionName] = useState('')
  const [companionIdCard, setCompanionIdCard] = useState('')
  const [companionPhone, setCompanionPhone] = useState('')
  const [companionRelationship, setCompanionRelationship] = useState('Bố/Mẹ')
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
      setGender(data.gender || 'Nam')
      setIdentityCard(data.identity_card || '')
      setAddress(data.address || '')
      setBhytCode(data.bhyt_code || '')
      setBloodType(data.blood_type || 'O+')
      setAllergies(data.allergies || '')
      setEmergencyName(data.emergency_contact_name || '')
      setEmergencyPhone(data.emergency_contact_phone || '')
      setEthnicity(data.ethnicity || 'Kinh')
      setProvinceCode(data.province_code || '79')
      setWardCode(data.ward_code || '')
      setCompanionName(data.companion_name || '')
      setCompanionIdCard(data.companion_id_card || '')
      setCompanionPhone(data.companion_phone || '')
      setCompanionRelationship(data.companion_relationship || 'Bố/Mẹ')
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
            setProfile(prev => (prev ? { ...prev, avatar_url: compressed } : null))
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
            if (d.bhyt_code) setBhytCode(d.bhyt_code)
            if (d.dob) setDateOfBirth(d.dob)
            if (d.gender) setGender(d.gender === 'female' ? 'Nữ' : 'Nam')
            if (d.address) setAddress(d.address)
            setEditing(true)
            setSuccess(`✨ AI đã trích xuất thành công ${res.doc_type_detected}! Vui lòng kiểm tra lại thông tin và bấm "Lưu cập nhật".`)
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
        <p style={{ fontSize: '15px', fontWeight: 600 }}>Đang đồng bộ hồ sơ bệnh nhân & BHYT điện tử...</p>
      </div>
    )
  }

  return (
    <div className="ps-scope">
      <div className="ps-profile-viewport">
        {/* Alerts */}
        {error && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca'
            }}
          >
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={16} />
            </button>
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0'
            }}
          >
            <span>{success}</span>
            <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* 1. CLINICAL HERO PROFILE CARD */}
        <section className="ps-hero-card">
          <div className="ps-hero-left">
            <div className="ps-avatar-wrap" style={{ position: 'relative' }}>
              <div className="ps-avatar" style={{ overflow: 'hidden' }}>
                {profile?.avatar_url || currentUser.avatar_url ? (
                  <img
                    src={profile?.avatar_url || currentUser.avatar_url}
                    alt={profile?.full_name || 'Bệnh nhân'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'BN'
                )}
              </div>
              <label
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  background: '#0284c7',
                  color: '#fff',
                  width: '26px',
                  height: '26px',
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
              <div className="ps-chips-row">
                <span className="ps-badge-pid">
                  PID: {profile?.external_patient_id || `CC-PAT-${profile?.id?.toString().padStart(4, '0')}`}
                </span>
                <span className="ps-badge-vneid">
                  <ShieldCheck size={13} /> Định danh VNeID Mức 2
                </span>
                <span className="ps-badge-pid">
                  Nghị định 13/2023/NĐ-CP
                </span>
              </div>
              <h2 className="ps-greeting-title">{profile?.full_name || 'Quý bệnh nhân'}</h2>
              <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--ps-slate-muted)', marginTop: '2px' }}>
                <span><Phone size={13} style={{ verticalAlign: '-1px' }} /> {profile?.phone_number || 'Chưa cập nhật SĐT'}</span>
                <span>•</span>
                <span><Mail size={13} style={{ verticalAlign: '-1px' }} /> {profile?.email}</span>
              </div>
            </div>
          </div>

          <div className="ps-hero-actions">
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
            >
              <Camera size={15} />
              {ocrLoading ? 'AI đang đọc...' : 'Quét CCCD / BHYT'}
            </button>

            {!editing ? (
              <button className="ps-btn-primary" onClick={() => setEditing(true)}>
                <Edit3 size={15} /> Sửa hồ sơ
              </button>
            ) : (
              <button className="ps-btn-secondary" onClick={() => setEditing(false)}>
                <X size={15} /> Hủy sửa
              </button>
            )}

            <button
              className="ps-btn-secondary"
              onClick={onLogout}
              title="Đăng xuất khỏi thiết bị"
              style={{ padding: '12px 14px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </section>

        {/* 2. REALISTIC DIGITAL BHYT HEALTH CARD (CLINICAL SANCTUARY BENCHMARK) */}
        <section className="ps-bhyt-card-container">
          <div className="ps-bhyt-card-watermark">BẢO HIỂM Y TẾ</div>

          <div className="ps-bhyt-top-row">
            <div className="ps-bhyt-agency-block">
              <div className="ps-bhyt-emblem">
                <ShieldCheck size={22} />
              </div>
              <div className="ps-bhyt-titles">
                <b>BẢO HIỂM XÃ HỘI VIỆT NAM</b>
                <span>THẺ BẢO HIỂM Y TẾ ĐIỆN TỬ • CARECONNECT EMR</span>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--ps-radius-pill)',
                background: profile?.bhyt_code ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                fontSize: '12px',
                fontWeight: 700
              }}
            >
              <span className="ps-live-dot" style={{ background: profile?.bhyt_code ? '#10b981' : '#ef4444' }} />
              {profile?.bhyt_code ? 'Đang có hiệu lực' : 'Chưa liên kết thẻ'}
            </span>
          </div>

          <div className="ps-bhyt-code-number">
            {formatBhytCode(profile?.bhyt_code)}
          </div>

          <div className="ps-bhyt-grid">
            <div className="ps-bhyt-cell">
              <small>Họ và tên</small>
              <strong>{profile?.full_name || 'Bệnh nhân'}</strong>
            </div>

            <div className="ps-bhyt-cell">
              <small>Ngày sinh</small>
              <strong>{profile?.date_of_birth || 'Chưa cập nhật'}</strong>
            </div>

            <div className="ps-bhyt-cell">
              <small>Giới tính</small>
              <strong>{profile?.gender || 'Nam'}</strong>
            </div>

            <div className="ps-bhyt-cell">
              <small>Mức hưởng BHYT</small>
              <strong style={{ color: '#6ee7b7' }}>
                {profile?.bhyt_code ? '80% KCB Đúng Tuyến' : 'Chưa áp dụng'}
              </strong>
            </div>

            <div className="ps-bhyt-cell" style={{ gridColumn: 'span 2' }}>
              <small>Nơi ĐK KCB Ban đầu</small>
              <strong>79-014 (Bệnh viện Đa khoa Quốc tế CareConnect)</strong>
            </div>
          </div>
        </section>

        {/* 3. TABBED PROFILE NAVIGATION */}
        <div className="ps-profile-tabs">
          <button
            className={`ps-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <UserRound size={16} /> Thông tin cá nhân & CCCD
          </button>
          <button
            className={`ps-tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
            onClick={() => setActiveTab('medical')}
          >
            <Heart size={16} /> Tiền sử y tế & Nhóm máu
          </button>
          <button
            className={`ps-tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            <Activity size={16} /> Thiết bị sinh hiệu RPM
          </button>
          <button
            className={`ps-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <FileText size={16} /> Lịch sử & Dịch vụ y tế
          </button>
          <button
            className={`ps-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Lock size={16} /> Bảo mật & Quyền riêng tư
          </button>
        </div>

        {/* TAB 1: THÔNG TIN HÀNH CHÍNH CÁ NHÂN (BẮT BUỘC THEO QĐ 2682/QĐ-BYT) */}
        {activeTab === 'info' && (
          <section className="ps-hero-card" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  1. Thông Tin Hành Chính Cá Nhân (Quyết định 2682/QĐ-BYT)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ps-slate-muted)' }}>
                  Ghi nhận đầy đủ thông tin bắt buộc theo danh mục dữ liệu khám chữa bệnh quốc gia
                </p>
              </div>

              {!editing && (
                <button className="ps-btn-secondary" onClick={() => setEditing(true)}>
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
              )}
            </div>

            <form onSubmit={handleSave}>
              <div className="ps-form-grid">
                <div className="ps-input-group">
                  <label>Họ và tên người bệnh (*)</label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    disabled={!editing}
                    placeholder="Ghi nhận họ và tên đầy đủ..."
                  />
                </div>

                <div className="ps-input-group">
                  <label>Ngày, tháng, năm sinh (*)</label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={dateOfBirth}
                    onChange={e => setDateOfBirth(e.target.value)}
                    disabled={!editing}
                    placeholder="DD/MM/YYYY"
                  />
                </div>

                <div className="ps-input-group">
                  <label>Giới tính (*)</label>
                  <select
                    className="ps-form-input"
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    disabled={!editing}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div className="ps-input-group">
                  <label>Số định danh cá nhân / CCCD / Hộ chiếu (*)</label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={identityCard}
                    onChange={e => setIdentityCard(e.target.value)}
                    disabled={!editing}
                    placeholder="12 chữ số CCCD hoặc mã định danh..."
                  />
                </div>

                <div className="ps-input-group">
                  <label>Dân tộc (*)</label>
                  <select
                    className="ps-form-input"
                    value={ethnicity}
                    onChange={e => setEthnicity(e.target.value)}
                    disabled={!editing}
                  >
                    {VIETNAM_ETHNICITIES.map(eth => (
                      <option key={eth} value={eth}>{eth}</option>
                    ))}
                  </select>
                </div>

                <div className="ps-input-group">
                  <label>Nhóm máu (nếu có xác định)</label>
                  <select
                    className="ps-form-input"
                    value={bloodType}
                    onChange={e => setBloodType(e.target.value)}
                    disabled={!editing}
                  >
                    <option value="O+">O+ (Phổ biến)</option>
                    <option value="O-">O- (Hiếm)</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="ps-input-group">
                  <label>Mã Tỉnh / Thành phố nơi ở hiện tại</label>
                  <select
                    className="ps-form-input"
                    value={provinceCode}
                    onChange={e => setProvinceCode(e.target.value)}
                    disabled={!editing}
                  >
                    {VIETNAM_PROVINCES.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="ps-input-group">
                  <label>Mã Xã / Phường nơi ở hiện tại</label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={wardCode}
                    onChange={e => setWardCode(e.target.value)}
                    disabled={!editing}
                    placeholder="Ví dụ: 26740, 00012..."
                  />
                </div>

                <div className="ps-input-group full-width">
                  <label>Nơi ở hiện tại (Địa chỉ chi tiết)</label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    disabled={!editing}
                    placeholder="Số nhà, ngõ/ngách, tên đường phố, tổ dân phố, thôn xóm..."
                  />
                </div>

                <div className="ps-input-group">
                  <label>Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={profile?.phone_number || ''}
                    disabled
                    style={{ background: '#f8fafc' }}
                  />
                </div>

                <div className="ps-input-group">
                  <label>Địa chỉ Email</label>
                  <input
                    type="email"
                    className="ps-form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={!editing}
                    placeholder="email@example.com"
                  />
                </div>

                <div className="ps-input-group full-width">
                  <label>Mã số Thẻ Bảo hiểm Y tế (BHYT 15 ký tự)</label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={bhytCode}
                    onChange={e => setBhytCode(e.target.value)}
                    disabled={!editing}
                    placeholder="Ví dụ: GD4797931812345"
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* KHỐI: THÔNG TIN NGƯỜI ĐI CÙNG (ĐỐI VỚI TRẺ EM HOẶC TRƯỜNG HỢP CẦN THIẾT) */}
              <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Users size={18} color="#0e7490" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Thông tin người đi cùng (Đối với trẻ em hoặc trường hợp cần thiết)
                  </h4>
                </div>
                <p style={{ margin: '-6px 0 16px', fontSize: '12.5px', color: '#64748b' }}>
                  Theo quy định Bộ Y tế: Họ tên, CCCD, số điện thoại và mối quan hệ với người bệnh
                </p>

                <div className="ps-form-grid">
                  <div className="ps-input-group">
                    <label>Họ và tên người đi cùng / Giám hộ</label>
                    <input
                      type="text"
                      className="ps-form-input"
                      value={companionName}
                      onChange={e => setCompanionName(e.target.value)}
                      disabled={!editing}
                      placeholder="Họ tên cha/mẹ, người giám hộ..."
                    />
                  </div>

                  <div className="ps-input-group">
                    <label>Số CCCD / Định danh người đi cùng</label>
                    <input
                      type="text"
                      className="ps-form-input"
                      value={companionIdCard}
                      onChange={e => setCompanionIdCard(e.target.value)}
                      disabled={!editing}
                      placeholder="Số CCCD 12 số của người đi cùng..."
                    />
                  </div>

                  <div className="ps-input-group">
                    <label>Số điện thoại người đi cùng</label>
                    <input
                      type="tel"
                      className="ps-form-input"
                      value={companionPhone}
                      onChange={e => setCompanionPhone(e.target.value)}
                      disabled={!editing}
                      placeholder="09xx xxx xxx"
                    />
                  </div>

                  <div className="ps-input-group">
                    <label>Mối quan hệ với người bệnh</label>
                    <select
                      className="ps-form-input"
                      value={companionRelationship}
                      onChange={e => setCompanionRelationship(e.target.value)}
                      disabled={!editing}
                    >
                      <option value="Bố/Mẹ">Bố / Mẹ</option>
                      <option value="Người giám hộ">Người giám hộ hợp pháp</option>
                      <option value="Vợ/Chồng">Vợ / Chồng</option>
                      <option value="Con cái">Con cái</option>
                      <option value="Anh/Chị/Em">Anh / Chị / Em</option>
                      <option value="Người thân khác">Người thân khác</option>
                    </select>
                  </div>
                </div>
              </div>

              {editing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="ps-btn-secondary" onClick={() => setEditing(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="ps-btn-primary" disabled={saving}>
                    <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu thông tin hành chính'}
                  </button>
                </div>
              )}
            </form>
          </section>
        )}

        {/* TAB 2: THÔNG TIN TIỀN SỬ SỨC KHỎE (QUYẾT ĐỊNH 2682/QĐ-BYT) */}
        {activeTab === 'medical' && (
          <section className="ps-hero-card" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  2. Thông Tin Tiền Sử Sức Khỏe & Dịch Tễ
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ps-slate-muted)' }}>
                  Ghi nhận tiền sử bản thân, tiền sử gia đình (mã ICD-10) và tiền sử dịch tễ theo chuẩn Bộ Y tế
                </p>
              </div>

              {!editing && (
                <button className="ps-btn-secondary" onClick={() => setEditing(true)}>
                  <Edit3 size={14} /> Chỉnh sửa
                </button>
              )}
            </div>

            <form onSubmit={handleSave}>
              <div className="ps-form-grid">
                {/* 1. Tiền sử bản thân */}
                <div className="ps-input-group full-width" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      Tiền sử bản thân: Có mắc bệnh tiền sử hay không?
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="has_med"
                          checked={hasMedicalHistory}
                          onChange={() => setHasMedicalHistory(true)}
                          disabled={!editing}
                        />
                        Có mắc bệnh tiền sử
                      </label>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="has_med"
                          checked={!hasMedicalHistory}
                          onChange={() => setHasMedicalHistory(false)}
                          disabled={!editing}
                        />
                        Không
                      </label>
                    </div>
                  </div>

                  {hasMedicalHistory && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                        Mã bệnh tiền sử theo bảng mã ICD-10 (phân cách bằng dấu chấm phẩy ; nếu có nhiều bệnh)
                      </label>
                      <input
                        type="text"
                        className="ps-form-input"
                        value={medicalHistoryIcd10}
                        onChange={e => setMedicalHistoryIcd10(e.target.value)}
                        disabled={!editing}
                        placeholder="Ví dụ: I10; E11.9; J45..."
                        style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0e7490' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>Gợi ý mã phổ biến:</span>
                        {[
                          { code: 'I10', label: 'Tăng huyết áp vô căn' },
                          { code: 'E11', label: 'Đái tháo đường Type 2' },
                          { code: 'J45', label: 'Hen phế quản' },
                          { code: 'K29', label: 'Viêm dạ dày' }
                        ].map(s => (
                          <button
                            key={s.code}
                            type="button"
                            disabled={!editing}
                            onClick={() => {
                              const cur = medicalHistoryIcd10 ? medicalHistoryIcd10.split(';').map(x => x.trim()).filter(Boolean) : []
                              if (!cur.includes(s.code)) {
                                setMedicalHistoryIcd10(cur.length ? `${medicalHistoryIcd10}; ${s.code}` : s.code)
                              }
                            }}
                            style={{
                              border: '1px solid #bae6fd',
                              background: '#f0f9ff',
                              color: '#0369a1',
                              fontSize: '11px',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              cursor: 'pointer'
                            }}
                          >
                            + [{s.code}] {s.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                          Ghi chú mô tả tiền sử bệnh bản thân
                        </label>
                        <textarea
                          className="ps-form-input"
                          rows={2}
                          value={medicalHistoryNotes}
                          onChange={e => setMedicalHistoryNotes(e.target.value)}
                          disabled={!editing}
                          placeholder="Mô tả quá trình mắc, thuốc đang dùng định kỳ..."
                          style={{ height: 'auto', padding: '8px 12px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Tiền sử gia đình */}
                <div className="ps-input-group full-width" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
                    Tiền sử gia đình (Các bệnh lý có tính chất di truyền theo mã ICD-10)
                  </label>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b' }}>
                    Nhập mã ICD-10 của bệnh lý di truyền hoặc tiền sử bệnh gia đình (phân cách bằng dấu chấm phẩy ;)
                  </p>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={familyHistoryIcd10}
                    onChange={e => setFamilyHistoryIcd10(e.target.value)}
                    disabled={!editing}
                    placeholder="Ví dụ: I10; E11; C50 (Tăng huyết áp, Đái tháo đường, Ung thư vú...)"
                    style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0e7490' }}
                  />
                  <div style={{ marginTop: '8px' }}>
                    <textarea
                      className="ps-form-input"
                      rows={2}
                      value={familyHistoryNotes}
                      onChange={e => setFamilyHistoryNotes(e.target.value)}
                      disabled={!editing}
                      placeholder="Ghi chú chi tiết: Bố mẹ mắc tim mạch sớm, người thân có bệnh lý huyết học..."
                      style={{ height: 'auto', padding: '8px 12px' }}
                    />
                  </div>
                </div>

                {/* 3. Tiền sử dịch tễ */}
                <div className="ps-input-group full-width" style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
                    Tiền sử dịch tễ (Tiếp xúc người bệnh truyền nhiễm)
                  </label>
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748b' }}>
                    Ghi nhận tiền sử tiếp xúc với người bệnh truyền nhiễm (bệnh lao, sốt xuất huyết, sởi, cúm A, ho gà...)
                  </p>
                  <textarea
                    className="ps-form-input"
                    rows={2}
                    value={epidemiologicalHistory}
                    onChange={e => setEpidemiologicalHistory(e.target.value)}
                    disabled={!editing}
                    placeholder="Ví dụ: Không tiếp xúc người bệnh lao trong 6 tháng qua; hoặc có tiếp xúc gần người thân điều trị lao..."
                    style={{ height: 'auto', padding: '8px 12px' }}
                  />
                </div>

                {/* Dị ứng */}
                <div className="ps-input-group full-width">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626' }}>
                    <AlertTriangle size={15} /> Tiền sử dị ứng (Thuốc, kháng sinh, thức ăn, phấn hoa)
                  </label>
                  <textarea
                    className="ps-form-input"
                    rows={2}
                    style={{ height: 'auto', padding: '10px 14px' }}
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    disabled={!editing}
                    placeholder="Ví dụ: Dị ứng Penicillin, Paracetamol nổi mề đay, dị ứng tôm cua..."
                  />
                </div>
              </div>

              {editing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="ps-btn-secondary" onClick={() => setEditing(false)}>
                    Hủy bỏ
                  </button>
                  <button type="submit" className="ps-btn-primary" disabled={saving}>
                    <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu tiền sử sức khỏe'}
                  </button>
                </div>
              )}
            </form>
          </section>
        )}

        {/* TAB 3: THIẾT BỊ SINH HIỆU RPM */}
        {activeTab === 'devices' && (
          <section>
            <SmartDevicesHub user={currentUser} embedded={true} onNavigate={onNavigate} />
          </section>
        )}

        {/* TAB 4: LỊCH SỬ & DỊCH VỤ Y TẾ */}
        {activeTab === 'history' && (
          <section className="ps-hero-card" style={{ display: 'block' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: 'var(--ps-navy)' }}>
              Truy Cập Nhanh Hệ Sinh Thái Y Tế Cá Nhân
            </h3>

            <div className="ps-services-grid">
              <div className="ps-service-tile" onClick={() => onNavigate('records')}>
                <div>
                  <div className="ps-service-icon-box blue"><FileText size={22} /></div>
                  <h4 className="ps-service-title">Hồ Sơ Bệnh Án EMR</h4>
                  <p className="ps-service-desc">Xem toàn bộ lịch sử thăm khám và chẩn đoán ICD-10</p>
                </div>
                <div className="ps-service-footer">
                  <span>Mở EMR</span>
                  <ChevronRight size={15} />
                </div>
              </div>

              <div className="ps-service-tile" onClick={() => onNavigate('prescriptions')}>
                <div>
                  <div className="ps-service-icon-box mint"><Heart size={22} /></div>
                  <h4 className="ps-service-title">Đơn Thuốc Điện Tử</h4>
                  <p className="ps-service-desc">Đơn thuốc có ký số và hướng dẫn liều dùng</p>
                </div>
                <div className="ps-service-footer">
                  <span>Mở đơn thuốc</span>
                  <ChevronRight size={15} />
                </div>
              </div>

              <div className="ps-service-tile" onClick={() => onNavigate('lab')}>
                <div>
                  <div className="ps-service-icon-box sky"><Droplet size={22} /></div>
                  <h4 className="ps-service-title">Xét Nghiệm LIS</h4>
                  <p className="ps-service-desc">Kết quả sinh hóa, huyết học kèm giá trị tham chiếu</p>
                </div>
                <div className="ps-service-footer">
                  <span>Mở xét nghiệm</span>
                  <ChevronRight size={15} />
                </div>
              </div>

              <div className="ps-service-tile" onClick={() => onNavigate('pacs')}>
                <div>
                  <div className="ps-service-icon-box purple"><Camera size={22} /></div>
                  <h4 className="ps-service-title">Hình Ảnh PACS</h4>
                  <p className="ps-service-desc">Xem phim chụp X-quang, MRI, Siêu âm DICOM</p>
                </div>
                <div className="ps-service-footer">
                  <span>Mở phim chụp</span>
                  <ChevronRight size={15} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 5: BẢO MẬT & QUYỀN RIÊNG TƯ */}
        {activeTab === 'privacy' && (
          <section className="ps-hero-card" style={{ display: 'block' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: 'var(--ps-navy)' }}>
              Bảo Mật Dữ Liệu & Quyền Riêng Tư Y Tế (Nghị Định 13/2023/NĐ-CP)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--ps-primary)', fontWeight: 700 }}>
                  <ShieldCheck size={20} />
                  <span>Tuân thủ Luật Khám bệnh, chữa bệnh 2023 & Nghị định 13/2023/NĐ-CP</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--ps-slate)', lineHeight: 1.5 }}>
                  Mọi hồ sơ bệnh án (EMR), hình ảnh xét nghiệm và chỉ số sinh hiệu của bạn được bảo mật tuyệt đối,
                  mã hóa phân vùng PHI và chỉ được cung cấp cho Bác sĩ được chỉ định trong ca tư vấn.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="ps-btn-secondary"
                  onClick={() => alert('Bản sao lưu dữ liệu y tế cá nhân đang được đóng gói. Hệ thống sẽ gửi về email của bạn.')}
                >
                  <Download size={15} /> Tải bản sao lưu dữ liệu EMR
                </button>
                <button
                  type="button"
                  className="ps-btn-secondary"
                  onClick={() => alert('Vui lòng sử dụng tính năng Đổi mật khẩu trên màn hình đăng nhập hoặc liên hệ tổng đài 1900 8866.')}
                >
                  <KeyRound size={15} /> Đổi mật khẩu tài khoản
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
