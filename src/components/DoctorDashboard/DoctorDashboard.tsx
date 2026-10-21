import React, { useState } from 'react';
import {
  Calendar, Clock, User, Phone, PhoneCall, RotateCcw, Video,
  AlertTriangle, ShieldCheck, CheckCircle2, Search, Filter,
  Activity, Heart, Stethoscope, ChevronRight, Sparkles, Building,
  ArrowRight, FileText, Lock, RefreshCw, Eye, CalendarPlus
} from 'lucide-react';
import { useTelemedicine } from '../../context/TelemedicineContext';
import { Appointment } from '../../types/telemedicine';

export const DoctorDashboard: React.FC = () => {
  const {
    appointments,
    startDoctorCall,
    recallPatient,
    setActiveView,
    setSelectedPatientId,
    selectedPatientId,
    patients,
    callSignaling,
    setIsNationalRxModalOpen,
    setIsBhytXmlModalOpen,
    setIsAuditModalOpen,
    setIsBookingModalOpen
  } = useTelemedicine();

  const [activeFilter, setActiveFilter] = useState<'all' | 'waiting' | 'urgent' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewApt, setPreviewApt] = useState<Appointment | null>(null);

  // Thống kê nhanh
  const totalCount = appointments.length;
  const waitingCount = appointments.filter(a => a.status === 'waiting' || a.status === 'calling').length;
  const urgentCount = appointments.filter(a => 
    (a.triagePriority && (a.triagePriority.includes('1') || a.triagePriority.includes('Đỏ') || a.triagePriority.includes('2') || a.triagePriority.includes('Vàng')))
  ).length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  // Lọc danh sách lịch hẹn
  const filteredAppointments = appointments.filter(apt => {
    const pName = apt.patientName || '';
    const pId = apt.id || '';
    const phone = apt.patientPhone || (apt as any).phone || '';
    const reason = apt.reason || (apt as any).reasonForVisit || '';

    // Search
    const matchSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      reason.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchSearch) return false;

    // Filter
    if (activeFilter === 'waiting') return apt.status === 'waiting' || apt.status === 'calling';
    if (activeFilter === 'urgent') return apt.triagePriority?.includes('1') || apt.triagePriority?.includes('2') || apt.triagePriority?.includes('Đỏ') || apt.triagePriority?.includes('Vàng');
    if (activeFilter === 'completed') return apt.status === 'completed';
    return true;
  });

  const getTriageBadge = (priority?: string) => {
    if (priority?.includes('1') || priority?.includes('Đỏ')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 border border-rose-300">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
          Cấp 1 - Tối khẩn (Đỏ)
        </span>
      );
    }
    if (priority?.includes('2') || priority?.includes('Vàng')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Cấp 2 - Khẩn cấp (Vàng)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-800 border border-emerald-300">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Cấp 3 - Tiêu chuẩn (Xanh)
      </span>
    );
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'calling':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-300 animate-pulse">
            <PhoneCall className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
            Đang đổ chuông...
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">
            <Video className="w-3.5 h-3.5 text-purple-600" />
            Đang trong phiên khám
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            Đã hoàn thành khám
          </span>
        );
      case 'waiting':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Chờ gọi khám
          </span>
        );
    }
  };

  return (
    <div className="flex-1 bg-slate-100 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-[1720px] mx-auto space-y-6">
        
        {/* DOCTOR PROFILE & STATUS HERO HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
          {/* Subtle decoration glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Left: Doctor Details */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-400 shadow-xl bg-slate-800 shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=260"
                    alt="BS.CKII Vũ Minh Đức"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900 absolute -bottom-1 -right-1 shadow" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    BS.CKII Vũ Minh Đức
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Phòng khám trực tuyến đang MỞ
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  Trưởng khoa Nội Tổng Hợp • Bệnh viện Đa khoa Quốc tế
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    Mã CCH: <strong>CCH-004821</strong>
                  </span>
                  <span>•</span>
                  <span>Ký số SmartCA: <strong>Hợp lệ (VNPT PKI)</strong></span>
                  <span>•</span>
                  <span>Cổng donthuocquocgia.vn: <strong>Đã liên thông</strong></span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-teal-600/90 hover:bg-teal-500 text-white text-xs sm:text-sm font-bold border border-teal-500 shadow-md transition cursor-pointer"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>+ Đặt Lịch Khám Mới</span>
              </button>

              <button
                onClick={() => {
                  setSelectedPatientId('HIS-2026-0892');
                  setActiveView('consultation');
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition active:scale-95 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Vào Phòng Khám Trực Tiếp</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                onClick={() => setIsNationalRxModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Cổng Đơn thuốc QG</span>
              </button>

              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold border border-slate-700 transition cursor-pointer"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Nhật ký Kiểm toán</span>
              </button>
            </div>
          </div>

          {/* KPI STATS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
            <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
              <span className="text-xs text-slate-400">Lịch hẹn hôm nay</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-white">{totalCount}</span>
                <span className="text-xs text-slate-400">bệnh nhân</span>
              </div>
            </div>

            <div className="bg-amber-950/40 p-4 rounded-2xl border border-amber-800/50">
              <span className="text-xs text-amber-300 font-medium">Chờ gọi khám</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-amber-400">{waitingCount}</span>
                <span className="text-xs text-amber-300">đang đợi</span>
              </div>
            </div>

            <div className="bg-rose-950/40 p-4 rounded-2xl border border-rose-800/50">
              <span className="text-xs text-rose-300 font-medium">Khẩn cấp (Cấp 1 & 2)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-rose-400">{urgentCount}</span>
                <span className="text-xs text-rose-300">ưu tiên gọi</span>
              </div>
            </div>

            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-800/50">
              <span className="text-xs text-emerald-300 font-medium">Đã khám hoàn tất</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400">{completedCount}</span>
                <span className="text-xs text-emerald-300">đã ký đơn</span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS: SEARCH & FILTER TABS */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({totalCount})
            </button>

            <button
              onClick={() => setActiveFilter('waiting')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'waiting'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chờ gọi khám ({waitingCount})
            </button>

            <button
              onClick={() => setActiveFilter('urgent')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'urgent'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Khẩn cấp ({urgentCount})
            </button>

            <button
              onClick={() => setActiveFilter('completed')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
                activeFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã khám ({completedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên BN, SĐT, lý do khám..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* APPOINTMENTS LIST CARDS */}
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Không có lịch hẹn phù hợp</h3>
              <p className="text-xs text-slate-500 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
            </div>
          ) : (
            filteredAppointments.map((apt) => {
              const patientObj = patients.find(p => p.id === apt.patientId);
              const isCallingThisPatient = callSignaling.status === 'calling' && callSignaling.patientId === apt.patientId;
              const hasPenicillinAllergy = patientObj?.allergies?.some(a => a.toLowerCase().includes('penicillin'));

              return (
                <div
                  key={apt.id}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all duration-200 shadow-sm hover:shadow-md ${
                    isCallingThisPatient
                      ? 'border-blue-500 ring-2 ring-blue-400/40 bg-blue-50/20'
                      : apt.status === 'completed'
                      ? 'border-slate-200 opacity-90'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    
                    {/* Patient Core Info & Vitals */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={(apt as any).avatar || (patientObj?.avatar) || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150'}
                            alt={apt.patientName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-900 text-white absolute -bottom-1 -right-1">
                          {apt.patientGender || (apt as any).gender || 'Nam'}
                        </span>
                      </div>

                      {/* Bio & Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-slate-900">
                            {apt.patientName}
                          </h3>
                          <span className="text-xs font-semibold text-slate-500">
                            ({apt.patientAge || (apt as any).age || 48} tuổi)
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {apt.patientId}
                          </span>
                          {getTriageBadge(apt.triagePriority)}
                          {getStatusBadge(apt.status)}
                        </div>

                        {/* Reason for visit */}
                        <p className="text-xs sm:text-sm text-slate-700 font-medium">
                          <span className="text-slate-400 font-normal">Lý do khám:</span> {apt.reason || (apt as any).reasonForVisit || 'Khám tổng quát định kỳ'}
                        </p>

                        {/* IoT Pre-triage Vitals Badges */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Giờ hẹn: <strong>{apt.appointmentTime}</strong></span>
                          </span>

                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                            <Activity className="w-3.5 h-3.5 text-rose-500" />
                            <span>Huyết áp: <strong>{apt.vitals?.bp || (apt as any).vitalsSummary?.bp || '135/85 mmHg'}</strong></span>
                          </span>

                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                            <Heart className="w-3.5 h-3.5 text-emerald-500" />
                            <span>SpO2: <strong>{apt.vitals?.spo2 ? `${apt.vitals.spo2}%` : ((apt as any).vitalsSummary?.spo2 || '98%')}</strong></span>
                          </span>

                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>SĐT: <strong>{apt.patientPhone || (apt as any).phone || '0903 812 456'}</strong></span>
                          </span>

                          {hasPenicillinAllergy && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                              Dị ứng Penicillin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ACTION CONTROLS: GỌI BỆNH NHÂN / GỌI LẠI BN / VÀO PHÒNG KHÁM */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      
                      {/* 1. BUTTON: GỌI BỆNH NHÂN / GỌI LẠI BN */}
                      {apt.status !== 'completed' && (
                        <>
                          {isCallingThisPatient ? (
                            <div className="flex items-center gap-2">
                              <button
                                disabled
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs sm:text-sm border border-blue-300 animate-pulse cursor-not-allowed"
                              >
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                                <span>Đang gọi bệnh nhân...</span>
                              </button>

                              <button
                                onClick={() => recallPatient(apt.id)}
                                title="Bấm để gọi lại nếu bệnh nhân chưa bắt máy"
                                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
                                <span>Gọi lại BN</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startDoctorCall(apt.id)}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
                            >
                              <PhoneCall className="w-4 h-4" />
                              <span>Gọi Bệnh Nhân</span>
                            </button>
                          )}
                        </>
                      )}

                      {/* 2. BUTTON: GỌI LẠI BN (Khi đã hoàn thành hoặc muốn tái khám nhanh) */}
                      {apt.status === 'completed' && (
                        <button
                          onClick={() => recallPatient(apt.id)}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Gọi lại BN</span>
                        </button>
                      )}

                      {/* 3. BUTTON: VÀO PHÒNG KHÁM */}
                      <button
                        onClick={() => {
                          setSelectedPatientId(apt.patientId);
                          setActiveView('consultation');
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs sm:text-sm transition cursor-pointer"
                      >
                        <Video className="w-4 h-4 text-blue-600" />
                        <span>Vào Phòng Khám</span>
                      </button>

                      {/* 4. BUTTON: XEM HỒ SƠ EMR NHANH */}
                      <button
                        onClick={() => {
                          setSelectedPatientId(apt.patientId);
                          setPreviewApt(apt);
                        }}
                        title="Xem trước tóm tắt bệnh án điện tử"
                        className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* BOTTOM INTEGRATION FOOTER STATUS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              Cụm Máy chủ & Cổng Liên thông:
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Mirth Connect HL7 v2 / FHIR R4 (Online)
            </span>
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Orthanc PACS DICOMweb (Port 8042)
            </span>
            <span className="flex items-center gap-1.5 text-purple-700">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              WebRTC SFU Telehealth Cluster (Port 7880)
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>Phiên bản HIS-EMR v3.4.2 Enterprise</span>
            <span>•</span>
            <button
              onClick={() => setIsBhytXmlModalOpen(true)}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Xuất BHYT XML 4210
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
