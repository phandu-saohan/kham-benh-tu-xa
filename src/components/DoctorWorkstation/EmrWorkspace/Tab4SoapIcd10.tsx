import React, { useState } from 'react';
import {
  ClipboardList, CheckCircle2, Search, Calendar, ChevronRight,
  Sparkles, Save, ShieldCheck, Heart, Activity
} from 'lucide-react';
import { useTelemedicine } from '../../../context/TelemedicineContext';
import { ICD10_CATALOG } from '../../../data/mockData';

export const Tab4SoapIcd10: React.FC = () => {
  const {
    soapNote,
    updateSoapField,
    saveSoapNote,
    setActiveEmrTab,
    triggerAiExtractSoap,
    aiScribe
  } = useTelemedicine();

  const [icdSearch, setIcdSearch] = useState('');

  const filteredIcd = ICD10_CATALOG.filter(item =>
    item.code.toLowerCase().includes(icdSearch.toLowerCase()) ||
    item.name.toLowerCase().includes(icdSearch.toLowerCase())
  );

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      
      {/* 1. TOP AI RE-SYNC BANNER */}
      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-indigo-900">
            Dữ liệu SOAP có thể được đồng bộ và cập nhật tự động từ AI Medical Scribe
          </span>
        </div>
        <button
          onClick={triggerAiExtractSoap}
          disabled={aiScribe.isExtractingSoap}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{aiScribe.isExtractingSoap ? 'Đang trích xuất...' : 'Cập nhật từ AI Scribe'}</span>
        </button>
      </div>

      {/* 2. S & O STRUCTURED EDITORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* S (Subjective) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              1. Triệu Chứng Cơ Năng (Subjective - S)
            </label>
            <span className="text-[11px] text-slate-500 font-medium">Bệnh nhân khai báo</span>
          </div>
          <textarea
            rows={4}
            value={soapNote.subjective}
            onChange={e => updateSoapField('subjective', e.target.value)}
            placeholder="Mô tả triệu chứng cơ năng, hoàn cảnh khởi phát, vị trí, tính chất cơn đau..."
            className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 bg-white shadow-2xs leading-relaxed"
          />
        </div>

        {/* O (Objective) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              2. Triệu Chứng Thực Thể & Sinh Hiệu IoT (Objective - O)
            </label>
            <span className="text-[11px] text-blue-600 font-semibold">Tự động gắn số đo IoT</span>
          </div>
          <textarea
            rows={4}
            value={soapNote.objective}
            onChange={e => updateSoapField('objective', e.target.value)}
            placeholder="Quan sát qua Telehealth video, niêm mạc, tiếng tim/phổi, chỉ số HA/SpO2/Nhiệt độ..."
            className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 bg-white shadow-2xs leading-relaxed"
          />
        </div>

      </div>

      {/* 3. A (Assessment) & SEARCHABLE ICD-10 CODE SELECTOR */}
      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
        <label className="block text-xs font-bold text-blue-950 uppercase tracking-wide">
          3. Đánh Giá Chẩn Đoán & Mã Bệnh ICD-10 (Assessment - A)
        </label>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* ICD-10 Search & Dropdown (5 cols) */}
          <div className="md:col-span-5 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Tìm kiếm & Chọn Mã bệnh ICD-10 chính:</span>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={icdSearch}
                onChange={e => setIcdSearch(e.target.value)}
                placeholder="Gõ mã ICD-10 (K21, I10...) hoặc tên bệnh..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-2xs">
              {filteredIcd.map(item => (
                <div
                  key={item.code}
                  onClick={() => {
                    updateSoapField('primaryIcd', item.code);
                    updateSoapField('diagnosisText', `${item.name} / Tăng huyết áp vô căn`);
                  }}
                  className={`p-2 text-xs flex items-center justify-between cursor-pointer transition ${
                    soapNote.primaryIcd === item.code
                      ? 'bg-blue-100 text-blue-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-blue-700 mr-2">[{item.code}]</span>
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 ml-1">{item.category}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Diagnosis Text Input (7 cols) */}
          <div className="md:col-span-7 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600">Chẩn đoán xác định & phân biệt chi tiết:</span>
            <textarea
              rows={4}
              value={soapNote.diagnosisText}
              onChange={e => updateSoapField('diagnosisText', e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 bg-white shadow-2xs leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* 4. P (Plan) & FOLLOW-UP DATE */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          4. Hướng Điều Trị, Chế Độ Dinh Dưỡng & Dặn Dò (Plan - P)
        </label>
        <textarea
          rows={3}
          value={soapNote.treatmentPlan}
          onChange={e => updateSoapField('treatmentPlan', e.target.value)}
          placeholder="Chế độ sinh hoạt, dùng thuốc, lịch theo dõi huyết áp tại nhà, dấu hiệu cần tái khám ngay..."
          className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-blue-600 bg-white shadow-2xs leading-relaxed"
        />
      </div>

      {/* 5. FOOTER ACTIONS: FOLLOW-UP & SAVE BUTTONS */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">Lịch hẹn tái khám từ xa:</span>
          <input
            type="text"
            value={soapNote.followUpDate}
            onChange={e => updateSoapField('followUpDate', e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-slate-900 w-32"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={saveSoapNote}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Bệnh Án & Đẩy Sang Cổng Bệnh Nhân</span>
          </button>

          <button
            onClick={() => setActiveEmrTab('prescription')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Sang Kê Đơn Thuốc Điện Tử</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
