import React, { useState, useRef, useEffect } from 'react';
import {
  Stethoscope, User, ShieldCheck, RefreshCw,
  FileText, SignalHigh, SignalLow, Lock, Database,
  Video, CalendarPlus, LayoutDashboard, SlidersHorizontal,
  ChevronDown, CheckCircle2, AlertCircle, Sparkles
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
    setIsBookingModalOpen
  } = useTelemedicine();

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCallTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const isCallActive = callState.isConnected || callSignaling.status === 'in_call' || callState.callSeconds > 0;

  return (
    <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-md">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-3">
        
        {/* BRAND & MAIN NAVIGATION */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* LOGO */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-base tracking-tight text-white">TeleMed</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">PRO</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                <span className="hidden sm:inline font-medium text-slate-300">BV Đa Khoa Quốc Tế</span>
                <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-600" />
                <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  HIS Online
                </span>
              </div>
            </div>
          </div>

          {/* VIEW SWITCHER: BẢNG ĐIỀU KHIỂN & PHÒNG KHÁM */}
          <nav className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-slate-800 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Bảng Điều Khiển</span>
            </button>

            <button
              onClick={() => setActiveView('consultation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer relative ${
                activeView === 'consultation'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Phòng Khám</span>
              {callSignaling.status === 'calling' && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
              {isCallActive && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse absolute -top-0.5 -right-0.5" />
              )}
            </button>
          </nav>
        </div>

        {/* CENTER / QUICK ACTION: BOOKING & ROLE TOGGLE */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ROLE SWITCHER */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={() => setRole('doctor')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                role === 'doctor'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-blue-200" />
              <span className="hidden md:inline">Bác sĩ</span>
            </button>

            <button
              onClick={() => setRole('patient')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer relative ${
                role === 'patient'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden md:inline">Bệnh nhân</span>
              {soapNote.isPublishedToPatient && role === 'doctor' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-1 -right-1" />
              )}
            </button>
          </div>

          {/* APPOINTMENT BOOKING TRIGGER */}
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/30 transition active:scale-95 cursor-pointer"
            title="Đặt lịch khám bệnh mới (Trực tuyến hoặc Tại viện)"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đặt Lịch</span>
          </button>
        </div>

        {/* RIGHT: CALL REC, NETWORK, TOOLS DROPDOWN & PROFILE */}
        <div className="flex items-center gap-2">
          
          {/* CALL RECORDING PILL (Visible only during active call) */}
          {isCallActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>REC {formatCallTime(callState.callSeconds)}</span>
            </div>
          )}

          {/* COMPACT NETWORK MODE TOGGLE */}
          <button
            onClick={() => setIsLowBandwidth(prev => !prev)}
            title={isLowBandwidth ? 'Đang bật 2G/3G Mạng yếu (Audio + Snapshots) - Nhấn để chuyển HD' : 'Đang bật Băng thông cao (HD Video) - Nhấn để chuyển 2G/3G'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isLowBandwidth
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {isLowBandwidth ? (
              <>
                <SignalLow className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-bold">2G/3G</span>
              </>
            ) : (
              <>
                <SignalHigh className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold">HD</span>
              </>
            )}
          </button>

          {/* CLINICAL & REGULATORY TOOLS DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsToolsOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer ${
                isToolsOpen
                  ? 'bg-slate-700 text-white border-slate-600'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title="Tiện ích & Quy chuẩn pháp lý y tế"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xl:inline text-xs">Tiện ích</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* DROPDOWN MENU */}
            {isToolsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 text-xs space-y-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quy chuẩn & Pháp lý y tế
                  </span>
                </div>

                {/* Audit Log */}
                <button
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsAuditModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-slate-200 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">Nhật ký kiểm toán</div>
                      <div className="text-[10px] text-slate-400">Audit Trail HIPAA/BYT</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-slate-700">
                    {auditLogs.length}
                  </span>
                </button>

                {/* e-Consent NĐ 13 */}
                <button
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsEConsentModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200 transition text-left cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">Phiếu e-Consent</div>
                    <div className="text-[10px] text-slate-400">Nghị định 13/2023/NĐ-CP</div>
                  </div>
                </button>

                {/* Đơn thuốc Quốc gia TT 27 */}
                <button
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsNationalRxModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200 transition text-left cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">Đơn thuốc Quốc gia</div>
                    <div className="text-[10px] text-slate-400">Thông tư 27/2021/TT-BYT</div>
                  </div>
                </button>

                {/* BHYT XML 4210 */}
                <button
                  onClick={() => {
                    setIsToolsOpen(false);
                    setIsBhytXmlModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200 transition text-left cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">Chi phí KCB BHYT</div>
                    <div className="text-[10px] text-slate-400">Định dạng XML 4210</div>
                  </div>
                </button>

                <div className="border-t border-slate-800 my-1" />

                {/* Đồng bộ HIS / EMR */}
                <button
                  onClick={() => {
                    syncWithHis();
                  }}
                  disabled={hisSyncState.isSyncing}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-800 text-slate-200 transition text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                      <RefreshCw className={`w-4 h-4 ${hisSyncState.isSyncing ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">Đồng bộ HIS/EMR</div>
                      <div className="text-[10px] text-slate-400">Lần cuối: {hisSyncState.lastSyncTime}</div>
                    </div>
                  </div>
                  {hisSyncState.isSyncing && (
                    <span className="text-[10px] text-cyan-400 animate-pulse">Đang đồng bộ...</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* USER PROFILE CHIP */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="relative">
              {role === 'doctor' ? (
                <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-400/50 bg-slate-800 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120"
                    alt="Doctor"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-300/40">
                  {currentPatient?.name ? currentPatient.name.split(' ').map(n => n[0]).slice(-2).join('') : 'BN'}
                </div>
              )}
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5" />
            </div>

            <div className="hidden lg:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-slate-200 truncate max-w-[130px]">
                {role === 'doctor' ? 'BS. Vũ Minh Đức' : (currentPatient?.name || 'Nguyễn Văn An')}
              </span>
              <span className="text-[10px] text-slate-400">
                {role === 'doctor' ? 'BS.CKII Nội khoa' : 'Bệnh nhân'}
              </span>
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
