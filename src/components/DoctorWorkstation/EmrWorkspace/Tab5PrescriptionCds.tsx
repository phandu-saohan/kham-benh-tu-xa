import React, { useState } from 'react';
import {
  Pill, AlertTriangle, ShieldCheck, Plus, Trash2, Send,
  CheckCircle2, Search, QrCode, Lock, AlertCircle, RefreshCw
} from 'lucide-react';
import { useTelemedicine } from '../../../context/TelemedicineContext';
import { PHARMACY_INVENTORY } from '../../../data/mockData';

export const Tab5PrescriptionCds: React.FC = () => {
  const {
    prescriptions,
    selectedDrugCatalogId,
    setSelectedDrugCatalogId,
    addPrescriptionDrug,
    removePrescriptionDrug,
    updatePrescriptionField,
    currentPatient,
    signSmartCAAndPublish,
    isSmartCASigned,
    nationalPrescriptionCode
  } = useTelemedicine();

  const [searchTerm, setSearchTerm] = useState('');

  const filteredCatalog = PHARMACY_INVENTORY.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.activeIngredient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      
      {/* 1. CDS ALLERGY ACTIVE MONITOR STATUS */}
      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-950 text-xs">Hệ thống CDS Dược lâm sàng đang giám sát</span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                Đã ghim dị ứng: {currentPatient.allergies.join(', ')}
              </span>
            </div>
            <p className="text-[11px] text-amber-900 mt-0.5">
              Hệ thống sẽ lập tức kích hoạt khóa chặn đỏ nếu kê thuốc thuộc nhóm Beta-lactam / Penicillin (như Augmentin, Amoxicillin).
            </p>
          </div>
        </div>
      </div>

      {/* 2. DRUG SEARCH & ADD FROM HOSPITAL PHARMACY INVENTORY */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[260px] space-y-1">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Chọn thuốc từ Kho Dược Bệnh Viện (HIS Pharmacy Catalog)
          </label>
          <select
            value={selectedDrugCatalogId}
            onChange={e => setSelectedDrugCatalogId(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            {filteredCatalog.map(drug => (
              <option key={drug.id} value={drug.id}>
                {drug.name} — [Tồn: {drug.stock} {drug.unit}] {drug.isPenicillinClass ? '⚠️ (Nhóm Penicillin/Beta-lactam)' : ''}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => addPrescriptionDrug()}
          className="mt-4 sm:mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 text-blue-200" />
          <span>Thêm vào đơn thuốc</span>
        </button>
      </div>

      {/* 3. INTERACTIVE E-PRESCRIPTION TABLE & DOSAGE BUILDER */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
              <th className="py-2.5 px-3 font-bold">STT & Tên thuốc / Hoạt chất</th>
              <th className="py-2.5 px-2 font-bold text-center w-14">Sáng</th>
              <th className="py-2.5 px-2 font-bold text-center w-14">Trưa</th>
              <th className="py-2.5 px-2 font-bold text-center w-14">Chiều</th>
              <th className="py-2.5 px-2 font-bold text-center w-14">Tối</th>
              <th className="py-2.5 px-2 font-bold text-center w-16">Số ngày</th>
              <th className="py-2.5 px-2 font-bold text-center w-20">Tổng SL</th>
              <th className="py-2.5 px-2 font-bold text-center w-10">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {prescriptions.map((rx, idx) => (
              <tr key={rx.id} className="hover:bg-slate-50 transition">
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    {idx + 1}. {rx.name}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {rx.activeIngredient} • Đường dùng: {rx.route}
                  </div>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={rx.usage}
                      onChange={e => updatePrescriptionField(rx.id, 'usage', e.target.value)}
                      placeholder="Hướng dẫn cách dùng chi tiết..."
                      className="w-full text-xs font-normal text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 focus:bg-white focus:outline-none"
                    />
                  </div>
                </td>

                {/* Sáng */}
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={rx.morning}
                    onChange={e => updatePrescriptionField(rx.id, 'morning', e.target.value)}
                    className="w-12 text-center py-1 rounded border border-slate-300 font-bold text-slate-900"
                  />
                </td>

                {/* Trưa */}
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={rx.noon}
                    onChange={e => updatePrescriptionField(rx.id, 'noon', e.target.value)}
                    className="w-12 text-center py-1 rounded border border-slate-300 font-bold text-slate-900"
                  />
                </td>

                {/* Chiều */}
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={rx.evening}
                    onChange={e => updatePrescriptionField(rx.id, 'evening', e.target.value)}
                    className="w-12 text-center py-1 rounded border border-slate-300 font-bold text-slate-900"
                  />
                </td>

                {/* Tối */}
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={rx.night}
                    onChange={e => updatePrescriptionField(rx.id, 'night', e.target.value)}
                    className="w-12 text-center py-1 rounded border border-slate-300 font-bold text-slate-900"
                  />
                </td>

                {/* Số ngày */}
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={rx.days}
                    onChange={e => updatePrescriptionField(rx.id, 'days', e.target.value)}
                    className="w-14 text-center py-1 rounded border border-slate-300 font-bold text-slate-900"
                  />
                </td>

                {/* Tổng SL */}
                <td className="py-2 px-2 text-center font-bold text-blue-900 bg-blue-50/50">
                  {rx.quantity} {rx.unit}
                </td>

                {/* Xóa */}
                <td className="py-2 px-2 text-center">
                  <button
                    onClick={() => removePrescriptionDrug(rx.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Xóa khoản thuốc"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. DIGITAL SIGNATURE SMARTCA & NATIONAL PRESCRIPTION SYSTEM BANNER */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Chữ Ký Số Y Tế SmartCA & Liên Thông Quốc Gia</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                {isSmartCASigned ? 'ĐÃ KÝ SỐ THÀNH CÔNG' : 'CHỜ KÝ SỐ'}
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-1">
              Mã Đơn thuốc Quốc gia: <span className="font-mono text-amber-300 font-bold">{nationalPrescriptionCode}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Căn cứ Thông tư 27/2021/TT-BYT & 04/2022/TT-BYT về đơn thuốc điện tử quốc gia
            </p>
          </div>
        </div>

        <button
          onClick={signSmartCAAndPublish}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2 shrink-0"
        >
          <Send className="w-4 h-4 text-blue-200" />
          <span>Ký số SmartCA & Đẩy sang Cổng Bệnh nhân</span>
        </button>
      </div>

    </div>
  );
};
