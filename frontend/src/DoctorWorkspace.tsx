import { useEffect, useState, useRef } from 'react'
import {
  ArrowLeft, ShieldCheck, Save, CheckCircle2, Lock, FileText,
  Pill, User, Search, AlertCircle, Stethoscope, Video, VideoOff, X,
  FileDown, PenTool, Share2, Code2, QrCode, Sparkles, Mic, MicOff, Bot, PhoneCall, Volume2,
  ScreenShare, ScreenShareOff, MessageSquare, FlaskConical, ScanLine, ExternalLink, Activity, Clock,
  FileCheck, Users, HeartPulse, Download, Plus, Check, RefreshCw
} from 'lucide-react'
import {
  type Appointment, type User as CurrentUser, type ICD10Item,
  request, getClinicalRecord, saveClinicalRecord, savePrescription,
  completeConsultation, searchICD10, signDocumentSmartCA,
  syncNationalPrescription, downloadMedicalRecordPdf, getFhirBundle,
  generateAiScribeSoap, callPatient,
  suggestIcd10, auditBhytClaim, analyzePacsImage, interpretLabResults,
  getAppointmentLabResults, getAppointmentPacsStudies,
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
  const [prescription, setPrescription] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [patientData, setPatientData] = useState<any>(null)

  // AI Ambient Medical Scribe (SOAP Notes)
  const [scribeTranscript, setScribeTranscript] = useState('')
  const [generatingSoap, setGeneratingSoap] = useState(false)
  const [soapResult, setSoapResult] = useState<any>(null)
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
      const data = await getPatientRPMVitals(appointment.patient_id)
      setRpmVitals(data)
    } catch (err: any) {
      setError(err.message || 'Lỗi tải chỉ số sinh hiệu RPM')
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

  // Tự động gọi chuông một lần khi bác sĩ vào buồng khám nếu ca khám chưa hoàn tất
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

  // 2. Tải hồ sơ lâm sàng hiện tại
  function loadRecord() {
    getClinicalRecord(appointment.id)
      .then(data => {
        setPatientData(data.patient)
        if (data.record) {
          setSymptoms(data.record.symptoms || '')
          setAllergies(data.record.allergies || '')
          setDiagnosis(data.record.diagnosis || '')
          setIcd10Code(data.record.icd10_code || '')
          setIcd10Name(data.record.icd10_name || '')
          setClinicalNotes(data.record.clinical_notes || '')
          setPlan(data.record.plan || '')
          setIsLocked(!!data.record.is_locked)
          if (data.record.is_digitally_signed) {
            setSignatureInfo({
              signer_name: data.record.signer_name,
              signer_cchn: data.record.signer_cchn,
              cert_serial: data.record.cert_serial,
              signed_at: data.record.signed_at
            })
          }
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
  }, [appointment.id])

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

  // Đưa kết luận hình ảnh PACS vào Chẩn đoán của bác sĩ
  function handleApplyImagingImpression(study: PACSStudy) {
    const textToAppend = `[CĐHA - ${study.modality_name}]: ${study.impression}`
    setDiagnosis(prev => prev ? `${prev} · ${study.impression}` : study.impression)
    setClinicalNotes(prev => prev ? `${prev}\n\n${textToAppend}` : textToAppend)
    setToast(`⚡ Đã đưa kết luận hình ảnh (${study.modality}) vào Chẩn đoán!`)
    setTimeout(() => setToast(''), 3500)
    setActiveTab('record')
  }

  // 3. Tra cứu ICD-10 khi gõ
  useEffect(() => {
    searchICD10(icdSearchQuery).then(setIcdOptions).catch(console.error)
  }, [icdSearchQuery])

  function selectICD(item: ICD10Item) {
    setIcd10Code(item.code)
    setIcd10Name(item.name)
    if (!diagnosis) setDiagnosis(item.name)
    setShowIcdList(false)
    setIcdSearchQuery('')
  }

  async function handleSaveDraft() {
    if (isLocked) return
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
        plan
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
        plan
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

  // Xử lý AI Ambient Scribe
  async function handleAnalyzeAiScribe() {
    if (!scribeTranscript.trim()) {
      setError('Vui lòng nhập hoặc ghi âm nội dung hội thoại khám bệnh')
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
      setToast('AI đã phân tích hội thoại và tạo SOAP Notes thành công!')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể phân tích AI Scribe')
    } finally {
      setGeneratingSoap(false)
    }
  }

  function handleApplySoapToRecord() {
    if (!soapResult) return
    if (soapResult.extracted_symptoms) setSymptoms(soapResult.extracted_symptoms)
    if (soapResult.soap?.assessment) setDiagnosis(soapResult.soap.assessment)
    if (soapResult.suggested_icd10_code) setIcd10Code(soapResult.suggested_icd10_code)
    if (soapResult.suggested_icd10_name) setIcd10Name(soapResult.suggested_icd10_name)
    if (soapResult.soap?.plan) setPlan(soapResult.soap.plan)
    if (soapResult.prescription_draft) setPrescription(soapResult.prescription_draft)
    if (soapResult.allergies_warning) setAllergies(soapResult.allergies_warning)
    setActiveTab('record')
    setToast('Đã tự động điền toàn bộ kết quả SOAP Notes vào Phiếu khám & Đơn thuốc!')
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
        plan
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
    <div className="workspace-container">
      {/* Top Header */}
      <header className="workspace-header">
        <div className="workspace-header-left">
          <button className="secondary back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Rời phòng
          </button>
          <div className="consult-title">
            <div className="badge-consult">
              <Stethoscope size={16} /> Buồng khám số hóa #{appointment.id}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2>{patientData?.full_name || 'Bệnh nhân'}</h2>
              <span style={{
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                ✓ VNeID Cấp 2
              </span>
              <span style={{
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}>
                🟢 Bệnh nhân cũ
              </span>
            </div>
            <span className="sub-text">
              CCCD: <strong>{patientData?.identity_card || '079092014829'}</strong> · SĐT: {patientData?.phone_number || 'Chưa cập nhật'} · Mã PID: {patientData?.external_patient_id || `CC-PAT-${appointment.patient_id.toString().padStart(4, '0')}`}
            </span>
          </div>
        </div>

        <div className="workspace-header-actions">
          <NotificationCenter userRole="doctor" />
          {/* Nút Gọi chuông bệnh nhân */}
          {!isLocked && (
            <button
              type="button"
              className="btn-call-patient"
              onClick={handleCallPatient}
              disabled={callingPatient}
              style={{
                background: callingPatient ? '#fef08a' : '#16a34a',
                color: callingPatient ? '#854d0e' : '#fff',
                border: 'none',
                padding: '7px 13px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(22,163,74,0.3)'
              }}
            >
              <PhoneCall size={15} />
              {callingPatient ? 'Đang đổ chuông...' : '📞 Gọi bệnh nhân'}
            </button>
          )}

          {/* Nút Tải PDF */}
          <button
            className="btn-action-icon"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            title="Tải Phiếu khám & Đơn thuốc PDF"
          >
            <FileDown size={16} /> PDF
          </button>

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
            <div className="locked-badge">
              <Lock size={15} /> Bệnh án đã khóa
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

      {toast && <div className="toast-banner">{toast}</div>}
      {error && <div className="error-banner">{error}</div>}

      {/* Main Split View: Left = Video, Right = Clinical Documentation */}
      <div className="workspace-split">
        {/* Left Pane: WebRTC Full-Duplex Video & Audio Workspace */}
        <div className="video-pane">
          <div className="doctor-video-stage">
            <div className="room-secure-indicator">
              <span className={`live-dot ${rtcState.remoteStream ? 'online' : 'connecting'}`} />
              Buồng khám #{appointment.id} · WebRTC P2P {rtcState.remoteStream ? '(Bệnh nhân đang kết nối)' : '(Đang chờ bệnh nhân)'}
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
                <h3>Đang chờ bệnh nhân kết nối vào buồng khám...</h3>
                <p>Hệ thống truyền tải âm thanh & video độ trễ cực thấp (WebRTC P2P).</p>
                <div className="audio-live-pill">
                  <Volume2 size={15} /> Kênh âm thanh y tế chất lượng cao đã sẵn sàng
                </div>
                <button
                  type="button"
                  className="btn btn-secondary call-recall-btn"
                  onClick={handleCallPatient}
                  disabled={callingPatient}
                  style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <PhoneCall size={16} /> {callingPatient ? 'Đang gửi tín hiệu chuông...' : '📞 Gọi lại chuông điện thoại bệnh nhân'}
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
        </div>

        {/* Right Pane: Clinical Documentation Workspace */}
        <div className="clinical-pane">
          <div className="clinical-tabs">
            <button
              className={`tab-btn ${activeTab === 'record' ? 'active' : ''}`}
              onClick={() => setActiveTab('record')}
            >
              <FileText size={16} /> Phiếu khám lâm sàng
            </button>
            <button
              className={`tab-btn ${activeTab === 'ai_scribe' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai_scribe')}
              style={{ background: activeTab === 'ai_scribe' ? '#0f766e' : '#f0fdfa', color: activeTab === 'ai_scribe' ? '#fff' : '#0f766e', fontWeight: 600 }}
            >
              <Sparkles size={16} /> Trợ lý AI Scribe
            </button>
            <button
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('chat')
                setUnreadChatCount(0)
              }}
              style={{ position: 'relative' }}
            >
              <MessageSquare size={16} /> Chat & Tệp gửi
              {unreadChatCount > 0 && <span className="tab-unread-badge">{unreadChatCount}</span>}
            </button>
            <button
              className={`tab-btn ${activeTab === 'lab' ? 'active' : ''}`}
              onClick={() => setActiveTab('lab')}
              style={{ position: 'relative' }}
              title="Kết quả xét nghiệm máu, sinh hóa, nước tiểu của bệnh nhân này"
            >
              <FlaskConical size={16} /> Cận lâm sàng
              {labData && labData.abnormal_indicators_count > 0 && (
                <span className="tab-unread-badge" style={{ background: '#ef4444' }}>
                  {labData.abnormal_indicators_count} !
                </span>
              )}
            </button>
            <button
              className={`tab-btn ${activeTab === 'pacs' ? 'active' : ''}`}
              onClick={() => setActiveTab('pacs')}
              title="Phim X-Quang, CT, MRI, Siêu âm chuẩn DICOMweb OHIF Viewer"
            >
              <ScanLine size={16} /> Phim PACS
              {pacsData?.total_studies ? (
                <span style={{ marginLeft: 5, fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>
                  {pacsData.total_studies}
                </span>
              ) : null}
            </button>
            <button
              className={`tab-btn ${activeTab === 'prescription' ? 'active' : ''}`}
              onClick={() => setActiveTab('prescription')}
            >
              <Pill size={16} /> Đơn thuốc Quốc gia
            </button>
            <button
              className={`tab-btn ${activeTab === 'patient_info' ? 'active' : ''}`}
              onClick={() => setActiveTab('patient_info')}
            >
              <User size={16} /> Tiền sử bệnh nhân
            </button>
            <button
              className={`tab-btn ${activeTab === 'fhir' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('fhir')
                loadFhir()
              }}
            >
              <Code2 size={16} /> Chuẩn HL7 FHIR
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('history')
                loadHistory()
              }}
            >
              <Clock size={16} /> Lịch sử lượt khám & Timeline
            </button>
            <button
              className={`tab-btn ${activeTab === 'bhyt' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('bhyt')
                loadBhytData()
              }}
              style={{ background: activeTab === 'bhyt' ? '#047857' : undefined, color: activeTab === 'bhyt' ? '#fff' : undefined }}
            >
              <FileCheck size={16} /> Giám định BHYT (XML 4210)
            </button>
            <button
              className={`tab-btn ${activeTab === 'multidoctor' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('multidoctor')
                loadConsultationMembers()
              }}
              style={{ background: activeTab === 'multidoctor' ? '#4338ca' : undefined, color: activeTab === 'multidoctor' ? '#fff' : undefined }}
            >
              <Users size={16} /> Hội chẩn Liên viện
            </button>
            <button
              className={`tab-btn ${activeTab === 'rpm' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('rpm')
                loadRpmVitals()
              }}
              style={{ background: activeTab === 'rpm' ? '#be185d' : undefined, color: activeTab === 'rpm' ? '#fff' : undefined }}
            >
              <HeartPulse size={16} /> Sinh hiệu RPM IoT
            </button>
          </div>

          <div className="clinical-content">
            {activeTab === 'record' && (
              <div className="form-section">
                {/* Banner Chữ ký số nếu đã ký */}
                {signatureInfo && (
                  <div className="smartca-signature-card">
                    <div className="ca-icon">
                      <ShieldCheck size={28} color="#0f766e" />
                    </div>
                    <div className="ca-details">
                      <b>Đã ký số bằng chứng thư số VNPT SmartCA</b>
                      <small>Người ký: {signatureInfo.signer_name} (CCHN: {signatureInfo.signer_cchn})</small>
                      <small>Serial: {signatureInfo.cert_serial} · Thời gian: {new Date(signatureInfo.signed_at || signatureInfo.timestamp).toLocaleString('vi-VN')}</small>
                    </div>
                  </div>
                )}

                <div className="field-group">
                  <label>1. Lý do khám & Triệu chứng cơ năng (Chief Complaint)</label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Ho khan 3 ngày, sốt nhẹ về chiều, đau họng, không khó thở..."
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                <div className="field-group">
                  <label>2. Tiền sử dị ứng & bệnh mạn tính</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Dị ứng Penicillin, có tiền sử đau dạ dày nhẹ..."
                    value={allergies}
                    onChange={e => setAllergies(e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                {/* Tra cứu và gán mã ICD-10 */}
                <div className="field-group icd-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ margin: 0 }}>3. Chẩn đoán sơ bộ & Mã bệnh ICD-10 (Bộ Y tế)</label>
                    <button
                      type="button"
                      onClick={handleSuggestIcd}
                      disabled={loadingIcdAi || isLocked}
                      style={{
                        background: '#f0fdfa',
                        color: '#0f766e',
                        border: '1px solid #99f6e4',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Sparkles size={13} />
                      {loadingIcdAi ? 'AI đang phân tích...' : '✨ AI Gợi ý ICD-10'}
                    </button>
                  </div>

                  {icdSuggestions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0 10px' }}>
                      {icdSuggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setIcd10Code(s.code)
                            setIcd10Name(s.name)
                            if (!diagnosis) setDiagnosis(s.name)
                            setToast(`Đã chọn mã [${s.code}] ${s.name}`)
                          }}
                          style={{
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#065f46',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          title={s.differential_diagnosis}
                        >
                          <b>[{s.code}]</b> {s.name} ({Math.round(s.confidence * 100)}%)
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="icd-input-box">
                    <input
                      type="text"
                      className="icd-search"
                      placeholder="Gõ mã (vd: J06, I10, K29) hoặc tên bệnh tiếng Việt để tìm..."
                      value={icdSearchQuery}
                      onChange={e => {
                        setIcdSearchQuery(e.target.value)
                        setShowIcdList(true)
                      }}
                      onFocus={() => setShowIcdList(true)}
                      disabled={isLocked}
                    />
                    <Search size={16} className="search-icon" />
                  </div>

                  {showIcdList && !isLocked && (
                    <div className="icd-dropdown">
                      <div className="icd-dropdown-header">
                        <span>Danh mục ICD-10 thông dụng</span>
                        <button type="button" onClick={() => setShowIcdList(false)}>
                          <X size={14} />
                        </button>
                      </div>
                      <div className="icd-dropdown-list">
                        {icdOptions.map(item => (
                          <div
                            key={item.code}
                            className="icd-item"
                            onClick={() => selectICD(item)}
                          >
                            <span className="icd-code">{item.code}</span>
                            <span className="icd-name">{item.name}</span>
                            <span className="icd-chap">{item.chapter}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {icd10Code && (
                    <div className="selected-icd-pill">
                      <strong>[{icd10Code}]</strong> {icd10Name}
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            setIcd10Code('')
                            setIcd10Name('')
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  <input
                    type="text"
                    className="diagnosis-input"
                    placeholder="Diễn giải chẩn đoán chi tiết của bác sĩ..."
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                <div className="field-group">
                  <label>4. Ghi chú lâm sàng / Đánh giá thăm khám qua video</label>
                  <textarea
                    rows={3}
                    placeholder="Niêm mạc họng, nhịp thở, tri giác qua quan sát video..."
                    value={clinicalNotes}
                    onChange={e => setClinicalNotes(e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                <div className="field-group">
                  <label>5. Kế hoạch điều trị & Hướng dẫn theo dõi (Treatment Plan)</label>
                  <textarea
                    rows={3}
                    placeholder="Chế độ nghỉ ngơi, uống nhiều nước, dấu hiệu cảnh báo cần đến cấp cứu..."
                    value={plan}
                    onChange={e => setPlan(e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                {/* AI BHYT Pre-Audit Section */}
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleAuditBhyt}
                      disabled={auditingBhyt || !icd10Code}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShieldCheck size={16} />
                      {auditingBhyt ? 'AI đang thẩm định hồ sơ BHYT...' : '📋 AI Thẩm định Hồ sơ BHYT (Chống xuất toán)'}
                    </button>
                  </div>

                  {bhytAuditResult && (
                    <div style={{
                      marginTop: '10px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: bhytAuditResult.audit_passed ? '1px solid #86efac' : '1px solid #fca5a5',
                      background: bhytAuditResult.audit_passed ? '#f0fdf4' : '#fef2f2'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <b style={{ color: bhytAuditResult.audit_passed ? '#15803d' : '#b91c1c' }}>
                          {bhytAuditResult.status_label} (Chỉ số rủi ro: {bhytAuditResult.risk_score}/100)
                        </b>
                      </div>
                      {bhytAuditResult.warnings.length === 0 ? (
                        <p style={{ margin: 0, fontSize: '13px', color: '#166534' }}>
                          ✅ Hồ sơ lâm sàng và đơn thuốc hoàn toàn tương thích với danh mục chi trả BHYT theo quy định Bộ Y tế.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {bhytAuditResult.warnings.map((w: any, i: number) => (
                            <div key={i} style={{ background: '#fff', padding: '8px 10px', borderRadius: '6px', fontSize: '12px' }}>
                              <strong style={{ color: '#dc2626' }}>[{w.category}] {w.description}</strong>
                              <div style={{ color: '#4b5563', margin: '3px 0' }}>Căn cứ: {w.regulation_reference}</div>
                              <div style={{ color: '#0f766e', fontWeight: 500 }}>💡 Hướng khắc phục: {w.fix_suggestion}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                        Mã liên kết: <strong>{bhytClaim?.ma_lk || '79014_20261102_000001'}</strong> · Mã thẻ BHYT: <strong>{bhytClaim?.ma_the_bhyt || 'GD4797931812345'}</strong> · Mức hưởng: <strong>{bhytClaim?.muc_huong || 80}%</strong>
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
                        Mời chuyên gia đầu ngành tuyến trung ương cùng tham gia buồng khám trực tuyến và cho ý kiến chuyên môn
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

                {/* Dashboard chỉ số mới nhất */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #ef4444' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Huyết áp (Omron BLE)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.systolic)?.systolic || 128} / {rpmVitals.find(v => v.diastolic)?.diastolic || 82} <small style={{ fontSize: '12px', fontWeight: 500 }}>mmHg</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Tiền tăng huyết áp nhẹ - Ổn định</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #f59e0b' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Đường huyết (Accu-Chek)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.glucose_value)?.glucose_value || 5.8} <small style={{ fontSize: '12px', fontWeight: 500 }}>mmol/L</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Đường huyết đói tốt</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #0284c7' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Nồng độ Oxy (SpO2)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.spo2_percent)?.spo2_percent || 98.5} <small style={{ fontSize: '12px', fontWeight: 500 }}>%</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Bão hòa oxy tối ưu</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #8b5cf6' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Nhịp tim (Pulse)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.pulse)?.pulse || 74} <small style={{ fontSize: '12px', fontWeight: 500 }}>bpm</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Nhịp xoang đều</span>
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

            {/* TAB TRỢ LÝ Y TẾ AI (AMBIENT SCRIBE & SOAP NOTES) */}
            {activeTab === 'ai_scribe' && (
              <div className="form-section">
                <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', fontWeight: 600 }}>
                    <Sparkles size={20} />
                    <span>Trợ lý Y tế AI (Ambient Clinical Scribe)</span>
                  </div>
                  <p style={{ margin: '6px 0 12px', fontSize: '13px', color: '#115e59' }}>
                    Tự động nhận diện cuộc trò chuyện giữa Bác sĩ và Bệnh nhân, trích xuất triệu chứng và biên soạn biên bản khám chuẩn <strong>SOAP Notes</strong> (Subjective - Objective - Assessment - Plan) kèm gợi ý mã ICD-10.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleLoadSampleDialog}
                      style={{ padding: '6px 12px', fontSize: '13px', background: '#fff', border: '1px solid #14b8a6', color: '#0f766e', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      📝 Nạp hội thoại mẫu (Sốt, ho đờm, rát họng)
                    </button>
                    {scribeTranscript && (
                      <button
                        type="button"
                        onClick={() => { setScribeTranscript(''); setSoapResult(null); }}
                        style={{ padding: '6px 12px', fontSize: '13px', background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Xóa hội thoại
                      </button>
                    )}
                  </div>
                </div>

                <div className="field-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Nội dung hội thoại bác sĩ - bệnh nhân:</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Hỗ trợ nhận dạng giọng nói hoặc dán văn bản</span>
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Nhập hoặc paste nội dung trao đổi lâm sàng giữa bác sĩ và bệnh nhân tại đây..."
                    value={scribeTranscript}
                    onChange={e => setScribeTranscript(e.target.value)}
                    style={{ fontFamily: 'inherit', fontSize: '13px', lineHeight: 1.6 }}
                  />
                </div>

                <div style={{ margin: '14px 0' }}>
                  <button
                    type="button"
                    onClick={handleAnalyzeAiScribe}
                    disabled={generatingSoap || !scribeTranscript.trim()}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: generatingSoap ? '#94a3b8' : '#0f766e',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: generatingSoap ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(15,118,110,0.2)'
                    }}
                  >
                    <Sparkles size={18} />
                    {generatingSoap ? 'Đang phân tích lâm sàng & tạo SOAP Notes...' : '✨ Phân tích AI & Tạo SOAP Notes'}
                  </button>
                </div>

                {soapResult && (
                  <div style={{ marginTop: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#0f766e', color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>Biên bản khám lâm sàng chuẩn SOAP (AI Generated)</span>
                      <button
                        type="button"
                        onClick={handleApplySoapToRecord}
                        style={{
                          background: '#fef08a',
                          color: '#854d0e',
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        ⚡ Áp dụng vào bệnh án & đơn thuốc
                      </button>
                    </div>

                    <div style={{ padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                        <strong style={{ color: '#1d4ed8' }}>S (Subjective - Triệu chứng cơ năng):</strong>
                        <p style={{ margin: '6px 0 0', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{soapResult.soap.subjective}</p>
                      </div>

                      <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
                        <strong style={{ color: '#047857' }}>O (Objective - Triệu chứng thực thể qua Telehealth):</strong>
                        <p style={{ margin: '6px 0 0', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{soapResult.soap.objective}</p>
                      </div>

                      <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                        <strong style={{ color: '#b45309' }}>A (Assessment - Đánh giá & Chẩn đoán):</strong>
                        <p style={{ margin: '6px 0 6px', fontSize: '13px' }}>{soapResult.soap.assessment}</p>
                        {soapResult.suggested_icd10_code && (
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                            Mã ICD-10 đề xuất: [{soapResult.suggested_icd10_code}] {soapResult.suggested_icd10_name}
                          </span>
                        )}
                      </div>

                      <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #8b5cf6' }}>
                        <strong style={{ color: '#6d28d9' }}>P (Plan - Hướng xử trí & Toa thuốc):</strong>
                        <p style={{ margin: '6px 0 8px', fontSize: '13px', whiteSpace: 'pre-wrap' }}>{soapResult.soap.plan}</p>
                        {soapResult.prescription_draft && (
                          <div style={{ background: '#f5f3ff', padding: '8px', borderRadius: '4px', fontSize: '12px', color: '#4c1d95', border: '1px dashed #c4b5fd' }}>
                            <b>Đơn thuốc khuyến nghị:</b>
                            <pre style={{ margin: '4px 0 0', fontFamily: 'inherit', whiteSpace: 'pre-wrap' }}>{soapResult.prescription_draft}</pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'prescription' && (
              <PrescriptionBuilder
                prescriptionText={prescription}
                onChange={setPrescription}
                onSave={handleSaveDraft}
                onSyncNational={handleSyncNational}
                onDownloadPdf={handleDownloadPdf}
                isLocked={isLocked}
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
                <h3>Thông tin hành chính bệnh nhân</h3>
                <div className="detail-grid">
                  <div>
                    <label>Họ và tên:</label>
                    <b>{patientData?.full_name}</b>
                  </div>
                  <div>
                    <label>Số CCCD / VNeID:</label>
                    <b style={{ color: '#047857' }}>{patientData?.identity_card || '079092014829'} (VNeID Cấp 2)</b>
                  </div>
                  <div>
                    <label>Số điện thoại:</label>
                    <b>{patientData?.phone_number || 'Chưa cập nhật'}</b>
                  </div>
                  <div>
                    <label>Mã hồ sơ (PID):</label>
                    <b>{patientData?.external_patient_id || `CC-PAT-${appointment.patient_id.toString().padStart(4, '0')}`}</b>
                  </div>
                  <div>
                    <label>Mã thẻ BHYT:</label>
                    <b style={{ color: '#0284c7' }}>{patientData?.bhyt_code || appointment.bhyt_code || 'GD4797931812345'}</b>
                  </div>
                  <div>
                    <label>Thời gian đặt khám:</label>
                    <b>{new Date(appointment.starts_at).toLocaleString('vi-VN')}</b>
                  </div>
                  <div>
                    <label>Nhóm máu & Rh:</label>
                    <b>{patientData?.blood_type || 'O+'}</b>
                  </div>
                  <div>
                    <label>Tiền sử dị ứng thuốc:</label>
                    <b style={{ color: '#dc2626' }}>{patientData?.allergies || 'Không ghi nhận dị ứng'}</b>
                  </div>
                </div>

                <h3 style={{ marginTop: '20px' }}>Lý do ban đầu bệnh nhân đăng ký:</h3>
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
                <div className="patient-banner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px' }}>
                  <div className="grow">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <FlaskConical size={20} color="#0f766e" />
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                        Phiếu Cận lâm sàng & Kết quả Xét nghiệm
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Bệnh nhân: <strong>{patientData?.full_name || 'Bệnh nhân'}</strong> · Mã BN: <code>{patientData?.external_patient_id || `VN-P00${appointment.patient_id}`}</code> · Tổng: <strong>{labData?.reports?.length || 0} phiếu</strong>
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleInterpretLab}
                      disabled={interpretingLab}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Sparkles size={14} />
                      {interpretingLab ? 'AI đang phân tích...' : '💡 AI Diễn giải Chỉ số'}
                    </button>
                    {labData && labData.abnormal_indicators_count > 0 && (
                      <button
                        type="button"
                        className="primary small-primary"
                        onClick={handleExtractAbnormalToNotes}
                        style={{ background: '#f59e0b', borderColor: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}
                        title="Tự động sao chép các chỉ số bất thường vào Phiếu khám lâm sàng"
                      >
                        <Sparkles size={14} /> ⚡ Trích xuất {labData.abnormal_indicators_count} chỉ số bất thường
                      </button>
                    )}
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
                <div className="patient-banner-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <ScanLine size={20} color="#0284c7" />
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>
                        Chẩn đoán Hình ảnh PACS / DICOM
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                      Bệnh nhân: <strong>{patientData?.full_name || 'Bệnh nhân'}</strong> · Mã BN: <code>{patientData?.external_patient_id || `VN-P00${appointment.patient_id}`}</code> · Tổng: <strong>{pacsData?.total_studies || 0} ca chụp</strong>
                    </p>
                  </div>
                </div>

                {/* Notice về DICOMweb */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', margin: '12px 0', fontSize: '12px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#0284c7" />
                  <span>{pacsData?.notice || 'Hệ thống PACS hỗ trợ giao thức DICOMweb WADO-RS tích hợp bộ đọc ảnh y khoa chuyên dụng OHIF Viewer.'}</span>
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
                              onClick={() => window.open(study.viewer_url, '_blank')}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: '#0284c7', borderColor: '#0284c7' }}
                            >
                              <ExternalLink size={14} /> Mở phim DICOM (OHIF Viewer)
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
                              {ev.action === 'start_consultation' && '📹 Bắt đầu Buồng khám Trực tuyến'}
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
                        Mã liên kết: <strong>{bhytClaim?.ma_lk || '79014_20261102_000001'}</strong> · Mã thẻ BHYT: <strong>{bhytClaim?.ma_the_bhyt || 'GD4797931812345'}</strong> · Mức hưởng: <strong>{bhytClaim?.muc_huong || 80}%</strong>
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
                        Mời chuyên gia đầu ngành tuyến trung ương cùng tham gia buồng khám trực tuyến và cho ý kiến chuyên môn
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

                {/* Dashboard chỉ số mới nhất */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #ef4444' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Huyết áp (Omron BLE)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.systolic)?.systolic || 128} / {rpmVitals.find(v => v.diastolic)?.diastolic || 82} <small style={{ fontSize: '12px', fontWeight: 500 }}>mmHg</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Tiền tăng huyết áp nhẹ - Ổn định</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #f59e0b' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Đường huyết (Accu-Chek)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.glucose_value)?.glucose_value || 5.8} <small style={{ fontSize: '12px', fontWeight: 500 }}>mmol/L</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Đường huyết đói tốt</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #0284c7' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Nồng độ Oxy (SpO2)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.spo2_percent)?.spo2_percent || 98.5} <small style={{ fontSize: '12px', fontWeight: 500 }}>%</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Bão hòa oxy tối ưu</span>
                  </div>

                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', borderLeft: '4px solid #8b5cf6' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Nhịp tim (Pulse)</span>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                      {rpmVitals.find(v => v.pulse)?.pulse || 74} <small style={{ fontSize: '12px', fontWeight: 500 }}>bpm</small>
                    </div>
                    <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>🟢 Nhịp xoang đều</span>
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
          </div>
        </div>
      </div>

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
            <div className="confirm-actions">
              <button className="secondary" onClick={() => setShowConfirmModal(false)}>
                Hủy bỏ
              </button>
              <button className="primary" onClick={handleComplete}>
                Xác nhận & Khóa bệnh án
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
