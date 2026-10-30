import { useEffect, useState, useRef } from 'react'
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react'
import '@livekit/components-styles'
import {
  ArrowLeft,
  ShieldCheck,
  Video,
  PhoneOff,
  FileText,
  Clock,
  X,
  ChevronUp,
  Pill,
  Sparkles,
  Stethoscope
} from 'lucide-react'
import { request, type Appointment, type User, getClinicalRecord } from './api'

export function VideoRoom({
  appointment,
  onBack,
  user
}: {
  appointment: Appointment
  onBack: () => void
  user: User
}) {
  const [connection, setConnection] = useState<{
    server_url: string
    token: string
    room_name: string
  } | null>(null)
  const [error, setError] = useState('')
  const [callDuration, setCallDuration] = useState(0)
  const [showClinicalSheet, setShowClinicalSheet] = useState(false)
  const [clinicalData, setClinicalData] = useState<any>(null)
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

  // 3. Kết nối LiveKit WebRTC Session
  useEffect(() => {
    request<{ server_url: string; token: string; room_name: string }>(
      `/api/v1/telehealth/sessions/${appointment.id}/join-token`,
      { method: 'POST' }
    )
      .then(setConnection)
      .catch(e => setError(e instanceof Error ? e.message : 'Không kết nối được phòng khám'))
  }, [appointment.id])

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
          onClick={onBack}
          title="Rời phòng"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="mobile-doctor-header-info">
          <b>Buồng khám trực tuyến #{appointment.id}</b>
          <div className="call-status-row">
            <span className="live-pulse-dot" />
            <span className="timer-badge">
              <Clock size={12} /> {formatTime(callDuration)}
            </span>
            <span className="secure-badge">
              <ShieldCheck size={12} /> E2EE
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

      {error && <div className="alert error mobile-call-alert">{error}</div>}

      {!connection && !error && (
        <div className="mobile-video-loading">
          <div className="loading-spinner-circle">
            <Video size={36} className="spin" />
          </div>
          <h2>Đang kết nối bác sĩ...</h2>
          <p>Màn hình điện thoại sẽ luôn giữ sáng trong suốt cuộc gọi.</p>
          <small className="muted">Vui lòng cấp quyền Camera & Micro cho trình duyệt.</small>
        </div>
      )}

      {/* LiveKit Video Shell */}
      {connection && (
        <div className="mobile-livekit-container">
          <LiveKitRoom
            video
            audio
            token={connection.token}
            serverUrl={connection.server_url}
            connect
            data-lk-theme="default"
            className="mobile-livekit-room"
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      )}

      {/* Collapsible Clinical Bottom Sheet (Dành riêng cho bệnh nhân dùng điện thoại) */}
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
