import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference, RoomAudioRenderer, ControlBar } from '@livekit/components-react'
import '@livekit/components-styles'
import { ArrowLeft, ShieldCheck, Video } from 'lucide-react'
import { request, type Appointment, type User } from './api'

export function VideoRoom({ appointment, onBack, user }: { appointment: Appointment; onBack: () => void; user: User }) {
  const [connection, setConnection] = useState<{server_url:string;token:string;room_name:string}|null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    request<{server_url:string;token:string;room_name:string}>(`/api/v1/telehealth/sessions/${appointment.id}/join-token`, { method: 'POST' })
      .then(setConnection).catch(e => setError(e instanceof Error ? e.message : 'Không tạo được phiên video'))
  }, [appointment.id])
  return <div className="video-page"><header className="video-header"><button className="secondary" onClick={onBack}><ArrowLeft size={16}/> Quay lại</button><div><b>Phòng khám trực tuyến</b><small>Lịch hẹn #{appointment.id} · {user.full_name}</small></div><span className="secure-label"><ShieldCheck size={16}/> Kết nối bảo mật</span></header>
    {error && <div className="alert error">{error}</div>}
    {!connection && !error && <div className="video-loading"><Video size={30}/><h2>Đang chuẩn bị phòng khám...</h2><p>Vui lòng cho phép trình duyệt truy cập camera và micro khi được hỏi.</p></div>}
    {connection && <div className="livekit-shell"><LiveKitRoom video audio token={connection.token} serverUrl={connection.server_url} connect onDisconnected={()=>{}} data-lk-theme="default"><div className="video-room-title"><div><span className="status-dot"/> Đã kết nối phòng {connection.room_name}</div><span className="tiny">Không ghi hình cuộc khám</span></div><VideoConference/><RoomAudioRenderer/><div className="video-note"><ShieldCheck size={16}/> Chỉ tham gia khi bạn đã xác minh đúng bệnh nhân và lịch hẹn.</div></LiveKitRoom></div>}
  </div>
}
