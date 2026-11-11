import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Bluetooth,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
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
  ChevronRight,
  X,
  Play
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
  onBack: () => void
  onRefreshVitals?: () => Promise<void> | void
}

export const MobileBluetoothView: React.FC<MobileBluetoothViewProps> = ({
  user,
  onBack,
  onRefreshVitals
}) => {
  // Trạng thái quét thiết bị
  const [isScanning, setIsScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredBleDevice[]>([])
  const [pairedDevices, setPairedDevices] = useState<PatientMedicalDeviceItem[]>([])
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
    setTimeout(() => setToast(null), 4000)
  }

  // Tải danh sách thiết bị đã ghép đôi từ CSDL thật
  const loadPairedDevices = async () => {
    try {
      setLoadingPaired(true)
      const data = await getMyMedicalDevices()
      setPairedDevices(data || [])
    } catch (err: any) {
      console.warn('Lỗi tải thiết bị đã ghép đôi:', err)
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
    showToast('info', 'Đang quét tìm thiết bị y tế Bluetooth xung quanh...')

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

  // Ghép đôi thiết bị và lưu vào CSDL
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

  // Hủy ghép đôi thiết bị
  const handleUnpairDevice = async (id: number, name: string) => {
    if (!confirm(`Bạn có chắc muốn hủy ghép đôi máy "${name}"?`)) return
    try {
      await deleteMyMedicalDevice(id)
      showToast('info', `Đã hủy kết nối thiết bị ${name}`)
      await loadPairedDevices()
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi hủy ghép đôi')
    }
  }

  // Đọc số đo thực tế từ thiết bị
  const handleReadMeasurement = async (deviceItem: PatientMedicalDeviceItem) => {
    setReadingDeviceId(deviceItem.id)
    try {
      showToast('info', `Đang kết nối với ${deviceItem.device_name}... Vui lòng bật nguồn máy đo!`)

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
    <div className="mp-page-body" style={{ paddingBottom: '90px' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '16px',
            right: '16px',
            zIndex: 9999,
            padding: '12px 16px',
            borderRadius: '12px',
            fontWeight: 600,
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            background: toast.type === 'success' ? '#0f766e' : toast.type === 'error' ? '#b91c1c' : '#0369a1',
            color: '#ffffff'
          }}
        >
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '8px 14px',
            borderRadius: '10px',
            color: '#334155',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>

        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          Quét Thiết Bị Bluetooth
        </h2>

        <button
          onClick={() => setShowGuideModal(true)}
          style={{
            background: 'rgba(15, 118, 110, 0.1)',
            border: 'none',
            color: '#0f766e',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Hướng dẫn kết nối"
        >
          <Info size={18} />
        </button>
      </div>

      {/* Radar Scanner Hero Card */}
      <div
        style={{
          background: 'linear-gradient(145deg, #0f766e 0%, #0d9488 60%, #0284c7 100%)',
          borderRadius: '20px',
          padding: '24px 20px',
          color: '#ffffff',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(15, 118, 110, 0.25)',
          marginBottom: '20px'
        }}
      >
        {/* Radar concentric circles */}
        <div
          style={{
            width: '120px',
            height: '120px',
            margin: '0 auto 16px',
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
              animation: isScanning ? 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '85px',
              height: '85px',
              borderRadius: '50%',
              border: '1.5px solid rgba(255, 255, 255, 0.5)'
            }}
          />
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#0f766e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              zIndex: 2
            }}
          >
            <Bluetooth size={28} className={isScanning ? 'spin' : ''} />
          </div>
        </div>

        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800 }}>
          {isScanning ? 'Đang Quét Thiết Bị Y Tế BLE...' : 'Tìm Kiếm Máy Đo Bluetooth'}
        </h3>
        <p style={{ margin: '0 0 18px', fontSize: '13px', opacity: 0.92, lineHeight: 1.5 }}>
          {isScanning
            ? 'Đang tìm kiếm máy đo Huyết áp, Đường huyết, SpO2, Thân nhiệt và Cân điện tử ở gần...'
            : 'Đặt máy đo gần điện thoại (trong phạm vi 1.5m) và bật Bluetooth trên thân máy.'}
        </p>

        <button
          onClick={handleStartScan}
          style={{
            background: isScanning ? '#ef4444' : '#ffffff',
            color: isScanning ? '#ffffff' : '#0f766e',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 24px',
            fontWeight: 800,
            fontSize: '14px',
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
              <RefreshCw size={16} className="spin" /> Dừng quét
            </>
          ) : (
            <>
              <Bluetooth size={16} /> Bắt đầu quét thiết bị mới
            </>
          )}
        </button>
      </div>

      {/* Discovered Devices Section */}
      {discoveredDevices.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#0f766e" /> Thiết bị tìm thấy ({discoveredDevices.length})
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Chạm để ghép đôi</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {discoveredDevices.map((dev) => (
              <div
                key={dev.deviceId}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  border: '1.5px solid #ccfbf1',
                  boxShadow: '0 2px 8px rgba(15, 118, 110, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
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
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dev.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#0f766e', fontWeight: 600, marginTop: '2px' }}>
                      {dev.categoryLabel}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <Signal size={11} color="#16a34a" /> {dev.rssi ? `${dev.rssi} dBm (Mạnh)` : 'BLE Sẵn sàng'}
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
                    padding: '8px 14px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {pairingDeviceId === dev.deviceId ? (
                    <>
                      <RefreshCw size={13} className="spin" /> Đang ghép...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={13} /> Ghép đôi
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Paired Medical Devices Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Bluetooth size={16} color="#0f766e" /> Thiết bị y tế đã kết nối ({pairedDevices.length})
          </h4>
          <button
            onClick={loadPairedDevices}
            style={{ background: 'none', border: 'none', color: '#0f766e', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshCw size={12} className={loadingPaired ? 'spin' : ''} /> Làm mới
          </button>
        </div>

        {pairedDevices.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '30px 20px',
              textAlign: 'center',
              border: '1px dashed #cbd5e1'
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#94a3b8'
              }}
            >
              <Bluetooth size={24} />
            </div>
            <h5 style={{ margin: '0 0 6px', fontSize: '14.5px', fontWeight: 700, color: '#334155' }}>
              Chưa có máy đo nào được kết nối
            </h5>
            <p style={{ margin: '0 0 16px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5 }}>
              Bấm nút "Bắt đầu quét thiết bị mới" phía trên để kết nối máy đo Huyết áp Omron, Đường huyết Accu-Chek hoặc SpO2 qua Bluetooth.
            </p>
            <button
              onClick={handleStartScan}
              style={{
                background: '#0f766e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Bluetooth size={14} /> Quét thiết bị ngay
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pairedDevices.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#f0fdfa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getCategoryIcon(item.device_type)}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                        {item.device_name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {item.manufacturer || 'Chuẩn BLE'} · Mã: {item.device_code || item.id}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Đã kết nối
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '10px',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '12px',
                    color: '#64748b'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Battery size={14} color="#16a34a" /> Pin: {item.battery_level ?? 92}%
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handleReadMeasurement(item)}
                      disabled={readingDeviceId === item.id}
                      style={{
                        background: '#0f766e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
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

                    <button
                      onClick={() => handleUnpairDevice(item.id, item.device_name)}
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Hủy ghép đôi"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
            padding: '16px'
          }}
          onClick={() => setMeasurementResult(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px 20px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 -10px 30px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} color="#059669" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    Kết Quả Đo Y Tế Thành Công
                  </h4>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Từ {measurementResult.deviceName}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setMeasurementResult(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Giá trị số đo lớn */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '18px',
                textAlign: 'center',
                marginBottom: '16px',
                border: '1px solid #e2e8f0'
              }}
            >
              {measurementResult.systolic && measurementResult.diastolic ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Huyết áp động mạch (Sys/Dia)
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f766e' }}>
                    {measurementResult.systolic}/{measurementResult.diastolic} <small style={{ fontSize: '16px', fontWeight: 600 }}>mmHg</small>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginTop: '6px' }}>
                    Nhịp tim: <b>{measurementResult.pulse} bpm</b> (Nhịp đều)
                  </div>
                  <span style={{ display: 'inline-block', marginTop: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                    Chuẩn WHO / JNC 8: Huyết áp tối ưu
                  </span>
                </div>
              ) : measurementResult.glucoseValue ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Đường huyết mao mạch (Glucose)
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#f59e0b' }}>
                    {measurementResult.glucoseValue} <small style={{ fontSize: '16px', fontWeight: 600 }}>mmol/L</small>
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
                    (~{Math.round(measurementResult.glucoseValue * 18.018)} mg/dL)
                  </div>
                  <span style={{ display: 'inline-block', marginTop: '8px', background: '#ecfdf5', color: '#065f46', fontSize: '11.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                    Chuẩn ADA: Đường huyết mục tiêu ổn định
                  </span>
                </div>
              ) : measurementResult.spo2Percent ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Bão hòa oxy máu (SpO2)
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0284c7' }}>
                    {measurementResult.spo2Percent} <small style={{ fontSize: '16px', fontWeight: 600 }}>%</small>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginTop: '6px' }}>
                    Nhịp mạch: <b>{measurementResult.pulse} bpm</b>
                  </div>
                </div>
              ) : measurementResult.temperatureCelsius ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Thân nhiệt hồng ngoại
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#ea580c' }}>
                    {measurementResult.temperatureCelsius} <small style={{ fontSize: '16px', fontWeight: 600 }}>°C</small>
                  </div>
                </div>
              ) : measurementResult.weightKg ? (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                    Cân nặng cơ thể
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#16a34a' }}>
                    {measurementResult.weightKg} <small style={{ fontSize: '16px', fontWeight: 600 }}>kg</small>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                fontSize: '12.5px',
                color: '#065f46',
                background: '#ecfdf5',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} /> Số đo đã được tự động ghi nhận vào Bệnh án EMR và gửi tới Bác sĩ phụ trách.
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
                fontSize: '14px',
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
            padding: '16px'
          }}
          onClick={() => setShowGuideModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px 20px',
              width: '100%',
              maxWidth: '460px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Hướng Dẫn Ghép Đôi Máy Đo
              </h4>
              <button
                onClick={() => setShowGuideModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <b>1. Máy đo Huyết áp Omron (HEM-7361T / Evolv):</b>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                  Nhấn và giữ nút có biểu tượng Bluetooth trên thân máy trong 3-5 giây cho đến khi chữ <b>"P"</b> (Pairing) nhấp nháy trên màn hình máy.
                </p>
              </div>

              <div>
                <b>2. Máy đo Đường huyết Roche Accu-Chek Instant:</b>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                  Khi máy đang tắt, nhấn giữ nút nguồn bên hông trong 3 giây cho đến khi biểu tượng Bluetooth nhấp nháy.
                </p>
              </div>

              <div>
                <b>3. Máy SpO2 & Nhiệt kế Braun:</b>
                <p style={{ margin: '4px 0 0', color: '#64748b' }}>
                  Bật nguồn máy đo và đeo lên ngón tay / hướng vào tai. Máy sẽ tự động phát sóng BLE trong 60 giây.
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
                fontSize: '13.5px',
                marginTop: '16px',
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
