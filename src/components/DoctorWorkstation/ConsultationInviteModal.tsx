import React from 'react';
import { UserPlus, X, Stethoscope, Pill, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';

export const ConsultationInviteModal: React.FC = () => {
  const { isConsultModalOpen, setIsConsultModalOpen, inviteSpecialist, currentPatient } = useTelemedicine();

  if (!isConsultModalOpen) return null;

  const specialists = [
    {
      id: 'cardiologist' as const,
      name: 'BS.CKII Trần Minh Hoàng',
      title: 'Trưởng Khoa Nội Tim Mạch • Chuyên gia Can thiệp mạch vành',
      hospital: 'Bệnh viện Đa khoa Quốc tế',
      icon: Stethoscope,
      accent: 'blue',
      status: 'Trực tuyến (Sẵn sàng)',
      experience: '22 năm kinh nghiệm',
      reason: 'Phù hợp hội chẩn: Bệnh nhân tăng huyết áp vô căn kèm triệu chứng hồi hộp, dày thất trái nhẹ'
    },
    {
      id: 'pharmacist' as const,
      name: 'ThS. Dược sĩ Lâm Sàng Lê Thu Thảo',
      title: 'Khoa Dược Bệnh Viện • Hội đồng Thuốc & Điều trị',
      hospital: 'Bệnh viện Đa khoa Quốc tế',
      icon: Pill,
      accent: 'purple',
      status: 'Trực tuyến (Sẵn sàng)',
      experience: '14 năm kinh nghiệm',
      reason: 'Phù hợp hội chẩn: Rà soát tương tác thuốc, tiền sử sốc phản vệ Penicillin & tư vấn phác đồ thay thế an toàn'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-300 shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Mời Bác Sĩ Chuyên Khoa Hội Chẩn (Multi-Disciplinary)</h3>
              <p className="text-xs text-slate-400">Kết nối tức thì phòng hội chẩn 3 bên cho BN {currentPatient.name}</p>
            </div>
          </div>
          <button
            onClick={() => setIsConsultModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SPECIALIST LIST */}
        <div className="p-6 space-y-4">
          {specialists.map(sp => {
            const Icon = sp.icon;
            return (
              <div
                key={sp.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/60 transition flex flex-col justify-between gap-3"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    sp.accent === 'blue' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900">{sp.name}</h4>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {sp.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{sp.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1 italic">{sp.reason}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                  <span className="text-xs text-slate-500 font-medium">{sp.experience}</span>
                  <button
                    onClick={() => inviteSpecialist(sp.id)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Mời vào phòng hội chẩn ngay</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={() => setIsConsultModalOpen(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
