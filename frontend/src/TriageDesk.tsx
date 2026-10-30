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
  Filter,
  Flame,
  AlertOctagon
} from 'lucide-react'
import {
  TriageItem,
  TriageAssessmentData,
  getTriageQueue,
  assessTriage
} from './api'

interface TriageDeskProps {
  onSelectPatientForDoctor?: (appointmentId: number) => void
}

export const TriageDesk: React.FC<TriageDeskProps> = ({ onSelectPatientForDoctor }) => {
  const [queue, setQueue] = useState<TriageItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'dispatched' | 'urgent'>('all')
  const [searchQuery, setSearchQuery] = useState('')
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

  // Suggest urgency automatically based on vitals
  useEffect(() => {
    if (isLowSpo2 || (typeof temperature === 'number' && temperature >= 39.5)) {
      setTriageLevel('emergency')
    } else if (isHighTemp || isHighPulse) {
      setTriageLevel('priority')
    }
  }, [temperature, spo2, pulse])

  const openAssessment = (item: TriageItem) => {
    setSelectedItem(item)
    setPulse(item.pulse || '')
    setBloodPressure(item.blood_pressure || '120/80')
    setTemperature(item.temperature || 36.8)
    setSpo2(item.spo2 || 98)
    setWeight(item.weight || 60)
    setHeight(item.height || 165)
    setTriageLevel(item.triage_level || 'normal')
    setTriageNotes(item.triage_notes || '')
  }

  const handleSaveTriage = async (dispatchNow: boolean) => {
    if (!selectedItem) return
    setIsSubmitting(true)
    try {
      const payload: TriageAssessmentData = {
        pulse: pulse !== '' ? Number(pulse) : undefined,
        blood_pressure: bloodPressure || undefined,
        temperature: temperature !== '' ? Number(temperature) : undefined,
        spo2: spo2 !== '' ? Number(spo2) : undefined,
        weight: weight !== '' ? Number(weight) : undefined,
        height: height !== '' ? Number(height) : undefined,
        triage_level: triageLevel,
        triage_notes: triageNotes || undefined,
        dispatch_to_doctor: dispatchNow
      }

      await assessTriage(selectedItem.appointment_id, payload)
      setToastMessage(
        dispatchNow
          ? `⚡ Đã điều phối bệnh nhân ${selectedItem.patient_name} vào buồng khám của ${selectedItem.doctor_name}!`
          : `✅ Đã lưu chỉ số sinh hiệu cho bệnh nhân ${selectedItem.patient_name}.`
      )
      setTimeout(() => setToastMessage(''), 4000)
      setSelectedItem(null)
      loadQueue()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi khi lưu sàng lọc')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered queue items
  const filteredQueue = queue.filter(item => {
    const matchesSearch =
      item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.patient_phone && item.patient_phone.includes(searchQuery))

    if (!matchesSearch) return false

    if (filterStatus === 'pending') return item.triage_status === 'pending'
    if (filterStatus === 'dispatched') return item.triage_status === 'dispatched'
    if (filterStatus === 'urgent') return item.triage_level === 'priority' || item.triage_level === 'emergency'
    return true
  })

  return (
    <div className="triage-desk-container">
      {/* Toast alert */}
      {toastMessage && (
        <div className="triage-toast-alert">
          <CheckCircle2 size={18} /> {toastMessage}
        </div>
      )}

      {/* Header bar */}
      <div className="triage-header">
        <div>
          <h2>🩺 Bàn Sàng lọc & Phân luồng Điều dưỡng (Triage Desk)</h2>
          <p className="tiny muted">
            Tiếp đón bệnh nhân, kiểm tra quyền lợi BHYT/CCCD, đo sinh hiệu từ xa và điều phối vào buồng Bác sĩ
          </p>
        </div>

        <div className="triage-header-actions">
          <button
            type="button"
            className="btn-refresh-triage"
            onClick={loadQueue}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="triage-stats-bar">
        <div
          className={`triage-stat-chip ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          <Activity size={16} /> Tất cả: <b>{queue.length}</b>
        </div>
        <div
          className={`triage-stat-chip ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          <Clock size={16} className="text-amber" /> Chờ sàng lọc: <b>{queue.filter(q => q.triage_status === 'pending').length}</b>
        </div>
        <div
          className={`triage-stat-chip ${filterStatus === 'dispatched' ? 'active' : ''}`}
          onClick={() => setFilterStatus('dispatched')}
        >
          <CheckCircle2 size={16} className="text-emerald" /> Đã vào buồng BS: <b>{queue.filter(q => q.triage_status === 'dispatched').length}</b>
        </div>
        <div
          className={`triage-stat-chip urgent ${filterStatus === 'urgent' ? 'active' : ''}`}
          onClick={() => setFilterStatus('urgent')}
        >
          <Flame size={16} className="text-red" /> Ưu tiên / Cấp cứu: <b>{queue.filter(q => q.triage_level === 'priority' || q.triage_level === 'emergency').length}</b>
        </div>
      </div>

      {/* Search Input */}
      <div className="triage-search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Tìm kiếm bệnh nhân theo tên, số điện thoại hoặc triệu chứng..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-btn" onClick={() => setSearchQuery('')}>✕</button>
        )}
      </div>

      {/* Queue Grid */}
      <div className="triage-queue-grid">
        {filteredQueue.length === 0 ? (
          <div className="triage-empty">
            <Activity size={36} className="muted" />
            <p>Không có bệnh nhân nào trong hàng đợi phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          filteredQueue.map(item => {
            const isEmergency = item.triage_level === 'emergency'
            const isPriority = item.triage_level === 'priority'

            return (
              <div
                key={item.appointment_id}
                className={`triage-card ${isEmergency ? 'border-emergency' : isPriority ? 'border-priority' : ''}`}
              >
                <div className="triage-card-header">
                  <div className="triage-patient-info">
                    <span className="appt-id-badge">#{item.appointment_id}</span>
                    <h4 className="patient-name">{item.patient_name}</h4>
                    {item.patient_phone && (
                      <span className="tiny muted">📞 {item.patient_phone}</span>
                    )}
                  </div>

                  {/* Priority Badge */}
                  <span className={`badge-priority ${item.triage_level}`}>
                    {item.triage_level === 'emergency' && '🔴 CẤP CỨU'}
                    {item.triage_level === 'priority' && '🟡 ƯU TIÊN'}
                    {item.triage_level === 'normal' && '🟢 BÌNH THƯỜNG'}
                  </span>
                </div>

                <div className="triage-card-body">
                  <p className="triage-reason">
                    <b>Lý do khám:</b> {item.reason}
                  </p>

                  <div className="triage-meta-row">
                    <span className="meta-item">
                      <Stethoscope size={13} /> {item.doctor_name}
                    </span>
                    <span className="meta-item">
                      🏥 {item.department_name}
                    </span>
                    {item.bhyt_code ? (
                      <span className="meta-item bhyt-verified">
                        <ShieldCheck size={13} /> BHYT: {item.bhyt_code}
                      </span>
                    ) : (
                      <span className="meta-item bhyt-none">Tự chi trả</span>
                    )}
                  </div>

                  {/* Vitals Summary Pill Bar if already taken */}
                  {item.temperature || item.pulse || item.blood_pressure ? (
                    <div className="triage-vitals-pill-bar">
                      {item.pulse && (
                        <span className="vital-pill">
                          <Heart size={12} className="text-red" /> {item.pulse} bpm
                        </span>
                      )}
                      {item.blood_pressure && (
                        <span className="vital-pill">
                          <Activity size={12} className="text-teal" /> {item.blood_pressure}
                        </span>
                      )}
                      {item.temperature && (
                        <span className="vital-pill">
                          <Thermometer size={12} className={item.temperature >= 38.5 ? 'text-red' : 'text-amber'} /> {item.temperature}°C
                        </span>
                      )}
                      {item.spo2 && (
                        <span className="vital-pill">
                          <Wind size={12} className="text-blue" /> SpO2 {item.spo2}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="triage-no-vitals">
                      <small className="muted">⚠️ Chưa ghi nhận chỉ số sinh tồn</small>
                    </div>
                  )}

                  {item.triage_notes && (
                    <div className="triage-notes-box">
                      <b>Ghi chú ĐD:</b> {item.triage_notes}
                    </div>
                  )}
                </div>

                <div className="triage-card-footer">
                  <span className={`status-pill ${item.triage_status}`}>
                    {item.triage_status === 'dispatched' ? '✅ Đã vào phòng BS' : '⏳ Chờ điều dưỡng'}
                  </span>

                  <button
                    type="button"
                    className="btn-triage-action"
                    onClick={() => openAssessment(item)}
                  >
                    🩺 Đo sinh hiệu & Phân luồng
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Sàng lọc & Đo sinh hiệu Modal */}
      {selectedItem && (
        <div className="modal-backdrop triage-modal-backdrop">
          <div className="modal triage-modal">
            <div className="triage-modal-header">
              <div>
                <h3>🩺 Phiếu Sàng lọc & Phân luồng Lâm sàng</h3>
                <p className="tiny muted">
                  Bệnh nhân: <b>{selectedItem.patient_name}</b> · Lịch hẹn #{selectedItem.appointment_id}
                </p>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
            </div>

            <div className="triage-modal-body">
              {/* Warnings alert if critical */}
              {(isHighTemp || isLowSpo2 || isHighPulse) && (
                <div className="vital-alert-banner">
                  <AlertTriangle size={18} />
                  <div>
                    <b>Cảnh báo chỉ số sinh tồn bất thường:</b>
                    {isHighTemp && <div>• Thân nhiệt cao ({temperature}°C): Sốt cao cần hạ nhiệt và ưu tiên khám.</div>}
                    {isLowSpo2 && <div>• SpO2 thấp ({spo2}%): Nguy cơ suy hô hấp, xếp vào diện CẤP CỨU.</div>}
                    {isHighPulse && <div>• Nhịp tim bất thường ({pulse} bpm).</div>}
                  </div>
                </div>
              )}

              {/* Vitals Form Grid */}
              <div className="vitals-input-grid">
                <div className="vital-col">
                  <label>
                    <Heart size={14} className="text-red" /> Mạch (lần/phút):
                  </label>
                  <input
                    type="number"
                    placeholder="75"
                    value={pulse}
                    onChange={e => setPulse(e.target.value ? Number(e.target.value) : '')}
                  />
                  <small className="tiny muted">Bình thường: 60 - 90 bpm</small>
                </div>

                <div className="vital-col">
                  <label>
                    <Activity size={14} className="text-teal" /> Huyết áp (mmHg):
                  </label>
                  <input
                    type="text"
                    placeholder="120/80"
                    value={bloodPressure}
                    onChange={e => setBloodPressure(e.target.value)}
                  />
                  <small className="tiny muted">Chuẩn: 120/80 mmHg</small>
                </div>

                <div className="vital-col">
                  <label>
                    <Thermometer size={14} className="text-amber" /> Thân nhiệt (°C):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="36.8"
                    value={temperature}
                    onChange={e => setTemperature(e.target.value ? Number(e.target.value) : '')}
                  />
                  <small className="tiny muted">Sốt khi &gt; 38.0°C</small>
                </div>

                <div className="vital-col">
                  <label>
                    <Wind size={14} className="text-blue" /> SpO2 (%):
                  </label>
                  <input
                    type="number"
                    placeholder="98"
                    value={spo2}
                    onChange={e => setSpo2(e.target.value ? Number(e.target.value) : '')}
                  />
                  <small className="tiny muted">Chuẩn: 96% - 100%</small>
                </div>

                <div className="vital-col">
                  <label>
                    <Weight size={14} className="text-slate" /> Cân nặng (kg):
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="60"
                    value={weight}
                    onChange={e => setWeight(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>

                <div className="vital-col">
                  <label>Chiều cao (cm):</label>
                  <input
                    type="number"
                    placeholder="165"
                    value={height}
                    onChange={e => setHeight(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>

              {/* Triage Level Selector */}
              <div className="triage-level-section">
                <label className="section-label"><b>Phân loại mức độ ưu tiên lâm sàng:</b></label>
                <div className="triage-level-options">
                  <label className={`level-option normal ${triageLevel === 'normal' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="triageLevel"
                      value="normal"
                      checked={triageLevel === 'normal'}
                      onChange={() => setTriageLevel('normal')}
                    />
                    <div>
                      <b>🟢 BÌNH THƯỜNG</b>
                      <small>Thứ tự khám thông thường</small>
                    </div>
                  </label>

                  <label className={`level-option priority ${triageLevel === 'priority' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="triageLevel"
                      value="priority"
                      checked={triageLevel === 'priority'}
                      onChange={() => setTriageLevel('priority')}
                    />
                    <div>
                      <b>🟡 ƯU TIÊN</b>
                      <small>Sốt cao, đau nhiều, người cao tuổi</small>
                    </div>
                  </label>

                  <label className={`level-option emergency ${triageLevel === 'emergency' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="triageLevel"
                      value="emergency"
                      checked={triageLevel === 'emergency'}
                      onChange={() => setTriageLevel('emergency')}
                    />
                    <div>
                      <b>🔴 CẤP CỨU</b>
                      <small>Khó thở, SpO2 &lt; 92%, Đau ngực dữ dội</small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Triage Nurse Notes */}
              <div className="triage-notes-section">
                <label className="section-label"><b>Ghi chú nhận định điều dưỡng sơ bộ:</b></label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận tri giác, tiếp xúc, tình trạng hô hấp hoặc lưu ý dị ứng thuốc..."
                  value={triageNotes}
                  onChange={e => setTriageNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="triage-modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSelectedItem(null)}
              >
                Đóng
              </button>

              <button
                type="button"
                className="btn-save-draft"
                onClick={() => handleSaveTriage(false)}
                disabled={isSubmitting}
              >
                💾 Lưu chỉ số
              </button>

              <button
                type="button"
                className="btn-dispatch-doctor primary"
                onClick={() => handleSaveTriage(true)}
                disabled={isSubmitting}
              >
                <Send size={15} /> ⚡ Phân luồng & Chuyển vào buồng Bác sĩ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
