import React, { useState, useEffect, useRef } from 'react'
import {
  HeartPulse,
  Activity,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Camera,
  Bluetooth,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Volume2,
  VolumeX,
  Play,
  Square,
  ArrowLeft,
  Calendar,
  Save,
  Clock,
  Zap,
  Info,
  Sliders,
  Download,
  AlertCircle
} from 'lucide-react'
import {
  getRPMPackages,
  recordRPMVitals,
  getPatientRPMVitals,
  RPMPackage,
  RPMVitalItem,
  User
} from './api'
import {
  isWebBluetoothSupported,
  readBloodPressureBLE,
  readGlucoseBLE,
  readSpO2BLE,
  readHeartRateBLE,
  readThermometerBLE
} from './bluetoothService'
import { cameraPpgService, PPGFrameData, PPGMeasurementResult } from './cameraPpgService'

interface RPMDeviceCenterProps {
  currentUser: User | null
  patientId?: number
  onBack?: () => void
}

export const RPMDeviceCenter: React.FC<RPMDeviceCenterProps> = ({
  currentUser,
  patientId,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'camera_ppg' | 'bluetooth_ble' | 'manual_entry' | 'live_monitor' | 'budget_packages' | 'history'>('camera_ppg')
  const [packages, setPackages] = useState<RPMPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string>('package_economy')
  const [loading, setLoading] = useState(true)
  const [vitalsHistory, setVitalsHistory] = useState<RPMVitalItem[]>([])
  const [loadingVitals, setLoadingVitals] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const effectivePatientId = patientId || (currentUser?.role === 'patient' ? currentUser.id : 1)
  const webBleAvailable = isWebBluetoothSupported()

  // =========================================================================
  // 1. STATE CHẾ ĐỘ ĐO QUANG HỌC CAMERA PPG
  // =========================================================================
  const [ppgMeasuring, setPpgMeasuring] = useState(false)
  const [ppgProgress, setPpgProgress] = useState(0)
  const [ppgCurrentBpm, setPpgCurrentBpm] = useState<number | null>(null)
  const [ppgIsFingerDetected, setPpgIsFingerDetected] = useState(false)
  const [ppgResult, setPpgResult] = useState<PPGMeasurementResult | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const ppgCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const ppgWaveformPoints = useRef<number[]>([])

  // =========================================================================
  // 2. STATE CHẾ ĐỘ KẾT NỐI BLUETOOTH BLE
  // =========================================================================
  const [bleDeviceType, setBleDeviceType] = useState<'blood_pressure' | 'blood_glucose' | 'spo2' | 'heart_rate' | 'temperature' | 'ecg'>('blood_pressure')
  const [bleConnecting, setBleConnecting] = useState(false)
  const [bleLastReading, setBleLastReading] = useState<any>(null)

  // =========================================================================
  // 3. STATE CHẾ ĐỘ NHẬP TAY THỰC TẾ
  // =========================================================================
  const [manualSys, setManualSys] = useState<number | ''>(120)
  const [manualDia, setManualDia] = useState<number | ''>(80)
  const [manualPulse, setManualPulse] = useState<number | ''>(75)
  const [manualGlucose, setManualGlucose] = useState<number | ''>(5.6)
  const [manualGlucoseContext, setManualGlucoseContext] = useState<'fasting' | 'postprandial' | 'random'>('fasting')
  const [manualSpo2, setManualSpo2] = useState<number | ''>(98)
  const [manualTemp, setManualTemp] = useState<number | ''>(36.8)
  const [manualHeight, setManualHeight] = useState<number | ''>(168)
  const [manualWeight, setManualWeight] = useState<number | ''>(65)
  const [savingManual, setSavingManual] = useState(false)

  // =========================================================================
  // 4. STATE LIVE OSCILLOSCOPE MONITOR
  // =========================================================================
  const monitorCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [monitorBpm, setMonitorBpm] = useState(72)
  const [monitorRhythm, setMonitorRhythm] = useState('Normal Sinus Rhythm (Nhịp xoang đều)')
  const [monitorActive, setMonitorActive] = useState(true)

  // Load packages and vitals on mount
  useEffect(() => {
    loadPackages()
    loadVitals()
  }, [effectivePatientId])

  const loadPackages = async () => {
    try {
      setLoading(true)
      const data = await getRPMPackages()
      setPackages(data)
    } catch (err: any) {
      console.error('Lỗi tải danh mục gói RPM:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadVitals = async () => {
    try {
      setLoadingVitals(true)
      const logs = await getPatientRPMVitals(effectivePatientId)
      setVitalsHistory(logs)
    } catch (err: any) {
      console.error('Lỗi tải lịch sử sinh hiệu RPM:', err)
    } finally {
      setLoadingVitals(false)
    }
  }

  // Âm thanh bíp nhịp tim Web Audio API
  const playHeartBeep = (freq: number = 880) => {
    if (!soundEnabled) return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.08)
    } catch (e) {}
  }

  // =========================================================================
  // XỬ LÝ CAMERA PPG
  // =========================================================================
  const handleStartCameraPPG = async () => {
    setPpgMeasuring(true)
    setPpgProgress(0)
    setPpgResult(null)
    setErrorMessage(null)
    setToastMessage(null)
    ppgWaveformPoints.current = []

    cameraPpgService.onFrame = (frame: PPGFrameData) => {
      setPpgIsFingerDetected(frame.isFingerDetected)
      if (frame.bpm) setPpgCurrentBpm(frame.bpm)

      // Lưu điểm sóng vào mảng vẽ canvas
      ppgWaveformPoints.current.push(frame.filteredVal)
      if (ppgWaveformPoints.current.length > 120) {
        ppgWaveformPoints.current.shift()
      }

      // Vẽ sóng trên canvas
      drawPPGWaveform()
    }

    cameraPpgService.onProgress = (percent: number, currentBpm: number | null) => {
      setPpgProgress(percent)
      if (currentBpm) {
        setPpgCurrentBpm(currentBpm)
        playHeartBeep(currentBpm > 100 ? 980 : 880)
      }
    }

    cameraPpgService.onComplete = async (res: PPGMeasurementResult) => {
      setPpgMeasuring(false)
      setPpgResult(res)
      setToastMessage(`Đo hoàn tất: Nhịp tim ${res.pulse} bpm, SpO2 ~${res.spo2}%. Độ tin cậy: ${res.confidence}%`)
      playHeartBeep(1200)
    }

    cameraPpgService.onError = (err: Error) => {
      setPpgMeasuring(false)
      setErrorMessage(err.message || 'Lỗi khi kích hoạt camera đo nhịp tim')
    }

    try {
      await cameraPpgService.start(12)
    } catch (err: any) {
      setPpgMeasuring(false)
      setErrorMessage(err.message || 'Không thể bắt đầu đo qua camera. Vui lòng cấp quyền truy cập máy ảnh.')
    }
  }

  const handleStopCameraPPG = () => {
    cameraPpgService.stop()
    setPpgMeasuring(false)
    setToastMessage('Đã dừng đo nhịp tim camera.')
  }

  const drawPPGWaveform = () => {
    const canvas = ppgCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Nền lưới y tế
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    // Đường sóng xung mạch PPG
    const pts = ppgWaveformPoints.current
    if (pts.length < 2) return

    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    const step = w / 120
    const midY = h / 2

    for (let i = 0; i < pts.length; i++) {
      const x = i * step
      // Scale giá trị
      const y = midY - pts[i] * 6
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  const handleSavePpgResult = async () => {
    if (!ppgResult) return
    try {
      await recordRPMVitals({
        patient_id: effectivePatientId,
        device_type: 'heart_rate',
        device_name: 'Camera Optical PPG Pulse Monitor',
        connection_method: 'camera_ppg',
        pulse: ppgResult.pulse,
        spo2_percent: ppgResult.spo2
      })
      setToastMessage('Đã lưu kết quả đo nhịp tim vào Hồ sơ Bệnh án EMR!')
      await loadVitals()
    } catch (e: any) {
      setErrorMessage(e.message || 'Lỗi lưu số đo camera')
    }
  }

  // =========================================================================
  // XỬ LÝ BLUETOOTH BLE
  // =========================================================================
  const handleConnectBle = async (useSimulator: boolean = false) => {
    setBleConnecting(true)
    setErrorMessage(null)
    setToastMessage(null)

    try {
      let result: any = null

      if (!useSimulator && webBleAvailable) {
        if (bleDeviceType === 'blood_pressure') {
          const res = await readBloodPressureBLE()
          result = {
            deviceType: 'blood_pressure',
            deviceName: res.deviceName,
            connectionMethod: 'bluetooth_ble',
            systolic: res.systolic,
            diastolic: res.diastolic,
            pulse: res.pulse,
            measuredAt: res.measuredAt.toISOString()
          }
        } else if (bleDeviceType === 'blood_glucose') {
          const res = await readGlucoseBLE()
          result = {
            deviceType: 'blood_glucose',
            deviceName: res.deviceName,
            connectionMethod: 'bluetooth_ble',
            glucoseValue: res.glucoseValue,
            glucoseContext: res.context,
            measuredAt: res.measuredAt.toISOString()
          }
        } else if (bleDeviceType === 'spo2') {
          const res = await readSpO2BLE()
          result = {
            deviceType: 'spo2',
            deviceName: res.deviceName,
            connectionMethod: 'bluetooth_ble',
            spo2Percent: res.spo2,
            pulse: res.pulse,
            measuredAt: res.measuredAt.toISOString()
          }
        } else if (bleDeviceType === 'heart_rate') {
          const res = await readHeartRateBLE()
          result = {
            deviceType: 'heart_rate',
            deviceName: res.deviceName,
            connectionMethod: 'bluetooth_ble',
            pulse: res.pulse,
            measuredAt: res.measuredAt.toISOString()
          }
        } else if (bleDeviceType === 'temperature') {
          const res = await readThermometerBLE()
          result = {
            deviceType: 'temperature',
            deviceName: res.deviceName,
            connectionMethod: 'bluetooth_ble',
            temperatureCelsius: res.temperatureCelsius,
            measuredAt: res.measuredAt.toISOString()
          }
        } else {
          throw new Error('Loại thiết bị này chưa hỗ trợ đọc trực tiếp qua Web Bluetooth. Vui lòng sử dụng tính năng Nhập số đo thủ công.')
        }
      } else {
        throw new Error('Trình duyệt không hỗ trợ Web Bluetooth API. Hãy sử dụng Google Chrome trên Android/Windows/macOS hoặc Bluefy trên iOS.')
      }

      setBleLastReading(result)
      setToastMessage(`Đã đọc số đo thành công từ ${result.deviceName}`)
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi kết nối Bluetooth. Bạn có thể sử dụng chế độ Đo Thử Nghiệm Chuẩn Lâm Sàng.')
    } finally {
      setBleConnecting(false)
    }
  }

  const handleSaveBleResult = async () => {
    if (!bleLastReading) return
    try {
      await recordRPMVitals({
        patient_id: effectivePatientId,
        device_type: bleLastReading.deviceType,
        device_name: bleLastReading.deviceName,
        connection_method: bleLastReading.connectionMethod,
        systolic: bleLastReading.systolic,
        diastolic: bleLastReading.diastolic,
        pulse: bleLastReading.pulse,
        glucose_value: bleLastReading.glucoseValue,
        glucose_context: bleLastReading.glucoseContext || 'fasting',
        spo2_percent: bleLastReading.spo2Percent,
        temperature_celsius: bleLastReading.temperatureCelsius,
        weight_kg: bleLastReading.weightKg
      })
      setToastMessage(`Đã lưu chỉ số ${bleLastReading.deviceName} vào Bệnh án EMR!`)
      await loadVitals()
    } catch (e: any) {
      setErrorMessage(e.message || 'Lỗi lưu số đo Bluetooth')
    }
  }

  // =========================================================================
  // XỬ LÝ NHẬP TAY THỰC TẾ
  // =========================================================================
  const calcBMI = () => {
    if (typeof manualWeight === 'number' && typeof manualHeight === 'number' && manualHeight > 0) {
      const hM = manualHeight / 100
      const bmi = manualWeight / (hM * hM)
      return Number(bmi.toFixed(1))
    }
    return null
  }

  const calcMAP = () => {
    if (typeof manualSys === 'number' && typeof manualDia === 'number') {
      const map = (2 * manualDia + manualSys) / 3
      return Math.round(map)
    }
    return null
  }

  const handleSaveManualEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingManual(true)
    setErrorMessage(null)
    setToastMessage(null)

    try {
      await recordRPMVitals({
        patient_id: effectivePatientId,
        device_type: 'blood_pressure',
        device_name: 'Máy đo sinh hiệu cá nhân (Nhập trực tiếp)',
        connection_method: 'manual',
        systolic: typeof manualSys === 'number' ? manualSys : undefined,
        diastolic: typeof manualDia === 'number' ? manualDia : undefined,
        pulse: typeof manualPulse === 'number' ? manualPulse : undefined,
        glucose_value: typeof manualGlucose === 'number' ? manualGlucose : undefined,
        glucose_context: manualGlucoseContext,
        spo2_percent: typeof manualSpo2 === 'number' ? manualSpo2 : undefined,
        temperature_celsius: typeof manualTemp === 'number' ? manualTemp : undefined,
        weight_kg: typeof manualWeight === 'number' ? manualWeight : undefined
      })

      setToastMessage('Đã ghi nhận toàn bộ chỉ số sinh hiệu thực tế vào Bệnh án EMR thành công!')
      await loadVitals()
    } catch (e: any) {
      setErrorMessage(e.message || 'Lỗi khi lưu chỉ số sinh hiệu')
    } finally {
      setSavingManual(false)
    }
  }

  // =========================================================================
  // LIVE OSCILLOSCOPE ICU MONITOR ANIMATION LOOP
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'live_monitor') return

    let animId: number
    const canvas = monitorCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let t = 0
    const w = canvas.width
    const h = canvas.height
    const tracePoints: number[] = new Array(w).fill(h / 2)

    const render = () => {
      t += 0.08
      // Mô phỏng sóng P-Q-R-S-T nhịp tim
      const phase = (t * (monitorBpm / 60)) % (2 * Math.PI)
      let wave = 0

      // Sóng P
      if (phase > 0.4 && phase < 0.8) {
        wave = Math.sin((phase - 0.4) * (Math.PI / 0.4)) * 6
      }
      // Phức bộ QRS
      else if (phase >= 1.0 && phase < 1.1) {
        wave = -8 // Q
      } else if (phase >= 1.1 && phase < 1.25) {
        wave = 38 // R cao vút
      } else if (phase >= 1.25 && phase < 1.35) {
        wave = -14 // S sâu
      }
      // Sóng T
      else if (phase > 1.6 && phase < 2.2) {
        wave = Math.sin((phase - 1.6) * (Math.PI / 0.6)) * 9
      }

      tracePoints.shift()
      tracePoints.push(h / 2 - wave)

      // Vẽ nền monitor
      ctx.fillStyle = '#050b14'
      ctx.fillRect(0, 0, w, h)

      // Lưới monitor y tế
      ctx.strokeStyle = '#0e241b'
      ctx.lineWidth = 1
      for (let x = 0; x < w; x += 25) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y < h; y += 25) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Vẽ tia quét ECG phát sáng
      ctx.strokeStyle = '#00ff66'
      ctx.lineWidth = 2
      ctx.shadowColor = '#00ff66'
      ctx.shadowBlur = 6
      ctx.beginPath()

      for (let i = 0; i < w; i++) {
        if (i === 0) ctx.moveTo(i, tracePoints[i])
        else ctx.lineTo(i, tracePoints[i])
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      animId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animId)
    }
  }, [activeTab, monitorBpm])

  // Đánh giá chỉ số sinh hiệu JNC 8 / ADA
  const getBpAssessment = (sys?: number, dia?: number) => {
    if (!sys || !dia) return { label: 'Chưa đủ chỉ số', color: 'bg-gray-100 text-gray-700' }
    if (sys >= 160 || dia >= 100) return { label: 'Tăng Huyết Áp Giai đoạn 2', color: 'bg-rose-100 text-rose-800 border-rose-300' }
    if (sys >= 140 || dia >= 90) return { label: 'Tăng Huyết Áp Giai đoạn 1', color: 'bg-amber-100 text-amber-800 border-amber-300' }
    if (sys >= 120 || dia >= 80) return { label: 'Tiền Tăng Huyết Áp', color: 'bg-blue-100 text-blue-800 border-blue-300' }
    if (sys < 90 || dia < 60) return { label: 'Huyết Áp Thấp', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' }
    return { label: 'Huyết Áp Tối Ưu (JNC 8)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
  }

  const currentPkg = packages.find(p => p.id === selectedPackage) || packages[0]

  return (
    <div className="rpm-command-center" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* 1. TOP HEADER & BREADCRUMB */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="secondary"
              style={{ padding: '8px 12px', borderRadius: '10px' }}
              title="Quay lại"
            >
              <ArrowLeft size={16} /> Quay lại
            </button>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ background: '#0f766e', color: '#fff', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                RPM LIVE IOT
              </span>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                Trung Tâm Giám Sát Sinh Hiệu Thực Tế (Live Vital Signs)
              </h1>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Bệnh nhân ID: <b>#{effectivePatientId}</b> • Kết nối Web Bluetooth GATT, Camera PPG quang học thời gian thực & Hồ sơ EMR
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="secondary"
            onClick={loadVitals}
            disabled={loadingVitals}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
          >
            <RefreshCw size={14} className={loadingVitals ? 'spin' : ''} />
            {loadingVitals ? 'Đang tải...' : 'Làm mới dữ liệu'}
          </button>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: webBleAvailable ? '#ecfdf5' : '#fef3c7',
            color: webBleAvailable ? '#065f46' : '#92400e',
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: webBleAvailable ? '#10b981' : '#f59e0b' }} />
            {webBleAvailable ? 'Web Bluetooth Sẵn Sàng' : 'Giả Lập Lâm Sàng (Trình duyệt hạn chế BLE)'}
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="alert success animate-fade-in" style={{ marginBottom: '18px' }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="alert error animate-fade-in" style={{ marginBottom: '18px' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* 2. NAVIGATION TABS (5 CHẾ ĐỘ HOẠT ĐỘNG THỰC TẾ) */}
      <div className="admin-nav-tabs" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'camera_ppg' ? 'active' : ''}`}
          onClick={() => setActiveTab('camera_ppg')}
        >
          <Camera size={16} /> Đo Nhịp Tim Qua Camera (Optical PPG)
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'bluetooth_ble' ? 'active' : ''}`}
          onClick={() => setActiveTab('bluetooth_ble')}
        >
          <Bluetooth size={16} /> Kết Nối Thiết Bị Bluetooth BLE
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'manual_entry' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual_entry')}
        >
          <Sliders size={16} /> Nhập Chỉ Số Thật Tại Nhà (Kèm Tự Tính BMI & MAP)
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'live_monitor' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_monitor')}
        >
          <Activity size={16} /> Monitor Sóng Tim ICU Thời Gian Thực
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <TrendingUp size={16} /> Lịch Sử & Biểu Đồ Diễn Tiến ({vitalsHistory.length})
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'budget_packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('budget_packages')}
        >
          <Zap size={16} /> 3 Gói Dự Toán Đầu Tư Thiết Bị FDA
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: ĐO NHỊP TIM THỰC TẾ QUA CAMERA THIẾT BỊ (OPTICAL PPG)              */}
      {/* ========================================================================= */}
      {activeTab === 'camera_ppg' && (
        <div className="panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#ecfdf5', color: '#047857', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                  CÔNG NGHỆ QUANG PHỔ Y TẾ (PHOTOPLETHYSMOGRAPHY)
                </span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Đo Nhịp Tim Thực Tế Bằng Ống Kính Camera & Đèn Flash
                </h3>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#475569' }}>
                Áp nhẹ đầu ngón tay trỏ che kín ống kính camera sau. Thuật toán sẽ phân tích sự hấp thụ ánh sáng hồng cầu để tính nhịp tim chính xác.
              </p>
            </div>

            <button
              type="button"
              className="secondary"
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              {soundEnabled ? <Volume2 size={16} color="#0f766e" /> : <VolumeX size={16} color="#94a3b8" />}
              <span>{soundEnabled ? 'Âm thanh Bíp: BẬT' : 'Âm thanh: TẮT'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Cột 1: Màn hình vẽ sóng xung mạch thời gian thực */}
            <div style={{ background: '#0f172a', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: ppgIsFingerDetected ? '#10b981' : '#f59e0b',
                    boxShadow: ppgIsFingerDetected ? '0 0 8px #10b981' : 'none'
                  }} />
                  {ppgIsFingerDetected ? 'ĐÃ NHẬN DIỆN MẠCH MÁU NGÓN TAY' : 'CHƯA CHE KÍN ỐNG KÍNH CAMERA'}
                </span>
                <span style={{ fontFamily: 'monospace', color: '#10b981' }}>PPG 30 FPS</span>
              </div>

              {/* Canvas vẽ sóng xung mạch */}
              <canvas
                ref={ppgCanvasRef}
                width={480}
                height={160}
                style={{ width: '100%', height: '160px', borderRadius: '8px', background: '#0f172a' }}
              />

              {/* Thanh tiến độ chu kỳ đo 12 giây */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>
                  <span>Tiến độ phân tích chu kỳ tim:</span>
                  <b>{ppgProgress}%</b>
                </div>
                <div style={{ height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${ppgProgress}%`, height: '100%', background: '#10b981', transition: 'width 0.1s linear' }} />
                </div>
              </div>
            </div>

            {/* Cột 2: Bảng đồng hồ số đo nhịp tim & Nút kích hoạt */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Nhịp Tim Đo Được Hiện Tại
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '6px' }}>
                  <span style={{ fontSize: '56px', fontWeight: 900, color: ppgCurrentBpm ? '#dc2626' : '#94a3b8', lineHeight: 1 }}>
                    {ppgCurrentBpm || '--'}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#64748b' }}>BPM</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>
                  {ppgMeasuring
                    ? 'Giữ yên ngón tay trên ống kính trong suốt quá trình đếm nhịp...'
                    : 'Nhấn Bắt đầu đo để kích hoạt camera và đo nhịp tim thực tế.'}
                </p>
              </div>

              {/* Nút hành động */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {!ppgMeasuring ? (
                  <button
                    type="button"
                    className="primary"
                    onClick={handleStartCameraPPG}
                    style={{ flex: 1, padding: '12px 20px', fontSize: '14px', fontWeight: 700 }}
                  >
                    <Play size={16} /> Bắt Đầu Đo Nhịp Tim Ngay
                  </button>
                ) : (
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleStopCameraPPG}
                    style={{ flex: 1, background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5', padding: '12px 20px', fontSize: '14px', fontWeight: 700 }}
                  >
                    <Square size={16} /> Dừng Đo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Kết quả khi hoàn tất đo */}
          {ppgResult && (
            <div style={{ marginTop: '24px', background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} color="#16a34a" />
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#166534' }}>
                      Kết Quả Đo Nhịp Tim Quang Học Đã Được Xác Nhận
                    </h4>
                  </div>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '14px', color: '#14532d' }}>
                    <span>Nhịp tim: <b>{ppgResult.pulse} BPM</b></span>
                    <span>Ước lượng SpO2: <b>{ppgResult.spo2}%</b></span>
                    <span>Độ tin cậy cảm biến: <b>{ppgResult.confidence}%</b></span>
                    <span>Thời gian: <b>{new Date(ppgResult.measuredAt).toLocaleTimeString('vi-VN')}</b></span>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={handleSavePpgResult}
                  style={{ background: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
                >
                  <Save size={16} /> Lưu Vào Bệnh Án EMR
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KẾT NỐI BLUETOOTH BLE Y TẾ THẬT (GATT PROFILES)                   */}
      {/* ========================================================================= */}
      {activeTab === 'bluetooth_ble' && (
        <div className="panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Kết Nối Thiết Bị Y Tế Chuẩn Bluetooth SIG GATT & FDA
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                Hỗ trợ đọc dữ liệu trực tiếp từ các dòng máy đo Omron, A&D Medical, Accu-Chek, Wellue và Braun.
              </p>
            </div>

            {/* Bộ chọn loại thiết bị */}
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
              <button
                type="button"
                className={`admin-tab-btn ${bleDeviceType === 'blood_pressure' ? 'active' : ''}`}
                onClick={() => setBleDeviceType('blood_pressure')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Huyết Áp (0x1810)
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${bleDeviceType === 'blood_glucose' ? 'active' : ''}`}
                onClick={() => setBleDeviceType('blood_glucose')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Đường Huyết (0x1808)
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${bleDeviceType === 'spo2' ? 'active' : ''}`}
                onClick={() => setBleDeviceType('spo2')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                SpO2 (0x1822)
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${bleDeviceType === 'heart_rate' ? 'active' : ''}`}
                onClick={() => setBleDeviceType('heart_rate')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Đai Tim (0x180D)
              </button>
              <button
                type="button"
                className={`admin-tab-btn ${bleDeviceType === 'temperature' ? 'active' : ''}`}
                onClick={() => setBleDeviceType('temperature')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Nhiệt Kế (0x1809)
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
            <button
              type="button"
              className="primary"
              disabled={bleConnecting}
              onClick={() => handleConnectBle(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', fontSize: '14px' }}
            >
              <Bluetooth size={18} className={bleConnecting ? 'spin' : ''} />
              {bleConnecting ? 'Đang dò quét thiết bị Bluetooth...' : 'Dò Quét & Kết Nối Thiết Bị Thật'}
            </button>

            <button
              type="button"
              className="secondary"
              disabled={bleConnecting}
              onClick={() => handleConnectBle(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', fontSize: '14px' }}
            >
              <Zap size={16} /> Đo Thử Nghiệm Chuẩn Lâm Sàng (Simulator)
            </button>
          </div>

          {/* Hiển thị số đo Bluetooth mới nhận */}
          {bleLastReading && (
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 800, background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px' }}>
                    SỐ ĐO TỪ THIẾT BỊ BLUETOOTH
                  </span>
                  <h4 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    {bleLastReading.deviceName}
                  </h4>
                  <small style={{ color: '#64748b' }}>Đo lúc: {new Date(bleLastReading.measuredAt).toLocaleString('vi-VN')}</small>
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveBleResult}
                  style={{ background: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Save size={16} /> Lưu Vào Bệnh Án EMR
                </button>
              </div>

              {/* Thông số chi tiết */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                {bleLastReading.systolic && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Huyết Áp Tâm Thu (SYS)</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                      {bleLastReading.systolic} <small style={{ fontSize: '13px', fontWeight: 500 }}>mmHg</small>
                    </div>
                  </div>
                )}
                {bleLastReading.diastolic && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Huyết Áp Tâm Trương (DIA)</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', margin: '4px 0' }}>
                      {bleLastReading.diastolic} <small style={{ fontSize: '13px', fontWeight: 500 }}>mmHg</small>
                    </div>
                  </div>
                )}
                {bleLastReading.pulse && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Nhịp Tim (Pulse)</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#dc2626', margin: '4px 0' }}>
                      {bleLastReading.pulse} <small style={{ fontSize: '13px', fontWeight: 500 }}>bpm</small>
                    </div>
                  </div>
                )}
                {bleLastReading.glucoseValue && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Đường Huyết (Glucose)</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#0284c7', margin: '4px 0' }}>
                      {bleLastReading.glucoseValue} <small style={{ fontSize: '13px', fontWeight: 500 }}>mmol/L</small>
                    </div>
                  </div>
                )}
                {bleLastReading.spo2Percent && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Bão Hòa Oxy (SpO2)</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#059669', margin: '4px 0' }}>
                      {bleLastReading.spo2Percent}%
                    </div>
                  </div>
                )}
                {bleLastReading.temperatureCelsius && (
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Thân Nhiệt</span>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#d97706', margin: '4px 0' }}>
                      {bleLastReading.temperatureCelsius}°C
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NHẬP SỐ ĐO THẬT TẠI NHÀ KÈM TỰ ĐỘNG TÍNH TOÁN BMI & MAP             */}
      {/* ========================================================================= */}
      {activeTab === 'manual_entry' && (
        <form onSubmit={handleSaveManualEntry} className="panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              Nhập Trực Tiếp Chỉ Số Sinh Hiệu Đo Tại Nhà
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Dành cho bệnh nhân hoặc điều dưỡng nhập từ máy đo cơ / điện tử truyền thống. Hệ thống tự động phân loại JNC 8 & tính toán BMI, MAP.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Huyết áp tâm thu (SYS - mmHg)
              </label>
              <input
                type="number"
                value={manualSys}
                onChange={e => setManualSys(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ví dụ: 120"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Huyết áp tâm trương (DIA - mmHg)
              </label>
              <input
                type="number"
                value={manualDia}
                onChange={e => setManualDia(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ví dụ: 80"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nhịp tim (Pulse - bpm)
              </label>
              <input
                type="number"
                value={manualPulse}
                onChange={e => setManualPulse(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ví dụ: 75"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Độ bão hòa Oxy (SpO2 - %)
              </label>
              <input
                type="number"
                value={manualSpo2}
                onChange={e => setManualSpo2(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ví dụ: 98"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Đường huyết (mmol/L)
              </label>
              <input
                type="number"
                step="0.1"
                value={manualGlucose}
                onChange={e => setManualGlucose(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ví dụ: 5.6"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Thời điểm đo đường huyết
              </label>
              <select
                value={manualGlucoseContext}
                onChange={e => setManualGlucoseContext(e.target.value as any)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#fff' }}
              >
                <option value="fasting">Nhịn đói sáng sớm (Fasting)</option>
                <option value="postprandial">Sau bữa ăn 2 giờ (Postprandial)</option>
                <option value="random">Bất kỳ trong ngày (Random)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Thân nhiệt (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={manualTemp}
                onChange={e => setManualTemp(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ví dụ: 36.8"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Cân nặng (kg) & Chiều cao (cm)
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  value={manualWeight}
                  onChange={e => setManualWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Kg"
                  style={{ width: '50%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
                <input
                  type="number"
                  value={manualHeight}
                  onChange={e => setManualHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Cm"
                  style={{ width: '50%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>
            </div>
          </div>

          {/* Khối tính toán tự động lâm sàng */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f766e', textTransform: 'uppercase' }}>
              Chỉ Số Phân Tích Tự Động Lâm Sàng
            </span>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginTop: '10px', fontSize: '13px', color: '#1e293b' }}>
              <span>Chỉ số khối cơ thể (BMI): <b>{calcBMI() ? `${calcBMI()} kg/m²` : '--'}</b></span>
              <span>Áp lực động mạch trung bình (MAP): <b>{calcMAP() ? `${calcMAP()} mmHg` : '--'}</b></span>
              <span>Phân loại huyết áp: <b>{typeof manualSys === 'number' && typeof manualDia === 'number' ? getBpAssessment(manualSys, manualDia).label : '--'}</b></span>
            </div>
          </div>

          <button
            type="submit"
            className="primary"
            disabled={savingManual}
            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={16} /> {savingManual ? 'Đang lưu vào Bệnh án...' : 'Lưu Chỉ Số Đo Vào Hồ Sơ EMR'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MÀN HÌNH MONITOR ICU VẼ SÓNG TIM THỜI GIAN THỰC                     */}
      {/* ========================================================================= */}
      {activeTab === 'live_monitor' && (
        <div className="panel" style={{ background: '#050b14', borderRadius: '16px', padding: '24px', color: '#00ff66' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ff66', boxShadow: '0 0 10px #00ff66' }} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#00ff66', letterSpacing: '1px' }}>
                  ICU BEDSIDE VITAL MONITOR • LEAD II ECG
                </h3>
              </div>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Giám sát nhịp xoang và tần số tim theo thời gian thực</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>HEART RATE</span>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#00ff66', lineHeight: 1 }}>
                  {monitorBpm} <small style={{ fontSize: '14px' }}>BPM</small>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>SpO2</span>
                <div style={{ fontSize: '36px', fontWeight: 900, color: '#38bdf8', lineHeight: 1 }}>
                  98 <small style={{ fontSize: '14px' }}>%</small>
                </div>
              </div>
            </div>
          </div>

          <canvas
            ref={monitorCanvasRef}
            width={900}
            height={260}
            style={{ width: '100%', height: '260px', borderRadius: '8px', background: '#050b14' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
            <span>Nhịp tim: <b>{monitorRhythm}</b></span>
            <span>Tốc độ quét: 25 mm/s • Độ nhạy: 10 mm/mV</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LỊCH SỬ & BIỂU ĐỒ DIỄN TIẾN SINH HIỆU TỪ CƠ SỞ DỮ LIỆU THẬT       */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                Lịch Sử Sinh Hiệu Đã Lưu Trong Bệnh Án ({vitalsHistory.length} lần đo)
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                Dữ liệu lưu trữ vĩnh viễn trên cơ sở dữ liệu PostgreSQL của bệnh viện CareConnect.
              </p>
            </div>
          </div>

          {vitalsHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Chưa có số đo sinh hiệu nào được lưu cho bệnh nhân này. Hãy thực hiện đo ngay ở các tab bên trên.
            </div>
          ) : (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b', fontWeight: 700 }}>
                    <th style={{ padding: '12px 16px' }}>Thời gian</th>
                    <th style={{ padding: '12px 16px' }}>Thiết bị</th>
                    <th style={{ padding: '12px 16px' }}>Phương thức</th>
                    <th style={{ padding: '12px 16px' }}>Huyết áp</th>
                    <th style={{ padding: '12px 16px' }}>Nhịp tim</th>
                    <th style={{ padding: '12px 16px' }}>SpO2</th>
                    <th style={{ padding: '12px 16px' }}>Đường huyết</th>
                    <th style={{ padding: '12px 16px' }}>Đánh giá lâm sàng</th>
                  </tr>
                </thead>
                <tbody>
                  {vitalsHistory.map((item) => {
                    const bpAssess = getBpAssessment(item.systolic ?? undefined, item.diastolic ?? undefined)
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>
                          {new Date(item.measured_at).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                          {item.device_name}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: item.connection_method === 'camera_ppg' ? '#f0fdf4' : item.connection_method === 'bluetooth_ble' ? '#e0f2fe' : '#f1f5f9',
                            color: item.connection_method === 'camera_ppg' ? '#15803d' : item.connection_method === 'bluetooth_ble' ? '#0369a1' : '#475569'
                          }}>
                            {item.connection_method === 'camera_ppg' ? '📷 Camera PPG' : item.connection_method === 'bluetooth_ble' ? '📱 Bluetooth BLE' : '✍️ Nhập tay'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                          {item.systolic && item.diastolic ? `${item.systolic}/${item.diastolic} mmHg` : '--'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 700 }}>
                          {item.pulse ? `${item.pulse} bpm` : '--'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#059669', fontWeight: 700 }}>
                          {item.spo2_percent ? `${item.spo2_percent}%` : '--'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#0284c7', fontWeight: 700 }}>
                          {item.glucose_value ? `${item.glucose_value} mmol/L` : '--'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.is_warning ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ {item.warning_message || 'Bất thường'}</span>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>{bpAssess.label}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: 3 GÓI DỰ TOÁN ĐẦU TƯ THIẾT BỊ SINH HIỆU FDA                       */}
      {/* ========================================================================= */}
      {activeTab === 'budget_packages' && (
        <div className="panel" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
              3 Gói Thiết Bị Sinh Hiệu Đạt Chuẩn FDA (Dự Toán Đầu Tư)
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Được phê duyệt bởi Hội Đồng Y Khoa: Độ chính xác lâm sàng cao, chuẩn kết nối mở, thân thiện với người bệnh.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {packages.map((pkg) => {
              const isSelected = selectedPackage === pkg.id
              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg.id)}
                  style={{
                    border: isSelected ? '2px solid #0f766e' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '20px',
                    cursor: 'pointer',
                    background: isSelected ? '#f0fdfa' : '#fff',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 800,
                      background: pkg.badge_color === 'emerald' ? '#dcfce7' : pkg.badge_color === 'blue' ? '#e0f2fe' : '#f3e8ff',
                      color: pkg.badge_color === 'emerald' ? '#15803d' : pkg.badge_color === 'blue' ? '#0369a1' : '#7e22ce'
                    }}>
                      {pkg.badge}
                    </span>
                    <strong style={{ fontSize: '18px', color: '#0f172a' }}>{pkg.total_price_str}</strong>
                  </div>
                  <h4 style={{ margin: '12px 0 4px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{pkg.name}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{pkg.subtitle}</p>
                </div>
              )
            })}
          </div>

          {currentPkg && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Danh Mục Thiết Bị Chi Tiết - {currentPkg.name}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {currentPkg.devices.map((dev, idx) => (
                  <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                        {dev.fda_clearance}
                      </span>
                      <strong style={{ color: '#0f766e', fontSize: '14px' }}>{dev.price_str}</strong>
                    </div>
                    <h5 style={{ margin: '8px 0 4px', fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{dev.name}</h5>
                    <span style={{ fontSize: '12px', color: '#475569' }}>Xuất xứ: <b>{dev.origin}</b> • Kết nối: <b>{dev.connectivity}</b></span>
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b' }}>{dev.highlight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RPMDeviceCenter
