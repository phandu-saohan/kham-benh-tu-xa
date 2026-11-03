import { useEffect, useState, useMemo } from 'react'
import {
  CalendarDays, Video, FileText, FlaskConical, Pill, CreditCard,
  LogOut, HeartPulse, Clock, UserRound, ShieldCheck, ArrowRight,
  Plus, X, Phone, Lock, Stethoscope, AlertCircle, RefreshCw, QrCode,
  FileDown, ExternalLink, PenTool, Building2, Sparkles, CheckCircle2,
  HelpCircle, ShieldAlert, Undo2, Activity, Settings, ScanLine,
  Mail, Eye, EyeOff, UserPlus, ChevronRight, Users, FileCheck, Check, Trash2, Download,
  BarChart3, Cpu
} from 'lucide-react'
import {
  login, sendOtp, verifyOtp, loginWithFirebaseToken, getFirebaseConfig, request, cancelAppointment,
  getConsentStatus, downloadMedicalRecordPdf, getPacsDicomStudies,
  checkBhyt, applyBhyt, getDepartments, getDoctorShifts,
  checkIncomingCall, declineIncomingCall,
  checkTriageSymptoms, type TriageSymptomResult,
  getPatientLabResults, getPatientPacsStudies, getMyLabResults, getMyPacsStudies,
  getFamilyMembers, createFamilyMember, deleteFamilyMember,
  recordRPMVitals, getPatientRPMVitals, listBHYTClaims, submitBHYTClaim, getBHYTXML4210,
  type Appointment, type User, type Department, type DoctorShift,
  type BhytCheckOut, type IncomingCallData, type LabResultsData, type PACSStudiesData,
  type FamilyMemberItem, type RPMVitalItem, type BHYTClaimItem, type BHYTXML4210Package
} from './api'
import {
  isFirebaseConfigured, setupRecaptcha, sendFirebaseOtp, verifyFirebaseOtp, setFirebaseRuntimeConfig
} from './firebase'
import type { ConfirmationResult } from 'firebase/auth'
import { VideoRoom } from './VideoRoom'
import { PatientWaitingRoom } from './PatientWaitingRoom'
import { DoctorWorkspace } from './DoctorWorkspace'
import { VietQRModal } from './VietQRModal'
import { ConsentModal } from './ConsentModal'
import { IncomingCallModal } from './IncomingCallModal'
import { TriageDesk } from './TriageDesk'
import { AdminDashboard } from './AdminDashboard'
import { NotificationCenter } from './NotificationCenter'
import { PatientProfilePage } from './PatientProfilePage'
import { PatientRegisterPage } from './PatientRegisterPage'
import { DoctorDashboard } from './DoctorDashboard'
import { PatientDashboard } from './PatientDashboard'
import { NurseDashboard } from './NurseDashboard'
import { RPMDeviceCenter } from './RPMDeviceCenter'
import { SmartDevicesHub } from './SmartDevicesHub'
import { Pagination } from './Pagination'

const money = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

const dateText = (s: string) =>
  new Date(s).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' })

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  
  // Auth state & Separate Login Portals
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login')
  const [loginPortal, setLoginPortal] = useState<'patient' | 'staff'>(() => {
    if (typeof window !== 'undefined' && (window.location.hash.includes('admin') || window.location.hash.includes('staff'))) {
      return 'staff'
    }
    return 'patient'
  })
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpDevHint, setOtpDevHint] = useState('')
  const [patientFullName, setPatientFullName] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<{ id: number; full_name: string; cchn?: string; department_id?: number }[]>([])
  const [error, setError] = useState('')
  const [view, setView] = useState('overview')
  
  // Modal states
  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null)
  const [qrAppointment, setQrAppointment] = useState<Appointment | null>(null)
  const [pendingConsentAppointment, setPendingConsentAppointment] = useState<Appointment | null>(null)

  // Giai đoạn 3 States: BHYT, Khoa/Phòng & Lịch trực chống quá tải, Hủy lịch & Hoàn tiền
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)

  const [bhytCode, setBhytCode] = useState('GD4797931812345')
  const [bhytInfo, setBhytInfo] = useState<BhytCheckOut | null>(null)
  const [checkingBhyt, setCheckingBhyt] = useState(false)
  const [applyingBhytId, setApplyingBhytId] = useState<number | null>(null)

  const [cancelModalAppt, setCancelModalAppt] = useState<Appointment | null>(null)
  const [cancelReasonText, setCancelReasonText] = useState('Bận lịch đột xuất, xin hủy hẹn khám')
  const [cancelling, setCancelling] = useState(false)

  // Cuộc gọi đến từ Bác sĩ (Incoming Call Ringing)
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)

  // Hồ sơ Sức khỏe Gia đình (Family Health Vault)
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberItem[]>([])
  const [loadingFamily, setLoadingFamily] = useState(false)
  const [showAddFamilyModal, setShowAddFamilyModal] = useState(false)
  const [famName, setFamName] = useState('')
  const [famRel, setFamRel] = useState('child')
  const [famGender, setFamGender] = useState('male')
  const [famDob, setFamDob] = useState('2020-06-15')
  const [famBhyt, setFamBhyt] = useState('')
  const [famBlood, setFamBlood] = useState('O+')
  const [famAllergies, setFamAllergies] = useState('')
  const [famConditions, setFamConditions] = useState('')
  const [savingFamily, setSavingFamily] = useState(false)

  // Giám sát Sinh hiệu Từ xa (RPM IoT)
  const [rpmVitals, setRpmVitals] = useState<RPMVitalItem[]>([])
  const [loadingVitals, setLoadingVitals] = useState(false)
  const [vitalSys, setVitalSys] = useState(128)
  const [vitalDia, setVitalDia] = useState(82)
  const [vitalPulse, setVitalPulse] = useState(74)
  const [vitalGlucose, setVitalGlucose] = useState(5.8)
  const [vitalSpo2, setVitalSpo2] = useState(98)
  const [savingVital, setSavingVital] = useState(false)

  // Giám định BHYT XML 4210 (Toàn viện)
  const [bhytClaimsList, setBhytClaimsList] = useState<BHYTClaimItem[]>([])
  const [loadingClaims, setLoadingClaims] = useState(false)
  const [xmlModalPkg, setXmlModalPkg] = useState<BHYTXML4210Package | null>(null)
  const [submittingClaimId, setSubmittingClaimId] = useState<number | null>(null)

  async function loadFamily() {
    try {
      setLoadingFamily(true)
      const data = await getFamilyMembers()
      setFamilyMembers(data)
    } catch (err: any) {
      console.error('Lỗi tải hồ sơ gia đình:', err)
    } finally {
      setLoadingFamily(false)
    }
  }

  async function handleAddFamily() {
    if (!famName.trim()) {
      setError('Vui lòng nhập họ và tên người thân')
      return
    }
    try {
      setSavingFamily(true)
      await createFamilyMember({
        full_name: famName.trim(),
        relationship: famRel,
        gender: famGender,
        date_of_birth: famDob,
        bhyt_code: famBhyt.trim() || undefined,
        blood_group: famBlood,
        allergies: famAllergies.trim() || undefined,
        chronic_conditions: famConditions.trim() || undefined
      })
      setToast(`👨‍👩‍👧 Đã thêm hồ sơ ${famName} vào Gia đình`)
      setShowAddFamilyModal(false)
      setFamName('')
      setFamBhyt('')
      setFamAllergies('')
      setFamConditions('')
      loadFamily()
    } catch (err: any) {
      setError(err.message || 'Lỗi thêm thành viên gia đình')
    } finally {
      setSavingFamily(false)
    }
  }

  async function handleDeleteFamily(id: number) {
    if (!confirm('Bạn có chắc chắn muốn xóa hồ sơ thành viên này?')) return
    try {
      await deleteFamilyMember(id)
      setToast('Đã xóa hồ sơ thành viên thành công')
      loadFamily()
    } catch (err: any) {
      setError(err.message || 'Lỗi xóa hồ sơ')
    }
  }

  async function loadVitals() {
    if (!user) return
    try {
      setLoadingVitals(true)
      const data = await getPatientRPMVitals(user.id)
      setRpmVitals(data)
    } catch (err: any) {
      console.error('Lỗi tải sinh hiệu:', err)
    } finally {
      setLoadingVitals(false)
    }
  }

  async function handleSaveVitalManual() {
    try {
      setSavingVital(true)
      await recordRPMVitals({
        device_type: 'blood_pressure',
        device_name: 'Omron HEM-7600T Smart BP (Đo tại nhà)',
        connection_method: 'bluetooth_ble',
        systolic: Number(vitalSys),
        diastolic: Number(vitalDia),
        pulse: Number(vitalPulse),
        glucose_value: Number(vitalGlucose),
        spo2_percent: Number(vitalSpo2)
      })
      setToast('📊 Đã ghi nhận dữ liệu đo sinh hiệu thành công')
      loadVitals()
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu sinh hiệu')
    } finally {
      setSavingVital(false)
    }
  }

  async function loadClaims() {
    try {
      setLoadingClaims(true)
      const data = await listBHYTClaims()
      setBhytClaimsList(data)
    } catch (err: any) {
      console.error('Lỗi tải danh sách BHYT:', err)
    } finally {
      setLoadingClaims(false)
    }
  }

  async function handleSubmitClaim(appointmentId: number) {
    try {
      setSubmittingClaimId(appointmentId)
      const res = await submitBHYTClaim(appointmentId)
      setToast(`✅ Đã gửi Cổng Giám định BHYT Quốc gia thành công! Mã tiếp nhận: ${res.gdbhyt_code}`)
      loadClaims()
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi hồ sơ giám định BHYT')
    } finally {
      setSubmittingClaimId(null)
    }
  }

  async function handleViewXmlPackage(appointmentId: number) {
    try {
      const pkg = await getBHYTXML4210(appointmentId)
      setXmlModalPkg(pkg)
    } catch (err: any) {
      setError(err.message || 'Lỗi lấy dữ liệu XML 4210')
    }
  }

  const [showBooking, setShowBooking] = useState(false)
  const [doctorId, setDoctorId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [reason, setReason] = useState('Tư vấn sức khỏe định kỳ')
  const [triageLoading, setTriageLoading] = useState(false)
  const [triageResult, setTriageResult] = useState<TriageSymptomResult | null>(null)

  async function handleAiTriage() {
    if (!reason.trim()) return
    try {
      setTriageLoading(true)
      const res = await checkTriageSymptoms(reason)
      setTriageResult(res)
      if (res.recommended_department_code) {
        const matchDept = departments.find(d => d.code === res.recommended_department_code || d.name.toLowerCase().includes(res.recommended_department_name.toLowerCase()))
        if (matchDept) {
          setSelectedDeptId(String(matchDept.id))
        }
      }
      setToast(`✨ AI gợi ý: ${res.recommended_department_name} (${res.urgency_label})`)
    } catch (err: any) {
      console.error('Lỗi AI triage:', err)
    } finally {
      setTriageLoading(false)
    }
  }
  const [hisSummary, setHisSummary] = useState<any>(null)
  const [imaging, setImaging] = useState<any>(null)
  const [toast, setToast] = useState('')
  // Tự động đóng toast thông báo sau 4 giây
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Cận lâm sàng & PACS cho từng bệnh nhân
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1)
  const [patientLabData, setPatientLabData] = useState<LabResultsData | null>(null)
  const [patientPacsData, setPatientPacsData] = useState<PACSStudiesData | null>(null)
  const [loadingPatientLab, setLoadingPatientLab] = useState(false)
  const [loadingPatientPacs, setLoadingPatientPacs] = useState(false)
  const [appLabFilter, setAppLabFilter] = useState<string>('all')
  const [appPacsFilter, setAppPacsFilter] = useState<string>('all')

  // Danh sách bệnh nhân độc nhất cho Bác sĩ / Điều dưỡng tra cứu
  const uniquePatients = useMemo(() => {
    const map = new Map<number, { id: number; name: string; phone?: string; bhyt?: string; lastReason?: string }>()
    map.set(1, { id: 1, name: 'Nguyễn Minh An', phone: '0912345678', bhyt: 'GD4797931812345', lastReason: 'Khám tim mạch theo dõi' })
    appointments.forEach(a => {
      if (a.patient_id && !map.has(a.patient_id)) {
        map.set(a.patient_id, {
          id: a.patient_id,
          name: (a as any).patient_name || `Bệnh nhân #${a.patient_id}`,
          phone: (a as any).patient_phone,
          bhyt: a.bhyt_code,
          lastReason: a.reason
        })
      }
    })
    return Array.from(map.values())
  }, [appointments])

  // Tải dữ liệu cận lâm sàng & PACS theo từng bệnh nhân được chọn
  useEffect(() => {
    if (!user) return
    if (view === 'lab' || view === 'results') {
      setLoadingPatientLab(true)
      const fetchLab = user.role === 'patient'
        ? getMyLabResults()
        : getPatientLabResults(selectedPatientId)
      fetchLab
        .then(setPatientLabData)
        .catch(console.error)
        .finally(() => setLoadingPatientLab(false))
    }
    if (view === 'pacs' || view === 'results') {
      setLoadingPatientPacs(true)
      const fetchPacs = user.role === 'patient'
        ? getMyPacsStudies()
        : getPatientPacsStudies(selectedPatientId)
      fetchPacs
        .then(setPatientPacsData)
        .catch(console.error)
        .finally(() => setLoadingPatientPacs(false))
    }
    if (view === 'family') {
      loadFamily()
    }
    if (view === 'vitals' || view === 'devices') {
      loadVitals()
    }
    if (view === 'insurance') {
      loadClaims()
    }
  }, [view, user, selectedPatientId])

  async function loadDashboard(current: User) {
    try {
      const [list, depts] = await Promise.all([
        request<Appointment[]>('/api/v1/appointments'),
        getDepartments().catch(() => [])
      ])
      setAppointments(list)
      setDepartments(depts)
      if (current.role === 'patient') {
        setView('overview')
        const [his, pacsData] = await Promise.all([
          request<any>('/api/v1/patients/me/his-summary').catch(() => null),
          getPacsDicomStudies().catch(() => null)
        ])
        setHisSummary(his)
        setImaging(pacsData)
        setDoctors(await request('/api/v1/doctors'))
      } else if (current.role === 'doctor') {
        setView('overview')
        const pacsData = await getPacsDicomStudies().catch(() => null)
        setImaging(pacsData)
      } else if (current.role === 'nurse') {
        setView('overview')
      } else if (current.role === 'admin') {
        setView('admin')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu')
    }
  }

  // Tải ca trực khi chọn Bác sĩ
  useEffect(() => {
    if (doctorId) {
      getDoctorShifts(Number(doctorId))
        .then(setDoctorShifts)
        .catch(() => setDoctorShifts([]))
    } else {
      setDoctorShifts([])
    }
  }, [doctorId])

  useEffect(() => {
    // Lắng nghe thay đổi URL hash để tự động mở cổng phù hợp (#staff, #admin, #patient)
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase()
      if (hash.includes('admin') || hash.includes('staff')) {
        setLoginPortal('staff')
      } else if (hash.includes('patient')) {
        setLoginPortal('patient')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)

    // Tải cấu hình Firebase động từ backend nếu đã thiết lập
    getFirebaseConfig()
      .then(cfg => {
        if (cfg && cfg.apiKey) {
          setFirebaseRuntimeConfig(cfg)
        }
      })
      .catch(() => {})

    const saved = localStorage.getItem('tm_token')
    if (saved) {
      request<User>('/api/v1/auth/me')
        .then(u => {
          setUser(u)
          return loadDashboard(u)
        })
        .catch(() => {
          localStorage.removeItem('tm_token')
          localStorage.removeItem('tm_refresh_token')
        })
    }

    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // Đăng nhập bằng Email + Mật khẩu
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const u = await login(email, password)
      setUser(u)
      setToast('')
      await loadDashboard(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại')
    }
  }

  // Gửi mã OTP (Firebase Phone Auth hoặc Fallback SMS/Dev Mock)
  async function handleSendOtp() {
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại')
      return
    }
    setError('')
    setIsSendingOtp(true)
    try {
      if (isFirebaseConfigured()) {
        const verifier = setupRecaptcha('recaptcha-container')
        if (!verifier) {
          throw new Error('Không thể khởi tạo reCAPTCHA Firebase')
        }
        const confirmResult = await sendFirebaseOtp(phone, verifier)
        setConfirmationResult(confirmResult)
        setOtpSent(true)
        setOtpDevHint('')
        setOtpCode('')
        setToast(`Mã xác thực Firebase OTP đã được gửi tới ${phone}`)
      } else {
        const res = await sendOtp(phone)
        setOtpSent(true)
        setOtpDevHint('')
        setOtpCode('')
        setToast(res.message)
      }
    } catch (e: any) {
      console.error('Lỗi gửi OTP:', e)
      const msg = e?.message || 'Không gửi được OTP'
      if (msg.includes('auth/invalid-phone-number')) {
        setError('Số điện thoại không đúng định dạng. Vui lòng nhập số hợp lệ (ví dụ: 0912345678).')
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Đã gửi quá nhiều yêu cầu xác thực. Vui lòng thử lại sau ít phút.')
      } else {
        setError(msg)
      }
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Xác thực mã OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!otpCode.trim()) {
      setError('Vui lòng nhập mã OTP')
      return
    }
    setError('')
    setIsVerifyingOtp(true)
    try {
      if (confirmationResult) {
        // Xác thực qua Firebase Phone Auth
        const idToken = await verifyFirebaseOtp(confirmationResult, otpCode.trim())
        const u = await loginWithFirebaseToken(idToken, patientFullName)
        setUser(u)
        setToast('')
        await loadDashboard(u)
      } else {
        // Fallback qua backend OTP thông thường / mock
        const u = await verifyOtp(phone, otpCode, patientFullName)
        setUser(u)
        setToast('')
        await loadDashboard(u)
      }
    } catch (e: any) {
      console.error('Lỗi xác thực OTP:', e)
      const msg = e?.message || 'Xác thực OTP không thành công'
      if (msg.includes('auth/invalid-verification-code')) {
        setError('Mã OTP không đúng hoặc đã hết hạn')
      } else {
        setError(msg)
      }
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  function logout() {
    localStorage.removeItem('tm_token')
    localStorage.removeItem('tm_refresh_token')
    setUser(null)
    setAppointments([])
    setView('overview')
    setActiveAppointment(null)
    setQrAppointment(null)
    setPendingConsentAppointment(null)
  }

  // Đặt lịch khám mới
  async function book(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const res = await request<Appointment>('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify({
          doctor_id: Number(doctorId),
          starts_at: new Date(startsAt).toISOString(),
          reason,
          shift_id: selectedShiftId || undefined,
          department_id: selectedDeptId ? Number(selectedDeptId) : undefined
        })
      })
      setShowBooking(false)
      setSelectedShiftId(null)
      setToast('Lịch hẹn đã được khởi tạo! Mời bạn quét mã VietQR để thanh toán xác nhận.')
      if (user) await loadDashboard(user)
      setQrAppointment(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không đặt được lịch')
    }
  }

  // Xử lý vào phòng khám (Bệnh nhân đã đồng ý điều khoản khi đăng ký tài khoản)
  async function handleJoinConsultation(a: Appointment) {
    setPendingConsentAppointment(null)
    setActiveAppointment(a)
  }

  // Tra cứu BHYT trực tuyến
  async function handleCheckBhyt() {
    if (!bhytCode.trim()) {
      setError('Vui lòng nhập mã thẻ BHYT')
      return
    }
    setCheckingBhyt(true)
    setError('')
    try {
      const res = await checkBhyt(bhytCode, user?.full_name)
      setBhytInfo(res)
      setToast(res.message)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tra cứu BHYT thất bại')
    } finally {
      setCheckingBhyt(false)
    }
  }

  // Áp dụng BHYT vào lịch hẹn
  async function handleApplyBhyt(appointmentId: number) {
    if (!bhytCode.trim()) {
      setError('Vui lòng nhập mã thẻ BHYT hợp lệ')
      return
    }
    setApplyingBhytId(appointmentId)
    setError('')
    try {
      const res = await applyBhyt(appointmentId, bhytCode)
      setToast(res.message)
      if (user) await loadDashboard(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể áp dụng BHYT')
    } finally {
      setApplyingBhytId(null)
    }
  }

  // Mở modal Hủy lịch hẹn
  function handleCancelAppointment(a: Appointment) {
    setCancelModalAppt(a)
    setCancelReasonText('Bận lịch đột xuất, xin hủy hẹn khám')
  }

  // Thực hiện Hủy lịch & Hoàn tiền theo chính sách
  async function handleConfirmCancel() {
    if (!cancelModalAppt) return
    setCancelling(true)
    setError('')
    try {
      const res = await cancelAppointment(cancelModalAppt.id, cancelReasonText)
      setToast(res.message)
      setCancelModalAppt(null)
      if (user) await loadDashboard(user)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể hủy lịch')
    } finally {
      setCancelling(false)
    }
  }

  // Tải file PDF
  async function handleDownloadPdf(appointmentId: number) {
    try {
      await downloadMedicalRecordPdf(appointmentId)
      setToast('Đang tải xuống file PDF Phiếu khám & Đơn thuốc...')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi tải PDF')
    }
  }

  // Lắng nghe cuộc gọi đến từ Bác sĩ (Incoming Call Polling cho Bệnh nhân)
  useEffect(() => {
    if (!user || user.role !== 'patient' || activeAppointment) {
      return
    }

    const interval = setInterval(async () => {
      try {
        const callData = await checkIncomingCall()
        if (callData.has_incoming_call) {
          setIncomingCall(prev => (prev?.appointment_id === callData.appointment_id ? prev : callData))
        } else {
          setIncomingCall(null)
        }
      } catch {}
    }, 2500)

    return () => clearInterval(interval)
  }, [user, activeAppointment])

  // Bệnh nhân bấm nhận cuộc gọi
  async function handleAcceptIncomingCall() {
    if (!incomingCall || !incomingCall.appointment_id) return
    const apptId = incomingCall.appointment_id
    setIncomingCall(null)

    let targetAppt = appointments.find(a => a.id === apptId)
    if (!targetAppt) {
      targetAppt = {
        id: apptId,
        patient_id: user!.id,
        doctor_id: incomingCall.doctor?.id || 0,
        starts_at: incomingCall.starts_at || new Date().toISOString(),
        reason: incomingCall.reason || 'Tư vấn sức khỏe trực tuyến',
        status: 'in_progress',
        fee_amount: incomingCall.fee_amount || 500000,
        currency: 'VND'
      }
    }
    // Bệnh nhân đã đồng ý điều khoản khi đăng ký tài khoản -> vào thẳng phòng gọi ngay
    setPendingConsentAppointment(null)
    setActiveAppointment(targetAppt)
  }

  // Bệnh nhân bấm từ chối cuộc gọi
  async function handleDeclineIncomingCall() {
    if (incomingCall?.appointment_id) {
      declineIncomingCall(incomingCall.appointment_id).catch(() => {})
    }
    setIncomingCall(null)
  }

  // 1. Màn hình Đăng nhập & Đăng ký tài khoản
  if (!user) {
    if (authScreen === 'register') {
      return (
        <PatientRegisterPage
          onSuccess={(data) => {
            localStorage.setItem('tm_token', data.access_token)
            localStorage.setItem('tm_refresh_token', data.refresh_token)
            setUser(data.user)
            setView('overview')
            setAuthScreen('login')
          }}
          onBackToLogin={() => {
            setAuthScreen('login')
            setError('')
          }}
        />
      )
    }

    // CỔNG 1: DÀNH RIÊNG CHO BỆNH NHÂN (PATIENT PORTAL)
    if (loginPortal === 'patient') {
      return (
        <main className="login-page patient-portal-page">
          <div className="login-card patient-portal-card">
            {/* Top Portal Switcher Bar */}
            <div className="portal-switch-header">
              <span className="portal-indicator patient">
                <HeartPulse size={13} /> Cổng Dịch vụ Bệnh nhân
              </span>
              <button
                type="button"
                className="btn-switch-portal"
                onClick={() => { setLoginPortal('staff'); setError(''); }}
                title="Chuyển sang Cổng Bác sĩ & Quản trị viện"
              >
                <Stethoscope size={13} />
                <span>Cán bộ / Bác sĩ</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Header Brand Identity */}
            <div className="login-header-brand">
              <div className="login-logo-badge">
                <HeartPulse size={24} className="heart-pulse-icon" />
              </div>
              <div className="login-brand-meta">
                <div className="login-brand-title">
                  <strong>CareConnect Bệnh nhân</strong>
                  <span className="medical-verified-tag">HIS / BHYT</span>
                </div>
                <span className="login-brand-desc">Cổng Khám Chữa Bệnh Từ Xa & Y Tế Số</span>
              </div>
            </div>

            {/* Heading */}
            <div className="login-title-section">
              <h1 className="login-title">Đăng nhập Bệnh nhân</h1>
              <p className="login-subtitle">
                Nhập số điện thoại di động để nhận mã OTP xác thực và vào phòng khám trực tuyến
              </p>
            </div>

            {/* Patient OTP Form */}
            <form onSubmit={handleVerifyOtp} className="modern-login-form">
              <div className="login-field-group">
                <label className="login-label">
                  <Phone size={13} className="label-icon" />
                  <span>Số điện thoại di động</span>
                </label>
                <div className="login-input-with-action">
                  <input
                    type="tel"
                    placeholder="Ví dụ: 0933413486"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="login-input"
                    required
                  />
                  <button
                    type="button"
                    className={`btn-otp-action ${isSendingOtp ? 'loading' : ''} ${otpSent ? 'sent' : ''}`}
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp ? 'Đang gửi...' : (otpSent ? 'Gửi lại mã' : 'Lấy mã OTP')}
                  </button>
                </div>
              </div>

              {/* reCAPTCHA container dùng cho Firebase Phone Auth */}
              <div id="recaptcha-container" style={{ margin: '4px 0' }}></div>

              {otpSent && (
                <div className="login-field-group otp-verify-box">
                  <label className="login-label">
                    <ShieldCheck size={13} className="label-icon" />
                    <span>Mã xác thực OTP (6 chữ số)</span>
                  </label>
                  <div className="login-input-wrap">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Nhập 6 số OTP vừa nhận"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      className="login-input otp-number-input"
                      required
                    />
                  </div>
                  <button className="btn-login-primary" type="submit" disabled={isVerifyingOtp}>
                    {isVerifyingOtp ? (
                      <>
                        <Activity size={16} className="animate-spin" />
                        <span>Đang xác thực OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Xác nhận & Vào ứng dụng</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {!otpSent && (
                <button
                  type="button"
                  className="btn-login-primary"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || !phone.trim()}
                >
                  {isSendingOtp ? (
                    <>
                      <Activity size={16} className="animate-spin" />
                      <span>Đang gửi mã xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Tiếp tục với mã OTP</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </form>

            {error && (
              <div className="login-error-alert">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Dedicated Registration Banner */}
            <div className="login-register-card">
              <div className="reg-card-top">
                <div className="reg-card-heading">
                  <UserPlus size={15} className="reg-card-icon" />
                  <span>Bệnh nhân chưa có tài khoản?</span>
                </div>
                <span className="reg-card-badge">Liên thông HIS</span>
              </div>
              <p className="reg-card-desc">
                Đăng ký định danh CCCD/VNeID để tự động kết nối hồ sơ bệnh án, lịch sử khám và đơn thuốc từ bệnh viện.
              </p>
              <button
                type="button"
                className="btn-register-action"
                onClick={() => { setAuthScreen('register'); setError(''); }}
              >
                <span>Đăng ký tài khoản Bệnh nhân mới</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Switch to Staff Portal */}
            <div className="portal-footer-switch">
              <span>Bạn là Bác sĩ, Điều dưỡng hoặc Quản trị viên?</span>
              <button
                type="button"
                className="link-switch-portal"
                onClick={() => { setLoginPortal('staff'); setError(''); }}
              >
                Đăng nhập Cổng Cán bộ Y tế & Quản trị Viện →
              </button>
            </div>

            {/* Trust / Compliance footer */}
            <div className="login-trust-footer">
              <ShieldCheck size={12} />
              <span>Bảo mật dữ liệu y tế theo Nghị định 13/2023/NĐ-CP & TT 30/2023/BYT</span>
            </div>
          </div>
        </main>
      )
    }

    // CỔNG 2: DÀNH RIÊNG CHO CÁN BỘ Y TẾ & QUẢN TRỊ VIỆN (STAFF & ADMIN PORTAL)
    return (
      <main className="login-page staff-portal-page">
        <div className="login-card staff-portal-card">
          {/* Top Portal Switcher Bar */}
          <div className="portal-switch-header">
            <span className="portal-indicator staff">
              <ShieldCheck size={13} /> Cổng Cán bộ Y tế & Quản trị
            </span>
            <button
              type="button"
              className="btn-switch-portal"
              onClick={() => { setLoginPortal('patient'); setError(''); }}
              title="Quay lại Cổng Bệnh nhân"
            >
              <HeartPulse size={13} />
              <span>Cổng Bệnh nhân</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {/* Header Brand Identity */}
          <div className="login-header-brand">
            <div className="login-logo-badge staff-badge">
              <Stethoscope size={24} className="heart-pulse-icon" />
            </div>
            <div className="login-brand-meta">
              <div className="login-brand-title">
                <strong>CareConnect Staff</strong>
                <span className="medical-verified-tag staff-tag">Nội bộ Viện</span>
              </div>
              <span className="login-brand-desc">Hệ thống Điều hành Y tế & Phòng khám Trực tuyến</span>
            </div>
          </div>

          {/* Heading */}
          <div className="login-title-section">
            <h1 className="login-title">Đăng nhập Cán bộ Y tế</h1>
            <p className="login-subtitle">
              Dành riêng cho Bác sĩ chuyên khoa, Điều dưỡng tiếp đón Triage và Quản trị viên
            </p>
          </div>

          {/* Staff Form: Email + Password */}
          <form onSubmit={handlePasswordLogin} className="modern-login-form">
            <div className="login-field-group">
              <label className="login-label">
                <Mail size={13} className="label-icon" />
                <span>Email cán bộ / Mã nhân viên</span>
              </label>
              <div className="login-input-wrap">
                <input
                  type="email"
                  placeholder="doctor@example.test"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="login-input"
                  required
                />
              </div>
            </div>

            <div className="login-field-group">
              <label className="login-label">
                <Lock size={13} className="label-icon" />
                <span>Mật khẩu</span>
              </label>
              <div className="login-input-wrap password-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="login-input"
                  required
                />
                <button
                  type="button"
                  className="btn-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label="Ẩn / Hiện mật khẩu"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button className="btn-login-primary" type="submit" style={{ background: '#1e40af' }}>
              <span>Đăng nhập Cán bộ Y tế</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {error && (
            <div className="login-error-alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Security Notice Card */}
          <div className="staff-security-card">
            <div className="security-card-header">
              <ShieldCheck size={14} style={{ color: '#2563eb' }} />
              <span>Xác thực Định danh Cán bộ & Bảo mật Y tế</span>
            </div>
            <p className="security-desc">
              Mọi phiên truy cập phòng khám, ký số SmartCA và hồ sơ bệnh án đều được kiểm toán và lưu vết tự động theo Nghị định 13/2023/NĐ-CP.
            </p>
          </div>

          {/* Switch back to Patient Portal */}
          <div className="portal-footer-switch">
            <button
              type="button"
              className="link-switch-portal"
              onClick={() => { setLoginPortal('patient'); setError(''); }}
            >
              ← Quay lại Cổng Bệnh nhân
            </button>
          </div>
        </div>
      </main>
    )
  }

  // 2. Màn hình Phòng khám Bác sĩ (Split-view Doctor Workspace)
  if (activeAppointment && user.role === 'doctor') {
    return (
      <DoctorWorkspace
        appointment={activeAppointment}
        user={user}
        onBack={() => setActiveAppointment(null)}
        onCompleted={() => {
          setActiveAppointment(null)
          loadDashboard(user)
        }}
      />
    )
  }

  // 3. Màn hình Phòng gọi video Bệnh nhân hoặc Phòng chờ ảo
  if (activeAppointment && user.role === 'patient') {
    if (activeAppointment.status === 'waiting') {
      return (
        <PatientWaitingRoom
          appointment={activeAppointment}
          user={user}
          onBack={() => setActiveAppointment(null)}
          onEnterConsultation={(appt) => {
            setActiveAppointment(appt)
          }}
        />
      )
    }
    return (
      <VideoRoom
        appointment={activeAppointment}
        onBack={() => setActiveAppointment(null)}
        user={user}
      />
    )
  }

  const isPatient = user.role === 'patient'
  const isDoctor = user.role === 'doctor'
  const isNurse = user.role === 'nurse'
  const isAdmin = user.role === 'admin'
  const upcoming = appointments.filter(a => ['scheduled', 'confirmed', 'in_progress'].includes(a.status))

  // Danh mục điều hướng Desktop theo từng vai trò (Role-based Navigation - Chuẩn hóa UI/UX)
  const navItems = isPatient ? [
    ['overview', 'Tổng quan', HeartPulse],
    ['appointments', 'Lịch khám của tôi', CalendarDays],
    ['family', 'Hồ sơ Gia đình', Users],
    ['devices', 'Kết nối thiết bị', Cpu],
    ['vitals', 'Sinh hiệu RPM IoT', Activity],
    ['records', 'Hồ sơ bệnh án EMR', FileText],
    ['insurance', 'Bảo hiểm Y tế & XML 4210', ShieldCheck],
    ['payments', 'Thanh toán VietQR', CreditCard],
    ['profile', 'Hồ sơ cá nhân & CCCD', UserRound]
  ] : isDoctor ? [
    ['overview', 'Bàn làm việc Bác sĩ', Activity],
    ['appointments', 'Hàng đợi khám hôm nay', CalendarDays],
    ['vitals', 'Thiết bị Sinh hiệu FDA', Activity],
    ['triage', 'Bàn Tiếp đón & Sàng lọc', Stethoscope],
    ['records', 'Tra cứu Bệnh án Toàn viện', FileText],
    ['insurance', 'Giám định BHYT & XML 4210', ShieldCheck]
  ] : isNurse ? [
    ['overview', 'Bàn Tiếp đón Triage', Activity],
    ['appointments', 'Lịch khám & Ca trực', CalendarDays],
    ['vitals', 'Thiết bị Sinh hiệu FDA', Activity],
    ['insurance', 'Giám định BHYT & XML 4210', ShieldCheck],
    ['records', 'Tra cứu Bệnh án', FileText]
  ] : [
    ['admin-settings', 'Cấu hình Hệ thống', Settings],
    ['admin-overview', 'Báo cáo & KPI Viện', BarChart3],
    ['admin-users', 'Nhân sự & Cán bộ', Users],
    ['admin-rbac', 'Ma trận Phân quyền', ShieldCheck],
    ['admin-audit', 'Nhật ký Kiểm toán', FileText],
    ['appointments', 'Giám sát Lịch khám', CalendarDays],
    ['triage', 'Bàn Tiếp đón Triage', Stethoscope],
    ['insurance', 'Giám định BHYT & XML 4210', ShieldCheck],
    ['payments', 'Đối soát Viện phí VietQR', CreditCard]
  ]

  // Danh mục điều hướng Mobile theo từng vai trò (Bottom Navigation Bar)
  const mobileNavItems = isPatient ? [
    ['overview', 'Tổng quan', HeartPulse],
    ['appointments', 'Lịch khám', CalendarDays],
    ['devices', 'Thiết bị', Cpu],
    ['family', 'Gia đình', Users],
    ['vitals', 'Sinh hiệu', Activity],
    ['profile', 'Hồ sơ', UserRound]
  ] : isDoctor ? [
    ['overview', 'Khám bệnh', Activity],
    ['appointments', 'Hàng đợi', CalendarDays],
    ['triage', 'Sàng lọc', Stethoscope],
    ['records', 'Bệnh án', FileText]
  ] : isNurse ? [
    ['overview', 'Tiếp đón', Activity],
    ['appointments', 'Lịch hẹn', CalendarDays],
    ['insurance', 'BHYT', ShieldCheck],
    ['records', 'Bệnh án', FileText]
  ] : [
    ['admin-overview', 'Báo cáo', BarChart3],
    ['admin-settings', 'Cài đặt', Settings],
    ['admin-users', 'Nhân sự', Users],
    ['admin-rbac', 'Phân quyền', ShieldCheck]
  ]

  return (
    <div className="app-shell">
      {/* Sidebar Desktop - Clean & Modern */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark small">
            <HeartPulse size={20} />
          </div>
          <div className="brand-text">
            <b>CareConnect</b>
            <small>Telemedicine V1.2</small>
          </div>
        </div>

        <div className="profile">
          <div className="avatar">
            <UserRound size={18} />
          </div>
          <div className="profile-info">
            <b>{user.full_name}</b>
            <small>
              {isPatient
                ? 'Bệnh nhân'
                : isDoctor
                ? `Bác sĩ (${user.doctor_cchn || 'CCHN'})`
                : isNurse
                ? 'Điều dưỡng tiếp đón'
                : 'Quản trị viên'}
            </small>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="desktop-nav">
          {navItems.map(([id, label, Icon]: any) => (
            <button
              key={id}
              className={`nav-item ${view === id ? 'selected' : ''}`}
              onClick={() => setView(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar Bottom - Sleek Logout Only */}
        <div className="sidebar-bottom">
          <button className="nav-item logout-btn" onClick={logout} title="Đăng xuất khỏi hệ thống">
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Topbar: Ẩn hoàn toàn trên Dashboard Bệnh nhân (do Patient Dashboard đã có Header nhận diện riêng, loại bỏ phần thừa) */}
        {!(isPatient && view === 'overview') && (
          <header className="topbar">
            <div>
              <p className="eyebrow">HỆ THỐNG Y TẾ TỪ XA CHUẨN QUỐC GIA</p>
              <h2>
                {isPatient
                  ? `Xin chào, ${user.full_name}`
                  : isDoctor
                  ? `👨‍⚕️ Buồng làm việc Bác sĩ: ${user.full_name}`
                  : isNurse
                  ? `👩‍⚕️ Bàn Tiếp đón Điều dưỡng: ${user.full_name}`
                  : `⚙️ Quản trị Toàn viện: ${user.full_name}`}
              </h2>
            </div>
            <div className="top-actions">
              <NotificationCenter
                userRole={user.role}
                onNavigate={(url) => {
                  if (url.includes('appointments') || url.includes('booking')) setView('appointments')
                  else if (url.includes('prescriptions')) setView('prescriptions')
                  else if (url.includes('paraclinical') || url.includes('labs')) setView('paraclinical')
                  else if (url.includes('profile')) setView('profile')
                  else if (url.includes('admin')) setView('admin')
                }}
              />
              <span className="status-dot" /> SmartCA & Cổng Đơn thuốc sẵn sàng
              <button
                className={`avatar small-avatar ${view === 'profile' ? 'selected' : ''}`}
                title={`Hồ sơ tài khoản: ${user.full_name}`}
                onClick={() => setView(isPatient ? 'profile' : 'overview')}
              >
                <UserRound size={17} />
              </button>
              <button className="mobile-logout-btn" onClick={logout} title="Đăng xuất tài khoản">
                <LogOut size={16} />
              </button>
            </div>
          </header>
        )}

        {error && (
          <div className="alert error">
            {error}
            <button onClick={() => setError('')}><X size={16} /></button>
          </div>
        )}
        {toast && !(isPatient && view === 'overview') && (
          <div className="alert success">
            {toast}
            <button onClick={() => setToast('')}><X size={16} /></button>
          </div>
        )}

        {/* Tab: Tổng quan - Dashboard chuyên nghiệp theo từng vai trò */}
        {view === 'overview' && (
          <>
            {isPatient && (
              <PatientDashboard
                user={user}
                appointments={appointments}
                doctors={doctors}
                vitalsLogs={rpmVitals}
                onBook={() => setShowBooking(true)}
                onJoin={(appt) => {
                  if (user?.role === 'doctor') setActiveAppointment(appt)
                  else handleJoinConsultation(appt)
                }}
                onNavigate={(v) => setView(v)}
                onPay={(appt) => setQrAppointment(appt)}
                onDownloadPdf={(id) => handleDownloadPdf(id)}
                onRefreshVitals={loadVitals}
              />
            )}

            {isDoctor && (
              <DoctorDashboard
                doctor={user}
                appointments={appointments}
                departments={departments}
                onOpenWorkspace={(appt) => setActiveAppointment(appt)}
                onNavigate={(v) => setView(v)}
                onCallPatient={(appt) => setActiveAppointment(appt)}
              />
            )}

            {isNurse && (
              <NurseDashboard
                nurse={user}
                onNavigate={(v) => setView(v)}
                onSelectPatientForDoctor={(id) => {
                  const targetAppt = appointments.find(a => a.id === id)
                  if (targetAppt) {
                    setToast(`Đã điều phối bệnh nhân #${id} vào buồng bác sĩ`)
                  }
                }}
              />
            )}

            {isAdmin && (
              <section className="panel page-panel" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                <AdminDashboard
                  activeTab="overview"
                  onTabChange={(t) => setView(`admin-${t}`)}
                  hideInternalNav={true}
                />
              </section>
            )}
          </>
        )}

        {/* Tab: Lịch hẹn */}
        {view === 'appointments' && (
          isDoctor ? (
            <DoctorDashboard
              doctor={user}
              appointments={appointments}
              departments={departments}
              onOpenWorkspace={(appt) => setActiveAppointment(appt)}
              onNavigate={(v) => setView(v)}
              onCallPatient={(appt) => setActiveAppointment(appt)}
            />
          ) : isNurse ? (
            <NurseDashboard
              nurse={user}
              initialTab="appointments"
              onNavigate={(v) => setView(v)}
              onSelectPatientForDoctor={(id) => {
                const targetAppt = appointments.find(a => a.id === id)
                if (targetAppt) {
                  setToast(`Đã điều phối bệnh nhân #${id} vào phòng khám bác sĩ`)
                }
              }}
            />
          ) : (
            <section className="panel page-panel">
              <div className="panel-heading">
                <div>
                  <h3>Danh sách lịch hẹn</h3>
                  <p>Khởi động phòng khám hoặc thanh toán VietQR</p>
                </div>
                {isPatient && (
                  <button className="primary" onClick={() => setShowBooking(true)}>
                    <Plus size={16} /> Đặt lịch khám mới
                  </button>
                )}
              </div>
              <AppointmentList
                items={appointments}
                doctors={doctors}
                isDoctor={isDoctor}
                onJoin={handleJoinConsultation}
                onPay={setQrAppointment}
                onCancel={handleCancelAppointment}
                onDownloadPdf={handleDownloadPdf}
              />
            </section>
          )
        )}

        {/* Tab: Hồ sơ bệnh án */}
        {view === 'records' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Hồ sơ bệnh án điện tử</h3>
                <p>Hồ sơ đã hoàn tất, ký số SmartCA và có thể trích xuất PDF</p>
              </div>
            </div>
            <AppointmentList
              items={appointments.filter(a => a.status === 'completed' || a.status === 'in_progress')}
              doctors={doctors}
              isDoctor={isDoctor}
              onJoin={handleJoinConsultation}
              onPay={setQrAppointment}
              onCancel={handleCancelAppointment}
              onDownloadPdf={handleDownloadPdf}
            />
            <div className="notice">
              <ShieldCheck size={18} />
              Bệnh án đã được mã hóa bảo vệ theo Nghị định 13/2023/NĐ-CP và có giá trị pháp lý khi được ký số SmartCA.
            </div>
          </section>
        )}

        {/* Tab 1: Cận lâm sàng & Xét nghiệm */}
        {(view === 'lab' || view === 'results') && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FlaskConical size={22} color="#0f766e" />
                  <h3 style={{ margin: 0 }}>Phiếu Cận lâm sàng & Kết quả Xét nghiệm</h3>
                </div>
                <p>Theo dõi chỉ số sinh hóa máu, công thức máu và tổng phân tích nước tiểu</p>
              </div>
            </div>

            {/* Thanh chọn Bệnh nhân dành cho Bác sĩ & Điều dưỡng */}
            {!isPatient && (
              <div className="patient-selector-panel" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                      👤 Chọn Bệnh nhân để xem Cận lâm sàng:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {uniquePatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatientId(p.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: selectedPatientId === p.id ? '2px solid #0f766e' : '1px solid #cbd5e1',
                            background: selectedPatientId === p.id ? '#ccfbf1' : '#fff',
                            color: selectedPatientId === p.id ? '#0f766e' : '#334155',
                            fontWeight: selectedPatientId === p.id ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <UserRound size={14} />
                          <span>{p.name}</span>
                          {p.bhyt && <small style={{ opacity: 0.75, fontSize: '11px' }}>({p.bhyt})</small>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Category chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                ['all', `Tất cả (${patientLabData?.reports?.length || 0})`],
                ['biochemistry', 'Sinh hóa máu'],
                ['hematology', 'Huyết học & Tế bào'],
                ['urinalysis', 'Nước tiểu']
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppLabFilter(key)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: appLabFilter === key ? '1px solid #0f766e' : '1px solid #cbd5e1',
                    background: appLabFilter === key ? '#0f766e' : '#f8fafc',
                    color: appLabFilter === key ? '#fff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {loadingPatientLab && <p className="muted">Đang tải kết quả cận lâm sàng của bệnh nhân...</p>}

            {patientLabData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {patientLabData.reports
                  .filter(r => appLabFilter === 'all' || r.category === appLabFilter)
                  .map(report => (
                    <div key={report.report_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                              {report.category_name}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{report.title}</h4>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            Mã: <strong>{report.report_id}</strong> · Lấy mẫu: {report.sampled_at} · Trả KQ: {report.result_at}
                          </small>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                          <div>KTV: <strong>{report.performed_by}</strong></div>
                          <div>BS chỉ định: {report.doctor_order}</div>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 10px' }}>Tên xét nghiệm / Chỉ số</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>Kết quả</th>
                              <th style={{ padding: '8px 10px' }}>Đơn vị</th>
                              <th style={{ padding: '8px 10px' }}>Khoảng tham chiếu</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đánh giá</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.indicators.map((ind, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: ind.flag !== 'NORMAL' ? '#fffbeb' : 'transparent' }}>
                                <td style={{ padding: '8px 10px' }}>
                                  <strong style={{ color: '#1e293b' }}>{ind.name}</strong>
                                  <code style={{ marginLeft: 6, fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{ind.code}</code>
                                  {ind.note && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ind.note}</div>}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: ind.flag === 'HIGH' ? '#dc2626' : ind.flag === 'LOW' ? '#d97706' : '#0f172a' }}>
                                  {ind.value}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#64748b' }}>{ind.unit}</td>
                                <td style={{ padding: '8px 10px', color: '#475569' }}>{ind.ref_range}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  {ind.flag === 'HIGH' && (
                                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                      ▲ Tăng cao
                                    </span>
                                  )}
                                  {ind.flag === 'LOW' && (
                                    <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                      ▼ Giảm thấp
                                    </span>
                                  )}
                                  {ind.flag === 'NORMAL' && (
                                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                      Bình thường
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {report.conclusion && (
                        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #0f766e', fontSize: '12px' }}>
                          <strong style={{ color: '#0f766e' }}>Kết luận chuyên môn:</strong> {report.conclusion}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <div className="notice" style={{ marginTop: '16px' }}>
              <ShieldCheck size={18} />
              Dữ liệu cận lâm sàng được kết nối trực tiếp từ hệ thống LIS bệnh viện theo chuẩn HL7 FHIR bảo vệ quyền riêng tư bệnh nhân.
            </div>
          </section>
        )}

        {/* Tab 2: Chẩn đoán hình ảnh PACS / DICOM */}
        {view === 'pacs' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ScanLine size={22} color="#0284c7" />
                  <h3 style={{ margin: 0 }}>Kết quả Chẩn đoán Hình ảnh PACS / DICOM</h3>
                </div>
                <p>Xem phim X-Quang, Siêu âm, CT Scanner trực tuyến qua trình đọc ảnh y khoa OHIF Viewer</p>
              </div>
            </div>

            {/* Thanh chọn Bệnh nhân dành cho Bác sĩ & Điều dưỡng */}
            {!isPatient && (
              <div className="patient-selector-panel" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: '4px' }}>
                      🩻 Chọn Bệnh nhân để xem phim PACS:
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {uniquePatients.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPatientId(p.id)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: selectedPatientId === p.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                            background: selectedPatientId === p.id ? '#e0f2fe' : '#fff',
                            color: selectedPatientId === p.id ? '#0369a1' : '#334155',
                            fontWeight: selectedPatientId === p.id ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <UserRound size={14} />
                          <span>{p.name}</span>
                          {p.bhyt && <small style={{ opacity: 0.75, fontSize: '11px' }}>({p.bhyt})</small>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Modality chips */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
              {[
                ['all', `Tất cả (${patientPacsData?.studies?.length || 0})`],
                ['CR', 'X-Quang (CR)'],
                ['US', 'Siêu âm (US)'],
                ['CT', 'Cắt lớp vi tính (CT)']
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAppPacsFilter(key)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '20px',
                    border: appPacsFilter === key ? '1px solid #0284c7' : '1px solid #cbd5e1',
                    background: appPacsFilter === key ? '#0284c7' : '#f8fafc',
                    color: appPacsFilter === key ? '#fff' : '#475569',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {loadingPatientPacs && <p className="muted">Đang tải danh sách phim chụp PACS của bệnh nhân...</p>}

            {patientPacsData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {patientPacsData.studies
                  .filter(s => appPacsFilter === 'all' || s.modality === appPacsFilter)
                  .map(study => (
                    <div key={study.study_id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: study.modality === 'CT' ? '#fef3c7' : study.modality === 'US' ? '#f3e8ff' : '#e0f2fe',
                              color: study.modality === 'CT' ? '#b45309' : study.modality === 'US' ? '#7e22ce' : '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}>
                              {study.modality}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{study.description}</h4>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                            Mã ca: <strong>{study.study_id}</strong> · Bộ phận: <strong>{study.body_part}</strong> · Ngày chụp: <strong>{study.date}</strong> · Đơn vị: {study.institution}
                          </small>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>BS CĐHA:</span>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{study.radiologist}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '14px' }}>
                        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '12px' }}>
                          <strong style={{ color: '#475569', display: 'block', marginBottom: '4px' }}>📝 Mô tả hình ảnh (Findings):</strong>
                          <p style={{ margin: 0, color: '#1e293b', lineHeight: 1.5 }}>{study.findings}</p>
                        </div>

                        <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #10b981', fontSize: '12px' }}>
                          <strong style={{ color: '#047857', display: 'block', marginBottom: '4px' }}>🎯 Kết luận (Impression):</strong>
                          <p style={{ margin: 0, color: '#064e3b', fontWeight: 600, lineHeight: 1.5 }}>{study.impression}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          type="button"
                          className="primary small-primary"
                          onClick={() => window.open(study.viewer_url, '_blank')}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#0284c7', borderColor: '#0284c7' }}
                        >
                          <ExternalLink size={14} /> Mở phim DICOM (OHIF Viewer)
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="notice" style={{ marginTop: '16px' }}>
              <ShieldCheck size={18} />
              {patientPacsData?.notice || 'Hệ thống PACS hỗ trợ giao thức DICOMweb WADO-RS hiển thị trực tiếp trên trình duyệt.'}
            </div>
          </section>
        )}

        {/* Tab: Đơn thuốc Quốc gia */}
        {view === 'prescriptions' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Toa thuốc điện tử Quốc gia</h3>
                <p>Đơn thuốc được kê từ các buổi khám trực tuyến có mã QR liên kết Cổng Quốc gia</p>
              </div>
            </div>
            <div className="prescription-demo-card">
              <div className="rx-badge">Rx</div>
              <div>
                <b>Hệ thống Quản lý Kê đơn thuốc điện tử Quốc gia (Bộ Y tế)</b>
                <p className="muted">
                  Bác sĩ sau khi khám có thể kê đơn thuốc điện tử và bấm "Đẩy lên Cổng Quốc gia" để nhận mã đơn thuốc chuẩn <code>{`{Mã CSKCB}-{Năm}-{Mã đơn}`}</code> kèm mã QR quét tại các nhà thuốc đạt chuẩn GPP trên toàn quốc.
                </p>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '15px', color: '#1e293b', fontWeight: 700 }}>
                📋 Danh sách đơn thuốc từ các đợt khám của bạn:
              </h4>
              <AppointmentList
                items={appointments.filter(a => a.status === 'completed' || a.status === 'in_progress')}
                doctors={doctors}
                isDoctor={isDoctor}
                onJoin={handleJoinConsultation}
                onPay={setQrAppointment}
                onCancel={handleCancelAppointment}
                onDownloadPdf={handleDownloadPdf}
              />
            </div>
          </section>
        )}

        {/* Tab: Cổng Giám định BHYT & Bảo lãnh viện phí */}
        {view === 'insurance' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Cổng Giám định BHYT & Quyền lợi Bảo hiểm Y tế</h3>
                <p>Tra cứu trực tuyến quyền lợi thẻ BHYT theo chuẩn BHXH Việt Nam (QĐ 1666/QĐ-BHXH)</p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>
                Nhập mã thẻ BHYT (15 ký tự hoặc mã số BHXH 10 số):
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Ví dụ: GD4797931812345 hoặc DN4010123456789..."
                  value={bhytCode}
                  onChange={e => setBhytCode(e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600, textTransform: 'uppercase' }}
                />
                <button
                  type="button"
                  className="primary"
                  onClick={handleCheckBhyt}
                  disabled={checkingBhyt || !bhytCode.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <ShieldCheck size={16} />
                  {checkingBhyt ? 'Đang tra cứu...' : 'Tra cứu thẻ BHYT'}
                </button>
              </div>
            </div>

            {bhytInfo && (
              <div style={{ background: 'linear-gradient(135deg, #0f766e, #115e59)', color: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(15,118,110,0.25)', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '14px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>BẢO HIỂM XÃ HỘI VIỆT NAM · THẺ BHYT ĐIỆN TỬ VSSID</span>
                    <h2 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 700 }}>{bhytInfo.patient_name}</h2>
                  </div>
                  <div style={{ background: '#fef08a', color: '#854d0e', padding: '6px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '14px' }}>
                    Mức hưởng: {bhytInfo.benefit_rate_percent}%
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <span style={{ opacity: 0.8 }}>Mã thẻ BHYT:</span>
                    <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>{bhytInfo.bhyt_code}</div>
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Nhóm đối tượng:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{bhytInfo.object_group}</div>
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Nơi ĐKKCB ban đầu:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{bhytInfo.primary_healthcare_facility}</div>
                  </div>
                  <div>
                    <span style={{ opacity: 0.8 }}>Thời hạn sử dụng:</span>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>{bhytInfo.valid_from} đến {bhytInfo.valid_to}</div>
                    <small style={{ color: '#99f6e4' }}>{bhytInfo.five_years_consecutive}</small>
                  </div>
                </div>

                <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: '6px', fontSize: '12px' }}>
                  ✅ <strong>Chi trả KCB từ xa:</strong> Đủ điều kiện hưởng BHYT cho các dịch vụ hội chẩn, tư vấn khám bệnh từ xa theo quy định hiện hành của Bộ Y tế.
                </div>
              </div>
            )}

            {/* Danh sách lịch hẹn có thể áp dụng BHYT */}
            <h4 style={{ margin: '20px 0 10px', fontSize: '15px' }}>Lịch hẹn áp dụng quyền lợi BHYT</h4>
            {appointments.filter(a => a.status === 'scheduled').length === 0 ? (
              <p className="muted">Hiện không có lịch hẹn nào đang chờ xử lý chiết khấu BHYT.</p>
            ) : (
              appointments.filter(a => a.status === 'scheduled').map(a => (
                <div className="result-row" key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <b>Lịch hẹn #{a.id}</b>
                    <small>{dateText(a.starts_at)} · {a.reason}</small>
                    {a.bhyt_discount ? (
                      <div style={{ color: '#0d9488', fontSize: '12px', fontWeight: 600, marginTop: '3px' }}>
                        🛡️ Đã áp dụng thẻ BHYT ({a.bhyt_code}): Giảm {a.bhyt_rate}% (-{money(a.bhyt_discount)})
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {a.bhyt_discount ? (
                      <span style={{ fontSize: '13px' }}>
                        Đồng chi trả: <b style={{ color: '#0f766e', fontSize: '15px' }}>{money(a.patient_pay_amount || (a.fee_amount - a.bhyt_discount))}</b>
                      </span>
                    ) : (
                      <>
                        <span>Viện phí gốc: <b>{money(a.fee_amount)}</b></span>
                        <button
                          className="primary"
                          onClick={() => handleApplyBhyt(a.id)}
                          disabled={applyingBhytId === a.id}
                          style={{ padding: '6px 14px', fontSize: '13px' }}
                        >
                          {applyingBhytId === a.id ? 'Đang áp dụng...' : '⚡ Áp dụng thẻ BHYT'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* PHÂN HỆ CỔNG GIÁM ĐỊNH BHYT QUỐC GIA (XML 4210 / QĐ 130) */}
            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileCheck size={20} color="#059669" /> Danh sách Hồ sơ Giám định BHYT Quốc gia (XML 4210)
                  </h4>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                    Xuất gói hồ sơ 5 bảng XML theo Quyết định 4210/QĐ-BYT & liên thông Cổng Giám định BHYT BHXH Việt Nam
                  </p>
                </div>
                <button
                  type="button"
                  className="secondary small-secondary"
                  onClick={loadClaims}
                  disabled={loadingClaims}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={14} /> Làm mới
                </button>
              </div>

              {loadingClaims ? (
                <p className="muted">Đang tải danh sách hồ sơ BHYT...</p>
              ) : bhytClaimsList.length === 0 ? (
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', textAlign: 'center', color: '#64748b' }}>
                  Chưa có hồ sơ đề nghị quyết toán BHYT nào được lập. Bác sĩ sẽ tự động lập hồ sơ khi hoàn tất ca khám trực tuyến.
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>Mã liên kết (MA_LK)</th>
                        <th style={{ padding: '10px 12px' }}>Thẻ BHYT</th>
                        <th style={{ padding: '10px 12px' }}>Mã bệnh (ICD-10)</th>
                        <th style={{ padding: '10px 12px' }}>Tổng chi phí</th>
                        <th style={{ padding: '10px 12px' }}>Quỹ BHYT chi</th>
                        <th style={{ padding: '10px 12px' }}>Người bệnh trả</th>
                        <th style={{ padding: '10px 12px' }}>Trạng thái Cổng GĐ</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bhytClaimsList.map(claim => (
                        <tr key={claim.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0369a1' }}>{claim.ma_lk}</td>
                          <td style={{ padding: '10px 12px' }}>{claim.ma_the_bhyt} ({claim.muc_huong}%)</td>
                          <td style={{ padding: '10px 12px' }}><code>{claim.ma_benh_chinh}</code></td>
                          <td style={{ padding: '10px 12px', fontWeight: 600 }}>{money(claim.t_tongchi)}</td>
                          <td style={{ padding: '10px 12px', color: '#16a34a', fontWeight: 700 }}>{money(claim.t_bhyttt)}</td>
                          <td style={{ padding: '10px 12px', color: '#dc2626' }}>{money(claim.t_bntt)}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: claim.status === 'approved' ? '#dcfce7' : '#fef3c7',
                              color: claim.status === 'approved' ? '#15803d' : '#b45309'
                            }}>
                              {claim.status === 'approved' ? `Đã duyệt: ${claim.gdbhyt_code || 'OK'}` : 'Chờ gửi giám định'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="secondary small-secondary"
                                onClick={() => handleViewXmlPackage(claim.appointment_id)}
                                style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> Xem XML
                              </button>
                              {claim.status !== 'approved' && (
                                <button
                                  type="button"
                                  className="primary small-primary"
                                  onClick={() => handleSubmitClaim(claim.appointment_id)}
                                  disabled={submittingClaimId === claim.appointment_id}
                                  style={{ fontSize: '11px', background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Check size={12} /> Gửi Cổng
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* VIEW: HỒ SƠ SỨC KHỎE GIA ĐÌNH (FAMILY HEALTH VAULT) */}
        {view === 'family' && (
          <section className="panel page-panel">
            <div className="panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={22} color="#0f766e" /> Hồ sơ Sức khỏe Gia đình (Family Health Vault)
                </h3>
                <p>Quản lý sổ y bạ, tiền sử bệnh và đặt lịch khám từ xa cho con nhỏ, bố mẹ già và người thân trong gia đình</p>
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => setShowAddFamilyModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} /> Thêm thành viên mới
              </button>
            </div>

            {loadingFamily ? (
              <p className="muted">Đang tải danh sách hồ sơ gia đình...</p>
            ) : familyMembers.length === 0 ? (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                <Users size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>Chưa có hồ sơ người thân nào</h4>
                <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '13px' }}>
                  Thêm hồ sơ con nhỏ hoặc cha mẹ lớn tuổi để theo dõi diễn biến sức khỏe và liên kết thẻ BHYT
                </p>
                <button type="button" className="primary" onClick={() => setShowAddFamilyModal(true)}>
                  <Plus size={16} /> Thêm người thân ngay
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {familyMembers.map(member => (
                  <div key={member.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: member.relationship === 'child' ? '#fef3c7' : member.relationship === 'parent' ? '#e0f2fe' : '#f3e8ff',
                          color: member.relationship === 'child' ? '#b45309' : member.relationship === 'parent' ? '#0369a1' : '#7e22ce',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '16px'
                        }}>
                          {member.full_name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>{member.full_name}</h4>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '2px 8px',
                              borderRadius: '10px'
                            }}>
                              {member.relationship === 'child' ? '👶 Con nhỏ' : member.relationship === 'parent' ? '👵 Cha/Mẹ' : member.relationship === 'spouse' ? '💍 Vợ/Chồng' : '👥 Người thân'}
                            </span>
                          </div>
                          <small style={{ color: '#64748b', fontSize: '12px', display: 'block', marginTop: '2px' }}>
                            Sinh ngày: <strong>{member.date_of_birth}</strong> · Giới tính: <strong>{member.gender === 'male' ? 'Nam' : 'Nữ'}</strong>
                          </small>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteFamily(member.id)}
                        style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                        title="Xóa hồ sơ"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Thẻ BHYT:</span>
                        <strong>{member.bhyt_code || 'Chưa cập nhật'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Nhóm máu:</span>
                        <strong>{member.blood_group || 'O+'}</strong>
                      </div>
                      {member.allergies && (
                        <div style={{ marginTop: '4px', color: '#b91c1c' }}>
                          ⚠️ <strong>Dị ứng:</strong> {member.allergies}
                        </div>
                      )}
                      {member.chronic_conditions && (
                        <div style={{ marginTop: '2px', color: '#4338ca' }}>
                          🏥 <strong>Bệnh nền:</strong> {member.chronic_conditions}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="primary small-primary"
                        onClick={() => {
                          setReason(`Khám cho ${member.full_name} (${member.relationship})`)
                          setShowBooking(true)
                        }}
                        style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <CalendarDays size={14} /> Đặt lịch khám cho {member.full_name.split(' ').slice(-1)[0]}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

                {/* VIEW: KẾT NỐI THIẾT BỊ Y TẾ THÔNG MINH (STANDALONE SCREEN) */}
        {view === 'devices' && (
          <SmartDevicesHub
            user={user}
            vitalsLogs={rpmVitals}
            onRefreshVitals={loadVitals}
            onNavigate={(v) => setView(v)}
            embedded={false}
          />
        )}

        {/* VIEW: GIÁM SÁT SINH HIỆU TỪ XA (RPM IoT & FDA Device Center) */}
        {view === 'vitals' && (
          <RPMDeviceCenter
            currentUser={user}
            patientId={user?.role === 'patient' ? user.id : (selectedPatientId || 1)}
            onBack={() => setView('overview')}
          />
        )}

        {/* Modal Thêm Thành viên Gia đình */}
        {showAddFamilyModal && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '480px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>Thêm Thành viên Gia đình</h3>
                <button type="button" onClick={() => setShowAddFamilyModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Họ và tên người thân *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Nguyễn Minh Khang"
                    value={famName}
                    onChange={e => setFamName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Mối quan hệ</label>
                    <select
                      value={famRel}
                      onChange={e => setFamRel(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="child">Con nhỏ</option>
                      <option value="parent">Cha / Mẹ</option>
                      <option value="spouse">Vợ / Chồng</option>
                      <option value="sibling">Anh / Chị / Em</option>
                      <option value="other">Người thân khác</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Giới tính</label>
                    <select
                      value={famGender}
                      onChange={e => setFamGender(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Ngày sinh (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={famDob}
                      onChange={e => setFamDob(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Mã thẻ BHYT (nếu có)</label>
                    <input
                      type="text"
                      placeholder="TE179..."
                      value={famBhyt}
                      onChange={e => setFamBhyt(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tiền sử dị ứng thuốc</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Dị ứng Penicillin, Paracetamol..."
                    value={famAllergies}
                    onChange={e => setFamAllergies(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Bệnh nền / Mãn tính</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Tăng huyết áp, Đái tháo đường..."
                    value={famConditions}
                    onChange={e => setFamConditions(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="secondary" onClick={() => setShowAddFamilyModal(false)}>
                  Hủy
                </button>
                <button type="button" className="primary" onClick={handleAddFamily} disabled={savingFamily}>
                  {savingFamily ? 'Đang lưu...' : 'Thêm hồ sơ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xem trước Gói XML 4210 */}
        {xmlModalPkg && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '780px', width: '90%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#064e3b' }}>
                    Gói Hồ sơ Giám định XML 4210 · {xmlModalPkg.ma_lk}
                  </h3>
                  <small style={{ color: '#64748b' }}>Bệnh nhân: {xmlModalPkg.patient_name} · Thẻ BHYT: {xmlModalPkg.ma_the_bhyt} ({xmlModalPkg.muc_huong}%)</small>
                </div>
                <button type="button" onClick={() => setXmlModalPkg(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ background: '#1e293b', color: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '11px', fontFamily: 'Consolas, monospace', maxHeight: '380px', overflowY: 'auto' }}>
                <pre style={{ margin: 0 }}>
                  {xmlModalPkg.xml1_tonghop}
                </pre>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    const blob = new Blob([xmlModalPkg.xml1_tonghop], { type: 'application/xml' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `XML4210_${xmlModalPkg.ma_lk}.xml`
                    a.click()
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} /> Tải file XML 4210
                </button>
                <button type="button" className="primary" onClick={() => setXmlModalPkg(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Thanh toán VietQR */}
        {view === 'payments' && (
          <section className="panel page-panel">
            <div className="panel-heading">
              <div>
                <h3>Thanh toán trực tuyến VietQR (Napas 247)</h3>
                <p>Khớp tiền tự động qua số tài khoản bệnh viện</p>
              </div>
            </div>
            {appointments.map(a => (
              <div className="result-row" key={a.id}>
                <div className="result-icon">
                  <CreditCard />
                </div>
                <div className="grow">
                  <b>Lịch hẹn #{a.id}</b>
                  <small>{dateText(a.starts_at)} · {a.reason}</small>
                  {a.refund_amount ? (
                    <span className="refund-badge">Đã hoàn lại: {money(a.refund_amount)}</span>
                  ) : null}
                </div>
                <b>{money(a.fee_amount)}</b>
                {a.status === 'confirmed' || a.status === 'completed' ? (
                  <span className="status confirmed">Đã thanh toán</span>
                ) : a.status === 'cancelled' ? (
                  <span className="status cancelled">Đã hủy</span>
                ) : (
                  <button className="primary" onClick={() => setQrAppointment(a)}>
                    <QrCode size={15} /> Quét VietQR
                  </button>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Tab: Trung tâm Quản trị & Cài đặt Hệ thống (Admin Dashboard - Không trùng lặp nav bar) */}
        {(view === 'admin' || view.startsWith('admin-')) && (
          <section className="panel page-panel" style={{ padding: 0, border: 'none', background: 'transparent' }}>
            <AdminDashboard
              activeTab={view.startsWith('admin-') ? (view.replace('admin-', '') as any) : 'settings'}
              onTabChange={(t) => setView(`admin-${t}`)}
              hideInternalNav={true}
            />
          </section>
        )}

        {/* Tab: Bàn Sàng lọc & Điều phối Điều dưỡng (Triage Desk) */}
        {view === 'triage' && (
          isNurse ? (
            <NurseDashboard
              nurse={user}
              onNavigate={(v) => setView(v)}
              onSelectPatientForDoctor={(id) => {
                const targetAppt = appointments.find(a => a.id === id)
                if (targetAppt) {
                  setToast(`Đã điều phối bệnh nhân #${id} vào buồng bác sĩ`)
                }
              }}
            />
          ) : (
            <section className="panel page-panel">
              <TriageDesk />
            </section>
          )
        )}

        {/* Tab: Trang Tài khoản Bệnh nhân (Patient Profile Page) */}
        {view === 'profile' && (
          <PatientProfilePage
            currentUser={user}
            onLogout={logout}
            onUpdateUser={(updated) => setUser(updated)}
            onNavigate={(v) => setView(v)}
          />
        )}

        {/* Modal đặt lịch khám */}
        {showBooking && (
          <div className="modal-backdrop">
            <form className="modal booking-modal" onSubmit={book}>
              <div className="booking-modal-drag-bar" />
              <div className="booking-modal-header panel-heading">
                <div>
                  <h3>Đặt lịch khám trực tuyến</h3>
                  <p>Chọn chuyên khoa, bác sĩ và ca trực chống quá tải</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setShowBooking(false)}>
                  <X />
                </button>
              </div>

              <div className="booking-modal-body">
                <label>
                  Khoa / Chuyên khoa
                  <select
                    value={selectedDeptId}
                    onChange={e => {
                      setSelectedDeptId(e.target.value)
                      setDoctorId('')
                      setSelectedShiftId(null)
                    }}
                  >
                    <option value="">-- Tất cả chuyên khoa --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.code} - {d.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Bác sĩ tiếp nhận
                  <select
                    value={doctorId}
                    onChange={e => {
                      setDoctorId(e.target.value)
                      setSelectedShiftId(null)
                    }}
                    required
                  >
                    <option value="">-- Chọn Bác sĩ chuyên khoa --</option>
                    {doctors
                      .filter((d: any) => !selectedDeptId || String(d.department_id) === String(selectedDeptId))
                      .map(d => (
                        <option key={d.id} value={d.id}>
                          {d.full_name} {d.cchn ? `(${d.cchn})` : ''}
                        </option>
                      ))}
                  </select>
                </label>

                {/* Lịch trực chuyên khoa & Hạn ngạch ca khám (Anti-overload) */}
                {doctorId && doctorShifts.length > 0 && (
                  <div className="booking-shift-section">
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                      Chọn Ca trực bác sĩ (Định mức chống quá tải):
                    </label>
                    <div className="booking-shifts-grid">
                      {doctorShifts.map(s => {
                        const isSelected = selectedShiftId === s.id
                        const isFull = s.is_overloaded
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={isFull}
                            onClick={() => {
                              setSelectedShiftId(s.id)
                              setStartsAt(`${s.shift_date}T${s.start_time}:00`)
                            }}
                            className={`shift-card-btn ${isSelected ? 'selected' : ''} ${isFull ? 'full-quota' : ''}`}
                          >
                            <div className="shift-card-title">
                              {s.shift_type === 'morning' ? '☀️ Ca sáng' : s.shift_type === 'afternoon' ? '🌤️ Ca chiều' : '🌙 Ca tối'} ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                            </div>
                            <div className="shift-card-date">Ngày: {s.shift_date}</div>
                            <div className={`shift-card-quota ${isFull ? 'danger' : 'success'}`}>
                              {isFull ? '⚠️ ĐÃ ĐỦ ĐỊNH MỨC' : `Còn ${s.available_slots}/${s.max_patients} lượt khám`}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <label>
                  Ngày và giờ khám
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={e => setStartsAt(e.target.value)}
                    required
                  />
                </label>

                <label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span>Lý do khám / Triệu chứng ban đầu</span>
                    <button
                      type="button"
                      onClick={handleAiTriage}
                      disabled={triageLoading || !reason.trim()}
                      style={{
                        background: '#f0fdfa',
                        color: '#0f766e',
                        border: '1px solid #99f6e4',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Sparkles size={13} />
                      {triageLoading ? 'AI đang phân tích...' : '🤖 AI Sàng lọc & Gợi ý Khoa'}
                    </button>
                  </div>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    required
                    minLength={3}
                    placeholder="Mô tả triệu chứng bệnh của bạn..."
                    rows={3}
                  />
                </label>

                {triageResult && (
                  <div style={{
                    margin: '6px 0 10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: triageResult.emergency_alert ? '2px solid #ef4444' : '1px solid #99f6e4',
                    background: triageResult.emergency_alert ? '#fef2f2' : '#f0fdfa',
                    fontSize: '13px'
                  }}>
                    {triageResult.emergency_alert ? (
                      <div style={{ color: '#b91c1c', fontWeight: 700, marginBottom: '4px' }}>
                        🚨 {triageResult.emergency_alert}
                      </div>
                    ) : (
                      <div style={{ color: '#0f766e', fontWeight: 700, marginBottom: '4px' }}>
                        ✨ Gợi ý phân luồng AI: {triageResult.recommended_department_name} ({triageResult.urgency_label})
                      </div>
                    )}
                    <p style={{ margin: 0, fontSize: '12px', color: '#334155' }}>{triageResult.explanation}</p>
                  </div>
                )}

                <div className="notice booking-fee-notice">
                  Phí khám chuyên khoa: <strong>500.000 ₫</strong>. Có thể áp dụng giảm trừ thẻ BHYT trực tuyến sau khi tạo lịch.
                </div>
              </div>

              <div className="booking-modal-footer">
                <button className="primary full booking-submit-btn" type="submit">
                  📅 Xác nhận tạo lịch khám
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Hủy lịch hẹn & Hoàn tiền tự động */}
        {cancelModalAppt && (
          <div className="modal-backdrop">
            <div className="modal" style={{ maxWidth: '500px', width: '100%' }}>
              <div className="panel-heading">
                <div>
                  <h3>Hủy lịch khám & Hoàn tiền</h3>
                  <p>Lịch hẹn #{cancelModalAppt.id} · {dateText(cancelModalAppt.starts_at)}</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setCancelModalAppt(null)}>
                  <X />
                </button>
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', marginBottom: '14px', fontSize: '13px', color: '#166534' }}>
                <strong>💰 Chính sách hoàn tiền 100%:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px' }}>
                  <li>Hủy trước giờ khám được hoàn <strong>100% viện phí</strong> ({money(cancelModalAppt.fee_amount)}).</li>
                  <li>Kích hoạt hoàn tiền tự động qua Napas 247/VietQR và cập nhật hệ thống.</li>
                </ul>
              </div>

              <label>
                Lý do hủy lịch khám
                <textarea
                  value={cancelReasonText}
                  onChange={e => setCancelReasonText(e.target.value)}
                  required
                  minLength={3}
                  placeholder="Vui lòng cho biết lý do hủy lịch..."
                  rows={3}
                />
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setCancelModalAppt(null)}
                  style={{ flex: 1 }}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="danger"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  style={{ flex: 2, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, padding: '10px', cursor: 'pointer' }}
                >
                  {cancelling ? 'Đang hủy...' : 'Xác nhận hủy & Hoàn tiền'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal VietQR thanh toán tự động */}
        {qrAppointment && (
          <VietQRModal
            appointment={qrAppointment}
            onClose={() => setQrAppointment(null)}
            onPaymentSuccess={() => {
              setQrAppointment(null)
              setToast('Thanh toán VietQR thành công! Lịch hẹn đã được xác nhận.')
              if (user) loadDashboard(user)
            }}
          />
        )}

        {/* Modal văn bản đồng thuận Nghị định 13/2023/NĐ-CP */}
        {pendingConsentAppointment && (
          <ConsentModal
            appointmentId={pendingConsentAppointment.id}
            onClose={() => setPendingConsentAppointment(null)}
            onAgreed={() => {
              const appt = pendingConsentAppointment
              setPendingConsentAppointment(null)
              setActiveAppointment(appt)
            }}
          />
        )}

        {/* Màn hình cuộc gọi đến (Bác sĩ gọi - Màn hình điện thoại sáng lên & Đổ chuông) */}
        {incomingCall && (
          <IncomingCallModal
            call={incomingCall}
            onAccept={handleAcceptIncomingCall}
            onDecline={handleDeclineIncomingCall}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Chỉ hiển thị trên thiết bị di động < 768px) */}
      <nav className="mobile-bottom-nav">
        {mobileNavItems.map(([id, label, Icon]: any) => (
          <button
            key={id}
            className={`mobile-nav-item ${view === id ? 'selected' : ''}`}
            onClick={() => setView(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function Stat({ icon, label, value, hint }: any) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

function Quick({ label, sub, icon, onClick }: any) {
  return (
    <button className="quick-row" onClick={onClick}>
      <div className="quick-icon">{icon}</div>
      <span>
        <b>{label}</b>
        <small>{sub}</small>
      </span>
      <ArrowRight size={16} />
    </button>
  )
}

function Empty({ text }: any) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText />
      </div>
      <b>Chưa có dữ liệu</b>
      <p>{text}</p>
    </div>
  )
}

function AppointmentList({
  items,
  doctors,
  isDoctor,
  onJoin,
  onPay,
  onCancel,
  onDownloadPdf
}: any) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  if (!items.length) {
    return <Empty text="Chưa có lịch hẹn nào. Hãy đặt lịch mới để bắt đầu khám." />
  }

  const paginated = items.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div>
      <div className="appointment-list">
        {paginated.map((a: Appointment) => {
        const docName = doctors.find((d: any) => d.id === a.doctor_id)?.full_name || `Bác sĩ #${a.doctor_id}`
        const statusMap: Record<string, string> = {
          scheduled: 'Chờ thanh toán',
          confirmed: 'Đã xác nhận',
          in_progress: 'Đang khám',
          completed: 'Đã hoàn tất',
          cancelled: 'Đã hủy'
        }

        return (
          <div className="appointment-row" key={a.id}>
            <div className="date-block">
              <b>{new Date(a.starts_at).toLocaleDateString('vi-VN', { day: '2-digit' })}</b>
              <small>TH {new Date(a.starts_at).toLocaleDateString('vi-VN', { month: '2-digit' })}</small>
            </div>

            <div className="appointment-info">
              <b>{docName}</b>
              <small>{dateText(a.starts_at)}</small>
              <span className="reason">{a.reason}</span>
              {a.bhyt_discount ? (
                <div style={{ color: '#0d9488', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                  🛡️ BHYT chi trả {a.bhyt_rate}% (-{money(a.bhyt_discount)}) · Cần thanh toán: {money(a.patient_pay_amount || (a.fee_amount - a.bhyt_discount))}
                </div>
              ) : null}
              {a.status === 'cancelled' && a.refund_amount ? (
                <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                  💰 Đã hoàn tiền 100% ({money(a.refund_amount)}) {a.refund_reason ? `· Lý do: ${a.refund_reason}` : ''}
                </div>
              ) : null}
            </div>

            <span className={`status ${a.status}`}>
              {statusMap[a.status] || a.status}
            </span>

            <div className="row-actions">
              {/* Nút vào khám hoặc gọi video */}
              {!['completed', 'cancelled'].includes(a.status) && (
                <button className="small-primary" onClick={() => onJoin(a)}>
                  {isDoctor ? <Stethoscope size={15} /> : <Video size={15} />}
                  {isDoctor ? 'Vào phòng khám' : 'Vào khám'}
                </button>
              )}

              {/* Nút tải PDF nếu đã hoàn tất */}
              {a.status === 'completed' && (
                <button
                  className="small-pdf"
                  onClick={() => onDownloadPdf(a.id)}
                  title="Tải Phiếu khám & Đơn thuốc PDF có ký số"
                >
                  <FileDown size={15} /> PDF
                </button>
              )}

              {/* Nút thanh toán VietQR nếu là bệnh nhân và chưa thanh toán */}
              {!isDoctor && a.status === 'scheduled' && (
                <button
                  className="small-qr"
                  onClick={() => onPay(a)}
                  title="Thanh toán chuyển khoản VietQR"
                >
                  <QrCode size={15} /> Trả phí
                </button>
              )}

              {/* Nút hủy lịch */}
              {['scheduled', 'confirmed'].includes(a.status) && (
                <button
                  className="small-cancel"
                  onClick={() => onCancel(a)}
                  title="Hủy lịch hẹn"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        )
      })}
      </div>

      <Pagination
        currentPage={page}
        totalItems={items.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20]}
      />
    </div>
  )
}
