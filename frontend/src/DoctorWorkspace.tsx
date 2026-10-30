import { useEffect, useState, useRef } from 'react'
import {
  ArrowLeft, ShieldCheck, Save, CheckCircle2, Lock, FileText,
  Pill, User, Search, AlertCircle, Stethoscope, Video, VideoOff, X,
  FileDown, PenTool, Share2, Code2, QrCode, Sparkles, Mic, MicOff, Bot, PhoneCall, Volume2,
  ScreenShare, ScreenShareOff, MessageSquare, FlaskConical, ScanLine, ExternalLink, Activity
} from 'lucide-react'
import {
  type Appointment, type User as CurrentUser, type ICD10Item,
  request, getClinicalRecord, saveClinicalRecord, savePrescription,
  completeConsultation, searchICD10, signDocumentSmartCA,
  syncNationalPrescription, downloadMedicalRecordPdf, getFhirBundle,
  generateAiScribeSoap, callPatient,
  getAppointmentLabResults, getAppointmentPacsStudies,
  type LabResultsData, type PACSStudiesData, type PACSStudy
} from './api'
import { webrtcService, type WebRTCState } from './webrtcService'
import { ConsultationChat } from './ConsultationChat'
import { PrescriptionBuilder } from './PrescriptionBuilder'

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
  const [activeTab, setActiveTab] = useState<'record' | 'ai_scribe' | 'chat' | 'lab' | 'pacs' | 'prescription' | 'patient_info' | 'fhir'>('record')
  const [unreadChatCount, setUnreadChatCount] = useState(0)

  // Cận lâm sàng & PACS cho từng bệnh nhân
  const [labData, setLabData] = useState<LabResultsData | null>(null)
  const [pacsData, setPacsData] = useState<PACSStudiesData | null>(null)
  const [loadingLab, setLoadingLab] = useState(false)
  const [loadingPacs, setLoadingPacs] = useState(false)
  const [labCategoryFilter, setLabCategoryFilter] = useState<string>('all')
  const [pacsModalityFilter, setPacsModalityFilter] = useState<string>('all')
  
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
            <h2>{patientData?.full_name || 'Bệnh nhân'}</h2>
            <span className="sub-text">
              SĐT: {patientData?.phone_number || 'Chưa cập nhật'} · Mã BN: {patientData?.external_patient_id || `P-${appointment.patient_id}`}
            </span>
          </div>
        </div>

        <div className="workspace-header-actions">
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
                  <label>3. Chẩn đoán sơ bộ & Mã bệnh ICD-10 (Bộ Y tế)</label>
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
                    <label>Số điện thoại:</label>
                    <b>{patientData?.phone_number || 'Chưa cập nhật'}</b>
                  </div>
                  <div>
                    <label>Mã hồ sơ (PID):</label>
                    <b>{patientData?.external_patient_id || `VN-P00${appointment.patient_id}`}</b>
                  </div>
                  <div>
                    <label>Thời gian đặt khám:</label>
                    <b>{new Date(appointment.starts_at).toLocaleString('vi-VN')}</b>
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

                          {report.conclusion && (
                            <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '6px', borderLeft: '3px solid #0f766e', fontSize: '12px' }}>
                              <strong style={{ color: '#0f766e' }}>Kết luận của Khoa Xét nghiệm:</strong> {report.conclusion}
                            </div>
                          )}
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
