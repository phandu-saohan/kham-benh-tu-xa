import React, { useState, useEffect } from 'react'
import {
  Settings,
  BarChart3,
  Users,
  ShieldCheck,
  Building2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  PhoneCall,
  Server,
  Key,
  Flame,
  Clock,
  Activity,
  FileText,
  Stethoscope,
  Pill,
  Lock,
  RefreshCw
} from 'lucide-react'
import {
  AdminOverviewData,
  AuditLogItem,
  SystemSettingsData,
  getAdminOverview,
  getAdminAuditLogs,
  getAdminUsers,
  getAdminSettings,
  updateAdminSettings
} from './api'

interface AdminDashboardProps {
  onBack?: () => void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'overview' | 'users' | 'audit'>('settings')
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Overview data
  const [overview, setOverview] = useState<AdminOverviewData | null>(null)

  // Audit logs data
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])

  // Users data
  const [usersList, setUsersList] = useState<any[]>([])

  // Settings form states
  const [settingsForm, setSettingsForm] = useState<SystemSettingsData>({
    hospital_name: 'Bệnh viện Đa khoa Quốc tế CareConnect',
    hospital_code: '79001',
    hospital_address: 'Số 123 Đường Y Dược, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    hospital_hotline: '1900 6868',
    national_prescription_url: 'https://donthuocquocgia.vn',
    smartca_provider: 'VNPT_SmartCA',
    coturn_host: '72.61.123.73',
    coturn_port: 3478,
    coturn_realm: 'telemedicine.careconnect.local',
    sms_provider: 'firebase',
    sms_brandname: 'CARECONNECT',
    allow_test_otp: false,
    firebase_project_id: '',
    firebase_api_key: '',
    firebase_auth_domain: '',
    firebase_app_id: '',
    bank_id: 'MB',
    bank_account_no: '0988888888',
    bank_account_name: 'BENH VIEN CARECONNECT',
    default_max_patients_per_shift: 12,
    consultation_duration_minutes: 20
  })

  // Load data based on active tab
  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'settings') {
        const s = await getAdminSettings()
        setSettingsForm(s)
      } else if (activeTab === 'overview') {
        const o = await getAdminOverview()
        setOverview(o)
      } else if (activeTab === 'users') {
        const u = await getAdminUsers()
        setUsersList(u)
      } else if (activeTab === 'audit') {
        const a = await getAdminAuditLogs(100)
        setAuditLogs(a)
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu quản trị:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const updated = await updateAdminSettings(settingsForm)
      setSettingsForm(updated)
      setToastMessage('✅ Đã lưu và áp dụng cấu hình hệ thống thành công!')
      setTimeout(() => setToastMessage(''), 4000)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể lưu cài đặt')
    } finally {
      setSavingSettings(false)
    }
  }

  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="admin-dashboard-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="admin-toast-alert">
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* Header bar */}
      <div className="admin-header">
        <div>
          <h2>⚙️ Trung tâm Quản trị & Cấu hình Hệ thống (Admin Portal)</h2>
          <p className="tiny muted">
            Quản lý thông số kỹ thuật, hạn ngạch khám, hạ tầng WebRTC, cổng thanh toán và bảo mật toàn viện
          </p>
        </div>

        <button
          type="button"
          className="btn-refresh-admin"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {/* Main Tab Navigation */}
      <div className="admin-nav-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} /> Cài đặt Tham số Hệ thống
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} /> Thống kê & Báo cáo
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Quản lý Nhân sự & Bác sĩ
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <ShieldCheck size={16} /> Nhật ký Kiểm toán Y tế (Audit)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CÀI ĐẶT THAM SỐ HỆ THỐNG (SETTINGS MODULE) */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="settings-module-workspace">
          {/* Card 1: Thông tin CSKCB */}
          <div className="settings-card">
            <div className="card-header">
              <Building2 size={18} className="text-teal" />
              <div>
                <h4>Thông tin Cơ sở Khám chữa bệnh (CSKCB)</h4>
                <p className="tiny muted">Được in trên đơn thuốc điện tử, phiếu khám và ký số</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field col-8">
                <label>Tên Bệnh viện / Phòng khám:</label>
                <input
                  type="text"
                  required
                  value={settingsForm.hospital_name}
                  onChange={e => setSettingsForm({ ...settingsForm, hospital_name: e.target.value })}
                />
              </div>

              <div className="settings-field col-4">
                <label>Mã CSKCB (Bộ Y Tế cấp):</label>
                <input
                  type="text"
                  required
                  value={settingsForm.hospital_code}
                  onChange={e => setSettingsForm({ ...settingsForm, hospital_code: e.target.value })}
                />
              </div>

              <div className="settings-field col-8">
                <label>Địa chỉ trụ sở chính:</label>
                <input
                  type="text"
                  value={settingsForm.hospital_address}
                  onChange={e => setSettingsForm({ ...settingsForm, hospital_address: e.target.value })}
                />
              </div>

              <div className="settings-field col-4">
                <label>Tổng đài Hotline / Cấp cứu:</label>
                <input
                  type="text"
                  value={settingsForm.hospital_hotline}
                  onChange={e => setSettingsForm({ ...settingsForm, hospital_hotline: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Cổng Đơn thuốc Quốc gia & SmartCA */}
          <div className="settings-card">
            <div className="card-header">
              <Pill size={18} className="text-purple" />
              <div>
                <h4>Cổng Đơn thuốc Quốc gia & Ký số SmartCA</h4>
                <p className="tiny muted">Tuân thủ Thông tư 04/2022/TT-BYT và chứng thư số y tế</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field col-6">
                <label>Địa chỉ Cổng Đơn thuốc Quốc gia (BYT):</label>
                <input
                  type="url"
                  value={settingsForm.national_prescription_url}
                  onChange={e => setSettingsForm({ ...settingsForm, national_prescription_url: e.target.value })}
                />
              </div>

              <div className="settings-field col-6">
                <label>Nhà cung cấp Ký số từ xa (SmartCA / Cloud PKI):</label>
                <select
                  value={settingsForm.smartca_provider}
                  onChange={e => setSettingsForm({ ...settingsForm, smartca_provider: e.target.value })}
                >
                  <option value="VNPT_SmartCA">VNPT SmartCA (Tập đoàn VNPT)</option>
                  <option value="Viettel_CA">Viettel-CA Cloud PKI (Tập đoàn Viettel)</option>
                  <option value="BKAV_CA">BKAV eSign Cloud</option>
                  <option value="MOCK_CA">Mock SmartCA (Môi trường Staging)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Hạ tầng WebRTC & Coturn Server */}
          <div className="settings-card">
            <div className="card-header">
              <Server size={18} className="text-blue" />
              <div>
                <h4>Hạ tầng Viễn thông WebRTC & Coturn TURN/STUN</h4>
                <p className="tiny muted">Đảm bảo cuộc gọi Telehealth xuyên tường lửa 4G/5G và mạng bệnh viện</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field col-6">
                <label>Coturn Server IP / Hostname:</label>
                <input
                  type="text"
                  value={settingsForm.coturn_host}
                  onChange={e => setSettingsForm({ ...settingsForm, coturn_host: e.target.value })}
                />
              </div>

              <div className="settings-field col-3">
                <label>Port STUN / TURN:</label>
                <input
                  type="number"
                  value={settingsForm.coturn_port}
                  onChange={e => setSettingsForm({ ...settingsForm, coturn_port: Number(e.target.value) })}
                />
              </div>

              <div className="settings-field col-3">
                <label>Coturn Realm:</label>
                <input
                  type="text"
                  value={settingsForm.coturn_realm}
                  onChange={e => setSettingsForm({ ...settingsForm, coturn_realm: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Cổng SMS & Zalo ZNS OTP */}
          <div className="settings-card">
            <div className="card-header">
              <PhoneCall size={18} className="text-green" />
              <div>
                <h4>Cổng Xác thực OTP & Tin nhắn Thông báo</h4>
                <p className="tiny muted">Gửi mã đăng nhập cho bệnh nhân và thông báo lịch khám</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field col-4">
                <label>Nhà cung cấp Cổng OTP:</label>
                <select
                  value={settingsForm.sms_provider}
                  onChange={e => setSettingsForm({ ...settingsForm, sms_provider: e.target.value })}
                >
                  <option value="firebase">Google Firebase Phone Auth (SMS thật toàn cầu & VN)</option>
                  <option value="esms">eSMS Việt Nam (SMS Brandname)</option>
                  <option value="zalo_zns">Zalo Notification Service (ZNS)</option>
                  <option value="mock">MOCK / Thử nghiệm nội bộ</option>
                </select>
              </div>

              <div className="settings-field col-4">
                <label>Tên định danh SMS Brandname:</label>
                <input
                  type="text"
                  value={settingsForm.sms_brandname}
                  onChange={e => setSettingsForm({ ...settingsForm, sms_brandname: e.target.value })}
                />
              </div>

              <div className="settings-field col-4">
                <label>Chế độ bảo mật OTP (Mã 123456):</label>
                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#059669" />
                  <span className="tiny" style={{ color: '#059669', fontWeight: 700 }}>
                    Đã xóa hoàn toàn mã 123456 (Bắt buộc OTP thật)
                  </span>
                </div>
              </div>

              {settingsForm.sms_provider === 'firebase' && (
                <div className="col-12" style={{ background: '#f0fdf4', padding: '14px', borderRadius: '10px', border: '1px solid #bbf7d0', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <ShieldCheck size={18} color="#15803d" />
                    <strong style={{ color: '#166534', fontSize: '13.5px' }}>Cấu hình Google Firebase Phone Authentication (Gửi SMS OTP Thật)</strong>
                  </div>
                  <p className="tiny" style={{ color: '#166534', margin: '0 0 12px 0' }}>
                    Lấy thông tin từ Firebase Console (Project Settings &gt; General &gt; Your apps &gt; Web App). Hãy chắc chắn mục <b>Authentication &gt; Sign-in method &gt; Phone</b> đã được BẬT.
                  </p>
                  <div className="settings-grid">
                    <div className="settings-field col-3">
                      <label>Firebase Project ID:</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: my-telemedicine-app"
                        value={settingsForm.firebase_project_id || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, firebase_project_id: e.target.value })}
                      />
                    </div>
                    <div className="settings-field col-3">
                      <label>Firebase Web API Key:</label>
                      <input
                        type="password"
                        placeholder="AIzaSy..."
                        value={settingsForm.firebase_api_key || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, firebase_api_key: e.target.value })}
                      />
                    </div>
                    <div className="settings-field col-3">
                      <label>Auth Domain:</label>
                      <input
                        type="text"
                        placeholder="project-id.firebaseapp.com"
                        value={settingsForm.firebase_auth_domain || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, firebase_auth_domain: e.target.value })}
                      />
                    </div>
                    <div className="settings-field col-3">
                      <label>Firebase App ID (tùy chọn):</label>
                      <input
                        type="text"
                        placeholder="1:123456789:web:abcdef..."
                        value={settingsForm.firebase_app_id || ''}
                        onChange={e => setSettingsForm({ ...settingsForm, firebase_app_id: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Cổng Thanh toán VietQR */}
          <div className="settings-card">
            <div className="card-header">
              <CreditCard size={18} className="text-amber" />
              <div>
                <h4>Cổng Thanh toán VietQR & Đối soát Tự động</h4>
                <p className="tiny muted">Tự động sinh mã VietQR Napas 247 và khớp tiền tự động qua Webhook</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field col-4">
                <label>Ngân hàng Thụ hưởng:</label>
                <select
                  value={settingsForm.bank_id}
                  onChange={e => setSettingsForm({ ...settingsForm, bank_id: e.target.value })}
                >
                  <option value="MB">MBBank (Ngân hàng Quân Đội)</option>
                  <option value="VCB">Vietcombank</option>
                  <option value="ICB">VietinBank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="TCB">Techcombank</option>
                  <option value="ACB">ACB</option>
                </select>
              </div>

              <div className="settings-field col-4">
                <label>Số tài khoản Viện phí:</label>
                <input
                  type="text"
                  required
                  value={settingsForm.bank_account_no}
                  onChange={e => setSettingsForm({ ...settingsForm, bank_account_no: e.target.value })}
                />
              </div>

              <div className="settings-field col-4">
                <label>Tên Chủ tài khoản (In hoa):</label>
                <input
                  type="text"
                  required
                  value={settingsForm.bank_account_name}
                  onChange={e => setSettingsForm({ ...settingsForm, bank_account_name: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Card 6: Hạn ngạch & Chống quá tải */}
          <div className="settings-card">
            <div className="card-header">
              <Clock size={18} className="text-red" />
              <div>
                <h4>Hạn ngạch Khám & Cơ chế Chống Quá tải (Anti-Overload)</h4>
                <p className="tiny muted">Kiểm soát số lượng bệnh nhân tối đa trên mỗi ca trực của Bác sĩ</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field col-6">
                <label>Số bệnh nhân tối đa mặc định / Ca trực:</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settingsForm.default_max_patients_per_shift}
                  onChange={e => setSettingsForm({ ...settingsForm, default_max_patients_per_shift: Number(e.target.value) })}
                />
                <small className="tiny muted">Hệ thống tự động khóa ca trực khi đã đủ số lượng đăng ký</small>
              </div>

              <div className="settings-field col-6">
                <label>Thời lượng tư vấn dự kiến / Lượt khám (Phút):</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={settingsForm.consultation_duration_minutes}
                  onChange={e => setSettingsForm({ ...settingsForm, consultation_duration_minutes: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="settings-actions-footer">
            <button
              type="button"
              className="btn-reset-settings"
              onClick={loadData}
              disabled={savingSettings}
            >
              <RotateCcw size={15} /> Khôi phục thiết lập
            </button>

            <button
              type="submit"
              className="primary btn-save-settings"
              disabled={savingSettings}
            >
              <Save size={16} /> {savingSettings ? 'Đang lưu cấu hình...' : 'Lưu tất cả Cài đặt'}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TỔNG QUAN & BÁO CÁO (ANALYTICS) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="admin-overview-workspace">
          {overview && (
            <div className="admin-stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><Activity size={20} /></div>
                <p>Tổng số ca khám</p>
                <strong>{overview.total_appointments}</strong>
                <small>Hoàn tất: {overview.completed_appointments} · Đang chờ: {overview.scheduled_appointments}</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><CreditCard size={20} /></div>
                <p>Doanh thu Viện phí</p>
                <strong>{money(overview.total_revenue)}</strong>
                <small>Đã đối soát thanh toán tự động</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><ShieldCheck size={20} /></div>
                <p>Giám định BHYT</p>
                <strong>{overview.total_bhyt_claims} lượt</strong>
                <small>BHYT chi trả: {money(overview.bhyt_total_discount)}</small>
              </div>

              <div className="stat-card">
                <div className="stat-icon"><Users size={20} /></div>
                <p>Nhân sự & Người dùng</p>
                <strong>{overview.total_patients} BN</strong>
                <small>BS: {overview.total_doctors} · Điều dưỡng: {overview.total_nurses}</small>
              </div>
            </div>
          )}

          <div className="overview-notice-card">
            <h4>🛡️ Tiêu chuẩn Bệnh án Điện tử & Tuân thủ Pháp lý</h4>
            <p className="tiny muted">
              Hệ thống đáp ứng Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân), Thông tư 49/2017/TT-BYT & 54/2017/TT-BYT (Y tế từ xa & CNTT Y tế), ký số SmartCA PKI và đồng bộ Cổng Đơn thuốc Quốc gia Bộ Y tế.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUẢN LÝ NHÂN SỰ & BÁC SĨ */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="admin-users-workspace">
          <div className="users-table-card">
            <div className="card-header">
              <h4>Danh sách Bác sĩ, Điều dưỡng & Người dùng ({usersList.length})</h4>
            </div>

            <div className="table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ và Tên</th>
                    <th>Vai trò</th>
                    <th>Email / SĐT</th>
                    <th>Số CCHN Y tế</th>
                    <th>Mã thẻ BHYT</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td><b>{u.full_name}</b></td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role === 'doctor' ? '👨‍⚕️ Bác sĩ' : u.role === 'nurse' ? '👩‍⚕️ Điều dưỡng' : u.role === 'admin' ? '⚙️ Quản trị' : '🧑 Bệnh nhân'}
                        </span>
                      </td>
                      <td>
                        <div>{u.email}</div>
                        <small className="tiny muted">{u.phone_number || '—'}</small>
                      </td>
                      <td>{u.doctor_cchn || '—'}</td>
                      <td>{u.bhyt_code ? <span className="tag-bhyt">{u.bhyt_code}</span> : '—'}</td>
                      <td>
                        <span className={`status-dot ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? '🟢 Hoạt động' : '🔴 Khóa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NHẬT KÝ KIỂM TOÁN Y TẾ (AUDIT LOGS) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="admin-audit-workspace">
          <div className="audit-table-card">
            <div className="card-header">
              <h4>Nhật ký An toàn Thông tin & Kiểm toán Y tế (Audit Trail)</h4>
              <p className="tiny muted">Ghi nhận minh bạch mọi thao tác kê đơn, ký số, thanh toán và sàng lọc</p>
            </div>

            <div className="table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Vai trò</th>
                    <th>Hành động</th>
                    <th>Tài nguyên</th>
                    <th>Mã đối tượng</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td className="tiny">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                      <td><b>{log.actor_name}</b></td>
                      <td>
                        <span className={`role-badge ${log.actor_role}`}>
                          {log.actor_role}
                        </span>
                      </td>
                      <td><code>{log.action}</code></td>
                      <td>{log.resource_type}</td>
                      <td>#{log.resource_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
