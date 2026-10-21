import React, { useEffect } from 'react';
import {
  PhoneCall, PhoneOff, Video, ShieldCheck, Stethoscope,
  Volume2, VolumeX, Sparkles, Building2, BellRing
} from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';
import { RingtoneService } from '../services/ringtoneService';

export const IncomingCallModal: React.FC = () => {
  const {
    callSignaling,
    acceptIncomingCall,
    declineIncomingCall,
    role
  } = useTelemedicine();

  // Chỉ hiển thị khi có cuộc gọi đến và đang ở vai trò Bệnh nhân (hoặc đối tác nhận cuộc gọi)
  if (callSignaling.status !== 'incoming') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Background Ripple Animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-96 h-96 rounded-full bg-emerald-500/10 animate-ping duration-1000" />
        <div className="w-[30rem] h-[30rem] rounded-full bg-blue-500/10 animate-pulse duration-700 absolute" />
      </div>

      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center text-white overflow-hidden">
        {/* Glow Accent Top */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Header Alert Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-6 animate-bounce">
          <BellRing className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>CUỘC GỌI KHÁM BỆNH TRỰC TUYẾN ĐẾN...</span>
        </div>

        {/* Doctor Avatar with Animated Rings */}
        <div className="relative mx-auto w-28 h-28 mb-5">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-400/40 animate-ping" />
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-emerald-500 shadow-xl shadow-emerald-500/30 bg-slate-800">
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=260"
              alt="Bác sĩ điều trị"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full border-2 border-slate-900 shadow">
            <Video className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Doctor Information */}
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          {callSignaling.callerName || 'BS.CKII Vũ Minh Đức'}
        </h3>
        <p className="text-sm font-semibold text-emerald-400 mt-1">
          {callSignaling.callerTitle || 'Bác sĩ phụ trách - Khoa Nội'}
        </p>

        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Bệnh viện Đa khoa Quốc tế (Phòng khám số 04)</span>
        </div>

        {/* Security & Regulatory Notice */}
        <div className="mt-5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Mã hóa đầu cuối WebRTC • Bảo vệ dữ liệu NĐ 13/2023/NĐ-CP</span>
        </div>

        {/* Call Sound Synthesizer Notice */}
        <p className="text-[11px] text-slate-400 mt-3 flex items-center justify-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Chuông âm thanh Web Audio đang phát...</span>
        </p>

        {/* Action Buttons: Green Accept & Red Decline */}
        <div className="grid grid-cols-2 gap-4 mt-7 pt-4 border-t border-slate-800">
          {/* Decline Button */}
          <button
            onClick={declineIncomingCall}
            className="flex flex-col items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 transition active:scale-95 cursor-pointer font-bold text-sm shadow-lg hover:shadow-rose-900/30 group"
          >
            <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/40 group-hover:scale-110 transition">
              <PhoneOff className="w-6 h-6" />
            </div>
            <span>Từ chối</span>
          </button>

          {/* Accept Button */}
          <button
            onClick={acceptIncomingCall}
            className="flex flex-col items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition active:scale-95 cursor-pointer shadow-xl shadow-emerald-600/40 group"
          >
            <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-md group-hover:scale-110 transition animate-bounce">
              <PhoneCall className="w-6 h-6 fill-emerald-600" />
            </div>
            <span>Nhận cuộc gọi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
