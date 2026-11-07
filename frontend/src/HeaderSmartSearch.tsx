import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  X,
  Stethoscope,
  Calendar,
  Pill,
  ArrowRight,
  User,
  ShieldCheck,
  Activity,
  CreditCard,
  FileText,
  Clock,
  Sparkles,
  Cpu
} from 'lucide-react'
import { Appointment, Department } from './api'
import { VIETNAM_DRUG_CATALOG, DrugInfo } from './medicationData'

interface HeaderSmartSearchProps {
  userRole: string
  appointments: Appointment[]
  doctors: { id: number; full_name: string; cchn?: string; department_id?: number }[]
  departments: Department[]
  onNavigate: (view: string) => void
  onOpenBooking?: () => void
  onSelectAppointment?: (appt: Appointment) => void
}

export const HeaderSmartSearch: React.FC<HeaderSmartSearchProps> = ({
  userRole,
  appointments,
  doctors,
  departments,
  onNavigate,
  onOpenBooking,
  onSelectAppointment
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Global hotkey Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      } else if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Quick navigation system actions
  const quickActions = [
    { id: 'booking', title: 'Đặt lịch khám trực tuyến', category: 'Thao tác nhanh', icon: Calendar, action: () => onOpenBooking ? onOpenBooking() : onNavigate('appointments') },
    { id: 'appointments', title: 'Lịch hẹn & Hàng đợi khám bệnh', category: 'Điều hướng', icon: Clock, action: () => onNavigate('appointments') },
    { id: 'insurance', title: 'Cổng Giám định BHYT & XML 4210', category: 'Bảo hiểm', icon: ShieldCheck, action: () => onNavigate('insurance') },
    { id: 'devices', title: 'Thiết bị Sinh hiệu IoT (Huyết áp, SpO2)', category: 'Thiết bị', icon: Cpu, action: () => onNavigate('devices') },
    { id: 'records', title: 'Hồ sơ Bệnh án Điện tử EMR', category: 'Bệnh án', icon: FileText, action: () => onNavigate('records') },
    { id: 'payments', title: 'Thanh toán Viện phí VietQR', category: 'Tài chính', icon: CreditCard, action: () => onNavigate('payments') },
    { id: 'profile', title: 'Hồ sơ cá nhân', category: 'Hồ sơ', icon: User, action: () => onNavigate('profile') }
  ]

  const trimmed = query.trim().toLowerCase()

  // 1. Filtered Actions
  const matchedActions = trimmed
    ? quickActions.filter(a => a.title.toLowerCase().includes(trimmed) || a.category.toLowerCase().includes(trimmed))
    : quickActions.slice(0, 3)

  // 2. Filtered Doctors
  const matchedDoctors = trimmed
    ? doctors.filter(d => {
        const deptName = departments.find(dept => dept.id === d.department_id)?.name || ''
        return d.full_name.toLowerCase().includes(trimmed) ||
               (d.cchn && d.cchn.toLowerCase().includes(trimmed)) ||
               deptName.toLowerCase().includes(trimmed)
      }).slice(0, 4)
    : []

  // 3. Filtered Appointments / Patients
  const matchedAppointments = trimmed
    ? appointments.filter(a => {
        const idMatch = a.id.toString().includes(trimmed)
        const reasonMatch = a.reason ? a.reason.toLowerCase().includes(trimmed) : false
        const patName = (a as any).patient_name ? (a as any).patient_name.toLowerCase() : ''
        const pidMatch = (a.patient_id || '').toString().includes(trimmed)
        return idMatch || reasonMatch || patName.includes(trimmed) || pidMatch
      }).slice(0, 4)
    : []

  // 4. Filtered Medications (Vietnam Drug Catalog)
  const matchedDrugs: DrugInfo[] = trimmed
    ? VIETNAM_DRUG_CATALOG.filter(d =>
        d.name.toLowerCase().includes(trimmed) ||
        d.activeIngredient.toLowerCase().includes(trimmed) ||
        d.category.toLowerCase().includes(trimmed)
      ).slice(0, 4)
    : []

  const totalResults = matchedActions.length + matchedDoctors.length + matchedAppointments.length + matchedDrugs.length

  const handleSelectAction = (actionFn: () => void) => {
    actionFn()
    setIsOpen(false)
    setQuery('')
  }

  const handleSelectDoctor = (doc: any) => {
    if (onOpenBooking) {
      onOpenBooking()
    } else {
      onNavigate('appointments')
    }
    setIsOpen(false)
    setQuery('')
  }

  const handleSelectAppt = (appt: Appointment) => {
    if (onSelectAppointment) {
      onSelectAppointment(appt)
    } else {
      onNavigate('appointments')
    }
    setIsOpen(false)
    setQuery('')
  }

  const getPlaceholder = () => {
    if (userRole === 'doctor') return 'Tìm bệnh nhân, mã PID, lịch khám, thuốc, ICD-10... (Ctrl + K)'
    if (userRole === 'nurse') return 'Tìm bệnh nhân, sinh hiệu, sàng lọc triage... (Ctrl + K)'
    return 'Tìm bác sĩ, chuyên khoa, lịch hẹn, hồ sơ, thuốc... (Ctrl + K)'
  }

  return (
    <div className="header-smart-search" ref={containerRef}>
      <div className={`smart-search-bar ${isOpen ? 'focused' : ''}`}>
        <Search size={16} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder={getPlaceholder()}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
        />
        {query ? (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            title="Xóa tìm kiếm"
          >
            <X size={14} />
          </button>
        ) : (
          <span className="search-shortcut-badge">Ctrl K</span>
        )}
      </div>

      {/* Smart Search Dropdown Result Popover */}
      {isOpen && (
        <div className="smart-search-dropdown">
          {trimmed && totalResults === 0 ? (
            <div className="search-empty-state">
              <Search size={24} color="#94a3b8" />
              <p>Không tìm thấy kết quả phù hợp với "<strong>{query}</strong>"</p>
              <small>Thử tìm tên bác sĩ, chuyên khoa, mã lịch hẹn hoặc triệu chứng.</small>
            </div>
          ) : (
            <div className="search-results-list">
              {/* SECTION: THAO TÁC & ĐIỀU HƯỚNG */}
              {matchedActions.length > 0 && (
                <div className="search-group">
                  <div className="search-group-header">
                    <span>⚡ {trimmed ? 'Chức năng phù hợp' : 'Gợi ý thao tác nhanh'}</span>
                    <span className="search-group-count">{matchedActions.length}</span>
                  </div>
                  {matchedActions.map(action => {
                    const Icon = action.icon
                    return (
                      <div
                        key={action.id}
                        className="search-item"
                        onClick={() => handleSelectAction(action.action)}
                      >
                        <div className="search-item-left">
                          <div className="search-item-icon-box action">
                            <Icon size={14} />
                          </div>
                          <div>
                            <span className="search-item-title">{action.title}</span>
                            <span className="search-item-sub">{action.category}</span>
                          </div>
                        </div>
                        <ArrowRight size={14} className="search-item-arrow" />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* SECTION: BÁC SĨ & CHUYÊN KHOA */}
              {matchedDoctors.length > 0 && (
                <div className="search-group">
                  <div className="search-group-header">
                    <span>👨‍⚕️ Bác sĩ & Chuyên khoa</span>
                    <span className="search-group-count">{matchedDoctors.length}</span>
                  </div>
                  {matchedDoctors.map(doc => {
                    const dept = departments.find(d => d.id === doc.department_id)?.name || 'Chuyên khoa'
                    return (
                      <div
                        key={doc.id}
                        className="search-item"
                        onClick={() => handleSelectDoctor(doc)}
                      >
                        <div className="search-item-left">
                          <div className="search-item-icon-box doctor">
                            <Stethoscope size={14} />
                          </div>
                          <div>
                            <span className="search-item-title">{doc.full_name}</span>
                            <span className="search-item-sub">
                              {dept} • CCHN: {doc.cchn || '008912/BYT'}
                            </span>
                          </div>
                        </div>
                        <span className="search-action-chip">Đặt khám</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* SECTION: LỊCH HẸN & BỆNH NHÂN */}
              {matchedAppointments.length > 0 && (
                <div className="search-group">
                  <div className="search-group-header">
                    <span>📅 Lịch hẹn & Hồ sơ ca khám</span>
                    <span className="search-group-count">{matchedAppointments.length}</span>
                  </div>
                  {matchedAppointments.map(appt => {
                    const patientName = (appt as any).patient_name || `Bệnh nhân #${appt.patient_id || appt.id}`
                    return (
                      <div
                        key={appt.id}
                        className="search-item"
                        onClick={() => handleSelectAppt(appt)}
                      >
                        <div className="search-item-left">
                          <div className="search-item-icon-box appointment">
                            <Calendar size={14} />
                          </div>
                          <div>
                            <span className="search-item-title">
                              {patientName} <small style={{ color: '#0e7490', fontWeight: 700 }}>(Mã #{appt.id})</small>
                            </span>
                            <span className="search-item-sub">
                              {appt.reason || 'Khám sức khỏe tổng quát'} • {appt.starts_at ? new Date(appt.starts_at).toLocaleDateString('vi-VN') : 'Hôm nay'}
                            </span>
                          </div>
                        </div>
                        <span className={`search-status-tag ${appt.status}`}>
                          {appt.status === 'in_progress' ? 'Đang khám' : appt.status === 'completed' ? 'Hoàn tất' : 'Chờ khám'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* SECTION: THUỐC & DƯỢC PHẨM */}
              {matchedDrugs.length > 0 && (
                <div className="search-group">
                  <div className="search-group-header">
                    <span>💊 Tra cứu Dược phẩm & Hoạt chất</span>
                    <span className="search-group-count">{matchedDrugs.length}</span>
                  </div>
                  {matchedDrugs.map(drug => (
                    <div
                      key={drug.id}
                      className="search-item"
                      onClick={() => {
                        onNavigate('prescriptions')
                        setIsOpen(false)
                        setQuery('')
                      }}
                    >
                      <div className="search-item-left">
                        <div className="search-item-icon-box drug">
                          <Pill size={14} />
                        </div>
                        <div>
                          <span className="search-item-title">{drug.name} ({drug.strength})</span>
                          <span className="search-item-sub">
                            Hoạt chất: {drug.activeIngredient} • {drug.category}
                          </span>
                        </div>
                      </div>
                      <span className="search-dosage-chip">{drug.dosageForm}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
