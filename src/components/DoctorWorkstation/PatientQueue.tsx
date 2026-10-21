import React from 'react';
import { Users, AlertTriangle, Clock, Activity, ChevronRight } from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';

export const PatientQueue: React.FC = () => {
  const { patients, selectedPatientId, setSelectedPatientId, currentPatient, addAuditLog } = useTelemedicine();

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    const pt = patients.find(p => p.id === id);
    if (pt) {
      addAuditLog('SWITCH_PATIENT_QUEUE', `Patient/${id}`, `Bác sĩ chuyển sang khám bệnh nhân: ${pt.name} (${id})`);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            Hàng Đợi Khám Từ Xa ({patients.length})
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          Phòng khám số 04 • Nội Tổng Quát
        </span>
      </div>

      {/* PATIENT TABS / CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {patients.map(pt => {
          const isSelected = pt.id === currentPatient.id;
          const hasSevereAllergy = pt.allergies.some(a => a.toLowerCase().includes('penicillin') || a.toLowerCase().includes('aspirin'));

          return (
            <button
              key={pt.id}
              onClick={() => handleSelectPatient(pt.id)}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer relative flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? 'bg-blue-50/80 border-blue-600 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900">{pt.name}</span>
                    <span className="text-[10px] text-slate-500">({pt.age}t, {pt.gender})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{pt.id}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  pt.triagePriority.includes('Đỏ')
                    ? 'bg-rose-100 text-rose-800'
                    : pt.triagePriority.includes('Vàng')
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {pt.status}
                </span>
              </div>

              {/* SEVERE ALLERGY BADGE */}
              {hasSevereAllergy && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 font-bold text-[10px] border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="truncate">Dị ứng: {pt.allergies[0]}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                "{pt.reasonForVisit}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
