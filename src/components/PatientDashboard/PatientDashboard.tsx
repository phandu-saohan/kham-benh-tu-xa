import React, { useState } from 'react';
import {
  Calendar, Clock, User, Phone, PhoneCall, Video, ShieldCheck,
  AlertTriangle, CheckCircle2, Heart, Activity, Pill, QrCode,
  FileText, Sparkles, Building2, ChevronRight, ArrowRight,
  Bluetooth, Wifi, Check, AlertCircle, RefreshCw, Download,
  ExternalLink, CreditCard, Stethoscope, Droplets, Thermometer,
  Search, Filter, History, Eye, Printer, X, CalendarPlus
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';
import { EmrHistoryItem, Appointment } from '../../types/telemedicine';

export const PatientDashboard: React.FC = () => {
  const {
    currentPatient,
    callSignaling,
    acceptIncomingCall,
    setActiveView,
    bluetoothDevices,
    simulateBleReading,
    prescriptions,
    medicationAdherence,
    toggleMedicationDoseTaken,
    nationalPrescriptionCode,
    isSmartCASigned,
    soapNote,
    setIsEConsentModalOpen,
    setIsNationalRxModalOpen,
    showToast,
    appointments,
    setIsBookingModalOpen,
    cancelAppointment
  } = useTelemedicine();

  // State lọc lịch sử khám
  const [historyFilter, setHistoryFilter] = useState<'all' | 'telehealth' | 'in_person'>('all');
  const [searchHistory, setSearchHistory] = useState('');
  
  // State modal xem chi tiết bệnh án đã khám
  const [selectedEncounter, setSelectedEncounter] = useState<EmrHistoryItem | null>(null);

  // State xem phiếu QR Check-in lịch hẹn
  const [viewQrAppointment, setViewQrAppointment] = useState<Appointment | null>(null);

  // Danh sách lịch hẹn của bệnh nhân
  const patientAppointments = appointments.filter(
    a => a.patientId === currentPatient?.id || a.patientName === currentPatient?.name
  );

  // Kiểm tra an toàn người bệnh: dị ứng Penicillin
  const hasPenicillinAllergy = currentPatient?.allergies?.some(a => a.toLowerCase().includes('penicillin')) ?? true;

  // Lấy danh sách lịch sử khám bệnh từ hồ sơ EMR
  const emrHistoryList = currentPatient?.emrHistory || [];

  // Lọc lịch sử khám bệnh
  const filteredHistory = emrHistoryList.filter(item => {
    const matchSearch =
      item.doctor.toLowerCase().includes(searchHistory.toLowerCase()) ||
      item.department.toLowerCase().includes(searchHistory.toLowerCase()) ||
      item.icd10.toLowerCase().includes(searchHistory.toLowerCase()) ||
      item.date.includes(searchHistory);
    
    if (!matchSearch) return false;

    if (historyFilter === 'telehealth') {
      return item.type.toLowerCase().includes('từ xa') || item.type.toLowerCase().includes('telemedicine');
    }
    if (historyFilter === 'in_person') {
      return !item.type.toLowerCase().includes('từ xa') && !item.type.toLowerCase().includes('telemedicine');
    }
    return true;
  });

  return (
    <div className="flex-1 bg-slate-100 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* 1. TOP HERO: PATIENT PROFILE & CALL READINESS STATUS */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-900/60 relative overflow-hidden">
          {/* Subtle decoration glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Patient Greeting & Identifiers */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-xl bg-slate-800 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=260"
                    alt={currentPatient.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-1 -right-1 shadow" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    Hồ Sơ Sức Khỏe & Lịch Sử Khám Bệnh (PHR/EMR)
                  </span>
                  <span className="text-xs text-slate-300">•</span>
                  <span className="text-xs text-slate-300 font-medium">Bảo mật NĐ 13/2023/NĐ-CP</span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                  Xin chào, {currentPatient.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                  <span>Mã Bệnh Nhân: <strong className="font-mono text-emerald-300">{currentPatient.id}</strong></span>
                  <span>•</span>
                  <span>{currentPatient.gender}, {currentPatient.age} tuổi</span>
                  <span>•</span>
                  <span>Số Thẻ BHYT: <strong className="font-mono text-emerald-300">{currentPatient.bhyt || currentPatient.bhytNumber}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-teal-500/30 transition active:scale-95 cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Đặt Lịch Khám Mới</span>
              </button>

              <button
                onClick={() => setActiveView('consultation')}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Vào Phòng Khám Trực Tuyến</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                onClick={() => setIsNationalRxModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition cursor-pointer"
              >
                <Pill className="w-4 h-4 text-emerald-400" />
                <span>Toa Thuốc Quốc Gia</span>
              </button>

              <button
                onClick={() => setIsEConsentModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Phiếu e-Consent</span>
              </button>
            </div>
          </div>

          {/* ALLERGY WARNING ALERT BANNER */}
          {hasPenicillinAllergy && (
            <div className="mt-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-600/60 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-rose-300 text-sm">CẢNH BÁO ĐỎ AN TOÀN NGƯỜI BỆNH: DỊ ỨNG PENICILLIN</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white uppercase">Sốc phản vệ độ III</span>
                  </div>
                  <p className="text-xs text-rose-200/90 mt-0.5">
                    Hệ thống đã khóa tự động nhóm kháng sinh Beta-lactam trên đơn thuốc điện tử toàn quốc. Mọi cuộc khám trong lịch sử đều ghi nhận cảnh báo này.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-rose-300 hidden md:inline px-3 py-1 rounded-lg bg-rose-900/60 border border-rose-700">
                CDS LOCKED
              </span>
            </div>
          )}
        </div>

        {/* 2. CALL READINESS CARD: HIGHLIGHTS DOCTOR CALL STATUS */}
        {callSignaling.status === 'incoming' && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-2xl border-2 border-white/40 animate-pulse">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="w-16 h-16 rounded-2xl bg-white text-emerald-600 flex items-center justify-center shadow-lg shrink-0">
                  <PhoneCall className="w-8 h-8 animate-bounce fill-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                    Cuộc gọi đang đổ chuông...
                  </span>
                  <h2 className="text-xl font-black mt-1">
                    {callSignaling.callerName} đang gọi cho bạn!
                  </h2>
                  <p className="text-xs text-emerald-100">
                    {callSignaling.callerTitle} • Bệnh viện Đa khoa Quốc tế
                  </p>
                </div>
              </div>

              <button
                onClick={acceptIncomingCall}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 font-black text-sm shadow-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-5 h-5 fill-emerald-800" />
                <span>TRẢ LỜI CUỘC GỌI NGAY</span>
              </button>
            </div>
          </div>
        )}

        {/* 2B. DANH SÁCH LỊCH HẸN KHÁM CỦA BỆNH NHÂN (UPCOMING APPOINTMENTS) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Lịch Hẹn Khám Bệnh Của Bạn ({patientAppointments.length})
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý lịch hẹn khám trực tuyến hoặc khám tại viện, nhận mã QR check-in ưu tiên
              </p>
            </div>

            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition cursor-pointer self-start sm:self-auto"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>+ Đặt Lịch Khám Mới</span>
            </button>
          </div>

          {patientAppointments.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-700">Chưa có lịch hẹn khám sắp tới</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Bạn có thể đặt lịch tư vấn từ xa qua video với bác sĩ chuyên khoa hoặc đặt lịch khám ưu tiên tại bệnh viện ngay bây giờ.
              </p>
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>Đặt Lịch Khám Ngay</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {patientAppointments.map(apt => (
                <div
                  key={apt.id}
                  className={`p-5 rounded-2xl border transition relative flex flex-col justify-between gap-4 ${
                    apt.status === 'calling'
                      ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20'
                      : apt.status === 'in_progress'
                      ? 'bg-purple-50/60 border-purple-300'
                      : apt.status === 'cancelled'
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header badge & ID */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {apt.id}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          apt.consultationType === 'in_person'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {apt.consultationType === 'in_person' ? (
                            <>
                              <Building2 className="w-3 h-3" /> Khám Tại Bệnh Viện
                            </>
                          ) : (
                            <>
                              <Video className="w-3 h-3" /> Khám Từ Xa (Telehealth)
                            </>
                          )}
                        </span>
                      </div>

                      {/* Status */}
                      {apt.status === 'calling' && (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full animate-pulse border border-blue-300">
                          <PhoneCall className="w-3 h-3 animate-bounce" /> Đang đổ chuông...
                        </span>
                      )}
                      {apt.status === 'in_progress' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                          <Video className="w-3 h-3" /> Đang khám
                        </span>
                      )}
                      {apt.status === 'waiting' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Chờ khám
                        </span>
                      )}
                      {apt.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
                        </span>
                      )}
                      {apt.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                          <X className="w-3 h-3" /> Đã hủy
                        </span>
                      )}
                    </div>

                    {/* Doctor Info */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold border shrink-0">
                        <Stethoscope className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-snug">
                          {apt.doctorName || 'BS.CKII Vũ Minh Đức'}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {apt.doctorSpecialty || 'Chuyên khoa Nội Tổng Hợp'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                            {apt.appointmentDate || '21/10/2026'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            {apt.appointmentTime || apt.timeSlot || '09:30 - 10:00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Reason */}
                    {apt.reason && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">Lý do khám: </span>
                        <span className="text-slate-800 font-semibold">{apt.reason}</span>
                      </div>
                    )}

                    {/* Cost & Payment info */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                      <div>
                        <span>Chi phí: </span>
                        <strong className="text-slate-900 font-mono">
                          {apt.patientPaid !== undefined
                            ? apt.patientPaid.toLocaleString('vi-VN') + ' đ'
                            : apt.cost
                            ? apt.cost.toLocaleString('vi-VN') + ' đ'
                            : '50.000 đ'}
                        </strong>
                        {apt.bhytCovered && (
                          <span className="ml-1 text-[11px] text-emerald-600 font-semibold">(BHYT hỗ trợ 80%)</span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {apt.paymentStatus === 'paid' ? '✓ Đã thanh toán (VietQR)' : 'Thanh toán tại viện'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setViewQrAppointment(apt)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Xem phiếu hẹn & Mã QR Check-in"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Phiếu QR Check-in</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {apt.status === 'waiting' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn khám này không?')) {
                              cancelAppointment(apt.id);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                        >
                          Hủy lịch
                        </button>
                      )}

                      {(apt.consultationType === 'telehealth' || !apt.consultationType) && (
                        <button
                          onClick={() => setActiveView('consultation')}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Vào Phòng Khám</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. THỐNG KÊ LỊCH SỬ KHÁM BỆNH (HISTORY KPIS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tổng số lần khám</span>
              <History className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{emrHistoryList.length}</span>
              <span className="text-xs text-slate-400 font-medium">cuộc khám</span>
            </div>
            <span className="text-[11px] text-emerald-700 block mt-1">Đã lưu trữ bệnh án điện tử</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Lần khám gần nhất</span>
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-lg sm:text-xl font-black text-slate-900 truncate block">
                {emrHistoryList[0]?.date || 'Hôm nay'}
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                {emrHistoryList[0]?.doctor || 'BS.CKII Vũ Minh Đức'}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">BHYT hỗ trợ tích lũy</span>
              <CreditCard className="w-4 h-4 text-teal-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-teal-700">1.250k</span>
              <span className="text-xs text-slate-400 font-medium">VNĐ</span>
            </div>
            <span className="text-[11px] text-teal-700 block mt-1">Đúng tuyến BHYT 80%</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Toa thuốc Quốc gia</span>
              <Pill className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl sm:text-3xl font-black text-purple-700">{emrHistoryList.length}</span>
              <span className="text-xs text-slate-400 font-medium">đơn liên thông</span>
            </div>
            <span className="text-[11px] text-purple-700 block mt-1">Tra cứu donthuocquocgia.vn</span>
          </div>
        </div>

        {/* 4. CONTROLS: SEARCH & FILTER LỊCH SỬ KHÁM */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                historyFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất Cả Cuộc Khám ({emrHistoryList.length})
            </button>

            <button
              onClick={() => setHistoryFilter('telehealth')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                historyFilter === 'telehealth'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Khám Từ Xa Telemedicine</span>
            </button>

            <button
              onClick={() => setHistoryFilter('in_person')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                historyFilter === 'in_person'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Khám Trực Tiếp Tại Viện</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên Bác sĩ, chẩn đoán, ngày khám..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* 5. DANH SÁCH CHI TIẾT TỪNG CUỘC KHÁM BỆNH */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              <span>Lịch Sử Các Phiên Khám Chữa Bệnh Của Bạn</span>
            </h3>
            <span className="text-xs text-slate-500">
              Hiển thị {filteredHistory.length} cuộc khám
            </span>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Không tìm thấy cuộc khám nào</h3>
              <p className="text-xs text-slate-500 mt-1">Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          ) : (
            filteredHistory.map((item, index) => {
              const isTelehealth = item.type?.toLowerCase().includes('từ xa') || item.type?.toLowerCase().includes('telemedicine');
              const isLatest = index === 0;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 shadow-xs hover:shadow-md ${
                    isLatest
                      ? 'border-emerald-300 bg-gradient-to-r from-emerald-50/20 via-white to-white ring-1 ring-emerald-400/30'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    
                    {/* Left: Consultation Details */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Doctor / Facility Avatar */}
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img
                          src={
                            item.doctor.includes('Đức')
                              ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150'
                              : item.doctor.includes('Mai') || item.doctor.includes('Hương')
                              ? 'https://images.unsplash.com/photo-1594824813576-2f69486c478d?auto=format&fit=crop&q=80&w=150'
                              : 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150'
                          }
                          alt={item.doctor}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Consultation Core Information */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm sm:text-base text-slate-900">
                            {item.doctor}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            • {item.department}
                          </span>
                          
                          {/* Type Pill */}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isTelehealth
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {isTelehealth ? 'Khám từ xa Telemedicine' : 'Khám trực tiếp tại viện'}
                          </span>

                          {isLatest && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                              Vừa khám xong
                            </span>
                          )}
                        </div>

                        {/* Date & Encounter Code */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Ngày khám: <strong className="text-slate-800 font-semibold">{item.date}</strong>
                          </span>
                          <span>•</span>
                          <span>Mã lượt khám: <code className="font-mono text-slate-700">{item.id}</code></span>
                        </div>

                        {/* Diagnosis */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm">
                          <span className="font-bold text-slate-900 block mb-0.5">
                            Kết luận chẩn đoán:
                          </span>
                          <p className="text-slate-700 font-medium">
                            {item.icd10}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            <span className="font-semibold text-slate-600">Lời dặn & điều trị:</span> {item.summary}
                          </p>
                        </div>

                        {/* Badges: e-Prescription & Vitals Summary */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-semibold">
                            <Pill className="w-3.5 h-3.5 text-purple-600" />
                            <span>Toa thuốc điện tử: <strong>{isLatest ? nationalPrescriptionCode : 'DT-2026-88392104'}</strong></span>
                          </span>

                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            <span>Ký số SmartCA: <strong>Hợp lệ</strong></span>
                          </span>

                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            <span>Viện phí: <strong>150.000 đ (Đã gạch nợ VietQR)</strong></span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <button
                        onClick={() => setSelectedEncounter(item)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem Chi Tiết Bệnh Án</span>
                      </button>

                      <button
                        onClick={() => setIsNationalRxModalOpen(true)}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Xem Toa Thuốc & QR</span>
                      </button>

                      <button
                        onClick={() => showToast(`Đang tải phiếu khám bệnh ${item.id} định dạng PDF chuẩn Bộ Y Tế...`, 'info')}
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                        title="Tải phiếu khám bệnh PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* MODAL XEM CHI TIẾT BỆNH ÁN ĐÃ KHÁM (EMR SUMMARY MODAL) */}
      {selectedEncounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Bệnh Án Điện Tử (EMR)
                  </span>
                  <span className="text-xs text-slate-400">Mã lượt: {selectedEncounter.id}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Phiếu Khám Bệnh & Tư Vấn Y Tế
                </h3>
                <p className="text-xs text-slate-500">
                  Bệnh viện Đa khoa Quốc tế • {selectedEncounter.department}
                </p>
              </div>

              <button
                onClick={() => setSelectedEncounter(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Patient Details & Safety Alert */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Họ và tên người bệnh:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{currentPatient.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Mã BHYT:</span>
                <p className="font-mono font-bold text-emerald-700 text-sm mt-0.5">{currentPatient.bhyt || currentPatient.bhytNumber}</p>
              </div>
              <div>
                <span className="text-slate-400">Bác sĩ điều trị:</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedEncounter.doctor}</p>
              </div>
              <div>
                <span className="text-slate-400">Thời gian khám:</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedEncounter.date}</p>
              </div>
            </div>

            {/* Section 2: Clinical Vitals & Diagnostics */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800 block text-sm">
                1. Chẩn đoán y khoa & Kết luận:
              </span>
              <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 text-blue-950 font-semibold">
                {selectedEncounter.icd10}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800 block text-sm">
                2. Lời dặn Bác sĩ & Hướng dẫn điều trị:
              </span>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                {selectedEncounter.summary}
              </div>
            </div>

            {/* Section 3: Prescribed Medications */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">
                  3. Toa thuốc điện tử đã kê:
                </span>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {nationalPrescriptionCode}
                </span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl p-3 bg-slate-50">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{rx.name}</span>
                      <p className="text-[11px] text-slate-500">{rx.activeIngredient} • {rx.quantity} {rx.unit}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {rx.usage}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => showToast('Đang kết nối máy in để in phiếu khám bệnh...', 'info')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Khám</span>
              </button>

              <button
                onClick={() => setSelectedEncounter(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 6. MODAL PHIẾU KHÁM & MÃ QR CHECK-IN */}
      {viewQrAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Phiếu Khám Bệnh & QR Check-in</h3>
              </div>
              <button
                onClick={() => setViewQrAppointment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code & Ticket Info */}
            <div className="my-5 flex flex-col items-center text-center">
              <div className="p-3 bg-white border-2 border-emerald-500 rounded-2xl shadow-md inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    viewQrAppointment.qrCheckinCode || `CHECKIN-${viewQrAppointment.id}`
                  )}`}
                  alt="QR Checkin"
                  className="w-40 h-40 object-contain"
                />
              </div>
              <span className="mt-3 font-mono text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border">
                {viewQrAppointment.qrCheckinCode || `CHECKIN-${viewQrAppointment.id}`}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">
                Quét mã tại Kiosk bệnh viện hoặc hiển thị cho bác sĩ khi bắt đầu phiên khám
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã Lịch Hẹn:</span>
                <span className="font-mono font-bold text-slate-900">{viewQrAppointment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bác Sĩ Khám:</span>
                <span className="font-semibold text-slate-900">{viewQrAppointment.doctorName || 'BS.CKII Vũ Minh Đức'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chuyên Khoa:</span>
                <span className="font-semibold text-slate-900">{viewQrAppointment.doctorSpecialty || 'Khoa Nội Tổng Quát'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời Gian:</span>
                <span className="font-bold text-emerald-700">
                  {viewQrAppointment.appointmentTime || '09:30 - 10:00'}, {viewQrAppointment.appointmentDate || '21/10/2026'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hình Thức:</span>
                <span className="font-bold text-blue-700">
                  {viewQrAppointment.consultationType === 'in_person' ? 'Khám Tại Viện' : 'Khám Từ Xa (Telehealth)'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => showToast('Đang kết nối máy in phiếu hẹn...', 'info')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>In Phiếu Hẹn</span>
              </button>
              <button
                onClick={() => setViewQrAppointment(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
