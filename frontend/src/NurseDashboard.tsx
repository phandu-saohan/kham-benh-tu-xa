import React, { useState, useEffect } from 'react'
import {
  Activity,
  Heart,
  Thermometer,
  Wind,
  Weight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  User,
  ShieldCheck,
  Stethoscope,
  RefreshCw,
  Search,
  Flame,
  AlertOctagon,
  Building2,
  CalendarDays,
  ChevronRight,
  Sparkles,
  Phone
} from 'lucide-react'
import { TriageItem, TriageAssessmentData, getTriageQueue, assessTriage } from './api'
import { Pagination } from './Pagination'

interface NurseDashboardProps {
  nurse: any
  onSelectPatientForDoctor?: (appointmentId: number) => void
  onNavigate?: (view: string) => void
}

export const NurseDashboard: React.FC<NurseDashboardProps> = ({
  nurse,
  onSelectPatientForDoctor,
  onNavigate
}) => {
  const [queue, setQueue] = useState<TriageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'dispatched' | 'urgent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [triagePage, setTriagePage] = useState(1)
  const [triagePageSize, setTriagePageSize] = useState(6)
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  // Vital signs form states
  const [pulse, setPulse] = useState<number | ''>('')
  const [bloodPressure, setBloodPressure] = useState('')
  const [temperature, setTemperature] = useState<number | ''>('')
  const [spo2, setSpo2] = useState<number | ''>('')
  const [weight, setWeight] = useState<number | ''>('')
  const [height, setHeight] = useState<number | ''>('')
  const [triageLevel, setTriageLevel] = useState<'normal' | 'priority' | 'emergency'>('normal')
  const [triageNotes, setTriageNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // BHYT Quick verification
  const [bhytQuery, setBhytQuery] = useState('')
  const [bhytResult, setBhytResult] = useState<any>(null)

  const loadQueue = async () => {
    setLoading(true)
    try {
      const data = await getTriageQueue()
      setQueue(data)
    } catch (e) {
      console.error('Không tải được hàng đợi sàng lọc:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQueue()
    const timer = setInterval(loadQueue, 15000)
    return () => clearInterval(timer)
  }, [])

  // Auto-alert conditions
  const isHighTemp = typeof temperature === 'number' && temperature >= 38.5
  const isLowSpo2 = typeof spo2 === 'number' && spo2 < 95
  const isHighPulse = typeof pulse === 'number' && (pulse > 100 || pulse < 50)

  useEffect(() => {
    if (isLowSpo2 || (typeof temperature === 'number' && temperature >= 39.5)) {
      setTriageLevel('emergency')
    } else if (isHighTemp || isHighPulse) {
      setTriageLevel('priority')
    }
  }, [temperature, spo2, pulse, isLowSpo2, isHighTemp, isHighPulse])

  const pendingCount = queue.filter(q => q.triage_status === 'pending').length
  const dispatchedCount = queue.filter(q => q.triage_status === 'dispatched').length
  const urgentCount = queue.filter(q => q.triage_level === 'emergency' || q.triage_level === 'priority').length

  const handleSelectItem = (item: TriageItem) => {
    setSelectedItem(item)
    setPulse(item.pulse || '')
    setBloodPressure(item.blood_pressure || '')
    setTemperature(item.temperature || '')
    setSpo2(item.spo2 || '')
    setWeight(item.weight || '')
    setHeight(item.height || '')
    setTriageLevel(item.triage_level || 'normal')
    setTriageNotes(item.triage_notes || '')
  }

  const handleSubmitTriage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return

    setIsSubmitting(true)
    try {
      const assessment: TriageAssessmentData = {
        pulse: pulse === '' ? undefined : Number(pulse),
        blood_pressure: bloodPressure || undefined,
        temperature: temperature === '' ? undefined : Number(temperature),
        spo2: spo2 === '' ? undefined : Number(spo2),
        weight: weight === '' ? undefined : Number(weight),
        height: height === '' ? undefined : Number(height),
        triage_level: triageLevel,
        triage_notes: triageNotes
      }

      await assessTriage(selectedItem.appointment_id, assessment)
      setToastMessage(`✓ Đã hoàn tất sàng lọc cho bệnh nhân ${selectedItem.patient_name} và chuyển vào buồng khám!`)
      setTimeout(() => setToastMessage(''), 4000)

      setSelectedItem(null)
      loadQueue()

      if (onSelectPatientForDoctor) {
        onSelectPatientForDoctor(selectedItem.appointment_id)
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu kết quả sàng lọc')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate BMI
  const calcBMI = () => {
    if (typeof weight === 'number' && typeof height === 'number' && height > 0) {
      const hM = height / 100
      const bmi = weight / (hM * hM)
      return bmi.toFixed(1)
    }
    return null
  }
  const bmiVal = calcBMI()

  return (
    <div className="nurse-dashboard-container">
      {/* 1. Nurse Command Header */}
      <section className="nurse-hero-banner">
        <div className="nurse-hero-content">
          <div className="nurse-badge-row">
            <span className="nurse-status-pill online">
              <span className="live-dot" /> BÀN TIẾP ĐÓN ĐANG MỞ
            </span>
            <span className="nurse-role-pill">
              <Stethoscope size={13} /> Điều dưỡng trưởng tiếp đón & phân tầng Triage
            </span>
            <span className="nurse-dept-pill">
              <Building2 size={13} /> Bệnh viện CareConnect
            </span>
          </div>
          <h1>{nurse.full_name || 'Điều dưỡng tiếp đón'}</h1>
          <p className="nurse-hero-sub">
            Sàng lọc chỉ số sinh hiệu (Vitals), đối soát thẻ BHYT trực tuyến và phân luồng bệnh nhân vào phòng khám Bác sĩ chuyên khoa.
          </p>

          <div className="nurse-hero-actions">
            <button className="btn-nurse-refresh" onClick={loadQueue}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới hàng đợi
            </button>
            {onNavigate && (
              <>
                <button className="btn-nurse-outline" onClick={() => onNavigate('appointments')}>
                  <CalendarDays size={14} /> Xem tất cả lịch khám
                </button>
                <button className="btn-nurse-outline" onClick={() => onNavigate('insurance')}>
                  <ShieldCheck size={14} /> Tra cứu BHYT XML 4210
                </button>
              </>
            )}
          </div>
        </div>

        <div className="nurse-triage-summary-card">
          <div className="summary-title">Tiếp nhận ca trực</div>
          <div className="summary-stats-row">
            <div className="summary-stat-cell">
              <strong>{pendingCount}</strong>
              <small>Chờ đo sinh hiệu</small>
            </div>
            <div className="summary-stat-cell">
              <strong>{dispatchedCount}</strong>
              <small>Đã vào buồng BS</small>
            </div>
            <div className="summary-stat-cell urgent">
              <strong>{urgentCount}</strong>
              <small>Ca ưu tiên / Cấp cứu</small>
            </div>
          </div>
        </div>
      </section>

      {toastMessage && (
        <div className="alert success animate-fade-in">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Main Two-Column Triage Desk Workspace */}
      <div className="nurse-workspace-grid">
        {/* Left Column: Triage Patient Queue */}
        <section className="panel queue-left-panel">
          <div className="panel-heading">
            <div>
              <h3>Danh Sách Bệnh Nhân Chờ Sàng Lọc</h3>
              <p>Chọn bệnh nhân để đo sinh hiệu và điều phối phòng khám</p>
            </div>
            <div className="nurse-filter-tabs">
              <button
                className={`nurse-tab-chip ${filterStatus === 'all' ? 'active' : ''}`}
                onClick={() => setFilterStatus('all')}
              >
                Tất cả ({queue.length})
              </button>
              <button
                className={`nurse-tab-chip ${filterStatus === 'pending' ? 'active' : ''}`}
                onClick={() => setFilterStatus('pending')}
              >
                Chờ đo ({pendingCount})
              </button>
              <button
                className={`nurse-tab-chip ${filterStatus === 'urgent' ? 'active' : ''}`}
                onClick={() => setFilterStatus('urgent')}
              >
                Khẩn cấp ({urgentCount})
              </button>
            </div>
          </div>

          <div className="queue-search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder="Tìm theo tên bệnh nhân, triệu chứng..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {queue.length === 0 ? (
            <div className="empty-queue-box">
              <CheckCircle2 size={40} color="#059669" />
              <b>Hiện không có bệnh nhân chờ tại bàn tiếp đón</b>
              <p>Hàng đợi sẽ tự động cập nhật khi có lịch hẹn mới.</p>
            </div>
          ) : (
            <div className="triage-cards-list">
              {queue
                .filter(item => {
                  if (filterStatus === 'pending') return item.triage_status === 'pending'
                  if (filterStatus === 'dispatched') return item.triage_status === 'dispatched'
                  if (filterStatus === 'urgent') return item.triage_level === 'emergency' || item.triage_level === 'priority'
                  return true
                })
                .filter(item =>
                  searchQuery === '' ||
                  item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.reason && item.reason.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map(item => {
                  const isSelected = selectedItem?.appointment_id === item.appointment_id
                  return (
                    <div
                      key={item.appointment_id}
                      className={`triage-patient-card ${isSelected ? 'selected' : ''} ${item.triage_level || 'normal'}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="card-top-row">
                        <div className="patient-identity">
                          <b>{item.patient_name}</b>
                          <span className="patient-meta-text">
                            {(item as any).gender === 'female' ? 'Nữ' : 'Nam'} • {(item as any).age || 35} tuổi
                          </span>
                        </div>
                        <span className={`triage-badge-chip ${item.triage_level || 'normal'}`}>
                          {item.triage_level === 'emergency' && '🚨 Cấp cứu'}
                          {item.triage_level === 'priority' && '⚠️ Ưu tiên'}
                          {(!item.triage_level || item.triage_level === 'normal') && '✓ Tiêu chuẩn'}
                        </span>
                      </div>

                      <div className="card-reason-line">
                        <span>Lý do khám:</span> {item.reason || 'Khám sức khỏe tổng quát'}
                      </div>

                      <div className="card-bottom-row">
                        <span className="card-dept-tag">
                          <Building2 size={12} /> {item.department_name || (item as any).department || 'Khoa Nội'}
                        </span>
                        <span className={`card-status-indicator ${item.triage_status}`}>
                          {item.triage_status === 'pending' ? '⏳ Chờ đo sinh hiệu' : '✓ Đã vào buồng BS'}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </section>

        {/* Right Column: Vitals Intake & Assessment Form */}
        <section className="panel intake-right-panel">
          <div className="panel-heading">
            <div>
              <h3>Phiếu Đo Sinh Hiệu & Phân Tầng Triage</h3>
              <p>Nhập thông tin đo tại bàn tiếp đón hoặc đồng bộ từ máy đo BLE</p>
            </div>
            {selectedItem && (
              <span className="intake-patient-id-badge">
                BN #{selectedItem.appointment_id}: {selectedItem.patient_name}
              </span>
            )}
          </div>

          {!selectedItem ? (
            <div className="no-selection-box">
              <Activity size={48} color="#94a3b8" />
              <b>Vui lòng chọn một bệnh nhân từ danh sách bên trái</b>
              <p>Màn hình đo sinh hiệu và phân tầng cấp cứu sẽ hiển thị tại đây.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitTriage} className="vitals-intake-form">
              <div className="vitals-inputs-grid">
                {/* Huyết áp */}
                <div className="form-field-wrap">
                  <label>
                    <Heart size={14} color="#dc2626" /> Huyết áp (HATT/HATTr)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 120/80"
                    value={bloodPressure}
                    onChange={e => setBloodPressure(e.target.value)}
                    required
                  />
                  <small>Đơn vị: mmHg</small>
                </div>

                {/* Nhịp tim / Mạch */}
                <div className={`form-field-wrap ${isHighPulse ? 'warning-glow' : ''}`}>
                  <label>
                    <Activity size={14} color="#0f766e" /> Nhịp mạch (Pulse)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 75"
                    value={pulse}
                    onChange={e => setPulse(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                  <small>Nhịp/phút (60 - 100)</small>
                </div>

                {/* Nhiệt độ */}
                <div className={`form-field-wrap ${isHighTemp ? 'warning-glow' : ''}`}>
                  <label>
                    <Thermometer size={14} color="#ea580c" /> Nhiệt độ cơ thể
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="VD: 36.5"
                    value={temperature}
                    onChange={e => setTemperature(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                  <small>Độ C (°C)</small>
                </div>

                {/* SpO2 */}
                <div className={`form-field-wrap ${isLowSpo2 ? 'danger-glow' : ''}`}>
                  <label>
                    <Wind size={14} color="#2563eb" /> Nồng độ Oxy (SpO2)
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 98"
                    value={spo2}
                    onChange={e => setSpo2(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                  <small>Tỷ lệ % ({'>='} 95%)</small>
                </div>

                {/* Cân nặng */}
                <div className="form-field-wrap">
                  <label>
                    <Weight size={14} /> Cân nặng (kg)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="VD: 65"
                    value={weight}
                    onChange={e => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>

                {/* Chiều cao */}
                <div className="form-field-wrap">
                  <label>Chiều cao (cm)</label>
                  <input
                    type="number"
                    placeholder="VD: 170"
                    value={height}
                    onChange={e => setHeight(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                  {bmiVal && (
                    <small style={{ color: '#0f766e', fontWeight: 700 }}>
                      BMI: {bmiVal} ({Number(bmiVal) < 18.5 ? 'Gầy' : Number(bmiVal) <= 24.9 ? 'Bình thường' : 'Thừa cân'})
                    </small>
                  )}
                </div>
              </div>

              {/* Triage Level Selection */}
              <div className="triage-level-select-wrap">
                <label className="section-label">Phân tầng mức độ ưu tiên (Manchester Triage)</label>
                <div className="triage-levels-options">
                  <label className={`triage-radio-card normal ${triageLevel === 'normal' ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="triageLevel"
                      value="normal"
                      checked={triageLevel === 'normal'}
                      onChange={() => setTriageLevel('normal')}
                    />
                    <div>
                      <b>Xanh: Tiêu chuẩn</b>
                      <small>Sinh hiệu ổn định, chờ khám theo thứ tự</small>
                    </div>
                  </label>

                  <label className={`triage-radio-card priority ${triageLevel === 'priority' ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="triageLevel"
                      value="priority"
                      checked={triageLevel === 'priority'}
                      onChange={() => setTriageLevel('priority')}
                    />
                    <div>
                      <b>Vàng: Ưu tiên</b>
                      <small>Sốt cao, mạch nhanh hoặc có dấu hiệu bất thường</small>
                    </div>
                  </label>

                  <label className={`triage-radio-card emergency ${triageLevel === 'emergency' ? 'checked' : ''}`}>
                    <input
                      type="radio"
                      name="triageLevel"
                      value="emergency"
                      checked={triageLevel === 'emergency'}
                      onChange={() => setTriageLevel('emergency')}
                    />
                    <div>
                      <b>Đỏ: Khẩn cấp / Cấp cứu</b>
                      <small>SpO2 {'<'} 95%, khó thở hoặc đau ngực dữ dội</small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Triage Notes */}
              <div className="form-field-wrap full-width">
                <label>Ghi chú điều dưỡng & Triệu chứng ghi nhận</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về tri giác, tiếp xúc, tiền sử dị ứng hoặc yêu cầu đặc biệt..."
                  value={triageNotes}
                  onChange={e => setTriageNotes(e.target.value)}
                />
              </div>

              <div className="form-submit-row">
                <button
                  type="submit"
                  className="btn-submit-triage"
                  disabled={isSubmitting}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Đang chuyển hồ sơ...' : 'Lưu Sinh Hiệu & Chuyển Bác Sĩ'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
