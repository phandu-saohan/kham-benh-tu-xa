import React, { useState } from 'react';
import { LayoutGrid, Maximize2, SplitSquareVertical, Monitor, Video, FileText, ArrowLeft, Calendar } from 'lucide-react';
import { PatientQueue } from './PatientQueue';
import { MultiDoctorVideoGrid } from './MultiDoctorVideoGrid';
import { RemoteTelemetryMonitor } from './RemoteTelemetryMonitor';
import { AiMedicalScribe } from './AiMedicalScribe';
import { EmrWorkspace } from './EmrWorkspace/EmrWorkspace';
import { ConsultationInviteModal } from './ConsultationInviteModal';
import { useTelemedicine } from '../../context/TelemedicineContext';

export const DoctorWorkstation: React.FC = () => {
  const { setActiveView } = useTelemedicine();
  const [layoutMode, setLayoutMode] = useState<'split' | 'video-focus' | 'emr-focus'>('split');

  return (
    <main className="flex-1 max-w-[1780px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-3">
      
      {/* THANH ĐIỀU HƯỚNG CHẾ ĐỘ BỐ CỤC KHÁM BỆNH (LAYOUT MODE SWITCHER) */}
      <div className="flex items-center justify-between bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Về Lịch Hẹn</span>
          </button>

          <span className="text-slate-300">|</span>
          <span className="text-xs font-bold text-slate-700 hidden sm:inline">Chế độ hiển thị trạm Bác sĩ:</span>
          
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setLayoutMode('split')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                layoutMode === 'split'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Bố cục chuẩn: Cuộc gọi video & Bệnh án EMR cân đối"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span>Tiêu Chuẩn (Chia đôi)</span>
            </button>

            <button
              onClick={() => setLayoutMode('video-focus')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                layoutMode === 'video-focus'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Phóng to khung hình cuộc gọi để quan sát rõ nét mặt và triệu chứng bệnh nhân"
            >
              <Video className="w-3.5 h-3.5 text-emerald-600" />
              <span>Trọng Tâm Cuộc Gọi</span>
            </button>

            <button
              onClick={() => setLayoutMode('emr-focus')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                layoutMode === 'emr-focus'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mở rộng không gian đọc phim X-Quang DICOM và kê đơn chi tiết"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Trọng Tâm Bệnh Án & PACS</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden md:inline">Trạm làm việc lâm sàng thông minh</span>
        </div>
      </div>

      {/* NỘI DUNG WORKSTATION THEO BỐ CỤC ĐÃ CHỌN */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-4 transition-all duration-300`}>
        
        {/* CỘT TRÁI (TELE-CONSULTATION, AI SCRIBE & REMOTE IOT TELEMETRY) */}
        <section className={`flex flex-col gap-3.5 transition-all duration-300 ${
          layoutMode === 'video-focus'
            ? 'lg:col-span-8'
            : layoutMode === 'emr-focus'
              ? 'lg:col-span-4'
              : 'lg:col-span-5'
        }`}>
          <PatientQueue />
          <MultiDoctorVideoGrid />
          <RemoteTelemetryMonitor />
          <AiMedicalScribe />
        </section>

        {/* CỘT PHẢI (INTEGRATED HIS / EMR CLINICAL WORKSPACE - 5 TABS) */}
        <section className={`flex flex-col gap-3.5 transition-all duration-300 ${
          layoutMode === 'video-focus'
            ? 'lg:col-span-4'
            : layoutMode === 'emr-focus'
              ? 'lg:col-span-8'
              : 'lg:col-span-7'
        }`}>
          <EmrWorkspace />
        </section>

      </div>

      {/* MODAL MỜI HỘI CHẨN CHUYÊN GIA LIÊN KHOA */}
      <ConsultationInviteModal />
    </main>
  );
};
