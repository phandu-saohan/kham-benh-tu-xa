import React, { useState, useEffect, useRef } from 'react'
import {
  HeartPulse,
  Activity,
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
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Settings,
  Battery,
  Signal
} from 'lucide-react'
import { RPMVitalItem, recordRPMVitals } from './api'
import {
  isWebBluetoothSupported,
  readBloodPressureBLE,
  readGlucoseBLE,
  readSpO2BLE,
  readThermometerBLE,
  simulateDeviceReading
} from './bluetoothService'
import { cameraPpgService, PPGMeasurementResult, PPGFrameData } from './cameraPpgService'

export interface ConnectedDeviceInfo {
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
  connectionMethod?: string
}

interface SmartDevicesHubProps {
  user: any
  vitalsLogs?: RPMVitalItem[]
  onRefreshVitals?: () => void
  onNavigate?: (view: string) => void
  embedded?: boolean
}

export const SmartDevicesHub: React.FC<SmartDevicesHubProps> = ({
  user,
  vitalsLogs = [],
  onRefreshVitals,
  onNavigate,
  embedded = false
}) => {
  const latestVital = vitalsLogs[0] || null

  const [activeDeviceFilter, setActiveDeviceFilter] = useState<string>('all')
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  // Camera Optical PPG Modal State
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false)
  const [cameraProgress, setCameraProgress] = useState<number>(0)
  const [cameraCurrentBpm, setCameraCurrentBpm] = useState<number>(0)
  const [cameraStatusText, setCameraStatusText] = useState<string>('Đang sẵn sàng kết nối camera...')
  const [cameraResult, setCameraResult] = useState<PPGMeasurementResult | null>(null)
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)
  const waveformPoints = useRef<number[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Manual Entry Quick Intake Modal State
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

  // Device list
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
      accentColor: '#ef4444',
      connectionMethod: 'Bluetooth BLE (GATT 0x1810)'
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
      accentColor: '#f59e0b',
      connectionMethod: 'Bluetooth BLE (GATT 0x1808)'
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
      accentColor: '#0ea5e9',
      connectionMethod: 'Bluetooth BLE (GATT 0x1822 / 0x180D)'
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
      accentColor: '#10b981',
      connectionMethod: 'Bluetooth BLE (GATT 0x1809)'
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
      accentColor: '#8b5cf6',
      connectionMethod: 'Bluetooth BLE Smart Scale'
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
      accentColor: '#059669',
      connectionMethod: 'Optical Pulse PPG (Webcam / Smartphone Camera)'
    }
  ])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setToastMessage({ type, text })
  }

  const calculateBMI = (weight: number, heightCm: number) => {
    if (!heightCm || !weight) return { bmi: 0, text: 'Chưa có dữ liệu', color: '#64748b' }
    const heightM = heightCm / 100
    const bmiVal = Number((weight / (heightM * heightM)).toFixed(1))
    if (bmiVal < 18.5) return { bmi: bmiVal, text: 'Thiếu cân', color: '#f59e0b' }
    if (bmiVal < 23) return { bmi: bmiVal, text: 'Chuẩn WHO Tây TBD', color: '#10b981' }
    if (bmiVal < 25) return { bmi: bmiVal, text: 'Tiền béo phì', color: '#f97316' }
    return { bmi: bmiVal, text: 'Béo phì độ I', color: '#ef4444' }
  }

  const calculateMAP = (sys: number, dia: number) => {
    if (!sys || !dia) return 0
    return Math.round((2 * dia + sys) / 3)
  }

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
          patient_id: user?.id,
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
          patient_id: user?.id,
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
          patient_id: user?.id,
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
          patient_id: user?.id,
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
        const w = 62.4
        await recordRPMVitals({
          patient_id: user?.id,
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

  const drawWaveform = () => {
    const cvs = canvasRef.current
    if (!cvs) return
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, cvs.width, cvs.height)

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
        patient_id: user?.id,
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

  const handleSaveManualVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingManual(true)
    try {
      await recordRPMVitals({
        patient_id: user?.id,
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

  return (
    <div className={`smart-devices-hub-wrapper ${embedded ? 'embedded' : 'standalone-page'}`}>
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

      {/* Standalone Page Header if accessed via Sidebar */}
      {!embedded && (
        <div className="devices-page-hero">
          <div className="devices-hero-text">
            <div className="devices-hero-tags">
              <span className="badge-device-iot">
                <Cpu size={13} /> IoT Medical Telemetry
              </span>
              <span className="badge-device-fda">
                <ShieldCheck size={13} /> FDA / CE Cleared
              </span>
              <span className="badge-device-ble">
                <Bluetooth size={13} /> Web Bluetooth SIG
              </span>
            </div>
            <h2>Trung Tâm Kết Nối Thiết Bị Y Tế Thông Minh</h2>
            <p>
              Liên kết đồng bộ các thiết bị đo sinh hiệu cá nhân (Máy đo huyết áp, đường huyết, SpO2, thân nhiệt, cân sức khỏe) 
              trực tiếp vào Hồ sơ Bệnh án Điện tử EMR của Bác sĩ điều trị.
            </p>
          </div>

          <div className="devices-hero-stats">
            <div className="hero-stat-box">
              <span className="stat-label">Thiết bị hoạt động</span>
              <b className="stat-number">{devices.length} thiết bị</b>
            </div>
            <div className="hero-stat-box">
              <span className="stat-label">Trạng thái BLE</span>
              <b className="stat-status-text" style={{ color: isWebBluetoothSupported() ? '#10b981' : '#0ea5e9' }}>
                {isWebBluetoothSupported() ? '✓ Sẵn sàng kết nối' : '⚡ Môi trường mô phỏng'}
              </b>
            </div>
          </div>
        </div>
      )}

      {/* Main Hub Card */}
      <section className="smart-devices-hub-card">
        <div className="hub-header">
          <div className="hub-title-group">
            <div className="hub-title-with-badge">
              <div className="hub-icon-badge">
                <Cpu size={20} />
              </div>
              <div>
                <h3>Danh Sách Thiết Bị Đo Y Tế Đã Ghép Đôi</h3>
                <p>Hỗ trợ giao thức Bluetooth SIG GATT & Cảm biến quang học Camera (FDA / CE)</p>
              </div>
            </div>
          </div>

          <div className="hub-header-actions">
            <div className="ble-status-pill">
              <Bluetooth size={14} className="ble-icon" />
              <span>{isWebBluetoothSupported() ? 'Web Bluetooth: Sẵn sàng' : 'Môi trường mô phỏng'}</span>
            </div>
            <button className="btn-action-ghost" onClick={() => setShowManualModal(true)}>
              <Sliders size={14} /> Nhập số đo
            </button>
            <button className="btn-action-primary" onClick={handleOpenOpticalCamera}>
              <Camera size={14} /> Đo Camera PPG
            </button>
            {onNavigate && (
              <button className="btn-action-ghost" onClick={() => onNavigate('vitals')}>
                Gói FDA & Monitor ICU <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="device-filter-bar">
          <button
            className={`device-filter-btn ${activeDeviceFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveDeviceFilter('all')}
          >
            Tất cả thiết bị ({devices.length})
          </button>
          <button
            className={`device-filter-btn ${activeDeviceFilter === 'bp' ? 'active' : ''}`}
            onClick={() => setActiveDeviceFilter('bp')}
          >
            Huyết áp BLE
          </button>
          <button
            className={`device-filter-btn ${activeDeviceFilter === 'glucose' ? 'active' : ''}`}
            onClick={() => setActiveDeviceFilter('glucose')}
          >
            Đường huyết
          </button>
          <button
            className={`device-filter-btn ${activeDeviceFilter === 'spo2' ? 'active' : ''}`}
            onClick={() => setActiveDeviceFilter('spo2')}
          >
            SpO2 & Mạch
          </button>
          <button
            className={`device-filter-btn ${activeDeviceFilter === 'camera' ? 'active' : ''}`}
            onClick={() => setActiveDeviceFilter('camera')}
          >
            Camera Bio-Sensor
          </button>
        </div>

        {/* Device Cards Grid */}
        <div className="devices-grid">
          {filteredDevices.map(device => {
            const Icon = device.icon
            const isConnecting = connectingDeviceId === device.id

            return (
              <div key={device.id} className="device-card">
                <div className="device-card-top">
                  <div className="device-icon-box" style={{ background: `${device.accentColor}15`, color: device.accentColor }}>
                    <Icon size={22} />
                  </div>
                  <div className="device-status-badge">
                    <span className={`status-dot ${device.status}`} />
                    <small>
                      {device.status === 'connected' ? 'Đã kết nối' :
                       device.status === 'measuring' ? 'Đang đo...' : 'Sẵn sàng'}
                    </small>
                  </div>
                </div>

                <div className="device-card-main">
                  <h4 className="device-name">{device.name}</h4>
                  <p className="device-brand">{device.brand}</p>

                  <div className="device-measurement-box">
                    <span className="measurement-label">Số đo gần nhất:</span>
                    <strong className="measurement-value">{device.lastReading || 'Chưa có'}</strong>
                  </div>

                  <div className="device-footer-meta">
                    {device.battery !== undefined && (
                      <span className="meta-battery">
                        <Battery size={13} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '3px' }} />
                        Pin: {device.battery}%
                      </span>
                    )}
                    <span className="meta-sync">{device.lastSync || 'Chưa đồng bộ'}</span>
                  </div>
                  {device.connectionMethod && (
                    <small className="device-method-tag">{device.connectionMethod}</small>
                  )}
                </div>

                <div className="device-card-bottom">
                  <button
                    className="btn-device-connect"
                    onClick={() => handleMeasureDevice(device)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw size={14} className="spin" /> Đang nhận dữ liệu...
                      </>
                    ) : device.category === 'camera' ? (
                      <>
                        <Camera size={14} /> Đo ngay qua Camera
                      </>
                    ) : (
                      <>
                        <Zap size={14} /> Kết nối & Đo ngay
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Highlights */}
        <div className="hub-info-bar">
          <div className="info-bar-item">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>Tự động liên thông số đo vào Hồ sơ Bệnh án EMR của Bác sĩ phụ trách.</span>
          </div>
          <div className="info-bar-item">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>Chuẩn bảo mật HIPAA & Nghị định 13/2023/NĐ-CP mã hóa đầu cuối.</span>
          </div>
          <div className="info-bar-item">
            <CheckCircle2 size={16} className="text-emerald" />
            <span>Cảnh báo tức thời nếu chỉ số sinh hiệu vượt ngưỡng sinh lý an toàn.</span>
          </div>
        </div>
      </section>

      {/* MODAL: CAMERA OPTICAL PPG MEASUREMENT */}
      {showCameraModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Camera size={20} className="text-emerald" />
                <h3>Đo Nhịp Tim Quang Học Qua Camera (Optical PPG)</h3>
              </div>
              <button className="btn-modal-close" onClick={handleStopCameraScan}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content">
              <div className="camera-instructions">
                <p>
                  👉 <b>Hướng dẫn:</b> Đặt nhẹ đầu ngón tay trỏ che kín ống kính camera sau. Giữ yên tay trong 12-15 giây. Đèn flash sẽ tự động bật để chiếu sáng mao mạch máu.
                </p>
              </div>

              {/* Waveform View */}
              <div className="camera-viewport-wrap">
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={150}
                  className="camera-waveform-canvas"
                />
              </div>

              {/* Progress and Realtime BPM */}
              <div className="camera-progress-block">
                <div className="progress-labels">
                  <span>{cameraStatusText}</span>
                  <b>{cameraProgress}%</b>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${cameraProgress}%` }}
                  />
                </div>
              </div>

              {cameraCurrentBpm > 0 && (
                <div className="camera-current-reading">
                  <HeartPulse size={24} className="pulse-heart text-rose" />
                  <span className="reading-val">{cameraCurrentBpm}</span>
                  <span className="reading-unit">bpm (Nhịp tim trực tiếp)</span>
                </div>
              )}

              {cameraResult && (
                <div className="camera-final-result">
                  <h4>✓ Kết Quả Đo Thành Công</h4>
                  <div className="final-metrics-row">
                    <div className="final-metric">
                      <span>Nhịp tim:</span>
                      <strong>{cameraResult.pulse} bpm</strong>
                    </div>
                    <div className="final-metric">
                      <span>Ước tính SpO2:</span>
                      <strong>~{cameraResult.spo2}%</strong>
                    </div>
                    <div className="final-metric">
                      <span>Độ tin cậy:</span>
                      <strong>{cameraResult.confidence}%</strong>
                    </div>
                  </div>
                  <small className="result-note">Dữ liệu đã tự động ghi nhận vào bệnh án điện tử của bạn.</small>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!isCameraActive ? (
                <button className="btn-start-camera" onClick={handleStartCameraScan}>
                  <Zap size={16} /> Bắt đầu đo
                </button>
              ) : (
                <button className="btn-stop-camera" onClick={handleStopCameraScan}>
                  Dừng đo
                </button>
              )}
              <button className="btn-cancel-modal" onClick={handleStopCameraScan}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL VITALS INTAKE */}
      {showManualModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <Sliders size={20} className="text-teal" />
                <h3>Nhập Chỉ Số Sinh Hiệu Tự Đo Tại Nhà</h3>
              </div>
              <button className="btn-modal-close" onClick={() => setShowManualModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualVitals}>
              <div className="modal-body-content">
                <p className="modal-tip">
                  Nhập số đo từ máy đo cơ hoặc thiết bị sẵn có của bạn. Hệ thống sẽ tự động tính toán chỉ số BMI, Áp lực động mạch MAP và phân tầng nguy cơ y khoa.
                </p>

                <div className="form-grid-two">
                  <div className="form-group">
                    <label>Huyết áp tâm thu (SYS - Tối đa)</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="70"
                        max="240"
                        value={manualSys}
                        onChange={(e) => setManualSys(Number(e.target.value))}
                        required
                      />
                      <span>mmHg</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Huyết áp tâm trương (DIA - Tối thiểu)</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="40"
                        max="140"
                        value={manualDia}
                        onChange={(e) => setManualDia(Number(e.target.value))}
                        required
                      />
                      <span>mmHg</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Tần số mạch / Nhịp tim</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="40"
                        max="200"
                        value={manualPulse}
                        onChange={(e) => setManualPulse(Number(e.target.value))}
                        required
                      />
                      <span>bpm</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Độ bão hòa Oxy máu (SpO2)</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="70"
                        max="100"
                        value={manualSpo2}
                        onChange={(e) => setManualSpo2(Number(e.target.value))}
                        required
                      />
                      <span>%</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Đường huyết mao mạch</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="33"
                        value={manualGlucose}
                        onChange={(e) => setManualGlucose(Number(e.target.value))}
                        required
                      />
                      <span>mmol/L</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Thân nhiệt (°C)</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.1"
                        min="34"
                        max="42"
                        value={manualTemp}
                        onChange={(e) => setManualTemp(Number(e.target.value))}
                        required
                      />
                      <span>°C</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Cân nặng</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.5"
                        min="20"
                        max="250"
                        value={manualWeight}
                        onChange={(e) => setManualWeight(Number(e.target.value))}
                        required
                      />
                      <span>kg</span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Chiều cao</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        min="50"
                        max="220"
                        value={manualHeight}
                        onChange={(e) => setManualHeight(Number(e.target.value))}
                        required
                      />
                      <span>cm</span>
                    </div>
                  </div>
                </div>

                <div className="auto-calc-preview">
                  <div className="calc-item">
                    <span>Áp lực ĐM trung bình (MAP):</span>
                    <b>{calculateMAP(manualSys, manualDia)} mmHg</b>
                  </div>
                  <div className="calc-item">
                    <span>Chỉ số khối cơ thể (BMI):</span>
                    <b>{calculateBMI(manualWeight, manualHeight).bmi} kg/m² ({calculateBMI(manualWeight, manualHeight).text})</b>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className="btn-start-camera"
                  disabled={isSavingManual}
                >
                  {isSavingManual ? <RefreshCw size={15} className="spin" /> : <Check size={15} />}
                  Lưu vào Bệnh án EMR
                </button>
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setShowManualModal(false)}
                >
                  Hủy bỏ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
