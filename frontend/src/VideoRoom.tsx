import { useEffect, useState, useRef } from 'react'
import {
  ArrowLeft,
  ShieldCheck,
  Video,
  VideoOff,
  Mic,
  MicOff,
  SwitchCamera,
  PhoneOff,
  FileText,
  Clock,
  X,
  Pill,
  Stethoscope,
  Volume2
} from 'lucide-react'
import { type Appointment, type User, getClinicalRecord } from './api'
import { webrtcService, type WebRTCState } from './webrtcService'

export function VideoRoom({
  appointment,
  onBack,
  user
}: {
  appointment: Appointment
  onBack: () => void
  user: User
}) {
  const [rtcState, setRtcState] = useState<WebRTCState>(webrtcService.getState())
  const [callDuration, setCallDuration] = useState(0)
  const [showClinicalSheet, setShowClinicalSheet] = useState(false)
  const [clinicalData, setClinicalData] = useState<any>(null)
  
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const wakeLockRef = useRef<any>(null)

  // 1. Giữ sáng màn hình điện thoại xuyên suốt cuộc khám (Screen Wake Lock)
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        console.log('Screen Wake Lock denied or unavailable:', err)
      }
    }
    requestWakeLock()

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
      }
    }
  }, [])

  // 2. Bộ đếm thời gian gọi khám (Call Duration Timer)
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 3. Khởi tạo kết nối WebRTC trực tiếp hai chiều (P2P Full Duplex)
  useEffect(() => {
    const unbindState = webrtcService.onStateChange(setRtcState)

    const unbindLocal = webrtcService.onLocalStream(stream => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    })

    const unbindRemote = webrtcService.onRemoteStream(stream => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
      }
    })

    webrtcService.joinRoom(appointment.id, 'patient', user.full_name)

    return () => {
      unbindState()
      unbindLocal()
      unbindRemote()
      webrtcService.endCall()
    }
  }, [appointment.id, user.full_name])

  // Gắn lại stream nếu element mount sau
  useEffect(() => {
    if (localVideoRef.current && rtcState.localStream) {
      localVideoRef.current.srcObject = rtcState.localStream
    }
  }, [rtcState.localStream])

  useEffect(() => {
    if (remoteVideoRef.current && rtcState.remoteStream) {
      remoteVideoRef.current.srcObject = rtcState.remoteStream
    }
  }, [rtcState.remoteStream])

  // 4. Tải dữ liệu bệnh án & đơn thuốc để bệnh nhân xem trực tiếp trong cuộc gọi
  function loadClinicalDetails() {
    getClinicalRecord(appointment.id)
      .then(data => setClinicalData(data))
      .catch(() => {})
  }

  useEffect(() => {
    loadClinicalDetails()
  }, [appointment.id])

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="mobile-video-page">
      {/* Top Mobile Floating Header */}
      <header className="mobile-call-header">
        <button
          type="button"
          className="mobile-back-btn"
          onClick={() => {
            webrtcService.endCall()
            onBack()
          }}
          title="Rời phòng"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="mobile-doctor-header-info">
          <b>Buồng khám trực tuyến #{appointment.id}</b>
          <div className="call-status-row">
            <span className={`live-pulse-dot ${rtcState.remoteStream ? 'online' : 'connecting'}`} />
            <span className="timer-badge">
              <Clock size={12} /> {formatTime(callDuration)}
            </span>
            <span className="secure-badge">
              <ShieldCheck size={12} /> WebRTC P2P
            </span>
          </div>
        </div>

        {/* Nút bật/tắt Bottom Sheet Đơn thuốc & Dặn dò */}
        <button
          type="button"
          className={`mobile-sheet-btn ${showClinicalSheet ? 'active' : ''}`}
          onClick={() => {
            setShowClinicalSheet(!showClinicalSheet)
            if (!showClinicalSheet) loadClinicalDetails()
          }}
          title="Xem đơn thuốc & dặn dò của bác sĩ"
        >
          <FileText size={17} />
          <span className="sheet-btn-text">Đơn thuốc</span>
        </button>
      </header>

      {/* Main Video View Area */}
      <div className="webrtc-stage-container">
        {/* Remote Video Stream (Bác sĩ) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`webrtc-remote-video ${rtcState.remoteStream ? 'visible' : 'hidden'}`}
        />

        {/* Fallback khi chưa kết nối được Bác sĩ hoặc Bác sĩ chưa vào phòng */}
        {!rtcState.remoteStream && (
          <div className="mobile-video-loading">
            <div className="loading-spinner-circle">
              <Video size={40} className="pulse-slow" color="#10b981" />
            </div>
            <h2>Đang kết nối Bác sĩ chuyên khoa...</h2>
            <p>Hệ thống tự động kích hoạt đàm thoại âm thanh & video hai chiều bảo mật.</p>
            <div className="audio-live-pill">
              <Volume2 size={15} /> Micro đang sẵn sàng phát tín hiệu
            </div>
            <small className="muted">Màn hình điện thoại sẽ luôn giữ sáng trong suốt cuộc gọi.</small>
          </div>
        )}

        {/* Local Video Thumbnail PiP (Camera của chính bệnh nhân) */}
        <div className="webrtc-local-pip-wrapper">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="webrtc-local-pip"
          />
          <div className="pip-label">
            {rtcState.isAudioMuted && <MicOff size={11} color="#ef4444" />}
            <span>Bạn</span>
          </div>
        </div>

        {/* Floating Call Action Controls Bar (Dưới đáy màn hình) */}
        <div className="mobile-call-controls-bar">
          {/* 1. Mic On/Off */}
          <button
            type="button"
            className={`control-circle-btn ${rtcState.isAudioMuted ? 'muted' : 'active'}`}
            onClick={() => webrtcService.toggleAudio()}
            title={rtcState.isAudioMuted ? 'Bật Mic' : 'Tắt Mic'}
          >
            {rtcState.isAudioMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* 2. Video On/Off */}
          <button
            type="button"
            className={`control-circle-btn ${rtcState.isVideoMuted ? 'muted' : 'active'}`}
            onClick={() => webrtcService.toggleVideo()}
            title={rtcState.isVideoMuted ? 'Bật Camera' : 'Tắt Camera'}
          >
            {rtcState.isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          {/* 3. Đổi Camera Trước/Sau (Flip Camera trên Mobile) */}
          <button
            type="button"
            className="control-circle-btn flip-btn"
            onClick={() => webrtcService.switchCamera()}
            title="Đổi camera trước / sau"
          >
            <SwitchCamera size={22} />
          </button>

          {/* 4. Mở đơn thuốc nhanh */}
          <button
            type="button"
            className={`control-circle-btn ${showClinicalSheet ? 'active-sheet' : ''}`}
            onClick={() => {
              setShowClinicalSheet(!showClinicalSheet)
              if (!showClinicalSheet) loadClinicalDetails()
            }}
            title="Xem hồ sơ / đơn thuốc"
          >
            <FileText size={20} />
          </button>

          {/* 5. Kết thúc cuộc gọi */}
          <button
            type="button"
            className="control-circle-btn hangup-btn"
            onClick={() => {
              webrtcService.endCall()
              onBack()
            }}
            title="Kết thúc khám"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </div>

      {/* Collapsible Clinical Bottom Sheet (Dành riêng cho bệnh nhân xem đơn thuốc) */}
      {showClinicalSheet && (
        <div className="mobile-clinical-sheet">
          <div className="sheet-header">
            <div className="sheet-handle" />
            <div className="sheet-title-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={18} color="#0f766e" />
                <b>Thông tin khám & Đơn thuốc</b>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowClinicalSheet(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="sheet-content">
            {clinicalData?.record?.diagnosis ? (
              <div className="sheet-section">
                <span className="section-label">Chẩn đoán bác sĩ:</span>
                <div className="diagnosis-highlight">
                  <strong>{clinicalData.record.diagnosis}</strong>
                  {clinicalData.record.icd10_code && (
                    <span className="icd-tag">
                      ICD-10: [{clinicalData.record.icd10_code}] {clinicalData.record.icd10_name}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted tiny" style={{ fontStyle: 'italic' }}>
                Bác sĩ đang thăm khám và lập bệnh án lâm sàng...
              </p>
            )}

            {clinicalData?.prescription?.summary ? (
              <div className="sheet-section">
                <span className="section-label">
                  <Pill size={14} /> Toa thuốc đã kê:
                </span>
                <pre className="prescription-box">{clinicalData.prescription.summary}</pre>
              </div>
            ) : null}

            {clinicalData?.record?.plan ? (
              <div className="sheet-section">
                <span className="section-label">Dặn dò & Hướng xử trí:</span>
                <p className="plan-text">{clinicalData.record.plan}</p>
              </div>
            ) : null}

            <div className="sheet-footer-notice">
              ✅ Bệnh án được ký số SmartCA và đồng bộ Cổng Đơn thuốc Quốc gia sau khi kết thúc buổi khám.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
