import { SmartDevicesHub } from './SmartDevicesHub'
import React, { useState, useEffect, useRef } from 'react'
import {
  CalendarDays,
  Clock,
  Video,
  HeartPulse,
  Activity,
  FileText,
  Pill,
  ShieldCheck,
  CreditCard,
  Users,
  FlaskConical,
  ScanLine,
  ArrowRight,
  Plus,
  ChevronRight,
  Sparkles,
  Phone,
  AlertCircle,
  Download,
  CheckCircle2,
  Bluetooth,
  Camera,
  RefreshCw,
  Sliders,
  Check,
  X,
  Zap,
  TrendingUp,
  Cpu,
  Wifi,
  Info,
  Scale,
  Thermometer,
  Droplets,
  ExternalLink,
  ShieldAlert
} from 'lucide-react'
import { Appointment, RPMVitalItem, recordRPMVitals } from './api'
import {
  isWebBluetoothSupported,
  readBloodPressureBLE,
  readGlucoseBLE,
  readSpO2BLE,
  readThermometerBLE,
  simulateDeviceReading
} from './bluetoothService'
import { cameraPpgService, PPGMeasurementResult, PPGFrameData } from './cameraPpgService'
import { NotificationCenter } from './NotificationCenter'

interface PatientDashboardProps {
  user: any
  appointments: Appointment[]
  doctors: any[]
  vitalsLogs?: RPMVitalItem[]
  onBook: () => void
  onJoin: (appointment: Appointment) => void
  onNavigate: (view: string) => void
  onPay?: (appointment: Appointment) => void
  onDownloadPdf?: (appointmentId: number) => void
  onRefreshVitals?: () => void
}

interface ConnectedDeviceInfo {
  id: string
  name: string
  brand: string
  category: 'bp' | 'glucose' | 'spo2' | 'temp' | 'scale' | 'camera'
  status: 'connected' | 'ready' | 'measuring' | 'disconnected'
  battery?: number
  lastSync?: string
  lastReading?: string
  icon: any
  accentColor: string
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({
  user,
  appointments,
  doctors,
  vitalsLogs = [],
  onBook,
  onJoin,
  onNavigate,
  onPay,
  onDownloadPdf,
  onRefreshVitals
}) => {
  // 1. Navigation & Appointment Context
  const upcomingAppointments = appointments.filter(a =>
    ['scheduled', 'confirmed', 'waiting', 'in_progress'].includes(a.status)
  )
  const nextAppt = upcomingAppointments[0]
  const completedAppointments = appointments.filter(a => a.status === 'completed')
  const latestVital = vitalsLogs[0] || null

  // 2. Device Hub State
  const [activeDeviceFilter, setActiveDeviceFilter] = useState<string>('all')
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  // 3. Camera Optical PPG Modal State
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false)
  const [cameraProgress, setCameraProgress] = useState<number>(0)
  const [cameraCurrentBpm, setCameraCurrentBpm] = useState<number>(0)
  const [cameraStatusText, setCameraStatusText] = useState<string>('Đang sẵn sàng kết nối camera...')
  const [cameraResult, setCameraResult] = useState<PPGMeasurementResult | null>(null)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const waveformPoints = useRef<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 4. Manual Entry Quick Intake Modal State
  const [showManualModal, setShowManualModal] = useState<boolean>(false)
  const [manualSys, setManualSys] = useState<number>(120)
  const [manualDia, setManualDia] = useState<number>(80)
  const [manualPulse, setManualPulse] = useState<number>(75)
  const [manualGlucose, setManualGlucose] = useState<number>(5.6)
  const [manualSpo2, setManualSpo2] = useState<number>(98)
  const [manualTemp, setManualTemp] = useState<number>(36.6)
  const [manualWeight, setManualWeight] = useState<number>(62)
  const [manualHeight, setManualHeight] = useState<number>(168)
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false)

  // Paired devices list
  const [devices, setDevices] = useState<ConnectedDeviceInfo[]>([
    {
      id: 'dev_bp',
      name: 'Omron HEM-7361T Smart BP',
      brand: 'Omron Healthcare Japan (FDA / CE)',
      category: 'bp',
      status: 'connected',
      battery: 88,
      lastSync: '15 phút trước',
      lastReading: `${latestVital?.systolic || 120}/${latestVital?.diastolic || 80} mmHg`,
      icon: HeartPulse,
      accentColor: '#ef4444'
    },
    {
      id: 'dev_glucose',
      name: 'Roche Accu-Chek Instant BLE',
      brand: 'Roche Diagnostics (FDA Class II)',
      category: 'glucose',
      status: 'ready',
      battery: 92,
      lastSync: 'Hôm qua, 07:15',
      lastReading: `${latestVital?.glucose_value || 5.6} mmol/L`,
      icon: Droplets,
      accentColor: '#f59e0b'
    },
    {
      id: 'dev_spo2',
      name: 'Wellue FS20F Bluetooth Oximeter',
      brand: 'Wellue Viatom Medical',
      category: 'spo2',
      status: 'ready',
      battery: 76,
      lastSync: '2 giờ trước',
      lastReading: `${latestVital?.spo2_percent || 98}% SpO2`,
      icon: Activity,
      accentColor: '#0ea5e9'
    },
    {
      id: 'dev_temp',
      name: 'Braun ThermoScan 7 Infrared',
      brand: 'Braun Germany (Age Precision)',
      category: 'temp',
      status: 'ready',
      battery: 85,
      lastSync: 'Hôm qua, 18:30',
      lastReading: `${latestVital?.temperature_celsius || 36.6} °C`,
      icon: Thermometer,
      accentColor: '#10b981'
    },
    {
      id: 'dev_scale',
      name: 'Tanita BC-401 Body Composition',
      brand: 'Tanita Japan (Đo BMI & BIA)',
      category: 'scale',
      status: 'ready',
      battery: 94,
      lastSync: '3 ngày trước',
      lastReading: '62.0 kg (BMI: 21.8)',
      icon: Scale,
      accentColor: '#8b5cf6'
    },
    {
      id: 'dev_camera',
      name: 'Camera Optical PPG Bio-Sensor',
      brand: 'CareConnect AI Vision Engine',
      category: 'camera',
      status: 'ready',
      lastSync: 'Vừa xong',
      lastReading: `${latestVital?.pulse || 72} bpm`,
      icon: Camera,
      accentColor: '#059669'
    }
  ])

  // Auto clear toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setToastMessage({ type, text })
  }

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  // Calculate BMI and health category
  const calculateBMI = (weight: number, heightCm: number) => {
    if (!heightCm || !weight) return { bmi: 0, text: 'Chưa có dữ liệu', color: '#64748b' }
    const heightM = heightCm / 100
    const bmiVal = Number((weight / (heightM * heightM)).toFixed(1))
    if (bmiVal < 18.5) return { bmi: bmiVal, text: 'Thiếu cân', color: '#f59e0b' }
    if (bmiVal < 23) return { bmi: bmiVal, text: 'Chuẩn WHO Tây TBD', color: '#10b981' }
    if (bmiVal < 25) return { bmi: bmiVal, text: 'Tiền béo phì', color: '#f97316' }
    return { bmi: bmiVal, text: 'Béo phì độ I', color: '#ef4444' }
  }

  // Calculate MAP (Mean Arterial Pressure)
  const calculateMAP = (sys: number, dia: number) => {
    if (!sys || !dia) return 0
    return Math.round((2 * dia + sys) / 3)
  }

  // Handle Bluetooth measurement trigger
  const handleMeasureDevice = async (device: ConnectedDeviceInfo) => {
    setConnectingDeviceId(device.id)
    showToast('info', `Đang kết nối ${device.name} qua Bluetooth BLE...`)

    try {
      if (device.category === 'bp') {
        let res
        if (isWebBluetoothSupported()) {
          try {
            res = await readBloodPressureBLE()
          } catch (e: any) {
            console.warn('Fallback to simulation:', e)
            res = await simulateDeviceReading('blood_pressure')
          }
        } else {
          res = await simulateDeviceReading('blood_pressure')
        }

        await recordRPMVitals({
          patient_id: user.id,
          device_type: 'blood_pressure',
          device_name: res.deviceName || device.name,
          connection_method: 'bluetooth_ble',
          systolic: res.systolic,
          diastolic: res.diastolic,
          pulse: res.pulse
        })

        setDevices(prev => prev.map(d => d.id === device.id ? {
          ...d,
          status: 'connected',
          lastSync: 'Vừa xong',
          lastReading: `${res.systolic}/${res.diastolic} mmHg`
        } : d))

        showToast('success', `Đã nhận kết quả: ${res.systolic}/${res.diastolic} mmHg, Nhịp tim: ${res.pulse} bpm!`)
      } else if (device.category === 'glucose') {
        let res
        if (isWebBluetoothSupported()) {
          try {
            res = await readGlucoseBLE()
          } catch (e) {
            res = await simulateDeviceReading('blood_glucose')
          }
        } else {
          res = await simulateDeviceReading('blood_glucose')
        }

        await recordRPMVitals({
          patient_id: user.id,
          device_type: 'glucose',
          device_name: res.deviceName || device.name,
          connection_method: 'bluetooth_ble',
          glucose_value: res.glucoseValue
        })

        setDevices(prev => prev.map(d => d.id === device.id ? {
          ...d,
          status: 'connected',
          lastSync: 'Vừa xong',
          lastReading: `${res.glucoseValue} mmol/L`
        } : d))

        showToast('success', `Đã đồng bộ đường huyết: ${res.glucoseValue} mmol/L`)
      } else if (device.category === 'spo2') {
        let res
        if (isWebBluetoothSupported()) {
          try {
            res = await readSpO2BLE()
          } catch (e) {
            res = await simulateDeviceReading('spo2')
          }
        } else {
          res = await simulateDeviceReading('spo2')
        }

        await recordRPMVitals({
          patient_id: user.id,
          device_type: 'pulse_oximeter',
          device_name: res.deviceName || device.name,
          connection_method: 'bluetooth_ble',
          spo2_percent: res.spo2,
          pulse: res.pulse
        })

        setDevices(prev => prev.map(d => d.id === device.id ? {
          ...d,
          status: 'connected',
          lastSync: 'Vừa xong',
          lastReading: `${res.spo2}% SpO2`
        } : d))

        showToast('success', `Đã đo SpO2: ${res.spo2}%, Nhịp mạch: ${res.pulse} bpm`)
      } else if (device.category === 'temp') {
        let res
        if (isWebBluetoothSupported()) {
          try {
            res = await readThermometerBLE()
          } catch (e) {
            res = await simulateDeviceReading('temperature')
          }
        } else {
          res = await simulateDeviceReading('temperature')
        }

        await recordRPMVitals({
          patient_id: user.id,
          device_type: 'thermometer',
          device_name: res.deviceName || device.name,
          connection_method: 'bluetooth_ble',
          temperature_celsius: res.temperatureCelsius
        })

        setDevices(prev => prev.map(d => d.id === device.id ? {
          ...d,
          status: 'connected',
          lastSync: 'Vừa xong',
          lastReading: `${res.temperatureCelsius} °C`
        } : d))

        showToast('success', `Đã ghi nhận thân nhiệt: ${res.temperatureCelsius} °C`)
      } else if (device.category === 'camera') {
        handleOpenOpticalCamera()
      } else {
        // Smart scale
        const w = 62.4
        await recordRPMVitals({
          patient_id: user.id,
          device_type: 'scale',
          device_name: device.name,
          connection_method: 'bluetooth_ble',
          weight_kg: w
        })

        setDevices(prev => prev.map(d => d.id === device.id ? {
          ...d,
          status: 'connected',
          lastSync: 'Vừa xong',
          lastReading: `${w} kg (BMI: 21.8)`
        } : d))

        showToast('success', `Đã đồng bộ cân nặng: ${w} kg`)
      }

      if (onRefreshVitals) onRefreshVitals()
    } catch (err: any) {
      console.error('Error connecting device:', err)
      showToast('error', `Lỗi kết nối thiết bị: ${err.message || 'Không thể đọc dữ liệu'}`)
    } finally {
      setConnectingDeviceId(null)
    }
  }

  // Draw waveform on canvas
  const drawWaveform = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, cvs.width, cvs.height)

    // Grid
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let x = 0; x < cvs.width; x += 30) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, cvs.height)
      ctx.stroke()
    }
    for (let y = 0; y < cvs.height; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(cvs.width, y)
      ctx.stroke()
    }

    // Waveform
    const pts = waveformPoints.current
    if (pts.length > 1) {
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      const step = cvs.width / Math.max(pts.length, 50)
      pts.forEach((pt, idx) => {
        const x = idx * step
        const y = cvs.height / 2 - pt * 0.4
        if (idx === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }
  }

  // Camera PPG Measurement logic
  const handleOpenOpticalCamera = () => {
    setShowCameraModal(true)
    setCameraProgress(0)
    setCameraCurrentBpm(0)
    setCameraResult(null)
    setCameraStatusText('Chuẩn bị camera và đặt nhẹ ngón tay lên ống kính...')
    setIsCameraActive(false)
    waveformPoints.current = []
  }

  const handleStartCameraScan = async () => {
    setIsCameraActive(true)
    setCameraProgress(0)
    setCameraCurrentBpm(0)
    setCameraResult(null)
    setCameraStatusText('Đang truy cập camera & bật đèn flash trợ sáng...')
    waveformPoints.current = []

    cameraPpgService.onFrame = (frame: PPGFrameData) => {
      if (frame.bpm) setCameraCurrentBpm(frame.bpm)
      waveformPoints.current.push(frame.filteredVal)
      if (waveformPoints.current.length > 100) {
        waveformPoints.current.shift()
      }
      drawWaveform()
    }

    cameraPpgService.onProgress = (percent: number, bpm: number | null) => {
      setCameraProgress(percent)
      if (bpm) setCameraCurrentBpm(bpm)
      if (percent < 25) {
        setCameraStatusText('Đang hiệu chỉnh cảm biến quang học...')
      } else if (percent < 60) {
        setCameraStatusText('Phát hiện mao mạch đập, giữ yên ngón tay...')
      } else {
        setCameraStatusText('Đang xử lý thuật toán Bandpass & FFT...')
      }
    }

    cameraPpgService.onComplete = async (res: PPGMeasurementResult) => {
      setCameraResult(res)
      setIsCameraActive(false)
      setCameraStatusText('Đo hoàn tất thành công!')

      await recordRPMVitals({
        patient_id: user.id,
        device_type: 'camera_ppg',
        device_name: 'CareConnect Camera PPG Bio-Sensor',
        connection_method: 'camera_ppg',
        pulse: res.pulse,
        spo2_percent: res.spo2
      })

      if (onRefreshVitals) onRefreshVitals()
      showToast('success', `Đo PPG thành công: Nhịp tim ${res.pulse} bpm, SpO2 ~${res.spo2}%`)
    }

    cameraPpgService.onError = (err: Error) => {
      setIsCameraActive(false)
      setCameraStatusText(`Lỗi: ${err.message || 'Không thể đo'}`)
      showToast('error', `Lỗi đo camera: ${err.message || 'Thất bại'}`)
    }

    try {
      await cameraPpgService.start(15)
    } catch (err: any) {
      setIsCameraActive(false)
      setCameraStatusText(`Lỗi: ${err.message || 'Không thể mở camera'}`)
      showToast('error', 'Vui lòng cấp quyền truy cập Camera để đo nhịp tim')
    }
  }

  const handleStopCameraScan = () => {
    cameraPpgService.stop()
    setIsCameraActive(false)
    setShowCameraModal(false)
  }

  // Handle Manual Form Submit
  const handleSaveManualVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingManual(true)
    try {
      await recordRPMVitals({
        patient_id: user.id,
        device_type: 'manual_intake',
        device_name: 'Nhập sinh hiệu tự đo tại nhà',
        connection_method: 'manual',
        systolic: Number(manualSys),
        diastolic: Number(manualDia),
        pulse: Number(manualPulse),
        glucose_value: Number(manualGlucose),
        spo2_percent: Number(manualSpo2),
        temperature_celsius: Number(manualTemp),
        weight_kg: Number(manualWeight)
      })

      setShowManualModal(false)
      showToast('success', 'Đã lưu chỉ số sinh hiệu vào bệnh án điện tử thành công!')
      if (onRefreshVitals) onRefreshVitals()
    } catch (err: any) {
      console.error('Error saving manual vitals:', err)
      showToast('error', 'Lỗi khi lưu dữ liệu sinh hiệu.')
    } finally {
      setIsSavingManual(false)
    }
  }

  const filteredDevices = activeDeviceFilter === 'all'
    ? devices
    : devices.filter(d => d.category === activeDeviceFilter)

  const patientBmi = calculateBMI(manualWeight, manualHeight)
  const patientMap = calculateMAP(latestVital?.systolic || 120, latestVital?.diastolic || 80)

  return (
    <div className="patient-dashboard-v2">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`portal-toast ${toastMessage.type}`}>
          {toastMessage.type === 'success' && <CheckCircle2 size={18} />}
          {toastMessage.type === 'info' && <Info size={18} />}
          {toastMessage.type === 'error' && <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
          <button className="toast-close-btn" onClick={() => setToastMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. TOP HEADER: Clinical Identity & Accreditation Bar */}
      <section className="portal-header-card">
        <div className="portal-header-left">
          <div className="portal-avatar-wrap">
            <div className="portal-avatar">
              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'BN'}
            </div>
            <div className="online-indicator" title="Đang trực tuyến" />
          </div>

          <div className="portal-user-meta">
            <div className="portal-tags-row">
              <span className="badge-role">CỔNG BỆNH NHÂN TRỰC TUYẾN</span>
              <span className="badge-pid">PID: CC-PAT-{user.id?.toString().padStart(4, '0') || '0001'}</span>
              <span className="badge-vneid">
                <ShieldCheck size={13} /> VNeID Mức 2
              </span>
              <span className="badge-security">
                <ShieldAlert size={13} /> NĐ 13/2023/NĐ-CP
              </span>
            </div>
            <h2>{getGreeting()}, {user.full_name || 'Quý bệnh nhân'}!</h2>
            <p className="portal-subtext">
              Hệ thống Bệnh viện Số CareConnect • Khám chuyên khoa từ xa Video HD • Đơn thuốc điện tử Quốc gia • Đồng bộ sinh hiệu y tế FDA.
            </p>
          </div>
        </div>

        <div className="portal-header-actions">
          <div className="portal-header-actions-row">
            <div className="portal-notif-btn-wrapper">
              <NotificationCenter
                userRole={user.role}
                onNavigate={(url) => {
                  if (url.includes('appointments') || url.includes('booking')) onNavigate('appointments')
                  else if (url.includes('prescriptions')) onNavigate('prescriptions')
                  else if (url.includes('paraclinical') || url.includes('labs') || url.includes('lab')) onNavigate('lab')
                  else if (url.includes('profile')) onNavigate('profile')
                  else if (url.includes('records')) onNavigate('records')
                  else if (url.includes('vitals')) onNavigate('vitals')
                }}
              />
            </div>
            <button className="btn-portal-primary" onClick={onBook}>
              <Plus size={16} /> Đặt lịch khám ngay
            </button>
          </div>
          <button className="btn-portal-secondary" onClick={() => onNavigate('records')}>
            <FileText size={15} /> Bệnh án của tôi
          </button>
        </div>
      </section>

      {/* 2. SPOTLIGHT: Next Consultation or Waiting Room */}
      {nextAppt ? (
        <section className={`consultation-spotlight-card ${nextAppt.status}`}>
          <div className="spotlight-badge-line">
            <span className="live-pulse-dot" />
            <span className="spotlight-badge-text">
              {nextAppt.status === 'in_progress' ? 'PHIÊN KHÁM ĐANG DIỄN RA' :
               nextAppt.status === 'waiting' ? 'ĐANG Ở PHÒNG CHỜ BÁC SĨ' :
               'LỊCH HẸN KHÁM SẮP DIỄN RA'}
            </span>
            <span className="spotlight-room-tag">Phòng khám số #{nextAppt.id}</span>
          </div>

          <div className="spotlight-content-body">
            <div className="spotlight-info">
              <h3>Khám {(nextAppt as any).department_name || (nextAppt as any).department || 'Chuyên khoa Nội'} trực tuyến</h3>
              <div className="spotlight-meta-list">
                <div className="spotlight-meta-item">
                  <Clock size={16} className="text-teal" />
                  <span>
                    {nextAppt.starts_at
                      ? new Date(nextAppt.starts_at).toLocaleString('vi-VN', {
                          weekday: 'long',
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Hôm nay'}
                  </span>
                </div>
                <div className="spotlight-meta-item">
                  <HeartPulse size={16} className="text-rose" />
                  <span>
                    Bác sĩ: <b>{doctors.find(d => d.id === nextAppt.doctor_id)?.full_name || (nextAppt as any).doctor_name || 'BS. Chuyên khoa BV CareConnect'}</b>
                  </span>
                </div>
                <div className="spotlight-meta-item">
                  <Activity size={16} className="text-blue" />
                  <span>Lý do: {nextAppt.reason || 'Khám sức khỏe & theo dõi chỉ số'}</span>
                </div>
              </div>
            </div>

            <div className="spotlight-actions">
              <button
                className={`btn-enter-telehealth ${nextAppt.status === 'waiting' ? 'waiting' : 'active'}`}
                onClick={() => onJoin(nextAppt)}
              >
                {nextAppt.status === 'waiting' ? (
                  <>
                    <Clock size={18} /> Vào phòng chờ trực tuyến
                  </>
                ) : (
                  <>
                    <Video size={18} /> Vào phòng khám Video HD
                  </>
                )}
              </button>
              {onPay && nextAppt.status === 'scheduled' && (
                <button className="btn-pay-quick" onClick={() => onPay(nextAppt)}>
                  <CreditCard size={15} /> Thanh toán VietQR
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="no-consultation-card">
          <div className="no-consultation-icon">
            <CalendarDays size={26} />
          </div>
          <div className="no-consultation-text">
            <b>Bạn hiện không có lịch khám sắp diễn ra</b>
            <p>Khám định kỳ từ xa giúp phát hiện sớm các nguy cơ tim mạch và tiểu đường.</p>
          </div>
          <button className="btn-book-sm" onClick={onBook}>
            + Đặt lịch khám Bác sĩ
          </button>
        </section>
      )}

      {/* 3. ⭐ MODULE KẾT NỐI CÁC THIẾT BỊ Y TẾ THÔNG MINH (SMART MEDICAL DEVICE HUB) */}
      <SmartDevicesHub
        user={user}
        vitalsLogs={vitalsLogs}
        onRefreshVitals={onRefreshVitals}
        onNavigate={onNavigate}
        embedded={true}
      />

      {/* 5. COMPLETE DIGITAL HOSPITAL SERVICES GRID */}
      <section className="portal-services-section">
        <div className="section-header-compact">
          <div>
            <h3>Hệ Sinh Thái Khám Chữa Bệnh Từ Xa</h3>
            <p>Đầy đủ dịch vụ y tế số theo chuẩn của Bộ Y Tế</p>
          </div>
        </div>

        <div className="portal-services-grid">
          <div className="portal-service-tile" onClick={onBook}>
            <div className="service-tile-icon icon-teal">
              <CalendarDays size={22} />
            </div>
            <h4>Đặt Lịch Khám Chuyên Khoa</h4>
            <p>Chọn Bác sĩ đầu ngành, đăng ký giờ khám trực tuyến và nhận phòng tư vấn.</p>
            <div className="service-tile-footer">
              <span>Đăng ký ngay</span> <ArrowRight size={14} />
            </div>
          </div>

          <div className="portal-service-tile" onClick={() => onNavigate('records')}>
            <div className="service-tile-icon icon-blue">
              <FileText size={22} />
            </div>
            <h4>Hồ Sơ Bệnh Án Điện Tử (EMR)</h4>
            <p>Bệnh án chính thức có chữ ký số SmartCA, xem lại chẩn đoán và lời dặn.</p>
            <div className="service-tile-footer">
              <span>Xem bệnh án</span> <ArrowRight size={14} />
            </div>
          </div>

          <div className="portal-service-tile" onClick={() => onNavigate('prescriptions')}>
            <div className="service-tile-icon icon-emerald">
              <Pill size={22} />
            </div>
            <h4>Đơn Thuốc Quốc Gia & Mã Đơn</h4>
            <p>Đồng bộ cổng Đơn thuốc Quốc gia Bộ Y tế, tra cứu mã đơn điện tử và liều dùng.</p>
            <div className="service-tile-footer">
              <span>Xem đơn thuốc</span> <ArrowRight size={14} />
            </div>
          </div>

          <div className="portal-service-tile" onClick={() => onNavigate('lab')}>
            <div className="service-tile-icon icon-sky">
              <FlaskConical size={22} />
            </div>
            <h4>Xét Nghiệm & Cận Lâm Sàng</h4>
            <p>Tra cứu kết quả xét nghiệm sinh hóa, huyết học, nước tiểu và nhận xét của Bác sĩ.</p>
            <div className="service-tile-footer">
              <span>Xem kết quả</span> <ArrowRight size={14} />
            </div>
          </div>

          <div className="portal-service-tile" onClick={() => onNavigate('pacs')}>
            <div className="service-tile-icon icon-purple">
              <ScanLine size={22} />
            </div>
            <h4>Phim Chụp X-Quang PACS DICOM</h4>
            <p>Xem phim chụp X-quang, CT-Scanner độ phân giải cao kết hợp bản đồ nhiệt AI.</p>
            <div className="service-tile-footer">
              <span>Mở PACS viewer</span> <ArrowRight size={14} />
            </div>
          </div>

          <div className="portal-service-tile" onClick={() => onNavigate('family')}>
            <div className="service-tile-icon icon-violet">
              <Users size={22} />
            </div>
            <h4>Hồ Sơ Sức Khỏe Gia Đình</h4>
            <p>Quản lý hồ sơ y tế tập trung cho con nhỏ, bố mẹ già trong cùng tài khoản.</p>
            <div className="service-tile-footer">
              <span>Quản lý thành viên</span> <ArrowRight size={14} />
            </div>
          </div>

          <div className="portal-service-tile" onClick={() => onNavigate('insurance')}>
            <div className="service-tile-icon icon-amber">
              <ShieldCheck size={22} />
            </div>
            <h4>Bảo Hiểm Y Tế & XML 4210</h4>
            <p>Tra cứu quyền lợi chi trả BHYT, xuất bảng kê chi phí theo quyết định 4210/QĐ-BYT.</p>
            <div className="service-tile-footer">
              <span>Tra cứu BHYT</span> <ArrowRight size={14} />
            </div>
          </div>

          <div className="portal-service-tile" onClick={() => onNavigate('payments')}>
            <div className="service-tile-icon icon-rose">
              <CreditCard size={22} />
            </div>
            <h4>Thanh Toán Viện Phí VietQR</h4>
            <p>Thanh toán chi phí khám bệnh, tạm ứng viện phí qua mã QR chuyển khoản bảo mật.</p>
            <div className="service-tile-footer">
              <span>Ví viện phí</span> <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* 6. CONSULTATION HISTORY & DISCHARGE TIMELINE */}
      <section className="portal-history-section">
        <div className="section-header-compact">
          <div>
            <h3>Lịch Sử Khám Bệnh & Xuất Viện</h3>
            <p>Toàn bộ hồ sơ khám bệnh được bảo mật vĩnh viễn theo Luật Khám chữa bệnh 2023</p>
          </div>
          <button className="btn-text-link" onClick={() => onNavigate('records')}>
            Xem tất cả ({appointments.length}) <ChevronRight size={15} />
          </button>
        </div>

        {appointments.length === 0 ? (
          <div className="history-empty-box">
            <FileText size={40} className="empty-icon" />
            <b>Chưa có lịch sử khám bệnh</b>
            <p>Sau khi kết thúc phiên khám đầu tiên với Bác sĩ, bệnh án và toa thuốc sẽ hiển thị tại đây.</p>
          </div>
        ) : (
          <div className="history-cards-list">
            {appointments.slice(0, 4).map(appt => {
              const apptDate = appt.starts_at ? new Date(appt.starts_at) : new Date()
              const doctorObj = doctors.find(d => d.id === appt.doctor_id)

              return (
                <div key={appt.id} className="history-row-item">
                  <div className="history-date-chip">
                    <span className="chip-day">{apptDate.getDate()}</span>
                    <span className="chip-month">Tháng {apptDate.getMonth() + 1}</span>
                  </div>

                  <div className="history-detail-block">
                    <div className="history-title-line">
                      <h4>{(appt as any).department_name || (appt as any).department || 'Chuyên khoa Nội'}</h4>
                      <span className={`status-tag ${appt.status}`}>
                        {appt.status === 'completed' ? '✓ Đã hoàn tất' :
                         appt.status === 'waiting' ? '⏳ Đang chờ Bác sĩ' :
                         appt.status === 'in_progress' ? 'Đang khám trực tuyến' : 'Đã xác nhận'}
                      </span>
                    </div>

                    <p className="history-doctor-meta">
                      <span>Bác sĩ phụ trách: <b>{doctorObj?.full_name || (appt as any).doctor_name || 'Bác sĩ chuyên khoa'}</b></span>
                      <span>•</span>
                      <span>Lý do khám: {appt.reason || 'Tư vấn sức khỏe định kỳ'}</span>
                    </p>
                  </div>

                  <div className="history-action-buttons">
                    {appt.status === 'completed' && onDownloadPdf && (
                      <button
                        className="btn-history-pdf"
                        onClick={() => onDownloadPdf(appt.id)}
                        title="Tải Bệnh án điện tử PDF"
                      >
                        <Download size={14} /> Tải EMR
                      </button>
                    )}
                    {['scheduled', 'confirmed', 'waiting', 'in_progress'].includes(appt.status) && (
                      <button
                        className={`btn-history-join ${appt.status === 'waiting' ? 'waiting' : ''}`}
                        onClick={() => onJoin(appt)}
                      >
                        {appt.status === 'waiting' ? <Clock size={14} /> : <Video size={14} />}
                        {appt.status === 'waiting' ? 'Vào phòng chờ' : 'Vào khám'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 7. EMERGENCY HOTLINE FOOTER */}
      <section className="portal-emergency-bar">
        <div className="emergency-icon-wrap">
          <Phone size={24} />
        </div>
        <div className="emergency-text">
          <b>Đường dây nóng Cấp cứu Y tế 24/7: <a href="tel:115">115</a> • Tổng đài BV CareConnect: <a href="tel:19001234">1900 1234</a></b>
          <p>Trường hợp bệnh nhân có dấu hiệu đau thắt ngực, khó thở cấp tính, ngất xỉu xin vui lòng liên hệ ngay cơ sở cấp cứu gần nhất.</p>
        </div>
      </section>

          </div>
  )
}
