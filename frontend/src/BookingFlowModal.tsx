import React, { useState, useEffect } from 'react'
import {
  X,
  User as UserIcon,
  Users,
  Sparkles,
  Stethoscope,
  Clock,
  CalendarDays,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  FileSpreadsheet,
  FileCheck,
  CreditCard,
  QrCode,
  ShieldCheck,
  HelpCircle,
  Database,
  RefreshCw,
  Edit3,
  Save,
  Check,
  Phone,
  MapPin,
  HeartPulse
} from 'lucide-react'
import {
  User,
  Department,
  DoctorShift,
  Appointment,
  FamilyMemberItem,
  TriageSymptomResult,
  getFamilyMembers,
  createFamilyMember,
  getDoctorShifts,
  checkTriageSymptoms,
  getMyProfile,
  updateMyProfile,
  PatientProfile,
  request
} from './api'
import './booking-flow.css'

interface BookingFlowModalProps {
  user: User
  departments: Department[]
  doctors: { id: number; full_name: string; cchn?: string; department_id?: number }[]
  initialReason?: string
  onClose: () => void
  onSuccess: (appointment: Appointment, openQr: boolean) => void
  onError: (errorMsg: string) => void
}

interface UploadedDoc {
  id: string
  name: string
  size: string
  category: 'prescription' | 'lab' | 'imaging'
  file: File
}

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({
  user,
  departments,
  doctors,
  initialReason = '',
  onClose,
  onSuccess,
  onError
}) => {
  // Current Step: 1 -> 5
  const [currentStep, setCurrentStep] = useState<number>(1)

  // Step 1: Patient Selection (Self vs Family Member)
  const [targetType, setTargetType] = useState<'self' | 'family'>('self')
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberItem[]>([])
  const [selectedFamilyId, setSelectedFamilyId] = useState<number | null>(null)
  const [showAddFamily, setShowAddFamily] = useState(false)
  const [newFamilyData, setNewFamilyData] = useState({
    full_name: '',
    relationship: 'Con',
    gender: 'Nam',
    date_of_birth: '2015-05-10',
    national_id: '',
    bhyt_code: '',
    phone_number: ''
  })
  const [savingFamily, setSavingFamily] = useState(false)

  // Database Profile of current patient
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileEditForm, setProfileEditForm] = useState({
    identity_card: '',
    bhyt_code: '',
    phone_number: '',
    address: '',
    blood_type: '',
    allergies: '',
    medical_history_notes: '',
    companion_name: '',
    companion_phone: '',
    companion_relationship: ''
  })

  const fetchPatientProfile = async () => {
    try {
      setLoadingProfile(true)
      const data = await getMyProfile()
      setProfile(data)
      setProfileEditForm({
        identity_card: data.identity_card || user.identity_card || user.national_id || '',
        bhyt_code: data.bhyt_code || user.bhyt_code || '',
        phone_number: data.phone_number || user.phone_number || '',
        address: data.address || '',
        blood_type: data.blood_type || '',
        allergies: data.allergies || '',
        medical_history_notes: data.medical_history_notes || '',
        companion_name: data.companion_name || '',
        companion_phone: data.companion_phone || '',
        companion_relationship: data.companion_relationship || ''
      })
    } catch (err) {
      console.warn('Could not load patient profile from DB:', err)
    } finally {
      setLoadingProfile(false)
    }
  }

  useEffect(() => {
    fetchPatientProfile()
  }, [])

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const updated = await updateMyProfile(profileEditForm)
      setProfile(updated)
      setIsEditingProfile(false)
    } catch (err: any) {
      alert(err.message || 'Không thể lưu thông tin hồ sơ')
    } finally {
      setSavingProfile(false)
    }
  }

  // Step 2: Symptoms & AI MedGemma Triage
  const [symptoms, setSymptoms] = useState(initialReason || '')
  const [triageLoading, setTriageLoading] = useState(false)
  const [triageResult, setTriageResult] = useState<TriageSymptomResult | null>(null)
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({})
  const [compiledSummary, setCompiledSummary] = useState('')

  // Step 3: Department, Doctor & Anti-overload Shifts
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [doctorShifts, setDoctorShifts] = useState<DoctorShift[]>([])
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null)
  const [startsAt, setStartsAt] = useState<string>('')
  const [loadingShifts, setLoadingShifts] = useState(false)

  // Step 4: Medical Documents & Meds Upload
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([])

  // Step 5: Billing & Confirmation
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'counter'>('vietqr')
  const [submitting, setSubmitting] = useState(false)

  // Load family members on mount
  useEffect(() => {
    getFamilyMembers()
      .then(members => {
        setFamilyMembers(members)
        if (members.length > 0 && !selectedFamilyId) {
          setSelectedFamilyId(members[0].id)
        }
      })
      .catch(() => {})
  }, [])

  // Load doctor shifts when doctor selection changes
  useEffect(() => {
    if (selectedDoctorId) {
      setLoadingShifts(true)
      getDoctorShifts(Number(selectedDoctorId))
        .then(shifts => {
          setDoctorShifts(shifts)
          // Pre-select first available shift if present
          const available = shifts.find(s => !s.is_overloaded)
          if (available) {
            setSelectedShiftId(available.id)
            setStartsAt(`${available.shift_date}T${available.start_time}:00`)
          }
        })
        .catch(() => setDoctorShifts([]))
        .finally(() => setLoadingShifts(false))
    } else {
      setDoctorShifts([])
      setSelectedShiftId(null)
    }
  }, [selectedDoctorId])

  // Handle Quick Symptom Chips click
  const quickSymptoms = [
    'Sốt cao trên 38.5°C',
    'Ho kéo dài, rát họng',
    'Đau tức ngực trái',
    'Đau đầu chóng mặt',
    'Đau bụng âm ỉ từng cơn',
    'Khó thở, hụt hơi',
    'Phát ban mẩn ngứa dị ứng',
    'Mất ngủ suy nhược cơ thể'
  ]

  const handleAddSymptomChip = (chip: string) => {
    if (!symptoms.includes(chip)) {
      setSymptoms(prev => (prev ? `${prev}, ${chip}` : chip))
    }
  }

  // Handle AI MedGemma Triage
  const handleAiTriage = async () => {
    if (!symptoms.trim()) return
    setTriageLoading(true)
    try {
      // Calculate age & gender based on selected person
      let age = 35
      let gender = 'male'
      if (targetType === 'self') {
        gender = user.gender === 'Nữ' ? 'female' : 'male'
        if (user.date_of_birth) {
          const birthYear = new Date(user.date_of_birth).getFullYear()
          if (!isNaN(birthYear)) age = Math.max(1, new Date().getFullYear() - birthYear)
        }
      } else {
        const member = familyMembers.find(m => m.id === selectedFamilyId)
        if (member) {
          gender = member.gender === 'Nữ' ? 'female' : 'male'
          if (member.date_of_birth) {
            const birthYear = new Date(member.date_of_birth).getFullYear()
            if (!isNaN(birthYear)) age = Math.max(1, new Date().getFullYear() - birthYear)
          }
        }
      }

      const res = await checkTriageSymptoms(symptoms, age, gender)
      setTriageResult(res)

      // Auto-match recommended department
      if (res.recommended_department_code) {
        const matched = departments.find(
          d =>
            d.code === res.recommended_department_code ||
            d.name.toLowerCase().includes(res.recommended_department_name.toLowerCase())
        )
        if (matched) {
          setSelectedDeptId(String(matched.id))
        }
      }

      // Initialize compiled summary
      compileClinicalSummary(symptoms, res, questionAnswers)
    } catch (e) {
      console.error(e)
    } finally {
      setTriageLoading(false)
    }
  }

  // Compile summary combining original symptoms and answers to AI questions
  const compileClinicalSummary = (
    baseSymptoms: string,
    aiResult: TriageSymptomResult | null,
    answers: Record<number, string>
  ) => {
    let text = baseSymptoms
    if (aiResult?.suggested_questions && aiResult.suggested_questions.length > 0) {
      const qList: string[] = []
      aiResult.suggested_questions.forEach((q, idx) => {
        const ans = answers[idx]
        if (ans && ans.trim()) {
          qList.push(`- ${q}: ${ans.trim()}`)
        }
      })
      if (qList.length > 0) {
        text += `\n${qList.join('\n')}`
      }
    }
    setCompiledSummary(text)
  }

  // Handle inline answer to AI question
  const handleAnswerQuestion = (qIndex: number, val: string) => {
    const updated = { ...questionAnswers, [qIndex]: val }
    setQuestionAnswers(updated)
    compileClinicalSummary(symptoms, triageResult, updated)
  }

  // Handle saving new family member
  const handleSaveFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingFamily(true)
    try {
      const created = await createFamilyMember(newFamilyData)
      setFamilyMembers(prev => [...prev, created])
      setSelectedFamilyId(created.id)
      setShowAddFamily(false)
      setNewFamilyData({
        full_name: '',
        relationship: 'Con',
        gender: 'Nam',
        date_of_birth: '2015-05-10',
        national_id: '',
        bhyt_code: '',
        phone_number: ''
      })
    } catch (err) {
      onError('Không thêm được người thân. Vui lòng kiểm tra lại thông tin.')
    } finally {
      setSavingFamily(false)
    }
  }

  // Handle file upload for Step 4
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    category: 'prescription' | 'lab' | 'imaging'
  ) => {
    if (!e.target.files) return
    const files = Array.from(e.target.files)
    const newItems: UploadedDoc[] = files.map(f => ({
      id: Math.random().toString(36).substring(2, 9),
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
      category,
      file: f
    }))
    setUploadedDocs(prev => [...prev, ...newItems])
    e.target.value = ''
  }

  const handleRemoveDoc = (id: string) => {
    setUploadedDocs(prev => prev.filter(d => d.id !== id))
  }

  // Get active patient display details (Database integrated)
  const getSelectedPatientInfo = () => {
    if (targetType === 'self') {
      const activeName = profile?.full_name || user.full_name
      const activeGender = profile?.gender || user.gender || 'Nam'
      const activeDob = profile?.date_of_birth || user.date_of_birth || 'Chưa cập nhật'
      const activeIdCard = profile?.identity_card || user.identity_card || user.national_id || 'Chưa cập nhật'
      const activeBhyt = profile?.bhyt_code || user.bhyt_code || 'Chưa liên kết'
      const activePhone = profile?.phone_number || user.phone_number || 'Chưa cập nhật'
      const activeAddress = profile?.address || 'Chưa cập nhật'
      const activeBloodType = profile?.blood_type || 'Chưa xác định'
      const activeAllergies = profile?.allergies || 'Không ghi nhận'
      const activeMedicalHistory = profile?.medical_history_notes || 'Không ghi nhận tiền sử mãn tính'
      const activeCompanionName = profile?.companion_name || ''
      const activeCompanionPhone = profile?.companion_phone || ''
      const activeCompanionIdCard = profile?.companion_id_card || ''
      const activeCompanionRelationship = profile?.companion_relationship || ''

      return {
        name: activeName,
        relationship: 'Chính tôi',
        gender: activeGender,
        dob: activeDob,
        idCard: activeIdCard,
        bhyt: activeBhyt,
        phone: activePhone,
        address: activeAddress,
        bloodType: activeBloodType,
        allergies: activeAllergies,
        medicalHistory: activeMedicalHistory,
        companionName: activeCompanionName,
        companionPhone: activeCompanionPhone,
        companionIdCard: activeCompanionIdCard,
        companionRelationship: activeCompanionRelationship,
        isFromDatabase: true
      }
    }
    const member = familyMembers.find(m => m.id === selectedFamilyId)
    if (member) {
      return {
        name: member.full_name,
        relationship: member.relationship,
        gender: member.gender,
        dob: member.date_of_birth,
        idCard: member.national_id || 'Chưa cập nhật',
        bhyt: member.bhyt_code || 'Chưa cập nhật',
        phone: member.phone_number || user.phone_number || '',
        address: profile?.address || 'Theo địa chỉ chủ hộ',
        bloodType: 'Chưa rõ',
        allergies: 'Không ghi nhận',
        medicalHistory: 'Hồ sơ sức khỏe gia đình',
        companionName: profile?.full_name || user.full_name,
        companionPhone: profile?.phone_number || user.phone_number || '',
        companionIdCard: profile?.identity_card || user.identity_card || '',
        companionRelationship: `Người giám hộ (${member.relationship})`,
        isFromDatabase: true
      }
    }
    return {
      name: 'Chưa chọn',
      relationship: '',
      gender: '',
      dob: '',
      idCard: '',
      bhyt: '',
      phone: '',
      address: '',
      bloodType: '',
      allergies: '',
      medicalHistory: '',
      companionName: '',
      companionPhone: '',
      companionIdCard: '',
      companionRelationship: '',
      isFromDatabase: false
    }
  }

  const currentPatient = getSelectedPatientInfo()
  const selectedDoctor = doctors.find(d => String(d.id) === String(selectedDoctorId))
  const selectedDept = departments.find(d => String(d.id) === String(selectedDeptId))
  const selectedShift = doctorShifts.find(s => s.id === selectedShiftId)

  // Validation before advancing to next step
  const canProceed = () => {
    if (currentStep === 1) {
      if (targetType === 'family' && !selectedFamilyId) return false
      return true
    }
    if (currentStep === 2) {
      return symptoms.trim().length >= 3
    }
    if (currentStep === 3) {
      return !!selectedDoctorId && !!startsAt
    }
    if (currentStep === 4) {
      return true // Optional step
    }
    return true
  }

  // Handle final appointment creation
  const handleFinalSubmit = async () => {
    setSubmitting(true)
    try {
      const finalReason = compiledSummary.trim() || symptoms.trim()

      const payload: any = {
        doctor_id: Number(selectedDoctorId),
        starts_at: new Date(startsAt).toISOString(),
        reason: finalReason,
        shift_id: selectedShiftId || undefined,
        department_id: selectedDeptId ? Number(selectedDeptId) : undefined,
        patient_category: currentPatient.bhyt !== 'Chưa cập nhật' ? 'Bảo hiểm y tế' : 'Tự túc',
        payment_source: currentPatient.bhyt !== 'Chưa cập nhật' ? 'Quỹ Bảo hiểm y tế' : 'Tự túc'
      }

      if (targetType === 'self') {
        if (currentPatient.companionName) {
          payload.companion_name = currentPatient.companionName
          payload.companion_relationship = currentPatient.companionRelationship || 'Người thân'
          payload.companion_phone = currentPatient.companionPhone
          payload.companion_id_card = currentPatient.companionIdCard || undefined
        }
      } else if (targetType === 'family' && selectedFamilyId) {
        payload.companion_name = profile?.full_name || user.full_name
        payload.companion_relationship = `Người bảo hộ (${currentPatient.relationship})`
        const compId = profile?.identity_card || user.identity_card
        payload.companion_id_card = (compId && compId !== 'Chưa cập nhật') ? compId : undefined
        payload.companion_phone = profile?.phone_number || user.phone_number
      }

      const res = await request<Appointment>('/api/v1/appointments', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      onSuccess(res, paymentMethod === 'vietqr')
    } catch (e: any) {
      onError(e instanceof Error ? e.message : 'Không thể hoàn tất đặt lịch. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="booking-flow-backdrop">
      <div className="booking-flow-modal">
        {/* Modal Header */}
        <div className="booking-flow-header">
          <div className="booking-flow-header-title">
            <Stethoscope size={20} color="#0284c7" />
            <h3>Đặt Lịch Khám Bệnh Trực Tuyến</h3>
            <span className="booking-flow-header-badge">Quy trình chuẩn BYT</span>
          </div>
          <button className="booking-flow-close-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        {/* 5-Step Stepper Navigation */}
        <div className="booking-stepper">
          <div
            className={`stepper-item ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}
            onClick={() => setCurrentStep(1)}
          >
            <div className="stepper-circle">{currentStep > 1 ? <CheckCircle2 size={16} /> : '1'}</div>
            <div className="stepper-label">Người khám</div>
          </div>
          <div className={`stepper-divider ${currentStep > 1 ? 'completed' : ''}`} />

          <div
            className={`stepper-item ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}
            onClick={() => canProceed() && setCurrentStep(2)}
          >
            <div className="stepper-circle">{currentStep > 2 ? <CheckCircle2 size={16} /> : '2'}</div>
            <div className="stepper-label">Triệu chứng & AI</div>
          </div>
          <div className={`stepper-divider ${currentStep > 2 ? 'completed' : ''}`} />

          <div
            className={`stepper-item ${currentStep === 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}
            onClick={() => canProceed() && currentStep >= 2 && setCurrentStep(3)}
          >
            <div className="stepper-circle">{currentStep > 3 ? <CheckCircle2 size={16} /> : '3'}</div>
            <div className="stepper-label">Khoa & Bác sĩ</div>
          </div>
          <div className={`stepper-divider ${currentStep > 3 ? 'completed' : ''}`} />

          <div
            className={`stepper-item ${currentStep === 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}
            onClick={() => canProceed() && currentStep >= 3 && setCurrentStep(4)}
          >
            <div className="stepper-circle">{currentStep > 4 ? <CheckCircle2 size={16} /> : '4'}</div>
            <div className="stepper-label">Đơn thuốc & CĐHA</div>
          </div>
          <div className={`stepper-divider ${currentStep > 4 ? 'completed' : ''}`} />

          <div
            className={`stepper-item ${currentStep === 5 ? 'active' : ''}`}
            onClick={() => canProceed() && currentStep >= 4 && setCurrentStep(5)}
          >
            <div className="stepper-circle">5</div>
            <div className="stepper-label">Thanh toán</div>
          </div>
        </div>

        {/* Modal Body: Switch between 5 Steps */}
        <div className="booking-flow-body">
          {/* ================= STEP 1: CHỌN NGƯỜI KHÁM ================= */}
          {currentStep === 1 && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                  Bước 1: Chọn đối tượng người bệnh khám
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Bạn đang đặt lịch khám cho chính mình hay thành viên trong gia đình?
                </p>
              </div>

              <div className="booking-patient-options">
                {/* Option 1: Self */}
                <div
                  className={`patient-select-card ${targetType === 'self' ? 'selected' : ''}`}
                  onClick={() => setTargetType('self')}
                >
                  <div className="patient-card-top">
                    <span className="patient-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <UserIcon size={16} color="#0284c7" />
                      )}
                      Chính tôi (Bệnh nhân)
                    </span>
                    <span className="patient-card-badge">Tài khoản chính</span>
                  </div>
                  <div className="patient-info-list">
                    <div>
                      Họ và tên: <strong>{currentPatient.name}</strong>
                    </div>
                    <div>
                      Giới tính: <strong>{currentPatient.gender}</strong> · Ngày sinh:{' '}
                      <strong>{currentPatient.dob}</strong>
                    </div>
                    <div>
                      CCCD / Định danh: <strong>{currentPatient.idCard}</strong>
                    </div>
                    <div>
                      Thẻ BHYT: <strong>{currentPatient.bhyt}</strong>
                    </div>
                  </div>
                </div>

                {/* Option 2: Family */}
                <div
                  className={`patient-select-card ${targetType === 'family' ? 'selected' : ''}`}
                  onClick={() => setTargetType('family')}
                >
                  <div className="patient-card-top">
                    <span className="patient-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={16} color="#0d9488" />
                      Người thân trong gia đình
                    </span>
                    <span className="patient-card-badge" style={{ background: '#f0fdfa', color: '#0f766e', borderColor: '#99f6e4' }}>
                      {familyMembers.length} thành viên
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Đặt lịch cho con nhỏ, bố mẹ hoặc người thân có thông tin người đi cùng kèm theo.
                  </p>
                </div>
              </div>

              {/* Database Patient Profile Auto-Fill Box */}
              {targetType === 'self' && (
                <div className="db-patient-info-box">
                  <div className="db-patient-box-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="db-sync-icon-badge">
                        <Database size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>Thông tin người khám đã lưu trữ trên cơ sở dữ liệu</span>
                          <span className="db-status-badge">
                            <CheckCircle2 size={12} /> Tự động cập nhật
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Hệ thống đã tự động trích xuất thông tin hành chính & y bạ từ cơ sở dữ liệu bệnh nhân.
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={fetchPatientProfile}
                        disabled={loadingProfile}
                        className="btn-db-action"
                        title="Tải lại từ cơ sở dữ liệu"
                      >
                        <RefreshCw size={12} className={loadingProfile ? 'spin-icon' : ''} />
                        Làm mới
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="btn-db-action primary"
                      >
                        <Edit3 size={12} />
                        {isEditingProfile ? 'Đóng chỉnh sửa' : 'Cập nhật CSDL'}
                      </button>
                    </div>
                  </div>

                  {/* Inline quick edit form */}
                  {isEditingProfile ? (
                    <form onSubmit={handleSaveProfileEdit} className="db-profile-edit-form">
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', marginBottom: '2px' }}>
                        Chỉnh sửa và đồng bộ trực tiếp vào cơ sở dữ liệu y tế:
                      </div>
                      <div className="db-edit-grid">
                        <label style={{ fontSize: '12px' }}>
                          Số CCCD / Mã định danh:
                          <input
                            type="text"
                            value={profileEditForm.identity_card}
                            onChange={e => setProfileEditForm({ ...profileEditForm, identity_card: e.target.value })}
                            placeholder="12 chữ số CCCD"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Mã thẻ BHYT (15 ký tự):
                          <input
                            type="text"
                            value={profileEditForm.bhyt_code}
                            onChange={e => setProfileEditForm({ ...profileEditForm, bhyt_code: e.target.value })}
                            placeholder="VD: GD4790123456789"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Số điện thoại liên hệ:
                          <input
                            type="text"
                            value={profileEditForm.phone_number}
                            onChange={e => setProfileEditForm({ ...profileEditForm, phone_number: e.target.value })}
                            placeholder="Số điện thoại di động"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Địa chỉ thường trú:
                          <input
                            type="text"
                            value={profileEditForm.address}
                            onChange={e => setProfileEditForm({ ...profileEditForm, address: e.target.value })}
                            placeholder="Số nhà, đường, phường, quận..."
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Nhóm máu:
                          <input
                            type="text"
                            value={profileEditForm.blood_type}
                            onChange={e => setProfileEditForm({ ...profileEditForm, blood_type: e.target.value })}
                            placeholder="A+, B+, O+, AB+..."
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Tiền sử dị ứng thuốc / thực phẩm:
                          <input
                            type="text"
                            value={profileEditForm.allergies}
                            onChange={e => setProfileEditForm({ ...profileEditForm, allergies: e.target.value })}
                            placeholder="Không dị ứng hoặc Penicillin, phấn hoa..."
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px', gridColumn: '1 / -1' }}>
                          Tiền sử bệnh lý EMR đã ghi nhận:
                          <input
                            type="text"
                            value={profileEditForm.medical_history_notes}
                            onChange={e => setProfileEditForm({ ...profileEditForm, medical_history_notes: e.target.value })}
                            placeholder="Tiền sử tăng huyết áp, đái tháo đường..."
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Người đi cùng / Giám hộ (nếu có):
                          <input
                            type="text"
                            value={profileEditForm.companion_name}
                            onChange={e => setProfileEditForm({ ...profileEditForm, companion_name: e.target.value })}
                            placeholder="Họ tên người đi cùng"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          SĐT người đi cùng:
                          <input
                            type="text"
                            value={profileEditForm.companion_phone}
                            onChange={e => setProfileEditForm({ ...profileEditForm, companion_phone: e.target.value })}
                            placeholder="Số điện thoại"
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#ffffff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {savingProfile ? 'Đang lưu...' : 'Lưu vào cơ sở dữ liệu'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="db-patient-grid">
                      <div className="db-patient-item">
                        <div className="db-patient-label">Mã bệnh nhân (PID):</div>
                        <div className="db-patient-value">
                          <span>{profile?.external_patient_id || `PAT-${String(user.id).padStart(4, '0')}`}</span>
                          <span className="db-pill-verified">Hồ sơ điện tử</span>
                        </div>
                      </div>

                      <div className="db-patient-item">
                        <div className="db-patient-label">Số CCCD / Định danh:</div>
                        <div className="db-patient-value">
                          <span>{currentPatient.idCard}</span>
                          {currentPatient.idCard !== 'Chưa cập nhật' ? (
                            <span className="db-pill-verified">VNeID Mức 2</span>
                          ) : (
                            <span className="db-pill-warning">Chưa có CCCD</span>
                          )}
                        </div>
                      </div>

                      <div className="db-patient-item">
                        <div className="db-patient-label">Thẻ BHYT Quốc gia:</div>
                        <div className="db-patient-value">
                          <span>{currentPatient.bhyt}</span>
                          {currentPatient.bhyt !== 'Chưa cập nhật' && currentPatient.bhyt !== 'Chưa liên kết' ? (
                            <span className="db-pill-verified">Hưởng 80%</span>
                          ) : (
                            <span className="db-pill-warning">Khám tự túc</span>
                          )}
                        </div>
                      </div>

                      <div className="db-patient-item">
                        <div className="db-patient-label">Họ tên & Ngày sinh & Giới tính:</div>
                        <div className="db-patient-value">
                          {currentPatient.name} · {currentPatient.dob} ({currentPatient.gender})
                        </div>
                      </div>

                      <div className="db-patient-item">
                        <div className="db-patient-label">Số điện thoại liên hệ:</div>
                        <div className="db-patient-value">
                          {currentPatient.phone || 'Chưa cập nhật'}
                        </div>
                      </div>

                      <div className="db-patient-item">
                        <div className="db-patient-label">Địa chỉ cư trú thường trú:</div>
                        <div className="db-patient-value">
                          {currentPatient.address || 'Chưa cập nhật'}
                        </div>
                      </div>

                      <div className="db-patient-item">
                        <div className="db-patient-label">Nhóm máu & Tiền sử dị ứng:</div>
                        <div className="db-patient-value">
                          Nhóm máu: <strong>{currentPatient.bloodType}</strong> · Dị ứng: <strong>{currentPatient.allergies}</strong>
                        </div>
                      </div>

                      <div className="db-patient-item">
                        <div className="db-patient-label">Người đi cùng / Giám hộ:</div>
                        <div className="db-patient-value">
                          {currentPatient.companionName
                            ? `${currentPatient.companionName} (${currentPatient.companionRelationship || 'Người thân'}) - ${currentPatient.companionPhone || ''}`
                            : 'Tự đi khám'}
                        </div>
                      </div>

                      <div className="db-patient-item full-width">
                        <div className="db-patient-label">Tiền sử bệnh án lưu trên hệ thống (EMR/HIS):</div>
                        <div className="db-patient-value" style={{ fontWeight: 500, color: '#334155' }}>
                          {currentPatient.medicalHistory || 'Không ghi nhận tiền sử mãn tính'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-section if Family Member Selected */}
              {targetType === 'family' && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Danh sách người thân trong Sổ sức khỏe gia đình:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddFamily(!showAddFamily)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#0284c7',
                        fontWeight: 600
                      }}
                    >
                      <Plus size={14} /> {showAddFamily ? 'Hủy thêm mới' : '+ Thêm người thân'}
                    </button>
                  </div>

                  {/* Inline Quick Add Form */}
                  {showAddFamily && (
                    <form className="quick-add-family-box" onSubmit={handleSaveFamilyMember}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                        Thêm hồ sơ người thân mới
                      </div>
                      <div className="quick-add-grid">
                        <label style={{ fontSize: '12px' }}>
                          Họ và tên người thân *
                          <input
                            type="text"
                            required
                            placeholder="Ví dụ: Nguyễn Văn An"
                            value={newFamilyData.full_name}
                            onChange={e => setNewFamilyData({ ...newFamilyData, full_name: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Mối quan hệ *
                          <select
                            value={newFamilyData.relationship}
                            onChange={e => setNewFamilyData({ ...newFamilyData, relationship: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="Con">Con cái</option>
                            <option value="Bố">Bố</option>
                            <option value="Mẹ">Mẹ</option>
                            <option value="Vợ">Vợ</option>
                            <option value="Chồng">Chồng</option>
                            <option value="Ông/Bà">Ông / Bà</option>
                            <option value="Khác">Khác</option>
                          </select>
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Giới tính
                          <select
                            value={newFamilyData.gender}
                            onChange={e => setNewFamilyData({ ...newFamilyData, gender: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          >
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                          </select>
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Ngày sinh *
                          <input
                            type="date"
                            required
                            value={newFamilyData.date_of_birth}
                            onChange={e => setNewFamilyData({ ...newFamilyData, date_of_birth: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Số CCCD / Định danh
                          <input
                            type="text"
                            placeholder="Số định danh cá nhân"
                            value={newFamilyData.national_id}
                            onChange={e => setNewFamilyData({ ...newFamilyData, national_id: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                        <label style={{ fontSize: '12px' }}>
                          Mã thẻ BHYT (nếu có)
                          <input
                            type="text"
                            placeholder="Ví dụ: TE101..."
                            value={newFamilyData.bhyt_code}
                            onChange={e => setNewFamilyData({ ...newFamilyData, bhyt_code: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                          />
                        </label>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setShowAddFamily(false)}
                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px' }}
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={savingFamily}
                          style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontSize: '12px', fontWeight: 600 }}
                        >
                          {savingFamily ? 'Đang lưu...' : 'Lưu hồ sơ'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of family members */}
                  <div className="family-members-grid">
                    {familyMembers.map(m => {
                      const isSelected = selectedFamilyId === m.id
                      return (
                        <div
                          key={m.id}
                          className={`family-card-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedFamilyId(m.id)}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {m.avatar_url ? (
                                <img src={m.avatar_url} alt={m.full_name} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                              ) : null}
                              <strong style={{ fontSize: '13px', color: '#0f172a' }}>{m.full_name}</strong>
                            </div>
                            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {m.relationship}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {m.gender} · Sinh: {m.date_of_birth}
                          </div>
                          <div style={{ fontSize: '11px', color: '#475569' }}>
                            BHYT: {m.bhyt_code || 'Không có'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {familyMembers.length === 0 && !showAddFamily && (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', marginTop: '8px', fontSize: '13px', color: '#64748b' }}>
                      Chưa có hồ sơ người thân nào. Bấm "+ Thêm người thân" ở trên để bổ sung.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: NHẬP TRIỆU CHỨNG & AI MEDGEMMA ================= */}
          {currentStep === 2 && (
            <div className="symptom-input-area">
              <div>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                  Bước 2: Nhập triệu chứng & Trợ lý AI MedGemma phân tích
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Người khám: <strong>{currentPatient.name}</strong> ({currentPatient.relationship})
                </p>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Mô tả triệu chứng bệnh hiện tại của bạn:
                </label>
                <textarea
                  rows={4}
                  value={symptoms}
                  onChange={e => {
                    setSymptoms(e.target.value)
                    setCompiledSummary(e.target.value)
                  }}
                  placeholder="Ví dụ: Đau đầu nhiều từ hôm qua, kèm sốt 38.5 độ, ho khan và hắt hơi nhiều, cảm thấy mệt mỏi và chán ăn..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Quick Symptom Chips */}
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                  Gợi ý triệu chứng phổ biến (nhấp để thêm nhanh):
                </div>
                <div className="quick-symptom-chips">
                  {quickSymptoms.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      className="symptom-chip"
                      onClick={() => handleAddSymptomChip(chip)}
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Trigger Button */}
              <div>
                <button
                  type="button"
                  className="btn-ai-triage"
                  onClick={handleAiTriage}
                  disabled={triageLoading || !symptoms.trim()}
                >
                  <Sparkles size={16} />
                  {triageLoading ? 'AI MedGemma đang phân tích...' : '🤖 Phân tích triệu chứng bằng AI MedGemma'}
                </button>
              </div>

              {/* AI MedGemma Result & Clarifying Questions */}
              {triageResult && (
                <div className={`ai-triage-panel ${triageResult.urgency_level === 'EMERGENCY' ? 'emergency' : ''}`}>
                  <div className="ai-header-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={16} color={triageResult.urgency_level === 'EMERGENCY' ? '#b91c1c' : '#0d9488'} />
                      <strong style={{ fontSize: '14px', color: triageResult.urgency_level === 'EMERGENCY' ? '#b91c1c' : '#0f766e' }}>
                        Kết quả phân luồng AI MedGemma
                      </strong>
                    </div>
                    <span
                      className={`ai-badge ${
                        triageResult.urgency_level === 'EMERGENCY'
                          ? 'emergency'
                          : triageResult.urgency_level === 'HIGH'
                          ? 'high'
                          : 'routine'
                      }`}
                    >
                      {triageResult.urgency_label}
                    </span>
                  </div>

                  {triageResult.emergency_alert ? (
                    <div style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>
                      ⚠️ {triageResult.emergency_alert}
                    </div>
                  ) : null}

                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.5 }}>
                    <strong>Đánh giá y khoa:</strong> {triageResult.explanation}
                  </div>

                  <div style={{ fontSize: '13px', color: '#0369a1', fontWeight: 600 }}>
                    💡 Đề xuất chuyên khoa phù hợp:{' '}
                    <span style={{ textDecoration: 'underline' }}>{triageResult.recommended_department_name}</span>
                  </div>

                  {/* Clarifying Questions from AI */}
                  {triageResult.suggested_questions && triageResult.suggested_questions.length > 0 && (
                    <div className="ai-clarifying-questions">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        <HelpCircle size={15} color="#0284c7" />
                        AI MedGemma đặt thêm câu hỏi để tóm tắt bệnh cảnh chính xác:
                      </div>
                      {triageResult.suggested_questions.map((q, idx) => (
                        <div key={idx} className="clarifying-q-item">
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                            {idx + 1}. {q}
                          </label>
                          <input
                            type="text"
                            placeholder="Nhập câu trả lời của bạn..."
                            value={questionAnswers[idx] || ''}
                            onChange={e => handleAnswerQuestion(idx, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              fontSize: '12px'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Compiled Summary Preview */}
                  {compiledSummary && (
                    <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}>
                      <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                        📋 Tóm tắt triệu chứng gửi Bác sĩ:
                      </strong>
                      <div style={{ color: '#334155', whiteSpace: 'pre-wrap' }}>{compiledSummary}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: CHỌN CHUYÊN KHOA & BÁC SĨ & LỊCH TRỰC ================= */}
          {currentStep === 3 && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                  Bước 3: Chọn Chuyên khoa, Bác sĩ và Ca trực chống quá tải
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Lịch trực được tự động điều phối theo quy định hạn ngạch định mức bác sĩ của Bộ Y tế.
                </p>
              </div>

              {/* AI Recommendation Highlight */}
              {triageResult?.recommended_department_name && (
                <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#0f766e' }}>
                    ✨ AI gợi ý khám chuyên khoa: <strong>{triageResult.recommended_department_name}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const matched = departments.find(d =>
                        d.name.toLowerCase().includes(triageResult.recommended_department_name.toLowerCase())
                      )
                      if (matched) {
                        setSelectedDeptId(String(matched.id))
                        setSelectedDoctorId('')
                      }
                    }}
                    style={{
                      background: '#0d9488',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Chọn theo AI
                  </button>
                </div>
              )}

              {/* Department Pills */}
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block' }}>
                Chọn Chuyên khoa tiếp nhận:
              </label>
              <div className="dept-selector-cards">
                <button
                  type="button"
                  className={`dept-pill-btn ${selectedDeptId === '' ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDeptId('')
                    setSelectedDoctorId('')
                  }}
                >
                  Tất cả chuyên khoa
                </button>
                {departments.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    className={`dept-pill-btn ${selectedDeptId === String(d.id) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedDeptId(String(d.id))
                      setSelectedDoctorId('')
                    }}
                  >
                    {d.name} ({d.code})
                  </button>
                ))}
              </div>

              {/* Doctors Grid */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block' }}>
                  Chọn Bác sĩ chuyên khoa tiếp nhận:
                </label>
                <div className="doctors-grid">
                  {doctors
                    .filter(d => !selectedDeptId || String(d.department_id) === String(selectedDeptId))
                    .map(d => {
                      const isSelected = selectedDoctorId === String(d.id)
                      return (
                        <div
                          key={d.id}
                          className={`doctor-item-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedDoctorId(String(d.id))}
                        >
                          <div className="doctor-avatar-circle">
                            {d.full_name.charAt(d.full_name.lastIndexOf(' ') + 1) || 'BS'}
                          </div>
                          <div className="doctor-item-meta">
                            <div className="doctor-item-name">{d.full_name}</div>
                            <div className="doctor-item-cchn">{d.cchn ? `CCHN: ${d.cchn}` : 'Bác sĩ chuyên khoa'}</div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Doctor Shifts Section */}
              {selectedDoctorId && (
                <div style={{ marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block' }}>
                    Chọn Ca trực của Bác sĩ (Định mức chống quá tải):
                  </label>
                  {loadingShifts ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: '#64748b' }}>Đang tải ca trực...</div>
                  ) : doctorShifts.length > 0 ? (
                    <div className="booking-shifts-grid">
                      {doctorShifts.map(s => {
                        const isSelected = selectedShiftId === s.id
                        const isFull = s.is_overloaded
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={isFull}
                            onClick={() => {
                              setSelectedShiftId(s.id)
                              setStartsAt(`${s.shift_date}T${s.start_time}:00`)
                            }}
                            className={`shift-card-btn ${isSelected ? 'selected' : ''} ${isFull ? 'full-quota' : ''}`}
                          >
                            <div className="shift-card-title">
                              {s.shift_type === 'morning'
                                ? '☀️ Ca sáng'
                                : s.shift_type === 'afternoon'
                                ? '🌤️ Ca chiều'
                                : '🌙 Ca tối'}{' '}
                              ({s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)})
                            </div>
                            <div className="shift-card-date">Ngày: {s.shift_date}</div>
                            <div className={`shift-card-quota ${isFull ? 'danger' : 'success'}`}>
                              {isFull ? '⚠️ ĐÃ ĐỦ ĐỊNH MỨC' : `Còn ${s.available_slots}/${s.max_patients} lượt`}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '10px', fontSize: '12px', color: '#64748b', background: '#f8fafc', borderRadius: '6px', marginTop: '6px' }}>
                      Bác sĩ chưa có ca trực cố định hôm nay. Bạn có thể tự chọn ngày giờ khám bên dưới:
                    </div>
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Ngày và giờ khám dự kiến:
                    </label>
                    <input
                      type="datetime-local"
                      value={startsAt}
                      onChange={e => setStartsAt(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        maxWidth: '280px'
                      }}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 4: TẢI LÊN ĐƠN THUỐC, XÉT NGHIỆM, CĐHA ================= */}
          {currentStep === 4 && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                  Bước 4: Tải lên Thuốc đang dùng, Xét nghiệm & CĐHA (Nếu có)
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Hồ sơ cận lâm sàng giúp bác sĩ đánh giá chính xác hơn khi tư vấn. Bạn có thể bỏ qua nếu không có.
                </p>
              </div>

              <div className="upload-categories-grid">
                {/* 1. Đơn thuốc & Thuốc đang dùng */}
                <label className="upload-card-box">
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={e => handleFileUpload(e, 'prescription')}
                  />
                  <FileSpreadsheet size={24} color="#0284c7" style={{ marginBottom: '6px' }} />
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>1. Thuốc đang dùng</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Ảnh chụp đơn thuốc cũ, vỏ thuốc hoặc toa điện tử
                  </span>
                  <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 600, marginTop: '6px' }}>
                    + Nhấp để tải file
                  </span>
                </label>

                {/* 2. Xét nghiệm cận lâm sàng */}
                <label className="upload-card-box">
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={e => handleFileUpload(e, 'lab')}
                  />
                  <FileText size={24} color="#0d9488" style={{ marginBottom: '6px' }} />
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>2. Kết quả Xét nghiệm</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Công thức máu, sinh hóa, nước tiểu, vi sinh...
                  </span>
                  <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: 600, marginTop: '6px' }}>
                    + Nhấp để tải file
                  </span>
                </label>

                {/* 3. Chẩn đoán hình ảnh (CĐHA / CĐHN) */}
                <label className="upload-card-box">
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    style={{ display: 'none' }}
                    onChange={e => handleFileUpload(e, 'imaging')}
                  />
                  <FileCheck size={24} color="#7c3aed" style={{ marginBottom: '6px' }} />
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>3. CĐHA (Hình ảnh học)</strong>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Phim X-Quang, Siêu âm, CT-Scanner, MRI...
                  </span>
                  <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600, marginTop: '6px' }}>
                    + Nhấp để tải file
                  </span>
                </label>
              </div>

              {/* Uploaded Documents List */}
              {uploadedDocs.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                    Tệp tài liệu đã đính kèm ({uploadedDocs.length}):
                  </div>
                  <div className="uploaded-files-list">
                    {uploadedDocs.map(doc => (
                      <div key={doc.id} className="uploaded-file-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600,
                              background:
                                doc.category === 'prescription'
                                  ? '#e0f2fe'
                                  : doc.category === 'lab'
                                  ? '#ccfbf1'
                                  : '#ede9fe',
                              color:
                                doc.category === 'prescription'
                                  ? '#0284c7'
                                  : doc.category === 'lab'
                                  ? '#0f766e'
                                  : '#6d28d9'
                            }}
                          >
                            {doc.category === 'prescription'
                              ? 'Đơn thuốc'
                              : doc.category === 'lab'
                              ? 'Xét nghiệm'
                              : 'CĐHA'}
                          </span>
                          <strong style={{ color: '#0f172a' }}>{doc.name}</strong>
                          <span style={{ color: '#64748b', fontSize: '11px' }}>({doc.size})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(doc.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                          title="Xóa tệp"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
                💡 Nếu chưa có kết quả xét nghiệm hoặc đơn thuốc cũ, bạn có thể bấm <strong>"Tiếp tục"</strong> để sang bước thanh toán.
              </div>
            </div>
          )}

          {/* ================= STEP 5: THANH TOÁN - ĐẶT LỊCH KHÁM ================= */}
          {currentStep === 5 && (
            <div>
              <div style={{ marginBottom: '14px' }}>
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', color: '#0f172a' }}>
                  Bước 5: Xác nhận thông tin & Thanh toán Viện phí
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Vui lòng kiểm tra lại toàn bộ thông tin lượt khám trước khi xác nhận.
                </p>
              </div>

              {/* Comprehensive Summary Table */}
              <div className="booking-summary-table">
                <div className="summary-row">
                  <span className="summary-row-label">Bệnh nhân khám:</span>
                  <span className="summary-row-value">
                    {currentPatient.name} ({currentPatient.relationship}) · {currentPatient.gender}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">CCCD / Mã định danh:</span>
                  <span className="summary-row-value">{currentPatient.idCard}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Thẻ BHYT:</span>
                  <span className="summary-row-value">
                    {currentPatient.bhyt !== 'Chưa cập nhật' && currentPatient.bhyt !== 'Chưa liên kết' ? (
                      <span style={{ color: '#166534', fontWeight: 700 }}>
                        {currentPatient.bhyt} (Hưởng 80%)
                      </span>
                    ) : (
                      'Không áp dụng (Khám tự túc)'
                    )}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Số điện thoại liên hệ:</span>
                  <span className="summary-row-value">{currentPatient.phone || 'Chưa cập nhật'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Địa chỉ thường trú:</span>
                  <span className="summary-row-value">{currentPatient.address || 'Chưa cập nhật'}</span>
                </div>
                {currentPatient.companionName ? (
                  <div className="summary-row">
                    <span className="summary-row-label">Người đi cùng / Giám hộ:</span>
                    <span className="summary-row-value">{currentPatient.companionName} ({currentPatient.companionRelationship}) - {currentPatient.companionPhone}</span>
                  </div>
                ) : null}
                <div className="summary-row">
                  <span className="summary-row-label">Bác sĩ chuyên khoa:</span>
                  <span className="summary-row-value">
                    {selectedDoctor?.full_name || 'Bác sĩ chuyên khoa'}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Chuyên khoa:</span>
                  <span className="summary-row-value">{selectedDept?.name || 'Đa khoa'}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Thời gian khám:</span>
                  <span className="summary-row-value">
                    {new Date(startsAt).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Hồ sơ cũ đính kèm:</span>
                  <span className="summary-row-value">
                    {uploadedDocs.length > 0 ? `${uploadedDocs.length} tài liệu tải lên` : 'Không có'}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-row-label">Lý do & Triệu chứng:</span>
                  <span className="summary-row-value" style={{ maxWidth: '60%', textAlign: 'right', fontSize: '12px' }}>
                    {compiledSummary || symptoms}
                  </span>
                </div>
              </div>

              {/* Billing Breakdown */}
              <div className="billing-breakdown-card" style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                  Bảng kê viện phí khám bệnh từ xa:
                </div>
                <div className="fee-line">
                  <span>Giá dịch vụ khám chuyên khoa:</span>
                  <span>150.000 ₫</span>
                </div>
                {currentPatient.bhyt !== 'Chưa cập nhật' && currentPatient.bhyt !== 'Chưa liên kết' ? (
                  <div className="fee-line discount">
                    <span>Quỹ BHYT chi trả (80% theo danh mục):</span>
                    <span>-120.000 ₫</span>
                  </div>
                ) : null}
                <div className="fee-line total">
                  <span>Tổng viện phí thanh toán:</span>
                  <span className="fee-total-amount">
                    {currentPatient.bhyt !== 'Chưa cập nhật' && currentPatient.bhyt !== 'Chưa liên kết'
                      ? '30.000 ₫'
                      : '150.000 ₫'}
                  </span>
                </div>
              </div>

              {/* Payment Methods */}
              <div style={{ marginTop: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Phương thức thanh toán viện phí:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    className={`patient-select-card ${paymentMethod === 'vietqr' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('vietqr')}
                    style={{ padding: '10px 12px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <QrCode size={18} color="#0284c7" />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>VietQR (Napas 247)</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Quét mã ngân hàng, xác nhận tức thì</div>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`patient-select-card ${paymentMethod === 'counter' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('counter')}
                    style={{ padding: '10px 12px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={18} color="#0d9488" />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>Thanh toán sau</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Thanh toán qua ví hoặc tại quầy</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="booking-flow-footer">
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn-flow-back"
              onClick={() => setCurrentStep(prev => prev - 1)}
            >
              <ChevronLeft size={16} /> Quay lại
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep < 5 ? (
              <button
                type="button"
                className="btn-flow-next"
                disabled={!canProceed()}
                onClick={() => setCurrentStep(prev => prev + 1)}
              >
                Tiếp tục sang Bước {currentStep + 1} <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn-flow-submit"
                disabled={submitting}
                onClick={handleFinalSubmit}
              >
                <CalendarDays size={18} />
                {submitting ? 'Đang tạo lịch...' : '📅 Xác nhận & Đặt lịch khám'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
export default BookingFlowModal
