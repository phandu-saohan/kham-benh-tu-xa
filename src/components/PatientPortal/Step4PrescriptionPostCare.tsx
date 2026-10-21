import React, { useState } from 'react';
import {
  Pill, QrCode, ShieldCheck, CheckSquare, Square,
  Clock, Heart, AlertCircle, Send, CheckCircle2,
  Calendar, FileText, Download, UserCheck
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';
import { PostCareReport } from '../../types/telemedicine';

export const Step4PrescriptionPostCare: React.FC = () => {
  const {
    currentPatient,
    prescriptions,
    soapNote,
    isSmartCASigned,
    nationalPrescriptionCode,
    medicationAdherence,
    toggleMedicationDoseTaken,
    submitPostCareSurvey,
    showToast
  } = useTelemedicine();

  // POST CARE SURVEY FORM LOCAL STATE
  const [postCareData, setPostCareData] = useState<PostCareReport>({
    submitted: currentPatient.postCareReport.submitted || false,
    recoveryStatus: currentPatient.postCareReport.recoveryStatus || 'significant_improvement',
    painScaleNow: currentPatient.postCareReport.painScaleNow || 2,
    sideEffects: currentPatient.postCareReport.sideEffects || [],
    patientNotes: currentPatient.postCareReport.patientNotes || 'Uống thuốc đúng giờ sau 3 ngày thấy đỡ ợ chua nhiều, huyết áp đo sáng nay còn 128/82 mmHg.'
  });

  const toggleSideEffect = (effect: string) => {
    setPostCareData(prev => {
      const exists = prev.sideEffects.includes(effect);
      return {
        ...prev,
        sideEffects: exists ? prev.sideEffects.filter(e => e !== effect) : [...prev.sideEffects, effect]
      };
    });
  };

  const handlePostCareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitPostCareSurvey(postCareData);
  };

  // Calculate adherence percentage
  let totalDoses = 0;
  let takenDoses = 0;
  prescriptions.forEach(rx => {
    const record = medicationAdherence[rx.id] || { morning: false, noon: false, evening: false, night: false };
    if (Number(rx.morning) > 0) { totalDoses++; if (record.morning) takenDoses++; }
    if (Number(rx.noon) > 0) { totalDoses++; if (record.noon) takenDoses++; }
    if (Number(rx.evening) > 0) { totalDoses++; if (record.evening) takenDoses++; }
    if (Number(rx.night) > 0) { totalDoses++; if (record.night) takenDoses++; }
  });
  const adherencePercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

  return (
    <div className="space-y-5 text-xs sm:text-sm">
      
      {/* 1. NATIONAL E-PRESCRIPTION CARD WITH QR CODE & SMARTCA SIGNATURE */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        
        {/* Prescription Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                Bộ Y Tế • Hệ thống Quản lý Quốc gia
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-700">
                Mã: {nationalPrescriptionCode}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
              Đơn Thuốc Điện Tử Liên Thông Quốc Gia (SmartCA Signed)
            </h3>
            <p className="text-xs text-slate-500">
              Bác sĩ kê đơn: <strong>BS.CKII Vũ Minh Đức</strong> (CCHN: 004821/BYT) • Ngày kê: Hôm nay
            </p>
          </div>

          {/* National QR Code badge */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="w-14 h-14 bg-white p-1 rounded-lg border border-slate-300 flex items-center justify-center shrink-0">
              <QrCode className="w-12 h-12 text-slate-900" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-blue-700 block">
                QR Tra cứu Nhà thuốc:
              </span>
              <span className="text-[10px] text-slate-500 font-mono block">
                donthuocquocgia.vn
              </span>
              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                ✓ SmartCA Valid
              </span>
            </div>
          </div>
        </div>

        {/* Doctor Diagnosis & Treatment advice */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1 text-xs">
          <div className="font-bold text-blue-950 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-700" />
            <span>Chẩn đoán của Bác sĩ ({soapNote.primaryIcd}):</span>
          </div>
          <div className="text-sm font-bold text-slate-900 pl-5">
            {soapNote.diagnosisText}
          </div>
          <div className="text-xs text-slate-700 pl-5 whitespace-pre-line mt-1">
            <strong>Lời dặn & chế độ dùng thuốc:</strong>{'\n'}
            {soapNote.treatmentPlan}
          </div>
          <div className="text-xs font-semibold text-blue-900 pl-5 pt-1">
            📅 Hẹn tái khám: <strong>{soapNote.followUpDate}</strong>
          </div>
        </div>

        {/* Prescription Item List */}
        <div className="space-y-2">
          <h4 className="font-bold text-xs uppercase tracking-wide text-slate-700">
            Danh mục thuốc điều trị ({prescriptions.length} khoản):
          </h4>

          <div className="space-y-2">
            {prescriptions.map((rx, idx) => (
              <div
                key={rx.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 sm:text-sm">
                    {idx + 1}. {rx.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-xs shrink-0">
                    SL: {rx.quantity} {rx.unit} ({rx.days} ngày)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 mt-0.5">
                  {Number(rx.morning) > 0 && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Sáng: <strong>{rx.morning}</strong></span>}
                  {Number(rx.noon) > 0 && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Trưa: <strong>{rx.noon}</strong></span>}
                  {Number(rx.evening) > 0 && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Chiều: <strong>{rx.evening}</strong></span>}
                  {Number(rx.night) > 0 && <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Tối: <strong>{rx.night}</strong></span>}
                </div>
                <p className="text-slate-600 italic text-[11px] mt-0.5">
                  Cách dùng: {rx.usage}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Prescription Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
          <button
            onClick={() => showToast('Đã gửi yêu cầu Giao thuốc tận nhà tới Nhà thuốc Bệnh viện (Dự kiến giao trong 2 giờ).', 'success')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đặt Giao Thuốc BHYT Tận Nhà</span>
          </button>

          <button
            onClick={() => showToast('Đã tải tệp PDF Đơn thuốc điện tử chuẩn Bộ Y Tế.', 'success')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Tải PDF Đơn Thuốc Quốc Gia</span>
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE DAILY MEDICATION CHECKLIST (NHẮC LỊCH UỐNG THUỐC) */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              Nhắc Lịch Uống Thuốc Hàng Ngày (Medication Adherence Tracker)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Tỷ lệ tuân thủ hôm nay:</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
              {adherencePercent}% ({takenDoses}/{totalDoses} liều)
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          {prescriptions.map(rx => {
            const adherence = medicationAdherence[rx.id] || { morning: false, noon: false, evening: false, night: false };
            return (
              <div
                key={rx.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">{rx.name}</div>
                  <div className="text-[11px] text-slate-500 italic mt-0.5">{rx.usage}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {Number(rx.morning) > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleMedicationDoseTaken(rx.id, 'morning')}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                        adherence.morning
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {adherence.morning ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <span>Sáng ({rx.morning}v)</span>
                    </button>
                  )}

                  {Number(rx.noon) > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleMedicationDoseTaken(rx.id, 'noon')}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                        adherence.noon
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {adherence.noon ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <span>Trưa ({rx.noon}v)</span>
                    </button>
                  )}

                  {Number(rx.evening) > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleMedicationDoseTaken(rx.id, 'evening')}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                        adherence.evening
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {adherence.evening ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <span>Chiều ({rx.evening}v)</span>
                    </button>
                  )}

                  {Number(rx.night) > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleMedicationDoseTaken(rx.id, 'night')}
                      className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                        adherence.night
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {adherence.night ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <span>Tối ({rx.night}v)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. POST-CARE MONITORING FORM (THEO DÕI SAU KHÁM 3-5 NGÀY) */}
      <form onSubmit={handlePostCareSubmit} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500" />
            <h3 className="font-bold text-xs sm:text-sm text-slate-900">
              Báo Cáo Diễn Tiến Sau Khám 3 - 5 Ngày (Post-Care Monitoring Form)
            </h3>
          </div>
          {currentPatient.postCareReport.submitted && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đã gửi về EMR Bác sĩ ({currentPatient.postCareReport.submittedAt})
            </span>
          )}
        </div>

        {/* Mức độ hồi phục */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            1. Mức độ thuyên giảm triệu chứng của bạn sau khi dùng thuốc:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'significant_improvement', label: 'Thuyên giảm nhiều (Tốt)', color: 'emerald' },
              { id: 'moderate', label: 'Thuyên giảm vừa phải', color: 'blue' },
              { id: 'unchanged', label: 'Chưa thấy thay đổi', color: 'amber' },
              { id: 'worsened', label: 'Triệu chứng nặng hơn', color: 'rose' }
            ].map(opt => {
              const isSelected = postCareData.recoveryStatus === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPostCareData({ ...postCareData, recoveryStatus: opt.id as any })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Điểm đau hiện tại */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-800">
              2. Điểm đau hiện tại (1 - 10):
            </label>
            <span className="font-bold text-blue-700 text-xs">
              {postCareData.painScaleNow}/10
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            value={postCareData.painScaleNow}
            onChange={e => setPostCareData({ ...postCareData, painScaleNow: Number(e.target.value) })}
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Tác dụng phụ của thuốc */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1.5">
            3. Bạn có gặp bất kỳ tác dụng không mong muốn (tác dụng phụ) nào không?
          </label>
          <div className="flex flex-wrap gap-2">
            {['Không có', 'Buồn nôn nhẹ', 'Đầy hơi khó tiêu', 'Nổi mẩn ngứa', 'Tiêu chảy', 'Chóng mặt'].map(effect => {
              const isChecked = postCareData.sideEffects.includes(effect);
              return (
                <button
                  type="button"
                  key={effect}
                  onClick={() => toggleSideEffect(effect)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isChecked
                      ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isChecked ? '✓ ' : '+ '} {effect}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ghi chú thêm cho Bác sĩ */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-1">
            4. Ý kiến phản hồi hoặc câu hỏi thêm cho Bác sĩ:
          </label>
          <textarea
            rows={2}
            value={postCareData.patientNotes}
            onChange={e => setPostCareData({ ...postCareData, patientNotes: e.target.value })}
            placeholder="Chia sẻ thêm về huyết áp đo tại nhà, cảm giác sau khi ăn..."
            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="submit"
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Gửi Báo Cáo Diễn Tiến Về Hồ Sơ EMR Của Bác Sĩ</span>
          </button>
        </div>
      </form>

    </div>
  );
};
