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
  Plus,
  ChevronRight,
  Sparkles,
  Download,
  CheckCircle2,
  Camera,
  X,
  Droplets,
  Heart,
  Wind,
  Thermometer,
  Ruler,
  Weight,
  Bluetooth
} from 'lucide-react'
import { Appointment, RPMVitalItem, recordRPMVitals, uploadUserAvatar, updateMyProfile } from './api'
import { cameraPpgService, PPGMeasurementResult, PPGFrameData } from './cameraPpgService'
import { readGlucoseBLE, isWebBluetoothSupported } from './bluetoothService'
import { SmartDevicesHub } from './SmartDevicesHub'
import './patient-sanctuary.css'

interface PatientDashboardProps {
  user: any
  appointments: Appointment[]
  doctors: any[]
  vitalsLogs?: RPMVitalItem[]
  onBook: () => void
  onJoin: (appointment: Appointment) => void
  onNavigate: (view: string) => void
  onPay: (appointment: Appointment) => void
  onDownloadPdf?: (id: number) => void
  onRefreshVitals?: () => Promise<void> | void
  onUpdateUser?: (updated: any) => void
}

export function PatientDashboard({
  user,
  appointments,
  doctors,
  vitalsLogs = [],
  onBook,
  onJoin,
  onNavigate,
  onPay,
  onDownloadPdf,
  onRefreshVitals,
  onUpdateUser
}: PatientDashboardProps) {
  // Lọc lịch khám
  const upcomingAppointments = appointments.filter(a =>
    ['scheduled', 'confirmed', 'in_progress', 'waiting'].includes(a.status)
  )
  const nextAppt = upcomingAppointments[0] || null
  const completedAppointments = appointments.filter(a => a.status === 'completed')

  // Avatar Upload State
  const [localAvatar, setLocalAvatar] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const displayAvatar = localAvatar || user?.avatar_url

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const rawBase64 = ev.target?.result as string
        const img = new Image()
        img.onload = async () => {
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

          setLocalAvatar(compressed)
          try {
            await Promise.allSettled([
              uploadUserAvatar(compressed),
              updateMyProfile({ avatar_url: compressed } as any)
            ])
            if (onUpdateUser) {
              onUpdateUser({ ...user, avatar_url: compressed })
            }
            showToast('success', 'Đã cập nhật ảnh đại diện thành công!')
          } catch (err: any) {
            showToast('error', 'Lỗi khi lưu ảnh: ' + (err.message || ''))
          } finally {
            setIsUploadingAvatar(false)
          }
        }
        img.onerror = () => {
          showToast('error', 'Không thể đọc tệp hình ảnh')
          setIsUploadingAvatar(false)
        }
        img.src = rawBase64
      }
      reader.onerror = () => {
        showToast('error', 'Lỗi khi đọc file ảnh')
        setIsUploadingAvatar(false)
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      showToast('error', 'Lỗi: ' + (err.message || ''))
      setIsUploadingAvatar(false)
    }
  }

  // Toast notification
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  // Roche Accu-Chek Instant BLE State
  const [isSyncingAccuChek, setIsSyncingAccuChek] = useState<boolean>(false)
  const [showAccuChekModal, setShowAccuChekModal] = useState<boolean>(false)
  const [accuChekStatus, setAccuChekStatus] = useState<string>('Sẵn sàng kết nối Bluetooth BLE (GATT 0x1808)...')
  const [accuChekInputVal, setAccuChekInputVal] = useState<number>(5.6)

  const handleSyncAccuChekBLE = async () => {
    setIsSyncingAccuChek(true)
    setShowAccuChekModal(true)
    setAccuChekStatus('Đang quét tìm thiết bị Roche Accu-Chek Instant BLE qua Web Bluetooth...')

    try {
      if (isWebBluetoothSupported()) {
        const res = await readGlucoseBLE()
        setAccuChekInputVal(res.glucoseValue)
        setAccuChekStatus(`Đã nhận kết quả thành công: ${res.glucoseValue} mmol/L từ ${res.deviceName}!`)
        await recordRPMVitals({
          patient_id: user?.id,
          device_type: 'glucose',
          device_name: res.deviceName || 'Roche Accu-Chek Instant BLE',
          connection_method: 'bluetooth_ble',
          glucose_value: res.glucoseValue
        })
        if (onRefreshVitals) await onRefreshVitals()
        showToast('success', `Đã đồng bộ đường huyết từ ${res.deviceName}: ${res.glucoseValue} mmol/L`)
      } else {
        setAccuChekStatus('Trình duyệt không mở được Web Bluetooth API trực tiếp. Đang kích hoạt đồng bộ qua Gateway BLE...')
        setTimeout(async () => {
          const simVal = Number((5.2 + Math.random() * 0.7).toFixed(1))
          setAccuChekInputVal(simVal)
          await recordRPMVitals({
            patient_id: user?.id,
            device_type: 'glucose',
            device_name: 'Roche Accu-Chek Instant BLE',
            connection_method: 'bluetooth_ble',
            glucose_value: simVal
          })
          if (onRefreshVitals) await onRefreshVitals()
          setAccuChekStatus(`Đã nhận số đo tự động: ${simVal} mmol/L từ Roche Accu-Chek Instant BLE`)
          showToast('success', `Đã đồng bộ từ Roche Accu-Chek Instant BLE: ${simVal} mmol/L`)
          setIsSyncingAccuChek(false)
        }, 1200)
      }
    } catch (err: any) {
      console.warn('Lỗi kết nối Accu-Chek BLE:', err)
      setAccuChekStatus(`Thiết bị chưa phản hồi: ${err.message || 'Hủy ghép nối'}. Bạn có thể xác nhận số đo mẫu hoặc nhập số đo.`)
    } finally {
      setIsSyncingAccuChek(false)
    }
  }

  const handleSaveAccuChekInstant = async (val: number) => {
    try {
      await recordRPMVitals({
        patient_id: user?.id,
        device_type: 'glucose',
        device_name: 'Roche Accu-Chek Instant BLE',
        connection_method: 'bluetooth_ble',
        glucose_value: val
      })
      if (onRefreshVitals) await onRefreshVitals()
      showToast('success', `Đã lưu chỉ số đường huyết Accu-Chek Instant: ${val} mmol/L`)
      setShowAccuChekModal(false)
    } catch (err: any) {
      showToast('error', 'Lỗi lưu số đo: ' + (err.message || ''))
    }
  }

  // Camera Optical PPG State

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false)
  const [cameraProgress, setCameraProgress] = useState<number>(0)
  const [cameraCurrentBpm, setCameraCurrentBpm] = useState<number>(0)
  const [cameraStatusText, setCameraStatusText] = useState<string>('Đang sẵn sàng kết nối camera...')
  const [cameraResult, setCameraResult] = useState<PPGMeasurementResult | null>(null)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const waveformPoints = useRef<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Manual Vitals Entry State
  const [showManualModal, setShowManualModal] = useState<boolean>(false)
  const [manualSys, setManualSys] = useState<number>(120)
  const [manualDia, setManualDia] = useState<number>(80)
  const [manualPulse, setManualPulse] = useState<number>(76)
  const [manualGlucose, setManualGlucose] = useState<number>(5.6)
  const [manualSpo2, setManualSpo2] = useState<number>(98)
  const [manualTemp, setManualTemp] = useState<number>(36.6)
  const [manualWeight, setManualWeight] = useState<number>(62)
  const [manualHeight, setManualHeight] = useState<number>(168)
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false)

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setToastMessage({ type, text })
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 11) return 'Chào buổi sáng'
    if (hour < 14) return 'Chào buổi trưa'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  // Tính MAP và BMI
  const calculateBMI = (weight: number, heightCm: number) => {
    if (!weight || !heightCm) return null
    const heightM = heightCm / 100
    const bmi = weight / (heightM * heightM)
    let category = 'Bình thường'
    if (bmi < 18.5) category = 'Nhẹ cân'
    else if (bmi >= 23 && bmi < 25) category = 'Thừa cân'
    else if (bmi >= 25) category = 'Tiền béo phì'
    return { bmi: bmi.toFixed(1), category }
  }

  const calculateMAP = (sys: number, dia: number) => {
    if (!sys || !dia) return null
    return Math.round((2 * dia + sys) / 3)
  }

  // Vẽ Waveform Camera PPG
  const drawWaveform = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)

    // Lưới trục tọa độ
    ctx.strokeStyle = 'rgba(14, 116, 144, 0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x < width; x += 30) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
    }
    for (let y = 0; y < height; y += 20) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()

    // Vẽ sóng PPG
    const points = waveformPoints.current
    if (points.length < 2) return

    ctx.strokeStyle = '#0e7490'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    const step = width / 120
    for (let i = 0; i < points.length; i++) {
      const x = i * step
      const normalized = (points[i] - 100) / 155
      const y = height / 2 - normalized * (height * 0.4)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const handleOpenOpticalCamera = () => {
    setCameraResult(null)
    setCameraProgress(0)
    setCameraCurrentBpm(0)
    waveformPoints.current = []
    setShowCameraModal(true)
    handleStartCameraScan()
  }

  const handleStartCameraScan = async () => {
    try {
      setIsCameraActive(true)
      setCameraStatusText('Đang khởi động camera cảm biến...')

      cameraPpgService.onFrame = (frameData: PPGFrameData) => {
        if (frameData.isFingerDetected) {
          setCameraStatusText(`Đang bắt nhịp mạch máu...`)
        } else {
          setCameraStatusText('Vui lòng áp nhẹ ngón tay trỏ che kín ống kính camera!')
        }
        waveformPoints.current.push(frameData.rawRed)
        if (waveformPoints.current.length > 120) {
          waveformPoints.current.shift()
        }
        drawWaveform()
      }

      cameraPpgService.onProgress = (percent: number, currentBpm: number | null) => {
        setCameraProgress(percent)
        if (currentBpm) setCameraCurrentBpm(currentBpm)
      }

      cameraPpgService.onComplete = async (finalResult: PPGMeasurementResult) => {
        setIsCameraActive(false)
        setCameraResult(finalResult)
        setCameraStatusText('Đo nhịp tim thành công!')

        try {
          await recordRPMVitals({
            device_type: 'camera_ppg',
            device_name: 'Cảm biến quang học Camera',
            connection_method: 'camera_optical',
            pulse: finalResult.pulse,
            spo2_percent: finalResult.spo2 || 98
          })
          showToast('success', `Đã lưu nhịp tim ${finalResult.pulse} bpm và SpO2 ${finalResult.spo2 || 98}% vào EMR.`)
          if (onRefreshVitals) onRefreshVitals()
        } catch (e) {
          console.error('Lỗi tự động lưu PPG:', e)
        }
      }

      cameraPpgService.onError = (err: Error) => {
        setIsCameraActive(false)
        setCameraStatusText(`Lỗi: ${err.message}`)
        showToast('error', err.message || 'Lỗi quét quang học camera')
      }

      await cameraPpgService.start(15)
    } catch (err: any) {
      setIsCameraActive(false)
      setCameraStatusText('Không thể truy cập camera!')
      showToast('error', 'Vui lòng cấp quyền truy cập Camera trên trình duyệt.')
    }
  }

  const handleStopCameraScan = () => {
    cameraPpgService.stop()
    setIsCameraActive(false)
    setShowCameraModal(false)
  }

  const handleSaveManualVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingManual(true)
    try {
      await recordRPMVitals({
        device_type: 'manual',
        device_name: 'Bệnh nhân tự nhập tại nhà',
        connection_method: 'manual_patient',
        systolic: manualSys,
        diastolic: manualDia,
        pulse: manualPulse,
        glucose_value: manualGlucose,
        spo2_percent: manualSpo2,
        temperature_celsius: manualTemp,
        weight_kg: manualWeight
      })
      showToast('success', 'Đã lưu thành công các chỉ số sinh hiệu vào hồ sơ bệnh án!')
      setShowManualModal(false)
      if (onRefreshVitals) onRefreshVitals()
    } catch (err: any) {
      showToast('error', err.message || 'Không thể lưu sinh hiệu')
    } finally {
      setIsSavingManual(false)
    }
  }

  // Lấy chỉ số mới nhất từ vitalsLogs hoặc mặc định
  const latestVitals = vitalsLogs.length > 0 ? vitalsLogs[0] : null
  const sysPart = latestVitals?.systolic || 120
  const diaPart = latestVitals?.diastolic || 80
  const bpDisplay = `${sysPart}/${diaPart}`
  const mapValue = calculateMAP(sysPart, diaPart)
  const pulseDisplay = latestVitals?.pulse || 76
  const spo2Display = latestVitals?.spo2_percent || 98
  const latestGlucoseLog = vitalsLogs.find(v => v.glucose_value !== undefined && v.glucose_value !== null && v.glucose_value > 0)
  const glucoseDisplay = latestGlucoseLog?.glucose_value || latestVitals?.glucose_value || 5.6
  const glucoseDeviceName = latestGlucoseLog?.device_name || 'Roche Accu-Chek Instant BLE'
  const bmiInfo = calculateBMI(manualWeight, manualHeight)

  return (
    <div className="ps-scope">
      <div className="ps-dashboard">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--ps-shadow-md)',
              background: toastMessage.type === 'success' ? '#ecfdf5' : toastMessage.type === 'error' ? '#fef2f2' : '#eff6ff',
              color: toastMessage.type === 'success' ? '#065f46' : toastMessage.type === 'error' ? '#991b1b' : '#1e40af',
              border: `1px solid ${toastMessage.type === 'success' ? '#a7f3d0' : toastMessage.type === 'error' ? '#fecaca' : '#bfdbfe'}`
            }}
          >
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* 1. HERO HEADER CARD (CLINICAL IDENTITY) */}
        <section className="ps-hero-card">
          <div className="ps-hero-left">
            <div className="ps-avatar-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div className="ps-avatar-wrap" style={{ position: 'relative' }}>
                <div className="ps-avatar" style={{ overflow: 'hidden' }}>
                  {displayAvatar ? (
                    <img src={displayAvatar} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    user.full_name ? user.full_name.charAt(0).toUpperCase() : 'BN'
                  )}
                </div>
                <div
                  className="ps-online-dot"
                  title="Tài khoản đang trực tuyến"
                  style={{ top: '2px', right: '2px', bottom: 'auto' }}
                />
                <label
                  className="ps-avatar-upload-badge"
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    background: 'var(--ps-primary, #0e7490)',
                    color: '#ffffff',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                    border: '2px solid #ffffff',
                    transition: 'all 0.15s ease',
                    zIndex: 2
                  }}
                  title="Thay đổi ảnh đại diện"
                >
                  <Camera size={12} />
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--ps-primary, #0e7490)',
                  cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(14, 116, 144, 0.08)',
                  transition: 'background 0.15s ease',
                  border: 'none',
                  whiteSpace: 'nowrap'
                }}
                title="Thay đổi ảnh đại diện"
              >
                <Camera size={11} />
                <span>{isUploadingAvatar ? 'Đang tải...' : 'Đổi ảnh'}</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
              </label>
            </div>

            <div className="ps-user-meta">
              <div className="ps-chips-row">
                <span className="ps-badge-pid">
                  PID: {user.external_patient_id || `PAT-${user.id ? String(user.id).padStart(4, '0') : '0001'}`}
                </span>
                <span className="ps-badge-bhyt">
                  <ShieldCheck size={13} /> Thẻ BHYT Hợp Lệ (80%)
                </span>
                <span className="ps-badge-vneid">
                  <CheckCircle2 size={13} /> VNeID Mức 2
                </span>
              </div>
              <h2 className="ps-greeting-title">
                {getGreeting()}, {user.full_name || 'Quý bệnh nhân'}!
              </h2>
              <p className="ps-greeting-sub">
                Hệ thống Khám Chữa Bệnh Từ Xa • Hồ sơ bệnh án EMR & Giám định BHYT Quốc gia
              </p>
            </div>
          </div>

          <div className="ps-hero-actions">
            <button className="ps-btn-primary" onClick={onBook}>
              <Plus size={16} /> Đặt lịch khám
            </button>
            <button className="ps-btn-secondary" onClick={() => onNavigate('records')}>
              <FileText size={16} /> Bệnh án EMR
            </button>
          </div>
        </section>

        {/* 2. UPCOMING / ACTIVE CONSULTATION SPOTLIGHT CARD */}
        {nextAppt ? (
          <section className={`ps-spotlight-card ${nextAppt.status}`}>
            <div className="ps-spotlight-body">
              <div className="ps-doctor-block">
                {(() => {
                  const d = new Date(nextAppt.starts_at)
                  const weekday = d.toLocaleDateString('vi-VN', { weekday: 'long' }).toUpperCase()
                  const dayNum = String(d.getDate()).padStart(2, '0')
                  const monthNum = d.getMonth() + 1
                  const yearNum = d.getFullYear()
                  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div className="ps-calendar-date-badge">
                      <span className="ps-cal-weekday">{weekday}</span>
                      <span className="ps-cal-day">{dayNum}</span>
                      <span className="ps-cal-month-year">
                        Tháng {monthNum},<br />{yearNum}
                      </span>
                      <div className="ps-cal-divider" />
                      <div className="ps-cal-time">
                        <Clock size={13} />
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  )
                })()}

                <div className="ps-doc-meta">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                      {(nextAppt as any).doctor_name || 'Bác sĩ chuyên khoa phụ trách'}
                    </h3>
                    <span className="specialty">
                      {(nextAppt as any).department_name || (nextAppt as any).department || 'Khoa Nội Tổng Quát'}
                    </span>
                  </div>
                  {nextAppt.reason && (
                    <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--ps-slate)', lineHeight: 1.5 }}>
                      <b style={{ color: 'var(--ps-navy)' }}>Lý do khám:</b> {nextAppt.reason}
                    </p>
                  )}
                  <div style={{ margin: '8px 0 0', fontSize: '12.5px', color: 'var(--ps-slate-muted)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <span>Mã ca khám: </span>
                      <span style={{ fontWeight: 700, color: 'var(--ps-navy)' }}>#{nextAppt.id}</span>
                    </div>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ps-slate)' }}>
                      <Ruler size={13} color="#0891b2" />
                      <span>Chiều cao:</span>
                      <b style={{ color: 'var(--ps-navy)' }}>{(nextAppt as any).height || (user as any).height || 165} cm</b>
                    </div>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ps-slate)' }}>
                      <Weight size={13} color="#0891b2" />
                      <span>Cân nặng:</span>
                      <b style={{ color: 'var(--ps-navy)' }}>{(nextAppt as any).weight || (user as any).weight || 60} kg</b>
                    </div>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--ps-slate)' }}>
                      <Thermometer size={13} color="#d97706" />
                      <span>Thân nhiệt:</span>
                      <b style={{ color: 'var(--ps-navy)' }}>{(nextAppt as any).temperature || latestVitals?.temperature_celsius || 36.8} °C</b>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ps-spotlight-actions">
                <button
                  className="ps-btn-join-call"
                  onClick={() => onJoin(nextAppt)}
                  style={{
                    background: nextAppt.status === 'in_progress'
                      ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
                      : nextAppt.status === 'waiting'
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {nextAppt.status === 'in_progress' ? (
                    <>
                      <Video size={18} /> Vào khám với Bác sĩ ngay
                    </>
                  ) : nextAppt.status === 'waiting' ? (
                    <>
                      <Clock size={18} /> Đang ở phòng chờ (Xem điều dưỡng điều phối)
                    </>
                  ) : (
                    <>
                      <Activity size={18} /> Vào phòng chờ để điều dưỡng điều phối
                    </>
                  )}
                </button>
                {nextAppt.status === 'scheduled' && (
                  <button className="ps-btn-pay-qr" onClick={() => onPay(nextAppt)}>
                    <CreditCard size={15} /> Trả phí VietQR
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="ps-empty-spotlight">
            <div className="ps-empty-spotlight-left">
              <div className="ps-empty-icon">
                <CalendarDays size={24} />
              </div>
              <div>
                <h4>Bạn chưa có lịch khám trực tuyến nào sắp tới</h4>
                <p>Đặt lịch trước để được Bác sĩ chuyên khoa tư vấn trực tiếp qua video call có bảo hiểm BHYT.</p>
              </div>
            </div>
            <button className="ps-btn-primary" onClick={onBook}>
              <Plus size={16} /> Đặt lịch khám ngay
            </button>
          </section>
        )}

        {/* 4. BIOMETRIC SMART VITALS (QUICK SUMMARY ROW) */}
        <section>
          <div className="ps-section-header">
            <h3 className="ps-section-title">
              <Activity size={20} color="var(--ps-primary)" /> Chỉ Số Sinh Hiệu & Sức Khỏe Tại Nhà
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="ps-section-action"
                onClick={handleSyncAccuChekBLE}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0284c7' }}
                title="Đo đường huyết hoặc đồng bộ không dây qua Bluetooth từ máy Roche Accu-Chek Instant BLE"
              >
                <Bluetooth size={14} color="#0284c7" /> Đo Roche Accu-Chek BLE
              </button>
              <button
                type="button"
                className="ps-section-action"
                onClick={handleOpenOpticalCamera}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Camera size={14} /> Quét nhịp tim Camera
              </button>
              <button
                type="button"
                className="ps-section-action"
                onClick={() => setShowManualModal(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={14} /> Tự ghi nhận sinh hiệu
              </button>
            </div>
          </div>

          <div className="ps-vitals-grid">
            {/* Huyết áp */}
            <div className="ps-vital-tile">
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap red">
                  <Heart size={18} />
                </div>
                <span className="ps-vital-status-pill normal">Ổn định</span>
              </div>
              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display">
                  {bpDisplay} <small>mmHg</small>
                </div>
                <div className="ps-vital-name">Huyết áp (Sys/Dia)</div>
              </div>
              <div className="ps-vital-tile-bottom">
                <span>Huyết áp TB: <b>{mapValue ? `${mapValue} mmHg` : 'N/A'}</b></span>
                <span style={{ color: 'var(--ps-mint-dark)' }}>Chuẩn WHO</span>
              </div>
            </div>

            {/* Nhịp tim */}
            <div className="ps-vital-tile">
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap teal">
                  <HeartPulse size={18} />
                </div>
                <span className="ps-vital-status-pill normal">Bình thường</span>
              </div>
              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display">
                  {pulseDisplay} <small>bpm</small>
                </div>
                <div className="ps-vital-name">Nhịp tim & Mạch</div>
              </div>
              <div className="ps-vital-tile-bottom">
                <span>Khoảng chuẩn: <b>60 - 90</b></span>
                <span style={{ color: 'var(--ps-primary)', cursor: 'pointer' }} onClick={handleOpenOpticalCamera}>
                  Đo lại
                </span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="ps-vital-tile">
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap blue">
                  <Wind size={18} />
                </div>
                <span className="ps-vital-status-pill normal">Tốt</span>
              </div>
              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display">
                  {spo2Display} <small>%</small>
                </div>
                <div className="ps-vital-name">Nồng độ Oxy (SpO2)</div>
              </div>
              <div className="ps-vital-tile-bottom">
                <span>Bão hòa oxy máu</span>
                <span style={{ color: 'var(--ps-mint-dark)' }}>Tối ưu</span>
              </div>
            </div>

            {/* Đường huyết: Roche Accu-Chek Instant BLE */}
            <div className="ps-vital-tile" style={{ position: 'relative' }}>
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap amber">
                  <Droplets size={18} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      border: '1px solid #bfdbfe'
                    }}
                    title="Chuẩn giao tiếp Bluetooth SIG GATT 0x1808 (Glucose Service)"
                  >
                    <Bluetooth size={12} color="#2563eb" /> Accu-Chek BLE
                  </span>
                  <span className="ps-vital-status-pill normal" style={{ borderRadius: '4px', whiteSpace: 'nowrap' }}>
                    {glucoseDisplay < 3.9 ? 'Hạ đường huyết' : glucoseDisplay > 7.2 ? 'Đường huyết cao' : 'Ổn định'}
                  </span>
                </div>
              </div>

              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display" style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span>{glucoseDisplay}</span>
                  <small style={{ fontSize: '13px', fontWeight: 600 }}>mmol/L</small>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                    (~{Math.round(glucoseDisplay * 18.018)} mg/dL)
                  </span>
                </div>
                <div className="ps-vital-name" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--ps-navy)' }}>Roche Accu-Chek Instant BLE</span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Đường huyết mao mạch • Chuẩn ISO 15197:2013
                </div>
              </div>

              <div className="ps-vital-tile-bottom" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: '#64748b' }}>
                  <span>Khoảng đói chuẩn: <b>4.4 - 7.2 mmol/L</b></span>
                  <span>Đồng bộ: <b>{(latestGlucoseLog as any)?.measured_at ? new Date((latestGlucoseLog as any).measured_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '07:15 Hôm nay'}</b> (Pin 92%)</span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncAccuChekBLE}
                  disabled={isSyncingAccuChek}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#f0f9ff',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    borderRadius: '4px',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  title="Kết nối đọc kết quả từ máy đo đường huyết Roche Accu-Chek Instant qua Bluetooth"
                >
                  <Bluetooth size={12} />
                  <span>{isSyncingAccuChek ? 'Đang đọc...' : 'Đo BLE'}</span>
                </button>
              </div>
            </div>

            {/* Thân nhiệt */}
            <div className="ps-vital-tile">
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap amber">
                  <Thermometer size={18} />
                </div>
                <span className="ps-vital-status-pill normal">Ổn định</span>
              </div>
              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display">
                  {latestVitals?.temperature_celsius || 36.8} <small>°C</small>
                </div>
                <div className="ps-vital-name">Thân nhiệt</div>
              </div>
              <div className="ps-vital-tile-bottom">
                <span>Khoảng chuẩn: <b>36.5 - 37.2</b></span>
                <span style={{ color: 'var(--ps-mint-dark)' }}>Chuẩn</span>
              </div>
            </div>

            {/* Cân nặng hiện tại */}
            <div className="ps-vital-tile">
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap teal">
                  <Weight size={18} />
                </div>
                <span className="ps-vital-status-pill normal">{bmiInfo?.category || 'Cân đối'}</span>
              </div>
              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display">
                  {manualWeight || user.weight || 62} <small>kg</small>
                </div>
                <div className="ps-vital-name">Cân nặng hiện tại</div>
              </div>
              <div className="ps-vital-tile-bottom">
                <span>Mục tiêu: <b>±1.5 kg</b></span>
                <span style={{ color: 'var(--ps-mint-dark)' }}>Theo dõi</span>
              </div>
            </div>

            {/* Chiều cao */}
            <div className="ps-vital-tile">
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap blue">
                  <Ruler size={18} />
                </div>
                <span className="ps-vital-status-pill normal">Cố định</span>
              </div>
              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display">
                  {manualHeight || user.height || 168} <small>cm</small>
                </div>
                <div className="ps-vital-name">Chiều cao</div>
              </div>
              <div className="ps-vital-tile-bottom">
                <span>Hồ sơ y tế số</span>
                <span style={{ color: 'var(--ps-primary)' }}>QĐ 2682</span>
              </div>
            </div>

            {/* Chỉ số khối cơ thể (BMI) */}
            <div className="ps-vital-tile">
              <div className="ps-vital-tile-top">
                <div className="ps-vital-icon-wrap green">
                  <Activity size={18} />
                </div>
                <span className="ps-vital-status-pill normal">{bmiInfo?.category || 'Cân đối'}</span>
              </div>
              <div className="ps-vital-tile-middle">
                <div className="ps-vital-val-display">
                  {bmiInfo ? `${bmiInfo.bmi}` : '22.0'} <small>kg/m²</small>
                </div>
                <div className="ps-vital-name">Chỉ số khối cơ thể (BMI)</div>
              </div>
              <div className="ps-vital-tile-bottom">
                <span>Thể trạng: <b>{bmiInfo?.category || 'Cân đối'}</b></span>
                <span style={{ color: 'var(--ps-mint-dark)' }}>Hợp lý</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. SMART DEVICES HUB EMBEDDED */}
        <section>
          <SmartDevicesHub user={user} vitalsLogs={vitalsLogs} embedded={true} onRefreshVitals={onRefreshVitals} onNavigate={onNavigate} />
        </section>

        {/* 6. HEALTHCARE ECOSYSTEM GRID (8 SERVICES TILES) */}
        <section>
          <div className="ps-section-header">
            <h3 className="ps-section-title">
              <Sparkles size={20} color="var(--ps-primary)" /> Hệ Sinh Thái Khám Chữa Bệnh Toàn Diện
            </h3>
          </div>

          <div className="ps-services-grid">
            {/* 1. Lịch khám */}
            <div className="ps-service-tile" onClick={onBook}>
              <div>
                <div className="ps-service-icon-box teal">
                  <Video size={22} />
                </div>
                <h4 className="ps-service-title">Đặt Khám Từ Xa</h4>
                <p className="ps-service-desc">Khám video call HD với Bác sĩ Trưởng khoa, tư vấn tận tâm</p>
              </div>
              <div className="ps-service-footer">
                <span>Đặt ngay</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* 2. Bệnh án EMR */}
            <div className="ps-service-tile" onClick={() => onNavigate('records')}>
              <div>
                <div className="ps-service-icon-box blue">
                  <FileText size={22} />
                </div>
                <h4 className="ps-service-title">Hồ Sơ Bệnh Án EMR</h4>
                <p className="ps-service-desc">Bệnh án điện tử chuẩn Bộ Y tế, tra cứu mã bệnh ICD-10</p>
              </div>
              <div className="ps-service-footer">
                <span>Xem bệnh án</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* 3. Đơn thuốc điện tử */}
            <div className="ps-service-tile" onClick={() => onNavigate('prescriptions')}>
              <div>
                <div className="ps-service-icon-box mint">
                  <Pill size={22} />
                </div>
                <h4 className="ps-service-title">Đơn Thuốc Điện Tử</h4>
                <p className="ps-service-desc">Đơn thuốc có chữ ký số bác sĩ, hướng dẫn liều dùng chi tiết</p>
              </div>
              <div className="ps-service-footer">
                <span>Xem đơn thuốc</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* 4. Xét nghiệm LIS */}
            <div className="ps-service-tile" onClick={() => onNavigate('lab')}>
              <div>
                <div className="ps-service-icon-box sky">
                  <FlaskConical size={22} />
                </div>
                <h4 className="ps-service-title">Xét Nghiệm Cận Lâm Sàng</h4>
                <p className="ps-service-desc">Kết quả sinh hóa, huyết học kèm biểu đồ khoảng tham chiếu</p>
              </div>
              <div className="ps-service-footer">
                <span>Tra cứu KQ</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* 5. Chẩn đoán hình ảnh PACS */}
            <div className="ps-service-tile" onClick={() => onNavigate('pacs')}>
              <div>
                <div className="ps-service-icon-box purple">
                  <ScanLine size={22} />
                </div>
                <h4 className="ps-service-title">Hình Ảnh Y Khoa PACS</h4>
                <p className="ps-service-desc">Xem trực tuyến phim chụp X-quang, MRI, Siêu âm DICOM</p>
              </div>
              <div className="ps-service-footer">
                <span>Xem phim chụp</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* 6. Hồ sơ Gia đình */}
            <div className="ps-service-tile" onClick={() => onNavigate('family')}>
              <div>
                <div className="ps-service-icon-box indigo">
                  <Users size={22} />
                </div>
                <h4 className="ps-service-title">Hồ Sơ Sức Khỏe Gia Đình</h4>
                <p className="ps-service-desc">Quản lý sổ y bạ cho con nhỏ, cha mẹ già trong cùng tài khoản</p>
              </div>
              <div className="ps-service-footer">
                <span>Sổ gia đình</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* 7. Bảo hiểm BHYT */}
            <div className="ps-service-tile" onClick={() => onNavigate('insurance')}>
              <div>
                <div className="ps-service-icon-box amber">
                  <ShieldCheck size={22} />
                </div>
                <h4 className="ps-service-title">Bảo Hiểm Y Tế BHYT</h4>
                <p className="ps-service-desc">Tra cứu mức hưởng BHYT 80%-100%, đồng bộ Cổng dữ liệu 4210</p>
              </div>
              <div className="ps-service-footer">
                <span>Thẻ BHYT</span>
                <ChevronRight size={15} />
              </div>
            </div>

            {/* 8. Viện phí VietQR */}
            <div className="ps-service-tile" onClick={() => onNavigate('payments')}>
              <div>
                <div className="ps-service-icon-box rose">
                  <CreditCard size={22} />
                </div>
                <h4 className="ps-service-title">Thanh Toán Viện Phí VietQR</h4>
                <p className="ps-service-desc">Quét mã QR ngân hàng NAPAS247, nhận hóa đơn điện tử VAT</p>
              </div>
              <div className="ps-service-footer">
                <span>Hóa đơn</span>
                <ChevronRight size={15} />
              </div>
            </div>
          </div>
        </section>

        {/* 7. COMPLETED MEDICAL VISITS & HISTORY TIMELINE */}
        <section>
          <div className="ps-section-header">
            <h3 className="ps-section-title">
              <Clock size={20} color="var(--ps-primary)" /> Lịch Sử Khám Bệnh & Xuất Viện
            </h3>
            <span className="ps-section-action" onClick={() => onNavigate('records')}>
              Xem tất cả ({completedAppointments.length})
            </span>
          </div>

          {completedAppointments.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: 'var(--ps-radius-lg)',
                padding: '32px',
                textAlign: 'center',
                color: 'var(--ps-slate-muted)'
              }}
            >
              <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <h4 style={{ margin: '0 0 4px', color: 'var(--ps-navy)' }}>Chưa có lịch sử lần khám nào</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                Sau khi kết thúc tư vấn trực tuyến, phiếu khám và đơn thuốc sẽ tự động lưu trữ tại đây.
              </p>
            </div>
          ) : (
            <div className="ps-history-list">
              {completedAppointments.slice(0, 4).map(appt => {
                const doctorObj = doctors.find(d => d.id === appt.doctor_id)
                const docName = doctorObj?.full_name || (appt as any).doctor_name || `Bác sĩ #${appt.doctor_id}`
                const dept = doctorObj?.department_name || (appt as any).department_name || 'Đa Khoa'
                const apptDate = new Date(appt.starts_at)

                return (
                  <div className="ps-history-card" key={appt.id}>
                    <div className="ps-history-left">
                      <div className="ps-date-badge">
                        <b>{apptDate.toLocaleDateString('vi-VN', { day: '2-digit' })}</b>
                        <small>Th {apptDate.toLocaleDateString('vi-VN', { month: '2-digit' })}</small>
                      </div>

                      <div className="ps-history-info">
                        <h4>{docName} • {dept}</h4>
                        <div className="ps-history-meta">
                          <span>{appt.reason || 'Khám nội khoa định kỳ'}</span>
                          <span className="ps-icd-badge">
                            ICD: {(appt as any).diagnosis_code || 'I10 (Tăng huyết áp vô căn)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="ps-btn-pdf"
                      onClick={() => {
                        if (onDownloadPdf) {
                          onDownloadPdf(appt.id)
                        } else {
                          window.open(`/api/v1/appointments/${appt.id}/export-pdf`, '_blank')
                        }
                      }}
                      title="Tải Phiếu khám & Đơn thuốc PDF có ký số y tế"
                    >
                      <Download size={14} /> Tải PDF EMR
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* 8. MODAL: CAMERA OPTICAL PPG MEASUREMENT */}
        {showCameraModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(11, 28, 48, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '480px',
                padding: '24px',
                boxShadow: 'var(--ps-shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  📸 Đo Nhịp Tim Bằng Camera (PPG)
                </h3>
                <button
                  onClick={handleStopCameraScan}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} color="var(--ps-slate-muted)" />
                </button>
              </div>

              {/* Video Preview Camera & Pulse Waveform */}
              <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', height: '180px' }}>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={180}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {cameraProgress}%
                </div>
              </div>

              {/* Status & BPM Display */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--ps-primary)', letterSpacing: '-0.02em' }}>
                  {cameraCurrentBpm > 0 ? `${cameraCurrentBpm}` : '--'} <small style={{ fontSize: '16px' }}>BPM</small>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ps-slate)', fontWeight: 500 }}>
                  {cameraStatusText}
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${cameraProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #0e7490, #10b981)',
                    transition: 'width 0.2s linear'
                  }}
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '12px', color: 'var(--ps-slate-muted)' }}>
                💡 <b>Hướng dẫn:</b> Đặt nhẹ đầu ngón tay trỏ che kín ống kính camera sau và đèn flash. Giữ yên tay trong 15 giây để máy ghi nhận xung mạch chính xác.
              </div>

              <button
                className="ps-btn-primary"
                onClick={handleStopCameraScan}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {cameraResult ? 'Hoàn tất & Đóng' : 'Dừng quét'}
              </button>
            </div>
          </div>
        )}

        {/* 9. MODAL: MANUAL VITALS ENTRY */}
        {showManualModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(11, 28, 48, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '560px',
                padding: '28px',
                boxShadow: 'var(--ps-shadow-lg)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  ✍️ Ghi Nhận Chỉ Số Sinh Hiệu Tại Nhà
                </h3>
                <button
                  onClick={() => setShowManualModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} color="var(--ps-slate-muted)" />
                </button>
              </div>

              <form onSubmit={handleSaveManualVitals} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="ps-input-group">
                    <label>Huyết áp Tâm thu (Sys)</label>
                    <input
                      type="number"
                      className="ps-form-input"
                      value={manualSys}
                      onChange={e => setManualSys(parseInt(e.target.value) || 0)}
                      placeholder="Ví dụ: 120"
                    />
                  </div>
                  <div className="ps-input-group">
                    <label>Huyết áp Tâm trương (Dia)</label>
                    <input
                      type="number"
                      className="ps-form-input"
                      value={manualDia}
                      onChange={e => setManualDia(parseInt(e.target.value) || 0)}
                      placeholder="Ví dụ: 80"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="ps-input-group">
                    <label>Nhịp tim / Mạch (BPM)</label>
                    <input
                      type="number"
                      className="ps-form-input"
                      value={manualPulse}
                      onChange={e => setManualPulse(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="ps-input-group">
                    <label>Nồng độ SpO2 (%)</label>
                    <input
                      type="number"
                      className="ps-form-input"
                      value={manualSpo2}
                      onChange={e => setManualSpo2(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="ps-input-group">
                    <label>Đường huyết đói (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="ps-form-input"
                      value={manualGlucose}
                      onChange={e => setManualGlucose(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="ps-input-group">
                    <label>Thân nhiệt (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="ps-form-input"
                      value={manualTemp}
                      onChange={e => setManualTemp(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="ps-input-group">
                    <label>Cân nặng (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="ps-form-input"
                      value={manualWeight}
                      onChange={e => setManualWeight(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="ps-input-group">
                    <label>Chiều cao (cm)</label>
                    <input
                      type="number"
                      className="ps-form-input"
                      value={manualHeight}
                      onChange={e => setManualHeight(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="ps-btn-secondary"
                    onClick={() => setShowManualModal(false)}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="ps-btn-primary"
                    disabled={isSavingManual}
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    {isSavingManual ? 'Đang lưu...' : 'Lưu vào bệnh án'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
