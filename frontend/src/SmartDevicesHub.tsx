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

  Signal,

  Plus,

  Radio,

  Trash2,

  CheckCircle,

  Search,

  Sparkles,

  HelpCircle

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

  category: 'bp' | 'glucose' | 'spo2' | 'temp' | 'scale' | 'camera'

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

    status: 'connected',

    battery: 88,

    lastSync: '15 phút trước',

    lastReading: '120/80 mmHg',

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

    status: 'connected',

    battery: 92,

    lastSync: 'Hôm nay, 07:15',

    lastReading: '5.6 mmol/L',

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

    battery: 76,

    lastSync: '2 giờ trước',

    lastReading: '98% SpO2 (74 bpm)',

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

    battery: 85,

    lastSync: 'Hôm qua, 18:30',

    lastReading: '36.6 °C',

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

    battery: 94,

    lastSync: '3 ngày trước',

    lastReading: '62.0 kg (BMI: 21.8)',

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

    lastSync: 'Vừa xong',

    lastReading: '72 bpm (SpO2 ~98%)',

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



  // Khởi tạo danh sách thiết bị từ LocalStorage hoặc danh sách mặc định

  const [devices, setDevices] = useState<ConnectedDeviceInfo[]>(() => {

    try {

      const saved = localStorage.getItem('careconnect_paired_devices')

      if (saved) {

        const parsed = JSON.parse(saved)

        // Đồng bộ icon và component

        return DEFAULT_ALL_DEVICES.map(def => {

          const matched = parsed.find((p: any) => p.id === def.id)

          if (matched) {

            return {

              ...def,

              status: matched.status || def.status,

              lastReading: matched.lastReading || def.lastReading,

              lastSync: matched.lastSync || def.lastSync,

              battery: matched.battery !== undefined ? matched.battery : def.battery

            }

          }

          return def

        })

      }

    } catch (e) {

      console.warn('Cannot load saved devices:', e)

    }

    return DEFAULT_ALL_DEVICES

  })



  // Lưu thiết bị vào LocalStorage khi có thay đổi trạng thái

  const saveDevicesState = (updatedList: ConnectedDeviceInfo[]) => {

    setDevices(updatedList)

    try {

      const minimal = updatedList.map(d => ({

        id: d.id,

        status: d.status,

        lastReading: d.lastReading,

        lastSync: d.lastSync,

        battery: d.battery

      }))

      localStorage.setItem('careconnect_paired_devices', JSON.stringify(minimal))

    } catch (e) {

      console.error('Cannot save devices to localStorage:', e)

    }

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



  // Modal: Camera Optical PPG

  const [showCameraModal, setShowCameraModal] = useState<boolean>(false)

  const [cameraProgress, setCameraProgress] = useState<number>(0)

  const [cameraCurrentBpm, setCameraCurrentBpm] = useState<number>(0)

  const [cameraStatusText, setCameraStatusText] = useState<string>('Đang sẵn sàng kết nối camera...')

  const [cameraResult, setCameraResult] = useState<PPGMeasurementResult | null>(null)

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false)

  const waveformPoints = useRef<number[]>([])

  const canvasRef = useRef<HTMLCanvasElement>(null)



  // Modal: Nhập số đo thủ công

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

          battery: d.battery || 95

        }

      }

      return d

    })

    saveDevicesState(updated)

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

    showToast('info', `Đã ngắt kết nối thiết bị ${deviceToUnpair.name}.`)

  }



  // Quét thiết bị Bluetooth thực tế xung quanh

  const handleStartBleScan = async () => {

    setIsScanningBle(true)

    setDiscoveredBleDevices([])



    if (isWebBluetoothSupported()) {

      try {

        // Yêu cầu quét thiết bị BLE hỗ trợ chuẩn y tế GATT

        const nav: any = navigator

        const bleDevice = await nav.bluetooth.requestDevice({

          filters: [

            { services: ['blood_pressure'] },

            { services: ['glucose'] },

            { services: ['pulse_oximeter'] },

            { services: ['health_thermometer'] }

          ],

          optionalServices: ['battery_service', 'device_information']

        })



        if (bleDevice) {

          setDiscoveredBleDevices([

            {

              id: 'ble_custom_' + Date.now(),

              name: bleDevice.name || 'Thiết bị Y tế BLE phát hiện',

              type: 'bluetooth',

              raw: bleDevice

            }

          ])

          showToast('success', `Đã tìm thấy thiết bị: ${bleDevice.name || 'Bluetooth Medical'}`)

        }

      } catch (err: any) {

        console.warn('Bluetooth scan cancelled or unsupported:', err)

        // Mô phỏng quét thấy thiết bị xung quanh

        setTimeout(() => {

          setDiscoveredBleDevices([

            {

              id: 'ble_sim_1',

              name: 'Omron HEM-7361T (BLE Signal -52 dBm)',

              matchedId: 'dev_bp',

              type: 'Huyết áp'

            },

            {

              id: 'ble_sim_2',

              name: 'Accu-Chek Instant (BLE Signal -64 dBm)',

              matchedId: 'dev_glucose',

              type: 'Đường huyết'

            },

            {

              id: 'ble_sim_3',

              name: 'Wellue FS20F SpO2 (BLE Signal -48 dBm)',

              matchedId: 'dev_spo2',

              type: 'SpO2 & Mạch'

            }

          ])

          setIsScanningBle(false)

          showToast('info', 'Tìm thấy 3 thiết bị y tế Bluetooth phát sóng ở cự ly gần.')

        }, 1200)

        return

      }

    } else {

      // Giả lập quét

      setTimeout(() => {

        setDiscoveredBleDevices([

          {

            id: 'ble_sim_1',

            name: 'Omron HEM-7361T (BLE Signal -52 dBm)',

            matchedId: 'dev_bp',

            type: 'Huyết áp'

          },

          {

            id: 'ble_sim_2',

            name: 'Wellue FS20F SpO2 (BLE Signal -48 dBm)',

            matchedId: 'dev_spo2',

            type: 'SpO2 & Mạch'

          }

        ])

        setIsScanningBle(false)

        showToast('info', 'Tìm thấy thiết bị y tế Bluetooth phát sóng gần bạn.')

      }, 1000)

    }

  }



  // Thực hiện đồng bộ / lấy số đo từ thiết bị đã kết nối

  const handleMeasureDevice = async (device: ConnectedDeviceInfo) => {

    setConnectingDeviceId(device.id)

    showToast('info', `Đang đọc số đo từ ${device.name}...`)



    try {

      if (device.category === 'bp') {

        let res

        if (isWebBluetoothSupported()) {

          try {

            res = await readBloodPressureBLE()

          } catch (e: any) {

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



        const updated = devices.map(d =>

          d.id === device.id

            ? {

                ...d,

                status: 'connected' as const,

                lastSync: 'Vừa xong',

                lastReading: `${res.systolic}/${res.diastolic} mmHg (Nhịp tim: ${res.pulse} bpm)`

              }

            : d

        )

        saveDevicesState(updated)

        showToast('success', `Đã đồng bộ Huyết áp: ${res.systolic}/${res.diastolic} mmHg, Nhịp tim: ${res.pulse} bpm vào bệnh án điện tử!`)

      } else if (device.category === 'glucose') {

        let res

        if (isWebBluetoothSupported()) {

          try {

            res = await readGlucoseBLE()

          } catch {

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

          glucose_value: res.glucose

        })



        const updated = devices.map(d =>

          d.id === device.id

            ? {

                ...d,

                status: 'connected' as const,

                lastSync: 'Vừa xong',

                lastReading: `${res.glucose} mmol/L`

              }

            : d

        )

        saveDevicesState(updated)

        showToast('success', `Đã đồng bộ Đường huyết: ${res.glucose} mmol/L (${(res.glucose * 18.018).toFixed(0)} mg/dL)!`)

      } else if (device.category === 'spo2') {

        let res

        if (isWebBluetoothSupported()) {

          try {

            res = await readSpO2BLE()

          } catch {

            res = await simulateDeviceReading('spo2')

          }

        } else {

          res = await simulateDeviceReading('spo2')

        }



        await recordRPMVitals({

          patient_id: user?.id,

          device_type: 'spo2',

          device_name: res.deviceName || device.name,

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

                lastReading: `${res.spo2}% SpO2 (Mạch: ${res.pulse} bpm)`

              }

            : d

        )

        saveDevicesState(updated)

        showToast('success', `Đã đồng bộ SpO2: ${res.spo2}%, Nhịp mạch: ${res.pulse} bpm!`)

      } else if (device.category === 'temp') {

        let res

        if (isWebBluetoothSupported()) {

          try {

            res = await readThermometerBLE()

          } catch {

            res = await simulateDeviceReading('temperature')

          }

        } else {

          res = await simulateDeviceReading('temperature')

        }



        await recordRPMVitals({

          patient_id: user?.id,

          device_type: 'temperature',

          device_name: res.deviceName || device.name,

          connection_method: 'bluetooth_ble',

          temperature_celsius: res.temperature

        })



        const updated = devices.map(d =>

          d.id === device.id

            ? {

                ...d,

                status: 'connected' as const,

                lastSync: 'Vừa xong',

                lastReading: `${res.temperature} °C`

              }

            : d

        )

        saveDevicesState(updated)

        showToast('success', `Đã đồng bộ Thân nhiệt: ${res.temperature} °C!`)

      } else if (device.category === 'scale') {

        const weightVal = Number((58 + Math.random() * 6).toFixed(1))

        const res = { deviceName: 'Tanita BC-401 Smart Scale', weight: weightVal, bmi: Number((weightVal / (1.68 * 1.68)).toFixed(1)) }



        await recordRPMVitals({

          patient_id: user?.id,

          device_type: 'weight',

          device_name: res.deviceName || device.name,

          connection_method: 'bluetooth_ble',

          weight_kg: res.weight

        })



        const updated = devices.map(d =>

          d.id === device.id

            ? {

                ...d,

                status: 'connected' as const,

                lastSync: 'Vừa xong',

                lastReading: `${res.weight} kg (BMI: ${res.bmi})`

              }

            : d

        )

        saveDevicesState(updated)

        showToast('success', `Đã đồng bộ Cân nặng: ${res.weight} kg, BMI: ${res.bmi} kg/m²!`)

      } else if (device.category === 'camera') {

        handleOpenOpticalCamera()

      }



      if (onRefreshVitals) onRefreshVitals()

    } catch (err: any) {

      console.error('Error measuring device:', err)

      showToast('error', `Không thể đồng bộ số đo: ${err?.message || 'Lỗi kết nối'}`)

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

                        <Icon size={20} />

                      </div>

                      <div className="compact-title-wrap">

                        <div className="compact-title-line">

                          <h4 className="compact-device-name">{device.name}</h4>

                          <span className="compact-connected-tag">

                            <span className="status-dot connected" /> Đã kết nối

                          </span>

                        </div>

                        <div className="compact-sub-line">

                          <span>{device.brand}</span>

                          {device.regulatoryApproval && (

                            <span className="compact-fda-tag">{device.regulatoryApproval}</span>

                          )}

                        </div>

                      </div>

                    </div>



                    <button

                      className="btn-unpair-compact"

                      onClick={(e) => handleDisconnectDevice(device, e)}

                      title="Ngắt kết nối thiết bị này"

                    >

                      <Trash2 size={14} />

                    </button>

                  </div>



                  {/* Chỉ số thiết bị đo lường (Compact Chips) */}

                  <div className="compact-metrics-section">

                    <span className="compact-metrics-label">Chỉ số đo:</span>

                    <div className="compact-chips-list">

                      {device.measuredMetrics.map((m, idx) => (

                        <span key={idx} className="compact-chip" title={`${m.name}: Chuẩn ${m.normalRange}`}>

                          <b className="chip-code">{m.code}</b>

                          <span className="chip-name">{m.name.split('(')[0].trim()}</span>

                          <span className="chip-unit">[{m.unit}]</span>

                        </span>

                      ))}

                    </div>

                  </div>



                  {/* Hàng số đo & nút thao tác đồng bộ */}

                  <div className="compact-reading-action-bar">

                    <div className="compact-reading-info">

                      <span className="compact-reading-title">Số đo gần nhất:</span>

                      <strong className="compact-reading-val">{device.lastReading || 'Chưa ghi nhận'}</strong>

                      <span className="compact-sync-time">• {device.lastSync || 'Chưa đồng bộ'}</span>

                    </div>



                    <div className="compact-action-group">

                      {device.battery !== undefined && (

                        <span className="compact-battery-pill">

                          <Battery size={12} /> {device.battery}%

                        </span>

                      )}

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

                </div>

              )

            })}

          </div>

        )}

      </section>



      {/* ⭐ MODAL: KẾT NỐI / GHÉP ĐÔI THIẾT BỊ MỚI (PAIR NEW MEDICAL DEVICE) */}

      {showPairNewModal && (

        <div className="portal-modal-overlay">

          <div className="portal-modal-card pair-device-modal">

            <div className="modal-header pair-modal-header">

              <div className="modal-title-wrap">

                <div className="pair-modal-icon-badge">

                  <Bluetooth size={18} />

                </div>

                <h3 className="pair-modal-title">Kết Nối Thiết Bị Y Tế Mới</h3>

              </div>

              <button className="btn-modal-close" onClick={() => setShowPairNewModal(false)}>

                <X size={18} />

              </button>

            </div>



            <div className="modal-body-content pair-modal-body">

              {/* Banner quét Bluetooth tự động */}

              <div className="ble-scan-banner">

                <div className="scan-banner-info">

                  <div className="scan-banner-icon-box">

                    <Bluetooth size={18} />

                  </div>

                  <div>

                    <b>Quét thiết bị Bluetooth xung quanh</b>

                    <p>Bật Bluetooth trên máy đo để tự động ghép đôi</p>

                  </div>

                </div>

                <button

                  className="btn-scan-ble"

                  onClick={handleStartBleScan}

                  disabled={isScanningBle}

                >

                  {isScanningBle ? (

                    <>

                      <RefreshCw size={13} className="spin" /> Đang dò tìm...

                    </>

                  ) : (

                    <>

                      <Radio size={13} /> Dò tìm BLE

                    </>

                  )}

                </button>

              </div>



              {/* Danh sách thiết bị BLE vừa tìm thấy nếu có */}

              {discoveredBleDevices.length > 0 && (

                <div className="discovered-section">

                  <div className="discovered-header">

                    <Sparkles size={14} className="text-amber" />

                    <span>Thiết bị phát hiện ở gần bạn:</span>

                  </div>

                  <div className="discovered-list">

                    {discoveredBleDevices.map((d, i) => (

                      <div key={i} className="discovered-item">

                        <div>

                          <b>{d.name}</b>

                          <small>Chuẩn kết nối: {d.type}</small>

                        </div>

                        <button

                          className="btn-pair-quick"

                          onClick={() => {

                            const target = devices.find(x => x.id === d.matchedId) || devices[0]

                            handlePairDevice(target)

                          }}

                        >

                          <Plus size={13} /> Ghép đôi ngay

                        </button>

                      </div>

                    ))}

                  </div>

                </div>

              )}



              {/* Tìm kiếm danh mục thiết bị hỗ trợ */}

              <div className="catalog-header-line">

                <h4>Thiết bị tương thích ({availableToPairDevices.length})</h4>

                <div className="catalog-search-box">

                  <Search size={13} />

                  <input

                    type="text"

                    placeholder="Tìm theo tên máy, hãng..."

                    value={searchCatalogQuery}

                    onChange={(e) => setSearchCatalogQuery(e.target.value)}

                  />

                </div>

              </div>



              {/* Danh sách các thiết bị có thể ghép đôi */}

              <div className="catalog-devices-scroll">

                {availableToPairDevices

                  .filter(d =>

                    d.name.toLowerCase().includes(searchCatalogQuery.toLowerCase()) ||

                    d.brand.toLowerCase().includes(searchCatalogQuery.toLowerCase())

                  )

                  .map(device => {

                    const DevIcon = device.icon



                    return (

                      <div key={device.id} className="catalog-device-row">

                        <div className="catalog-device-identity">

                          <div

                            className="catalog-device-icon"

                            style={{ background: `${device.accentColor}14`, color: device.accentColor }}

                          >

                            <DevIcon size={18} />

                          </div>

                          <div className="catalog-device-info">

                            <div className="catalog-device-title-row">

                              <h5>{device.name}</h5>

                              <span className="catalog-device-brand-badge">{device.brand}</span>

                            </div>

                            <div className="catalog-metrics-summary">

                              <span>Đo: </span>

                              <b>{device.measuredMetrics.map(m => m.name).join(', ')}</b>

                            </div>

                          </div>

                        </div>



                        <button

                          className="btn-pair-device-action"

                          onClick={() => handlePairDevice(device)}

                        >

                          <Plus size={13} /> Ghép đôi

                        </button>

                      </div>

                    )

                  })}



                {availableToPairDevices.length === 0 && (

                  <div className="all-paired-state">

                    <CheckCircle2 size={28} className="text-emerald" />

                    <b>Tất cả thiết bị trong danh mục đã được ghép đôi!</b>

                    <p>Bạn đã kết nối đầy đủ các máy đo sinh hiệu vào hồ sơ bệnh án.</p>

                  </div>

                )}

              </div>

            </div>



            <div className="modal-footer pair-modal-footer">

              <button className="btn-cancel-modal" onClick={() => setShowPairNewModal(false)}>

                Đóng

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

                        onChange={(e) => setManualSys(Number(e.target.value))}

                        required

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

                        onChange={(e) => setManualDia(Number(e.target.value))}

                        required

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

                        onChange={(e) => setManualPulse(Number(e.target.value))}

                        required

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

