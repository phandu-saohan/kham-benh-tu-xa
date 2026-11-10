import { useState, useMemo, useEffect } from 'react'
import {
  CreditCard,
  QrCode,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  FileText,
  Building2,
  User,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Printer,
  ChevronRight,
  Sparkles,
  Banknote,
  DollarSign
} from 'lucide-react'
import {
  type Appointment,
  type User as UserType,
  requestAppointmentRefund,
  approveAppointmentRefund
} from './api'
import { formatDateTimeVN, formatDateVN } from './dateFormatters'
import { Pagination } from './Pagination'

interface PatientPaymentManagerProps {
  appointments: Appointment[]
  user: UserType | null
  onOpenVietQR: (appointment: Appointment) => void
  onRefreshData: () => void
  onToast: (msg: string) => void
}

const POPULAR_BANKS = [
  { code: 'MB', name: 'MB Bank (Quân Đội)' },
  { code: 'VCB', name: 'Vietcombank (Ngoại Thương)' },
  { code: 'TCB', name: 'Techcombank (Kỹ Thương)' },
  { code: 'BIDV', name: 'BIDV (Đầu Tư & Phát Triển)' },
  { code: 'CTG', name: 'VietinBank (Công Thương)' },
  { code: 'ACB', name: 'ACB (Á Châu)' },
  { code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)' },
  { code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'HDB', name: 'HDBank (Phát Triển TP.HCM)' }
]

function money(amount?: number | null): string {
  if (amount === undefined || amount === null) return '0 đ'
  return `${amount.toLocaleString('vi-VN')} đ`
}

function formatDate(isoStr?: string | null): string {
  return formatDateTimeVN(isoStr, '—')
}

export function PatientPaymentManager({
  appointments,
  user,
  onOpenVietQR,
  onRefreshData,
  onToast
}: PatientPaymentManagerProps) {
  // State filter & search
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'paid' | 'refund' | 'cancelled'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [refundModalAppt, setRefundModalAppt] = useState<Appointment | null>(null)
  const [receiptModalAppt, setReceiptModalAppt] = useState<Appointment | null>(null)
  const [refundProgressAppt, setRefundProgressAppt] = useState<Appointment | null>(null)

  // Refund Form State
  const [refundReason, setRefundReason] = useState('Bác sĩ báo đổi lịch / Bận công tác đột xuất')
  const [refundNotes, setRefundNotes] = useState('')
  const [bankName, setBankName] = useState('MB Bank (Quân Đội)')
  const [bankAccount, setBankAccount] = useState('')
  const [accountHolder, setAccountHolder] = useState(user?.full_name ? user.full_name.toUpperCase() : '')
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false)
  const [isProcessingApprove, setIsProcessingApprove] = useState(false)

  // Tính toán số liệu thống kê
  const stats = useMemo(() => {
    let totalOriginal = 0
    let totalBhyt = 0
    let totalPaid = 0
    let paidCount = 0
    let pendingCount = 0
    let refundCount = 0
    let totalRefund = 0
    let cancelledCount = 0

    appointments.forEach((a) => {
      totalOriginal += a.fee_amount || 0
      totalBhyt += a.bhyt_discount || 0

      const isPaid = a.status === 'confirmed' || a.status === 'completed' || a.paid_at
      const isRefunded = a.refund_amount && a.refund_amount > 0
      const isRefundRequested = a.refund_status === 'requested'

      if (isRefunded || isRefundRequested) {
        refundCount++
        totalRefund += a.refund_amount || a.patient_pay_amount || a.fee_amount || 0
      }

      if (isPaid) {
        paidCount++
        const actualPay = a.patient_pay_amount !== undefined && a.patient_pay_amount !== null
          ? a.patient_pay_amount
          : a.fee_amount
        totalPaid += actualPay
      } else if (a.status === 'cancelled') {
        cancelledCount++
      } else {
        pendingCount++
      }
    })

    return {
      totalOriginal,
      totalBhyt,
      totalPaid,
      paidCount,
      pendingCount,
      refundCount,
      totalRefund,
      cancelledCount
    }
  }, [appointments])

  // Lọc danh sách giao dịch
  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      // 1. Lọc theo tab
      const isPaid = a.status === 'confirmed' || a.status === 'completed' || a.paid_at
      const isRefund = (a.refund_amount && a.refund_amount > 0) || a.refund_status === 'requested' || a.refund_status === 'completed'

      if (filterTab === 'pending') {
        if (isPaid || a.status === 'cancelled') return false
      } else if (filterTab === 'paid') {
        if (!isPaid || isRefund) return false
      } else if (filterTab === 'refund') {
        if (!isRefund) return false
      } else if (filterTab === 'cancelled') {
        if (a.status !== 'cancelled' || isRefund) return false
      }

      // 2. Lọc theo search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const matchId = String(a.id).includes(term) || `tm${a.id}`.includes(term)
        const matchReason = (a.reason || '').toLowerCase().includes(term)
        const matchDoctor = (a.doctor_name || '').toLowerCase().includes(term)
        const matchDept = (a.department_name || '').toLowerCase().includes(term)
        const matchEncounter = (a.encounter_code || '').toLowerCase().includes(term)
        return matchId || matchReason || matchDoctor || matchDept || matchEncounter
      }

      return true
    })
  }, [appointments, filterTab, searchTerm])

  // Phân trang danh sách giao dịch
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    setCurrentPage(1)
  }, [filterTab, searchTerm])

  const totalPages = Math.ceil(filteredAppointments.length / pageSize) || 1
  const activePage = Math.min(currentPage, totalPages)
  const paginatedAppointments = useMemo(() => {
    const start = (activePage - 1) * pageSize
    return filteredAppointments.slice(start, start + pageSize)
  }, [filteredAppointments, activePage, pageSize])

  // Mở modal hoàn tiền
  function handleOpenRefundModal(a: Appointment) {
    setRefundModalAppt(a)
    setRefundReason('Bác sĩ báo đổi lịch / Bận công tác đột xuất')
    setRefundNotes('')
    setBankName('MB Bank (Quân Đội)')
    setBankAccount('')
    setAccountHolder(user?.full_name ? user.full_name.toUpperCase() : '')
  }

  // Gửi yêu cầu hoàn tiền
  async function handleSubmitRefund(e: React.FormEvent) {
    e.preventDefault()
    if (!refundModalAppt) return

    if (!bankAccount.trim()) {
      alert('Vui lòng nhập số tài khoản ngân hàng để nhận tiền hoàn.')
      return
    }
    if (!accountHolder.trim()) {
      alert('Vui lòng nhập họ và tên chủ tài khoản nhận tiền.')
      return
    }

    try {
      setIsSubmittingRefund(true)
      const res = await requestAppointmentRefund(refundModalAppt.id, {
        reason: refundReason,
        notes: refundNotes,
        bank_name: bankName,
        bank_account: bankAccount.trim(),
        account_holder_name: accountHolder.trim().toUpperCase()
      })

      onToast(res.message || 'Đã gửi yêu cầu hoàn tiền thành công!')
      setRefundModalAppt(null)
      onRefreshData()
    } catch (err: any) {
      alert(`Lỗi gửi yêu cầu hoàn tiền: ${err.message || 'Vui lòng thử lại sau.'}`)
    } finally {
      setIsSubmittingRefund(false)
    }
  }

  // Duyệt/Mô phỏng hoàn tiền nhanh Napas 247 (cho demo & test nhanh)
  async function handleApproveRefund(appointmentId: number) {
    try {
      setIsProcessingApprove(true)
      const res = await approveAppointmentRefund(appointmentId)
      onToast(res.message || 'Đã hoàn trả thành công qua Napas 247!')
      setRefundProgressAppt(null)
      onRefreshData()
    } catch (err: any) {
      alert(`Lỗi phê duyệt hoàn tiền: ${err.message || 'Vui lòng thử lại.'}`)
    } finally {
      setIsProcessingApprove(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #0e7490 100%)',
          borderRadius: '8px',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.12)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CreditCard size={20} color="#38bdf8" />
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px' }}>
              Quản Lý Thanh Toán & Hoàn Tiền VietQR (Napas 247)
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#cbd5e1', lineHeight: '1.5' }}>
            Khớp tiền tự động qua số tài khoản bệnh viện • Hỗ trợ gửi yêu cầu hoàn tiền viện phí trực tuyến minh bạch 24/7
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 8px #4ade80'
              }}
            />
            <span>Cổng VietQR Napas 247: Sẵn Sàng</span>
          </div>
        </div>
      </div>

      {/* 2. Thống kê nhanh tài chính (4 Thẻ chỉ số) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '14px'
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>TỔNG VIỆN PHÍ DỊCH VỤ</span>
            <Building2 size={16} color="#64748b" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
            {money(stats.totalOriginal)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            Tổng {appointments.length} đợt khám đăng ký
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#16a34a' }}>BHYT ĐÃ CHI TRẢ</span>
            <ShieldCheck size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#16a34a' }}>
            {money(stats.totalBhyt)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
            Giảm trừ chi phí khám trực tuyến
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7' }}>ĐÃ THANH TOÁN (VIETQR)</span>
            <CheckCircle2 size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#0284c7' }}>
            {money(stats.totalPaid)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
            {stats.paidCount} ca đã đối soát thành công
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ea580c' }}>HOÀN TIỀN & ĐANG XỬ LÝ</span>
            <RotateCcw size={16} color="#ea580c" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#ea580c' }}>
            {money(stats.totalRefund)}
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
            {stats.refundCount} ca yêu cầu / đã hoàn tất
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Search & Filter Tabs */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterTab === 'all' ? '1px solid #0e7490' : '1px solid #e2e8f0',
              background: filterTab === 'all' ? '#0e7490' : '#f8fafc',
              color: filterTab === 'all' ? '#ffffff' : '#475569'
            }}
          >
            Tất cả ({appointments.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('pending')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterTab === 'pending' ? '1px solid #f59e0b' : '1px solid #e2e8f0',
              background: filterTab === 'pending' ? '#fef3c7' : '#f8fafc',
              color: filterTab === 'pending' ? '#b45309' : '#475569'
            }}
          >
            Chờ thanh toán ({stats.pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('paid')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterTab === 'paid' ? '1px solid #16a34a' : '1px solid #e2e8f0',
              background: filterTab === 'paid' ? '#dcfce7' : '#f8fafc',
              color: filterTab === 'paid' ? '#15803d' : '#475569'
            }}
          >
            Đã thanh toán ({stats.paidCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('refund')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterTab === 'refund' ? '1px solid #ea580c' : '1px solid #e2e8f0',
              background: filterTab === 'refund' ? '#ffedd5' : '#f8fafc',
              color: filterTab === 'refund' ? '#c2410c' : '#475569'
            }}
          >
            Yêu cầu hoàn tiền ({stats.refundCount})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('cancelled')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterTab === 'cancelled' ? '1px solid #94a3b8' : '1px solid #e2e8f0',
              background: filterTab === 'cancelled' ? '#f1f5f9' : '#f8fafc',
              color: filterTab === 'cancelled' ? '#334155' : '#475569'
            }}
          >
            Đã hủy ({stats.cancelledCount})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Tìm theo mã ca, bác sĩ, lý do..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              fontSize: '12.5px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* 4. Danh sách các thẻ Giao dịch chi tiết */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredAppointments.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              padding: '40px',
              textAlign: 'center',
              color: '#64748b'
            }}
          >
            <CreditCard size={36} color="#94a3b8" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>
              Không tìm thấy giao dịch nào phù hợp
            </div>
            <p style={{ fontSize: '13px', margin: '6px 0 0' }}>
              Vui lòng thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
            </p>
          </div>
        ) : (
          paginatedAppointments.map((a) => {
            const isPaid = a.status === 'confirmed' || a.status === 'completed' || a.paid_at
            const isRefundRequested = a.refund_status === 'requested'
            const isRefundCompleted = a.refund_status === 'completed' || (a.refund_amount && a.refund_amount > 0)
            const actualPay = a.patient_pay_amount !== undefined && a.patient_pay_amount !== null
              ? a.patient_pay_amount
              : a.fee_amount

            return (
              <div
                key={a.id}
                style={{
                  background: '#ffffff',
                  border: isRefundRequested ? '1.5px solid #fdba74' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s ease'
                }}
              >
                {/* Header Row */}
                <div
                  style={{
                    background: isRefundRequested ? '#fff7ed' : '#f8fafc',
                    padding: '12px 18px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        background: '#0e7490',
                        color: '#ffffff',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                    >
                      LỊCH HẸN #{a.id}
                    </div>
                    <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
                      Mã lượt khám: <b>{a.encounter_code || `LK-${String(a.id).padStart(6, '0')}`}</b>
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>•</span>
                    <span style={{ fontSize: '12.5px', color: '#475569' }}>
                      Ngày khám: <b>{formatDate(a.starts_at)}</b>
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isRefundCompleted ? (
                      <span
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <RotateCcw size={13} /> Đã hoàn tiền (100%)
                      </span>
                    ) : isRefundRequested ? (
                      <span
                        style={{
                          background: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #fed7aa',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Clock size={13} /> Đang xử lý hoàn tiền
                      </span>
                    ) : isPaid ? (
                      <span
                        style={{
                          background: '#f0fdf4',
                          color: '#16a34a',
                          border: '1px solid #bbf7d0',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <CheckCircle2 size={13} /> Đã thanh toán VietQR
                      </span>
                    ) : a.status === 'cancelled' ? (
                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        Đã hủy ca
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#fffbeb',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Clock size={13} /> Chờ thanh toán
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Grid */}
                <div
                  style={{
                    padding: '16px 20px',
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 1.2fr 1.4fr',
                    gap: '20px',
                    alignItems: 'start'
                  }}
                >
                  {/* Cột 1: Thông tin khám */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Bác sĩ & Nội dung khám
                    </span>
                    <h4 style={{ margin: '4px 0 2px', fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                      {a.doctor_name || 'Bác sĩ chuyên khoa'}
                    </h4>
                    <div style={{ fontSize: '12px', color: '#0e7490', fontWeight: 600 }}>
                      {a.department_name || 'Khoa Nội Tổng Quát'}
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '12.5px',
                        color: '#475569',
                        lineHeight: '1.4',
                        background: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <b>Lý do khám:</b> {a.reason}
                    </div>
                  </div>

                  {/* Cột 2: Viện phí & BHYT */}
                  <div style={{ borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', padding: '0 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Chi tiết chi phí viện phí
                    </span>
                    <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                        <span style={{ color: '#64748b' }}>Biểu giá niêm yết:</span>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{money(a.fee_amount)}</span>
                      </div>

                      {a.bhyt_discount ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                          <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={12} /> BHYT chi trả ({a.bhyt_rate || 80}%):
                          </span>
                          <span style={{ fontWeight: 600, color: '#16a34a' }}>-{money(a.bhyt_discount)}</span>
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px dashed #cbd5e1',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline'
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>Bệnh nhân thực trả:</span>
                        <span style={{ fontSize: '17px', fontWeight: 800, color: isPaid ? '#16a34a' : '#0e7490' }}>
                          {money(actualPay)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cột 3: Giao dịch & Hoàn tiền */}
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                      Thông tin đối soát & Hoàn tiền
                    </span>

                    {isRefundRequested || isRefundCompleted ? (
                      <div
                        style={{
                          marginTop: '6px',
                          background: isRefundCompleted ? '#eff6ff' : '#fff7ed',
                          border: isRefundCompleted ? '1px solid #bfdbfe' : '1px solid #fed7aa',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: isRefundCompleted ? '#1e40af' : '#9a3412', marginBottom: '4px' }}>
                          {isRefundCompleted ? '✓ Đã hoàn trả 100% vào tài khoản:' : '⏳ Đang chờ Kế toán đối soát:'}
                        </div>
                        <div>Số tiền: <b>{money(a.refund_amount || actualPay)}</b></div>
                        <div>Ngân hàng: <b>{a.bank_name || 'MB Bank'}</b></div>
                        <div>Số TK: <b>{a.bank_account || '••••••••'}</b> (Chủ TK: {a.account_holder_name || user?.full_name})</div>
                        {a.refund_reason && (
                          <div style={{ marginTop: '4px', color: '#64748b', fontStyle: 'italic' }}>
                            Lý do: {a.refund_reason}
                          </div>
                        )}
                      </div>
                    ) : isPaid ? (
                      <div style={{ marginTop: '6px', fontSize: '12.5px', color: '#475569' }}>
                        <div>Phương thức: <b>Chuyển khoản VietQR (Napas 247)</b></div>
                        <div>Thời gian khớp: <b>{formatDate(a.paid_at || a.starts_at)}</b></div>
                        <div>Mã giao dịch: <code style={{ background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px' }}>TM{a.id}-NAPAS247</code></div>
                        <div style={{ fontSize: '11.5px', color: '#16a34a', marginTop: '4px' }}>
                          ✓ Hóa đơn điện tử e-Invoice hợp lệ
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '6px', fontSize: '12.5px', color: '#64748b' }}>
                        <div>Trạng thái: <b>Chưa hoàn tất thanh toán</b></div>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                          Quét mã VietQR để hệ thống tự động xác nhận lịch hẹn vào buồng khám bác sĩ.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div
                  style={{
                    background: '#fafafa',
                    padding: '10px 18px',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {/* Nút Quét VietQR nếu chưa thanh toán */}
                  {!isPaid && a.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => onOpenVietQR(a)}
                      style={{
                        background: '#0e7490',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '7px 16px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(14, 116, 144, 0.25)'
                      }}
                    >
                      <QrCode size={15} /> Quét mã VietQR ({money(actualPay)})
                    </button>
                  )}

                  {/* Nút Xem Biên Lai Điện Tử nếu đã thanh toán */}
                  {isPaid && (
                    <button
                      type="button"
                      onClick={() => setReceiptModalAppt(a)}
                      style={{
                        background: '#ffffff',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FileText size={14} color="#0e7490" /> Xem Biên Lai Viện Phí
                    </button>
                  )}

                  {/* Nút Yêu Cầu Hoàn Tiền nếu đã thanh toán và chưa hoàn */}
                  {isPaid && !isRefundRequested && !isRefundCompleted && a.status !== 'completed' && (
                    <button
                      type="button"
                      onClick={() => handleOpenRefundModal(a)}
                      style={{
                        background: '#ffffff',
                        color: '#ea580c',
                        border: '1px solid #fdba74',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      title="Yêu cầu hoàn trả 100% tiền viện phí về tài khoản ngân hàng"
                    >
                      <RotateCcw size={14} /> Yêu Cầu Hoàn Tiền
                    </button>
                  )}

                  {/* Nút Xem Tiến Độ Hoàn Tiền */}
                  {isRefundRequested && (
                    <button
                      type="button"
                      onClick={() => setRefundProgressAppt(a)}
                      style={{
                        background: '#fff7ed',
                        color: '#c2410c',
                        border: '1px solid #fdba74',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Clock size={14} /> Xem Tiến Độ Hoàn Tiền
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>


      {/* Phân trang danh sách giao dịch */}
      {filteredAppointments.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <Pagination
            currentPage={activePage}
            totalItems={filteredAppointments.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[5, 10, 20]}
          />
        </div>
      )}
      {/* =========================================================================
          MODAL: YÊU CẦU HOÀN TIỀN VIỆN PHÍ (REFUND REQUEST MODAL)
         ========================================================================= */}
      {refundModalAppt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  Yêu Cầu Hoàn Tiền Viện Phí (Lịch Hẹn #{refundModalAppt.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalAppt(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitRefund} style={{ padding: '20px' }}>
              {/* Box cam kết quyền lợi */}
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '6px',
                  padding: '12px 14px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#1e40af',
                  lineHeight: '1.45'
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ShieldCheck size={16} /> Chính sách hoàn tiền viện phí 100%
                </div>
                <div>
                  Theo quy định khám chữa bệnh từ xa, người bệnh được hoàn trả <b>100% chi phí thực trả ({money(refundModalAppt.patient_pay_amount || refundModalAppt.fee_amount)})</b> khi chưa bắt đầu phiên khám bác sĩ. Tiền hoàn sẽ được chuyển khoản qua cổng Napas 247.
                </div>
              </div>

              {/* Lý do hoàn tiền */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Lý do yêu cầu hoàn tiền <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#ffffff'
                  }}
                >
                  <option value="Bác sĩ báo đổi lịch / Bận công tác đột xuất">Bác sĩ báo đổi lịch / Bận công tác đột xuất</option>
                  <option value="Tôi có việc bận đột xuất không thể tham gia đúng giờ">Tôi có việc bận đột xuất không thể tham gia đúng giờ</option>
                  <option value="Đặt nhầm chuyên khoa / thông tin người khám">Đặt nhầm chuyên khoa / thông tin người khám</option>
                  <option value="Tình trạng sức khỏe chuyển biến cần đến viện trực tiếp">Tình trạng sức khỏe chuyển biến cần đến viện trực tiếp</option>
                  <option value="Khác">Lý do khác (ghi rõ bên dưới)</option>
                </select>
              </div>

              {/* Chi tiết lý do */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Ghi chú thêm cho Kế toán viện
                </label>
                <textarea
                  rows={2}
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="Ghi chú thêm lý do hoặc thời gian thuận tiện nhận tiền..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Thông tin tài khoản nhận tiền */}
              <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '14px', marginBottom: '14px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0e7490', textTransform: 'uppercase' }}>
                  Tài khoản nhận tiền hoàn (Chuyển khoản 24/7)
                </span>

                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Ngân hàng thụ hưởng <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    >
                      {POPULAR_BANKS.map(b => (
                        <option key={b.code} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Số tài khoản ngân hàng <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 0988888888 hoặc 1903..."
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Họ và tên chủ tài khoản (In hoa không dấu) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="NGUYEN VAN A"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        textTransform: 'uppercase'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button
                  type="button"
                  onClick={() => setRefundModalAppt(null)}
                  disabled={isSubmittingRefund}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefund}
                  style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)'
                  }}
                >
                  <RotateCcw size={15} />
                  {isSubmittingRefund ? 'Đang gửi...' : `Xác Nhận Hoàn Tiền (${money(refundModalAppt.patient_pay_amount || refundModalAppt.fee_amount)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: XEM TIẾN ĐỘ HOÀN TIỀN (REFUND PROGRESS MODAL)
         ========================================================================= */}
      {refundProgressAppt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                background: '#0e7490',
                color: '#ffffff',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Clock size={17} /> Tiến Độ Hoàn Tiền (Lịch Hẹn #{refundProgressAppt.id})
              </h3>
              <button
                type="button"
                onClick={() => setRefundProgressAppt(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#16a34a',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    ✓
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                      1. Tiếp nhận yêu cầu hoàn tiền
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {formatDate(refundProgressAppt.refund_requested_at || new Date().toISOString())} • Đã ghi nhận vào hệ thống
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#f59e0b',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    2
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#b45309' }}>
                      2. Kế toán viện đối soát lệnh Napas 247
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Đang xử lý khớp lệnh chuyển khoản về STK: <b>{refundProgressAppt.bank_account || '••••••••'}</b> ({refundProgressAppt.bank_name || 'Ngân hàng'})
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#e2e8f0',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    3
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#64748b' }}>
                      3. Hoàn tất nhận tiền
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Số tiền {money(refundProgressAppt.refund_amount || refundProgressAppt.patient_pay_amount || refundProgressAppt.fee_amount)} sẽ về tài khoản trong 1-24h
                    </div>
                  </div>
                </div>
              </div>

              {/* Nút mô phỏng đối soát nhanh (dành cho demo) */}
              <div
                style={{
                  marginTop: '22px',
                  paddingTop: '16px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleApproveRefund(refundProgressAppt.id)}
                  disabled={isProcessingApprove}
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Xác nhận đối soát chuyển khoản hoàn tiền"
                >
                  ✓ {isProcessingApprove ? 'Đang xử lý...' : 'Xác nhận đã nhận hoàn tiền'}
                </button>

                <button
                  type="button"
                  onClick={() => setRefundProgressAppt(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: XEM BIÊN LAI VIỆN PHÍ ĐIỆN TỬ (E-RECEIPT MODAL)
         ========================================================================= */}
      {receiptModalAppt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              style={{
                background: '#0f172a',
                color: '#ffffff',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700 }}>
                  Biên Lai Thu Viện Phí Điện Tử (e-Receipt)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalAppt(null)}
                style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Receipt Body */}
            <div style={{ padding: '24px', fontSize: '13px', color: '#1e293b' }}>
              <div style={{ textAlign: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 2px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  BỆNH VIỆN ĐA KHOA TELEMED
                </h4>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Mã cơ sở y tế: 79014 (Mã định danh GLN: 8938500000018)
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0e7490', marginTop: '8px' }}>
                  PHIẾU THU TIỀN KHÁM BỆNH TỪ XA VIETQR
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                  Số biên lai: BL-{receiptModalAppt.id}-{new Date().getFullYear()} • Mã giao dịch: TM{receiptModalAppt.id}-NAPAS247
                </div>
              </div>

              {/* Thông tin bệnh nhân */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>Họ tên người bệnh: <b>{receiptModalAppt.patient_name || user?.full_name}</b></div>
                <div>Mã thẻ BHYT: <b>{receiptModalAppt.bhyt_code || user?.bhyt_code || 'Không sử dụng'}</b></div>
                <div>Bác sĩ khám: <b>{receiptModalAppt.doctor_name || 'Bác sĩ chuyên khoa'}</b></div>
                <div>Chuyên khoa: <b>{receiptModalAppt.department_name || 'Nội Tổng Quát'}</b></div>
                <div>Thời gian khám: <b>{formatDate(receiptModalAppt.starts_at)}</b></div>
                <div>Hình thức thanh toán: <b>Chuyển khoản VietQR</b></div>
              </div>

              {/* Bảng chi phí */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>Nội dung thu</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px' }}>
                        Khám bệnh chuyên khoa từ xa (Telehealth)
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                        {money(receiptModalAppt.fee_amount)}
                      </td>
                    </tr>
                    {receiptModalAppt.bhyt_discount ? (
                      <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#16a34a' }}>
                        <td style={{ padding: '8px 10px' }}>
                          Quỹ Bảo hiểm Y tế (BHYT) chi trả ({receiptModalAppt.bhyt_rate || 80}%)
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                          -{money(receiptModalAppt.bhyt_discount)}
                        </td>
                      </tr>
                    ) : null}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td style={{ padding: '10px' }}>TỔNG CỘNG THỰC THU:</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#16a34a', fontSize: '15px' }}>
                        {money(receiptModalAppt.patient_pay_amount || receiptModalAppt.fee_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Chữ ký số SmartCA */}
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '12px',
                  color: '#166534'
                }}
              >
                <ShieldCheck size={20} color="#16a34a" />
                <div>
                  <div style={{ fontWeight: 700 }}>Ký số điện tử PKI SmartCA bởi Bệnh viện Telemed</div>
                  <div style={{ fontSize: '11px', color: '#15803d' }}>
                    Chứng thư số hợp lệ • Thời gian: {formatDate(receiptModalAppt.paid_at || new Date().toISOString())}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    background: '#0e7490',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={15} /> In Biên Lai
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptModalAppt(null)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '7px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
