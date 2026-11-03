import React, { useState, useEffect } from 'react'

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

  FileText

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

  request

} from './api'

import {

  UserCheck,

  ClipboardCheck,

  PlusCircle,

  Calendar,

  MapPin,

  Check

} from 'lucide-react'

import { Pagination } from './Pagination'

import { PatientIdentificationModal } from './PatientIdentificationModal'

import { readBloodPressureBLE, simulateDeviceReading, isWebBluetoothSupported } from './bluetoothService'

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

  const [triagePageSize, setTriagePageSize] = useState(6)

  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null)

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

  // BHYT Quick verification

  const [bhytQuery, setBhytQuery] = useState('')

  const [bhytResult, setBhytResult] = useState<any>(null)

  // Nhận diện Bệnh nhân CCCD / VNeID Đề án 06

  const [cccdSearch, setCccdSearch] = useState('')

  const [identifying, setIdentifying] = useState(false)

  const [identifiedPatient, setIdentifiedPatient] = useState<PatientIdentifyResult | null>(null)

  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const [bleScanning, setBleScanning] = useState(false)

  // Phân hệ Lịch khám & Ca trực Điều dưỡng (Nurse Shifts & Clinic Schedule)

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

          console.warn('Bluetooth BLE direct scan skipped or unavailable, falling back:', bleErr)

          reading = await simulateDeviceReading('blood_pressure')

        }

      } else {

        reading = await simulateDeviceReading('blood_pressure')

      }

      if (reading.systolic && reading.diastolic) {

        setBloodPressure(`${reading.systolic}/${reading.diastolic}`)

        if (reading.pulse) setPulse(reading.pulse)

        setToastMessage(`✅ Đã nhận số đo từ ${reading.deviceName || 'Máy đo huyết áp Bluetooth FDA'}: ${reading.systolic}/${reading.diastolic} mmHg - Mạch ${reading.pulse} bpm`)

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

      setToastMessage(`✓ Đã lưu sinh hiệu thực tế & chuyển bệnh nhân ${selectedItem.patient_name} vào Phòng chờ Bác sĩ!`)

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

  // Calculate BMI

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

      {/* 1. Nurse Command Header */}

      <section className="nurse-hero-banner">

        <div className="nurse-hero-content">

          <div className="nurse-badge-row">

            <span className="nurse-status-pill online">

              <span className="live-dot" /> BÀN TIẾP ĐÓN ĐANG MỞ

            </span>

            <span className="nurse-role-pill">

              <Stethoscope size={13} /> Điều dưỡng trưởng tiếp đón & phân tầng Triage

            </span>

            <span className="nurse-dept-pill">

              <Building2 size={13} /> Bệnh viện CareConnect

            </span>

          </div>

          <h1>{nurse.full_name || 'Điều dưỡng tiếp đón'}</h1>

          <p className="nurse-hero-sub">

            Sàng lọc chỉ số sinh hiệu (Vitals), đối soát thẻ BHYT trực tuyến và phân luồng bệnh nhân vào phòng khám Bác sĩ chuyên khoa.

          </p>

          <div className="nurse-hero-actions">

            <button className="btn-nurse-refresh" onClick={loadQueue}>

              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới hàng đợi

            </button>

            {onNavigate && (

              <>

                <button className="btn-nurse-outline" onClick={() => onNavigate('appointments')}>

                  <CalendarDays size={14} /> Xem tất cả lịch khám

                </button>

                <button className="btn-nurse-outline" onClick={() => onNavigate('insurance')}>

                  <ShieldCheck size={14} /> Tra cứu BHYT XML 4210

                </button>

              </>

            )}

          </div>

        </div>

        <div className="nurse-triage-summary-card">

          <div className="summary-title">Tiếp nhận ca trực</div>

          <div className="summary-stats-row">

            <div className="summary-stat-cell">

              <strong>{pendingCount}</strong>

              <small>Chờ đo sinh hiệu</small>

            </div>

            <div className="summary-stat-cell">

              <strong>{dispatchedCount}</strong>

              <small>Đã vào buồng BS</small>

            </div>

            <div className="summary-stat-cell urgent">

              <strong>{urgentCount}</strong>

              <small>Ca ưu tiên / Cấp cứu</small>

            </div>

          </div>

        </div>

      </section>

      {toastMessage && (

        <div className="alert success animate-fade-in">

          <CheckCircle2 size={18} />

          <span>{toastMessage}</span>

        </div>

      )}

      {/* 1.5. Nhận diện Bệnh nhân đã có hồ sơ bằng CCCD / VNeID (Đề án 06) */}

      <section className="panel cccd-identification-panel" style={{

        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #e0f2fe 100%)',

        border: '2px solid #059669',

        borderRadius: '16px',

        padding: '20px',

        boxShadow: '0 4px 16px rgba(5, 150, 105, 0.12)'

      }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>

          <div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>

              <span style={{

                background: '#047857',

                color: '#ffffff',

                fontSize: '11px',

                fontWeight: 800,

                padding: '3px 8px',

                borderRadius: '6px',

                letterSpacing: '0.5px'

              }}>

                ĐỀ ÁN 06/CP

              </span>

              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#064e3b', display: 'flex', alignItems: 'center', gap: '8px' }}>

                <ShieldCheck size={20} color="#059669" /> Nhận diện Bệnh nhân bằng CCCD / VNeID

              </h3>

            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#047857' }}>

              Quét mã QR trên CCCD gắn chip hoặc nhập số định danh 12 số để tự động nhận diện Bệnh nhân cũ & truy xuất hồ sơ EMR

            </p>

          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

            <span style={{ fontSize: '12px', color: '#065f46', fontWeight: 600, alignSelf: 'center' }}>Thử nhanh:</span>

            <button

              type="button"

              className="quick-chip-btn"

              style={{ background: '#ffffff', border: '1px solid #10b981', color: '#047857', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}

              onClick={() => {

                setCccdSearch('079092014829')

                handleIdentifyPatient('079092014829')

              }}

            >

              Nguyễn Minh An (079092014829)

            </button>

            <button

              type="button"

              className="quick-chip-btn"

              style={{ background: '#ffffff', border: '1px solid #10b981', color: '#047857', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}

              onClick={() => {

                setCccdSearch('080180012345')

                handleIdentifyPatient('080180012345')

              }}

            >

              Nguyễn Thị Bích Hòa (080180012345)

            </button>

          </div>

        </div>

        {/* Input & Search bar */}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

          <div style={{

            flex: 1,

            minWidth: '280px',

            position: 'relative',

            display: 'flex',

            alignItems: 'center',

            background: '#ffffff',

            borderRadius: '10px',

            border: '1px solid #cbd5e1',

            padding: '2px 12px'

          }}>

            <CreditCard size={18} color="#059669" style={{ marginRight: '8px' }} />

            <input

              type="text"

              placeholder="Nhập 12 số CCCD hoặc chuỗi quét mã QR VNeID..."

              value={cccdSearch}

              onChange={e => setCccdSearch(e.target.value)}

              onKeyDown={e => { if (e.key === 'Enter') handleIdentifyPatient() }}

              style={{

                width: '100%',

                border: 'none',

                outline: 'none',

                padding: '10px 0',

                fontSize: '14px',

                fontFamily: 'inherit'

              }}

            />

          </div>

          <button

            type="button"

            onClick={() => handleIdentifyPatient()}

            disabled={identifying}

            style={{

              background: '#047857',

              color: '#ffffff',

              border: 'none',

              borderRadius: '10px',

              padding: '10px 20px',

              fontWeight: 700,

              fontSize: '14px',

              cursor: 'pointer',

              display: 'inline-flex',

              alignItems: 'center',

              gap: '6px',

              boxShadow: '0 2px 8px rgba(4, 120, 87, 0.3)'

            }}

          >

            {identifying ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}

            {identifying ? 'Đang nhận diện...' : 'Nhận diện Bệnh nhân'}

          </button>

        </div>

        {/* Identification Result Box */}

        {identifiedPatient && (

          <div style={{

            marginTop: '16px',

            background: '#ffffff',

            borderRadius: '12px',

            border: `2px solid ${identifiedPatient.patient_type === 'existing_with_history' ? '#10b981' : '#0284c7'}`,

            padding: '16px',

            display: 'flex',

            flexDirection: 'column',

            gap: '12px'

          }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>

              <div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

                  <span style={{

                    fontSize: '12px',

                    fontWeight: 800,

                    padding: '3px 10px',

                    borderRadius: '20px',

                    background: identifiedPatient.patient_type === 'existing_with_history' ? '#dcfce7' : '#e0f2fe',

                    color: identifiedPatient.patient_type === 'existing_with_history' ? '#15803d' : '#0369a1'

                  }}>

                    {identifiedPatient.patient_type === 'existing_with_history' && `🟢 BỆNH NHÂN CŨ (ĐÃ CÓ ${identifiedPatient.total_visits} LƯỢT KHÁM EMR)`}

                    {identifiedPatient.patient_type === 'existing_no_history' && '🟢 BỆNH NHÂN ĐÃ CÓ TÀI KHOẢN (CHƯA KHÁM)'}

                    {identifiedPatient.patient_type === 'his_only' && '🔵 BỆNH NHÂN ĐÃ CÓ HỒ SƠ HIS BỆNH VIỆN'}

                    {identifiedPatient.patient_type === 'new' && '⚪ BỆNH NHÂN MỚI (CHƯA CÓ HỒ SƠ TẠI VIỆN)'}

                  </span>

                  <span style={{

                    fontSize: '11px',

                    fontWeight: 700,

                    padding: '2px 8px',

                    borderRadius: '12px',

                    background: '#fef2f2',

                    color: '#b91c1c',

                    border: '1px solid #fecaca'

                  }}>

                    ✓ VNeID Mức 2

                  </span>

                </div>

                <h4 style={{ margin: '8px 0 2px 0', fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>

                  {identifiedPatient.full_name || 'Họ và tên chưa xác định'}

                </h4>

                <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>

                  <span><b>PID:</b> {identifiedPatient.pid || 'Mới'}</span>

                  <span>•</span>

                  <span><b>CCCD:</b> {identifiedPatient.identity_card}</span>

                  <span>•</span>

                  <span><b>Ngày sinh:</b> {identifiedPatient.date_of_birth} ({identifiedPatient.gender})</span>

                  <span>•</span>

                  <span><b>Thẻ BHYT:</b> <strong style={{ color: '#059669' }}>{identifiedPatient.bhyt_code || 'Chưa có'}</strong></span>

                </div>

              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

                <button

                  type="button"

                  style={{

                    background: '#047857',

                    color: '#ffffff',

                    border: 'none',

                    borderRadius: '8px',

                    padding: '8px 14px',

                    fontSize: '13px',

                    fontWeight: 700,

                    cursor: 'pointer',

                    display: 'inline-flex',

                    alignItems: 'center',

                    gap: '6px'

                  }}

                  onClick={() => handleApplyIdentifiedPatient(identifiedPatient)}

                >

                  <CheckCircle2 size={15} /> Điền vào Bàn tiếp đón

                </button>

                <button

                  type="button"

                  style={{

                    background: '#ffffff',

                    color: '#0284c7',

                    border: '1px solid #0284c7',

                    borderRadius: '8px',

                    padding: '8px 14px',

                    fontSize: '13px',

                    fontWeight: 700,

                    cursor: 'pointer',

                    display: 'inline-flex',

                    alignItems: 'center',

                    gap: '6px'

                  }}

                  onClick={() => setShowHistoryModal(true)}

                >

                  <FileText size={15} /> Xem hồ sơ EMR ({identifiedPatient.total_visits})

                </button>

              </div>

            </div>

            {/* Quick warnings: Allergies and Chronic conditions */}

            {(identifiedPatient.allergies || (identifiedPatient.chronic_conditions && identifiedPatient.chronic_conditions.length > 0)) && (

              <div style={{

                background: '#fffbeb',

                border: '1px solid #fef3c7',

                borderRadius: '8px',

                padding: '8px 12px',

                fontSize: '12px',

                color: '#92400e',

                display: 'flex',

                alignItems: 'center',

                gap: '8px',

                flexWrap: 'wrap'

              }}>

                <AlertTriangle size={15} color="#d97706" />

                <span><b>Tiền sử dị ứng:</b> {identifiedPatient.allergies || 'Không'}</span>

                {identifiedPatient.chronic_conditions && identifiedPatient.chronic_conditions.length > 0 && (

                  <span>• <b>Bệnh mạn tính:</b> {identifiedPatient.chronic_conditions.map(c => `${c.code} (${c.display})`).join(', ')}</span>

                )}

              </div>

            )}

          </div>

        )}

      </section>

      {/* 2. Nurse Main Navigation Switcher */}

      <div className="nurse-view-switcher" style={{

        display: 'flex',

        alignItems: 'center',

        justifyContent: 'space-between',

        flexWrap: 'wrap',

        gap: '12px',

        margin: '20px 0',

        borderBottom: '2px solid #e2e8f0',

        paddingBottom: '14px'

      }}>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>

          <button

            type="button"

            className={`nurse-view-tab ${mainTab === 'triage' ? 'active' : ''}`}

            onClick={() => setMainTab('triage')}

            style={{

              display: 'inline-flex',

              alignItems: 'center',

              gap: '8px',

              padding: '10px 18px',

              borderRadius: '10px',

              border: 'none',

              fontSize: '13px',

              fontWeight: 700,

              cursor: 'pointer',

              background: mainTab === 'triage' ? '#0f766e' : '#f1f5f9',

              color: mainTab === 'triage' ? '#ffffff' : '#475569',

              boxShadow: mainTab === 'triage' ? '0 4px 12px rgba(15, 118, 110, 0.25)' : 'none',

              transition: 'all 0.15s ease'

            }}

          >

            <Stethoscope size={16} /> Bàn Tiếp Đón Triage ({queue.length})

          </button>

          <button

            type="button"

            className={`nurse-view-tab ${mainTab === 'appointments' ? 'active' : ''}`}

            onClick={() => { setMainTab('appointments'); loadAppointments(); }}

            style={{

              display: 'inline-flex',

              alignItems: 'center',

              gap: '8px',

              padding: '10px 18px',

              borderRadius: '10px',

              border: 'none',

              fontSize: '13px',

              fontWeight: 700,

              cursor: 'pointer',

              background: mainTab === 'appointments' ? '#0f766e' : '#f1f5f9',

              color: mainTab === 'appointments' ? '#ffffff' : '#475569',

              boxShadow: mainTab === 'appointments' ? '0 4px 12px rgba(15, 118, 110, 0.25)' : 'none',

              transition: 'all 0.15s ease'

            }}

          >

            <CalendarDays size={16} /> Lịch Khám Toàn Viện ({appointments.length})

          </button>

          <button

            type="button"

            className={`nurse-view-tab ${mainTab === 'shifts' ? 'active' : ''}`}

            onClick={() => { setMainTab('shifts'); loadShifts(); }}

            style={{

              display: 'inline-flex',

              alignItems: 'center',

              gap: '8px',

              padding: '10px 18px',

              borderRadius: '10px',

              border: 'none',

              fontSize: '13px',

              fontWeight: 700,

              cursor: 'pointer',

              background: mainTab === 'shifts' ? '#0f766e' : '#f1f5f9',

              color: mainTab === 'shifts' ? '#ffffff' : '#475569',

              boxShadow: mainTab === 'shifts' ? '0 4px 12px rgba(15, 118, 110, 0.25)' : 'none',

              transition: 'all 0.15s ease'

            }}

          >

            <Clock size={16} /> Ca Trực & Giao Ban Điều Dưỡng ({nurseShifts.length})

          </button>

        </div>

        <div style={{ display: 'flex', gap: '8px' }}>

          {mainTab === 'shifts' && (

            <button

              type="button"

              onClick={() => setShowCreateShiftModal(true)}

              style={{

                display: 'inline-flex',

                alignItems: 'center',

                gap: '6px',

                padding: '9px 15px',

                background: '#0f766e',

                color: '#fff',

                border: 'none',

                borderRadius: '8px',

                fontSize: '12px',

                fontWeight: 700,

                cursor: 'pointer'

              }}

            >

              <PlusCircle size={15} /> + Phân Ca Trực Mới

            </button>

          )}

        </div>

      </div>

      {/* VIEW 1: BÀN TIẾP ĐÓN TRIAGE */}

      {mainTab === 'triage' && (

      <div className="nurse-workspace-grid">

        {/* Left Column: Triage Patient Queue */}

        <section className="panel queue-left-panel">

          <div className="panel-heading">

            <div>

              <h3>Danh Sách Bệnh Nhân Chờ Sàng Lọc</h3>

              <p>Chọn bệnh nhân để đo sinh hiệu và điều phối phòng khám</p>

            </div>

            <div className="nurse-filter-tabs">

              <button

                className={`nurse-tab-chip ${filterStatus === 'all' ? 'active' : ''}`}

                onClick={() => setFilterStatus('all')}

              >

                Tất cả ({queue.length})

              </button>

              <button

                className={`nurse-tab-chip ${filterStatus === 'pending' ? 'active' : ''}`}

                onClick={() => setFilterStatus('pending')}

              >

                Chờ đo ({pendingCount})

              </button>

              <button

                className={`nurse-tab-chip ${filterStatus === 'waiting_room' ? 'active' : ''}`}

                onClick={() => setFilterStatus('waiting_room')}

              >

                ⏳ Phòng chờ ({waitingCount})

              </button>

              <button

                className={`nurse-tab-chip ${filterStatus === 'urgent' ? 'active' : ''}`}

                onClick={() => setFilterStatus('urgent')}

              >

                Khẩn cấp ({urgentCount})

              </button>

            </div>

          </div>

          <div className="queue-search-bar">

            <Search size={14} />

            <input

              type="text"

              placeholder="Tìm theo tên bệnh nhân, triệu chứng..."

              value={searchQuery}

              onChange={e => setSearchQuery(e.target.value)}

            />

          </div>

          {queue.length === 0 ? (

            <div className="empty-queue-box">

              <CheckCircle2 size={40} color="#059669" />

              <b>Hiện không có bệnh nhân chờ tại bàn tiếp đón</b>

              <p>Hàng đợi sẽ tự động cập nhật khi có lịch hẹn mới.</p>

            </div>

          ) : (

            <div className="triage-cards-list">

              {queue

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

                .map(item => {

                  const isSelected = selectedItem?.appointment_id === item.appointment_id

                  return (

                    <div

                      key={item.appointment_id}

                      className={`triage-patient-card ${isSelected ? 'selected' : ''} ${item.triage_level || 'normal'}`}

                      onClick={() => handleSelectItem(item)}

                    >

                      <div className="card-top-row">

                        <div className="patient-identity">

                          <b>{item.patient_name}</b>

                          <span className="patient-meta-text">

                            {(item as any).gender === 'female' ? 'Nữ' : 'Nam'} • {(item as any).age || 35} tuổi

                          </span>

                        </div>

                        <span className={`triage-badge-chip ${item.triage_level || 'normal'}`}>

                          {item.triage_level === 'emergency' && '🚨 Cấp cứu'}

                          {item.triage_level === 'priority' && '⚠️ Ưu tiên'}

                          {(!item.triage_level || item.triage_level === 'normal') && '✓ Tiêu chuẩn'}

                        </span>

                      </div>

                      <div className="card-reason-line">

                        <span>Lý do khám:</span> {item.reason || 'Khám sức khỏe tổng quát'}

                      </div>

                      <div className="card-bottom-row">

                        <span className="card-dept-tag">

                          <Building2 size={12} /> {item.department_name || (item as any).department || 'Khoa Nội'}

                        </span>

                        <span className={`card-status-indicator ${item.triage_status}`}>

                          {item.triage_status === 'pending' && '⏳ Chờ đo sinh hiệu'}

                          {(item.triage_status === 'waiting_room' || item.status === 'waiting') && '🕒 Đang ở phòng chờ'}

                          {item.triage_status === 'dispatched' && '✓ Đã vào phòng BS'}

                        </span>

                      </div>

                    </div>

                  )

                })}

            </div>

          )}

        </section>

        {/* Right Column: Vitals Intake & Assessment Form */}

        <section className="panel intake-right-panel">

          <div className="panel-heading">

            <div>

              <h3>Phiếu Đo Sinh Hiệu & Phân Tầng Triage</h3>

              <p>Nhập thông tin đo tại bàn tiếp đón hoặc đồng bộ từ máy đo BLE</p>

            </div>

            {selectedItem && (

              <span className="intake-patient-id-badge">

                BN #{selectedItem.appointment_id}: {selectedItem.patient_name}

              </span>

            )}

          </div>

          {!selectedItem ? (

            <div className="no-selection-box">

              <Activity size={48} color="#94a3b8" />

              <b>Vui lòng chọn một bệnh nhân từ danh sách bên trái</b>

              <p>Màn hình đo sinh hiệu và phân tầng cấp cứu sẽ hiển thị tại đây.</p>

            </div>

          ) : (

            <form onSubmit={handleSubmitTriage} className="vitals-intake-form">

              {/* Bluetooth BLE Auto-fetch Quick Bar */}

              <div style={{

                display: 'flex',

                alignItems: 'center',

                justifyContent: 'space-between',

                padding: '10px 14px',

                background: '#f0fdf4',

                border: '1px solid #bbf7d0',

                borderRadius: '8px',

                marginBottom: '16px'

              }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

                  <span style={{ fontSize: '20px' }}>📡</span>

                  <div>

                    <div style={{ fontWeight: 700, color: '#166534', fontSize: '12px' }}>

                      Đo Sinh Hiệu Tự Động (Bluetooth FDA: A&D / Omron / Roche)

                    </div>

                    <div style={{ fontSize: '11px', color: '#15803d' }}>

                      Chuẩn GATT 0x1810 / 0x1808 • Tự điền Huyết áp & Mạch không cần gõ phím

                    </div>

                  </div>

                </div>

                <div style={{ display: 'flex', gap: '6px' }}>

                  <button

                    type="button"

                    disabled={bleScanning}

                    onClick={() => handleBleAutoFetch(false)}

                    style={{

                      padding: '6px 12px',

                      background: '#16a34a',

                      color: '#ffffff',

                      border: 'none',

                      borderRadius: '6px',

                      fontSize: '11px',

                      fontWeight: 600,

                      cursor: 'pointer'

                    }}

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

              <div className="vitals-inputs-grid">

                {/* Huyết áp */}

                <div className="form-field-wrap">

                  <label>

                    <Heart size={14} color="#dc2626" /> Huyết áp (HATT/HATTr)

                  </label>

                  <input

                    type="text"

                    placeholder="VD: 120/80"

                    value={bloodPressure}

                    onChange={e => setBloodPressure(e.target.value)}

                    required

                  />

                  <small>Đơn vị: mmHg</small>

                </div>

                {/* Nhịp tim / Mạch */}

                <div className={`form-field-wrap ${isHighPulse ? 'warning-glow' : ''}`}>

                  <label>

                    <Activity size={14} color="#0f766e" /> Nhịp mạch (Pulse)

                  </label>

                  <input

                    type="number"

                    placeholder="VD: 75"

                    value={pulse}

                    onChange={e => setPulse(e.target.value === '' ? '' : Number(e.target.value))}

                    required

                  />

                  <small>Nhịp/phút (60 - 100)</small>

                </div>

                {/* Nhiệt độ */}

                <div className={`form-field-wrap ${isHighTemp ? 'warning-glow' : ''}`}>

                  <label>

                    <Thermometer size={14} color="#ea580c" /> Nhiệt độ cơ thể

                  </label>

                  <input

                    type="number"

                    step="0.1"

                    placeholder="VD: 36.5"

                    value={temperature}

                    onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))}

                    required

                  />

                  <small>Độ C (°C)</small>

                </div>

                {/* SpO2 */}

                <div className={`form-field-wrap ${isLowSpo2 ? 'danger-glow' : ''}`}>

                  <label>

                    <Wind size={14} color="#2563eb" /> Nồng độ Oxy (SpO2)

                  </label>

                  <input

                    type="number"

                    placeholder="VD: 98"

                    value={spo2}

                    onChange={e => setSpo2(e.target.value === '' ? '' : Number(e.target.value))}

                    required

                  />

                  <small>Tỷ lệ % ({'>='} 95%)</small>

                </div>

                {/* Cân nặng */}

                <div className="form-field-wrap">

                  <label>

                    <Weight size={14} /> Cân nặng (kg)

                  </label>

                  <input

                    type="number"

                    step="0.5"

                    placeholder="VD: 65"

                    value={weight}

                    onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))}

                  />

                </div>

                {/* Chiều cao */}

                <div className="form-field-wrap">

                  <label>Chiều cao (cm)</label>

                  <input

                    type="number"

                    placeholder="VD: 170"

                    value={height}

                    onChange={e => setHeight(e.target.value === '' ? '' : Number(e.target.value))}

                  />

                  {bmiVal && (

                    <small style={{ color: '#0f766e', fontWeight: 700 }}>

                      BMI: {bmiVal} ({Number(bmiVal) < 18.5 ? 'Gầy' : Number(bmiVal) <= 24.9 ? 'Bình thường' : 'Thừa cân'})

                    </small>

                  )}

                </div>

              </div>

              {/* Triage Level Selection */}

              <div className="triage-level-select-wrap">

                <label className="section-label">Phân tầng mức độ ưu tiên (Manchester Triage)</label>

                <div className="triage-levels-options">

                  <label className={`triage-radio-card normal ${triageLevel === 'normal' ? 'checked' : ''}`}>

                    <input

                      type="radio"

                      name="triageLevel"

                      value="normal"

                      checked={triageLevel === 'normal'}

                      onChange={() => setTriageLevel('normal')}

                    />

                    <div>

                      <b>Xanh: Tiêu chuẩn</b>

                      <small>Sinh hiệu ổn định, chờ khám theo thứ tự</small>

                    </div>

                  </label>

                  <label className={`triage-radio-card priority ${triageLevel === 'priority' ? 'checked' : ''}`}>

                    <input

                      type="radio"

                      name="triageLevel"

                      value="priority"

                      checked={triageLevel === 'priority'}

                      onChange={() => setTriageLevel('priority')}

                    />

                    <div>

                      <b>Vàng: Ưu tiên</b>

                      <small>Sốt cao, mạch nhanh hoặc có dấu hiệu bất thường</small>

                    </div>

                  </label>

                  <label className={`triage-radio-card emergency ${triageLevel === 'emergency' ? 'checked' : ''}`}>

                    <input

                      type="radio"

                      name="triageLevel"

                      value="emergency"

                      checked={triageLevel === 'emergency'}

                      onChange={() => setTriageLevel('emergency')}

                    />

                    <div>

                      <b>Đỏ: Khẩn cấp / Cấp cứu</b>

                      <small>SpO2 {'<'} 95%, khó thở hoặc đau ngực dữ dội</small>

                    </div>

                  </label>

                </div>

              </div>

              {/* Triage Notes */}

              <div className="form-field-wrap full-width">

                <label>Ghi chú điều dưỡng & Triệu chứng ghi nhận</label>

                <textarea

                  rows={2}

                  placeholder="Ghi chú thêm về tri giác, tiếp xúc, tiền sử dị ứng hoặc yêu cầu đặc biệt..."

                  value={triageNotes}

                  onChange={e => setTriageNotes(e.target.value)}

                />

              </div>

              <div className="form-submit-row">

                <button

                  type="submit"

                  className="btn-submit-triage"

                  disabled={isSubmitting}

                >

                  <Send size={16} />

                  {isSubmitting ? 'Đang chuyển hồ sơ...' : 'Lưu Sinh Hiệu & Đưa Vào Phòng Chờ'}

                </button>

              </div>

            </form>

          )}

        </section>

      </div>

      )}

      {/* VIEW 2: LỊCH KHÁM TOÀN VIỆN & PHÂN LUỒNG */}

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

              <input

                type="text"

                placeholder="Tìm bệnh nhân / Bác sĩ..."

                value={apptSearch}

                onChange={e => setApptSearch(e.target.value)}

                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', width: '200px' }}

              />

              <button

                type="button"

                onClick={loadAppointments}

                style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}

              >

                🔄 Tải lại

              </button>

            </div>

          </div>

          {loadingAppts ? (

            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>Đang tải danh sách lịch khám...</div>

          ) : (

            <div style={{ overflowX: 'auto' }}>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>

                <thead>

                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>

                    <th style={{ padding: '12px 14px' }}>Thời Gian</th>

                    <th style={{ padding: '12px 14px' }}>Bệnh Nhân</th>

                    <th style={{ padding: '12px 14px' }}>Khoa / Bác Sĩ</th>

                    <th style={{ padding: '12px 14px' }}>Điều Dưỡng Tiếp Đón</th>

                    <th style={{ padding: '12px 14px' }}>Sinh Hiệu Triage</th>

                    <th style={{ padding: '12px 14px' }}>Trạng Thái</th>

                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao Tác</th>

                  </tr>

                </thead>

                <tbody>

                  {appointments

                    .filter(a => {

                      if (apptStatusFilter !== 'all' && a.status !== apptStatusFilter) return false

                      if (apptSearch) {

                        const q = apptSearch.toLowerCase()

                        const pName = (a.patient_name || '').toLowerCase()

                        const dName = (a.doctor_name || '').toLowerCase()

                        const r = (a.reason || '').toLowerCase()

                        if (!pName.includes(q) && !dName.includes(q) && !r.includes(q)) return false

                      }

                      return true

                    })

                    .map(a => {

                      const isWaiting = a.status === 'waiting'

                      const isDone = a.status === 'completed'

                      const isAttending = a.nurse_id === nurse?.id

                      return (

                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>

                          <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>

                            <div style={{ fontWeight: 700, color: '#0f172a' }}>

                              {new Date(a.starts_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}

                            </div>

                            <div style={{ fontSize: '11px', color: '#64748b' }}>

                              {new Date(a.starts_at).toLocaleDateString('vi-VN')}

                            </div>

                          </td>

                          <td style={{ padding: '12px 14px' }}>

                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.patient_name || `Bệnh nhân #${a.patient_id}`}</div>

                            <div style={{ fontSize: '11px', color: '#64748b' }}>Lý do: {a.reason}</div>

                            {a.bhyt_code && (

                              <span style={{ display: 'inline-block', padding: '1px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '10px', fontWeight: 600, marginTop: '2px' }}>

                                BHYT: {a.bhyt_code} ({a.bhyt_rate}%)

                              </span>

                            )}

                          </td>

                          <td style={{ padding: '12px 14px' }}>

                            <div style={{ fontWeight: 600, color: '#0284c7' }}>{a.doctor_name || `Bác sĩ #${a.doctor_id}`}</div>

                            <div style={{ fontSize: '11px', color: '#64748b' }}>{a.department_name || 'Khoa Khám Bệnh'}</div>

                          </td>

                          <td style={{ padding: '12px 14px' }}>

                            {a.nurse_name ? (

                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>

                                👩‍⚕️ {a.nurse_name}

                              </span>

                            ) : (

                              <button

                                type="button"

                                onClick={() => handleAssignSelf(a.id)}

                                style={{ padding: '4px 8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}

                              >

                                + Nhận tiếp đón

                              </button>

                            )}

                          </td>

                          <td style={{ padding: '12px 14px' }}>

                            {a.blood_pressure || a.pulse ? (

                              <div style={{ fontSize: '11px' }}>

                                {a.blood_pressure && <span style={{ fontWeight: 700 }}>HA: {a.blood_pressure} </span>}

                                {a.pulse && <span>Mạch: {a.pulse} bpm </span>}

                                {a.spo2 && <span style={{ color: '#059669', fontWeight: 600 }}>SpO2: {a.spo2}%</span>}

                              </div>

                            ) : (

                              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Chưa đo sinh hiệu</span>

                            )}

                          </td>

                          <td style={{ padding: '12px 14px' }}>

                            <span style={{

                              display: 'inline-block',

                              padding: '3px 8px',

                              borderRadius: '6px',

                              fontSize: '11px',

                              fontWeight: 700,

                              background: isWaiting ? '#fef3c7' : isDone ? '#dcfce7' : '#e0f2fe',

                              color: isWaiting ? '#b45309' : isDone ? '#166534' : '#0369a1'

                            }}>

                              {isWaiting ? '⏳ Phòng chờ Bác sĩ' : isDone ? '✓ Đã hoàn tất' : a.status === 'in_progress' ? '🩺 Đang khám' : '📅 Đã đặt lịch'}

                            </span>

                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>

                            <button

                              type="button"

                              onClick={() => {

                                setMainTab('triage')

                                const tItem = queue.find(q => q.appointment_id === a.id)

                                if (tItem) handleSelectItem(tItem)

                              }}

                              style={{

                                padding: '6px 12px',

                                background: '#0f766e',

                                color: '#fff',

                                border: 'none',

                                borderRadius: '6px',

                                fontSize: '11px',

                                fontWeight: 700,

                                cursor: 'pointer'

                              }}

                            >

                              🩺 Đo Sinh Hiệu

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

      {/* VIEW 3: CA TRỰC & GIAO BAN ĐIỀU DƯỠNG */}

      {mainTab === 'shifts' && (

        <section className="panel" style={{ padding: '24px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', display: 'grid', gap: '20px' }}>

          {/* Shift Overview Metrics */}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0f766e' }}>

              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Ca trực hôm nay của tôi</span>

              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>

                Ca Sáng (07:00 - 11:30)

              </div>

              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>🟢 Đang trong ca trực tiếp đón</span>

            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #0284c7' }}>

              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Bàn trực phân công</span>

              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0284c7', margin: '6px 0' }}>

                Bàn Triage 01 (Khoa Khám Bệnh)

              </div>

              <span style={{ fontSize: '11px', color: '#64748b' }}>Đo sinh hiệu & tiếp nhận ban đầu</span>

            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: '4px solid #8b5cf6' }}>

              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Bệnh nhân đã tiếp đón</span>

              <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', margin: '6px 0' }}>

                4 / 30 <small style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>bệnh nhân</small>

              </div>

              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Công suất phục vụ: 13%</span>

            </div>

          </div>

          {/* Sổ Giao Ban Ca Trực (Handover Notes) */}

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '18px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>

              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>

                <ClipboardCheck size={18} /> Sổ Giao Ban Ca Trực Điều Dưỡng (Handover Log)

              </h4>

              <span style={{ fontSize: '11px', color: '#15803d' }}>Ghi nhận lúc giao nhận ca giữa các điều dưỡng</span>

            </div>

            <textarea

              rows={3}

              value={handoverNoteDraft}

              onChange={e => setHandoverNoteDraft(e.target.value)}

              placeholder="Nhập ghi chú giao ban: tình hình bệnh nhân đông, ca sốt cao hoặc cấp cứu cần bàn giao, tình trạng thiết bị đo Bluetooth..."

              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '12px', background: '#fff' }}

            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>

              <button

                type="button"

                onClick={() => {

                  const myShift = nurseShifts.find(s => s.nurse_id === nurse?.id && s.is_active)

                  if (myShift) handleSaveHandover(myShift.id)

                  else setToastMessage('Chưa tìm thấy ca trực hoạt động để cập nhật')

                }}

                style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}

              >

                💾 Lưu Sổ Giao Ban Ca

              </button>

            </div>

          </div>

          {/* Table of all nurse shifts */}

          <div>

            <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>

              Lịch Phân Ca Trực Điều Dưỡng ({nurseShifts.length} ca trực)

            </h4>

            <div style={{ overflowX: 'auto' }}>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>

                <thead>

                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569', fontWeight: 700 }}>

                    <th style={{ padding: '10px 12px' }}>Ngày Trực</th>

                    <th style={{ padding: '10px 12px' }}>Ca Làm Việc</th>

                    <th style={{ padding: '10px 12px' }}>Điều Dưỡng Phụ Trách</th>

                    <th style={{ padding: '10px 12px' }}>Vị Trí / Bàn Tiếp Đón</th>

                    <th style={{ padding: '10px 12px' }}>Giờ Bắt Đầu - Kết Thúc</th>

                    <th style={{ padding: '10px 12px' }}>Đã Tiếp Đón</th>

                    <th style={{ padding: '10px 12px' }}>Giao Ban</th>

                  </tr>

                </thead>

                <tbody>

                  {nurseShifts.map(s => (

                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>

                      <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{s.shift_date}</td>

                      <td style={{ padding: '10px 12px' }}>

                        <span style={{

                          padding: '2px 8px',

                          borderRadius: '6px',

                          fontSize: '11px',

                          fontWeight: 700,

                          background: s.shift_type === 'morning' ? '#e0f2fe' : s.shift_type === 'afternoon' ? '#fef3c7' : '#f3e8ff',

                          color: s.shift_type === 'morning' ? '#0369a1' : s.shift_type === 'afternoon' ? '#b45309' : '#7e22ce'

                        }}>

                          {s.shift_type === 'morning' ? 'Ca Sáng' : s.shift_type === 'afternoon' ? 'Ca Chiều' : 'Ca Tối/Đêm'}

                        </span>

                      </td>

                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>👩‍⚕️ {s.nurse_name || 'Điều dưỡng'}</td>

                      <td style={{ padding: '10px 12px', color: '#0f766e', fontWeight: 600 }}>{s.desk_name}</td>

                      <td style={{ padding: '10px 12px' }}>{s.start_time} - {s.end_time}</td>

                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>

                        {s.attended_count} / {s.max_patients}

                      </td>

                      <td style={{ padding: '10px 12px', fontSize: '11px', color: '#64748b', maxWidth: '250px' }}>

                        {s.handover_notes || '—'}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </div>

        </section>

      )}

      {/* Modal Phân Ca Trực Mới */}

      {showCreateShiftModal && (

        <div className="modal-backdrop">

          <div className="modal" style={{ maxWidth: '480px', padding: '24px' }}>

            <h3 style={{ margin: '0 0 16px', fontSize: '17px', color: '#0f172a', fontWeight: 800 }}>

              Phân Ca Trực Mới Cho Điều Dưỡng

            </h3>

            <form onSubmit={handleCreateShift} style={{ display: 'grid', gap: '14px' }}>

              <div>

                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>

                  Điều dưỡng viên

                </label>

                <select

                  value={newShiftNurseId}

                  onChange={e => setNewShiftNurseId(Number(e.target.value))}

                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}

                  required

                >

                  {nursesList.map(n => (

                    <option key={n.id} value={n.id}>{n.full_name} ({n.email})</option>

                  ))}

                </select>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

                <div>

                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>

                    Ngày trực

                  </label>

                  <input

                    type="date"

                    value={newShiftDate}

                    onChange={e => setNewShiftDate(e.target.value)}

                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}

                    required

                  />

                </div>

                <div>

                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>

                    Ca làm việc

                  </label>

                  <select

                    value={newShiftType}

                    onChange={e => setNewShiftType(e.target.value)}

                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}

                  >

                    <option value="morning">Ca Sáng (07:00 - 11:30)</option>

                    <option value="afternoon">Ca Chiều (13:00 - 17:00)</option>

                    <option value="night">Ca Tối / Đêm (17:00 - 22:00)</option>

                  </select>

                </div>

              </div>

              <div>

                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>

                  Vị trí / Bàn tiếp đón phân công

                </label>

                <input

                  type="text"

                  value={newDeskName}

                  onChange={e => setNewDeskName(e.target.value)}

                  placeholder="VD: Bàn Tiếp đón Triage 01 (Khoa Khám Bệnh)"

                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}

                  required

                />

              </div>

              <div>

                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>

                  Số bệnh nhân tiếp đón tối đa

                </label>

                <input

                  type="number"

                  value={newMaxPatients}

                  onChange={e => setNewMaxPatients(Number(e.target.value))}

                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}

                  min={5}

                  max={100}

                />

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>

                <button

                  type="button"

                  onClick={() => setShowCreateShiftModal(false)}

                  style={{ padding: '8px 14px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}

                >

                  Hủy

                </button>

                <button

                  type="submit"

                  style={{ padding: '8px 16px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}

                >

                  Xác Nhận Phân Ca

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* Modal chi tiết Hồ sơ Bệnh án EMR định danh CCCD/VNeID */}

      <PatientIdentificationModal

        result={identifiedPatient}

        isOpen={showHistoryModal}

        onClose={() => setShowHistoryModal(false)}

        onSelectForTriage={handleApplyIdentifiedPatient}

      />

    </div>

  )

}
