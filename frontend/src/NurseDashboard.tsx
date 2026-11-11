import React, { useState, useEffect, useMemo } from 'react'
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Weight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  User,
  ShieldCheck,
  Stethoscope,
  RefreshCw,
  Search,
  Flame,
  AlertOctagon,
  Building2,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Phone,
  CreditCard,
  FileText,
  UserCheck,
  ClipboardCheck,
  PlusCircle,
  Calendar,
  MapPin,
  Check,
  QrCode,
  ArrowRight,
  Eye,
  X
} from 'lucide-react'
import {
  TriageItem,
  TriageAssessmentData,
  getTriageQueue,
  assessTriage,
  identifyPatientByCCCD,
  PatientIdentifyResult,
  Appointment,
  NurseShiftItem,
  NurseItem,
  getNurses,
  getNurseShifts,
  createNurseShift,
  updateNurseShift,
  assignNurseToAppointment,
  recordRPMVitals,
  getAppointmentDocuments,
  getConsultationMessages,
  sendConsultationMessage,
  type AppointmentDocument,
  type ConsultationMessage,
  request
} from './api'
import { Pagination } from './Pagination'
import { PatientIdentificationModal } from './PatientIdentificationModal'
import { readBloodPressureBLE, isWebBluetoothSupported } from './bluetoothService'
import './nurse-sanctuary.css'

interface NurseDashboardProps {
  nurse: any
  initialTab?: 'triage' | 'appointments' | 'shifts'
  onSelectPatientForDoctor?: (appointmentId: number) => void
  onNavigate?: (view: string) => void
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({
  nurse,
  initialTab,
  onSelectPatientForDoctor,
  onNavigate
}) => {
  const [queue, setQueue] = useState<TriageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'waiting_room' | 'dispatched' | 'urgent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [triagePage, setTriagePage] = useState(1)
  const [triagePageSize, setTriagePageSize] = useState(8)

  useEffect(() => {
    setTriagePage(1)
  }, [filterStatus, searchQuery])

  const filteredQueue = useMemo(() => {
    return queue
      .filter(item => {
        if (filterStatus === 'pending') return item.triage_status === 'pending'
        if (filterStatus === 'waiting_room') return item.triage_status === 'waiting_room' || item.status === 'waiting'
        if (filterStatus === 'dispatched') return item.triage_status === 'dispatched'
        if (filterStatus === 'urgent') return item.triage_level === 'emergency' || item.triage_level === 'priority'
        return true
      })
      .filter(item =>
        searchQuery === '' ||
        item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()))
      )
  }, [queue, filterStatus, searchQuery])

  const totalTriagePages = Math.ceil(filteredQueue.length / triagePageSize) || 1
  const activeTriagePage = Math.min(triagePage, totalTriagePages)
  const paginatedQueue = useMemo(() => {
    const start = (activeTriagePage - 1) * triagePageSize
    return filteredQueue.slice(start, start + triagePageSize)
  }, [filteredQueue, activeTriagePage, triagePageSize])

  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null)

  // Tabs for Patient Intake: Vitals / Documents / Waiting Room Chat
  const [intakeTab, setIntakeTab] = useState<'vitals' | 'docs' | 'chat'>('vitals')
  const [patientDocs, setPatientDocs] = useState<AppointmentDocument[]>([])
  const [loadingPatientDocs, setLoadingPatientDocs] = useState(false)
  const [nurseChatMessages, setNurseChatMessages] = useState<ConsultationMessage[]>([])
  const [nurseChatInput, setNurseChatInput] = useState('')
  const [nurseSendingMsg, setNurseSendingMsg] = useState(false)
  const [nurseLightboxImg, setNurseLightboxImg] = useState<{ url: string; title: string } | null>(null)

  const loadPatientDocs = async (apptId: number) => {
    try {
      setLoadingPatientDocs(true)
      const docs = await getAppointmentDocuments(apptId)
      setPatientDocs(docs)
    } catch (e) {
      console.warn('Error loading patient docs:', e)
    } finally {
      setLoadingPatientDocs(false)
    }
  }

  const loadNurseChat = async (apptId: number) => {
    try {
      const msgs = await getConsultationMessages(apptId)
      setNurseChatMessages(msgs)
    } catch (e) {
      console.warn('Error loading nurse chat:', e)
    }
  }

  const handleNurseSendChat = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : nurseChatInput
    if (!textToSend.trim() || !selectedItem) return
    setNurseSendingMsg(true)
    try {
      await sendConsultationMessage(selectedItem.appointment_id, {
        content: textToSend.trim(),
        message_type: 'text'
      })
      setNurseChatInput('')
      loadNurseChat(selectedItem.appointment_id)
    } catch (e: any) {
      alert('Lỗi gửi tin nhắn: ' + (e.message || 'Vui lòng thử lại'))
    } finally {
      setNurseSendingMsg(false)
    }
  }

  const [toastMessage, setToastMessage] = useState('')

  // Vital signs form states
  const [pulse, setPulse] = useState<number | ''>('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [temperature, setTemperature] = useState<number | ''>('')
  const [spo2, setSpo2] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')
  const [height, setHeight] = useState<number | ''>('')
  const [triageLevel, setTriageLevel] = useState<'normal' | 'priority' | 'emergency'>('normal')
  const [triageNotes, setTriageNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Nhận diện Bệnh nhân CCCD / VNeID
  const [showCccdDock, setShowCccdDock] = useState(false)
  const [cccdSearch, setCccdSearch] = useState('')
  const [identifying, setIdentifying] = useState(false)
  const [identifiedPatient, setIdentifiedPatient] = useState<PatientIdentifyResult | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [bleScanning, setBleScanning] = useState(false)

  // Phân hệ Lịch khám & Ca trực Điều dưỡng
  const [mainTab, setMainTab] = useState<'triage' | 'appointments' | 'shifts'>(initialTab || 'triage')

  useEffect(() => {
    if (initialTab) {
      setMainTab(initialTab)
      if (initialTab === 'appointments') loadAppointments()
      if (initialTab === 'shifts') loadShifts()
    }
  }, [initialTab])

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppts, setLoadingAppts] = useState(false)
  const [apptDateFilter, setApptDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [apptStatusFilter, setApptStatusFilter] = useState<string>('all')
  const [apptSearch, setApptSearch] = useState('')

  const [nurseShifts, setNurseShifts] = useState<NurseShiftItem[]>([])
  const [nursesList, setNursesList] = useState<NurseItem[]>([])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false)
  const [newShiftNurseId, setNewShiftNurseId] = useState<number>(nurse?.id || 1)
  const [newShiftDate, setNewShiftDate] = useState(new Date().toISOString().split('T')[0])
  const [newShiftType, setNewShiftType] = useState('morning')
  const [newDeskName, setNewDeskName] = useState('Bàn Tiếp đón Triage 01')
  const [newMaxPatients, setNewMaxPatients] = useState(30)
  const [handoverNoteDraft, setHandoverNoteDraft] = useState('')
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null)

  const loadAppointments = async () => {
    try {
      setLoadingAppts(true)
      const data = await request<Appointment[]>('/api/v1/appointments')
      setAppointments(data)
    } catch (err: any) {
      console.error('Lỗi tải danh sách lịch khám:', err)
    } finally {
      setLoadingAppts(false)
    }
  }

  const loadShifts = async () => {
    try {
      setLoadingShifts(true)
      const [shifts, nurses] = await Promise.all([
        getNurseShifts(),
        getNurses().catch(() => [])
      ])
      setNurseShifts(shifts)
      setNursesList(nurses)
      const myShift = shifts.find(s => s.nurse_id === nurse?.id && s.shift_date === new Date().toISOString().split('T')[0])
      if (myShift && myShift.handover_notes) {
        setHandoverNoteDraft(myShift.handover_notes)
      }
    } catch (err: any) {
      console.error('Lỗi tải ca trực điều dưỡng:', err)
    } finally {
      setLoadingShifts(false)
    }
  }

  const handleAssignSelf = async (appointmentId: number) => {
    try {
      const myCurrentShift = nurseShifts.find(s => s.nurse_id === nurse?.id && s.is_active)
      await assignNurseToAppointment(appointmentId, {
        nurse_id: nurse?.id || 1,
        nurse_shift_id: myCurrentShift ? myCurrentShift.id : undefined
      })
      setToastMessage(`✅ Đã nhận tiếp đón ca khám #${appointmentId}!`)
      loadAppointments()
      loadQueue()
    } catch (err: any) {
      setToastMessage(err.message || 'Lỗi khi nhận ca khám')
    }
  }

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createNurseShift({
        nurse_id: Number(newShiftNurseId),
        shift_date: newShiftDate,
        shift_type: newShiftType,
        desk_name: newDeskName,
        max_patients: Number(newMaxPatients),
        start_time: newShiftType === 'morning' ? '07:00' : newShiftType === 'afternoon' ? '13:00' : '17:00',
        end_time: newShiftType === 'morning' ? '11:30' : newShiftType === 'afternoon' ? '17:00' : '22:00'
      })
      setToastMessage('✅ Đã tạo mới ca trực cho điều dưỡng thành công!')
      setShowCreateShiftModal(false)
      loadShifts()
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo ca trực')
    }
  }

  const handleSaveHandover = async (shiftId: number) => {
    try {
      await updateNurseShift(shiftId, {
        handover_notes: handoverNoteDraft
      })
      setToastMessage('✅ Đã lưu sổ giao ban ca trực thành công!')
      setEditingShiftId(null)
      loadShifts()
    } catch (err: any) {
      alert(err.message || 'Lỗi lưu sổ giao ban')
    }
  }

  const handleBleAutoFetch = async (useSimulator: boolean = false) => {
    setBleScanning(true)
    try {
      let reading: any = null
      if (!useSimulator && isWebBluetoothSupported()) {
        try {
          const bp = await readBloodPressureBLE()
          reading = {
            systolic: bp.systolic,
            diastolic: bp.diastolic,
            pulse: bp.pulse,
            deviceName: bp.deviceName || 'A&D Medical BLE'
          }
        } catch (bleErr: any) {
          throw bleErr
        }
      } else {
        const testBps = [
          { s: 120, d: 80, p: 72, name: 'Omron HEM-7361T BLE (Chuẩn ESH)' },
          { s: 135, d: 88, p: 84, name: 'A&D UA-651BLE (Chuẩn AAMI)' },
          { s: 142, d: 92, p: 90, name: 'Roche Accu-Chek Instant BLE' }
        ]
        const picked = testBps[Math.floor(Math.random() * testBps.length)]
        reading = { systolic: picked.s, diastolic: picked.d, pulse: picked.p, deviceName: picked.name }
      }

      if (reading && reading.systolic && reading.diastolic) {
        setBloodPressure(`${reading.systolic}/${reading.diastolic}`)
        if (reading.pulse) setPulse(reading.pulse)
        setToastMessage(`✅ Đã nhận số đo từ ${reading.deviceName}: ${reading.systolic}/${reading.diastolic} mmHg - Mạch ${reading.pulse} bpm`)
      }
    } catch (err: any) {
      setToastMessage(err.message || 'Không thể đọc số đo từ thiết bị Bluetooth')
    } finally {
      setBleScanning(false)
    }
  }

  const handleIdentifyPatient = async (targetCccd?: string) => {
    const code = (targetCccd || cccdSearch).trim()
    if (!code) {
      setToastMessage('Vui lòng nhập 12 số CCCD hoặc quét mã QR VNeID')
      return
    }
    setIdentifying(true)
    try {
      const res = await identifyPatientByCCCD(code)
      setIdentifiedPatient(res)
      setToastMessage(res.message)
    } catch (e) {
      setToastMessage(e instanceof Error ? e.message : 'Lỗi nhận diện CCCD/VNeID')
    } finally {
      setIdentifying(false)
    }
  }

  const handleApplyIdentifiedPatient = (patient: PatientIdentifyResult) => {
    const foundInQueue = queue.find(q =>
      (patient.patient_id && q.patient_id === patient.patient_id) ||
      (patient.full_name && q.patient_name.toLowerCase() === patient.full_name.toLowerCase())
    )
    if (foundInQueue) {
      handleSelectItem(foundInQueue)
      setToastMessage(`Đã chọn bệnh nhân ${patient.full_name} trong hàng đợi tiếp đón`)
    } else {
      const allergyNote = patient.allergies ? `[Dị ứng: ${patient.allergies}]` : ''
      const chronicNote = patient.chronic_conditions && patient.chronic_conditions.length > 0
        ? `[Bệnh nền: ${patient.chronic_conditions.map(c => c.display).join(', ')}]`
        : ''
      const priorVisitsNote = patient.total_visits > 0
        ? `[Bệnh nhân cũ: ${patient.total_visits} lần khám trước]`
        : '[Bệnh nhân mới]'
      setTriageNotes(`${priorVisitsNote} ${allergyNote} ${chronicNote}`.trim())
      setToastMessage(`Đã nạp tiền sử bệnh án của ${patient.full_name} vào phiếu tiếp đón`)
    }
  }

  const loadQueue = async () => {
    setLoading(true)
    try {
      const data = await getTriageQueue()
      setQueue(data)
    } catch (e) {
      console.error('Không tải được hàng đợi sàng lọc:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
    const timer = setInterval(loadQueue, 15000)
    return () => clearInterval(timer)
  }, [])

  // Auto-alert conditions
  const isHighTemp = typeof temperature === 'number' && temperature >= 38.5
  const isLowSpo2 = typeof spo2 === 'number' && spo2 < 95
  const isHighPulse = typeof pulse === 'number' && (pulse > 100 || pulse < 50)

  useEffect(() => {
    if (isLowSpo2 || (typeof temperature === 'number' && temperature >= 39.5)) {
      setTriageLevel('emergency')
    } else if (isHighTemp || isHighPulse) {
      setTriageLevel('priority')
    }
  }, [temperature, spo2, pulse, isLowSpo2, isHighTemp, isHighPulse])

  const pendingCount = queue.filter(q => q.triage_status === 'pending').length
  const waitingCount = queue.filter(q => q.triage_status === 'waiting_room' || q.status === 'waiting').length
  const dispatchedCount = queue.filter(q => q.triage_status === 'dispatched').length
  const urgentCount = queue.filter(q => q.triage_level === 'emergency' || q.triage_level === 'priority').length

  const handleSelectItem = (item: TriageItem) => {
    setSelectedItem(item)
    setIntakeTab('vitals')
    loadPatientDocs(item.appointment_id)
    loadNurseChat(item.appointment_id)

    setPulse(item.pulse || '')
    setBloodPressure(item.blood_pressure || '')
    setTemperature(item.temperature || '')
    setSpo2(item.spo2 || '')
    setWeight(item.weight || '')
    setHeight(item.height || '')
    setTriageLevel(item.triage_level || 'normal')
    setTriageNotes(item.triage_notes || '')
  }

  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    setIsSubmitting(true)
    try {
      const assessment: TriageAssessmentData = {
        pulse: pulse === '' ? undefined : Number(pulse),
        blood_pressure: bloodPressure || undefined,
        temperature: temperature === '' ? undefined : Number(temperature),
        spo2: spo2 === '' ? undefined : Number(spo2),
        weight: weight === '' ? undefined : Number(weight),
        height: height === '' ? undefined : Number(height),
        triage_level: triageLevel,
        triage_notes: triageNotes
      }

      await assessTriage(selectedItem.appointment_id, assessment)

      // Tự động đồng bộ số đo thực tế vào hồ sơ RPM Vital Logs toàn viện
      if (selectedItem.patient_id) {
        let sysNum: number | undefined
        let diaNum: number | undefined
        if (bloodPressure && bloodPressure.includes('/')) {
          const parts = bloodPressure.split('/')
          sysNum = Number(parts[0].trim())
          diaNum = Number(parts[1].trim())
        }
        recordRPMVitals({
          patient_id: selectedItem.patient_id,
          device_type: 'blood_pressure',
          device_name: 'Bàn tiếp đón Triage Điều dưỡng',
          connection_method: 'manual',
          systolic: sysNum,
          diastolic: diaNum,
          pulse: pulse === '' ? undefined : Number(pulse),
          spo2_percent: spo2 === '' ? undefined : Number(spo2),
          temperature_celsius: temperature === '' ? undefined : Number(temperature),
          weight_kg: weight === '' ? undefined : Number(weight)
        }).catch(console.warn)
      }

      setToastMessage(`✓ Đã lưu sinh hiệu & chuyển bệnh nhân ${selectedItem.patient_name} vào Phòng chờ Bác sĩ!`)
      setTimeout(() => setToastMessage(''), 4000)
      setSelectedItem(null)
      loadQueue()

      if (onSelectPatientForDoctor) {
        onSelectPatientForDoctor(selectedItem.appointment_id)
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu kết quả sàng lọc')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calcBMI = () => {
    if (typeof weight === 'number' && typeof height === 'number' && height > 0) {
      const hM = height / 100
      const bmi = weight / (hM * hM)
      return bmi.toFixed(1)
    }
    return null
  }
  const bmiVal = calcBMI()

  return (
    <div className="nurse-dashboard-container">
      {/* 1. EXECUTIVE COMMAND HEADER */}
      <header className="nurse-command-header">
        <div className="nurse-header-main-row">
          {/* Identity & Status */}
          <div className="nurse-identity-area">
            <div className="nurse-avatar-box">
              <div className="nurse-avatar">
                {nurse?.full_name ? nurse.full_name.charAt(0) : 'Đ'}
              </div>
              <span className="nurse-avatar-dot" title="Bàn tiếp đón trực tuyến" />
            </div>
            <div className="nurse-name-meta">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2>{nurse?.full_name || 'Điều dưỡng tiếp đón'}</h2>
                <span className="nurse-status-chip online">
                  <span className="live-dot" /> Đang trực tiếp đón
                </span>
              </div>
              <p>Khoa Khám Bệnh & Cấp Cứu • Bàn Sàng lọc Triage & Điều phối Lâm sàng</p>
            </div>
          </div>

          {/* 4 Stat Clusters */}
          <div className="nurse-stats-cluster">
            <div className="nurse-stat-pill" onClick={() => setFilterStatus('pending')}>
              <span>Chờ đo sinh hiệu</span>
              <strong>{pendingCount}</strong>
            </div>
            <div className="nurse-stat-pill" onClick={() => setFilterStatus('waiting_room')}>
              <span>Phòng chờ ảo</span>
              <strong>{waitingCount}</strong>
            </div>
            <div className="nurse-stat-pill" onClick={() => setFilterStatus('dispatched')}>
              <span>Đã vào buồng</span>
              <strong>{dispatchedCount}</strong>
            </div>
            <div className="nurse-stat-pill urgent" onClick={() => setFilterStatus('urgent')}>
              <span>Cấp cứu ESI</span>
              <strong>{urgentCount}</strong>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="nurse-header-actions">
            <button className="btn-nurse-refresh" onClick={loadQueue} title="Làm mới hàng đợi">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
            <button
              className={`btn-nurse-toggle-cccd ${showCccdDock ? 'active' : ''}`}
              onClick={() => setShowCccdDock(v => !v)}
              title="Tra cứu CCCD gắn chip & VNeID"
            >
              <CreditCard size={15} />
              <span>{showCccdDock ? 'Đóng tra cứu CCCD' : 'CCCD / VNeID'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* TOAST ALERT */}
      {toastMessage && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #10b981',
          color: '#065f46',
          padding: '10px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. COLLAPSIBLE CCCD & VNEID DOCK */}
      {showCccdDock && (
        <section className="nurse-cccd-dock">
          <div className="cccd-dock-header">
            <div className="cccd-dock-title">
              <h3>Tra Cứu & Nhận Diện Hồ Sơ EMR Bằng Thẻ CCCD Gắn Chip / VNeID</h3>
            </div>
          </div>

          <div className="cccd-dock-input-row">
            <div className="cccd-input-box">
              <Search size={16} color="#059669" />
              <input
                type="text"
                placeholder="Nhập 12 số CCCD, mã số định danh hoặc quét QR Code VNeID..."
                value={cccdSearch}
                onChange={e => setCccdSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleIdentifyPatient(); }}
              />
            </div>
            <button
              type="button"
              className="btn-cccd-search"
              onClick={() => handleIdentifyPatient()}
              disabled={identifying}
            >
              {identifying ? 'Đang tra cứu cơ sở dữ liệu...' : 'Kiểm Tra Định Danh'}
            </button>
          </div>

          {/* Identified Patient Preview Result */}
          {identifiedPatient && identifiedPatient.full_name && (
            <div style={{
              marginTop: '14px',
              padding: '14px 18px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#d1fae5',
                  color: '#065f46',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px'
                }}>
                  {identifiedPatient.full_name?.charAt(0) || 'BN'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '15px', color: '#0f172a' }}>{identifiedPatient.full_name}</strong>
                    <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      ✓ VNeID Mức {identifiedPatient.vneid_level || 2}
                    </span>
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Mã PID: {identifiedPatient.pid || `BN-${identifiedPatient.patient_id || 'MOI'}`}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                    CCCD: <strong style={{ color: '#334155' }}>{identifiedPatient.identity_card || cccdSearch}</strong> &bull; SĐT: {identifiedPatient.phone_number || '---'} &bull; Số lần khám trước: <strong style={{ color: '#0f766e' }}>{identifiedPatient.total_visits}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleApplyIdentifiedPatient(identifiedPatient)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#059669',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ⚡ Nạp Vào Bàn Triage
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryModal(true)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <FileText size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Hồ Sơ EMR Toàn Viện
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. SEGMENTED NAVIGATION TABS */}
      <div className="nurse-nav-tabs-bar">
        <div className="nurse-nav-tabs-group">
          <button
            type="button"
            className={`nurse-tab-capsule ${mainTab === 'triage' ? 'active' : ''}`}
            onClick={() => setMainTab('triage')}
          >
            <Stethoscope size={15} />
            <span>Bàn Tiếp Đón Triage</span>
            <span className="tab-badge-count">{queue.length}</span>
          </button>

          <button
            type="button"
            className={`nurse-tab-capsule ${mainTab === 'appointments' ? 'active' : ''}`}
            onClick={() => { setMainTab('appointments'); loadAppointments(); }}
          >
            <CalendarDays size={15} />
            <span>Lịch Khám Toàn Viện</span>
            <span className="tab-badge-count">{appointments.length}</span>
          </button>

          <button
            type="button"
            className={`nurse-tab-capsule ${mainTab === 'shifts' ? 'active' : ''}`}
            onClick={() => { setMainTab('shifts'); loadShifts(); }}
          >
            <Clock size={15} />
            <span>Ca Trực & Giao Ban</span>
            <span className="tab-badge-count">{nurseShifts.length}</span>
          </button>
        </div>

        <div>
          {mainTab === 'shifts' && (
            <button
              type="button"
              onClick={() => setShowCreateShiftModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#0f766e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={14} /> + Phân Ca Trực Mới
            </button>
          )}
        </div>
      </div>

      {/* 4. WORKSPACE VIEW 1: BÀN TIẾP ĐÓN TRIAGE (2-COLUMN SPLIT) */}
      {mainTab === 'triage' && (
        <div className="nurse-workspace-split">
          {/* LEFT COLUMN: QUEUE LIST (42%) */}
          <section className="nurse-queue-pane">
            <div className="queue-pane-header">
              <div className="queue-header-top">
                <h3>Danh Sách Chờ Sàng Lọc</h3>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  {filteredQueue.length} ca trực
                </span>
              </div>

              {/* Status Filter Pills */}
              <div className="queue-filter-chips">
                <button
                  type="button"
                  className={`btn-filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  Tất cả ({queue.length})
                </button>
                <button
                  type="button"
                  className={`btn-filter-pill ${filterStatus === 'pending' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('pending')}
                >
                  Chờ đo ({pendingCount})
                </button>
                <button
                  type="button"
                  className={`btn-filter-pill ${filterStatus === 'waiting_room' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('waiting_room')}
                >
                  ⏳ Phòng chờ ({waitingCount})
                </button>
                <button
                  type="button"
                  className={`btn-filter-pill urgent ${filterStatus === 'urgent' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('urgent')}
                >
                  Khẩn cấp ({urgentCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="queue-search-input">
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Tìm theo tên người bệnh, triệu chứng khám..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Queue List Cards */}
            <div className="nurse-queue-list">
              {paginatedQueue.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                  Không có bệnh nhân nào phù hợp với bộ lọc hiện tại.
                </div>
              ) : (
                paginatedQueue.map(item => {
                  const isSelected = selectedItem?.appointment_id === item.appointment_id
                  const urgencyClass = item.triage_level === 'emergency' ? 'emergency' : item.triage_level === 'priority' ? 'priority' : 'normal'
                  const hasVitals = !!(item.blood_pressure || item.pulse || item.temperature)

                  return (
                    <div
                      key={item.appointment_id}
                      className={`triage-patient-card-modern ${urgencyClass} ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="card-row-top">
                        <div className="card-patient-name">
                          <strong>{item.patient_name}</strong>
                          <span>#{item.appointment_id} &bull; SĐT: {item.patient_phone || '---'}</span>
                        </div>
                        <span className={`card-urgency-badge ${urgencyClass}`}>
                          {item.triage_level === 'emergency' ? 'Cấp cứu' : item.triage_level === 'priority' ? 'Ưu tiên' : 'Tiêu chuẩn'}
                        </span>
                      </div>

                      <div className="card-reason-snippet">
                        {item.reason || 'Khám sức khỏe tổng quát định kỳ'}
                      </div>

                      <div className="card-meta-bottom">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                          <Clock size={11} /> {item.starts_at ? new Date(item.starts_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Ca sáng'} &bull; BS: {item.doctor_name || 'BS phụ trách'}
                        </span>
                        <span className={`card-vitals-status ${hasVitals ? 'done' : 'pending'}`}>
                          {hasVitals ? `✓ Đã đo (${item.blood_pressure || `${item.pulse} bpm`})` : 'Chưa đo sinh hiệu'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalTriagePages > 1 && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
                <Pagination
                  currentPage={activeTriagePage}
                  pageSize={triagePageSize}
                  onPageChange={setTriagePage}
                  onPageSizeChange={setTriagePageSize}
                  totalItems={filteredQueue.length}
                />
              </div>
            )}
          </section>

          {/* RIGHT COLUMN: INTAKE WORKSPACE (58%) */}
          <section className="nurse-intake-pane">
            {!selectedItem ? (
              <div className="intake-empty-state">
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#f0fdfa',
                  color: '#0f766e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <Stethoscope size={28} />
                </div>
                <b>Chọn một bệnh nhân trong danh sách để tiếp đón</b>
                <p>Màn hình đo sinh hiệu Bluetooth BLE, phân tầng Manchester Triage và trao đổi phòng chờ sẽ hiển thị tại đây.</p>
              </div>
            ) : (
              <div>
                {/* 1. Sticky Patient Banner */}
                <div className="intake-patient-banner">
                  <div className="intake-patient-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3>{selectedItem.patient_name}</h3>
                      <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        Ca khám #{selectedItem.appointment_id}
                      </span>
                    </div>
                    <p>
                      Mã BN: #{selectedItem.patient_id} &bull; SĐT: {selectedItem.patient_phone || '---'} &bull; BHYT: {selectedItem.bhyt_code || 'Chưa cung cấp'}
                    </p>
                  </div>
                  <div>
                    <span style={{
                      fontSize: '11.5px',
                      color: '#0f766e',
                      background: '#ccfbf1',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 700
                    }}>
                      Bác sĩ khám: {selectedItem.doctor_name || 'Bác sĩ chuyên khoa'}
                    </span>
                  </div>
                </div>

                {/* 2. Sub-tabs row */}
                <div className="intake-subtabs-row">
                  <button
                    type="button"
                    className={`intake-subtab-btn ${intakeTab === 'vitals' ? 'active' : ''}`}
                    onClick={() => setIntakeTab('vitals')}
                  >
                    🩺 1. Đo Sinh Hiệu & Phân Tầng
                  </button>
                  <button
                    type="button"
                    className={`intake-subtab-btn ${intakeTab === 'docs' ? 'active' : ''}`}
                    onClick={() => {
                      setIntakeTab('docs')
                      if (selectedItem) loadPatientDocs(selectedItem.appointment_id)
                    }}
                  >
                    📁 2. Tài Liệu Người Bệnh Tải Lên {patientDocs.length > 0 && `(${patientDocs.length})`}
                  </button>
                  <button
                    type="button"
                    className={`intake-subtab-btn ${intakeTab === 'chat' ? 'active' : ''}`}
                    onClick={() => {
                      setIntakeTab('chat')
                      if (selectedItem) loadNurseChat(selectedItem.appointment_id)
                    }}
                  >
                    💬 3. Chat Phòng Chờ {nurseChatMessages.length > 0 && `(${nurseChatMessages.length})`}
                  </button>
                </div>

                {/* TAB CONTENT: VITALS */}
                {intakeTab === 'vitals' && (
                  <form onSubmit={handleSubmitTriage} className="nurse-vitals-form">
                    {/* BLE Auto Ingestion Bar */}
                    <div className="nurse-ble-dock">
                      <div className="ble-dock-info">
                        <span style={{ fontSize: '20px' }}>📡</span>
                        <div>
                          <strong>Đo Sinh Hiệu Tự Động Bluetooth BLE (FDA: Omron / A&D / Roche)</strong>
                          <span>Chuẩn GATT 0x1810 / 0x1808 &bull; Tự động điền Huyết áp & Mạch không cần gõ phím</span>
                        </div>
                      </div>
                      <div className="ble-dock-actions">
                        <button
                          type="button"
                          className="btn-ble-scan"
                          disabled={bleScanning}
                          onClick={() => handleBleAutoFetch(false)}
                        >
                          {bleScanning ? 'Đang dò sóng...' : 'Quét Bluetooth BLE'}
                        </button>
                        <button
                          type="button"
                          disabled={bleScanning}
                          onClick={() => handleBleAutoFetch(true)}
                          style={{
                            padding: '6px 10px',
                            background: '#dcfce7',
                            color: '#166534',
                            border: '1px solid #86efac',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Đo giả lập chuẩn lâm sàng ESH"
                        >
                          Đo Test
                        </button>
                      </div>
                    </div>

                    {/* 2x3 Vitals Input Grid */}
                    <div className="vitals-grid-2x3">
                      {/* Huyết áp */}
                      <div className="vital-input-card">
                        <span className="vital-card-label">
                          <Heart size={13} color="#dc2626" /> Huyết áp (HATT/HATTr)
                        </span>
                        <input
                          type="text"
                          placeholder="120/80"
                          value={bloodPressure}
                          onChange={e => setBloodPressure(e.target.value)}
                          required
                        />
                        <span className="vital-card-unit">mmHg (Chuẩn ESH)</span>
                      </div>

                      {/* Mạch */}
                      <div className={`vital-input-card ${isHighPulse ? 'warning-glow' : ''}`}>
                        <span className="vital-card-label">
                          <Activity size={13} color="#0f766e" /> Nhịp mạch (Pulse)
                        </span>
                        <input
                          type="number"
                          placeholder="75"
                          value={pulse}
                          onChange={e => setPulse(e.target.value === '' ? '' : Number(e.target.value))}
                          required
                        />
                        <span className="vital-card-unit">bpm (60 - 100)</span>
                      </div>

                      {/* Thân nhiệt */}
                      <div className={`vital-input-card ${isHighTemp ? 'warning-glow' : ''}`}>
                        <span className="vital-card-label">
                          <Thermometer size={13} color="#ea580c" /> Thân nhiệt
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="36.5"
                          value={temperature}
                          onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                          required
                        />
                        <span className="vital-card-unit">°C (Nhiệt kế hồng ngoại)</span>
                      </div>

                      {/* SpO2 */}
                      <div className={`vital-input-card ${isLowSpo2 ? 'danger-glow' : ''}`}>
                        <span className="vital-card-label">
                          <Wind size={13} color="#2563eb" /> Nồng độ Oxy (SpO2)
                        </span>
                        <input
                          type="number"
                          placeholder="98"
                          value={spo2}
                          onChange={e => setSpo2(e.target.value === '' ? '' : Number(e.target.value))}
                          required
                        />
                        <span className="vital-card-unit">% (&gt;= 95% bình thường)</span>
                      </div>

                      {/* Chiều cao */}
                      <div className="vital-input-card">
                        <span className="vital-card-label">Chiều cao</span>
                        <input
                          type="number"
                          placeholder="170"
                          value={height}
                          onChange={e => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <span className="vital-card-unit">cm</span>
                      </div>

                      {/* Cân nặng & BMI */}
                      <div className="vital-input-card">
                        <span className="vital-card-label">
                          <Weight size={13} /> Cân nặng & BMI
                        </span>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="65"
                          value={weight}
                          onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                        />
                        <span className="vital-card-unit">
                          {bmiVal ? `BMI: ${bmiVal} (${Number(bmiVal) < 18.5 ? 'Gầy' : Number(bmiVal) <= 24.9 ? 'Bình thường' : 'Thừa cân'})` : 'kg'}
                        </span>
                      </div>
                    </div>

                    {/* Early Warning Alert if abnormal */}
                    {(isLowSpo2 || isHighTemp || isHighPulse) && (
                      <div className="news2-warning-card">
                        <AlertTriangle size={18} color="#dc2626" />
                        <div>
                          <strong>Cảnh báo sinh hiệu bất thường (NEWS2 Warning):</strong>
                          <span style={{ marginLeft: '6px' }}>
                            {isLowSpo2 && 'SpO2 < 95% có nguy cơ suy hô hấp; '}
                            {isHighTemp && 'Thân nhiệt >= 38.5°C sốt cao; '}
                            {isHighPulse && 'Nhịp tim ngoài ngưỡng bình thường (60-100 bpm).'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* ESI / Manchester Priority Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                        Phân Tầng Cấp Cứu Lâm Sàng (Manchester Triage System)
                      </label>
                      <div className="esi-options-grid">
                        <label className={`esi-radio-box normal ${triageLevel === 'normal' ? 'checked' : ''}`}>
                          <input
                            type="radio"
                            name="triageLevel"
                            value="normal"
                            checked={triageLevel === 'normal'}
                            onChange={() => setTriageLevel('normal')}
                          />
                          <div className="esi-radio-content">
                            <strong style={{ color: '#059669' }}>Xanh: Tiêu chuẩn</strong>
                            <span>Sinh hiệu ổn định, chờ khám theo số thứ tự</span>
                          </div>
                        </label>

                        <label className={`esi-radio-box priority ${triageLevel === 'priority' ? 'checked' : ''}`}>
                          <input
                            type="radio"
                            name="triageLevel"
                            value="priority"
                            checked={triageLevel === 'priority'}
                            onChange={() => setTriageLevel('priority')}
                          />
                          <div className="esi-radio-content">
                            <strong style={{ color: '#d97706' }}>Vàng: Ưu tiên</strong>
                            <span>Sốt cao, đau vừa hoặc có triệu chứng cần khám sớm</span>
                          </div>
                        </label>

                        <label className={`esi-radio-box emergency ${triageLevel === 'emergency' ? 'checked' : ''}`}>
                          <input
                            type="radio"
                            name="triageLevel"
                            value="emergency"
                            checked={triageLevel === 'emergency'}
                            onChange={() => setTriageLevel('emergency')}
                          />
                          <div className="esi-radio-content">
                            <strong style={{ color: '#dc2626' }}>Đỏ: Khẩn cấp / Cấp cứu</strong>
                            <span>SpO2 &lt; 95%, khó thở hoặc dấu hiệu nguy kịch</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Triage Notes */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                        Ghi chú Điều dưỡng & Dặn dò Bác sĩ chuyên khoa
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Ghi chú về tri giác, tiền sử dị ứng, thuốc đang dùng hoặc chỉ định đo lại..."
                        value={triageNotes}
                        onChange={e => setTriageNotes(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '12.5px',
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Bottom Action CTA Dock */}
                    <div className="intake-actions-dock">
                      <button
                        type="submit"
                        className="btn-submit-triage-main"
                        disabled={isSubmitting}
                      >
                        <Send size={15} />
                        <span>{isSubmitting ? 'Đang chuyển hồ sơ...' : 'Lưu Sinh Hiệu & Đưa Vào Phòng Chờ Bác Sĩ'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* TAB CONTENT: DOCUMENTS */}
                {intakeTab === 'docs' && (
                  <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h4 style={{ margin: 0, fontSize: '14.5px', color: '#0f172a' }}>
                        Tài liệu y tế người bệnh đã tải lên ({patientDocs.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => selectedItem && loadPatientDocs(selectedItem.appointment_id)}
                        style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Làm mới
                      </button>
                    </div>

                    {loadingPatientDocs ? (
                      <p style={{ color: '#64748b', fontSize: '13px' }}>Đang tải tài liệu...</p>
                    ) : patientDocs.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '13px' }}>
                        Người bệnh chưa tải lên đơn thuốc cũ hoặc phiếu xét nghiệm nào.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        {patientDocs.map(doc => {
                          const isImg = doc.file_url.match(/\.(jpeg|jpg|png|webp)($|\?)/i) || doc.file_url.startsWith('data:image')
                          return (
                            <div key={doc.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#fff' }}>
                              <div
                                style={{ width: '100%', height: '110px', borderRadius: '6px', background: '#f1f5f9', overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => {
                                  if (isImg) setNurseLightboxImg({ url: doc.file_url, title: doc.title })
                                  else window.open(doc.file_url, '_blank')
                                }}
                              >
                                {isImg ? (
                                  <img src={doc.file_url} alt={doc.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#64748b' }}>Tệp tài liệu</span>
                                )}
                              </div>
                              <div style={{ marginTop: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1' }}>
                                  {doc.document_type === 'prescription' ? '💊 Đơn thuốc' : doc.document_type === 'lab_test' ? '🧪 Xét nghiệm' : '🩻 CĐHA'}
                                </span>
                                <h5 style={{ margin: '4px 0 2px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{doc.title}</h5>
                                {doc.description && <p style={{ margin: 0, fontSize: '11.5px', color: '#475569' }}>{doc.description}</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: CHAT */}
                {intakeTab === 'chat' && (
                  <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '420px' }}>
                    <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        💬 Trao đổi với người bệnh: {selectedItem?.patient_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => selectedItem && loadNurseChat(selectedItem.appointment_id)}
                        style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', cursor: 'pointer' }}
                      >
                        Cập nhật
                      </button>
                    </div>

                    <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fafafa' }}>
                      {nurseChatMessages.length === 0 ? (
                        <p style={{ color: '#94a3b8', fontSize: '12.5px', textAlign: 'center', margin: 'auto' }}>
                          Chưa có tin nhắn nào trong phòng chờ ca khám này.
                        </p>
                      ) : (
                        nurseChatMessages.map(msg => {
                          const isNurse = msg.sender_role === 'nurse'
                          return (
                            <div
                              key={msg.id}
                              style={{
                                alignSelf: isNurse ? 'flex-end' : 'flex-start',
                                maxWidth: '80%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isNurse ? 'flex-end' : 'flex-start'
                              }}
                            >
                              <div
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  background: isNurse ? '#0f766e' : '#ffffff',
                                  color: isNurse ? '#ffffff' : '#0f172a',
                                  border: isNurse ? 'none' : '1px solid #e2e8f0',
                                  fontSize: '13px',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {msg.content}
                                {msg.file_url && (
                                  <div style={{ marginTop: '6px', maxWidth: '180px', borderRadius: '4px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setNurseLightboxImg({ url: msg.file_url!, title: msg.file_name || 'Ảnh đính kèm' })}>
                                    <img src={msg.file_url} alt="img" style={{ width: '100%', display: 'block' }} />
                                  </div>
                                )}
                              </div>
                              <small style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>
                                {isNurse ? 'Điều dưỡng' : msg.sender_name} &bull; {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </small>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Quick canned responses */}
                    <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px dashed #e2e8f0', display: 'flex', gap: '6px', overflowX: 'auto' }}>
                      <button
                        type="button"
                        onClick={() => handleNurseSendChat('Chào bạn, Điều dưỡng đã nhận được thông tin và sinh hiệu của bạn nhé.')}
                        style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        ✓ Đã nhận sinh hiệu
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNurseSendChat('Bác sĩ đang xem lại hồ sơ và sẽ kết nối video với bạn sau khoảng 5 phút nữa nhé.')}
                        style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        ⏱️ Bác sĩ sắp gọi (~5p)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNurseSendChat('Bạn vui lòng kiểm tra lại camera và micro xem hình ảnh và âm thanh đã rõ chưa nhé.')}
                        style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        📹 Nhắc kiểm tra camera/mic
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleNurseSendChat()
                      }}
                      style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}
                    >
                      <input
                        type="text"
                        placeholder="Nhập tin nhắn trao đổi với người bệnh..."
                        value={nurseChatInput}
                        onChange={e => setNurseChatInput(e.target.value)}
                        style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                      <button
                        type="submit"
                        disabled={nurseSendingMsg || !nurseChatInput.trim()}
                        style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', background: '#0f766e', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Gửi
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* 5. WORKSPACE VIEW 2: LỊCH KHÁM TOÀN VIỆN */}
      {mainTab === 'appointments' && (
        <section className="panel" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={20} color="#0f766e" /> Giám Sát Lịch Khám Toàn Viện
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                Theo dõi toàn bộ ca khám bệnh nhân đăng ký, phân công điều dưỡng tiếp đón và tiếp nhận vào Triage
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={apptDateFilter}
                onChange={e => setApptDateFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              />
              <select
                value={apptStatusFilter}
                onChange={e => setApptStatusFilter(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="scheduled">Đã hẹn (scheduled)</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="waiting">Đang ở phòng chờ</option>
                <option value="in_progress">Đang khám</option>
                <option value="completed">Đã hoàn tất</option>
              </select>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Tìm bệnh nhân, bác sĩ..."
                  value={apptSearch}
                  onChange={e => setApptSearch(e.target.value)}
                  style={{ padding: '8px 12px 8px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <button
                type="button"
                onClick={loadAppointments}
                style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                Làm mới
              </button>
            </div>
          </div>

          {loadingAppts ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Đang tải lịch khám...</div>
          ) : appointments.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Chưa có lịch khám nào trong ngày đã chọn.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '12px 14px' }}>Mã Ca</th>
                    <th style={{ padding: '12px 14px' }}>Thời Gian</th>
                    <th style={{ padding: '12px 14px' }}>Bệnh Nhân</th>
                    <th style={{ padding: '12px 14px' }}>Bác Sĩ Phụ Trách</th>
                    <th style={{ padding: '12px 14px' }}>Trạng Thái</th>
                    <th style={{ padding: '12px 14px' }}>Điều Dưỡng Tiếp Đón</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments
                    .filter(a => {
                      if (apptStatusFilter !== 'all' && a.status !== apptStatusFilter) return false
                      const pName = (a as any).patient_name || ''
                      const dName = (a as any).doctor_name || ''
                      if (apptSearch && !pName.toLowerCase().includes(apptSearch.toLowerCase()) && !dName.toLowerCase().includes(apptSearch.toLowerCase())) return false
                      return true
                    })
                    .map(a => {
                      const pName = (a as any).patient_name || `BN #${a.patient_id}`
                      const dName = (a as any).doctor_name || `Bác sĩ #${a.doctor_id}`
                      return (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f766e' }}>#{a.id}</td>
                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                            {a.starts_at ? new Date(a.starts_at).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '---'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <strong style={{ color: '#0f172a' }}>{pName}</strong>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{a.reason || 'Khám tổng quát'}</div>
                          </td>
                          <td style={{ padding: '12px 14px', color: '#334155' }}>
                            {dName}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: a.status === 'completed' ? '#dcfce7' : a.status === 'in_progress' ? '#e0f2fe' : a.status === 'waiting' ? '#fef3c7' : '#f1f5f9',
                              color: a.status === 'completed' ? '#166534' : a.status === 'in_progress' ? '#0369a1' : a.status === 'waiting' ? '#92400e' : '#475569'
                            }}>
                              {a.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            {(a as any).nurse_name ? (
                              <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                                ✓ {(a as any).nurse_name}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAssignSelf(a.id)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#ecfdf5',
                                  border: '1px solid #a7f3d0',
                                  color: '#047857',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                + Nhận tiếp đón
                              </button>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => {
                                const qItem = queue.find(q => q.appointment_id === a.id)
                                if (qItem) {
                                  handleSelectItem(qItem)
                                  setMainTab('triage')
                                } else {
                                  alert('Ca khám này chưa có trong hàng đợi Triage hôm nay.')
                                }
                              }}
                              style={{
                                padding: '5px 10px',
                                background: '#0f766e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Mở Triage →
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* 6. WORKSPACE VIEW 3: CA TRỰC & GIAO BAN ĐIỀU DƯỠNG */}
      {mainTab === 'shifts' && (
        <section className="panel" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#0f766e" /> Quản Lý Ca Trực & Giao Ban Điều Dưỡng
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                Phân bổ bàn tiếp đón Triage, theo dõi số lượt bệnh nhân tiếp nhận và ghi nhận sổ giao ban ca trực
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateShiftModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 16px',
                background: '#0f766e',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <PlusCircle size={15} /> + Phân Ca Trực Mới
            </button>
          </div>

          {/* Sổ Giao Ban Ca Trực (Handover Notes) */}
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardCheck size={18} color="#0f766e" />
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>Sổ Giao Ban Ca Trực Điều Dưỡng (Handover Log)</strong>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Ca hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
            </div>
            <textarea
              rows={3}
              placeholder="Ghi lại bàn giao: Ca bệnh đặc biệt cần theo dõi, sự cố kỹ thuật thiết bị đo, số lượng bệnh nhân tồn đọng, thuốc hoặc vật tư tiêu hao..."
              value={handoverNoteDraft}
              onChange={e => setHandoverNoteDraft(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  const myShift = nurseShifts.find(s => s.nurse_id === nurse?.id && s.is_active)
                  if (myShift) handleSaveHandover(myShift.id)
                  else alert('Bạn chưa có ca trực nào đang hoạt động hôm nay.')
                }}
                style={{
                  padding: '7px 16px',
                  background: '#0f766e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Lưu Sổ Giao Ban Ca Trực
              </button>
            </div>
          </div>

          {/* Danh Sách Ca Trực */}
          <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>
            Lịch Phân Ca Trực Điều Dưỡng ({nurseShifts.length} ca trực)
          </h4>

          {loadingShifts ? (
            <p style={{ color: '#64748b' }}>Đang tải ca trực...</p>
          ) : nurseShifts.length === 0 ? (
            <p style={{ color: '#94a3b8' }}>Chưa có ca trực nào được phân bổ.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px' }}>Điều Dưỡng</th>
                    <th style={{ padding: '10px 14px' }}>Bàn Tiếp Đón</th>
                    <th style={{ padding: '10px 14px' }}>Ca Trực & Giờ</th>
                    <th style={{ padding: '10px 14px' }}>Ngày Trực</th>
                    <th style={{ padding: '10px 14px' }}>Đã Tiếp Nhận</th>
                    <th style={{ padding: '10px 14px' }}>Trạng Thái</th>
                    <th style={{ padding: '10px 14px' }}>Sổ Giao Ban</th>
                  </tr>
                </thead>
                <tbody>
                  {nurseShifts.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {s.nurse_name || `Điều dưỡng #${s.nurse_id}`}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#0f766e', fontWeight: 600 }}>
                        {s.desk_name || 'Bàn Tiếp đón Triage 01'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontWeight: 600 }}>
                          {s.shift_type === 'morning' ? 'Ca sáng' : s.shift_type === 'afternoon' ? 'Ca chiều' : 'Ca tối'}
                        </span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{s.start_time} - {s.end_time}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{s.shift_date}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong>{s.attended_count || 0}</strong> / {s.max_patients || 30} BN
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: s.is_active ? '#dcfce7' : '#f1f5f9',
                          color: s.is_active ? '#166534' : '#64748b'
                        }}>
                          {s.is_active ? 'Đang trực' : 'Đã kết thúc'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11.5px', color: '#475569', maxWidth: '240px' }}>
                        {s.handover_notes || <span style={{ color: '#94a3b8' }}>Chưa ghi sổ</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* MODAL PHÂN CA TRỰC MỚI */}
      {showCreateShiftModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>Phân Ca Trực Điều Dưỡng Mới</h3>
              <button
                type="button"
                onClick={() => setShowCreateShiftModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShift} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Chọn Điều dưỡng:</label>
                <select
                  value={newShiftNurseId}
                  onChange={e => setNewShiftNurseId(Number(e.target.value))}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  {nursesList.length > 0 ? (
                    nursesList.map(n => (
                      <option key={n.id} value={n.id}>{n.full_name} ({n.role || 'Điều dưỡng'})</option>
                    ))
                  ) : (
                    <option value={nurse?.id || 1}>{nurse?.full_name || 'Điều dưỡng tiếp đón'}</option>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Ngày trực:</label>
                <input
                  type="date"
                  value={newShiftDate}
                  onChange={e => setNewShiftDate(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Ca trực:</label>
                  <select
                    value={newShiftType}
                    onChange={e => setNewShiftType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="morning">Ca sáng (07:00 - 11:30)</option>
                    <option value="afternoon">Ca chiều (13:00 - 17:00)</option>
                    <option value="evening">Ca tối (17:00 - 22:00)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Số BN tối đa:</label>
                  <input
                    type="number"
                    value={newMaxPatients}
                    onChange={e => setNewMaxPatients(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Tên bàn tiếp đón:</label>
                <input
                  type="text"
                  value={newDeskName}
                  onChange={e => setNewDeskName(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateShiftModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#0f766e', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Xác Nhận Tạo Ca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {nurseLightboxImg && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setNurseLightboxImg(null)}
        >
          <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '85vw', maxHeight: '85vh', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>{nurseLightboxImg.title}</span>
              <button onClick={() => setNurseLightboxImg(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '16px' }}>✕</button>
            </div>
            <img src={nurseLightboxImg.url} alt="img" style={{ maxWidth: '100%', maxHeight: 'calc(80vh - 60px)', display: 'block' }} />
          </div>
        </div>
      )}

      {/* MODAL EMR ĐỊNH DANH CCCD */}
      <PatientIdentificationModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        result={identifiedPatient}
        onSelectForTriage={handleApplyIdentifiedPatient}
      />
    </div>
  )
}

export default NurseDashboard
