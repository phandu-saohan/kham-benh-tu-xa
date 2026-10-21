import React, { useState } from 'react';
import { QrCode, X, Download, ShieldCheck, ExternalLink, Check, Copy, Pill, Lock } from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';
import { NationalPrescriptionService } from '../services/nationalPrescriptionService';
import { SmartCaService } from '../services/smartCaService';

interface NationalPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NationalPrescriptionModal: React.FC<NationalPrescriptionModalProps> = ({ isOpen, onClose }) => {
  const { currentPatient, prescriptions, soapNote, nationalPrescriptionCode, showToast } = useTelemedicine();
  const [copied, setCopied] = useState(false);
  const cert = SmartCaService.getCertificateInfo();
  const lookupUrl = `https://donthuocquocgia.vn/tra-cuu?ma_don=${nationalPrescriptionCode}`;

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(nationalPrescriptionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép mã Đơn thuốc Quốc gia vào bộ nhớ tạm!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-950 text-white flex items-center justify-between border-b border-blue-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Hồ Sơ Đơn Thuốc Điện Tử Liên Thông Quốc Gia</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Thông tư 27/2021/TT-BYT
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Cổng Tiếp nhận Thông tin Quản lý Kê đơn thuốc Quốc gia (donthuocquocgia.vn)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* NATIONAL CODE & QR CARD */}
          <div className="p-4 bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block">
                MÃ ĐƠN THUỐC QUỐC GIA (NATIONAL RX ID)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl sm:text-2xl font-mono font-extrabold text-amber-300 tracking-wider">
                  {nationalPrescriptionCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
                  title="Sao chép mã"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-2">
                <span>Cơ sở KCB: <strong>BV Đa Khoa Quốc Tế (Mã: 79012)</strong></span>
                <span>• Bác sĩ: <strong>BS.CKII Vũ Minh Đức</strong></span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl flex flex-col items-center justify-center shrink-0">
              <QrCode className="w-20 h-20 text-slate-950" />
              <span className="text-[9px] font-bold text-slate-600 mt-0.5">donthuocquocgia.vn</span>
            </div>
          </div>

          {/* DIGITAL SIGNATURE VERIFICATION DETAILS */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1.5 text-slate-800">
            <div className="font-bold text-emerald-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Chứng Thư Số Ký Kèm (SmartCA / Cloud PKI Timestamped)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
              <div>• <strong>Người ký:</strong> {cert.subjectName} ({cert.doctorLicenseCode})</div>
              <div>• <strong>Nhà cấp CA:</strong> {cert.issuerName}</div>
              <div>• <strong>Serial No:</strong> <span className="font-mono">{cert.serialNumber}</span></div>
              <div>• <strong>Dấu thời gian:</strong> {cert.tsaTimestamp}</div>
            </div>
          </div>

          {/* PRESCRIBED DRUGS SUMMARY */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase text-slate-800">
              Danh mục thuốc đã liên thông ({prescriptions.length} khoản):
            </h4>
            <div className="space-y-1.5">
              {prescriptions.map((rx, idx) => (
                <div key={rx.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{idx + 1}. {rx.name}</span>
                    <span className="text-[11px] text-slate-500 ml-2">({rx.usage})</span>
                  </div>
                  <span className="font-bold text-blue-700">{rx.quantity} {rx.unit}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <a
            href={lookupUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Mở trang tra cứu trên donthuocquocgia.vn</span>
          </a>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>

      </div>
    </div>
  );
};
