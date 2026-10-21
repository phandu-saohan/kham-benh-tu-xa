import React from 'react';
import {
  FileText, CheckSquare, Square, QrCode, Home, Building2,
  CreditCard, CheckCircle2, ChevronRight, Barcode, ShieldCheck,
  PlusCircle, RefreshCw
} from 'lucide-react';
import { useTelemedicine } from '../../../context/TelemedicineContext';

export const Tab3CpoeOrders: React.FC = () => {
  const {
    cpoeOrders,
    toggleCpoeOrder,
    cpoeFulfillmentMode,
    setCpoeFulfillmentMode,
    isCpoeSubmitted,
    cpoePaymentStatus,
    submitCpoeOrders,
    currentPatient,
    setActiveEmrTab
  } = useTelemedicine();

  const selectedOrders = cpoeOrders.filter(o => o.selected);
  const totalAmount = selectedOrders.reduce((sum, item) => sum + item.price, 0);
  const bhytCoverage = Math.round(totalAmount * 0.8); // 80% BHYT
  const patientPay = totalAmount - bhytCoverage;

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-4 text-xs sm:text-sm">
      
      {/* 1. HEADER & FULFILLMENT SELECTOR */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
              Chỉ Định Cận Lâm Sàng Điện Tử (CPOE - Computerized Physician Order Entry)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Tự động tạo phiếu chỉ định HIS, mã hóa Barcode LIS/RIS và đẩy hóa đơn sang Cổng Bệnh nhân
          </p>
        </div>

        {/* Fulfillment Mode Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
          <button
            onClick={() => setCpoeFulfillmentMode('fast_track_hospital')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              cpoeFulfillmentMode === 'fast_track_hospital'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Cấp mã Barcode Fast-track tại viện</span>
          </button>

          <button
            onClick={() => setCpoeFulfillmentMode('home_sampling')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              cpoeFulfillmentMode === 'home_sampling'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Đặt lịch điều dưỡng lấy mẫu tại nhà</span>
          </button>
        </div>
      </div>

      {/* 2. ORDER CATALOG SELECTION LIST */}
      <div className="space-y-2">
        <h5 className="font-bold text-xs uppercase text-slate-700">
          Danh mục Xét nghiệm (LIS) & Chẩn đoán hình ảnh (RIS) đề xuất:
        </h5>

        <div className="space-y-2">
          {cpoeOrders.map(order => (
            <div
              key={order.id}
              onClick={() => toggleCpoeOrder(order.id)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                order.selected
                  ? 'bg-blue-50/70 border-blue-400 shadow-2xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-1 rounded-md ${order.selected ? 'text-blue-600' : 'text-slate-400'}`}>
                  {order.selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{order.name}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {order.code}
                    </span>
                    {order.fastTrackAvailable && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Hỗ trợ Fast-track
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {order.department} {order.sampleType ? `• ${order.sampleType}` : ''}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900 text-xs">
                  {formatVnd(order.price)}
                </div>
                <div className="text-[10px] text-slate-400">
                  BHYT hỗ trợ 80%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. COST SUMMARY & BARCODE PREVIEW */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider block">
            Tổng hợp viện phí chỉ định Cận lâm sàng
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-white">
              {formatVnd(totalAmount)}
            </span>
            <span className="text-xs text-slate-300">
              (BHYT chi trả: <strong>{formatVnd(bhytCoverage)}</strong> • Bệnh nhân cùng chi trả: <strong className="text-amber-300">{formatVnd(patientPay)}</strong>)
            </span>
          </div>
          <div className="text-xs text-slate-300 mt-1 flex items-center gap-2">
            <span>Hình thức: <strong>{cpoeFulfillmentMode === 'fast_track_hospital' ? 'Lấy mẫu Fast-track tại viện' : 'Điều dưỡng đến nhà lấy mẫu'}</strong></span>
            <span>• Trạng thái: <strong className={cpoePaymentStatus === 'paid' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {cpoePaymentStatus === 'paid' ? 'ĐÃ THU TIỀN (Auto-Reconciled)' : 'CHỜ THANH TOÁN VIETQR'}
            </strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white rounded-xl text-slate-900 flex flex-col items-center justify-center shrink-0">
            <Barcode className="w-24 h-7 text-slate-900" />
            <span className="font-mono text-[9px] font-bold tracking-widest mt-0.5">
              BN-2026-0892-CLS
            </span>
          </div>

          <button
            onClick={submitCpoeOrders}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-blue-200" />
            <span>Ban Hành Lệnh CPOE & Đẩy VietQR</span>
          </button>
        </div>
      </div>

      {/* ACTION NEXT BUTTON */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setActiveEmrTab('soap')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <span>Sang Bệnh án SOAP & Chẩn đoán ICD-10</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
