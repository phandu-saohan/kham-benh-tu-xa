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
  ArrowLeft,
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
  Paperclip
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
    if (window.confirm('Bạn có chắc chắn muốn rời khỏi phòng chờ? Bạn có thể vào lại bất kỳ lúc nào.')) {
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
    setEditBp(curVitals.blood_pressure || '120/80')
    setEditPulse(curVitals.pulse ? String(curVitals.pulse) : '76')
    setEditTemp(curVitals.temperature ? String(curVitals.temperature) : '36.8')
    setEditSpo2(curVitals.spo2 ? String(curVitals.spo2) : '98')
    setEditWeight(curVitals.weight ? String(curVitals.weight) : (user as any).weight ? String((user as any).weight) : '60')
    setEditHeight(curVitals.height ? String(curVitals.height) : (user as any).height ? String((user as any).height) : '165')
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
    height: appointment.height
  }
  const heightVal = curVitals.height || (user as any).height || 165
  const weightVal = curVitals.weight || (user as any).weight || 60
  const bmiVal = (weightVal / Math.pow(heightVal / 100, 2)).toFixed(1)

  // Filtered documents
  const filteredDocs = filterType === 'all'
    ? documents
    : documents.filter(d => d.document_type === filterType)

  return (
    <div className="ps-scope">
      <div className="ps-waiting-viewport">
        {/* Top Navigation Bar */}
        <header className="ps-waiting-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="ps-btn-back" onClick={onBack} title="Về trang chủ (vẫn giữ số thứ tự)">
              <ArrowLeft size={16} /> Về trang chủ
            </button>
            <button
              className="ps-btn-back"
              onClick={handleLeave}
              disabled={isLeaving}
              style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
              title="Rời khỏi phòng chờ"
            >
              {isLeaving ? 'Đang rời...' : 'Rời phòng chờ'}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: 'var(--ps-navy)' }}>
            <Stethoscope size={17} color="var(--ps-primary)" />
            <span>CareConnect • <b>Phòng Chờ Khám Trực Tuyến & Điều Dưỡng Điều Phối</b></span>
          </div>
          <div className="ps-waiting-live-chip">
            <span className="ps-live-dot" /> Đang Trực Tuyến
          </div>
        </header>

        {/* Doctor Calling Flash Banner */}
        {isDoctorCalling && (
          <div className="ps-doctor-calling-hero" style={{ borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Bell size={26} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                  Bác sĩ {waitingStatus?.doctor_name || 'phụ trách'} đang mời bạn vào phòng khám!
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: '13.5px', opacity: 0.9 }}>
                  Hồ sơ bệnh án điện tử và sinh hiệu đã sẵn sàng.
                  {autoJoinCountdown !== null && (
                    <span style={{ marginLeft: '8px', fontWeight: 700 }}>
                      Tự động chuyển vào sau {autoJoinCountdown}s
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button className="ps-calling-btn-now" onClick={handleJoin} style={{ borderRadius: '6px' }}>
              <Video size={18} /> Vào Gặp Bác Sĩ Ngay
            </button>
          </div>
        )}

        {/* Top Queue & Doctor Summary Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '16px' }}>
          {/* Big Queue Number Display */}
          <div className="ps-queue-hero" style={{ borderRadius: '8px' }}>
            <span className="ps-queue-hero-label">SỐ THỨ TỰ PHÒNG CHỜ CỦA BẠN</span>
            <div className="ps-queue-big-number">
              #{String(waitingStatus?.queue_number || 1).padStart(2, '0')}
            </div>
            <div className="ps-queue-estimate">
              <Clock size={15} color="var(--ps-warning)" />
              <span>
                Thời gian chờ ước tính: <b>~{waitingStatus?.estimated_wait_minutes || 5} phút</b>
              </span>
              {waitingStatus && waitingStatus.patients_ahead > 0 && (
                <span style={{ color: 'var(--ps-primary)', fontWeight: 600 }}>
                  (Còn {waitingStatus.patients_ahead} người phía trước)
                </span>
              )}
            </div>

            {/* Nút Kiểm tra Camera & Micro đặt dưới Thời gian chờ ước tính */}
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={isCameraTesting ? 'ps-btn-secondary' : 'ps-btn-primary'}
                onClick={toggleCameraTest}
                style={{
                  borderRadius: '6px',
                  padding: '7px 16px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center',
                  boxShadow: isCameraTesting ? 'none' : '0 2px 6px rgba(14, 116, 144, 0.25)'
                }}
              >
                <Camera size={15} />
                <span>{isCameraTesting ? 'Tắt xem thử Camera & Mic' : 'Kiểm Tra Camera & Micro'}</span>
              </button>

              {/* Khung soi gương camera và đo âm lượng micro hiển thị trực tiếp khi bật */}
              {isCameraTesting && (
                <div style={{ width: '100%', marginTop: '4px' }}>
                  <div className="ps-camera-preview-container" style={{ borderRadius: '6px', maxHeight: '160px' }}>
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="ps-camera-video"
                    />
                    <div className="ps-audio-meter-overlay" style={{ borderRadius: '4px', padding: '5px 10px', fontSize: '11px' }}>
                      <Mic size={13} color="var(--ps-mint)" />
                      <span>Micro:</span>
                      <div className="ps-meter-track" style={{ borderRadius: '3px' }}>
                        <div className="ps-meter-fill" style={{ width: `${audioLevel}%`, borderRadius: '3px' }} />
                      </div>
                      <span>{audioLevel}%</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '6px', padding: '0 2px' }}>
                    <span>✓ Đã mở Camera</span>
                    <span>Nói thử để kiểm tra mic</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Doctor Info & Triage Pipeline */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '8px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}
                >
                  🩺
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ps-primary)', textTransform: 'uppercase' }}>
                    {waitingStatus?.doctor_title || 'Bác sĩ chuyên khoa phụ trách'}
                  </span>
                  <h4 style={{ margin: '1px 0 0', fontSize: '16px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                    {waitingStatus?.doctor_name || 'Bác sĩ phụ trách ca khám'}
                  </h4>
                  <small style={{ color: 'var(--ps-slate-muted)', fontSize: '12px' }}>
                    {waitingStatus?.department_name || 'Khoa Nội Tổng Quát'}
                  </small>
                </div>
              </div>
              <span className="ps-badge-bhyt" style={{ borderRadius: '4px' }}>
                <span className="ps-live-dot" /> Bác sĩ đang trực
              </span>
            </div>

            {/* 3 Steps Pipeline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> B1. Check-in
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ps-navy)' }}>Phòng chờ</div>
              </div>

              <div style={{
                background: waitingStatus?.triage_status === 'assessed' || waitingStatus?.triage_status === 'dispatched' ? '#f8fafc' : '#eff6ff',
                padding: '8px 10px',
                borderRadius: '6px',
                border: waitingStatus?.triage_status === 'assessed' || waitingStatus?.triage_status === 'dispatched' ? '1px solid #cbd5e1' : '1px solid #3b82f6'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: waitingStatus?.triage_status === 'assessed' || waitingStatus?.triage_status === 'dispatched' ? '#16a34a' : '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {waitingStatus?.triage_status === 'assessed' || waitingStatus?.triage_status === 'dispatched' ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Clock size={12} />
                  )}
                  B2. Điều dưỡng
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ps-navy)' }}>Tiếp nhận sinh hiệu</div>
              </div>

              <div style={{
                background: waitingStatus?.is_called || waitingStatus?.status === 'in_progress' ? '#f0fdf4' : '#f8fafc',
                padding: '8px 10px',
                borderRadius: '6px',
                border: waitingStatus?.is_called || waitingStatus?.status === 'in_progress' ? '1px solid #22c55e' : '1px solid #e2e8f0'
              }}>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: waitingStatus?.is_called || waitingStatus?.status === 'in_progress' ? '#16a34a' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Video size={12} /> B3. Bác sĩ
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ps-navy)' }}>Khám trực tuyến</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="ps-waiting-tabs-nav">
          <button
            className={`ps-waiting-tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
            onClick={() => setActiveTab('vitals')}
          >
            <Activity size={16} />
            <span>Chỉ Số Sinh Hiệu & Sức Khỏe</span>
          </button>

          <button
            className={`ps-waiting-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <FileText size={16} />
            <span>Đơn Thuốc, Xét Nghiệm & CĐHA</span>
            {documents.length > 0 && (
              <span className={`ps-tab-badge ${activeTab === 'documents' ? '' : 'blue'}`}>
                {documents.length}
              </span>
            )}
          </button>

          <button
            className={`ps-waiting-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={16} />
            <span>Trò Chuyện Với Điều Dưỡng</span>
            {messages.length > 0 && (
              <span className={`ps-tab-badge ${activeTab === 'chat' ? '' : 'blue'}`}>
                {messages.length}
              </span>
            )}
          </button>


        </div>

        {/* =========================================================================
            TAB 1: CHỈ SỐ SINH HIỆU & SỨC KHỎE
           ========================================================================= */}
        {activeTab === 'vitals' && (
          <div className="ps-waiting-card">
            <div className="ps-vitals-action-bar">
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  Chỉ Số Sinh Hiệu Trước Cuộc Khám
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--ps-slate-muted)' }}>
                  Bác sĩ và Điều dưỡng sẽ sử dụng các chỉ số này để chẩn đoán và theo dõi phác đồ an toàn
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="ps-btn-sync"
                  onClick={handleSyncVitalsFromProfile}
                  disabled={isSyncingVitals}
                  title="Tự động đồng bộ các chỉ số đo gần nhất từ hồ sơ cá nhân hoặc thiết bị đo y tế"
                >
                  <RefreshCw size={14} className={isSyncingVitals ? 'pr-spin' : ''} />
                  <span>{isSyncingVitals ? 'Đang đồng bộ...' : 'Đồng bộ từ hồ sơ / thiết bị'}</span>
                </button>

                <button
                  type="button"
                  className="ps-btn-edit-vitals"
                  onClick={() => setIsEditingVitals(!isEditingVitals)}
                >
                  <Activity size={14} color="var(--ps-primary)" />
                  <span>{isEditingVitals ? 'Đóng form nhập' : 'Tự nhập / Cập nhật chỉ số'}</span>
                </button>
              </div>
            </div>

            {vitalsNotice && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '6px', color: '#15803d', fontSize: '13px', fontWeight: 600 }}>
                {vitalsNotice}
              </div>
            )}

            {/* Quick Input Form */}
            {isEditingVitals && (
              <form onSubmit={handleSaveVitals} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                    ✏️ Nhập chỉ số sinh hiệu đo thực tế tại nhà
                  </span>
                  <small style={{ color: 'var(--ps-slate-muted)' }}>Các trường để trống sẽ giữ nguyên giá trị cũ</small>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Huyết áp (mmHg)
                    </label>
                    <input
                      type="text"
                      className="ps-form-input"
                      value={editBp}
                      onChange={e => setEditBp(e.target.value)}
                      placeholder="120/80"
                      style={{ borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Nhịp tim / Mạch (lần/phút)
                    </label>
                    <input
                      type="number"
                      className="ps-form-input"
                      value={editPulse}
                      onChange={e => setEditPulse(e.target.value)}
                      placeholder="76"
                      style={{ borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Thân nhiệt (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      className="ps-form-input"
                      value={editTemp}
                      onChange={e => setEditTemp(e.target.value)}
                      placeholder="36.8"
                      style={{ borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Nồng độ oxy SpO2 (%)
                    </label>
                    <input
                      type="number"
                      className="ps-form-input"
                      value={editSpo2}
                      onChange={e => setEditSpo2(e.target.value)}
                      placeholder="98"
                      style={{ borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Chiều cao (cm)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      className="ps-form-input"
                      value={editHeight}
                      onChange={e => setEditHeight(e.target.value)}
                      placeholder="165"
                      style={{ borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      Cân nặng (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      className="ps-form-input"
                      value={editWeight}
                      onChange={e => setEditWeight(e.target.value)}
                      placeholder="60"
                      style={{ borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Ghi chú thêm về cảm giác cơ thể / triệu chứng lúc đo:
                  </label>
                  <input
                    type="text"
                    className="ps-form-input"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Ví dụ: Đo lúc sáng sớm chưa ăn, cảm giác hơi váng đầu..."
                    style={{ borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="ps-btn-secondary"
                    onClick={() => setIsEditingVitals(false)}
                    style={{ borderRadius: '6px', padding: '6px 14px', fontSize: '13px' }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="ps-btn-primary"
                    disabled={savingVitals}
                    style={{ borderRadius: '6px', padding: '6px 18px', fontSize: '13px' }}
                  >
                    {savingVitals ? 'Đang lưu...' : 'Lưu & Gửi Bác sĩ'}
                  </button>
                </div>
              </form>
            )}

            {/* Vitals Grid View */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                  <Heart size={15} /> Huyết áp
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                  {curVitals.blood_pressure || '120/80'} <small style={{ fontSize: '12px', fontWeight: 500 }}>mmHg</small>
                </div>
                <span className="ps-vital-status-pill normal" style={{ borderRadius: '4px' }}>Tiêu chuẩn</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ps-primary)', fontWeight: 600 }}>
                  <Activity size={15} /> Nhịp tim
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                  {curVitals.pulse || '76'} <small style={{ fontSize: '12px', fontWeight: 500 }}>bpm</small>
                </div>
                <span className="ps-vital-status-pill normal" style={{ borderRadius: '4px' }}>Nhịp đều</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0284c7', fontWeight: 600 }}>
                  <Wind size={15} /> Nồng độ SpO2
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                  {curVitals.spo2 || '98'} <small style={{ fontSize: '12px', fontWeight: 500 }}>%</small>
                </div>
                <span className="ps-vital-status-pill normal" style={{ borderRadius: '4px' }}>Tối ưu</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#d97706', fontWeight: 600 }}>
                  <Thermometer size={15} /> Thân nhiệt
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                  {curVitals.temperature || '36.8'} <small style={{ fontSize: '12px', fontWeight: 500 }}>°C</small>
                </div>
                <span className="ps-vital-status-pill normal" style={{ borderRadius: '4px' }}>Thân nhiệt chuẩn</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0f766e', fontWeight: 600 }}>
                  <Ruler size={15} /> Chiều cao & Cân nặng
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ps-navy)', margin: '4px 0 2px' }}>
                  {heightVal} <small style={{ fontSize: '11px', fontWeight: 500 }}>cm</small> • {weightVal} <small style={{ fontSize: '11px', fontWeight: 500 }}>kg</small>
                </div>
                <span className="ps-vital-status-pill normal" style={{ borderRadius: '4px' }}>BMI: {bmiVal} (Bình thường)</span>
              </div>
            </div>

            {waitingStatus?.triage_notes && (
              <div style={{ background: '#eff6ff', padding: '12px 14px', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e40af' }}>
                <b>Ghi chú nhận định điều dưỡng:</b> {waitingStatus.triage_notes}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: ĐƠN THUỐC, XÉT NGHIỆM & PHIẾU CĐHA (DOCUMENTS)
           ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="ps-waiting-card">
            <div className="ps-docs-filter-bar">
              <div className="ps-filter-pills">
                <button
                  className={`ps-filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  Tất cả ({documents.length})
                </button>
                <button
                  className={`ps-filter-pill ${filterType === 'prescription' ? 'active' : ''}`}
                  onClick={() => setFilterType('prescription')}
                >
                  💊 Đơn thuốc & Hộp thuốc ({documents.filter(d => d.document_type === 'prescription').length})
                </button>
                <button
                  className={`ps-filter-pill ${filterType === 'lab_test' ? 'active' : ''}`}
                  onClick={() => setFilterType('lab_test')}
                >
                  🧪 Phiếu xét nghiệm ({documents.filter(d => d.document_type === 'lab_test').length})
                </button>
                <button
                  className={`ps-filter-pill ${filterType === 'cdha' ? 'active' : ''}`}
                  onClick={() => setFilterType('cdha')}
                >
                  🩻 Phiếu CĐHA (X-quang, Siêu âm...) ({documents.filter(d => d.document_type === 'cdha').length})
                </button>
              </div>

              <button
                type="button"
                className="ps-btn-primary"
                onClick={() => setIsUploadModalOpen(true)}
                style={{ borderRadius: '6px', padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Tải Lên Tài Liệu / Ảnh Thuốc</span>
              </button>
            </div>

            {/* Documents List */}
            {loadingDocs ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--ps-slate-muted)' }}>
                Đang tải danh sách tài liệu y tế...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <UploadCloud size={36} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
                <h5 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  Chưa có tài liệu hoặc hình ảnh nào được tải lên
                </h5>
                <p style={{ margin: '6px 0 16px', fontSize: '13px', color: 'var(--ps-slate-muted)' }}>
                  Chụp ảnh đơn thuốc cũ, vỏ hộp thuốc đang uống, kết quả xét nghiệm hoặc phiếu chụp X-quang/siêu âm để Bác sĩ xem trước khi khám.
                </p>
                <button
                  type="button"
                  className="ps-btn-primary"
                  onClick={() => setIsUploadModalOpen(true)}
                  style={{ borderRadius: '6px', padding: '8px 18px', fontSize: '13px' }}
                >
                  <Plus size={15} /> Tải lên ngay bây giờ
                </button>
              </div>
            ) : (
              <div className="ps-docs-grid">
                {filteredDocs.map((doc) => {
                  const isImage = doc.file_url.match(/\.(jpeg|jpg|png|webp)($|\?)/i) || doc.file_url.startsWith('data:image')
                  const typeLabel = doc.document_type === 'prescription'
                    ? 'Đơn thuốc / Hộp thuốc'
                    : doc.document_type === 'lab_test'
                    ? 'Phiếu xét nghiệm'
                    : doc.document_type === 'cdha'
                    ? 'Phiếu CĐHA'
                    : 'Tài liệu'

                  return (
                    <div key={doc.id} className="ps-doc-card">
                      <div
                        className="ps-doc-thumb"
                        onClick={() => {
                          if (isImage) {
                            setLightboxImg({ url: doc.file_url, title: doc.title })
                          } else {
                            window.open(doc.file_url, '_blank')
                          }
                        }}
                        title="Bấm để xem ảnh phóng to"
                      >
                        {isImage ? (
                          <img src={doc.file_url} alt={doc.title} />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                            <FileText size={32} />
                            <span style={{ fontSize: '12px' }}>Tệp tài liệu</span>
                          </div>
                        )}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '6px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: '#fff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={11} /> Xem to
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className={`ps-doc-type-badge ${doc.document_type}`}>
                          {typeLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                          title="Xóa tài liệu này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ps-navy)', lineHeight: 1.3 }}>
                        {doc.title}
                      </h5>

                      {doc.description && (
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--ps-slate)', lineHeight: 1.4 }}>
                          {doc.description}
                        </p>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                        <span>{new Date(doc.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(doc.created_at).toLocaleDateString('vi-VN')}</span>
                        {doc.file_size && <span>{Math.round(doc.file_size / 1024)} KB</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Tải Lên Tài Liệu */}
        {isUploadModalOpen && (
          <div className="ps-lightbox-overlay">
            <div className="ps-lightbox-content" style={{ width: '500px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  Tải Lên Tài Liệu & Đơn Thuốc
                </h4>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Loại tài liệu y tế:
                  </label>
                  <select
                    className="ps-form-input"
                    value={uploadDocType}
                    onChange={(e: any) => setUploadDocType(e.target.value)}
                    style={{ borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="prescription">💊 Đơn thuốc cũ / Hộp thuốc đang dùng</option>
                    <option value="lab_test">🧪 Phiếu kết quả xét nghiệm (Máu, nước tiểu...)</option>
                    <option value="cdha">🩻 Phiếu Chẩn đoán hình ảnh (X-quang, Siêu âm, CT...)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Tiêu đề tài liệu: *
                  </label>
                  <input
                    type="text"
                    required
                    className="ps-form-input"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="Ví dụ: Đơn thuốc huyết áp đang uống, Phiếu xét nghiệm BV 115..."
                    style={{ borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Ghi chú chi tiết cho Bác sĩ (tùy chọn):
                  </label>
                  <textarea
                    rows={2}
                    className="ps-form-input"
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    placeholder="Ví dụ: Uống mỗi ngày 1 viên buổi sáng, đã dùng được 3 tháng..."
                    style={{ borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
                  />
                </div>

                {/* File picker */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Chọn hình ảnh chụp hoặc tệp tài liệu: *
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
                      borderRadius: '6px',
                      padding: '16px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    {uploadFileData ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        {uploadFileData.startsWith('data:image') && (
                          <img
                            src={uploadFileData}
                            alt="preview"
                            style={{ maxHeight: '120px', borderRadius: '4px', objectFit: 'contain' }}
                          />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f766e' }}>
                          ✓ Đã chọn: {uploadFileName || 'Hình ảnh tài liệu'} (Nhấn để đổi)
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', color: '#64748b' }}>
                        <Camera size={26} color="var(--ps-primary)" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ps-navy)' }}>
                          Bấm để Chụp ảnh hoặc Tải ảnh từ thiết bị
                        </span>
                        <small style={{ fontSize: '11.5px', color: '#94a3b8' }}>Hỗ trợ JPG, PNG, WEBP, PDF</small>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="ps-btn-secondary"
                    onClick={() => setIsUploadModalOpen(false)}
                    style={{ borderRadius: '6px', padding: '8px 16px', fontSize: '13px' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="ps-btn-primary"
                    disabled={uploadingDoc || !uploadFileData}
                    style={{ borderRadius: '6px', padding: '8px 20px', fontSize: '13px' }}
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
          <div className="ps-chat-container">
            {/* Header */}
            <div className="ps-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '16px'
                  }}
                >
                  👩‍⚕️
                </div>
                <div>
                  <h5 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                    Điều dưỡng tiếp đón & Điều phối ca khám
                  </h5>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#16a34a' }}>
                    <span className="ps-live-dot" /> Sẵn sàng hỗ trợ người bệnh trước giờ khám
                  </div>
                </div>
              </div>
              <small style={{ fontSize: '11px', color: '#94a3b8' }}>Phòng chờ ca #{appointment.id}</small>
            </div>

            {/* Messages Area */}
            <div className="ps-chat-messages-area" ref={chatScrollRef}>
              {/* Tin nhắn chào tự động từ hệ thống điều dưỡng */}
              <div className="ps-chat-bubble nurse">
                <div className="ps-bubble-content">
                  Chào bạn! Tôi là Điều dưỡng trực ban phòng chờ. Trong thời gian chờ Bác sĩ, bạn có thể gửi tin nhắn, chụp ảnh thuốc đang uống hoặc kết quả xét nghiệm vào đây để tôi kiểm tra và cập nhật cho Bác sĩ nhé.
                </div>
                <span className="ps-bubble-meta">Điều dưỡng tiếp đón • Hệ thống tự động</span>
              </div>

              {messages.map((msg) => {
                const isPatient = msg.sender_role === 'patient'
                const isNurse = msg.sender_role === 'nurse'
                const roleLabel = isPatient ? 'Bạn' : isNurse ? 'Điều dưỡng' : 'Bác sĩ'
                const timeStr = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={msg.id} className={`ps-chat-bubble ${isPatient ? 'patient' : isNurse ? 'nurse' : 'doctor'}`}>
                    <div className="ps-bubble-content">
                      {msg.content && <div>{msg.content}</div>}
                      {msg.file_url && (
                        <div
                          className="ps-bubble-img-preview"
                          onClick={() => setLightboxImg({ url: msg.file_url!, title: msg.file_name || 'Hình ảnh đính kèm' })}
                        >
                          <img src={msg.file_url} alt={msg.file_name || 'image'} />
                        </div>
                      )}
                    </div>
                    <span className="ps-bubble-meta">
                      {roleLabel} • {timeStr}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Quick Prompts Chips */}
            <div className="ps-chat-quick-chips">
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Gợi ý nhanh:</span>
              <button
                type="button"
                className="ps-chat-chip-btn"
                onClick={() => handleSendMessage('Chào điều dưỡng, tôi đã nhập đầy đủ sinh hiệu và tải ảnh thuốc lên rồi ạ.')}
              >
                ✓ Đã nhập sinh hiệu & ảnh thuốc
              </button>
              <button
                type="button"
                className="ps-chat-chip-btn"
                onClick={() => handleSendMessage('Cho tôi hỏi khoảng bao lâu nữa Bác sĩ bắt đầu vào khám vậy ạ?')}
              >
                ⏱️ Khi nào Bác sĩ khám?
              </button>
              <button
                type="button"
                className="ps-chat-chip-btn"
                onClick={() => handleSendMessage('Tôi có triệu chứng sốt và mệt mỏi từ 2 ngày trước.')}
              >
                🤒 Tôi bị sốt và mệt mỏi
              </button>
            </div>

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="ps-chat-input-bar"
            >
              <input
                type="file"
                ref={chatFileInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleSelectChatImage}
              />

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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Chụp ảnh hoặc gửi ảnh thuốc / triệu chứng"
              >
                <Camera size={20} />
              </button>

              {chatImgData && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#0369a1' }}>
                  <span>📷 1 ảnh đã chọn</span>
                  <X size={13} style={{ cursor: 'pointer' }} onClick={() => setChatImgData(null)} />
                </div>
              )}

              <input
                type="text"
                className="ps-chat-input-field"
                placeholder="Nhập tin nhắn trao đổi với Điều dưỡng..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
              />

              <button
                type="submit"
                disabled={sendingMsg || (!chatInput.trim() && !chatImgData)}
                className="ps-btn-primary"
                style={{ borderRadius: '6px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Send size={15} /> Gửi
              </button>
            </form>
          </div>
        )}

        {/* Lightbox Phóng To Ảnh */}
        {lightboxImg && (
          <div className="ps-lightbox-overlay" onClick={() => setLightboxImg(null)}>
            <div className="ps-lightbox-content" onClick={e => e.stopPropagation()}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ps-navy)' }}>
                  {lightboxImg.title}
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxImg(null)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}
                >
                  <X size={20} />
                </button>
              </div>
              <img src={lightboxImg.url} alt={lightboxImg.title} className="ps-lightbox-img" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default PatientWaitingRoom
