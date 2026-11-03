import { useEffect, useState, useRef } from 'react'
import {
  Clock,
  User,
  Heart,
  Activity,
  Thermometer,
  Wind,
  CheckCircle2,
  Video,
  Mic,
  Camera,
  ArrowLeft,
  Bell,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  Volume2
} from 'lucide-react'
import {
  type Appointment,
  type User as UserType,
  type WaitingRoomStatus,
  getWaitingRoomStatus
} from './api'

interface PatientWaitingRoomProps {
  appointment: Appointment
  user: UserType
  onBack: () => void
  onEnterConsultation: (appointment: Appointment) => void
}

export function PatientWaitingRoom({
  appointment,
  user,
  onBack,
  onEnterConsultation
}: PatientWaitingRoomProps) {
  const [waitingStatus, setWaitingStatus] = useState<WaitingRoomStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDoctorCalling, setIsDoctorCalling] = useState(false)
  const [autoJoinCountdown, setAutoJoinCountdown] = useState<number | null>(null)
  const [isCameraTesting, setIsCameraTesting] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const pollTimerRef = useRef<any>(null)
  const countdownTimerRef = useRef<any>(null)
  const audioChimePlayedRef = useRef(false)

  // Phát âm thanh chuông mời vào phòng khám bằng Web Audio API
  const playCallChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now) // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3) // A5
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.6)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, now + 0.3) // A5
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.7) // D6
      gain2.gain.setValueAtTime(0.35, now + 0.3)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.3)
      osc2.stop(now + 1.2)
    } catch (e) {
      console.log('Chime playback error:', e)
    }
  }

  // Polling trạng thái phòng chờ mỗi 2.5s
  const checkStatus = async () => {
    try {
      const res = await getWaitingRoomStatus(appointment.id)
      setWaitingStatus(res)
      setIsLoading(false)

      if (res.is_called || res.status === 'in_progress') {
        if (!isDoctorCalling) {
          setIsDoctorCalling(true)
          if (!audioChimePlayedRef.current) {
            audioChimePlayedRef.current = true
            playCallChime()
          }
          if (autoJoinCountdown === null) {
            setAutoJoinCountdown(5)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching waiting room status:', err)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
    pollTimerRef.current = setInterval(checkStatus, 2500)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [appointment.id])

  // Đếm ngược tự động vào phòng khám khi bác sĩ gọi
  useEffect(() => {
    if (autoJoinCountdown !== null && autoJoinCountdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setAutoJoinCountdown(autoJoinCountdown - 1)
      }, 1000)
    } else if (autoJoinCountdown === 0) {
      handleJoin()
    }
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    }
  }, [autoJoinCountdown])

  const handleJoin = () => {
    stopCameraTest()
    onEnterConsultation({
      ...appointment,
      status: 'in_progress'
    })
  }

  // Bật/tắt camera soi gương kiểm tra trước
  const toggleCameraTest = async () => {
    if (isCameraTesting) {
      stopCameraTest()
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setCameraStream(stream)
        setIsCameraTesting(true)
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream
        }

        // Đo âm lượng mic
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const audioCtx = new AudioCtx()
          audioContextRef.current = audioCtx
          const analyser = audioCtx.createAnalyser()
          const source = audioCtx.createMediaStreamSource(stream)
          source.connect(analyser)
          analyser.fftSize = 64
          const dataArray = new Uint8Array(analyser.frequencyBinCount)

          const updateLevel = () => {
            if (!stream.active) return
            analyser.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
            const avg = sum / dataArray.length
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
            requestAnimationFrame(updateLevel)
          }
          updateLevel()
        }
      } catch (err) {
        alert('Không thể mở camera/micro. Vui lòng cấp quyền truy cập trên trình duyệt.')
      }
    }
  }

  const stopCameraTest = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setIsCameraTesting(false)
  }

  useEffect(() => {
    return () => {
      stopCameraTest()
    }
  }, [])

  const vitals = waitingStatus?.vitals || {
    blood_pressure: appointment.blood_pressure,
    pulse: appointment.pulse,
    temperature: appointment.temperature,
    spo2: appointment.spo2,
    weight: appointment.weight,
    height: appointment.height
  }

  return (
    <div className="waiting-room-page">
      {/* Top Navigation Bar */}
      <header className="waiting-room-header">
        <button className="btn-back-clean" onClick={onBack}>
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <div className="waiting-brand-tag">
          <Stethoscope size={18} color="#2563eb" />
          <span>CareConnect <b>Phòng Chờ Khám Trực Tuyến</b></span>
        </div>
        <div className="live-status-pill">
          <span className="live-pulse-dot" /> Đang Kết Nối Phòng Chờ
        </div>
      </header>

      {/* Main Container */}
      <div className="waiting-room-container">
        {/* Banner khi Bác sĩ bấm chuông gọi vào phòng khám */}
        {isDoctorCalling && (
          <div className="doctor-calling-banner animate-bounce-subtle">
            <div className="banner-icon-pulse">
              <Bell size={28} color="#ffffff" />
            </div>
            <div className="banner-text">
              <h3>Bác sĩ {waitingStatus?.doctor_name || 'phụ trách'} đang mời bạn vào phòng khám!</h3>
              <p>Mọi chỉ số sinh hiệu và hồ sơ đã sẵn sàng. Vui lòng bấm xác nhận để kết nối video.</p>
              {autoJoinCountdown !== null && (
                <span className="countdown-pill">
                  Tự động chuyển vào sau <b>{autoJoinCountdown}s</b>
                </span>
              )}
            </div>
            <button className="btn-join-room-now" onClick={handleJoin}>
              <Video size={18} /> Vào Gặp Bác Sĩ Ngay
            </button>
          </div>
        )}

        <div className="waiting-room-grid">
          {/* Left Column: Queue Number & Doctor Info */}
          <div className="waiting-main-card">
            <div className="queue-status-hero">
              <span className="queue-label">SỐ THỨ TỰ PHÒNG CHỜ CỦA BẠN</span>
              <div className="queue-number-display">
                #{String(waitingStatus?.queue_number || 1).padStart(2, '0')}
              </div>
              <div className="queue-badge-detail">
                <Clock size={16} color="#d97706" />
                <span>
                  Thời gian chờ ước tính: <b>~{waitingStatus?.estimated_wait_minutes || 5} phút</b>
                </span>
                {waitingStatus && waitingStatus.patients_ahead > 0 && (
                  <span className="patients-ahead-tag">
                    (Còn {waitingStatus.patients_ahead} bệnh nhân phía trước)
                  </span>
                )}
              </div>
            </div>

            {/* Doctor Info Card */}
            <div className="waiting-doctor-card">
              <div className="doc-avatar-box">
                <User size={30} color="#2563eb" />
              </div>
              <div className="doc-info-text">
                <span className="doc-title-role">{waitingStatus?.doctor_title || 'Bác sĩ chuyên khoa'}</span>
                <h4>{waitingStatus?.doctor_name || 'Bác sĩ phụ trách'}</h4>
                <p className="doc-dept">{waitingStatus?.department_name || 'Khoa Nội Tổng Quát'}</p>
              </div>
              <div className="doc-ready-status">
                <span className="dot-green" /> Đang trong ca trực
              </div>
            </div>

            {/* Reassurance Message */}
            <div className="waiting-reassurance-box">
              <div className="reassurance-icon">
                <ShieldCheck size={20} color="#059669" />
              </div>
              <div>
                <b>Điều dưỡng đã hoàn tất tiếp nhận & đo sinh hiệu</b>
                <p>
                  Bác sĩ đang xem xét bệnh án, tiền sử và kết quả cận lâm sàng của bạn. 
                  Bác sĩ sẽ chủ động bấm chuông mời bạn vào ngay khi hoàn tất chuẩn bị chuyên môn. 
                  Bạn hoàn toàn yên tâm ngồi thư giãn tại đây.
                </p>
              </div>
            </div>

            {/* Self Camera & Audio Check */}
            <div className="device-check-section">
              <div className="device-check-header">
                <div>
                  <h5>Kiểm tra Camera & Micro của bạn</h5>
                  <small>Đảm bảo hình ảnh rõ nét và âm thanh chuẩn trước khi gặp bác sĩ</small>
                </div>
                <button
                  className={`btn-device-toggle ${isCameraTesting ? 'active' : ''}`}
                  onClick={toggleCameraTest}
                >
                  <Camera size={15} />
                  {isCameraTesting ? 'Tắt xem trước' : 'Bật xem thử Camera'}
                </button>
              </div>

              {isCameraTesting && (
                <div className="camera-preview-box">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="self-preview-video"
                  />
                  <div className="audio-meter-bar-wrap">
                    <div className="audio-meter-label">
                      <Mic size={13} color="#059669" /> Micro:
                    </div>
                    <div className="audio-meter-track">
                      <div
                        className="audio-meter-fill"
                        style={{ width: `${audioLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pre-consultation Vitals & Calming Guide */}
          <div className="waiting-sidebar-card">
            {/* Vitals Summary Card */}
            <div className="card-box vitals-summary-panel">
              <div className="card-box-header">
                <Activity size={18} color="#059669" />
                <h5>Sinh Hiệu Điều Dưỡng Đã Đo</h5>
              </div>
              <p className="card-box-desc">
                Chỉ số sinh tồn của bạn đã được lưu vào bệnh án điện tử EMR:
              </p>

              <div className="vitals-chips-grid">
                <div className="vital-chip">
                  <div className="vital-chip-label">
                    <Heart size={14} color="#dc2626" /> Huyết áp
                  </div>
                  <div className="vital-chip-val">
                    {vitals.blood_pressure || '120/80'} <small>mmHg</small>
                  </div>
                  <span className="vital-chip-badge normal">Ổn định</span>
                </div>

                <div className="vital-chip">
                  <div className="vital-chip-label">
                    <Activity size={14} color="#059669" /> Nhịp tim / Mạch
                  </div>
                  <div className="vital-chip-val">
                    {vitals.pulse || '76'} <small>bpm</small>
                  </div>
                  <span className="vital-chip-badge normal">Bình thường</span>
                </div>

                <div className="vital-chip">
                  <div className="vital-chip-label">
                    <Wind size={14} color="#2563eb" /> Nồng độ SpO2
                  </div>
                  <div className="vital-chip-val">
                    {vitals.spo2 || '99'} <small>%</small>
                  </div>
                  <span className="vital-chip-badge normal">Tốt</span>
                </div>

                <div className="vital-chip">
                  <div className="vital-chip-label">
                    <Thermometer size={14} color="#d97706" /> Thân nhiệt
                  </div>
                  <div className="vital-chip-val">
                    {vitals.temperature || '36.6'} <small>°C</small>
                  </div>
                  <span className="vital-chip-badge normal">Chuẩn</span>
                </div>
              </div>

              {vitals.weight && vitals.height && (
                <div className="bmi-inline-note">
                  <span>Cân nặng: <b>{vitals.weight} kg</b></span>
                  <span> • </span>
                  <span>Chiều cao: <b>{vitals.height} cm</b></span>
                </div>
              )}

              {waitingStatus?.triage_notes && (
                <div className="nurse-triage-remark">
                  <b>Ghi chú điều dưỡng:</b> {waitingStatus.triage_notes}
                </div>
              )}
            </div>

            {/* Preparation & Relaxation Tips */}
            <div className="card-box tips-panel">
              <div className="card-box-header">
                <Sparkles size={18} color="#d97706" />
                <h5>Chuẩn Bị Để Cuộc Khám Đạt Hiệu Quả Nhất</h5>
              </div>
              <ul className="waiting-tips-list">
                <li>
                  <CheckCircle2 size={15} color="#059669" />
                  <span><b>Ngồi nơi yên tĩnh</b>, đủ ánh sáng chiếu thẳng vào khuôn mặt.</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#059669" />
                  <span><b>Chuẩn bị sẵn</b> các đơn thuốc cũ, vỏ hộp thuốc hoặc kết quả xét nghiệm gần nhất.</span>
                </li>
                <li>
                  <CheckCircle2 size={15} color="#059669" />
                  <span><b>Hít thở sâu & thư giãn:</b> Thở chậm 4 nhịp giúp nhịp tim và huyết áp ổn định nhất khi trao đổi cùng bác sĩ.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
