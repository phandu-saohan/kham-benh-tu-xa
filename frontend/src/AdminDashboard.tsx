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
  RefreshCw,
  Check,
  X,
  UserCheck,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Sparkles,
  CalendarDays,
  Plus,
  DoorOpen,
  HeartPulse,
  Video,
  AlertTriangle,
  ArrowRight,
  Layers,
  Eye,
  Smartphone,
  Cpu,
  Radio,
  Bell,
  Search,
  Edit,
  Trash2,
  MapPin
} from 'lucide-react'
import {
  AdminOverviewData,
  AuditLogItem,
  SystemSettingsData,
  PermissionsMatrixData,
  getAdminOverview,
  getAdminAuditLogs,
  getAdminUsers,
  adminCreateUser,
  adminDeleteUser,
  getAdminSettings,
  updateAdminSettings, getAIStatus, switchAIMode, type AIStatusInfo,
  getPermissionsMatrix,
  updateUserRole,
  deidentifyRecord,
  updatePermissionsMatrix,
  resetPermissionsMatrix,
  DoctorShift,
  AdminDoctorShiftIn,
  getAllDoctorShifts,
  adminCreateDoctorShift,
  syncHisDoctorShifts,
  deleteDoctorShift,
  ClinicRoom,
  ClinicRoomIn,
  getClinicRooms,
  createClinicRoom,
  updateClinicRoom,
  deleteClinicRoom,
  getDepartments,
  Department
} from './api'
import { NotificationCenter } from './NotificationCenter'
import { Pagination } from './Pagination'

interface AdminDashboardProps {
  onBack?: () => void
  activeTab?: 'settings' | 'overview' | 'users' | 'rbac' | 'audit' | 'schedules' | 'clinics'
  onTabChange?: (tab: 'settings' | 'overview' | 'users' | 'rbac' | 'audit' | 'schedules' | 'clinics') => void
  hideInternalNav?: boolean
}

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
  const [activeTabInternal, setActiveTabInternal] = useState<'settings' | 'overview' | 'users' | 'rbac' | 'audit' | 'schedules' | 'clinics'>('overview')
  const activeTab = props.activeTab || activeTabInternal
  const setActiveTab = (tab: 'settings' | 'overview' | 'users' | 'rbac' | 'audit' | 'schedules' | 'clinics') => {
    setActiveTabInternal(tab)
    if (props.onTabChange) props.onTabChange(tab)
  }

  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [aiEngine, setAiEngine] = useState<AIStatusInfo | null>(null)
  const [switchingAi, setSwitchingAi] = useState(false)

  const [errorMessage, setErrorMessage] = useState('')

  const handleSwitchAiMode = async (targetMode: 'test' | 'production') => {
    setSwitchingAi(true)
    setErrorMessage('')
    try {
      const updated = await switchAIMode(targetMode)
      setAiEngine(updated)
      setToastMessage(targetMode === 'production'
        ? '🟢 Đã chuyển AI Engine sang MedGemma 3 (Chạy thật / Clinical Production) thành công!'
        : '🧪 Đã chuyển AI Engine sang Google Gemini 3.8 (Thử nghiệm / Test Mode) thành công!')
      setTimeout(() => setToastMessage(''), 4000)
    } catch (err: any) {
      setToastMessage('⚠️ Không thể đổi chế độ AI: ' + (err.message || 'Lỗi mạng'))
    } finally {
      setSwitchingAi(false)
    }
  }

  const [toastMessage, setToastMessage] = useState('')

  // Phân công Lịch khám & Buồng khám State
  const [adminShifts, setAdminShifts] = useState<DoctorShift[]>([])
  const [loadingAdminShifts, setLoadingAdminShifts] = useState(false)
  const [syncingHisShifts, setSyncingHisShifts] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignDoctorId, setAssignDoctorId] = useState(2)
  const [assignDate, setAssignDate] = useState(() => new Date().toISOString().split('T')[0])
  const [assignShiftType, setAssignShiftType] = useState('morning')
  const [assignRoomName, setAssignRoomName] = useState('Phòng khám Telemedicine #01 (Khoa Nội)')
  const [assignMaxPatients, setAssignMaxPatients] = useState(12)
  const [assignNotes, setAssignNotes] = useState('Phân công từ Ban Quản trị Bệnh viện')

  // Quản lý Phòng khám (Clinic Rooms CRUD) State
  const [clinicRooms, setClinicRooms] = useState<ClinicRoom[]>([])
  const [departmentsList, setDepartmentsList] = useState<Department[]>([])
  const [loadingClinics, setLoadingClinics] = useState(false)
  const [clinicSearch, setClinicSearch] = useState('')
  const [clinicFilterDept, setClinicFilterDept] = useState<string>('all')
  const [clinicFilterType, setClinicFilterType] = useState<string>('all')
  const [clinicFilterStatus, setClinicFilterStatus] = useState<string>('all')
  const [showClinicModal, setShowClinicModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<ClinicRoom | null>(null)
  const [savingClinic, setSavingClinic] = useState(false)
  const [clinicForm, setClinicForm] = useState<ClinicRoomIn>({
    room_code: '',
    name: '',
    department_id: null,
    room_type: 'telemedicine',
    location: '',
    doctor_in_charge_id: null,
    capacity_per_shift: 15,
    telehealth_station_enabled: true,
    equipment_list: '',
    status: 'active',
    notes: ''
  })

  const loadClinicRoomsData = async () => {
    try {
      setLoadingClinics(true)
      const [rooms, depts, users] = await Promise.all([
        getClinicRooms(),
        getDepartments().catch(() => []),
        getAdminUsers().catch(() => [])
      ])
      setClinicRooms(rooms || [])
      if (depts && depts.length > 0) setDepartmentsList(depts)
      if (users && users.length > 0) setUsersList(users)
      if (rooms && rooms.length > 0 && !assignRoomName) {
        setAssignRoomName(rooms[0].name)
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách phòng khám:', err)
    } finally {
      setLoadingClinics(false)
    }
  }

  const handleOpenCreateClinic = () => {
    setEditingRoom(null)
    const nextIdx = clinicRooms.length + 1
    setClinicForm({
      room_code: `PK-TELE-0${nextIdx}`,
      name: '',
      department_id: departmentsList[0]?.id || null,
      room_type: 'telemedicine',
      location: 'Tầng 3 - Trung tâm Khám từ xa',
      doctor_in_charge_id: null,
      capacity_per_shift: 15,
      telehealth_station_enabled: true,
      equipment_list: 'LiveKit Video Station 4K, Ống nghe số, Monitor sinh hiệu 5 thông số',
      status: 'active',
      notes: ''
    })
    setShowClinicModal(true)
  }

  const handleOpenEditClinic = (room: ClinicRoom) => {
    setEditingRoom(room)
    setClinicForm({
      room_code: room.room_code,
      name: room.name,
      department_id: room.department_id,
      room_type: room.room_type || 'telemedicine',
      location: room.location || '',
      doctor_in_charge_id: room.doctor_in_charge_id,
      capacity_per_shift: room.capacity_per_shift || 15,
      telehealth_station_enabled: room.telehealth_station_enabled,
      equipment_list: room.equipment_list || '',
      status: room.status || 'active',
      notes: room.notes || ''
    })
    setShowClinicModal(true)
  }

  const handleSaveClinicRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clinicForm.room_code.trim() || !clinicForm.name.trim()) {
      alert('Vui lòng nhập đầy đủ Mã phòng khám và Tên phòng khám!')
      return
    }
    try {
      setSavingClinic(true)
      if (editingRoom) {
        await updateClinicRoom(editingRoom.id, clinicForm)
        setToastMessage(`✅ Đã cập nhật thông tin phòng khám [${clinicForm.room_code}] thành công!`)
      } else {
        await createClinicRoom(clinicForm)
        setToastMessage(`🎉 Đã tạo mới phòng khám [${clinicForm.room_code} - ${clinicForm.name}] thành công!`)
      }
      setTimeout(() => setToastMessage(''), 4000)
      setShowClinicModal(false)
      await loadClinicRoomsData()
    } catch (err: any) {
      alert(err.message || 'Không thể lưu thông tin phòng khám')
    } finally {
      setSavingClinic(false)
    }
  }

  const handleToggleClinicStatus = async (room: ClinicRoom) => {
    const nextStatus = room.status === 'active' ? 'maintenance' : 'active'
    try {
      await updateClinicRoom(room.id, { status: nextStatus })
      setToastMessage(
        nextStatus === 'active'
          ? `🟢 Đã mở hoạt động phòng khám ${room.room_code}`
          : `🟠 Đã chuyển phòng khám ${room.room_code} sang chế độ Bảo trì / Tạm ngưng`
      )
      setTimeout(() => setToastMessage(''), 3500)
      await loadClinicRoomsData()
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật trạng thái phòng khám')
    }
  }

  const handleDeleteClinicRoom = async (room: ClinicRoom) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa phòng khám "${room.name}" (${room.room_code}) khỏi hệ thống?`)) return
    try {
      const res = await deleteClinicRoom(room.id)
      setToastMessage(`🗑️ ${res.message || 'Đã xóa phòng khám thành công'}`)
      setTimeout(() => setToastMessage(''), 3500)
      await loadClinicRoomsData()
    } catch (err: any) {
      alert(err.message || 'Không thể xóa phòng khám')
    }
  }

  const loadAdminShifts = async () => {
    try {
      setLoadingAdminShifts(true)
      const [data, rooms, users] = await Promise.all([
        getAllDoctorShifts(),
        getClinicRooms().catch(() => []),
        getAdminUsers().catch(() => [])
      ])
      setAdminShifts(data || [])
      if (rooms && rooms.length > 0) setClinicRooms(rooms)
      if (users && users.length > 0) setUsersList(users)
    } catch (err) {
      console.warn('Lỗi tải danh sách phân công lịch khám:', err)
    } finally {
      setLoadingAdminShifts(false)
    }
  }

  const handleAdminSyncHis = async () => {
    try {
      setSyncingHisShifts(true)
      const res = await syncHisDoctorShifts()
      if (res?.success) {
        setToastMessage(`🏥 ${res.message}`)
        setTimeout(() => setToastMessage(''), 4000)
        const refreshed = await getAllDoctorShifts()
        setAdminShifts(refreshed || [])
      }
    } catch (err: any) {
      setToastMessage('⚠️ Lỗi đồng bộ từ HIS: ' + (err.message || 'Lỗi mạng'))
      setTimeout(() => setToastMessage(''), 4000)
    } finally {
      setSyncingHisShifts(false)
    }
  }

  const handleAdminCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminCreateDoctorShift({
        doctor_id: assignDoctorId,
        shift_date: assignDate,
        shift_type: assignShiftType,
        room_name: assignRoomName,
        max_patients: assignMaxPatients,
        notes: assignNotes
      })
      setShowAssignModal(false)
      setToastMessage('🎉 Đã phân công ca khám và buồng khám cho Bác sĩ thành công!')
      setTimeout(() => setToastMessage(''), 4000)
      loadAdminShifts()
    } catch (err: any) {
      setToastMessage('⚠️ Lỗi phân công: ' + (err.message || 'Lỗi mạng'))
      setTimeout(() => setToastMessage(''), 4000)
    }
  }

  const handleAdminDeleteShift = async (shiftId: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy phân công ca khám này?')) return
    try {
      await deleteDoctorShift(shiftId)
      setToastMessage('Đã hủy phân công ca khám thành công')
      setTimeout(() => setToastMessage(''), 3000)
      loadAdminShifts()
    } catch (err: any) {
      setToastMessage('Lỗi hủy ca: ' + (err.message || ''))
      setTimeout(() => setToastMessage(''), 3000)
    }
  }

  useEffect(() => {
    if (activeTab === 'schedules') {
      loadAdminShifts()
    } else if (activeTab === 'clinics') {
      loadClinicRoomsData()
    }
  }, [activeTab])

  // Overview data
  const [overview, setOverview] = useState<AdminOverviewData | null>(null)

  // Audit logs data & Pagination
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [auditPage, setAuditPage] = useState(1)
  const [auditPageSize, setAuditPageSize] = useState(10)

  // Users data & Pagination
  const [usersList, setUsersList] = useState<any[]>([])
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null)
  const [usersPage, setUsersPage] = useState(1)
  const [usersPageSize, setUsersPageSize] = useState(10)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('all')
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [createUserData, setCreateUserData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    role: 'doctor',
    password: 'Password123!',
    doctor_cchn: '',
    bhyt_code: '',
    specialty: 'Nội Tổng Quát'
  })
  const [creatingUser, setCreatingUser] = useState(false)

  // RBAC Matrix data & Interactive Editor
  const [matrixData, setMatrixData] = useState<PermissionsMatrixData | null>(null)
  const [editableRoles, setEditableRoles] = useState<Record<string, any>>({})
  const [savingRbac, setSavingRbac] = useState(false)
  const [rbacChanged, setRbacChanged] = useState(false)

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
    gemini_api_key: '',
    bank_id: 'MB',
    bank_account_no: '0988888888',
    bank_account_name: 'BENH VIEN CARECONNECT',
    default_max_patients_per_shift: 12,
    consultation_duration_minutes: 20
  })

  // De-identification sandbox state (Nghị định 13/2023/NĐ-CP)
  const [deidInput, setDeidInput] = useState('')
  const [deidOutput, setDeidOutput] = useState<any>(null)
  const [deidLoading, setDeidLoading] = useState(false)

  const handleDeidentify = async () => {
    if (!deidInput.trim()) return
    try {
      setDeidLoading(true)
      const res = await deidentifyRecord(deidInput)
      setDeidOutput(res)
    } catch (err: any) {
      alert(err.message || 'Lỗi khử định danh')
    } finally {
      setDeidLoading(false)
    }
  }

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
        try { const ai = await getAIStatus(); setAiEngine(ai); } catch (e) { console.warn(e); }
      } else if (activeTab === 'overview') {
        const o = await getAdminOverview()
        setOverview(o)
        try { const ai = await getAIStatus(); setAiEngine(ai); } catch (e) { console.warn(e); }
        try {
          const [shifts, rooms] = await Promise.all([
            getAllDoctorShifts().catch(() => []),
            getClinicRooms().catch(() => [])
          ])
          setAdminShifts(shifts || [])
          setClinicRooms(rooms || [])
        } catch (e) { console.warn(e); }
      } else if (activeTab === 'clinics') {
        await loadClinicRoomsData()
      } else if (activeTab === 'users') {
        const u = await getAdminUsers()
        setUsersList(u)
      } else if (activeTab === 'rbac') {
        const m = await getPermissionsMatrix()
        setMatrixData(m)
        if (m && m.roles) {
          setEditableRoles(JSON.parse(JSON.stringify(m.roles)))
          setRbacChanged(false)
        }
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

  const handleUpdateRole = async (userId: number, newRole: string) => {
    setUpdatingUserId(userId)
    try {
      const res = await updateUserRole(userId, { role: newRole })
      setToastMessage(`✅ ${res.message}`)
      setTimeout(() => setToastMessage(''), 4000)
      const u = await getAdminUsers()
      setUsersList(u)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể cập nhật phân quyền')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createUserData.full_name.trim() || !createUserData.email.trim()) {
      alert('Vui lòng nhập đầy đủ Họ Tên và Email!')
      return
    }
    setCreatingUser(true)
    try {
      const res = await adminCreateUser(createUserData)
      setToastMessage(`✅ ${res.message}`)
      setTimeout(() => setToastMessage(''), 4000)
      setShowCreateUserModal(false)
      setCreateUserData({
        full_name: '',
        email: '',
        phone_number: '',
        role: 'doctor',
        password: 'Password123!',
        doctor_cchn: '',
        bhyt_code: '',
        specialty: 'Nội Tổng Quát'
      })
      const u = await getAdminUsers()
      setUsersList(u)
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo cán bộ / người dùng')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`Xác nhận xóa hoặc vô hiệu hóa tài khoản "${userName}" (#${userId}) khỏi hệ thống?`)) return
    try {
      const res = await adminDeleteUser(userId)
      setToastMessage(`✅ ${res.message}`)
      setTimeout(() => setToastMessage(''), 4000)
      const u = await getAdminUsers()
      setUsersList(u)
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa người dùng')
    }
  }

  const handleToggleUserStatus = async (userId: number, currentActive: boolean) => {
    setUpdatingUserId(userId)
    try {
      const userObj = usersList.find(u => u.id === userId)
      if (!userObj) return
      const res = await updateUserRole(userId, { role: userObj.role, is_active: !currentActive })
      setToastMessage(`✅ ${!currentActive ? 'Đã kích hoạt tài khoản' : 'Đã khóa tài khoản'} #${userId}`)
      setTimeout(() => setToastMessage(''), 4000)
      const u = await getAdminUsers()
      setUsersList(u)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể thay đổi trạng thái tài khoản')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleTogglePermission = (role: string, permCode: string) => {
    setEditableRoles((prev) => {
      const next = { ...prev }
      const currentRole = next[role] || { permissions: [] }
      const perms: string[] = [...(currentRole.permissions || [])]
      const idx = perms.indexOf(permCode)
      if (idx >= 0) {
        perms.splice(idx, 1)
      } else {
        perms.push(permCode)
      }
      next[role] = { ...currentRole, permissions: perms }
      return next
    })
    setRbacChanged(true)
  }

  const handleSaveRbac = async () => {
    setSavingRbac(true)
    try {
      const payload: Record<string, string[]> = {}
      for (const [r, obj] of Object.entries(editableRoles)) {
        payload[r] = (obj as any).permissions || []
      }
      const res = await updatePermissionsMatrix(payload)
      setMatrixData(res)
      if (res && res.roles) {
        setEditableRoles(JSON.parse(JSON.stringify(res.roles)))
      }
      setRbacChanged(false)
      setToastMessage('✅ Đã lưu và áp dụng Ma trận Phân quyền mới thành công!')
      setTimeout(() => setToastMessage(''), 4000)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể lưu ma trận phân quyền')
    } finally {
      setSavingRbac(false)
    }
  }

  const handleResetRbac = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn khôi phục Ma trận Phân quyền về giá trị mặc định của hệ thống?')) return
    setSavingRbac(true)
    try {
      const res = await resetPermissionsMatrix()
      setMatrixData(res)
      if (res && res.roles) {
        setEditableRoles(JSON.parse(JSON.stringify(res.roles)))
      }
      setRbacChanged(false)
      setToastMessage('✅ Đã khôi phục Ma trận Phân quyền về mặc định thành công!')
      setTimeout(() => setToastMessage(''), 4000)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Không thể khôi phục mặc định')
    } finally {
      setSavingRbac(false)
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

  const filteredUsers = usersList.filter(u => {
    const term = userSearch.trim().toLowerCase()
    const matchesSearch = !term ||
      (u.full_name && u.full_name.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.phone_number && u.phone_number.includes(term)) ||
      (u.doctor_cchn && u.doctor_cchn.toLowerCase().includes(term)) ||
      (u.bhyt_code && u.bhyt_code.toLowerCase().includes(term))
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter
    return matchesSearch && matchesRole
  })

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <NotificationCenter userRole="admin" />
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
      </div>

      {/* Main Tab Navigation (Ẩn khi thanh điều hướng bên ngoài Sidebar đã phụ trách để tránh trùng lặp) */}
      {!props.hideInternalNav && (
        <div className="admin-nav-tabs">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={16} /> Trung tâm Điều hành Toàn viện
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'clinics' ? 'active' : ''}`}
            onClick={() => setActiveTab('clinics')}
          >
            <Building2 size={16} /> Quản lý Buồng & Phòng khám
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'schedules' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedules')}
          >
            <CalendarDays size={16} /> Phân công Lịch & Buồng khám
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} /> Quản lý Nhân sự Y tế
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'rbac' ? 'active' : ''}`}
            onClick={() => setActiveTab('rbac')}
          >
            <SlidersHorizontal size={16} /> Ma trận Phân quyền & RBAC
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <ShieldCheck size={16} /> Nhật ký Kiểm toán (Audit)
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} /> Cài đặt Tham số & Cổng HIS
          </button>
        </div>
      )}

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

                    {/* Card 7: Bộ Trí tuệ Nhân tạo Y tế (CareConnect Medical AI Suite) & Quản lý Dual AI Engine */}
          <div className="settings-card">
            <div className="card-header">
              <Sparkles size={18} className="text-teal" />
              <div>
                <h4>Bộ Trí tuệ Nhân tạo Y tế (Medical AI Suite) & Quản lý Phân luồng AI Engine</h4>
                <p className="tiny muted">Chỉ Quản trị viên mới có quyền chuyển đổi giữa Google MedGemma 3 (Chạy thật) và Gemini 3.8 (Test)</p>
              </div>
            </div>

            <div className="settings-grid">
              {/* Dual Engine Switcher Block - Dành riêng cho Quản trị viên */}
              <div className="col-12" style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: aiEngine?.mode === 'production' ? '#10b981' : '#f59e0b', boxShadow: aiEngine?.mode === 'production' ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }} />
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      Mô hình AI Hiện hành: {aiEngine?.model_display || (aiEngine?.mode === 'production' ? 'MedGemma 3 (Chạy thật)' : 'Gemini 3.8 (Test)')}
                    </strong>
                  </div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '14px', background: aiEngine?.mode === 'production' ? '#ecfdf5' : '#fffbeb', color: aiEngine?.mode === 'production' ? '#065f46' : '#b45309', border: aiEngine?.mode === 'production' ? '1px solid #a7f3d0' : '1px solid #fde68a' }}>
                    {aiEngine?.mode === 'production' ? '🟢 CHẠY THẬT (CLINICAL PRODUCTION)' : '🧪 THỬ NGHIỆM (TEST ENGINE)'}
                  </span>
                </div>

                <p className="tiny muted" style={{ margin: '0 0 14px', lineHeight: 1.5 }}>
                  {aiEngine?.description || 'Hệ thống định tuyến AI kép: Google Gemini 3.8 phục vụ phát triển, kiểm thử kịch bản lâm sàng; Google MedGemma 3 chuyên sâu cho chẩn đoán y tế, tóm tắt SOAP và Dược thư Quốc gia.'}
                </p>

                {/* 2 Thẻ Lựa chọn Phân luồng AI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {/* Option 1: MedGemma 3 Production */}
                  <div style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: aiEngine?.mode === 'production' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: aiEngine?.mode === 'production' ? '#f0fdf4' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: aiEngine?.mode === 'production' ? '0 2px 8px rgba(5, 150, 105, 0.15)' : 'none'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#065f46' }}>
                          🟢 MedGemma 3 (Chạy thật / Production)
                        </span>
                        {aiEngine?.mode === 'production' && (
                          <span style={{ fontSize: '11px', background: '#059669', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Đang kích hoạt</span>
                        )}
                      </div>
                      <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>
                        Mô hình Google MedGemma 3 (27B) chuyên sâu y khoa lâm sàng, chuẩn hóa theo Dược thư Quốc gia Việt Nam, Quyết định 130/QĐ-BYT và Luật KCB 2023.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={switchingAi || aiEngine?.mode === 'production'}
                      onClick={() => handleSwitchAiMode('production')}
                      style={{
                        background: aiEngine?.mode === 'production' ? '#d1fae5' : '#059669',
                        color: aiEngine?.mode === 'production' ? '#065f46' : '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '9px 14px',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: aiEngine?.mode === 'production' ? 'default' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {switchingAi ? 'Đang chuyển đổi...' : aiEngine?.mode === 'production' ? '✓ Đang chạy thật' : '⚡ Kích hoạt MedGemma 3 Chạy thật'}
                    </button>
                  </div>

                  {/* Option 2: Gemini 3.8 Test */}
                  <div style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: aiEngine?.mode === 'test' ? '2px solid #d97706' : '1px solid #cbd5e1',
                    background: aiEngine?.mode === 'test' ? '#fffbeb' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: aiEngine?.mode === 'test' ? '0 2px 8px rgba(217, 119, 6, 0.15)' : 'none'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#92400e' }}>
                          🧪 Gemini 3.8 (Thử nghiệm / Test Mode)
                        </span>
                        {aiEngine?.mode === 'test' && (
                          <span style={{ fontSize: '11px', background: '#d97706', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Đang kích hoạt</span>
                        )}
                      </div>
                      <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>
                        Mô hình Google Gemini 3.8 Flash đa phương thức thế hệ mới, tối ưu cho nhà phát triển kiểm thử prompt, thử nghiệm các ca bệnh giả lập và tính năng mới.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={switchingAi || aiEngine?.mode === 'test'}
                      onClick={() => handleSwitchAiMode('test')}
                      style={{
                        background: aiEngine?.mode === 'test' ? '#fef3c7' : '#d97706',
                        color: aiEngine?.mode === 'test' ? '#92400e' : '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '9px 14px',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: aiEngine?.mode === 'test' ? 'default' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {switchingAi ? 'Đang chuyển đổi...' : aiEngine?.mode === 'test' ? '✓ Đang ở chế độ Test' : '🧪 Chuyển sang Gemini 3.8 Test'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-field col-12">
                <label>Google Gemini API Key (Dùng cho Gemini 3.8 Test & Vision OCR CCCD/BHYT):</label>
                <input
                  type="password"
                  placeholder="AIzaSy... (Nếu để trống, hệ thống tự động chạy Bộ quy chuẩn Y khoa Chuyên sâu)"
                  value={settingsForm.gemini_api_key || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, gemini_api_key: e.target.value })}
                />
                <small className="tiny muted" style={{ display: 'block', marginTop: '4px' }}>
                  Khóa API này cung cấp khả năng đa phương thức (Vision OCR đọc CCCD/BHYT, Ambient Scribe nghe hội thoại và Gợi ý ICD-10).
                </small>
              </div>

              {/* De-identification Sandbox Tool */}
              <div className="col-12" style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>🛡️ Công cụ Thử nghiệm Khử định danh Y tế (De-identification Sandbox)</strong>
                  <span style={{ fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    Tuân thủ Nghị định 13/2023/NĐ-CP
                  </span>
                </div>
                <p className="tiny muted" style={{ margin: '0 0 8px' }}>
                  Bóc tách và che mờ tự động các trường thông tin nhận dạng cá nhân (PII: Họ tên, SĐT, Số CCCD, Mã BHYT, Địa chỉ chi tiết) trước khi chia sẻ dữ liệu hội chẩn hoặc nghiên cứu:
                </p>
                <textarea
                  rows={3}
                  value={deidInput}
                  onChange={e => setDeidInput(e.target.value)}
                  style={{ width: '100%', fontSize: '12px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '8px', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={handleDeidentify}
                    disabled={deidLoading}
                    style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {deidLoading ? 'Đang khử định danh...' : '⚡ Khử định danh bằng AI'}
                  </button>
                </div>

                {deidOutput && (
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #99f6e4', fontSize: '12px' }}>
                    <b style={{ color: '#0f766e' }}>Kết quả đã khử định danh an toàn (Đã ẩn {deidOutput.detected_pii_count} thông tin nhạy cảm: {deidOutput.pii_types_found.join(', ')}):</b>
                    <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#334155' }}>{deidOutput.sanitized_text}</pre>
                  </div>
                )}
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
      {/* TAB 1: TRUNG TÂM ĐIỀU HÀNH & GIÁM SÁT Y TẾ TOÀN VIỆN (COMMAND CENTER)    */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="admin-overview-workspace hospital-command-center">
          {/* 1. Executive Operations Header Banner */}
          <div className="command-header-banner">
            <div className="command-banner-top">
              <div className="command-banner-title-area">
                <div className="command-banner-icon">
                  <Activity size={28} />
                </div>
                <div className="command-banner-title">
                  <h2>
                    TRUNG TÂM ĐIỀU HÀNH & GIÁM SÁT Y TẾ TOÀN VIỆN
                    <span className="command-live-pulse-badge">
                      <span className="pulse-dot-green"></span>
                      HỆ THỐNG TRỰC TUYẾN 24/7
                    </span>
                  </h2>
                  <p>
                    Điều phối và giám sát hợp nhất 3 phân hệ lâm sàng: <strong>Cổng Bệnh nhân (Patient Portal)</strong> · <strong>Bàn Sàng lọc Triage (Nurse Desk)</strong> · <strong>Buồng khám Telemedicine & AI MedGemma 3 (Doctor Workspace)</strong>.
                  </p>
                </div>
              </div>

              {/* Actions & AI Router Switcher */}
              <div className="command-banner-actions">
                {/* AI Dual-Engine Status & 1-Click Router */}
                <div className="command-ai-router-box">
                  <Cpu size={20} className={aiEngine?.mode === 'production' ? 'text-emerald-400' : 'text-amber-400'} />
                  <div className="command-ai-status-label">
                    <span className="small-label">Mô hình AI Lâm sàng</span>
                    {aiEngine?.mode === 'production' ? (
                      <strong className="prod-ai">🟢 MedGemma 3 (Chạy thật)</strong>
                    ) : (
                      <strong className="test-ai">🧪 Gemini 3.8 (Thử nghiệm)</strong>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-command-switch-ai"
                    disabled={switchingAi}
                    onClick={() => handleSwitchAiMode(aiEngine?.mode === 'production' ? 'test' : 'production')}
                    title="Chuyển đổi Engine AI tức thì cho toàn viện"
                  >
                    {switchingAi ? (
                      <><RefreshCw size={12} className="spin" /> Đang chuyển...</>
                    ) : aiEngine?.mode === 'production' ? (
                      <>🧪 Đổi sang Gemini 3.8</>
                    ) : (
                      <>🟢 Đổi sang MedGemma 3</>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-command-refresh"
                  onClick={() => loadData()}
                  title="Cập nhật dữ liệu thời gian thực"
                >
                  <RefreshCw size={14} className={loading ? 'spin' : ''} /> Làm mới
                </button>
              </div>
            </div>

            {/* Gateway connectivity status bar */}
            <div className="command-gateways-bar">
              <div className="command-gateway-chip">
                <span className="chip-dot"></span>
                <span>WebRTC E2EE: P2P Kích hoạt (RTT 24ms · 0% Drop)</span>
              </div>
              <div className="command-gateway-chip">
                <span className="chip-dot"></span>
                <span>Cổng HIS/EMR: Kết nối HL7 FHIR & XML 4210</span>
              </div>
              <div className="command-gateway-chip">
                <span className="chip-dot"></span>
                <span>Định danh Dân cư: CCCD & VNeID Mức 2</span>
              </div>
              <div className="command-gateway-chip">
                <span className="chip-dot"></span>
                <span>Ký số Y tế: SmartCA PKI & Đơn thuốc Quốc gia Sẵn sàng</span>
              </div>
            </div>
          </div>

          {/* 2. Executive Hospital KPI Grid (4 Cards) */}
          {overview && (
            <div className="command-kpi-grid">
              <div className="command-kpi-card">
                <div className="command-kpi-top">
                  <div className="command-kpi-icon blue">
                    <Activity size={22} />
                  </div>
                  <span className="command-kpi-badge info">Thời gian thực</span>
                </div>
                <div className="command-kpi-main">
                  <p>Lượt tiếp nhận & Khám bệnh</p>
                  <strong>{overview.total_appointments} lượt</strong>
                </div>
                <div className="command-kpi-meta">
                  🟢 Hoàn tất: <strong>{overview.completed_appointments}</strong> · 🟡 Đang chờ: <strong>{overview.scheduled_appointments}</strong> ca
                </div>
              </div>

              <div className="command-kpi-card">
                <div className="command-kpi-top">
                  <div className="command-kpi-icon emerald">
                    <CreditCard size={22} />
                  </div>
                  <span className="command-kpi-badge success">VietQR Tự động</span>
                </div>
                <div className="command-kpi-main">
                  <p>Doanh thu Viện phí</p>
                  <strong>{money(overview.total_revenue)}</strong>
                </div>
                <div className="command-kpi-meta">
                  100% đối soát tự động qua mã VietQR chuẩn NAPAS 247
                </div>
              </div>

              <div className="command-kpi-card">
                <div className="command-kpi-top">
                  <div className="command-kpi-icon purple">
                    <ShieldCheck size={22} />
                  </div>
                  <span className="command-kpi-badge success">XML 4210</span>
                </div>
                <div className="command-kpi-main">
                  <p>Giám định BHYT Quốc gia</p>
                  <strong>{overview.total_bhyt_claims} hồ sơ</strong>
                </div>
                <div className="command-kpi-meta">
                  BHYT thanh toán: <strong>{money(overview.bhyt_total_discount)}</strong> (Tỷ lệ duyệt 99.4%)
                </div>
              </div>

              <div className="command-kpi-card">
                <div className="command-kpi-top">
                  <div className="command-kpi-icon amber">
                    <Users size={22} />
                  </div>
                  <span className="command-kpi-badge info">Trực ban</span>
                </div>
                <div className="command-kpi-main">
                  <p>Lực lượng Y tế & Bệnh nhân</p>
                  <strong>{overview.total_patients} BN</strong>
                </div>
                <div className="command-kpi-meta">
                  👨‍⚕️ Bác sĩ: <strong>{overview.total_doctors}</strong> · 🩺 Điều dưỡng: <strong>{overview.total_nurses}</strong>
                </div>
              </div>
            </div>
          )}

          {/* 3. Visual End-to-End Hospital Pipeline Flow */}
          <div className="command-pipeline-card">
            <div className="command-pipeline-header">
              <h3>
                <Layers size={18} className="text-teal-600" /> Quy trình Liên thông Khép kín Toàn viện
              </h3>
              <span className="text-xs text-slate-500 font-medium">Chuẩn liên thông Bộ Y tế (Thông tư 49 & 54/2017)</span>
            </div>
            <div className="command-pipeline-steps">
              <div className="command-step-card">
                <div className="command-step-num">
                  <span>Bước 01</span>
                  <Smartphone size={14} />
                </div>
                <div className="command-step-title">
                  <span>1. Cổng Bệnh nhân</span>
                </div>
                <p className="command-step-desc">
                  Đặt khám online, xác thực CCCD / VNeID mức 2, thanh toán VietQR động và vào phòng chờ ảo.
                </p>
              </div>

              <div className="command-step-card">
                <div className="command-step-num">
                  <span>Bước 02</span>
                  <HeartPulse size={14} />
                </div>
                <div className="command-step-title">
                  <span>2. Sàng lọc Triage</span>
                </div>
                <p className="command-step-desc">
                  Điều dưỡng phân loại ESI 1-4, thu nhận sinh hiệu RPM IoT (Omron BLE, Accu-Chek, SpO2) & cảnh báo NEWS2.
                </p>
              </div>

              <div className="command-step-card">
                <div className="command-step-num">
                  <span>Bước 03</span>
                  <Stethoscope size={14} />
                </div>
                <div className="command-step-title">
                  <span>3. Telemed & AI Lâm sàng</span>
                </div>
                <p className="command-step-desc">
                  Khám trực tuyến WebRTC, AI Scribe tạo bệnh án SOAP QĐ 130 và AI MedGemma 3 đọc phim PACS.
                </p>
              </div>

              <div className="command-step-card">
                <div className="command-step-num">
                  <span>Bước 04</span>
                  <ShieldCheck size={14} />
                </div>
                <div className="command-step-title">
                  <span>4. Ký số & Lưu trữ EMR</span>
                </div>
                <p className="command-step-desc">
                  Bác sĩ ký số SmartCA PKI, đồng bộ Cổng Đơn thuốc Quốc gia và gửi trả EMR, LIS, PACS về cho bệnh nhân.
                </p>
              </div>
            </div>
          </div>

          {/* 4. The 3 Core Subsystem Command Panels (3 Columns) */}
          <div className="command-subsystems-grid">
            {/* COLUMN 1: PHÂN HỆ BỆNH NHÂN (PATIENT PORTAL & RECEPTION) */}
            <div className="command-subsystem-panel">
              <div className="subsystem-panel-header">
                <div className="subsystem-header-left">
                  <div className="subsystem-header-icon patient">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3>1. Phân hệ Bệnh nhân</h3>
                    <span>Tiếp nhận & Phòng chờ ảo</span>
                  </div>
                </div>
                <span className="subsystem-status-pill online">
                  <span className="chip-dot"></span> Đang mở
                </span>
              </div>

              <div className="subsystem-panel-body">
                {/* Metrics */}
                <div className="subsystem-metrics-row">
                  <div className="subsystem-mini-metric">
                    <span>Đặt trực tuyến</span>
                    <strong>{overview?.online_booking_rate ?? 100}%</strong>
                  </div>
                  <div className="subsystem-mini-metric">
                    <span>VNeID Cấp 2</span>
                    <strong>{overview?.vneid_verified_rate ?? 100}%</strong>
                  </div>
                  <div className="subsystem-mini-metric">
                    <span>VietQR NAPAS</span>
                    <strong>{overview?.vietqr_payment_rate ?? 100}%</strong>
                  </div>
                </div>

                {/* Live Waiting Queue */}
                <div>
                  <div className="subsystem-section-title">
                    <span>Hàng đợi phòng chờ ảo (Live Queue)</span>
                    <span className="text-xs font-semibold text-teal-600">
                      {overview?.scheduled_appointments || 0} ca đang chờ
                    </span>
                  </div>
                  <div className="command-queue-list">
                    {overview?.recent_appointments && overview.recent_appointments.length > 0 ? (
                      overview.recent_appointments.map((appt) => (
                        <div className="command-queue-item" key={appt.id}>
                          <div className="queue-patient-info">
                            <div className="queue-avatar">
                              {appt.patient_name ? appt.patient_name.split(' ').pop()?.slice(0, 2).toUpperCase() : 'BN'}
                            </div>
                            <div className="queue-name-meta">
                              <strong>
                                {appt.patient_name} <small style={{ color: '#0284c7', fontSize: '11px' }}>#{appt.id}</small>
                              </strong>
                              <span>{appt.reason} · {appt.doctor_name}</span>
                            </div>
                          </div>
                          <div className="queue-badges" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="badge-vneid-tag" style={{
                              background: appt.status === 'completed' ? '#ecfdf5' : appt.status === 'in_progress' ? '#eff6ff' : '#fef9c3',
                              color: appt.status === 'completed' ? '#047857' : appt.status === 'in_progress' ? '#1d4ed8' : '#b45309',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              {appt.status === 'completed' ? '🟢 Hoàn tất' : appt.status === 'in_progress' ? '🔵 Đang khám' : '🟡 Chờ khám'}
                            </span>
                            {appt.has_vneid && <span className="badge-vneid-tag">VNeID</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 text-center">Chưa có lượt hẹn khám nào trong hệ thống</div>
                    )}
                  </div>
                </div>

                {/* Patient Access features */}
                <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <ShieldCheck size={14} className="text-teal-600" /> Trả kết quả tự động về Portal:
                  </div>
                  <div>• Đơn thuốc điện tử & Mã QR tra cứu Cổng BYT</div>
                  <div>• Bệnh án điện tử PDF ký số PKI & Ảnh PACS DICOM</div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: PHÂN HỆ ĐIỀU DƯỠNG (NURSE DESK & TRIAGE & RPM) */}
            <div className="command-subsystem-panel">
              <div className="subsystem-panel-header">
                <div className="subsystem-header-left">
                  <div className="subsystem-header-icon nurse">
                    <HeartPulse size={20} />
                  </div>
                  <div>
                    <h3>2. Phân hệ Điều dưỡng</h3>
                    <span>Sàng lọc Triage & Giám sát RPM</span>
                  </div>
                </div>
                <span className="subsystem-status-pill online">
                  <span className="chip-dot"></span> 4 Bàn trực
                </span>
              </div>

              <div className="subsystem-panel-body">
                {/* ESI Distribution */}
                <div>
                  <div className="subsystem-section-title">
                    <span>Phân luồng Cấp cứu ESI</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {overview?.triage_distribution?.total ?? overview?.total_appointments ?? 0} ca ghi nhận
                    </span>
                  </div>
                  <div className="esi-distribution-bar">
                    <div className="esi-level-row esi-red">
                      <span>🔴 P1 - Đỏ (Hồi sức cấp cứu / ESI 1)</span>
                      <strong>{overview?.triage_distribution?.p1 ?? 0} ca ({overview?.triage_distribution?.p1_percent ?? 0}%)</strong>
                    </div>
                    <div className="esi-level-row esi-yellow">
                      <span>🟡 P2 - Vàng (Nguy kịch / Cảnh báo - ESI 2)</span>
                      <strong>{overview?.triage_distribution?.p2 ?? 0} ca ({overview?.triage_distribution?.p2_percent ?? 0}%)</strong>
                    </div>
                    <div className="esi-level-row esi-green">
                      <span>🟢 P3 - Xanh (Tiêu chuẩn / Ổn định - ESI 3-4)</span>
                      <strong>{overview?.triage_distribution?.p3 ?? 0} ca ({overview?.triage_distribution?.p3_percent ?? 0}%)</strong>
                    </div>
                    <div className="esi-level-row esi-white">
                      <span>⚪ P4 - Trắng (Không khẩn / ESI 5)</span>
                      <strong>{overview?.triage_distribution?.p4 ?? 0} ca ({overview?.triage_distribution?.p4_percent ?? 0}%)</strong>
                    </div>
                  </div>
                </div>

                {/* Live RPM IoT Ingestion Feed */}
                <div>
                  <div className="subsystem-section-title">
                    <span>Thu nhận Sinh hiệu RPM IoT</span>
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <Radio size={12} className="spin" /> BLE Active
                    </span>
                  </div>
                  <div className="rpm-devices-grid">
                    {overview?.latest_rpm_vitals && overview.latest_rpm_vitals.length > 0 ? (
                      overview.latest_rpm_vitals.map((v) => (
                        <div className="rpm-device-chip" key={v.id}>
                          <div className="rpm-chip-header">
                            <span title={v.device_name}>{v.device_name.slice(0, 18)}</span>
                            <span className={v.is_warning ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                              {v.is_warning ? "Cảnh báo" : (v.connection_method === 'bluetooth_ble' ? 'BLE' : 'IoT Live')}
                            </span>
                          </div>
                          <div className="rpm-chip-val">
                            {v.blood_pressure ? (
                              <>{v.blood_pressure} <small>mmHg</small></>
                            ) : v.glucose_value ? (
                              <>{v.glucose_value} <small>mmol/L</small></>
                            ) : v.spo2 ? (
                              <>{v.spo2}% <small>SpO2</small></>
                            ) : v.temperature_celsius ? (
                              <>{v.temperature_celsius} <small>°C</small></>
                            ) : (
                              <>{v.pulse || '--'} <small>bpm</small></>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {v.patient_name} {v.measured_at ? `· ${v.measured_at}` : ''}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-500 p-2 col-span-2 text-center">Chưa có bản ghi sinh hiệu IoT</div>
                    )}
                  </div>
                </div>

                {/* NEWS2 Alert Notification */}
                <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Cảnh báo sớm NEWS2 & IoT:</strong> Kết nối liên tục với hệ thống thiết bị y tế qua chuẩn BLE/HL7. {overview?.latest_rpm_vitals?.some(v => v.is_warning) ? 'Phát hiện chỉ số bất thường đã được gắn cờ ưu tiên chuyển Bác sĩ xử trí.' : 'Toàn bộ dữ liệu sinh hiệu thu nhận nằm trong ngưỡng an toàn.'}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 3: PHÂN HỆ BÁC SĨ (DOCTOR WORKSPACE & CLINICAL AI) */}
            <div className="command-subsystem-panel">
              <div className="subsystem-panel-header">
                <div className="subsystem-header-left">
                  <div className="subsystem-header-icon doctor">
                    <Stethoscope size={20} />
                  </div>
                  <div>
                    <h3>3. Phân hệ Bác sĩ</h3>
                    <span>Buồng khám Telemed & AI Lâm sàng</span>
                  </div>
                </div>
                <span className="subsystem-status-pill online">
                  <span className="chip-dot"></span> {clinicRooms.filter(r => r.status === 'active').length} Buồng trực
                </span>
              </div>

              <div className="subsystem-panel-body">
                {/* Live Telemed Rooms */}
                <div>
                  <div className="subsystem-section-title">
                    <span>Giám sát Buồng khám & Phòng khám</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {clinicRooms.filter(r => r.status === 'active').length}/{clinicRooms.length} buồng hoạt động
                    </span>
                  </div>
                  <div className="doctor-rooms-list">
                    {clinicRooms.slice(0, 4).map((room) => (
                      <div className="doctor-room-card" key={room.id}>
                        <div className="room-card-top">
                          <div className="room-title-area">
                            <strong>[{room.room_code}] {room.name}</strong>
                            <span>{room.department_name || 'Đa chuyên khoa'} · Phụ trách: {room.doctor_in_charge_name || 'Chưa phân công'}</span>
                          </div>
                          <span className={`room-status-badge ${room.status === 'active' ? 'live' : 'waiting'}`}>
                            {room.status === 'active' ? '🟢 Sẵn sàng' : '🟠 Bảo trì'}
                          </span>
                        </div>
                        <div className="room-telemed-signals">
                          <Video size={13} className="text-teal-600" />
                          <span>{room.location || 'Khu khám từ xa'} · Công suất: {room.capacity_per_shift} BN/ca</span>
                        </div>
                        <div className="room-ai-action">
                          <Sparkles size={12} /> {room.equipment_list || 'Trang bị Trạm Telehealth & AI CDSS'}
                        </div>
                      </div>
                    ))}
                    {clinicRooms.length === 0 && (
                      <div className="text-xs text-slate-500 p-3 text-center">
                        Chưa có buồng khám nào được cấu hình. Vui lòng thêm tại mục Quản lý Phòng khám.
                      </div>
                    )}
                  </div>
                </div>

                {/* AI & SmartCA Summary */}
                <div className="text-xs text-purple-900 bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="font-semibold mb-1 flex items-center gap-1 text-purple-800">
                    <Sparkles size={14} /> Tự động hóa Lâm sàng Toàn viện:
                  </div>
                  <div>• <strong>AI Scribe:</strong> {overview?.soap_completed_count ?? 0} biên bản SOAP sinh chuẩn QĐ 130/BYT</div>
                  <div>• <strong>AI MedGemma 3 PACS:</strong> Phân tích tổn thương X-quang/CT độ nhạy cao</div>
                  <div>• <strong>Ký số SmartCA PKI:</strong> {overview?.smartca_signed_count ?? 0} đơn thuốc số hóa & liên thông Bộ Y tế</div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Legal & Regulatory Compliance Notice */}
          <div className="command-regulatory-footer">
            <ShieldCheck size={26} className="text-teal-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Tuân thủ Tiêu chuẩn Bệnh án Điện tử (EMR) & An toàn Dữ liệu Y tế Quốc gia</strong>
              <p>
                Hệ thống đáp ứng nghiêm ngặt <strong>Nghị định 13/2023/NĐ-CP</strong> (Bảo vệ dữ liệu cá nhân & Khử định danh y tế), <strong>Thông tư 49/2017/TT-BYT & 54/2017/TT-BYT</strong> (Quy định Y tế từ xa & Tiêu chí CNTT Bệnh viện), tích hợp Ký số y tế <strong>SmartCA PKI</strong> và đồng bộ dữ liệu thời gian thực lên <strong>Cổng Đơn thuốc Quốc gia Bộ Y tế</strong> & Cổng Giám định BHYT (Chuẩn XML 4210 / HL7 FHIR).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN (USERS & ROLES) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="admin-users-workspace">
          <div className="users-table-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Danh sách Cán bộ Y tế & Người dùng ({usersList.length})
                </h4>
                <p className="tiny muted" style={{ margin: '4px 0 0 0' }}>
                  Quản lý định danh y tế, phân bổ vai trò bác sĩ, điều dưỡng, bệnh nhân và trạng thái tài khoản
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#0d9488',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(13, 148, 136, 0.3)'
                  }}
                >
                  <Plus size={15} /> Thêm Cán Bộ / Người Dùng Mới
                </button>
                <button
                  type="button"
                  className="btn-refresh-admin"
                  onClick={() => setActiveTab('rbac')}
                  style={{ fontSize: '12px', padding: '7px 12px' }}
                >
                  <SlidersHorizontal size={14} /> Xem Ma trận Quyền hạn (RBAC)
                </button>
              </div>
            </div>

            {/* Search and Filters Toolbar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '360px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      setUsersPage(1)
                    }}
                    placeholder="Tìm theo tên, email, SĐT, CCHN, BHYT..."
                    style={{
                      width: '100%',
                      padding: '7px 12px 7px 32px',
                      borderRadius: '7px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                </div>
                {userSearch && (
                  <button
                    type="button"
                    onClick={() => setUserSearch('')}
                    style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Xóa tìm kiếm
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Lọc vai trò:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => {
                    setUserRoleFilter(e.target.value)
                    setUsersPage(1)
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '7px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    background: '#ffffff',
                    fontWeight: 600
                  }}
                >
                  <option value="all">Tất cả vai trò ({usersList.length})</option>
                  <option value="doctor">👨‍⚕️ Bác sĩ ({usersList.filter(u => u.role === 'doctor').length})</option>
                  <option value="nurse">👩‍⚕️ Điều dưỡng ({usersList.filter(u => u.role === 'nurse').length})</option>
                  <option value="admin">⚙️ Quản trị viên ({usersList.filter(u => u.role === 'admin').length})</option>
                  <option value="patient">🧑 Bệnh nhân ({usersList.filter(u => u.role === 'patient').length})</option>
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ và Tên</th>
                    <th>Vai trò hiện tại</th>
                    <th>Email / SĐT</th>
                    <th>Số CCHN Y tế</th>
                    <th>Mã thẻ BHYT</th>
                    <th>Trạng thái</th>
                    <th>Đổi phân quyền</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice((usersPage - 1) * usersPageSize, usersPage * usersPageSize).map(u => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        <b>{u.full_name}</b>
                        {u.role === 'admin' && <span style={{ marginLeft: 6, fontSize: 10, background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>ADMIN</span>}
                      </td>
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
                        <button
                          type="button"
                          className={`status-toggle-btn ${u.is_active ? 'active' : 'inactive'}`}
                          onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                          disabled={updatingUserId === u.id}
                          title={u.is_active ? 'Bấm để khóa tài khoản' : 'Bấm để mở khóa'}
                          style={{
                            border: 'none',
                            background: u.is_active ? '#ecfdf5' : '#fef2f2',
                            color: u.is_active ? '#065f46' : '#991b1b',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600
                          }}
                        >
                          {u.is_active ? '🟢 Hoạt động' : '🔴 Bị khóa'}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            disabled={updatingUserId === u.id}
                            style={{
                              fontSize: 12,
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #cbd5e1',
                              background: '#fff',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="patient">🧑 Bệnh nhân</option>
                            <option value="doctor">👨‍⚕️ Bác sĩ</option>
                            <option value="nurse">👩‍⚕️ Điều dưỡng</option>
                            <option value="admin">⚙️ Quản trị viên</option>
                          </select>
                          {updatingUserId === u.id && <RefreshCw size={13} className="spin" />}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.full_name)}
                          disabled={updatingUserId === u.id}
                          title="Xóa hoặc vô hiệu hóa tài khoản"
                          style={{
                            border: '1px solid #fecaca',
                            background: '#fef2f2',
                            color: '#b91c1c',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                        Không tìm thấy người dùng hoặc cán bộ y tế nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={usersPage}
              totalItems={filteredUsers.length}
              pageSize={usersPageSize}
              onPageChange={setUsersPage}
              onPageSizeChange={setUsersPageSize}
              pageSizeOptions={[5, 10, 20, 50]}
            />
          </div>

          {/* Modal Tạo Người Dùng / Cán Bộ Mới */}
          {showCreateUserModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '540px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '18px 22px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="#0d9488" />
                    <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a' }}>
                      Thêm Mới Cán Bộ Y Tế / Người Dùng
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Họ và Tên <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={createUserData.full_name}
                        onChange={(e) => setCreateUserData({ ...createUserData, full_name: e.target.value })}
                        placeholder="VD: BS.CKII Nguyễn Văn An"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Email đăng nhập <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={createUserData.email}
                        onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
                        placeholder="bacsi@medicalcenter.vn"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={createUserData.phone_number}
                        onChange={(e) => setCreateUserData({ ...createUserData, phone_number: e.target.value })}
                        placeholder="0912345678"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Vai trò hệ thống <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <select
                        value={createUserData.role}
                        onChange={(e) => setCreateUserData({ ...createUserData, role: e.target.value })}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', background: '#fff' }}
                      >
                        <option value="doctor">👨‍⚕️ Bác sĩ điều trị</option>
                        <option value="nurse">👩‍⚕️ Điều dưỡng tiếp đón</option>
                        <option value="admin">⚙️ Quản trị viên hệ thống</option>
                        <option value="patient">🧑 Bệnh nhân</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                        Mật khẩu khởi tạo
                      </label>
                      <input
                        type="text"
                        value={createUserData.password}
                        onChange={(e) => setCreateUserData({ ...createUserData, password: e.target.value })}
                        placeholder="Password123!"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>

                    {createUserData.role === 'doctor' && (
                      <>
                        <div>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                            Số CCHN Y tế (BYT)
                          </label>
                          <input
                            type="text"
                            value={createUserData.doctor_cchn}
                            onChange={(e) => setCreateUserData({ ...createUserData, doctor_cchn: e.target.value })}
                            placeholder="012345/BYT-CCHN"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                            Chuyên khoa phụ trách
                          </label>
                          <input
                            type="text"
                            value={createUserData.specialty}
                            onChange={(e) => setCreateUserData({ ...createUserData, specialty: e.target.value })}
                            placeholder="Khoa Nội Tổng Quát"
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                          />
                        </div>
                      </>
                    )}

                    {createUserData.role === 'patient' && (
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '5px' }}>
                          Mã thẻ BHYT (nếu có)
                        </label>
                        <input
                          type="text"
                          value={createUserData.bhyt_code}
                          onChange={(e) => setCreateUserData({ ...createUserData, bhyt_code: e.target.value })}
                          placeholder="GD4790123456789"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={creatingUser}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#0d9488',
                        color: '#ffffff',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: creatingUser ? 'wait' : 'pointer'
                      }}
                    >
                      {creatingUser ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                      {creatingUser ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MA TRẬN PHÂN QUYỀN HỆ THỐNG (RBAC PERMISSIONS MATRIX) */}
      {/* ========================================================================= */}
      {activeTab === 'rbac' && (
        <div className="admin-rbac-workspace">
          {/* Role Cards Overview */}
          <div className="rbac-role-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
            <div className="rbac-role-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🧑 Bệnh nhân (Patient)
                </span>
                <span style={{ background: '#16a34a', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                  7 Quyền
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>
                Đặt lịch khám, vào buồng video, tra cứu bệnh án, xem đơn thuốc, tra cứu CLS / PACS & thanh toán VietQR.
              </p>
            </div>

            <div className="rbac-role-card" style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 6 }}>
                  👨‍⚕️ Bác sĩ (Doctor)
                </span>
                <span style={{ background: '#2563eb', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                  9 Quyền
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>
                Phòng khám DoctorWorkspace, WebRTC, chẩn đoán ICD-10, ký số SmartCA, đẩy đơn thuốc quốc gia & đọc phim PACS.
              </p>
            </div>

            <div className="rbac-role-card" style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  👩‍⚕️ Điều dưỡng (Nurse)
                </span>
                <span style={{ background: '#9333ea', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                  5 Quyền
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>
                Bàn tiếp đón TriageDesk, đo chỉ số sinh tồn (vitals), giám định BHYT trực tuyến và phân luồng vào phòng bác sĩ.
              </p>
            </div>

            <div className="rbac-role-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚙️ Quản trị viên (Admin)
                </span>
                <span style={{ background: '#d97706', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
                  Toàn quyền
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#374151', margin: 0 }}>
                Quản lý nhân sự, phân bổ vai trò RBAC, cấu hình WebRTC COTURN, cổng đơn thuốc, VietQR và kiểm toán NĐ 13.
              </p>
            </div>
          </div>

          {/* Detailed Permissions Matrix Table */}
          <div className="users-table-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h4>🛡️ Chỉnh sửa Ma trận Phân quyền Vai trò (System RBAC Matrix)</h4>
                <p className="tiny muted">
                  Bật/tắt trực tiếp quyền hạn cho từng vai trò trong hệ thống. Thay đổi có hiệu lực tức thì sau khi bấm Lưu.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  className="btn-refresh-admin"
                  onClick={handleResetRbac}
                  disabled={savingRbac}
                  style={{ fontSize: 12, padding: '7px 14px', color: '#64748b' }}
                >
                  <RotateCcw size={14} /> Khôi phục Mặc định
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveRbac}
                  disabled={savingRbac || !rbacChanged}
                  style={{
                    fontSize: 12,
                    padding: '7px 16px',
                    background: rbacChanged ? '#0f766e' : '#94a3b8',
                    cursor: rbacChanged ? 'pointer' : 'default'
                  }}
                >
                  <Save size={14} /> {savingRbac ? 'Đang lưu...' : 'Lưu Thay đổi Ma trận'}
                </button>
              </div>
            </div>

            {rbacChanged && (
              <div style={{ background: '#fef3c7', color: '#92400e', padding: '10px 16px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={16} /> Bạn có các quyền hạn vừa điều chỉnh chưa được lưu. Hãy bấm nút "Lưu Thay đổi Ma trận" để cập nhật cho toàn viện.
              </div>
            )}

            <div className="table-responsive">
              <table className="admin-data-table rbac-matrix-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Phân hệ / Module</th>
                    <th style={{ width: '22%' }}>Chức năng / Quyền hạn</th>
                    <th style={{ width: '28%' }}>Mô tả chi tiết tác vụ</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Bệnh nhân</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Bác sĩ</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Điều dưỡng</th>
                    <th style={{ width: '8%', textAlign: 'center' }}>Quản trị</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixData && matrixData.permissions ? (
                    matrixData.permissions.map((p) => {
                      const rolesObj = editableRoles && Object.keys(editableRoles).length > 0 ? editableRoles : (matrixData.roles || {})
                      const patientHas = rolesObj.patient?.permissions?.includes(p.code)
                      const doctorHas = rolesObj.doctor?.permissions?.includes(p.code)
                      const nurseHas = rolesObj.nurse?.permissions?.includes(p.code)
                      const adminHas = rolesObj.admin?.permissions?.includes(p.code)

                      return (
                        <tr key={p.code}>
                          <td>
                            <span style={{ fontWeight: 600, color: '#0f766e', fontSize: 12 }}>
                              {p.module}
                            </span>
                          </td>
                          <td>
                            <b>{p.name}</b>
                            <div><code style={{ fontSize: 10, color: '#64748b' }}>{p.code}</code></div>
                          </td>
                          <td style={{ fontSize: 12, color: '#475569' }}>
                            {p.description}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`rbac-perm-toggle ${patientHas ? 'enabled' : 'disabled'}`}
                              onClick={() => handleTogglePermission('patient', p.code)}
                              title={`Bấm để ${patientHas ? 'tước quyền' : 'cấp quyền'} [${p.name}] cho Bệnh nhân`}
                            >
                              {patientHas ? '✓' : '—'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`rbac-perm-toggle ${doctorHas ? 'enabled' : 'disabled'}`}
                              onClick={() => handleTogglePermission('doctor', p.code)}
                              title={`Bấm để ${doctorHas ? 'tước quyền' : 'cấp quyền'} [${p.name}] cho Bác sĩ`}
                            >
                              {doctorHas ? '✓' : '—'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`rbac-perm-toggle ${nurseHas ? 'enabled' : 'disabled'}`}
                              onClick={() => handleTogglePermission('nurse', p.code)}
                              title={`Bấm để ${nurseHas ? 'tước quyền' : 'cấp quyền'} [${p.name}] cho Điều dưỡng`}
                            >
                              {nurseHas ? '✓' : '—'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={`rbac-perm-toggle ${adminHas ? 'enabled' : 'disabled'}`}
                              onClick={() => handleTogglePermission('admin', p.code)}
                              title={`Bấm để ${adminHas ? 'tước quyền' : 'cấp quyền'} [${p.name}] cho Quản trị viên`}
                            >
                              {adminHas ? '✓' : '—'}
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                        Đang tải dữ liệu ma trận phân quyền...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overview-notice-card" style={{ marginTop: 20 }}>
            <h4>🛡️ Tuân thủ Nguyên tắc Đặc quyền Tối thiểu (Principle of Least Privilege - PoLP)</h4>
            <p className="tiny muted">
              Mỗi vai trò trong hệ thống CareConnect chỉ được cấp quyền hạn tương ứng đúng với phạm vi chuyên môn được Bộ Y Tế và CSKCB giao phó. Mọi thao tác truy cập dữ liệu nhạy cảm của người bệnh đều được ghi nhận vào Nhật ký kiểm toán y tế (Audit Log) theo Nghị định 13/2023/NĐ-CP và không thể chỉnh sửa.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: NHẬT KÝ KIỂM TOÁN Y TẾ (AUDIT LOGS) */}
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
                  {auditLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize).map(log => (
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

            <Pagination
              currentPage={auditPage}
              totalItems={auditLogs.length}
              pageSize={auditPageSize}
              onPageChange={setAuditPage}
              onPageSizeChange={setAuditPageSize}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </div>
      )}
      {/* ========================================================================= */}
      {/* TAB 6: PHÂN CÔNG LỊCH KHÁM & PHÒNG KHÁM (QUẢN TRỊ & ĐỒNG BỘ HIS) */}
      {/* ========================================================================= */}
      {activeTab === 'schedules' && (
        <div className="admin-module-section">
          {/* Header Action Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
            borderRadius: '16px',
            padding: '24px 28px',
            color: '#ffffff',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(6, 78, 59, 0.16)'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.18)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                <CalendarDays size={14} />
                ĐIỀU PHỐI TẬP TRUNG TOÀN VIỆN
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
                Phân Công Thời Gian Khám & Buồng Khám Bác Sĩ
              </h2>
              <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '13.5px' }}>
                Tạo lịch phân công ca khám & buồng khám cho Bác sĩ hoặc đồng bộ tự động thời gian thực từ API của Hệ thống Quản trị Bệnh viện (HIS/EMR).
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleAdminSyncHis}
                disabled={syncingHisShifts}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: syncingHisShifts ? 'wait' : 'pointer'
                }}
                title="Đồng bộ lịch phân công ca & phòng từ HIS"
              >
                <RefreshCw size={15} className={syncingHisShifts ? 'spin-icon' : ''} />
                <span>{syncingHisShifts ? 'Đang đồng bộ HIS...' : 'Đồng bộ từ API HIS'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAssignModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Plus size={16} />
                Phân công Ca khám & Phòng khám
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Tổng ca phân công tuần này</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {adminShifts.length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>ca trực</span>
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Buồng khám Telemed hoạt động</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                {clinicRooms.filter(r => r.status === 'active').length} buồng <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>khám E2EE</span>
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Nguồn phân công</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
                100% HIS API & BQT
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Cơ chế chống quá tải BYT</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                🟢 Đạt chuẩn (Max 12-15 BN)
              </div>
            </div>
          </div>

          {/* Table of Doctor Shifts */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Danh Sách Phân Công Ca Trực & Buồng Khám Toàn Viện
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                Hiển thị {adminShifts.length} phân công
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Bác sĩ phụ trách</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Chuyên khoa</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Ngày khám</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Ca trực & Khung giờ</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Phòng khám được phân công</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Nguồn phân công</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Định mức (BYT)</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {adminShifts.map((s, idx) => {
                    const isHis = s.notes && s.notes.includes('HIS')
                    return (
                      <tr key={s.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                          {s.doctor_name || usersList.find(u => u.id === s.doctor_id)?.full_name || 'Bác sĩ trực'}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#475569' }}>
                          {s.department_name || (departmentsList.find(d => d.id === s.department_id)?.name || 'Khoa Nội')}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                          {s.shift_date}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <strong>{s.shift_type === 'morning' ? '☀️ Ca Sáng' : s.shift_type === 'afternoon' ? '🌤️ Ca Chiều' : '🌙 Ca Tối'}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {s.start_time || '07:30'} - {s.end_time || '11:30'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a' }}>
                            <DoorOpen size={14} color="#059669" />
                            {s.room_name || clinicRooms.find(r => r.id === s.clinic_room_id)?.name || 'Phòng khám Telemed'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isHis ? '#e0f2fe' : '#fef3c7',
                            color: isHis ? '#0369a1' : '#b45309'
                          }}>
                            {isHis ? '🏥 HIS API' : '🛡️ Ban Quản trị'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <strong>{s.booked_count ?? 0}</strong>/{s.max_patients} BN
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleAdminDeleteShift(s.id)}
                            style={{
                              background: '#fee2e2',
                              color: '#b91c1c',
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            Hủy
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {adminShifts.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                        Chưa có ca trực nào được phân công. Nhấn <strong>"+ Phân công Ca khám & Phòng khám"</strong> hoặc <strong>"Đồng bộ từ API HIS"</strong> để khởi tạo lịch trực.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Phân công Ca khám mới */}
          {showAssignModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '520px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
                  color: '#ffffff',
                  padding: '18px 22px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                    Phân Công Ca Khám & Buồng Khám Mới
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleAdminCreateShift} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Bác sĩ phân công:
                    </label>
                    <select
                      value={assignDoctorId}
                      onChange={e => setAssignDoctorId(Number(e.target.value))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                    >
                      {usersList.filter(u => u.role === 'doctor').length > 0 ? (
                        usersList.filter(u => u.role === 'doctor').map(doc => (
                          <option key={doc.id} value={doc.id}>
                            {doc.full_name} ({doc.email})
                          </option>
                        ))
                      ) : (
                        <option value={2}>BS. CKII Trần Minh (Khoa Nội Tổng Quát)</option>
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Ngày khám:
                      </label>
                      <input
                        type="date"
                        value={assignDate}
                        onChange={e => setAssignDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Ca khám:
                      </label>
                      <select
                        value={assignShiftType}
                        onChange={e => setAssignShiftType(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      >
                        <option value="morning">Ca Sáng (07:30 - 11:30)</option>
                        <option value="afternoon">Ca Chiều (13:30 - 17:00)</option>
                        <option value="evening">Ca Tối (17:30 - 20:30)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Phòng khám phân công:
                    </label>
                    <select
                      value={assignRoomName}
                      onChange={e => setAssignRoomName(e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                    >
                      {clinicRooms.length > 0 ? (
                        clinicRooms.map(r => (
                          <option key={r.id} value={r.name}>
                            [{r.room_code}] {r.name} ({r.department_name || 'Đa khoa'})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Phòng khám Telemedicine #01 (Khoa Nội)">Phòng khám Telemedicine #01 (Khoa Nội)</option>
                          <option value="Phòng khám Telemedicine #02 (Khoa Tim Mạch)">Phòng khám Telemedicine #02 (Khoa Tim Mạch)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Định mức tối đa (BN):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={assignMaxPatients}
                        onChange={e => setAssignMaxPatients(Number(e.target.value))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Ghi chú phân công:
                      </label>
                      <input
                        type="text"
                        value={assignNotes}
                        onChange={e => setAssignNotes(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: '#059669', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Lưu phân công
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: QUẢN LÝ BUỒNG & PHÒNG KHÁM (CLINIC ROOMS CRUD) */}
      {/* ========================================================================= */}
      {activeTab === 'clinics' && (
        <div className="admin-module-section">
          {/* Header Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 65%, #0d9488 100%)',
            borderRadius: '16px',
            padding: '24px 28px',
            color: '#ffffff',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 8px 24px rgba(15, 118, 110, 0.18)'
          }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.16)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                <Building2 size={14} />
                DANH MỤC HẠ TẦNG KHÁM CHỮA BỆNH TOÀN VIỆN
              </div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>
                Quản Lý Buồng Khám & Phòng Khám (CRUD)
              </h2>
              <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '13.5px' }}>
                Thiết lập danh mục buồng khám Telemedicine, phòng khám chuyên khoa ngoại trú, bàn tiếp đón Triage và cấu hình thiết bị kết nối.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={loadClinicRoomsData}
                disabled={loadingClinics}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} className={loadingClinics ? 'spin' : ''} />
                Làm mới danh sách
              </button>

              <button
                type="button"
                onClick={handleOpenCreateClinic}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Plus size={16} />
                Thêm Phòng Khám Mới
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Tổng số buồng / phòng khám</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {clinicRooms.length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>phòng</span>
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Phòng có Trạm Telehealth E2EE</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0d9488', marginTop: '4px' }}>
                {clinicRooms.filter(r => r.telehealth_station_enabled).length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>trạm trực tuyến</span>
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Trạng thái vận hành</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
                {clinicRooms.filter(r => r.status === 'active').length}/{clinicRooms.length} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>đang mở</span>
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Tổng định mức tiếp nhận / ca</div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                {clinicRooms.filter(r => r.status === 'active').reduce((acc, r) => acc + (r.capacity_per_shift || 0), 0)} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>bệnh nhân/ca</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            marginBottom: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ position: 'relative', flex: '1 1 280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm theo mã phòng, tên buồng khám, vị trí hoặc thiết bị..."
                value={clinicSearch}
                onChange={e => setClinicSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={clinicFilterDept}
                onChange={e => setClinicFilterDept(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="all">Tất cả Chuyên khoa</option>
                {departmentsList.map(d => (
                  <option key={d.id} value={String(d.id)}>{d.name}</option>
                ))}
              </select>

              <select
                value={clinicFilterType}
                onChange={e => setClinicFilterType(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="all">Tất cả Loại phòng</option>
                <option value="telemedicine">Khám từ xa (Telemedicine)</option>
                <option value="outpatient">Khám ngoại trú (Outpatient)</option>
                <option value="emergency">Tiếp đón Triage / Cấp cứu</option>
                <option value="paraclinical">Cận lâm sàng & PACS</option>
              </select>

              <select
                value={clinicFilterStatus}
                onChange={e => setClinicFilterStatus(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
              >
                <option value="all">Tất cả Trạng thái</option>
                <option value="active">🟢 Đang hoạt động</option>
                <option value="maintenance">🟠 Đang bảo trì</option>
                <option value="inactive">⚪ Tạm đóng</option>
              </select>
            </div>
          </div>

          {/* Clinic Rooms Table */}
          <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Mã phòng</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Tên buồng / phòng khám & Vị trí</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Chuyên khoa</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Loại phòng & Telemed</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Bác sĩ phụ trách</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Định mức/Ca</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Trang thiết bị y tế</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700 }}>Trạng thái</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {clinicRooms
                    .filter(r => {
                      const q = clinicSearch.trim().toLowerCase()
                      if (q) {
                        const matchCode = r.room_code?.toLowerCase().includes(q)
                        const matchName = r.name?.toLowerCase().includes(q)
                        const matchLoc = (r.location || '').toLowerCase().includes(q)
                        const matchEq = (r.equipment_list || '').toLowerCase().includes(q)
                        if (!matchCode && !matchName && !matchLoc && !matchEq) return false
                      }
                      if (clinicFilterDept !== 'all' && String(r.department_id) !== clinicFilterDept) return false
                      if (clinicFilterType !== 'all' && r.room_type !== clinicFilterType) return false
                      if (clinicFilterStatus !== 'all' && r.status !== clinicFilterStatus) return false
                      return true
                    })
                    .map(room => (
                      <tr key={room.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <code style={{
                            background: '#f0fdfa',
                            color: '#0f766e',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '12px',
                            border: '1px solid #99f6e4'
                          }}>
                            {room.room_code}
                          </code>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>{room.name}</div>
                          {room.location && (
                            <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <MapPin size={12} /> {room.location}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#334155' }}>
                          {room.department_name || 'Đa chuyên khoa'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px' }}>
                            {room.room_type === 'telemedicine'
                              ? '📹 Khám từ xa (Telemed)'
                              : room.room_type === 'outpatient'
                              ? '🏥 Ngoại trú lâm sàng'
                              : room.room_type === 'emergency'
                              ? '🚨 Sàng lọc Triage / Cấp cứu'
                              : '🔬 Cận lâm sàng & PACS'}
                          </div>
                          {room.telehealth_station_enabled && (
                            <span style={{ fontSize: '10.5px', color: '#0d9488', fontWeight: 700 }}>
                              ✓ Trạm Video WebRTC 4K
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#334155' }}>
                          {room.doctor_in_charge_name || <span style={{ color: '#94a3b8' }}>Chưa gán cố định</span>}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                          {room.capacity_per_shift} BN/ca
                        </td>
                        <td style={{ padding: '12px 14px', maxWidth: '240px', fontSize: '11.5px', color: '#475569' }}>
                          {room.equipment_list || '—'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleClinicStatus(room)}
                            title="Bấm để chuyển đổi trạng thái hoạt động / bảo trì"
                            style={{
                              border: 'none',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: room.status === 'active' ? '#dcfce7' : room.status === 'maintenance' ? '#fef3c7' : '#f1f5f9',
                              color: room.status === 'active' ? '#166534' : room.status === 'maintenance' ? '#92400e' : '#475569'
                            }}
                          >
                            {room.status === 'active' ? '🟢 Hoạt động' : room.status === 'maintenance' ? '🟠 Bảo trì' : '⚪ Tạm đóng'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditClinic(room)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Edit size={13} /> Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClinicRoom(room)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={13} /> Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {clinicRooms.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: '28px', textAlign: 'center', color: '#64748b' }}>
                        Chưa có buồng/phòng khám nào. Nhấn <strong>"+ Thêm Phòng Khám Mới"</strong> để tạo mới.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Tạo Mới / Chỉnh Sửa Phòng Khám */}
          {showClinicModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div style={{
                background: '#ffffff',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '640px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #0f766e 100%)',
                  color: '#ffffff',
                  padding: '18px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                    {editingRoom ? `Chỉnh Sửa Phòng Khám [${editingRoom.room_code}]` : 'Thêm Buồng / Phòng Khám Mới'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowClinicModal(false)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveClinicRoom} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Mã phòng khám (*):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: PK-TELE-03"
                        value={clinicForm.room_code}
                        onChange={e => setClinicForm({ ...clinicForm, room_code: e.target.value.toUpperCase() })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Tên buồng / phòng khám (*):
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Phòng khám Telemedicine #03 (Khoa Nội Tiết)"
                        value={clinicForm.name}
                        onChange={e => setClinicForm({ ...clinicForm, name: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Trực thuộc Chuyên khoa:
                      </label>
                      <select
                        value={clinicForm.department_id ?? ''}
                        onChange={e => setClinicForm({ ...clinicForm, department_id: e.target.value ? Number(e.target.value) : null })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      >
                        <option value="">-- Đa chuyên khoa / Dùng chung --</option>
                        {departmentsList.map(d => (
                          <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Phân loại buồng khám:
                      </label>
                      <select
                        value={clinicForm.room_type || 'telemedicine'}
                        onChange={e => setClinicForm({ ...clinicForm, room_type: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      >
                        <option value="telemedicine">Khám chữa bệnh từ xa (Telemedicine)</option>
                        <option value="outpatient">Buồng khám Ngoại trú (Outpatient)</option>
                        <option value="emergency">Bàn Tiếp đón Triage / Cấp cứu</option>
                        <option value="paraclinical">Phòng Cận lâm sàng & Đọc phim PACS</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Vị trí / Tầng / Khu nhà:
                      </label>
                      <input
                        type="text"
                        placeholder="VD: Tầng 3 - Trung tâm Khám từ xa"
                        value={clinicForm.location || ''}
                        onChange={e => setClinicForm({ ...clinicForm, location: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Bác sĩ phụ trách chính:
                      </label>
                      <select
                        value={clinicForm.doctor_in_charge_id ?? ''}
                        onChange={e => setClinicForm({ ...clinicForm, doctor_in_charge_id: e.target.value ? Number(e.target.value) : null })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      >
                        <option value="">-- Linh hoạt theo ca trực --</option>
                        {usersList.filter(u => u.role === 'doctor').map(doc => (
                          <option key={doc.id} value={doc.id}>{doc.full_name} ({doc.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Công suất / Ca trực (BN):
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={clinicForm.capacity_per_shift || 15}
                        onChange={e => setClinicForm({ ...clinicForm, capacity_per_shift: Number(e.target.value) })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                        Trạng thái vận hành:
                      </label>
                      <select
                        value={clinicForm.status || 'active'}
                        onChange={e => setClinicForm({ ...clinicForm, status: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                      >
                        <option value="active">🟢 Đang hoạt động</option>
                        <option value="maintenance">🟠 Bảo trì thiết bị</option>
                        <option value="inactive">⚪ Tạm đóng</option>
                      </select>
                    </div>

                    <div style={{ paddingBottom: '8px' }}>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#0f766e', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(clinicForm.telehealth_station_enabled)}
                          onChange={e => setClinicForm({ ...clinicForm, telehealth_station_enabled: e.target.checked })}
                        />
                        Trạm Video Telehealth
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Danh mục Trang thiết bị Y tế & IoT tại phòng:
                    </label>
                    <input
                      type="text"
                      placeholder="VD: LiveKit Video Station 4K, Ống nghe số Littmann, Máy đo ECG, Monitor 5 thông số..."
                      value={clinicForm.equipment_list || ''}
                      onChange={e => setClinicForm({ ...clinicForm, equipment_list: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Ghi chú vận hành:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ghi chú chuyên môn hoặc quy định phân luồng tại phòng khám..."
                      value={clinicForm.notes || ''}
                      onChange={e => setClinicForm({ ...clinicForm, notes: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowClinicModal(false)}
                      style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={savingClinic}
                      style={{ padding: '9px 22px', borderRadius: '8px', border: 'none', background: '#0d9488', color: '#fff', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {savingClinic ? 'Đang lưu...' : editingRoom ? 'Cập nhật Phòng khám' : 'Tạo Phòng khám'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
