export const DEFAULT_PROD_API_URL = 'https://app-bypass-back-end-circuit-7mgyyh-664221-72-61-123-73.sslip.io'

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  if (w.Capacitor?.isNativePlatform?.()) return true
  if (
    !import.meta.env.DEV &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.protocol === 'capacitor:' ||
     window.location.protocol === 'file:')
  ) {
    return true
  }
  return false
}

export function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '')
  }
  if (isCapacitorNative()) {
    return DEFAULT_PROD_API_URL
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000'
  }
  return ''
}

export const API = getApiBaseUrl()

export type User = {
  id: number
  email: string
  phone_number?: string
  full_name: string
  role: 'patient' | 'doctor' | 'admin' | 'nurse'
  doctor_cchn?: string
}

export type Appointment = {
  id: number
  patient_id: number
  doctor_id: number
  starts_at: string
  reason: string
  status: string
  fee_amount: number
  currency: string
  paid_at?: string
  refund_amount?: number
  refund_reason?: string
  cancelled_at?: string
  shift_id?: number
  department_id?: number
  bhyt_code?: string
  bhyt_rate?: number
  bhyt_discount?: number
  patient_pay_amount?: number
}

export type ICD10Item = {
  code: string
  name: string
  chapter: string
}

export type ClinicalRecordDetail = {
  appointment_id: number
  patient: {
    id: number
    full_name: string
    phone_number?: string
    external_patient_id?: string
  }
  doctor?: {
    id: number
    full_name: string
    cchn: string
  }
  record: {
    id?: number
    symptoms?: string
    allergies?: string
    diagnosis?: string
    icd10_code?: string
    icd10_name?: string
    clinical_notes?: string
    plan?: string
    is_locked?: boolean
    locked_at?: string
    is_digitally_signed?: boolean
    signed_at?: string
    signer_name?: string
    signer_cchn?: string
    cert_serial?: string
  } | null
  prescription?: {
    id?: number
    summary?: string
    national_code?: string
    national_qr_url?: string
    synced_at?: string
  } | null
  prescription_summary?: string
}

export type VietQRData = {
  bank_id: string
  bank_name: string
  account_no: string
  account_name: string
  amount: number
  currency: string
  transfer_content: string
  qr_image_url: string
  instructions: string
  payment_status: string
  appointment_status: string
  paid_at?: string
  refund_status?: string
}

export function getToken() {
  return localStorage.getItem('tm_token') || ''
}

export function getRefreshToken() {
  return localStorage.getItem('tm_refresh_token') || ''
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {})
    }
  })

  // Nếu token hết hạn (401), thử refresh token tự động
  if (response.status === 401 && getRefreshToken() && !path.includes('/auth/')) {
    try {
      const refRes = await fetch(`${API}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: getRefreshToken() })
      })
      if (refRes.ok) {
        const data = await refRes.json()
        localStorage.setItem('tm_token', data.access_token)
        return request<T>(path, init)
      } else {
        localStorage.removeItem('tm_token')
        localStorage.removeItem('tm_refresh_token')
      }
    } catch {
      localStorage.removeItem('tm_token')
      localStorage.removeItem('tm_refresh_token')
    }
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.detail || `Yêu cầu thất bại (${response.status})`)
    }
    const text = await response.text()
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
      throw new Error(`Máy chủ trả về trang HTML thay vì JSON (${response.status}). Vui lòng kiểm tra lại địa chỉ máy chủ API.`)
    }
    throw new Error(text.slice(0, 100) || `Yêu cầu thất bại (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    if (text.trim().startsWith('<!doctype') || text.trim().startsWith('<html')) {
      throw new Error(`Đường dẫn API ${path} trả về trang HTML thay vì dữ liệu JSON. Kiểm tra lại địa chỉ máy chủ API.`)
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error(`Phản hồi không phải định dạng JSON hợp lệ.`)
    }
  }

  return response.json()
}

export async function login(email: string, password: string) {
  const result = await request<{ access_token: string; refresh_token?: string; user: User }>(
    '/api/v1/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) }
  )
  localStorage.setItem('tm_token', result.access_token)
  if (result.refresh_token) {
    localStorage.setItem('tm_refresh_token', result.refresh_token)
  }
  return result.user
}

export async function sendOtp(phone_number: string) {
  return request<{ success: boolean; message: string; dev_code?: string }>(
    '/api/v1/auth/otp/send',
    { method: 'POST', body: JSON.stringify({ phone_number }) }
  )
}

export async function verifyOtp(phone_number: string, otp_code: string, full_name?: string) {
  const result = await request<{ access_token: string; refresh_token?: string; user: User }>(
    '/api/v1/auth/otp/verify',
    { method: 'POST', body: JSON.stringify({ phone_number, otp_code, full_name }) }
  )
  localStorage.setItem('tm_token', result.access_token)
  if (result.refresh_token) {
    localStorage.setItem('tm_refresh_token', result.refresh_token)
  }
  return result.user
}

export async function searchICD10(query: string = '') {
  return request<ICD10Item[]>(`/api/v1/icd10/search?q=${encodeURIComponent(query)}`)
}

export async function getClinicalRecord(appointmentId: number) {
  return request<ClinicalRecordDetail>(`/api/v1/appointments/${appointmentId}/clinical-records`)
}

export async function saveClinicalRecord(appointmentId: number, data: any) {
  return request<any>(`/api/v1/appointments/${appointmentId}/clinical-records`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function savePrescription(appointmentId: number, summary: string) {
  return request<any>(`/api/v1/appointments/${appointmentId}/prescriptions`, {
    method: 'POST',
    body: JSON.stringify({ summary })
  })
}

export async function completeConsultation(appointmentId: number) {
  return request<{ success: boolean; message: string; status: string }>(
    `/api/v1/appointments/${appointmentId}/complete`,
    { method: 'POST' }
  )
}

export async function getVietQR(appointmentId: number) {
  return request<VietQRData>(`/api/v1/payments/${appointmentId}/vietqr`)
}

export async function simulatePayment(appointmentId: number) {
  return request<{ success: boolean; message: string }>(
    `/api/v1/payments/${appointmentId}/simulate-success`,
    { method: 'POST' }
  )
}

// --- GIAI ĐOẠN 2 API FUNCTIONS ---

export type ConsentStatus = {
  consented: boolean
  version: string
  consented_at?: string
  terms_title: string
  terms_content: string
}

export async function getConsentStatus(appointmentId: number) {
  return request<ConsentStatus>(`/api/v1/consent/${appointmentId}/status`)
}

export async function agreeConsent(appointmentId: number) {
  return request<{ success: boolean; message: string; consented_at: string }>(
    '/api/v1/consent/agree',
    {
      method: 'POST',
      body: JSON.stringify({ appointment_id: appointmentId, consent_version: '2026.1-ND13' })
    }
  )
}

export async function signDocumentSmartCA(appointmentId: number, provider: string = 'VNPT_SmartCA') {
  return request<{
    success: boolean
    signer_name: string
    signer_cchn: string
    cert_serial: string
    signature_hash: string
    timestamp: string
    message: string
  }>(`/api/v1/appointments/${appointmentId}/sign`, {
    method: 'POST',
    body: JSON.stringify({ provider })
  })
}

export async function syncNationalPrescription(appointmentId: number) {
  return request<{
    success: boolean
    national_prescription_code: string
    lookup_url: string
    qr_code_url: string
    synced_at: string
    message: string
  }>(`/api/v1/appointments/${appointmentId}/sync-national-prescription`, {
    method: 'POST'
  })
}

export async function downloadMedicalRecordPdf(appointmentId: number) {
  const token = getToken()
  const response = await fetch(`${API}/api/v1/appointments/${appointmentId}/pdf`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  })
  if (!response.ok) throw new Error('Không tải được file PDF')
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `PhieuKham_DonThuoc_TM${appointmentId}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function getFhirBundle(appointmentId: number) {
  return request<any>(`/api/v1/appointments/${appointmentId}/fhir`)
}

export async function getPacsDicomStudies() {
  return request<any>('/api/v1/patients/me/pacs-studies')
}

// --- GIAI ĐOẠN 3: AI SCRIBE, BHYT & QUẢN LÝ LỊCH TRỰC CHỐNG QUÁ TẢI ---

export type AmbientScribeOut = {
  success: boolean
  soap: {
    subjective: string
    objective: string
    assessment: string
    plan: string
  }
  extracted_symptoms: string
  suggested_icd10_code: string
  suggested_icd10_name: string
  prescription_draft: string
  allergies_warning: string
}

export type BhytCheckOut = {
  success: boolean
  is_valid: boolean
  bhyt_code: string
  patient_name: string
  benefit_rate_percent: number
  object_group: string
  primary_healthcare_facility: string
  valid_from: string
  valid_to: string
  five_years_consecutive: string
  telehealth_covered: boolean
  message: string
}

export type Department = {
  id: number
  code: string
  name: string
  description?: string
  is_active: boolean
}

export type DoctorShift = {
  id: number
  doctor_id: number
  doctor_name?: string
  department_id?: number
  department_name?: string
  shift_date: string
  shift_type: string
  start_time: string
  end_time: string
  max_patients: number
  booked_count: number
  available_slots: number
  is_overloaded: boolean
}

export type AppointmentCancelOut = {
  success: boolean
  appointment_id: number
  status: string
  refund_amount: number
  refund_percent: number
  refund_reason: string
  message: string
}

export async function generateAiScribeSoap(transcript: string, patientName?: string, patientAge: number = 35) {
  return request<AmbientScribeOut>('/api/v1/ai/ambient-scribe', {
    method: 'POST',
    body: JSON.stringify({ transcript, patient_name: patientName, patient_age: patientAge })
  })
}

export async function checkBhyt(bhytCode: string, patientName?: string) {
  return request<BhytCheckOut>('/api/v1/insurance/bhyt/check', {
    method: 'POST',
    body: JSON.stringify({ bhyt_code: bhytCode, patient_name: patientName })
  })
}

export async function applyBhyt(appointmentId: number, bhytCode: string) {
  return request<{
    success: boolean
    appointment_id: number
    bhyt_code: string
    benefit_rate_percent: number
    original_fee: number
    bhyt_discount: number
    patient_pay_amount: number
    message: string
  }>(`/api/v1/appointments/${appointmentId}/apply-bhyt`, {
    method: 'POST',
    body: JSON.stringify({ bhyt_code: bhytCode })
  })
}

export async function getDepartments() {
  return request<Department[]>('/api/v1/departments')
}

export async function getDoctorShifts(doctorId: number) {
  return request<DoctorShift[]>(`/api/v1/doctors/${doctorId}/shifts`)
}

export async function cancelAppointment(appointmentId: number, reason: string) {
  return request<AppointmentCancelOut>(`/api/v1/appointments/${appointmentId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason })
  })
}

// --- CALLING & NOTIFICATION API ---

export type IncomingCallData = {
  has_incoming_call: boolean
  appointment_id?: number
  doctor?: {
    id: number
    full_name: string
    cchn?: string
    department_name?: string
  }
  reason?: string
  starts_at?: string
  fee_amount?: number
}

export async function callPatient(appointmentId: number) {
  return request<{ success: boolean; appointment_id: number; status: string; patient_name: string; message: string }>(
    `/api/v1/telehealth/sessions/${appointmentId}/call-patient`,
    { method: 'POST' }
  )
}

export async function checkIncomingCall() {
  return request<IncomingCallData>('/api/v1/patients/me/incoming-call')
}

export async function declineIncomingCall(appointmentId: number) {
  return request<{ success: boolean; message: string }>(
    `/api/v1/telehealth/sessions/${appointmentId}/decline-call`,
    { method: 'POST' }
  )
}

// --- IN-CONSULTATION CHAT & ATTACHMENTS API ---

export type ConsultationMessage = {
  id: number
  appointment_id: number
  sender_id: number
  sender_role: 'doctor' | 'patient'
  sender_name: string
  message_type: 'text' | 'image' | 'file'
  content?: string
  file_url?: string
  file_name?: string
  file_size?: number
  created_at: string
}

export async function getConsultationMessages(appointmentId: number) {
  return request<ConsultationMessage[]>(`/api/v1/telehealth/sessions/${appointmentId}/messages`)
}

export async function sendConsultationMessage(
  appointmentId: number,
  data: {
    content?: string
    message_type?: 'text' | 'image' | 'file'
    file_name?: string
    file_data?: string
    file_size?: number
  }
) {
  return request<ConsultationMessage>(`/api/v1/telehealth/sessions/${appointmentId}/messages`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// --- TRIAGE DESK (BÀN SÀNG LỌC & ĐIỀU PHỐI ĐIỀU DƯỠNG) ---

export interface TriageItem {
  appointment_id: number
  patient_id: number
  patient_name: string
  patient_phone?: string
  bhyt_code?: string
  doctor_id: number
  doctor_name: string
  department_name?: string
  starts_at: string
  reason: string
  status: string
  triage_status: 'pending' | 'assessed' | 'dispatched'
  triage_level: 'normal' | 'priority' | 'emergency'
  pulse?: number
  blood_pressure?: string
  temperature?: number
  spo2?: number
  weight?: number
  height?: number
  triage_notes?: string
}

export interface TriageAssessmentData {
  pulse?: number
  blood_pressure?: string
  temperature?: number
  spo2?: number
  weight?: number
  height?: number
  triage_level: 'normal' | 'priority' | 'emergency'
  triage_notes?: string
  dispatch_to_doctor?: boolean
}

export async function getTriageQueue() {
  return request<TriageItem[]>('/api/v1/triage/queue')
}

export async function assessTriage(appointmentId: number, data: TriageAssessmentData) {
  return request<{
    success: boolean
    appointment_id: number
    triage_status: string
    triage_level: string
    message: string
  }>(`/api/v1/triage/${appointmentId}/assess`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// --- ADMIN DASHBOARD & SYSTEM SETTINGS API ---

export interface AdminOverviewData {
  total_appointments: number
  completed_appointments: number
  scheduled_appointments: number
  cancelled_appointments: number
  total_revenue: number
  total_patients: number
  total_doctors: number
  total_nurses: number
  total_bhyt_claims: number
  bhyt_total_discount: number
}

export interface AuditLogItem {
  id: number
  actor_user_id?: number
  actor_name?: string
  actor_role?: string
  action: string
  resource_type: string
  resource_id?: string
  created_at: string
}

export interface SystemSettingsData {
  hospital_name: string
  hospital_code: string
  hospital_address: string
  hospital_hotline: string
  national_prescription_url: string
  smartca_provider: string
  coturn_host: string
  coturn_port: number
  coturn_realm: string
  sms_provider: string
  sms_brandname: string
  allow_test_otp: boolean
  bank_id: string
  bank_account_no: string
  bank_account_name: string
  default_max_patients_per_shift: number
  consultation_duration_minutes: number
}

export async function getAdminOverview() {
  return request<AdminOverviewData>('/api/v1/admin/overview')
}

export async function getAdminAuditLogs(limit: number = 50) {
  return request<AuditLogItem[]>(`/api/v1/admin/audit-logs?limit=${limit}`)
}

export async function getAdminUsers() {
  return request<any[]>('/api/v1/admin/users')
}

export async function getAdminSettings() {
  return request<SystemSettingsData>('/api/v1/admin/settings')
}

export async function updateAdminSettings(data: Partial<SystemSettingsData>) {
  return request<SystemSettingsData>('/api/v1/admin/settings', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// --- PARACLINICAL (LAB/LIS) & PACS STUDIES API ---

export interface LabIndicator {
  code: string
  name: string
  value: string
  unit: string
  ref_range: string
  flag: 'NORMAL' | 'HIGH' | 'LOW'
  flag_label: string
  note?: string | null
}

export interface LabReport {
  report_id: string
  title: string
  category: 'biochemistry' | 'hematology' | 'urinalysis' | 'immunology' | string
  category_name: string
  sampled_at: string
  result_at: string
  performed_by: string
  doctor_order: string
  conclusion: string
  indicators: LabIndicator[]
}

export interface LabResultsData {
  patient_id: number
  patient_name: string
  total_reports: number
  abnormal_indicators_count: number
  reports: LabReport[]
}

export interface PACSStudy {
  study_id: string
  modality: 'CR' | 'CT' | 'MRI' | 'US' | string
  modality_name: string
  body_part: string
  description: string
  date: string
  institution: string
  radiologist: string
  findings: string
  impression: string
  series_count: number
  instances_count: number
  viewer_url: string
  dicom_web_endpoint?: string
  study_instance_uid?: string
}

export interface PACSStudiesData {
  patient_id: number
  patient_name: string
  total_studies: number
  viewer_engine: string
  notice: string
  studies: PACSStudy[]
}

export async function getPatientLabResults(patientId: number) {
  return request<LabResultsData>(`/api/v1/patients/${patientId}/lab-results`)
}

export async function getPatientPacsStudies(patientId: number) {
  return request<PACSStudiesData>(`/api/v1/patients/${patientId}/pacs-studies`)
}

export async function getAppointmentLabResults(appointmentId: number) {
  return request<LabResultsData>(`/api/v1/appointments/${appointmentId}/lab-results`)
}

export async function getAppointmentPacsStudies(appointmentId: number) {
  return request<PACSStudiesData>(`/api/v1/appointments/${appointmentId}/pacs-studies`)
}

export async function getMyLabResults() {
  return request<LabResultsData>('/api/v1/patients/me/lab-results')
}

export async function getMyPacsStudies() {
  return request<PACSStudiesData>('/api/v1/patients/me/pacs-studies')
}




