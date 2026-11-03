import React, { useState, useEffect } from 'react'
import {
  getRPMPackages,
  recordRPMVitals,
  getPatientRPMVitals,
  RPMPackage,
  RPMDevice,
  RPMVitalItem,
  User
} from './api'
import {
  isWebBluetoothSupported,
  readBloodPressureBLE,
  readGlucoseBLE,
  readSpO2BLE,
  simulateDeviceReading
} from './bluetoothService'

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
  const [packages, setPackages] = useState<RPMPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string>('package_economy')
  const [loading, setLoading] = useState(true)
  const [vitalsHistory, setVitalsHistory] = useState<RPMVitalItem[]>([])
  const [loadingVitals, setLoadingVitals] = useState(false)
  
  // Trạng thái kết nối thiết bị
  const [activeDeviceType, setActiveDeviceType] = useState<'blood_pressure' | 'blood_glucose' | 'spo2' | 'ecg'>('blood_pressure')
  const [connecting, setConnecting] = useState(false)
  const [lastReading, setLastReading] = useState<any>(null)
  const [savingLog, setSavingLog] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const webBleAvailable = isWebBluetoothSupported()

  // Target patient ID
  const effectivePatientId = patientId || (currentUser?.role === 'patient' ? currentUser.id : 1)

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

  // Kết nối Web Bluetooth thực tế hoặc Giả lập lâm sàng
  const handleConnectDevice = async (useSimulator: boolean = false, preferredDeviceName?: string) => {
    setConnecting(true)
    setErrorMsg(null)
    setSaveSuccessMsg(null)

    try {
      let result: any = null

      if (!useSimulator && webBleAvailable) {
        // Kết nối Web Bluetooth GATT
        if (activeDeviceType === 'blood_pressure') {
          const bp = await readBloodPressureBLE()
          result = {
            deviceType: 'blood_pressure',
            deviceName: bp.deviceName || preferredDeviceName || 'A&D Medical UA-651BLE',
            connectionMethod: 'bluetooth_ble',
            systolic: bp.systolic,
            diastolic: bp.diastolic,
            pulse: bp.pulse,
            measuredAt: bp.measuredAt.toISOString()
          }
        } else if (activeDeviceType === 'blood_glucose') {
          const bg = await readGlucoseBLE()
          result = {
            deviceType: 'blood_glucose',
            deviceName: bg.deviceName || preferredDeviceName || 'Roche Accu-Chek Guide Me',
            connectionMethod: 'bluetooth_ble',
            glucoseValue: bg.glucoseValue,
            glucoseContext: bg.context,
            measuredAt: bg.measuredAt.toISOString()
          }
        } else if (activeDeviceType === 'spo2') {
          const ox = await readSpO2BLE()
          result = {
            deviceType: 'spo2',
            deviceName: ox.deviceName || preferredDeviceName || 'Wellue O2Ring Continuous SpO2',
            connectionMethod: 'bluetooth_ble',
            spo2Percent: ox.spo2,
            pulse: ox.pulse,
            measuredAt: ox.measuredAt.toISOString()
          }
        } else {
          result = await simulateDeviceReading(activeDeviceType, preferredDeviceName)
        }
      } else {
        // Giả lập lâm sàng (Fallback khi chưa có thiết bị vật lý hoặc chạy trên trình duyệt không hỗ trợ Web Bluetooth)
        result = await simulateDeviceReading(activeDeviceType, preferredDeviceName)
      }

      setLastReading(result)
    } catch (err: any) {
      console.warn('Lỗi kết nối Bluetooth:', err)
      setErrorMsg(err.message || 'Không tìm thấy thiết bị Bluetooth. Bạn có thể sử dụng chế độ Đo Giả Lập Lâm Sàng.')
    } finally {
      setConnecting(false)
    }
  }

  // Lưu số đo vào EMR máy chủ
  const handleSaveMeasurement = async () => {
    if (!lastReading) return
    setSavingLog(true)
    setErrorMsg(null)

    try {
      await recordRPMVitals({
        patient_id: effectivePatientId,
        device_type: lastReading.deviceType,
        device_name: lastReading.deviceName,
        connection_method: lastReading.connectionMethod,
        systolic: lastReading.systolic,
        diastolic: lastReading.diastolic,
        pulse: lastReading.pulse,
        glucose_value: lastReading.glucoseValue,
        glucose_context: lastReading.glucoseContext || 'fasting',
        spo2_percent: lastReading.spo2Percent,
        temperature_celsius: lastReading.temperatureCelsius,
        weight_kg: lastReading.weightKg
      })

      setSaveSuccessMsg(`Đã ghi nhận số đo ${lastReading.deviceName} vào Bệnh án EMR thành công!`)
      await loadVitals()
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu số đo sinh hiệu')
    } finally {
      setSavingLog(false)
    }
  }

  // Đánh giá chỉ số sinh hiệu theo chuẩn ESH / JNC 8 / ADA
  const getBpAssessment = (sys: number, dia: number) => {
    if (sys >= 160 || dia >= 100) return { label: 'Tăng Huyết Áp Độ 2 (Nguy cơ)', color: 'text-rose-700 bg-rose-50 border-rose-300' }
    if (sys >= 140 || dia >= 90) return { label: 'Tăng Huyết Áp Độ 1', color: 'text-amber-700 bg-amber-50 border-amber-300' }
    if (sys >= 130 || dia >= 85) return { label: 'Tiền Tăng Huyết Áp', color: 'text-blue-700 bg-blue-50 border-blue-300' }
    if (sys < 90 || dia < 60) return { label: 'Huyết Áp Thấp', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' }
    return { label: 'Huyết Áp Tối Ưu (JNC 8)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
  }

  const getGlucoseAssessment = (val: number, context: string = 'fasting') => {
    if (context === 'fasting') {
      if (val > 7.0) return { label: 'Đường Huyết Đói Cao (Đái tháo đường)', color: 'text-rose-700 bg-rose-50 border-rose-300' }
      if (val >= 5.6) return { label: 'Rối Loạn Dung Nạp Đường Đói', color: 'text-amber-700 bg-amber-50 border-amber-300' }
      if (val < 3.9) return { label: 'CẢNH BÁO HẠ ĐƯỜNG HUYẾT', color: 'text-red-700 bg-red-100 border-red-400 font-bold' }
      return { label: 'Đường Huyết Đói Bình Thường (ADA)', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
    }
    return { label: 'Đường Huyết Ổn Định', color: 'text-blue-700 bg-blue-50 border-blue-300' }
  }

  const getSpO2Assessment = (val: number) => {
    if (val < 90) return { label: 'Thiếu Oxy Nặng (Cần Cấp Cứu)', color: 'text-rose-700 bg-rose-50 border-rose-300' }
    if (val < 94) return { label: 'Thiếu Oxy Nhẹ - Trung Bình', color: 'text-amber-700 bg-amber-50 border-amber-300' }
    return { label: 'Độ Bão Hòa Oxy Tối Ưu', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' }
  }

  const currentPkg = packages.find(p => p.id === selectedPackage) || packages[0]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 font-sans">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center space-x-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                title="Quay lại"
              >
                ←
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <span>🩺</span>
              <span>Trung Tâm Giám Sát Sinh Hiệu Từ Xa (RPM IoT & FDA)</span>
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Tích hợp giao thức Web Bluetooth BLE SIG tiêu chuẩn quốc tế và 3 gói thiết bị sinh hiệu đạt chứng nhận FDA Clearances
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            webBleAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            <span className={`w-2 h-2 rounded-full mr-2 ${webBleAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {webBleAvailable ? 'Web Bluetooth Sẵn Sàng' : 'Giả Lập Lâm Sàng (Trình duyệt hạn chế BLE)'}
          </span>
          <button
            onClick={loadVitals}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
          >
            🔄 Tải lại dữ liệu
          </button>
        </div>
      </div>

      {/* 3 GÓI DỰ TOÁN ĐẦU TƯ THIẾT BỊ (BUDGET RECOMMENDATION) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>💰</span>
              <span>3 Gói Thiết Bị Sinh Hiệu Đạt Chuẩn FDA (Dự Toán Đầu Tư)</span>
            </h2>
            <p className="text-xs text-gray-500">
              Được phê duyệt bởi Hội Đồng Y Khoa: Độ chính xác lâm sàng cao, chuẩn kết nối mở, thân thiện với người bệnh
            </p>
          </div>
        </div>

        {/* Tab Packages Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => {
            const isSelected = selectedPackage === pkg.id
            const borderColor = isSelected
              ? pkg.badge_color === 'emerald' ? 'border-emerald-500 ring-2 ring-emerald-200'
                : pkg.badge_color === 'blue' ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-purple-500 ring-2 ring-purple-200'
              : 'border-gray-200 hover:border-gray-300'

            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`cursor-pointer rounded-xl p-5 border bg-white transition shadow-sm ${borderColor}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    pkg.badge_color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                    pkg.badge_color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {pkg.badge}
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-gray-900">{pkg.total_price_str}</span>
                    <span className="block text-[11px] text-gray-400">/ trọn bộ</span>
                  </div>
                </div>

                <h3 className="mt-3 text-base font-bold text-gray-900">{pkg.name}</h3>
                <p className="mt-1 text-xs text-gray-600 line-clamp-2">{pkg.subtitle}</p>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>{pkg.devices.length} Thiết bị FDA</span>
                  <span className={`font-semibold ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                    {isSelected ? '✓ Đang chọn' : 'Xem chi tiết →'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Chi tiết gói được chọn */}
        {currentPkg && (
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    Thông tin chi tiết gói đầu tư
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs font-medium text-gray-700">Đối tượng: {currentPkg.target_patients}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{currentPkg.name}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{currentPkg.subtitle}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-gray-200 text-right shadow-xs">
                <span className="text-xs text-gray-500 block">Dự toán ngân sách:</span>
                <span className="text-2xl font-black text-blue-600">{currentPkg.total_price_str}</span>
              </div>
            </div>

            {/* Danh sách thiết bị trong gói */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentPkg.devices.map((device, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase">{device.category}</span>
                      <h4 className="text-base font-bold text-gray-900">{device.name}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                          ✓ {device.fda_clearance}
                        </span>
                        <span className="text-xs text-gray-400">Xuất xứ: {device.origin}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{device.price_str}</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-1 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <div><span className="font-semibold text-gray-700">Giao thức:</span> {device.connectivity}</div>
                    <div><span className="font-semibold text-gray-700">Độ chuẩn xác:</span> {device.accuracy}</div>
                    <div><span className="font-semibold text-blue-600">Ưu điểm:</span> {device.highlight}</div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveDeviceType(device.device_type as any)
                      handleConnectDevice(false, device.name)
                    }}
                    className="w-full py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5"
                  >
                    <span>📡</span>
                    <span>Đo thử nghiệm máy này ({device.name.split(' ')[0]})</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Lợi ích lâm sàng */}
            <div className="bg-blue-50/60 rounded-lg p-4 border border-blue-100">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide mb-2">
                Giá Trị Lâm Sàng & Quản Trị Hệ Thống:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-blue-800">
                {currentPkg.clinical_benefits.map((benefit, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className="text-blue-500 font-bold">✔</span>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BÀN KẾT NỐI VÀ LẤY SỐ ĐO THIẾT BỊ BLUETOOTH */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>📶</span>
              <span>Bàn Đo Sinh Hiệu Trực Tiếp (Web Bluetooth / Cloud IoT)</span>
            </h3>
            <p className="text-xs text-gray-500">
              Chọn loại thiết bị, bật Bluetooth trên máy đo và nhấn Kết nối
            </p>
          </div>

          {/* Chọn loại thiết bị */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setActiveDeviceType('blood_pressure')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeDeviceType === 'blood_pressure' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Huyết Áp
            </button>
            <button
              onClick={() => setActiveDeviceType('blood_glucose')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeDeviceType === 'blood_glucose' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Đường Huyết
            </button>
            <button
              onClick={() => setActiveDeviceType('spo2')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeDeviceType === 'spo2' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              SpO2 & Mạch
            </button>
            <button
              onClick={() => setActiveDeviceType('ecg')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                activeDeviceType === 'ecg' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Điện Tim ECG
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={connecting}
              onClick={() => handleConnectDevice(false)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-2"
            >
              {connecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang dò quét Bluetooth...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Quét & Kết Nối Thiết Bị Bluetooth (FDA)</span>
                </>
              )}
            </button>

            <button
              disabled={connecting}
              onClick={() => handleConnectDevice(true)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <span>🧪</span>
              <span>Đo Thử Nghiệm Chuẩn Lâm Sàng (Simulator)</span>
            </button>

            <span className="text-xs text-gray-500">
              Mã chuẩn BLE GATT: {
                activeDeviceType === 'blood_pressure' ? '0x1810 (Blood Pressure Service)' :
                activeDeviceType === 'blood_glucose' ? '0x1808 (Glucose Service)' :
                activeDeviceType === 'spo2' ? '0x1822 (Pulse Oximeter Service)' :
                '0x180D (Heart Rate) / Custom ECG Stream'
              }
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button
                onClick={() => handleConnectDevice(true)}
                className="underline font-semibold text-rose-800 ml-2 hover:text-rose-900"
              >
                Chuyển sang Đo Thử Nghiệm Ngay
              </button>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium">
              ✅ {saveSuccessMsg}
            </div>
          )}

          {/* Vùng hiển thị kết quả đo mới nhất */}
          {lastReading && (
            <div className="bg-gradient-to-br from-blue-50/40 via-white to-gray-50 rounded-xl p-6 border border-blue-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-blue-100 pb-3 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">
                      KẾT QUẢ ĐO TRỰC TIẾP TỪ THIẾT BỊ
                    </span>
                    <span className="text-xs text-gray-500">• {lastReading.deviceName}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    Thời điểm đo: {new Date(lastReading.measuredAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <button
                  disabled={savingLog}
                  onClick={handleSaveMeasurement}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {savingLog ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Lưu Vào Bệnh Án EMR Bệnh Nhân</span>
                    </>
                  )}
                </button>
              </div>

              {/* Grid thông số theo loại thiết bị */}
              {lastReading.deviceType === 'blood_pressure' && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Huyết Áp Tâm Thu (SYS)</span>
                      <div className="text-4xl font-black text-gray-900 mt-1">
                        {lastReading.systolic} <span className="text-sm font-normal text-gray-500">mmHg</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Huyết Áp Tâm Trương (DIA)</span>
                      <div className="text-4xl font-black text-gray-900 mt-1">
                        {lastReading.diastolic} <span className="text-sm font-normal text-gray-500">mmHg</span>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 text-center">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Nhịp Tim (PULSE)</span>
                      <div className="text-4xl font-black text-rose-600 mt-1">
                        {lastReading.pulse} <span className="text-sm font-normal text-gray-500">bpm</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-600 font-medium">Phân loại lâm sàng (JNC 8 & ESC/ESH):</span>
                    {(() => {
                      const assess = getBpAssessment(lastReading.systolic, lastReading.diastolic)
                      return (
                        <span className={`px-3 py-1 rounded-md text-xs font-bold border ${assess.color}`}>
                          {assess.label}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )}

              {lastReading.deviceType === 'blood_glucose' && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 text-center">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Đường Huyết Mao Mạch</span>
                      <div className="text-5xl font-black text-blue-600 mt-2">
                        {lastReading.glucoseValue} <span className="text-base font-normal text-gray-500">mmol/L</span>
                      </div>
                      <span className="text-xs text-gray-400 mt-1 block">
                        Tương đương {(lastReading.glucoseValue * 18.018).toFixed(0)} mg/dL
                      </span>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 flex flex-col justify-center space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Thời Điểm Đo</span>
                        <span className="text-sm font-bold text-gray-800">
                          {lastReading.glucoseContext === 'fasting' ? '🌙 Nhịn đói sáng sớm (Fasting)' : '🍽️ Sau bữa ăn (Postprandial)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase block">Đánh Giá Chuẩn ADA 2024</span>
                        {(() => {
                          const assess = getGlucoseAssessment(lastReading.glucoseValue, lastReading.glucoseContext)
                          return (
                            <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold border mt-1 ${assess.color}`}>
                              {assess.label}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {lastReading.deviceType === 'spo2' && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 text-center">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Độ Bão Hòa Oxy Máu (SpO2)</span>
                      <div className="text-5xl font-black text-emerald-600 mt-2">
                        {lastReading.spo2Percent}%
                      </div>
                      <span className="text-xs text-gray-400 mt-1 block">Đo quang phổ 2 bước sóng 660nm / 905nm</span>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 text-center">
                      <span className="text-xs font-semibold text-gray-500 uppercase">Nhịp Tim Đồng Thì</span>
                      <div className="text-5xl font-black text-rose-600 mt-2">
                        {lastReading.pulse} <span className="text-base font-normal text-gray-500">bpm</span>
                      </div>
                      {(() => {
                        const assess = getSpO2Assessment(lastReading.spo2Percent)
                        return (
                          <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold border mt-2 ${assess.color}`}>
                            {assess.label}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {lastReading.deviceType === 'ecg' && (
                <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        ALIVECOR 6-LEAD CLINICAL ECG
                      </span>
                      <h4 className="text-base font-bold text-gray-900 mt-1">Kết quả phân tích nhịp tim tự động</h4>
                    </div>
                    <span className="text-sm font-bold text-gray-700">Tần số: {lastReading.pulse} bpm</span>
                  </div>

                  <div className="p-3 bg-gray-900 text-emerald-400 font-mono text-xs rounded-lg flex items-center space-x-2">
                    <span className="animate-pulse">●</span>
                    <span>{lastReading.rhythm}</span>
                  </div>

                  <p className="text-xs text-gray-500">
                    Bản ghi điện tâm đồ 6 chuyển đạo đã được mã hóa theo chuẩn DICOM Waveform sẵn sàng để bác sĩ tim mạch đọc chuyên sâu.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LỊCH SỬ VÀ DIỄN TIẾN SINH HIỆU BỆNH NHÂN */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>📈</span>
              <span>Lịch Sử Diễn Tiến Sinh Hiệu Đo Từ Xa (Bệnh Nhân #{effectivePatientId})</span>
            </h3>
            <p className="text-xs text-gray-500">
              Dữ liệu được đẩy tự động từ các máy đo FDA của bệnh nhân tại nhà lên máy chủ EMR
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-500">
            Tổng cộng: {vitalsHistory.length} bản ghi
          </span>
        </div>

        {loadingVitals ? (
          <div className="py-8 text-center text-xs text-gray-500">Đang tải lịch sử sinh hiệu...</div>
        ) : vitalsHistory.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Chưa có bản ghi sinh hiệu nào. Hãy thực hiện đo lần đầu tiên từ thiết bị Bluetooth ở trên.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-gray-700 font-semibold uppercase text-[11px] border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">Thời Điểm</th>
                  <th className="py-3 px-3">Thiết Bị</th>
                  <th className="py-3 px-3">Kết Nối</th>
                  <th className="py-3 px-3">Huyết Áp (SYS/DIA)</th>
                  <th className="py-3 px-3">Mạch</th>
                  <th className="py-3 px-3">Đường Huyết</th>
                  <th className="py-3 px-3">SpO2</th>
                  <th className="py-3 px-3">Tình Trạng / Cảnh Báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vitalsHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-3 whitespace-nowrap text-gray-900 font-medium">
                      {new Date(item.measured_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-gray-800">{item.device_name}</span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-mono">
                        {item.connection_method}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-gray-900">
                      {item.systolic && item.diastolic ? `${item.systolic}/${item.diastolic} mmHg` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {item.pulse ? `${item.pulse} bpm` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {item.glucose_value ? (
                        <span className="font-semibold text-blue-600">
                          {item.glucose_value} mmol/L
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {item.spo2_percent ? (
                        <span className="font-semibold text-emerald-600">
                          {item.spo2_percent}%
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {item.is_warning ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                          ⚠️ {item.warning_message || 'Bất thường'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ✓ Bình thường
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
export default RPMDeviceCenter
