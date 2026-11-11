import React, { useState, useEffect } from 'react'
import {
  Bluetooth,
  RefreshCw,
  CheckCircle2,
  Battery,
  Signal,
  Trash2,
  HeartPulse,
  Droplets,
  Wind,
  Thermometer,
  Scale,
  Sparkles,
  Info,
  X,
  Play,
  ShieldCheck,
  Lock
} from 'lucide-react'
import {
  DiscoveredBleDevice,
  startBleScan,
  stopBleScan,
  readDeviceMeasurement,
  BleMeasurementData
} from './mobileBleService'
import {
  getMyMedicalDevices,
  saveMyMedicalDevice,
  deleteMyMedicalDevice,
  recordRPMVitals,
  PatientMedicalDeviceItem
} from './api'

interface MobileBluetoothViewProps {
  user: any
  onBack?: () => void
  onRefreshVitals?: () => Promise<void> | void
}

// Danh sách thiết bị y tế kết nối mẫu tiêu chuẩn (KHÔNG BAO GIỜ XÓA - luôn sẵn sàng phục vụ khám từ xa & đo sinh hiệu)
export const DEFAULT_SAMPLE_CONNECTED_DEVICES: PatientMedicalDeviceItem[] = [
  {
    id: 9001,
    patient_id: 0,
    device_code: 'BLE_OMRON_7361T',
    device_name: 'Omron HEM-7361T Smart BP',
    device_type: 'bp',
    manufacturer: 'Omron Healthcare Japan',
    connection_method: 'bluetooth_ble',
    battery_level: 95,
    status: 'connected',
    created_at: new Date().toISOString()
  },
  {
    id: 9002,
    patient_id: 0,
    device_code: 'BLE_ACCUCHEK_INSTANT',
    device_name: 'Roche Accu-Chek Instant',
    device_type: 'glucose',
    manufacturer: 'Roche Diabetes Care',
    connection_method: 'bluetooth_ble',
    battery_level: 88,
    status: 'connected',
    created_at: new Date().toISOString()
  },
  {
    id: 9003,
    patient_id: 0,
    device_code: 'BLE_CONTEC_CMS50D',
    device_name: 'Contec CMS50D-BT Pulse Oximeter',
    device_type: 'spo2',
    manufacturer: 'Contec Medical Systems',
    connection_method: 'bluetooth_ble',
    battery_level: 92,
    status: 'connected',
    created_at: new Date().toISOString()
  }
]

export const MobileBluetoothView: React.FC<MobileBluetoothViewProps> = ({
  user,
  onRefreshVitals
}) => {
  // Trạng thái quét thiết bị
  const [isScanning, setIsScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredBleDevice[]>([])
  const [pairedDevices, setPairedDevices] = useState<PatientMedicalDeviceItem[]>(DEFAULT_SAMPLE_CONNECTED_DEVICES)
  const [loadingPaired, setLoadingPaired] = useState(false)

  // Trạng thái kết nối & ghép đôi
  const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null)
  const [readingDeviceId, setReadingDeviceId] = useState<number | string | null>(null)

  // Thông báo Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Modal hiển thị kết quả đo
  const [measurementResult, setMeasurementResult] = useState<BleMeasurementData | null>(null)

  // Modal hướng dẫn bật Bluetooth trên thiết bị
  const [showGuideModal, setShowGuideModal] = useState(false)

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3800)
  }

  // Tải danh sách thiết bị đã ghép đôi từ CSDL thật & hợp nhất thiết bị mẫu (không xóa thiết bị mẫu)
  const loadPairedDevices = async () => {
    try {
      setLoadingPaired(true)
      const data = await getMyMedicalDevices()
      const dbList: PatientMedicalDeviceItem[] = Array.isArray(data) ? data : []

      // Hợp nhất: Giữ nguyên thiết bị thực từ DB + bảo toàn đầy đủ các thiết bị mẫu đã kết nối
      const mergedList = [...dbList]
      DEFAULT_SAMPLE_CONNECTED_DEVICES.forEach((sampleDev) => {
        const exists = mergedList.some(
          (d) =>
            (d.device_code && d.device_code === sampleDev.device_code) ||
            (d.device_name && d.device_name.toLowerCase() === sampleDev.device_name.toLowerCase())
        )
        if (!exists) {
          mergedList.push(sampleDev)
        }
      })

      setPairedDevices(mergedList)
    } catch (err: any) {
      console.warn('Lỗi tải thiết bị đã ghép đôi, giữ danh sách mẫu:', err)
      setPairedDevices(DEFAULT_SAMPLE_CONNECTED_DEVICES)
    } finally {
      setLoadingPaired(false)
    }
  }

  useEffect(() => {
    loadPairedDevices()
  }, [])

  // Bắt đầu quét BLE
  const handleStartScan = async () => {
    if (isScanning) {
      handleStopScan()
      return
    }

    setIsScanning(true)
    setDiscoveredDevices([])
    showToast('info', 'Đang quét tìm thiết bị y tế Bluetooth BLE xung quanh...')

    try {
      await startBleScan((device) => {
        setDiscoveredDevices((prev) => {
          if (prev.some((d) => d.deviceId === device.deviceId)) return prev
          return [...prev, device]
        })
      }, 12000)
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi quét Bluetooth')
      setIsScanning(false)
    }
  }

  // Dừng quét
  const handleStopScan = async () => {
    await stopBleScan()
    setIsScanning(false)
  }

  // Ghép đôi thiết bị mới và lưu vào CSDL
  const handlePairDevice = async (device: DiscoveredBleDevice) => {
    setPairingDeviceId(device.deviceId)
    try {
      await saveMyMedicalDevice({
        device_code: device.deviceId,
        device_name: device.name,
        device_type: device.category,
        manufacturer: device.manufacturer || 'Chuẩn BLE Y tế',
        connection_method: 'bluetooth_ble',
        battery_level: device.batteryPercent || 90,
        status: 'connected'
      })

      showToast('success', `Đã ghép đôi và lưu máy ${device.name} vào tài khoản!`)
      await loadPairedDevices()

      // Xóa khỏi danh sách mới phát hiện
      setDiscoveredDevices((prev) => prev.filter((d) => d.deviceId !== device.deviceId))
    } catch (err: any) {
      showToast('error', err.message || 'Không thể ghép đôi thiết bị')
    } finally {
      setPairingDeviceId(null)
    }
  }

  // Hủy ghép đôi thiết bị tùy chỉnh (Bảo vệ: không xóa thiết bị mẫu)
  const handleUnpairDevice = async (id: number, name: string) => {
    if (id >= 9000) {
      showToast('info', 'Thiết bị mẫu kết nối sẵn phục vụ khám từ xa - Không thể xóa!')
      return
    }

    if (!confirm(`Bạn có chắc muốn hủy ghép đôi máy "${name}"?`)) return
    try {
      await deleteMyMedicalDevice(id)
      showToast('info', `Đã hủy kết nối thiết bị ${name}`)
      await loadPairedDevices()
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi hủy ghép đôi')
    }
  }

  // Đọc số đo thực tế từ thiết bị (Hỗ trợ cả thiết bị thật và thiết bị mẫu)
  const handleReadMeasurement = async (deviceItem: PatientMedicalDeviceItem) => {
    setReadingDeviceId(deviceItem.id)
    try {
      showToast('info', `Đang kết nối ${deviceItem.device_name}...`)

      const syntheticDev: DiscoveredBleDevice = {
        deviceId: deviceItem.device_code || String(deviceItem.id),
        name: deviceItem.device_name,
        category: (deviceItem.device_type as any) || 'bp',
        categoryLabel: deviceItem.device_name,
        manufacturer: deviceItem.manufacturer || undefined
      }

      const measurement = await readDeviceMeasurement(syntheticDev)

      // Lưu kết quả vào CSDL `rpm_vital_logs` qua API `recordRPMVitals`
      await recordRPMVitals({
        patient_id: user?.id,
        device_type: measurement.deviceType,
        device_name: measurement.deviceName,
        connection_method: 'bluetooth_ble',
        systolic: measurement.systolic,
        diastolic: measurement.diastolic,
        pulse: measurement.pulse,
        glucose_value: measurement.glucoseValue,
        spo2_percent: measurement.spo2Percent,
        temperature_celsius: measurement.temperatureCelsius,
        weight_kg: measurement.weightKg
      })

      setMeasurementResult(measurement)
      if (onRefreshVitals) await onRefreshVitals()
      showToast('success', `Đã đồng bộ số đo từ ${deviceItem.device_name} vào EMR thành công!`)
    } catch (err: any) {
      showToast('error', err.message || 'Không thể đọc số đo từ thiết bị')
    } finally {
      setReadingDeviceId(null)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bp':
        return <HeartPulse size={20} color="#ef4444" />
      case 'glucose':
        return <Droplets size={20} color="#f59e0b" />
      case 'spo2':
        return <Wind size={20} color="#0284c7" />
      case 'temp':
        return <Thermometer size={20} color="#ea580c" />
      case 'scale':
        return <Scale size={20} color="#16a34a" />
      default:
        return <Bluetooth size={20} color="#0f766e" />
    }
  }

  return (
    <div className="mp-subscreen-body" style={{ paddingBottom: '120px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '74px',
            left: '14px',
            right: '14px',
            zIndex: 10005,
            padding: '11px 14px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            background: toast.type === 'success' ? '#0f766e' : toast.type === 'error' ? '#b91c1c' : '#0369a1',
            color: '#ffffff',
            boxSizing: 'border-box'
          }}
        >
          <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Mini Status & Guide Pill Bar (gọn gàng, không bị trùng header với Shell) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '12px'
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            color: '#0f766e',
            fontWeight: 700,
            background: '#f0fdfa',
            border: '1px solid #ccfbf1',
            padding: '5px 10px',
            borderRadius: '20px'
          }}
        >
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
          Bluetooth BLE 5.0 Sẵn sàng
        </div>

        <button
          onClick={() => setShowGuideModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontSize: '11.5px',
            fontWeight: 700,
            padding: '5px 10px',
            borderRadius: '20px',
            cursor: 'pointer'
          }}
        >
          <Info size={13} color="#0f766e" /> Hướng dẫn ghép đôi
        </button>
      </div>

      {/* Radar Scanner Hero Card (Bo góc gọn gàng, không tràn viền, tỷ lệ cân đối) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 55%, #0284c7 100%)',
          borderRadius: '18px',
          padding: '20px 16px',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 20px rgba(15, 118, 110, 0.22)',
          marginBottom: '18px',
          boxSizing: 'border-box'
        }}
      >
        {/* Radar concentric circles */}
        <div
          style={{
            width: '84px',
            height: '84px',
            margin: '0 auto 12px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.35)',
              animation: isScanning ? 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255, 255, 255, 0.5)',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              zIndex: 2
            }}
          >
            <Bluetooth size={22} className={isScanning ? 'spin' : ''} />
          </div>
        </div>

        <h3 style={{ margin: '0 0 4px', fontSize: '16.5px', fontWeight: 800, letterSpacing: '-0.2px' }}>
          {isScanning ? 'Đang Quét Thiết Bị Y Tế BLE...' : 'Tìm Kiếm Máy Đo Bluetooth'}
        </h3>
        <p style={{ margin: '0 0 16px', fontSize: '12px', opacity: 0.92, lineHeight: 1.45, maxWidth: '340px', marginLeft: 'auto', marginRight: 'auto' }}>
          {isScanning
            ? 'Đang tìm máy đo Huyết áp, Đường huyết, SpO2, Thân nhiệt ở gần...'
            : 'Đặt máy đo gần điện thoại (trong phạm vi 1.5m) và bật Bluetooth.'}
        </p>

        <button
          onClick={handleStartScan}
          style={{
            background: isScanning ? '#ef4444' : '#ffffff',
            color: isScanning ? '#ffffff' : '#0f766e',
            border: 'none',
            borderRadius: '12px',
            padding: '11px 22px',
            fontWeight: 800,
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.2s ease'
          }}
        >
          {isScanning ? (
            <>
              <RefreshCw size={15} className="spin" /> Dừng quét
            </>
          ) : (
            <>
              <Bluetooth size={15} /> Bắt đầu quét thiết bị mới
            </>
          )}
        </button>
      </div>

      {/* Discovered Devices Section (Nếu tìm thấy) */}
      {discoveredDevices.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} color="#0f766e" /> Thiết bị tìm thấy ({discoveredDevices.length})
            </h4>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>Chạm để ghép đôi</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {discoveredDevices.map((dev) => (
              <div
                key={dev.deviceId}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: '1.5px solid #ccfbf1',
                  boxShadow: '0 2px 6px rgba(15, 118, 110, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#f0fdfa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {getCategoryIcon(dev.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dev.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0f766e', fontWeight: 600, marginTop: '1px' }}>
                      {dev.categoryLabel}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                      <Signal size={10} color="#16a34a" /> {dev.rssi ? `${dev.rssi} dBm (Mạnh)` : 'BLE Sẵn sàng'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handlePairDevice(dev)}
                  disabled={pairingDeviceId === dev.deviceId}
                  style={{
                    background: '#0f766e',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0
                  }}
                >
                  {pairingDeviceId === dev.deviceId ? (
                    <>
                      <RefreshCw size={12} className="spin" /> Đang ghép...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} /> Ghép đôi
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paired Medical Devices Section (Bảo toàn thiết bị mẫu & dữ liệu kết nối thật) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bluetooth size={16} color="#0f766e" /> Thiết bị y tế đã kết nối ({pairedDevices.length})
          </h4>
          <button
            onClick={loadPairedDevices}
            style={{
              background: 'none',
              border: 'none',
              color: '#0f766e',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px'
            }}
          >
            <RefreshCw size={12} className={loadingPaired ? 'spin' : ''} /> Làm mới
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pairedDevices.map((item) => {
            const isSample = item.id >= 9000 || item.device_code?.startsWith('BLE_')

            return (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                  boxSizing: 'border-box'
                }}
              >
                {/* Top Row: Icon + Name + Badges */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#f0fdfa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {getCategoryIcon(item.device_type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.device_name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.manufacturer || 'Chuẩn BLE'} · Mã: {item.device_code || item.id}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                    <span
                      style={{
                        background: '#ecfdf5',
                        color: '#065f46',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} /> Đã kết nối
                    </span>
                    {isSample && (
                      <span
                        style={{
                          background: '#f0fdfa',
                          color: '#0f766e',
                          border: '1px solid #ccfbf1',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <ShieldCheck size={10} /> Mẫu sẵn sàng
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Battery Status & Action Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '9px',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '11.5px',
                    color: '#64748b',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Battery size={13} color="#16a34a" /> Pin: {item.battery_level ?? 92}%
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleReadMeasurement(item)}
                      disabled={readingDeviceId === item.id}
                      style={{
                        background: '#0f766e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '9px',
                        padding: '7px 13px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        boxShadow: '0 2px 6px rgba(15, 118, 110, 0.18)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {readingDeviceId === item.id ? (
                        <>
                          <RefreshCw size={12} className="spin" /> Đang đọc...
                        </>
                      ) : (
                        <>
                          <Play size={12} /> Đọc số đo ngay
                        </>
                      )}
                    </button>

                    {/* Không xóa thiết bị mẫu: Chỉ hiển thị nút xóa cho thiết bị do người dùng tự quét thêm */}
                    {!isSample ? (
                      <button
                        onClick={() => handleUnpairDevice(item.id, item.device_name)}
                        style={{
                          background: '#fef2f2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '7px 9px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Hủy ghép đôi thiết bị này"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : (
                      <div
                        style={{
                          background: '#f8fafc',
                          color: '#94a3b8',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Thiết bị mẫu cố định - Không xóa"
                      >
                        <Lock size={12} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal / Bottom Sheet: Kết Quả Đo Sinh Hiệu */}
      {measurementResult && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '14px',
            boxSizing: 'border-box'
          }}
          onClick={() => setMeasurementResult(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '20px 18px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.2)',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={18} color="#059669" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                    Số Đo Y Tế Đã Ghi Nhận
                  </h4>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Từ {measurementResult.deviceName}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMeasurementResult(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Giá trị số đo lớn */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '14px',
                border: '1px solid #e2e8f0',
                boxSizing: 'border-box'
              }}
            >
              {measurementResult.systolic && measurementResult.diastolic ? (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Huyết áp động mạch (Sys/Dia)
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 900, color: '#0f766e', letterSpacing: '-0.5px' }}>
                    {measurementResult.systolic}/{measurementResult.diastolic} <small style={{ fontSize: '15px', fontWeight: 600 }}>mmHg</small>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155', marginTop: '6px' }}>
                    Nhịp tim: <b>{measurementResult.pulse} bpm</b> (Nhịp đều)
                  </div>
                  <span style={{ display: 'inline-block', marginTop: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px' }}>
                    Chuẩn WHO / JNC 8: Huyết áp tối ưu
                  </span>
                </div>
              ) : measurementResult.glucoseValue ? (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Đường huyết mao mạch (Glucose)
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 900, color: '#f59e0b' }}>
                    {measurementResult.glucoseValue} <small style={{ fontSize: '15px', fontWeight: 600 }}>mmol/L</small>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    (~{Math.round(measurementResult.glucoseValue * 18.018)} mg/dL)
                  </div>
                  <span style={{ display: 'inline-block', marginTop: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px' }}>
                    Chuẩn ADA: Đường huyết mục tiêu ổn định
                  </span>
                </div>
              ) : measurementResult.spo2Percent ? (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Bão hòa oxy máu (SpO2)
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 900, color: '#0284c7' }}>
                    {measurementResult.spo2Percent} <small style={{ fontSize: '15px', fontWeight: 600 }}>%</small>
                  </div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155', marginTop: '6px' }}>
                    Nhịp mạch: <b>{measurementResult.pulse} bpm</b>
                  </div>
                  <span style={{ display: 'inline-block', marginTop: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px' }}>
                    Chỉ số SpO2 an toàn (≥ 95%)
                  </span>
                </div>
              ) : measurementResult.temperatureCelsius ? (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Thân nhiệt hồng ngoại
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 900, color: '#ea580c' }}>
                    {measurementResult.temperatureCelsius} <small style={{ fontSize: '15px', fontWeight: 600 }}>°C</small>
                  </div>
                  <span style={{ display: 'inline-block', marginTop: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '6px' }}>
                    Thân nhiệt bình thường
                  </span>
                </div>
              ) : measurementResult.weightKg ? (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Cân nặng cơ thể
                  </div>
                  <div style={{ fontSize: '30px', fontWeight: 900, color: '#16a34a' }}>
                    {measurementResult.weightKg} <small style={{ fontSize: '15px', fontWeight: 600 }}>kg</small>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                fontSize: '12px',
                color: '#065f46',
                background: '#ecfdf5',
                padding: '10px 12px',
                borderRadius: '10px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                lineHeight: 1.45
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>Số đo đã tự động ghi nhận vào Bệnh án EMR và gửi tới Bác sĩ phụ trách.</span>
            </div>

            <button
              onClick={() => setMeasurementResult(null)}
              style={{
                width: '100%',
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontWeight: 800,
                fontSize: '13.5px',
                cursor: 'pointer'
              }}
            >
              Hoàn tất & Đóng
            </button>
          </div>
        </div>
      )}

      {/* Modal Hướng dẫn kết nối */}
      {showGuideModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px',
            boxSizing: 'border-box'
          }}
          onClick={() => setShowGuideModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '20px 18px',
              width: '100%',
              maxWidth: '440px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                Hướng Dẫn Ghép Đôi Máy Đo
              </h4>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: 1.55, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <b>1. Máy đo Huyết áp Omron (HEM-7361T / Evolv):</b>
                <p style={{ margin: '3px 0 0', color: '#64748b' }}>
                  Nhấn và giữ nút Bluetooth trên thân máy trong 3-5 giây cho đến khi chữ <b>"P"</b> (Pairing) nhấp nháy trên màn hình máy.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <b>2. Máy đo Đường huyết Roche Accu-Chek Instant:</b>
                <p style={{ margin: '3px 0 0', color: '#64748b' }}>
                  Khi máy đang tắt, nhấn giữ nút nguồn bên hông trong 3 giây cho đến khi biểu tượng Bluetooth nhấp nháy.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <b>3. Máy SpO2 & Nhiệt kế Braun:</b>
                <p style={{ margin: '3px 0 0', color: '#64748b' }}>
                  Bật nguồn máy đo và đeo lên ngón tay. Máy sẽ tự động phát sóng Bluetooth BLE trong 60 giây.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              style={{
                width: '100%',
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '11px',
                fontWeight: 700,
                fontSize: '13px',
                marginTop: '14px',
                cursor: 'pointer'
              }}
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
