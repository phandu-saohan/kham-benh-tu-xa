import React, { useState, useEffect } from 'react'
import {
  X,
  Camera,
  Users,
  ShieldCheck,
  Heart,
  Activity,
  UserCheck,
  FileText,
  MapPin,
  AlertCircle
} from 'lucide-react'
import {
  FamilyMemberItem,
  createFamilyMember,
  updateFamilyMember
} from './api'

interface FamilyMemberModalProps {
  memberToEdit?: FamilyMemberItem | null
  onClose: () => void
  onSaved: (member: FamilyMemberItem) => void
  onError: (err: string) => void
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

export const FamilyMemberModal: React.FC<FamilyMemberModalProps> = ({
  memberToEdit,
  onClose,
  onSaved,
  onError
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'companion' | 'history'>('admin')
  const [saving, setSaving] = useState(false)

  // 1. Thông tin hành chính
  const [avatarUrl, setAvatarUrl] = useState<string>(memberToEdit?.avatar_url || '')
  const [fullName, setFullName] = useState(memberToEdit?.full_name || '')
  const [relationship, setRelationship] = useState(memberToEdit?.relationship || 'child')
  const [gender, setGender] = useState(memberToEdit?.gender || 'male')
  const [dob, setDob] = useState(memberToEdit?.date_of_birth || '2018-01-01')
  const [nationalId, setNationalId] = useState(memberToEdit?.national_id || '')
  const [ethnicity, setEthnicity] = useState(memberToEdit?.ethnicity || 'Kinh')
  const [bloodGroup, setBloodGroup] = useState(memberToEdit?.blood_group || 'O+')
  const [bhytCode, setBhytCode] = useState(memberToEdit?.bhyt_code || '')
  const [phone, setPhone] = useState(memberToEdit?.phone_number || '')
  const [address, setAddress] = useState(memberToEdit?.address || '')
  const [provinceCode, setProvinceCode] = useState(memberToEdit?.province_code || '79')
  const [wardCode, setWardCode] = useState(memberToEdit?.ward_code || '')

  // 2. Thông tin người đi cùng
  const [companionName, setCompanionName] = useState(memberToEdit?.companion_name || '')
  const [companionIdCard, setCompanionIdCard] = useState(memberToEdit?.companion_id_card || '')
  const [companionPhone, setCompanionPhone] = useState(memberToEdit?.companion_phone || '')
  const [companionRel, setCompanionRel] = useState(memberToEdit?.companion_relationship || 'Bố/Mẹ')

  // 3. Tiền sử sức khỏe & Dịch tễ
  const [hasMedicalHistory, setHasMedicalHistory] = useState(!!memberToEdit?.has_medical_history)
  const [medHistoryIcd10, setMedHistoryIcd10] = useState(memberToEdit?.medical_history_icd10 || '')
  const [medHistoryNotes, setMedHistoryNotes] = useState(memberToEdit?.medical_history_notes || '')
  const [famHistoryIcd10, setFamHistoryIcd10] = useState(memberToEdit?.family_history_icd10 || '')
  const [famHistoryNotes, setFamHistoryNotes] = useState(memberToEdit?.family_history_notes || '')
  const [epiHistory, setEpiHistory] = useState(memberToEdit?.epidemiological_history || '')
  const [allergies, setAllergies] = useState(memberToEdit?.allergies || '')
  const [chronicConditions, setChronicConditions] = useState(memberToEdit?.chronic_conditions || '')

  // Handle Avatar Image Upload & Canvas Compression
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rawBase64 = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
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
        setAvatarUrl(compressed)
      }
      img.src = rawBase64
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) {
      onError('Vui lòng nhập họ và tên thành viên')
      return
    }

    setSaving(true)
    try {
      const payload: Partial<FamilyMemberItem> = {
        full_name: fullName.trim(),
        relationship,
        gender,
        date_of_birth: dob,
        national_id: nationalId.trim() || null,
        bhyt_code: bhytCode.trim() || null,
        phone_number: phone.trim() || null,
        blood_group: bloodGroup,
        ethnicity,
        address: address.trim() || null,
        province_code: provinceCode,
        ward_code: wardCode.trim() || null,
        companion_name: companionName.trim() || null,
        companion_id_card: companionIdCard.trim() || null,
        companion_phone: companionPhone.trim() || null,
        companion_relationship: companionRel,
        has_medical_history: hasMedicalHistory,
        medical_history_icd10: medHistoryIcd10.trim() || null,
        medical_history_notes: medHistoryNotes.trim() || null,
        family_history_icd10: famHistoryIcd10.trim() || null,
        family_history_notes: famHistoryNotes.trim() || null,
        epidemiological_history: epiHistory.trim() || null,
        allergies: allergies.trim() || null,
        chronic_conditions: chronicConditions.trim() || null,
        avatar_url: avatarUrl || null
      }

      let res: FamilyMemberItem
      if (memberToEdit) {
        res = await updateFamilyMember(memberToEdit.id, payload)
      } else {
        res = await createFamilyMember(payload)
      }

      onSaved(res)
    } catch (err: any) {
      onError(err.message || 'Không thể lưu hồ sơ người thân')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal" style={{ maxWidth: '640px', width: '100%', borderRadius: '8px', padding: 0, overflow: 'hidden' }}>
        {/* Modal Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={20} color="#0284c7" />
            <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>
              {memberToEdit ? 'Chỉnh Sửa Hồ Sơ Người Thân' : 'Thêm Thành Viên Sổ Sức Khỏe Gia Đình'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#ffffff', padding: '0 16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === 'admin' ? '2px solid #0284c7' : '2px solid transparent',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'admin' ? '#0284c7' : '#64748b',
              cursor: 'pointer'
            }}
          >
            1. Thông tin cá nhân (Bắt buộc)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('companion')}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === 'companion' ? '2px solid #0284c7' : '2px solid transparent',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'companion' ? '#0284c7' : '#64748b',
              cursor: 'pointer'
            }}
          >
            2. Người đi cùng / Giám hộ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '10px 14px',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid #0284c7' : '2px solid transparent',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: 600,
              color: activeTab === 'history' ? '#0284c7' : '#64748b',
              cursor: 'pointer'
            }}
          >
            3. Tiền sử sức khỏe & Dịch tễ
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} style={{ padding: '18px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* TAB 1: THÔNG TIN HÀNH CHÍNH & AVATAR */}
          {activeTab === 'admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Avatar Upload Box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '20px',
                    overflow: 'hidden',
                    border: '2px solid #cbd5e1'
                  }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      fullName ? fullName.charAt(0).toUpperCase() : 'NT'
                    )}
                  </div>
                  <label
                    style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      background: '#0284c7',
                      color: '#fff',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    title="Tải ảnh đại diện"
                  >
                    <Camera size={12} />
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                  </label>
                </div>
                <div>
                  <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>Ảnh đại diện thành viên</strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Hỗ trợ tải ảnh định dạng JPG, PNG để nhận diện khi khám bệnh.</span>
                </div>
              </div>

              {/* Row 1: Họ tên & Quan hệ */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Họ và tên người bệnh *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Minh Khang"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Mối quan hệ với chủ tài khoản *
                  </label>
                  <select
                    value={relationship}
                    onChange={e => setRelationship(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="child">Con cái</option>
                    <option value="parent">Cha / Mẹ</option>
                    <option value="spouse">Vợ / Chồng</option>
                    <option value="sibling">Anh / Chị / Em</option>
                    <option value="grandparent">Ông / Bà</option>
                    <option value="other">Người thân khác</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Ngày sinh & Giới tính */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Ngày sinh (YYYY-MM-DD) *
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Giới tính *
                  </label>
                  <select
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>
              </div>

              {/* Row 3: CCCD & BHYT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Số CCCD / Mã định danh cá nhân
                  </label>
                  <input
                    type="text"
                    placeholder="12 số hoặc mã định danh trẻ em"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Mã thẻ BHYT (nếu có)
                  </label>
                  <input
                    type="text"
                    placeholder="Mã thẻ 15 ký tự"
                    value={bhytCode}
                    onChange={e => setBhytCode(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Row 4: Dân tộc & Nhóm máu & SĐT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Dân tộc
                  </label>
                  <select
                    value={ethnicity}
                    onChange={e => setEthnicity(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    {VIETNAM_ETHNICITIES.map(et => (
                      <option key={et} value={et}>{et}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Nhóm máu
                  </label>
                  <select
                    value={bloodGroup}
                    onChange={e => setBloodGroup(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="Không rõ">Không rõ</option>
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="09..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Row 5: Nơi ở hiện tại (Mã Tỉnh / Mã Xã) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Tỉnh / Thành phố (Mã Tỉnh)
                  </label>
                  <select
                    value={provinceCode}
                    onChange={e => setProvinceCode(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    {VIETNAM_PROVINCES.map(p => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Mã Xã / Phường
                  </label>
                  <input
                    type="text"
                    placeholder="Mã xã/phường (nếu có)"
                    value={wardCode}
                    onChange={e => setWardCode(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Địa chỉ chi tiết nơi ở
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, đường, thôn/xóm..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: NGƯỜI ĐI CÙNG / GIÁM HỘ */}
          {activeTab === 'companion' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0f9ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bae6fd', fontSize: '12px', color: '#0369a1' }}>
                💡 Thông tin người đi cùng rất quan trọng đối với trẻ em dưới 6 tuổi, người cao tuổi hoặc trường hợp cần hỗ trợ pháp lý y tế.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Họ và tên người đi cùng / Giám hộ
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nguyễn Văn Cha"
                    value={companionName}
                    onChange={e => setCompanionName(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Mối quan hệ với người bệnh
                  </label>
                  <input
                    type="text"
                    placeholder="Bố, Mẹ, Con, Người bảo trợ..."
                    value={companionRel}
                    onChange={e => setCompanionRel(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Số CCCD người đi cùng
                  </label>
                  <input
                    type="text"
                    placeholder="Số CCCD 12 số"
                    value={companionIdCard}
                    onChange={e => setCompanionIdCard(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    placeholder="09..."
                    value={companionPhone}
                    onChange={e => setCompanionPhone(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TIỀN SỬ SỨC KHỎE & DỊCH TỄ (QĐ 2682/QĐ-BYT) */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                  <input
                    type="checkbox"
                    checked={hasMedicalHistory}
                    onChange={e => setHasMedicalHistory(e.target.checked)}
                  />
                  Người bệnh có tiền sử mắc bệnh lý trước đây
                </label>
              </div>

              {hasMedicalHistory && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Mã bệnh tiền sử ICD-10 (phân cách dấu ;)
                    </label>
                    <input
                      type="text"
                      placeholder="Ví dụ: I10; E11"
                      value={medHistoryIcd10}
                      onChange={e => setMedHistoryIcd10(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Ghi chú tiền sử bản thân
                    </label>
                    <input
                      type="text"
                      placeholder="Mô tả quá trình điều trị..."
                      value={medHistoryNotes}
                      onChange={e => setMedHistoryNotes(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                    />
                  </div>
                </div>
              )}

              {/* Tiền sử gia đình */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Tiền sử gia đình theo mã ICD-10
                  </label>
                  <input
                    type="text"
                    placeholder="Bệnh lý di truyền (ICD-10)"
                    value={famHistoryIcd10}
                    onChange={e => setFamHistoryIcd10(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Ghi chú tiền sử gia đình
                  </label>
                  <input
                    type="text"
                    placeholder="Bố/Mẹ có bệnh tim mạch, tiểu đường..."
                    value={famHistoryNotes}
                    onChange={e => setFamHistoryNotes(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Tiền sử dịch tễ */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Tiền sử dịch tễ (tiếp xúc người mắc bệnh truyền nhiễm, bệnh lao...)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận thông tin tiếp xúc dịch tễ nếu có..."
                  value={epiHistory}
                  onChange={e => setEpiHistory(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', resize: 'vertical' }}
                />
              </div>

              {/* Dị ứng & Bệnh nền */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Tiền sử dị ứng thuốc & thực phẩm
                  </label>
                  <input
                    type="text"
                    placeholder="Dị ứng Penicillin, Paracetamol, hải sản..."
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Bệnh nền / Bệnh mãn tính
                  </label>
                  <input
                    type="text"
                    placeholder="Hen suyễn, viêm mũi dị ứng..."
                    value={chronicConditions}
                    onChange={e => setChronicConditions(e.target.value)}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                fontSize: '13px',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                border: 'none',
                background: '#0284c7',
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              {saving ? 'Đang lưu...' : memberToEdit ? 'Lưu Thay Đổi' : 'Tạo Hồ Sơ Người Thân'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default FamilyMemberModal
