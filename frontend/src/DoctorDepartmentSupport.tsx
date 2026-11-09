import React, { useState } from 'react'
import {
  HelpCircle, Plus, Search, Filter, Clock, CheckCircle2, AlertTriangle,
  Send, MessageSquare, Building2, User, Stethoscope, Pill, ScanLine,
  FlaskConical, Cpu, ShieldCheck, ChevronRight, X, ArrowRight,
  Paperclip, Flame
} from 'lucide-react'
import { Appointment } from './api'
import { formatDateTimeVN } from './dateFormatters'

export interface SupportTicket {
  id: string
  code: string
  department: string
  departmentIcon: string
  title: string
  patientId?: number
  patientName?: string
  priority: 'urgent' | 'high' | 'normal'
  status: 'pending' | 'in_progress' | 'resolved' | 'closed'
  doctorName: string
  createdAt: string
  updatedAt: string
  description: string
  assignedTo?: string
  messages: {
    id: string
    sender: string
    senderRole: string
    content: string
    timestamp: string
    isDoctor: boolean
  }[]
}

interface DoctorDepartmentSupportProps {
  doctor: any
  appointments: Appointment[]
}

const DEPARTMENTS = [
  { id: 'pharmacy', name: 'Khoa Dược lâm sàng', icon: 'Pill', desc: 'Duyệt thuốc ngoài danh mục, tương tác thuốc, cấp phát khẩn' },
  { id: 'pacs', name: 'Khoa CĐHA & Thăm dò chức năng', icon: 'ScanLine', desc: 'Đọc khẩn phim X-quang/CT/MRI, kết nối PACS/DICOM' },
  { id: 'lab', name: 'Khoa Xét nghiệm (LIS)', icon: 'FlaskConical', desc: 'Chạy mẫu khẩn cấp, bổ sung chỉ số sinh hóa, huyết học' },
  { id: 'it', name: 'Tổ CNTT & Hạ tầng số', icon: 'Cpu', desc: 'Hỗ trợ WebRTC video call, chữ ký số SmartCA, tài khoản EMR' },
  { id: 'insurance', name: 'Phòng KHTH & Giám định BHYT', icon: 'ShieldCheck', desc: 'Hỗ trợ giải trình xuất toán XML 4210, xác thực thẻ BHYT' },
  { id: 'nursing', name: 'Đội Điều dưỡng Telehealth', icon: 'Stethoscope', desc: 'Điều phối lấy mẫu tại nhà, hỗ trợ đo sinh hiệu RPM' }
]

export const DoctorDepartmentSupport: React.FC<DoctorDepartmentSupportProps> = ({
  doctor,
  appointments
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: '1',
      code: 'REQ-2026-092',
      department: 'Khoa CĐHA & Thăm dò chức năng',
      departmentIcon: 'ScanLine',
      title: 'Hỗ trợ đọc khẩn kết quả X-quang tim phổi cho ca nghi viêm phổi kẽ',
      patientId: 9,
      patientName: 'Demo Patient (BN #9)',
      priority: 'urgent',
      status: 'in_progress',
      doctorName: doctor?.full_name || 'BS.CKII Trần Minh',
      createdAt: '2026-11-09T08:15:00',
      updatedAt: '2026-11-09T08:35:00',
      description: 'Bệnh nhân có triệu chứng sốt cao, khó thở nhẹ, SpO2 94%. Đã chụp X-quang tại cơ sở vệ tinh. Kính đề nghị Khoa CĐHA hội chẩn và đọc khẩn để kịp thời kê đơn.',
      assignedTo: 'BS.CKI Nguyễn Văn Hùng (Khoa CĐHA)',
      messages: [
        {
          id: 'm1',
          sender: doctor?.full_name || 'BS.CKII Trần Minh',
          senderRole: 'Bác sĩ lâm sàng',
          content: 'Kính gửi Khoa CĐHA, nhờ bác sĩ đọc khẩn giúp ca này vì bệnh nhân đang chờ tại phòng khám Telemedicine #07.',
          timestamp: '2026-11-09 08:15',
          isDoctor: true
        },
        {
          id: 'm2',
          sender: 'BS.CKI Nguyễn Văn Hùng',
          senderRole: 'Khoa CĐHA',
          content: 'Đã nhận yêu cầu. Hình ảnh DICOM đã đồng bộ lên PACS Viewer. Phế trường 2 bên thông khí tốt, có nốt mờ nhẹ vùng đáy phổi phải. Sẽ ký trả kết quả EMR trong 10 phút.',
          timestamp: '2026-11-09 08:35',
          isDoctor: false
        }
      ]
    },
    {
      id: '2',
      code: 'REQ-2026-088',
      department: 'Khoa Dược lâm sàng',
      departmentIcon: 'Pill',
      title: 'Tư vấn duyệt tương tác thuốc Metformin + Rosuvastatin cho bệnh nhân cao tuổi',
      patientId: 1,
      patientName: 'Phan Hoàng Phúc',
      priority: 'normal',
      status: 'resolved',
      doctorName: doctor?.full_name || 'BS.CKII Trần Minh',
      createdAt: '2026-11-08T14:20:00',
      updatedAt: '2026-11-08T15:10:00',
      description: 'Bệnh nhân 68 tuổi tiền sử đái tháo đường typ 2 kèm rối loạn lipid máu, eGFR 58 mL/min. Đề nghị Dược lâm sàng kiểm tra liều lượng và cảnh báo tương tác.',
      assignedTo: 'DS.CKI Lê Thị Mai (Khoa Dược)',
      messages: [
        {
          id: 'm3',
          sender: doctor?.full_name || 'BS.CKII Trần Minh',
          senderRole: 'Bác sĩ lâm sàng',
          content: 'Nhờ Dược sĩ kiểm tra liều Metformin 850mg 2 lần/ngày trên bệnh nhân có suy giảm chức năng thận nhẹ.',
          timestamp: '2026-11-08 14:20',
          isDoctor: true
        },
        {
          id: 'm4',
          sender: 'DS.CKI Lê Thị Mai',
          senderRole: 'Dược sĩ lâm sàng',
          content: 'Khoa Dược đã rà soát: eGFR 58 mL/min có thể duy trì liều Metformin tối đa 1000mg/ngày. Khuyến nghị giảm xuống 500mg x 2 lần/ngày và theo dõi thêm Creatinine máu sau 3 tháng.',
          timestamp: '2026-11-08 15:10',
          isDoctor: false
        }
      ]
    },
    {
      id: '3',
      code: 'REQ-2026-084',
      department: 'Tổ CNTT & Hạ tầng số',
      departmentIcon: 'Cpu',
      title: 'Kiểm tra độ trễ WebRTC và đồng bộ chữ ký số SmartCA trên máy trạm',
      priority: 'high',
      status: 'in_progress',
      doctorName: doctor?.full_name || 'BS.CKII Trần Minh',
      createdAt: '2026-11-09T07:45:00',
      updatedAt: '2026-11-09T08:00:00',
      description: 'Đôi lúc ký số bệnh án EMR bị trễ OTP 15 giây. Nhờ kỹ thuật kiểm tra webhook chứng thư số VNPT SmartCA.',
      assignedTo: 'KS. Trương Hoàng Tuấn (IT Support)',
      messages: [
        {
          id: 'm5',
          sender: doctor?.full_name || 'BS.CKII Trần Minh',
          senderRole: 'Bác sĩ lâm sàng',
          content: 'Nhờ kỹ thuật kiểm tra cổng ký số PKI SmartCA trên phiên bản trình duyệt mới.',
          timestamp: '2026-11-09 07:45',
          isDoctor: true
        },
        {
          id: 'm6',
          sender: 'KS. Trương Hoàng Tuấn',
          senderRole: 'IT Support',
          content: 'Đã tối ưu hóa caching chứng thư số và cập nhật proxy signing server. Bác sĩ thử lại giúp em nhé.',
          timestamp: '2026-11-09 08:00',
          isDoctor: false
        }
      ]
    },
    {
      id: '4',
      code: 'REQ-2026-079',
      department: 'Phòng KHTH & Giám định BHYT',
      departmentIcon: 'ShieldCheck',
      title: 'Xác thực mã định danh và mức hưởng BHYT 80% đúng tuyến cho ca chuyển viện',
      patientId: 3,
      patientName: 'Trần Thị Thu Thảo',
      priority: 'normal',
      status: 'resolved',
      doctorName: doctor?.full_name || 'BS.CKII Trần Minh',
      createdAt: '2026-11-07T09:30:00',
      updatedAt: '2026-11-07T10:15:00',
      description: 'Bệnh nhân có giấy chuyển tuyến từ BV Đa khoa tỉnh nhưng mã cơ sở KCB ban đầu khác. Đề nghị KHTH tra cứu cổng BHYT Quốc gia.',
      assignedTo: 'ThS. Nguyễn Thị Huệ (Phòng KHTH)',
      messages: [
        {
          id: 'm7',
          sender: doctor?.full_name || 'BS.CKII Trần Minh',
          senderRole: 'Bác sĩ lâm sàng',
          content: 'Nhờ phòng KHTH kiểm tra giúp mã thẻ DN4797931414432.',
          timestamp: '2026-11-07 09:30',
          isDoctor: true
        },
        {
          id: 'm8',
          sender: 'ThS. Nguyễn Thị Huệ',
          senderRole: 'Phòng KHTH',
          content: 'Đã tra cứu cổng Giám định BHYT thành công. Thẻ hợp lệ và áp dụng mức thanh toán 80% đúng tuyến theo Thông tư 30/2023.',
          timestamp: '2026-11-07 10:15',
          isDoctor: false
        }
      ]
    }
  ])

  // Filters & State
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [replyText, setReplyText] = useState('')

  // New ticket form
  const [newDept, setNewDept] = useState(DEPARTMENTS[0].name)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<'urgent' | 'high' | 'normal'>('normal')
  const [newPatientId, setNewPatientId] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
  }

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newDescription.trim()) return

    const selectedPatient = appointments.find(a => a.patient_id === Number(newPatientId))
    const deptObj = DEPARTMENTS.find(d => d.name === newDept) || DEPARTMENTS[0]

    const newTicket: SupportTicket = {
      id: Date.now().toString(),
      code: `REQ-2026-0${Math.floor(Math.random() * 90) + 10}`,
      department: newDept,
      departmentIcon: deptObj.icon,
      title: newTitle.trim(),
      patientId: newPatientId ? Number(newPatientId) : undefined,
      patientName: selectedPatient ? (selectedPatient as any).patient_name : (newPatientId ? `Bệnh nhân #${newPatientId}` : undefined),
      priority: newPriority,
      status: 'pending',
      doctorName: doctor?.full_name || 'BS.CKII Trần Minh',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: newDescription.trim(),
      assignedTo: `Trực ban ${newDept}`,
      messages: [
        {
          id: 'm_' + Date.now(),
          sender: doctor?.full_name || 'BS.CKII Trần Minh',
          senderRole: 'Bác sĩ phụ trách',
          content: newDescription.trim(),
          timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
          isDoctor: true
        }
      ]
    }

    setTickets(prev => [newTicket, ...prev])
    setShowCreateModal(false)
    setNewTitle('')
    setNewDescription('')
    setNewPatientId('')
    showToast(`Đã gửi yêu cầu ${newTicket.code} tới ${newDept} thành công!`)
  }

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedTicket) return

    const newMsg = {
      id: 'm_' + Date.now(),
      sender: doctor?.full_name || 'BS.CKII Trần Minh',
      senderRole: 'Bác sĩ lâm sàng',
      content: replyText.trim(),
      timestamp: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
      isDoctor: true
    }

    const updated = {
      ...selectedTicket,
      updatedAt: new Date().toISOString(),
      messages: [...selectedTicket.messages, newMsg]
    }

    setSelectedTicket(updated)
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t))
    setReplyText('')
  }

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    const matchDept = filterDept === 'all' || t.department === filterDept
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority
    const matchSearch = !searchQuery.trim() ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.patientName && t.patientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchDept && matchStatus && matchPriority && matchSearch
  })

  const getPriorityBadge = (p: string) => {
    if (p === 'urgent') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
          <Flame size={12} /> KHẨN CẤP (P1)
        </span>
      )
    }
    if (p === 'high') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
          <AlertTriangle size={12} /> ƯU TIÊN CAO (P2)
        </span>
      )
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
        TIÊU CHUẨN (P3)
      </span>
    )
  }

  const getStatusBadge = (s: string) => {
    if (s === 'pending') {
      return (
        <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
          ⏳ Chờ tiếp nhận
        </span>
      )
    }
    if (s === 'in_progress') {
      return (
        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
          ⚙️ Đang xử lý
        </span>
      )
    }
    return (
      <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
        ✓ Đã giải quyết
      </span>
    )
  }

  return (
    <div style={{ padding: '4px 0 24px' }}>
      {toastMsg && (
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
          {toastMsg}
        </div>
      )}

      {/* Hero Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f766e 0%, #115e59 50%, #134e4a 100%)',
        borderRadius: '14px',
        padding: '24px 28px',
        color: '#ffffff',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 8px 24px rgba(15, 118, 110, 0.18)'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
            <HelpCircle size={14} />
            Điều Phối Nghiệp Vụ Liên Phòng Ban
          </div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>Hỗ trợ & Quản lý Yêu cầu Liên Khoa</h2>
          <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '13.5px' }}>
            Tạo phiếu đề nghị và phối hợp nghiệp vụ trực tiếp với Dược lâm sàng, CĐHA, Xét nghiệm, IT, BHYT & Điều dưỡng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#14b8a6',
            color: '#ffffff',
            border: 'none',
            padding: '11px 20px',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '14px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(20, 184, 166, 0.35)',
            transition: 'all 0.2s ease'
          }}
        >
          <Plus size={18} />
          Tạo yêu cầu mới cho Phòng ban
        </button>
      </div>

      {/* Quick KPI stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Tổng yêu cầu đã gửi</span>
            <HelpCircle size={16} color="#0f766e" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
            {tickets.length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>phiếu</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Đang chờ tiếp nhận</span>
            <Clock size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '6px' }}>
            {tickets.filter(t => t.status === 'pending').length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>phiếu</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Đang phối hợp xử lý</span>
            <Building2 size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '6px' }}>
            {tickets.filter(t => t.status === 'in_progress').length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>phiếu</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
            <span>Đã giải quyết xong</span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
            {tickets.filter(t => t.status === 'resolved').length} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>phiếu</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 300px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Tìm theo mã REQ, tiêu đề, tên bệnh nhân..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#334155' }}
          >
            <option value="all">Tất cả Phòng ban</option>
            {DEPARTMENTS.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#334155' }}
          >
            <option value="all">Mọi mức độ ưu tiên</option>
            <option value="urgent">🔥 Khẩn cấp (P1)</option>
            <option value="high">⚠️ Ưu tiên cao (P2)</option>
            <option value="normal">Tiêu chuẩn (P3)</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600, color: '#334155' }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ tiếp nhận</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="resolved">Đã giải quyết</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredTickets.length > 0 ? (
          filteredTickets.map(t => (
            <div
              key={t.id}
              onClick={() => setSelectedTicket(t)}
              style={{
                background: '#ffffff',
                border: selectedTicket?.id === t.id ? '2px solid #0f766e' : '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px 20px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', padding: '3px 8px', borderRadius: '6px' }}>
                    {t.code}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', background: '#f1f5f9', padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={13} color="#64748b" />
                    {t.department}
                  </span>
                  {getPriorityBadge(t.priority)}
                  {getStatusBadge(t.status)}
                </div>

                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Cập nhật: {new Date(t.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {t.title}
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                  {t.description}
                </p>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748b' }}>
                  {t.patientName && (
                    <span>Bệnh nhân liên quan: <strong>{t.patientName}</strong></span>
                  )}
                  {t.assignedTo && (
                    <span>Người phụ trách: <strong>{t.assignedTo}</strong></span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0f766e', fontSize: '12.5px', fontWeight: 700 }}>
                  <MessageSquare size={14} />
                  <span>{t.messages.length} trao đổi</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
            <HelpCircle size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>Không tìm thấy yêu cầu phù hợp</h4>
            <p style={{ margin: 0, fontSize: '13px' }}>Hãy thử điều chỉnh bộ lọc hoặc bấm nút Tạo yêu cầu mới phía trên.</p>
          </div>
        )}
      </div>

      {/* Modal: Create Support Ticket */}
      {showCreateModal && (
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
            maxWidth: '560px',
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
                <Plus size={18} color="#0f766e" />
                Tạo Yêu Cầu Hỗ Trợ Cho Phòng Ban
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Phòng ban tiếp nhận:
                </label>
                <select
                  value={newDept}
                  onChange={e => setNewDept(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 600 }}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.id} value={d.name}>{d.name} — {d.desc}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Mức độ ưu tiên:
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  >
                    <option value="normal">Tiêu chuẩn (P3)</option>
                    <option value="high">⚠️ Ưu tiên cao (P2)</option>
                    <option value="urgent">🔥 Khẩn cấp / Cấp cứu (P1)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Bệnh nhân liên quan (nếu có):
                  </label>
                  <select
                    value={newPatientId}
                    onChange={e => setNewPatientId(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  >
                    <option value="">-- Không chỉ định cụ thể --</option>
                    {appointments.map(a => (
                      <option key={a.id} value={a.patient_id}>
                        {(a as any).patient_name || `BN #${a.patient_id}`} (Mã: {a.patient_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Tiêu đề yêu cầu:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đọc khẩn kết quả chụp CT lồng ngực..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nội dung chi tiết & Đề xuất xử lý:
                </label>
                <textarea
                  rows={4}
                  placeholder="Mô tả cụ thể tình trạng, triệu chứng, số liệu cận lâm sàng hoặc vấn đề cần bộ phận hỗ trợ..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0f766e', color: '#ffffff', fontWeight: 700, cursor: 'pointer' }}
                >
                  Gửi yêu cầu ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ticket Details & Two-way Discussion */}
      {selectedTicket && (
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
            maxWidth: '650px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f766e', background: '#ccfbf1', padding: '2px 8px', borderRadius: '4px' }}>
                    {selectedTicket.code}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                    {selectedTicket.department}
                  </span>
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                <h3 style={{ margin: '6px 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedTicket.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content & Message history */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  Bác sĩ tạo phiếu: <strong>{selectedTicket.doctorName}</strong> • {selectedTicket.patientName ? `Bệnh nhân: ${selectedTicket.patientName}` : 'Nghiệp vụ chung'}
                </div>
                <div style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5 }}>
                  {selectedTicket.description}
                </div>
              </div>

              <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', marginTop: '6px' }}>
                Tiến trình trao đổi & Phản hồi từ Phòng ban:
              </div>

              {selectedTicket.messages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: m.isDoctor ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '85%',
                    background: m.isDoctor ? '#eff6ff' : '#f0fdf4',
                    border: `1px solid ${m.isDoctor ? '#bfdbfe' : '#bbf7d0'}`,
                    borderRadius: '10px',
                    padding: '12px 14px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: m.isDoctor ? '#1d4ed8' : '#15803d' }}>
                        {m.sender} ({m.senderRole})
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {m.timestamp}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                      {m.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Input */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Nhập nội dung phản hồi hoặc gửi thông tin bổ sung cho phòng ban..."
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendReply() }}
                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
              />
              <button
                type="button"
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                style={{
                  background: replyText.trim() ? '#0f766e' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13.5px',
                  cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={15} />
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
