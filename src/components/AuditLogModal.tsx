import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, X, Download, Filter, AlertTriangle, CheckCircle2,
  Clock, User, Database, Lock, Link2, Check, RefreshCw
} from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';
import { AuditBlockchainService, ChainedAuditLog } from '../services/auditBlockchainService';

export const AuditLogModal: React.FC = () => {
  const { isAuditModalOpen, setIsAuditModalOpen, auditLogs, currentPatient, showToast } = useTelemedicine();
  const [filterType, setFilterType] = useState<'ALL' | 'SUCCESS' | 'WARN' | 'BLOCKED'>('ALL');
  const [chainedLogs, setChainedLogs] = useState<ChainedAuditLog[]>([]);
  const [verificationResult, setVerificationResult] = useState<{ isValid: boolean; report: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // BUILD TAMPER-PROOF HASH CHAIN
  useEffect(() => {
    if (isAuditModalOpen) {
      AuditBlockchainService.buildAuditChain(auditLogs).then(res => {
        setChainedLogs(res);
      });
    }
  }, [isAuditModalOpen, auditLogs]);

  if (!isAuditModalOpen) return null;

  const filteredLogs = chainedLogs.filter(log => {
    if (filterType === 'ALL') return true;
    return log.status === filterType;
  });

  const handleVerifyIntegrity = async () => {
    setIsVerifying(true);
    setTimeout(async () => {
      const res = await AuditBlockchainService.verifyChainIntegrity(chainedLogs);
      setVerificationResult({ isValid: res.isValid, report: res.verificationReport });
      setIsVerifying(false);
      showToast(res.verificationReport, res.isValid ? 'success' : 'error');
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-300 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">Nhật Ký Bảo Mật & Kiểm Toán EMR (Tamper-Proof Audit Chain)</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                  Nghị định 85 Cấp độ 3 & HL7 FHIR AuditEvent
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chuỗi băm SHA-256 bất biến, ghi nhận mọi thao tác đọc/ghi EMR, lệnh IoT và chấp thuận e-Consent
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuditModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLS & FILTER */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700">Lọc trạng thái:</span>
            <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg text-xs">
              {(['ALL', 'SUCCESS', 'WARN', 'BLOCKED'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                    filterType === type
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {type === 'ALL' ? 'Tất cả' : type === 'SUCCESS' ? 'Thành công' : type === 'WARN' ? 'Cảnh báo' : 'Bị chặn (CDS)'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerifyIntegrity}
              disabled={isVerifying}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Link2 className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Đang thẩm định...' : 'Xác thực Chuỗi Băm SHA-256'}</span>
            </button>
          </div>
        </div>

        {/* VERIFICATION REPORT BANNER (IF VERIFIED) */}
        {verificationResult && (
          <div className={`px-6 py-2.5 border-b text-xs font-semibold flex items-center gap-2 ${
            verificationResult.isValid
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}>
            {verificationResult.isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{verificationResult.report}</span>
          </div>
        )}

        {/* LOG TABLE LIST */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredLogs.map(log => {
            const isBlocked = log.status === 'BLOCKED';
            const isWarn = log.status === 'WARN';
            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border text-xs transition ${
                  isBlocked
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : isWarn
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-800 shadow-2xs hover:border-blue-300'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Block #{log.blockIndex} • {log.timestamp}
                    </span>
                    <span className="font-bold text-blue-700">{log.action}</span>
                    <span className="text-slate-500">[{log.resource}]</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {log.actorName} ({log.role})
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      isBlocked
                        ? 'bg-rose-600 text-white'
                        : isWarn
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                </div>

                <div className="font-medium text-slate-700 mb-1.5">
                  {log.details}
                </div>

                {/* HASH CHAIN FOOTPRINT */}
                <div className="pt-2 border-t border-slate-200/60 font-mono text-[10px] text-slate-500 space-y-0.5 bg-slate-50/80 p-2 rounded-lg">
                  <div className="truncate">
                    Prev Hash: <span className="text-slate-600">{log.previousHash}</span>
                  </div>
                  <div className="truncate text-blue-700 font-bold">
                    Curr Hash: <span>{log.currentHash}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 text-[11px] text-slate-500">
                  <span>Trạng thái chấp thuận: <strong className="text-slate-700">{log.consentStatus}</strong></span>
                  <span className="font-mono">Audit ID: {log.id}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Tổng cộng: <strong>{filteredLogs.length}</strong> khối kiểm toán liên kết chuỗi SHA-256.
          </span>
          <button
            onClick={() => setIsAuditModalOpen(false)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng bảng nhật ký
          </button>
        </div>

      </div>
    </div>
  );
};
