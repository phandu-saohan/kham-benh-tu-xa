import { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Video, Stethoscope, ShieldCheck } from 'lucide-react'
import { type IncomingCallData } from './api'

export function IncomingCallModal({
  call,
  onAccept,
  onDecline
}: {
  call: IncomingCallData
  onAccept: () => void
  onDecline: () => void
}) {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<any>(null)
  const wakeLockRef = useRef<any>(null)

  // 1. Kích hoạt giữ sáng màn hình điện thoại (Screen Wake Lock)
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {
        console.log('Wake Lock unsupported or denied:', err)
      }
    }
    requestWakeLock()

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
      }
    }
  }, [])

  // 2. Kích hoạt nhạc chuông qua Web Audio API & Rung điện thoại
  useEffect(() => {
    function playChime() {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioCtx) return
        const ctx = audioCtxRef.current || new AudioCtx()
        audioCtxRef.current = ctx

        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {})
        }

        const now = ctx.currentTime
        // Tạo hợp âm chuông điện thoại y tế nhẹ nhàng (440Hz + 880Hz hòa âm)
        const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, now + idx * 0.18)

          gain.gain.setValueAtTime(0, now + idx * 0.18)
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.18 + 0.05)
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.4)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start(now + idx * 0.18)
          osc.stop(now + idx * 0.18 + 0.45)
        })
      } catch (e) {
        console.log('Audio chime error:', e)
      }
    }

    function triggerVibration() {
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate([400, 200, 400, 200, 600])
        }
      } catch {}
    }

    // Phát chuông lần đầu ngay khi pop-up mở
    playChime()
    triggerVibration()

    // Lặp lại chu kỳ chuông mỗi 2.8 giây
    intervalRef.current = setInterval(() => {
      playChime()
      triggerVibration()
    }, 2800)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0)
      }
    }
  }, [])

  function handleAccept() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if ('vibrate' in navigator) navigator.vibrate(0)
    onAccept()
  }

  function handleDecline() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if ('vibrate' in navigator) navigator.vibrate(0)
    onDecline()
  }

  const doctorName = call.doctor?.full_name || 'Bác sĩ chuyên khoa'
  const deptName = call.doctor?.department_name || 'Khoa Khám bệnh từ xa'

  return (
    <div className="incoming-call-overlay">
      {/* Top Header */}
      <div className="incoming-call-header">
        <div className="incoming-call-badge">
          <Stethoscope size={16} />
          <span>CUỘC GỌI KHÁM BỆNH TRỰC TUYẾN</span>
        </div>
        <p className="incoming-call-subtitle">Màn hình đang sáng · Đang đổ chuông nhận cuộc gọi...</p>
      </div>

      {/* Center Doctor Avatar & Waves */}
      <div className="incoming-call-center">
        <div className="avatar-pulse-container">
          <div className="pulse-wave wave-1" />
          <div className="pulse-wave wave-2" />
          <div className="pulse-wave wave-3" />
          <div className="incoming-avatar">
            <Video size={48} />
          </div>
        </div>

        <div className="incoming-doctor-info">
          <h2>{doctorName}</h2>
          <span className="dept-tag">{deptName}</span>
          {call.doctor?.cchn && <small className="cchn-text">CCHN: {call.doctor.cchn}</small>}
          <div className="call-reason-box">
            <b>Lý do khám:</b> {call.reason || 'Tư vấn sức khỏe trực tuyến'}
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="incoming-call-actions">
        {/* Nút Từ chối */}
        <div className="action-button-group">
          <button
            type="button"
            className="call-btn btn-decline"
            onClick={handleDecline}
            title="Từ chối cuộc gọi"
          >
            <PhoneOff size={30} />
          </button>
          <span>Từ chối</span>
        </div>

        {/* Nút Trả lời */}
        <div className="action-button-group">
          <button
            type="button"
            className="call-btn btn-accept pulse-accept"
            onClick={handleAccept}
            title="Trả lời & Vào phòng khám ngay"
          >
            <Phone size={34} />
          </button>
          <span style={{ fontWeight: 700, color: '#4ade80' }}>Trả lời (Vào khám)</span>
        </div>
      </div>

      {/* Footer Security Note */}
      <div className="incoming-call-footer">
        <ShieldCheck size={14} />
        <span>Bảo mật y tế E2EE · Tuân thủ Nghị định 13/2023/NĐ-CP</span>
      </div>
    </div>
  )
}
