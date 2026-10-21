import React from 'react';
import {
  CreditCard, QrCode, CheckCircle2, Barcode, Building2,
  Home, ShieldCheck, ArrowRight, RefreshCw, Download, Check
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';

export const Step3VietQrPayment: React.FC = () => {
  const {
    cpoeOrders,
    cpoeFulfillmentMode,
    cpoePaymentStatus,
    simulatePaymentSuccess,
    currentPatient,
    setPatientCurrentStep
  } = useTelemedicine();

  const selectedOrders = cpoeOrders.filter(o => o.selected);
  const totalAmount = selectedOrders.reduce((sum, item) => sum + item.price, 0);
  const consultationFee = 250000; // Tiền khám từ xa chuyên khoa
  const grandTotal = totalAmount + consultationFee;
  const bhytDiscount = Math.round(grandTotal * 0.7); // BHYT thanh toán 70%
  const finalPatientAmount = grandTotal - bhytDiscount;

  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="space-y-5 text-xs sm:text-sm">
      
      {/* 1. FAST-TRACK BARCODE & FULFILLMENT CARD */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {cpoeFulfillmentMode === 'fast_track_hospital'
              ? 'Lấy mẫu Fast-track ưu tiên tại Bệnh viện'
              : 'Điều dưỡng tới nhà lấy mẫu xét nghiệm'}
          </span>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            Mã Barcode Tiếp Nhận Cận Lâm Sàng Tự Động (LIS Kiosk)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Khi đến bệnh viện, quét mã này tại Kiosk Tiếp Nhận để được in tem ống máu và vào thẳng phòng lấy mẫu không cần xếp hàng.
          </p>
        </div>

        {/* BARCODE GRAPHIC */}
        <div className="p-3 bg-slate-950 text-white rounded-xl flex flex-col items-center justify-center shrink-0 border border-slate-800 shadow-md">
          <Barcode className="w-36 h-9 text-white" />
          <span className="font-mono text-xs font-bold tracking-widest text-emerald-400 mt-1">
            BN-2026-0892-CLS
          </span>
          <span className="text-[9px] text-slate-400 mt-0.5">Mã liên thông LIS/RIS</span>
        </div>
      </div>

      {/* 2. CPOE ORDERED SERVICES LIST & INVOICE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT: ITEMIZED SERVICES LIST (7/12 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
          <h4 className="font-bold text-xs uppercase tracking-wide text-slate-800 flex items-center justify-between">
            <span>Chi tiết các chỉ định Bác sĩ vừa ban hành ({selectedOrders.length} dịch vụ):</span>
            <span className="text-[11px] font-normal text-slate-500">Mã phiếu: CPOE-8891</span>
          </h4>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {/* Consultation fee */}
            <div className="p-3 flex items-center justify-between bg-slate-50/60 text-xs">
              <div>
                <div className="font-bold text-slate-900">Phí khám Telemedicine Chuyên khoa Nội</div>
                <div className="text-[11px] text-slate-500">BS.CKII Vũ Minh Đức phụ trách phiên khám</div>
              </div>
              <span className="font-bold text-slate-800">{formatVnd(consultationFee)}</span>
            </div>

            {/* CPOE lab/imaging orders */}
            {selectedOrders.map(item => (
              <div key={item.id} className="p-3 flex items-center justify-between bg-white text-xs hover:bg-slate-50 transition">
                <div>
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {item.department} {item.sampleType ? `• ${item.sampleType}` : ''}
                  </div>
                </div>
                <span className="font-bold text-slate-800">{formatVnd(item.price)}</span>
              </div>
            ))}
          </div>

          {/* Breakdown summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-xs text-slate-700">
            <div className="flex justify-between">
              <span>Tổng viện phí ban đầu:</span>
              <span className="font-semibold">{formatVnd(grandTotal)}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>Bảo hiểm y tế (BHYT) chi trả theo quyền lợi:</span>
              <span className="font-semibold">- {formatVnd(bhytDiscount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Số tiền người bệnh thực tế cần thanh toán:</span>
              <span className="text-base text-blue-600 font-extrabold">{formatVnd(finalPatientAmount)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT: DYNAMIC VIETQR / NAPAS PAYMENT CARD (5/12 cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col justify-between gap-4">
          
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Napas 247 • VietQR Pro
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                cpoePaymentStatus === 'paid'
                  ? 'bg-emerald-500 text-slate-950 font-extrabold'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              }`}>
                {cpoePaymentStatus === 'paid' ? 'ĐÃ THU TIỀN (Auto-Reconciled)' : 'CHỜ QUÉT MÃ QR'}
              </span>
            </div>

            <h3 className="text-base font-bold mt-2">
              Quét Mã VietQR Thanh Toán Tự Động
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Mở bất kỳ ứng dụng ngân hàng hoặc ví điện tử (VNPAY, MoMo, Viettel Money) để quét
            </p>
          </div>

          {/* DYNAMIC QR CODE CONTAINER */}
          <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center text-slate-900 shadow-lg">
            {cpoePaymentStatus === 'paid' ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="font-extrabold text-base text-emerald-800">
                  THANH TOÁN THÀNH CÔNG!
                </div>
                <p className="text-xs text-slate-600">
                  Hệ thống HIS đã tự động gạch nợ và xác thực mã Barcode lấy mẫu xét nghiệm.
                </p>
              </div>
            ) : (
              <>
                {/* Simulated dynamic VietQR graphic */}
                <div className="w-48 h-48 bg-slate-900 p-2.5 rounded-xl flex items-center justify-center relative shadow-inner">
                  <div className="w-full h-full bg-white rounded-lg p-2 flex flex-col items-center justify-center relative">
                    {/* SVG QR Code Simulation */}
                    <svg className="w-36 h-36 text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                      <rect x="0" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="5" width="20" height="20" fill="white" />
                      <rect x="10" y="10" width="10" height="10" fill="currentColor" />

                      <rect x="70" y="0" width="30" height="30" fill="currentColor" />
                      <rect x="75" y="5" width="20" height="20" fill="white" />
                      <rect x="80" y="10" width="10" height="10" fill="currentColor" />

                      <rect x="0" y="70" width="30" height="30" fill="currentColor" />
                      <rect x="5" y="75" width="20" height="20" fill="white" />
                      <rect x="10" y="80" width="10" height="10" fill="currentColor" />

                      <rect x="36" y="10" width="8" height="8" />
                      <rect x="48" y="10" width="12" height="6" />
                      <rect x="36" y="24" width="16" height="6" />
                      <rect x="36" y="36" width="28" height="8" />
                      <rect x="10" y="36" width="16" height="8" />
                      <rect x="70" y="36" width="20" height="8" />
                      <rect x="36" y="50" width="10" height="14" />
                      <rect x="52" y="50" width="16" height="8" />
                      <rect x="74" y="50" width="16" height="14" />
                      <rect x="36" y="70" width="14" height="20" />
                      <rect x="56" y="70" width="10" height="10" />
                      <rect x="72" y="70" width="18" height="20" />
                    </svg>
                    {/* Hospital mini logo in center */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md border-2 border-white">
                        HIS
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-2 space-y-0.5">
                  <div className="font-extrabold text-sm text-slate-900">
                    Số tiền: <span className="text-blue-700">{formatVnd(finalPatientAmount)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Nội dung: HIS {currentPatient.id.split('-').pop()} CLS
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SIMULATE PAYMENT BUTTON */}
          {cpoePaymentStatus !== 'paid' ? (
            <button
              onClick={simulatePaymentSuccess}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Mô phỏng Quét QR Thanh toán Thành công</span>
            </button>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs text-center font-semibold flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Đã hoàn tất thanh toán & đối soát viện phí</span>
            </div>
          )}

        </div>

      </div>

      {/* ADVANCE TO STEP 4 BUTTON */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setPatientCurrentStep(4)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
        >
          <span>Xem Đơn thuốc Quốc gia, Nhắc thuốc & Theo dõi sau khám (Bước 4)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
