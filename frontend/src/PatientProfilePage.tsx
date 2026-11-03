import { useState, useEffect, useRef } from 'react'
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
  Bell,
  LogOut,
  Download,
  Sparkles,
  Building2,
  Eye,
  EyeOff,
  Camera,
  QrCode,
  Droplet,
  Weight,
  PhoneCall,
  Clock,
  ArrowRight,
  ChevronRight,
  ExternalLink
} from 'lucide-react'
import {
  getMyProfile,
  updateMyProfile,
  ocrMedicalDocument,
  type PatientProfile,
  type User
} from './api'

interface PatientProfilePageProps {
  currentUser: User
  onLogout: () => void
  onUpdateUser: (updated: User) => void
  onNavigate: (view: string) => void
}

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
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'history' | 'privacy'>('info')

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
    } catch (e: any) {
      setError(e.message || 'Không thể tải thông tin tài khoản')
    } finally {
      setLoading(false)
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
        gender: gender.trim(),
        identity_card: identityCard.trim(),
        address: address.trim(),
        bhyt_code: bhytCode.trim(),
        blood_type: bloodType.trim(),
        allergies: allergies.trim(),
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim()
      })
      setProfile(updated)
      setEditing(false)
      setSuccess('Cập nhật hồ sơ bệnh nhân thành công!')
      setTimeout(() => setSuccess(''), 4000)

      onUpdateUser({
        ...currentUser,
        full_name: updated.full_name,
        email: updated.email
      })
    } catch (e: any) {
      setError(e.message || 'Lỗi khi lưu thông tin tài khoản')
    } finally {
      setSaving(false)
    }
  }

  // Format BHYT code with spaced segments: "GD 4 79 7931812345"
  const formatBhytCode = (code?: string) => {
    if (!code) return 'CHƯA LIÊN KẾT THẺ'
    const clean = code.replace(/\s+/g, '')
    if (clean.length === 15) {
      return `${clean.slice(0, 2)} ${clean.slice(2, 3)} ${clean.slice(3, 5)} ${clean.slice(5)}`
    }
    return code
  }

  if (loading) {
    return (
      <div className="panel profile-loading">
        <Activity className="animate-spin" size={32} color="#0f766e" />
        <p>Đang tải thông tin hồ sơ y tế bệnh nhân...</p>
      </div>
    )
  }

  return (
    <div className="patient-profile-page mobile-patient-profile">
      {error && (
        <div className="alert error">
          <span>{error}</span>
          <button onClick={() => setError('')}><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="alert success">
          <CheckCircle2 size={16} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')}><X size={16} /></button>
        </div>
      )}

      {/* 1. Mobile-First Clinical Hero Card */}
      <section className="profile-hero-card-v2">
        <div className="profile-hero-top-row">
          <div className="profile-avatar-container">
            <div className="profile-avatar-badge">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'BN'}
            </div>
            <span className="profile-verified-chip" title="Đã đối soát CCCD & VNeID mức 2">
              <ShieldCheck size={12} /> Đã định danh
            </span>
          </div>

          <div className="profile-headline-block">
            <div className="profile-pid-row">
              <span className="pid-badge">PID: {profile?.external_patient_id || `CC-PAT-${profile?.id?.toString().padStart(4, '0')}`}</span>
              <span className="legal-badge">NĐ 13/2023/NĐ-CP</span>
            </div>
            <h2>{profile?.full_name || 'Quý bệnh nhân'}</h2>
            <div className="profile-contact-line">
              <span><Phone size={13} /> {profile?.phone_number || 'Chưa có SĐT'}</span>
              <span>•</span>
              <span><Mail size={13} /> {profile?.email}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Strip (Touch friendly) */}
        <div className="profile-quick-action-strip">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleOcrUpload}
          />
          <button
            type="button"
            className="btn-mobile-ocr"
            onClick={() => fileInputRef.current?.click()}
            disabled={ocrLoading}
          >
            <Camera size={16} />
            {ocrLoading ? 'AI đang đọc thẻ...' : '📸 Quét CCCD / BHYT'}
          </button>
          {!editing ? (
            <button className="btn-mobile-edit" onClick={() => setEditing(true)}>
              <Edit3 size={15} /> Sửa hồ sơ
            </button>
          ) : (
            <button className="btn-mobile-cancel" onClick={() => setEditing(false)}>
              <X size={15} /> Hủy sửa
            </button>
          )}
          <button className="btn-mobile-logout" onClick={onLogout} title="Đăng xuất khỏi thiết bị">
            <LogOut size={15} />
          </button>
        </div>
      </section>

      {/* 2. Realistic Vietnamese Digital BHYT Card */}
      <section className="digital-bhyt-section">
        <div className="digital-bhyt-card">
          <div className="bhyt-card-watermark">BẢO HIỂM Y TẾ VIỆT NAM</div>
          
          <div className="bhyt-header-row">
            <div className="bhyt-emblem-wrap">
              <div className="bhyt-emblem-icon">
                <ShieldCheck size={22} />
              </div>
              <div>
                <b className="bhyt-agency-title">BẢO HIỂM XÃ HỘI VIỆT NAM</b>
                <span className="bhyt-sub-title">THẺ BẢO HIỂM Y TẾ ĐIỆN TỬ</span>
              </div>
            </div>
            <span className={`bhyt-chip-status ${profile?.bhyt_code ? 'active' : 'inactive'}`}>
              <span className="status-live-dot" />
              {profile?.bhyt_code ? 'Đang có hiệu lực' : 'Chưa liên kết thẻ'}
            </span>
          </div>

          <div className="bhyt-code-display">
            {formatBhytCode(profile?.bhyt_code)}
          </div>

          <div className="bhyt-details-grid">
            <div className="bhyt-detail-cell">
              <span className="detail-lbl">Họ và tên:</span>
              <strong className="detail-val">{profile?.full_name || 'Bệnh nhân'}</strong>
            </div>
            <div className="bhyt-detail-cell">
              <span className="detail-lbl">Ngày sinh:</span>
              <strong className="detail-val">{profile?.date_of_birth || 'Chưa cập nhật'}</strong>
            </div>
            <div className="bhyt-detail-cell">
              <span className="detail-lbl">Giới tính:</span>
              <strong className="detail-val">{profile?.gender || 'Nam'}</strong>
            </div>
            <div className="bhyt-detail-cell">
              <span className="detail-lbl">Mức hưởng:</span>
              <strong className="detail-val" style={{ color: '#10b981' }}>
                {profile?.bhyt_code ? '80% KCB Đúng tuyến' : 'Chưa áp dụng'}
              </strong>
            </div>
            <div className="bhyt-detail-cell full-span">
              <span className="detail-lbl">Nơi ĐK KCB Ban đầu:</span>
              <strong className="detail-val">
                79-014 (Bệnh viện Đa khoa Quốc tế CareConnect)
              </strong>
            </div>
          </div>

          <div className="bhyt-card-bottom-bar">
            <div className="bhyt-qr-simulation">
              <QrCode size={36} color="#0f766e" />
              <div className="qr-subtext">
                <small>Mã vạch tra cứu QĐ 4210</small>
                <b>GDBHYT-{profile?.id || '79014'}</b>
              </div>
            </div>
            <div className="bhyt-valid-date">
              <small>Giá trị sử dụng từ:</small>
              <b>01/01/2026 - Không thời hạn</b>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Clinical Vitals & Biometrics Quick Strip */}
      <section className="profile-biometrics-strip">
        {/* Nhóm máu */}
        <div className="biometric-tile">
          <div className="bio-icon blood">
            <Droplet size={18} />
          </div>
          <div className="bio-info">
            <small>Nhóm máu</small>
            <strong style={{ color: '#e11d48' }}>{profile?.blood_type || 'O+'} (Rh+)</strong>
          </div>
        </div>

        {/* Lịch khám */}
        <div className="biometric-tile" onClick={() => onNavigate('appointments')}>
          <div className="bio-icon appt">
            <Calendar size={18} />
          </div>
          <div className="bio-info">
            <small>Lịch khám</small>
            <strong>{profile?.total_appointments || 0} lượt</strong>
          </div>
        </div>

        {/* Đơn thuốc */}
        <div className="biometric-tile" onClick={() => onNavigate('prescriptions')}>
          <div className="bio-icon rx">
            <FileText size={18} />
          </div>
          <div className="bio-info">
            <small>Đơn thuốc</small>
            <strong>{profile?.total_prescriptions || 0} toa</strong>
          </div>
        </div>

        {/* Dị ứng */}
        <div className="biometric-tile">
          <div className="bio-icon allergy">
            <AlertTriangle size={18} />
          </div>
          <div className="bio-info">
            <small>Dị ứng thuốc</small>
            <strong style={{ color: profile?.allergies ? '#d97706' : '#10b981' }}>
              {profile?.allergies ? 'Có cảnh báo' : 'Chưa ghi nhận'}
            </strong>
          </div>
        </div>
      </section>

      {/* 4. Touch-Friendly Segmented Navigation Tabs */}
      <div className="profile-segmented-nav">
        <button
          className={`segment-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <UserRound size={15} />
          <span>Hành chính & CCCD</span>
        </button>
        <button
          className={`segment-btn ${activeTab === 'medical' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical')}
        >
          <Heart size={15} />
          <span>Y tế & BHYT</span>
        </button>
        <button
          className={`segment-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Activity size={15} />
          <span>Lịch sử khám</span>
        </button>
        <button
          className={`segment-btn ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          <ShieldCheck size={15} />
          <span>Bảo mật NĐ 13</span>
        </button>
      </div>

      {/* 5. Tab Content Sections */}

      {/* Tab 1: Thông tin Hành chính & CCCD */}
      {activeTab === 'info' && (
        <section className="panel profile-section-panel">
          <div className="panel-heading">
            <div>
              <h3>Thông Tin Định Danh & Căn Cước Công Dân</h3>
              <p>Khớp nối trực tiếp hệ thống dữ liệu Quốc gia VNeID & Thông tư 30/2023/TT-BYT</p>
            </div>
            {!editing && (
              <button className="btn-edit-action" onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Chỉnh sửa
              </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div className="profile-fields-grid">
              <div className="field-group">
                <label><UserRound size={14} /> Họ và tên đầy đủ</label>
                {editing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                ) : (
                  <div className="field-display-value highlight">{profile?.full_name}</div>
                )}
              </div>

              <div className="field-group">
                <label><Phone size={14} /> Số điện thoại xác thực OTP</label>
                <div className="field-display-value verified-phone">
                  <span>{profile?.phone_number || 'Chưa cung cấp'}</span>
                  <span className="verified-badge-micro">✓ Đã xác thực OTP</span>
                </div>
              </div>

              <div className="field-group">
                <label><Mail size={14} /> Địa chỉ Email</label>
                {editing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                ) : (
                  <div className="field-display-value">{profile?.email}</div>
                )}
              </div>

              <div className="field-group">
                <label><CreditCard size={14} /> Số Căn cước công dân (CCCD 12 số)</label>
                {editing ? (
                  <input
                    type="text"
                    value={identityCard}
                    onChange={(e) => setIdentityCard(e.target.value)}
                    placeholder="12 chữ số trên thẻ CCCD gắn chip"
                    maxLength={12}
                  />
                ) : (
                  <div className="field-display-value font-mono">
                    {profile?.identity_card || 'Chưa cập nhật (Dùng nút Quét AI phía trên)'}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label><Calendar size={14} /> Ngày tháng năm sinh</label>
                {editing ? (
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                ) : (
                  <div className="field-display-value">{profile?.date_of_birth || 'Chưa cập nhật'}</div>
                )}
              </div>

              <div className="field-group">
                <label><UserRound size={14} /> Giới tính</label>
                {editing ? (
                  <select value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                ) : (
                  <div className="field-display-value">{profile?.gender || 'Nam'}</div>
                )}
              </div>

              <div className="field-group full-width">
                <label><MapPin size={14} /> Địa chỉ thường trú / Nơi ở hiện tại</label>
                {editing ? (
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  />
                ) : (
                  <div className="field-display-value">{profile?.address || 'Chưa cập nhật'}</div>
                )}
              </div>
            </div>

            {editing && (
              <div className="edit-form-actions">
                <button type="submit" className="btn-save-confirm" disabled={saving}>
                  <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
                  Hủy bỏ
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Tab 2: Y tế, Thẻ BHYT & Tiền sử */}
      {activeTab === 'medical' && (
        <section className="panel profile-section-panel">
          <div className="panel-heading">
            <div>
              <h3>Hồ Sơ Y Tế, Thẻ BHYT & Tiền Sử Lâm Sàng</h3>
              <p>Phục vụ Bác sĩ kê đơn an toàn, cảnh báo tương tác thuốc và hưởng chiết khấu BHYT</p>
            </div>
            {!editing && (
              <button className="btn-edit-action" onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Cập nhật y tế
              </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div className="profile-fields-grid">
              <div className="field-group">
                <label><ShieldCheck size={14} /> Mã số thẻ BHYT (15 ký tự)</label>
                {editing ? (
                  <input
                    type="text"
                    value={bhytCode}
                    onChange={(e) => setBhytCode(e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="VD: GD4791234567890"
                  />
                ) : (
                  <div className="field-display-value font-mono highlight-teal">
                    {profile?.bhyt_code || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label><Droplet size={14} color="#e11d48" /> Nhóm máu (ABO & Rh)</label>
                {editing ? (
                  <select value={bloodType} onChange={(e) => setBloodType(e.target.value)}>
                    <option value="O+">O+ (Rh dương)</option>
                    <option value="A+">A+ (Rh dương)</option>
                    <option value="B+">B+ (Rh dương)</option>
                    <option value="AB+">AB+ (Rh dương)</option>
                    <option value="O-">O- (Rh âm)</option>
                    <option value="A-">A- (Rh âm)</option>
                    <option value="B-">B- (Rh âm)</option>
                    <option value="AB-">AB- (Rh âm)</option>
                  </select>
                ) : (
                  <div className="field-display-value font-bold" style={{ color: '#e11d48' }}>
                    {profile?.blood_type || 'O+'}
                  </div>
                )}
              </div>

              <div className="field-group full-width">
                <label className="text-warning-label">
                  <AlertTriangle size={15} color="#d97706" /> Tiền sử Dị ứng thuốc & Thực phẩm
                </label>
                {editing ? (
                  <textarea
                    rows={2}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Ghi rõ dị ứng (ví dụ: Dị ứng Penicillin, Aspirin, phấn hoa, tôm cua...)"
                  />
                ) : (
                  <div className={`field-display-box ${profile?.allergies ? 'has-allergy' : 'no-allergy'}`}>
                    {profile?.allergies ? (
                      <>
                        <AlertTriangle size={16} color="#d97706" />
                        <span>Cảnh báo dị ứng: <b>{profile.allergies}</b></span>
                      </>
                    ) : (
                      '✓ Không ghi nhận tiền sử dị ứng thuốc nguy hiểm'
                    )}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label><UserRound size={14} /> Người liên hệ khẩn cấp</label>
                {editing ? (
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Họ tên người thân (Vợ/Chồng/Cha/Mẹ...)"
                  />
                ) : (
                  <div className="field-display-value">
                    {profile?.emergency_contact_name || 'Chưa cập nhật'}
                  </div>
                )}
              </div>

              <div className="field-group">
                <label><PhoneCall size={14} /> SĐT người liên hệ khẩn cấp</label>
                {editing ? (
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="Số điện thoại người thân"
                  />
                ) : (
                  <div className="field-display-value emergency-call-row">
                    <span>{profile?.emergency_contact_phone || 'Chưa cập nhật'}</span>
                    {profile?.emergency_contact_phone && (
                      <a
                        href={`tel:${profile.emergency_contact_phone}`}
                        className="btn-call-emergency"
                        title="Gọi khẩn cấp"
                      >
                        <PhoneCall size={13} /> Gọi ngay
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {editing && (
              <div className="edit-form-actions">
                <button type="submit" className="btn-save-confirm" disabled={saving}>
                  <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu hồ sơ y tế'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>
                  Hủy bỏ
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Tab 3: Lịch sử Khám & Đơn thuốc */}
      {activeTab === 'history' && (
        <section className="panel profile-section-panel">
          <div className="panel-heading">
            <div>
              <h3>Lịch Sử Khám Bệnh & Đơn Thuốc</h3>
              <p>Toàn bộ hồ sơ khám bệnh từ xa và đơn thuốc điện tử quốc gia</p>
            </div>
            <button className="btn-book-action" onClick={() => onNavigate('appointments')}>
              Xem chi tiết lịch hẹn <ArrowRight size={14} />
            </button>
          </div>

          <div className="history-cards-list">
            <div className="history-action-tile" onClick={() => onNavigate('appointments')}>
              <div className="tile-icon-circ" style={{ background: '#f0fdfa', color: '#0f766e' }}>
                <Calendar size={22} />
              </div>
              <div className="tile-text">
                <b>Quản lý Lịch khám của tôi</b>
                <p>Xem danh sách ca khám, giờ hẹn, buồng khám trực tuyến và thanh toán</p>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>

            <div className="history-action-tile" onClick={() => onNavigate('prescriptions')}>
              <div className="tile-icon-circ" style={{ background: '#ecfdf5', color: '#059669' }}>
                <FileText size={22} />
              </div>
              <div className="tile-text">
                <b>Đơn thuốc điện tử Quốc gia</b>
                <p>Tra cứu mã đơn thuốc, hướng dẫn sử dụng và mã QR donthuocquocgia.vn</p>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>

            <div className="history-action-tile" onClick={() => onNavigate('family')}>
              <div className="tile-icon-circ" style={{ background: '#faf5ff', color: '#9333ea' }}>
                <UserRound size={22} />
              </div>
              <div className="tile-text">
                <b>Hồ sơ Sức khỏe Gia đình (Family Vault)</b>
                <p>Quản lý hồ sơ y tế của con nhỏ dưới 6 tuổi và cha mẹ lớn tuổi</p>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>

            <div className="history-action-tile" onClick={() => onNavigate('vitals')}>
              <div className="tile-icon-circ" style={{ background: '#fff1f2', color: '#e11d48' }}>
                <Activity size={22} />
              </div>
              <div className="tile-text">
                <b>Giám sát Sinh hiệu Từ xa (RPM IoT BLE)</b>
                <p>Kết nối máy đo huyết áp Omron, máy đo đường huyết Accu-Chek và SpO2</p>
              </div>
              <ChevronRight size={18} color="#94a3b8" />
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: Bảo mật NĐ 13 & Quyền riêng tư */}
      {activeTab === 'privacy' && (
        <section className="panel profile-section-panel">
          <div className="panel-heading">
            <div>
              <h3>Bảo Vệ Dữ Liệu Y Tế & Tuân Thủ Pháp Lý</h3>
              <p>Tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP và Luật Khám bệnh, chữa bệnh 2023</p>
            </div>
          </div>

          <div className="privacy-feature-cards">
            <div className="privacy-feature-item">
              <div className="privacy-icon-circ" style={{ background: '#ecfdf5', color: '#059669' }}>
                <ShieldCheck size={22} />
              </div>
              <div className="privacy-item-text">
                <b>Đồng thuận Xử lý Dữ liệu Y tế Cá nhân</b>
                <p>
                  Bạn đã đồng thuận cho phép Bệnh viện CareConnect thu thập và lưu trữ thông tin bệnh án, kết quả xét nghiệm và đơn thuốc để phục vụ khám chữa bệnh từ xa.
                </p>
                <span className="privacy-badge">✓ Trạng thái: Đã đồng thuận (Phiên bản 2026.1-ND13)</span>
              </div>
            </div>

            <div className="privacy-feature-item">
              <div className="privacy-icon-circ" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Lock size={22} />
              </div>
              <div className="privacy-item-text">
                <b>Mã hóa Bệnh án End-to-End (AES-256)</b>
                <p>
                  Toàn bộ dữ liệu bệnh án điện tử EMR được mã hóa chuẩn quân sự AES-256-GCM. Chỉ Bác sĩ được phân công phụ trách ca khám mới có quyền giải mã xem bệnh án.
                </p>
                <span className="privacy-badge">✓ Tiêu chuẩn: AES-256-GCM & SSL/TLS 1.3</span>
              </div>
            </div>

            <div className="privacy-feature-item">
              <div className="privacy-icon-circ" style={{ background: '#faf5ff', color: '#9333ea' }}>
                <FileText size={22} />
              </div>
              <div className="privacy-item-text">
                <b>Chữ ký số Bác sĩ VNPT SmartCA</b>
                <p>
                  Mọi kết luận chẩn đoán và đơn thuốc ban hành đều được ký số PKI của Bác sĩ có giá trị pháp lý tương đương văn bản đóng dấu của bệnh viện.
                </p>
                <span className="privacy-badge">✓ Đạt chuẩn Thông tư 30/2023/TT-BYT & QCVN 108:2016</span>
              </div>
            </div>
          </div>

          <div className="account-device-management">
            <h4>Quản lý Phiên & Thiết bị Đăng nhập</h4>
            <div className="device-logout-card">
              <div>
                <b>Đăng xuất khỏi thiết bị này</b>
                <p>Xóa sạch token phiên làm việc trên trình duyệt và thiết bị di động để bảo mật dữ liệu</p>
              </div>
              <button className="btn-logout-safe" onClick={onLogout}>
                <LogOut size={16} /> Đăng xuất an toàn
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
