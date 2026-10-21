import React from 'react';
import { TelemedicineProvider, useTelemedicine } from './context/TelemedicineContext';
import { TopNavBar } from './components/TopNavBar';
import { DoctorDashboard } from './components/DoctorDashboard/DoctorDashboard';
import { DoctorWorkstation } from './components/DoctorWorkstation/DoctorWorkstation';
import { PatientDashboard } from './components/PatientDashboard/PatientDashboard';
import { PatientPortal } from './components/PatientPortal/PatientPortal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { AuditLogModal } from './components/AuditLogModal';
import { AllergyBlockerModal } from './components/AllergyBlockerModal';
import { EConsentModal } from './components/EConsentModal';
import { NationalPrescriptionModal } from './components/NationalPrescriptionModal';
import { BhytXmlExportModal } from './components/BhytXmlExportModal';
import { AppointmentBookingModal } from './components/AppointmentBookingModal';
import { CheckCircle2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    role,
    activeView,
    toastMessage,
    isEConsentModalOpen,
    setIsEConsentModalOpen,
    isNationalRxModalOpen,
    setIsNationalRxModalOpen,
    isBhytXmlModalOpen,
    setIsBhytXmlModalOpen
  } = useTelemedicine();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* FLOATING TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-semibold ${
            toastMessage.type === 'warning'
              ? 'bg-amber-950 text-amber-100 border-amber-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-950 text-rose-100 border-rose-700'
              : toastMessage.type === 'info'
              ? 'bg-blue-950 text-blue-100 border-blue-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}>
            {toastMessage.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
            {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            <span className="leading-snug">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* TOP STICKY NAVIGATION BAR */}
      <TopNavBar />

      {/* WORKSPACE VIEW: DOCTOR OR PATIENT (DASHBOARD VS CONSULTATION ROOM) */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {role === 'doctor' ? (
          activeView === 'dashboard' ? (
            <DoctorDashboard />
          ) : (
            <DoctorWorkstation />
          )
        ) : (
          activeView === 'dashboard' ? (
            <PatientDashboard />
          ) : (
            <PatientPortal />
          )
        )}
      </main>

      {/* INCOMING CALL MODAL OVERLAY */}
      <IncomingCallModal />

      {/* APPOINTMENT BOOKING MODAL */}
      <AppointmentBookingModal />

      {/* GLOBAL REGULATORY & CLINICAL MODALS */}
      <AuditLogModal />
      <AllergyBlockerModal />
      <EConsentModal
        isOpen={isEConsentModalOpen}
        onClose={() => setIsEConsentModalOpen(false)}
      />
      <NationalPrescriptionModal
        isOpen={isNationalRxModalOpen}
        onClose={() => setIsNationalRxModalOpen(false)}
      />
      <BhytXmlExportModal
        isOpen={isBhytXmlModalOpen}
        onClose={() => setIsBhytXmlModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <TelemedicineProvider>
      <MainLayout />
    </TelemedicineProvider>
  );
}
