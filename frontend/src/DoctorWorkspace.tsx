import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react'
import '@livekit/components-styles'
import {
  ArrowLeft, ShieldCheck, Save, CheckCircle2, Lock, FileText,
  Pill, User, Search, AlertCircle, Stethoscope, Video, X,
  FileDown, PenTool, Share2, Code2, QrCode
} from 'lucide-react'
import {
  type Appointment, type User as CurrentUser, type ICD10Item,
  request, getClinicalRecord, saveClinicalRecord, savePrescription,
  completeConsultation, searchICD10, signDocumentSmartCA,
  syncNationalPrescription, downloadMedicalRecordPdf, getFhirBundle
} from './api'

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
  const [activeTab, setActiveTab] = useState<'record' | 'prescription' | 'patient_info' | 'fhir'>('record')
  
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

  // 1. Lấy token kết nối LiveKit
  useEffect(() => {
    request<{ server_url: string; token: string; room_name: string }>(
      `/api/v1/telehealth/sessions/${appointment.id}/join-token`,
      { method: 'POST' }
    )
      .then(setConnection)
      .catch(e => setError(e instanceof Error ? e.message : 'Không tạo được phòng khám trực tuyến'))
  }, [appointment.id])

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
  }, [appointment.id])

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
        {/* Left Pane: LiveKit Video Call */}
        <div className="video-pane">
          {!connection && !error && (
            <div className="video-loading-box">
              <Video size={36} className="spin" />
              <h3>Đang kết nối buồng khám trực tuyến...</h3>
              <p>Mã hóa WebRTC E2EE · Chuẩn âm thanh/hình ảnh HD y tế</p>
            </div>
          )}

          {connection && (
            <div className="livekit-box">
              <div className="room-secure-indicator">
                <span className="live-dot" /> Phòng khám bảo mật: {connection.room_name}
              </div>
              <LiveKitRoom
                video
                audio
                token={connection.token}
                serverUrl={connection.server_url}
                connect
                data-lk-theme="default"
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </div>
          )}
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

            {activeTab === 'prescription' && (
              <div className="form-section">
                {/* Thẻ hiển thị mã đơn thuốc quốc gia nếu đã đồng bộ */}
                {nationalPrescription ? (
                  <div className="national-prescription-card">
                    <div className="national-qr-wrapper">
                      <img
                        src={nationalPrescription.qr_url}
                        alt="QR Don thuoc Quoc gia"
                        className="national-qr-img"
                      />
                    </div>
                    <div className="national-details">
                      <span className="tag-national">CỔNG ĐƠN THUỐC QUỐC GIA</span>
                      <h3>{nationalPrescription.national_code}</h3>
                      <p className="tiny muted">
                        Đã phát hành theo chuẩn Thông tư 04/2022/TT-BYT. Bệnh nhân có thể quét mã tại bất kỳ nhà thuốc GPP nào trên toàn quốc.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="sync-prompt-card">
                    <div>
                      <b>Đồng bộ Đơn thuốc điện tử Quốc gia</b>
                      <p className="tiny muted">
                        Tự động cấp mã đơn quốc gia và mã QR tra cứu trên hệ thống <code>donthuocquocgia.vn</code>.
                      </p>
                    </div>
                    <button
                      className="primary"
                      onClick={handleSyncNational}
                      disabled={syncingPres}
                    >
                      <Share2 size={16} /> {syncingPres ? 'Đang đồng bộ...' : 'Đẩy lên Cổng Quốc gia'}
                    </button>
                  </div>
                )}

                <div className="field-group">
                  <label>Nội dung đơn thuốc điều trị ngoại trú</label>
                  <textarea
                    rows={10}
                    placeholder="1. Paracetamol 500mg: Uống 1 viên khi sốt > 38.5C (cách ít nhất 4-6 giờ)&#10;2. Siro ho thảo dược: Uống 5ml x 3 lần/ngày sau ăn&#10;3. Oresol 245: Pha 1 gói trong 200ml nước đun sôi để nguội, uống rải rác..."
                    value={prescription}
                    onChange={e => setPrescription(e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              </div>
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
