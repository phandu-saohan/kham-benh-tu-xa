import React from 'react';
import {
  Stethoscope, User, Wifi, ShieldCheck, RefreshCw,
  FileText, Activity, AlertCircle, SignalHigh, SignalLow,
  Radio, Lock, Database, Video, CalendarPlus
} from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';

export const TopNavBar: React.FC = () => {
  const {
    role, setRole,
    activeView, setActiveView,
    currentPatient,
    isLowBandwidth, setIsLowBandwidth,
    setIsAuditModalOpen,
    setIsEConsentModalOpen,
    setIsNationalRxModalOpen,
    setIsBhytXmlModalOpen,
    auditLogs,
    callState,
    hisSyncState,
    syncWithHis,
    soapNote,
    callSignaling,
    endCallAndReturnToDashboard,
    setIsBookingModalOpen
  } = useTelemedicine();

  const formatCallTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-[1720px] mx-auto px-4 h-16 flex items-center justify-between gap-3">
        
        {/* LOGO & HIS HL7 FHIR STATUS */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                BV Đa Khoa Quốc Tế
              </span>
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HIS/EMR HL7 FHIR R4 Connected (Online)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden lg:block">
              Hệ thống Khám Bệnh Từ Xa Tích Hợp Bệnh Án Điện Tử & CPOE Đa Chiều
            </p>
          </div>
        </div>

        {/* WORKSPACE & VIEW SWITCHER */}
        <div className="flex items-center gap-2">
          {/* VIEW SWITCHER: DASHBOARD VS CONSULTATION */}
          <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>Bảng Điều Khiển</span>
            </button>

            <button
              onClick={() => setActiveView('consultation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer relative ${
                activeView === 'consultation'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Phòng Khám Lâm Sàng</span>
              {callSignaling.status === 'calling' && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </div>

          {/* ROLE SWITCHER DUAL WORKSPACE */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setRole('doctor')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                role === 'doctor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-blue-200" />
              <span className="hidden sm:inline">Bác sĩ</span>
            </button>

            <button
              onClick={() => setRole('patient')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer relative ${
                role === 'patient'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">Bệnh nhân</span>
              {soapNote.isPublishedToPatient && role === 'doctor' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-1 -right-1" />
              )}
            </button>
          </div>

          {/* APPOINTMENT BOOKING TRIGGER */}
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
            title="Đặt lịch khám bệnh mới (Trực tuyến hoặc Tại viện)"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đặt Lịch Khám</span>
          </button>
        </div>

        {/* CONTROLS: REGULATORY PILLARS + LOW BANDWIDTH + AUDIT LOG */}
        <div className="flex items-center gap-2">
          
          {/* Regulatory Quick Action Buttons */}
          <div className="hidden 2xl:flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setIsEConsentModalOpen(true)}
              className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition cursor-pointer flex items-center gap-1"
              title="Xem Phiếu Chấp thuận e-Consent theo Nghị định 13/2023/NĐ-CP"
            >
              <FileText className="w-3.5 h-3.5 text-teal-400" />
              <span>e-Consent (NĐ 13)</span>
            </button>

            <button
              onClick={() => setIsNationalRxModalOpen(true)}
              className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition cursor-pointer flex items-center gap-1"
              title="Xem Hồ sơ Liên thông donthuocquocgia.vn theo Thông tư 27/2021"
            >
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Đơn thuốc QG (TT 27)</span>
            </button>

            <button
              onClick={() => setIsBhytXmlModalOpen(true)}
              className="px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/80 transition cursor-pointer flex items-center gap-1"
              title="Xuất bảng kê chi phí KCB BHYT XML 4210"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>BHYT XML 4210</span>
            </button>
          </div>
          
          {/* Low-Bandwidth Fallback Toggle (2G/3G) */}
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-2.5 py-1.5 rounded-xl text-xs">
            {isLowBandwidth ? (
              <SignalLow className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <SignalHigh className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <div className="flex flex-col text-left hidden sm:block">
              <span className="text-[10px] text-slate-400 leading-tight">Chế độ đường truyền</span>
              <span className="text-[11px] font-bold text-slate-200">
                {isLowBandwidth ? '2G/3G Mạng yếu' : 'Băng thông cao (HD)'}
              </span>
            </div>
            <button
              onClick={() => setIsLowBandwidth(prev => !prev)}
              title={isLowBandwidth ? 'Nhấn để chuyển sang chế độ Video HD tiêu chuẩn' : 'Nhấn để bật chế độ tiết kiệm băng thông (Audio + HD Snapshots)'}
              className={`ml-1 text-[11px] px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                isLowBandwidth
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {isLowBandwidth ? 'Đang bật 2G/3G' : 'Bật 2G/3G'}
            </button>
          </div>

          {/* Session Recording & Audit Log Modal Button */}
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-mono text-rose-300 font-bold">REC {formatCallTime(callState.callSeconds)}</span>
            </div>
            <span className="hidden xl:inline text-slate-400 border-l border-slate-700 pl-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Audit Log ({auditLogs.length})
            </span>
          </button>

          {/* HIS Resync Trigger Button */}
          <button
            onClick={syncWithHis}
            disabled={hisSyncState.isSyncing}
            title={`Đồng bộ lần cuối lúc ${hisSyncState.lastSyncTime}`}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${hisSyncState.isSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>

      </div>
    </header>
  );
};
