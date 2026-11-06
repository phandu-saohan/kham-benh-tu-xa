/**
 * Apple Health (HealthKit) & Android Health Connect Data Integration Service
 * Xử lý dữ liệu lâm sàng THẬT trích xuất từ Apple Health (iPhone/Apple Watch)
 * và Android Health Connect / Google Fit (Samsung Galaxy Watch, WearOS, Mi Band)
 */

import { recordRPMVitals } from './api'

export interface ParsedHealthRecord {
  type: 'blood_pressure' | 'heart_rate' | 'spo2' | 'glucose' | 'temperature' | 'weight' | 'steps'
  title: string
  value: string
  numericValue: number
  unit: string
  systolic?: number
  diastolic?: number
  pulse?: number
  measuredAt: Date
  sourceName: string
  deviceDetails?: string
}

export interface HealthImportSummary {
  totalRecords: number
  latestBloodPressure?: ParsedHealthRecord
  latestHeartRate?: ParsedHealthRecord
  latestSpO2?: ParsedHealthRecord
  latestGlucose?: ParsedHealthRecord
  latestTemperature?: ParsedHealthRecord
  latestWeight?: ParsedHealthRecord
  records: ParsedHealthRecord[]
}

/**
 * Phân tích dữ liệu xuất thật từ Apple Health (export.xml hoặc trích đoạn XML HealthKit)
 */
export function parseAppleHealthXml(xmlContent: string): HealthImportSummary {
  const records: ParsedHealthRecord[] = []
  
  // Trích xuất các bản ghi <Record type="..." value="..." .../>
  const recordRegex = /<Record\s+([^>]+)>/gi
  let match: RegExpExecArray | null

  while ((match = recordRegex.exec(xmlContent)) !== null) {
    const attrString = match[1]
    const getAttr = (name: string): string => {
      const m = new RegExp(`${name}="([^"]*)"`, 'i').exec(attrString)
      return m ? m[1] : ''
    }

    const type = getAttr('type')
    const valueStr = getAttr('value')
    const unit = getAttr('unit')
    const dateStr = getAttr('startDate') || getAttr('creationDate')
    const sourceName = getAttr('sourceName') || 'Apple Health (iOS)'
    const deviceDetails = getAttr('device') || ''

    if (!type || !valueStr) continue

    const val = parseFloat(valueStr)
    if (isNaN(val)) continue

    const measuredAt = dateStr ? new Date(dateStr) : new Date()

    if (type.includes('BloodPressureSystolic')) {
      records.push({
        type: 'blood_pressure',
        title: 'Huyết áp tâm thu (Apple Health)',
        value: `${Math.round(val)} mmHg`,
        numericValue: Math.round(val),
        systolic: Math.round(val),
        unit: 'mmHg',
        measuredAt,
        sourceName,
        deviceDetails
      })
    } else if (type.includes('BloodPressureDiastolic')) {
      records.push({
        type: 'blood_pressure',
        title: 'Huyết áp tâm trương (Apple Health)',
        value: `${Math.round(val)} mmHg`,
        numericValue: Math.round(val),
        diastolic: Math.round(val),
        unit: 'mmHg',
        measuredAt,
        sourceName,
        deviceDetails
      })
    } else if (type.includes('HeartRate')) {
      records.push({
        type: 'heart_rate',
        title: 'Nhịp tim (Apple Watch)',
        value: `${Math.round(val)} bpm`,
        numericValue: Math.round(val),
        pulse: Math.round(val),
        unit: 'bpm',
        measuredAt,
        sourceName,
        deviceDetails
      })
    } else if (type.includes('OxygenSaturation')) {
      // Apple Health thường lưu SpO2 dưới dạng tỷ lệ 0.98 thay vì 98%
      const spo2Val = val <= 1 ? Math.round(val * 100) : Math.round(val)
      records.push({
        type: 'spo2',
        title: 'Nồng độ Oxy SpO2 (Apple Watch)',
        value: `${spo2Val}%`,
        numericValue: spo2Val,
        unit: '%',
        measuredAt,
        sourceName,
        deviceDetails
      })
    } else if (type.includes('BloodGlucose')) {
      // Apple Health lưu mmol/L hoặc mg/dL
      let glu = val
      let gluUnit = unit || 'mmol/L'
      if (unit === 'mg/dL' || val > 30) {
        glu = Number((val / 18.018).toFixed(1))
        gluUnit = 'mmol/L'
      }
      records.push({
        type: 'glucose',
        title: 'Đường huyết (Apple Health)',
        value: `${glu} mmol/L`,
        numericValue: glu,
        unit: gluUnit,
        measuredAt,
        sourceName,
        deviceDetails
      })
    } else if (type.includes('BodyTemperature')) {
      let temp = val
      if (val > 80) { // Fahrenheit -> Celsius
        temp = Number(((val - 32) * 5 / 9).toFixed(1))
      }
      records.push({
        type: 'temperature',
        title: 'Thân nhiệt (Apple Health)',
        value: `${temp} °C`,
        numericValue: temp,
        unit: '°C',
        measuredAt,
        sourceName,
        deviceDetails
      })
    } else if (type.includes('BodyMass')) {
      records.push({
        type: 'weight',
        title: 'Cân nặng (Apple Health)',
        value: `${val.toFixed(1)} kg`,
        numericValue: Number(val.toFixed(1)),
        unit: 'kg',
        measuredAt,
        sourceName,
        deviceDetails
      })
    }
  }

  // Sắp xếp giảm dần theo thời gian đo (mới nhất lên đầu)
  records.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())

  // Ghép cặp Systolic & Diastolic gần nhau thành 1 bộ huyết áp hoàn chỉnh
  const sysList = records.filter(r => r.systolic !== undefined)
  const diaList = records.filter(r => r.diastolic !== undefined)
  let latestBp: ParsedHealthRecord | undefined

  if (sysList.length > 0 && diaList.length > 0) {
    const s = sysList[0]
    const d = diaList[0]
    latestBp = {
      type: 'blood_pressure',
      title: 'Huyết áp (Apple Health / Watch)',
      value: `${s.systolic}/${d.diastolic} mmHg`,
      numericValue: s.systolic || 120,
      systolic: s.systolic,
      diastolic: d.diastolic,
      unit: 'mmHg',
      measuredAt: s.measuredAt,
      sourceName: s.sourceName || d.sourceName || 'Apple Health',
      deviceDetails: s.deviceDetails || d.deviceDetails
    }
  }

  return {
    totalRecords: records.length,
    latestBloodPressure: latestBp,
    latestHeartRate: records.find(r => r.type === 'heart_rate'),
    latestSpO2: records.find(r => r.type === 'spo2'),
    latestGlucose: records.find(r => r.type === 'glucose'),
    latestTemperature: records.find(r => r.type === 'temperature'),
    latestWeight: records.find(r => r.type === 'weight'),
    records
  }
}

/**
 * Phân tích dữ liệu xuất từ Android Health Connect / Google Fit (JSON format)
 */
export function parseAndroidHealthJson(jsonContent: string): HealthImportSummary {
  const records: ParsedHealthRecord[] = []
  try {
    const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent
    const items = Array.isArray(data) ? data : (data.records || data.point || data.vitals || [data])

    items.forEach((item: any) => {
      const date = item.time || item.startTime || item.date || item.measuredAt ? new Date(item.time || item.startTime || item.date || item.measuredAt) : new Date()
      const source = item.source || item.device || item.appName || 'Android Health Connect'

      if (item.blood_pressure || (item.systolic && item.diastolic)) {
        const sys = Math.round(item.systolic || item.blood_pressure?.systolic || 120)
        const dia = Math.round(item.diastolic || item.blood_pressure?.diastolic || 80)
        records.push({
          type: 'blood_pressure',
          title: 'Huyết áp (Android Health Connect)',
          value: `${sys}/${dia} mmHg`,
          numericValue: sys,
          systolic: sys,
          diastolic: dia,
          pulse: item.pulse || item.heart_rate,
          unit: 'mmHg',
          measuredAt: date,
          sourceName: source
        })
      }
      if (item.heart_rate || item.bpm || item.pulse) {
        const bpm = Math.round(item.heart_rate || item.bpm || item.pulse)
        records.push({
          type: 'heart_rate',
          title: 'Nhịp tim (Galaxy Watch / Android)',
          value: `${bpm} bpm`,
          numericValue: bpm,
          pulse: bpm,
          unit: 'bpm',
          measuredAt: date,
          sourceName: source
        })
      }
      if (item.spo2 || item.oxygen_saturation) {
        const spo2 = Math.round(item.spo2 || item.oxygen_saturation)
        records.push({
          type: 'spo2',
          title: 'Nồng độ Oxy SpO2 (Android)',
          value: `${spo2}%`,
          numericValue: spo2,
          unit: '%',
          measuredAt: date,
          sourceName: source
        })
      }
      if (item.glucose || item.blood_glucose) {
        const glu = Number((item.glucose || item.blood_glucose).toFixed(1))
        records.push({
          type: 'glucose',
          title: 'Đường huyết (Android)',
          value: `${glu} mmol/L`,
          numericValue: glu,
          unit: 'mmol/L',
          measuredAt: date,
          sourceName: source
        })
      }
    })
  } catch (e) {
    console.warn('Lỗi phân tích cú pháp Android Health JSON:', e)
  }

  records.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())

  return {
    totalRecords: records.length,
    latestBloodPressure: records.find(r => r.type === 'blood_pressure'),
    latestHeartRate: records.find(r => r.type === 'heart_rate'),
    latestSpO2: records.find(r => r.type === 'spo2'),
    latestGlucose: records.find(r => r.type === 'glucose'),
    records
  }
}

/**
 * Lưu các chỉ số thật đã phân tích vào Hồ sơ Bệnh án EMR của bệnh nhân
 */
export async function syncHealthSummaryToEmr(summary: HealthImportSummary, patientId?: number): Promise<number> {
  let savedCount = 0

  if (summary.latestBloodPressure && summary.latestBloodPressure.systolic && summary.latestBloodPressure.diastolic) {
    await recordRPMVitals({
      patient_id: patientId,
      device_type: 'blood_pressure',
      device_name: `${summary.latestBloodPressure.sourceName} (Thật)`,
      connection_method: summary.latestBloodPressure.sourceName.includes('Apple') ? 'apple_health' : 'android_health',
      systolic: summary.latestBloodPressure.systolic,
      diastolic: summary.latestBloodPressure.diastolic,
      pulse: summary.latestHeartRate?.pulse || summary.latestBloodPressure.pulse
    })
    savedCount++
  } else if (summary.latestHeartRate && summary.latestHeartRate.pulse) {
    await recordRPMVitals({
      patient_id: patientId,
      device_type: 'heart_rate',
      device_name: `${summary.latestHeartRate.sourceName} (Apple Watch / WearOS)`,
      connection_method: summary.latestHeartRate.sourceName.includes('Apple') ? 'apple_health' : 'android_health',
      pulse: summary.latestHeartRate.pulse
    })
    savedCount++
  }

  if (summary.latestSpO2 && summary.latestSpO2.numericValue) {
    await recordRPMVitals({
      patient_id: patientId,
      device_type: 'spo2',
      device_name: `${summary.latestSpO2.sourceName} (Cảm biến quang học)`,
      connection_method: summary.latestSpO2.sourceName.includes('Apple') ? 'apple_health' : 'android_health',
      spo2_percent: summary.latestSpO2.numericValue,
      pulse: summary.latestHeartRate?.pulse
    })
    savedCount++
  }

  if (summary.latestGlucose && summary.latestGlucose.numericValue) {
    await recordRPMVitals({
      patient_id: patientId,
      device_type: 'glucose',
      device_name: `${summary.latestGlucose.sourceName}`,
      connection_method: summary.latestGlucose.sourceName.includes('Apple') ? 'apple_health' : 'android_health',
      glucose_value: summary.latestGlucose.numericValue
    })
    savedCount++
  }

  return savedCount
}
