import React, { useState } from 'react'
import {
  UserRound, ShieldCheck, Phone, Mail, Stethoscope, Building2,
  Award, KeyRound, CheckCircle2, Lock, Save, Edit3, Camera,
  Clock, Video, Sparkles, RefreshCw, FileText
} from 'lucide-react'
import { User, getDoctorProfile, updateDoctorProfile } from './api'

interface DoctorProfilePageProps {
  currentUser: User
  onUpdateUser: (updated: User) => void
  onLogout: () => void
}

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({
  currentUser,
  onUpdateUser,
  onLogout
}) => {
  const [fullName, setFullName] = useState(currentUser.full_name || 'BS.CKII Trần Minh')
  const [cchn, setCchn] = useState(currentUser.doctor_cchn || '008912/BYT-CCHN')
  const [specialty, setSpecialty] = useState('Nội Tổng Quát & Tim Mạch Chuyển Hóa')
  const [phone, setPhone] = useState(currentUser.phone_number || '0912 345 678')
  const [email, setEmail] = useState(currentUser.email || 'bs.tranminh@careconnect.vn')
  const [department, setDepartment] = useState('Khoa Nội Tổng Quát & Phòng khám Telemedicine')
  const [room, setRoom] = useState('Phòng 308 - Khu Khám Quốc tế CareConnect')
  const [bio, setBio] = useState('Hơn 15 năm kinh nghiệm trong chẩn đoán và điều trị bệnh lý Tim mạch, Tăng huyết áp, Đái tháo đường và Rối loạn chuyển hóa. Từng tu nghiệp chuyên sâu tại Bệnh viện Chợ Rẫy và ĐH Y Dược TP.HCM.')
  const [consultDuration, setConsultDuration] = useState('30')
  const [maxPatients, setMaxPatients] = useState('12')
  const [autoSign, setAutoSign] = useState(true)
  const [autoSyncPrescription, setAutoSyncPrescription] = useState(true)

  // Password change state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdMessage, setPwdMessage] = useState<string | null>(null)

  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const [savingProfile, setSavingProfile] = useState(false)

  React.useEffect(() => {
    let isMounted = true
    getDoctorProfile()
      .then(prof => {
        if (!isMounted) return
        if (prof.full_name) setFullName(prof.full_name)
        if (prof.doctor_cchn) setCchn(prof.doctor_cchn)
        if (prof.specialty) setSpecialty(prof.specialty)
        if (prof.phone_number) setPhone(prof.phone_number)
        if (prof.email) setEmail(prof.email)
        if (prof.department_name) setDepartment(prof.department_name)
        if (prof.work_room) setRoom(prof.work_room)
        if (prof.bio) setBio(prof.bio)
        if (prof.consult_duration) setConsultDuration(prof.consult_duration.toString())
        if (prof.max_patients_per_shift) setMaxPatients(prof.max_patients_per_shift.toString())
      })
      .catch(err => {
        console.warn('Lấy hồ sơ từ API:', err)
      })
    return () => { isMounted = false }
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updatedProf = await updateDoctorProfile({
        full_name: fullName,
        doctor_cchn: cchn,
        phone_number: phone,
        email,
        specialty,
        bio,
        work_room: room,
        consult_duration: parseInt(consultDuration) || 30,
        max_patients_per_shift: parseInt(maxPatients) || 12
      })
      const updated = {
        ...currentUser,
        full_name: updatedProf.full_name,
        doctor_cchn: updatedProf.doctor_cchn,
        phone_number: updatedProf.phone_number,
        email: updatedProf.email
      }
      onUpdateUser(updated)
      showToast('🎉 Đã lưu và đồng bộ Hồ sơ Bác sĩ vào Database thành công!')
    } catch (err) {
      console.error('Lỗi cập nhật hồ sơ:', err)
      showToast('Lỗi cập nhật: ' + (err instanceof Error ? err.message : 'Không xác định'))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword !== confirmPassword) {
      setPwdMessage('Mật khẩu mới không trùng khớp!')
      return
    }
    setPwdMessage(null)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    showToast('Đã thay đổi mật khẩu tài khoản Bác sĩ an toàn!')
  }

  return (
    <div style={{ padding: '4px 0 30px' }}>
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          {toastMsg}
        </div>
      )}

      {/* Hero Profile Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
        borderRadius: '14px',
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 8px 24px rgba(6, 78, 59, 0.18)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '76px',
            height: '76px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid rgba(255,255,255,0.4)',
            fontSize: '28px',
            fontWeight: 800
          }}>
            👨‍⚕️
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <span style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff', padding: '3px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 700 }}>
                Bác sĩ Chuyên khoa II (BS.CKII)
              </span>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '14px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> Đã xác thực CCHN
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>{fullName}</h2>
            <div style={{ fontSize: '13.5px', opacity: 0.9, marginTop: '4px' }}>
              Số CCHN: <strong>{cchn}</strong> • Khoa: <strong>{department}</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveProfile}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#10b981',
            color: '#ffffff',
            border: 'none',
            padding: '11px 22px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            transition: 'all 0.2s ease'
          }}
        >
          <Save size={18} />
          Lưu thay đổi hồ sơ
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Left Column: Personal info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card: Thông tin hành nghề */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stethoscope size={18} color="#059669" />
              Thông tin Hành nghề & Chuyên môn
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Họ và tên Bác sĩ:
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Số CCHN (Bộ Y tế):
                  </label>
                  <input
                    type="text"
                    value={cchn}
                    onChange={e => setCchn(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Email công vụ bệnh viện:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Chuyên khoa phụ trách:
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Đơn vị & Phòng làm việc:
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Tiểu sử & Kinh nghiệm lâm sàng:
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Card: Cài đặt Phòng khám Telemedicine */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Video size={18} color="#2563eb" />
              Cấu hình Khám Từ Xa & Giới hạn Ca Khám
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Thời lượng khám mỗi ca:
                  </label>
                  <select
                    value={consultDuration}
                    onChange={e => setConsultDuration(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  >
                    <option value="15">15 phút / slot</option>
                    <option value="30">30 phút / slot (Chuẩn)</option>
                    <option value="45">45 phút / slot (Chuyên sâu)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Tối đa ca khám / buổi:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxPatients}
                    onChange={e => setMaxPatients(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  id="chkAutoSign"
                  checked={autoSign}
                  onChange={e => setAutoSign(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chkAutoSign" style={{ fontSize: '13.5px', color: '#1e293b', cursor: 'pointer' }}>
                  Tự động nhắc ký số SmartCA ngay sau khi hoàn tất phiên khám Telemedicine
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="chkAutoPrescription"
                  checked={autoSyncPrescription}
                  onChange={e => setAutoSyncPrescription(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chkAutoPrescription" style={{ fontSize: '13.5px', color: '#1e293b', cursor: 'pointer' }}>
                  Tự động đồng bộ đơn thuốc lên Cổng Đơn thuốc điện tử Quốc gia (donthuocquocgia.vn)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: SmartCA & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Card: Chứng thư số SmartCA */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="#059669" />
              Chứng thư số & Ký số SmartCA / PKI
            </h3>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} color="#16a34a" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#166534' }}>
                    Chứng thư số đang HOẠT ĐỘNG
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d' }}>
                    Hợp lệ theo Thông tư 46/2018/TT-BYT & QĐ 2682/QĐ-BYT
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #bbf7d0', fontSize: '12.5px', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div>• Nhà cung cấp: <strong>VNPT SmartCA (eIDAS Standard)</strong></div>
                <div>• Serial Number: <strong>5402 1892 0089 12TM 2026</strong></div>
                <div>• Thời hạn hiệu lực: <strong>15/01/2024 — 15/01/2027</strong></div>
                <div>• Loại chữ ký: <strong>Chữ ký số cá nhân Bác sĩ chuyên khoa</strong></div>
              </div>
            </div>

            <div style={{ border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '14px', textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '4px' }}>
                Con dấu điện tử & Chữ ký số mẫu
              </div>
              <div style={{ padding: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'inline-block', margin: '4px 0' }}>
                <div style={{ color: '#0369a1', fontWeight: 800, fontSize: '13px' }}>KÝ BỞI: BS.CKII TRẦN MINH</div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Thời gian: 09/11/2026 • CareConnect Hospital</div>
              </div>
            </div>
          </div>

          {/* Card: Đổi mật khẩu & Bảo mật */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#0f766e" />
              Đổi Mật Khẩu & Bảo Mật 2 Lớp
            </h3>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pwdMessage && (
                <div style={{ fontSize: '12.5px', color: '#dc2626', background: '#fef2f2', padding: '8px 12px', borderRadius: '6px' }}>
                  {pwdMessage}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Mật khẩu hiện tại:
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Mật khẩu mới:
                </label>
                <input
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Xác nhận mật khẩu mới:
                </label>
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '6px',
                  padding: '10px',
                  background: '#0f766e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: 'pointer'
                }}
              >
                Cập nhật mật khẩu
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
