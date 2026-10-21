import React, { useState } from 'react';
import { FileCode, X, Download, Copy, Check, ShieldCheck, Database } from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';
import { BhytXmlService } from '../services/bhytXmlService';

interface BhytXmlExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BhytXmlExportModal: React.FC<BhytXmlExportModalProps> = ({ isOpen, onClose }) => {
  const { currentPatient, prescriptions, cpoeOrders, soapNote, showToast } = useTelemedicine();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const xmlContent = BhytXmlService.generateXml4210(
    currentPatient,
    prescriptions,
    cpoeOrders,
    soapNote.primaryIcd
  );

  const handleCopyXml = () => {
    navigator.clipboard.writeText(xmlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Đã sao chép nội dung XML 4210 BHYT vào bộ nhớ tạm!', 'success');
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `XML4210_${currentPatient.id}_KCB_TU_XA.xml`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã tải về tệp XML 4210 giám định BHYT cho mã BN ${currentPatient.id}!`, 'success');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-300 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Hồ Sơ Giám Định BHYT Chuẩn XML 4210 / 130</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  BHXH Việt Nam
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bảng kê tổng hợp chi phí khám bệnh từ xa, đơn thuốc và cận lâm sàng đề nghị BHYT thanh toán
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

        {/* XML PREVIEW AREA */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Định dạng: <strong>XML 4210 Schema v2.1</strong> (Mã liên thông: LK-2026-0892)</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyXml}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã chép XML' : 'Sao chép XML'}</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 bg-slate-950 text-emerald-400 p-4 rounded-xl overflow-auto text-[11px] font-mono leading-relaxed border border-slate-800 select-all">
            {xmlContent}
          </pre>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Thẻ BHYT: <strong>{currentPatient.bhyt}</strong> • Mức hưởng: <strong>80%</strong>
          </span>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleDownloadXml}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Tải Tệp XML 4210 Gửi Cổng BHXH</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
