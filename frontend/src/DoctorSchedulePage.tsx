import React, { useState } from 'react'
import {
  CalendarDays, Clock, Video, User, CheckCircle2, AlertCircle,
  Plus, ChevronLeft, ChevronRight, Stethoscope, Building2,
  Calendar as CalendarIcon, ShieldCheck, X, RefreshCw
} from 'lucide-react'
import { Appointment, Department, DoctorShift, getDoctorShifts, createDoctorShift, deleteDoctorShift } from './api'
import { formatDateTimeVN, formatDateVN } from './dateFormatters'

interface DoctorSchedulePageProps {
  doctor: any
  appointments: Appointment[]
  departments: Department[]
  doctorShifts?: DoctorShift[]
  onOpenWorkspace: (appointment: Appointment) => void
  onNavigate: (view: string) => void
}

export const DoctorSchedulePage: React.FC<DoctorSchedulePageProps> = ({
  doctor,
  appointments,
  departments,
  onOpenWorkspace,
  onNavigate
}) => {
  const [viewMode, setViewMode] = useState<'week' | 'agenda'>('week')
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0)
  const [showAddSlotModal, setShowAddSlotModal] = useState(false)
  const [newShiftDate, setNewShiftDate] = useState('2026-11-09')
  const [newShiftType, setNewShiftType] = useState('morning')
  const [newShiftRoom, setNewShiftRoom] = useState('Phòng khám Telemedicine #07')
  const [newShiftMax, setNewShiftMax] = useState(12)
  const [savedShifts, setSavedShifts] = useState<{ id: string; date: string; shift: string; room: string; max: number }[]>([
    { id: '1', date: '2026-11-09', shift: 'morning', room: 'Phòng khám Telemedicine #07', max: 12 },
    { id: '2', date: '2026-11-09', shift: 'afternoon', room: 'Phòng khám Telemedicine #07', max: 10 },
    { id: '3', date: '2026-11-10', shift: 'morning', room: 'Phòng khám Telemedicine #07', max: 12 },
    { id: '4', date: '2026-11-11', shift: 'morning', room: 'Phòng khám Nội 308', max: 15 },
    { id: '5', date: '2026-11-12', shift: 'morning', room: 'Phòng khám Telemedicine #07', max: 12 },
    { id: '6', date: '2026-11-13', shift: 'afternoon', room: 'Phòng khám Telemedicine #07', max: 12 }
  ])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Week days starting Monday 2026-11-09
  const weekDays = [
    { name: 'Thứ Hai', dateStr: '09/11/2026', iso: '2026-11-09', isToday: true },
    { name: 'Thứ Ba', dateStr: '10/11/2026', iso: '2026-11-10', isToday: false },
    { name: 'Thứ Tư', dateStr: '11/11/2026', iso: '2026-11-11', isToday: false },
    { name: 'Thứ Năm', dateStr: '12/11/2026', iso: '2026-11-12', isToday: false },
    { name: 'Thứ Sáu', dateStr: '13/11/2026', iso: '2026-11-13', isToday: false },
    { name: 'Thứ Bảy', dateStr: '14/11/2026', iso: '2026-11-14', isToday: false },
    { name: 'Chủ Nhật', dateStr: '15/11/2026', iso: '2026-11-15', isToday: false }
  ]

  // Filter doctor's appointments
  const myAppointments = appointments.filter(a => a.doctor_id === doctor.id || doctor.role === 'doctor')

  React.useEffect(() => {
    let isMounted = true
    if (doctor?.id) {
      getDoctorShifts(doctor.id)
        .then(shifts => {
          if (!isMounted || !shifts) return
          if (shifts.length > 0) {
            setSavedShifts(shifts.map(s => ({
              id: s.id.toString(),
              date: s.shift_date,
              shift: s.shift_type,
              room: s.room_name || 'Phòng khám Telemedicine #07',
              max: s.max_patients
            })))
          }
        })
        .catch(err => console.warn('Tải ca trực từ database:', err))
    }
    return () => { isMounted = false }
  }, [doctor?.id])

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await createDoctorShift(doctor.id, {
        shift_date: newShiftDate,
        shift_type: newShiftType,
        room_name: newShiftRoom,
        max_patients: newShiftMax
      })
      setSavedShifts(prev => [
        ...prev,
        {
          id: created.id.toString(),
          date: created.shift_date,
          shift: created.shift_type,
          room: created.room_name || newShiftRoom,
          max: created.max_patients
        }
      ])
      setShowAddSlotModal(false)
      showToast('🎉 Đã đăng ký ca trực và lưu vào Database thành công!')
    } catch (err) {
      console.error('Lỗi đăng ký ca trực:', err)
      showToast('Lỗi đăng ký: ' + (err instanceof Error ? err.message : 'Không xác định'))
    }
  }

  return (
    <div className="doctor-schedule-container" style={{ padding: '4px 0 24px' }}>
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600
        }}>
          <CheckCircle2 size={18} />
          {toastMessage}
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)',
        borderRadius: '14px',
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 8px 24px rgba(6, 78, 59, 0.16)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            <CalendarDays size={14} />
            Lịch Công Tác & Ca Trực Lâm Sàng
          </div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Lịch khám & Điều phối Ca trực</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '13.5px' }}>
            Bác sĩ phụ trách: <strong>{doctor.full_name}</strong> • CCHN: <strong>{doctor.doctor_cchn || '008912/BYT-CCHN'}</strong> • Khoa Nội Tổng Quát
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setShowAddSlotModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#10b981',
              color: '#ffffff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={16} />
            Đăng ký Ca trực / Mở Slot
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Ca trực hôm nay</span>
            <Clock size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '8px' }}>
            07:30 - 11:30 & 13:30 - 17:00
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            Phòng khám Telemedicine #07
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Tổng ca hẹn trong tuần</span>
            <CalendarDays size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            {myAppointments.length} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>bệnh nhân</span>
          </div>
          <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px' }}>
            5 ca hôm nay • 1 ca khẩn cấp
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Đã hoàn tất khám</span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
            {myAppointments.filter(a => a.status === 'completed').length} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>hồ sơ</span>
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
            Đã ký số SmartCA & liên thông EMR
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Định mức slot / ca</span>
            <ShieldCheck size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
            12 <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>ca tối đa/buổi</span>
          </div>
          <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
            Chống quá tải Bác sĩ theo QĐ BYT
          </div>
        </div>
      </div>

      {/* View Switcher & Date Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px 18px',
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
            style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
            Tuần: 09/11/2026 - 15/11/2026
          </div>
          <button
            type="button"
            onClick={() => setSelectedDayOffset(prev => prev + 7)}
            style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Tuần sau"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDayOffset(0)}
            style={{ border: '1px solid #059669', background: '#ecfdf5', color: '#059669', borderRadius: '6px', padding: '5px 12px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer' }}
          >
            Hôm nay
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            style={{
              border: 'none',
              background: viewMode === 'week' ? '#ffffff' : 'transparent',
              color: viewMode === 'week' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '13px',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Lịch theo tuần
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            style={{
              border: 'none',
              background: viewMode === 'agenda' ? '#ffffff' : 'transparent',
              color: viewMode === 'agenda' ? '#0f172a' : '#64748b',
              fontWeight: 700,
              fontSize: '13px',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: viewMode === 'agenda' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Danh sách chi tiết
          </button>
        </div>
      </div>

      {/* Week Calendar Grid */}
      {viewMode === 'week' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          alignItems: 'stretch'
        }}>
          {weekDays.map((day, idx) => {
            const shiftInfo = savedShifts.find(s => s.date === day.iso)
            const dayAppts = myAppointments.filter(a => {
              if (day.isToday) return true // Show today's appointments in today's column
              return false
            })

            return (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: day.isToday ? '2px solid #059669' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  minHeight: '380px',
                  boxShadow: day.isToday ? '0 4px 12px rgba(5, 150, 105, 0.1)' : 'none'
                }}
              >
                {/* Column Day Header */}
                <div style={{
                  padding: '12px 14px',
                  background: day.isToday ? '#059669' : '#f8fafc',
                  color: day.isToday ? '#ffffff' : '#1e293b',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px' }}>{day.name}</span>
                    {day.isToday && (
                      <span style={{ background: '#ffffff', color: '#059669', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px' }}>
                        HÔM NAY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', opacity: day.isToday ? 0.9 : 0.7, marginTop: '2px' }}>
                    {day.dateStr}
                  </div>
                  {shiftInfo && (
                    <div style={{ marginTop: '6px', fontSize: '11px', background: day.isToday ? 'rgba(255,255,255,0.2)' : '#e0f2fe', color: day.isToday ? '#ffffff' : '#0369a1', padding: '3px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      {shiftInfo.shift === 'morning' ? '☀️ Ca Sáng (07:30 - 11:30)' : '🌤️ Ca Chiều (13:30 - 17:00)'}
                    </div>
                  )}
                </div>

                {/* Slots content */}
                <div style={{ padding: '10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {day.isToday ? (
                    dayAppts.length > 0 ? (
                      dayAppts.map((a, aIdx) => (
                        <div
                          key={a.id || aIdx}
                          onClick={() => onOpenWorkspace(a)}
                          style={{
                            background: a.status === 'in_progress' ? '#eff6ff' : a.status === 'waiting' ? '#fffbeb' : '#f8fafc',
                            border: `1px solid ${a.status === 'in_progress' ? '#bfdbfe' : a.status === 'waiting' ? '#fde68a' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            padding: '10px',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>
                              {a.starts_at ? new Date(a.starts_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '08:30'}
                            </span>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: a.status === 'in_progress' ? '#dbeafe' : a.status === 'waiting' ? '#fef3c7' : '#dcfce7',
                              color: a.status === 'in_progress' ? '#1d4ed8' : a.status === 'waiting' ? '#b45309' : '#15803d'
                            }}>
                              {a.status === 'in_progress' ? 'Đang khám' : a.status === 'waiting' ? 'Phòng chờ' : 'Đã khám'}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(a as any).patient_name || `Bệnh nhân #${a.patient_id}`}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.reason || 'Khám bệnh từ xa'}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenWorkspace(a)
                            }}
                            style={{
                              marginTop: '8px',
                              width: '100%',
                              padding: '5px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: '#059669',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px'
                            }}
                          >
                            <Stethoscope size={13} /> Vào khám
                          </button>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '24px 0' }}>
                        Chưa có lịch hẹn
                      </div>
                    )
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '8px', fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>
                        <span>08:00 - 11:30 (Mở 8 slots)</span>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '8px', fontSize: '11.5px', color: '#64748b', textAlign: 'center' }}>
                        <span>13:30 - 16:30 (Mở 6 slots)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Agenda Mode */}
      {viewMode === 'agenda' && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
            Danh sách Lịch khám Hôm nay & Ca sắp tới
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myAppointments.map((a, idx) => (
              <div
                key={a.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                        {(a as any).patient_name || `Bệnh nhân #${a.patient_id}`}
                      </span>
                      <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        Mã BN: {a.patient_id}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                      Lý do: <strong>{a.reason || 'Khám chuyên khoa'}</strong> • Giờ hẹn: <strong>{a.starts_at ? formatDateTimeVN(a.starts_at) : '08:30'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => onOpenWorkspace(a)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#059669',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <Video size={15} />
                    Mở phòng khám Telemedicine
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Đăng ký Ca trực */}
      {showAddSlotModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="#059669" />
                Đăng ký Ca trực & Mở Slot khám mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveShift} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Ngày trực lâm sàng:
                </label>
                <input
                  type="date"
                  value={newShiftDate}
                  onChange={e => setNewShiftDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Khung ca trực:
                </label>
                <select
                  value={newShiftType}
                  onChange={e => setNewShiftType(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                >
                  <option value="morning">☀️ Ca Sáng: 07:30 - 11:30</option>
                  <option value="afternoon">🌤️ Ca Chiều: 13:30 - 17:00</option>
                  <option value="evening">🌙 Ca Ngoài Giờ: 17:30 - 20:30</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phòng khám phụ trách:
                </label>
                <input
                  type="text"
                  value={newShiftRoom}
                  onChange={e => setNewShiftRoom(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Giới hạn số ca khám tối đa (Chống quá tải):
                </label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={newShiftMax}
                  onChange={e => setNewShiftMax(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#059669', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Xác nhận lưu ca trực
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
