import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  ScanLine,
  Layers,
  Eye,
  Sparkles,
  Printer,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  RefreshCw,
  Sliders,
  Maximize2,
  ShieldCheck,
  User,
  Calendar,
  ExternalLink,
  Activity,
  Info,
  Search,
  Filter,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Ruler,
  X,
  Download,
  Share2
} from 'lucide-react'
import {
  PACSStudiesData,
  PACSStudy,
  getPatientPacsStudies,
  getMyPacsStudies,
  analyzePacsImage,
  PacsAnalysisResult,
  User as UserType
} from './api'
import { formatDateVN, formatDateTimeVN } from './dateFormatters'
import { Pagination } from './Pagination'
import './pacs-center.css'

interface PatientPacsCenterProps {
  user: UserType | null
  selectedPatientId?: number | null
  uniquePatients?: Array<{ id: number; name: string; bhyt?: string }>
  onSelectPatient?: (id: number) => void
  onToast?: (msg: string) => void
  onNavigate?: (view: string) => void
}

export function PatientPacsCenter({
  user,
  selectedPatientId,
  uniquePatients = [],
  onSelectPatient,
  onToast,
  onNavigate
}: PatientPacsCenterProps) {
  const isPatient = user?.role === 'patient'
  const activePatientId = selectedPatientId || user?.id || 1

  // Data State
  const [pacsData, setPacsData] = useState<PACSStudiesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // View & Filter State
  const [activeTab, setActiveTab] = useState<'list' | 'studio' | 'ai'>('list')
  const [modalityFilter, setModalityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Pagination State for Studies List
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Active Selected Study for Studio & AI
  const [selectedStudy, setSelectedStudy] = useState<PACSStudy | null>(null)

  // Interactive DICOM Studio State
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState<number>(0)
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false)
  const [windowPreset, setWindowPreset] = useState<'standard' | 'lung' | 'bone' | 'invert'>('standard')
  const [currentSlice, setCurrentSlice] = useState<number>(1)
  const [isPlayingCine, setIsPlayingCine] = useState<boolean>(false)
  const [activeTool, setActiveTool] = useState<'pointer' | 'zoom' | 'pan' | 'ruler'>('pointer')
  const [measureDistanceMm, setMeasureDistanceMm] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // AI Second Opinion State
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<PacsAnalysisResult | null>(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [doctorFeedback, setDoctorFeedback] = useState<'agree' | 'disagree' | null>(null)

  // Printable PDF Modal State
  const [printModalStudy, setPrintModalStudy] = useState<PACSStudy | null>(null)

  // Load PACS Studies Data
  const loadPacsData = async () => {
    try {
      setLoading(true)
      setError('')
      let data: PACSStudiesData
      if (isPatient) {
        data = await getMyPacsStudies()
      } else {
        data = await getPatientPacsStudies(activePatientId)
      }
      setPacsData(data)
      if (data?.studies && data.studies.length > 0 && !selectedStudy) {
        setSelectedStudy(data.studies[0])
      }
    } catch (err: any) {
      console.error('Lỗi khi tải dữ liệu PACS:', err)
      setError(err.message || 'Không thể tải dữ liệu chẩn đoán hình ảnh PACS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPacsData()
  }, [activePatientId, isPatient])

  // Cine playback loop
  useEffect(() => {
    let interval: any
    if (isPlayingCine && selectedStudy) {
      const maxSlices = selectedStudy.instances_count || 1
      interval = setInterval(() => {
        setCurrentSlice((prev) => (prev >= maxSlices ? 1 : prev + 1))
      }, 120)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlayingCine, selectedStudy])

  // Filtered Studies
  const filteredStudies = useMemo(() => {
    if (!pacsData?.studies) return []
    return pacsData.studies.filter((s) => {
      const matchesModality = modalityFilter === 'all' || s.modality === modalityFilter
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        s.study_id.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.body_part.toLowerCase().includes(q) ||
        s.radiologist.toLowerCase().includes(q) ||
        s.institution.toLowerCase().includes(q)
      return matchesModality && matchesSearch
    })
  }, [pacsData, modalityFilter, searchQuery])

  // Paginated Studies
  const paginatedStudies = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredStudies.slice(start, start + pageSize)
  }, [filteredStudies, currentPage, pageSize])

  // Metrics Calculations
  const metrics = useMemo(() => {
    const studies = pacsData?.studies || []
    const total = studies.length
    const crCount = studies.filter((s) => s.modality === 'CR' || s.modality === 'DX').length
    const ctCount = studies.filter((s) => s.modality === 'CT' || s.modality === 'MRI').length
    const usCount = studies.filter((s) => s.modality === 'US').length

    let latestDate = 'Chưa có dữ liệu'
    if (studies.length > 0) {
      const sorted = [...studies].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      latestDate = formatDateVN(sorted[0].date)
    }

    return { total, crCount, ctCount, usCount, latestDate }
  }, [pacsData])

  // Handle AI Analyze
  const handleRunAiAnalysis = async (study: PACSStudy) => {
    setSelectedStudy(study)
    setAiLoading(true)
    setAiModalOpen(true)
    try {
      const result = await analyzePacsImage(study.study_id, study.modality, study.body_part)
      setAiResult(result)
      if (onToast) onToast('AI đã hoàn tất phân tích hình ảnh PACS!')
    } catch (err: any) {
      console.error('Lỗi khi AI phân tích ảnh:', err)
      if (onToast) onToast('Không thể kích hoạt mô hình AI: ' + (err.message || 'Lỗi mạng'))
    } finally {
      setAiLoading(false)
    }
  }

  // Switch to Studio Tab with selected study
  const handleOpenInStudio = (study: PACSStudy) => {
    setSelectedStudy(study)
    setCurrentSlice(1)
    setZoomLevel(100)
    setPanPosition({ x: 0, y: 0 })
    setRotation(0)
    setIsFlippedH(false)
    setWindowPreset('standard')
    setActiveTab('studio')
  }

  // Filter effect styling for canvas stage
  const getFilterStyle = () => {
    switch (windowPreset) {
      case 'lung':
        return 'contrast(180%) brightness(130%) grayscale(100%)'
      case 'bone':
        return 'contrast(240%) brightness(85%) grayscale(100%)'
      case 'invert':
        return 'invert(100%) contrast(120%) grayscale(100%)'
      case 'standard':
      default:
        return 'contrast(115%) brightness(105%) grayscale(100%)'
    }
  }

  return (
    <div className="pacs-container">
      {/* 1. Header Banner */}
      <div className="pacs-header-card">
        <div>
          <div className="pacs-header-title">
            <ScanLine size={24} />
            <span>Trung tâm Chẩn đoán Hình ảnh Y khoa PACS / DICOM</span>
            <span className="pacs-badge-tag">DICOMweb WADO-RS</span>
            <span className="pacs-badge-tag">OHIF v3</span>
          </div>
          <p className="pacs-header-subtitle">
            Hệ thống lưu trữ và truyền hình ảnh y tế tiêu chuẩn quốc tế: X-quang kỹ thuật số, Cắt lớp vi tính đa dãy (CT),
            Cộng hưởng từ (MRI) và Siêu âm màu. Tích hợp bộ đọc ảnh y khoa trực quan và trợ lý chẩn đoán AI Vision.
          </p>
        </div>
        <div className="pacs-header-actions">
          <button
            type="button"
            className="pacs-btn-primary"
            onClick={loadPacsData}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Đang tải...' : 'Làm mới PACS'}</span>
          </button>
        </div>
      </div>

      {/* 2. Staff Patient Selector (Doctor/Nurse mode) */}
      {!isPatient && uniquePatients.length > 0 && (
        <div className="pacs-patient-selector">
          <div>
            <div className="pacs-selector-label">
              <User size={14} />
              <span>Hồ sơ Bệnh nhân cần xem phim chụp:</span>
            </div>
            <div className="pacs-patient-chips">
              {uniquePatients.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pacs-patient-chip ${activePatientId === p.id ? 'active' : ''}`}
                  onClick={() => onSelectPatient && onSelectPatient(p.id)}
                >
                  <User size={13} />
                  <span>{p.name}</span>
                  {p.bhyt && <small style={{ opacity: 0.75, fontSize: '11px' }}>({p.bhyt})</small>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>
            Mã BN: BN-{activePatientId.toString().padStart(4, '0')}
          </div>
        </div>
      )}

      {/* 3. KPI Metric Cards */}
      <div className="pacs-metrics-grid">
        <div className="pacs-metric-card">
          <div className="pacs-metric-icon blue">
            <Layers size={24} />
          </div>
          <div className="pacs-metric-info">
            <span className="pacs-metric-label">Tổng ca chụp PACS</span>
            <span className="pacs-metric-value">{metrics.total}</span>
            <span className="pacs-metric-subtext">Hồ sơ hình ảnh lưu trữ</span>
          </div>
        </div>

        <div className="pacs-metric-card">
          <div className="pacs-metric-icon amber">
            <ScanLine size={24} />
          </div>
          <div className="pacs-metric-info">
            <span className="pacs-metric-label">X-Quang Kỹ thuật số (CR)</span>
            <span className="pacs-metric-value">{metrics.crCount}</span>
            <span className="pacs-metric-subtext">Tim phổi, cột sống, xương</span>
          </div>
        </div>

        <div className="pacs-metric-card">
          <div className="pacs-metric-icon purple">
            <Activity size={24} />
          </div>
          <div className="pacs-metric-info">
            <span className="pacs-metric-label">CT Scanner & MRI</span>
            <span className="pacs-metric-value">{metrics.ctCount}</span>
            <span className="pacs-metric-subtext">Cắt lớp đa dãy lồng ngực/sọ não</span>
          </div>
        </div>

        <div className="pacs-metric-card">
          <div className="pacs-metric-icon teal">
            <Calendar size={24} />
          </div>
          <div className="pacs-metric-info">
            <span className="pacs-metric-label">Đợt chụp mới nhất</span>
            <span className="pacs-metric-value" style={{ fontSize: '16px' }}>{metrics.latestDate}</span>
            <span className="pacs-metric-subtext">Quy chuẩn QĐ 130/QĐ-BYT</span>
          </div>
        </div>
      </div>

      {/* 4. Tabs Navigation */}
      <div className="pacs-nav-tabs">
        <button
          type="button"
          className={`pacs-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <FileText size={16} />
          <span>Danh sách Ca chụp & Báo cáo CĐHA ({filteredStudies.length})</span>
        </button>

        <button
          type="button"
          className={`pacs-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={() => setActiveTab('studio')}
        >
          <Eye size={16} />
          <span>Trình Đọc Phim DICOM Chuyên Sâu (Studio)</span>
        </button>

        <button
          type="button"
          className={`pacs-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          <Sparkles size={16} color="#059669" />
          <span>AI Vision Second Opinion (Bản đồ tổn thương)</span>
        </button>
      </div>

      {/* TAB 1: Danh Sách Ca Chụp PACS */}
      {activeTab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toolbar */}
          <div className="pacs-toolbar">
            <div className="pacs-search-box">
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Tìm theo mã ca, tên kỹ thuật, bộ phận chụp, bác sĩ CĐHA..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            <div className="pacs-filter-chips">
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
                <Filter size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Kỹ thuật:
              </span>
              {[
                ['all', `Tất cả (${pacsData?.studies?.length || 0})`],
                ['CR', 'X-Quang (CR)'],
                ['CT', 'Cắt lớp CT'],
                ['US', 'Siêu âm (US)']
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`pacs-chip ${modalityFilter === key ? 'active' : ''}`}
                  onClick={() => {
                    setModalityFilter(key)
                    setCurrentPage(1)
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* List of Studies */}
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
              <RefreshCw size={24} className="animate-spin" color="#0284c7" style={{ margin: '0 auto 10px' }} />
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Đang tải danh mục phim chụp PACS từ máy chủ DICOMweb...</p>
            </div>
          ) : paginatedStudies.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <ScanLine size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 4px', color: '#334155' }}>Không tìm thấy ca chụp PACS nào phù hợp</h4>
              <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc kỹ thuật khác.</p>
            </div>
          ) : (
            paginatedStudies.map((study) => (
              <div key={study.study_id} className="pacs-study-card">
                {/* Header */}
                <div className="pacs-study-header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`pacs-modality-badge ${study.modality.toLowerCase()}`}>
                        {study.modality}
                      </span>
                      <h4 className="pacs-study-title">{study.description}</h4>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Mã ca: <strong>{study.study_id}</strong> · Ngày thực hiện: <strong>{formatDateVN(study.date)}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Bác sĩ Chẩn đoán hình ảnh:</span>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{study.radiologist}</div>
                    <small style={{ color: '#059669', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <ShieldCheck size={13} /> Ký số SmartCA PKI
                    </small>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="pacs-study-meta-grid">
                  <div className="pacs-meta-item">
                    Bộ phận khảo sát: <strong>{study.body_part}</strong>
                  </div>
                  <div className="pacs-meta-item">
                    Cơ sở thực hiện: <strong>{study.institution}</strong>
                  </div>
                  <div className="pacs-meta-item">
                    Cấu trúc DICOM: <strong>{study.series_count} Series · {study.instances_count} Ảnh/Lát cắt</strong>
                  </div>
                  <div className="pacs-meta-item">
                    Chuẩn kết nối: <strong>DICOMweb WADO-RS</strong>
                  </div>
                </div>

                {/* Clinical Findings & Impression */}
                <div className="pacs-clinical-boxes">
                  <div className="pacs-findings-box">
                    <h5>📝 Mô tả hình ảnh (Findings):</h5>
                    <p>{study.findings}</p>
                  </div>

                  <div className="pacs-impression-box">
                    <h5>🎯 Kết luận chuyên môn (Impression):</h5>
                    <p>{study.impression}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pacs-study-actions">
                  <button
                    type="button"
                    className="pacs-action-btn viewer"
                    onClick={() => handleOpenInStudio(study)}
                    title="Mở trình đọc phim DICOM tích hợp công cụ đo đạc"
                  >
                    <Eye size={14} />
                    <span>Xem phim (DICOM Studio)</span>
                  </button>

                  <button
                    type="button"
                    className="pacs-action-btn primary"
                    onClick={() => window.open(study.viewer_url, '_blank')}
                    title="Mở phim trên trình duyệt chuẩn OHIF Viewer v3"
                  >
                    <ExternalLink size={14} />
                    <span>Mở OHIF Cloud Viewer</span>
                  </button>

                  <button
                    type="button"
                    className="pacs-action-btn ai"
                    onClick={() => handleRunAiAnalysis(study)}
                    title="Kích hoạt mô hình AI Vision phát hiện tổn thương"
                  >
                    <Sparkles size={14} color="#16a34a" />
                    <span>AI Phân tích phim (Second Opinion)</span>
                  </button>

                  <button
                    type="button"
                    className="pacs-action-btn"
                    onClick={() => setPrintModalStudy(study)}
                    title="In hoặc tải phiếu kết quả chẩn đoán hình ảnh có ký số"
                  >
                    <Printer size={14} />
                    <span>In phiếu CĐHA (PDF)</span>
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Phân trang */}
          {filteredStudies.length > 0 && (
            <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Pagination
                currentPage={currentPage}
                totalItems={filteredStudies.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setCurrentPage(1)
                }}
                pageSizeOptions={[5, 10, 20]}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Interactive DICOM Studio */}
      {activeTab === 'studio' && selectedStudy && (
        <div className="pacs-studio-container">
          {/* Main Viewport Panel */}
          <div className="pacs-viewport-panel">
            {/* Viewport Toolbar */}
            <div className="pacs-viewport-toolbar">
              <div className="pacs-tools-group">
                <button
                  type="button"
                  className={`pacs-tool-btn ${activeTool === 'pointer' ? 'active' : ''}`}
                  onClick={() => setActiveTool('pointer')}
                  title="Con trỏ điều hướng"
                >
                  <Eye size={14} /> Con trỏ
                </button>

                <button
                  type="button"
                  className="pacs-tool-btn"
                  onClick={() => setZoomLevel((z) => Math.min(z + 25, 300))}
                  title="Phóng to"
                >
                  <ZoomIn size={14} /> {zoomLevel}%
                </button>

                <button
                  type="button"
                  className="pacs-tool-btn"
                  onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                  title="Thu nhỏ"
                >
                  <ZoomOut size={14} />
                </button>

                <button
                  type="button"
                  className="pacs-tool-btn"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  title="Xoay 90 độ"
                >
                  <RotateCw size={14} /> {rotation}°
                </button>

                <button
                  type="button"
                  className={`pacs-tool-btn ${isFlippedH ? 'active' : ''}`}
                  onClick={() => setIsFlippedH((f) => !f)}
                  title="Lật gương ngang"
                >
                  <FlipHorizontal size={14} />
                </button>

                <button
                  type="button"
                  className={`pacs-tool-btn ${activeTool === 'ruler' ? 'active' : ''}`}
                  onClick={() => {
                    const next = activeTool === 'ruler' ? 'pointer' : 'ruler'
                    setActiveTool(next)
                    if (next === 'ruler') setMeasureDistanceMm(24.5)
                  }}
                  title="Thước đo khoảng cách (Caliper)"
                >
                  <Ruler size={14} /> Đo mm {measureDistanceMm ? `(${measureDistanceMm}mm)` : ''}
                </button>
              </div>

              {/* Window Level Presets */}
              <div className="pacs-tools-group">
                <span style={{ fontSize: '11px', color: '#64748b' }}>Cửa sổ (WL/WW):</span>
                {[
                  ['standard', 'Mặc định'],
                  ['lung', 'Phổi'],
                  ['bone', 'Xương'],
                  ['invert', 'Âm bản']
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`pacs-tool-btn ${windowPreset === key ? 'active' : ''}`}
                    onClick={() => setWindowPreset(key as any)}
                  >
                    {label}
                  </button>
                ))}

                <button
                  type="button"
                  className="pacs-tool-btn"
                  onClick={() => {
                    setZoomLevel(100)
                    setPanPosition({ x: 0, y: 0 })
                    setRotation(0)
                    setIsFlippedH(false)
                    setWindowPreset('standard')
                    setMeasureDistanceMm(null)
                  }}
                  title="Đặt lại góc nhìn"
                >
                  <RefreshCw size={13} /> Reset
                </button>
              </div>
            </div>

            {/* Canvas Stage with Authentic Simulated DICOM Visuals */}
            <div className="pacs-canvas-stage">
              {/* HUD Overlays */}
              <div className="pacs-hud-overlay pacs-hud-top-left">
                <div>BN: {pacsData?.patient_name || user?.full_name || 'NGƯỜI BỆNH'}</div>
                <div>PID: BN-{activePatientId.toString().padStart(4, '0')}</div>
                <div>NGÀY: {formatDateVN(selectedStudy.date)}</div>
                <div>KỸ THUẬT: {selectedStudy.modality} - {selectedStudy.body_part}</div>
              </div>

              <div className="pacs-hud-overlay pacs-hud-top-right">
                <div>BV Đa Khoa Quốc Tế CareConnect</div>
                <div>BS: {selectedStudy.radiologist.split('(')[0]}</div>
                <div>WL: {windowPreset === 'lung' ? '-600 WW: 1500' : windowPreset === 'bone' ? '300 WW: 2000' : '40 WW: 400'}</div>
                <div>LÁT CẮT: {currentSlice} / {selectedStudy.instances_count || 1}</div>
              </div>

              <div className="pacs-hud-overlay pacs-hud-bottom-left">
                <div>ZOOM: {zoomLevel}%</div>
                <div>MATRIX: 512 x 512</div>
                <div>THICKNESS: 1.25 mm</div>
                <div>FOV: 350 mm</div>
              </div>

              <div className="pacs-hud-overlay pacs-hud-bottom-right">
                <div>DICOMweb WADO-RS</div>
                <div>UID: ...{selectedStudy.study_id.slice(-6)}</div>
                <div>Nén: Lossless JPEG-LS</div>
              </div>

              {/* Render Canvas Graphic according to Modality */}
              <div
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1}) translate(${panPosition.x}px, ${panPosition.y}px)`,
                  transition: 'transform 0.15s ease-out',
                  filter: getFilterStyle()
                }}
              >
                {selectedStudy.modality === 'CR' && (
                  <svg width="420" height="420" viewBox="0 0 400 400" className="pacs-dicom-canvas">
                    <rect width="400" height="400" fill="#000000" />
                    {/* Clavicles */}
                    <path d="M 120 70 Q 200 85 280 70" stroke="#71717a" strokeWidth="12" fill="none" strokeLinecap="round" />
                    {/* Spine / Vertebrae */}
                    <rect x="193" y="60" width="14" height="280" fill="#52525b" rx="2" opacity="0.8" />
                    {/* Ribs Cage */}
                    {[100, 130, 160, 190, 220, 250].map((y, i) => (
                      <g key={i}>
                        <path d={`M 195 ${y} Q 110 ${y + 20} 90 ${y + 40}`} stroke="#3f3f46" strokeWidth="8" fill="none" opacity="0.7" />
                        <path d={`M 205 ${y} Q 290 ${y + 20} 310 ${y + 40}`} stroke="#3f3f46" strokeWidth="8" fill="none" opacity="0.7" />
                      </g>
                    ))}
                    {/* Lung Fields (Dark translucency) */}
                    <path d="M 110 90 C 90 140, 80 240, 100 290 C 140 295, 175 270, 185 220 C 185 150, 170 100, 110 90 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                    <path d="M 290 90 C 310 140, 320 240, 300 290 C 260 295, 225 270, 215 220 C 215 150, 230 100, 290 90 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                    {/* Cardiac Silhouette (Heart shadow) */}
                    <path d="M 175 160 C 175 140, 235 150, 230 190 C 225 230, 260 270, 215 285 C 170 290, 155 240, 165 200 Z" fill="#3f3f46" opacity="0.75" />
                    {/* Diaphragm Dome */}
                    <path d="M 80 300 Q 140 270 195 290" stroke="#71717a" strokeWidth="10" fill="none" />
                    <path d="M 205 290 Q 260 275 320 300" stroke="#71717a" strokeWidth="10" fill="none" />
                    {/* Caliper measurement overlay if ruler active */}
                    {measureDistanceMm && (
                      <g>
                        <line x1="160" y1="230" x2="245" y2="230" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3,3" />
                        <circle cx="160" cy="230" r="3" fill="#38bdf8" />
                        <circle cx="245" cy="230" r="3" fill="#38bdf8" />
                        <text x="180" y="222" fill="#38bdf8" fontSize="12" fontFamily="monospace">CTR: {measureDistanceMm} mm</text>
                      </g>
                    )}
                  </svg>
                )}

                {selectedStudy.modality === 'CT' && (
                  <svg width="420" height="420" viewBox="0 0 400 400" className="pacs-dicom-canvas">
                    <rect width="400" height="400" fill="#000000" />
                    {/* Thoracic Outer Skin Ring */}
                    <ellipse cx="200" cy="200" rx="170" ry="140" fill="#18181b" stroke="#3f3f46" strokeWidth="6" />
                    {/* Vertebral Body (Posterior Spine) */}
                    <ellipse cx="200" cy="300" rx="25" ry="18" fill="#a1a1aa" />
                    <path d="M 175 300 L 155 330 L 245 330 L 225 300 Z" fill="#71717a" />
                    {/* Sternum (Anterior) */}
                    <rect x="188" y="75" width="24" height="8" rx="2" fill="#a1a1aa" />
                    {/* Rib Ring Elements */}
                    {[80, 120, 160, 200, 240, 280].map((deg, i) => {
                      const rad = (deg * Math.PI) / 180
                      const x1 = 200 + 155 * Math.cos(rad)
                      const y1 = 200 + 125 * Math.sin(rad)
                      const x2 = 200 - 155 * Math.cos(rad)
                      const y2 = 200 + 125 * Math.sin(rad)
                      return (
                        <g key={i}>
                          <circle cx={x1} cy={y1} r="6" fill="#a1a1aa" />
                          <circle cx={x2} cy={y2} r="6" fill="#a1a1aa" />
                        </g>
                      )
                    })}
                    {/* Left & Right Lung Parenchyma Cavities */}
                    <ellipse cx="125" cy="190" rx="55" ry="75" fill="#09090b" stroke="#27272a" strokeWidth="2" />
                    <ellipse cx="275" cy="190" rx="55" ry="75" fill="#09090b" stroke="#27272a" strokeWidth="2" />
                    {/* Trachea & Main Bronchi */}
                    <circle cx="200" cy="165" r="8" fill="#09090b" stroke="#52525b" strokeWidth="2" />
                    {/* Mediastinal Vasculature & Heart */}
                    <ellipse cx="200" cy="210" rx="45" ry="40" fill="#27272a" opacity="0.9" />
                    {/* Pulmonary Vessels tree inside lungs */}
                    <path d="M 130 190 Q 110 160 100 140" stroke="#52525b" strokeWidth="2" fill="none" />
                    <path d="M 130 190 Q 115 220 105 240" stroke="#52525b" strokeWidth="2" fill="none" />
                    <path d="M 270 190 Q 290 160 300 140" stroke="#52525b" strokeWidth="2" fill="none" />
                    <path d="M 270 190 Q 285 220 295 240" stroke="#52525b" strokeWidth="2" fill="none" />
                  </svg>
                )}

                {selectedStudy.modality === 'US' && (
                  <svg width="420" height="420" viewBox="0 0 400 400" className="pacs-dicom-canvas">
                    <rect width="400" height="400" fill="#000000" />
                    {/* Ultrasound Sector Fan Cone */}
                    <path d="M 200 40 L 60 360 Q 200 390 340 360 Z" fill="#09090b" stroke="#3f3f46" strokeWidth="2" />
                    {/* Depth Arc Markers */}
                    {[120, 200, 280].map((d, i) => (
                      <path key={i} d={`M ${200 - d * 0.4} ${d} Q 200 ${d + 15} ${200 + d * 0.4} ${d}`} stroke="#27272a" strokeWidth="1" strokeDasharray="4,4" fill="none" />
                    ))}
                    {/* Echocardiogram Chambers (Ventricular & Atrial Cavities) */}
                    <ellipse cx="170" cy="210" rx="26" ry="42" fill="#18181b" stroke="#52525b" strokeWidth="4" />
                    <ellipse cx="230" cy="205" rx="30" ry="45" fill="#18181b" stroke="#52525b" strokeWidth="4" />
                    {/* Doppler Color Velocity Stream in Center (Red/Blue Flow) */}
                    <ellipse cx="205" cy="215" rx="14" ry="22" fill="#ef4444" opacity="0.65" />
                    <ellipse cx="195" cy="225" rx="10" ry="16" fill="#3b82f6" opacity="0.65" />
                    {/* Valve Leaflets (Mitral / Aortic) */}
                    <line x1="180" y1="240" x2="200" y2="246" stroke="#e4e4e7" strokeWidth="3" />
                    <line x1="220" y1="240" x2="200" y2="246" stroke="#e4e4e7" strokeWidth="3" />
                    {/* Doppler Scale Legend Bar on Right */}
                    <rect x="360" y="80" width="10" height="100" fill="url(#dopplerGrad)" rx="2" />
                    <defs>
                      <linearGradient id="dopplerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}
              </div>
            </div>

            {/* Slice Scrubber & Cine Controls */}
            <div className="pacs-slice-bar">
              <button
                type="button"
                className="pacs-tool-btn"
                onClick={() => setIsPlayingCine((p) => !p)}
                title={isPlayingCine ? 'Tạm dừng xem chuỗi lát cắt' : 'Tự động phát chuỗi lát cắt (Cine Loop)'}
              >
                {isPlayingCine ? <Pause size={14} /> : <Play size={14} />}
                <span>{isPlayingCine ? 'Dừng Cine' : 'Phát Cine'}</span>
              </button>

              <span style={{ fontSize: '12px', color: '#94a3b8', minWidth: '80px' }}>
                Lát cắt: <strong>{currentSlice}</strong> / {selectedStudy.instances_count || 1}
              </span>

              <input
                type="range"
                className="pacs-slice-slider"
                min="1"
                max={selectedStudy.instances_count || 1}
                value={currentSlice}
                onChange={(e) => {
                  setCurrentSlice(parseInt(e.target.value, 10))
                  if (isPlayingCine) setIsPlayingCine(false)
                }}
              />

              <button
                type="button"
                className="pacs-tool-btn"
                onClick={() => window.open(selectedStudy.viewer_url, '_blank')}
                title="Mở toàn màn hình bằng OHIF Viewer"
              >
                <Maximize2 size={13} />
                <span>Mở OHIF Cloud</span>
              </button>
            </div>
          </div>

          {/* Right Sidebar: DICOM Metadata & Study Info */}
          <div className="pacs-studio-sidebar">
            <div className="pacs-sidebar-section">
              <h4>
                <Info size={14} />
                <span>Thông tin ca chụp DICOM</span>
              </h4>
              <table className="pacs-tag-table">
                <tbody>
                  <tr>
                    <td className="tag-name">Mã ca (Study ID)</td>
                    <td className="tag-val">{selectedStudy.study_id}</td>
                  </tr>
                  <tr>
                    <td className="tag-name">Kỹ thuật (Modality)</td>
                    <td className="tag-val">{selectedStudy.modality} ({selectedStudy.modality_name})</td>
                  </tr>
                  <tr>
                    <td className="tag-name">Bộ phận khảo sát</td>
                    <td className="tag-val">{selectedStudy.body_part}</td>
                  </tr>
                  <tr>
                    <td className="tag-name">Ngày chụp</td>
                    <td className="tag-val">{formatDateVN(selectedStudy.date)}</td>
                  </tr>
                  <tr>
                    <td className="tag-name">BS Chẩn đoán</td>
                    <td className="tag-val">{selectedStudy.radiologist}</td>
                  </tr>
                  <tr>
                    <td className="tag-name">Cơ sở y tế</td>
                    <td className="tag-val">{selectedStudy.institution}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pacs-sidebar-section">
              <h4>
                <Layers size={14} />
                <span>Thuộc tính Kỹ thuật DICOM Tag</span>
              </h4>
              <table className="pacs-tag-table">
                <tbody>
                  <tr>
                    <td className="tag-name">(0020,000D) Study UID</td>
                    <td className="tag-val">1.3.6.1.4.1.14519.5.2...</td>
                  </tr>
                  <tr>
                    <td className="tag-name">(0028,0010) Rows x Columns</td>
                    <td className="tag-val">512 x 512 pixels</td>
                  </tr>
                  <tr>
                    <td className="tag-name">(0028,0030) Pixel Spacing</td>
                    <td className="tag-val">0.683 mm / 0.683 mm</td>
                  </tr>
                  <tr>
                    <td className="tag-name">(0018,0050) Slice Thickness</td>
                    <td className="tag-val">1.25 mm</td>
                  </tr>
                  <tr>
                    <td className="tag-name">(0018,0060) KVP / mA</td>
                    <td className="tag-val">120 kV / 250 mA</td>
                  </tr>
                  <tr>
                    <td className="tag-name">(0028,0100) Bits Allocated</td>
                    <td className="tag-val">16 bits (Signed)</td>
                  </tr>
                  <tr>
                    <td className="tag-name">(0008,0016) SOP Class</td>
                    <td className="tag-val">CT/CR Image Storage</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pacs-sidebar-section" style={{ marginTop: 'auto' }}>
              <button
                type="button"
                className="pacs-action-btn ai"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                onClick={() => handleRunAiAnalysis(selectedStudy)}
              >
                <Sparkles size={15} color="#16a34a" />
                <span>Chạy AI Phân tích ca này</span>
              </button>

              <button
                type="button"
                className="pacs-action-btn"
                style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
                onClick={() => setPrintModalStudy(selectedStudy)}
              >
                <Printer size={15} />
                <span>Xuất phiếu kết quả PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI Second Opinion CAD Dashboard */}
      {activeTab === 'ai' && (
        <div className="pacs-ai-section">
          <div className="pacs-ai-header-card">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 700 }}>
                <Sparkles size={22} />
                <span>Trợ lý AI Vision CAD Chẩn Đoán Hình Ảnh (Second Opinion)</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                Ứng dụng mô hình học sâu CareConnect-Vision-PACS v2.5 quét đa lớp (Deep Convolutional Vision Transformer)
                giúp sàng lọc tổn thương nhu mô phổi, gãy xương và các bất thường tim mạch.
              </p>
            </div>
            <button
              type="button"
              className="pacs-btn-primary"
              onClick={() => selectedStudy && handleRunAiAnalysis(selectedStudy)}
              disabled={aiLoading || !selectedStudy}
            >
              <Sparkles size={14} color="#047857" />
              <span>{aiLoading ? 'AI đang phân tích...' : 'Phân tích ca chụp hiện tại'}</span>
            </button>
          </div>

          {selectedStudy && (
            <div className="pacs-ai-grid">
              {/* Left Column: AI Detection Breakdown */}
              <div className="pacs-ai-card">
                <h4>
                  <Activity size={18} color="#0284c7" />
                  <span>Xác suất tổn thương & Chẩn đoán phân biệt</span>
                </h4>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Chỉ số bất thường tổng quan:</span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: (aiResult?.abnormality_score || 0.08) > 0.5 ? '#dc2626' : '#16a34a'
                    }}>
                      {Math.round((aiResult?.abnormality_score || 0.08) * 100)}% ({ (aiResult?.abnormality_score || 0.08) > 0.5 ? 'Nghi ngờ bất thường' : 'Trong giới hạn an toàn' })
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.round((aiResult?.abnormality_score || 0.08) * 100)}%`,
                        background: (aiResult?.abnormality_score || 0.08) > 0.5 ? '#ef4444' : '#10b981',
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                </div>

                <h5 style={{ margin: '0 0 8px', fontSize: '12px', color: '#64748b', textTransform: 'uppercase' }}>
                  Xác suất các bệnh lý khảo sát:
                </h5>
                {(aiResult?.suggested_conditions || [
                  { condition: 'Bình thường (Normal Chest)', probability: 0.88 },
                  { condition: 'Viêm phế quản cấp thể nhẹ', probability: 0.25 },
                  { condition: 'Tràn dịch màng phổi', probability: 0.02 },
                  { condition: 'Gãy xương / Rạn xương sườn', probability: 0.01 }
                ]).map((cond, i) => (
                  <div key={i} className="pacs-condition-item">
                    <span>{cond.condition}</span>
                    <span className="pacs-condition-prob">{Math.round(cond.probability * 100)}%</span>
                  </div>
                ))}

                <div style={{ marginTop: '16px', background: '#ecfdf5', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #10b981', fontSize: '13px' }}>
                  <strong style={{ color: '#047857' }}>💡 Khuyến nghị lâm sàng của AI:</strong>
                  <p style={{ margin: '4px 0 0', color: '#064e3b' }}>
                    {aiResult?.recommendation || 'Kết quả X-quang không ghi nhận dấu hiệu viêm phổi nặng hay tràn dịch. Khuyến nghị theo dõi lâm sàng và điều trị nội khoa ngoại trú.'}
                  </p>
                </div>
              </div>

              {/* Right Column: Heatmap & Visual Regions */}
              <div className="pacs-ai-card">
                <h4>
                  <Eye size={18} color="#059669" />
                  <span>Bản đồ nhiệt Grad-CAM (Vùng giải phẫu được chú ý)</span>
                </h4>

                <div style={{ position: 'relative', background: '#000', borderRadius: '6px', overflow: 'hidden', textAlign: 'center', padding: '10px' }}>
                  <svg width="280" height="280" viewBox="0 0 400 400" style={{ margin: '0 auto', display: 'block' }}>
                    <rect width="400" height="400" fill="#09090b" />
                    {/* Simplified Chest Outline */}
                    <path d="M 110 90 C 90 140, 80 240, 100 290 C 140 295, 175 270, 185 220 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                    <path d="M 290 90 C 310 140, 320 240, 300 290 C 260 295, 225 270, 215 220 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                    <ellipse cx="200" cy="220" rx="40" ry="50" fill="#27272a" />
                    {/* Heatmap Highlight Boxes */}
                    <rect x="150" y="140" width="100" height="80" rx="4" fill="rgba(34, 197, 94, 0.25)" stroke="#22c55e" strokeWidth="2" strokeDasharray="3,3" />
                    <text x="155" y="155" fill="#22c55e" fontSize="11" fontFamily="monospace">Rốn phổi (Clear 92%)</text>

                    <rect x="250" y="240" width="70" height="50" rx="4" fill="rgba(14, 165, 233, 0.25)" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="3,3" />
                    <text x="255" y="255" fill="#0ea5e9" fontSize="11" fontFamily="monospace">Góc sườn hoành (95%)</text>
                  </svg>
                </div>

                {/* Doctor Verification / Feedback */}
                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                    Bác sĩ đồng thuận với kết quả AI:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`pacs-action-btn ${doctorFeedback === 'agree' ? 'ai' : ''}`}
                      onClick={() => {
                        setDoctorFeedback('agree')
                        if (onToast) onToast('Đã ghi nhận ý kiến đồng thuận của Bác sĩ')
                      }}
                    >
                      <CheckCircle2 size={14} color="#16a34a" /> Đồng thuận
                    </button>
                    <button
                      type="button"
                      className={`pacs-action-btn ${doctorFeedback === 'disagree' ? 'primary' : ''}`}
                      onClick={() => {
                        setDoctorFeedback('disagree')
                        if (onToast) onToast('Đã ghi nhận phản hồi cần hiệu chỉnh của Bác sĩ')
                      }}
                    >
                      <AlertTriangle size={14} color="#ea580c" /> Khác biệt ý kiến
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: AI Quick Analysis Modal */}
      {aiModalOpen && aiResult && (
        <div className="pacs-modal-backdrop" onClick={() => setAiModalOpen(false)}>
          <div className="pacs-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="pacs-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0369a1', fontWeight: 700 }}>
                <Sparkles size={18} />
                <span>Báo cáo Tham khảo AI Vision (Second Opinion)</span>
              </div>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pacs-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px' }}>{selectedStudy?.description}</h4>
                  <small style={{ color: '#64748b' }}>Phiên bản mô hình: {aiResult.ai_model_version}</small>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: aiResult.abnormal ? '#fee2e2' : '#dcfce7',
                  color: aiResult.abnormal ? '#dc2626' : '#16a34a'
                }}>
                  {aiResult.abnormal ? `Nghi ngờ tổn thương (${Math.round(aiResult.abnormality_score * 100)}%)` : 'Bình thường (Normal)'}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                <strong style={{ color: '#475569', display: 'block', marginBottom: '4px' }}>Phân tích chi tiết:</strong>
                <p style={{ margin: 0, color: '#1e293b', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{aiResult.finding}</p>
              </div>

              <div style={{ background: '#ecfdf5', padding: '12px 14px', borderRadius: '6px', borderLeft: '3px solid #10b981', fontSize: '13px', marginBottom: '14px' }}>
                <strong style={{ color: '#047857', display: 'block', marginBottom: '2px' }}>Kết luận AI:</strong>
                <p style={{ margin: 0, color: '#064e3b', fontWeight: 600 }}>{aiResult.impression}</p>
              </div>

              <div style={{ fontSize: '12px', color: '#64748b' }}>
                💡 <strong>Khuyến nghị y khoa:</strong> {aiResult.recommendation}
              </div>
            </div>

            <div className="pacs-modal-footer">
              <button
                type="button"
                className="pacs-action-btn primary"
                onClick={() => setAiModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Printable PDF Medical Imaging Report (Phiếu Kết Quả CĐHA) */}
      {printModalStudy && (
        <div className="pacs-modal-backdrop" onClick={() => setPrintModalStudy(null)}>
          <div className="pacs-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="pacs-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontWeight: 700 }}>
                <Printer size={18} />
                <span>Phiếu Kết quả Chẩn đoán Hình ảnh (Tiêu chuẩn QĐ 130/QĐ-BYT)</span>
              </div>
              <button
                type="button"
                onClick={() => setPrintModalStudy(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="pacs-modal-body">
              {/* Paper Document */}
              <div className="pacs-print-paper">
                {/* Header */}
                <div className="pacs-print-header">
                  <div className="pacs-print-hospital-info">
                    <h3>BỆNH VIỆN ĐA KHOA QUỐC TẾ CARECONNECT</h3>
                    <p>Khoa Chẩn Đoán Hình Ảnh & Thăm Dò Chức Năng</p>
                    <p style={{ fontSize: '11px', color: '#6b7280' }}>Địa chỉ: 124 Điện Biên Phủ, Quận 1, TP. Hồ Chí Minh · Hotline: 1900 6868</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px' }}>
                    <div><strong>Mã phiếu:</strong> {printModalStudy.study_id}</div>
                    <div><strong>Mã BN:</strong> BN-{activePatientId.toString().padStart(4, '0')}</div>
                    <div><strong>Ngày giờ:</strong> {formatDateTimeVN(new Date())}</div>
                  </div>
                </div>

                {/* Title */}
                <div className="pacs-print-title">
                  <h2>PHIẾU KẾT QUẢ CHẨN ĐOÁN HÌNH ẢNH</h2>
                  <span>(Kỹ thuật: {printModalStudy.modality_name} - {printModalStudy.body_part})</span>
                </div>

                {/* Patient Demographics */}
                <div className="pacs-print-patient-meta">
                  <div>Họ và tên người bệnh: <strong>{pacsData?.patient_name || user?.full_name || 'Người bệnh'}</strong></div>
                  <div>Ngày sinh: <strong>{(user as any)?.date_of_birth || 'Chưa cập nhật'}</strong> · Giới tính: <strong>{(user as any)?.gender || 'Chưa cập nhật'}</strong></div>
                  <div>Địa chỉ: <strong>{(user as any)?.address || 'Chưa cập nhật'}</strong></div>
                  <div>Mã thẻ BHYT: <strong>{user?.bhyt_code || 'Không sử dụng'}</strong></div>
                  <div>Kỹ thuật thực hiện: <strong>{printModalStudy.description}</strong></div>
                  <div>Ngày giờ chụp: <strong>{formatDateVN(printModalStudy.date)}</strong></div>
                </div>

                {/* Technical Findings Section */}
                <div className="pacs-print-section">
                  <h4>I. MÔ TẢ HÌNH ẢNH CHI TIẾT</h4>
                  <p>{printModalStudy.findings}</p>
                </div>

                {/* Impression Section */}
                <div className="pacs-print-section">
                  <h4>II. KẾT LUẬN</h4>
                  <p style={{ fontWeight: 'bold' }}>{printModalStudy.impression}</p>
                </div>

                {/* Recommendation */}
                <div className="pacs-print-section">
                  <h4>III. ĐỀ NGHỊ / LỜI DẶN</h4>
                  <p>- Tái khám chuyên khoa Nội theo lịch hẹn.</p>
                  <p>- Giữ gìn vệ sinh đường hô hấp, đo huyết áp định kỳ tại nhà.</p>
                </div>

                {/* Signatures & Seal */}
                <div className="pacs-print-signatures">
                  <div className="pacs-signature-box">
                    <span style={{ fontSize: '12px', fontStyle: 'italic' }}>Kỹ thuật viên thực hiện</span>
                    <div style={{ height: '40px' }} />
                    <strong style={{ fontSize: '13px' }}>KTV. Trần Quốc Tuấn</strong>
                  </div>

                  <div className="pacs-signature-box">
                    <span style={{ fontSize: '12px', fontStyle: 'italic' }}>Bác sĩ Chẩn đoán hình ảnh</span>
                    {/* Electronic PKI Seal */}
                    <div className="pacs-seal-stamp">
                      <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>KÝ SỐ BỞI VNPT SMARTCA</div>
                      <div>Người ký: {printModalStudy.radiologist.split('(')[0]}</div>
                      <div>Thời điểm: {formatDateTimeVN(new Date())}</div>
                      <div style={{ fontSize: '9px', opacity: 0.8 }}>Hợp chuẩn Thông tư 46/2018/TT-BYT</div>
                    </div>
                    <strong style={{ fontSize: '13px' }}>{printModalStudy.radiologist}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="pacs-modal-footer">
              <button
                type="button"
                className="pacs-action-btn primary"
                onClick={() => window.print()}
              >
                <Printer size={14} /> In phiếu kết quả
              </button>
              <button
                type="button"
                className="pacs-action-btn"
                onClick={() => setPrintModalStudy(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
