import React, { useRef, useEffect, useState } from 'react';
import {
  Activity, Heart, Thermometer, Wind, Droplets, Scale,
  Radio, Disc, Play, Mic, RefreshCw, Volume2, Stethoscope,
  Sliders, AlertTriangle, CheckCircle2, ChevronRight
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';
import { StethoscopeDspService } from '../../services/stethoscopeDspService';

export const RemoteTelemetryMonitor: React.FC = () => {
  const {
    currentPatient,
    telemetry,
    setTelemetrySignalType,
    setStethoscopeFilter,
    triggerRemoteBPMeasurement,
    trigger15sAuscultationRecording
  } = useTelemedicine();

  const [isDspAudioPlaying, setIsDspAudioPlaying] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      StethoscopeDspService.stop();
    };
  }, []);

  // WAVEFORM ANIMATION LOOP (ECG LEAD II OR PHONOCARDIOGRAM)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    const render = () => {
      ctx.fillStyle = '#090d16'; // Deep clinical dark slate
      ctx.fillRect(0, 0, width, height);

      // Grid background
      ctx.strokeStyle = 'rgba(30, 58, 138, 0.25)'; // Medical blue grid
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Waveform
      ctx.beginPath();
      ctx.lineWidth = 2.2;

      if (telemetry.signalType === 'ecg') {
        // ECG Lead II (Green / Emerald)
        ctx.strokeStyle = '#10b981';
        ctx.shadowColor = 'rgba(16, 185, 129, 0.7)';
        ctx.shadowBlur = 6;

        const baseline = height / 2;
        const speed = 2.5;
        phaseRef.current += speed;

        for (let x = 0; x < width; x++) {
          const t = (x + phaseRef.current) % 180;
          let y = baseline;

          if (t < 20) {
            // Baseline
            y = baseline;
          } else if (t < 35) {
            // P Wave (Atrial depolarization)
            y = baseline - Math.sin(((t - 20) / 15) * Math.PI) * 10;
          } else if (t < 50) {
            // PR segment
            y = baseline;
          } else if (t < 55) {
            // Q wave
            y = baseline + 6;
          } else if (t < 65) {
            // R wave peak (Ventricular depolarization)
            const rProgress = (t - 55) / 10;
            y = baseline - Math.sin(rProgress * Math.PI) * 55;
          } else if (t < 72) {
            // S wave dip
            y = baseline + 12;
          } else if (t < 85) {
            // ST segment
            y = baseline;
          } else if (t < 115) {
            // T wave (Ventricular repolarization)
            y = baseline - Math.sin(((t - 85) / 30) * Math.PI) * 16;
          } else {
            // Isoelectric line with subtle baseline wander
            y = baseline + Math.sin(x * 0.05) * 1.5;
          }

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Digital Stethoscope Phonocardiogram (Cyan / Amber based on filter)
        const isCardiac = telemetry.stethoscopeFilter === 'cardiac';
        ctx.strokeStyle = isCardiac ? '#06b6d4' : '#f59e0b';
        ctx.shadowColor = isCardiac ? 'rgba(6, 182, 212, 0.7)' : 'rgba(245, 158, 11, 0.7)';
        ctx.shadowBlur = 6;

        const baseline = height / 2;
        phaseRef.current += 3;

        for (let x = 0; x < width; x++) {
          const t = (x + phaseRef.current) % 200;
          let amp = 0;

          if (isCardiac) {
            // Cardiac sound (S1 at t=30..60, S2 at t=110..135)
            if (t >= 30 && t <= 65) {
              const env = Math.sin(((t - 30) / 35) * Math.PI);
              amp = env * Math.sin(t * 0.6) * 38;
            } else if (t >= 110 && t <= 140) {
              const env = Math.sin(((t - 110) / 30) * Math.PI);
              amp = env * Math.sin(t * 0.8) * 28;
            } else {
              amp = (Math.random() - 0.5) * 3; // Quiet diastolic noise
            }
          } else {
            // Pulmonary murmur / Breath sound (Inspiration & Expiration)
            const cycle = Math.sin((t / 200) * Math.PI * 2);
            amp = cycle * ((Math.random() - 0.5) * 30 + Math.sin(t * 0.4) * 8);
          }

          const y = baseline + amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.shadowBlur = 0; // Reset
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [telemetry.signalType, telemetry.stethoscopeFilter]);

  const vitals = currentPatient.vitals;

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col gap-3">
      
      {/* 1. DOCKED REAL-TIME VITAL BADGES */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-slate-800">
        
        {/* Huyết áp */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          vitals.bp.status === 'warning'
            ? 'bg-amber-50/80 border-amber-300'
            : vitals.bp.status === 'critical'
            ? 'bg-rose-50 border-rose-300'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Huyết áp (BP)</span>
            <Activity className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {vitals.bp.value} <span className="text-[10px] font-normal text-slate-500">{vitals.bp.unit}</span>
          </div>
          <span className="text-[10px] text-amber-800 font-semibold mt-0.5 truncate">
            {vitals.bp.status === 'warning' ? 'Tăng nhẹ' : 'Bình thường'}
          </span>
        </div>

        {/* Nhịp tim */}
        <div className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Nhịp tim (HR)</span>
            <Heart className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {vitals.heartRate.value} <span className="text-[10px] font-normal text-slate-500">{vitals.heartRate.unit}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">Nhịp xoang đều</span>
        </div>

        {/* SpO2 */}
        <div className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>SpO2</span>
            <Droplets className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {vitals.spo2.value} <span className="text-[10px] font-normal text-slate-500">{vitals.spo2.unit}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">Tốt (Khí phòng)</span>
        </div>

        {/* Thân nhiệt */}
        <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
          vitals.temp.status === 'warning' ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Thân nhiệt</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {vitals.temp.value} <span className="text-[10px] font-normal text-slate-500">{vitals.temp.unit}</span>
          </div>
          <span className="text-[10px] text-amber-800 font-semibold mt-0.5">
            {Number(vitals.temp.value) >= 37.5 ? 'Sốt nhẹ' : 'Bình thường'}
          </span>
        </div>

        {/* Đường huyết */}
        <div className="p-2.5 rounded-xl border bg-slate-50 border-slate-200 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span>Đường huyết</span>
            <Disc className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
            {vitals.bloodGlucose?.value || '6.1'} <span className="text-[10px] font-normal text-slate-500">mmol/L</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">Lúc đói 8h</span>
        </div>

      </div>

      {/* 2. INTERACTIVE TELEMETRY WAVEFORM CANVAS & FILTER CONTROLS */}
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
        {/* TOP CONTROLS OVER WAVE */}
        <div className="p-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          
          {/* Signal Type Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setTelemetrySignalType('ecg')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                telemetry.signalType === 'ecg'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-300" />
              <span>Điện tim Lead II (ECG)</span>
            </button>

            <button
              onClick={() => setTelemetrySignalType('stethoscope')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                telemetry.signalType === 'stethoscope'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5 text-cyan-300" />
              <span>Ống nghe điện tử (Phonocardiogram)</span>
            </button>
          </div>

          {/* Stethoscope Frequency Filter Toggles & Live DSP Player (when stethoscope is selected) */}
          {telemetry.signalType === 'stethoscope' && (
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] bg-slate-950 p-1 rounded-lg border border-slate-800">
              <span className="text-slate-400 text-[10px] px-1 font-medium">Bộ lọc DSP:</span>
              <button
                onClick={() => {
                  setStethoscopeFilter('cardiac');
                  if (isDspAudioPlaying) {
                    StethoscopeDspService.playAuscultationSound('cardiac');
                  }
                }}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  telemetry.stethoscopeFilter === 'cardiac'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tim (20-200Hz)
              </button>
              <button
                onClick={() => {
                  setStethoscopeFilter('pulmonary');
                  if (isDspAudioPlaying) {
                    StethoscopeDspService.playAuscultationSound('pulmonary');
                  }
                }}
                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                  telemetry.stethoscopeFilter === 'pulmonary'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Phổi (100-1000Hz)
              </button>

              {/* Nút Nghe âm thanh trực tiếp qua Web Audio API */}
              <button
                type="button"
                onClick={() => {
                  if (isDspAudioPlaying) {
                    StethoscopeDspService.stop();
                    setIsDspAudioPlaying(false);
                  } else {
                    StethoscopeDspService.playAuscultationSound(telemetry.stethoscopeFilter);
                    setIsDspAudioPlaying(true);
                  }
                }}
                className={`ml-1 px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition cursor-pointer border ${
                  isDspAudioPlaying
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                }`}
                title="Phát âm thanh mô phỏng lọc tần số qua Web Audio API"
              >
                <Volume2 className="w-3 h-3" />
                <span>{isDspAudioPlaying ? 'Dừng phát âm' : 'Nghe trực tiếp (DSP)'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono hidden md:flex">
            <span>25mm/s</span>
            <span>10mm/mV</span>
            <span className="text-emerald-400 font-bold">50Hz Notch Filter ON</span>
          </div>
        </div>

        {/* HTML5 ANIMATED CANVAS */}
        <div className="relative w-full h-28 sm:h-32">
          <canvas
            ref={canvasRef}
            width={700}
            height={130}
            className="w-full h-full block"
          />

          {/* SENSOR STREAM BADGE OVERLAY */}
          <div className="absolute top-2 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-[10px] text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {telemetry.signalType === 'ecg'
                ? 'Tín hiệu Chuyển đạo DII • 250 Samples/s'
                : `Ống nghe 3M Littmann CORE • ${telemetry.stethoscopeFilter === 'cardiac' ? 'Tiếng Tim T1-T2' : 'Tiếng Thở Phế nang'}`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. REMOTE TRIGGER BUTTONS: ĐO HUYẾT ÁP TỪ XA & GHI ÂM 15S TIẾNG TIM/PHỔI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-100">
        
        {/* Nút Kích hoạt đo huyết áp từ xa */}
        <button
          onClick={triggerRemoteBPMeasurement}
          disabled={telemetry.isTriggeringRemoteBP}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
            telemetry.isTriggeringRemoteBP
              ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
          }`}
        >
          <Activity className="w-4 h-4 text-blue-600" />
          <span>
            {telemetry.isTriggeringRemoteBP
              ? `Đang bơm bao đo tại nhà (${telemetry.remoteBpCountdown}s)...`
              : 'Yêu cầu đo Huyết áp từ xa (BLE Trigger)'}
          </span>
        </button>

        {/* Nút Ghi âm 15s tiếng tim/phổi */}
        <button
          onClick={trigger15sAuscultationRecording}
          disabled={telemetry.isRecordingAuscultation}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border ${
            telemetry.isRecordingAuscultation
              ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
          }`}
        >
          <Volume2 className="w-4 h-4 text-teal-600" />
          <span>
            {telemetry.isRecordingAuscultation
              ? `Đang thu âm vào EMR (${telemetry.recordingCountdown}s)...`
              : 'Ghi âm 15s tiếng Tim/Phổi lưu vào EMR'}
          </span>
        </button>

      </div>

    </div>
  );
};
