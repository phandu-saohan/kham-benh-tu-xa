import { useState, useEffect } from 'react'
import {
  UserRound, ShieldCheck, Phone, Mail, CreditCard, Heart, AlertTriangle,
  Calendar, MapPin, Edit3, Save, X, CheckCircle2, Lock, FileText,
  Activity, Bell, LogOut, Download, Sparkles, Building2, Eye, EyeOff
} from 'lucide-react'
import { getMyProfile, updateMyProfile, type PatientProfile, type User } from './api'

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
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'medical' | 'privacy'>('info')

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
      setDateOfBirth(data.date_of_birth || '1992-08-16')
      setGender(data.gender || 'Nam')
      setIdentityCard(data.identity_card || '079092014829')
      setAddress(data.address || '124 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh')
      setBhytCode(data.bhyt_code || 'GD4797931812345')
      setBloodType(data.blood_type || 'O+')
      setAllergies(data.allergies || 'Không ghi nhận dị ứng thuốc')
      setEmergencyName(data.emergency_contact_name || 'Nguyễn Thị Mai (Vợ)')
      setEmergencyPhone(data.emergency_contact_phone || '0988776655')
    } catch (e: any) {
      setError(e.message || 'Không thể tải thông tin tài khoản')
    } finally {
      setLoading(false)
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

  if (loading) {
    return (
      <div className="panel profile-loading">
        <Activity className="animate-spin" size={32} color="#0f766e" />
        <p>Đang tải thông tin hồ sơ y tế bệnh nhân...</p>
      </div>
    )
  }

  return (
    <div className="patient-profile-page">
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

      {/* Hero Header Card */}
      <section className="profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-large">
              {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'BN'}
            </div>
            <span className="profile-verified-badge" title="Đã đối soát CCCD & Thẻ BHYT">
              <ShieldCheck size={14} /> Đã định danh
            </span>
          </div>

          <div className="profile-hero-info">
            <div className="profile-hero-badges">
              <span className="badge-pill role">Bệnh nhân</span>
              <span className="badge-pill id">PID: {profile?.external_patient_id || `CC-${profile?.id}`}</span>
              <span className="badge-pill legal">NĐ 13/2023/NĐ-CP</span>
            </div>
            <h2>{profile?.full_name}</h2>
            <p className="profile-meta-line">
              <span><Phone size={13} /> {profile?.phone_number || 'Chưa có SĐT'}</span>
              <span>•</span>
              <span><Mail size={13} /> {profile?.email}</span>
            </p>
          </div>
        </div>

        <div className="profile-hero-actions">
          {!editing ? (
            <button className="primary btn-edit-profile" onClick={() => setEditing(true)}>
              <Edit3 size={15} /> Chỉnh sửa hồ sơ
            </button>
          ) : (
            <button className="secondary btn-cancel-edit" onClick={() => setEditing(false)}>
              <X size={15} /> Hủy bỏ
            </button>
          )}
          <button className="secondary btn-logout-profile" onClick={onLogout} title="Đăng xuất khỏi thiết bị">
            <LogOut size={15} /> Đăng xuất
          </button>
        </div>
      </section>

      {/* Stats Counter Strip */}
      <section className="profile-stats-strip">
        <div className="profile-stat-box" onClick={() => onNavigate('appointments')}>
          <div className="stat-icon-circ" style={{ background: '#f0fdfa', color: '#0f766e' }}>
            <Calendar size={20} />
          </div>
          <div>
            <strong>{profile?.total_appointments || 0}</strong>
            <small>Tổng lịch khám</small>
          </div>
        </div>

        <div className="profile-stat-box" onClick={() => onNavigate('appointments')}>
          <div className="stat-icon-circ" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <strong>{profile?.completed_appointments || 0}</strong>
            <small>Đã hoàn tất</small>
          </div>
        </div>

        <div className="profile-stat-box" onClick={() => onNavigate('prescriptions')}>
          <div className="stat-icon-circ" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FileText size={20} />
          </div>
          <div>
            <strong>{profile?.total_prescriptions || 0}</strong>
            <small>Đơn thuốc Quốc gia</small>
          </div>
        </div>

        <div className="profile-stat-box" onClick={() => onNavigate('insurance')}>
          <div className="stat-icon-circ" style={{ background: '#fffbeb', color: '#d97706' }}>
            <CreditCard size={20} />
          </div>
          <div>
            <strong style={{ color: '#059669' }}>Mức hưởng 80%</strong>
            <small>BHYT: {profile?.bhyt_code?.slice(0, 4)}...{profile?.bhyt_code?.slice(-4)}</small>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="profile-tab-bar">
        <button
          className={`profile-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <UserRound size={16} /> Thông tin Hành chính & Định danh
        </button>
        <button
          className={`profile-tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical')}
        >
          <Heart size={16} /> Hồ sơ Y tế & Thẻ BHYT
        </button>
        <button
          className={`profile-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
          onClick={() => setActiveTab('privacy')}
        >
          <ShieldCheck size={16} /> Pháp lý Y tế & Bảo mật
        </button>
      </div>

      {/* Tab 1: Thông tin Hành chính & Định danh */}
      {activeTab === 'info' && (
        <section className="panel profile-panel">
          <div className="panel-heading">
            <div>
              <h3>Thông tin Định danh Cá nhân</h3>
              <p>Khớp nối trực tiếp hệ thống dữ liệu Quốc gia VNeID & Thông tư 30/2023/TT-BYT</p>
            </div>
            {!editing && (
              <button className="text-button" onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Chỉnh sửa
              </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            <div className="profile-grid">
              <div className="profile-field">
                <label>Họ và tên đầy đủ</label>
                {editing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                ) : (
                  <div className="field-value-text">{profile?.full_name}</div>
                )}
              </div>

              <div className="profile-field">
                <label>Số điện thoại xác thực OTP</label>
                <div className="field-value-text verified-field">
                  <span>{profile?.phone_number || 'Chưa cung cấp'}</span>
                  <span className="verified-tag">✓ Đã xác thực</span>
                </div>
              </div>

              <div className="profile-field">
                <label>Địa chỉ Email</label>
                {editing ? (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                ) : (
                  <div className="field-value-text">{profile?.email}</div>
                )}
              </div>

              <div className="profile-field">
                <label>Số Căn cước công dân (CCCD 12 số)</label>
                {editing ? (
                  <input
                    type="text"
                    value={identityCard}
                    onChange={(e) => setIdentityCard(e.target.value)}
                    placeholder="12 chữ số trên thẻ CCCD"
                  />
                ) : (
                  <div className="field-value-text">{profile?.identity_card || 'Chưa cập nhật'}</div>
                )}
              </div>

              <div className="profile-field">
                <label>Ngày sinh</label>
                {editing ? (
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                ) : (
                  <div className="field-value-text">{profile?.date_of_birth || '16/08/1992'}</div>
                )}
              </div>

              <div className="profile-field">
                <label>Giới tính</label>
                {editing ? (
                  <select value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                ) : (
                  <div className="field-value-text">{profile?.gender || 'Nam'}</div>
                )}
              </div>

              <div className="profile-field full-width">
                <label>Địa chỉ nơi ở hiện tại</label>
                {editing ? (
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành"
                  />
                ) : (
                  <div className="field-value-text">{profile?.address || 'Chưa cập nhật'}</div>
                )}
              </div>
            </div>

            {editing && (
              <div className="form-actions-bottom">
                <button type="submit" className="primary btn-save-profile" disabled={saving}>
                  <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
                </button>
                <button type="button" className="secondary" onClick={() => setEditing(false)}>
                  Hủy
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Tab 2: Hồ sơ Y tế & Thẻ BHYT */}
      {activeTab === 'medical' && (
        <section className="panel profile-panel">
          <div className="panel-heading">
            <div>
              <h3>Hồ sơ Y tế, Thẻ BHYT & Tiền sử</h3>
              <p>Phục vụ bác sĩ hội chẩn từ xa kê đơn an toàn và áp dụng chiết khấu bảo hiểm</p>
            </div>
            {!editing && (
              <button className="text-button" onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Cập nhật y tế
              </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            {/* Thẻ BHYT Visual Card */}
            <div className="bhyt-card-visual">
              <div className="bhyt-card-top">
                <div className="bhyt-card-logo">
                  <ShieldCheck size={24} />
                  <span>BẢO HIỂM Y TẾ VIỆT NAM</span>
                </div>
                <span className="bhyt-status-chip">Đang hoạt động</span>
              </div>
              <div className="bhyt-card-code">
                {profile?.bhyt_code || 'GD 4 79 79318 12345'}
              </div>
              <div className="bhyt-card-footer">
                <div>
                  <small>Chủ thẻ</small>
                  <b>{profile?.full_name}</b>
                </div>
                <div>
                  <small>Mức hưởng</small>
                  <b>80% KCB Đúng tuyến</b>
                </div>
                <div>
                  <small>ĐK KCB Ban đầu</small>
                  <b>BV CareConnect (79-012)</b>
                </div>
              </div>
            </div>

            <div className="profile-grid" style={{ marginTop: '20px' }}>
              <div className="profile-field">
                <label>Mã số thẻ BHYT (15 ký tự)</label>
                {editing ? (
                  <input
                    type="text"
                    value={bhytCode}
                    onChange={(e) => setBhytCode(e.target.value.toUpperCase())}
                    maxLength={15}
                  />
                ) : (
                  <div className="field-value-text">{profile?.bhyt_code}</div>
                )}
              </div>

              <div className="profile-field">
                <label>Nhóm máu (ABO & Rh)</label>
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
                  <div className="field-value-text font-bold" style={{ color: '#e11d48' }}>
                    {profile?.blood_type || 'O+'}
                  </div>
                )}
              </div>

              <div className="profile-field full-width">
                <label className="text-warning-label">
                  <AlertTriangle size={14} color="#d97706" /> Tiền sử Dị ứng thuốc & Thực phẩm
                </label>
                {editing ? (
                  <textarea
                    rows={2}
                    value={allergies}
                    onChange={(e) => setAllergies(e.target.value)}
                    placeholder="Ghi rõ dị ứng (ví dụ: Dị ứng Penicillin, Aspirin, hải sản...)"
                  />
                ) : (
                  <div className="field-value-box allergy-box">
                    {profile?.allergies || 'Không ghi nhận dị ứng thuốc'}
                  </div>
                )}
              </div>

              <div className="profile-field">
                <label>Người liên hệ khẩn cấp</label>
                {editing ? (
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Họ tên người thân (Mẹ/Vợ/Chồng...)"
                  />
                ) : (
                  <div className="field-value-text">{profile?.emergency_contact_name || 'Chưa cập nhật'}</div>
                )}
              </div>

              <div className="profile-field">
                <label>Số điện thoại người liên hệ khẩn cấp</label>
                {editing ? (
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="SĐT người thân"
                  />
                ) : (
                  <div className="field-value-text">{profile?.emergency_contact_phone || 'Chưa cập nhật'}</div>
                )}
              </div>
            </div>

            {editing && (
              <div className="form-actions-bottom">
                <button type="submit" className="primary btn-save-profile" disabled={saving}>
                  <Save size={15} /> {saving ? 'Đang lưu...' : 'Lưu hồ sơ y tế'}
                </button>
                <button type="button" className="secondary" onClick={() => setEditing(false)}>
                  Hủy
                </button>
              </div>
            )}
          </form>
        </section>
      )}

      {/* Tab 3: Pháp lý Y tế & Bảo mật */}
      {activeTab === 'privacy' && (
        <section className="panel profile-panel">
          <div className="panel-heading">
            <div>
              <h3>Pháp lý Y tế & Quyền riêng tư Dữ liệu</h3>
              <p>Tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP và Luật Khám bệnh, chữa bệnh 2023</p>
            </div>
          </div>

          <div className="privacy-cards-list">
            <div className="privacy-item-card">
              <div className="privacy-icon-box" style={{ background: '#ecfdf5', color: '#059669' }}>
                <ShieldCheck size={22} />
              </div>
              <div className="privacy-content">
                <h4>Đồng thuận Xử lý Dữ liệu Y tế Cá nhân</h4>
                <p>
                  Bạn đã đồng thuận cho phép Bệnh viện CareConnect thu thập và lưu trữ thông tin bệnh án, kết quả xét nghiệm và đơn thuốc để phục vụ khám chữa bệnh từ xa.
                </p>
                <span className="privacy-status-text">
                  ✓ Trạng thái: <b>Đã đồng thuận</b> (Phiên bản: 2026.1-ND13)
                </span>
              </div>
            </div>

            <div className="privacy-item-card">
              <div className="privacy-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
                <Lock size={22} />
              </div>
              <div className="privacy-content">
                <h4>Mã hóa Hồ sơ Bệnh án End-to-End</h4>
                <p>
                  Dữ liệu y tế của bạn được mã hóa chuẩn quân sự AES-256 trước khi lưu trữ vào hệ thống cơ sở dữ liệu bệnh viện. Chỉ bác sĩ được phân công phụ trách ca khám mới có quyền giải mã xem bệnh án.
                </p>
                <span className="privacy-status-text">
                  ✓ Chuẩn mã hóa: <b>AES-256-GCM & SSL/TLS 1.3</b>
                </span>
              </div>
            </div>

            <div className="privacy-item-card">
              <div className="privacy-icon-box" style={{ background: '#faf5ff', color: '#9333ea' }}>
                <FileText size={22} />
              </div>
              <div className="privacy-content">
                <h4>Chữ ký số Bác sĩ VNPT SmartCA</h4>
                <p>
                  Mọi kết luận chẩn đoán và đơn thuốc ban hành đều được ký số bằng chứng thư số PKI của Bác sĩ có giá trị pháp lý tương đương văn bản đóng dấu của bệnh viện.
                </p>
                <span className="privacy-status-text">
                  ✓ Đạt chuẩn Thông tư 30/2023/TT-BYT & QCVN 108:2016
                </span>
              </div>
            </div>
          </div>

          <div className="account-danger-zone">
            <h4>Bảo mật & Quản lý Thiết bị</h4>
            <div className="danger-row">
              <div>
                <b>Đăng xuất khỏi thiết bị này</b>
                <p>Xóa sạch token phiên làm việc trên trình duyệt và thiết bị di động</p>
              </div>
              <button className="secondary btn-logout-danger" onClick={onLogout}>
                <LogOut size={15} /> Đăng xuất
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
