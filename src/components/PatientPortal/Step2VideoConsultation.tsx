import React, { useRef, useState, useEffect } from 'react';
import {
  Video, VideoOff, Mic, MicOff, Stethoscope, Image as ImageIcon,
  Camera, Send, Layers, ShieldCheck, ChevronRight, MessageSquare,
  Radio, Volume2, UserCheck, PhoneOff, RefreshCw, Activity, Heart,
  Droplets, X, Maximize2, Minimize2, Sparkles, SwitchCamera
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';

export const Step2VideoConsultation: React.FC = () => {
  const {
    currentPatient,
    callState, setCallState,
    isLowBandwidth,
    activeConsultationSpecialist,
    dicomState,
    chatMessages,
    sendChatMessage,
    setPatientCurrentStep,
    showToast
  } = useTelemedicine();

  const [chatInput, setChatInput] = useState('');
  const [activeSideDrawer, setActiveSideDrawer] = useState<'none' | 'dicom' | 'chat'>('none');
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(true);
  const patientDicomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);

  // Giả lập hiệu ứng Bác sĩ đang nói chuyện
  useEffect(() => {
    const timer = setInterval(() => {
      setIsDoctorSpeaking(prev => !prev);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  // Tự động mở drawer xem phim X-quang khi Bác sĩ vẽ thêm chú thích mới
  useEffect(() => {
    if (dicomState.annotations.length > 1) {
      setActiveSideDrawer('dicom');
    }
  }, [dicomState.annotations.length]);

  // WEBCAM STREAM CHO BỆNH NHÂN
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
          console.warn('Patient webcam access error:', err);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [callState.useRealWebcam, callState.isCamOff]);

  // RENDER SYNCHRONIZED DICOM CANVAS FOR PATIENT (LIVE SHARING FROM DOCTOR!)
  useEffect(() => {
    const canvas = patientDicomCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw baseline DICOM image
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(dicomState.pan.x + width / 2, dicomState.pan.y + height / 2);
    ctx.scale(dicomState.zoom, dicomState.zoom);
    ctx.translate(-width / 2, -height / 2);

    const brightnessAdjust = (dicomState.windowLevel - 128) / 128;
    const contrastAdjust = dicomState.windowWidth / 256;

    // Thorax anatomy
    const gradient = ctx.createRadialGradient(width / 2, height / 2 - 20, 30, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, `rgba(40, 50, 70, ${0.4 * contrastAdjust})`);
    gradient.addColorStop(0.5, `rgba(20, 25, 40, ${0.6 * contrastAdjust})`);
    gradient.addColorStop(1, `rgba(10, 12, 18, 0.95)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(30, 15, width - 60, height - 30);

    // Lung fields
    ctx.fillStyle = `rgba(15, 20, 30, ${0.85 * contrastAdjust})`;
    ctx.beginPath();
    ctx.ellipse(width * 0.32, height * 0.45, 55, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(width * 0.68, height * 0.45, 55, 90, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mediastinum & spine
    const boneAlpha = Math.min(1, Math.max(0.2, (0.6 + brightnessAdjust * 0.3) * contrastAdjust));
    ctx.fillStyle = `rgba(190, 205, 225, ${boneAlpha})`;
    ctx.fillRect(width * 0.47, 15, 30, height - 30);

    // Cardiac shadow
    ctx.fillStyle = `rgba(170, 190, 215, ${boneAlpha * 0.75})`;
    ctx.beginPath();
    ctx.arc(width * 0.44, height * 0.48, 45, 0, Math.PI * 2);
    ctx.fill();

    // VITAL: RENDER DOCTOR'S REAL-TIME ANNOTATIONS (RED PEN & BOXES & RULER!)
    dicomState.annotations.forEach(ann => {
      ctx.strokeStyle = ann.color || '#ef4444';
      ctx.fillStyle = ann.color || '#ef4444';
      ctx.lineWidth = 2.5;

      if (ann.type === 'pen' && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
      } else if (ann.type === 'box' && ann.points.length >= 2) {
        const p1 = ann.points[0];
        const p2 = ann.points[1];
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        if (ann.label) {
          ctx.font = '11px sans-serif';
          ctx.fillText(`★ Bác sĩ chỉ vị trí: ${ann.label}`, Math.min(p1.x, p2.x), Math.min(p1.y, p2.y) - 6);
        }
      } else if (ann.type === 'ruler' && ann.points.length >= 2) {
        const p1 = ann.points[0];
        const p2 = ann.points[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.fillRect(p1.x - 3, p1.y - 3, 6, 6);
        ctx.fillRect(p2.x - 3, p2.y - 3, 6, 6);
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`Kích thước đo: ${ann.measurementMm} mm`, (p1.x + p2.x) / 2 + 5, (p1.y + p2.y) / 2 - 5);
      }
    });

    ctx.restore();

    // Patient HUD tag
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px monospace';
    ctx.fillText('MÀN HÌNH GIẢI THÍCH PHIM DICOM PACS (ĐỒNG BỘ TỪ BÁC SĨ)', 10, 18);
  }, [dicomState, activeSideDrawer]);

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  const handleUploadClinicalPhoto = (type: 'throat' | 'rx') => {
    if (type === 'throat') {
      sendChatMessage('Tôi vừa chụp ảnh niêm mạc vùng họng và lưỡi gửi bác sĩ xem giúp ạ.', {
        type: 'image',
        title: 'Ảnh chụp cận cảnh niêm mạc họng & lưỡi',
        tag: 'Dấu hiệu lâm sàng'
      });
      showToast('Đã gửi ảnh triệu chứng cho Bác sĩ!', 'success');
    } else {
      sendChatMessage('Tôi gửi ảnh vỏ hộp thuốc đang uống ở nhà cho bác sĩ đối chiếu.', {
        type: 'image',
        title: 'Ảnh chụp toa thuốc cũ & vỏ thuốc tại nhà',
        tag: 'Tài liệu thuốc cũ'
      });
      showToast('Đã gửi ảnh đơn thuốc cũ cho Bác sĩ!', 'success');
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="space-y-3 text-xs sm:text-sm">
      
      {/* 1. KHU VỰC CUỘC GỌI VIDEO BỆNH NHÂN CHÍNH (APP CALL INTERFACE) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* KHUNG VIDEO CALL CHÍNH (CHIẾM TOÀN BỘ HOẶC 7/12 KHI MỞ DRAWER) */}
        <div className={`transition-all duration-300 ${activeSideDrawer !== 'none' ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="relative bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-[16/10] sm:aspect-video flex flex-col justify-between">
            
            {/* TOP HEADER OVERLAY (HUD) */}
            <div className="relative z-30 p-3 sm:p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent flex items-center justify-between text-xs text-white">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-xs sm:text-sm text-white">
                  BS.CKII Vũ Minh Đức (Khoa Nội BV Đa Khoa Quốc Tế)
                </span>
                {activeConsultationSpecialist && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-400/40 text-[10px]">
                    + Chuyên gia Hội chẩn
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 font-mono text-emerald-400 font-bold">
                  {formatTime(callState.callSeconds)}
                </span>
              </div>
            </div>

            {/* OVERLAY SINH HIỆU IOT TRỰC TIẾP TRÊN CUỘC GỌI CỦA BỆNH NHÂN */}
            <div className="absolute top-16 left-4 z-20 flex items-center gap-2 flex-wrap">
              <div className="px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-white text-xs flex items-center gap-2 shadow-lg">
                <Heart className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span>Mạch: <strong className="text-emerald-400">{currentPatient.vitals.heartRate.value}</strong> bpm</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-white text-xs flex items-center gap-2 shadow-lg">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                <span>Huyết áp: <strong className="text-amber-400">{currentPatient.vitals.bp.value}</strong> mmHg</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 text-white text-xs flex items-center gap-2 shadow-lg">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>SpO2: <strong className="text-cyan-300">{currentPatient.vitals.spo2.value}%</strong></span>
              </div>
            </div>

            {/* VIDEO STAGE: HÌNH ẢNH BÁC SĨ CHÍNH */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden">
              {isLowBandwidth ? (
                /* CHẾ ĐỘ MẠNG YẾU */
                <div className="text-center p-6 space-y-3 select-none">
                  <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-300 font-bold text-xl shadow-xl">
                    BS.Đức
                  </div>
                  <h4 className="text-white font-bold text-base">BS.CKII Vũ Minh Đức đang tư vấn</h4>
                  <div className="flex items-center justify-center gap-1.5 h-7">
                    {[30, 80, 100, 50, 90, 40, 75, 95].map((h, i) => (
                      <div key={i} style={{ height: `${h}%` }} className="w-1.5 bg-amber-400 rounded-full animate-pulse" />
                    ))}
                  </div>
                  <span className="text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse" /> Đang tối ưu mạng yếu: Âm thanh thoại rõ ràng
                  </span>
                </div>
              ) : (
                /* CHẾ ĐỘ VIDEO SẮC NÉT */
                <div className="w-full h-full relative flex items-center justify-center p-4">
                  {/* Vòng hào quang âm thanh khi bác sĩ đang nói */}
                  {isDoctorSpeaking && (
                    <div className="absolute w-44 h-44 rounded-full bg-blue-500/15 animate-ping" />
                  )}

                  <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-400 p-1 shadow-2xl relative z-10">
                    <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                      <Stethoscope className="w-14 h-14 sm:w-16 sm:h-16 text-blue-400 mb-1" />
                      <span className="text-xs sm:text-sm font-bold text-blue-200">BS. Vũ Minh Đức</span>
                    </div>
                  </div>

                  {/* Phụ đề lời thoại tự động (AI Live Captions) */}
                  <div className="absolute bottom-20 left-4 right-4 text-center z-20">
                    <div className="inline-block px-4 py-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-700/80 text-white text-xs sm:text-sm font-medium shadow-2xl">
                      "Chào anh An, tôi đang xem kỹ hình ảnh X-quang và sinh hiệu huyết áp của anh..."
                    </div>
                  </div>

                  {/* CAMERA PIP CỦA BỆNH NHÂN (GÓC PHẢI DƯỚI) */}
                  <div className="absolute bottom-20 right-4 z-20 w-32 sm:w-44 aspect-video rounded-2xl bg-slate-900 border-2 border-emerald-400 overflow-hidden shadow-2xl flex flex-col items-center justify-center text-white text-xs">
                    {callState.isCamOff ? (
                      <div className="text-center p-2 text-slate-400 text-[10px]">
                        <VideoOff className="w-4 h-4 mx-auto text-rose-400 mb-0.5" />
                        <span>Camera bạn tắt</span>
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
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white p-2">
                        <span className="font-bold text-xs">{currentPatient.name}</span>
                        <span className="text-[10px] text-emerald-300">Camera của bạn</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 left-2 px-1.5 py-0.2 bg-slate-950/80 rounded text-[9px] text-emerald-300 font-bold">
                      Bạn (Bệnh nhân)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* THANH ĐIỀU KHIỂN CUỘC GỌI NỔI PHÍA BỆNH NHÂN (FACETIME / ZALO CALL DOCK) */}
            <div className="relative z-30 p-3 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              
              {/* Nút Bật/Tắt Micro */}
              <button
                onClick={() => setCallState(prev => ({ ...prev, isMicMuted: !prev.isMicMuted }))}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-lg ${
                  callState.isMicMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={callState.isMicMuted ? 'Bật Micro' : 'Tắt Micro'}
              >
                {callState.isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Nút Bật/Tắt Camera */}
              <button
                onClick={() => setCallState(prev => ({ ...prev, isCamOff: !prev.isCamOff }))}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition cursor-pointer shadow-lg ${
                  callState.isCamOff ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={callState.isCamOff ? 'Bật Camera' : 'Tắt Camera'}
              >
                {callState.isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>

              {/* Nút Đổi Camera thật */}
              <button
                onClick={() => setCallState(prev => ({ ...prev, useRealWebcam: !prev.useRealWebcam }))}
                className={`px-3.5 h-11 rounded-full text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
                  callState.useRealWebcam
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title="Bật/Tắt Webcam thật trên thiết bị của bạn"
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="hidden sm:inline">Webcam thật</span>
              </button>

              {/* Nút Mở Xem Phim X-Quang Bác Sĩ Vẽ */}
              <button
                onClick={() => setActiveSideDrawer(prev => prev === 'dicom' ? 'none' : 'dicom')}
                className={`px-4 h-11 rounded-full text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                  activeSideDrawer === 'dicom'
                    ? 'bg-sky-500 text-slate-950 shadow-sky-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Xem Phim X-Quang ({dicomState.annotations.length})</span>
              </button>

              {/* Nút Mở Hộp Thư Chat */}
              <button
                onClick={() => setActiveSideDrawer(prev => prev === 'chat' ? 'none' : 'chat')}
                className={`px-4 h-11 rounded-full text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg ${
                  activeSideDrawer === 'chat'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Nhắn tin ({chatMessages.length})</span>
              </button>

              {/* Nút Kết thúc cuộc gọi */}
              <button
                onClick={() => setPatientCurrentStep(3)}
                className="px-5 h-11 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg"
                title="Rời phòng khám và chuyển sang bước nhận đơn thuốc & thanh toán"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Rời phòng</span>
              </button>

            </div>

          </div>

          {/* GỬI NHANH ẢNH LÂM SÀNG PHÍA DƯỚI */}
          <div className="mt-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-600" />
              Gửi nhanh tài liệu/ảnh cho Bác sĩ kiểm tra:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUploadClinicalPhoto('throat')}
                className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>+ Ảnh họng / vị trí đau</span>
              </button>
              <button
                type="button"
                onClick={() => handleUploadClinicalPhoto('rx')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                <span>+ Ảnh vỏ thuốc cũ tại nhà</span>
              </button>
            </div>
          </div>
        </div>

        {/* SIDE DRAWER: XEM PHIM X-QUANG ĐỒNG BỘ HOẶC NHẮN TIN */}
        {activeSideDrawer !== 'none' && (
          <div className="lg:col-span-5 flex flex-col gap-3 transition-all duration-300">
            
            {/* 1. KHI CHỌN XEM PHIM X-QUANG DICOM */}
            {activeSideDrawer === 'dicom' && (
              <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col shadow-2xl">
                <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-xs">Phim X-Quang Bác Sĩ Đang Chia Sẻ</span>
                  </div>
                  <button
                    onClick={() => setActiveSideDrawer('none')}
                    className="p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* KHUNG VẼ CANVAS ĐỒNG BỘ NÉT VẼ TỪ BÁC SĨ */}
                <div className="relative w-full h-[280px] bg-slate-950">
                  <canvas
                    ref={patientDicomCanvasRef}
                    width={500}
                    height={280}
                    className="w-full h-full block"
                  />
                </div>

                <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Đồng bộ thời gian thực từ trạm làm việc của Bác sĩ
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Bác sĩ đang vẽ khoanh vùng chú thích trên phim chụp của bạn. Nét vẽ màu đỏ sẽ xuất hiện tức thì trên màn hình này.
                  </p>
                </div>
              </div>
            )}

            {/* 2. KHI CHỌN TRÒ CHUYỆN / CHAT */}
            {activeSideDrawer === 'chat' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col overflow-hidden h-[380px]">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Tin nhắn với Bác sĩ ({chatMessages.length})
                  </span>
                  <button
                    onClick={() => setActiveSideDrawer('none')}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 space-y-2.5 overflow-y-auto flex-1 text-xs bg-slate-50/50">
                  {chatMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'patient' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold text-slate-600">{msg.senderName}</span>
                        <span>{msg.time}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-xs ${
                          msg.sender === 'patient'
                            ? 'bg-emerald-600 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                        }`}
                      >
                        <p>{msg.text}</p>
                        {msg.attachment && (
                          <div className="mt-2 p-2 rounded-xl bg-slate-900 text-white text-[11px]">
                            📎 {msg.attachment.title}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendText} className="p-2.5 border-t border-slate-200 flex items-center gap-2 bg-white">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Nhập tin nhắn gửi Bác sĩ..."
                    className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    Gửi
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

      </div>

      {/* NÚT CHUYỂN TIẾP SANG BƯỚC 3 (THANH TOÁN & ĐƠN THUỐC) */}
      <div className="flex justify-between items-center p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="text-xs text-slate-600">
          Sau khi kết thúc tư vấn, bạn hãy chuyển sang Bước 3 để thanh toán và nhận đơn thuốc điện tử.
        </div>
        <button
          onClick={() => setPatientCurrentStep(3)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
        >
          <span>Xem Thanh toán Viện phí & Đơn thuốc (Bước 3)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
