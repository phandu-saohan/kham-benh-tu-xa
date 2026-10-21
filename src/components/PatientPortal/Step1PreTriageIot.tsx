import React, { useState } from 'react';
import {
  Bluetooth, Wifi, Camera, Mic, Activity, CheckCircle2,
  RefreshCw, Radio, Heart, Droplets, Thermometer, Disc,
  Send, ChevronRight, Stethoscope, AlertTriangle, Sliders
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';
import { PreTriageQuestionnaire } from '../../types/telemedicine';
import { BleGattService } from '../../services/bleGattService';

export const Step1PreTriageIot: React.FC = () => {
  const {
    currentPatient,
    bluetoothDevices,
    toggleBluetoothDevice,
    simulateBleReading,
    submitPatientQuestionnaire,
    setPatientCurrentStep
  } = useTelemedicine();

  // QUESTIONNAIRE LOCAL STATE
  const [formData, setFormData] = useState<PreTriageQuestionnaire>({
    chiefComplaint: currentPatient.preTriageQuestionnaire.chiefComplaint || 'Đau rát vùng thượng vị, ợ chua nhiều về đêm',
    durationDays: currentPatient.preTriageQuestionnaire.durationDays || 3,
    painScale: currentPatient.preTriageQuestionnaire.painScale || 6,
    feverLevel: currentPatient.preTriageQuestionnaire.feverLevel || 'Sốt nhẹ 37.8°C',
    symptoms: currentPatient.preTriageQuestionnaire.symptoms || ['Đau thượng vị', 'Ợ nóng sau ăn', 'Mệt mỏi'],
    pastMedsTaken: currentPatient.preTriageQuestionnaire.pastMedsTaken || 'Đã uống 1 viên Paracetamol 500mg sáng nay'
  });

  const [isHardwareChecking, setIsHardwareChecking] = useState(false);
  const [bleScanningId, setBleScanningId] = useState<string | null>(null);

  const handleConnectBle = async (devId: string, devType: string, connected: boolean) => {
    if (connected) {
      toggleBluetoothDevice(devId);
      return;
    }

    setBleScanningId(devId);
    try {
      if (devType === 'bp') {
        await BleGattService.connectBloodPressureDevice();
      } else if (devType === 'spo2') {
        await BleGattService.connectPulseOximeter();
      }
      toggleBluetoothDevice(devId);
      simulateBleReading(devId);
    } finally {
      setBleScanningId(null);
    }
  };

  const toggleSymptom = (sym: string) => {
    setFormData(prev => {
      const exists = prev.symptoms.includes(sym);
      return {
        ...prev,
        symptoms: exists ? prev.symptoms.filter(s => s !== sym) : [...prev.symptoms, sym]
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPatientQuestionnaire(formData);
    setPatientCurrentStep(2); // Auto advance to video consultation
  };

  return (
    <div className="space-y-5 text-xs sm:text-sm">
      
      {/* 1. AUTOMATED HARDWARE & NETWORK PRE-FLIGHT CHECK */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              Kiểm Tra Thiết Bị & Kết Nối Mạng (Pre-flight Hardware Check)
            </h3>
          </div>
          <button
            onClick={() => {
              setIsHardwareChecking(true);
              setTimeout(() => setIsHardwareChecking(false), 800);
            }}
            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isHardwareChecking ? 'animate-spin' : ''}`} />
            Kiểm tra lại
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Camera Check */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Camera FaceTime HD
              </div>
              <span className="text-[11px] text-emerald-800">1080p • 30fps (Sẵn sàng)</span>
            </div>
          </div>

          {/* Microphone Check */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Micro & Lọc ồn AI
              </div>
              <span className="text-[11px] text-emerald-800">Thu âm giọng nói rõ ràng</span>
            </div>
          </div>

          {/* Network Latency Check */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-emerald-950 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Băng thông Telehealth
              </div>
              <span className="text-[11px] text-emerald-800">Độ trễ 38ms • Tốc độ 45 Mbps</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WEB BLUETOOTH IOT PAIRING PANEL (OMRON, WELLUE, LITTMANN, ACCU-CHEK) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Bluetooth className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                Kết Nối Thiết Bị Y Tế Không Dây Tại Nhà (Web Bluetooth API)
              </h3>
              <p className="text-[11px] text-slate-500">
                Chuẩn GATT Bluetooth SIG: `0x1810` (Huyết áp), `0x1822` (SpO2), `0x1808` (Đường huyết)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            Tự động truyền dữ liệu sang Bác sĩ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bluetoothDevices.map(dev => (
            <div
              key={dev.id}
              className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-3 ${
                dev.connected
                  ? 'bg-blue-50/60 border-blue-300 shadow-2xs'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className={`p-2 rounded-lg shrink-0 ${dev.connected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {dev.type === 'bp' && <Activity className="w-4 h-4" />}
                    {dev.type === 'spo2' && <Droplets className="w-4 h-4" />}
                    {dev.type === 'stethoscope' && <Stethoscope className="w-4 h-4" />}
                    {dev.type === 'glucose' && <Disc className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{dev.name}</h4>
                    <span className="font-mono text-[10px] text-slate-500">UUID: {dev.serviceUuid}</span>
                    {dev.lastReading && (
                      <div className="text-[11px] text-blue-900 font-semibold mt-1">
                        Kết quả gần nhất: <span className="font-bold">{dev.lastReading}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    dev.connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {dev.connected ? `Đã kết nối (${dev.battery}%)` : 'Chưa ghép nối'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={() => handleConnectBle(dev.id, dev.type, dev.connected)}
                  disabled={bleScanningId === dev.id}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border flex items-center gap-1 ${
                    dev.connected
                      ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      : bleScanningId === dev.id
                        ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {bleScanningId === dev.id ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Đang quét BLE...</span>
                    </>
                  ) : dev.connected ? (
                    'Ngắt kết nối'
                  ) : (
                    'Ghép nối BLE'
                  )}
                </button>

                {dev.connected && (
                  <button
                    type="button"
                    onClick={() => simulateBleReading(dev.id)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>Mô phỏng đo & truyền số liệu ngay</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SMART ADAPTIVE SYMPTOM QUESTIONNAIRE */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              Phiếu Khảo Sát Triệu Chứng Ban Đầu (Adaptive Pre-Triage Questionnaire)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Dữ liệu này sẽ tự động cập nhật vào Tab 1 của Bác sĩ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lý do khám */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              1. Bạn cảm thấy khó chịu nhất ở vị trí nào? (Lý do khám chính):
            </label>
            <input
              type="text"
              value={formData.chiefComplaint}
              onChange={e => setFormData({ ...formData, chiefComplaint: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          {/* Thời gian xuất hiện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              2. Triệu chứng này xuất hiện được bao nhiêu ngày rồi?
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={formData.durationDays}
              onChange={e => setFormData({ ...formData, durationDays: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-blue-600"
              required
            />
          </div>
        </div>

        {/* Thang điểm đau (1 - 10) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700">
              3. Mức độ đau hiện tại của bạn (Thang điểm VAS từ 1 đến 10):
            </label>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-xs">
              Mức {formData.painScale}/10 ({formData.painScale <= 3 ? 'Nhẹ' : formData.painScale <= 6 ? 'Trung bình' : 'Nặng'})
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.painScale}
            onChange={e => setFormData({ ...formData, painScale: Number(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-semibold">
            <span>1 (Rất nhẹ)</span>
            <span>5 (Đau vừa)</span>
            <span>10 (Đau dữ dội không chịu nổi)</span>
          </div>
        </div>

        {/* Checkbox các triệu chứng kèm theo */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            4. Chọn các dấu hiệu bạn đang gặp phải:
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              'Đau thượng vị', 'Ợ nóng sau ăn', 'Ợ chua trào ngược',
              'Sốt nhẹ', 'Đắng miệng khi thức dậy', 'Khó thở khi gắng sức',
              'Chóng mặt khi thay đổi tư thế', 'Mệt mỏi, chán ăn'
            ].map(sym => {
              const isChecked = formData.symptoms.includes(sym);
              return (
                <button
                  type="button"
                  key={sym}
                  onClick={() => toggleSymptom(sym)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isChecked
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isChecked ? '✓ ' : '+ '} {sym}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thuốc đã tự dùng ở nhà */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            5. Bạn có đang uống hoặc vừa tự uống loại thuốc nào gần đây không?
          </label>
          <input
            type="text"
            value={formData.pastMedsTaken}
            onChange={e => setFormData({ ...formData, pastMedsTaken: e.target.value })}
            placeholder="Ví dụ: Đã uống 1 viên giảm đau Paracetamol hoặc men tiêu hóa..."
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Gửi Phiếu Sàng Lọc & Vào Phòng Khám Video (Bước 2)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>

    </div>
  );
};
