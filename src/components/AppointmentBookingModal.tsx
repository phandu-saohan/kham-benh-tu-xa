import React, { useState } from 'react';
import {
  Calendar, Clock, User, Phone, Video, Building2, CheckCircle2,
  AlertTriangle, CreditCard, QrCode, X, ChevronRight, ArrowLeft,
  Sparkles, Stethoscope, Star, ShieldCheck, FileText, Check, HeartPulse,
  Activity, ArrowRight
} from 'lucide-react';
import { useTelemedicine } from '../context/TelemedicineContext';
import { DoctorProfile, Appointment } from '../types/telemedicine';

export const AppointmentBookingModal: React.FC = () => {
  const {
    isBookingModalOpen,
    setIsBookingModalOpen,
    doctorProfiles,
    selectedDoctorForBooking,
    setSelectedDoctorForBooking,
    currentPatient,
    bookAppointment,
    setActiveView,
    showToast
  } = useTelemedicine();

  // Booking Flow Steps: 1: Chọn BS -> 2: Chọn Ngày & Giờ -> 3: Triệu chứng & Hình thức -> 4: Xác nhận & BHYT -> 5: Thành công
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile>(
    selectedDoctorForBooking || doctorProfiles[0]
  );
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [consultationType, setConsultationType] = useState<'telehealth' | 'in_person'>('telehealth');
  
  // Ngày khám (Mặc định là ngày hôm nay)
  const todayStr = '21/10/2026';
  const tomorrowStr = '22/10/2026';
  const nextDayStr = '23/10/2026';
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('09:30 - 10:00');
  
  // Triệu chứng & Lý do khám
  const [reasonForVisit, setReasonForVisit] = useState<string>('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [triagePriority, setTriagePriority] = useState<Appointment['triagePriority']>('Cấp 3 - Xanh');
  
  // Thanh toán
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'pay_later'>('vietqr');
  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);

  if (!isBookingModalOpen) return null;

  // Lọc bác sĩ theo chuyên khoa
  const specialties = ['all', 'Khoa Nội Tổng Quát & Lão Khoa', 'Nội Tim Mạch & Can Thiệp', 'Tiêu Hóa & Gan Mật', 'Tai Mũi Họng & Hô Hấp', 'Nội Tiết & Đái Tháo Đường'];
  const filteredDoctors = selectedSpecialty === 'all'
    ? doctorProfiles
    : doctorProfiles.filter(d => d.specialty === selectedSpecialty);

  // Triệu chứng gợi ý
  const quickSymptoms = [
    'Đau tức thượng vị, ợ chua nóng',
    'Nặng ngực âm ỉ khi gắng sức',
    'Huyết áp đo tại nhà tăng cao',
    'Đau đầu, chóng mặt từng cơn',
    'Ho khan rát họng về đêm',
    'Tái khám định kỳ & Lấy đơn thuốc BHYT'
  ];

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const exists = prev.includes(symptom);
      const updated = exists ? prev.filter(s => s !== symptom) : [...prev, symptom];
      // Tự động gợi ý lý do khám nếu đang trống
      if (!reasonForVisit && updated.length > 0) {
        setReasonForVisit(updated.join(', '));
      }
      return updated;
    });
  };

  // Tính chi phí & giảm trừ BHYT
  const originalFee = selectedDoctor.consultationFee;
  const bhytCovered = selectedDoctor.bhytCoveredAmount;
  const patientFee = Math.max(0, originalFee - bhytCovered);

  // Xử lý xác nhận đặt lịch khám
  const handleConfirmBooking = () => {
    const finalReason = reasonForVisit.trim() || selectedSymptoms.join(', ') || 'Khám và tư vấn chuyên khoa';

    const newApt = bookAppointment({
      patientId: currentPatient.id,
      patientName: currentPatient.name,
      patientAge: currentPatient.age,
      patientGender: currentPatient.gender,
      patientPhone: currentPatient.phone,
      appointmentTime: selectedTimeSlot,
      date: selectedDate,
      doctorName: selectedDoctor.name,
      doctorTitle: selectedDoctor.title,
      specialty: selectedDoctor.specialty,
      status: 'waiting',
      triagePriority: triagePriority,
      reason: finalReason,
      symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : [finalReason],
      consultationType: consultationType,
      cost: originalFee,
      bhytCovered: bhytCovered,
      patientPaid: patientFee,
      paymentStatus: paymentMethod === 'vietqr' ? 'paid_vietqr' : 'unpaid',
      vitals: {
        bp: currentPatient.vitals.bp?.value || '135/85',
        hr: Number(currentPatient.vitals.heartRate?.value) || 78,
        spo2: Number(currentPatient.vitals.spo2?.value) || 98
      }
    });

    setCreatedAppointment(newApt);
    setCurrentStep(5); // Chuyển sang màn hình thành công
  };

  const handleClose = () => {
    setIsBookingModalOpen(false);
    setCurrentStep(1);
    setCreatedAppointment(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  Đặt Lịch Khám Chuyên Khoa
                </h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Hỗ trợ BHYT 80%
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Bệnh viện Đa khoa Quốc tế • Kết nối trực tiếp Bác sĩ chuyên khoa • Hồ sơ liên thông HIS/EMR
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        {currentStep !== 5 && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0 overflow-x-auto">
            <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-blue-600' : currentStep > 1 ? 'text-emerald-600' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 1 ? 'bg-blue-600 text-white' : currentStep > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </span>
              <span>1. Chọn Bác sĩ</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

            <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-blue-600' : currentStep > 2 ? 'text-emerald-600' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 2 ? 'bg-blue-600 text-white' : currentStep > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </span>
              <span>2. Ngày & Giờ</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

            <div className={`flex items-center gap-2 ${currentStep === 3 ? 'text-blue-600' : currentStep > 3 ? 'text-emerald-600' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 3 ? 'bg-blue-600 text-white' : currentStep > 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {currentStep > 3 ? <Check className="w-3.5 h-3.5" /> : '3'}
              </span>
              <span>3. Triệu chứng</span>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

            <div className={`flex items-center gap-2 ${currentStep === 4 ? 'text-blue-600' : ''}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 4 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                4
              </span>
              <span>4. Xác nhận & BHYT</span>
            </div>
          </div>
        )}

        {/* BODY CONTAINER */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          
          {/* ======================================================== */}
          {/* BƯỚC 1: CHỌN CHUYÊN KHOA & BÁC SĨ                      */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <span>Chọn Chuyên Khoa & Bác Sĩ Phụ Trách</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đội ngũ Bác sĩ chuyên khoa giàu kinh nghiệm trực tiếp tư vấn và kê đơn thuốc liên thông
                </p>
              </div>

              {/* Specialty Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {specialties.map(spec => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpecialty(spec)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                      selectedSpecialty === spec
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {spec === 'all' ? 'Tất cả chuyên khoa' : spec}
                  </button>
                ))}
              </div>

              {/* Doctor Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDoctors.map(doc => {
                  const isSelected = selectedDoctor.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/30 shadow-md ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}

                      <div className="flex items-start gap-3.5">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs">
                          <img
                            src={doc.avatar}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="space-y-1 flex-1 pr-6">
                          <h4 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                            {doc.name}
                          </h4>
                          <p className="text-xs text-blue-700 font-semibold">{doc.title}</p>
                          <p className="text-[11px] text-slate-500">{doc.specialty}</p>

                          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                              {doc.rating}
                            </span>
                            <span>•</span>
                            <span>{doc.experienceYears} năm KN</span>
                            <span>•</span>
                            <span>{doc.totalConsultations}+ ca khám</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {doc.about}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Giá khám sau BHYT:</span>
                          <span className="font-black text-sm text-emerald-700">
                            {(doc.consultationFee - doc.bhytCoveredAmount).toLocaleString('vi-VN')} đ
                          </span>
                          <span className="text-[10px] text-slate-400 line-through ml-1">
                            {doc.consultationFee.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                          Có lịch hẹn hôm nay
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 2: CHỌN NGÀY & KHUNG GIỜ KHÁM                      */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Chọn Ngày & Khung Giờ Khám</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bác sĩ: <strong>{selectedDoctor.name}</strong> • {selectedDoctor.specialty}
                </p>
              </div>

              {/* Day selection tabs */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  1. Chọn ngày khám:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Hôm nay', date: todayStr, dayName: 'Thứ 4' },
                    { label: 'Ngày mai', date: tomorrowStr, dayName: 'Thứ 5' },
                    { label: 'Ngày kia', date: nextDayStr, dayName: 'Thứ 6' }
                  ].map(d => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDate(d.date)}
                      className={`p-3.5 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                        selectedDate === d.date
                          ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-[11px] text-slate-500 font-semibold">{d.label}</span>
                      <span className="text-sm font-black text-slate-900">{d.date}</span>
                      <span className="text-[11px] text-blue-600 font-medium">{d.dayName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slot selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  2. Chọn khung giờ khám (Mỗi phiên kéo dài 30 phút):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {selectedDoctor.timeSlots.map(slot => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Doctor Availability Notice */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Bác sĩ <strong>{selectedDoctor.name}</strong> luôn túc trực phiên khám trực tuyến đúng giờ hẹn. Bạn sẽ nhận được chuông gọi video trên web/app.
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 3: HÌNH THỨC KHÁM & TRIỆU CHỨNG                    */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span>Hình Thức Khám & Triệu Chứng Ban Đầu</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cung cấp triệu chứng giúp Bác sĩ chuẩn bị hồ sơ bệnh án và phương án điều trị tốt nhất
                </p>
              </div>

              {/* Consultation Type Radio Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  1. Hình thức khám bạn mong muốn:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setConsultationType('telehealth')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      consultationType === 'telehealth'
                        ? 'border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">Khám từ xa Telemedicine</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Khuyên dùng</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Khám qua Video HD tại nhà, đồng bộ máy đo huyết áp/SpO2 Bluetooth, nhận đơn thuốc Quốc gia gửi về tận nhà.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setConsultationType('in_person')}
                    className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      consultationType === 'in_person'
                        ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm text-slate-900">Khám trực tiếp tại Bệnh viện</span>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Đến thẳng phòng khám chuyên khoa, check-in qua mã QR không cần bốc số chờ đợi tại quầy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Symptoms Chips */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  2. Triệu chứng thường gặp (Chọn các mục phù hợp):
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickSymptoms.map(symp => {
                    const isSelected = selectedSymptoms.includes(symp);
                    return (
                      <button
                        key={symp}
                        type="button"
                        onClick={() => toggleSymptom(symp)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{symp}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free Text Reason for Visit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  3. Mô tả chi tiết lý do khám hoặc diễn tiến bệnh:
                </label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Đau rát vùng thượng vị sau khi ăn no, ợ chua nhiều về đêm, đo huyết áp tại nhà thấy 145/92 mmHg..."
                  value={reasonForVisit}
                  onChange={e => setReasonForVisit(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Triage Urgency Level */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  4. Mức độ cần thiết khám:
                </label>
                <div className="grid grid-cols-3 gap-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTriagePriority('Cấp 3 - Xanh')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      triagePriority === 'Cấp 3 - Xanh'
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    Cấp 3 - Tiêu chuẩn (Xanh)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriagePriority('Cấp 2 - Vàng')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      triagePriority === 'Cấp 2 - Vàng'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    Cấp 2 - Khẩn cấp (Vàng)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTriagePriority('Cấp 1 - Đỏ')}
                    className={`py-2 px-3 rounded-xl font-bold border transition ${
                      triagePriority === 'Cấp 1 - Đỏ'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    Cấp 1 - Tối khẩn (Đỏ)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 4: THÔNG TIN BỆNH NHÂN, BHYT & XÁC NHẬN             */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Xác Nhận Đặt Lịch & Quyền Lợi BHYT</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vui lòng kiểm tra lại thông tin trước khi hoàn tất đăng ký lịch hẹn
                </p>
              </div>

              {/* Patient Core Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Người khám bệnh:</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{currentPatient.name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Số điện thoại liên hệ:</span>
                  <p className="font-mono font-bold text-slate-900 text-sm mt-0.5">{currentPatient.phone}</p>
                </div>
                <div>
                  <span className="text-slate-400">Số thẻ BHYT (Đúng tuyến):</span>
                  <p className="font-mono font-bold text-emerald-700 text-sm mt-0.5">{currentPatient.bhyt || currentPatient.bhytNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400">Thời gian hẹn khám:</span>
                  <p className="font-bold text-blue-700 text-sm mt-0.5">{selectedTimeSlot} ngày {selectedDate}</p>
                </div>
              </div>

              {/* Doctor & Appointment Summary Card */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedDoctor.avatar}
                    alt={selectedDoctor.name}
                    className="w-12 h-12 rounded-xl object-cover border border-blue-300"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{selectedDoctor.name}</h4>
                    <p className="text-xs text-blue-700">{selectedDoctor.title}</p>
                    <p className="text-[11px] text-slate-500">{consultationType === 'telehealth' ? 'Khám từ xa Telemedicine qua Video' : 'Khám trực tiếp tại Bệnh viện'}</p>
                  </div>
                </div>

                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-800">
                  {selectedDate}
                </span>
              </div>

              {/* BHYT & Fee Breakdown */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Giá khám chuyên khoa niêm yết:</span>
                  <span className="font-semibold">{originalFee.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Bảo hiểm Y tế hỗ trợ (80% đúng tuyến):</span>
                  <span>-{bhytCovered.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                  <span>Số tiền thực tế thanh toán:</span>
                  <span className="text-base text-emerald-700">{patientFee.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">
                  Phương thức thanh toán:
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`p-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                      paymentMethod === 'vietqr'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Thanh toán VietQR Napas247</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_later')}
                    className={`p-3 rounded-xl border text-center font-bold transition flex items-center justify-center gap-2 ${
                      paymentMethod === 'pay_later'
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Thanh toán sau khi khám</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* BƯỚC 5: ĐẶT LỊCH THÀNH CÔNG                             */}
          {/* ======================================================== */}
          {currentStep === 5 && createdAppointment && (
            <div className="py-6 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Đặt Lịch Khám Thành Công!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mã lịch hẹn khám: <strong className="font-mono text-blue-700 text-sm">{createdAppointment.id}</strong>
                </p>
              </div>

              {/* Ticket Card */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-left space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800">Phiếu Lịch Hẹn Khám Bệnh</span>
                  <span className="font-mono text-emerald-700 font-bold">Xác nhận trực tuyến</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span>Bác sĩ khám:</span>
                    <p className="font-bold text-slate-900 mt-0.5">{createdAppointment.doctorName}</p>
                  </div>
                  <div>
                    <span>Chuyên khoa:</span>
                    <p className="font-bold text-slate-900 mt-0.5">{createdAppointment.specialty}</p>
                  </div>
                  <div>
                    <span>Thời gian hẹn:</span>
                    <p className="font-bold text-blue-700 mt-0.5">{createdAppointment.appointmentTime}</p>
                  </div>
                  <div>
                    <span>Ngày khám:</span>
                    <p className="font-bold text-blue-700 mt-0.5">{createdAppointment.date}</p>
                  </div>
                </div>

                {/* QR Check-in preview */}
                <div className="pt-2 border-t border-slate-200 flex items-center gap-3">
                  <div className="w-16 h-16 bg-white p-1 rounded-xl border border-slate-300 shrink-0">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${createdAppointment.qrCheckinCode || createdAppointment.id}`}
                      alt="QR Check-in"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block text-xs">Mã QR Check-in Điện Tử</span>
                    <p className="text-[11px] text-slate-500">
                      Sử dụng để quét nhận diện tại trạm khám hoặc xác thực phòng họp video.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    handleClose();
                    setActiveView('consultation');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  <span>Vào Phòng Khám Trực Tuyến Ngay</span>
                </button>

                <button
                  onClick={handleClose}
                  className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition cursor-pointer"
                >
                  Đóng & Xem Lịch Hẹn
                </button>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER CONTROLS */}
        {currentStep !== 5 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => (prev - 1) as any)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
              >
                Hủy
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => (prev + 1) as any)}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer"
              >
                <span>Tiếp tục</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Đặt Lịch Khám</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
