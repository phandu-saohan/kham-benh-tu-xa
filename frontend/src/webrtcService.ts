/**
 * WebRTC P2P Service for Telemedicine Video & Audio Consultation
 * Supports HD Audio/Video, Front/Back Camera Switching on Mobile,
 * Google Meet Style Screen Sharing for Doctor,
 * Real-time In-Call Chat & Medical File/Image Sharing,
 * Canvas/Oscillator Fallback if hardware is missing, and WebSocket Signaling.
 */

import { getApiBaseUrl } from './api'

export interface WebRTCState {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  connectionState: RTCPeerConnectionState
  isAudioMuted: boolean
  isVideoMuted: boolean
  hasCamera: boolean
  hasMicrophone: boolean
  facingMode: 'user' | 'environment'
  isConnected: boolean
  isScreenSharing: boolean
  isRemoteScreenSharing: boolean
}

type StreamCallback = (stream: MediaStream | null) => void
type StateCallback = (state: WebRTCState) => void
type ChatCallback = (message: any) => void

export class TelemedicineWebRTCService {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private ws: WebSocket | null = null
  private appointmentId: number = 0
  private role: 'doctor' | 'patient' = 'patient'
  private userName: string = ''

  private isAudioMuted: boolean = false
  private isVideoMuted: boolean = false
  private hasCamera: boolean = false
  private hasMicrophone: boolean = false
  private facingMode: 'user' | 'environment' = 'user'
  private isConnected: boolean = false
  private isScreenSharing: boolean = false
  private isRemoteScreenSharing: boolean = false

  private localStreamListeners: Set<StreamCallback> = new Set()
  private remoteStreamListeners: Set<StreamCallback> = new Set()
  private stateListeners: Set<StateCallback> = new Set()
  private chatMessageListeners: Set<ChatCallback> = new Set()

  private queuedIceCandidates: RTCIceCandidateInit[] = []
  private canvasAnimationId: number | null = null
  private dynamicRtcConfig: RTCConfiguration | null = null

  private readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  }

  /**
   * Lấy cấu hình máy chủ Coturn STUN/TURN động từ Backend có xác thực HMAC-SHA1
   * Giúp WebRTC kết nối xuyên qua mọi loại NAT đối xứng, mạng 4G/5G và tường lửa bệnh viện.
   */
  public async fetchProductionIceServers(): Promise<RTCConfiguration> {
    try {
      const baseUrl = getApiBaseUrl()
      const res = await fetch(`${baseUrl}/api/v1/telehealth/ice-servers`)
      if (res.ok) {
        const data = await res.json()
        if (data.iceServers && data.iceServers.length > 0) {
          this.dynamicRtcConfig = { iceServers: data.iceServers }
          console.log('[WebRTC] 🌐 Đã nạp cấu hình Coturn STUN/TURN Production thành công:', data.iceServers.length, 'máy chủ.')
          return this.dynamicRtcConfig
        }
      }
    } catch (e) {
      console.warn('[WebRTC] Không thể lấy ICE servers động từ backend, dùng fallback cấu hình mặc định:', e)
    }
    return this.RTC_CONFIG
  }

  public getState(): WebRTCState {
    return {
      localStream: this.localStream,
      remoteStream: this.remoteStream,
      connectionState: this.peerConnection?.connectionState || 'new',
      isAudioMuted: this.isAudioMuted,
      isVideoMuted: this.isVideoMuted,
      hasCamera: this.hasCamera,
      hasMicrophone: this.hasMicrophone,
      facingMode: this.facingMode,
      isConnected: this.isConnected,
      isScreenSharing: this.isScreenSharing,
      isRemoteScreenSharing: this.isRemoteScreenSharing
    }
  }

  public onLocalStream(cb: StreamCallback): () => void {
    this.localStreamListeners.add(cb)
    if (this.localStream) cb(this.localStream)
    return () => this.localStreamListeners.delete(cb)
  }

  public onRemoteStream(cb: StreamCallback): () => void {
    this.remoteStreamListeners.add(cb)
    if (this.remoteStream) cb(this.remoteStream)
    return () => this.remoteStreamListeners.delete(cb)
  }

  public onStateChange(cb: StateCallback): () => void {
    this.stateListeners.add(cb)
    cb(this.getState())
    return () => this.stateListeners.delete(cb)
  }

  public onChatMessage(cb: ChatCallback): () => void {
    this.chatMessageListeners.add(cb)
    return () => this.chatMessageListeners.delete(cb)
  }

  private notifyState() {
    const s = this.getState()
    this.stateListeners.forEach(cb => {
      try { cb(s) } catch (err) { console.error(err) }
    })
  }

  /**
   * Khởi tạo thiết bị đa phương tiện (Microphone & Camera)
   */
  public async initMedia(facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
    this.facingMode = facingMode

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }

    let audioTrack: MediaStreamTrack | null = null
    let videoTrack: MediaStreamTrack | null = null

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      const vTracks = stream.getVideoTracks()
      const aTracks = stream.getAudioTracks()
      if (vTracks.length > 0) {
        videoTrack = vTracks[0]
        this.hasCamera = true
      }
      if (aTracks.length > 0) {
        audioTrack = aTracks[0]
        this.hasMicrophone = true
      }
    } catch (err) {
      console.warn('[WebRTC] Không lấy được đồng thời Audio + Video, đang thử Audio riêng...', err)
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioTrack = aStream.getAudioTracks()[0] || null
        this.hasMicrophone = !!audioTrack
      } catch (aErr) {
        console.warn('[WebRTC] Microphone không khả dụng hoặc bị từ chối:', aErr)
      }
    }

    if (!videoTrack) {
      this.hasCamera = false
      videoTrack = this.createFallbackCanvasTrack()
    }

    if (!audioTrack) {
      this.hasMicrophone = false
      audioTrack = this.createSilentAudioTrack()
    }

    const combinedStream = new MediaStream([videoTrack, audioTrack])
    this.localStream = combinedStream

    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders()
      senders.forEach(sender => {
        if (sender.track?.kind === 'video' && videoTrack && !this.isScreenSharing) {
          sender.replaceTrack(videoTrack)
        } else if (sender.track?.kind === 'audio' && audioTrack) {
          sender.replaceTrack(audioTrack)
        }
      })
    }

    this.localStreamListeners.forEach(cb => cb(this.localStream))
    this.notifyState()
    return combinedStream
  }

  private createFallbackCanvasTrack(): MediaStreamTrack {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    let offset = 0

    const draw = () => {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let x = 0; x < canvas.width; x++) {
        const freq = (x + offset) * 0.04
        let y = canvas.height / 2 + Math.sin(freq) * 10
        if (x % 160 > 130 && x % 160 < 145) {
          y += ((x % 160) - 137) * -12
        }
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      offset = (offset + 4) % 1000

      ctx.fillStyle = '#047857'
      ctx.beginPath()
      ctx.arc(canvas.width / 2, canvas.height / 2 - 40, 48, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(this.role === 'doctor' ? '👨‍⚕️' : '🧑‍💼', canvas.width / 2, canvas.height / 2 - 32)

      ctx.font = 'bold 16px system-ui, sans-serif'
      ctx.fillText(
        this.userName || (this.role === 'doctor' ? 'Bác sĩ điều trị' : 'Bệnh nhân'),
        canvas.width / 2,
        canvas.height / 2 + 40
      )

      ctx.font = '13px system-ui, sans-serif'
      ctx.fillStyle = '#94a3b8'
      ctx.fillText('Đang đàm thoại âm thanh trực tiếp (Audio Live)', canvas.width / 2, canvas.height / 2 + 65)

      this.canvasAnimationId = requestAnimationFrame(draw)
    }

    draw()
    const stream = canvas.captureStream(25)
    return stream.getVideoTracks()[0]
  }

  private createSilentAudioTrack(): MediaStreamTrack {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        const ctx = new AudioCtx()
        const osc = ctx.createOscillator()
        const dst = osc.connect(ctx.createMediaStreamDestination())
        osc.start()
        const track = (dst as any).stream.getAudioTracks()[0]
        track.enabled = false
        return track
      }
    } catch (e) {
      console.warn('AudioContext failed:', e)
    }
    const canvas = document.createElement('canvas')
    const stream = (canvas as any).captureStream?.() || new MediaStream()
    return stream.getAudioTracks()[0] || new MediaStreamTrack()
  }

  /**
   * Kết nối phòng khám qua WebSocket và khởi tạo WebRTC Session
   */
  public async joinRoom(appointmentId: number, role: 'doctor' | 'patient', userName: string) {
    this.appointmentId = appointmentId
    this.role = role
    this.userName = userName

    // Nạp cấu hình Coturn TURN/STUN Production trước khi thiết lập kết nối
    await this.fetchProductionIceServers()

    if (!this.localStream) {
      await this.initMedia('user')
    }

    this.createPeerConnection()
    this.connectWebSocket()
  }

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return ''
    const apiBase = getApiBaseUrl()
    if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
      const parsed = new URL(apiBase)
      const wsProto = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${wsProto}//${parsed.host}/api/v1/ws/${this.appointmentId}`
    }
    const isHttps = window.location.protocol === 'https:'
    const wsProto = isHttps ? 'wss:' : 'ws:'
    let host = window.location.host
    if (import.meta.env.DEV) {
      host = `${window.location.hostname}:8000`
    }
    return `${wsProto}//${host}/api/v1/ws/${this.appointmentId}`
  }

  private connectWebSocket() {
    if (this.ws) {
      try { this.ws.close() } catch {}
    }

    const wsUrl = this.getWebSocketUrl()
    console.log(`[WebRTC Signaling] 📡 Đang kết nối tới ${wsUrl}`)
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log(`[WebRTC Signaling] ✅ Đã kết nối Gateway! Role: ${this.role}`)
      this.sendSignalingMessage({
        type: 'JOIN_ROOM',
        appointment_id: this.appointmentId,
        role: this.role,
        userName: this.userName
      })

      if (this.role === 'doctor') {
        setTimeout(() => this.initiateOffer(), 500)
      }
    }

    this.ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data)
        await this.handleSignalingMessage(msg)
      } catch (err) {
        console.error('[WebRTC Signaling Parse Error]', err)
      }
    }

    this.ws.onclose = () => {
      console.warn('[WebRTC Signaling] Socket đã đóng')
      this.isConnected = false
      this.notifyState()
    }

    this.ws.onerror = (err) => {
      console.warn('[WebRTC Signaling Error]', err)
    }
  }

  private sendSignalingMessage(msg: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }

  private createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    const config = this.dynamicRtcConfig || this.RTC_CONFIG
    this.peerConnection = new RTCPeerConnection(config)

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })
    }

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'WEBRTC_ICE_CANDIDATE',
          appointment_id: this.appointmentId,
          role: this.role,
          candidate: event.candidate.toJSON()
        })
      }
    }

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] 🎬 Nhận được luồng từ xa!', event.streams)
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream()
        }
        this.remoteStream.addTrack(event.track)
      }
      this.remoteStreamListeners.forEach(cb => cb(this.remoteStream))
      this.notifyState()
    }

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState || 'new'
      console.log(`[WebRTC] 🌐 Trạng thái kết nối P2P: ${state}`)
      this.isConnected = state === 'connected'
      this.notifyState()
    }

    this.peerConnection.onnegotiationneeded = async () => {
      if (this.role === 'doctor') {
        await this.initiateOffer()
      }
    }
  }

  public async initiateOffer() {
    if (!this.peerConnection) return
    try {
      console.log('[WebRTC] 📞 Khởi tạo Offer SDP...')
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      await this.peerConnection.setLocalDescription(offer)
      this.sendSignalingMessage({
        type: 'WEBRTC_OFFER',
        appointment_id: this.appointmentId,
        role: this.role,
        sdp: offer
      })
    } catch (err) {
      console.error('[WebRTC Create Offer Error]', err)
    }
  }

  private async handleSignalingMessage(msg: any) {
    if (msg.role === this.role) return

    switch (msg.type) {
      case 'JOIN_ROOM':
        console.log(`[WebRTC] Thành viên mới tham gia: ${msg.userName} (${msg.role})`)
        if (this.role === 'doctor') {
          await this.initiateOffer()
        }
        break

      case 'WEBRTC_OFFER':
        if (msg.sdp && this.peerConnection) {
          console.log('[WebRTC] 📥 Nhận Offer SDP từ đối phương...')
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          
          while (this.queuedIceCandidates.length > 0) {
            const cand = this.queuedIceCandidates.shift()
            if (cand) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            }
          }

          const answer = await this.peerConnection.createAnswer()
          await this.peerConnection.setLocalDescription(answer)
          this.sendSignalingMessage({
            type: 'WEBRTC_ANSWER',
            appointment_id: this.appointmentId,
            role: this.role,
            sdp: answer
          })
        }
        break

      case 'WEBRTC_ANSWER':
        if (msg.sdp && this.peerConnection) {
          console.log('[WebRTC] 📥 Nhận Answer SDP từ đối phương, hoàn tất bắt tay SDP!')
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          
          while (this.queuedIceCandidates.length > 0) {
            const cand = this.queuedIceCandidates.shift()
            if (cand) {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            }
          }
        }
        break

      case 'WEBRTC_ICE_CANDIDATE':
        if (msg.candidate && this.peerConnection) {
          if (!this.peerConnection.remoteDescription) {
            this.queuedIceCandidates.push(msg.candidate)
          } else {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {})
          }
        }
        break

      case 'SCREEN_SHARE_STATUS':
        console.log(`[WebRTC] Trạng thái chia sẻ màn hình từ ${msg.role}: ${msg.isSharing}`)
        this.isRemoteScreenSharing = !!msg.isSharing
        this.notifyState()
        break

      case 'CHAT_MESSAGE':
        if (msg.message) {
          this.chatMessageListeners.forEach(cb => {
            try { cb(msg.message) } catch (e) { console.error(e) }
          })
        }
        break

      case 'PEER_LEFT':
      case 'CALL_ENDED':
        console.log('[WebRTC] Đối phương đã rời phòng.')
        this.remoteStream = null
        this.isRemoteScreenSharing = false
        this.remoteStreamListeners.forEach(cb => cb(null))
        this.notifyState()
        break
    }
  }

  /**
   * Bắt đầu chia sẻ màn hình giống Google Meet
   */
  public async startScreenShare(): Promise<boolean> {
    if (!navigator.mediaDevices || !(navigator.mediaDevices as any).getDisplayMedia) {
      throw new Error('Trình duyệt không hỗ trợ tính năng chia sẻ màn hình.')
    }

    try {
      console.log('[WebRTC ScreenShare] 🖥️ Yêu cầu chọn màn hình/cửa sổ chia sẻ...')
      const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      })

      const screenTrack = screenStream.getVideoTracks()[0]
      if (!screenTrack) return false

      this.screenStream = screenStream
      this.isScreenSharing = true

      // Thay thế video track trên Peer Connection
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders()
        const videoSender = senders.find(s => s.track?.kind === 'video')
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack)
        }
      }

      // Khi người dùng bấm "Dừng chia sẻ" trên thanh trình duyệt (Chrome/Edge blue bar)
      screenTrack.onended = () => {
        this.stopScreenShare()
      }

      // Thông báo cho bên kia biết để hiển thị huy hiệu màn hình chia sẻ
      this.sendSignalingMessage({
        type: 'SCREEN_SHARE_STATUS',
        appointment_id: this.appointmentId,
        role: this.role,
        isSharing: true
      })

      this.notifyState()
      return true
    } catch (err) {
      console.warn('[WebRTC ScreenShare] Đã huỷ hoặc lỗi chia sẻ màn hình:', err)
      return false
    }
  }

  /**
   * Dừng chia sẻ màn hình và quay về Webcam/Canvas
   */
  public async stopScreenShare(): Promise<void> {
    console.log('[WebRTC ScreenShare] 🛑 Dừng chia sẻ màn hình, phục hồi Camera...')
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop())
      this.screenStream = null
    }

    this.isScreenSharing = false

    // Phục hồi lại camera hoặc canvas fallback
    const camTrack = this.localStream?.getVideoTracks()[0] || null
    if (this.peerConnection && camTrack) {
      const senders = this.peerConnection.getSenders()
      const videoSender = senders.find(s => s.track?.kind === 'video')
      if (videoSender) {
        await videoSender.replaceTrack(camTrack)
      }
    }

    this.sendSignalingMessage({
      type: 'SCREEN_SHARE_STATUS',
      appointment_id: this.appointmentId,
      role: this.role,
      isSharing: false
    })

    this.notifyState()
  }

  /**
   * Bật/Tắt Micro
   */
  public toggleAudio(): boolean {
    if (!this.localStream) return false
    this.isAudioMuted = !this.isAudioMuted
    this.localStream.getAudioTracks().forEach(t => {
      t.enabled = !this.isAudioMuted
    })
    this.notifyState()
    return this.isAudioMuted
  }

  /**
   * Bật/Tắt Video
   */
  public toggleVideo(): boolean {
    if (!this.localStream) return false
    this.isVideoMuted = !this.isVideoMuted
    this.localStream.getVideoTracks().forEach(t => {
      t.enabled = !this.isVideoMuted
    })
    this.notifyState()
    return this.isVideoMuted
  }

  /**
   * Lật Camera Trước/Sau (Dành cho Bệnh nhân dùng điện thoại)
   */
  public async switchCamera(): Promise<void> {
    const nextFacing = this.facingMode === 'user' ? 'environment' : 'user'
    await this.initMedia(nextFacing)
  }

  /**
   * Kết thúc cuộc gọi & Dọn dẹp tài nguyên
   */
  public endCall() {
    console.log('[WebRTC] 🛑 Đóng phiên kết thúc cuộc gọi...')
    this.sendSignalingMessage({
      type: 'CALL_ENDED',
      appointment_id: this.appointmentId,
      role: this.role
    })

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop())
      this.screenStream = null
    }

    if (this.canvasAnimationId) {
      cancelAnimationFrame(this.canvasAnimationId)
      this.canvasAnimationId = null
    }

    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.ws) {
      try { this.ws.close() } catch {}
      this.ws = null
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }

    this.remoteStream = null
    this.queuedIceCandidates = []
    this.isConnected = false
    this.isScreenSharing = false
    this.isRemoteScreenSharing = false

    this.localStreamListeners.forEach(cb => cb(null))
    this.remoteStreamListeners.forEach(cb => cb(null))
    this.notifyState()
  }
}

export const webrtcService = new TelemedicineWebRTCService()
