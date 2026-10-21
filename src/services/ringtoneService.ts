// Dịch vụ Phát Chuông Cuộc gọi Đến (Web Audio API Ringtone Generator)
// Mô phỏng chuông gọi FaceTime / Smartphone chân thực không cần file âm thanh bên ngoài

export class RingtoneService {
  private static audioCtx: AudioContext | null = null;
  private static isRinging = false;
  private static ringInterval: any = null;

  private static initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Bắt đầu đổ chuông cuộc gọi đến (Lặp lại giai điệu chuông mượt mà)
   */
  public static startRingtone() {
    if (this.isRinging) return;
    this.initContext();
    this.isRinging = true;

    const playChimeSequence = () => {
      if (!this.isRinging || !this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Giai điệu Marimba / FaceTime: C#5 (554Hz) -> E5 (659Hz) -> G#5 (830Hz) -> B5 (987Hz)
      const notes = [
        { freq: 554.37, start: 0, dur: 0.18 },
        { freq: 659.25, start: 0.18, dur: 0.18 },
        { freq: 830.61, start: 0.36, dur: 0.22 },
        { freq: 987.77, start: 0.58, dur: 0.45 }
      ];

      notes.forEach(({ freq, start, dur }) => {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + start);

        // Đường bao âm lượng mềm mại
        gain.gain.setValueAtTime(0.01, now + start);
        gain.gain.linearRampToValueAtTime(0.3, now + start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur);
      });
    };

    // Phát chuông lần đầu ngay lập tức
    playChimeSequence();

    // Lặp lại chu kỳ mỗi 2.2 giây
    this.ringInterval = setInterval(() => {
      if (this.isRinging) {
        playChimeSequence();
      }
    }, 2200);
  }

  /**
   * Dừng đổ chuông
   */
  public static stopRingtone() {
    this.isRinging = false;
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }

  /**
   * Tiếng báo kết nối thành công (Ting nhẹ)
   */
  public static playCallConnectedChime() {
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Tiếng báo cúp máy (Tút tút tút)
   */
  public static playCallEndChime() {
    this.initContext();
    if (!this.audioCtx) return;

    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(425, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public static isCurrentlyRinging(): boolean {
    return this.isRinging;
  }
}
