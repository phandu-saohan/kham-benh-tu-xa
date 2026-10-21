// Dịch vụ Xử lý Tín hiệu Số Âm thanh Ống nghe Điện tử (DSP Web Audio API)
// Phân tách dải tần số Tim (20-200Hz) và Phổi (100-1000Hz)

export class StethoscopeDspService {
  private static audioCtx: AudioContext | null = null;
  private static filterNode: BiquadFilterNode | null = null;
  private static oscillator: OscillatorNode | null = null;
  private static gainNode: GainNode | null = null;
  private static isPlaying = false;

  private static initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
  }

  /**
   * Phát âm thanh mô phỏng có lọc DSP theo bộ lọc Bác sĩ chọn
   */
  public static playAuscultationSound(mode: 'cardiac' | 'pulmonary') {
    this.initContext();
    if (!this.audioCtx) return;

    if (this.isPlaying) {
      this.stop();
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    // Tạo Filter Biquad
    this.filterNode = this.audioCtx.createBiquadFilter();
    this.filterNode.type = 'bandpass';

    if (mode === 'cardiac') {
      // Dải tần 20 - 200Hz (Tiếng Tim T1-T2)
      this.filterNode.frequency.setValueAtTime(90, this.audioCtx.currentTime);
      this.filterNode.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
    } else {
      // Dải tần 100 - 1000Hz (Tiếng thở Phổi)
      this.filterNode.frequency.setValueAtTime(450, this.audioCtx.currentTime);
      this.filterNode.Q.setValueAtTime(0.8, this.audioCtx.currentTime);
    }

    // Tạo Gain kiểm soát âm lượng êm dịu
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0.3, this.audioCtx.currentTime);

    // Tạo Oscillator dao động mô phỏng âm sinh học
    this.oscillator = this.audioCtx.createOscillator();
    this.oscillator.type = mode === 'cardiac' ? 'sine' : 'triangle';
    this.oscillator.frequency.setValueAtTime(mode === 'cardiac' ? 75 : 320, this.audioCtx.currentTime);

    // Nối pipeline: Oscillator -> Filter -> Gain -> Loa
    this.oscillator.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this.oscillator.start();
    this.isPlaying = true;
  }

  public static stop() {
    if (this.oscillator && this.isPlaying) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {
        // Ignore
      }
      this.isPlaying = false;
    }
  }

  public static isAudioPlaying(): boolean {
    return this.isPlaying;
  }
}
