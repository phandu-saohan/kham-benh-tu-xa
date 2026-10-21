import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';

export const AllergyBlockerModal: React.FC = () => {
  const {
    allergyBlockerModal,
    setAllergyBlockerModal,
    overrideAllergyBlocker,
    addPrescriptionDrug,
    currentPatient
  } = useTelemedicine();

  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideInput, setShowOverrideInput] = useState(false);

  if (!allergyBlockerModal) return null;

  const drug = allergyBlockerModal.drug;

  const handleSelectSafeAlternative = () => {
    setAllergyBlockerModal(null);
    // Add safe Macrolide alternative: Zithromax 500mg (DRG-ALT-01)
    addPrescriptionDrug('DRG-ALT-01');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border-2 border-rose-600 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* HIGH-SEVERITY RED HEADER */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                CẢNH BÁO DỊ ỨNG THUỐC ĐỎ (CDS BLOCKED)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-rose-950 text-white font-bold text-[10px] uppercase">
                Mức độ: Đe dọa tính mạng
              </span>
            </div>
            <p className="text-xs text-rose-100 mt-0.5">
              Hệ thống Hỗ trợ Quyết định Lâm sàng HIS đã tự động CHẶN lệnh kê đơn
            </p>
          </div>
        </div>

        {/* CLINICAL CONTRAINDICATION DETAILS */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-950">
            <div className="font-bold flex items-center gap-1.5 text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Tiền sử dị ứng của BN {currentPatient.name}:</span>
            </div>
            <p className="text-sm font-bold text-rose-800 pl-5">
              "{allergyBlockerModal.allergen}"
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-800">
            <div>
              Thuốc vừa cố gắng thêm vào đơn: <strong className="text-rose-600 font-bold">{drug.name}</strong>
            </div>
            <div>
              Hoạt chất: <strong className="font-semibold">{drug.activeIngredient}</strong> (Thuộc nhóm Beta-lactam / Aminopenicillin)
            </div>
            <div className="text-rose-700 font-semibold pt-1 border-t border-slate-200">
              ⚠️ Nguy cơ lâm sàng: Tái phát sốc phản vệ, co thắt phế quản cấp, suy hô hấp, tụt huyết áp nguy kịch.
            </div>
          </div>

          {/* RECOMMENDED SAFE ALTERNATIVE */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">
                Phác đồ kháng sinh thay thế an toàn (Khuyến nghị dược lâm sàng):
              </span>
              <span className="font-bold text-xs sm:text-sm text-emerald-950 block mt-0.5">
                Zithromax 500mg (Azithromycin) — Nhóm Macrolide
              </span>
              <span className="text-[11px] text-emerald-800">
                Không có phản ứng dị ứng chéo với Penicillin
              </span>
            </div>
            <button
              onClick={handleSelectSafeAlternative}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Đổi sang thuốc này ngay</span>
            </button>
          </div>

          {/* OVERRIDE COLLAPSIBLE SECTION */}
          {showOverrideInput ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs">
              <label className="block font-bold text-amber-950">
                Lý do chuyên môn lâm sàng bắt buộc ghi nhận vào hồ sơ kiểm toán:
              </label>
              <textarea
                rows={2}
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Nhập giải trình của Bác sĩ (Ví dụ: Đã test áp da âm tính dưới giám sát phòng cấp cứu...)"
                className="w-full p-2.5 rounded-lg border border-amber-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-amber-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowOverrideInput(false)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    if (!overrideReason.trim()) {
                      alert('Vui lòng nhập lý do giải trình chuyên môn để ghi nhận Audit Log.');
                      return;
                    }
                    overrideAllergyBlocker(overrideReason);
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold"
                >
                  Xác nhận Ghi đè (Audit Logged)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-right">
              <button
                onClick={() => setShowOverrideInput(true)}
                className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Ghi đè cảnh báo CDS bằng quyền Bác sĩ phụ trách?
              </button>
            </div>
          )}

          {/* CANCEL BUTTON */}
          <div className="flex justify-end pt-2 border-t border-slate-200">
            <button
              onClick={() => setAllergyBlockerModal(null)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
            >
              Đã hiểu & Hủy chọn thuốc dị ứng này
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
