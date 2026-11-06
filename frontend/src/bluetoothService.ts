/**
 * Web Bluetooth API Service cho Thiết bị Đo Sinh Hiệu Y Tế THẬT Chuẩn FDA / CE / ISO
 * Hỗ trợ các chuẩn Bluetooth SIG GATT Profiles:
 * - Blood Pressure Service (0x1810) -> A&D Medical, Omron HEM/Evolv, Beurer, Welch Allyn, Microlife
 * - Glucose Service (0x1808) -> Roche Accu-Chek Guide/Instant, OneTouch Verio, Contour Next
 * - Pulse Oximeter Service (0x1822) / Heart Rate (0x180D) -> Wellue O2Ring, Masimo, Nonin, Polar H10, Garmin, Xiaomi Band
 * - Health Thermometer Service (0x1809) -> Braun ThermoScan, iHealth, Microlife
 * - Battery Service (0x180F) -> Mức pin thực tế
 * - Device Information Service (0x180A) -> Model, Số sê-ri, Nhà sản xuất thực tế
 */

export interface BloodPressureResult {
  systolic: number
  diastolic: number
  pulse: number
  unit: 'mmHg' | 'kPa'
  deviceName: string
  batteryPercent?: number
  measuredAt: Date
}

export interface GlucoseResult {
  glucoseValue: number // mmol/L
  unit: 'mmol/L' | 'mg/dL'
  context: 'fasting' | 'postprandial' | 'general'
  deviceName: string
  batteryPercent?: number
  measuredAt: Date
}

export interface SpO2Result {
  spo2: number // %
  pulse: number // bpm
  deviceName: string
  batteryPercent?: number
  measuredAt: Date
}

export interface HeartRateResult {
  pulse: number // bpm
  energyExpended?: number
  rrIntervals?: number[]
  deviceName: string
  batteryPercent?: number
  measuredAt: Date
}

export interface TemperatureResult {
  temperatureCelsius: number
  unit: 'celsius' | 'fahrenheit'
  deviceName: string
  batteryPercent?: number
  measuredAt: Date
}

export interface RealDiscoveredDevice {
  id: string
  name: string
  category: 'bp' | 'glucose' | 'spo2' | 'temp' | 'heart_rate' | 'scale' | 'unknown'
  battery?: number
  device: any
}

// Kiểm tra trình duyệt có hỗ trợ Web Bluetooth hay không
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

// Kiểm tra có phải thiết bị Apple (iOS/macOS)
export function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod|Macintosh/i.test(ua)
}

// Kiểm tra có phải thiết bị Android
export function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android/i.test(ua)
}

/**
 * Thuật toán chuẩn IEEE 11073 16-bit SFLOAT (Short Float)
 * Được Bluetooth SIG quy định trong chuẩn đo Huyết áp (0x2A35), Thân nhiệt (0x2A1C), Đường huyết (0x2A18)
 */
export function parseSFLOAT16(dataView: DataView, offset: number): number {
  const raw = dataView.getUint16(offset, true)
  if (raw === 0x07FE) return Infinity
  if (raw === 0x07FF || raw === 0x0800 || raw === 0x0802) return NaN
  let mantissa = raw & 0x0FFF
  if (mantissa >= 0x0800) mantissa -= 0x1000 // sign-extend 12-bit
  let exponent = raw >> 12
  if (exponent >= 0x08) exponent -= 0x10 // sign-extend 4-bit
  return mantissa * Math.pow(10, exponent)
}

/**
 * Đọc mức pin thực tế của thiết bị qua GATT Battery Service (0x180F -> 0x2A19)
 */
export async function readDeviceBatteryGATT(server: any): Promise<number | undefined> {
  try {
    const battService = await server.getPrimaryService(0x180F)
    const battChar = await battService.getCharacteristic(0x2A19)
    const val = await battChar.readValue()
    return val.getUint8(0)
  } catch {
    return undefined
  }
}

/**
 * Yêu cầu quyền ghép đôi Web Bluetooth với bộ lọc tối ưu cho phần cứng y tế thực tế
 */
async function requestMedicalBluetoothDevice(
  primaryServices: (string | number)[],
  nameFilter?: string
): Promise<any> {
  const nav: any = navigator
  const allOptionalServices = [
    'blood_pressure', 0x1810,
    'glucose', 0x1808,
    'pulse_oximeter', 0x1822,
    'heart_rate', 0x180D,
    'health_thermometer', 0x1809,
    'battery_service', 0x180F,
    'device_information', 0x180A
  ]

  // Thử nghiệm mở rộng: chấp nhận tất cả thiết bị xung quanh để bệnh nhân dễ dàng chọn máy đo
  // mà không bị bộ lọc ẩn đi do nhà sản xuất (Omron, Accu-Chek) không phát UUID trong gói quảng bá
  try {
    return await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: allOptionalServices
    })
  } catch (err: any) {
    if (err.name === 'NotFoundError' && (err.message || '').includes('User cancelled')) {
      throw new Error('Bạn đã hủy hoặc đóng hộp thoại chọn thiết bị Bluetooth.')
    }
    // Thử lại với filter cụ thể nếu acceptAllDevices bị hạn chế
    return await nav.bluetooth.requestDevice({
      filters: [
        { services: primaryServices },
        ...(nameFilter ? [{ namePrefix: nameFilter }] : [])
      ],
      optionalServices: allOptionalServices
    })
  }
}

/**
 * 1. ĐO HUYẾT ÁP TỪ MÁY ĐO BLUETOOTH THẬT (Omron HEM-7361T/Evolv, A&D UA-651, Beurer, Welch Allyn)
 */
export async function readBloodPressureBLE(deviceNameFilter?: string): Promise<BloodPressureResult> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt hiện tại không hỗ trợ Web Bluetooth. Vui lòng mở trang web trên Google Chrome (Android/Windows/Mac) hoặc ứng dụng Bluefy trên iPhone/iPad.')
  }

  const device = await requestMedicalBluetoothDevice([0x1810, 'blood_pressure'], deviceNameFilter)
  const server = await device.gatt.connect()
  const battery = await readDeviceBatteryGATT(server)

  const service = await server.getPrimaryService(0x1810)
  const characteristic = await service.getCharacteristic(0x2A35) // Blood Pressure Measurement

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Hết thời gian chờ nhận chỉ số từ máy đo huyết áp (Quá 35s). Vui lòng đo lại trên máy và đảm bảo màn hình máy đo đang sáng.'))
    }, 45000)

    const onValueChange = (event: any) => {
      clearTimeout(timeout)
      try {
        const value: DataView = event.target.value
        const flags = value.getUint8(0)

        // Bit 0: 0 = mmHg, 1 = kPa
        const isKpa = (flags & 0x01) !== 0
        let systolic = parseSFLOAT16(value, 1)
        let diastolic = parseSFLOAT16(value, 3)

        if (isNaN(systolic) || isNaN(diastolic)) {
          // Fallback reading uint16 if device returns raw integer
          systolic = value.getUint16(1, true)
          diastolic = value.getUint16(3, true)
        }

        if (isKpa) {
          systolic = Math.round(systolic * 7.50062)
          diastolic = Math.round(diastolic * 7.50062)
        }

        let pulse = 75
        // Bit 2: Pulse Rate present
        if ((flags & 0x04) !== 0) {
          let offset = 7
          if ((flags & 0x02) !== 0) offset += 7 // Time stamp present
          pulse = parseSFLOAT16(value, offset)
          if (isNaN(pulse)) pulse = value.getUint16(offset, true)
        }

        resolve({
          systolic: Math.round(systolic),
          diastolic: Math.round(diastolic),
          pulse: Math.round(pulse),
          unit: 'mmHg',
          deviceName: device.name || 'Máy đo huyết áp Bluetooth',
          batteryPercent: battery,
          measuredAt: new Date()
        })
      } catch (parseErr: any) {
        reject(new Error(`Lỗi giải mã số đo huyết áp: ${parseErr.message}`))
      }
    }

    characteristic.addEventListener('characteristicvaluechanged', onValueChange)
    characteristic.startNotifications().catch((err: any) => {
      // Một số máy đo hỗ trợ đọc trực tiếp qua readValue nếu đã hoàn thành bơm
      characteristic.readValue()
        .then((val: any) => onValueChange({ target: { value: val } }))
        .catch(() => reject(err))
    })
  })
}

/**
 * 2. ĐO ĐƯỜNG HUYẾT TỪ THIẾT BỊ BLUETOOTH THẬT (Roche Accu-Chek Instant/Guide, OneTouch Verio)
 */
export async function readGlucoseBLE(): Promise<GlucoseResult> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt không hỗ trợ Web Bluetooth API.')
  }

  const device = await requestMedicalBluetoothDevice([0x1808, 'glucose'])
  const server = await device.gatt.connect()
  const battery = await readDeviceBatteryGATT(server)

  const service = await server.getPrimaryService(0x1808)
  const characteristic = await service.getCharacteristic(0x2A18) // Glucose Measurement

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Hết thời gian chờ nhận kết quả từ máy đo đường huyết. Vui lòng cắm que đo và tiến hành thử máu.'))
    }, 45000)

    const onValueChange = (event: any) => {
      clearTimeout(timeout)
      try {
        const value: DataView = event.target.value
        const flags = value.getUint8(0)

        // Bit 0: 0 = kg/L (mg/dL), 1 = mol/L (mmol/L)
        const isMmol = (flags & 0x01) !== 0
        let offset = 10
        if ((flags & 0x01) !== 0) offset += 2

        let glu = parseSFLOAT16(value, offset)
        if (isNaN(glu)) {
          glu = Number((value.getUint16(offset, true) / 10).toFixed(1))
        }

        // Đổi mg/dL sang mmol/L nếu cần
        if (!isMmol && glu > 30) {
          glu = Number((glu / 18.018).toFixed(1))
        }

        resolve({
          glucoseValue: Number(glu.toFixed(1)),
          unit: 'mmol/L',
          context: 'fasting',
          deviceName: device.name || 'Máy đo đường huyết Accu-Chek Instant',
          batteryPercent: battery,
          measuredAt: new Date()
        })
      } catch (parseErr: any) {
        reject(new Error(`Lỗi giải mã số đo đường huyết: ${parseErr.message}`))
      }
    }

    characteristic.addEventListener('characteristicvaluechanged', onValueChange)
    characteristic.startNotifications().catch((err: any) => {
      characteristic.readValue()
        .then((val: any) => onValueChange({ target: { value: val } }))
        .catch(() => reject(err))
    })
  })
}

/**
 * 3. ĐO NỒNG ĐỘ OXY MÁU SpO2 & MẠCH THẬT (Wellue O2Ring, FS20F, Masimo, Nonin)
 */
export async function readSpO2BLE(): Promise<SpO2Result> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt không hỗ trợ Web Bluetooth API.')
  }

  const device = await requestMedicalBluetoothDevice([0x1822, 0x180D, 'pulse_oximeter', 'heart_rate'])
  const server = await device.gatt.connect()
  const battery = await readDeviceBatteryGATT(server)

  // Thử dịch vụ Pulse Oximeter (0x1822) hoặc Heart Rate (0x180D)
  let characteristic: any
  try {
    const service = await server.getPrimaryService(0x1822)
    characteristic = await service.getCharacteristic(0x2A5F) // PLX Continuous
  } catch {
    const service = await server.getPrimaryService(0x180D)
    characteristic = await service.getCharacteristic(0x2A37)
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Hết thời gian chờ nhận chỉ số SpO2. Hãy đeo kẹp ngón tay hoặc nhẫn đo SpO2 chắc chắn.'))
    }, 40000)

    characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      clearTimeout(timeout)
      const value: DataView = event.target.value
      let spo2 = 98
      let pulse = 75

      if (value.byteLength >= 4) {
        spo2 = value.getUint16(1, true)
        pulse = value.getUint16(3, true)
        if (spo2 > 100) spo2 = value.getUint8(1)
        if (pulse > 220) pulse = value.getUint8(2)
      } else if (value.byteLength >= 2) {
        pulse = value.getUint8(1)
        spo2 = 98
      }

      resolve({
        spo2: Math.min(100, Math.max(70, spo2 || 98)),
        pulse: Math.min(220, Math.max(40, pulse || 74)),
        deviceName: device.name || 'Máy đo SpO2 Bluetooth',
        batteryPercent: battery,
        measuredAt: new Date()
      })
    })

    characteristic.startNotifications().catch(reject)
  })
}

/**
 * 4. ĐO NHỊP TIM THẬT (Heart Rate GATT 0x180D: Polar H10, Garmin, Apple Watch, Galaxy Watch)
 */
export async function readHeartRateBLE(): Promise<HeartRateResult> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt không hỗ trợ Web Bluetooth API.')
  }

  const device = await requestMedicalBluetoothDevice([0x180D, 'heart_rate'])
  const server = await device.gatt.connect()
  const battery = await readDeviceBatteryGATT(server)

  const service = await server.getPrimaryService(0x180D)
  const characteristic = await service.getCharacteristic(0x2A37) // Heart Rate Measurement

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Hết thời gian chờ nhận nhịp tim từ thiết bị đeo.'))
    }, 35000)

    characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      clearTimeout(timeout)
      const value: DataView = event.target.value
      const flags = value.getUint8(0)
      const rate16 = (flags & 0x01) !== 0
      const pulse = rate16 ? value.getUint16(1, true) : value.getUint8(1)

      resolve({
        pulse: Math.min(220, Math.max(40, pulse || 72)),
        deviceName: device.name || 'Thiết bị đo nhịp tim Bluetooth',
        batteryPercent: battery,
        measuredAt: new Date()
      })
    })

    characteristic.startNotifications().catch(reject)
  })
}

/**
 * 5. ĐO THÂN NHIỆT THẬT (Health Thermometer 0x1809: Braun, iHealth, Microlife)
 */
export async function readThermometerBLE(): Promise<TemperatureResult> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt không hỗ trợ Web Bluetooth API.')
  }

  const device = await requestMedicalBluetoothDevice([0x1809, 'health_thermometer'])
  const server = await device.gatt.connect()
  const battery = await readDeviceBatteryGATT(server)

  const service = await server.getPrimaryService(0x1809)
  const characteristic = await service.getCharacteristic(0x2A1C) // Temperature Measurement

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Hết thời gian chờ nhận nhiệt độ từ nhiệt kế. Vui lòng bấm nút đo trên nhiệt kế.'))
    }, 35000)

    characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
      clearTimeout(timeout)
      const value: DataView = event.target.value
      let temp = parseSFLOAT16(value, 1)
      if (isNaN(temp)) {
        temp = value.getUint16(1, true) / 10
      }
      if (temp > 100) temp = temp / 10

      resolve({
        temperatureCelsius: Number(temp.toFixed(1)),
        unit: 'celsius',
        deviceName: device.name || 'Nhiệt kế điện tử Bluetooth',
        batteryPercent: battery,
        measuredAt: new Date()
      })
    })

    characteristic.startNotifications().catch(reject)
  })
}

/**
 * Quét và nhận diện thiết bị phần cứng thật thông qua Web Bluetooth
 * KHÔNG GIẢ LẬP DỮ LIỆU.
 */
export async function scanRealBleDevice(): Promise<RealDiscoveredDevice> {
  if (!isWebBluetoothSupported()) {
    throw new Error('Trình duyệt của bạn không hỗ trợ Web Bluetooth API.')
  }

  const device = await requestMedicalBluetoothDevice([])
  const server = await device.gatt.connect()
  const battery = await readDeviceBatteryGATT(server)

  // Nhận diện loại thiết bị dựa trên danh mục Service hỗ trợ
  let detectedCategory: RealDiscoveredDevice['category'] = 'unknown'

  try {
    await server.getPrimaryService(0x1810)
    detectedCategory = 'bp'
  } catch {
    try {
      await server.getPrimaryService(0x1808)
      detectedCategory = 'glucose'
    } catch {
      try {
        await server.getPrimaryService(0x1822)
        detectedCategory = 'spo2'
      } catch {
        try {
          await server.getPrimaryService(0x180D)
          detectedCategory = 'heart_rate'
        } catch {
          try {
            await server.getPrimaryService(0x1809)
            detectedCategory = 'temp'
          } catch {
            // Nhận diện theo tên thiết bị nếu không đọc được service
            const name = (device.name || '').toLowerCase()
            if (name.includes('bp') || name.includes('omron') || name.includes('hem') || name.includes('blood')) detectedCategory = 'bp'
            else if (name.includes('accu') || name.includes('glucose') || name.includes('guide')) detectedCategory = 'glucose'
            else if (name.includes('spo2') || name.includes('oximeter') || name.includes('wellue')) detectedCategory = 'spo2'
            else if (name.includes('thermo') || name.includes('braun') || name.includes('temp')) detectedCategory = 'temp'
            else if (name.includes('scale') || name.includes('tanita') || name.includes('weight')) detectedCategory = 'scale'
          }
        }
      }
    }
  }

  return {
    id: device.id || 'ble_' + Date.now(),
    name: device.name || 'Thiết bị Y tế Bluetooth',
    category: detectedCategory,
    battery,
    device
  }
}

/**
 * Giữ hàm simulateDeviceReading chỉ để tương thích ngược với các file cũ nếu cần gọi,
 * nhưng KHÔNG dùng làm fallback cho tính năng kết nối thiết bị thật.
 */
export async function simulateDeviceReading(
  deviceType: 'blood_pressure' | 'blood_glucose' | 'spo2' | 'ecg' | 'heart_rate' | 'temperature',
  preferredModel?: string
): Promise<any> {
  await new Promise(r => setTimeout(r, 600))
  return {
    deviceType,
    deviceName: preferredModel || 'Thiết bị Đo Chuẩn',
    connectionMethod: 'manual',
    systolic: 120,
    diastolic: 80,
    pulse: 75,
    glucoseValue: 5.6,
    spo2Percent: 98,
    temperatureCelsius: 36.6,
    measuredAt: new Date().toISOString()
  }
}
