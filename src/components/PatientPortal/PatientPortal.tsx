import React, { useState, useRef, useEffect } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Send, Image as ImageIcon,
  Link as LinkIcon, ExternalLink, ShieldCheck, Activity, Heart,
  FileText, Pill, CreditCard, Stethoscope, Check, AlertTriangle,
  Upload, X, RefreshCw, ZoomIn, Eye, Sparkles, Building2,
  SignalHigh, SignalLow, QrCode, Droplets, CheckCircle2, ArrowLeft, History
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';
import { webrtcService } from '../../services/webrtcService';

export const PatientPortal: React.FC = () => {
  const {
    currentPatient,
    callState, setCallState,
    isLowBandwidth, setIsLowBandwidth,
    chatMessages, sendChatMessage,
    prescriptions,
    medicationAdherence, toggleMedicationDoseTaken,
    nationalPrescriptionCode,
    isSmartCASigned,
    dicomState,
    bluetoothDevices,
    simulateBleReading,
    showToast,
    endCallAndReturnToDashboard,
    setActiveView,
    setIsEConsentModalOpen,
    setIsNationalRxModalOpen
  } = useTelemedicine();

  // Layout mode: split (cân đối) | video-focus (ưu tiên video & chat) | info-focus (ưu tiên xem đơn & phim)
  const [layoutMode, setLayoutMode] = useState<'split' | 'video-focus' | 'info-focus'>('split');
  
  // Right Column Active Tab
  const [activeRightTab, setActiveRightTab] = useState<'pacs' | 'prescription' | 'vitals' | 'billing'>('prescription');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(true);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [isSendLinkModalOpen, setIsSendLinkModalOpen] = useState(false);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const patientDicomCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [rtcState, setRtcState] = useState(webrtcService.getState());

  useEffect(() => {
    const unsubState = webrtcService.onStateChange(setRtcState);
    return () => unsubState();
  }, []);

  // Cuộn chat xuống cuối khi có tin nhắn mới
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Giả lập bác sĩ đang nói chuyện
  useEffect(() => {
    const timer = setInterval(() => {
      setIsDoctorSpeaking(prev => !prev);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // WEBRTC VIDEO & AUDIO STREAM CHO BỆNH NHÂN
  useEffect(() => {
    webrtcService.setRole('patient', currentPatient.id);
    webrtcService.initLocalMedia().catch(console.warn);

    const unsubLocal = webrtcService.onLocalStream((stream) => {
      if (localVideoRef.current && stream) {
        localVideoRef.current.srcObject = stream;
      }
    });

    const unsubRemote = webrtcService.onRemoteStream((stream) => {
      if (stream && stream.getVideoTracks().length > 0) {
        setHasRemoteVideo(true);
      }
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
      if (remoteAudioRef.current && stream) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    });

    return () => {
      unsubLocal();
      unsubRemote();
    };
  }, [currentPatient.id]);

  // Tự động chuyển tab sang PACS khi Bác sĩ vẽ chú thích
  useEffect(() => {
    if (dicomState.annotations.length > 0) {
      setActiveRightTab('pacs');
    }
  }, [dicomState.annotations.length]);

  // Vẽ hình ảnh X-Quang PACS đồng bộ từ Bác sĩ
  useEffect(() => {
    if (activeRightTab !== 'pacs') return;
    const canvas = patientDicomCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Nền tối chuẩn PACS
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(dicomState.pan.x + width / 2, dicomState.pan.y + height / 2);
    ctx.scale(dicomState.zoom, dicomState.zoom);
    ctx.translate(-width / 2, -height / 2);

    // Anatomical chest simulation
    const gradient = ctx.createRadialGradient(width / 2, height / 2 - 20, 30, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, 'rgba(60, 75, 95, 0.5)');
    gradient.addColorStop(0.5, 'rgba(25, 30, 45, 0.7)');
    gradient.addColorStop(1, 'rgba(10, 12, 18, 0.95)');
    ctx.fillStyle = gradient;
    ctx.fillRect(20, 10, width - 40, height - 20);

    // Lung fields
    ctx.fillStyle = 'rgba(12, 16, 24, 0.9)';
    ctx.beginPath();
    ctx.ellipse(width * 0.32, height * 0.45, 50, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(width * 0.68, height * 0.45, 50, 85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heart silhouette
    ctx.fillStyle = 'rgba(110, 130, 160, 0.4)';
    ctx.beginPath();
    ctx.ellipse(width * 0.52, height * 0.52, 45, 55, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Rib cage arches
    ctx.strokeStyle = 'rgba(160, 180, 210, 0.25)';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(width * 0.32, 60 + i * 35, 45, Math.PI * 0.9, Math.PI * 1.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(width * 0.68, 60 + i * 35, 45, Math.PI * 1.1, Math.PI * 2.1);
      ctx.stroke();
    }

    // Vẽ các chú thích trực tiếp mà Bác sĩ đang vẽ trên màn hình của mình
    dicomState.annotations.forEach(ann => {
      ctx.strokeStyle = ann.color || '#ef4444';
      ctx.fillStyle = ann.color || '#ef4444';
      ctx.lineWidth = 3;

      if (ann.type === 'box' && ann.points.length >= 2) {
        const [p1, p2] = ann.points;
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p1.x - p2.x);
        const h = Math.abs(p1.y - p2.y);
        ctx.strokeRect(x, y, w, h);
        if (ann.label) {
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(ann.label, x + 4, y - 6);
        }
      } else if (ann.type === 'pen' && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [dicomState, activeRightTab]);

  // Xử lý gửi tin nhắn văn bản
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    sendChatMessage(chatInput.trim());
    setChatInput('');
  };

  // Xử lý gửi hình ảnh từ máy tính / điện thoại
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      sendChatMessage('Tôi xin gửi hình ảnh chụp thực tế:', {
        type: 'image',
        title: file.name,
        tag: 'Hình ảnh bệnh nhân tải lên',
        url: imageUrl
      });
      showToast('Đã gửi hình ảnh thành công cho Bác sĩ!', 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Gửi ảnh mẫu nhanh (ảnh máy đo huyết áp hoặc ảnh vết thương)
  const sendSampleImage = (type: 'bp' | 'skin') => {
    if (type === 'bp') {
      sendChatMessage('Tôi gửi ảnh chụp kết quả máy đo huyết áp Omron tại nhà sáng nay:', {
        type: 'image',
        title: 'Ảnh màn hình máy đo huyết áp Omron (145/92 mmHg - Mạch 84)',
        tag: 'Dữ liệu đo tại nhà',
        url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600'
      });
    } else {
      sendChatMessage('Tôi gửi ảnh vị trí đau tức vùng thượng vị trên rốn:', {
        type: 'image',
        title: 'Ảnh vị trí đau tức thượng vị',
        tag: 'Triệu chứng lâm sàng',
        url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600'
      });
    }
  };

  // Gửi đường link liên kết
  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;

    const formattedUrl = linkUrl.startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    const title = linkTitle.trim() || 'Tài liệu hồ sơ đính kèm';

    sendChatMessage(`Tôi xin gửi đường link tài liệu: ${title}`, {
      type: 'link',
      title: title,
      tag: 'Liên kết đính kèm',
      url: formattedUrl
    });

    setLinkTitle('');
    setLinkUrl('');
    setIsSendLinkModalOpen(false);
    showToast('Đã gửi đường link tới Bác sĩ!', 'success');
  };

  // Cảnh báo dị ứng Penicillin
  const hasPenicillinAllergy = currentPatient?.allergies?.some(a => a.toLowerCase().includes('penicillin')) ?? true;

  return (
    <div className="flex-1 bg-slate-100 p-3 sm:p-4 lg:p-5 flex flex-col gap-3 overflow-y-auto">
      
      {/* 1. TOP HEADER BAR: GỌN GÀNG, BÁC SĨ PHỤ TRÁCH & TRẠNG THÁI KHÁM */}
      <div className="bg-white rounded-2xl px-4 py-3 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Doctor In Charge Info & Back to Dashboard */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            title="Quay lại Bảng điều khiển & Lịch sử khám bệnh"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Về Lịch Sử Khám</span>
          </button>

          <span className="text-slate-300 hidden sm:inline">|</span>

          <div className="relative">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border-2 border-emerald-500 shadow-xs">
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=260"
                alt="BS.CKII Vũ Minh Đức"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-xs" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                BS.CKII Vũ Minh Đức
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đang trong phiên khám
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Trưởng khoa Nội Tổng Hợp • Bệnh viện Đa khoa Quốc tế
            </p>
          </div>
        </div>

        {/* Center: Layout View Mode Toggle */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setLayoutMode('split')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              layoutMode === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Tiêu Chuẩn (Chia đôi)
          </button>
          <button
            onClick={() => setLayoutMode('video-focus')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              layoutMode === 'video-focus' ? 'bg-white text-emerald-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Ưu Tiên Video & Chat
          </button>
          <button
            onClick={() => setLayoutMode('info-focus')}
            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
              layoutMode === 'info-focus' ? 'bg-white text-blue-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Ưu Tiên Xem Đơn & Phim
          </button>
        </div>

        {/* Right: Patient Name & Allergy Red Alert */}
        <div className="flex items-center gap-2.5">
          {hasPenicillinAllergy && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Dị ứng Penicillin</span>
            </span>
          )}

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-800 block">
              BN. {currentPatient.name}
            </span>
            <span className="text-[11px] text-slate-500 block">
              BHYT: {currentPatient.bhytNumber}
            </span>
          </div>

          <button
            onClick={() => setIsEConsentModalOpen(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            title="Xem phiếu Chấp thuận điều trị điện tử e-Consent"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE GRID: GẦN GIỐNG TRẠM BÁC SĨ NHƯNG TINH GỌN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* CỘT TRÁI (LG:COL-SPAN-7 HOẶC 8): CUỘC GỌI VIDEO & KHUNG CHAT */}
        <div className={`flex flex-col gap-4 transition-all duration-300 ${
          layoutMode === 'video-focus'
            ? 'lg:col-span-8'
            : layoutMode === 'info-focus'
            ? 'lg:col-span-5'
            : 'lg:col-span-7'
        }`}>
          
          {/* A. KHUNG VIDEO CUỘC GỌI VỚI BÁC SĨ */}
          <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-xl relative aspect-video flex flex-col justify-between p-4 group">
            {/* Top Video Overlay: Doctor Name & Live Status */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs text-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">BS.CKII Vũ Minh Đức</span>
                <span className="text-slate-400">• Khoa Nội</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/80 text-xs text-white">
                {rtcState.hasRealMicrophone ? (
                  <span className="hidden sm:flex items-center gap-1 text-emerald-400 font-semibold" title={rtcState.audioDeviceLabel}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Micro thật</span>
                  </span>
                ) : null}

                {isLowBandwidth ? (
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <SignalLow className="w-3.5 h-3.5" />
                    <span>2G/3G Tiết kiệm</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <SignalHigh className="w-3.5 h-3.5" />
                    <span>HD 1080p WebRTC</span>
                  </span>
                )}
              </div>
            </div>

            {/* Doctor Main Video Stream (WebRTC Live Stream) */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 overflow-hidden">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover bg-slate-950"
              />
              <audio ref={remoteAudioRef} autoPlay />

              {/* Speaking Indicator Border Wave */}
              {isDoctorSpeaking && (
                <div className="absolute inset-0 border-4 border-emerald-500/50 pointer-events-none animate-pulse" />
              )}
            </div>

            {/* Patient Picture-in-Picture (PiP) Thumbnail */}
            <div className="absolute bottom-16 right-4 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-2xl bg-slate-900 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${callState.isCamOff ? 'hidden' : 'block'}`}
              />
              {callState.isCamOff && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400 text-xs">
                  <VideoOff className="w-5 h-5 mb-1 text-slate-500" />
                  <span>Camera đang tắt</span>
                </div>
              )}
              <div className="absolute bottom-1 left-1.5 bg-black/60 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold border border-slate-700/50">
                Bạn ({currentPatient.name})
              </div>
            </div>

            {/* Floating Call Action Control Bar */}
            <div className="relative z-10 flex items-center justify-center gap-3 bg-slate-900/90 backdrop-blur-md py-2.5 px-4 rounded-2xl border border-slate-700/80 mx-auto shadow-2xl">
              {/* Mic Toggle */}
              <button
                onClick={() => {
                  const isMuted = webrtcService.toggleAudio();
                  setCallState(prev => ({ ...prev, isMicMuted: isMuted }));
                }}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  callState.isMicMuted
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={callState.isMicMuted ? 'Bật Micro' : 'Tắt Micro'}
              >
                {callState.isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Camera Toggle */}
              <button
                onClick={() => {
                  const isOff = webrtcService.toggleVideo();
                  setCallState(prev => ({ ...prev, isCamOff: isOff }));
                }}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  callState.isCamOff
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                title={callState.isCamOff ? 'Bật Camera' : 'Tắt Camera'}
              >
                {callState.isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              {/* Switch Webcam Mode */}
              <button
                onClick={() => setCallState(prev => ({ ...prev, useRealWebcam: !prev.useRealWebcam }))}
                className={`p-2.5 rounded-xl transition cursor-pointer ${
                  callState.useRealWebcam
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Bật/Tắt Webcam thật từ máy tính/điện thoại"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              {/* Low-bandwidth switch */}
              <button
                onClick={() => setIsLowBandwidth(prev => !prev)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  isLowBandwidth
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title="Bật chế độ tiết kiệm dữ liệu (mạng yếu 2G/3G)"
              >
                <span>{isLowBandwidth ? '2G/3G' : 'HD'}</span>
              </button>

              {/* End Call Button */}
              <button
                onClick={endCallAndReturnToDashboard}
                className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition active:scale-95 cursor-pointer flex items-center gap-1.5 px-3.5"
                title="Kết thúc cuộc gọi khám bệnh"
              >
                <PhoneOff className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">Rời phòng</span>
              </button>
            </div>
          </div>

          {/* B. KHUNG CHAT TRỰC TUYẾN: NHẮN TIN, GỬI ẢNH, GỬI LINK */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px] overflow-hidden">
            {/* Chat Box Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                  Trò Chuyện & Gửi Tài Liệu Trực Tiếp với Bác Sĩ
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Mã hóa an toàn • Lưu vào EMR
              </span>
            </div>

            {/* Chat Messages Scrolling Container */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40">
              {chatMessages.map(msg => {
                const isPatient = msg.sender === 'patient';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-600">{msg.senderName}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                        isPatient
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                      {/* Attachment Rendering */}
                      {msg.attachment && (
                        <div className="mt-2.5 pt-2 border-t border-black/10">
                          {/* Image Attachment */}
                          {msg.attachment.type === 'image' && msg.attachment.url && (
                            <div className="rounded-xl overflow-hidden border border-black/10 mt-1 cursor-pointer group relative">
                              <img
                                src={msg.attachment.url}
                                alt={msg.attachment.title}
                                onClick={() => setPreviewImageModal(msg.attachment!.url!)}
                                className="max-h-48 w-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="p-1.5 bg-black/60 text-[11px] text-white flex items-center justify-between">
                                <span className="truncate">{msg.attachment.title}</span>
                                <ZoomIn className="w-3.5 h-3.5 ml-1 shrink-0" />
                              </div>
                            </div>
                          )}

                          {/* Link Attachment */}
                          {msg.attachment.type === 'link' && msg.attachment.url && (
                            <a
                              href={msg.attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition mt-1 ${
                                isPatient
                                  ? 'bg-emerald-700/50 border-emerald-500/60 text-white hover:bg-emerald-700'
                                  : 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <LinkIcon className="w-4 h-4 shrink-0" />
                                <span className="font-bold text-xs truncate">{msg.attachment.title}</span>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-80" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 shrink-0 font-medium">Gợi ý:</span>
              <button
                onClick={() => setChatInput('Bác sĩ có nghe rõ tiếng tôi không ạ?')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition cursor-pointer"
              >
                Bác sĩ có nghe rõ không?
              </button>
              <button
                onClick={() => sendSampleImage('bp')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition cursor-pointer flex items-center gap-1"
              >
                <ImageIcon className="w-3 h-3 text-rose-500" />
                <span>Gửi ảnh máy đo huyết áp</span>
              </button>
              <button
                onClick={() => setChatInput('Tôi bị đau rát vùng thượng vị sau khi ăn no.')}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition cursor-pointer"
              >
                Đau rát thượng vị
              </button>
            </div>

            {/* Chat Input & Attachment Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Upload Image Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                title="Tải ảnh lên (Ảnh máy đo, tổn thương da, đơn thuốc cũ)"
              >
                <ImageIcon className="w-4 h-4 text-emerald-600" />
              </button>

              {/* Send Link Button */}
              <button
                type="button"
                onClick={() => setIsSendLinkModalOpen(true)}
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                title="Gửi đường link tài liệu / kết quả xét nghiệm"
              >
                <LinkIcon className="w-4 h-4 text-blue-600" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder="Nhập tin nhắn cho Bác sĩ... Nhấn Enter để gửi"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                className="flex-1 py-2 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition active:scale-95 cursor-pointer shadow-md shadow-emerald-600/20"
                title="Gửi tin nhắn"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

        {/* CỘT PHẢI (LG:COL-SPAN-5 HOẶC 4): BẢNG THÔNG TIN Y TẾ TINH GỌN (DÀNH CHO BỆNH NHÂN) */}
        <div className={`flex flex-col gap-3 transition-all duration-300 ${
          layoutMode === 'video-focus'
            ? 'lg:col-span-4'
            : layoutMode === 'info-focus'
            ? 'lg:col-span-7'
            : 'lg:col-span-5'
        }`}>
          
          {/* TAB SELECTOR HEADER */}
          <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveRightTab('pacs')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeRightTab === 'pacs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Phim X-Quang</span>
              {dicomState.annotations.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <button
              onClick={() => setActiveRightTab('prescription')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeRightTab === 'prescription'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Pill className="w-3.5 h-3.5 text-emerald-400" />
              <span>Đơn Thuốc</span>
            </button>

            <button
              onClick={() => setActiveRightTab('vitals')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeRightTab === 'vitals'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-rose-400" />
              <span>Đo Sinh Hiệu</span>
            </button>

            <button
              onClick={() => setActiveRightTab('billing')}
              className={`flex-1 py-2 px-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeRightTab === 'billing'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>Thanh Toán</span>
            </button>
          </div>

          {/* TAB 1: PHIM X-QUANG & GIẢI THÍCH CỦA BÁC SĨ (PACS LIVE) */}
          {activeRightTab === 'pacs' && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Màn Hình Chia Sẻ Phim X-Quang DICOM Trực Tiếp</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bác sĩ đang giải thích phim lồng ngực cho bạn
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live Sync
                </span>
              </div>

              {/* Synchronized DICOM Canvas */}
              <div className="relative aspect-square sm:aspect-video rounded-2xl overflow-hidden bg-black border border-slate-300 flex items-center justify-center">
                <canvas
                  ref={patientDicomCanvasRef}
                  width={500}
                  height={320}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
                  CHEST PA • 120kV
                </div>
                {dicomState.annotations.length > 0 && (
                  <div className="absolute bottom-2 left-2 bg-rose-950/80 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] text-rose-300 font-semibold animate-pulse">
                    Bác sĩ đang khoanh vùng chú thích
                  </div>
                )}
              </div>

              {/* Plain-Language Doctor Explanation */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-1">
                <span className="font-bold block text-blue-950">Lời giải thích của Bác sĩ:</span>
                <p>
                  "Hình ảnh chụp X-quang tim phổi của anh cho thấy phế trường hai bên sáng đều, vòm hoành rõ, bóng tim không lớn. Các triệu chứng ho và đau rát thượng vị chủ yếu do trào ngược dạ dày GERD gây kích ứng, không có viêm phổi."
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ĐƠN THUỐC QUỐC GIA & HƯỚNG DẪN DÙNG THUỐC */}
          {activeRightTab === 'prescription' && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Đã ký số SmartCA
                    </span>
                    <span className="text-[11px] text-slate-400">• Thông tư 27/2021/TT-BYT</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Đơn Thuốc Điện Tử Quốc Gia
                  </h3>
                  <p className="text-xs text-slate-600">
                    Mã đơn: <strong className="font-mono text-blue-700">{nationalPrescriptionCode}</strong>
                  </p>
                </div>

                {/* QR Code */}
                <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://donthuocquocgia.vn/lookup?code=DT-2026-88392104"
                    alt="Mã QR Đơn thuốc"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Medication List with Doses */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 block">
                  Danh mục thuốc được kê ({prescriptions.length} loại thuốc):
                </span>

                <div className="divide-y divide-slate-100">
                  {prescriptions.map(rx => {
                    const doses = medicationAdherence[rx.id] || { morning: false, noon: false, evening: false, night: false };
                    return (
                      <div key={rx.id} className="py-2.5 first:pt-0 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{rx.name}</h4>
                            <p className="text-[11px] text-slate-500">
                              {rx.activeIngredient} • {rx.quantity} {rx.unit} ({rx.days} ngày)
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            {rx.usage}
                          </span>
                        </div>

                        {/* Dose Checklist Buttons */}
                        <div className="flex items-center gap-1.5 pt-1 text-[11px]">
                          <button
                            onClick={() => toggleMedicationDoseTaken(rx.id, 'morning')}
                            className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                              doses.morning ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {doses.morning && <Check className="w-3 h-3" />}
                            <span>Sáng: {rx.morning}</span>
                          </button>

                          <button
                            onClick={() => toggleMedicationDoseTaken(rx.id, 'noon')}
                            className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                              doses.noon ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {doses.noon && <Check className="w-3 h-3" />}
                            <span>Trưa: {rx.noon}</span>
                          </button>

                          <button
                            onClick={() => toggleMedicationDoseTaken(rx.id, 'evening')}
                            className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                              doses.evening ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {doses.evening && <Check className="w-3 h-3" />}
                            <span>Chiều: {rx.evening}</span>
                          </button>

                          <button
                            onClick={() => toggleMedicationDoseTaken(rx.id, 'night')}
                            className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${
                              doses.night ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {doses.night && <Check className="w-3 h-3" />}
                            <span>Tối: {rx.night}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setIsNationalRxModalOpen(true)}
                  className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem đơn thuốc đầy đủ</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-slate-400">Có giá trị tại các nhà thuốc GPP</span>
              </div>
            </div>
          )}

          {/* TAB 3: ĐO SINH HIỆU IOT GIA ĐÌNH (BLUETOOTH) */}
          {activeRightTab === 'vitals' && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-500" />
                    <span>Thiết Bị Y Tế Bluetooth Tại Nhà</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bấm để đo và đồng bộ số đo tức thì sang Bác sĩ
                  </p>
                </div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Web Bluetooth
                </span>
              </div>

              {/* Devices Grid */}
              <div className="space-y-3">
                {bluetoothDevices.map(dev => (
                  <div
                    key={dev.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">{dev.name}</span>
                        {dev.connected && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Đã kết nối
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Lần đo gần nhất: <strong>{dev.lastReading || 'Chưa đo'}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => simulateBleReading(dev.id)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Đo ngay</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Vitals Summary Pills */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 text-center text-xs">
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[11px] text-rose-600 font-medium">Huyết áp hiện tại</span>
                  <p className="text-lg font-black text-slate-800 mt-0.5">
                    {currentPatient?.vitals?.bp?.value ?? '138/86'}
                  </p>
                  <span className="text-[10px] text-slate-400">mmHg</span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <span className="text-[11px] text-emerald-600 font-medium">SpO2 Nồng độ oxy</span>
                  <p className="text-lg font-black text-slate-800 mt-0.5">
                    {currentPatient?.vitals?.spo2?.value ?? 98}%
                  </p>
                  <span className="text-[10px] text-slate-400">Bão hòa tốt</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VIỆN PHÍ & THANH TOÁN VIETQR */}
          {activeRightTab === 'billing' && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Bảng Kê Chi Phí & Thanh Toán VietQR
                  </h3>
                  <p className="text-xs text-slate-500">Mã giao dịch: HIS-PAY-2026-0892</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã Thanh Toán
                </span>
              </div>

              {/* Fee breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Phí khám bệnh từ xa:</span>
                  <span className="font-semibold text-slate-800">200,000 đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Đọc và hội chẩn phim X-Quang:</span>
                  <span className="font-semibold text-slate-800">50,000 đ</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Bảo hiểm y tế chi trả:</span>
                  <span className="font-semibold">-100,000 đ</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Thực thu (Cùng chi trả):</span>
                  <span className="text-base text-blue-600">150,000 đ</span>
                </div>
              </div>

              {/* QR Code Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                <div className="w-24 h-24 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs shrink-0 flex items-center justify-center">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021238580010A00000072701280006970422011400012345678952044111530370454061500005802VN5913BV_DKQT6005HCM62210817HIS-PAY-2026-08926304"
                    alt="VietQR Napas247"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-900 text-xs block">VietinBank (ICB)</span>
                  <p>Số TK: <strong className="font-mono text-slate-900">112000889988</strong></p>
                  <p>Tên TK: <strong>BENH VIEN DA KHOA QUOC TE</strong></p>
                  <p className="text-emerald-700 font-semibold pt-0.5">
                    ✓ Đã nhận tín hiệu Webhook IPN ngân hàng tự động.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 3. MODAL GỬI LIÊN KẾT / URL TRONG CHAT */}
      {isSendLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                <span>Gửi Đường Link Cho Bác Sĩ</span>
              </h3>
              <button
                onClick={() => setIsSendLinkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendLink} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tiêu đề mô tả tài liệu:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Link hồ sơ xét nghiệm cũ, Link Google Drive..."
                  value={linkTitle}
                  onChange={e => setLinkTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Đường dẫn liên kết (URL):
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  required
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSendLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!linkUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition"
                >
                  Gửi Link Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL PHÓNG TO HÌNH ẢNH (IMAGE LIGHTBOX) */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl p-2 border border-slate-700">
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewImageModal}
              alt="Phóng to ảnh đính kèm"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
};
