import { useEffect, useState, useRef, useMemo } from 'react'
import {
  ArrowLeft, ArrowRightLeft, ChevronUp, ChevronDown, ShieldCheck, Save, CheckCircle2, Lock, FileText, Edit3,
  Pill, User, Search, AlertCircle, Stethoscope, Video, VideoOff, X,
  FileDown, PenTool, Share2, Code2, QrCode, Sparkles, Mic, MicOff, Bot, PhoneCall, Volume2,
  ScreenShare, ScreenShareOff, MessageSquare, FlaskConical, ScanLine, ExternalLink, Activity, Clock,
  FileCheck, Users, HeartPulse, Download, Plus, Check, RefreshCw, Building2,
  Copy, Trash2, Eye, CalendarCheck, MoreHorizontal, CreditCard, HelpCircle
} from 'lucide-react'
import {
  type Appointment, type User as CurrentUser, type ICD10Item,
  request, getClinicalRecord, saveClinicalRecord, savePrescription,
  completeConsultation, searchICD10, signDocumentSmartCA,
  syncNationalPrescription, downloadMedicalRecordPdf, getFhirBundle,
  generateAiScribeSoap, callPatient, getAIStatus, switchAIMode, type AIStatusInfo,
  suggestIcd10, auditBhytClaim, analyzePacsImage, interpretLabResults,
  getAppointmentLabResults, getAppointmentPacsStudies,
  getAppointmentDocuments, resolveAuthedMediaUrl, type AppointmentDocument,
  shareLabResult, getAppointmentHistory, getPatientConsultationHistory,
  getBHYTClaim, getBHYTXML4210, submitBHYTClaim,
  getConsultationMembers, inviteConsultationMember, submitConsultationOpinion,
  getPatientRPMVitals, recordRPMVitals, analyzePACSDicom, submitPACSFeedback,
  type ConsultationHistoryItem, type AppointmentEventItem,
  type LabResultsData, type PACSStudiesData, type PACSStudy,
  type BHYTClaimItem, type BHYTXML4210Package, type ConsultationMemberItem,
  type RPMVitalItem, type AIPACSConsultationItem
} from './api'
import { webrtcService, type WebRTCState } from './webrtcService'
import { ConsultationChat } from './ConsultationChat'
import { PrescriptionBuilder } from './PrescriptionBuilder'
import { NotificationCenter } from './NotificationCenter'
import { MedicalRecordModal } from './MedicalRecordModal'
import './doctor-sanctuary.css'

export function DoctorWorkspace({
  appointment,
  user,
  onBack,
  onCompleted
}: {
  appointment: Appointment
  user: CurrentUser
  onBack: () => void
  onCompleted: () => void
}) {
  const [connection, setConnection] = useState<{ server_url: string; token: string; room_name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'record' | 'ai_scribe' | 'chat' | 'lab' | 'pacs' | 'prescription' | 'patient_info' | 'fhir' | 'history' | 'bhyt' | 'multidoctor' | 'rpm'>('record')
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [showClinicalSheetModal, setShowClinicalSheetModal] = useState(false)
  const [creatingClinicalSheet, setCreatingClinicalSheet] = useState(false)

  // Cận lâm sàng & PACS cho từng bệnh nhân
  const [labData, setLabData] = useState<LabResultsData | null>(null)
  const [pacsData, setPacsData] = useState<PACSStudiesData | null>(null)
  const [loadingLab, setLoadingLab] = useState(false)
  const [loadingPacs, setLoadingPacs] = useState(false)
  const [labCategoryFilter, setLabCategoryFilter] = useState<string>('all')
  const [pacsModalityFilter, setPacsModalityFilter] = useState<string>('all')
  const [sharingLabId, setSharingLabId] = useState<string | null>(null)

  // Lịch sử lượt khám & Tiến trình ca khám
  const [consultationHistory, setConsultationHistory] = useState<ConsultationHistoryItem[]>([])
  const [appointmentEvents, setAppointmentEvents] = useState<AppointmentEventItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Hồ sơ, tài liệu người bệnh tải lên đính kèm ca khám
  const [appointmentDocs, setAppointmentDocs] = useState<AppointmentDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  // Phân hệ 1: Giám định BHYT XML 4210
  const [bhytClaim, setBhytClaim] = useState<BHYTClaimItem | null>(null)
  const [bhytPackage, setBhytPackage] = useState<BHYTXML4210Package | null>(null)
  const [activeXmlTable, setActiveXmlTable] = useState<'xml1' | 'xml2' | 'xml3' | 'xml4' | 'xml5'>('xml1')
  const [loadingBhyt, setLoadingBhyt] = useState(false)
  const [submittingBhyt, setSubmittingBhyt] = useState(false)

  // Phân hệ 2: Hội chẩn Liên viện & Đa chuyên khoa (Multi-Doctor)
  const [consultationMembers, setConsultationMembers] = useState<ConsultationMemberItem[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteHospital, setInviteHospital] = useState('Bệnh viện Bạch Mai - Tuyến Trung Ương')
  const [inviteSpecialty, setInviteSpecialty] = useState('Hô hấp & Phổi can thiệp')
  const [invitingMember, setInvitingMember] = useState(false)
  const [opinionTexts, setOpinionTexts] = useState<Record<number, string>>({})
  const [submittingOpinionId, setSubmittingOpinionId] = useState<number | null>(null)

  // Phân hệ 3: Giám sát Sinh hiệu Từ xa (RPM IoT)
  const [rpmVitals, setRpmVitals] = useState<RPMVitalItem[]>([])
  const [loadingRpm, setLoadingRpm] = useState(false)

  const [syncingBle, setSyncingBle] = useState(false)
  const [newSys, setNewSys] = useState(128)
  const [newDia, setNewDia] = useState(82)
  const [newPulse, setNewPulse] = useState(74)
  const [newGlucose, setNewGlucose] = useState(5.8)
  const [newSpo2, setNewSpo2] = useState(98)

  // Phân hệ 5: AI PACS Copilot Heatmap & Bounding Boxes
  const [aiPacsData, setAiPacsData] = useState<AIPACSConsultationItem | null>(null)
  const [analyzingAiPacs, setAnalyzingAiPacs] = useState(false)
  const [aiFeedbackConcurrence, setAiFeedbackConcurrence] = useState<string>('approved')
  const [aiFeedbackNotes, setAiFeedbackNotes] = useState<string>('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  
  // WebRTC P2P Video & Audio Engine
  const [rtcState, setRtcState] = useState<WebRTCState>(webrtcService.getState())
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  // Thông tin phiếu khám lâm sàng
  const [symptoms, setSymptoms] = useState('')
  const [allergies, setAllergies] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [icd10Code, setIcd10Code] = useState('')
  const [icd10Name, setIcd10Name] = useState('')
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [plan, setPlan] = useState('')
  const [clinicalExamination, setClinicalExamination] = useState('')
  const [paraclinicalResults, setParaclinicalResults] = useState('')
  const [treatmentRegimen, setTreatmentRegimen] = useState('')
  const [clinicalEvolution, setClinicalEvolution] = useState('')
  const [medicalServicesUsed, setMedicalServicesUsed] = useState('')
  const [encounterInfo, setEncounterInfo] = useState<any>(null)

  // Computed full set of clinical vital signs from Triage Desk & RPM IoT
  const triageBp = appointment.blood_pressure || encounterInfo?.blood_pressure || (rpmVitals.find(v => v.systolic) ? `${rpmVitals.find(v => v.systolic)?.systolic}/${rpmVitals.find(v => v.diastolic)?.diastolic}` : null)
  const triagePulse = appointment.pulse || encounterInfo?.pulse || rpmVitals.find(v => v.pulse)?.pulse || null
  const triageTemp = appointment.temperature || encounterInfo?.temperature || (rpmVitals.find(v => v.temperature_celsius) ? rpmVitals.find(v => v.temperature_celsius)?.temperature_celsius : null)
  const triageSpo2 = appointment.spo2 || encounterInfo?.spo2 || (rpmVitals.find(v => v.spo2_percent) ? rpmVitals.find(v => v.spo2_percent)?.spo2_percent : null)
  const triageWeight = appointment.weight || encounterInfo?.weight || (rpmVitals.find(v => v.weight_kg) ? rpmVitals.find(v => v.weight_kg)?.weight_kg : null)
  const triageHeight = appointment.height || encounterInfo?.height || null
  const triageBmi = triageWeight && triageHeight ? (Number(triageWeight) / Math.pow(Number(triageHeight) / 100, 2)).toFixed(1) : null
  const triageGlucose = (rpmVitals.find(v => v.glucose_value)?.glucose_value) || null
  const triageLevel = appointment.triage_level || encounterInfo?.triage_level || 'standard'
  const triageNotes = appointment.triage_notes || encounterInfo?.triage_notes || ''
  const triageNurse = appointment.nurse_name || encounterInfo?.nurse_name || ''
  const [prescription, setPrescription] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [patientData, setPatientData] = useState<any>(null)

  // Tính tuổi chính xác từ ngày sinh thực tế (Hỗ trợ cả YYYY-MM-DD và DD/MM/YYYY)
  const calculatedAge = useMemo(() => {
    const rawDob = patientData?.date_of_birth || (appointment as any)?.patient_dob
    if (!rawDob) return null
    try {
      const s = String(rawDob).trim()
      let birthYear: number | null = null
      if (s.includes('-')) {
        const parts = s.split('-')
        const y = parts[0].length === 4 ? parseInt(parts[0], 10) : parseInt(parts[2], 10)
        if (!isNaN(y) && y > 1900) birthYear = y
      } else if (s.includes('/')) {
        const parts = s.split('/')
        const y = parts[2]?.length === 4 ? parseInt(parts[2], 10) : parseInt(parts[0], 10)
        if (!isNaN(y) && y > 1900) birthYear = y
      } else if (/^\d{8}$/.test(s)) {
        const y = parseInt(s.slice(0, 4), 10)
        if (y > 1900) birthYear = y
      }
      if (birthYear && birthYear > 1900) {
        return Math.max(0, new Date().getFullYear() - birthYear)
      }
    } catch {}
    return null
  }, [patientData?.date_of_birth, appointment])

  // Trích xuất danh sách câu hỏi AI và câu trả lời thực tế của BN khi đặt khám
  const parsedSurveyItems = useMemo<{ question: string; answer: string }[]>(() => {
    // 1. Kiểm tra trường survey_responses (JSON string hoặc Array)
    const rawResponses = encounterInfo?.survey_responses || (appointment as any)?.survey_responses
    if (rawResponses) {
      try {
        const parsed = typeof rawResponses === 'string' ? JSON.parse(rawResponses) : rawResponses
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => ({
            question: typeof item === 'string' ? item : (item.question || `Khảo sát ${idx + 1}`),
            answer: typeof item === 'string' ? '' : (item.answer || '')
          }))
        }
      } catch (e) {
        console.warn('Error parsing survey_responses:', e)
      }
    }

    // 2. Kiểm tra nếu có trong reason dưới dạng [Khảo sát thêm AI]:
    const rawReason = (encounterInfo?.reason || appointment.reason || '').trim()
    if (rawReason.includes('[Khảo sát thêm AI]:')) {
      const parts = rawReason.split('[Khảo sát thêm AI]:')
      const surveyBlock = parts[1] || ''
      const lines = surveyBlock.split('\n').map((l: string) => l.trim()).filter((l: string) => l.startsWith('-'))
      if (lines.length > 0) {
        return lines.map((line: string) => {
          const clean = line.replace(/^- /, '')
          const colonIdx = clean.indexOf(':')
          if (colonIdx > 0) {
            return {
              question: clean.substring(0, colonIdx).trim(),
              answer: clean.substring(colonIdx + 1).trim()
            }
          }
          return { question: clean, answer: '' }
        })
      }
    }

    // 3. Nếu AI MedGemma có suggested_questions từ phân tích triệu chứng
    if (encounterInfo?.medgemma_analysis?.suggested_questions && Array.isArray(encounterInfo.medgemma_analysis.suggested_questions) && encounterInfo.medgemma_analysis.suggested_questions.length > 0) {
      return encounterInfo.medgemma_analysis.suggested_questions.map((q: string) => ({
        question: q,
        answer: ''
      }))
    }

    return []
  }, [encounterInfo, appointment])

  // AI Ambient Medical Scribe (SOAP Notes) with Speech Recognition
  const [scribeTranscript, setScribeTranscript] = useState('')
  const [generatingSoap, setGeneratingSoap] = useState(false)
  // AI Dual-Engine State: Gemini 3.8 (Test) & MedGemma 3 (Chay that)
  const [aiEngine, setAiEngine] = useState<AIStatusInfo | null>(null)
  const [switchingAi, setSwitchingAi] = useState(false)

  const [soapResult, setSoapResult] = useState<any>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Modal Popup xem và chỉnh sửa toàn bộ thông tin SOAP trước khi tạo phiếu khám
  const [showSoapModal, setShowSoapModal] = useState(false)
  // Modal Popup xem và chỉnh sửa Hội thoại Bác sĩ - Bệnh nhân
  const [showTranscriptModal, setShowTranscriptModal] = useState(false)
  const [showRpmHistoryModal, setShowRpmHistoryModal] = useState(false)
  const [showOhifModal, setShowOhifModal] = useState(false)
  const [showMoreTabs, setShowMoreTabs] = useState(false)
  const [collapseIntake, setCollapseIntake] = useState(false)
  const [soapEditState, setSoapEditState] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    icd10Code: '',
    icd10Name: '',
    plan: '',
    prescriptionDraft: '',
    allergiesWarning: ''
  })

  // Tự động nhận diện giọng nói tiếng Việt từ micro Web Speech API
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRec) {
      try {
        const rec = new SpeechRec()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = 'vi-VN'

        rec.onresult = (event: any) => {
          let text = ''
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript + ' '
          }
          if (text.trim()) {
            setScribeTranscript(text.trim())
          }
        }

        rec.onerror = (event: any) => {
          console.warn('AI Scribe Speech recognition error:', event.error)
          if (event.error !== 'no-speech') {
            setIsListening(false)
          }
        }

        rec.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current = rec
      } catch (e) {
        console.warn('SpeechRecognition init failed:', e)
      }
    }
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setToast('Trình duyệt chưa hỗ trợ Web Speech trực tiếp. Bạn có thể gõ nội dung hoặc bấm "Mẫu thoại"!')
      return
    }
    if (isListening) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
      setIsListening(false)
      setToast('Đã dừng lắng nghe cuộc trò chuyện.')
    } else {
      try {
        recognitionRef.current.start()
        setIsListening(true)
        setToast('🎙️ AI Scribe đang tự động nghe cuộc hội thoại khám bệnh...')
      } catch (err) {
        console.warn('Could not start recognition:', err)
        setIsListening(false)
      }
    }
  }
  const [isRecording, setIsRecording] = useState(false)

  // Thông tin Chữ ký số & Đơn thuốc Quốc gia
  const [signatureInfo, setSignatureInfo] = useState<any>(null)
  const [nationalPrescription, setNationalPrescription] = useState<any>(null)
  const [fhirJson, setFhirJson] = useState<string>('')

  // Tra cứu danh mục ICD-10
  const [icdSearchQuery, setIcdSearchQuery] = useState('')
  const [icdOptions, setIcdOptions] = useState<ICD10Item[]>([])
  const [showIcdList, setShowIcdList] = useState(false)

  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [syncingPres, setSyncingPres] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Tự động ẩn thông báo nổi ở góc dưới sau vài giây
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000)
      return () => clearTimeout(timer)
    }
  }, [error])
  const [callingPatient, setCallingPatient] = useState(false)

  // AI Suite States
  const [icdSuggestions, setIcdSuggestions] = useState<any[]>([])
  const [loadingIcdAi, setLoadingIcdAi] = useState(false)
  const [bhytAuditResult, setBhytAuditResult] = useState<any>(null)
  const [auditingBhyt, setAuditingBhyt] = useState(false)
  const [pacsAiResult, setPacsAiResult] = useState<any>(null)
  const [analyzingPacs, setAnalyzingPacs] = useState(false)
  const [selectedStudy, setSelectedStudy] = useState<any>(null)
  const [labAiResult, setLabAiResult] = useState<any>(null)
  const [interpretingLab, setInterpretingLab] = useState(false)

  async function handleSuggestIcd() {
    const q = `${symptoms} ${clinicalNotes} ${diagnosis}`.trim()
    if (!q) {
      setError('Vui lòng nhập triệu chứng hoặc diễn biến lâm sàng trước khi nhờ AI gợi ý ICD-10.')
      return
    }
    try {
      setLoadingIcdAi(true)
      const res = await suggestIcd10(q)
      setIcdSuggestions(res.suggestions || [])
      setToast(`✨ AI đã tìm thấy ${res.suggestions?.length || 0} mã bệnh ICD-10 phù hợp`)
    } catch (err: any) {
      setError(err.message || 'Lỗi gợi ý ICD-10 AI')
    } finally {
      setLoadingIcdAi(false)
    }
  }

  async function handleAuditBhyt() {
    if (!icd10Code) {
      setError('Vui lòng chọn Mã bệnh ICD-10 trước khi thẩm định BHYT.')
      return
    }
    try {
      setAuditingBhyt(true)
      const medList = prescription ? prescription.split('\n').filter(Boolean) : []
      const res = await auditBhytClaim(icd10Code, [], medList)
      setBhytAuditResult(res)
    } catch (err: any) {
      setError(err.message || 'Lỗi thẩm định BHYT')
    } finally {
      setAuditingBhyt(false)
    }
  }

  async function handleAnalyzePacs() {
    try {
      setAnalyzingPacs(true)
      const res = await analyzePacsImage(selectedStudy?.id, selectedStudy?.modality || 'CR', selectedStudy?.body_part || 'CHEST')
      setPacsAiResult(res)
      setToast('🤖 Đã hoàn tất phân tích hình ảnh AI (Second Opinion)')
    } catch (err: any) {
      setError(err.message || 'Lỗi phân tích PACS AI')
    } finally {
      setAnalyzingPacs(false)
    }
  }

  async function handleInterpretLab() {
    if (!labData?.reports || labData.reports.length === 0) {
      setError('Chưa có phiếu kết quả xét nghiệm để phân tích.')
      return
    }
    try {
      setInterpretingLab(true)
      const allItems: any[] = []
      labData.reports.forEach((rep: any) => {
        if (rep.items && Array.isArray(rep.items)) {
          allItems.push(...rep.items)
        }
      })
      const res = await interpretLabResults(allItems)
      setLabAiResult(res)
      setToast('💡 Đã diễn giải chỉ số xét nghiệm bằng AI')
    } catch (err: any) {
      setError(err.message || 'Lỗi diễn giải xét nghiệm AI')
    } finally {
      setInterpretingLab(false)
    }
  }

  async function loadHistory() {
    try {
      setLoadingHistory(true)
      const [events, history] = await Promise.all([
        getAppointmentHistory(appointment.id),
        getPatientConsultationHistory(appointment.patient_id)
      ])
      setAppointmentEvents(events)
      setConsultationHistory(history)
    } catch (err: any) {
      console.error('Lỗi tải lịch sử khám:', err)
      setError('Không thể tải lịch sử lượt khám: ' + (err.message || 'Lỗi mạng'))
    } finally {
      setLoadingHistory(false)
    }
  }

  async function handleShareLab(report: any) {
    try {
      setSharingLabId(report.report_id)
      const summaryText = report.indicators
        ? report.indicators.map((ind: any) => `${ind.name}: ${ind.value} ${ind.unit || ''} (${ind.flag === 'HIGH' ? 'Tăng cao' : ind.flag === 'LOW' ? 'Giảm' : 'Bình thường'})`).join('; ')
        : ''
      const res = await shareLabResult(appointment.id, {
        report_id: report.report_id,
        report_name: report.title,
        category_name: report.category_name,
        conclusion: report.conclusion,
        summary_text: summaryText
      })
      setToast(`✅ ${res.message}`)
    } catch (err: any) {
      setError(err.message || 'Lỗi khi chia sẻ kết quả xét nghiệm')
    } finally {
      setSharingLabId(null)
    }
  }

  // 1. Giám định BHYT XML 4210
  async function loadBhytData() {
    try {
      setLoadingBhyt(true)
      const [claim, pkg] = await Promise.all([
        getBHYTClaim(appointment.id),
        getBHYTXML4210(appointment.id)
      ])
      setBhytClaim(claim)
      setBhytPackage(pkg)
    } catch (err: any) {
      setError(err.message || 'Lỗi tải hồ sơ BHYT XML 4210')
    } finally {
      setLoadingBhyt(false)
    }
  }

  async function handleSendBhytClaim() {
    try {
      setSubmittingBhyt(true)
      const res = await submitBHYTClaim(appointment.id)
      setToast(`✅ Đã gửi Cổng Giám định BHYT Quốc gia! Mã tiếp nhận: ${res.gdbhyt_code}`)
      loadBhytData()
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi giám định BHYT')
    } finally {
      setSubmittingBhyt(false)
    }
  }

  // 2. Hội chẩn Liên viện
  async function loadConsultationMembers() {
    try {
      setLoadingMembers(true)
      const members = await getConsultationMembers(appointment.id)
      setConsultationMembers(members)
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách hội chẩn')
    } finally {
      setLoadingMembers(false)
    }
  }

  async function handleInviteConsultationMember() {
    if (!inviteName.trim()) {
      setError('Vui lòng nhập tên Bác sĩ / Chuyên gia cần mời hội chẩn')
      return
    }
    try {
      setInvitingMember(true)
      await inviteConsultationMember(appointment.id, {
        doctor_name: inviteName.trim(),
        hospital_name: inviteHospital,
        specialty: inviteSpecialty,
        role: 'specialist'
      })
      setToast(`🤝 Đã gửi lời mời hội chẩn tới Chuyên gia ${inviteName}`)
      setInviteName('')
      loadConsultationMembers()
    } catch (err: any) {
      setError(err.message || 'Lỗi mời chuyên gia hội chẩn')
    } finally {
      setInvitingMember(false)
    }
  }

  async function handleSubmitMemberOpinion(memberId: number) {
    const text = opinionTexts[memberId]
    if (!text || !text.trim()) {
      setError('Vui lòng nhập nội dung ý kiến chuyên gia')
      return
    }
    try {
      setSubmittingOpinionId(memberId)
      await submitConsultationOpinion(appointment.id, memberId, text.trim())
      setToast('📝 Đã ghi nhận ý kiến chuyên môn vào biên bản hội chẩn')
      setOpinionTexts(prev => ({ ...prev, [memberId]: '' }))
      loadConsultationMembers()
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi ý kiến hội chẩn')
    } finally {
      setSubmittingOpinionId(null)
    }
  }

  // 3. Giám sát Sinh hiệu Từ xa (RPM IoT)
  async function loadRpmVitals() {
    try {
      setLoadingRpm(true)
      const patientId = appointment.patient_id || 1
      const data = await getPatientRPMVitals(patientId)
      setRpmVitals(data || [])
    } catch (err: any) {
      console.warn('Could not load RPM vitals:', err)
      setRpmVitals([])
    } finally {
      setLoadingRpm(false)
    }
  }

  async function handleAddManualRpmVital() {
    try {
      await recordRPMVitals({
        device_type: 'blood_pressure',
        device_name: 'Omron HEM-7600T Smart BP (Đo tại nhà)',
        connection_method: 'bluetooth_ble',
        systolic: Number(newSys),
        diastolic: Number(newDia),
        pulse: Number(newPulse),
        glucose_value: Number(newGlucose),
        spo2_percent: Number(newSpo2)
      })
      setToast('📊 Đã ghi nhận chỉ số sinh hiệu đo từ xa thành công')
      loadRpmVitals()
    } catch (err: any) {
      setError(err.message || 'Lỗi lưu chỉ số sinh hiệu')
    }
  }

  // 5. AI PACS Copilot Heatmap & Feedback
  async function handleTriggerAiPacs(study: any) {
    try {
      setAnalyzingAiPacs(true)
      const res = await analyzePACSDicom({
        appointment_id: appointment.id,
        dicom_study_id: study.study_id,
        modality: study.modality || 'DX',
        body_part: study.body_part || 'CHEST'
      })
      setAiPacsData(res)
      setToast('✨ AI Copilot đã phân tích hình ảnh & vẽ vùng kích hoạt nhiệt (Grad-CAM)')
    } catch (err: any) {
      setError(err.message || 'Lỗi AI Copilot phân tích PACS')
    } finally {
      setAnalyzingAiPacs(false)
    }
  }

  async function handleSendAiFeedback(status: string) {
    if (!aiPacsData) return
    try {
      setSubmittingFeedback(true)
      await submitPACSFeedback(aiPacsData.id, {
        doctor_concurrence: status,
        doctor_feedback: aiFeedbackNotes
      })
      setToast(status === 'approved' ? '👍 Đã đồng thuận với kết luận AI' : '⚠️ Đã ghi nhận ý kiến bác sĩ khác biệt với AI')
      setAiPacsData(prev => prev ? { ...prev, doctor_concurrence: status, doctor_feedback: aiFeedbackNotes } : null)
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi phản hồi đánh giá AI')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  // Gọi chuông đến điện thoại bệnh nhân
  async function handleCallPatient() {
    setCallingPatient(true)
    try {
      const res = await callPatient(appointment.id)
      setToast(`📞 ${res.message}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không gửi được tín hiệu gọi đến bệnh nhân')
    } finally {
      setTimeout(() => setCallingPatient(false), 4000)
    }
  }

  // Tự động gọi chuông một lần khi bác sĩ vào phòng khám nếu ca khám chưa hoàn tất
  useEffect(() => {
    if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
      callPatient(appointment.id).catch(() => {})
    }
  }, [appointment.id])

  // 1. Khởi tạo WebRTC P2P Video & Audio Consultation
  useEffect(() => {
    const unbindState = webrtcService.onStateChange(setRtcState)
    const unbindLocal = webrtcService.onLocalStream(stream => {
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
    })
    const unbindRemote = webrtcService.onRemoteStream(stream => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream
    })
    const unbindChat = webrtcService.onChatMessage(() => {
      setUnreadChatCount(prev => prev + 1)
    })

    webrtcService.joinRoom(appointment.id, 'doctor', user.full_name)

    // Đồng thời gọi join-token để backend đánh dấu ca khám in_progress
    request<{ server_url: string; token: string; room_name: string }>(
      `/api/v1/telehealth/sessions/${appointment.id}/join-token`,
      { method: 'POST' }
    )
      .then(setConnection)
      .catch(console.warn)

    return () => {
      unbindState()
      unbindLocal()
      unbindRemote()
      unbindChat()
      webrtcService.endCall()
    }
  }, [appointment.id, user.full_name])

  useEffect(() => {
    if (localVideoRef.current && rtcState.localStream) {
      localVideoRef.current.srcObject = rtcState.localStream
    }
  }, [rtcState.localStream])

  useEffect(() => {
    if (remoteVideoRef.current && rtcState.remoteStream) {
      remoteVideoRef.current.srcObject = rtcState.remoteStream
    }
  }, [rtcState.remoteStream])

  // Đồng bộ phân tích triệu chứng AI MedGemma & Đơn đặt khám vào Phiếu khám EMR
  const handleSyncFromBooking = () => {
    const bookingReason = encounterInfo?.reason || appointment.reason || ''
    const medgemma = encounterInfo?.medgemma_analysis
    const patientAllergies = [
      patientData?.allergies,
      patientData?.medical_history_notes ? `Tiền sử: ${patientData.medical_history_notes}` : null,
      patientData?.has_medical_history && patientData?.medical_history_icd10 ? `Mã ICD tiền sử: ${patientData.medical_history_icd10}` : null
    ].filter(Boolean).join('; ')

    let updated = false
    if (bookingReason) {
      setSymptoms(bookingReason)
      updated = true
    }
    if (patientAllergies) {
      setAllergies(patientAllergies)
      updated = true
    }
    if (medgemma?.explanation && !clinicalNotes) {
      setClinicalNotes(`[AI MedGemma đánh giá]: ${medgemma.explanation}`)
      updated = true
    }
    if (updated) {
      setToast('Đã đồng bộ triệu chứng & đánh giá AI MedGemma vào Phiếu khám EMR!')
    } else {
      setToast('Dữ liệu từ đơn đặt khám đã đồng bộ!')
    }
  }

  // 2. Tải hồ sơ lâm sàng hiện tại
  function loadRecord() {
    getClinicalRecord(appointment.id)
      .then(data => {
        setPatientData(data.patient)
        setEncounterInfo(data.appointment || null)
        
        const bookingReason = data.appointment?.reason || appointment.reason || ''
        const bookingAllergies = [
          data.patient?.allergies,
          data.patient?.medical_history_notes ? `Tiền sử: ${data.patient.medical_history_notes}` : null,
          data.patient?.has_medical_history && data.patient?.medical_history_icd10 ? `Mã ICD tiền sử: ${data.patient.medical_history_icd10}` : null
        ].filter(Boolean).join('; ')

        if (data.record) {
          // Tự động đồng bộ lý do khám ban đầu & tiền sử nếu phiếu khám mới chưa có nội dung
          setSymptoms(data.record.symptoms || bookingReason)
          setAllergies(data.record.allergies || bookingAllergies)
          setDiagnosis(data.record.diagnosis || '')
          setIcd10Code(data.record.icd10_code || '')
          setIcd10Name(data.record.icd10_name || '')
          setClinicalNotes(data.record.clinical_notes || '')
          setPlan(data.record.plan || '')
          setClinicalExamination(data.record.clinical_examination || '')
          setParaclinicalResults(data.record.paraclinical_results || '')
          setTreatmentRegimen(data.record.treatment_regimen || '')
          setClinicalEvolution(data.record.clinical_evolution || '')
          setMedicalServicesUsed(data.record.medical_services_used || '')
          setIsLocked(!!data.record.is_locked)
          if (data.record.is_digitally_signed) {
            setSignatureInfo({
              signer_name: data.record.signer_name,
              signer_cchn: data.record.signer_cchn,
              cert_serial: data.record.cert_serial,
              signed_at: data.record.signed_at
            })
          }
        } else {
          // Khởi tạo phiếu khám mới: Tự động nạp dữ liệu từ quy trình đặt khám 5 bước
          if (bookingReason) setSymptoms(bookingReason)
          if (bookingAllergies) setAllergies(bookingAllergies)
        }
        if (data.prescription) {
          setPrescription(data.prescription.summary || '')
          if (data.prescription.national_code) {
            setNationalPrescription({
              national_code: data.prescription.national_code,
              qr_url: data.prescription.national_qr_url,
              synced_at: data.prescription.synced_at
            })
          }
        }
      })
      .catch(console.error)
  }

  useEffect(() => {
    loadRecord()
    loadRpmVitals()
    
    // Tải kết quả Cận lâm sàng & PACS cho bệnh nhân này
    setLoadingLab(true)
    getAppointmentLabResults(appointment.id)
      .then(setLabData)
      .catch(console.error)
      .finally(() => setLoadingLab(false))

    setLoadingPacs(true)
    getAppointmentPacsStudies(appointment.id)
      .then(setPacsData)
      .catch(console.error)
      .finally(() => setLoadingPacs(false))

    // Tải tài liệu do người bệnh đính kèm (đơn thuốc, KQ XN, CDHA)
    setLoadingDocs(true)
    getAppointmentDocuments(appointment.id)
      .then(setAppointmentDocs)
      .catch(console.error)
      .finally(() => setLoadingDocs(false))

    // Tải lịch sử ca khám của người bệnh từ EMR/HIS
    if (appointment.patient_id) {
      getPatientConsultationHistory(appointment.patient_id)
        .then(setConsultationHistory)
        .catch(console.error)
    }
  }, [appointment.id, appointment.patient_id])

  // Đồng bộ 3 kết quả xét nghiệm mới nhất vào Phiếu khám EMR
  function handleSyncLatest3LabResults() {
    if (!labData?.reports || labData.reports.length === 0) {
      setToast('Chưa có phiếu kết quả xét nghiệm để đồng bộ.')
      setTimeout(() => setToast(''), 3000)
      return
    }

    const latestReports = labData.reports.slice(0, 3)
    const formattedList = latestReports.map((report, idx) => {
      const dateStr = report.result_at || report.sampled_at || ''
      const indicatorsText = report.indicators.map(ind => {
        let flagNotice = ''
        if (ind.flag === 'HIGH') flagNotice = ' [Tăng ▲]'
        else if (ind.flag === 'LOW') flagNotice = ' [Giảm ▼]'
        return `• ${ind.name}: ${ind.value} ${ind.unit}${flagNotice}`
      }).join('\n')
      
      const conclusionText = report.conclusion ? `\n=> Kết luận: ${report.conclusion}` : ''
      return `[Phiếu ${idx + 1}] ${report.title || report.category_name}${dateStr ? ` (${dateStr})` : ''}:\n${indicatorsText}${conclusionText}`
    }).join('\n\n')

    setParaclinicalResults(formattedList)
    setToast('✅ Đã đồng bộ 3 kết quả xét nghiệm mới nhất vào Bệnh án EMR!')
    setTimeout(() => setToast(''), 3500)
    setActiveTab('record')
  }

  // Trích xuất các chỉ số cận lâm sàng bất thường vào phiếu khám
  function handleExtractAbnormalToNotes() {
    if (!labData) return
    const abnormalItems: string[] = []
    for (const report of labData.reports) {
      for (const ind of report.indicators) {
        if (ind.flag !== 'NORMAL') {
          abnormalItems.push(`${ind.name}: ${ind.value} ${ind.unit} (${ind.flag_label}, khoảng chuẩn: ${ind.ref_range})`)
        }
      }
    }
    if (abnormalItems.length === 0) {
      setToast('Tất cả chỉ số xét nghiệm của bệnh nhân đều trong giới hạn bình thường.')
      setTimeout(() => setToast(''), 3000)
      return
    }
    const summaryText = `[CẬN LÂM SÀNG BẤT THƯỜNG]:\n• ` + abnormalItems.join('\n• ')
    setClinicalNotes(prev => prev ? `${prev}\n\n${summaryText}` : summaryText)
    setToast('⚡ Đã trích xuất các chỉ số cận lâm sàng bất thường vào Phiếu khám lâm sàng!')
    setTimeout(() => setToast(''), 3500)
    setActiveTab('record')
  }

  // Đồng bộ kết quả chẩn đoán hình ảnh PACS vào Phiếu khám EMR
  function handleSyncPacsStudies() {
    if (!pacsData?.studies || pacsData.studies.length === 0) {
      setToast('Chưa có ca chụp hình ảnh PACS để đồng bộ.')
      setTimeout(() => setToast(''), 3000)
      return
    }

    const latestStudies = pacsData.studies.slice(0, 3)
    const formattedList = latestStudies.map((study, idx) => {
      const dateStr = study.date ? ` (${study.date})` : ''
      return `[CĐHA ${idx + 1}] ${study.description || study.modality_name} [${study.modality}]${dateStr}:\n• Mô tả: ${study.findings}\n• Kết luận: ${study.impression}`
    }).join('\n\n')

    setParaclinicalResults(prev => prev ? `${prev}\n\n${formattedList}` : formattedList)
    setToast('✅ Đã đồng bộ 3 kết quả PACS mới nhất vào Bệnh án EMR!')
    setTimeout(() => setToast(''), 3500)
    setActiveTab('record')
  }

  // Đưa kết luận hình ảnh PACS vào Chẩn đoán của bác sĩ
  function handleApplyImagingImpression(study: PACSStudy) {
    const textToAppend = `[CĐHA - ${study.modality_name}]: ${study.impression}`
    setDiagnosis(prev => prev ? `${prev} · ${study.impression}` : study.impression)
    setClinicalNotes(prev => prev ? `${prev}\n\n${textToAppend}` : textToAppend)
    setToast(`⚡ Đã đưa kết luận hình ảnh (${study.modality}) vào Chẩn đoán!`)
    setTimeout(() => setToast(''), 3500)
    setActiveTab('record')
  }

  // Đưa toàn bộ chỉ số sinh hiệu thực tế vào Phiếu khám EMR (Mục O - Khám thực thể)
  function handleApplyRpmToRecord() {
    const parts: string[] = []
    if (triageBp) parts.push(`Huyết áp: ${triageBp} mmHg`)
    if (triagePulse) parts.push(`Mạch: ${triagePulse} bpm`)
    if (triageTemp) parts.push(`Thân nhiệt: ${triageTemp}°C`)
    if (triageSpo2) parts.push(`SpO2: ${triageSpo2}%`)
    if (triageWeight) parts.push(`Cân nặng: ${triageWeight} kg`)
    if (triageHeight) parts.push(`Chiều cao: ${triageHeight} cm`)
    if (triageBmi) parts.push(`BMI: ${triageBmi} kg/m²`)
    if (triageGlucose) parts.push(`Đường huyết: ${triageGlucose} mmol/L`)
    if (triageLevel) parts.push(`Phân loại Triage: ${triageLevel === 'emergency' ? 'Cấp cứu (Đỏ)' : triageLevel === 'priority' ? 'Ưu tiên (Vàng)' : 'Tiêu chuẩn (Xanh)'}`)

    if (parts.length === 0) {
      setToast('⚠️ Bệnh nhân chưa có chỉ số sinh hiệu thực tế nào!')
      setTimeout(() => setToast(''), 3500)
      return
    }

    const text = `[SINH HIỆU LÂM SÀNG & SÀNG LỌC TRIAGE]: ` + parts.join(' · ')
    setClinicalNotes(prev => prev ? `${prev}\n\n${text}` : text)
    
    // Đưa trực tiếp vào Mục O (Khám thực thể) của SOAP
    const objText = `Thể trạng tỉnh táo, tiếp xúc tốt. Sinh hiệu: ` + parts.join(', ') + '.'
    setClinicalExamination(prev => prev ? `${prev}\n${objText}` : objText)
    
    setToast('⚡ Đã đưa Sinh hiệu Triage & RPM vào Mục O (Khám thực thể) của Bệnh án!')
    setTimeout(() => setToast(''), 3500)
    setActiveTab('record')
  }

  // Tự động phân tích hội thoại & điền trực tiếp vào các mục SOAP trên màn hình
  async function handleAutoFillSoapFromAi() {
    const textToAnalyze = scribeTranscript.trim() || encounterInfo?.reason || appointment.reason || symptoms.trim() || ''
    if (!textToAnalyze) {
      setError('Chưa có nội dung hội thoại hoặc lý do khám để AI phân tích.')
      return
    }
    setGeneratingSoap(true)
    setError('')
    try {
      const res = await generateAiScribeSoap(
        textToAnalyze,
        patientData?.full_name || (appointment as any).patient_name || 'Bệnh nhân',
        patientData?.age || 35
      )
      setSoapResult(res)
      
      const subj = res.soap?.subjective || res.extracted_symptoms || symptoms || encounterInfo?.reason || appointment.reason || ''
      const obj = res.soap?.objective || clinicalExamination || (triageBp ? `Thể trạng tỉnh táo, tiếp xúc tốt. HA ${triageBp} mmHg, Mạch ${triagePulse || '--'} bpm, SpO2 ${triageSpo2 || '--'}%` : 'Thể trạng tỉnh táo, tiếp xúc tốt.')
      const ass = res.soap?.assessment || diagnosis || res.extracted_symptoms || ''
      const code = res.suggested_icd10_code || icd10Code || ''
      const name = res.suggested_icd10_name || icd10Name || ''
      const pl = res.soap?.plan || plan || ''

      if (subj) setSymptoms(subj)
      if (obj) setClinicalExamination(obj)
      if (ass) setDiagnosis(ass)
      if (code) setIcd10Code(code)
      if (name) setIcd10Name(name)
      if (pl) setPlan(pl)
      if (res.prescription_draft && !prescription.trim()) {
        setPrescription(res.prescription_draft)
      }
      if (res.allergies_warning && !allergies) {
        setAllergies(res.allergies_warning)
      }

      setSoapEditState({
        subjective: subj,
        objective: obj,
        assessment: ass,
        icd10Code: code,
        icd10Name: name,
        plan: pl,
        prescriptionDraft: res.prescription_draft || prescription || '',
        allergiesWarning: res.allergies_warning || allergies || 'Không ghi nhận tiền sử dị ứng'
      })

      setActiveTab('record')
      setToast('✨ AI Scribe đã tự động điền đầy đủ các mục SOAP vào Bệnh án! Bác sĩ có thể chỉnh sửa trực tiếp.')
    } catch (e: any) {
      console.warn('Lỗi AI Scribe:', e)
      setError(e instanceof Error ? e.message : 'Không thể kết nối AI Scribe.')
    } finally {
      setGeneratingSoap(false)
    }
  }

  async function handleSyncTriageVitals() {
    setLoadingRpm(true)
    await loadRpmVitals()
    loadRecord()
    setToast('🔄 Đã cập nhật đầy đủ các chỉ số mới nhất từ Bàn Sàng lọc & Phân luồng Điều dưỡng (Triage Desk)!')
    setTimeout(() => setToast(''), 3500)
  }

  // 3. Tra cứu ICD-10 khi gõ
  useEffect(() => {
    searchICD10(icdSearchQuery).then(setIcdOptions).catch(console.error)
  }, [icdSearchQuery])

  function selectICD(item: { code: string; name: string; chapter?: string }) {
    setIcd10Code(item.code)
    setIcd10Name(item.name)
    if (!diagnosis) setDiagnosis(item.name)
    setShowIcdList(false)
    setIcdSearchQuery('')
  }

  // Tạo phiếu khám lâm sàng & Mở xem chi tiết
  async function handleSaveAndPreviewClinicalSheet() {
    setCreatingClinicalSheet(true)
    setError('')
    try {
      await saveClinicalRecord(appointment.id, {
        symptoms,
        allergies,
        diagnosis,
        icd10_code: icd10Code,
        icd10_name: icd10Name,
        clinical_notes: clinicalNotes,
        plan,
        clinical_examination: clinicalExamination,
        paraclinical_results: paraclinicalResults,
        treatment_regimen: treatmentRegimen,
        clinical_evolution: clinicalEvolution,
        medical_services_used: medicalServicesUsed
      })
      if (prescription.trim()) {
        await savePrescription(appointment.id, prescription)
      }
      setToast('🎉 Đã tạo Phiếu khám lâm sàng thành công!')
      setShowClinicalSheetModal(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tạo được phiếu khám lâm sàng')
    } finally {
      setCreatingClinicalSheet(false)
    }
  }

  async function handleSaveDraft() {
    setSaving(true)
    setError('')
    try {
      await saveClinicalRecord(appointment.id, {
        symptoms,
        allergies,
        diagnosis,
        icd10_code: icd10Code,
        icd10_name: icd10Name,
        clinical_notes: clinicalNotes,
        plan,
        clinical_examination: clinicalExamination,
        paraclinical_results: paraclinicalResults,
        treatment_regimen: treatmentRegimen,
        clinical_evolution: clinicalEvolution,
        medical_services_used: medicalServicesUsed
      })
      if (prescription.trim()) {
        await savePrescription(appointment.id, prescription)
      }
      setToast('Đã lưu bản nháp hồ sơ lâm sàng')
      setTimeout(() => setToast(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được bản nháp')
    } finally {
      setSaving(false)
    }
  }

  // Ký số SmartCA
  async function handleDigitalSign() {
    setSigning(true)
    setError('')
    try {
      // Lưu trước khi ký
      await saveClinicalRecord(appointment.id, {
        symptoms,
        allergies,
        diagnosis,
        icd10_code: icd10Code,
        icd10_name: icd10Name,
        clinical_notes: clinicalNotes,
        plan,
        clinical_examination: clinicalExamination,
        paraclinical_results: paraclinicalResults,
        treatment_regimen: treatmentRegimen,
        clinical_evolution: clinicalEvolution,
        medical_services_used: medicalServicesUsed
      })
      if (prescription.trim()) {
        await savePrescription(appointment.id, prescription)
      }

      const res = await signDocumentSmartCA(appointment.id, 'VNPT_SmartCA')
      setSignatureInfo(res)
      setIsLocked(true)
      setToast('Đã ký số SmartCA thành công! Bệnh án đã được đóng dấu thời gian pháp lý.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi ký số SmartCA')
    } finally {
      setSigning(false)
    }
  }

  // Đồng bộ Đơn thuốc điện tử Quốc gia
  async function handleSyncNational() {
    if (!prescription.trim()) {
      setError('Cần nhập nội dung đơn thuốc trước khi đồng bộ lên Cổng Quốc gia')
      return
    }
    setSyncingPres(true)
    setError('')
    try {
      await savePrescription(appointment.id, prescription)
      const res = await syncNationalPrescription(appointment.id)
      setNationalPrescription({
        national_code: res.national_prescription_code,
        qr_url: res.qr_code_url,
        synced_at: res.synced_at
      })
      setToast(`Đã đồng bộ đơn thuốc lên Cổng Quốc gia! Mã đơn: ${res.national_prescription_code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi đồng bộ Đơn thuốc Quốc gia')
    } finally {
      setSyncingPres(false)
    }
  }

  // Tải file PDF Bệnh án & Đơn thuốc
  async function handleDownloadPdf() {
    setDownloadingPdf(true)
    try {
      await downloadMedicalRecordPdf(appointment.id)
      setToast('Đang tải xuống file PDF Phiếu khám & Đơn thuốc...')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tạo file PDF')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // Xem FHIR Bundle
  async function loadFhir() {
    try {
      const data = await getFhirBundle(appointment.id)
      setFhirJson(JSON.stringify(data, null, 2))
    } catch (e) {
      console.error(e)
    }
  }

  // Xử lý AI Ambient Scribe - Tự động tóm tắt & mở Popup đầy đủ thông tin để Bác sĩ xem lại & chỉnh sửa
  
  // Tai cau hinh AI Engine hien tai
  useEffect(() => {
    getAIStatus()
      .then(res => setAiEngine(res))
      .catch(err => console.warn('Khong the tai trang thai AI:', err))
  }, [])

  

  async function handleAnalyzeAiScribe() {
    if (!scribeTranscript.trim()) {
      setError('Vui lòng bật Mic "Tự động nghe" hoặc bấm "Mẫu thoại" để có nội dung hội thoại khám bệnh')
      return
    }
    setGeneratingSoap(true)
    setError('')
    try {
      const res = await generateAiScribeSoap(
        scribeTranscript,
        patientData?.full_name || 'Bệnh nhân',
        35
      )
      setSoapResult(res)
      setSoapEditState({
        subjective: res.soap?.subjective || res.extracted_symptoms || '',
        objective: res.soap?.objective || '',
        assessment: res.soap?.assessment || '',
        icd10Code: res.suggested_icd10_code || '',
        icd10Name: res.suggested_icd10_name || '',
        plan: res.soap?.plan || '',
        prescriptionDraft: res.prescription_draft || '',
        allergiesWarning: res.allergies_warning || 'Không ghi nhận tiền sử dị ứng'
      })
      setShowSoapModal(true) // Mở Popup đầy đủ thông tin cho bác sĩ đọc lại và chỉnh sửa thêm
      setToast('AI đã tóm tắt SOAP thành công. Đang hiển thị bản thảo chi tiết để Bác sĩ kiểm tra!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể phân tích AI Scribe')
    } finally {
      setGeneratingSoap(false)
    }
  }

  function handleOpenSoapModal() {
    if (soapResult) {
      setShowSoapModal(true)
    } else {
      handleAnalyzeAiScribe()
    }
  }

  function handleResetOriginalSoap() {
    if (!soapResult) return
    setSoapEditState({
      subjective: soapResult.soap?.subjective || soapResult.extracted_symptoms || '',
      objective: soapResult.soap?.objective || '',
      assessment: soapResult.soap?.assessment || '',
      icd10Code: soapResult.suggested_icd10_code || '',
      icd10Name: soapResult.suggested_icd10_name || '',
      plan: soapResult.soap?.plan || '',
      prescriptionDraft: soapResult.prescription_draft || '',
      allergiesWarning: soapResult.allergies_warning || 'Không ghi nhận tiền sử dị ứng'
    })
    setToast('Đã khôi phục lại bản thảo tóm tắt gốc từ AI.')
  }

  
  // Ham Tao Phieu Kham: Ket noi AI tom tat & tao SOAP, neu AI khong ket noi thi cho phep BS nhap tay
  const handleCreateClinicalSheet = async () => {
    const textToAnalyze = scribeTranscript.trim() || encounterInfo?.reason || appointment.reason || symptoms.trim() || ''
    
    setGeneratingSoap(true)
    try {
      if (textToAnalyze) {
        const res = await generateAiScribeSoap(textToAnalyze, patientData?.full_name || (appointment as any).patient_name || "Bệnh nhân", patientData?.age || 35)
        setSoapResult(res)
        setSoapEditState({
          subjective: res.soap?.subjective || res.extracted_symptoms || symptoms || encounterInfo?.reason || appointment.reason || '',
          objective: res.soap?.objective || clinicalExamination || (triageBp ? `Thể trạng chung tốt, HA ${triageBp} mmHg, Mạch ${triagePulse || '--'} bpm, SpO2 ${triageSpo2 || '--'}%` : 'Thể trạng chung tốt, tiếp xúc tốt.'),
          assessment: res.soap?.assessment || diagnosis || res.extracted_symptoms || encounterInfo?.reason || appointment.reason || '',
          icd10Code: res.suggested_icd10_code || icd10Code || '',
          icd10Name: res.suggested_icd10_name || icd10Name || '',
          plan: res.soap?.plan || plan || '',
          prescriptionDraft: res.prescription_draft || prescription || '',
          allergiesWarning: res.allergies_warning || allergies || patientData?.allergies || 'Không ghi nhận tiền sử dị ứng'
        })
        setShowSoapModal(true)
        setToast('✨ AI đã kết nối & tự động tạo bản thảo SOAP! Bác sĩ kiểm tra và duyệt phiếu khám.')
        return
      }
    } catch (err) {
      console.warn('AI không kết nối được hoặc lỗi mạng, chuyển sang chế độ BS nhập tay:', err)
      setToast('⚠️ AI không kết nối được. Đã chuyển sang chế độ Bác sĩ tự nhập tay.')
    } finally {
      setGeneratingSoap(false)
    }

    // Fallback neu AI khong co ket noi: Mo form de Bac si tu nhap tay truc tiep
    handleOpenManualSoap()
  }

  const handleOpenManualSoap = () => {
    setSoapEditState({
      subjective: symptoms || encounterInfo?.reason || appointment.reason || '',
      objective: clinicalExamination || (triageBp ? `Thể trạng tỉnh táo, HA ${triageBp} mmHg, Mạch ${triagePulse || '--'} bpm, SpO2 ${triageSpo2 || '--'}%` : 'Thể trạng tỉnh táo, tiếp xúc tốt.'),
      assessment: diagnosis || '',
      icd10Code: icd10Code || '',
      icd10Name: icd10Name || '',
      plan: plan || '',
      prescriptionDraft: prescription || '',
      allergiesWarning: allergies || patientData?.allergies || 'Không ghi nhận tiền sử dị ứng'
    })
    setShowSoapModal(true)
    setToast('📝 Mở Phiếu khám lâm sàng: Bác sĩ nhập tay trực tiếp.')
  }

    async function handleConfirmApplySoapModal() {
    const subj = soapEditState.subjective || symptoms
    const obj = soapEditState.objective || clinicalExamination
    const ass = soapEditState.assessment || diagnosis
    const code = soapEditState.icd10Code || icd10Code
    const name = soapEditState.icd10Name || icd10Name
    const pl = soapEditState.plan || plan
    const rx = soapEditState.prescriptionDraft || prescription
    const al = soapEditState.allergiesWarning || allergies

    if (subj) setSymptoms(subj)
    if (obj) setClinicalExamination(obj)
    if (ass) setDiagnosis(ass)
    if (code) setIcd10Code(code)
    if (name) setIcd10Name(name)
    if (pl) setPlan(pl)
    if (rx) setPrescription(rx)
    if (al) setAllergies(al)

    setShowSoapModal(false)
    setActiveTab('record')

    try {
      await saveClinicalRecord(appointment.id, {
        symptoms: subj,
        clinical_examination: obj,
        diagnosis: ass,
        icd10_code: code,
        icd10_name: name,
        plan: pl,
        allergies: al,
        clinical_notes: clinicalNotes,
        paraclinical_results: paraclinicalResults,
        treatment_regimen: treatmentRegimen,
        clinical_evolution: clinicalEvolution,
        medical_services_used: medicalServicesUsed
      })
      if (rx && rx.trim()) {
        await savePrescription(appointment.id, rx)
      }
      setToast('✅ Đã xác nhận & lưu Phiếu khám lâm sàng SOAP vào Bệnh án điện tử EMR!')
    } catch (e) {
      console.warn('Lỗi tự động lưu EMR:', e)
      setToast('✅ Đã cập nhật Phiếu khám lâm sàng SOAP thành công!')
    }
  }

  function handleApplySoapToRecord() {
    handleOpenSoapModal()
  }

  function handleLoadSampleDialog() {
    setScribeTranscript(
      "Bác sĩ: Chào anh, hôm nay anh cảm thấy trong người thế nào?\n" +
      "Bệnh nhân: Dạ chào bác sĩ, tôi bị sốt 38.5 độ từ 2 hôm nay, ho nhiều có đờm và đau rát cổ họng, người uể oải mệt mỏi lắm.\n" +
      "Bác sĩ: Anh có bị khó thở hay đau tức ngực không? Có dị ứng thuốc nào trước đây chưa?\n" +
      "Bệnh nhân: Dạ không tức ngực, không khó thở, trước giờ tôi chưa từng dị ứng thuốc nào cả.\n" +
      "Bác sĩ: Được rồi, quan sát cổ họng qua camera tôi thấy niêm mạc họng hơi đỏ nhẹ, amiđan không sưng to. Tôi sẽ kê đơn thuốc hạ sốt, long đờm và kháng viêm nhẹ cho anh nhé."
    )
    setToast('Đã nạp đoạn hội thoại khám lâm sàng mẫu.')
  }

  async function handleComplete() {
    setError('')
    try {
      await saveClinicalRecord(appointment.id, {
        symptoms,
        allergies,
        diagnosis,
        icd10_code: icd10Code,
        icd10_name: icd10Name,
        clinical_notes: clinicalNotes,
        plan,
        clinical_examination: clinicalExamination,
        paraclinical_results: paraclinicalResults,
        treatment_regimen: treatmentRegimen,
        clinical_evolution: clinicalEvolution,
        medical_services_used: medicalServicesUsed
      })
      if (prescription.trim()) {
        await savePrescription(appointment.id, prescription)
      }

      await completeConsultation(appointment.id)
      setIsLocked(true)
      setShowConfirmModal(false)
      setToast('Buổi khám đã hoàn tất và hồ sơ bệnh án đã được khóa an toàn!')
      setTimeout(() => {
        onCompleted()
      }, 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể hoàn tất buổi khám')
    }
  }

  return (
    <div className="ds-scope">
      <div className="workspace-container">
      {/* Top Header */}
      <header className="workspace-header">
        <div className="workspace-header-left">
          <button className="secondary back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Rời phòng
          </button>
          <div className="consult-title">
            <div className="consult-title-row">
              <h2 className="consult-patient-name">{patientData?.full_name || 'Bệnh nhân'}</h2>
              <span className="consult-badge vneid">✓ VNeID Cấp 2</span>
              <span className="consult-badge returning">🟢 Bệnh nhân cũ</span>
              <span className="consult-badge room-badge">
                <Stethoscope size={13} /> Phòng #{appointment.id}
              </span>
            </div>
            <div className="consult-meta-row">
              <span>CCCD: <strong>{patientData?.identity_card || 'Chưa cập nhật'}</strong></span>
              <span className="meta-sep">&bull;</span>
              <span>SĐT: <strong>{patientData?.phone_number || 'Chưa cập nhật'}</strong></span>
              <span className="meta-sep">&bull;</span>
              <span>Mã PID: <strong>{patientData?.external_patient_id || `BN-${appointment.patient_id}`}</strong></span>
            </div>
          </div>
        </div>

        <div className="workspace-header-actions">
          <NotificationCenter userRole="doctor" />
          {/* Nút Ký số SmartCA */}
          {!signatureInfo ? (
            <button
              className="btn-sign"
              onClick={handleDigitalSign}
              disabled={signing}
            >
              <PenTool size={16} /> {signing ? 'Đang ký SmartCA...' : 'Ký số SmartCA'}
            </button>
          ) : (
            <div className="signed-pill">
              <ShieldCheck size={16} color="#16a34a" /> Đã ký số SmartCA
            </div>
          )}

          {isLocked ? (
            <div className="locked-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={15} /> Bệnh án đã khóa
              <button
                type="button"
                onClick={() => {
                  setIsLocked(false)
                  setToast('Đã mở khóa bệnh án để chỉnh sửa')
                }}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  cursor: 'pointer'
                }}
                title="Bác sĩ mở khóa để chỉnh sửa lại thông tin bệnh án"
              >
                ✏️ Mở khóa sửa
              </button>
            </div>
          ) : (
            <>
              <button className="btn-draft" onClick={handleSaveDraft} disabled={saving}>
                <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu nháp'}
              </button>
              <button className="btn-complete" onClick={() => setShowConfirmModal(true)}>
                <CheckCircle2 size={16} /> Hoàn tất buổi khám
              </button>
            </>
          )}
        </div>
      </header>

      {/* Thông báo hệ thống nổi ở góc dưới bên phải màn hình */}
      <div className="system-toast-container">
        {toast && (
          <div className="toast-banner">
            <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />
            <span className="toast-message">{toast}</span>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setToast('')}
              title="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>
        )}
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
            <span className="error-message">{error}</span>
            <button
              type="button"
              className="error-close-btn"
              onClick={() => setError('')}
              title="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Main Split View: Left = Video, Right = Clinical Documentation */}
      <div className="workspace-split">
        {/* Left Pane: WebRTC Full-Duplex Video & Audio Workspace */}
        <div className="video-pane">
          <div className="doctor-video-stage">
            <div className="room-secure-indicator">
              <span className={`live-dot ${rtcState.remoteStream ? 'online' : 'connecting'}`} />
              Phòng khám #{appointment.id} · WebRTC P2P {rtcState.remoteStream ? '(Bệnh nhân đang kết nối)' : '(Đang chờ bệnh nhân)'}
            </div>

            {/* Remote Patient Video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`doctor-remote-video ${rtcState.remoteStream ? 'visible' : 'hidden'}`}
            />

            {/* Thông báo Bác sĩ đang chia sẻ màn hình */}
            {rtcState.isScreenSharing && (
              <div className="doctor-screenshare-indicator">
                <span className="live-pulse-dot" style={{ background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
                <span>🔴 Bạn đang chia sẻ màn hình với bệnh nhân</span>
              </div>
            )}

            {/* Placeholder khi bệnh nhân chưa nối máy */}
            {!rtcState.remoteStream && (
              <div className="video-placeholder doctor-waiting-screen">
                <div className="pulse-spinner">
                  <Video size={44} color="#0d9488" className="spin-slow" />
                </div>
                <h3>Đang chờ bệnh nhân kết nối vào phòng khám...</h3>
                <p>Hệ thống truyền tải âm thanh & video độ trễ cực thấp (WebRTC P2P).</p>
                <div className="audio-live-pill">
                  <Volume2 size={15} /> Kênh âm thanh y tế chất lượng cao đã sẵn sàng
                </div>
                <button
                  type="button"
                  className="doctor-call-patient-cta"
                  onClick={handleCallPatient}
                  disabled={callingPatient}
                  title="Gửi tín hiệu đổ chuông trực tiếp tới điện thoại của bệnh nhân"
                >
                  <PhoneCall size={18} className={callingPatient ? "spin-icon" : "phone-ring-icon"} />
                  <span>{callingPatient ? 'Đang gửi tín hiệu chuông tới bệnh nhân...' : 'Đổ chuông gọi điện thoại bệnh nhân'}</span>
                </button>
              </div>
            )}

            {/* Doctor local webcam PiP */}
            <div className="doctor-local-pip-box">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="doctor-local-video"
              />
              <span className="pip-label">
                {rtcState.isAudioMuted && <MicOff size={11} color="#ef4444" />}
                BS. {user.full_name}
              </span>
            </div>

            {/* Doctor media toolbar */}
            <div className="doctor-media-toolbar">
              <button
                type="button"
                className={`doctor-media-btn ${rtcState.isAudioMuted ? 'muted' : 'active'}`}
                onClick={() => webrtcService.toggleAudio()}
                title={rtcState.isAudioMuted ? 'Bật Mic' : 'Tắt Mic'}
              >
                {rtcState.isAudioMuted ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{rtcState.isAudioMuted ? 'Bật Mic' : 'Tắt Mic'}</span>
              </button>
              <button
                type="button"
                className={`doctor-media-btn ${rtcState.isVideoMuted ? 'muted' : 'active'}`}
                onClick={() => webrtcService.toggleVideo()}
                title={rtcState.isVideoMuted ? 'Bật Camera' : 'Tắt Camera'}
              >
                {rtcState.isVideoMuted ? <VideoOff size={18} /> : <Video size={18} />}
                <span>{rtcState.isVideoMuted ? 'Bật Cam' : 'Tắt Cam'}</span>
              </button>

              {/* Nút chia sẻ màn hình giống Google Meet */}
              <button
                type="button"
                className={`doctor-media-btn ${rtcState.isScreenSharing ? 'screenshare-active' : ''}`}
                onClick={async () => {
                  if (rtcState.isScreenSharing) {
                    await webrtcService.stopScreenShare()
                  } else {
                    await webrtcService.startScreenShare()
                  }
                }}
                title={rtcState.isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình giống Google Meet'}
              >
                {rtcState.isScreenSharing ? <ScreenShareOff size={18} /> : <ScreenShare size={18} />}
                <span>{rtcState.isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}</span>
              </button>

              {/* Nút mở nhanh Chat & Tệp */}
              <button
                type="button"
                className={`doctor-media-btn ${activeTab === 'chat' ? 'active-sheet' : ''}`}
                onClick={() => {
                  setActiveTab('chat')
                  setUnreadChatCount(0)
                }}
                title="Nhắn tin & Tệp bệnh nhân gửi"
              >
                <MessageSquare size={18} />
                <span>Chat {unreadChatCount > 0 && `(${unreadChatCount})`}</span>
              </button>

              <div className="doctor-media-status-badge">
                <ShieldCheck size={14} color="#10b981" />
                <span>WebRTC E2EE</span>
              </div>
            </div>
          </div>

          {/* 1. Sinh hiệu Lâm sàng & Sàng lọc Triage (Horizontal Vitals Strip) */}
          <div className="doctor-vitals-strip">
            <div className="vitals-strip-header">
              <div className="vitals-strip-title">
                <div className="vitals-mini-badge">
                  <HeartPulse size={15} />
                </div>
                <div>
                  <strong>Sinh hiệu Triage & RPM IoT</strong>
                  <span className="vitals-source-label">
                    {triageNurse ? `ĐD. ${triageNurse} · Bàn Triage` : 'Omron BLE · Accu-Chek · SpO2'}
                  </span>
                </div>
              </div>
              <div className="vitals-strip-actions">
                <button
                  type="button"
                  className="btn-vitals-history"
                  onClick={() => setShowRpmHistoryModal(true)}
                  title="Xem lịch sử đo sinh hiệu của bệnh nhân"
                >
                  <Clock size={12} /> Lịch sử ({rpmVitals.length || 3})
                </button>
                <button
                  type="button"
                  className="btn-vitals-apply"
                  onClick={handleApplyRpmToRecord}
                  title="Đưa các chỉ số sinh hiệu vào Mục O (Khám thực thể) của Bệnh án"
                >
                  <FileCheck size={12} /> Đưa vào SOAP
                </button>
              </div>
            </div>

            <div className="vitals-chips-row">
              {/* 1. Huyết áp */}
              <div className={`vitals-chip ${triageBp ? 'has-data' : 'empty'}`}>
                <div className="chip-top">
                  <span className="chip-code">HA</span>
                  <span className={`chip-dot ${triageBp ? 'good' : 'muted'}`} />
                </div>
                <div className="chip-value">
                  <strong>{triageBp || '--/--'}</strong>
                  <span className="chip-unit">mmHg</span>
                </div>
                <div className="chip-sub">{triagePulse ? `Mạch: ${triagePulse} bpm` : 'Huyết áp'}</div>
              </div>

              {/* 2. Nhịp tim */}
              <div className={`vitals-chip ${triagePulse ? 'has-data' : 'empty'}`}>
                <div className="chip-top">
                  <span className="chip-code">Mạch</span>
                  <span className={`chip-dot ${triagePulse ? 'good' : 'muted'}`} />
                </div>
                <div className="chip-value">
                  <strong>{triagePulse || '--'}</strong>
                  <span className="chip-unit">bpm</span>
                </div>
                <div className="chip-sub">Nhịp xoang</div>
              </div>

              {/* 3. Thân nhiệt */}
              <div className={`vitals-chip ${triageTemp ? 'has-data' : 'empty'}`}>
                <div className="chip-top">
                  <span className="chip-code">Nhiệt độ</span>
                  <span className={`chip-dot ${triageTemp ? 'good' : 'muted'}`} />
                </div>
                <div className="chip-value">
                  <strong>{triageTemp || '--'}</strong>
                  <span className="chip-unit">°C</span>
                </div>
                <div className="chip-sub">{triageTemp ? 'Bình thường' : 'Chưa đo'}</div>
              </div>

              {/* 4. SpO2 */}
              <div className={`vitals-chip ${triageSpo2 ? 'has-data' : 'empty'}`}>
                <div className="chip-top">
                  <span className="chip-code">SpO2</span>
                  <span className={`chip-dot ${triageSpo2 ? 'good' : 'muted'}`} />
                </div>
                <div className="chip-value">
                  <strong>{triageSpo2 || '--'}</strong>
                  <span className="chip-unit">%</span>
                </div>
                <div className="chip-sub">Bão hòa Oxy</div>
              </div>

              {/* 5. Đường huyết */}
              <div className={`vitals-chip ${triageGlucose ? 'has-data' : 'empty'}`}>
                <div className="chip-top">
                  <span className="chip-code">Đường huyết</span>
                  <span className={`chip-dot ${triageGlucose ? 'good' : 'muted'}`} />
                </div>
                <div className="chip-value">
                  <strong>{triageGlucose || '--'}</strong>
                  <span className="chip-unit">mmol/L</span>
                </div>
                <div className="chip-sub">Mao mạch</div>
              </div>

              {/* 6. BMI / Thể trạng */}
              <div className={`vitals-chip ${triageBmi || triageWeight ? 'has-data' : 'empty'}`}>
                <div className="chip-top">
                  <span className="chip-code">BMI</span>
                  <span className={`chip-dot ${triageBmi ? 'good' : 'muted'}`} />
                </div>
                <div className="chip-value">
                  <strong>{triageBmi || '--'}</strong>
                  <span className="chip-unit">kg/m²</span>
                </div>
                <div className="chip-sub">{triageWeight && triageHeight ? `${triageWeight}kg · ${triageHeight}cm` : 'Thể trạng'}</div>
              </div>
            </div>
          </div>

          {/* 2. Trợ lý Y tế AI Scribe (Compact Single-Row Dock) */}
          <div className="doctor-ai-scribe-dock">
            <div className="ai-scribe-compact-row">
              <div className="ai-scribe-left">
                <div className="ai-sparkle-pill">
                  <Sparkles size={15} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>Trợ lý AI Scribe</strong>
                    {isListening ? (
                      <span className="scribe-live-pill recording">
                        <span className="live-dot" /> Đang nghe...
                      </span>
                    ) : (
                      <span className="scribe-live-pill ready">
                        <span className="live-dot" /> Sẵn sàng
                      </span>
                    )}
                  </div>
                  <span className="ai-scribe-subtext">
                    Tự động nghe hội thoại khám & tạo bệnh án chuẩn SOAP
                  </span>
                </div>
              </div>

              <div className="ai-scribe-btn-group">
                <button
                  type="button"
                  className={`btn-scribe-toggle ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  title={isListening ? 'Dừng lắng nghe' : 'Bật tự động nghe từ Mic cuộc gọi'}
                >
                  {isListening ? <MicOff size={13} /> : <Mic size={13} />}
                  <span>{isListening ? 'Dừng nghe' : 'Tự động nghe'}</span>
                </button>

                <button
                  type="button"
                  className={`btn-scribe-transcript ${scribeTranscript.trim() ? 'has-data' : ''}`}
                  onClick={() => setShowTranscriptModal(true)}
                  title="Xem và chỉnh sửa toàn bộ biên bản hội thoại"
                >
                  <MessageSquare size={13} />
                  <span>Hội thoại</span>
                  {scribeTranscript.trim() && (
                    <span className="transcript-badge">
                      {scribeTranscript.trim().split('\n').filter(Boolean).length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-scribe-autofill"
                  onClick={handleAutoFillSoapFromAi}
                  disabled={generatingSoap || (!scribeTranscript.trim() && !encounterInfo?.reason && !appointment.reason && !symptoms.trim())}
                  title="AI phân tích và tự động điền các mục SOAP trực tiếp vào bệnh án bên phải"
                >
                  <Sparkles size={13} className={generatingSoap ? 'spin-icon' : ''} />
                  <span>{generatingSoap ? 'Đang tóm tắt...' : '✨ Tự động điền SOAP'}</span>
                </button>

                {scribeTranscript && (
                  <button
                    type="button"
                    className="btn-scribe-clear"
                    onClick={() => { setScribeTranscript(''); setToast('Đã làm mới hội thoại'); }}
                    title="Xóa biên bản hội thoại để ghi lượt mới"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Clinical Documentation Workspace */}
        <div className="clinical-pane">
          <div className="clinical-tabs">
            {/* 1. Thông tin đặt khám */}
            <button
              className={`tab-btn ${activeTab === 'record' ? 'active' : ''}`}
              onClick={() => setActiveTab('record')}
              title="Thông tin đăng ký đặt khám & Phiếu khám lâm sàng EMR"
            >
              <FileText size={15} /> Khám bệnh & SOAP
            </button>

            {/* 2. CLS */}
            <button
              className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
              onClick={() => setActiveTab('lab')}
              style={{ position: 'relative' }}
              title="Kết quả xét nghiệm & Cận lâm sàng (CLS)"
            >
              <FlaskConical size={15} /> CLS
              {labData && labData.abnormal_indicators_count > 0 && (
                <span className="tab-unread-badge" style={{ background: '#ef4444' }}>
                  {labData.abnormal_indicators_count} !
                </span>
              )}
            </button>

            {/* 3. PACS */}
            <button
              className={`tab-btn ${activeTab === 'pacs' ? 'active' : ''}`}
              onClick={() => setActiveTab('pacs')}
              title="Phim X-Quang, CT, MRI, Siêu âm chuẩn DICOM PACS"
            >
              <ScanLine size={15} /> PACS
              {pacsData?.total_studies ? (
                <span style={{ marginLeft: 5, fontSize: '11px', background: activeTab === 'pacs' ? 'rgba(255,255,255,0.3)' : '#e0f2fe', color: activeTab === 'pacs' ? '#fff' : '#0369a1', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                  {pacsData.total_studies}
                </span>
              ) : null}
            </button>

            {/* 4. Đơn thuốc */}
            <button
              className={`tab-btn ${activeTab === 'prescription' ? 'active' : ''}`}
              onClick={() => setActiveTab('prescription')}
              title="Kê đơn thuốc & Đơn thuốc Quốc gia"
            >
              <Pill size={15} /> Đơn thuốc
            </button>

            {/* 5. Chat */}
            <button
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('chat')
                setUnreadChatCount(0)
              }}
              style={{ position: 'relative' }}
              title="Nhắn tin & Tệp gửi giữa Bác sĩ và Bệnh nhân"
            >
              <MessageSquare size={15} /> Chat
              {unreadChatCount > 0 && <span className="tab-unread-badge">{unreadChatCount}</span>}
            </button>

            {/* Tiện ích mở rộng khác (BHYT, Hội chẩn, Tiền sử, Lịch sử, FHIR) */}
            <div className="tab-dropdown-wrapper" style={{ marginLeft: 'auto', position: 'relative' }}>
              <button
                type="button"
                className={`tab-btn tab-btn-more ${['bhyt', 'multidoctor', 'patient_info', 'history', 'fhir'].includes(activeTab) ? 'active' : ''}`}
                onClick={() => setShowMoreTabs(!showMoreTabs)}
                title="Tiện ích mở rộng khác (BHYT, Hội chẩn, Tiền sử, Lịch sử, FHIR)"
              >
                <MoreHorizontal size={15} />
                <span>Tiện ích ▾</span>
              </button>
              {showMoreTabs && (
                <div className="tab-dropdown-menu">
                  <button
                    type="button"
                    className={`dropdown-item ${activeTab === 'patient_info' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('patient_info'); setShowMoreTabs(false); }}
                  >
                    <User size={14} /> Tiền sử & Hành chính bệnh nhân
                  </button>
                  <button
                    type="button"
                    className={`dropdown-item ${activeTab === 'bhyt' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('bhyt'); loadBhytData(); setShowMoreTabs(false); }}
                  >
                    <FileCheck size={14} /> Giám định BHYT (XML 4210)
                  </button>
                  <button
                    type="button"
                    className={`dropdown-item ${activeTab === 'multidoctor' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('multidoctor'); loadConsultationMembers(); setShowMoreTabs(false); }}
                  >
                    <Users size={14} /> Hội chẩn Liên viện
                  </button>
                  <button
                    type="button"
                    className={`dropdown-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('history'); loadHistory(); setShowMoreTabs(false); }}
                  >
                    <Clock size={14} /> Lịch sử ca khám & Timeline
                  </button>
                  <button
                    type="button"
                    className={`dropdown-item ${activeTab === 'fhir' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('fhir'); loadFhir(); setShowMoreTabs(false); }}
                  >
                    <Code2 size={14} /> Chuẩn HL7 FHIR
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="clinical-content">
                        {activeTab === 'record' && (
              <div className="booking-info-tab-container">
              <div className="booking-intake-collapsible">
                <div
                  className="booking-intake-header"
                  onClick={() => setCollapseIntake(!collapseIntake)}
                  title={collapseIntake ? 'Bấm để mở rộng thông tin tiếp đón' : 'Bấm để thu gọn'}
                >
                  <div className="intake-header-left">
                    <CalendarCheck size={16} color="#0e7490" />
                    <strong>Thông tin Đặt khám & Sàng lọc Tiếp đón Triage</strong>
                    <span className="badge-live-online">🟢 Đang khám trực tuyến</span>
                  </div>
                  <button
                    type="button"
                    className="btn-toggle-intake"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCollapseIntake(!collapseIntake)
                    }}
                  >
                    {collapseIntake ? (
                      <>
                        <ChevronDown size={14} /> Mở rộng chi tiết
                      </>
                    ) : (
                      <>
                        <ChevronUp size={14} /> Thu gọn
                      </>
                    )}
                  </button>
                </div>

                {collapseIntake ? (
                  <div className="intake-collapsed-summary">
                    <span className="intake-summary-chip">
                      👤 <strong>{patientData?.full_name || appointment.patient_name || 'Bệnh nhân'}</strong>
                      {calculatedAge !== null ? ` (${calculatedAge}t)` : ''}
                    </span>
                    <span className="intake-summary-chip">
                      💬 Lý do: <em>"{(encounterInfo?.reason || appointment.reason || symptoms || 'Khai báo trực tuyến').substring(0, 40)}..."</em>
                    </span>
                    <span className={`intake-summary-chip ${(patientData?.allergies || allergies) ? 'alert' : ''}`}>
                      ⚠️ Dị ứng: {patientData?.allergies || allergies || 'Không ghi nhận'}
                    </span>
                    <span className="intake-summary-chip">
                      🩺 ĐD: {encounterInfo?.nurse_name || appointment?.nurse_name || triageNurse || 'Nguyễn Thị Mai (Bàn Triage)'}
                    </span>
                  </div>
                ) : (
                  <div className="intake-expanded-body">
                    {/* 1. ĐƠN ĐẶT KHÁM */}
                <div className="booking-section-card">
                  <div className="essential-header">
                    <div className="essential-header-left">
                      <CalendarCheck size={16} color="#0f766e" />
                      <strong>Đơn đặt khám #{appointment.id}</strong>
                      <span className="badge-live-status">🟢 Đang khám trực tuyến</span>
                    </div>
                  </div>

                  <div className="essential-patient-strip">
                    <div className="patient-mini-item">
                      <span className="mini-label">Bệnh nhân:</span>
                      <strong className="mini-val" style={{ color: '#0f766e' }}>{patientData?.full_name || appointment.patient_name || user.full_name || 'Bệnh nhân'}</strong>
                      <span className="mini-sub">({patientData?.gender === 'female' ? 'Nữ' : (patientData?.gender === 'male' ? 'Nam' : 'Chưa cập nhật')}{patientData?.date_of_birth ? ` &bull; ${patientData.date_of_birth}${calculatedAge !== null ? ` (${calculatedAge} tuổi)` : ''}` : ''})</span>
                    </div>
                    <div className="patient-mini-item">
                      <span className="mini-label">Mã PID / CCCD:</span>
                      <span className="mini-val font-mono">{patientData?.external_patient_id || (appointment.patient_id ? `PID-${appointment.patient_id.toString().padStart(5, '0')}` : '--')}</span>
                      <span className="mini-sub">&bull; CCCD: {patientData?.identity_card || patientData?.national_id || (appointment as any)?.patient_identity_card || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="patient-mini-item">
                      <span className="mini-label">Số điện thoại:</span>
                      <span className="mini-val font-mono">{patientData?.phone_number || (appointment as any).patient_phone || 'Chưa cập nhật'}</span>
                      <span className="mini-sub">&bull; Định danh: {(patientData?.identity_card || patientData?.national_id) ? 'VNeID Cấp 2' : 'Chưa liên kết'}</span>
                    </div>
                    <div className="patient-mini-item">
                      <span className="mini-label">Người đi cùng:</span>
                      <span className="mini-val">
                        {patientData?.companion_name || encounterInfo?.companion_name ? (
                          <span>{patientData?.companion_name || encounterInfo?.companion_name} ({patientData?.companion_relationship || encounterInfo?.companion_relationship || 'Người thân'})</span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Không có người đi cùng</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. LÝ DO ĐẶT KHÁM */}
                <div className="booking-section-card">
                  <div className="booking-card-title-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="#0f766e" />
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Lý do đặt khám (Bệnh nhân khai báo)</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                      Khai báo trực tuyến khi đặt lịch
                    </span>
                  </div>
                  <div className="booking-reason-quote-box">
                    {(() => {
                      const raw = (encounterInfo?.reason || appointment.reason || symptoms || '').trim()
                      const cleanReason = raw.includes('[Khảo sát thêm AI]:') ? raw.split('[Khảo sát thêm AI]:')[0].trim() : raw
                      return cleanReason ? `"${cleanReason}"` : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Người bệnh chưa nhập lý do khám.</span>
                    })()}
                  </div>
                </div>

                {/* 3. CÁC KHẢO SÁT THÊM CỦA AI MEDGEMMA VÀ TÓM TẮT TỪ AI */}
                <div className="booking-section-card ai-medgemma-card">
                  <div className="medgemma-header">
                    <div className="medgemma-title-box">
                      <div className="medgemma-badge-icon">
                        <Sparkles size={16} color="#0f766e" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong className="medgemma-title">Khảo sát & Tóm tắt y khoa sơ bộ từ AI MedGemma</strong>
                          <span className="medgemma-tag">
                            {aiEngine?.mode === 'production' ? 'MedGemma 3 (Chạy thật)' : 'Gemini 3.8 (Test Engine)'}
                          </span>
                        </div>
                        <span className="medgemma-subtitle">Trích xuất tự động từ phiếu đặt khám & sàng lọc lâm sàng chuyên sâu</span>
                      </div>
                    </div>
                    {(() => {
                      const urg = (encounterInfo?.medgemma_analysis?.urgency_level || encounterInfo?.triage_level || appointment.triage_level || '').toUpperCase()
                      if (urg === 'EMERGENCY' || urg === 'P1') {
                        return <span className="ai-urgency-badge emergency">🔴 CẤP CỨU / ƯU TIÊN CAO (P1)</span>
                      }
                      if (urg === 'HIGH' || urg === 'P2') {
                        return <span className="ai-urgency-badge high">🟡 KHÁM ƯU TIÊN (P2)</span>
                      }
                      return <span className="ai-urgency-badge normal">🟢 KHÁM TIÊU CHUẨN (P3)</span>
                    })()}
                  </div>

                  <div className="medgemma-body-grid" style={{ marginTop: '12px' }}>
                    {/* Cột trái: Tóm tắt AI & Cảnh báo */}
                    <div className="medgemma-col">
                      <div className="medgemma-card-item">
                        <span className="medgemma-card-label" style={{ color: '#0f766e', fontWeight: 700 }}>
                          📋 Tóm tắt y khoa ban đầu từ AI:
                        </span>
                        <div className="medgemma-explanation-box" style={{ marginTop: '4px' }}>
                          {encounterInfo?.medgemma_analysis?.explanation ? (
                            encounterInfo.medgemma_analysis.explanation
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12.5px' }}>
                              Trống (Chưa có dữ liệu tóm tắt y khoa từ AI cho lượt khám này).
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="medgemma-card-item" style={{ marginTop: '10px' }}>
                        <span className="medgemma-card-label" style={{ color: '#dc2626', fontWeight: 700 }}>
                          ⚠️ Cảnh báo an toàn & Tiền sử dị ứng đã lưu:
                        </span>
                        <div className="safety-alert-strip" style={{ marginTop: '4px' }}>
                          <span className="safety-item allergy" style={{ color: '#b91c1c', fontWeight: 600 }}>
                            Dị ứng: {patientData?.allergies || allergies || 'Không ghi nhận dị ứng thuốc'}
                          </span>
                          <span className="safety-item history" style={{ color: '#4338ca', fontWeight: 600 }}>
                            &bull; Bệnh mạn tính: {patientData?.medical_history_notes || (patientData?.has_medical_history && patientData?.medical_history_icd10 ? `Mã ICD: ${patientData.medical_history_icd10}` : (patientData?.has_medical_history ? 'Có tiền sử bệnh án' : 'Không ghi nhận bệnh mạn tính'))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cột phải: Các khảo sát chuyên sâu AI đề xuất Bác sĩ cần hỏi thêm & Câu trả lời của BN */}
                    <div className="medgemma-col">
                      <div className="medgemma-card-item" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <span className="medgemma-card-label" style={{ color: '#0369a1', fontWeight: 700 }}>
                          🔍 Các câu hỏi / Khảo sát thêm AI đề xuất Bác sĩ khai thác:
                        </span>
                        {parsedSurveyItems.length > 0 ? (
                          <div className="ai-survey-checklist" style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {parsedSurveyItems.map((item, idx) => (
                              <div
                                key={idx}
                                className="ai-survey-item-box"
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '8px 12px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                                  <span style={{ color: '#0284c7', fontWeight: 800 }}>{idx + 1}.</span>
                                  <span>{item.question}</span>
                                </div>
                                <div style={{ marginTop: '4px', paddingLeft: '16px', fontSize: '12px' }}>
                                  <span style={{ color: '#475569', fontWeight: 600 }}>↳ Câu trả lời của BN: </span>
                                  {item.answer ? (
                                    <strong style={{ color: '#0f766e' }}>{item.answer}</strong>
                                  ) : (
                                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa có câu trả lời (Bác sĩ khai thác thêm khi khám)</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ marginTop: '8px', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '10px 4px' }}>
                            Trống (Không có khảo sát thêm từ người bệnh).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. GHI CHÚ CỦA ĐIỀU DƯỠNG */}
                <div className="booking-section-card nurse-notes-card">
                  <div className="booking-card-title-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Stethoscope size={16} color="#0284c7" />
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Ghi chú của Điều dưỡng (Bàn Sàng lọc & Tiếp đón Triage)</strong>
                    </div>
                    {encounterInfo?.nurse_name || appointment?.nurse_name || triageNurse ? (
                      <span style={{ fontSize: '11px', color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        ĐD. {encounterInfo?.nurse_name || appointment?.nurse_name || triageNurse}${(encounterInfo as any)?.triage_station || (appointment as any)?.triage_station ? ` • ${(encounterInfo as any)?.triage_station || (appointment as any)?.triage_station}` : ' • Bàn Triage'}
                      </span>
                    ) : null}
                  </div>
                  <div className="nurse-notes-content" style={{ marginTop: '8px', fontSize: '13px', lineHeight: '1.6', color: '#334155', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #0284c7' }}>
                    {encounterInfo?.nurse_notes || triageNotes ? (
                      encounterInfo?.nurse_notes || triageNotes
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        Trống (Chưa có ghi chú lâm sàng từ Điều dưỡng tiếp đón).
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. HỒ SƠ CŨ ĐÃ GỬI: HIỂN THỊ THUỐC VÀ KQ XN HOẶC PACS CŨ */}
                <div className="booking-section-card past-records-card">
                  <div className="booking-card-title-row" style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="#7c3aed" />
                      <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>Hồ sơ cũ người bệnh đã gửi (Đơn thuốc, KQ Xét nghiệm, Phim PACS)</strong>
                    </div>
                    <span style={{ fontSize: '11px', color: '#6d28d9', background: '#ede9fe', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Dữ liệu lịch sử đối chiếu
                    </span>
                  </div>

                  {(() => {
                    const docPrescriptions = appointmentDocs.filter(d => d.document_type === 'prescription')
                    const pastRxHistory = consultationHistory.filter(h => h.prescription_status || h.national_code || h.diagnosis)
                    const docLabTests = appointmentDocs.filter(d => d.document_type === 'lab_test')
                    const hasReports = labData?.reports && labData.reports.length > 0
                    const docPacs = appointmentDocs.filter(d => d.document_type === 'cdha')
                    const hasStudies = pacsData?.studies && pacsData.studies.length > 0

                    const hasAnyPastData = docPrescriptions.length > 0 || pastRxHistory.length > 0 || docLabTests.length > 0 || hasReports || docPacs.length > 0 || hasStudies

                    if (!hasAnyPastData) {
                      return (
                        <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
                          Trống (Người bệnh chưa gửi đơn thuốc, kết quả xét nghiệm hoặc phim PACS).
                        </div>
                      )
                    }

                    return (
                      <div className="past-records-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                        {/* 5.1 Đơn thuốc cũ đang sử dụng */}
                        <div className="past-record-subcard" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#b45309' }}>
                              <Pill size={14} color="#d97706" /> Đơn thuốc cũ đang sử dụng
                            </span>
                            <button
                              type="button"
                              className="btn-tiny-action"
                              onClick={() => setActiveTab('prescription')}
                              style={{ fontSize: '11px', color: '#0284c7', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Xem toa ↗
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#334155' }}>
                            {docPrescriptions.length > 0 ? (
                              docPrescriptions.map(doc => (
                                <div key={doc.id} style={{ padding: '6px 8px', background: '#ffffff', borderRadius: '4px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                    <strong>📄 {doc.title || doc.file_name || 'Đơn thuốc đã tải lên'}</strong>
                                    {doc.description && <div style={{ fontSize: '11px', color: '#64748b' }}>{doc.description}</div>}
                                  </div>
                                  <a href={resolveAuthedMediaUrl(doc.file_url)} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Xem file ↗</a>
                                </div>
                              ))
                            ) : pastRxHistory.length > 0 ? (
                              pastRxHistory.slice(0, 3).map(h => (
                                <div key={h.appointment_id} style={{ padding: '6px 8px', background: '#ffffff', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
                                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                    Lần khám #{h.appointment_id} {h.starts_at ? `(${new Date(h.starts_at).toLocaleDateString('vi-VN')})` : ''}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#475569' }}>
                                    {h.diagnosis ? `Chẩn đoán: ${h.diagnosis}` : `Lý do: ${h.reason}`}
                                    {h.national_code ? ` • Mã đơn: ${h.national_code}` : ''}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '10px 4px', textAlign: 'center' }}>
                                Trống
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 5.2 Kết quả Xét nghiệm (KQ XN) cũ */}
                        <div className="past-record-subcard" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#0284c7' }}>
                              <FlaskConical size={14} color="#0284c7" /> Kết quả Xét nghiệm (KQ XN) cũ
                            </span>
                            <button
                              type="button"
                              className="btn-tiny-action"
                              onClick={() => setActiveTab('lab')}
                              style={{ fontSize: '11px', color: '#0284c7', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Mở tab CLS ↗
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#334155' }}>
                            {hasReports ? (
                              labData.reports.slice(0, 2).map(rep => (
                                <div key={rep.report_id} style={{ marginBottom: '6px' }}>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', marginBottom: '2px' }}>
                                    {rep.title || rep.category_name} ({rep.sampled_at ? new Date(rep.sampled_at).toLocaleDateString('vi-VN') : 'Gần nhất'})
                                  </div>
                                  {rep.indicators?.slice(0, 4).map(ind => (
                                    <div key={ind.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 6px', background: '#fff', borderRadius: '4px', marginBottom: '2px' }}>
                                      <span>{ind.name}:</span>
                                      <strong style={{ color: ind.flag === 'HIGH' ? '#dc2626' : (ind.flag === 'LOW' ? '#d97706' : '#059669') }}>
                                        {ind.value} {ind.unit} {ind.flag_label ? `(${ind.flag_label})` : ''}
                                      </strong>
                                    </div>
                                  ))}
                                </div>
                              ))
                            ) : docLabTests.length > 0 ? (
                              docLabTests.map(doc => (
                                <div key={doc.id} style={{ padding: '6px 8px', background: '#ffffff', borderRadius: '4px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                    <strong>🧪 {doc.title || doc.file_name || 'Phiếu kết quả xét nghiệm'}</strong>
                                    {doc.description && <div style={{ fontSize: '11px', color: '#64748b' }}>{doc.description}</div>}
                                  </div>
                                  <a href={resolveAuthedMediaUrl(doc.file_url)} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'none', fontWeight: 600 }}>Xem file ↗</a>
                                </div>
                              ))
                            ) : (
                              <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '10px 4px', textAlign: 'center' }}>
                                Trống
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 5.3 Phim PACS cũ */}
                        <div className="past-record-subcard" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px', color: '#7c3aed' }}>
                              <ScanLine size={14} color="#7c3aed" /> Hình ảnh Y khoa (PACS) cũ
                            </span>
                            <button
                              type="button"
                              className="btn-tiny-action"
                              onClick={() => setActiveTab('pacs')}
                              style={{ fontSize: '11px', color: '#7c3aed', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Mở PACS ↗
                            </button>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px', color: '#334155' }}>
                            {hasStudies ? (
                              pacsData.studies.slice(0, 2).map(study => (
                                <div key={study.study_id} style={{ padding: '6px 8px', background: '#fff', borderRadius: '4px', border: '1px solid #f1f5f9', marginBottom: '4px' }}>
                                  <strong>📷 [{study.modality}] {study.description || study.body_part}:</strong> {study.impression || study.findings || 'Đã liên thông PACS'}
                                  {study.date && <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '2px' }}>Ngày: {study.date} &bull; {study.institution || 'Bệnh viện'}</div>}
                                </div>
                              ))
                            ) : docPacs.length > 0 ? (
                              docPacs.map(doc => (
                                <div key={doc.id} style={{ padding: '6px 8px', background: '#ffffff', borderRadius: '4px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                                    <strong>📷 {doc.title || doc.file_name || 'Phim / Ảnh chụp chẩn đoán'}</strong>
                                    {doc.description && <div style={{ fontSize: '11px', color: '#64748b' }}>{doc.description}</div>}
                                  </div>
                                  <a href={resolveAuthedMediaUrl(doc.file_url)} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}>Xem file ↗</a>
                                </div>
                              ))
                            ) : (
                              <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', padding: '10px 4px', textAlign: 'center' }}>
                                Trống
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                  </div>
                )}
              </div>
              {/* BỆNH ÁN ĐIỆN TỬ NGOẠI TRÚ (CHUẨN SOAP TRỰC TIẾP TRÊN MÀN HÌNH) */}
              <div className="clinical-soap-container">
                <div className="clinical-soap-header">
                  <div className="clinical-soap-header-title">
                    <FileText size={18} />
                    <div>
                      <h3>Bệnh án Khám bệnh Điện tử (Chuẩn SOAP - QĐ 130/Bộ Y tế)</h3>
                      <span>Bác sĩ ghi nhận trực tiếp triệu chứng, khám thực thể, chẩn đoán ICD-10 và phác đồ điều trị</span>
                    </div>
                  </div>
                  <div className="soap-fast-actions">
                    <button
                      type="button"
                      className="btn-soap-header-action"
                      onClick={handleAutoFillSoapFromAi}
                      disabled={generatingSoap}
                      title="AI Scribe tự động phân tích hội thoại & điền vào các mục SOAP"
                    >
                      <Sparkles size={13} className={generatingSoap ? 'spin-icon' : ''} />
                      {generatingSoap ? 'Đang tóm tắt...' : '✨ AI Điền tự động SOAP'}
                    </button>
                    <button
                      type="button"
                      className="btn-soap-header-action"
                      onClick={handleApplyRpmToRecord}
                      title="Đưa chỉ số sinh hiệu Triage & RPM vào Mục O"
                    >
                      <HeartPulse size={13} />
                      ⚡ Đồng bộ Sinh hiệu
                    </button>
                  </div>
                </div>

                {/* S (Subjective) - Triệu chứng cơ năng */}
                <div className="soap-section s">
                  <div className="soap-section-header">
                    <div className="soap-section-label">
                      <span className="soap-letter s">S</span>
                      <span>Lý do khám & Triệu chứng cơ năng (Subjective)</span>
                    </div>
                    <div className="soap-section-helpers">
                      {((encounterInfo?.reason || appointment.reason) && !symptoms) && (
                        <button
                          type="button"
                          className="btn-soap-helper"
                          onClick={() => {
                            const raw = (encounterInfo?.reason || appointment.reason || '').trim()
                            const clean = raw.includes('[Khảo sát thêm AI]:') ? raw.split('[Khảo sát thêm AI]:')[0].trim() : raw
                            setSymptoms(clean)
                            setToast('Đã dán lý do khám của bệnh nhân vào Mục S')
                          }}
                          title="Lấy nội dung lý do bệnh nhân đã khai báo khi đặt lịch"
                        >
                          ⚡ Lấy từ lý do BN khai
                        </button>
                      )}
                      {(soapResult?.soap?.subjective || soapResult?.extracted_symptoms) && (
                        <button
                          type="button"
                          className="btn-soap-helper"
                          onClick={() => {
                            setSymptoms(soapResult.soap?.subjective || soapResult.extracted_symptoms)
                            setToast('Đã điền triệu chứng từ AI Scribe')
                          }}
                          title="Lấy triệu chứng đã phân tích từ AI Scribe"
                        >
                          ✨ Lấy từ AI Scribe
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    className="soap-field-textarea"
                    rows={3}
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    placeholder="Nhập lý do vào khám, thời gian khởi phát, vị trí, tính chất, mức độ đau, sốt, ho, khó thở, các yếu tố tăng giảm..."
                  />
                </div>

                {/* O (Objective) - Khám thực thể & Dấu hiệu khách quan */}
                <div className="soap-section o">
                  <div className="soap-section-header">
                    <div className="soap-section-label">
                      <span className="soap-letter o">O</span>
                      <span>Khám thực thể, Tri giác & Sinh hiệu (Objective)</span>
                    </div>
                    <div className="soap-section-helpers">
                      <button
                        type="button"
                        className="btn-soap-helper"
                        onClick={handleApplyRpmToRecord}
                        title="Tự động đồng bộ các chỉ số sinh hiệu đo được từ Bàn Triage / RPM IoT"
                      >
                        ⚡ Đồng bộ Sinh hiệu Triage & RPM
                      </button>
                      {paraclinicalResults && (
                        <button
                          type="button"
                          className="btn-soap-helper"
                          onClick={() => {
                            setClinicalExamination(prev => prev ? `${prev}\n${paraclinicalResults}` : paraclinicalResults)
                            setToast('Đã đưa tóm tắt kết quả xét nghiệm / CĐHA vào Mục O')
                          }}
                          title="Đưa kết quả xét nghiệm / CĐHA đã trích xuất vào Mục O"
                        >
                          🧪 Chèn KQ Xét nghiệm / PACS
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    className="soap-field-textarea"
                    rows={3}
                    value={clinicalExamination}
                    onChange={e => setClinicalExamination(e.target.value)}
                    placeholder="Ghi nhận thể trạng chung, tri giác, tiếp xúc, niêm mạc qua video, nhịp thở, sinh hiệu, các dấu hiệu lâm sàng quan sát được..."
                  />
                </div>

                {/* A (Assessment) - Chẩn đoán & Mã bệnh ICD-10 */}
                <div className="soap-section a">
                  <div className="soap-section-header">
                    <div className="soap-section-label">
                      <span className="soap-letter a">A</span>
                      <span>Chẩn đoán bệnh lý & Mã bệnh ICD-10 (Assessment)</span>
                    </div>
                    <div className="soap-section-helpers">
                      <button
                        type="button"
                        className="btn-soap-helper"
                        onClick={handleSuggestIcd}
                        disabled={loadingIcdAi}
                        title="AI phân tích triệu chứng để gợi ý mã ICD-10 phù hợp"
                      >
                        <Sparkles size={11} className={loadingIcdAi ? 'spin-icon' : ''} />
                        {loadingIcdAi ? 'Đang gợi ý...' : '✨ AI Gợi ý ICD'}
                      </button>
                    </div>
                  </div>

                  <div className="assessment-inputs-grid">
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Chẩn đoán xác định / Sơ bộ của Bác sĩ:
                      </label>
                      <input
                        type="text"
                        className="soap-field-input"
                        value={diagnosis}
                        onChange={e => setDiagnosis(e.target.value)}
                        placeholder="Nhập chẩn đoán xác định (ví dụ: Viêm họng cấp / Tăng huyết áp độ 1 / Cúm mùa)..."
                      />
                    </div>

                    <div className="icd10-search-container">
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Tra cứu danh mục Mã bệnh ICD-10 (Bộ Y tế):
                      </label>
                      <div className="icd10-input-wrapper">
                        <Search size={14} className="icd10-search-icon" />
                        <input
                          type="text"
                          className="soap-field-input icd10-input"
                          value={icdSearchQuery}
                          onChange={e => {
                            setIcdSearchQuery(e.target.value)
                            setShowIcdList(true)
                          }}
                          onFocus={() => setShowIcdList(true)}
                          placeholder="Gõ mã hoặc tên bệnh (ví dụ: J02, Viêm họng, I10)..."
                        />
                        {icdSearchQuery && (
                          <button
                            type="button"
                            className="btn-clear-query"
                            onClick={() => {
                              setIcdSearchQuery('')
                              setShowIcdList(false)
                            }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Selected ICD-10 Badge */}
                      {icd10Code && (
                        <div className="selected-icd-badge">
                          <span className="icd-code-tag">{icd10Code}</span>
                          <span className="icd-name-text">{icd10Name || 'Bệnh lý đã chọn'}</span>
                          <button
                            type="button"
                            className="btn-remove-icd"
                            onClick={() => {
                              setIcd10Code('')
                              setIcd10Name('')
                            }}
                            title="Xóa mã ICD-10"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}

                      {/* Autocomplete Dropdown */}
                      {showIcdList && icdOptions.length > 0 && (
                        <div className="icd10-dropdown-list">
                          {icdOptions.slice(0, 8).map(item => (
                            <div
                              key={item.code}
                              className="icd10-dropdown-item"
                              onClick={() => selectICD(item)}
                            >
                              <span className="icd-drop-code">{item.code}</span>
                              <span className="icd-drop-name">{item.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick ICD-10 Suggestion Chips */}
                  <div className="icd10-quick-chips">
                    <span className="quick-chip-label">Mã phổ biến:</span>
                    {[
                      { code: 'J02.9', name: 'Viêm họng cấp, không xác định' },
                      { code: 'J06.9', name: 'Nhiễm khuẩn đường hô hấp trên cấp' },
                      { code: 'J20.9', name: 'Viêm phế quản cấp' },
                      { code: 'I10', name: 'Tăng huyết áp vô căn' },
                      { code: 'E11.9', name: 'Đái tháo đường typ 2' },
                      { code: 'K29.7', name: 'Viêm dạ dày tá tràng' },
                      { code: 'M54.5', name: 'Đau thắt lưng' },
                    ].map(c => (
                      <button
                        key={c.code}
                        type="button"
                        className={`icd-quick-chip ${icd10Code === c.code ? 'selected' : ''}`}
                        onClick={() => selectICD(c)}
                      >
                        <strong>{c.code}</strong> {c.name.split(',')[0]}
                      </button>
                    ))}
                    {icdSuggestions.length > 0 && (
                      icdSuggestions.slice(0, 3).map((s: any) => (
                        <button
                          key={s.code}
                          type="button"
                          className="icd-quick-chip"
                          style={{ borderColor: '#ddd6fe', background: '#faf5ff', color: '#6d28d9' }}
                          onClick={() => selectICD({ code: s.code, name: s.name })}
                        >
                          <Sparkles size={10} color="#7c3aed" /> <strong>{s.code}</strong> {s.name.split(',')[0]}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* P (Plan) - Phác đồ điều trị & Dặn dò */}
                <div className="soap-section p">
                  <div className="soap-section-header">
                    <div className="soap-section-label">
                      <span className="soap-letter p">P</span>
                      <span>Kế hoạch điều trị & Dặn dò theo dõi (Plan)</span>
                    </div>
                  </div>
                  <textarea
                    className="soap-field-textarea"
                    rows={3}
                    value={plan}
                    onChange={e => setPlan(e.target.value)}
                    placeholder="Chế độ dùng thuốc, dinh dưỡng, nghỉ ngơi, uống nhiều nước ấm, theo dõi thân nhiệt, lịch tái khám sau 3-5 ngày hoặc khi có dấu hiệu nặng..."
                  />

                  {/* Workflow Jump Row */}
                  <div className="soap-plan-nav-row">
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#475569' }}>Tiếp tục quy trình khám:</span>
                    <button
                      type="button"
                      className="btn-soap-nav rx"
                      onClick={() => setActiveTab('prescription')}
                      title="Chuyển sang Tab Kê đơn thuốc"
                    >
                      <Pill size={14} />
                      <span>Kê đơn thuốc {prescription.trim() ? '(Đã có đơn)' : '(Sang Tab Đơn thuốc →)'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-soap-nav lab"
                      onClick={() => setActiveTab('lab')}
                      title="Chuyển sang Tab Cận lâm sàng"
                    >
                      <FlaskConical size={14} />
                      <span>Xem / Chỉ định Xét nghiệm (CLS →)</span>
                    </button>
                    <button
                      type="button"
                      className="btn-soap-nav pacs"
                      onClick={() => setActiveTab('pacs')}
                      title="Chuyển sang Tab PACS DICOM"
                    >
                      <ScanLine size={14} />
                      <span>Xem Phim PACS (CĐHA →)</span>
                    </button>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="clinical-soap-footer">
                  <div className="footer-status-info">
                    <ShieldCheck size={16} color="#059669" />
                    <span>Bệnh án Telehealth chuẩn QĐ 130/Bộ Y tế &bull; E2EE Bảo mật</span>
                  </div>
                  <div className="footer-actions-group">
                    <button
                      type="button"
                      className="btn-footer-draft"
                      onClick={handleSaveDraft}
                      disabled={saving}
                      title="Lưu lại toàn bộ nội dung bệnh án hiện tại"
                    >
                      <Save size={15} />
                      <span>{saving ? 'Đang lưu...' : 'Lưu nháp'}</span>
                    </button>
                    <button
                      type="button"
                      className="btn-footer-view"
                      onClick={() => setShowClinicalSheetModal(true)}
                      title="Xem trước Phiếu khám lâm sàng EMR"
                    >
                      <Eye size={15} />
                      <span>Xem phiếu EMR</span>
                    </button>
                    {!signatureInfo ? (
                      <button
                        type="button"
                        className="btn-footer-sign"
                        onClick={handleDigitalSign}
                        disabled={signing}
                        title="Ký số chứng thư số bác sĩ SmartCA"
                      >
                        <PenTool size={15} />
                        <span>{signing ? 'Đang ký...' : 'Ký số SmartCA'}</span>
                      </button>
                    ) : (
                      <span className="signed-tag">
                        <CheckCircle2 size={15} color="#16a34a" /> Đã ký SmartCA
                      </span>
                    )}
                    <button
                      type="button"
                      className="btn-footer-complete"
                      onClick={() => setShowConfirmModal(true)}
                      title="Hoàn tất và đóng ca khám"
                    >
                      <CheckCircle2 size={16} />
                      <span>Hoàn tất buổi khám</span>
                    </button>
                  </div>
                </div>
              </div>
              </div>
            )}

            {/* TAB BHYT XML 4210 */}
            {activeTab === 'bhyt' && (
              <div className="form-section bhyt-xml-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#059669', color: '#fff', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileCheck size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', color: '#064e3b' }}>Hồ sơ Giám định BHYT Quốc gia (XML 4210 / QĐ 130)</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#047857' }}>
                        Mã liên kết: <strong>{bhytClaim?.ma_lk || (encounterInfo as any)?.encounter_code || (appointment as any)?.encounter_code || (appointment.id ? `LK-${appointment.id}` : '--')}</strong> · Mã thẻ BHYT: <strong>{bhytClaim?.ma_the_bhyt || patientData?.bhyt_code || encounterInfo?.bhyt_code || (appointment as any)?.bhyt_code || 'Chưa liên kết thẻ BHYT'}</strong> · Mức hưởng: <strong>{bhytClaim?.muc_huong || encounterInfo?.bhyt_rate || 80}%</strong>
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: bhytClaim?.status === 'approved' ? '#dcfce7' : '#fef3c7',
                      color: bhytClaim?.status === 'approved' ? '#15803d' : '#b45309'
                    }}>
                      {bhytClaim?.status === 'approved' ? `✅ Đã tiếp nhận: ${bhytClaim.gdbhyt_code}` : '⏳ Chờ gửi Cổng BHXH'}
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>T_TONGCHI (Tổng chi phí)</span>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                      {bhytClaim?.t_tongchi ? bhytClaim.t_tongchi.toLocaleString('vi-VN') : '314.000'} đ
                    </div>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#166534', textTransform: 'uppercase' }}>T_BHYTTT (Quỹ BHYT chi trả)</span>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#15803d', marginTop: '2px' }}>
                      {bhytClaim?.t_bhyttt ? bhytClaim.t_bhyttt.toLocaleString('vi-VN') : '251.200'} đ
                    </div>
                  </div>
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#991b1b', textTransform: 'uppercase' }}>T_BNTT (Bệnh nhân cùng chi trả)</span>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#b91c1c', marginTop: '2px' }}>
                      {bhytClaim?.t_bntt ? bhytClaim.t_bntt.toLocaleString('vi-VN') : '62.800'} đ
                    </div>
                  </div>
                </div>

                {/* Submit Action */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleSendBhytClaim}
                    disabled={submittingBhyt || bhytClaim?.status === 'approved'}
                    style={{ background: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Check size={16} />
                    {submittingBhyt ? 'Đang gửi Cổng Giám định...' : bhytClaim?.status === 'approved' ? 'Đã gửi Cổng Giám định thành công' : '🚀 Gửi Cổng Giám định BHYT Quốc gia'}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (!bhytPackage) return
                      const blob = new Blob([bhytPackage.xml1_tonghop], { type: 'application/xml' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `XML4210_${bhytClaim?.ma_lk || 'hoso'}.xml`
                      a.click()
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Download size={16} /> Tải file XML 4210
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={loadBhytData}
                    disabled={loadingBhyt}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={14} /> Làm mới
                  </button>
                </div>

                {/* 5 XML Tables Switcher */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
                    {[
                      ['xml1', 'Bảng 1: Tổng hợp (XML1)'],
                      ['xml2', 'Bảng 2: Thuốc tân dược (XML2)'],
                      ['xml3', 'Bảng 3: Dịch vụ kỹ thuật (XML3)'],
                      ['xml4', 'Bảng 4: Cận lâm sàng (XML4)'],
                      ['xml5', 'Bảng 5: Diễn biến lâm sàng (XML5)']
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActiveXmlTable(key as any)}
                        style={{
                          padding: '10px 16px',
                          border: 'none',
                          borderBottom: activeXmlTable === key ? '2px solid #059669' : 'none',
                          background: activeXmlTable === key ? '#fff' : 'transparent',
                          color: activeXmlTable === key ? '#064e3b' : '#64748b',
                          fontWeight: activeXmlTable === key ? 700 : 500,
                          fontSize: '12px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: '14px', background: '#1e293b', color: '#f8fafc', fontSize: '12px', fontFamily: 'Consolas, monospace', overflowX: 'auto', maxHeight: '350px' }}>
                    <pre style={{ margin: 0 }}>
                      {bhytPackage
                        ? activeXmlTable === 'xml1'
                          ? bhytPackage.xml1_tonghop
                          : activeXmlTable === 'xml2'
                          ? bhytPackage.xml2_chitietthuoc
                          : activeXmlTable === 'xml3'
                          ? bhytPackage.xml3_chitietdvkt
                          : activeXmlTable === 'xml4'
                          ? bhytPackage.xml4_chitietcls
                          : bhytPackage.xml5_dienbien
                        : 'Đang tải dữ liệu XML 4210...'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* TAB HỘI CHẨN LIÊN VIỆN & ĐA CHUYÊN KHOA */}
            {activeTab === 'multidoctor' && (
              <div className="form-section multidoctor-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#4338ca', color: '#fff', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', color: '#312e81' }}>Hội đồng Hội chẩn Đa chuyên khoa & Tuyến trên</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#4338ca' }}>
                        Mời chuyên gia đầu ngành tuyến trung ương cùng tham gia phòng khám trực tuyến và cho ý kiến chuyên môn
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={loadConsultationMembers}
                    disabled={loadingMembers}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    <RefreshCw size={14} /> Làm mới
                  </button>
                </div>

                {/* Form Mời Chuyên gia */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#1e293b' }}>🤝 Mời Bác sĩ / Chuyên gia tham gia hội chẩn ca bệnh</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tên Bác sĩ / Chuyên gia *</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: PGS.TS.BS Nguyễn Văn Thông"
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Bệnh viện / Đơn vị công tác</label>
                      <select
                        value={inviteHospital}
                        onChange={e => setInviteHospital(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="Bệnh viện Bạch Mai - Tuyến Trung Ương">Bệnh viện Bạch Mai - Tuyến Trung Ương</option>
                        <option value="Bệnh viện Chợ Rẫy - TP. Hồ Chí Minh">Bệnh viện Chợ Rẫy - TP. Hồ Chí Minh</option>
                        <option value="Bệnh viện Đại học Y Dược TP.HCM">Bệnh viện Đại học Y Dược TP.HCM</option>
                        <option value="Bệnh viện Trung ương Huế">Bệnh viện Trung ương Huế</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Chuyên khoa hội chẩn</label>
                      <select
                        value={inviteSpecialty}
                        onChange={e => setInviteSpecialty(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="Hô hấp & Phổi can thiệp">Hô hấp & Phổi can thiệp</option>
                        <option value="Tim mạch can thiệp & Đột quỵ">Tim mạch can thiệp & Đột quỵ</option>
                        <option value="Nội tiết & Chuyển hóa">Nội tiết & Chuyển hóa</option>
                        <option value="Hồi sức tích cực & Chống độc (ICU)">Hồi sức tích cực & Chống độc (ICU)</option>
                        <option value="Ung bướu & Xạ trị">Ung bướu & Xạ trị</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="primary"
                    onClick={handleInviteConsultationMember}
                    disabled={invitingMember || !inviteName.trim()}
                    style={{ background: '#4338ca', borderColor: '#4338ca', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                  >
                    <Plus size={16} /> {invitingMember ? 'Đang gửi lời mời...' : 'Gửi lời mời tham gia hội chẩn'}
                  </button>
                </div>

                {/* Danh sách thành viên hội chẩn */}
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0f172a' }}>Danh sách Thành viên Hội đồng Hội chẩn ({consultationMembers.length})</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {consultationMembers.map(member => (
                    <div key={member.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              background: member.role === 'host' ? '#dbeafe' : '#f3e8ff',
                              color: member.role === 'host' ? '#1d4ed8' : '#7e22ce',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 700
                            }}>
                              {member.role === 'host' ? 'Bác sĩ Chủ trì' : 'Chuyên gia Hội chẩn'}
                            </span>
                            <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{member.doctor_name}</h4>
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            🏥 {member.hospital_name} · Chuyên khoa: <strong>{member.specialty}</strong>
                          </div>
                        </div>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: member.status === 'joined' ? '#dcfce7' : '#fef3c7',
                          color: member.status === 'joined' ? '#15803d' : '#b45309'
                        }}>
                          {member.status === 'joined' ? '🟢 Đã tham gia' : '⏳ Đã gửi thư mời'}
                        </span>
                      </div>

                      {member.clinical_opinion ? (
                        <div style={{ background: '#f8fafc', borderLeft: '3px solid #4338ca', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', color: '#1e293b', marginTop: '10px' }}>
                          <strong style={{ color: '#4338ca', display: 'block', marginBottom: '4px' }}>📝 Ý kiến chuyên môn của chuyên gia:</strong>
                          <p style={{ margin: 0, lineHeight: 1.5 }}>{member.clinical_opinion}</p>
                          <small style={{ color: '#94a3b8', display: 'block', marginTop: '4px' }}>
                            Ghi nhận lúc: {member.joined_at ? new Date(member.joined_at).toLocaleString('vi-VN') : '—'}
                          </small>
                        </div>
                      ) : (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                          <textarea
                            placeholder={`Nhập ý kiến chuyên môn hội chẩn cho ${member.doctor_name}...`}
                            value={opinionTexts[member.id] || ''}
                            onChange={e => setOpinionTexts({ ...opinionTexts, [member.id]: e.target.value })}
                            style={{ width: '100%', minHeight: '60px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                          />
                          <button
                            type="button"
                            className="secondary small-secondary"
                            onClick={() => handleSubmitMemberOpinion(member.id)}
                            disabled={submittingOpinionId === member.id}
                            style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#eef2ff', color: '#4338ca', borderColor: '#c7d2fe' }}
                          >
                            <Check size={14} /> {submittingOpinionId === member.id ? 'Đang lưu...' : 'Ghi nhận ý kiến vào biên bản'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB GIÁM SÁT SINH HIỆU TỪ XA (RPM IoT) */}
            {activeTab === 'rpm' && (
              <div className="form-section rpm-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#be185d', color: '#fff', borderRadius: '10px', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <HeartPulse size={24} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', color: '#831843' }}>Giám sát Sinh hiệu Từ xa (RPM IoT)</h3>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#9d174d' }}>
                        Dữ liệu truyền theo thời gian thực từ thiết bị Bluetooth đo tại nhà của bệnh nhân (Omron, Accu-Chek, SpO2)
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="primary"
                      onClick={handleApplyRpmToRecord}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#be185d' }}
                    >
                      <FileCheck size={14} /> Đưa Sinh Hiệu Vào Bệnh Án
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={loadRpmVitals}
                      disabled={loadingRpm}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    >
                      <RefreshCw size={14} /> Làm mới
                    </button>
                  </div>
                </div>

                {/* Dashboard chỉ số mới nhất */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #ef4444' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Huyết áp (Omron BLE)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.systolic)?.systolic || (triageBp ? triageBp.split('/')[0] : '--')} / {rpmVitals.find(v => v.diastolic)?.diastolic || (triageBp ? triageBp.split('/')[1] : '--')} <small style={{ fontSize: '12px', fontWeight: 500 }}>mmHg</small>
                    </div>
                    <span style={{ fontSize: '11px', color: triageBp || rpmVitals.some(v => v.systolic) ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                      {triageBp || rpmVitals.some(v => v.systolic) ? '🟢 Huyết áp tiếp đón' : '⚪ Chưa có chỉ số'}
                    </span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #f59e0b' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Đường huyết (Accu-Chek)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.glucose_value)?.glucose_value || triageGlucose || '--'} <small style={{ fontSize: '12px', fontWeight: 500 }}>mmol/L</small>
                    </div>
                    <span style={{ fontSize: '11px', color: rpmVitals.find(v => v.glucose_value)?.glucose_value || triageGlucose ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                      {rpmVitals.find(v => v.glucose_value)?.glucose_value || triageGlucose ? '🟢 Đường huyết đói' : '⚪ Chưa đo'}
                    </span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #0284c7' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Nồng độ Oxy (SpO2)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.spo2_percent)?.spo2_percent || triageSpo2 || '--'} <small style={{ fontSize: '12px', fontWeight: 500 }}>%</small>
                    </div>
                    <span style={{ fontSize: '11px', color: rpmVitals.find(v => v.spo2_percent)?.spo2_percent || triageSpo2 ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                      {rpmVitals.find(v => v.spo2_percent)?.spo2_percent || triageSpo2 ? '🟢 Bão hòa oxy SpO2' : '⚪ Chưa đo'}
                    </span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #8b5cf6' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Nhịp tim (Pulse)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.pulse)?.pulse || triagePulse || '--'} <small style={{ fontSize: '12px', fontWeight: 500 }}>bpm</small>
                    </div>
                    <span style={{ fontSize: '11px', color: rpmVitals.find(v => v.pulse)?.pulse || triagePulse ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>
                      {rpmVitals.find(v => v.pulse)?.pulse || triagePulse ? '🟢 Mạch tiếp đón' : '⚪ Chưa đo'}
                    </span>
                  </div>
                </div>

                {/* Bảng lịch sử đo */}
                <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1e293b' }}>Lịch sử đo sinh hiệu của bệnh nhân ({rpmVitals.length} lần đo)</h4>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                        <th style={{ padding: '8px 12px' }}>Thời gian</th>
                        <th style={{ padding: '8px 12px' }}>Thiết bị</th>
                        <th style={{ padding: '8px 12px' }}>Chỉ số đo</th>
                        <th style={{ padding: '8px 12px' }}>Phương thức</th>
                        <th style={{ padding: '8px 12px' }}>Đánh giá an toàn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rpmVitals.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px', color: '#334155' }}>{new Date(v.measured_at).toLocaleString('vi-VN')}</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{v.device_name}</td>
                          <td style={{ padding: '8px 12px' }}>
                            {v.systolic && <span>Huyết áp: <strong>{v.systolic}/{v.diastolic}</strong> mmHg (Mạch: {v.pulse} bpm) </span>}
                            {v.glucose_value && <span>Đường huyết: <strong>{v.glucose_value}</strong> mmol/L </span>}
                            {v.spo2_percent && <span>SpO2: <strong>{v.spo2_percent}</strong>% </span>}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#0369a1' }}>📱 Bluetooth BLE</td>
                          <td style={{ padding: '8px 12px' }}>
                            {v.is_warning ? (
                              <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ {v.warning_message || 'Bất thường'}</span>
                            ) : (
                              <span style={{ color: '#16a34a', fontWeight: 600 }}>✅ Bình thường</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}


            {activeTab === 'prescription' && (
              <PrescriptionBuilder
                prescriptionText={prescription}
                onChange={setPrescription}
                onSave={handleSaveDraft}
                onSyncNational={handleSyncNational}
                onDownloadPdf={handleDownloadPdf}
                isLocked={false}
                isSaving={saving}
                isSyncing={syncingPres}
                isDownloadingPdf={downloadingPdf}
                nationalPrescription={nationalPrescription}
                aiScribeDraft={soapResult?.prescription_draft}
                onApplyAiDraft={(draft) => setPrescription(draft)}
              />
            )}

            {activeTab === 'patient_info' && (
              <div className="patient-detail-card">
                {/* 1. THÔNG TIN HÀNH CHÍNH CÁ NHÂN (BẮT BUỘC) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <User size={18} color="#0e7490" />
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                    1. Thông tin hành chính cá nhân (Bắt buộc theo QĐ 2682/QĐ-BYT)
                  </h3>
                </div>
                <div className="detail-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <div>
                    <label>Họ và tên người bệnh:</label>
                    <b>{patientData?.full_name}</b>
                  </div>
                  <div>
                    <label>Ngày sinh & Giới tính:</label>
                    <b>{patientData?.date_of_birth || 'Chưa cập nhật'} • {patientData?.gender || 'Nam'}</b>
                  </div>
                  <div>
                    <label>Số định danh / CCCD / Hộ chiếu:</label>
                    <b style={{ color: '#047857' }}>{patientData?.identity_card || patientData?.national_id || 'Chưa cập nhật'}{patientData?.identity_card || patientData?.national_id ? ' (VNeID Cấp 2)' : ''}</b>
                  </div>
                  <div>
                    <label>Dân tộc & Nhóm máu:</label>
                    <b>{patientData?.ethnicity || 'Kinh'} • Nhóm máu {patientData?.blood_type || 'Chưa xác định'}</b>
                  </div>
                  <div>
                    <label>Mã hồ sơ y tế (PID):</label>
                    <b>{patientData?.external_patient_id || `CC-PAT-${appointment.patient_id.toString().padStart(4, '0')}`}</b>
                  </div>
                  <div>
                    <label>Số điện thoại:</label>
                    <b>{patientData?.phone_number || 'Chưa cập nhật'}</b>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Nơi ở hiện tại (Mã Tỉnh / Mã Xã):</label>
                    <b>
                      {patientData?.address || 'Chưa cập nhật địa chỉ'}
                      {patientData?.province_code && ` • Mã Tỉnh: ${patientData.province_code}`}
                      {patientData?.ward_code && ` • Mã Xã: ${patientData.ward_code}`}
                    </b>
                  </div>
                </div>

                {/* Thông tin người đi cùng */}
                <div style={{ marginTop: '16px', padding: '12px 14px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <b style={{ fontSize: '13px', color: '#0e7490' }}>👨‍👩‍👦 Thông tin người đi cùng (Trẻ em hoặc ca đặc biệt):</b>
                  <div style={{ marginTop: '6px', fontSize: '13px', color: '#334155' }}>
                    {patientData?.companion_name ? (
                      <div>
                        <span>Họ tên: <strong>{patientData.companion_name}</strong></span> • 
                        <span> CCCD: <strong>{patientData.companion_id_card || 'Chưa cập nhật'}</strong></span> • 
                        <span> SĐT: <strong>{patientData.companion_phone || 'Chưa cập nhật'}</strong></span> • 
                        <span> Mối quan hệ: <strong>{patientData.companion_relationship || 'Người thân'}</strong></span>
                      </div>
                    ) : (
                      <span style={{ color: '#64748b' }}>Không có người đi cùng đi kèm (Bệnh nhân tự tham gia tư vấn).</span>
                    )}
                  </div>
                </div>

                {/* 2. THÔNG TIN TIỀN SỬ SỨC KHỎE & DỊCH TỄ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '24px 0 12px' }}>
                  <HeartPulse size={18} color="#dc2626" />
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                    2. Thông tin tiền sử sức khỏe & Dịch tễ
                  </h3>
                </div>
                <div className="detail-grid">
                  <div>
                    <label>Tiền sử bản thân (Mắc bệnh & Mã ICD-10):</label>
                    <b style={{ color: patientData?.has_medical_history ? '#b45309' : '#059669' }}>
                      {patientData?.has_medical_history ? `Có mắc bệnh tiền sử: [${patientData?.medical_history_icd10 || 'Chưa rõ mã'}]` : 'Không có tiền sử bệnh mạn tính'}
                    </b>
                    {patientData?.medical_history_notes && (
                      <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>{patientData.medical_history_notes}</small>
                    )}
                  </div>
                  <div>
                    <label>Tiền sử gia đình (Di truyền theo ICD-10):</label>
                    <b>{patientData?.family_history_icd10 ? `Mã ICD-10: ${patientData.family_history_icd10}` : 'Chưa ghi nhận bệnh di truyền gia đình'}</b>
                    {patientData?.family_history_notes && (
                      <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>{patientData.family_history_notes}</small>
                    )}
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Tiền sử dịch tễ (Tiếp xúc bệnh truyền nhiễm):</label>
                    <b style={{ color: '#0f766e' }}>
                      {patientData?.epidemiological_history || 'Không tiếp xúc với người bệnh truyền nhiễm (bệnh lao, sốt xuất huyết, cúm A, sởi...)'}
                    </b>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label>Tiền sử dị ứng thuốc & Thực phẩm:</label>
                    <b style={{ color: '#dc2626' }}>{patientData?.allergies || 'Chưa ghi nhận dị ứng'}</b>
                  </div>
                </div>

                {/* 3. THÔNG TIN CHUNG VỀ LƯỢT KHÁM BỆNH, CHỮA BỆNH */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '24px 0 12px' }}>
                  <Building2 size={18} color="#0284c7" />
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                    3. Thông tin chung về lượt khám bệnh, chữa bệnh
                  </h3>
                </div>
                <div className="detail-grid">
                  <div>
                    <label>Mã lượt khám (Quản lý KCB):</label>
                    <b style={{ color: '#0e7490', fontFamily: 'monospace' }}>
                      {encounterInfo?.encounter_code || appointment.encounter_code || `LK-${appointment.id.toString().padStart(6, '0')}`}
                    </b>
                  </div>
                  <div>
                    <label>Mã cơ sở KCB (GLN):</label>
                    <b>{encounterInfo?.hospital_code || appointment.hospital_code || '79014 (GLN: 8938500000018)'}</b>
                  </div>
                  <div>
                    <label>Đối tượng bệnh nhân:</label>
                    <b>{encounterInfo?.patient_category || appointment.patient_category || (appointment.bhyt_code ? 'Bảo hiểm y tế' : 'Tự túc')}</b>
                  </div>
                  <div>
                    <label>Nguồn chi trả viện phí:</label>
                    <b>{encounterInfo?.payment_source || appointment.payment_source || (appointment.bhyt_code ? 'Quỹ Bảo hiểm y tế' : 'Tự túc')}</b>
                  </div>
                  <div>
                    <label>Mã thẻ BHYT & Mức hưởng:</label>
                    <b style={{ color: '#0284c7' }}>
                      {encounterInfo?.bhyt_code || appointment.bhyt_code || patientData?.bhyt_code || 'Không có BHYT'} 
                      {appointment.bhyt_rate ? ` (${appointment.bhyt_rate}%)` : ''}
                    </b>
                  </div>
                  <div>
                    <label>Thời gian bắt đầu phiên:</label>
                    <b>{new Date(appointment.starts_at).toLocaleString('vi-VN')}</b>
                  </div>
                </div>

                <h3 style={{ marginTop: '20px' }}>Lý do ban đầu người bệnh đăng ký khám:</h3>
                <div className="quote-box">{appointment.reason}</div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="doctor-chat-tab-container">
                <ConsultationChat
                  appointmentId={appointment.id}
                  currentUser={user}
                  title="Hộp thoại trao đổi & Tệp bệnh nhân gửi (Ảnh vết thương, Hồ sơ xét nghiệm)"
                />
              </div>
            )}

            {activeTab === 'lab' && (
              <div className="paraclinical-workspace">
                <div className="patient-banner-header" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: '#f0fdfa',
                  border: '1px solid #ccfbf1',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FlaskConical size={20} color="#0f766e" />
                      <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        Phiếu Cận lâm sàng & Kết quả
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={handleSyncLatest3LabResults}
                        style={{
                          background: '#0f766e',
                          color: '#ffffff',
                          border: '1px solid #0d9488',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(15, 118, 110, 0.2)',
                          whiteSpace: 'nowrap'
                        }}
                        title="Đồng bộ kết quả xét nghiệm mới nhất vào Bệnh án EMR"
                      >
                        <RefreshCw size={14} />
                        Đồng bộ
                      </button>
                      {labData && labData.abnormal_indicators_count > 0 && (
                        <button
                          type="button"
                          className="primary small-primary"
                          onClick={handleExtractAbnormalToNotes}
                          style={{
                            background: '#f59e0b',
                            borderColor: '#d97706',
                            color: '#ffffff',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(245, 158, 11, 0.2)',
                            whiteSpace: 'nowrap'
                          }}
                          title="Tự động sao chép các chỉ số bất thường vào Phiếu khám lâm sàng"
                        >
                          <Sparkles size={14} /> Trích xuất ({labData.abnormal_indicators_count} bất thường)
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e0f2fe' }}>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                      Bệnh nhân: <strong style={{ color: '#1e293b' }}>{patientData?.full_name || 'Bệnh nhân'}</strong> · Mã BN: <code style={{ background: '#e6fffa', padding: '1px 5px', borderRadius: '4px', color: '#0d9488', fontWeight: 600 }}>{patientData?.external_patient_id || `VN-P00${appointment.patient_id}`}</code> · Tổng: <strong>{labData?.reports?.length || 0} phiếu</strong>
                    </p>
                  </div>
                </div>

                {/* AI Lab Results Interpreter Card */}
                {labAiResult && (
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Sparkles size={18} color="#0284c7" />
                      <strong style={{ color: '#0f172a' }}>AI Diễn giải Kết quả Xét nghiệm</strong>
                      <span style={{
                        background: labAiResult.overall_status === 'NORMAL' ? '#dcfce7' : '#fef3c7',
                        color: labAiResult.overall_status === 'NORMAL' ? '#15803d' : '#b45309',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        {labAiResult.overall_status === 'NORMAL' ? 'Bình thường' : `Có ${labAiResult.abnormal_count} chỉ số cần lưu ý`}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#334155' }}>
                      {labAiResult.patient_friendly_summary}
                    </p>
                    {labAiResult.lifestyle_advice && labAiResult.lifestyle_advice.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#047857', background: '#ecfdf5', padding: '8px 12px', borderRadius: '6px' }}>
                        <b>Lời khuyên chuyên môn:</b>
                        <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                          {labAiResult.lifestyle_advice.map((adv: string, i: number) => <li key={i}>{adv}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Filter chips */}
                <div className="filter-chips-bar" style={{ display: 'flex', gap: '8px', margin: '14px 0', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[
                    ['all', `Tất cả (${labData?.reports?.length || 0})`],
                    ['biochemistry', 'Sinh hóa máu'],
                    ['hematology', 'Huyết học'],
                    ['urinalysis', 'Nước tiểu']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLabCategoryFilter(key)}
                      className={`filter-chip ${labCategoryFilter === key ? 'active' : ''}`}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: labCategoryFilter === key ? '1px solid #0f766e' : '1px solid #cbd5e1',
                        background: labCategoryFilter === key ? '#0f766e' : '#f8fafc',
                        color: labCategoryFilter === key ? '#fff' : '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {loadingLab && <p className="muted">Đang tải dữ liệu cận lâm sàng...</p>}

                {labData && (
                  <div className="lab-reports-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {labData.reports
                      .filter(r => labCategoryFilter === 'all' || r.category === labCategoryFilter)
                      .map(report => (
                        <div key={report.report_id} className="lab-report-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
                                  {report.category_name}
                                </span>
                                <h4 style={{ margin: 0, fontSize: '14px', color: '#0f172a' }}>{report.title}</h4>
                              </div>
                              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                Mã: <strong>{report.report_id}</strong> · Lấy mẫu: {report.sampled_at} · Trả kết quả: {report.result_at}
                              </small>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                              <div>KTV: <strong>{report.performed_by}</strong></div>
                              <div>BS chỉ định: {report.doctor_order}</div>
                            </div>
                          </div>

                          <div className="table-responsive" style={{ overflowX: 'auto' }}>
                            <table className="lab-indicator-table" style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ background: '#f8fafc', color: '#475569', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                                  <th style={{ padding: '8px 10px' }}>Tên xét nghiệm / Chỉ số</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Kết quả</th>
                                  <th style={{ padding: '8px 10px' }}>Đơn vị</th>
                                  <th style={{ padding: '8px 10px' }}>Khoảng tham chiếu</th>
                                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Đánh giá</th>
                                </tr>
                              </thead>
                              <tbody>
                                {report.indicators.map((ind, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: ind.flag !== 'NORMAL' ? '#fffbeb' : 'transparent' }}>
                                    <td style={{ padding: '8px 10px' }}>
                                      <strong style={{ color: '#1e293b' }}>{ind.name}</strong>
                                      <code style={{ marginLeft: 6, fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{ind.code}</code>
                                      {ind.note && <div style={{ fontSize: '11px', color: '#94a3b8' }}>{ind.note}</div>}
                                    </td>
                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, fontSize: '13px', color: ind.flag === 'HIGH' ? '#dc2626' : ind.flag === 'LOW' ? '#d97706' : '#0f172a' }}>
                                      {ind.value}
                                    </td>
                                    <td style={{ padding: '8px 10px', color: '#64748b' }}>{ind.unit}</td>
                                    <td style={{ padding: '8px 10px', color: '#475569' }}>{ind.ref_range}</td>
                                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                      {ind.flag === 'HIGH' && (
                                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                          ▲ Tăng cao
                                        </span>
                                      )}
                                      {ind.flag === 'LOW' && (
                                        <span style={{ background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                          ▼ Giảm thấp
                                        </span>
                                      )}
                                      {ind.flag === 'NORMAL' && (
                                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                          Bình thường
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            {report.conclusion ? (
                              <div style={{ flex: 1, padding: '8px 12px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #0f766e', fontSize: '12px' }}>
                                <strong style={{ color: '#0f766e' }}>Kết luận Khoa Xét nghiệm:</strong> {report.conclusion}
                              </div>
                            ) : <div style={{ flex: 1 }} />}
                            <button
                              type="button"
                              onClick={() => handleShareLab(report)}
                              disabled={sharingLabId === report.report_id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                background: '#0f766e',
                                color: '#fff',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: 'none',
                                whiteSpace: 'nowrap',
                                opacity: sharingLabId === report.report_id ? 0.7 : 1
                              }}
                            >
                              <Share2 size={14} /> {sharingLabId === report.report_id ? 'Đang chia sẻ...' : 'Chia sẻ kết quả cho bệnh nhân'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'pacs' && (
              <div className="pacs-workspace">
                <div className="patient-banner-header" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ScanLine size={20} color="#0284c7" />
                      <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        Chẩn đoán Hình ảnh PACS / DICOM
                      </h3>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={handleSyncPacsStudies}
                        style={{
                          background: '#0284c7',
                          color: '#ffffff',
                          border: '1px solid #0369a1',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                          whiteSpace: 'nowrap'
                        }}
                        title="Đồng bộ kết luận chẩn đoán hình ảnh PACS vào Bệnh án EMR"
                      >
                        <RefreshCw size={14} />
                        Đồng bộ
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e0f2fe' }}>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                      Bệnh nhân: <strong style={{ color: '#1e293b' }}>{patientData?.full_name || 'Bệnh nhân'}</strong> · Mã BN: <code style={{ background: '#e0f2fe', padding: '1px 5px', borderRadius: '4px', color: '#0284c7', fontWeight: 600 }}>{patientData?.external_patient_id || `VN-P00${appointment.patient_id}`}</code> · Tổng: <strong>{pacsData?.total_studies || 0} ca chụp</strong>
                    </p>
                  </div>
                </div>

                {/* Filter Modality chips */}
                <div className="filter-chips-bar" style={{ display: 'flex', gap: '8px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {[
                    ['all', `Tất cả (${pacsData?.studies?.length || 0})`],
                    ['CR', 'X-Quang (CR)'],
                    ['US', 'Siêu âm (US)'],
                    ['CT', 'Cắt lớp vi tính (CT)']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPacsModalityFilter(key)}
                      className={`filter-chip ${pacsModalityFilter === key ? 'active' : ''}`}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '20px',
                        border: pacsModalityFilter === key ? '1px solid #0284c7' : '1px solid #cbd5e1',
                        background: pacsModalityFilter === key ? '#0284c7' : '#f8fafc',
                        color: pacsModalityFilter === key ? '#fff' : '#475569',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {loadingPacs && <p className="muted">Đang tải danh sách phim PACS...</p>}

                {pacsData && (
                  <div className="pacs-studies-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pacsData.studies
                      .filter(s => pacsModalityFilter === 'all' || s.modality === pacsModalityFilter)
                      .map(study => (
                        <div key={study.study_id} className="pacs-study-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  background: study.modality === 'CT' ? '#fef3c7' : study.modality === 'US' ? '#f3e8ff' : '#e0f2fe',
                                  color: study.modality === 'CT' ? '#b45309' : study.modality === 'US' ? '#7e22ce' : '#0369a1',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 800
                                }}>
                                  {study.modality}
                                </span>
                                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a' }}>{study.description}</h4>
                              </div>
                              <small style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                                Bộ phận: <strong>{study.body_part}</strong> · Ngày chụp: <strong>{study.date}</strong> · Đơn vị: {study.institution}
                              </small>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>BS CĐHA:</span>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{study.radiologist}</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '14px' }}>
                            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', fontSize: '12px' }}>
                              <strong style={{ color: '#475569', display: 'block', marginBottom: '4px' }}>📝 Mô tả hình ảnh (Findings):</strong>
                              <p style={{ margin: 0, color: '#1e293b', lineHeight: 1.5 }}>{study.findings}</p>
                            </div>

                            <div style={{ background: '#ecfdf5', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #10b981', fontSize: '12px' }}>
                              <strong style={{ color: '#047857', display: 'block', marginBottom: '4px' }}>🎯 Kết luận (Impression):</strong>
                              <p style={{ margin: 0, color: '#064e3b', fontWeight: 600, lineHeight: 1.5 }}>{study.impression}</p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                            <button
                              type="button"
                              className="secondary small-secondary"
                              onClick={() => {
                                setSelectedStudy(study)
                                handleAnalyzePacs()
                              }}
                              disabled={analyzingPacs}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#f0fdf4', color: '#166534', borderColor: '#86efac' }}
                              title="Chạy mô hình AI phát hiện tổn thương phổi và cấu trúc xương"
                            >
                              <Sparkles size={14} color="#16a34a" /> {analyzingPacs ? 'AI đang phân tích phim...' : '🤖 AI Phân tích hình ảnh (Second Opinion)'}
                            </button>
                            <button
                              type="button"
                              className="secondary small-secondary"
                              onClick={() => handleApplyImagingImpression(study)}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                              title="Tự động đưa kết luận này vào ô chẩn đoán lâm sàng"
                            >
                              <Sparkles size={14} color="#0f766e" /> ⚡ Đưa kết luận vào Chẩn đoán
                            </button>
                            <button
                              type="button"
                              className="primary small-primary"
                              onClick={() => {
                                setSelectedStudy(study)
                                setShowOhifModal(true)
                                if (!pacsAiResult) {
                                  handleAnalyzePacs()
                                }
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#0284c7', borderColor: '#0284c7' }}
                              title="Mở buồng đọc phim DICOM tích hợp trợ lý AI MedGemma 3 trực tiếp trên màn hình"
                            >
                              <ExternalLink size={14} /> Mở phim & AI MedGemma đọc phim (OHIF)
                            </button>
                          </div>

                          {/* AI PACS Second Opinion Panel */}
                          {pacsAiResult && selectedStudy?.study_id === study.study_id && (
                            <div style={{
                              marginTop: '12px',
                              padding: '12px 14px',
                              background: '#f8fafc',
                              border: '1px solid #bae6fd',
                              borderRadius: '8px',
                              fontSize: '13px'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 700 }}>
                                  <Sparkles size={16} /> Báo cáo Tham khảo AI (Second Opinion - {pacsAiResult.ai_model_version})
                                </div>
                                <span style={{
                                  background: pacsAiResult.abnormal ? '#fee2e2' : '#dcfce7',
                                  color: pacsAiResult.abnormal ? '#dc2626' : '#16a34a',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}>
                                  {pacsAiResult.abnormal ? `Nghi ngờ tổn thương (${Math.round(pacsAiResult.abnormality_score * 100)}%)` : 'Bình thường'}
                                </span>
                              </div>
                              <p style={{ margin: '0 0 6px', color: '#334155', whiteSpace: 'pre-line' }}>{pacsAiResult.finding}</p>
                              <div style={{ background: '#fff', padding: '8px 10px', borderRadius: '6px', borderLeft: '3px solid #0284c7', margin: '6px 0' }}>
                                <b style={{ color: '#0284c7' }}>Kết luận AI:</b> {pacsAiResult.impression}
                              </div>
                              {pacsAiResult.annotated_regions && pacsAiResult.annotated_regions.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                  <b>Vùng giải phẫu được AI rà soát:</b>
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    {pacsAiResult.annotated_regions.map((reg: any, i: number) => (
                                      <span key={i} style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                        📍 {reg.label} (Độ tin cậy: {Math.round(reg.confidence * 100)}%)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#047857' }}>
                                💡 <strong>Khuyến nghị:</strong> {pacsAiResult.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fhir' && (
              <div className="fhir-card">
                <div className="fhir-header">
                  <Code2 size={18} color="#0f766e" />
                  <div>
                    <b>HL7 FHIR R4 Bundle Collection</b>
                    <small>Tương thích HIS/EMR & Tiêu chuẩn Trao đổi Y tế Quốc tế</small>
                  </div>
                </div>
                <pre className="fhir-code-view">{fhirJson || 'Đang tải cấu trúc dữ liệu FHIR R4...'}</pre>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="history-workspace" style={{ display: 'grid', gap: '20px' }}>
                {/* 1. Timeline mốc sự kiện của ca khám hiện tại */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e' }}>
                      <Clock size={20} />
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                        Timeline Tiến trình Ca khám Hiện tại (#{appointment.id})
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={loadHistory}
                      disabled={loadingHistory}
                      style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#475569' }}
                    >
                      {loadingHistory ? 'Đang cập nhật...' : '🔄 Làm mới'}
                    </button>
                  </div>

                  {loadingHistory && <p className="muted">Đang tải lịch sử tiến trình...</p>}

                  {appointmentEvents.length === 0 && !loadingHistory && (
                    <p className="muted" style={{ fontSize: '13px', fontStyle: 'italic' }}>
                      Chưa có sự kiện nào được ghi nhận cho ca khám này. Mọi thao tác đặt lịch, triage, gọi video, kê đơn và ký số sẽ tự động lưu vết tại đây.
                    </p>
                  )}

                  {appointmentEvents.length > 0 && (
                    <div className="timeline-container" style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid #e2e8f0', display: 'grid', gap: '16px', margin: '10px 0' }}>
                      {appointmentEvents.map((ev) => (
                        <div key={ev.id} style={{ position: 'relative' }}>
                          <span style={{
                            position: 'absolute',
                            left: '-31px',
                            top: '2px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: ev.action === 'complete' ? '#16a34a' : ev.action === 'digital_sign' ? '#8b5cf6' : ev.action === 'cancel' ? '#dc2626' : '#0f766e',
                            border: '2px solid #fff',
                            boxShadow: '0 0 0 2px #cbd5e1'
                          }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <strong style={{ color: '#0f172a' }}>
                              {ev.action === 'create' && '📝 Đăng ký Lịch khám'}
                              {ev.action === 'triage' && '🩺 Sàng lọc Phân luồng Triage'}
                              {ev.action === 'start_consultation' && '📹 Bắt đầu Phòng khám Trực tuyến'}
                              {ev.action === 'clinical_record' && '📋 Lưu Phiếu khám Lâm sàng'}
                              {ev.action === 'prescribe' && '💊 Kê Đơn thuốc Điện tử'}
                              {ev.action === 'digital_sign' && '🔏 Ký số Y tế SmartCA PKI'}
                              {ev.action === 'share_lab' && '📤 Chia sẻ Kết quả Cận lâm sàng'}
                              {ev.action === 'complete' && '✅ Hoàn tất Ca khám & Khóa Bệnh án'}
                              {ev.action === 'cancel' && '❌ Hủy Lịch khám'}
                              {!['create', 'triage', 'start_consultation', 'clinical_record', 'prescribe', 'digital_sign', 'share_lab', 'complete', 'cancel'].includes(ev.action) && ev.action}
                            </strong>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>
                              {ev.created_at ? new Date(ev.created_at).toLocaleString('vi-VN') : ''}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}>
                            {ev.notes || 'Thực hiện thành công'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Thực hiện bởi: <strong>{ev.actor_name || 'Hệ thống'}</strong> ({ev.actor_role || 'System'})
                            {ev.to_status && <span style={{ marginLeft: '8px', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>Trạng thái: {ev.to_status}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Lịch sử tất cả các lượt khám trước đây của bệnh nhân */}
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', marginBottom: '16px' }}>
                    <Activity size={20} />
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                      Lịch sử Tất cả Lượt khám của Bệnh nhân ({consultationHistory.length} ca)
                    </h3>
                  </div>

                  {consultationHistory.length === 0 && !loadingHistory && (
                    <p className="muted" style={{ fontSize: '13px' }}>Chưa ghi nhận ca khám cũ nào khác của bệnh nhân này.</p>
                  )}

                  {consultationHistory.length > 0 && (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {consultationHistory.map((h) => (
                        <div key={h.appointment_id} style={{
                          border: h.appointment_id === appointment.id ? '2px solid #0f766e' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '14px',
                          background: h.appointment_id === appointment.id ? '#f0fdfa' : '#fff'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <strong style={{ color: '#0f172a', fontSize: '14px' }}>Ca khám #{h.appointment_id}</strong>
                                {h.appointment_id === appointment.id && (
                                  <span style={{ background: '#0f766e', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    Đang mở
                                  </span>
                                )}
                                <span style={{
                                  background: h.status === 'completed' ? '#dcfce7' : h.status === 'in_progress' ? '#e0f2fe' : h.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                                  color: h.status === 'completed' ? '#16a34a' : h.status === 'in_progress' ? '#0284c7' : h.status === 'cancelled' ? '#dc2626' : '#d97706',
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontWeight: 700
                                }}>
                                  {h.status === 'completed' ? 'Hoàn tất' : h.status === 'in_progress' ? 'Đang khám' : h.status === 'cancelled' ? 'Đã hủy' : 'Đã xếp lịch'}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                                📅 Thời gian: {h.starts_at ? new Date(h.starts_at).toLocaleString('vi-VN') : '—'} · Bác sĩ: <strong>{h.doctor_name}</strong>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '11px', color: '#64748b' }}>
                              <div>Ghi nhận: <strong>{h.events_count} mốc sự kiện</strong></div>
                              {h.is_signed && <div style={{ color: '#16a34a', fontWeight: 600 }}>🔏 Đã ký số SmartCA</div>}
                            </div>
                          </div>

                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '12px', color: '#334155' }}>
                            <div><strong>Lý do khám:</strong> {h.reason}</div>
                            {h.diagnosis && (
                              <div style={{ marginTop: '2px' }}>
                                <strong>Chẩn đoán:</strong> {h.diagnosis} {h.icd10_code ? `(${h.icd10_code})` : ''}
                              </div>
                            )}
                            {h.national_code && (
                              <div style={{ marginTop: '2px', color: '#0369a1' }}>
                                <strong>Mã đơn thuốc QG:</strong> <code>{h.national_code}</code>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

            {/* Popup Lịch sử đo Sinh hiệu RPM IoT */}
      {showRpmHistoryModal && (
        <div className="soap-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="soap-modal-content" style={{ width: 'min(820px, 95vw)' }}>
            <div className="soap-modal-header" style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
              <div className="soap-modal-header-left">
                <div className="soap-modal-icon-badge" style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be185d 100%)' }}>
                  <HeartPulse size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#881337' }}>
                    Lịch sử Đo Sinh hiệu RPM IoT (Theo dõi từ xa)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#be185d' }}>
                    Dữ liệu truyền từ thiết bị y tế Bluetooth BLE (Omron Smart BP, Accu-Chek Guide, Wellue SpO2) của bệnh nhân <strong>{patientData?.full_name || user.full_name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="soap-modal-close-btn"
                onClick={() => setShowRpmHistoryModal(false)}
                title="Đóng popup lịch sử đo"
              >
                <X size={18} />
              </button>
            </div>

            <div className="soap-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '65vh', overflowY: 'auto' }}>
              {/* Thẻ tóm tắt 4 chỉ số mới nhất */}
              <div className="doctor-rpm-metrics-grid" style={{ marginBottom: '6px' }}>
                <div className="doctor-rpm-card bp">
                  <div className="rpm-card-top">
                    <span className="rpm-card-label">Huyết áp gần nhất</span>
                    <span className="rpm-card-badge">Omron BLE</span>
                  </div>
                  <div className="rpm-card-val">
                    {rpmVitals.find(v => v.systolic)?.systolic || (triageBp ? triageBp.split('/')[0] : '--')} / {rpmVitals.find(v => v.diastolic)?.diastolic || (triageBp ? triageBp.split('/')[1] : '--')}
                    <small> mmHg</small>
                  </div>
                  <div className={`rpm-card-status ${triageBp || rpmVitals.some(v => v.systolic) ? 'good' : 'muted'}`}>
                    {triagePulse || rpmVitals.find(v => v.pulse)?.pulse ? (
                      <span>🟢 Mạch: <strong>{rpmVitals.find(v => v.pulse)?.pulse || triagePulse}</strong> bpm</span>
                    ) : (
                      <span>⚪ Chưa có chỉ số</span>
                    )}
                  </div>
                </div>

                <div className="doctor-rpm-card glucose">
                  <div className="rpm-card-top">
                    <span className="rpm-card-label">Đường huyết</span>
                    <span className="rpm-card-badge">Accu-Chek</span>
                  </div>
                  <div className="rpm-card-val">
                    {rpmVitals.find(v => v.glucose_value)?.glucose_value || triageGlucose || '--'}
                    <small> mmol/L</small>
                  </div>
                  <div className={`rpm-card-status ${rpmVitals.find(v => v.glucose_value)?.glucose_value || triageGlucose ? 'good' : 'muted'}`}>
                    {rpmVitals.find(v => v.glucose_value)?.glucose_value || triageGlucose ? '🟢 Đường huyết đói tốt' : '⚪ Chưa đo'}
                  </div>
                </div>

                <div className="doctor-rpm-card spo2">
                  <div className="rpm-card-top">
                    <span className="rpm-card-label">SpO2</span>
                    <span className="rpm-card-badge">Oximeter</span>
                  </div>
                  <div className="rpm-card-val">
                    {rpmVitals.find(v => v.spo2_percent)?.spo2_percent || triageSpo2 || '--'}
                    <small> %</small>
                  </div>
                  <div className={`rpm-card-status ${rpmVitals.find(v => v.spo2_percent)?.spo2_percent || triageSpo2 ? 'good' : 'muted'}`}>
                    {rpmVitals.find(v => v.spo2_percent)?.spo2_percent || triageSpo2 ? '🟢 Bão hòa oxy SpO2' : '⚪ Chưa đo'}
                  </div>
                </div>

                <div className="doctor-rpm-card hr">
                  <div className="rpm-card-top">
                    <span className="rpm-card-label">Nhịp tim</span>
                    <span className="rpm-card-badge">ECG/Vòng</span>
                  </div>
                  <div className="rpm-card-val">
                    {rpmVitals.find(v => v.pulse)?.pulse || triagePulse || '--'}
                    <small> bpm</small>
                  </div>
                  <div className={`rpm-card-status ${rpmVitals.find(v => v.pulse)?.pulse || triagePulse ? 'good' : 'muted'}`}>
                    {rpmVitals.find(v => v.pulse)?.pulse || triagePulse ? '🟢 Nhịp xoang đều' : '⚪ Chưa đo'}
                  </div>
                </div>
              </div>

              {/* Bảng chi tiết toàn bộ lịch sử đo */}
              <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                    Danh sách các lần đo ({rpmVitals.length} bản ghi):
                  </strong>
                  <span className="rpm-live-dot-tag" style={{ background: '#ecfdf5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: '#047857', border: '1px solid #a7f3d0' }}>
                    <span className="live-dot" /> Trực tiếp BLE
                  </span>
                </div>

                <table className="doctor-rpm-mini-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Thời gian đo</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Thiết bị y tế</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Chỉ số sinh hiệu</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>Đánh giá lâm sàng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rpmVitals.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                          Chưa có bản ghi sinh hiệu nào từ thiết bị của bệnh nhân.
                        </td>
                      </tr>
                    ) : (
                      rpmVitals.map(v => (
                        <tr key={v.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px', fontSize: '12px', color: '#475569' }}>
                            <strong>{new Date(v.measured_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>{' '}
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(v.measured_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                            <strong style={{ color: '#0f172a' }}>{v.device_name?.replace(' Smart BP (Đo tại nhà)', '')?.replace(' (Đo tại nhà)', '') || 'Omron BLE'}</strong>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>Bluetooth Smart Telemetry</div>
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '12.5px' }}>
                            {v.systolic && <span style={{ marginRight: '8px' }}>HA: <strong>{v.systolic}/{v.diastolic}</strong> mmHg</span>}
                            {v.glucose_value && <span style={{ marginRight: '8px' }}>ĐH: <strong style={{ color: '#d97706' }}>{v.glucose_value}</strong> mmol/L</span>}
                            {v.spo2_percent && <span style={{ marginRight: '8px' }}>SpO2: <strong style={{ color: '#0284c7' }}>{v.spo2_percent}%</strong></span>}
                            {v.pulse && <span>Mạch: <strong>{v.pulse}</strong> bpm</span>}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            {v.is_warning ? (
                              <span className="rpm-badge-warning" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                ⚠️ {v.warning_message || 'Bất thường'}
                              </span>
                            ) : (
                              <span className="rpm-badge-normal" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700 }}>
                                ✅ Tốt · Ổn định
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="soap-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 22px', borderTop: '1px solid #fecdd3', background: '#fff1f2' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-modal-accent-rose"
                  onClick={() => {
                    handleApplyRpmToRecord();
                    setShowRpmHistoryModal(false);
                  }}
                >
                  <FileCheck size={15} /> Đưa số đo mới nhất vào Bệnh án EMR
                </button>
                <button
                  type="button"
                  className="btn-modal-secondary"
                  onClick={loadRpmVitals}
                  disabled={loadingRpm}
                  title="Tải lại từ thiết bị bệnh nhân"
                >
                  <RefreshCw size={14} className={loadingRpm ? 'spin-icon' : ''} />
                  <span>{loadingRpm ? 'Đang đồng bộ...' : 'Đồng bộ lại BLE'}</span>
                </button>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowRpmHistoryModal(false)}
              >
                <X size={15} /> Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup Hội thoại giữa Bác sĩ và Bệnh nhân */}
      {showTranscriptModal && (
        <div className="soap-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="soap-modal-content" style={{ width: 'min(780px, 95vw)' }}>
            <div className="soap-modal-header" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
              <div className="soap-modal-header-left">
                <div className="soap-modal-icon-badge" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}>
                  <MessageSquare size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0c4a6e' }}>
                    Hội thoại Khám bệnh (Bác sĩ & Bệnh nhân)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#0369a1' }}>
                    Nội dung nhận diện giọng nói tự động (Speech-to-Text). Bác sĩ có thể đọc lại, gõ bổ sung hoặc chỉnh sửa trước khi tóm tắt SOAP.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="soap-modal-close-btn"
                onClick={() => setShowTranscriptModal(false)}
                title="Đóng popup hội thoại"
              >
                <X size={18} />
              </button>
            </div>

            <div className="soap-modal-body" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Thanh công cụ phụ trợ trong modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569' }}>
                  {isListening ? (
                    <span className="scribe-live-pill recording">
                      <span className="live-dot" /> Đang lắng nghe từ Micro...
                    </span>
                  ) : (
                    <span className="scribe-live-pill ready">
                      <span className="live-dot" /> {scribeTranscript.trim() ? `Đã có ${scribeTranscript.trim().split('\n').filter(Boolean).length} đoạn thoại` : 'Chưa có dữ liệu thoại'}
                    </span>
                  )}
                  <span>&bull;</span>
                  <span>{scribeTranscript.length} ký tự</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-ai-sample"
                    onClick={() => {
                      handleLoadSampleDialog();
                      setToast('Đã nạp kịch bản hội thoại mẫu Bác sĩ - Bệnh nhân');
                    }}
                    title="Nạp kịch bản mẫu khám bệnh"
                    style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={12} /> Nạp mẫu thoại
                  </button>

                  {scribeTranscript.trim() && (
                    <button
                      type="button"
                      className="btn-ai-sample"
                      onClick={() => {
                        navigator.clipboard?.writeText(scribeTranscript);
                        setToast('Đã sao chép nội dung hội thoại vào bộ nhớ tạm');
                      }}
                      title="Sao chép nội dung hội thoại"
                      style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Copy size={12} /> Sao chép
                    </button>
                  )}

                  {scribeTranscript.trim() && (
                    <button
                      type="button"
                      className="btn-ai-clear"
                      onClick={() => {
                        setScribeTranscript('');
                        setToast('Đã xóa trắng hội thoại');
                      }}
                      title="Xóa toàn bộ hội thoại"
                      style={{ width: 'auto', padding: '4px 10px', fontSize: '11px', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Trash2 size={12} /> Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* Textarea nhập/chỉnh sửa hội thoại đầy đủ */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Văn bản chi tiết cuộc trò chuyện:
                </label>
                <textarea
                  className="scribe-transcript-modal-textarea"
                  rows={13}
                  placeholder="Nội dung hội thoại giữa Bác sĩ và Bệnh nhân sẽ tự động xuất hiện tại đây khi bật 'Tự động nghe' từ micro cuộc gọi, hoặc bác sĩ có thể gõ hoặc dán nội dung trò chuyện vào đây..."
                  value={scribeTranscript}
                  onChange={e => setScribeTranscript(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    fontFamily: 'inherit',
                    color: '#0f172a',
                    background: '#ffffff',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div className="soap-modal-footer" style={{ padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                💡 Bấm <strong>"AI Tóm tắt & Tạo SOAP ngay"</strong> để chuyển toàn bộ hội thoại này thành Phiếu khám lâm sàng.
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setShowTranscriptModal(false)}
                >
                  <X size={15} /> Đóng
                </button>
                <button
                  type="button"
                  className="btn-modal-accent-blue"
                  onClick={() => {
                    setShowTranscriptModal(false);
                    handleAnalyzeAiScribe();
                  }}
                  disabled={generatingSoap || !scribeTranscript.trim()}
                >
                  <Sparkles size={15} /> {generatingSoap ? 'Đang tóm tắt...' : '✨ AI Tóm tắt & Tạo SOAP ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup đầy đủ thông tin AI Scribe SOAP cho Bác sĩ xem lại & chỉnh sửa trước khi tạo phiếu khám */}
      {showSoapModal && (
        <div className="soap-modal-overlay">
          <div className="soap-modal-content">
            <div className="soap-modal-header">
              <div className="soap-modal-header-left">
                <div className="soap-modal-icon-badge">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3>Biên bản Tóm tắt Lâm sàng SOAP & Đơn thuốc (AI Clinical Scribe)</h3>
                  <p>Bác sĩ kiểm tra, chỉnh sửa trực tiếp nội dung các mục bên dưới trước khi đồng bộ vào Bệnh án EMR (QĐ 130/Bộ Y tế).</p>
                </div>
              </div>
              <button
                type="button"
                className="soap-modal-close-btn"
                onClick={() => setShowSoapModal(false)}
                title="Đóng popup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="soap-modal-body">
              <div className="soap-patient-info-strip">
                <div>
                  Người bệnh: <strong>{patientData?.full_name || 'Bệnh nhân'}</strong> &bull; Tuổi: <strong>35</strong> &bull; Lượt khám: <strong>#{appointment.id}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} /> Chuẩn hóa SOAP Y tế &bull; Đề xuất ICD-10
                </div>
              </div>

              {/* S: Triệu chứng cơ năng */}
              <div className="soap-field-group">
                <label className="soap-field-label">
                  <span className="soap-badge-label s">S</span>
                  Lý do khám & Triệu chứng cơ năng (Subjective):
                </label>
                <textarea
                  className="soap-field-textarea"
                  rows={3}
                  value={soapEditState.subjective}
                  onChange={e => setSoapEditState({ ...soapEditState, subjective: e.target.value })}
                  placeholder="Diễn giải triệu chứng, khởi phát, thời gian đau/sốt, mức độ..."
                />
              </div>

              {/* O: Khám khách quan */}
              <div className="soap-field-group">
                <label className="soap-field-label">
                  <span className="soap-badge-label o">O</span>
                  Khám khách quan & Đánh giá qua Telehealth Video (Objective):
                </label>
                <textarea
                  className="soap-field-textarea"
                  rows={3}
                  value={soapEditState.objective}
                  onChange={e => setSoapEditState({ ...soapEditState, objective: e.target.value })}
                  placeholder="Thể trạng, tri giác, niêm mạc qua video, nhịp thở, sinh hiệu..."
                />
              </div>

              {/* A: Chẩn đoán & ICD-10 */}
              <div className="soap-two-col-grid">
                <div className="soap-field-group">
                  <label className="soap-field-label">
                    <span className="soap-badge-label a">A</span>
                    Chẩn đoán sơ bộ của Bác sĩ (Assessment):
                  </label>
                  <textarea
                    className="soap-field-textarea"
                    rows={2}
                    value={soapEditState.assessment}
                    onChange={e => setSoapEditState({ ...soapEditState, assessment: e.target.value })}
                    placeholder="Chẩn đoán xác định hoặc sơ bộ của bác sĩ..."
                  />
                </div>

                <div className="soap-field-group">
                  <label className="soap-field-label">
                    <span className="soap-badge-label a">ICD-10</span>
                    Mã bệnh đề xuất (Bộ Y tế):
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="soap-field-input"
                      style={{ width: '90px', fontWeight: 700, color: '#047857' }}
                      value={soapEditState.icd10Code}
                      onChange={e => setSoapEditState({ ...soapEditState, icd10Code: e.target.value })}
                      placeholder="Mã ICD"
                    />
                    <input
                      type="text"
                      className="soap-field-input"
                      style={{ flex: 1 }}
                      value={soapEditState.icd10Name}
                      onChange={e => setSoapEditState({ ...soapEditState, icd10Name: e.target.value })}
                      placeholder="Tên bệnh lý theo danh mục Bộ Y tế"
                    />
                  </div>
                </div>
              </div>

              {/* P: Phác đồ điều trị */}
              <div className="soap-field-group">
                <label className="soap-field-label">
                  <span className="soap-badge-label p">P</span>
                  Phác đồ điều trị & Dặn dò theo dõi (Plan):
                </label>
                <textarea
                  className="soap-field-textarea"
                  rows={3}
                  value={soapEditState.plan}
                  onChange={e => setSoapEditState({ ...soapEditState, plan: e.target.value })}
                  placeholder="Kế hoạch dùng thuốc, chế độ dinh dưỡng, tái khám..."
                />
              </div>

              {/* Đơn thuốc dự thảo */}
              <div className="soap-field-group">
                <label className="soap-field-label">
                  <span className="soap-badge-label rx">ĐƠN THUỐC</span>
                  Toa thuốc dự thảo (Thuốc, hàm lượng, liều dùng):
                </label>
                <textarea
                  className="soap-field-textarea"
                  style={{ fontFamily: 'monospace', fontSize: '11.5px', background: '#fafafa' }}
                  rows={4}
                  value={soapEditState.prescriptionDraft}
                  onChange={e => setSoapEditState({ ...soapEditState, prescriptionDraft: e.target.value })}
                  placeholder="1. Paracetamol 500mg - Uống 1 viên khi sốt > 38.5 độ..."
                />
              </div>

              {/* Tiền sử dị ứng */}
              <div className="soap-field-group">
                <label className="soap-field-label">
                  <span className="soap-badge-label warn">DỊ ỨNG</span>
                  Cảnh báo tiền sử dị ứng thuốc & Chống chỉ định:
                </label>
                <input
                  type="text"
                  className="soap-field-input"
                  value={soapEditState.allergiesWarning}
                  onChange={e => setSoapEditState({ ...soapEditState, allergiesWarning: e.target.value })}
                  placeholder="Ghi nhận tiền sử dị ứng thuốc hoặc 'Không ghi nhận'..."
                />
              </div>
            </div>

            <div className="soap-modal-footer">
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={handleResetOriginalSoap}
                title="Khôi phục lại nội dung gốc được sinh bởi AI"
              >
                <RefreshCw size={14} /> Nạp lại bản gốc từ AI
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-modal-close"
                  onClick={() => setShowSoapModal(false)}
                >
                  <X size={15} /> Hủy bỏ / Đóng
                </button>
                <button
                  type="button"
                  className="btn-modal-primary"
                  onClick={handleConfirmApplySoapModal}
                >
                  <FileCheck size={16} /> Xác nhận & Đưa vào Phiếu khám EMR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xem Phiếu khám lâm sàng hoàn chỉnh */}
      {showClinicalSheetModal && (
        <MedicalRecordModal
          appointmentId={appointment.id}
          onClose={() => setShowClinicalSheetModal(false)}
        />
      )}

      {/* Modal xác nhận hoàn tất buổi khám */}
      {showConfirmModal && (
        <div className="modal-backdrop">
          <div className="modal confirm-modal">
            <div className="modal-icon">
              <CheckCircle2 size={36} color="#16a34a" />
            </div>
            <h3>Xác nhận hoàn tất buổi khám?</h3>
            <p>
              Khi xác nhận, <strong>hồ sơ bệnh án lâm sàng sẽ được khóa an toàn</strong> theo quy định lưu trữ bệnh án điện tử và phòng gọi sẽ kết thúc. Bạn vẫn có thể xem lại bệnh án bất kỳ lúc nào.
            </p>
            <div className="confirm-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="btn-modal-close" onClick={() => setShowConfirmModal(false)}>
                <X size={15} /> Hủy bỏ / Tiếp tục khám
              </button>
              <button className="btn-modal-primary" onClick={handleComplete}>
                <CheckCircle2 size={16} /> Xác nhận & Khóa bệnh án
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BUỒNG ĐỌC PHIM DICOM (OHIF VIEWER) TÍCH HỢP AI MEDGEMMA 3 CLINICAL */}
      {/* ========================================================================= */}
      {showOhifModal && selectedStudy && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#090d16',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Top Bar of OHIF & AI MedGemma Viewer */}
          <div style={{
            height: '52px',
            background: '#0f172a',
            borderBottom: '1px solid #1e293b',
            padding: '0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#ffffff'
          }}>
            {/* Title & Study info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>
                  OHIF Viewer v3
                </span>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                  {selectedStudy.description || selectedStudy.body_part || 'X-quang Tim Phổi Thẳng (Chest CR / CT)'}
                </span>
              </div>
              <span style={{ fontSize: '11px', background: '#064e3b', color: '#34d399', border: '1px solid #059669', padding: '3px 10px', borderRadius: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} /> AI MedGemma 3 Vision
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={handleAnalyzePacs}
                disabled={analyzingPacs}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '7px 15px',
                  fontSize: '12.5px',
                  fontWeight: 800,
                  cursor: analyzingPacs ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.35)'
                }}
              >
                <Sparkles size={14} className={analyzingPacs ? 'spin-icon' : ''} />
                {analyzingPacs ? 'AI MedGemma đang đọc phim...' : '🧠 AI MedGemma Đọc Phim'}
              </button>

              {pacsAiResult && (
                <button
                  type="button"
                  onClick={() => {
                    handleApplyImagingImpression(selectedStudy)
                    setToast('Đã đưa kết luận AI MedGemma vào Bệnh án EMR!')
                  }}
                  style={{
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CheckCircle2 size={13} />
                  Đưa vào Bệnh án EMR
                </button>
              )}

              <button
                type="button"
                onClick={() => window.open(selectedStudy.viewer_url, '_blank')}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  color: '#cbd5e1',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Mở toàn màn hình ra tab trình duyệt mới"
              >
                <ExternalLink size={13} /> Mở tab riêng
              </button>

              <button
                type="button"
                onClick={() => setShowOhifModal(false)}
                style={{
                  background: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Đóng buồng đọc phim"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main Content Area: OHIF iFrame on Left, AI MedGemma Drawer on Right */}
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
            {/* OHIF Viewer iFrame */}
            <div style={{ flex: 1, height: '100%', background: '#000000', position: 'relative' }}>
              <iframe
                src={selectedStudy.viewer_url}
                title="OHIF DICOM Viewer"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            {/* AI MedGemma 3 Diagnostic Panel on Right */}
            <div style={{
              width: '400px',
              background: '#0f172a',
              borderLeft: '1px solid #1e293b',
              color: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto'
            }}>
              {/* Panel Header */}
              <div style={{ padding: '16px', borderBottom: '1px solid #1e293b', background: '#1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} color="#34d399" />
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                    Trợ Lý AI MedGemma 3 Đọc Phim
                  </h4>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: '#94a3b8' }}>
                  Mô hình: MedGemma 3 Clinical (27B Vision - Google DeepMind)
                </p>
              </div>

              {/* Panel Body */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                {analyzingPacs ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: '#94a3b8' }}>
                    <RefreshCw size={28} className="spin-icon" style={{ color: '#10b981', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>AI MedGemma đang quét phim DICOM...</div>
                    <div style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.5 }}>
                      Đang nhận diện nhu mô phổi, bóng tim, góc sườn hoành, khung xương và dị vật cản quang...
                    </div>
                  </div>
                ) : pacsAiResult ? (
                  <>
                    {/* Trạng thái tổn thương */}
                    <div style={{
                      background: pacsAiResult.abnormal ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      border: `1px solid ${pacsAiResult.abnormal ? '#ef4444' : '#10b981'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: pacsAiResult.abnormal ? '#fca5a5' : '#6ee7b7' }}>
                        {pacsAiResult.abnormal ? '⚠️ Nghi ngờ có tổn thương' : '✓ Trong giới hạn bình thường'}
                      </span>
                      <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', color: '#fff' }}>
                        Độ tin cậy: {Math.round((1 - pacsAiResult.abnormality_score) * 100)}%
                      </span>
                    </div>

                    {/* Mô tả giải phẫu & tổn thương */}
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Phát hiện từ hình ảnh (Findings):
                      </label>
                      <div style={{
                        background: '#1e293b',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '12.5px',
                        lineHeight: 1.6,
                        color: '#e2e8f0',
                        marginTop: '6px',
                        whiteSpace: 'pre-line'
                      }}>
                        {pacsAiResult.finding}
                      </div>
                    </div>

                    {/* Kết luận chẩn đoán */}
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Kết luận AI (Impression):
                      </label>
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderLeft: '3px solid #10b981',
                        borderRadius: '0 8px 8px 0',
                        padding: '10px 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#ffffff',
                        marginTop: '6px'
                      }}>
                        {pacsAiResult.impression}
                      </div>
                    </div>

                    {/* Vùng giải phẫu được quét */}
                    {pacsAiResult.annotated_regions && pacsAiResult.annotated_regions.length > 0 && (
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#cbd5e1' }}>
                          Vùng giải phẫu đã rà soát:
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {pacsAiResult.annotated_regions.map((reg: any, i: number) => (
                            <span
                              key={i}
                              style={{
                                background: reg.status === 'benign_artifact' ? '#334155' : 'rgba(56, 189, 248, 0.15)',
                                color: reg.status === 'benign_artifact' ? '#fde047' : '#38bdf8',
                                border: '1px solid rgba(255,255,255,0.1)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px'
                              }}
                            >
                              📍 {reg.label} ({Math.round(reg.confidence * 100)}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Khuyến nghị lâm sàng */}
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#f59e0b' }}>
                        Khuyến nghị lâm sàng:
                      </label>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {pacsAiResult.recommendation}
                      </p>
                    </div>

                    {/* Nút hành động đưa vào bệnh án */}
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyImagingImpression(selectedStudy)
                        setToast('Đã đưa kết luận AI MedGemma vào Phiếu khám EMR!')
                      }}
                      style={{
                        marginTop: 'auto',
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '11px',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(5,150,105,0.3)'
                      }}
                    >
                      <CheckCircle2 size={16} />
                      Đưa Kết Luận Vào Phiếu Khám EMR
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 12px', color: '#94a3b8' }}>
                    <Sparkles size={32} color="#10b981" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#f8fafc' }}>Chưa chạy phân tích AI</div>
                    <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: 1.5 }}>
                      Bấm nút <strong>"AI MedGemma Đọc Phim"</strong> ở trên để AI tự động quét tổn thương trên phim này.
                    </p>
                    <button
                      type="button"
                      onClick={handleAnalyzePacs}
                      style={{
                        marginTop: '16px',
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        fontWeight: 700,
                        fontSize: '12.5px',
                        cursor: 'pointer'
                      }}
                    >
                      🧠 Chạy Phân Tích Ngay
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
)
}
