// Dịch vụ Phát Chuông & Âm Thanh Cuộc Gọi (Web Audio API Ringtone & Call Audio Engine)
// Hỗ trợ cả chuông đến (Incoming Ringtone), chuông đi (Outgoing Dialtone), và rung điện thoại

export class RingtoneService {
  private static audioCtx: AudioContext | null = null;
  private static isRinging = false;
  private static isOutgoingCalling = false;
  private static ringInterval: any = null;
  private static outgoingInterval: any = null;

  public static unlockContext() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().then(() => {
          console.log('[RingtoneService] AudioContext đã được kích hoạt thành công.');
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[RingtoneService] Không thể unlock AudioContext:', e);
    }
  }

  private static initContext() {
    this.unlockContext();
  }

  /**
   * Bắt đầu đổ chuông cuộc gọi đến (Giai điệu FaceTime / Zalo) dành cho Người nhận cuộc gọi
   */
  public static startRingtone() {
    if (this.isRinging) return;
    this.initContext();
    this.isRinging = true;

    // Rung điện thoại nếu là thiết bị di động
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 500]);
      } catch (e) {}
    }

    const playChimeSequence = () => {
      if (!this.isRinging || !this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const now = this.audioCtx.currentTime;
      // Giai điệu Marimba hiện đại: C#5 (554Hz) -> E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz)
      const notes = [
        { freq: 554.37, start: 0, dur: 0.2 },
        { freq: 659.25, start: 0.2, dur: 0.2 },
        { freq: 830.61, start: 0.4, dur: 0.25 },
        { freq: 987.77, start: 0.65, dur: 0.48 }
      ];

      notes.forEach(({ freq, start, dur }) => {
        if (!this.audioCtx) return;
        try {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + start);

          gain.gain.setValueAtTime(0.001, now + start);
          gain.gain.linearRampToValueAtTime(0.4, now + start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + start);
          osc.stop(now + start + dur);
        } catch (e) {}
      });
    };

    playChimeSequence();

    this.ringInterval = setInterval(() => {
      if (this.isRinging) {
        playChimeSequence();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([400, 200, 400]);
          } catch (e) {}
        }
      }
    }, 2200);
  }

  /**
   * Bắt đầu tiếng chuông chờ (Outgoing Dialtone / Tút... tút...) dành cho Người gọi
   */
  public static startOutgoingDialtone() {
    if (this.isOutgoingCalling) return;
    this.initContext();
    this.isOutgoingCalling = true;

    const playBeep = () => {
      if (!this.isOutgoingCalling || !this.audioCtx) return;

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const now = this.audioCtx.currentTime;
      try {
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        // Chuông chờ tiêu chuẩn Châu Á/Âu: 425Hz & 450Hz
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(425, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gain.gain.setValueAtTime(0.18, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
      } catch (e) {}
    };

    playBeep();
    this.outgoingInterval = setInterval(() => {
      if (this.isOutgoingCalling) {
        playBeep();
      }
    }, 3500);
  }

  /**
   * Dừng mọi loại chuông
   */
  public static stopAllTones() {
    this.stopRingtone();
    this.stopOutgoingDialtone();
  }

  public static stopRingtone() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  public static stopOutgoingDialtone() {
    this.isOutgoingCalling = false;
    if (this.outgoingInterval) {
      clearInterval(this.outgoingInterval);
      this.outgoingInterval = null;
    }
  }

  /**
   * Tiếng báo kết nối thành công (Ting nhẹ)
   */
  public static playCallConnectedChime() {
    this.stopAllTones();
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  /**
   * Tiếng báo cúp máy (Tút tút tút)
   */
  public static playCallEndChime() {
    this.stopAllTones();
    this.initContext();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  public static isCurrentlyRinging(): boolean {
    return this.isRinging || this.isOutgoingCalling;
  }
}

// Tự động mở khóa AudioContext ngay khi người dùng chạm hoặc click bất kỳ đâu trên trang
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    RingtoneService.unlockContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
}
