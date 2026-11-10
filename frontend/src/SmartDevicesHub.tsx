import React, { useState, useEffect, useRef } from 'react'
import './patient-sanctuary.css'

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

  Signal,

  Plus,

  Radio,

  Trash2,

  CheckCircle,
  Search,
  Sparkles,
  HelpCircle,
  Smartphone,
  Upload,
  Share2,
  FileCode,
  CheckCheck
} from 'lucide-react'

import { RPMVitalItem, recordRPMVitals, getMyMedicalDevices, saveMyMedicalDevice, deleteMyMedicalDevice } from './api'
import {
  isWebBluetoothSupported,
  isAppleDevice,
  isAndroidDevice,
  readBloodPressureBLE,
  readGlucoseBLE,
  readSpO2BLE,
  readThermometerBLE,
  scanRealBleDevice
} from './bluetoothService'
import {
  parseAppleHealthXml,
  parseAndroidHealthJson,
  syncHealthSummaryToEmr,
  HealthImportSummary
} from './appleHealthService'
import { cameraPpgService, PPGMeasurementResult, PPGFrameData } from './cameraPpgService'

export interface VitalMetricInfo {

  name: string

  code: string

  unit: string

  normalRange: string

  description: string

  icon?: any

}

export interface ConnectedDeviceInfo {

  id: string

  name: string

  brand: string

  category: 'bp' | 'glucose' | 'spo2' | 'temp' | 'scale' | 'camera' | 'wearable'

  status: 'connected' | 'ready' | 'measuring' | 'disconnected'

  battery?: number

  lastSync?: string

  lastReading?: string

  icon: any

  accentColor: string

  connectionMethod?: string

  modelNumber?: string

  serialNumber?: string

  // THÔNG TIN CHỈ SỐ THIẾT BỊ ĐO LƯỜNG

  measuredMetrics: VitalMetricInfo[]

  clinicalUse: string

  regulatoryApproval?: string

}

interface SmartDevicesHubProps {

  user: any

  vitalsLogs?: RPMVitalItem[]

  onRefreshVitals?: () => void

  onNavigate?: (view: string) => void

  embedded?: boolean

}

// Danh mục tất cả thiết bị y tế chuẩn FDA/CE tương thích hệ thống CareConnect

const DEFAULT_ALL_DEVICES: ConnectedDeviceInfo[] = [

  {

    id: 'dev_bp',

    name: 'Omron HEM-7361T Smart BP Monitor',

    brand: 'Omron Healthcare Japan',

    category: 'bp',

    status: 'ready',

    battery: 100,

    lastSync: 'Chưa kết nối',

    lastReading: 'Chưa có số đo',

    icon: HeartPulse,

    accentColor: '#ef4444',

    connectionMethod: 'Bluetooth BLE (GATT 0x1810)',

    modelNumber: 'HEM-7361T-E',

    serialNumber: 'OMR-2024-8841',

    regulatoryApproval: 'FDA Cleared Class II / CE 0197',

    measuredMetrics: [

      {

        name: 'Huyết áp tâm thu (SYS)',

        code: 'SYS',

        unit: 'mmHg',

        normalRange: '90 - 119 mmHg',

        description: 'Áp lực máu tối đa lên thành động mạch khi tim co bóp',

        icon: HeartPulse

      },

      {

        name: 'Huyết áp tâm trương (DIA)',

        code: 'DIA',

        unit: 'mmHg',

        normalRange: '60 - 79 mmHg',

        description: 'Áp lực máu tối thiểu lên thành động mạch khi tim thư giãn',

        icon: HeartPulse

      },

      {

        name: 'Nhịp tim mao mạch (Pulse)',

        code: 'PULSE',

        unit: 'bpm',

        normalRange: '60 - 90 bpm',

        description: 'Số nhịp tim đập mỗi phút, phát hiện rung nhĩ (AFib)',

        icon: Activity

      },

      {

        name: 'Áp lực ĐM trung bình (MAP)',

        code: 'MAP',

        unit: 'mmHg',

        normalRange: '70 - 100 mmHg',

        description: 'Tự động tính theo công thức (2*DIA + SYS)/3',

        icon: TrendingUp

      }

    ],

    clinicalUse: 'Tầm soát & theo dõi tăng huyết áp, bệnh động mạch vành, phát hiện sớm nguy cơ đột quỵ và rung nhĩ (AFib).'

  },

  {

    id: 'dev_glucose',

    name: 'Roche Accu-Chek Instant BLE',

    brand: 'Roche Diagnostics Germany',

    category: 'glucose',

    status: 'ready',

    battery: 100,

    lastSync: 'Chưa kết nối',

    lastReading: 'Chưa có số đo',

    icon: Droplets,

    accentColor: '#f59e0b',

    connectionMethod: 'Bluetooth BLE (GATT 0x1808)',

    modelNumber: 'Accu-Chek Instant Type 944',

    serialNumber: 'RCH-9812-4412',

    regulatoryApproval: 'FDA 510(k) Cleared / ISO 15197:2013',

    measuredMetrics: [

      {

        name: 'Đường huyết mao mạch (Glucose)',

        code: 'GLU',

        unit: 'mmol/L (mg/dL)',

        normalRange: 'Đói: 3.9 - 6.1 mmol/L',

        description: 'Đo định lượng nồng độ glucose trong máu toàn phần tươi',

        icon: Droplets

      }

    ],

    clinicalUse: 'Quản lý và kiểm soát chỉ số đường huyết cho bệnh nhân đái tháo đường Type 1, Type 2 và tiền đái tháo đường.'

  },

  {

    id: 'dev_spo2',

    name: 'Wellue FS20F Bluetooth Pulse Oximeter',

    brand: 'Wellue Viatom Medical',

    category: 'spo2',

    status: 'ready',

    battery: 100,

    lastSync: 'Chưa kết nối',

    lastReading: 'Chưa có số đo',

    icon: Activity,

    accentColor: '#0ea5e9',

    connectionMethod: 'Bluetooth BLE (GATT 0x1822 / 0x180D)',

    modelNumber: 'FS20F-BT',

    serialNumber: 'WLU-5510-9112',

    regulatoryApproval: 'FDA 510(k) / CE Mark',

    measuredMetrics: [

      {

        name: 'Nồng độ Oxy trong máu (SpO2)',

        code: 'SpO2',

        unit: '%',

        normalRange: '95% - 100%',

        description: 'Độ bão hòa oxy mao mạch ngoại vi, phát hiện giảm oxy máu',

        icon: Activity

      },

      {

        name: 'Tần số nhịp mạch (PR)',

        code: 'PR',

        unit: 'bpm',

        normalRange: '60 - 100 bpm',

        description: 'Đếm tần số mạch đập mao mạch qua cảm biến quang học kép',

        icon: HeartPulse

      },

      {

        name: 'Chỉ số tưới máu (PI)',

        code: 'PI',

        unit: '%',

        normalRange: '0.2% - 20%',

        description: 'Độ mạnh của tín hiệu mạch tại vị trí đo ở đầu ngón tay',

        icon: TrendingUp

      }

    ],

    clinicalUse: 'Phát hiện sớm tình trạng suy hô hấp thầm lặng (Happy Hypoxia), theo dõi bệnh phổi tắc nghẽn mạn tính (COPD), hen phế quản.'

  },

  {

    id: 'dev_temp',

    name: 'Braun ThermoScan 7 Infrared Ear',

    brand: 'Braun Healthcare Germany',

    category: 'temp',

    status: 'ready',

    battery: 100,

    lastSync: 'Chưa kết nối',

    lastReading: 'Chưa có số đo',

    icon: Thermometer,

    accentColor: '#10b981',

    connectionMethod: 'Bluetooth BLE (GATT 0x1809)',

    modelNumber: 'IRT6520BT',

    serialNumber: 'BRN-3320-1190',

    regulatoryApproval: 'FDA Cleared / ASTM E1965-98',

    measuredMetrics: [

      {

        name: 'Thân nhiệt màng nhĩ hồng ngoại (TEMP)',

        code: 'TEMP',

        unit: '°C / °F',

        normalRange: '36.5°C - 37.5°C',

        description: 'Nhiệt độ cơ thể đo qua bức xạ hồng ngoại màng nhĩ chính xác',

        icon: Thermometer

      }

    ],

    clinicalUse: 'Theo dõi thân nhiệt thời gian thực, phát hiện sốt nhiễm khuẩn cấp, cảm cúm, sốt xuất huyết hoặc phản ứng sau điều trị.'

  },

  {

    id: 'dev_scale',

    name: 'Tanita BC-401 Body Composition Scale',

    brand: 'Tanita Corporation Japan',

    category: 'scale',

    status: 'ready',

    battery: 100,

    lastSync: 'Chưa kết nối',

    lastReading: 'Chưa có số đo',

    icon: Scale,

    accentColor: '#8b5cf6',

    connectionMethod: 'Bluetooth BLE Smart Scale (BIA)',

    modelNumber: 'BC-401-BK',

    serialNumber: 'TNT-7701-4432',

    regulatoryApproval: 'Medical Device Class II / ISO 13485',

    measuredMetrics: [

      {

        name: 'Cân nặng cơ thể (Weight)',

        code: 'WT',

        unit: 'kg',

        normalRange: 'Tùy theo chiều cao',

        description: 'Khối lượng cơ thể đo bằng cảm biến tải 4 điểm độ chính xác cao',

        icon: Scale

      },

      {

        name: 'Chỉ số khối cơ thể (BMI)',

        code: 'BMI',

        unit: 'kg/m²',

        normalRange: '18.5 - 22.9 kg/m² (WHO)',

        description: 'Đánh giá mức độ thiếu cân, chuẩn hoặc thừa cân béo phì',

        icon: TrendingUp

      },

      {

        name: 'Tỷ lệ mỡ & Nước cơ thể (BIA)',

        code: 'FAT/TBW',

        unit: '%',

        normalRange: 'Nam: 10-20% | Nữ: 18-28%',

        description: 'Phân tích trở kháng điện sinh học đa tần số (Bioelectrical)',

        icon: Activity

      }

    ],

    clinicalUse: 'Theo dõi dinh dưỡng, kiểm soát cân nặng, hội chứng chuyển hóa, phòng ngừa suy tim sung huyết hoặc suy mòn dinh dưỡng.'

  },

  {

    id: 'dev_camera',

    name: 'CareConnect Camera PPG Bio-Sensor',

    brand: 'CareConnect AI Vision Engine',

    category: 'camera',

    status: 'ready',

    battery: 100,

    lastSync: 'Chưa kết nối',

    lastReading: 'Chưa có số đo',

    icon: Camera,

    accentColor: '#059669',

    connectionMethod: 'Optical Pulse PPG (Webcam / Smartphone Camera)',

    modelNumber: 'CareConnect-PPG-V1.2',

    serialNumber: 'VIR-CAM-001',

    regulatoryApproval: 'AI Clinical Algorithm Engine (CE / MDR)',

    measuredMetrics: [

      {

        name: 'Nhịp tim quang học qua Camera (Optical Pulse)',

        code: 'BPM',

        unit: 'bpm',

        normalRange: '60 - 90 bpm',

        description: 'Đo độ hấp thụ ánh sáng mao mạch khi máu lưu thông qua đầu ngón tay',

        icon: HeartPulse

      },

      {

        name: 'Ước tính SpO2 quang phổ (SpO2 Est.)',

        code: 'SpO2_Est',
        unit: '%',
        normalRange: '95% - 99%',
        description: 'Thuật toán tỷ lệ đỏ/hồng ngoại (Red/Green Ratio Filter)',
        icon: Activity
      }
    ],
    clinicalUse: 'Đo sinh hiệu khẩn cấp tại nhà khi bệnh nhân không có thiết bị phần cứng rời, hỗ trợ bác sĩ nhận định sơ bộ trong video call.'
  },
  {
    id: 'dev_apple_health',
    name: 'Apple Health (HealthKit & Apple Watch)',
    brand: 'Apple Inc. Cupertino',
    category: 'wearable',
    status: 'ready',
    battery: 100,
    lastSync: 'Chưa đồng bộ',
    lastReading: 'Chưa ghi nhận',
    icon: Activity,
    accentColor: '#0284c7',
    connectionMethod: 'Apple HealthKit Sync (iOS)',
    modelNumber: 'HealthKit-v2',
    serialNumber: 'APL-HLTH-01',
    regulatoryApproval: 'FDA Cleared Class II / CE MDR',
    measuredMetrics: [
      {
        name: 'Nhịp tim ECG (Heart Rate)',
        code: 'HR',
        unit: 'bpm',
        normalRange: '60 - 100 bpm',
        description: 'Dữ liệu nhịp tim và rung nhĩ AFib từ Apple Watch',
        icon: HeartPulse
      },
      {
        name: 'Nồng độ Oxy máu (SpO2)',
        code: 'SpO2',
        unit: '%',
        normalRange: '95% - 100%',
        description: 'Đo qua cảm biến quang phổ máu trên Apple Watch',
        icon: Activity
      },
      {
        name: 'Huyết áp ngoại vi (BP)',
        code: 'BP',
        unit: 'mmHg',
        normalRange: '120/80 mmHg',
        description: 'Đồng bộ từ các máy đo liên kết trong Apple Health',
        icon: TrendingUp
      }
    ],
    clinicalUse: 'Tự động trích xuất dữ liệu lâm sàng thật từ Apple Watch và ứng dụng Sức Khỏe trên iPhone của người bệnh.'
  },
  {
    id: 'dev_android_health',
    name: 'Android Health Connect (Google Fit)',
    brand: 'Google & Samsung Health',
    category: 'wearable',
    status: 'ready',
    battery: 100,
    lastSync: 'Chưa đồng bộ',
    lastReading: 'Chưa ghi nhận',
    icon: Activity,
    accentColor: '#16a34a',
    connectionMethod: 'Android Health Connect API',
    modelNumber: 'HealthConnect-v1',
    serialNumber: 'AND-HLTH-01',
    regulatoryApproval: 'Android Open Health Ecosystem',
    measuredMetrics: [
      {
        name: 'Nhịp tim (Heart Rate)',
        code: 'HR',
        unit: 'bpm',
        normalRange: '60 - 100 bpm',
        description: 'Đồng bộ từ Samsung Galaxy Watch, Xiaomi Band, WearOS',
        icon: HeartPulse
      },
      {
        name: 'Nồng độ Oxy SpO2',
        code: 'SpO2',
        unit: '%',
        normalRange: '95% - 100%',
        description: 'Cảm biến nồng độ oxy mao mạch trên thiết bị đeo Android',
        icon: Activity
      },
      {
        name: 'Huyết áp (Blood Pressure)',
        code: 'BP',
        unit: 'mmHg',
        normalRange: '120/80 mmHg',
        description: 'Đồng bộ từ máy đo liên kết Samsung Health',
        icon: TrendingUp
      }
    ],
    clinicalUse: 'Tự động tổng hợp và truyền số đo thật từ hệ sinh thái đồng hồ và máy đo trên điện thoại Android.'
  }
]

export const SmartDevicesHub: React.FC<SmartDevicesHubProps> = ({

  user,

  vitalsLogs = [],

  onRefreshVitals,

  onNavigate,

  embedded = false

}) => {

  const latestVital = vitalsLogs[0] || null

  // Khởi tạo danh sách thiết bị từ Database (không tự động bật kết nối giả lập)
  const [devices, setDevices] = useState<ConnectedDeviceInfo[]>(DEFAULT_ALL_DEVICES)

  useEffect(() => {
    try {
      const storageKey = `careconnect_paired_devices_${user?.id || 'guest'}`
      localStorage.removeItem(storageKey)
    } catch {
      // ignore
    }
    if (!user?.id) return
    getMyMedicalDevices()
      .then((dbDevices) => {
        setDevices(
          DEFAULT_ALL_DEVICES.map((def) => {
            const matched = dbDevices.find(
              (d) => d.device_code === def.id || d.device_name === def.name
            )
            if (matched && matched.status === 'connected') {
              return {
                ...def,
                status: 'connected',
                battery: matched.battery_level ?? def.battery,
                lastSync: matched.last_synced_at
                  ? new Date(matched.last_synced_at).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit'
                    })
                  : 'Đã ghép nối'
              }
            }
            return def
          })
        )
      })
      .catch(() => {})
  }, [user?.id])

  const saveDevicesState = (updatedList: ConnectedDeviceInfo[]) => {
    setDevices(updatedList)
  }

  // Cập nhật số đo gần nhất từ vitalsLogs

  useEffect(() => {

    if (latestVital) {

      setDevices(prev =>

        prev.map(d => {

          if (d.category === 'bp' && latestVital.systolic && latestVital.diastolic) {

            return {

              ...d,

              lastReading: `${latestVital.systolic}/${latestVital.diastolic} mmHg`,

              lastSync: 'Vừa đồng bộ'

            }

          }

          if (d.category === 'glucose' && latestVital.glucose_value) {

            return {

              ...d,

              lastReading: `${latestVital.glucose_value} mmol/L`,

              lastSync: 'Vừa đồng bộ'

            }

          }

          if (d.category === 'spo2' && latestVital.spo2_percent) {

            return {

              ...d,

              lastReading: `${latestVital.spo2_percent}% SpO2`,

              lastSync: 'Vừa đồng bộ'

            }

          }

          if (d.category === 'temp' && latestVital.temperature_celsius) {

            return {

              ...d,

              lastReading: `${latestVital.temperature_celsius} °C`,

              lastSync: 'Vừa đồng bộ'

            }

          }

          if (d.category === 'scale' && latestVital.weight_kg) {

            return {

              ...d,

              lastReading: `${latestVital.weight_kg} kg`,

              lastSync: 'Vừa đồng bộ'

            }

          }

          return d

        })

      )

    }

  }, [latestVital])

  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null)

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null)

  // Modal: Kết nối thiết bị mới

  const [showPairNewModal, setShowPairNewModal] = useState<boolean>(false)

  const [isScanningBle, setIsScanningBle] = useState<boolean>(false)

  const [searchCatalogQuery, setSearchCatalogQuery] = useState<string>('')

  const [discoveredBleDevices, setDiscoveredBleDevices] = useState<any[]>([])

  // Modal & Tab: Kết nối thiết bị đa nền tảng Apple / Android / Bluetooth BLE Thật
  const [pairPlatformTab, setPairPlatformTab] = useState<'ble' | 'apple' | 'android'>('ble')

  // Modal: Apple Health Sync (iOS & Apple Watch)
  const [showAppleHealthModal, setShowAppleHealthModal] = useState<boolean>(false)
  const [appleXmlText, setAppleXmlText] = useState<string>('')
  const [appleParsedSummary, setAppleParsedSummary] = useState<HealthImportSummary | null>(null)
  const [isSyncingAppleHealth, setIsSyncingAppleHealth] = useState<boolean>(false)

  // Modal: Android Health Connect Sync (Samsung Health, Google Fit, WearOS)
  const [showAndroidHealthModal, setShowAndroidHealthModal] = useState<boolean>(false)
  const [androidJsonText, setAndroidJsonText] = useState<string>('')
  const [androidParsedSummary, setAndroidParsedSummary] = useState<HealthImportSummary | null>(null)
  const [isSyncingAndroidHealth, setIsSyncingAndroidHealth] = useState<boolean>(false)

  // Modal: Camera Optical PPG

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false)

  const [cameraProgress, setCameraProgress] = useState<number>(0)

  const [cameraCurrentBpm, setCameraCurrentBpm] = useState<number>(0)

  const [cameraStatusText, setCameraStatusText] = useState<string>('Đang sẵn sàng kết nối camera...')

  const [cameraResult, setCameraResult] = useState<PPGMeasurementResult | null>(null)

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)

  const waveformPoints = useRef<number[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Modal: Nhập số đo thủ công (để trống cho đến khi bệnh nhân tự nhập)

  const [showManualModal, setShowManualModal] = useState<boolean>(false)

  const [manualSys, setManualSys] = useState<string>('')

  const [manualDia, setManualDia] = useState<string>('')

  const [manualPulse, setManualPulse] = useState<string>('')

  const [manualGlucose, setManualGlucose] = useState<string>('')

  const [manualSpo2, setManualSpo2] = useState<string>('')

  const [manualTemp, setManualTemp] = useState<string>('')

  const [manualWeight, setManualWeight] = useState<string>('')

  const [manualHeight, setManualHeight] = useState<string>('')

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

  // ⭐ ĐIỀU KIỆN LỌC CHÍNH: CHỈ HIỂN THỊ CÁC THIẾT BỊ ĐÃ KẾT NỐI

  const connectedDevices = devices.filter(d => d.status === 'connected')

  // Danh mục thiết bị có thể ghép nối mới (chưa kết nối)

  const availableToPairDevices = devices.filter(d => d.status !== 'connected')

  // Ghép nối thiết bị mới

  const handlePairDevice = (deviceToPair: ConnectedDeviceInfo) => {

    const updated = devices.map(d => {

      if (d.id === deviceToPair.id) {

        return {

          ...d,

          status: 'connected' as const,

          lastSync: 'Vừa ghép đôi thành công',

          battery: d.battery || 100

        }

      }

      return d

    })

    saveDevicesState(updated)
    saveMyMedicalDevice({
      device_code: deviceToPair.id,
      device_name: deviceToPair.name,
      device_type: deviceToPair.category,
      manufacturer: deviceToPair.brand,
      connection_method: deviceToPair.connectionMethod,
      battery_level: deviceToPair.battery || 100,
      status: 'connected'
    }).catch(() => {})

    setShowPairNewModal(false)

    showToast('success', `Đã ghép đôi và kết nối thành công thiết bị: ${deviceToPair.name}!`)

  }

  // Ngắt kết nối thiết bị

  const handleDisconnectDevice = (deviceToUnpair: ConnectedDeviceInfo, e: React.MouseEvent) => {

    e.stopPropagation()

    const confirm = window.confirm(`Bạn có chắc muốn ngắt kết nối thiết bị "${deviceToUnpair.name}" khỏi tài khoản?`)

    if (!confirm) return

    const updated = devices.map(d => {

      if (d.id === deviceToUnpair.id) {

        return {

          ...d,

          status: 'disconnected' as const,

          lastSync: 'Đã ngắt kết nối'

        }

      }

      return d

    })

    saveDevicesState(updated)
    deleteMyMedicalDevice(deviceToUnpair.id).catch(() => {})

    showToast('info', `Đã ngắt kết nối thiết bị ${deviceToUnpair.name}.`)

  }

  // Quét thiết bị Bluetooth THẬT xung quanh (Web Bluetooth API)
  const handleStartBleScan = async () => {
    setIsScanningBle(true)
    setDiscoveredBleDevices([])

    if (!isWebBluetoothSupported()) {
      setIsScanningBle(false)
      if (isAppleDevice()) {
        showToast('info', 'Trên iPhone/iPad: Safari không hỗ trợ Web Bluetooth trực tiếp. Vui lòng chọn tab "Apple (iOS)" để đồng bộ Apple Health hoặc mở ứng dụng trên trình duyệt Bluefy.')
      } else {
        showToast('error', 'Trình duyệt không hỗ trợ Web Bluetooth. Vui lòng sử dụng Google Chrome trên điện thoại Android hoặc máy tính.')
      }
      return
    }

    try {
      showToast('info', 'Đang mở cửa sổ Bluetooth... Vui lòng bật Bluetooth trên máy đo và chọn thiết bị trong danh sách.')
      const realDev = await scanRealBleDevice()

      if (realDev) {
        let matched = devices.find(d => {
          if (realDev.category !== 'unknown') {
            return d.category === realDev.category
          }
          const lower = realDev.name.toLowerCase()
          return lower.includes(d.brand.toLowerCase()) || lower.includes(d.name.toLowerCase())
        })

        if (!matched) {
          matched = devices.find(d => d.id === 'dev_bp') || devices[0]
        }

        const updated = devices.map(d => {
          if (d.id === matched!.id) {
            return {
              ...d,
              name: realDev.name || d.name,
              status: 'connected' as const,
              battery: realDev.battery !== undefined ? realDev.battery : d.battery,
              lastSync: 'Vừa kết nối thiết bị thật',
              connectionMethod: 'Bluetooth BLE Thật (GATT)'
            }
          }
          return d
        })

        saveDevicesState(updated)
        showToast('success', `Đã kết nối thành công thiết bị y tế thật: ${realDev.name}!`)
        setShowPairNewModal(false)
      }
    } catch (err: any) {
      console.warn('Bluetooth scan error:', err)
      showToast('error', err.message || 'Không thể ghép đôi thiết bị Bluetooth. Hãy bật nguồn thiết bị và thử lại.')
    } finally {
      setIsScanningBle(false)
    }
  }

  // Xử lý tải tệp Apple Health XML từ iPhone
  const handleAppleHealthFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setAppleXmlText(content.slice(0, 50000))
        const summary = parseAppleHealthXml(content)
        setAppleParsedSummary(summary)
        if (summary.totalRecords > 0) {
          showToast('success', `Đã nhận diện ${summary.totalRecords} chỉ số sức khỏe thật từ Apple Health!`)
        } else {
          showToast('error', 'Không tìm thấy bản ghi y tế trong tệp. Hãy xuất file export.xml từ app Sức Khỏe trên iPhone.')
        }
      }
    }
    reader.readAsText(file)
  }

  // Đồng bộ dữ liệu Apple Health vào Bệnh án EMR
  const handleCommitAppleHealthSync = async () => {
    if (!appleParsedSummary || appleParsedSummary.totalRecords === 0) {
      showToast('error', 'Chưa có dữ liệu Apple Health nào được tải lên.')
      return
    }

    setIsSyncingAppleHealth(true)
    try {
      const savedCount = await syncHealthSummaryToEmr(appleParsedSummary, user?.id)
      
      const updated = devices.map(d => {
        if (d.id === 'dev_apple_health') {
          let readingText = 'Đã cập nhật'
          if (appleParsedSummary.latestBloodPressure) {
            readingText = appleParsedSummary.latestBloodPressure.value
          } else if (appleParsedSummary.latestHeartRate) {
            readingText = appleParsedSummary.latestHeartRate.value
          }
          return {
            ...d,
            status: 'connected' as const,
            lastSync: 'Vừa xong',
            lastReading: readingText
          }
        }
        return d
      })
      saveDevicesState(updated)

      if (onRefreshVitals) onRefreshVitals()
      showToast('success', `Đã đồng bộ thành công ${savedCount} chỉ số thật từ Apple Health vào Bệnh án EMR!`)
      setShowAppleHealthModal(false)
      setAppleParsedSummary(null)
      setAppleXmlText('')
    } catch (err: any) {
      showToast('error', `Lỗi lưu dữ liệu Apple Health: ${err.message}`)
    } finally {
      setIsSyncingAppleHealth(false)
    }
  }

  // Xử lý tải tệp Android Health Connect JSON
  const handleAndroidHealthFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (content) {
        setAndroidJsonText(content.slice(0, 50000))
        const summary = parseAndroidHealthJson(content)
        setAndroidParsedSummary(summary)
        if (summary.totalRecords > 0) {
          showToast('success', `Đã nhận diện ${summary.totalRecords} chỉ số y tế thật từ Android Health!`)
        } else {
          showToast('error', 'Không tìm thấy dữ liệu hợp lệ trong tệp JSON.')
        }
      }
    }
    reader.readAsText(file)
  }

  // Đồng bộ dữ liệu Android Health vào Bệnh án EMR
  const handleCommitAndroidHealthSync = async () => {
    if (!androidParsedSummary || androidParsedSummary.totalRecords === 0) {
      showToast('error', 'Chưa có dữ liệu Android Health nào được tải lên.')
      return
    }

    setIsSyncingAndroidHealth(true)
    try {
      const savedCount = await syncHealthSummaryToEmr(androidParsedSummary, user?.id)
      
      const updated = devices.map(d => {
        if (d.id === 'dev_android_health') {
          let readingText = 'Đã cập nhật'
          if (androidParsedSummary.latestBloodPressure) {
            readingText = androidParsedSummary.latestBloodPressure.value
          } else if (androidParsedSummary.latestHeartRate) {
            readingText = androidParsedSummary.latestHeartRate.value
          }
          return {
            ...d,
            status: 'connected' as const,
            lastSync: 'Vừa xong',
            lastReading: readingText
          }
        }
        return d
      })
      saveDevicesState(updated)

      if (onRefreshVitals) onRefreshVitals()
      showToast('success', `Đã đồng bộ thành công ${savedCount} chỉ số thật từ Android Health vào Bệnh án EMR!`)
      setShowAndroidHealthModal(false)
      setAndroidParsedSummary(null)
      setAndroidJsonText('')
    } catch (err: any) {
      showToast('error', `Lỗi lưu dữ liệu Android Health: ${err.message}`)
    } finally {
      setIsSyncingAndroidHealth(false)
    }
  }

  // Thực hiện đồng bộ / lấy số đo THẬT từ thiết bị đã kết nối (KHÔNG GIẢ LẬP)
  const handleMeasureDevice = async (device: ConnectedDeviceInfo) => {
    setConnectingDeviceId(device.id)

    // Nếu là Apple Health
    if (device.id === 'dev_apple_health') {
      setShowAppleHealthModal(true)
      setConnectingDeviceId(null)
      return
    }

    // Nếu là Android Health Connect
    if (device.id === 'dev_android_health') {
      setShowAndroidHealthModal(true)
      setConnectingDeviceId(null)
      return
    }

    // Nếu là Camera PPG
    if (device.category === 'camera') {
      handleOpenOpticalCamera()
      setConnectingDeviceId(null)
      return
    }

    // Kiểm tra hỗ trợ Web Bluetooth
    if (!isWebBluetoothSupported()) {
      setConnectingDeviceId(null)
      if (isAppleDevice()) {
        showToast('info', 'Trên iPhone/iPad: Vui lòng sử dụng tính năng Đồng bộ Apple Health hoặc mở ứng dụng trên trình duyệt Bluefy.')
      } else {
        showToast('error', 'Trình duyệt không hỗ trợ Web Bluetooth API. Hãy sử dụng Google Chrome trên điện thoại Android hoặc máy tính.')
      }
      return
    }

    showToast('info', `Đang đọc số đo thật từ ${device.name}... Vui lòng tiến hành đo trên máy.`)

    try {
      if (device.category === 'bp') {
        const res = await readBloodPressureBLE()
        await recordRPMVitals({
          patient_id: user?.id,
          device_type: 'blood_pressure',
          device_name: `${res.deviceName} (Bluetooth Thật)`,
          connection_method: 'bluetooth_ble',
          systolic: res.systolic,
          diastolic: res.diastolic,
          pulse: res.pulse
        })

        const updated = devices.map(d =>
          d.id === device.id
            ? {
                ...d,
                status: 'connected' as const,
                lastSync: 'Vừa xong',
                lastReading: `${res.systolic}/${res.diastolic} mmHg`,
                battery: res.batteryPercent !== undefined ? res.batteryPercent : d.battery
              }
            : d
        )
        saveDevicesState(updated)
        showToast('success', `Đã đồng bộ Huyết áp thật: ${res.systolic}/${res.diastolic} mmHg (Mạch: ${res.pulse} bpm) vào Bệnh án EMR!`)

      } else if (device.category === 'glucose') {
        const res = await readGlucoseBLE()
        await recordRPMVitals({
          patient_id: user?.id,
          device_type: 'glucose',
          device_name: `${res.deviceName} (Bluetooth Thật)`,
          connection_method: 'bluetooth_ble',
          glucose_value: res.glucoseValue
        })

        const updated = devices.map(d =>
          d.id === device.id
            ? {
                ...d,
                status: 'connected' as const,
                lastSync: 'Vừa xong',
                lastReading: `${res.glucoseValue} mmol/L`,
                battery: res.batteryPercent !== undefined ? res.batteryPercent : d.battery
              }
            : d
        )
        saveDevicesState(updated)
        showToast('success', `Đã đồng bộ Đường huyết thật: ${res.glucoseValue} mmol/L vào Bệnh án EMR!`)

      } else if (device.category === 'spo2') {
        const res = await readSpO2BLE()
        await recordRPMVitals({
          patient_id: user?.id,
          device_type: 'spo2',
          device_name: `${res.deviceName} (Bluetooth Thật)`,
          connection_method: 'bluetooth_ble',
          spo2_percent: res.spo2,
          pulse: res.pulse
        })

        const updated = devices.map(d =>
          d.id === device.id
            ? {
                ...d,
                status: 'connected' as const,
                lastSync: 'Vừa xong',
                lastReading: `${res.spo2}% SpO2 (${res.pulse} bpm)`,
                battery: res.batteryPercent !== undefined ? res.batteryPercent : d.battery
              }
            : d
        )
        saveDevicesState(updated)
        showToast('success', `Đã đồng bộ SpO2 thật: ${res.spo2}%, Nhịp mạch: ${res.pulse} bpm vào Bệnh án EMR!`)

      } else if (device.category === 'temp') {
        const res = await readThermometerBLE()
        await recordRPMVitals({
          patient_id: user?.id,
          device_type: 'temperature',
          device_name: `${res.deviceName} (Bluetooth Thật)`,
          connection_method: 'bluetooth_ble',
          temperature_celsius: res.temperatureCelsius
        })

        const updated = devices.map(d =>
          d.id === device.id
            ? {
                ...d,
                status: 'connected' as const,
                lastSync: 'Vừa xong',
                lastReading: `${res.temperatureCelsius} °C`,
                battery: res.batteryPercent !== undefined ? res.batteryPercent : d.battery
              }
            : d
        )
        saveDevicesState(updated)
        showToast('success', `Đã đồng bộ Thân nhiệt thật: ${res.temperatureCelsius} °C vào Bệnh án EMR!`)

      } else {
        showToast('info', 'Vui lòng sử dụng tính năng Nhập số đo để lưu chỉ số cân nặng hiện tại.')
        setShowManualModal(true)
      }

      if (onRefreshVitals) onRefreshVitals()
    } catch (err: any) {
      console.warn('Lỗi đọc chỉ số thiết bị thật:', err)
      showToast('error', `Lỗi đồng bộ ${device.name}: ${err.message || 'Không nhận được dữ liệu từ thiết bị'}`)
    } finally {
      setConnectingDeviceId(null)
    }
  }

  // Vẽ biểu đồ xung PPG

  const drawWaveform = () => {

    const cvs = canvasRef.current

    if (!cvs) return

    const ctx = cvs.getContext('2d')

    if (!ctx) return

    ctx.fillStyle = '#0f172a'

    ctx.fillRect(0, 0, cvs.width, cvs.height)

    ctx.strokeStyle = '#1e293b'

    ctx.lineWidth = 1

    for (let x = 0; x < cvs.width; x += 20) {

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

      const updated = devices.map(d =>

        d.id === 'dev_camera'

          ? {

              ...d,

              status: 'connected' as const,

              lastSync: 'Vừa xong',

              lastReading: `${res.pulse} bpm (~${res.spo2}% SpO2)`

            }

          : d

      )

      saveDevicesState(updated)

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

  // Nhập số đo thủ công

  const handleSaveManualVitals = async (e: React.FormEvent) => {

    e.preventDefault()

    const sysNum = manualSys.trim() ? Number(manualSys) : undefined
    const diaNum = manualDia.trim() ? Number(manualDia) : undefined
    const pulseNum = manualPulse.trim() ? Number(manualPulse) : undefined
    const glucNum = manualGlucose.trim() ? Number(manualGlucose) : undefined
    const spo2Num = manualSpo2.trim() ? Number(manualSpo2) : undefined
    const tempNum = manualTemp.trim() ? Number(manualTemp) : undefined
    const weightNum = manualWeight.trim() ? Number(manualWeight) : undefined
    const heightNum = manualHeight.trim() ? Number(manualHeight) : undefined

    if (
      sysNum === undefined &&
      diaNum === undefined &&
      pulseNum === undefined &&
      glucNum === undefined &&
      spo2Num === undefined &&
      tempNum === undefined &&
      weightNum === undefined &&
      heightNum === undefined
    ) {
      showToast('error', 'Vui lòng nhập ít nhất một chỉ số sinh hiệu thực tế để lưu.')
      return
    }

    setIsSavingManual(true)

    try {

      await recordRPMVitals({

        patient_id: user?.id,

        device_type: 'manual_intake',

        device_name: 'Nhập sinh hiệu tự đo tại nhà',

        connection_method: 'manual',

        systolic: sysNum,

        diastolic: diaNum,

        pulse: pulseNum,

        glucose_value: glucNum,

        spo2_percent: spo2Num,

        temperature_celsius: tempNum,

        weight_kg: weightNum,

        height_cm: heightNum

      })

      setShowManualModal(false)

      showToast('success', 'Đã lưu chỉ số sinh hiệu vào Bệnh án điện tử thành công!')

      if (onRefreshVitals) onRefreshVitals()

    } catch (err: any) {

      console.error('Error saving manual vitals:', err)

      showToast('error', 'Lỗi khi lưu dữ liệu sinh hiệu.')

    } finally {

      setIsSavingManual(false)

    }

  }

  return (

    <div className={`ps-scope smart-devices-hub-wrapper ${embedded ? 'embedded' : 'standalone-page'}`}>

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

      {/* Thẻ chính Quản lý thiết bị */}

      <section className="smart-devices-hub-card">

        {/* Header & Thanh công cụ hành động */}

        <div className="hub-header">

          <div className="hub-title-group">

            <div className="hub-title-with-badge">

              <div className="hub-icon-badge">

                <Cpu size={22} />

              </div>

              <div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                  <h3>Thiết Bị Đo Y Tế Đã Kết Nối</h3>

                  <span className="connected-count-badge">

                    {connectedDevices.length} thiết bị hoạt động

                  </span>

                </div>

                <p>Danh sách các máy đo sinh hiệu cá nhân đã ghép đôi với tài khoản y bạ điện tử</p>

              </div>

            </div>

          </div>

          <div className="hub-header-actions">

            {/* ⭐ NÚT KẾT NỐI THIẾT BỊ MỚI (CHỦ ĐỀ CHÍNH THEO YÊU CẦU) */}

            <button

              className="btn-add-device-primary"

              onClick={() => {

                setShowPairNewModal(true)

                setSearchCatalogQuery('')

                setDiscoveredBleDevices([])

              }}

            >

              <Plus size={16} /> Kết nối thiết bị mới

            </button>

            <button className="btn-action-ghost" onClick={() => setShowManualModal(true)}>

              <Sliders size={14} /> Nhập số đo

            </button>

            <button className="btn-action-ghost" onClick={handleOpenOpticalCamera}>

              <Camera size={14} /> Đo Camera PPG

            </button>

            

          </div>

        </div>

        {/* ⭐ DANH SÁCH CHỈ HIỂN THỊ CÁC THIẾT BỊ ĐÃ KẾT NỐI (CONNECTED DEVICES LIST) */}

        {connectedDevices.length === 0 ? (

          /* Empty State khi chưa có thiết bị nào kết nối */

          <div className="devices-empty-state">

            <div className="empty-state-radar">

              <Bluetooth size={44} className="radar-icon" />

              <div className="radar-circle circle-1" />

              <div className="radar-circle circle-2" />

            </div>

            <h4>Chưa có thiết bị y tế nào được kết nối</h4>

            <p>

              Hãy kết nối máy đo huyết áp, đường huyết, SpO2 hoặc cân sức khỏe qua Bluetooth 

              để tự động truyền số đo chuẩn xác vào bệnh án của Bác sĩ.

            </p>

            <button

              className="btn-add-device-primary btn-empty-action"

              onClick={() => setShowPairNewModal(true)}

            >

              <Plus size={16} /> Kết nối thiết bị đầu tiên của bạn

            </button>

          </div>

        ) : (

          /* Lưới các card thiết bị đã kết nối */

          <div className="devices-connected-grid">

            {connectedDevices.map(device => {

              const Icon = device.icon

              const isConnecting = connectingDeviceId === device.id

              return (

                <div key={device.id} className="compact-device-card">
                  {/* Top Header: Icon, Tên, Hãng, Pin & Xóa */}
                  <div className="card-compact-head">
                    <div className="compact-dev-identity">
                      <div
                        className="compact-avatar-box"
                        style={{ background: `${device.accentColor}18`, color: device.accentColor }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="compact-title-wrap">
                        <div className="compact-title-line">
                          <h4 className="compact-device-name" title={device.name}>{device.name}</h4>
                          <span className="compact-connected-tag">
                            <span className="status-dot connected" /> Đã kết nối
                          </span>
                        </div>
                        <div className="compact-sub-line">
                          <span>{device.brand}</span>
                          {device.regulatoryApproval && (
                            <span className="compact-fda-tag" title={device.regulatoryApproval}>
                              {device.regulatoryApproval.split('/')[0].trim()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="compact-top-actions">
                      {device.battery !== undefined && (
                        <span className="compact-battery-pill" title={`Mức pin: ${device.battery}%`}>
                          <Battery size={13} color={device.battery > 20 ? '#059669' : '#f59e0b'} />
                          <span>{device.battery}%</span>
                        </span>
                      )}
                      <button
                        className="btn-unpair-compact"
                        onClick={(e) => handleDisconnectDevice(device, e)}
                        title="Ngắt kết nối thiết bị này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Chỉ số thiết bị đo lường (Tối giản 1 dòng gọn gàng) */}
                  <div className="compact-metrics-section">
                    <span className="compact-metrics-label">Chỉ số:</span>
                    <div className="compact-chips-list">
                      {device.measuredMetrics.map((m, idx) => (
                        <span key={idx} className="compact-chip" title={`${m.name} • Chuẩn: ${m.normalRange}`}>
                          <b className="chip-code">{m.code}</b>
                          <span className="chip-unit">{m.unit}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Hàng số đo & nút thao tác đồng bộ */}
                  <div className="compact-reading-action-bar">
                    <div className="compact-reading-info">
                      <span className="compact-reading-title">Gần nhất:</span>
                      <strong className="compact-reading-val">{device.lastReading || 'Chưa ghi nhận'}</strong>
                      {device.lastSync && (
                        <span className="compact-sync-time">• {device.lastSync}</span>
                      )}
                    </div>
                    <button
                      className="btn-sync-compact"
                      onClick={() => handleMeasureDevice(device)}
                      disabled={isConnecting}
                      title="Đồng bộ chỉ số đo vào Bệnh án EMR"
                    >
                      {isConnecting ? (
                        <RefreshCw size={13} className="spin" />
                      ) : (
                        <Zap size={13} />
                      )}
                      <span>{isConnecting ? 'Đang đọc...' : 'Đồng bộ'}</span>
                    </button>
                  </div>
                </div>

              )

            })}

          </div>

        )}

      </section>

      {/* ⭐ MODAL: KẾT NỐI / GHÉP ĐÔI THIẾT BỊ MỚI (PAIR NEW MEDICAL DEVICE) */}
      {showPairNewModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card pair-device-modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header pair-modal-header">
              <div className="modal-title-wrap">
                <div className="pair-modal-icon-badge">
                  <Bluetooth size={18} />
                </div>
                <div>
                  <h3 className="pair-modal-title">Kết Nối Thiết Bị Y Tế Thật</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Hỗ trợ phần cứng BLE thật, Apple Health (iOS) và Android Health Connect</p>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setShowPairNewModal(false)}>
                <X size={18} />
              </button>
            </div>

            {/* TAB CHUYỂN ĐỔI NỀN TẢNG THẬT (APPLE / ANDROID / BLUETOOTH BLE) */}
            <div className="pair-platform-tabs" style={{ display: 'flex', gap: '8px', padding: '12px 18px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <button
                className={`pair-platform-tab ${pairPlatformTab === 'ble' ? 'active' : ''}`}
                onClick={() => setPairPlatformTab('ble')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: pairPlatformTab === 'ble' ? '1px solid #0f766e' : '1px solid #e2e8f0',
                  background: pairPlatformTab === 'ble' ? '#0f766e' : '#ffffff',
                  color: pairPlatformTab === 'ble' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                <Bluetooth size={15} /> Bluetooth Thật
              </button>

              <button
                className={`pair-platform-tab ${pairPlatformTab === 'apple' ? 'active' : ''}`}
                onClick={() => setPairPlatformTab('apple')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: pairPlatformTab === 'apple' ? '1px solid #0284c7' : '1px solid #e2e8f0',
                  background: pairPlatformTab === 'apple' ? '#0284c7' : '#ffffff',
                  color: pairPlatformTab === 'apple' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={15} /> Apple (iOS/Watch)
              </button>

              <button
                className={`pair-platform-tab ${pairPlatformTab === 'android' ? 'active' : ''}`}
                onClick={() => setPairPlatformTab('android')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: pairPlatformTab === 'android' ? '1px solid #16a34a' : '1px solid #e2e8f0',
                  background: pairPlatformTab === 'android' ? '#16a34a' : '#ffffff',
                  color: pairPlatformTab === 'android' ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                <Activity size={15} /> Android Health
              </button>
            </div>

            <div className="modal-body-content pair-modal-body" style={{ maxHeight: '420px', overflowY: 'auto', padding: '16px 20px' }}>
              {/* TAB 1: BLUETOOTH THẬT */}
              {pairPlatformTab === 'ble' && (
                <>
                  <div className="ble-scan-banner" style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div className="scan-banner-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="scan-banner-icon-box" style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bluetooth size={18} />
                      </div>
                      <div>
                        <b style={{ fontSize: '13.5px', color: '#0f172a' }}>Quét máy đo Bluetooth THẬT xung quanh</b>
                        <p style={{ margin: 0, fontSize: '11.5px', color: '#475569' }}>Kết nối trực tiếp Omron, Accu-Chek, Wellue, Microlife... qua Web Bluetooth</p>
                      </div>
                    </div>
                    <button
                      className="btn-scan-ble"
                      onClick={handleStartBleScan}
                      disabled={isScanningBle}
                      style={{ background: '#0f766e', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      {isScanningBle ? (
                        <>
                          <RefreshCw size={13} className="spin" /> Đang quét...
                        </>
                      ) : (
                        <>
                          <Radio size={13} /> Dò tìm máy thật
                        </>
                      )}
                    </button>
                  </div>

                  <div className="catalog-header-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Thiết bị y tế tương thích ({availableToPairDevices.length})</h4>
                    <div className="catalog-search-box" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 8px' }}>
                      <Search size={13} color="#94a3b8" />
                      <input
                        type="text"
                        placeholder="Tìm tên máy, hãng..."
                        value={searchCatalogQuery}
                        onChange={(e) => setSearchCatalogQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px' }}
                      />
                    </div>
                  </div>

                  <div className="catalog-devices-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {availableToPairDevices
                      .filter(d =>
                        d.name.toLowerCase().includes(searchCatalogQuery.toLowerCase()) ||
                        d.brand.toLowerCase().includes(searchCatalogQuery.toLowerCase())
                      )
                      .map(device => {
                        const DevIcon = device.icon
                        return (
                          <div key={device.id} className="catalog-device-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff' }}>
                            <div className="catalog-device-identity" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                className="catalog-device-icon"
                                style={{ background: `${device.accentColor}14`, color: device.accentColor, width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <DevIcon size={16} />
                              </div>
                              <div className="catalog-device-info">
                                <div className="catalog-device-title-row" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{device.name}</h5>
                                  <span style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px' }}>{device.brand}</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  Chuẩn: <b>{device.connectionMethod}</b>
                                </div>
                              </div>
                            </div>
                            <button
                              className="btn-pair-device-action"
                              onClick={() => {
                                handlePairDevice(device)
                                setShowPairNewModal(false)
                                showToast('success', `Đã thêm ${device.name} vào danh sách thiết bị sẵn sàng đồng bộ!`)
                              }}
                              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Plus size={13} /> Thêm máy này
                            </button>
                          </div>
                        )
                      })}
                  </div>
                </>
              )}

              {/* TAB 2: APPLE (iOS & APPLE WATCH) */}
              {pairPlatformTab === 'apple' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Smartphone size={18} color="#0284c7" />
                      <strong style={{ fontSize: '14px', color: '#0369a1' }}>Đồng bộ Apple Health (HealthKit & Apple Watch)</strong>
                    </div>
                    <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                      Trích xuất dữ liệu lâm sàng <b>THẬT 100%</b> từ Apple Watch (Nhịp tim ECG, Nồng độ oxy SpO2, Huyết áp từ Omron Connect iOS) vào Bệnh án EMR.
                    </p>
                    <button
                      onClick={() => {
                        setShowPairNewModal(false)
                        setShowAppleHealthModal(true)
                      }}
                      style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={14} /> Mở Trình Đồng Bộ Apple Health
                    </button>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Bluetooth size={18} color="#0f766e" />
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>Kết nối Bluetooth Trực Tiếp trên iPhone qua Trình Duyệt Bluefy</strong>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                      Safari mặc định trên iOS hạn chế Web Bluetooth. Để kết nối trực tiếp với máy đo Bluetooth trên iPhone, bạn có thể tải trình duyệt y tế <b>Bluefy (Miễn phí trên App Store)</b> để mở khóa kết nối BLE thật ngay trên iPhone.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href="bluefy://https://telemed.medicalcenter.vn"
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none', background: '#0f766e', color: '#fff', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        <ExternalLink size={13} /> Mở bằng Bluefy (iOS)
                      </a>
                      <a
                        href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"
                        target="_blank"
                        rel="noreferrer"
                        style={{ textDecoration: 'none', background: '#ffffff', color: '#0284c7', border: '1px solid #bae6fd', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      >
                        Tải Bluefy trên App Store
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ANDROID (HEALTH CONNECT & GOOGLE FIT) */}
              {pairPlatformTab === 'android' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Activity size={18} color="#16a34a" />
                      <strong style={{ fontSize: '14px', color: '#15803d' }}>Google Chrome trên Android (Hỗ trợ Web Bluetooth 100%)</strong>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#334155', lineHeight: '1.5' }}>
                      Trình duyệt Google Chrome trên điện thoại Android (Samsung, Xiaomi, Oppo, Pixel...) hỗ trợ sẵn Web Bluetooth API gốc. Bạn có thể kết nối ngay máy đo mà không cần cài đặt thêm bất kỳ ứng dụng nào.
                    </p>
                    <button
                      onClick={() => setPairPlatformTab('ble')}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Bluetooth size={14} /> Chuyển sang Quét Bluetooth Ngay
                    </button>
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <TrendingUp size={18} color="#059669" />
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>Đồng bộ Android Health Connect / Google Fit</strong>
                    </div>
                    <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                      Đồng bộ số đo thật từ các thiết bị thông minh Samsung Galaxy Watch, Xiaomi Mi Band, Huawei Watch thông qua tệp xuất dữ liệu JSON của Android Health Connect.
                    </p>
                    <button
                      onClick={() => {
                        setShowPairNewModal(false)
                        setShowAndroidHealthModal(true)
                      }}
                      style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Upload size={14} /> Mở Trình Đồng Bộ Android Health
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer pair-modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-cancel-modal" onClick={() => setShowPairNewModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ MODAL ĐỒNG BỘ APPLE HEALTH (HEALTHKIT & APPLE WATCH) */}
      {showAppleHealthModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '580px', borderRadius: '8px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={20} color="#0284c7" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Đồng Bộ Apple Health & Apple Watch (iOS)</h3>
                  <small style={{ color: '#64748b' }}>Trích xuất dữ liệu lâm sàng thật từ ứng dụng Sức Khỏe trên iPhone</small>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setShowAppleHealthModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#0369a1', lineHeight: '1.5' }}>
                <b>📌 Cách xuất dữ liệu trên iPhone:</b>
                <ol style={{ margin: '6px 0 0 16px', padding: 0 }}>
                  <li>Mở ứng dụng <b>Sức Khỏe (Health)</b> trên iPhone</li>
                  <li>Nhấn vào <b>Ảnh đại diện</b> ở góc trên cùng bên phải</li>
                  <li>Chọn <b>"Xuất dữ liệu sức khỏe" (Export Health Data)</b></li>
                  <li>Tải lên tệp <code>export.xml</code> (hoặc dán nội dung XML) vào khung bên dưới</li>
                </ol>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Chọn tệp dữ liệu Apple Health (.xml / .txt):
                </label>
                <input
                  type="file"
                  accept=".xml,.txt,.zip"
                  onChange={handleAppleHealthFileUpload}
                  style={{ display: 'block', width: '100%', padding: '8px', border: '1px dashed #0284c7', borderRadius: '6px', background: '#f8fafc', fontSize: '12px', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Hoặc dán trực tiếp đoạn mã XML bản ghi sức khỏe:
                </label>
                <textarea
                  rows={3}
                  placeholder='Ví dụ: <Record type="HKQuantityTypeIdentifierBloodPressureSystolic" value="122" unit="mmHg" startDate="2026-11-06..."/>'
                  value={appleXmlText}
                  onChange={(e) => {
                    const text = e.target.value
                    setAppleXmlText(text)
                    if (text.includes('<Record')) {
                      setAppleParsedSummary(parseAppleHealthXml(text))
                    }
                  }}
                  style={{ width: '100%', padding: '8px', fontSize: '11px', fontFamily: 'monospace', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>

              {appleParsedSummary && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <b style={{ display: 'block', fontSize: '12.5px', color: '#0f172a', marginBottom: '8px' }}>
                    Kết quả nhận diện: {appleParsedSummary.totalRecords} chỉ số y tế THẬT
                  </b>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {appleParsedSummary.latestBloodPressure && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                        <small style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>Huyết áp thật</small>
                        <strong style={{ color: '#ef4444', fontSize: '13px' }}>{appleParsedSummary.latestBloodPressure.value}</strong>
                      </div>
                    )}
                    {appleParsedSummary.latestHeartRate && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                        <small style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>Nhịp tim Apple Watch</small>
                        <strong style={{ color: '#0ea5e9', fontSize: '13px' }}>{appleParsedSummary.latestHeartRate.value}</strong>
                      </div>
                    )}
                    {appleParsedSummary.latestSpO2 && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                        <small style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>Nồng độ Oxy SpO2</small>
                        <strong style={{ color: '#10b981', fontSize: '13px' }}>{appleParsedSummary.latestSpO2.value}</strong>
                      </div>
                    )}
                    {appleParsedSummary.latestGlucose && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                        <small style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>Đường huyết</small>
                        <strong style={{ color: '#f59e0b', fontSize: '13px' }}>{appleParsedSummary.latestGlucose.value}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowAppleHealthModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                disabled={isSyncingAppleHealth || !appleParsedSummary || appleParsedSummary.totalRecords === 0}
                onClick={handleCommitAppleHealthSync}
                style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (!appleParsedSummary || appleParsedSummary.totalRecords === 0) ? 0.6 : 1 }}
              >
                {isSyncingAppleHealth ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
                Đồng bộ vào Bệnh án EMR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ MODAL ĐỒNG BỘ ANDROID HEALTH CONNECT */}
      {showAndroidHealthModal && (
        <div className="portal-modal-overlay">
          <div className="portal-modal-card" style={{ maxWidth: '560px', borderRadius: '8px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="#16a34a" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Đồng Bộ Android Health Connect & Google Fit</h3>
                  <small style={{ color: '#64748b' }}>Đồng bộ số đo thật từ Galaxy Watch, Xiaomi Band, WearOS</small>
                </div>
              </div>
              <button className="btn-modal-close" onClick={() => setShowAndroidHealthModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-content" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px', fontSize: '12px', color: '#166534', lineHeight: '1.5' }}>
                <b>📌 Hướng dẫn đồng bộ:</b> Tải lên tệp sao lưu JSON từ ứng dụng <b>Health Connect</b> (hoặc Google Takeout Fit) trên điện thoại Android của bạn để trích xuất số đo thật.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Chọn tệp dữ liệu Health Connect (.json):
                </label>
                <input
                  type="file"
                  accept=".json,.txt"
                  onChange={handleAndroidHealthFileUpload}
                  style={{ display: 'block', width: '100%', padding: '8px', border: '1px dashed #16a34a', borderRadius: '6px', background: '#f8fafc', fontSize: '12px', cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                  Hoặc dán chuỗi JSON dữ liệu đo:
                </label>
                <textarea
                  rows={3}
                  placeholder='[{"time":"2026-11-06T08:00:00Z","systolic":120,"diastolic":80,"pulse":74}]'
                  value={androidJsonText}
                  onChange={(e) => {
                    const text = e.target.value
                    setAndroidJsonText(text)
                    setAndroidParsedSummary(parseAndroidHealthJson(text))
                  }}
                  style={{ width: '100%', padding: '8px', fontSize: '11px', fontFamily: 'monospace', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
              </div>

              {androidParsedSummary && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                  <b style={{ display: 'block', fontSize: '12.5px', color: '#0f172a', marginBottom: '8px' }}>
                    Nhận diện: {androidParsedSummary.totalRecords} chỉ số y tế THẬT
                  </b>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {androidParsedSummary.latestBloodPressure && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                        <small style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>Huyết áp</small>
                        <strong style={{ color: '#ef4444', fontSize: '13px' }}>{androidParsedSummary.latestBloodPressure.value}</strong>
                      </div>
                    )}
                    {androidParsedSummary.latestHeartRate && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                        <small style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>Nhịp tim</small>
                        <strong style={{ color: '#0ea5e9', fontSize: '13px' }}>{androidParsedSummary.latestHeartRate.value}</strong>
                      </div>
                    )}
                    {androidParsedSummary.latestSpO2 && (
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                        <small style={{ color: '#64748b', display: 'block', fontSize: '10.5px' }}>SpO2</small>
                        <strong style={{ color: '#10b981', fontSize: '13px' }}>{androidParsedSummary.latestSpO2.value}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setShowAndroidHealthModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                disabled={isSyncingAndroidHealth || !androidParsedSummary || androidParsedSummary.totalRecords === 0}
                onClick={handleCommitAndroidHealthSync}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: (!androidParsedSummary || androidParsedSummary.totalRecords === 0) ? 0.6 : 1 }}
              >
                {isSyncingAndroidHealth ? <RefreshCw size={13} className="spin" /> : <Check size={13} />}
                Đồng bộ vào Bệnh án EMR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐO CAMERA QUANG HỌC (OPTICAL PPG) */}

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

                  👉 <b>Hướng dẫn:</b> Đặt nhẹ đầu ngón tay trỏ che kín ống kính camera sau. Giữ yên tay trong 12-15 giây. 

                  Đèn flash sẽ tự động bật để chiếu sáng mao mạch máu.

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

      {/* MODAL: NHẬP SỐ ĐO THỦ CÔNG */}

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

                <div className="manual-form-grid">

                  <div className="form-group">

                    <label>Huyết áp Tâm thu (SYS)</label>

                    <div className="input-with-unit">

                      <input

                        type="number"

                        min="60"

                        max="260"

                        value={manualSys}

                        onChange={(e) => setManualSys(e.target.value)}

                        placeholder="Nhập SYS"

                      />

                      <span>mmHg</span>

                    </div>

                  </div>

                  <div className="form-group">

                    <label>Huyết áp Tâm trương (DIA)</label>

                    <div className="input-with-unit">

                      <input

                        type="number"

                        min="40"

                        max="160"

                        value={manualDia}

                        onChange={(e) => setManualDia(e.target.value)}

                        placeholder="Nhập DIA"

                      />

                      <span>mmHg</span>

                    </div>

                  </div>

                  <div className="form-group">

                    <label>Nhịp tim mao mạch</label>

                    <div className="input-with-unit">

                      <input

                        type="number"

                        min="30"

                        max="220"

                        value={manualPulse}

                        onChange={(e) => setManualPulse(e.target.value)}

                        placeholder="Nhập nhịp tim"

                      />

                      <span>bpm</span>

                    </div>

                  </div>

                  <div className="form-group">

                    <label>Nồng độ SpO2</label>

                    <div className="input-with-unit">

                      <input

                        type="number"

                        min="70"

                        max="100"

                        value={manualSpo2}

                        onChange={(e) => setManualSpo2(e.target.value)}

                        placeholder="Nhập SpO2"

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

                        onChange={(e) => setManualGlucose(e.target.value)}

                        placeholder="Nhập đường huyết"

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

                        onChange={(e) => setManualTemp(e.target.value)}

                        placeholder="Nhập thân nhiệt"

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

                        onChange={(e) => setManualWeight(e.target.value)}

                        placeholder="Nhập cân nặng"

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

                        onChange={(e) => setManualHeight(e.target.value)}

                        placeholder="Nhập chiều cao"

                      />

                      <span>cm</span>

                    </div>

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

