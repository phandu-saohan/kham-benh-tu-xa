// Dịch vụ Giao tiếp Thiết bị Y tế Web Bluetooth API (GATT Services)
// Chuẩn Bluetooth SIG: 0x1810 (Huyết áp), 0x1822 (SpO2), 0x1808 (Đường huyết)

export interface BleMeasurementResult {
  deviceType: 'bp' | 'spo2' | 'glucose' | 'stethoscope';
  deviceName: string;
  data: Record<string, any>;
  timestamp: string;
  source: 'WEB_BLUETOOTH_HARDWARE' | 'SIMULATED_BLE';
}

export class BleGattService {
  /**
   * Kiểm tra trình duyệt có hỗ trợ Web Bluetooth API không
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Quét và kết nối máy đo Huyết áp Omron BLE (GATT 0x1810)
   */
  public static async connectBloodPressureDevice(): Promise<BleMeasurementResult> {
    const now = new Date().toLocaleTimeString('vi-VN');

    if (this.isSupported()) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['blood_pressure', 0x1810] }],
          optionalServices: ['battery_service', 0x180F]
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(0x1810);
        const characteristic = await service.getCharacteristic(0x2A35); // Blood Pressure Measurement

        // Đọc giá trị
        const value = await characteristic.readValue();
        const parsed = this.parseBloodPressureData(value);

        return {
          deviceType: 'bp',
          deviceName: device.name || 'Máy đo Huyết áp Omron HEM-7361T BLE',
          data: parsed,
          timestamp: now,
          source: 'WEB_BLUETOOTH_HARDWARE'
        };
      } catch (err) {
        console.warn('Web Bluetooth bị hủy hoặc không tìm thấy thiết bị, kích hoạt giả lập BLE:', err);
      }
    }

    // Fallback mô phỏng nếu trình duyệt không hỗ trợ hoặc người dùng không có máy đo vật lý
    const sys = Math.floor(136 + Math.random() * 8);
    const dia = Math.floor(86 + Math.random() * 6);
    const hr = Math.floor(80 + Math.random() * 8);

    return {
      deviceType: 'bp',
      deviceName: 'Omron HEM-7361T BLE (Mô phỏng GATT 0x1810)',
      data: {
        systolic: sys,
        diastolic: dia,
        bpString: `${sys}/${dia}`,
        unit: 'mmHg',
        pulseRate: hr
      },
      timestamp: now,
      source: 'SIMULATED_BLE'
    };
  }

  /**
   * Quét và kết nối Máy đo SpO2 Wellue FS20F (GATT 0x1822)
   */
  public static async connectPulseOximeter(): Promise<BleMeasurementResult> {
    const now = new Date().toLocaleTimeString('vi-VN');

    if (this.isSupported()) {
      try {
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['pulse_oximeter', 0x1822] }]
        });
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(0x1822);
        const char = await service.getCharacteristic(0x2A5F);
        const value = await char.readValue();
        const spo2 = value.getUint16(1, true);
        const pulse = value.getUint16(3, true);

        return {
          deviceType: 'spo2',
          deviceName: device.name || 'Wellue Pulse Oximeter FS20F',
          data: { spo2, pulseRate: pulse, unit: '%' },
          timestamp: now,
          source: 'WEB_BLUETOOTH_HARDWARE'
        };
      } catch (err) {
        console.warn('Web Bluetooth SpO2 fallback:', err);
      }
    }

    const spo2Val = 98 + Math.floor(Math.random() * 2);
    const pulseVal = 82 + Math.floor(Math.random() * 6);

    return {
      deviceType: 'spo2',
      deviceName: 'Wellue FS20F (Mô phỏng GATT 0x1822)',
      data: { spo2: spo2Val, pulseRate: pulseVal, unit: '%' },
      timestamp: now,
      source: 'SIMULATED_BLE'
    };
  }

  /**
   * Giải mã chuỗi Byte theo đặc tả Bluetooth SIG Blood Pressure Measurement
   */
  private static parseBloodPressureData(dataView: DataView) {
    const flags = dataView.getUint8(0);
    const isKpa = (flags & 0x01) !== 0;
    const systolic = Math.round(dataView.getFloat32 ? dataView.getFloat32(1, true) : dataView.getUint16(1, true));
    const diastolic = Math.round(dataView.getFloat32 ? dataView.getFloat32(3, true) : dataView.getUint16(3, true));
    let pulseRate = 80;
    if ((flags & 0x04) !== 0 && dataView.byteLength >= 9) {
      pulseRate = dataView.getUint16(7, true);
    }

    return {
      systolic,
      diastolic,
      bpString: `${systolic}/${diastolic}`,
      unit: isKpa ? 'kPa' : 'mmHg',
      pulseRate
    };
  }
}
