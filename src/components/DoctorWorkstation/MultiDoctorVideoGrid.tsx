import React, { useRef, useEffect, useState } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MonitorUp, Camera,
  UserPlus, Wifi, Radio, Volume2, ShieldAlert, Sparkles, Image as ImageIcon,
  Share2, Maximize2, Minimize2, UserCheck, X, Activity, Stethoscope, RefreshCw
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';
import { StethoscopeDspService } from '../../services/stethoscopeDspService';

export const MultiDoctorVideoGrid: React.FC = () => {
  const {
    callState, setCallState,
    currentPatient,
    isLowBandwidth,
    activeConsultationSpecialist,
    setIsConsultModalOpen,
    removeSpecialist,
    showToast,
    addAuditLog,
    sendChatMessage,
    telemetry,
    triggerRemoteBPMeasurement,
    setStethoscopeFilter
  } = useTelemedicine();

  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDspAudioActive, setIsDspAudioActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);

  // Giả lập hiệu ứng nhấp nháy giọng nói khi đang đàm thoại
  useEffect(() => {
    const timer = setInterval(() => {
      setIsSpeaking(prev => !prev);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // WEBCAM STREAM HANDLER
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (callState.useRealWebcam && !callState.isCamOff) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then(s => {
          stream = s;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.warn('Webcam not accessible:', err);
          showToast('Không thể kích hoạt Camera thật (hoặc chưa cấp quyền). Đang chuyển về luồng video mô phỏng.', 'warning');
          setCallState(prev => ({ ...prev, useRealWebcam: false }));
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [callState.useRealWebcam, callState.isCamOff]);

  const handleTakeSnapshotToEmr = () => {
    const timeStr = new Date().toTimeString().split(' ')[0];
    showToast(`Đã chụp ảnh HD phiên khám (${timeStr}) và lưu đính kèm vào hồ sơ EMR bệnh nhân!`, 'success');
    addAuditLog('CAPTURE_CLINICAL_SNAPSHOT', `Media/Snapshot-${Date.now().toString().slice(-4)}`, 'Bác sĩ chụp ảnh dấu hiệu lâm sàng từ luồng video lưu vào EMR');
    sendChatMessage('Bác sĩ đã chụp ảnh phiên khám lâm sàng để đối chiếu triệu chứng.', {
      type: 'image',
      title: `Ảnh chụp triệu chứng lâm sàng lúc ${timeStr}`,
      tag: 'Snapshot Telemedicine EMR'
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  const toggleDspAudio = () => {
    if (isDspAudioActive) {
      StethoscopeDspService.stop();
      setIsDspAudioActive(false);
      showToast('Đã dừng nghe âm thanh ống nghe điện tử', 'info');
    } else {
      StethoscopeDspService.playAuscultationSound(telemetry.stethoscopeFilter);
      setIsDspAudioActive(true);
      showToast('Đang phát âm thanh ống nghe DSP trực tiếp qua loa Bác sĩ!', 'success');
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : 'aspect-[16/10] w-full'
      }`}
    >
      
      {/* 1. TOP OVERLAY HUD (Thông tin phòng gọi, mã hóa, mạng) */}
      <div className="relative z-30 p-3 sm:p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge ghi hình phiên khám */}
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            REC {formatTime(callState.callSeconds)}
          </span>

          {/* Badge độ trễ & chất lượng WebRTC */}
          <span className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-slate-200 font-medium flex items-center gap-1.5 shadow-xs">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{isLowBandwidth ? '2G/3G Audio HD' : 'WebRTC 1080p HD • 28ms'}</span>
          </span>

          {/* Badge hội chẩn 3 bên nếu có */}
          {activeConsultationSpecialist && (
            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-bold flex items-center gap-1.5 animate-pulse">
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hội Chẩn 3 Chiều</span>
            </span>
          )}
        </div>

        {/* Nút Phóng to toàn màn hình & Chuyển Camera thật */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCallState(prev => ({ ...prev, useRealWebcam: !prev.useRealWebcam }))}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
              callState.useRealWebcam
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Bật/Tắt Webcam thật trên máy tính của bạn"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{callState.useRealWebcam ? 'Tắt Webcam thật' : 'Dùng Webcam thật'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. KHÔNG GIAN VIDEO CALL TRUNG TÂM (IMMERSIVE VIDEO STAGE) */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden">
        {!callState.isConnected ? (
          <div className="text-center p-6 space-y-3 z-20">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/40">
              <PhoneOff className="w-8 h-8" />
            </div>
            <div>
              <p className="text-white font-bold text-base">Cuộc gọi Telemedicine đã ngắt</p>
              <p className="text-slate-400 text-xs mt-1">Đã ngắt phiên video với bệnh nhân {currentPatient.name}</p>
            </div>
            <button
              onClick={() => setCallState(prev => ({ ...prev, isConnected: true }))}
              className="px-5 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-500 transition cursor-pointer shadow-lg inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Kết nối lại cuộc gọi ngay</span>
            </button>
          </div>
        ) : isLowBandwidth ? (
          /* CHẾ ĐỘ MẠNG YẾU (2G/3G FALLBACK): AUDIO STREAM + HD CLINICAL SNAPSHOT */
          <div className="w-full h-full relative flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 select-none">
            <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-amber-400/80 shadow-2xl relative mb-3 bg-slate-800 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold text-2xl border border-blue-400/30">
                {currentPatient.name.split(' ').slice(-1)[0][0]}
              </div>
            </div>

            <h4 className="text-white font-bold text-sm">BN. {currentPatient.name} (Đang thoại)</h4>
            <span className="text-xs text-amber-300 mt-1 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> Đang tối ưu mạng 2G/3G: Luồng thoại Opus 48kHz HD
            </span>

            {/* LIVE AUDIO WAVEFORM VISUALIZER */}
            <div className="flex items-center gap-1.5 h-8 mt-4">
              {[35, 75, 95, 60, 100, 45, 80, 95, 60, 85, 50, 70, 90, 40, 75, 55].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1 bg-gradient-to-t from-amber-400 to-emerald-400 rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          /* CHẾ ĐỘ VIDEO SẮC NÉT (CHÍNH + HỘI CHẨN CHUYÊN GIA) */
          <div className="w-full h-full relative flex select-none">
            
            {/* VÙNG VIDEO BỆNH NHÂN */}
            <div className={`h-full relative flex flex-col items-center justify-center p-4 transition-all duration-300 ${
              activeConsultationSpecialist ? 'w-1/2 border-r border-slate-800/80' : 'w-full'
            }`}>
              
              {/* Avatar Bệnh nhân với Vòng sóng Âm thanh khi phát biểu (Voice Ripple) */}
              <div className="relative">
                {isSpeaking && (
                  <div className="absolute -inset-3 rounded-full bg-emerald-500/20 animate-ping opacity-60" />
                )}
                {isSpeaking && (
                  <div className="absolute -inset-1.5 rounded-full border-2 border-emerald-400/50 animate-pulse" />
                )}

                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-blue-600 via-teal-500 to-emerald-400 p-1 shadow-2xl relative z-10">
                  <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                    <svg className="w-20 h-20 text-blue-200 mt-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" />
                    </svg>
                  </div>
                </div>

                <span className="absolute bottom-0 right-0 z-20 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold shadow-md flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                  Bệnh nhân
                </span>
              </div>

              {/* Tên & Thông tin người bệnh */}
              <div className="mt-3 text-center z-10">
                <h3 className="text-white font-bold text-sm sm:text-base flex items-center justify-center gap-1.5">
                  <span>{currentPatient.name}</span>
                  <span className="text-slate-400 font-normal text-xs">({currentPatient.age} tuổi)</span>
                </h3>
                <p className="text-blue-300 text-xs mt-0.5">
                  Mã hồ sơ: {currentPatient.id} • BHYT: {currentPatient.bhyt}
                </p>
              </div>

              {/* OVERLAY SINH HIỆU THỜI GIAN THỰC GÓC TRÁI DƯỚI */}
              <div className="absolute bottom-20 left-4 z-20 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs text-white shadow-xl space-y-1 hidden sm:block">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-blue-400">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Sinh hiệu BLE IoT đồng bộ</span>
                </div>
                <div className="flex items-center gap-3 text-slate-200">
                  <span>HA: <strong className="text-amber-400">{currentPatient.vitals.bp.value}</strong></span>
                  <span>Mạch: <strong className="text-emerald-400">{currentPatient.vitals.heartRate.value}</strong> bpm</span>
                  <span>SpO2: <strong className="text-cyan-300">{currentPatient.vitals.spo2.value}%</strong></span>
                </div>
              </div>

            </div>

            {/* VÙNG VIDEO CHUYÊN GIA HỘI CHẨN (NẾU ĐƯỢC MỜI) */}
            {activeConsultationSpecialist && (
              <div className="w-1/2 h-full relative flex flex-col items-center justify-center p-4 bg-slate-900/60 transition-all">
                <button
                  onClick={removeSpecialist}
                  title="Kết thúc hội chẩn chuyên gia"
                  className="absolute top-14 right-4 z-20 p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-rose-600 transition cursor-pointer shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-1 shadow-xl">
                  <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center text-white">
                    <span className="font-bold text-xs sm:text-sm text-indigo-300">
                      {activeConsultationSpecialist === 'cardiologist' ? 'BS.Hoàng' : 'DS.Thảo'}
                    </span>
                    <span className="text-[10px] text-slate-400">Chuyên gia</span>
                  </div>
                </div>

                <div className="mt-2.5 text-center">
                  <h4 className="text-white font-bold text-xs sm:text-sm">
                    {activeConsultationSpecialist === 'cardiologist'
                      ? 'BS.CKII Trần Minh Hoàng'
                      : 'Dược sĩ LS. Lê Thu Thảo'}
                  </h4>
                  <p className="text-indigo-300 text-[11px]">
                    {activeConsultationSpecialist === 'cardiologist'
                      ? 'Khoa Tim Mạch Can Thiệp'
                      : 'Khoa Dược Bệnh Viện'}
                  </p>
                </div>
              </div>
            )}

            {/* PICTURE-IN-PICTURE (PIP) CAMERA CỦA BÁC SĨ (GÓC DƯỚI PHẢI) */}
            <div className="absolute bottom-20 right-4 z-20 w-32 sm:w-40 aspect-video rounded-xl bg-slate-900 border-2 border-blue-500 overflow-hidden shadow-2xl transition hover:scale-105">
              {callState.isCamOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[10px]">
                  <VideoOff className="w-4 h-4 text-rose-400 mb-1" />
                  <span>Camera Bác sĩ tắt</span>
                </div>
              ) : callState.useRealWebcam ? (
                <video
                  ref={webcamVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center text-white p-1">
                  <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-xs">
                    BS.Đức
                  </div>
                  <span className="text-[10px] text-slate-300 mt-1 font-semibold">Bạn (Bác sĩ)</span>
                </div>
              )}
              <span className="absolute bottom-1 left-1.5 px-1.5 py-0.2 bg-slate-950/80 rounded text-[9px] text-blue-300 font-bold">
                Bác sĩ chính
              </span>
            </div>

          </div>
        )}
      </div>

      {/* 3. THANH ĐIỀU KHIỂN CUỘC GỌI NỔI (FLOATING CALL CONTROL DOCK - ZOOM/FACETIME STYLE) */}
      <div className="relative z-30 p-2.5 sm:p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
        
        {/* Nút Bật/Tắt Micro */}
        <button
          onClick={() => setCallState(prev => ({ ...prev, isMicMuted: !prev.isMicMuted }))}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
            callState.isMicMuted
              ? 'bg-rose-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={callState.isMicMuted ? 'Bật Micro (Unmute)' : 'Tắt Micro (Mute)'}
        >
          {callState.isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Nút Bật/Tắt Camera */}
        <button
          onClick={() => setCallState(prev => ({ ...prev, isCamOff: !prev.isCamOff }))}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer shadow-md ${
            callState.isCamOff
              ? 'bg-rose-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-white'
          }`}
          title={callState.isCamOff ? 'Bật Camera' : 'Tắt Camera'}
        >
          {callState.isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>

        {/* Nút Chia sẻ Màn hình */}
        <button
          onClick={() => {
            setCallState(prev => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
            showToast('Đang chia sẻ màn hình Kết quả Cận lâm sàng & PACS cho Bệnh nhân xem trực quan.', 'info');
          }}
          className={`px-3 h-10 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
            callState.isScreenSharing
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
          title="Chia sẻ màn hình chẩn đoán cho người bệnh"
        >
          <MonitorUp className="w-4 h-4" />
          <span className="hidden sm:inline">Chia sẻ màn hình</span>
        </button>

        {/* Nút Chụp ảnh Snapshot lâm sàng lưu vào EMR */}
        <button
          onClick={handleTakeSnapshotToEmr}
          className="px-3 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 flex items-center gap-1.5 transition cursor-pointer shadow-md"
          title="Chụp ảnh triệu chứng lưu tức thì vào hồ sơ bệnh án EMR"
        >
          <Camera className="w-4 h-4 text-teal-400" />
          <span className="hidden sm:inline">Chụp EMR</span>
        </button>

        {/* Nút Đo Huyết Áp Từ Xa Trực Tiếp Trên Thanh Cuộc Gọi */}
        <button
          onClick={triggerRemoteBPMeasurement}
          disabled={telemetry.isTriggeringRemoteBP}
          className={`px-3 h-10 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
            telemetry.isTriggeringRemoteBP
              ? 'bg-amber-500 text-slate-950 animate-pulse'
              : 'bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-200'
          }`}
          title="Gửi lệnh kích hoạt bao đo huyết áp Omron tại nhà bệnh nhân"
        >
          <Activity className="w-4 h-4 text-blue-300" />
          <span className="hidden md:inline">
            {telemetry.isTriggeringRemoteBP ? `Đang đo (${telemetry.remoteBpCountdown}s)` : 'Đo Huyết Áp Từ Xa'}
          </span>
        </button>

        {/* Nút Nghe Ống Nghe DSP Trực Tiếp Trên Thanh Cuộc Gọi */}
        <button
          onClick={toggleDspAudio}
          className={`px-3 h-10 rounded-full text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
            isDspAudioActive
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-teal-900/60 hover:bg-teal-800 border border-teal-700 text-teal-200'
          }`}
          title="Phát luồng âm thanh tim/phổi đã lọc tần số DSP trực tiếp"
        >
          <Stethoscope className="w-4 h-4 text-teal-300" />
          <span className="hidden md:inline">{isDspAudioActive ? 'Dừng Nghe' : 'Ống Nghe DSP'}</span>
        </button>

        {/* Nút Mời Hội Chẩn */}
        <button
          onClick={() => setIsConsultModalOpen(true)}
          className="px-3 h-10 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
          title="Mời Bác sĩ Tim mạch hoặc Dược sĩ lâm sàng vào cuộc gọi"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden lg:inline">Hội chẩn</span>
        </button>

        {/* Nút Gác máy / Kết thúc cuộc gọi (Nổi bật màu Đỏ) */}
        <button
          onClick={() => setCallState(prev => ({ ...prev, isConnected: !prev.isConnected }))}
          className={`px-4 sm:px-5 h-10 rounded-full text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
            callState.isConnected
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
          title={callState.isConnected ? 'Kết thúc cuộc gọi' : 'Bắt đầu cuộc gọi'}
        >
          <PhoneOff className="w-4 h-4" />
          <span>{callState.isConnected ? 'Kết thúc' : 'Gọi lại'}</span>
        </button>

      </div>

    </div>
  );
};
