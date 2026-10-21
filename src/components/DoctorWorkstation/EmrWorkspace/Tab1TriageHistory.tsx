import React from 'react';
import {
  Activity, AlertTriangle, Clock, Calendar, ClipboardList,
  Heart, ShieldCheck, ChevronRight, User, HelpCircle, FileText
} from 'lucide-react';
import { useTelemedicine } from '../../../context/TelemedicineContext';

export const Tab1TriageHistory: React.FC = () => {
  const { currentPatient, setActiveEmrTab } = useTelemedicine();
  const q = currentPatient.preTriageQuestionnaire;

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      
      {/* 1. SEVERE ALLERGY & CHRONIC CONDITIONS WARNING BANNER */}
      <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-rose-950 text-sm">CẢNH BÁO DỊ ỨNG THUỐC NGHIÊM TRỌNG (HIS CDS FLAG)</h4>
              <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold text-[11px]">
                Mức độ cao
              </span>
            </div>
            <p className="text-xs text-rose-900 mt-0.5 font-medium">
              Hoạt chất dị ứng đã ghi nhận: <strong>{currentPatient.allergies.join(' • ')}</strong>
            </p>
            <p className="text-[11px] text-rose-800 italic mt-0.5">
              Hệ thống sẽ tự động khóa chặn các đơn thuốc thuộc nhóm Beta-lactam / Penicillin.
            </p>
          </div>
        </div>
      </div>

      {/* 2. PRE-TRIAGE ADAPTIVE QUESTIONNAIRE FROM PATIENT WAITING ROOM */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-700" />
            <h4 className="font-bold text-xs sm:text-sm text-blue-950 uppercase tracking-wide">
              Phiếu Sàng Lọc Thích Ứng (Đồng bộ từ Phòng Chờ Ảo của Bệnh nhân)
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
            Gửi lúc: {q?.submittedAt || '09:10 - Hôm nay'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block">Lý do khám chính:</span>
            <span className="font-bold text-slate-900 text-xs mt-0.5 block">
              "{q?.chiefComplaint || currentPatient.reasonForVisit}"
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block">Thời gian khởi phát & Thang đau:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-slate-900 text-xs">{q?.durationDays || 3} ngày nay</span>
              <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[11px]">
                Điểm đau: {q?.painScale || 6}/10
              </span>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-semibold block">Mức độ sốt & Thuốc đã tự uống:</span>
            <span className="font-medium text-slate-800 text-xs mt-0.5 block">
              {q?.feverLevel || 'Sốt nhẹ 37.8°C'} • {q?.pastMedsTaken || 'Đã uống 1 viên Paracetamol'}
            </span>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-600 block mb-1">
            Các triệu chứng cụ thể bệnh nhân đánh dấu:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(q?.symptoms || currentPatient.reportedSymptoms).map((sym, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
              >
                ✓ {sym}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. BỆNH NỀN & TIỀN SỬ GIA ĐÌNH */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Bệnh lý mạn tính */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <h4 className="font-bold text-xs text-slate-800 uppercase flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-600" />
            Bệnh nền mạn tính đang theo dõi
          </h4>
          <div className="space-y-1.5">
            {currentPatient.chronicConditions.map((cond, idx) => (
              <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between">
                <span>{cond}</span>
                <span className="text-[10px] text-blue-600 font-bold">HIS Verified</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tiền sử ngoại khoa & Gia đình */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <h4 className="font-bold text-xs text-slate-800 uppercase flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-indigo-600" />
            Tiền sử Ngoại khoa & Gia đình
          </h4>
          <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1 text-slate-700">
            <div>• <strong>Ngoại khoa:</strong> Mổ viêm ruột thừa nội soi năm 2012 (Không biến chứng).</div>
            <div>• <strong>Gia đình:</strong> Bố ruột có tiền sử tăng huyết áp và nhồi máu cơ tim tuổi 65.</div>
            <div>• <strong>Thói quen:</strong> Hút thuốc lá 5 bao-năm (đã bỏ 3 năm), thỉnh thoảng uống bia rượu.</div>
          </div>
        </div>

      </div>

      {/* 4. HISTORICAL VISIT TIMELINE SYNCED FROM HIS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Dòng Thời Gian Lịch Sử Khám Bệnh Trên HIS ({currentPatient.emrHistory.length} đợt khám)
          </h4>
          <span className="text-xs text-emerald-700 font-medium">Kho dữ liệu EMR HL7 FHIR Tập trung</span>
        </div>

        <div className="relative pl-6 border-l-2 border-blue-400 space-y-3">
          {currentPatient.emrHistory.map(enc => (
            <div key={enc.id} className="relative bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 hover:border-blue-400 transition">
              <span className="absolute -left-[31px] top-4 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs" />
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                    {enc.date}
                  </span>
                  <span className="font-bold text-xs text-slate-900">{enc.department}</span>
                  <span className="text-[11px] font-mono text-slate-500">({enc.id})</span>
                </div>
                <span className="text-xs text-slate-600">Bác sĩ: <strong>{enc.doctor}</strong></span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-1">
                ICD-10: <span className="text-blue-700">{enc.icd10}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{enc.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ACTION NEXT BUTTON */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setActiveEmrTab('pacs')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <span>Xem Cận lâm sàng & Web PACS DICOM</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
