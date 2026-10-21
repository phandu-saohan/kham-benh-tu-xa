// WebRTC Service: Kết nối Video & Audio Trực tiếp Hai chiều (Peer-to-Peer Full-Duplex)
// Giữa Bác sĩ (Doctor Workstation) và Bệnh nhân (Patient Portal)

import { websocketService } from './websocketService';

export interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: RTCPeerConnectionState;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  hasCameraPermission: boolean;
  isUsingFallbackStream: boolean;
}

type StreamCallback = (stream: MediaStream | null) => void;
type StateCallback = (state: WebRTCState) => void;

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private isCaller = false;
  private role: 'doctor' | 'patient' = 'doctor';
  private patientId = 'BN-2026-0892';

  private localStreamListeners: Set<StreamCallback> = new Set();
  private remoteStreamListeners: Set<StreamCallback> = new Set();
  private stateListeners: Set<StateCallback> = new Set();

  private isAudioMuted = false;
  private isVideoMuted = false;
  private hasCameraPermission = false;
  private isUsingFallbackStream = false;
  private fallbackAnimationTimer: any = null;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];

  // Cấu hình STUN máy chủ công cộng Google & Cloudflare
  private readonly RTC_CONFIG: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ]
  };

  constructor() {
    this.setupWebSocketListeners();
  }

  public setRole(role: 'doctor' | 'patient', patientId = 'BN-2026-0892') {
    this.role = role;
    this.patientId = patientId;
  }

  // Đăng ký nhận luồng video cục bộ (Camera của mình)
  public onLocalStream(cb: StreamCallback) {
    this.localStreamListeners.add(cb);
    if (this.localStream) cb(this.localStream);
    return () => this.localStreamListeners.delete(cb);
  }

  // Đăng ký nhận luồng video từ xa (Camera đối phương)
  public onRemoteStream(cb: StreamCallback) {
    this.remoteStreamListeners.add(cb);
    if (this.remoteStream) cb(this.remoteStream);
    return () => this.remoteStreamListeners.delete(cb);
  }

  public onStateChange(cb: StateCallback) {
    this.stateListeners.add(cb);
    cb(this.getState());
    return () => this.stateListeners.delete(cb);
  }

  public getState(): WebRTCState {
    return {
      localStream: this.localStream,
      remoteStream: this.remoteStream,
      connectionState: this.peerConnection?.connectionState || 'new',
      isAudioMuted: this.isAudioMuted,
      isVideoMuted: this.isVideoMuted,
      hasCameraPermission: this.hasCameraPermission,
      isUsingFallbackStream: this.isUsingFallbackStream
    };
  }

  private notifyState() {
    const state = this.getState();
    this.stateListeners.forEach(cb => cb(state));
  }

  /**
   * Khởi tạo luồng Camera & Micro cục bộ
   */
  public async initLocalMedia(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      return this.localStream;
    }

    try {
      console.log(`[WebRTC] Đang yêu cầu quyền truy cập Camera & Micro (${this.role})...`);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.localStream = stream;
      this.hasCameraPermission = true;
      this.isUsingFallbackStream = false;
      console.log('[WebRTC] Quyền truy cập Camera & Micro thành công!');
    } catch (err) {
      console.warn('[WebRTC] Không thể lấy luồng Camera thật, chuyển sang luồng mô phỏng lâm sàng HD:', err);
      this.hasCameraPermission = false;
      this.isUsingFallbackStream = true;
      this.localStream = this.createSyntheticMediaStream();
    }

    this.localStreamListeners.forEach(cb => cb(this.localStream));
    this.notifyState();
    return this.localStream;
  }

  /**
   * Tạo luồng Video mô phỏng sinh động nếu thiết bị không có webcam hoặc bị chặn quyền
   */
  private createSyntheticMediaStream(): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    let frame = 0;
    const isDoctor = this.role === 'doctor';

    const drawFrame = () => {
      if (!ctx) return;
      frame++;

      // Gradient nền hiện đại
      const bg = ctx.createLinearGradient(0, 0, 1280, 720);
      if (isDoctor) {
        bg.addColorStop(0, '#0f172a');
        bg.addColorStop(0.5, '#1e1b4b');
        bg.addColorStop(1, '#0f172a');
      } else {
        bg.addColorStop(0, '#022c22');
        bg.addColorStop(0.5, '#064e3b');
        bg.addColorStop(1, '#022c22');
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1280, 720);

      // Sóng xung động âm thanh mô phỏng
      const centerX = 640;
      const centerY = 320;
      const pulse = Math.sin(frame * 0.08) * 15;

      ctx.beginPath();
      ctx.arc(centerX, centerY, 130 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = isDoctor ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 105, 0, Math.PI * 2);
      ctx.fillStyle = isDoctor ? '#1d4ed8' : '#059669';
      ctx.fill();

      // Icon Avatar
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isDoctor ? '👨‍⚕️ BS' : '🧑‍🦱 BN', centerX, centerY - 10);

      // Tên hiển thị
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(isDoctor ? 'BS.CKII Vũ Minh Đức' : 'Bệnh nhân Nguyễn Văn An', centerX, centerY + 160);

      ctx.font = '24px sans-serif';
      ctx.fillStyle = isDoctor ? '#93c5fd' : '#a7f3d0';
      ctx.fillText(isDoctor ? 'Trưởng Khoa Nội • Phòng Khám Trực Tuyến HD' : 'Phòng Chờ Khám Từ Xa • HIS-2026-0892', centerX, centerY + 205);

      // Thẻ trạng thái góc trên
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(30, 30, 380, 60);
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(60, 60, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(`HD LIVE 1080p • ${new Date().toTimeString().split(' ')[0]}`, 85, 67);
    };

    if (this.fallbackAnimationTimer) {
      clearInterval(this.fallbackAnimationTimer);
    }
    this.fallbackAnimationTimer = setInterval(drawFrame, 1000 / 30);
    drawFrame();

    const canvasStream = canvas.captureStream(30);

    // Thêm track âm thanh nhẹ nhàng để tránh lỗi WebRTC không có audio track
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.0001; // Gần như im lặng
    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    dest.stream.getAudioTracks().forEach(track => {
      canvasStream.addTrack(track);
    });

    return canvasStream;
  }

  /**
   * Bác sĩ khởi tạo cuộc gọi WebRTC (Tạo Offer)
   */
  public async startCall(): Promise<void> {
    this.isCaller = true;
    console.log('[WebRTC] Bắt đầu phiên gọi (Caller -> Offer)...');

    const stream = await this.initLocalMedia();
    this.createPeerConnection();

    // Thêm các track local vào kết nối
    stream.getTracks().forEach(track => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, stream);
      }
    });

    try {
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await this.peerConnection!.setLocalDescription(offer);

      console.log('[WebRTC] Đã tạo Offer, gửi qua WebSocket...');
      websocketService.send('WEBRTC_OFFER', {
        sdp: offer.sdp,
        type: offer.type,
        callerRole: this.role
      }, this.role);
    } catch (err) {
      console.error('[WebRTC Error khi tạo Offer]', err);
    }
  }

  /**
   * Bệnh nhân trả lời cuộc gọi WebRTC (Nhận Offer và gửi Answer)
   */
  public async handleRemoteOffer(offerData: { sdp: string; type: RTCSdpType }): Promise<void> {
    console.log('[WebRTC] Nhận Offer từ đối phương, chuẩn bị Answer...');
    this.isCaller = false;

    const stream = await this.initLocalMedia();
    this.createPeerConnection();

    stream.getTracks().forEach(track => {
      if (this.peerConnection) {
        this.peerConnection.addTrack(track, stream);
      }
    });

    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offerData));
      
      // Xử lý các ICE candidate đến trước khi setRemoteDescription
      while (this.queuedIceCandidates.length > 0) {
        const cand = this.queuedIceCandidates.shift();
        if (cand && this.peerConnection) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
      }

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      console.log('[WebRTC] Đã tạo Answer, gửi lại qua WebSocket...');
      websocketService.send('WEBRTC_ANSWER', {
        sdp: answer.sdp,
        type: answer.type,
        responderRole: this.role
      }, this.role);
    } catch (err) {
      console.error('[WebRTC Error khi xử lý Offer]', err);
    }
  }

  /**
   * Nhận Answer từ Bệnh nhân (dành cho Bác sĩ)
   */
  public async handleRemoteAnswer(answerData: { sdp: string; type: RTCSdpType }): Promise<void> {
    console.log('[WebRTC] Nhận Answer từ đối phương, hoàn tất bắt tay SDP...');
    if (!this.peerConnection) return;

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerData));
      
      // Xử lý các ICE candidate đến trước khi setRemoteDescription
      while (this.queuedIceCandidates.length > 0) {
        const cand = this.queuedIceCandidates.shift();
        if (cand && this.peerConnection) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
      }

      console.log('[WebRTC] Bắt tay SDP hoàn tất thành công!');
    } catch (err) {
      console.error('[WebRTC Error khi setRemoteDescription(Answer)]', err);
    }
  }

  /**
   * Nhận ICE Candidate
   */
  public async handleRemoteIceCandidate(candidateData: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.queuedIceCandidates.push(candidateData);
      return;
    }
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
    } catch (err) {
      console.warn('[WebRTC Warning khi thêm ICE Candidate]', err);
    }
  }

  /**
   * Tạo đối tượng RTCPeerConnection chuẩn
   */
  private createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.peerConnection = new RTCPeerConnection(this.RTC_CONFIG);

    // Khi tìm thấy ứng viên ICE nội bộ, gửi sang bên kia
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        websocketService.send('WEBRTC_ICE_CANDIDATE', event.candidate.toJSON(), this.role);
      }
    };

    // Khi nhận được track từ xa (Camera & Micro của đối phương)
    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Nhận luồng đa phương tiện từ xa (Remote Stream)!', event.streams);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        this.remoteStream.addTrack(event.track);
      }
      this.remoteStreamListeners.forEach(cb => cb(this.remoteStream));
      this.notifyState();
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log(`[WebRTC] Trạng thái kết nối: ${this.peerConnection?.connectionState}`);
      this.notifyState();
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] Trạng thái ICE: ${this.peerConnection?.iceConnectionState}`);
    };
  }

  /**
   * Kết nối và lắng nghe sự kiện từ WebSocket Gateway
   */
  private setupWebSocketListeners() {
    websocketService.subscribe((msg) => {
      switch (msg.event) {
        case 'WEBRTC_OFFER':
          if (msg.senderRole !== this.role && msg.payload) {
            this.handleRemoteOffer(msg.payload);
          }
          break;
        case 'WEBRTC_ANSWER':
          if (msg.senderRole !== this.role && msg.payload) {
            this.handleRemoteAnswer(msg.payload);
          }
          break;
        case 'WEBRTC_ICE_CANDIDATE':
          if (msg.senderRole !== this.role && msg.payload) {
            this.handleRemoteIceCandidate(msg.payload);
          }
          break;
        case 'CALL_ENDED':
        case 'CALL_DECLINED':
          this.endCall();
          break;
      }
    });
  }

  /**
   * Bật/Tắt Micro
   */
  public toggleAudio(): boolean {
    if (!this.localStream) return false;
    this.isAudioMuted = !this.isAudioMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isAudioMuted;
    });
    this.notifyState();
    return this.isAudioMuted;
  }

  /**
   * Bật/Tắt Camera
   */
  public toggleVideo(): boolean {
    if (!this.localStream) return false;
    this.isVideoMuted = !this.isVideoMuted;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !this.isVideoMuted;
    });
    this.notifyState();
    return this.isVideoMuted;
  }

  /**
   * Kết thúc cuộc gọi và giải phóng tài nguyên
   */
  public endCall(): void {
    console.log('[WebRTC] Kết thúc cuộc gọi & giải phóng tài nguyên...');
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }

    this.remoteStream = null;
    if (this.fallbackAnimationTimer) {
      clearInterval(this.fallbackAnimationTimer);
      this.fallbackAnimationTimer = null;
    }

    this.localStreamListeners.forEach(cb => cb(null));
    this.remoteStreamListeners.forEach(cb => cb(null));
    this.notifyState();
  }
}

export const webrtcService = new WebRTCManager();
