import React, { useState } from 'react';
import { ShieldCheck, X, FileText, CheckCircle2, Lock, UserCheck, AlertTriangle } from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';

interface EConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EConsentModal: React.FC<EConsentModalProps> = ({ isOpen, onClose }) => {
  const { currentPatient, addAuditLog, showToast } = useTelemedicine();
  const [hasAgreed, setHasAgreed] = useState(true);
  const [signatureName, setSignatureName] = useState(currentPatient.name);

  if (!isOpen) return null;

  const handleConfirmConsent = () => {
    if (!hasAgreed) {
      alert('Vui lòng đánh dấu đồng ý với các điều khoản khám chữa bệnh từ xa.');
      return;
    }

    addAuditLog(
      'RECORD_E_CONSENT',
      `Consent/PATIENT-${currentPatient.id}`,
      `Bệnh nhân ${signatureName} đã ký xác nhận e-Consent Khám từ xa theo Nghị định 13/2023/NĐ-CP`
    );

    showToast('Xác thực e-Consent thành công! Hồ sơ đồng thuận đã lưu vào EMR.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Phiếu Đồng Thuận Khám Chữa Bệnh Từ Xa (e-Consent)</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  Nghị định 13/2023/NĐ-CP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tuân thủ Luật Khám bệnh, chữa bệnh 2023 & Quy định bảo vệ dữ liệu cá nhân nhạy cảm
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

        {/* LEGAL BODY */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 space-y-1">
            <div className="font-bold">Bệnh nhân tham gia: {currentPatient.name} (Mã BN: {currentPatient.id})</div>
            <div>Cơ sở y tế: <strong>Bệnh viện Đa Khoa Quốc Tế</strong> • Bác sĩ phụ trách: <strong>BS.CKII Vũ Minh Đức</strong></div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase">1. Bản chất và giới hạn của Khám chữa bệnh từ xa</h4>
            <p>
              Khám chữa bệnh từ xa là hình thức tư vấn, đánh giá lâm sàng thông qua công nghệ truyền thông thoại, video và thiết bị đo IoT gia đình. Mặc dù bác sĩ nỗ lực thu thập thông tin chuẩn xác nhất, phiên khám từ xa có thể bị giới hạn do không thực hiện được các thao tác khám sờ, gõ, đo trực tiếp tại giường bệnh. Trong trường hợp có dấu hiệu cấp cứu nguy kịch, người bệnh cần đến ngay cơ sở y tế gần nhất.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase">2. Thu thập, xử lý và bảo vệ dữ liệu cá nhân nhạy cảm</h4>
            <p>
              Căn cứ Nghị định 13/2023/NĐ-CP, hồ sơ bệnh án, hình ảnh X-Quang/CT, kết quả xét nghiệm máu và luồng âm thanh/video phiên khám được xếp vào nhóm <strong>Dữ liệu cá nhân nhạy cảm</strong>. Hệ thống áp dụng mã hóa đầu cuối TLS 1.3 và lưu trữ bất biến (Tamper-proof) trong thời hạn tối thiểu 10 năm theo quy định Bộ Y Tế. Dữ liệu chỉ được chia sẻ cho các bác sĩ tham gia hội chẩn phiên khám.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase">3. Quyền của Người bệnh</h4>
            <p>
              Người bệnh có quyền yêu cầu xem lại toàn bộ hồ sơ bệnh án điện tử (EMR), tải đơn thuốc điện tử quốc gia, kiểm tra nhật ký truy cập (Audit Trail) và yêu cầu tạm dừng phiên khám bất kỳ lúc nào.
            </p>
          </div>

          {/* SIGNATURE CONFIRMATION */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 pt-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAgreed}
                onChange={e => setHasAgreed(e.target.value as any)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
              <span className="font-semibold text-slate-800">
                Tôi đã đọc kỹ, hiểu rõ toàn bộ nội dung và tự nguyện đồng ý tham gia phiên khám chữa bệnh từ xa theo các điều khoản trên.
              </span>
            </label>

            <div className="flex items-center gap-3 pt-1">
              <span className="font-bold text-slate-700">Chữ ký điện tử / Họ tên người bệnh:</span>
              <input
                type="text"
                value={signatureName}
                onChange={e => setSignatureName(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 text-xs w-56 bg-white"
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            e-Consent Hash SHA-256: 7f8a9102c4b... (Tự động ghi nhận)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleConfirmConsent}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Xác Nhận Ký e-Consent</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
