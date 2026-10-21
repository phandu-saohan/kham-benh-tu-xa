import React from 'react';
import {
  Activity, Clock, FileSpreadsheet, ClipboardList, Pill,
  AlertTriangle, ShieldCheck, RefreshCw, Layers, FileText
} from 'lucide-react';
import { useTelemedicine } from '../../../context/TelemedicineContext';
import { Tab1TriageHistory } from './Tab1TriageHistory';
import { Tab2PacsViewer } from './Tab2PacsViewer';
import { Tab3CpoeOrders } from './Tab3CpoeOrders';
import { Tab4SoapIcd10 } from './Tab4SoapIcd10';
import { Tab5PrescriptionCds } from './Tab5PrescriptionCds';

export const EmrWorkspace: React.FC = () => {
  const {
    currentPatient,
    activeEmrTab,
    setActiveEmrTab,
    prescriptions,
    cpoeOrders,
    syncWithHis,
    hisSyncState
  } = useTelemedicine();

  const selectedCpoeCount = cpoeOrders.filter(o => o.selected).length;

  const tabs = [
    { id: 'triage' as const, label: '1. Tổng quan & Tiền sử', icon: Clock },
    { id: 'pacs' as const, label: '2. Cận lâm sàng & Web PACS', icon: Layers, badge: '3 Bất thường' },
    { id: 'cpoe' as const, label: '3. Chỉ định CPOE', icon: FileText, badge: `${selectedCpoeCount} dịch vụ` },
    { id: 'soap' as const, label: '4. Bệnh án SOAP & ICD-10', icon: ClipboardList },
    { id: 'prescription' as const, label: '5. Kê đơn thuốc & CDS', icon: Pill, badge: `${prescriptions.length} thuốc` }
  ];

  return (
    <div className="flex flex-col gap-3">
      
      {/* 1. PATIENT ADMINISTRATIVE & CLINICAL HEADER BANNER */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              {currentPatient.name.split(' ').slice(-1)[0][0]}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{currentPatient.name}</h1>
                <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-800 text-xs font-mono font-bold">
                  Mã BN: {currentPatient.id}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold">
                  Nhóm máu: {currentPatient.bloodType}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                  currentPatient.triagePriority.includes('Đỏ')
                    ? 'bg-rose-100 text-rose-800'
                    : currentPatient.triagePriority.includes('Vàng')
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  Phân loại: {currentPatient.triagePriority}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                <span><strong>Giới tính:</strong> {currentPatient.gender}</span>
                <span><strong>Ngày sinh:</strong> {currentPatient.dob} ({currentPatient.age} tuổi)</span>
                <span><strong>BHYT:</strong> <span className="font-mono font-bold text-slate-800">{currentPatient.bhyt}</span> (Mức hưởng 80%)</span>
                <span><strong>SĐT:</strong> {currentPatient.phone}</span>
              </div>
            </div>
          </div>

          {/* Sync Button & HIS Status */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                HL7 FHIR R4: Trực tuyến ({hisSyncState.lastSyncTime})
              </div>
            </div>
            <button
              onClick={syncWithHis}
              disabled={hisSyncState.isSyncing}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${hisSyncState.isSyncing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Đồng bộ HIS</span>
            </button>
          </div>
        </div>

        {/* Severe Red Drug Allergy Warnings Banner */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>DỊ ỨNG: {currentPatient.allergies.join(' • ')}</span>
          </div>

          {currentPatient.chronicConditions.map((cond, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
            >
              <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{cond}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. FIVE CLINICAL WORKSPACE TABS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden min-h-[560px]">
        
        {/* TAB NAVIGATION HEADER */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-2 pt-2 flex items-center gap-1 overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeEmrTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveEmrTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                    : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    tab.id === 'pacs'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB ACTIVE CONTENT CONTAINER */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
          {activeEmrTab === 'triage' && <Tab1TriageHistory />}
          {activeEmrTab === 'pacs' && <Tab2PacsViewer />}
          {activeEmrTab === 'cpoe' && <Tab3CpoeOrders />}
          {activeEmrTab === 'soap' && <Tab4SoapIcd10 />}
          {activeEmrTab === 'prescription' && <Tab5PrescriptionCds />}
        </div>

      </div>

    </div>
  );
};
