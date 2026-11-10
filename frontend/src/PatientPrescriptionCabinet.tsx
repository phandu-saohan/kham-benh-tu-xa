import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Pill,
  ShieldCheck,
  Clock,
  Search,
  Plus,
  RefreshCw,
  QrCode,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  Building2,
  Stethoscope,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
  Zap,
  Edit2,
  Trash2,
  Check,
  X,
  ExternalLink,
  Archive,
  Info
} from 'lucide-react'
import {
  PatientPrescription,
  CabinetItem,
  CabinetItemInput,
  getMyPrescriptions,
  getMyMedicineCabinet,
  createCabinetItem,
  updateCabinetItem,
  deleteCabinetItem,
  logTakeCabinetDose,
  syncAppointmentToCabinet
} from './api'
import './prescription-cabinet.css'
import { formatDateVN, formatDateTimeVN } from './dateFormatters'
import { Pagination } from './Pagination'

interface PatientPrescriptionCabinetProps {
  onViewRecord?: (appointmentId: number) => void
  onDownloadPdf?: (appointmentId: number) => void
}

export const PatientPrescriptionCabinet: React.FC<PatientPrescriptionCabinetProps> = ({
  onViewRecord,
  onDownloadPdf
}) => {
  const [activeTab, setActiveTab] = useState<'prescriptions' | 'cabinet'>('prescriptions')
  const [prescriptions, setPrescriptions] = useState<PatientPrescription[]>([])
  const [cabinetItems, setCabinetItems] = useState<CabinetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cabinetFilter, setCabinetFilter] = useState<'all' | 'active' | 'as_needed' | 'low_stock' | 'stopped'>('all')

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<CabinetItem | null>(null)
  const [qrModalPrescription, setQrModalPrescription] = useState<PatientPrescription | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Form State for new cabinet item
  const [formData, setFormData] = useState<CabinetItemInput>({
    name: '',
    active_ingredient: '',
    dosage: '',
    frequency: '',
    timing: '',
    schedule_slot: 'morning',
    quantity_remaining: 30,
    total_quantity: 30,
    unit: 'viên',
    status: 'active',
    notes: ''
  })

  // Load all data on mount
  const loadData = async () => {
    try {
      setLoading(true)
      const [presData, cabData] = await Promise.all([
        getMyPrescriptions(),
        getMyMedicineCabinet()
      ])
      setPrescriptions(presData)
      setCabinetItems(cabData)
    } catch (err) {
      console.error('Lỗi tải dữ liệu đơn thuốc và tủ thuốc:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Handle Taking a Dose today
  const handleTakeDose = async (itemId: number) => {
    try {
      const res = await logTakeCabinetDose(itemId)
      if (res.success) {
        setCabinetItems(prev =>
          prev.map(it =>
            it.id === itemId
              ? {
                  ...it,
                  quantity_remaining: res.quantity_remaining,
                  last_taken_at: res.last_taken_at || new Date().toISOString()
                }
              : it
          )
        )
        showToast(`✓ Đã ghi nhận uống thuốc (${res.message})`)
      }
    } catch (err: any) {
      alert(err.message || 'Không thể ghi nhận uống thuốc')
    }
  }

  // Handle Syncing prescription to cabinet
  const handleSyncToCabinet = async (appointmentId: number) => {
    try {
      const res = await syncAppointmentToCabinet(appointmentId)
      if (res.success) {
        showToast(`✓ ${res.message}!`)
        const cabData = await getMyMedicineCabinet()
        setCabinetItems(cabData)
        setPrescriptions(prev =>
          prev.map(p =>
            p.appointment_id === appointmentId ? { ...p, imported_to_cabinet: true } : p
          )
        )
      }
    } catch (err: any) {
      alert(err.message || 'Không thể đồng bộ vào tủ thuốc')
    }
  }

  // Handle Creating a new medication in cabinet
  const handleCreateCabinetItem = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const created = await createCabinetItem(formData)
      setCabinetItems(prev => [created, ...prev])
      setShowAddModal(false)
      showToast(`✓ Đã thêm ${created.name} vào Tủ thuốc!`)
      setFormData({
        name: '',
        active_ingredient: '',
        dosage: '',
        frequency: '',
        timing: '',
        schedule_slot: 'morning',
        quantity_remaining: 30,
        total_quantity: 30,
        unit: 'viên',
        status: 'active',
        notes: ''
      })
    } catch (err: any) {
      alert(err.message || 'Không thể thêm thuốc vào tủ')
    }
  }

  // Handle Editing an existing cabinet item
  const handleUpdateCabinetItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    try {
      const updated = await updateCabinetItem(editingItem.id, editingItem)
      setCabinetItems(prev => prev.map(it => (it.id === updated.id ? updated : it)))
      setEditingItem(null)
      showToast(`✓ Đã cập nhật thuốc ${updated.name}!`)
    } catch (err: any) {
      alert(err.message || 'Không thể cập nhật thuốc')
    }
  }

  // Handle Deleting from cabinet
  const handleDeleteCabinetItem = async (itemId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa loại thuốc này khỏi Tủ thuốc?')) return
    try {
      await deleteCabinetItem(itemId)
      setCabinetItems(prev => prev.filter(it => it.id !== itemId))
      showToast('Đã xóa thuốc khỏi tủ thuốc.')
    } catch (err: any) {
      alert(err.message || 'Không thể xóa thuốc')
    }
  }

  // Metric Computations
  const activeCabinetCount = useMemo(() => {
    return cabinetItems.filter(c => c.status === 'active' || c.status === 'as_needed').length
  }, [cabinetItems])

  const takenTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    return cabinetItems.filter(c => c.last_taken_at && c.last_taken_at.startsWith(todayStr)).length
  }, [cabinetItems])

  // Filtered Prescriptions
  const filteredPrescriptions = useMemo(() => {
    if (!searchQuery.trim()) return prescriptions
    const q = searchQuery.toLowerCase().trim()
    return prescriptions.filter(p => {
      const medMatch = p.medications.some(m =>
        m.name.toLowerCase().includes(q) || (m.active_ingredient || '').toLowerCase().includes(q)
      )
      const docMatch = p.doctor_name.toLowerCase().includes(q)
      const diagMatch = (p.diagnosis || '').toLowerCase().includes(q) || (p.icd10_code || '').toLowerCase().includes(q)
      const codeMatch = (p.encounter_code || '').toLowerCase().includes(q) || (p.national_code || '').toLowerCase().includes(q)
      return medMatch || docMatch || diagMatch || codeMatch
    })
  }, [prescriptions, searchQuery])

  // Filtered Cabinet Items
  const filteredCabinetItems = useMemo(() => {
    return cabinetItems.filter(it => {
      // 1. Tab filter
      if (cabinetFilter === 'active' && it.status !== 'active') return false
      if (cabinetFilter === 'as_needed' && it.status !== 'as_needed') return false
      if (cabinetFilter === 'low_stock' && it.quantity_remaining > 5) return false
      if (cabinetFilter === 'stopped' && it.status !== 'stopped') return false

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = it.name.toLowerCase().includes(q)
        const matchActive = (it.active_ingredient || '').toLowerCase().includes(q)
        const matchDoc = (it.doctor_name || '').toLowerCase().includes(q)
        if (!matchName && !matchActive && !matchDoc) return false
      }
      return true
    })
  }, [cabinetItems, cabinetFilter, searchQuery])

  // Split into schedule slots for Today's Schedule Board
  // Phân trang đơn thuốc (Tab 1)
  const [rxPage, setRxPage] = useState(1)
  const [rxPageSize, setRxPageSize] = useState(5)
  useEffect(() => {
    setRxPage(1)
  }, [searchQuery])
  const totalRxPages = Math.ceil(filteredPrescriptions.length / rxPageSize) || 1
  const activeRxPage = Math.min(rxPage, totalRxPages)
  const paginatedPrescriptions = useMemo(() => {
    const start = (activeRxPage - 1) * rxPageSize
    return filteredPrescriptions.slice(start, start + rxPageSize)
  }, [filteredPrescriptions, activeRxPage, rxPageSize])

  // Phân trang tủ thuốc (Tab 2)
  const [cabinetPage, setCabinetPage] = useState(1)
  const [cabinetPageSize, setCabinetPageSize] = useState(8)
  useEffect(() => {
    setCabinetPage(1)
  }, [cabinetFilter, searchQuery])
  const totalCabinetPages = Math.ceil(filteredCabinetItems.length / cabinetPageSize) || 1
  const activeCabinetPage = Math.min(cabinetPage, totalCabinetPages)
  const paginatedCabinetItems = useMemo(() => {
    const start = (activeCabinetPage - 1) * cabinetPageSize
    return filteredCabinetItems.slice(start, start + cabinetPageSize)
  }, [filteredCabinetItems, activeCabinetPage, cabinetPageSize])

  const morningMeds = cabinetItems.filter(c => c.schedule_slot === 'morning' && c.status === 'active')
  const noonMeds = cabinetItems.filter(c => c.schedule_slot === 'noon' && c.status === 'active')
  const eveningMeds = cabinetItems.filter(
    c => (c.schedule_slot === 'evening' || c.schedule_slot === 'night') && c.status === 'active'
  )
  const asNeededMeds = cabinetItems.filter(c => c.schedule_slot === 'as_needed' || c.status === 'as_needed')

  return (
    <div className="pc-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          {toastMessage}
        </div>
      )}

      {/* Top Header Card */}
      <div className="pc-header-card">
        <div className="pc-title-area">
          <h2>
            <Pill size={24} color="#0284c7" />
            Đơn thuốc và Tủ thuốc của bạn
          </h2>
          <p>
            Quản lý chi tiết các đơn thuốc bác sĩ kê toa theo từng đợt khám và theo dõi tủ thuốc đang sử dụng tại nhà.
          </p>
        </div>
        <div className="pc-header-actions">
          <button
            type="button"
            className="pc-btn-outline"
            onClick={loadData}
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            className="pc-btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} />
            Thêm thuốc vào Tủ thuốc
          </button>
        </div>
      </div>

      {/* 4 Financial & Medication Metric Cards */}
      <div className="pc-metrics-grid">
        <div className="pc-metric-card">
          <div className="pc-metric-icon blue">
            <FileText size={20} />
          </div>
          <div className="pc-metric-content">
            <span className="pc-metric-label">Đơn thuốc đã kê</span>
            <span className="pc-metric-value">{prescriptions.length} đợt khám</span>
            <span className="pc-metric-sub">✓ 100% Ký số SmartCA</span>
          </div>
        </div>

        <div className="pc-metric-card">
          <div className="pc-metric-icon teal">
            <Pill size={20} />
          </div>
          <div className="pc-metric-content">
            <span className="pc-metric-label">Thuốc trong tủ</span>
            <span className="pc-metric-value">{activeCabinetCount} loại thuốc</span>
            <span className="pc-metric-sub">Đang uống hàng ngày</span>
          </div>
        </div>

        <div className="pc-metric-card">
          <div className="pc-metric-icon green">
            <ShieldCheck size={20} />
          </div>
          <div className="pc-metric-content">
            <span className="pc-metric-label">Cổng Quốc gia</span>
            <span className="pc-metric-value">Chuẩn Bộ Y tế</span>
            <span className="pc-metric-sub">donthuocquocgia.vn</span>
          </div>
        </div>

        <div className="pc-metric-card">
          <div className="pc-metric-icon amber">
            <Clock size={20} />
          </div>
          <div className="pc-metric-content">
            <span className="pc-metric-label">Nhắc uống hôm nay</span>
            <span className="pc-metric-value">
              {takenTodayCount}/{activeCabinetCount || 1} liều
            </span>
            <span className="pc-metric-sub" style={{ color: '#0284c7' }}>
              Tuân thủ điều trị
            </span>
          </div>
        </div>
      </div>

      {/* 2 Main Navigation Tabs */}
      <div className="pc-tabs-bar">
        <button
          type="button"
          className={`pc-tab-item ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <FileText size={16} />
          <span>Đơn thuốc từ các đợt khám</span>
          <span className="pc-tab-badge">{prescriptions.length}</span>
        </button>
        <button
          type="button"
          className={`pc-tab-item ${activeTab === 'cabinet' ? 'active' : ''}`}
          onClick={() => setActiveTab('cabinet')}
        >
          <Archive size={16} />
          <span>Tủ thuốc của bạn</span>
          <span className="pc-tab-badge">{activeCabinetCount}</span>
        </button>
      </div>

      {/* Global Search Bar */}
      <div style={{ position: 'relative' }}>
        <Search
          size={16}
          color="#94a3b8"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={
            activeTab === 'prescriptions'
              ? 'Tìm kiếm theo tên thuốc, hoạt chất, bác sĩ kê toa, chẩn đoán ICD-10...'
              : 'Tìm kiếm thuốc trong tủ thuốc của bạn...'
          }
          style={{
            width: '100%',
            padding: '10px 14px 10px 38px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontSize: '13px',
            outline: 'none'
          }}
        />
      </div>

      {/* ======================= TAB 1: ĐƠN THUỐC TỪ CÁC ĐỢT KHÁM ======================= */}
      {activeTab === 'prescriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, fontSize: '14px', color: '#1e293b', fontWeight: 700 }}>
              📋 Danh sách các đơn thuốc bác sĩ kê toa ({filteredPrescriptions.length} đơn)
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Mỗi đơn thuốc gắn liền với đợt khám và có mã QR liên thông Cổng Quốc gia
            </span>
          </div>

          {filteredPrescriptions.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '36px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <FileText size={36} color="#cbd5e1" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                Không tìm thấy đơn thuốc nào
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {searchQuery ? 'Thử tìm với từ khóa khác.' : 'Bạn chưa có đợt khám nào có đơn thuốc được kê.'}
              </div>
            </div>
          ) : (
            paginatedPrescriptions.map(p => (
              <div key={p.appointment_id} className="pc-prescription-card">
                {/* Header of Prescription */}
                <div className="pc-prescription-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {formatDateVN(p.starts_at)}
                      </span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        · {new Date(p.starts_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="pc-prescription-meta" style={{ marginTop: '6px' }}>
                      <span className="pc-tag blue">Mã LK: {p.encounter_code}</span>
                      <span className="pc-tag blue">{p.department_name || 'Khoa Nội Tổng Quát'}</span>
                      <span className="pc-tag green">
                        <ShieldCheck size={12} /> Cổng Quốc gia: {p.national_code}
                      </span>
                      <span className="pc-tag green">
                        <CheckCircle2 size={12} /> Ký số SmartCA PKI
                      </span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>
                      {p.hospital_code || 'Bệnh viện Telemed (79014)'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Chuẩn Thông tư 27/2021/TT-BYT</div>
                  </div>
                </div>

                {/* Doctor & Clinical Diagnosis */}
                <div className="pc-clinical-box">
                  <div className="pc-clinical-row">
                    <span className="pc-clinical-label">Bác sĩ kê toa:</span>
                    <span className="pc-clinical-value" style={{ fontWeight: 600 }}>
                      {p.doctor_name}
                      {p.doctor_cchn && (
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                          (CCHN: {p.doctor_cchn})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="pc-clinical-row">
                    <span className="pc-clinical-label">Chẩn đoán y khoa:</span>
                    <span className="pc-clinical-value">
                      <strong style={{ color: '#0f172a' }}>{p.diagnosis}</strong>
                      {p.icd10_code && (
                        <span style={{ color: '#0284c7', fontWeight: 600, marginLeft: '6px' }}>
                          (ICD-10: {p.icd10_code} - {p.icd10_name})
                        </span>
                      )}
                    </span>
                  </div>
                  {p.doctor_advice && (
                    <div className="pc-clinical-row">
                      <span className="pc-clinical-label">Lời dặn bác sĩ:</span>
                      <span className="pc-clinical-value" style={{ fontStyle: 'italic', color: '#475569' }}>
                        "{p.doctor_advice}"
                      </span>
                    </div>
                  )}
                </div>

                {/* Detailed Table of Prescribed Medicines */}
                <div className="pc-med-table-wrapper">
                  <table className="pc-med-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>STT</th>
                        <th>Tên thuốc & Hoạt chất</th>
                        <th style={{ width: '90px' }}>Số lượng</th>
                        <th>Liều dùng & Cách dùng</th>
                        <th style={{ width: '130px' }}>Thời điểm</th>
                        <th>Lời dặn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.medications.map((m, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                          <td>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{m.name}</div>
                            {m.active_ingredient && (
                              <div style={{ fontSize: '11px', color: '#0d9488' }}>{m.active_ingredient}</div>
                            )}
                          </td>
                          <td style={{ fontWeight: 700, color: '#0284c7' }}>
                            {m.quantity} {m.unit}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{m.dosage}</div>
                            <div style={{ fontSize: '11px', color: '#475569' }}>{m.usage_instructions}</div>
                          </td>
                          <td>
                            {m.schedule_slot === 'morning' && (
                              <span className="pc-slot-badge morning">
                                <Sun size={11} /> Buổi sáng
                              </span>
                            )}
                            {m.schedule_slot === 'noon' && (
                              <span className="pc-slot-badge noon">
                                <Sun size={11} /> Buổi trưa
                              </span>
                            )}
                            {(m.schedule_slot === 'evening' || m.schedule_slot === 'night') && (
                              <span className="pc-slot-badge night">
                                <Moon size={11} /> Buổi tối
                              </span>
                            )}
                            {m.schedule_slot === 'as_needed' && (
                              <span className="pc-slot-badge as_needed">
                                <Zap size={11} /> Khi cần
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>
                            {m.doctor_advice || 'Uống đúng chỉ dẫn'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer Actions */}
                <div className="pc-prescription-footer">
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="pc-btn-primary"
                      onClick={() => handleSyncToCabinet(p.appointment_id)}
                      title="Đồng bộ tất cả các thuốc trong đơn này vào Tủ thuốc để theo dõi uống hàng ngày"
                    >
                      <Pill size={14} />
                      {p.imported_to_cabinet ? '✓ Đã có trong Tủ thuốc (Đồng bộ lại)' : 'Thêm vào Tủ thuốc của bạn'}
                    </button>
                    <button
                      type="button"
                      className="pc-btn-outline"
                      onClick={() => setQrModalPrescription(p)}
                      title="Mã QR mua thuốc tại nhà thuốc GPP toàn quốc"
                    >
                      <QrCode size={14} color="#0284c7" />
                      Mã QR Đơn thuốc GPP
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {onDownloadPdf && (
                      <button
                        type="button"
                        className="pc-btn-outline"
                        onClick={() => onDownloadPdf(p.appointment_id)}
                      >
                        <Download size={14} />
                        Tải PDF (Ký số)
                      </button>
                    )}
                    {onViewRecord && (
                      <button
                        type="button"
                        className="pc-btn-outline"
                        onClick={() => onViewRecord(p.appointment_id)}
                      >
                        <Eye size={14} />
                        Xem Bệnh án
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {filteredPrescriptions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={activeRxPage}
                totalItems={filteredPrescriptions.length}
                pageSize={rxPageSize}
                onPageChange={setRxPage}
                onPageSizeChange={setRxPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 2: TỦ THUỐC CỦA BẠN (ĐANG SỬ DỤNG) ======================= */}
      {activeTab === 'cabinet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Guide Banner */}
          <div className="pc-cabinet-alert-bar">
            <Info size={18} color="#059669" />
            <div>
              <strong>Tủ thuốc cá nhân của bạn:</strong> Giúp bạn theo dõi chính xác các loại thuốc đang sử dụng tại
              nhà, số lượng viên còn lại, và lịch nhắc uống thuốc hàng ngày để tuân thủ phác đồ điều trị.
            </div>
          </div>

          {/* Today's Medication Schedule Board */}
          <div className="pc-schedule-board">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="#0284c7" />
                Lịch nhắc uống thuốc hôm nay ({formatDateVN(new Date())})
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Đã uống: <strong>{takenTodayCount}</strong> / {activeCabinetCount} liều
              </span>
            </div>

            <div className="pc-schedule-grid">
              {/* 1. Morning Slot */}
              <div className="pc-schedule-col">
                <div className="pc-schedule-col-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309' }}>
                    <Sun size={15} /> Buổi Sáng
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Sau ăn 30p</span>
                </div>
                {morningMeds.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                    Không có thuốc sáng
                  </div>
                ) : (
                  morningMeds.map(m => {
                    const isTakenToday = Boolean(m.last_taken_at && m.last_taken_at.startsWith(new Date().toISOString().slice(0, 10)))
                    return (
                      <div key={m.id} className="pc-schedule-med-card">
                        <div className="pc-schedule-med-name">{m.name}</div>
                        <div className="pc-schedule-med-sub">{m.dosage} · {m.timing}</div>
                        <button
                          type="button"
                          className={`pc-btn-take-dose ${isTakenToday ? 'taken' : ''}`}
                          onClick={() => !isTakenToday && handleTakeDose(m.id)}
                          disabled={isTakenToday}
                        >
                          <Check size={12} /> {isTakenToday ? 'Đã uống sáng' : 'Đánh dấu đã uống'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 2. Noon Slot */}
              <div className="pc-schedule-col">
                <div className="pc-schedule-col-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0369a1' }}>
                    <Sun size={15} /> Buổi Trưa
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Sau ăn trưa</span>
                </div>
                {noonMeds.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                    Không có thuốc trưa
                  </div>
                ) : (
                  noonMeds.map(m => {
                    const isTakenToday = Boolean(m.last_taken_at && m.last_taken_at.startsWith(new Date().toISOString().slice(0, 10)))
                    return (
                      <div key={m.id} className="pc-schedule-med-card">
                        <div className="pc-schedule-med-name">{m.name}</div>
                        <div className="pc-schedule-med-sub">{m.dosage} · {m.timing}</div>
                        <button
                          type="button"
                          className={`pc-btn-take-dose ${isTakenToday ? 'taken' : ''}`}
                          onClick={() => !isTakenToday && handleTakeDose(m.id)}
                          disabled={isTakenToday}
                        >
                          <Check size={12} /> {isTakenToday ? 'Đã uống trưa' : 'Đánh dấu đã uống'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 3. Evening Slot */}
              <div className="pc-schedule-col">
                <div className="pc-schedule-col-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6d28d9' }}>
                    <Moon size={15} /> Buổi Tối
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Trước khi ngủ</span>
                </div>
                {eveningMeds.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                    Không có thuốc tối
                  </div>
                ) : (
                  eveningMeds.map(m => {
                    const isTakenToday = Boolean(m.last_taken_at && m.last_taken_at.startsWith(new Date().toISOString().slice(0, 10)))
                    return (
                      <div key={m.id} className="pc-schedule-med-card">
                        <div className="pc-schedule-med-name">{m.name}</div>
                        <div className="pc-schedule-med-sub">{m.dosage} · {m.timing}</div>
                        <button
                          type="button"
                          className={`pc-btn-take-dose ${isTakenToday ? 'taken' : ''}`}
                          onClick={() => !isTakenToday && handleTakeDose(m.id)}
                          disabled={isTakenToday}
                        >
                          <Check size={12} /> {isTakenToday ? 'Đã uống tối' : 'Đánh dấu đã uống'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>

              {/* 4. As Needed Slot */}
              <div className="pc-schedule-col">
                <div className="pc-schedule-col-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b91c1c' }}>
                    <Zap size={15} /> Khi cần thiết
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Đau / Sốt cao</span>
                </div>
                {asNeededMeds.length === 0 ? (
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                    Không có thuốc dùng khi cần
                  </div>
                ) : (
                  asNeededMeds.map(m => (
                    <div key={m.id} className="pc-schedule-med-card">
                      <div className="pc-schedule-med-name">{m.name}</div>
                      <div className="pc-schedule-med-sub">{m.dosage} · {m.timing}</div>
                      <button
                        type="button"
                        className="pc-btn-take-dose"
                        onClick={() => handleTakeDose(m.id)}
                      >
                        <Plus size={12} /> Uống 1 liều ngay
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Filter Bar for Cabinet */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={`pc-tag ${cabinetFilter === 'all' ? 'blue' : ''}`}
              style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setCabinetFilter('all')}
            >
              Tất cả ({cabinetItems.length})
            </button>
            <button
              type="button"
              className={`pc-tag ${cabinetFilter === 'active' ? 'blue' : ''}`}
              style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setCabinetFilter('active')}
            >
              Đang uống hàng ngày ({cabinetItems.filter(c => c.status === 'active').length})
            </button>
            <button
              type="button"
              className={`pc-tag ${cabinetFilter === 'as_needed' ? 'blue' : ''}`}
              style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setCabinetFilter('as_needed')}
            >
              Uống khi cần ({cabinetItems.filter(c => c.status === 'as_needed').length})
            </button>
            <button
              type="button"
              className={`pc-tag ${cabinetFilter === 'low_stock' ? 'amber' : ''}`}
              style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setCabinetFilter('low_stock')}
            >
              Sắp hết thuốc (&lt; 5 viên) ({cabinetItems.filter(c => c.quantity_remaining <= 5).length})
            </button>
            <button
              type="button"
              className={`pc-tag ${cabinetFilter === 'stopped' ? 'blue' : ''}`}
              style={{ cursor: 'pointer', padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setCabinetFilter('stopped')}
            >
              Đã ngưng ({cabinetItems.filter(c => c.status === 'stopped').length})
            </button>
          </div>

          {/* Cabinet Medication Cards Grid */}
          <div className="pc-cabinet-cards-grid">
            {paginatedCabinetItems.map(item => {
              const isLowStock = item.quantity_remaining <= 5
              const percentage = Math.min(100, Math.round((item.quantity_remaining / (item.total_quantity || 30)) * 100))
              const isTakenToday = Boolean(item.last_taken_at && item.last_taken_at.startsWith(new Date().toISOString().slice(0, 10)))

              return (
                <div key={item.id} className="pc-cabinet-item-card">
                  {/* Top Header of Card */}
                  <div className="pc-cabinet-card-top">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div className="pc-cabinet-icon-wrap">
                        <Pill size={18} />
                      </div>
                      <div>
                        <div className="pc-cabinet-card-name">{item.name}</div>
                        {item.active_ingredient && (
                          <div className="pc-cabinet-card-active">{item.active_ingredient}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      {item.status === 'active' && <span className="pc-tag green">Đang uống</span>}
                      {item.status === 'as_needed' && <span className="pc-tag blue">Khi cần</span>}
                      {item.status === 'stopped' && <span className="pc-tag amber">Đã ngưng</span>}
                    </div>
                  </div>

                  {/* Dosage & Timing */}
                  <div className="pc-cabinet-dosage-box">
                    <div>
                      <strong>Liều dùng:</strong> {item.dosage} ({item.frequency})
                    </div>
                    <div>
                      <strong>Thời điểm:</strong> {item.timing}
                    </div>
                    {item.doctor_name && (
                      <div style={{ color: '#0284c7' }}>
                        <strong>Chỉ định bởi:</strong> {item.doctor_name}
                      </div>
                    )}
                    {item.notes && (
                      <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                        Lưu ý: {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Quantity & Progress Bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                      <span style={{ color: isLowStock ? '#ea580c' : '#475569' }}>
                        Số lượng còn lại: {item.quantity_remaining} / {item.total_quantity} {item.unit}
                      </span>
                      <span style={{ color: isLowStock ? '#ea580c' : '#0284c7' }}>{percentage}%</span>
                    </div>
                    <div className="pc-cabinet-progress-bar">
                      <div
                        className={`pc-cabinet-progress-fill ${isLowStock ? 'low' : ''}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {isLowStock && (
                      <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                        <AlertCircle size={12} /> Sắp hết thuốc - Vui lòng mua thêm hoặc hẹn tái khám
                      </div>
                    )}
                  </div>

                  {/* Last taken info */}
                  <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Lần uống gần nhất:</span>
                    <span style={{ fontWeight: 600, color: isTakenToday ? '#15803d' : '#64748b' }}>
                      {item.last_taken_at ? formatDateTimeVN(item.last_taken_at) : "Chưa có ghi nhận"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="pc-cabinet-card-actions">
                    <button
                      type="button"
                      className={`pc-btn-primary ${isTakenToday ? 'taken' : ''}`}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: isTakenToday ? '#f0fdf4' : '#10b981',
                        color: isTakenToday ? '#15803d' : '#ffffff',
                        border: isTakenToday ? '1px solid #bbf7d0' : 'none'
                      }}
                      onClick={() => handleTakeDose(item.id)}
                    >
                      <Check size={13} /> {isTakenToday ? 'Đã uống hôm nay' : 'Đã uống 1 liều'}
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="pc-btn-outline"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => setEditingItem(item)}
                        title="Chỉnh sửa số lượng hoặc liều dùng"
                      >
                        <Edit2 size={13} /> Sửa
                      </button>
                      <button
                        type="button"
                        className="pc-btn-outline"
                        style={{ padding: '6px 8px', color: '#ef4444' }}
                        onClick={() => handleDeleteCabinetItem(item.id)}
                        title="Xóa khỏi tủ thuốc"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {filteredCabinetItems.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={activeCabinetPage}
                totalItems={filteredCabinetItems.length}
                pageSize={cabinetPageSize}
                onPageChange={setCabinetPage}
                onPageSizeChange={setCabinetPageSize}
                pageSizeOptions={[4, 8, 16]}
              />
            </div>
          )}
        </div>
      )}

      {/* ======================= MODAL: THÊM THUỐC MỚI VÀO TỦ THUỐC ======================= */}
      {showAddModal && (
        <div className="pc-modal-backdrop">
          <div className="pc-modal-content">
            <div className="pc-modal-header">
              <h3>Thêm thuốc mới vào Tủ thuốc</h3>
              <button
                type="button"
                className="pc-modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCabinetItem}>
              <div className="pc-modal-body">
                <div className="pc-form-group">
                  <label>Tên biệt dược & Hàm lượng *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Amlodipine 5mg, Panadol Extra..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="pc-form-group">
                  <label>Hoạt chất chính (nếu biết)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Amlodipin besylat, Paracetamol..."
                    value={formData.active_ingredient || ''}
                    onChange={e => setFormData({ ...formData, active_ingredient: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="pc-form-group">
                    <label>Liều dùng *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: 1 viên/lần, 1 gói/lần"
                      value={formData.dosage}
                      onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                    />
                  </div>
                  <div className="pc-form-group">
                    <label>Tần suất *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: 1 lần/ngày, 2 lần/ngày"
                      value={formData.frequency}
                      onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="pc-form-group">
                    <label>Khung giờ uống *</label>
                    <select
                      value={formData.schedule_slot || 'morning'}
                      onChange={e => setFormData({ ...formData, schedule_slot: e.target.value as any })}
                    >
                      <option value="morning">🌅 Buổi sáng</option>
                      <option value="noon">☀️ Buổi trưa</option>
                      <option value="evening">🌇 Buổi chiều</option>
                      <option value="night">🌙 Buổi tối (trước ngủ)</option>
                      <option value="as_needed">⚡ Khi cần (sốt, đau...)</option>
                    </select>
                  </div>
                  <div className="pc-form-group">
                    <label>Thời điểm uống *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Sau ăn 30 phút, trước ngủ..."
                      value={formData.timing}
                      onChange={e => setFormData({ ...formData, timing: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div className="pc-form-group">
                    <label>Số lượng trong tủ</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.quantity_remaining || 30}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          quantity_remaining: Number(e.target.value),
                          total_quantity: Number(e.target.value)
                        })
                      }
                    />
                  </div>
                  <div className="pc-form-group">
                    <label>Đơn vị</label>
                    <select
                      value={formData.unit || 'viên'}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="viên">Viên</option>
                      <option value="gói">Gói</option>
                      <option value="chai">Chai / Lọ</option>
                      <option value="ống">Ống</option>
                      <option value="hộp">Hộp</option>
                    </select>
                  </div>
                  <div className="pc-form-group">
                    <label>Trạng thái</label>
                    <select
                      value={formData.status || 'active'}
                      onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="active">Đang uống</option>
                      <option value="as_needed">Uống khi cần</option>
                      <option value="stopped">Đã ngưng</option>
                    </select>
                  </div>
                </div>

                <div className="pc-form-group">
                  <label>Ghi chú / Lời dặn dò</label>
                  <textarea
                    rows={2}
                    placeholder="Lưu ý khi dùng, chống chỉ định, kiêng khem..."
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="pc-modal-footer">
                <button
                  type="button"
                  className="pc-btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="pc-btn-primary">
                  Lưu vào Tủ thuốc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: CHỈNH SỬA THUỐC TRONG TỦ ======================= */}
      {editingItem && (
        <div className="pc-modal-backdrop">
          <div className="pc-modal-content">
            <div className="pc-modal-header">
              <h3>Chỉnh sửa thuốc: {editingItem.name}</h3>
              <button
                type="button"
                className="pc-modal-close-btn"
                onClick={() => setEditingItem(null)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateCabinetItem}>
              <div className="pc-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="pc-form-group">
                    <label>Số lượng còn lại</label>
                    <input
                      type="number"
                      min={0}
                      value={editingItem.quantity_remaining}
                      onChange={e =>
                        setEditingItem({ ...editingItem, quantity_remaining: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="pc-form-group">
                    <label>Tổng số viên ban đầu</label>
                    <input
                      type="number"
                      min={1}
                      value={editingItem.total_quantity}
                      onChange={e =>
                        setEditingItem({ ...editingItem, total_quantity: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="pc-form-group">
                    <label>Liều dùng</label>
                    <input
                      type="text"
                      value={editingItem.dosage}
                      onChange={e => setEditingItem({ ...editingItem, dosage: e.target.value })}
                    />
                  </div>
                  <div className="pc-form-group">
                    <label>Thời điểm uống</label>
                    <input
                      type="text"
                      value={editingItem.timing}
                      onChange={e => setEditingItem({ ...editingItem, timing: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="pc-form-group">
                    <label>Khung giờ uống</label>
                    <select
                      value={editingItem.schedule_slot}
                      onChange={e =>
                        setEditingItem({ ...editingItem, schedule_slot: e.target.value as any })
                      }
                    >
                      <option value="morning">🌅 Buổi sáng</option>
                      <option value="noon">☀️ Buổi trưa</option>
                      <option value="evening">🌇 Buổi chiều</option>
                      <option value="night">🌙 Buổi tối</option>
                      <option value="as_needed">⚡ Khi cần</option>
                    </select>
                  </div>
                  <div className="pc-form-group">
                    <label>Trạng thái</label>
                    <select
                      value={editingItem.status}
                      onChange={e =>
                        setEditingItem({ ...editingItem, status: e.target.value as any })
                      }
                    >
                      <option value="active">Đang uống</option>
                      <option value="as_needed">Uống khi cần</option>
                      <option value="stopped">Đã ngưng</option>
                    </select>
                  </div>
                </div>

                <div className="pc-form-group">
                  <label>Ghi chú</label>
                  <textarea
                    rows={2}
                    value={editingItem.notes || ''}
                    onChange={e => setEditingItem({ ...editingItem, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="pc-modal-footer">
                <button
                  type="button"
                  className="pc-btn-outline"
                  onClick={() => setEditingItem(null)}
                >
                  Hủy
                </button>
                <button type="submit" className="pc-btn-primary">
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: MÃ QR ĐƠN THUỐC QUỐC GIA ======================= */}
      {qrModalPrescription && (
        <div className="pc-modal-backdrop">
          <div className="pc-modal-content" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div className="pc-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <QrCode size={18} color="#0284c7" /> Mã QR Đơn thuốc Quốc gia
              </h3>
              <button
                type="button"
                className="pc-modal-close-btn"
                onClick={() => setQrModalPrescription(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pc-modal-body" style={{ alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Đưa mã QR này cho dược sĩ tại các nhà thuốc đạt chuẩn GPP trên toàn quốc để liên thông đơn thuốc điện tử:
              </div>

              {/* QR Image */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '14px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                  margin: '10px 0'
                }}
              >
                <img
                  src={qrModalPrescription.national_qr_url}
                  alt={`QR ${qrModalPrescription.national_code}`}
                  style={{ width: '220px', height: '220px', display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Mã đơn thuốc: <code style={{ color: '#0284c7' }}>{qrModalPrescription.national_code}</code>
              </div>

              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                ✓ Đã ký số pháp lý SmartCA PKI · Bác sĩ: {qrModalPrescription.doctor_name}
              </div>

              <div style={{ fontSize: '12px', color: '#475569', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '100%', textAlign: 'left', marginTop: '6px' }}>
                <div><strong>Đợt khám:</strong> {qrModalPrescription.encounter_code}</div>
                <div><strong>Chẩn đoán:</strong> {qrModalPrescription.diagnosis}</div>
                <div><strong>Số lượng thuốc:</strong> {qrModalPrescription.medications.length} loại thuốc</div>
              </div>
            </div>

            <div className="pc-modal-footer" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="pc-btn-primary"
                onClick={() => setQrModalPrescription(null)}
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
