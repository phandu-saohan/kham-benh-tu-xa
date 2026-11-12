import { useEffect, useState, useRef } from 'react'
import {
  Clock,
  Heart,
  Activity,
  Thermometer,
  Wind,
  CheckCircle2,
  Video,
  Mic,
  Camera,
  LogOut,
  Bell,
  Sparkles,
  ShieldCheck,
  Stethoscope,
  RefreshCw,
  UploadCloud,
  FileText,
  Pill,
  Image as ImageIcon,
  Trash2,
  Send,
  Eye,
  X,
  MessageSquare,
  Plus,
  Ruler,
  Weight,
  Scale,
  Paperclip,
  Droplets,
  Bluetooth
} from 'lucide-react'
import {
  type Appointment,
  type User as UserType,
  type WaitingRoomStatus,
  type AppointmentDocument,
  type ConsultationMessage,
  getWaitingRoomStatus,
  leaveWaitingRoom,
  getAppointmentDocuments,
  uploadAppointmentDocument,
  deleteAppointmentDocument,
  updatePatientWaitingVitals,
  getConsultationMessages,
  sendConsultationMessage
} from './api'
import './patient-sanctuary.css'

interface PatientWaitingRoomProps {
  appointment: Appointment
  user: UserType
  onBack: () => void
  onEnterConsultation: (appointment: Appointment) => void
}

export function PatientWaitingRoom({
  appointment,
  user,
  onBack,
  onEnterConsultation
}: PatientWaitingRoomProps) {
  // Navigation & Queue status
  const [waitingStatus, setWaitingStatus] = useState<WaitingRoomStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDoctorCalling, setIsDoctorCalling] = useState(false)
  const [autoJoinCountdown, setAutoJoinCountdown] = useState<number | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)

  // Active Tab
  const [activeTab, setActiveTab] = useState<'vitals' | 'documents' | 'chat'>('vitals')

  // --- 1. CHỈ SỐ SINH HIỆU (VITALS) STATES ---
  const [isSyncingVitals, setIsSyncingVitals] = useState(false)
  const [isEditingVitals, setIsEditingVitals] = useState(false)
  const [editBp, setEditBp] = useState('')
  const [editPulse, setEditPulse] = useState('')
  const [editTemp, setEditTemp] = useState('')
  const [editSpo2, setEditSpo2] = useState('')
  const [editWeight, setEditWeight] = useState('')
  const [editHeight, setEditHeight] = useState('')
  const [editGlucose, setEditGlucose] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [savingVitals, setSavingVitals] = useState(false)
  const [vitalsNotice, setVitalsNotice] = useState<string>('')

  // --- 2. ĐƠN THUỐC, XÉT NGHIỆM, CĐHA (DOCUMENTS) STATES ---
  const [documents, setDocuments] = useState<AppointmentDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'prescription' | 'lab_test' | 'cdha'>('all')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadDocType, setUploadDocType] = useState<'prescription' | 'lab_test' | 'cdha'>('prescription')
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadFileData, setUploadFileData] = useState<string>('')
  const [uploadFileName, setUploadFileName] = useState<string>('')
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // --- 3. CHAT ĐIỀU DƯỠNG & BỆNH NHÂN STATES ---
  const [messages, setMessages] = useState<ConsultationMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatImgData, setChatImgData] = useState<string | null>(null)
  const [chatImgName, setChatImgName] = useState<string | null>(null)
  const [sendingMsg, setSendingMsg] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const chatFileInputRef = useRef<HTMLInputElement>(null)

  // --- 4. CAMERA & MICRO TESTING STATES ---
  const [isCameraTesting, setIsCameraTesting] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [audioLevel, setAudioLevel] = useState<number>(0)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Refs for timers & audio
  const pollTimerRef = useRef<any>(null)
  const countdownTimerRef = useRef<any>(null)
  const audioChimePlayedRef = useRef(false)

  // Chime playback
  const playCallChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(587.33, now)
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.3)
      gain1.gain.setValueAtTime(0.3, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.6)

      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(880, now + 0.3)
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.7)
      gain2.gain.setValueAtTime(0.35, now + 0.3)
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.start(now + 0.3)
      osc2.stop(now + 1.2)
    } catch (e) {
      console.log('Chime playback error:', e)
    }
  }

  // Polling waiting room status and chat messages
  const checkStatus = async () => {
    try {
      const res = await getWaitingRoomStatus(appointment.id)
      setWaitingStatus(res)
      setIsLoading(false)

      if (res.is_called || res.status === 'in_progress') {
        if (!isDoctorCalling) {
          setIsDoctorCalling(true)
          if (!audioChimePlayedRef.current) {
            audioChimePlayedRef.current = true
            playCallChime()
          }
          if (autoJoinCountdown === null) {
            setAutoJoinCountdown(5)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching waiting room status:', err)
      setIsLoading(false)
    }
  }

  // Fetch documents
  const loadDocuments = async () => {
    try {
      setLoadingDocs(true)
      const docs = await getAppointmentDocuments(appointment.id)
      setDocuments(docs)
    } catch (e) {
      console.warn('Error loading appointment documents:', e)
    } finally {
      setLoadingDocs(false)
    }
  }

  // Fetch chat messages
  const loadMessages = async () => {
    try {
      const msgs = await getConsultationMessages(appointment.id)
      setMessages(msgs)
    } catch (e) {
      console.warn('Error loading chat messages:', e)
    }
  }

  useEffect(() => {
    checkStatus()
    loadDocuments()
    loadMessages()

    pollTimerRef.current = setInterval(() => {
      checkStatus()
      loadMessages()
    }, 2500)

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [appointment.id])

  // Scroll chat to bottom on new message
  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [messages, activeTab])

  // Countdown auto join
  useEffect(() => {
    if (autoJoinCountdown !== null && autoJoinCountdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setAutoJoinCountdown(autoJoinCountdown - 1)
      }, 1000)
    } else if (autoJoinCountdown === 0) {
      handleJoin()
    }
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    }
  }, [autoJoinCountdown])

  const handleJoin = () => {
    stopCameraTest()
    onEnterConsultation({
      ...appointment,
      status: 'in_progress'
    })
  }

  const handleLeave = async () => {
    setIsLeaving(true)
    try {
      await leaveWaitingRoom(appointment.id)
    } catch (e) {
      console.warn('Error leaving waiting room:', e)
    } finally {
      stopCameraTest()
      onBack()
    }
  }

  // --- ACTIONS: ĐỒNG BỘ HOẶC TỰ NHẬP SINH HIỆU ---
  const handleSyncVitalsFromProfile = async () => {
    setIsSyncingVitals(true)
    setVitalsNotice('')
    try {
      const res = await updatePatientWaitingVitals(appointment.id, { sync_from_profile: true })
      setVitalsNotice('✓ Đã đồng bộ chỉ số sinh hiệu gần nhất từ hồ sơ y tế thành công!')
      checkStatus()
      setTimeout(() => setVitalsNotice(''), 4000)
    } catch (e: any) {
      alert('Lỗi đồng bộ sinh hiệu: ' + (e.message || 'Vui lòng thử lại'))
    } finally {
      setIsSyncingVitals(false)
    }
  }

  const openVitalsEditForm = () => {
    const curVitals = waitingStatus?.vitals || (appointment as any)
    setEditBp(curVitals.blood_pressure || '')
    setEditPulse(curVitals.pulse ? String(curVitals.pulse) : '')
    setEditTemp(curVitals.temperature ? String(curVitals.temperature) : '')
    setEditSpo2(curVitals.spo2 ? String(curVitals.spo2) : '')
    setEditWeight(curVitals.weight ? String(curVitals.weight) : (user as any).weight ? String((user as any).weight) : '')
    setEditHeight(curVitals.height ? String(curVitals.height) : (user as any).height ? String((user as any).height) : '')
    setEditGlucose((curVitals as any).glucose ? String((curVitals as any).glucose) : '')
    setEditNotes('')
    setIsEditingVitals(true)
  }

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingVitals(true)
    try {
      await updatePatientWaitingVitals(appointment.id, {
        blood_pressure: editBp.trim() || undefined,
        pulse: editPulse ? parseInt(editPulse) : undefined,
        temperature: editTemp ? parseFloat(editTemp) : undefined,
        spo2: editSpo2 ? parseInt(editSpo2) : undefined,
        weight: editWeight ? parseFloat(editWeight) : undefined,
        height: editHeight ? parseFloat(editHeight) : undefined,
        notes: editNotes.trim() || undefined
      })
      setIsEditingVitals(false)
      setVitalsNotice('✓ Đã cập nhật chỉ số sinh hiệu thành công. Điều dưỡng và Bác sĩ đã nhận được số liệu!')
      checkStatus()
      setTimeout(() => setVitalsNotice(''), 4500)
    } catch (e: any) {
      alert('Lỗi lưu sinh hiệu: ' + (e.message || 'Vui lòng kiểm tra lại'))
    } finally {
      setSavingVitals(false)
    }
  }

  // --- ACTIONS: TẢI TÀI LIỆU (ĐƠN THUỐC, XÉT NGHIỆM, CĐHA) ---
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadFileName(file.name)
    if (!uploadTitle) {
      const defaultName = uploadDocType === 'prescription'
        ? 'Đơn thuốc / Hộp thuốc đang dùng'
        : uploadDocType === 'lab_test'
        ? 'Phiếu kết quả xét nghiệm'
        : 'Phiếu Chẩn đoán hình ảnh (CĐHA)'
      setUploadTitle(defaultName)
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const rawBase64 = ev.target?.result as string
      // If image, compress via canvas for optimal upload
      if (file.type.startsWith('image/')) {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxDim = 1200
          let width = img.width
          let height = img.height
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.85)
          setUploadFileData(compressed)
        }
        img.src = rawBase64
      } else {
        setUploadFileData(rawBase64)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFileData) {
      alert('Vui lòng chọn hình ảnh hoặc tệp tài liệu y tế.')
      return
    }
    if (!uploadTitle.trim()) {
      alert('Vui lòng nhập tên tài liệu.')
      return
    }

    setUploadingDoc(true)
    try {
      await uploadAppointmentDocument(appointment.id, {
        document_type: uploadDocType,
        title: uploadTitle.trim(),
        description: uploadDescription.trim() || undefined,
        file_data: uploadFileData,
        file_name: uploadFileName || `${uploadDocType}.jpg`
      })
      setIsUploadModalOpen(false)
      setUploadTitle('')
      setUploadDescription('')
      setUploadFileData('')
      setUploadFileName('')
      loadDocuments()
      loadMessages()
    } catch (e: any) {
      alert('Lỗi tải tài liệu: ' + (e.message || 'Vui lòng thử lại'))
    } finally {
      setUploadingDoc(false)
    }
  }

  const handleDeleteDocument = async (docId: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài liệu này khỏi ca khám?')) return
    try {
      await deleteAppointmentDocument(appointment.id, docId)
      loadDocuments()
    } catch (e: any) {
      alert('Lỗi xóa tài liệu: ' + (e.message || 'Vui lòng thử lại'))
    }
  }

  // --- ACTIONS: CHAT VỚI ĐIỀU DƯỠNG ---
  const handleSelectChatImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setChatImgName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rawBase64 = ev.target?.result as string
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDim = 1000
        let width = img.width
        let height = img.height
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.82)
        setChatImgData(compressed)
      }
      img.src = rawBase64
    }
    reader.readAsDataURL(file)
  }

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : chatInput
    if (!textToSend.trim() && !chatImgData) return

    setSendingMsg(true)
    try {
      await sendConsultationMessage(appointment.id, {
        content: textToSend.trim() || undefined,
        message_type: chatImgData ? 'image' : 'text',
        file_data: chatImgData || undefined,
        file_name: chatImgName || (chatImgData ? 'chat_photo.jpg' : undefined)
      })
      setChatInput('')
      setChatImgData(null)
      setChatImgName(null)
      loadMessages()
    } catch (e: any) {
      alert('Lỗi gửi tin nhắn: ' + (e.message || 'Vui lòng thử lại'))
    } finally {
      setSendingMsg(false)
    }
  }

  // --- ACTIONS: CAMERA & MICRO TESTING ---
  const toggleCameraTest = async () => {
    if (isCameraTesting) {
      stopCameraTest()
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        setCameraStream(stream)
        setIsCameraTesting(true)
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream
        }

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) {
          const audioCtx = new AudioCtx()
          audioContextRef.current = audioCtx
          const analyser = audioCtx.createAnalyser()
          const source = audioCtx.createMediaStreamSource(stream)
          source.connect(analyser)
          analyser.fftSize = 64
          const dataArray = new Uint8Array(analyser.frequencyBinCount)

          const updateLevel = () => {
            if (!stream.active) return
            analyser.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
            const avg = sum / dataArray.length
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)))
            requestAnimationFrame(updateLevel)
          }
          updateLevel()
        }
      } catch (err) {
        alert('Không thể mở camera/micro. Vui lòng cấp quyền truy cập trên trình duyệt.')
      }
    }
  }

  const stopCameraTest = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop())
      setCameraStream(null)
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    setIsCameraTesting(false)
  }

  useEffect(() => {
    return () => {
      stopCameraTest()
    }
  }, [])

  // Vitals data resolution
  const curVitals = waitingStatus?.vitals || {
    blood_pressure: appointment.blood_pressure,
    pulse: appointment.pulse,
    temperature: appointment.temperature,
    spo2: appointment.spo2,
    weight: appointment.weight,
    height: appointment.height,
    glucose: (waitingStatus?.vitals as any)?.glucose || (appointment as any).glucose || undefined
  }
  const heightVal = curVitals.height || (user as any).height || null
  const weightVal = curVitals.weight || (user as any).weight || null
  const bmiVal = heightVal && weightVal ? (weightVal / Math.pow(heightVal / 100, 2)).toFixed(1) : null

  // Filtered documents
  const filteredDocs = filterType === 'all'
    ? documents
    : documents.filter(d => d.document_type === filterType)

  return (
    <div className="ps-scope">
      <div className="pwr-viewport">
        {/* 1. Mobile App Topbar */}
        <header className="pwr-topbar">
          <div className="pwr-topbar-left">
            <div className="pwr-topbar-title">
              <Stethoscope size={18} color="#0f766e" />
              <span>Phòng Chờ</span>
            </div>
            <div className="pwr-live-badge">
              <span className="pwr-live-dot" /> Trực tuyến
            </div>
          </div>

          <button
            className="pwr-leave-btn"
            onClick={handleLeave}
            disabled={isLeaving}
            title="Rời phòng chờ về trang chủ"
          >
            <LogOut size={14} />
            <span>{isLeaving ? 'Đang rời...' : 'Rời phòng'}</span>
          </button>
        </header>

        {/* 2. Doctor Calling Flash Alert */}
        {isDoctorCalling && (
          <div className="pwr-calling-banner">
            <div className="pwr-calling-info">
              <div className="pwr-calling-bell">
                <Bell size={22} className="pwr-bell-ring" />
              </div>
              <div>
                <h4 className="pwr-calling-title">
                  Bác sĩ {waitingStatus?.doctor_name || 'phụ trách'} đang mời bạn vào khám!
                </h4>
                <p className="pwr-calling-desc">
                  Buồng khám đã sẵn sàng.
                  {autoJoinCountdown !== null && (
                    <span style={{ marginLeft: '6px', fontWeight: 800 }}>
                      Tự động chuyển vào sau {autoJoinCountdown}s
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button className="pwr-btn-join-now" onClick={handleJoin}>
              <Video size={17} /> Vào Gặp Bác Sĩ Ngay
            </button>
          </div>
        )}

        {/* 3. Hero Queue & Doctor Status Section */}
        <div className="pwr-hero-card">
          {/* Top: Queue Header */}
          <div className="pwr-queue-header">
            <div className="pwr-queue-badge-box">
              <div className="pwr-queue-number-circle">
                <span className="pwr-queue-number-val">#{String(waitingStatus?.queue_number || 1).padStart(2, '0')}</span>
                <span className="pwr-queue-number-lbl">Số khám</span>
              </div>
              <div className="pwr-queue-meta">
                <span className="pwr-queue-meta-title">Lượt khám trực tuyến</span>
                <div className="pwr-queue-meta-stats">
                  <span className="pwr-queue-stat-item">
                    <Clock size={13} color="#d97706" />
                    Ước tính: <b>~{waitingStatus?.estimated_wait_minutes || 5} phút</b>
                  </span>
                  {waitingStatus && waitingStatus.patients_ahead > 0 && (
                    <span className="pwr-queue-stat-item pwr-queue-ahead-tag">
                      • Còn {waitingStatus.patients_ahead} người trước
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="pwr-doctor-status-badge">
              <span className="pwr-live-dot" /> Đang phục vụ
            </span>
          </div>

          {/* Middle: Doctor Info */}
          <div className="pwr-doctor-row">
            <div className="pwr-doctor-info-box">
              <div className="pwr-doctor-avatar">
                🩺
              </div>
              <div>
                <div className="pwr-doctor-role-tag">
                  {waitingStatus?.doctor_title || 'Bác sĩ chuyên khoa phụ trách'}
                </div>
                <div className="pwr-doctor-name">
                  {waitingStatus?.doctor_name || 'Bác sĩ phụ trách ca khám'}
                </div>
                <div className="pwr-doctor-dept">
                  {waitingStatus?.department_name || 'Khoa Nội Tổng Quát'}
                </div>
              </div>
            </div>
            <span className="pwr-doctor-status-badge">
              <span className="pwr-live-dot" /> Đang trực ca
            </span>
          </div>

          {/* Bottom: 3 Steps Stepper */}
          <div className="pwr-stepper-row">
            <div className="pwr-step-item completed">
              <div className="pwr-step-header">
                <CheckCircle2 size={12} /> B1. Check-in
              </div>
              <div className="pwr-step-label">Phòng chờ</div>
            </div>

            <div className={`pwr-step-item ${waitingStatus?.triage_status === 'assessed' || waitingStatus?.triage_status === 'dispatched' ? 'completed' : 'active'}`}>
              <div className="pwr-step-header">
                {waitingStatus?.triage_status === 'assessed' || waitingStatus?.triage_status === 'dispatched' ? (
                  <CheckCircle2 size={12} />
                ) : (
                  <Clock size={12} />
                )}
                B2. Điều dưỡng
              </div>
              <div className="pwr-step-label">Nhận sinh hiệu</div>
            </div>

            <div className={`pwr-step-item ${waitingStatus?.is_called || waitingStatus?.status === 'in_progress' ? 'completed' : ''}`}>
              <div className="pwr-step-header">
                <Video size={12} /> B3. Bác sĩ
              </div>
              <div className="pwr-step-label">Khám online</div>
            </div>
          </div>

          {/* Device Camera & Mic Test Trigger */}
          <div className="pwr-test-section">
            <button
              type="button"
              className={`pwr-btn-test-trigger ${isCameraTesting ? 'active' : ''}`}
              onClick={toggleCameraTest}
            >
              <Camera size={15} />
              <span>{isCameraTesting ? 'Tắt xem thử Camera & Micro' : 'Kiểm Tra Camera & Micro trước giờ khám'}</span>
            </button>

            {isCameraTesting && (
              <div className="pwr-cam-preview-box">
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="pwr-cam-video"
                />
                <div className="pwr-mic-overlay">
                  <Mic size={13} color="#10b981" />
                  <span>Micro:</span>
                  <div className="pwr-meter-bar">
                    <div className="pwr-meter-fill" style={{ width: `${audioLevel}%` }} />
                  </div>
                  <span>{audioLevel}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 4. Segmented 3-Tab Control */}
        <div className="pwr-segmented-tabs">
          <button
            type="button"
            className={`pwr-tab-item ${activeTab === 'vitals' ? 'active' : ''}`}
            onClick={() => setActiveTab('vitals')}
          >
            <Activity size={15} />
            <span>Sinh hiệu</span>
          </button>

          <button
            type="button"
            className={`pwr-tab-item ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={15} />
            <span>Tài liệu & Đơn</span>
            {documents.length > 0 && (
              <span className="pwr-tab-count-badge">{documents.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`pwr-tab-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={15} />
            <span>Điều dưỡng</span>
            {messages.length > 0 && (
              <span className="pwr-tab-count-badge">{messages.length}</span>
            )}
          </button>
        </div>

        {/* =========================================================================
            TAB 1: CHỈ SỐ SINH HIỆU & SỨC KHỎE
           ========================================================================= */}
        {activeTab === 'vitals' && (
          <div className="pwr-vitals-card">
            <div className="pwr-vitals-toolbar">
              <div>
                <div className="pwr-vitals-toolbar-title">Chỉ Số Sinh Hiệu Trước Khám</div>
                <div className="pwr-vitals-toolbar-sub">Dữ liệu hỗ trợ Bác sĩ chẩn đoán an toàn</div>
              </div>
              <div className="pwr-vitals-toolbar-btns">
                <button
                  type="button"
                  className="pwr-btn-tool sync"
                  onClick={handleSyncVitalsFromProfile}
                  disabled={isSyncingVitals}
                  title="Đồng bộ chỉ số đo gần nhất từ hồ sơ cá nhân hoặc thiết bị"
                >
                  <RefreshCw size={13} className={isSyncingVitals ? 'pr-spin' : ''} />
                  <span>{isSyncingVitals ? 'Đang đồng bộ...' : 'Đồng bộ hồ sơ/BLE'}</span>
                </button>
                <button
                  type="button"
                  className="pwr-btn-tool edit"
                  onClick={() => setIsEditingVitals(!isEditingVitals)}
                >
                  <Activity size={13} />
                  <span>{isEditingVitals ? 'Đóng form' : 'Tự nhập chỉ số'}</span>
                </button>
              </div>
            </div>

            {vitalsNotice && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px', color: '#15803d', fontSize: '12px', fontWeight: 600 }}>
                {vitalsNotice}
              </div>
            )}

            {/* Quick Input Form */}
            {isEditingVitals && (
              <form onSubmit={handleSaveVitals} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                    ✏️ Nhập chỉ số đo thực tế tại nhà
                  </span>
                  <small style={{ color: '#64748b', fontSize: '11px' }}>Để trống nếu giữ giá trị cũ</small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Huyết áp (mmHg)</label>
                    <input type="text" className="ps-form-input" value={editBp} onChange={e => setEditBp(e.target.value)} placeholder="120/80" style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Nhịp tim (bpm)</label>
                    <input type="number" inputMode="numeric" className="ps-form-input" value={editPulse} onChange={e => setEditPulse(e.target.value)} placeholder="76" style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Thân nhiệt (°C)</label>
                    <input type="number" step="0.1" inputMode="decimal" className="ps-form-input" value={editTemp} onChange={e => setEditTemp(e.target.value)} placeholder="36.8" style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>SpO2 (%)</label>
                    <input type="number" inputMode="numeric" className="ps-form-input" value={editSpo2} onChange={e => setEditSpo2(e.target.value)} placeholder="98" style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Chiều cao (cm)</label>
                    <input type="number" step="0.5" inputMode="decimal" className="ps-form-input" value={editHeight} onChange={e => setEditHeight(e.target.value)} placeholder="165" style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Cân nặng (kg)</label>
                    <input type="number" step="0.5" inputMode="decimal" className="ps-form-input" value={editWeight} onChange={e => setEditWeight(e.target.value)} placeholder="60" style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Đường huyết (mmol/L)</label>
                    <input type="number" step="0.1" inputMode="decimal" className="ps-form-input" value={editGlucose} onChange={e => setEditGlucose(e.target.value)} placeholder="5.6" style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>Ghi chú triệu chứng:</label>
                  <input type="text" className="ps-form-input" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Cảm giác cơ thể lúc đo..." style={{ borderRadius: '6px', fontSize: '12.5px', padding: '6px 10px' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button type="button" className="ps-btn-secondary" onClick={() => setIsEditingVitals(false)} style={{ borderRadius: '6px', padding: '6px 12px', fontSize: '12px' }}>Hủy</button>
                  <button type="submit" className="ps-btn-primary" disabled={savingVitals} style={{ borderRadius: '6px', padding: '6px 16px', fontSize: '12px' }}>{savingVitals ? 'Đang lưu...' : 'Lưu chỉ số'}</button>
                </div>
              </form>
            )}

            {/* Vitals Grid View */}
            <div className="pwr-vitals-grid">
              <div className="pwr-vital-tile">
                <div className="pwr-vital-tile-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626' }}><Heart size={14} /> Huyết áp</span>
                  <span className={`pwr-vital-status ${curVitals.blood_pressure ? 'ready' : 'empty'}`}>{curVitals.blood_pressure ? 'Đã đo' : 'Chưa đo'}</span>
                </div>
                <div className="pwr-vital-val-box">
                  <span className="pwr-vital-val">{curVitals.blood_pressure || '--/--'}</span>
                  <span className="pwr-vital-unit">mmHg</span>
                </div>
              </div>

              <div className="pwr-vital-tile">
                <div className="pwr-vital-tile-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0f766e' }}><Activity size={14} /> Nhịp tim</span>
                  <span className={`pwr-vital-status ${curVitals.pulse ? 'ready' : 'empty'}`}>{curVitals.pulse ? 'Đã đo' : 'Chưa đo'}</span>
                </div>
                <div className="pwr-vital-val-box">
                  <span className="pwr-vital-val">{curVitals.pulse || '--'}</span>
                  <span className="pwr-vital-unit">bpm</span>
                </div>
              </div>

              <div className="pwr-vital-tile">
                <div className="pwr-vital-tile-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7' }}><Wind size={14} /> SpO2</span>
                  <span className={`pwr-vital-status ${curVitals.spo2 ? 'ready' : 'empty'}`}>{curVitals.spo2 ? 'Đã đo' : 'Chưa đo'}</span>
                </div>
                <div className="pwr-vital-val-box">
                  <span className="pwr-vital-val">{curVitals.spo2 || '--'}</span>
                  <span className="pwr-vital-unit">%</span>
                </div>
              </div>

              <div className="pwr-vital-tile">
                <div className="pwr-vital-tile-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706' }}><Thermometer size={14} /> Thân nhiệt</span>
                  <span className={`pwr-vital-status ${curVitals.temperature ? 'ready' : 'empty'}`}>{curVitals.temperature ? 'Đã đo' : 'Chưa đo'}</span>
                </div>
                <div className="pwr-vital-val-box">
                  <span className="pwr-vital-val">{curVitals.temperature || '--'}</span>
                  <span className="pwr-vital-unit">°C</span>
                </div>
              </div>

              <div className="pwr-vital-tile">
                <div className="pwr-vital-tile-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309' }}><Droplets size={14} /> Đường huyết</span>
                  <span className={`pwr-vital-status ${(curVitals as any).glucose ? 'ready' : 'empty'}`}>{(curVitals as any).glucose ? 'Đã đo' : 'Chưa đo'}</span>
                </div>
                <div className="pwr-vital-val-box">
                  <span className="pwr-vital-val">{(curVitals as any).glucose || '--'}</span>
                  <span className="pwr-vital-unit">mmol/L</span>
                </div>
              </div>

              <div className="pwr-vital-tile">
                <div className="pwr-vital-tile-header">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}><Ruler size={14} /> Chiều cao • Cân nặng</span>
                  <span className={`pwr-vital-status ${bmiVal ? 'ready' : 'empty'}`}>{bmiVal ? `BMI ${bmiVal}` : 'Chưa có'}</span>
                </div>
                <div className="pwr-vital-val-box">
                  <span className="pwr-vital-val" style={{ fontSize: '15px' }}>{heightVal || '--'} cm • {weightVal || '--'} kg</span>
                </div>
              </div>
            </div>

            {waitingStatus?.triage_notes && (
              <div style={{ background: '#eff6ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
                <b>Nhận định điều dưỡng:</b> {waitingStatus.triage_notes}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: ĐƠN THUỐC, XÉT NGHIỆM & PHIẾU CĐHA (DOCUMENTS)
           ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="pwr-docs-card">
            <div className="pwr-filter-scroll">
              <button className={`pwr-filter-chip ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
                Tất cả ({documents.length})
              </button>
              <button className={`pwr-filter-chip ${filterType === 'prescription' ? 'active' : ''}`} onClick={() => setFilterType('prescription')}>
                💊 Đơn thuốc ({documents.filter(d => d.document_type === 'prescription').length})
              </button>
              <button className={`pwr-filter-chip ${filterType === 'lab_test' ? 'active' : ''}`} onClick={() => setFilterType('lab_test')}>
                🧪 Xét nghiệm ({documents.filter(d => d.document_type === 'lab_test').length})
              </button>
              <button className={`pwr-filter-chip ${filterType === 'cdha' ? 'active' : ''}`} onClick={() => setFilterType('cdha')}>
                🩻 CĐHA ({documents.filter(d => d.document_type === 'cdha').length})
              </button>
            </div>

            <button type="button" className="pwr-btn-upload-trigger" onClick={() => setIsUploadModalOpen(true)}>
              <Plus size={16} />
              <span>Chụp ảnh / Tải lên đơn thuốc & tài liệu</span>
            </button>

            {loadingDocs ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '13px' }}>
                Đang tải tài liệu y tế...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                <UploadCloud size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>Chưa có tài liệu hoặc ảnh thuốc</div>
                <div style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 12px' }}>Chụp ảnh đơn thuốc cũ hoặc xét nghiệm để Bác sĩ xem trước</div>
                <button type="button" className="ps-btn-primary" onClick={() => setIsUploadModalOpen(true)} style={{ borderRadius: '8px', padding: '6px 16px', fontSize: '12px' }}>
                  <Plus size={14} /> Tải lên ngay
                </button>
              </div>
            ) : (
              <div className="pwr-docs-list">
                {filteredDocs.map((doc) => {
                  const isImage = doc.file_url.match(/\.(jpeg|jpg|png|webp)($|\?)/i) || doc.file_url.startsWith('data:image')
                  const typeLabel = doc.document_type === 'prescription' ? 'Đơn thuốc' : doc.document_type === 'lab_test' ? 'Xét nghiệm' : doc.document_type === 'cdha' ? 'CĐHA' : 'Tài liệu'

                  return (
                    <div key={doc.id} className="pwr-doc-item">
                      <div className="pwr-doc-thumb-box" onClick={() => {
                        if (isImage) {
                          setLightboxImg({ url: doc.file_url, title: doc.title })
                        } else {
                          window.open(doc.file_url, '_blank')
                        }
                      }}>
                        {isImage ? (
                          <img src={doc.file_url} alt={doc.title} className="pwr-doc-thumb-img" />
                        ) : (
                          <FileText size={22} color="#64748b" />
                        )}
                      </div>

                      <div className="pwr-doc-info">
                        <div className="pwr-doc-title">{doc.title}</div>
                        <div className="pwr-doc-sub">
                          <span className="pwr-doc-badge">{typeLabel}</span>
                          <span>{new Date(doc.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>

                      <button type="button" className="pwr-doc-del-btn" onClick={() => handleDeleteDocument(doc.id)} title="Xóa tài liệu">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Tải Lên Tài Liệu */}
        {isUploadModalOpen && (
          <div className="pwr-lightbox-overlay" onClick={() => setIsUploadModalOpen(false)}>
            <div className="pwr-lightbox-content" onClick={e => e.stopPropagation()} style={{ padding: '16px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Tải Lên Tài Liệu & Đơn Thuốc
                </h4>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Loại tài liệu:
                  </label>
                  <select
                    className="ps-form-input"
                    value={uploadDocType}
                    onChange={(e: any) => setUploadDocType(e.target.value)}
                    style={{ borderRadius: '8px', fontSize: '12.5px', padding: '7px 10px' }}
                  >
                    <option value="prescription">💊 Đơn thuốc cũ / Hộp thuốc đang dùng</option>
                    <option value="lab_test">🧪 Phiếu xét nghiệm (Máu, nước tiểu...)</option>
                    <option value="cdha">🩻 Phiếu CĐHA (X-quang, Siêu âm...)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Tiêu đề tài liệu: *
                  </label>
                  <input
                    type="text"
                    required
                    className="ps-form-input"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="VD: Đơn thuốc huyết áp, phiếu xét nghiệm BV..."
                    style={{ borderRadius: '8px', fontSize: '12.5px', padding: '7px 10px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Ghi chú chi tiết cho Bác sĩ (tùy chọn):
                  </label>
                  <textarea
                    rows={2}
                    className="ps-form-input"
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    placeholder="VD: Đã uống được 2 tuần, còn 5 viên..."
                    style={{ borderRadius: '8px', fontSize: '12.5px', padding: '7px 10px', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#334155', marginBottom: '3px' }}>
                    Ảnh chụp hoặc tệp tài liệu: *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={handleSelectFile}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '14px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    {uploadFileData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        {uploadFileData.startsWith('data:image') && (
                          <img
                            src={uploadFileData}
                            alt="preview"
                            style={{ maxHeight: '110px', borderRadius: '6px', objectFit: 'contain' }}
                          />
                        )}
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e' }}>
                          ✓ {uploadFileName || 'Đã chọn ảnh'} (Chạm để đổi)
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                        <Camera size={24} color="#0f766e" />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                          Chạm để Chụp ảnh hoặc Tải ảnh từ máy
                        </span>
                        <small style={{ fontSize: '11px', color: '#94a3b8' }}>Hỗ trợ JPG, PNG, WEBP, PDF</small>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="ps-btn-secondary"
                    onClick={() => setIsUploadModalOpen(false)}
                    style={{ borderRadius: '8px', padding: '7px 14px', fontSize: '12px' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="ps-btn-primary"
                    disabled={uploadingDoc || !uploadFileData}
                    style={{ borderRadius: '8px', padding: '7px 18px', fontSize: '12px' }}
                  >
                    {uploadingDoc ? 'Đang tải lên...' : 'Xác Nhận Tải Lên'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: CHAT VỚI ĐIỀU DƯỠNG TIẾP ĐÓN
           ========================================================================= */}
        {activeTab === 'chat' && (
          <div className="pwr-chat-card">
            <div className="pwr-chat-header">
              <div className="pwr-chat-header-info">
                <div className="pwr-nurse-avatar">👩‍⚕️</div>
                <div>
                  <h5 className="pwr-nurse-title">Điều dưỡng tiếp đón & điều phối</h5>
                  <div className="pwr-nurse-status">
                    <span className="pwr-live-dot" /> Trực tuyến hỗ trợ
                  </div>
                </div>
              </div>
              <small style={{ fontSize: '11px', color: '#94a3b8' }}>Ca #{appointment.id}</small>
            </div>

            <div className="pwr-chat-stream" ref={chatScrollRef}>
              <div className="pwr-chat-bubble nurse">
                <div className="pwr-bubble-body">
                  Chào bạn! Tôi là Điều dưỡng trực ban phòng chờ. Bạn có thể nhắn tin hoặc gửi ảnh thuốc đang dùng để tôi cập nhật cho Bác sĩ nhé.
                </div>
                <span className="pwr-bubble-footer">Điều dưỡng tiếp đón • Tự động</span>
              </div>

              {messages.map((msg) => {
                const isPatient = msg.sender_role === 'patient'
                const isNurse = msg.sender_role === 'nurse'
                const roleLabel = isPatient ? 'Bạn' : isNurse ? 'Điều dưỡng' : 'Bác sĩ'
                const timeStr = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={msg.id} className={`pwr-chat-bubble ${isPatient ? 'patient' : isNurse ? 'nurse' : 'doctor'}`}>
                    <div className="pwr-bubble-body">
                      {msg.content && <div>{msg.content}</div>}
                      {msg.file_url && (
                        <div
                          style={{ marginTop: '4px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer' }}
                          onClick={() => setLightboxImg({ url: msg.file_url!, title: msg.file_name || 'Ảnh đính kèm' })}
                        >
                          <img src={msg.file_url} alt={msg.file_name || 'img'} style={{ maxHeight: '140px', maxWidth: '100%', display: 'block', borderRadius: '6px' }} />
                        </div>
                      )}
                    </div>
                    <span className="pwr-bubble-footer">{roleLabel} • {timeStr}</span>
                  </div>
                )
              })}
            </div>

            {/* Quick replies */}
            <div className="pwr-quick-replies">
              <button type="button" className="pwr-quick-btn" onClick={() => handleSendMessage('Chào điều dưỡng, tôi đã nhập đầy đủ sinh hiệu và tải ảnh thuốc lên rồi ạ.')}>
                ✓ Đã nhập sinh hiệu & ảnh thuốc
              </button>
              <button type="button" className="pwr-quick-btn" onClick={() => handleSendMessage('Cho tôi hỏi khoảng bao lâu nữa Bác sĩ bắt đầu khám vậy ạ?')}>
                ⏱️ Khi nào Bác sĩ khám?
              </button>
              <button type="button" className="pwr-quick-btn" onClick={() => handleSendMessage('Tôi có triệu chứng sốt và mệt mỏi từ 2 ngày trước.')}>
                🤒 Tôi bị sốt và mệt mỏi
              </button>
            </div>

            {/* Input bar */}
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="pwr-input-bar">
              <input type="file" ref={chatFileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleSelectChatImage} />
              <button
                type="button"
                onClick={() => chatFileInputRef.current?.click()}
                style={{
                  background: chatImgData ? '#e0f2fe' : 'none',
                  border: chatImgData ? '1px solid #38bdf8' : 'none',
                  borderRadius: '6px',
                  color: chatImgData ? '#0284c7' : '#64748b',
                  padding: '6px',
                  cursor: 'pointer',
                  display: 'flex'
                }}
              >
                <Camera size={18} />
              </button>

              {chatImgData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#0369a1' }}>
                  <span>📷 1 ảnh</span>
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setChatImgData(null)} />
                </div>
              )}

              <input
                type="text"
                className="pwr-input-field"
                placeholder="Nhắn tin với Điều dưỡng..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />

              <button type="submit" disabled={sendingMsg || (!chatInput.trim() && !chatImgData)} className="pwr-btn-send">
                <Send size={15} />
              </button>
            </form>
          </div>
        )}

        {/* Lightbox Phóng To Ảnh */}
        {lightboxImg && (
          <div className="pwr-lightbox-overlay" onClick={() => setLightboxImg(null)}>
            <div className="pwr-lightbox-content" onClick={e => e.stopPropagation()}>
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>{lightboxImg.title}</span>
                <button type="button" onClick={() => setLightboxImg(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}>
                  <X size={18} />
                </button>
              </div>
              <img src={lightboxImg.url} alt={lightboxImg.title} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block', background: '#000' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default PatientWaitingRoom
