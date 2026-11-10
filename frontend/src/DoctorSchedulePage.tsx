import React, { useState, useEffect } from 'react'
import {
  CalendarDays, Clock, Video, User, CheckCircle2, AlertCircle,
  ChevronLeft, ChevronRight, Stethoscope, Building2,
  Calendar as CalendarIcon, ShieldCheck, X, RefreshCw,
  DoorOpen, Layers, Users, Info, ArrowRight, ExternalLink,
  Laptop, PhoneCall, Sparkles
} from 'lucide-react'
import {
  Appointment, Department, DoctorShift,
  getDoctorShifts, syncHisDoctorShifts
} from './api'

interface DoctorSchedulePageProps {
  doctor: any
  appointments: Appointment[]
  departments?: Department[]
  doctorShifts?: DoctorShift[]
  onOpenWorkspace: (appointment: Appointment) => void
  onNavigate?: (view: string) => void
}

export const DoctorSchedulePage: React.FC<DoctorSchedulePageProps> = ({
  doctor,
  appointments,
  departments,
  doctorShifts,
  onOpenWorkspace,
  onNavigate
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'agenda'>('week')
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0)
  const [shifts, setShifts] = useState<DoctorShift[]>(doctorShifts || [])
  const [loadingShifts, setLoadingShifts] = useState(false)
  const [syncingHis, setSyncingHis] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [selectedShiftForModal, setSelectedShiftForModal] = useState<DoctorShift | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // 7 ngày trong tuần từ Thứ Hai 09/11/2026 đến Chủ Nhật 15/11/2026
  const weekDays = [
    { name: 'Thứ Hai', dateStr: '09/11/2026', iso: '2026-11-09', isToday: false },
    { name: 'Thứ Ba', dateStr: '10/11/2026', iso: '2026-11-10', isToday: true },
    { name: 'Thứ Tư', dateStr: '11/11/2026', iso: '2026-11-11', isToday: false },
    { name: 'Thứ Năm', dateStr: '12/11/2026', iso: '2026-11-12', isToday: false },
    { name: 'Thứ Sáu', dateStr: '13/11/2026', iso: '2026-11-13', isToday: false },
    { name: 'Thứ Bảy', dateStr: '14/11/2026', iso: '2026-11-14', isToday: false },
    { name: 'Chủ Nhật', dateStr: '15/11/2026', iso: '2026-11-15', isToday: false }
  ]

  // Lấy các ca hẹn của bác sĩ
  const myAppointments = appointments.filter(
    a => a.doctor_id === doctor?.id || doctor?.role === 'doctor'
  )

  // Tải danh sách phân công lịch khám & phòng khám từ database
  const loadShifts = async () => {
    if (!doctor?.id) return
    try {
      setLoadingShifts(true)
      const data = await getDoctorShifts(doctor.id)
      if (data && data.length > 0) {
        setShifts(data)
      } else {
        // Nếu chưa có ca phân công nào trong DB, kích hoạt đồng bộ từ HIS ngay lần đầu
        await handleSyncHis(false)
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách phân công lịch khám:', err)
    } finally {
      setLoadingShifts(false)
    }
  }

  // Đồng bộ lịch phân công ca khám và phòng khám từ API HIS Bệnh viện
  const handleSyncHis = async (showNotification = true) => {
    try {
      setSyncingHis(true)
      const res = await syncHisDoctorShifts(doctor?.id)
      if (res?.success) {
        if (showNotification) {
          showToast(`🏥 ${res.message || 'Đồng bộ từ HIS thành công!'}`)
        }
        // Tải lại sau khi đồng bộ
        const refreshed = await getDoctorShifts(doctor.id)
        if (refreshed && refreshed.length > 0) {
          setShifts(refreshed)
        }
      }
    } catch (err) {
      console.error('Lỗi đồng bộ từ HIS:', err)
      if (showNotification) {
        showToast('⚠️ Lỗi kết nối API HIS. Vui lòng thử lại sau.')
      }
    } finally {
      setSyncingHis(false)
    }
  }

  useEffect(() => {
    loadShifts()
  }, [doctor?.id])

  // Ca trực hôm nay của bác sĩ
  const todayIso = '2026-11-10'
  const todayShifts = shifts.filter(s => s.shift_date === todayIso)
  const currentAssignedRoom = todayShifts.length > 0
    ? todayShifts.map(s => s.room_name).filter(Boolean).join(' • ')
    : 'Phòng khám Telemedicine #01 (Khoa Nội)'

  return (
    <div className="doctor-schedule-container" style={{ padding: '6px 0 32px' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: '#064e3b',
          color: '#ffffff',
          padding: '14px 22px',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: 700,
          border: '1px solid #10b981'
        }}>
          <CheckCircle2 size={18} color="#34d399" />
          {toastMessage}
        </div>
      )}

      {/* HEADER BANNER: LỊCH PHÂN CÔNG THỜI GIAN KHÁM & PHÒNG KHÁM */}
      <div style={{
        background: 'linear-gradient(135deg, #044e45 0%, #065f46 50%, #047857 100%)',
        borderRadius: '16px',
        padding: '24px 30px',
        color: '#ffffff',
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(4, 78, 69, 0.18)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '18px'
      }}>
        <div style={{ maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255,255,255,0.18)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.3px'
            }}>
              <CalendarDays size={14} />
              LỊCH PHÂN CÔNG CHÍNH THỨC
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ecfdf5',
              color: '#065f46',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 700
            }}>
              🏥 Đồng bộ từ API HIS Bệnh viện & Dashboard Quản trị
            </span>
          </div>

          <h2 style={{ margin: '0 0 6px 0', fontSize: '24px', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Lịch Phân Công Thời Gian Khám & Phòng Khám
          </h2>
          <p style={{ margin: 0, opacity: 0.92, fontSize: '14px', lineHeight: 1.5 }}>
            Bác sĩ phụ trách: <strong>{doctor?.full_name || 'BS. CKII Trần Minh'}</strong> • CCHN: <strong>{doctor?.doctor_cchn || '008912/BYT-CCHN'}</strong> • Khoa: <strong>{doctor?.department_name || 'Khoa Nội Tổng Quát'}</strong>
          </p>
        </div>

        {/* CTA: Nút Đồng bộ từ HIS & Chế độ xem */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => handleSyncHis(true)}
            disabled={syncingHis || loadingShifts}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffffff',
              color: '#065f46',
              border: 'none',
              padding: '11px 18px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: syncingHis ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              transition: 'all 0.2s ease'
            }}
            title="Đồng bộ lại toàn bộ ca trực & buồng khám được phân công từ hệ thống Quản trị Bệnh viện (HIS)"
          >
            <RefreshCw size={16} className={syncingHis ? 'spin-icon' : ''} />
            <span>{syncingHis ? 'Đang đồng bộ HIS...' : 'Đồng bộ từ API HIS'}</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO QUY ĐỊNH BỆNH VIỆN */}
      <div style={{
        background: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#166534',
        fontSize: '13px',
        lineHeight: 1.5
      }}>
        <Info size={20} color="#15803d" style={{ flexShrink: 0 }} />
        <div>
          <strong>Quy chế phân công chuyên môn:</strong> Lịch khám là lịch phân công thời gian khám và buồng khám chính thức được thiết lập tập trung từ <strong>Dashboard Ban Quản Trị</strong> hoặc <strong>đồng bộ tự động từ API của Hệ thống HIS Bệnh viện</strong> (HL7 FHIR). Bác sĩ tiếp nhận ca khám, trực tại buồng khám được giao và tiếp nhận người bệnh theo đúng khung giờ quy định.
        </div>
      </div>

      {/* 4 THẺ CHỈ SỐ PHÂN CÔNG & BUỒNG KHÁM */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Card 1: Phòng khám được phân công hôm nay */}
        <div style={{
          background: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Phòng khám được phân công</span>
            <DoorOpen size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '8px', lineHeight: 1.3 }}>
            {currentAssignedRoom}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            Đang mở tiếp nhận bệnh nhân
          </div>
        </div>

        {/* Card 2: Ca khám & Khung giờ hôm nay */}
        <div style={{
          background: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Khung giờ phân công hôm nay</span>
            <Clock size={18} color="#2563eb" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>
            07:30 - 11:30 & 13:30 - 17:00
          </div>
          <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '6px', fontWeight: 600 }}>
            Ca Sáng & Ca Chiều (Phân bổ từ HIS)
          </div>
        </div>

        {/* Card 3: Số lượt khám đã phân bổ */}
        <div style={{
          background: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Bệnh nhân đã phân luồng vào phòng</span>
            <Users size={18} color="#059669" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {myAppointments.length} <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>lượt khám</span>
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px', fontWeight: 600 }}>
            {myAppointments.filter(a => a.status === 'in_progress').length > 0 ? '🟢 1 ca đang khám' : 'Đang chờ tiếp đón lượt tiếp theo'}
          </div>
        </div>

        {/* Card 4: Nguồn phân công & Định mức */}
        <div style={{
          background: '#ffffff',
          padding: '18px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Nguồn phân công & Định mức</span>
            <ShieldCheck size={18} color="#d97706" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>
            12 ca/buổi (Chuẩn BYT)
          </div>
          <div style={{ fontSize: '12px', color: '#d97706', marginTop: '6px', fontWeight: 600 }}>
            🛡️ Cơ chế chống quá tải tự động
          </div>
        </div>
      </div>

      {/* THANH CHUYỂN ĐỔI CHẾ ĐỘ XEM & ĐIỀU HƯỚNG TUẦN */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px 20px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setSelectedDayOffset(prev => prev - 7)}
            style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
            Tuần: 09/11/2026 - 15/11/2026 (Tuần công tác #46)
          </div>
          <button
            type="button"
            onClick={() => setSelectedDayOffset(prev => prev + 7)}
            style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Tuần sau"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDayOffset(0)}
            style={{ border: '1px solid #059669', background: '#ecfdf5', color: '#059669', borderRadius: '8px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
          >
            Hôm nay (10/11)
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            style={{
              border: 'none',
              background: viewMode === 'week' ? '#ffffff' : 'transparent',
              color: viewMode === 'week' ? '#0f172a' : '#64748b',
              fontWeight: 800,
              fontSize: '13px',
              padding: '7px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: viewMode === 'week' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            📅 Lịch phân công theo tuần
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            style={{
              border: 'none',
              background: viewMode === 'agenda' ? '#ffffff' : 'transparent',
              color: viewMode === 'agenda' ? '#0f172a' : '#64748b',
              fontWeight: 800,
              fontSize: '13px',
              padding: '7px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: viewMode === 'agenda' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
            }}
          >
            📋 Danh sách ca trực & Buồng khám
          </button>
        </div>
      </div>

      {/* CHẾ ĐỘ XEM 1: LƯỚI PHÂN CÔNG THEO TUẦN (7 NGÀY) */}
      {viewMode === 'week' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          alignItems: 'stretch'
        }}>
          {weekDays.map((day, idx) => {
            // Lấy các ca phân công của ngày này
            const dayShifts = shifts.filter(s => s.shift_date === day.iso)
            const isToday = day.isToday

            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: isToday ? '2px solid #059669' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minHeight: '440px',
                  boxShadow: isToday ? '0 6px 18px rgba(5, 150, 105, 0.12)' : '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {/* Tiêu đề cột ngày */}
                <div style={{
                  padding: '12px 14px',
                  background: isToday ? '#059669' : '#f8fafc',
                  color: isToday ? '#ffffff' : '#1e293b',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px' }}>{day.name}</span>
                    {isToday && (
                      <span style={{ background: '#ffffff', color: '#059669', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                        HÔM NAY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', opacity: isToday ? 0.95 : 0.65, marginTop: '2px' }}>
                    {day.dateStr}
                  </div>
                </div>

                {/* Danh sách các ca & buồng khám được phân công */}
                <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {dayShifts.length > 0 ? (
                    dayShifts.map((s, sIdx) => {
                      const isHis = s.notes && s.notes.includes('HIS')
                      const isMorning = s.shift_type === 'morning'
                      const shiftLabel = isMorning
                        ? '☀️ Ca Sáng (07:30 - 11:30)'
                        : s.shift_type === 'afternoon'
                          ? '🌤️ Ca Chiều (13:30 - 17:00)'
                          : '🌙 Ca Tối (17:30 - 20:30)'

                      return (
                        <div
                          key={s.id || sIdx}
                          style={{
                            background: isToday ? '#f0fdf4' : '#f8fafc',
                            border: `1px solid ${isToday ? '#bbf7d0' : '#e2e8f0'}`,
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          {/* Ca trực */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: isToday ? '#047857' : '#334155' }}>
                              {shiftLabel}
                            </span>
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: isHis ? '#e0f2fe' : '#fef3c7',
                              color: isHis ? '#0369a1' : '#b45309'
                            }}>
                              {isHis ? 'HIS API' : 'BQT Phân công'}
                            </span>
                          </div>

                          {/* Phòng khám được giao */}
                          <div style={{
                            fontSize: '12.5px',
                            fontWeight: 800,
                            color: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            marginTop: '2px'
                          }}>
                            <DoorOpen size={14} color="#059669" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.room_name || 'Phòng khám Telemedicine #01'}
                            </span>
                          </div>

                          {/* Định mức BN */}
                          <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Đã xếp: <strong>{s.booked_count || (isToday ? myAppointments.length : 4)}</strong>/{s.max_patients} BN</span>
                            <span style={{ color: '#059669', fontWeight: 700 }}>Đạt chuẩn</span>
                          </div>

                          {/* Thanh tiến độ lấp đầy */}
                          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, (((s.booked_count || (isToday ? myAppointments.length : 4)) / s.max_patients) * 100))}%`,
                              height: '100%',
                              background: '#10b981'
                            }} />
                          </div>

                          {/* Thao tác vào khám nếu là ngày hôm nay */}
                          {isToday && (
                            <button
                              type="button"
                              onClick={() => {
                                const activeAppt = myAppointments[0]
                                if (activeAppt) {
                                  onOpenWorkspace(activeAppt)
                                } else {
                                  showToast('Đang mở buồng khám Telemedicine...')
                                }
                              }}
                              style={{
                                marginTop: '6px',
                                width: '100%',
                                padding: '6px 8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                background: '#059669',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px',
                                boxShadow: '0 2px 4px rgba(5,150,105,0.2)'
                              }}
                            >
                              <Stethoscope size={13} />
                              Mở Buồng Khám / Khám
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedShiftForModal(s)}
                            style={{
                              width: '100%',
                              padding: '4px 6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: 'transparent',
                              color: '#475569',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            Chi tiết phân công
                          </button>
                        </div>
                      )
                    })
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '12px',
                      padding: '36px 12px',
                      fontStyle: 'italic'
                    }}>
                      Chưa có ca phân công cho ngày này
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* CHẾ ĐỘ XEM 2: DANH SÁCH BẢNG PHÂN CÔNG CHI TIẾT (AGENDA) */}
      {viewMode === 'agenda' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
              Danh Sách Lịch Phân Công Ca Khám & Phòng Khám (Toàn Tuần)
            </h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
              Tổng cộng: <strong>{shifts.length}</strong> ca phân công chính thức
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Ngày khám</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Ca trực & Khung giờ</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Phòng khám phân công</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Nguồn phân công</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Định mức (BYT)</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Trạng thái ca</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700, textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((s, idx) => {
                  const isToday = s.shift_date === todayIso
                  const isHis = s.notes && s.notes.includes('HIS')

                  return (
                    <tr
                      key={s.id || idx}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isToday ? '#f0fdf4' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {s.shift_date}
                        {isToday && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', background: '#059669', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
                            Hôm nay
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <strong>{s.shift_type === 'morning' ? '☀️ Ca Sáng' : s.shift_type === 'afternoon' ? '🌤️ Ca Chiều' : '🌙 Ca Tối'}</strong>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          {s.start_time || '07:30'} - {s.end_time || '11:30'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a' }}>
                          <DoorOpen size={14} color="#059669" />
                          {s.room_name || 'Phòng khám Telemedicine #01'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Đường truyền WebRTC P2P tốc độ cao
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isHis ? '#e0f2fe' : '#fef3c7',
                          color: isHis ? '#0369a1' : '#b45309'
                        }}>
                          {isHis ? '🏥 HIS Bệnh viện' : '🛡️ Ban Quản trị'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <strong>{s.booked_count || (isToday ? myAppointments.length : 4)}</strong>/{s.max_patients} bệnh nhân
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: isToday ? '#dcfce7' : '#f1f5f9',
                          color: isToday ? '#15803d' : '#64748b'
                        }}>
                          {isToday ? '🟢 Đang trực' : 'Lên lịch'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isToday ? (
                          <button
                            type="button"
                            onClick={() => {
                              const a = myAppointments[0]
                              if (a) onOpenWorkspace(a)
                              else showToast('Đang mở buồng khám Telemed...')
                            }}
                            style={{
                              background: '#059669',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Vào buồng khám
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedShiftForModal(s)}
                            style={{
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              cursor: 'pointer'
                            }}
                          >
                            Xem chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT CA PHÂN CÔNG & PHÒNG KHÁM */}
      {selectedShiftForModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
              color: '#ffffff',
              padding: '18px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                  Chi Tiết Phân Công Ca Khám & Buồng Khám
                </h3>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>
                  Ngày: {selectedShiftForModal.shift_date} • {selectedShiftForModal.shift_type === 'morning' ? 'Ca Sáng' : 'Ca Chiều'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShiftForModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13.5px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Phòng khám được phân công:</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DoorOpen size={16} color="#059669" />
                  {selectedShiftForModal.room_name || 'Phòng khám Telemedicine #01'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>Khung giờ trực:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {selectedShiftForModal.start_time || '07:30'} - {selectedShiftForModal.end_time || '11:30'}
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#64748b', fontSize: '12px' }}>Định mức tối đa:</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {selectedShiftForModal.max_patients} bệnh nhân/ca
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Nguồn phân công & Ghi chú nhiệm vụ:</div>
                <div style={{ fontWeight: 700, color: '#047857', marginTop: '4px' }}>
                  {selectedShiftForModal.notes || 'Phân công từ Ban Quản trị Bệnh viện & Đồng bộ tự động qua API HIS'}
                </div>
              </div>

              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedShiftForModal(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#334155',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
                {selectedShiftForModal.shift_date === todayIso && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedShiftForModal(null)
                      const a = myAppointments[0]
                      if (a) onOpenWorkspace(a)
                    }}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#059669',
                      color: '#ffffff',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Stethoscope size={15} />
                    Mở Buồng Khám Ngay
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
