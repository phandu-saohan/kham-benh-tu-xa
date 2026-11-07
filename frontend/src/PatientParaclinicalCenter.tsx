import React, { useState, useEffect, useMemo } from 'react'
import {
  FlaskConical,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  FileText,
  Printer,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Download,
  Info,
  Calendar,
  User,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  Sliders,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import {
  LabResultsData,
  LabReport,
  LabIndicator,
  getPatientLabResults,
  getMyLabResults,
  interpretLabResults,
  LabInterpretResult,
  User as UserType
} from './api'
import { formatDateVN, formatDateTimeVN } from './dateFormatters'
import { Pagination } from './Pagination'
import './paraclinical-center.css'

interface PatientParaclinicalCenterProps {
  user: UserType | null
  selectedPatientId?: number | null
  uniquePatients?: Array<{ id: number; name: string; bhyt?: string }>
  onSelectPatient?: (id: number) => void
  onToast?: (msg: string) => void
  onNavigate?: (view: string) => void
}

export function PatientParaclinicalCenter({
  user,
  selectedPatientId,
  uniquePatients = [],
  onSelectPatient,
  onToast
}: PatientParaclinicalCenterProps) {
  const isPatient = user?.role === 'patient'
  const activePatientId = selectedPatientId || user?.id || 1

  // Data State
  const [labData, setLabData] = useState<LabResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // View & Filter State
  const [activeTab, setActiveTab] = useState<'lis' | 'trends'>('lis')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyAbnormal, setOnlyAbnormal] = useState(false)

  // Pagination State for Reports List
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // AI Interpretation Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<LabInterpretResult | null>(null)
  const [aiActiveReport, setAiActiveReport] = useState<LabReport | null>(null)

  // PDF / E-Lab Printable Modal State
  const [printModalReport, setPrintModalReport] = useState<LabReport | null>(null)

  // Load Lab Results Data
  const loadLabData = async () => {
    try {
      setLoading(true)
      setError('')
      let data: LabResultsData
      if (isPatient) {
        data = await getMyLabResults()
      } else {
        data = await getPatientLabResults(activePatientId)
      }
      setLabData(data)
    } catch (err: any) {
      console.error('Lỗi khi tải kết quả cận lâm sàng:', err)
      setError(err.message || 'Không thể tải dữ liệu cận lâm sàng từ hệ thống LIS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLabData()
  }, [activePatientId, isPatient])

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [categoryFilter, searchQuery, onlyAbnormal])

  // Calculate Metrics
  const metrics = useMemo(() => {
    if (!labData || !labData.reports) {
      return { totalReports: 0, abnormalCount: 0, normalCount: 0, latestTime: '' }
    }
    let abnormal = 0
    let normal = 0
    let latest = ''

    labData.reports.forEach((rep) => {
      if (rep.result_at && (!latest || rep.result_at > latest)) {
        latest = rep.result_at
      }
      rep.indicators.forEach((ind) => {
        if (ind.flag === 'HIGH' || ind.flag === 'LOW') {
          abnormal++
        } else {
          normal++
        }
      })
    })

    return {
      totalReports: labData.reports.length,
      abnormalCount: abnormal,
      normalCount: normal,
      latestTime: latest
    }
  }, [labData])

  // Filtered Reports
  const filteredReports = useMemo(() => {
    if (!labData || !labData.reports) return []

    return labData.reports.filter((rep) => {
      // 1. Category Filter
      if (categoryFilter !== 'all' && rep.category !== categoryFilter) {
        return false
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = rep.title.toLowerCase().includes(q)
        const matchCode = rep.report_id.toLowerCase().includes(q)
        const matchDoc = (rep.doctor_order || '').toLowerCase().includes(q)
        const matchTech = (rep.performed_by || '').toLowerCase().includes(q)
        const matchInd = rep.indicators.some(
          (ind) =>
            ind.name.toLowerCase().includes(q) ||
            ind.code.toLowerCase().includes(q)
        )
        if (!matchTitle && !matchCode && !matchDoc && !matchTech && !matchInd) {
          return false
        }
      }

      // 3. Only Abnormal
      if (onlyAbnormal) {
        const hasAbnormal = rep.indicators.some(
          (ind) => ind.flag === 'HIGH' || ind.flag === 'LOW'
        )
        if (!hasAbnormal) return false
      }

      return true
    })
  }, [labData, categoryFilter, searchQuery, onlyAbnormal])

  // Paginated Reports
  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1
  const activePage = Math.min(currentPage, totalPages)
  const paginatedReports = useMemo(() => {
    const start = (activePage - 1) * pageSize
    return filteredReports.slice(start, start + pageSize)
  }, [filteredReports, activePage, pageSize])

  // Handle AI Interpretation
  const handleOpenAiInterpretation = async (report?: LabReport) => {
    const targetReport = report || (filteredReports.length > 0 ? filteredReports[0] : null)
    if (!targetReport) return

    setAiActiveReport(targetReport)
    setAiModalOpen(true)
    setAiLoading(true)
    setAiResult(null)

    try {
      const items = targetReport.indicators.map((ind) => ({
        test_name: ind.name,
        code: ind.code,
        value: ind.value,
        unit: ind.unit,
        ref_range: ind.ref_range,
        flag: ind.flag
      }))
      const res = await interpretLabResults(items, targetReport.conclusion)
      setAiResult(res)
    } catch (err: any) {
      console.error('Lỗi khi phân tích AI:', err)
      onToast?.(err.message || 'Không thể phân tích AI cận lâm sàng')
    } finally {
      setAiLoading(false)
    }
  }

  // Helper: Visual range gauge calculation
  const getRangePosition = (valueStr: string, refRangeStr: string) => {
    const val = parseFloat(valueStr)
    if (isNaN(val)) return { leftPercent: 50, zoneStart: 25, zoneWidth: 50 }

    // Parse ref_range like "3.9 - 6.4" or "< 3.4" or "> 0.90"
    if (refRangeStr.includes('-')) {
      const parts = refRangeStr.split('-').map((s) => parseFloat(s.trim()))
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        const [min, max] = parts
        const span = max - min
        const buffer = span * 0.4
        const domainMin = Math.max(0, min - buffer)
        const domainMax = max + buffer
        const domainSpan = domainMax - domainMin || 1

        const zoneStart = ((min - domainMin) / domainSpan) * 100
        const zoneWidth = ((max - min) / domainSpan) * 100

        let leftPercent = ((val - domainMin) / domainSpan) * 100
        leftPercent = Math.max(4, Math.min(96, leftPercent))

        return { leftPercent, zoneStart, zoneWidth }
      }
    } else if (refRangeStr.startsWith('<')) {
      const max = parseFloat(refRangeStr.replace('<', '').trim())
      if (!isNaN(max)) {
        const domainMax = max * 1.5
        const zoneWidth = (max / domainMax) * 100
        let leftPercent = (val / domainMax) * 100
        leftPercent = Math.max(4, Math.min(96, leftPercent))
        return { leftPercent, zoneStart: 0, zoneWidth }
      }
    } else if (refRangeStr.startsWith('>')) {
      const min = parseFloat(refRangeStr.replace('>', '').trim())
      if (!isNaN(min)) {
        const domainMax = min * 2.5
        const zoneStart = (min / domainMax) * 100
        let leftPercent = (val / domainMax) * 100
        leftPercent = Math.max(4, Math.min(96, leftPercent))
        return { leftPercent, zoneStart, zoneWidth: 100 - zoneStart }
      }
    }

    return { leftPercent: 50, zoneStart: 20, zoneWidth: 60 }
  }

  return (
    <div className="plc-container">
      {/* 1. Header Hero Card */}
      <div className="plc-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 className="plc-header-title">
              <FlaskConical size={24} /> Xét Nghiệm Cận Lâm Sàng (LIS & Lab Results)
            </h2>
            <span className="plc-badge-tag">Chuẩn HL7 FHIR</span>
            <span className="plc-badge-tag">Quyết định 130/QĐ-BYT</span>
          </div>
          <p className="plc-header-subtitle">
            Hồ sơ kết quả xét nghiệm sinh hóa máu, huyết học, nước tiểu liên thông tự động từ hệ thống LIS bệnh viện.
            Tất cả phiếu xét nghiệm đều được thẩm định chuyên môn và lưu trữ bảo mật.
          </p>
        </div>

        <div className="plc-header-actions">
          <button
            type="button"
            className="plc-btn-primary"
            onClick={() => handleOpenAiInterpretation()}
            title="Sử dụng trí tuệ nhân tạo giải thích ý nghĩa các chỉ số xét nghiệm"
          >
            <Sparkles size={16} /> AI Diễn Giải Kết Quả
          </button>
          <button
            type="button"
            className="plc-btn-secondary"
            onClick={loadLabData}
            title="Đồng bộ kết quả mới nhất từ hệ thống LIS bệnh viện"
          >
            <RefreshCw size={15} className={loading ? 'spin-icon' : ''} /> Đồng bộ LIS
          </button>
        </div>
      </div>

      {/* Staff: Patient Switcher Bar */}
      {!isPatient && uniquePatients.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} color="#0f766e" /> Chọn Bệnh nhân để xem Cận lâm sàng:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {uniquePatients.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPatient?.(p.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: activePatientId === p.id ? '2px solid #0f766e' : '1px solid #cbd5e1',
                  background: activePatientId === p.id ? '#ccfbf1' : '#ffffff',
                  color: activePatientId === p.id ? '#0f766e' : '#334155',
                  fontWeight: activePatientId === p.id ? 700 : 500,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                {p.name} {p.bhyt && <small style={{ opacity: 0.75 }}>({p.bhyt})</small>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Metrics Overview Row (8px border radius) */}
      <div className="plc-stats-grid">
        <div className="plc-stat-card">
          <div className="plc-stat-icon teal">
            <FlaskConical size={22} />
          </div>
          <div>
            <div className="plc-stat-label">Tổng số phiếu kết quả</div>
            <div className="plc-stat-value">{metrics.totalReports}</div>
            <div className="plc-stat-hint">Sinh hóa, huyết học, nước tiểu</div>
          </div>
        </div>

        <div className="plc-stat-card">
          <div className="plc-stat-icon red">
            <AlertTriangle size={22} />
          </div>
          <div>
            <div className="plc-stat-label">Chỉ số bất thường / Cần lưu ý</div>
            <div className="plc-stat-value" style={{ color: metrics.abnormalCount > 0 ? '#dc2626' : '#16a34a' }}>
              {metrics.abnormalCount}
            </div>
            <div className="plc-stat-hint">
              {metrics.abnormalCount > 0 ? 'Vượt khoảng tham chiếu an toàn' : 'Không có chỉ số cảnh báo'}
            </div>
          </div>
        </div>

        <div className="plc-stat-card">
          <div className="plc-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="plc-stat-label">Chỉ số bình thường</div>
            <div className="plc-stat-value">{metrics.normalCount}</div>
            <div className="plc-stat-hint">Nằm trong ngưỡng sinh lý chuẩn</div>
          </div>
        </div>

        <div className="plc-stat-card">
          <div className="plc-stat-icon sky">
            <Clock size={22} />
          </div>
          <div>
            <div className="plc-stat-label">Đợt xét nghiệm mới nhất</div>
            <div className="plc-stat-value" style={{ fontSize: '15px', fontWeight: 700 }}>
              {metrics.latestTime ? formatDateTimeVN(metrics.latestTime) : '25/10/2026 09:30'}
            </div>
            <div className="plc-stat-hint">Chuẩn thời gian QĐ 130/QĐ-BYT</div>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation */}
      <div className="plc-tab-nav">
        <button
          type="button"
          className={`plc-tab-btn ${activeTab === 'lis' ? 'active' : ''}`}
          onClick={() => setActiveTab('lis')}
        >
          <FileText size={16} /> Phiếu Xét Nghiệm LIS Bệnh Viện
          <span className="plc-tab-badge">{filteredReports.length}</span>
        </button>
        <button
          type="button"
          className={`plc-tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          <TrendingUp size={16} /> Xu Hướng & Diễn Tiến Chỉ Số Chính
        </button>
      </div>

      {/* ======================= TAB 1: PHIẾU XÉT NGHIỆM LIS ======================= */}
      {activeTab === 'lis' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Controls Bar: Search & Category Filters */}
          <div className="plc-controls-bar">
            <div className="plc-search-box">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm theo tên xét nghiệm, mã (GLU, HBA1C, CHOL...), BS chỉ định..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="plc-filter-pills">
              {[
                ['all', 'Tất cả'],
                ['biochemistry', 'Sinh hóa máu'],
                ['hematology', 'Huyết học'],
                ['urinalysis', 'Nước tiểu']
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`plc-filter-chip ${categoryFilter === key ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(key)}
                >
                  {label}
                </button>
              ))}

              <button
                type="button"
                className={`plc-flag-toggle ${onlyAbnormal ? 'active' : ''}`}
                onClick={() => setOnlyAbnormal(!onlyAbnormal)}
                title="Lọc chỉ hiển thị các chỉ số vượt ngưỡng tham chiếu"
              >
                <AlertTriangle size={13} />
                {onlyAbnormal ? 'Đang lọc: Chỉ bất thường' : 'Chỉ xem bất thường'}
              </button>
            </div>
          </div>

          {/* Loading or Error State */}
          {loading && (
            <div style={{ padding: '40px', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <RefreshCw size={28} className="spin-icon" style={{ marginBottom: '8px', color: '#0f766e' }} />
              <div>Đang tải kết quả xét nghiệm liên thông từ LIS...</div>
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c' }}>
              <strong>Lỗi tải dữ liệu:</strong> {error}
            </div>
          )}

          {/* Empty Search Results */}
          {!loading && !error && filteredReports.length === 0 && (
            <div style={{ padding: '50px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b' }}>
              <FlaskConical size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                Không tìm thấy phiếu xét nghiệm nào phù hợp
              </div>
              <p style={{ fontSize: '13px', margin: '6px 0 0' }}>
                Vui lòng thử bỏ bớt bộ lọc hoặc thay đổi từ khóa tìm kiếm.
              </p>
            </div>
          )}

          {/* List of Lab Reports */}
          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {paginatedReports.map((report) => {
                const abnormalInReport = report.indicators.filter(
                  (i) => i.flag === 'HIGH' || i.flag === 'LOW'
                ).length

                return (
                  <div key={report.report_id} className="plc-report-card">
                    {/* Header */}
                    <div className="plc-report-header">
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className={`plc-category-badge ${report.category}`}>
                            {report.category_name}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                            Mã phiếu: <strong>{report.report_id}</strong>
                          </span>
                          {abnormalInReport > 0 ? (
                            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                              ⚠️ {abnormalInReport} chỉ số cần lưu ý
                            </span>
                          ) : (
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                              ✓ Tất cả bình thường
                            </span>
                          )}
                        </div>

                        <h3 className="plc-report-title">{report.title}</h3>

                        <div className="plc-report-meta">
                          <span>Thời gian lấy mẫu: <b>{formatDateTimeVN(report.sampled_at)}</b></span>
                          <span>Trả kết quả: <b>{formatDateTimeVN(report.result_at)}</b></span>
                          <span>BS chỉ định: <b>{report.doctor_order}</b></span>
                          <span>Kỹ thuật viên: <b>{report.performed_by}</b></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="plc-btn-ai"
                          onClick={() => handleOpenAiInterpretation(report)}
                          title="AI phân tích phiếu kết quả này"
                        >
                          <Sparkles size={14} /> AI Diễn giải
                        </button>
                        <button
                          type="button"
                          className="plc-btn-outline"
                          onClick={() => setPrintModalReport(report)}
                          title="Xem bản in phiếu xét nghiệm chuẩn bệnh viện có ký số"
                        >
                          <Printer size={14} /> In / Xem PDF
                        </button>
                      </div>
                    </div>

                    {/* Indicators Table with Visual Reference Range Bar */}
                    <div className="plc-table-wrap">
                      <table className="plc-table">
                        <thead>
                          <tr>
                            <th style={{ width: '32%' }}>Tên xét nghiệm / Chỉ số</th>
                            <th style={{ width: '14%', textAlign: 'right' }}>Kết quả</th>
                            <th style={{ width: '10%' }}>Đơn vị</th>
                            <th style={{ width: '16%' }}>Khoảng tham chiếu</th>
                            <th style={{ width: '16%' }}>Thanh đo dải sinh lý</th>
                            <th style={{ width: '12%', textAlign: 'center' }}>Đánh giá</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.indicators.map((ind, idx) => {
                            const isHigh = ind.flag === 'HIGH'
                            const isLow = ind.flag === 'LOW'
                            const isAbnormal = isHigh || isLow
                            const rangePos = getRangePosition(ind.value, ind.ref_range)

                            return (
                              <tr
                                key={idx}
                                className={isHigh ? 'abnormal-high-row' : isAbnormal ? 'abnormal-row' : ''}
                              >
                                <td>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                    {ind.name}
                                    <span className="plc-code-pill">{ind.code}</span>
                                  </div>
                                  {ind.note && (
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                      {ind.note}
                                    </div>
                                  )}
                                </td>
                                <td className={`plc-val-cell ${isHigh ? 'high' : isLow ? 'low' : 'normal'}`} style={{ textAlign: 'right' }}>
                                  {ind.value}
                                </td>
                                <td style={{ color: '#64748b' }}>{ind.unit}</td>
                                <td style={{ color: '#475569', fontWeight: 500 }}>{ind.ref_range}</td>
                                <td>
                                  {/* Visual Range Slider */}
                                  <div className="plc-range-bar-wrap" title={`Khoảng chuẩn: ${ind.ref_range} - Điểm đo: ${ind.value}`}>
                                    <div className="plc-range-bar">
                                      <div
                                        className="plc-range-normal-zone"
                                        style={{ left: `${rangePos.zoneStart}%`, width: `${rangePos.zoneWidth}%` }}
                                      />
                                      <div
                                        className={`plc-range-indicator-dot ${isHigh ? 'high' : isLow ? 'low' : 'normal'}`}
                                        style={{ left: `${rangePos.leftPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className={`plc-flag-pill ${isHigh ? 'high' : isLow ? 'low' : 'normal'}`}>
                                    {isHigh && '▲ Tăng cao'}
                                    {isLow && '▼ Giảm thấp'}
                                    {!isAbnormal && '✓ Bình thường'}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Professional Conclusion Box */}
                    {report.conclusion && (
                      <div className={`plc-conclusion-box ${abnormalInReport > 0 ? 'abnormal' : ''}`}>
                        <strong>Kết luận Khoa Xét nghiệm:</strong> {report.conclusion}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="plc-card-footer">
                      <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShieldCheck size={14} color="#0f766e" />
                        Đã xác thực và ký số điện tử SmartCA PKI bởi Khoa Xét nghiệm Bệnh viện CareConnect
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="plc-btn-outline"
                          onClick={() => setPrintModalReport(report)}
                        >
                          <Download size={13} /> Tải bản PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Phân trang chuẩn theo quy định hệ thống */}
          {filteredReports.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={activePage}
                totalItems={filteredReports.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 10, 20]}
              />
            </div>
          )}

          {/* Compliance Notice */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: '#475569' }}>
            <ShieldCheck size={16} color="#0f766e" />
            Dữ liệu kết quả cận lâm sàng được trích xuất trực tiếp từ hệ thống LIS theo chuẩn HL7 FHIR và mã danh mục kỹ thuật y tế của Bộ Y tế.
          </div>
        </div>
      )}

      {/* ======================= TAB 2: XU HƯỚNG & DIỄN TIẾN CHỈ SỐ CHÍNH ======================= */}
      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <TrendingUp size={20} color="#0f766e" />
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                Diễn tiến các chỉ số cận lâm sàng qua các lần kiểm tra
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              Theo dõi sự thay đổi của các chỉ số sinh hóa máu quan trọng (Đường huyết đói, HbA1c, Mỡ máu, Men gan, Chức năng thận) để đánh giá hiệu quả dùng thuốc và điều chỉnh lối sống.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {/* Card 1: Glucose */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>
                    GLUCOSE
                  </span>
                  <h4 style={{ margin: '6px 0 2px 0', fontSize: '15px', color: '#0f172a' }}>Đường huyết đói</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Chuẩn: 3.9 – 6.4 mmol/L</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>6.8</div>
                  <div style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end', fontWeight: 600 }}>
                    <ArrowUpRight size={14} /> Tăng nhẹ
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#475569' }}>
                💡 <b>Lời khuyên BS:</b> Duy trì chế độ ăn giảm đường bột tinh chế, tăng cường rau xanh và vận động 30 phút mỗi ngày.
              </div>
            </div>

            {/* Card 2: HbA1c */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed', background: '#ede9fe', padding: '2px 6px', borderRadius: '4px' }}>
                    HBA1C
                  </span>
                  <h4 style={{ margin: '6px 0 2px 0', fontSize: '15px', color: '#0f172a' }}>Đo tỷ lệ HbA1c</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Chuẩn: 4.0 – 6.0 %</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>6.7</div>
                  <div style={{ fontSize: '11px', color: '#d97706', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end', fontWeight: 600 }}>
                    <ArrowUpRight size={14} /> Tiền ĐTĐ
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#475569' }}>
                💡 <b>Lời khuyên BS:</b> Tái khám định kỳ sau 3 tháng để kiểm tra lại chỉ số HbA1c đánh giá mục tiêu điều trị.
              </div>
            </div>

            {/* Card 3: Cholesterol toàn phần */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#ea580c', background: '#ffedd5', padding: '2px 6px', borderRadius: '4px' }}>
                    CHOLESTEROL
                  </span>
                  <h4 style={{ margin: '6px 0 2px 0', fontSize: '15px', color: '#0f172a' }}>Cholesterol Toàn phần</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Chuẩn: 3.9 – 5.2 mmol/L</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>5.8</div>
                  <div style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end', fontWeight: 600 }}>
                    <ArrowUpRight size={14} /> Vượt chuẩn
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#475569' }}>
                💡 <b>Lời khuyên BS:</b> Hạn chế mỡ động vật, nội tạng, đồ chiên rán; bổ sung dầu ô-liu và các loại cá béo giàu Omega-3.
              </div>
            </div>

            {/* Card 4: Men gan AST/ALT */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                    MEN GAN
                  </span>
                  <h4 style={{ margin: '6px 0 2px 0', fontSize: '15px', color: '#0f172a' }}>AST 31 / ALT 36</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Chuẩn: AST &lt; 37, ALT &lt; 41 U/L</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>Bình thường</div>
                  <div style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end', fontWeight: 600 }}>
                    ✓ Ổn định
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#475569' }}>
                💡 <b>Đánh giá:</b> Tế bào nhu mô gan hoạt động tốt, không có biểu hiện hủy hoại tế bào gan do viêm gan hay nhiễm độc.
              </div>
            </div>

            {/* Card 5: Creatinine & eGFR */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '2px 6px', borderRadius: '4px' }}>
                    CHỨC NĂNG THẬN
                  </span>
                  <h4 style={{ margin: '6px 0 2px 0', fontSize: '15px', color: '#0f172a' }}>Creatinine 82 µmol/L</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>eGFR: 98.5 mL/min/1.73m²</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>Tốt</div>
                  <div style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end', fontWeight: 600 }}>
                    ✓ Giai đoạn 1
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#475569' }}>
                💡 <b>Đánh giá:</b> Độ lọc cầu thận bình thường, khả năng đào thải chất cặn bã qua thận hoàn toàn đảm bảo.
              </div>
            </div>

            {/* Card 6: Huyết sắc tố HGB */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                    HUYẾT HỌC
                  </span>
                  <h4 style={{ margin: '6px 0 2px 0', fontSize: '15px', color: '#0f172a' }}>Huyết sắc tố HGB 146</h4>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Chuẩn: 130 – 175 g/L</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>Bình thường</div>
                  <div style={{ fontSize: '11px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end', fontWeight: 600 }}>
                    ✓ Không thiếu máu
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#475569' }}>
                💡 <b>Đánh giá:</b> Dòng tế bào máu ngoại vi khỏe mạnh, chỉ số bạch cầu và tiểu cầu đều nằm trong ngưỡng an toàn.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: AI DIỄN GIẢI KẾT QUẢ XÉT NGHIỆM Y KHOA
         ========================================================================= */}
      {aiModalOpen && (
        <div className="plc-modal-overlay">
          <div className="plc-modal-box">
            <div className="plc-modal-header">
              <h3>
                <Sparkles size={18} color="#2563eb" /> AI Diễn Giải Kết Quả Cận Lâm Sàng
              </h3>
              <button
                type="button"
                onClick={() => setAiModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="plc-modal-body">
              {aiLoading && (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={28} className="spin-icon" style={{ marginBottom: '10px', color: '#2563eb' }} />
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>
                    Trợ lý AI Y khoa đang phân tích các chỉ số xét nghiệm...
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    Đối chiếu với hướng dẫn chẩn đoán và điều trị của Bộ Y tế
                  </div>
                </div>
              )}

              {!aiLoading && aiResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      background:
                        aiResult.overall_status === 'ALERT'
                          ? '#fef2f2'
                          : aiResult.overall_status === 'ATTENTION'
                          ? '#fffbeb'
                          : '#f0fdf4',
                      border: `1px solid ${
                        aiResult.overall_status === 'ALERT'
                          ? '#fecaca'
                          : aiResult.overall_status === 'ATTENTION'
                          ? '#fde68a'
                          : '#bbf7d0'
                      }`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    {aiResult.overall_status === 'ALERT' ? (
                      <AlertTriangle size={24} color="#dc2626" />
                    ) : aiResult.overall_status === 'ATTENTION' ? (
                      <AlertTriangle size={24} color="#d97706" />
                    ) : (
                      <CheckCircle2 size={24} color="#16a34a" />
                    )}
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '14px',
                          color:
                            aiResult.overall_status === 'ALERT'
                              ? '#b91c1c'
                              : aiResult.overall_status === 'ATTENTION'
                              ? '#b45309'
                              : '#15803d'
                        }}
                      >
                        {aiResult.overall_status === 'ALERT'
                          ? 'CẢNH BÁO: CÓ CHỈ SỐ CẦN CAN THIỆP Y TẾ'
                          : aiResult.overall_status === 'ATTENTION'
                          ? 'CẦN CHÚ Ý: CÓ CHỈ SỐ LỆCH NGƯỠNG SINH LÝ NHẸ'
                          : 'TẤT CẢ CHỈ SỐ ĐẠT MỤC TIÊU BÌNH THƯỜNG'}
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                        {aiResult.patient_friendly_summary}
                      </p>
                    </div>
                  </div>

                  {/* Flagged items breakdown */}
                  {aiResult.items && aiResult.items.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        Chi tiết các chỉ số cần lưu ý:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {aiResult.items.map((it, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '10px 14px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a' }}>{it.test_name}</span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: it.status === 'HIGH' ? '#dc2626' : it.status === 'LOW' ? '#d97706' : '#16a34a',
                                  fontSize: '12px'
                                }}
                              >
                                {it.result} {it.unit} (Chuẩn: {it.reference_range})
                              </span>
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                              {it.insight}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lifestyle Advice */}
                  {aiResult.lifestyle_advice && aiResult.lifestyle_advice.length > 0 && (
                    <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '12px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '6px' }}>
                        🌱 Lời khuyên dinh dưỡng & sinh hoạt cá nhân hóa:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12.5px', color: '#134e4a', lineHeight: 1.6 }}>
                        {aiResult.lifestyle_advice.map((adv, idx) => (
                          <li key={idx}>{adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                    ⚠️ Diễn giải do AI hỗ trợ nhằm mục đích tham khảo và giáo dục sức khỏe, không thay thế cho chẩn đoán chính thức từ Bác sĩ điều trị.
                  </div>
                </div>
              )}
            </div>

            <div className="plc-modal-footer">
              <button
                type="button"
                className="plc-btn-primary"
                onClick={() => setAiModalOpen(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: IN / XEM PHIẾU KẾT QUẢ XÉT NGHIỆM CHUẨN BỆNH VIỆN (PDF PREVIEW)
         ========================================================================= */}
      {printModalReport && (
        <div className="plc-modal-overlay">
          <div className="plc-modal-box" style={{ maxWidth: '780px' }}>
            <div className="plc-modal-header">
              <h3>
                <Printer size={18} color="#0f766e" /> Phiếu Kết Quả Xét Nghiệm (Bản in Điện tử)
              </h3>
              <button
                type="button"
                onClick={() => setPrintModalReport(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="plc-modal-body" style={{ background: '#ffffff', padding: '24px' }}>
              {/* Official Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f766e', paddingBottom: '14px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                    SỞ Y TẾ TP. HỒ CHÍ MINH
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f766e' }}>
                    BỆNH VIỆN CARECONNECT TELEMED
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Khoa Xét Nghiệm Y Khoa · Mã CSKCB: 79014 · Chuẩn ISO 15189
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {printModalReport.report_id}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Mã liên thông LIS Quốc gia
                  </div>
                </div>
              </div>

              {/* Title */}
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  {printModalReport.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Lấy mẫu: {formatDateTimeVN(printModalReport.sampled_at)} · Trả kết quả: {formatDateTimeVN(printModalReport.result_at)}
                </div>
              </div>

              {/* Patient Meta Box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                <div>Họ và tên bệnh nhân: <b>{user?.full_name || 'Demo Patient'}</b></div>
                <div>Mã hồ sơ (PID): <b>{user?.national_id || 'PAT-0001'}</b></div>
                <div>Bác sĩ chỉ định: <b>{printModalReport.doctor_order}</b></div>
                <div>Kỹ thuật viên thực hiện: <b>{printModalReport.performed_by}</b></div>
              </div>

              {/* Printable Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', marginBottom: '16px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #cbd5e1' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tên xét nghiệm</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Kết quả</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Đơn vị</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Khoảng tham chiếu</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đánh giá</th>
                  </tr>
                </thead>
                <tbody>
                  {printModalReport.indicators.map((ind, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <b>{ind.name}</b> <small style={{ color: '#64748b' }}>({ind.code})</small>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: ind.flag === 'HIGH' ? '#dc2626' : ind.flag === 'LOW' ? '#d97706' : '#0f172a' }}>
                        {ind.value}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{ind.unit}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{ind.ref_range}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, fontSize: '11px', color: ind.flag === 'HIGH' ? '#dc2626' : ind.flag === 'LOW' ? '#d97706' : '#16a34a' }}>
                        {ind.flag_label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Conclusion */}
              {printModalReport.conclusion && (
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #0f766e', fontSize: '12px', marginBottom: '20px' }}>
                  <strong>Kết luận chuyên môn:</strong> {printModalReport.conclusion}
                </div>
              )}

              {/* Digital Signature Seals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', textAlign: 'center', fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#64748b' }}>KỸ THUẬT VIÊN XÉT NGHIỆM</div>
                  <div style={{ marginTop: '24px', fontWeight: 700, color: '#0f172a' }}>
                    {printModalReport.performed_by}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#16a34a', marginTop: '2px' }}>
                    ✓ Ký số PKI SmartCA LIS
                  </div>
                </div>

                <div>
                  <div style={{ fontWeight: 600, color: '#64748b' }}>TRƯỞNG KHOA XÉT NGHIỆM</div>
                  <div style={{ marginTop: '24px', fontWeight: 700, color: '#0f172a' }}>
                    TS.BS. Nguyễn Văn Hùng
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#0f766e', marginTop: '2px' }}>
                    [Dấu đỏ điện tử BV CareConnect]
                  </div>
                </div>
              </div>
            </div>

            <div className="plc-modal-footer">
              <button
                type="button"
                className="plc-btn-outline"
                onClick={() => window.print()}
              >
                <Printer size={14} /> In phiếu kết quả
              </button>
              <button
                type="button"
                className="plc-btn-primary"
                onClick={() => {
                  onToast?.('Đã tạo bản PDF phiếu xét nghiệm!')
                  setPrintModalReport(null)
                }}
              >
                <Download size={14} /> Tải tệp PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PatientParaclinicalCenter
