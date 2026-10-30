/**
 * WebRTC P2P Service for Telemedicine Video & Audio Consultation
 * Supports HD Audio/Video, Front/Back Camera Switching on Mobile,
 * Canvas/Oscillator Fallback if hardware is missing, and WebSocket Signaling.
 */

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
}

type StreamCallback = (stream: MediaStream | null) => void
type StateCallback = (state: WebRTCState) => void

export class TelemedicineWebRTCService {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
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

  private localStreamListeners: Set<StreamCallback> = new Set()
  private remoteStreamListeners: Set<StreamCallback> = new Set()
  private stateListeners: Set<StateCallback> = new Set()

  private queuedIceCandidates: RTCIceCandidateInit[] = []
  private canvasAnimationId: number | null = null

  private readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
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
      isConnected: this.isConnected
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

  private notifyState() {
    const s = this.getState()
    this.stateListeners.forEach(cb => {
      try { cb(s) } catch (err) { console.error(err) }
    })
  }

  /**
   * Khởi tạo thiết bị đa phương tiện (Microphone & Camera)
   * Tự động dự phòng nếu thiếu Webcam hoặc thiếu Micro để không bao giờ bị nghẽn WebRTC
   */
  public async initMedia(facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
    this.facingMode = facingMode

    // Nếu đã có stream đang active, dừng các track cũ
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop())
      this.localStream = null
    }

    let audioTrack: MediaStreamTrack | null = null
    let videoTrack: MediaStreamTrack | null = null

    // 1. Kiểm tra quyền & thiết bị thực tế
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
      // Thử lấy riêng Audio
      try {
        const aStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        audioTrack = aStream.getAudioTracks()[0] || null
        this.hasMicrophone = !!audioTrack
      } catch (aErr) {
        console.warn('[WebRTC] Microphone không khả dụng hoặc bị từ chối:', aErr)
      }
    }

    // 2. Dự phòng Video Track nếu không có Camera vật lý
    if (!videoTrack) {
      this.hasCamera = false
      videoTrack = this.createFallbackCanvasTrack()
    }

    // 3. Dự phòng Audio Track nếu không có Micro vật lý
    if (!audioTrack) {
      this.hasMicrophone = false
      audioTrack = this.createSilentAudioTrack()
    }

    const combinedStream = new MediaStream([videoTrack, audioTrack])
    this.localStream = combinedStream

    // Gửi track vào peer connection nếu đã được tạo
    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders()
      senders.forEach(sender => {
        if (sender.track?.kind === 'video' && videoTrack) {
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

  /**
   * Tạo video track giả lập chuẩn y tế khi không có webcam
   */
  private createFallbackCanvasTrack(): MediaStreamTrack {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    let offset = 0

    const draw = () => {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Vẽ lưới radar y tế
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

      // Vẽ sóng nhịp tim ECG
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

      // Vẽ avatar nhãn phòng khám
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

  /**
   * Tạo audio track im lặng nếu thiết bị không có micro
   */
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
    // Fallback nếu không có AudioContext
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

    // 1. Lấy luồng local media nếu chưa có
    if (!this.localStream) {
      await this.initMedia('user')
    }

    // 2. Thiết lập Peer Connection
    this.createPeerConnection()

    // 3. Kết nối WebSocket Signaling Gateway
    this.connectWebSocket()
  }

  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return ''
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

      // Nếu là Bác sĩ, chủ động tạo Offer ban đầu
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

    this.peerConnection = new RTCPeerConnection(this.RTC_CONFIG)

    // Thêm các track cục bộ vào kết nối
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection!.addTrack(track, this.localStream!)
      })
    }

    // Xử lý ICE Candidate phát hiện được
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

    // Nhận track từ xa (Đối phương)
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
      console.log('[WebRTC] 📞 Bác sĩ khởi tạo Offer SDP...')
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
    if (msg.role === this.role) return // Bỏ qua tin nhắn do chính mình gửi

    switch (msg.type) {
      case 'JOIN_ROOM':
        console.log(`[WebRTC] Thành viên mới tham gia: ${msg.userName} (${msg.role})`)
        if (this.role === 'doctor') {
          await this.initiateOffer()
        }
        break

      case 'WEBRTC_OFFER':
        if (msg.sdp && this.peerConnection) {
          console.log('[WebRTC] 📥 Nhận Offer SDP từ đối phương, đang phản hồi Answer...')
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
          
          // Thêm các ứng viên ICE đã xếp hàng
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

      case 'PEER_LEFT':
      case 'CALL_ENDED':
        console.log('[WebRTC] Đối phương đã rời phòng.')
        this.remoteStream = null
        this.remoteStreamListeners.forEach(cb => cb(null))
        this.notifyState()
        break
    }
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

    this.localStreamListeners.forEach(cb => cb(null))
    this.remoteStreamListeners.forEach(cb => cb(null))
    this.notifyState()
  }
}

export const webrtcService = new TelemedicineWebRTCService()
