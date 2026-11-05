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
import './patient-sanctuary.css'

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
    <div className="ps-scope">
      <div className="ps-waiting-viewport">
        {/* Top Navigation Bar */}
        <header className="ps-waiting-topbar">
          <button className="ps-btn-back" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại trang chủ
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--ps-navy)' }}>
            <Stethoscope size={18} color="var(--ps-primary)" />
            <span>CareConnect • <b>Phòng Chờ Khám Trực Tuyến</b></span>
          </div>
          <div className="ps-waiting-live-chip">
            <span className="ps-live-dot" /> Đang Kết Nối Phòng Chờ
          </div>
        </header>

        {/* Doctor Calling Hero Flash Banner */}
        {isDoctorCalling && (
          <div className="ps-doctor-calling-hero">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bell size={28} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                  Bác sĩ {waitingStatus?.doctor_name || 'phụ trách'} đang mời bạn vào phòng khám!
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '14px', opacity: 0.9 }}>
                  Hồ sơ bệnh án điện tử và sinh hiệu đã sẵn sàng.
                  {autoJoinCountdown !== null && (
                    <span style={{ marginLeft: '8px', fontWeight: 700 }}>
                      Tự động chuyển vào sau {autoJoinCountdown}s
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button className="ps-calling-btn-now" onClick={handleJoin}>
              <Video size={18} /> Vào Gặp Bác Sĩ Ngay
            </button>
          </div>
        )}

        <div className="ps-waiting-layout">
          {/* Cột trái: Số thứ tự phòng chờ & Thông tin Bác sĩ */}
          <div className="ps-waiting-card">
            {/* Big Queue Number Display */}
            <div className="ps-queue-hero">
              <span className="ps-queue-hero-label">SỐ THỨ TỰ PHÒNG CHỜ CỦA BẠN</span>
              <div className="ps-queue-big-number">
                #{String(waitingStatus?.queue_number || 1).padStart(2, '0')}
              </div>
              <div className="ps-queue-estimate">
                <Clock size={16} color="var(--ps-warning)" />
                <span>
                  Thời gian chờ ước tính: <b>~{waitingStatus?.estimated_wait_minutes || 5} phút</b>
                </span>
                {waitingStatus && waitingStatus.patients_ahead > 0 && (
                  <span style={{ color: 'var(--ps-primary)', fontWeight: 600 }}>
                    (Còn {waitingStatus.patients_ahead} người phía trước)
                  </span>
                )}
              </div>
            </div>

            {/* Doctor Info Card */}
            <div className="ps-waiting-doctor-card">
              <div className="ps-doc-avatar">
                🩺
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ps-primary)', textTransform: 'uppercase' }}>
                  {waitingStatus?.doctor_title || 'Bác sĩ chuyên khoa'}
                </span>
                <h4 style={{ margin: '2px 0 0', fontSize: '17px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  {waitingStatus?.doctor_name || 'Bác sĩ phụ trách'}
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ps-slate-muted)' }}>
                  {waitingStatus?.department_name || 'Khoa Nội Tổng Quát'}
                </p>
              </div>
              <span className="ps-badge-bhyt">
                <span className="ps-live-dot" /> Đang trực
              </span>
            </div>

            {/* Calming Reassurance Message */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdfa 0%, #eff6ff 100%)',
                border: '1px solid rgba(14, 116, 144, 0.2)',
                borderRadius: 'var(--ps-radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{ color: 'var(--ps-primary)', marginTop: '2px' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <b style={{ color: 'var(--ps-navy)', fontSize: '14px' }}>
                  Điều dưỡng đã hoàn tất tiếp nhận hồ sơ & sinh hiệu
                </b>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ps-slate)', lineHeight: 1.5 }}>
                  Bác sĩ đang xem xét lại tiền sử bệnh và kết quả cận lâm sàng của bạn. Ngay khi chuẩn bị xong,
                  bác sĩ sẽ nhấn chuông mời bạn vào phòng khám. Bạn hoàn toàn yên tâm nghỉ ngơi tại đây.
                </p>
              </div>
            </div>

            {/* Self Camera & Audio Diagnostic */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                    Kiểm Tra Camera & Micro Trước Cuộc Khám
                  </h4>
                  <small style={{ color: 'var(--ps-slate-muted)', fontSize: '12px' }}>
                    Đảm bảo âm thanh và hình ảnh rõ nét trước khi vào gặp bác sĩ
                  </small>
                </div>
                <button
                  type="button"
                  className={isCameraTesting ? 'ps-btn-secondary' : 'ps-btn-primary'}
                  onClick={toggleCameraTest}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  <Camera size={14} />
                  {isCameraTesting ? 'Tắt xem trước' : 'Bật xem thử Camera'}
                </button>
              </div>

              {isCameraTesting && (
                <div className="ps-camera-preview-container">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="ps-camera-video"
                  />
                  <div className="ps-audio-meter-overlay">
                    <Mic size={14} color="var(--ps-mint)" />
                    <span>Micro:</span>
                    <div className="ps-meter-track">
                      <div className="ps-meter-fill" style={{ width: `${audioLevel}%` }} />
                    </div>
                    <span>{audioLevel}%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Sinh hiệu đã đo & Hướng dẫn chuẩn bị */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Sinh hiệu */}
            <div className="ps-waiting-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--ps-primary)" />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  Sinh Hiệu Điều Dưỡng Đã Đo
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                    <Heart size={14} /> Huyết áp
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                    {vitals.blood_pressure || '120/80'} <small style={{ fontSize: '11px', fontWeight: 500 }}>mmHg</small>
                  </div>
                  <span className="ps-vital-status-pill normal">Ổn định</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ps-primary)', fontWeight: 600 }}>
                    <Activity size={14} /> Nhịp tim
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                    {vitals.pulse || '76'} <small style={{ fontSize: '11px', fontWeight: 500 }}>bpm</small>
                  </div>
                  <span className="ps-vital-status-pill normal">Chuẩn</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                    <Wind size={14} /> SpO2
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                    {vitals.spo2 || '99'} <small style={{ fontSize: '11px', fontWeight: 500 }}>%</small>
                  </div>
                  <span className="ps-vital-status-pill normal">Tối ưu</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
                    <Thermometer size={14} /> Thân nhiệt
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                    {vitals.temperature || '36.6'} <small style={{ fontSize: '11px', fontWeight: 500 }}>°C</small>
                  </div>
                  <span className="ps-vital-status-pill normal">Bình thường</span>
                </div>
              </div>

              {waitingStatus?.triage_notes && (
                <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '10px', fontSize: '12px', color: '#1e40af' }}>
                  <b>Ghi chú điều dưỡng:</b> {waitingStatus.triage_notes}
                </div>
              )}
            </div>

            {/* Hướng dẫn thư giãn & Chuẩn bị */}
            <div className="ps-waiting-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--ps-warning)" />
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  Chuẩn Bị Để Cuộc Khám Hiệu Quả
                </h4>
              </div>

              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--ps-slate)' }}>
                  <CheckCircle2 size={16} color="var(--ps-mint)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><b>Ngồi nơi yên tĩnh:</b> Đủ ánh sáng chiếu vào khuôn mặt, tránh ngồi ngược sáng.</span>
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--ps-slate)' }}>
                  <CheckCircle2 size={16} color="var(--ps-mint)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><b>Chuẩn bị sẵn:</b> Đơn thuốc cũ, hộp thuốc đang dùng hoặc kết quả xét nghiệm gần nhất.</span>
                </li>
                <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', color: 'var(--ps-slate)' }}>
                  <CheckCircle2 size={16} color="var(--ps-mint)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span><b>Hít thở sâu 4 nhịp:</b> Thư giãn tinh thần để huyết áp và nhịp tim ổn định nhất.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
