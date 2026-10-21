import React, { useRef, useState, useEffect } from 'react';
import {
  FileSpreadsheet, Layers, Sliders, ZoomIn, ZoomOut, Move,
  PenTool, Square, Ruler, RotateCcw, Trash2, Eye, ShieldCheck,
  AlertCircle, ChevronRight, Check
} from 'lucide-react';
import { useTelemedicine } from '../../../context/TelemedicineContext';

export const Tab2PacsViewer: React.FC = () => {
  const {
    currentPatient,
    dicomState,
    setDicomSelectedStudyId,
    setDicomWindowLevel,
    setDicomWindowWidth,
    setDicomZoom,
    setDicomPan,
    setDicomActiveTool,
    addDicomAnnotation,
    clearDicomAnnotations,
    setActiveEmrTab,
    showToast
  } = useTelemedicine();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);

  // DRAW CANVAS ON STATE CHANGES
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background base simulating medical DICOM monochrome image
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Apply pan & zoom
    ctx.translate(dicomState.pan.x + width / 2, dicomState.pan.y + height / 2);
    ctx.scale(dicomState.zoom, dicomState.zoom);
    ctx.translate(-width / 2, -height / 2);

    // Apply brightness / contrast adjustments via Window Level / Window Width
    // W/L: Window Level (brightness, 0..255), W/W: Window Width (contrast, 50..400)
    const brightnessAdjust = (dicomState.windowLevel - 128) / 128; // -1 to 1
    const contrastAdjust = dicomState.windowWidth / 256;

    // Simulate high-fidelity digital chest X-ray anatomy
    // Thorax cavity
    const gradient = ctx.createRadialGradient(width / 2, height / 2 - 20, 40, width / 2, height / 2, width / 2);
    const l1 = Math.min(1, Math.max(0, 0.2 + brightnessAdjust * 0.2));
    const l2 = Math.min(1, Math.max(0, 0.05 + brightnessAdjust * 0.1));
    gradient.addColorStop(0, `rgba(40, 50, 70, ${0.4 * contrastAdjust})`);
    gradient.addColorStop(0.5, `rgba(20, 25, 40, ${0.6 * contrastAdjust})`);
    gradient.addColorStop(1, `rgba(10, 12, 18, 0.95)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(40, 20, width - 80, height - 40);

    // Lung fields (darker, air-filled)
    // Left lung field
    ctx.fillStyle = `rgba(15, 20, 30, ${0.85 * contrastAdjust})`;
    ctx.beginPath();
    ctx.ellipse(width * 0.32, height * 0.45, 65, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right lung field
    ctx.beginPath();
    ctx.ellipse(width * 0.68, height * 0.45, 65, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spine & mediastinum (radiopaque white / bone density)
    const boneAlpha = Math.min(1, Math.max(0.2, (0.6 + brightnessAdjust * 0.3) * contrastAdjust));
    ctx.fillStyle = `rgba(190, 205, 225, ${boneAlpha})`;
    ctx.fillRect(width * 0.47, 20, 36, height - 40);

    // Clavicles (Xương đòn)
    ctx.strokeStyle = `rgba(210, 225, 245, ${boneAlpha * 0.9})`;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(width * 0.2, height * 0.22);
    ctx.quadraticCurveTo(width * 0.35, height * 0.26, width * 0.47, height * 0.24);
    ctx.moveTo(width * 0.8, height * 0.22);
    ctx.quadraticCurveTo(width * 0.65, height * 0.26, width * 0.53, height * 0.24);
    ctx.stroke();

    // Rib cage curves (Xương sườn)
    ctx.lineWidth = 6;
    ctx.strokeStyle = `rgba(160, 180, 210, ${boneAlpha * 0.65})`;
    for (let i = 0; i < 7; i++) {
      const yOffset = height * 0.28 + i * 24;
      // Left ribs
      ctx.beginPath();
      ctx.moveTo(width * 0.46, yOffset - 10);
      ctx.quadraticCurveTo(width * 0.26, yOffset + 5, width * 0.18, yOffset - 8);
      ctx.stroke();

      // Right ribs
      ctx.beginPath();
      ctx.moveTo(width * 0.54, yOffset - 10);
      ctx.quadraticCurveTo(width * 0.74, yOffset + 5, width * 0.82, yOffset - 8);
      ctx.stroke();
    }

    // Cardiac silhouette (Bóng tim)
    ctx.fillStyle = `rgba(170, 190, 215, ${boneAlpha * 0.75})`;
    ctx.beginPath();
    ctx.moveTo(width * 0.48, height * 0.36);
    ctx.bezierCurveTo(width * 0.44, height * 0.44, width * 0.34, height * 0.56, width * 0.42, height * 0.68);
    ctx.lineTo(width * 0.58, height * 0.68);
    ctx.bezierCurveTo(width * 0.62, height * 0.58, width * 0.56, height * 0.44, width * 0.52, height * 0.36);
    ctx.closePath();
    ctx.fill();

    // Aortic knob (Quai động mạch chủ - highlight)
    ctx.fillStyle = `rgba(185, 205, 230, ${boneAlpha * 0.85})`;
    ctx.beginPath();
    ctx.arc(width * 0.44, height * 0.38, 22, 0, Math.PI * 2);
    ctx.fill();

    // Diaphragm arches (Vòm hoành)
    ctx.fillStyle = `rgba(150, 170, 200, ${boneAlpha * 0.85})`;
    ctx.beginPath();
    ctx.arc(width * 0.32, height * 0.75, 80, Math.PI, 0, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(width * 0.68, height * 0.76, 80, Math.PI, 0, false);
    ctx.fill();

    // DRAW SAVED ANNOTATIONS (SYNCS TO PATIENT!)
    dicomState.annotations.forEach(ann => {
      ctx.strokeStyle = ann.color || '#ef4444';
      ctx.fillStyle = ann.color || '#ef4444';
      ctx.lineWidth = 2.5;

      if (ann.type === 'pen' && ann.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) {
          ctx.lineTo(ann.points[i].x, ann.points[i].y);
        }
        ctx.stroke();
      } else if (ann.type === 'box' && ann.points.length >= 2) {
        const p1 = ann.points[0];
        const p2 = ann.points[1];
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        if (ann.label) {
          ctx.font = '11px sans-serif';
          ctx.fillText(ann.label, Math.min(p1.x, p2.x), Math.min(p1.y, p2.y) - 6);
        }
      } else if (ann.type === 'ruler' && ann.points.length >= 2) {
        const p1 = ann.points[0];
        const p2 = ann.points[1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        // End ticks
        ctx.fillRect(p1.x - 4, p1.y - 4, 8, 8);
        ctx.fillRect(p2.x - 4, p2.y - 4, 8, 8);
        const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const distMm = (distPx * 0.42).toFixed(1); // 1px = ~0.42mm
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`${distMm} mm`, (p1.x + p2.x) / 2 + 8, (p1.y + p2.y) / 2 - 8);
      }
    });

    // DRAW CURRENT DRAWING PATH (INTERACTIVE FEEDBACK)
    if (isDrawing && currentPoints.length > 0) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      if (dicomState.activeTool === 'pen') {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x, currentPoints[i].y);
        }
        ctx.stroke();
      } else if (dicomState.activeTool === 'box' && currentPoints.length >= 2) {
        const p1 = currentPoints[0];
        const p2 = currentPoints[currentPoints.length - 1];
        ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      } else if (dicomState.activeTool === 'ruler' && currentPoints.length >= 2) {
        const p1 = currentPoints[0];
        const p2 = currentPoints[currentPoints.length - 1];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }

    ctx.restore();

    // DICOM HUD OVERLAY (METADATA)
    ctx.fillStyle = '#10b981';
    ctx.font = '11px monospace';
    ctx.fillText(`BV Đa Khoa Quốc Tế PACS • ${currentPatient.name.toUpperCase()}`, 12, 20);
    ctx.fillText(`ID: ${currentPatient.id} • Modality: CR Chest PA`, 12, 36);
    ctx.fillText(`W/L: ${dicomState.windowLevel}  W/W: ${dicomState.windowWidth}`, 12, 52);
    ctx.fillText(`Zoom: ${(dicomState.zoom * 100).toFixed(0)}%`, 12, 68);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`14/10/2026 09:10:45`, width - 145, 20);
    ctx.fillText(`KVP: 120 • mA: 250`, width - 145, 36);
    ctx.fillText(`Sync: Bệnh nhân đang xem trực tiếp`, width - 215, height - 14);

  }, [dicomState, isDrawing, currentPoints]);

  // MOUSE DRAWING HANDLERS
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dicomState.activeTool === 'pan') {
      // Pan drag logic
      return;
    }

    setIsDrawing(true);
    setCurrentPoints([{ x, y }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dicomState.activeTool === 'pen') {
      setCurrentPoints(prev => [...prev, { x, y }]);
    } else if (dicomState.activeTool === 'box' || dicomState.activeTool === 'ruler') {
      setCurrentPoints(prev => [prev[0], { x, y }]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPoints.length < 2) {
      setCurrentPoints([]);
      return;
    }

    if (dicomState.activeTool === 'pen') {
      addDicomAnnotation({
        id: `ann-${Date.now()}`,
        type: 'pen',
        points: currentPoints,
        color: '#ef4444'
      });
      showToast('Đã lưu nét vẽ giải thích và truyền trực tiếp sang Cổng Bệnh nhân!', 'success');
    } else if (dicomState.activeTool === 'box') {
      addDicomAnnotation({
        id: `ann-${Date.now()}`,
        type: 'box',
        points: [currentPoints[0], currentPoints[currentPoints.length - 1]],
        color: '#ef4444',
        label: 'Vùng tổn thương nghi ngờ'
      });
      showToast('Đã đóng khung vùng giải thích và truyền sang Bệnh nhân!', 'success');
    } else if (dicomState.activeTool === 'ruler') {
      const p1 = currentPoints[0];
      const p2 = currentPoints[currentPoints.length - 1];
      const distPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const distMm = Number((distPx * 0.42).toFixed(1));

      addDicomAnnotation({
        id: `ann-${Date.now()}`,
        type: 'ruler',
        points: [p1, p2],
        color: '#38bdf8',
        measurementMm: distMm
      });
      showToast(`Đã đo kích thước: ${distMm} mm trên phim DICOM!`, 'success');
    }

    setCurrentPoints([]);
  };

  return (
    <div className="space-y-5 text-xs sm:text-sm">
      
      {/* 1. LIS LAB RESULTS TABLE (HEMATOLOGY & BIOCHEMISTRY) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Kết quả Xét nghiệm LIS (Sinh hóa - Huyết học - Miễn dịch)
            </h4>
          </div>
          <span className="text-[11px] text-rose-600 font-bold bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
            * Chỉ số bất thường tự động tô đỏ/cam
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2.5 px-3 font-bold">Tên xét nghiệm</th>
                <th className="py-2.5 px-3 font-bold">Phân loại</th>
                <th className="py-2.5 px-3 font-bold">Kết quả LIS</th>
                <th className="py-2.5 px-3 font-bold">Đơn vị</th>
                <th className="py-2.5 px-3 font-bold">Khoảng tham chiếu</th>
                <th className="py-2.5 px-3 font-bold">Đánh giá lâm sàng</th>
                <th className="py-2.5 px-3 font-bold">Ngày nhận KQ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {currentPatient.labs.map(lab => {
                const isAbnormal = lab.status !== 'normal';
                return (
                  <tr
                    key={lab.id}
                    className={`transition ${isAbnormal ? 'bg-rose-50/70 font-semibold text-rose-950' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-2 px-3 font-bold text-slate-900">{lab.name}</td>
                    <td className="py-2 px-3 text-slate-500">{lab.category}</td>
                    <td className={`py-2 px-3 font-mono font-bold text-sm ${isAbnormal ? 'text-rose-600' : 'text-slate-900'}`}>
                      {lab.result} {isAbnormal && '↑'}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{lab.unit}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{lab.ref}</td>
                    <td className="py-2 px-3">
                      {isAbnormal ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold">
                          Cao bất thường
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                          Bình thường
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500">{lab.date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. INTERACTIVE HTML5 CANVAS DICOM VIEWER (PACS / RIS) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Trình Xem Phim DICOM PACS Tương Tác & Chú Thích Trực Tuyến
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Đồng bộ nét vẽ thời gian thực sang Cổng Bệnh nhân
          </span>
        </div>

        {/* PACS TOOLBAR */}
        <div className="p-3 bg-slate-900 text-white rounded-t-xl border-x border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Drawing Tools */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setDicomActiveTool('pen')}
              title="Bút vẽ chú thích đỏ"
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition cursor-pointer ${
                dicomState.activeTool === 'pen' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5 text-rose-400" />
              <span>Bút vẽ đỏ</span>
            </button>

            <button
              onClick={() => setDicomActiveTool('box')}
              title="Khung vuông chú thích"
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition cursor-pointer ${
                dicomState.activeTool === 'box' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Square className="w-3.5 h-3.5 text-rose-400" />
              <span>Khung vùng</span>
            </button>

            <button
              onClick={() => setDicomActiveTool('ruler')}
              title="Thước đo milimet (mm)"
              className={`px-2.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 transition cursor-pointer ${
                dicomState.activeTool === 'ruler' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Ruler className="w-3.5 h-3.5 text-sky-400" />
              <span>Thước đo (mm)</span>
            </button>
          </div>

          {/* Window Level (Brightness) & Window Width (Contrast) Sliders */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Độ sáng (W/L):</span>
              <input
                type="range"
                min="40"
                max="220"
                value={dicomState.windowLevel}
                onChange={e => setDicomWindowLevel(Number(e.target.value))}
                className="w-20 accent-blue-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-300 w-7">{dicomState.windowLevel}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Tương phản (W/W):</span>
              <input
                type="range"
                min="80"
                max="380"
                value={dicomState.windowWidth}
                onChange={e => setDicomWindowWidth(Number(e.target.value))}
                className="w-20 accent-blue-500 cursor-pointer"
              />
              <span className="text-[11px] font-mono text-slate-300 w-7">{dicomState.windowWidth}</span>
            </div>
          </div>

          {/* Zoom & Reset Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDicomZoom(Math.min(2.5, dicomState.zoom + 0.15))}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDicomZoom(Math.max(0.6, dicomState.zoom - 0.15))}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDicomZoom(1);
                setDicomPan({ x: 0, y: 0 });
                setDicomWindowLevel(128);
                setDicomWindowWidth(256);
              }}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Đặt lại góc nhìn chuẩn"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={clearDicomAnnotations}
              className="p-1.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold"
              title="Xóa chú thích"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* CANVAS WORKSPACE */}
        <div className="relative rounded-b-xl overflow-hidden border-x border-b border-slate-800 bg-slate-950 select-none">
          <canvas
            ref={canvasRef}
            width={760}
            height={380}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full h-[380px] block cursor-crosshair"
          />

          {/* LIVE ANNOTATION COUNT PILL */}
          <div className="absolute bottom-3 right-3 px-3 py-1 bg-slate-900/90 border border-slate-700 rounded-lg text-xs text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>{dicomState.annotations.length} chú thích trên phim (Live Synced)</span>
          </div>
        </div>

        {/* CLINICAL RADIOLOGY REPORT SUMMARY */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="font-bold text-slate-900">
            Kết luận CĐHA từ Khoa Chẩn đoán Hình ảnh:
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">
            "{currentPatient.imaging[0]?.conclusion}"
          </p>
        </div>

      </div>

      {/* ACTION NEXT BUTTON */}
      <div className="flex justify-end pt-2">
        <button
          onClick={() => setActiveEmrTab('cpoe')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <span>Sang Chỉ định Cận lâm sàng (CPOE)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
