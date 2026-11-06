// BASE URL resolution: bắt buộc từ VITE_API_BASE_URL hoặc dev localhost.
// KHÔNG fallback URL production hardcode trong source — cấu hình qua .env khi deploy.
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
  if (import.meta.env.DEV) {
    return 'http://localhost:8000'
  }
  //     Build production thiếu cấu hình -> rỗng (= same-origin, reverse proxy phục vụ API + UI cùng domain)
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
  triage_status?: string
  triage_level?: string
  pulse?: number
  blood_pressure?: string
  temperature?: number
  spo2?: number
  weight?: number
  height?: number
  triage_notes?: string
  waiting_room_entered_at?: string
  waiting_room_called_at?: string
  nurse_id?: number
  nurse_name?: string
  nurse_shift_id?: number
  doctor_name?: string
  patient_name?: string
  department_name?: string
  encounter_code?: string
  hospital_code?: string
  patient_category?: string
  payment_source?: string
  companion_name?: string
  companion_id_card?: string
  companion_phone?: string
  companion_relationship?: string
}

export interface NurseItem {
  id: number
  full_name: string
  email: string
  phone_number?: string
  role: string
}

export interface NurseShiftItem {
  id: number
  nurse_id: number
  nurse_name?: string
  department_id?: number
  department_name?: string
  shift_date: string
  shift_type: 'morning' | 'afternoon' | 'night' | string
  desk_name: string
  start_time: string
  end_time: string
  max_patients: number
  attended_count: number
  handover_notes?: string
  is_active: boolean
  created_at?: string
}

export async function getNurses() {
  return request<NurseItem[]>('/api/v1/nurses')
}

export async function getNurseShifts(params?: { nurse_id?: number; shift_date?: string; department_id?: number }) {
  const query = new URLSearchParams()
  if (params?.nurse_id) query.set('nurse_id', String(params.nurse_id))
  if (params?.shift_date) query.set('shift_date', params.shift_date)
  if (params?.department_id) query.set('department_id', String(params.department_id))
  const qs = query.toString() ? `?${query.toString()}` : ''
  return request<NurseShiftItem[]>(`/api/v1/nurses/shifts${qs}`)
}

export async function createNurseShift(data: {
  nurse_id: number
  department_id?: number
  shift_date: string
  shift_type: string
  desk_name?: string
  start_time?: string
  end_time?: string
  max_patients?: number
  handover_notes?: string
}) {
  return request<NurseShiftItem>('/api/v1/nurses/shifts', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateNurseShift(shiftId: number, data: {
  desk_name?: string
  max_patients?: number
  handover_notes?: string
  is_active?: boolean
}) {
  return request<NurseShiftItem>(`/api/v1/nurses/shifts/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function assignNurseToAppointment(appointmentId: number, data: {
  nurse_id: number
  nurse_shift_id?: number
}) {
  return request<{ success: boolean; message: string }>(`/api/v1/appointments/${appointmentId}/assign-nurse`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export type ICD10Item = {
  code: string
  name: string
  chapter: string
}

export type ClinicalRecordDetail = {
  appointment_id: number
  appointment?: {
    id: number
    encounter_code?: string
    hospital_code?: string
    patient_category?: string
    payment_source?: string
    bhyt_code?: string
    bhyt_rate?: number
    reason?: string
    starts_at?: string
    status?: string
  }
  patient: {
    id: number
    full_name: string
    phone_number?: string
    external_patient_id?: string
    date_of_birth?: string
    gender?: string
    identity_card?: string
    ethnicity?: string
    blood_type?: string
    address?: string
    province_code?: string
    ward_code?: string
    companion_name?: string
    companion_id_card?: string
    companion_phone?: string
    companion_relationship?: string
    has_medical_history?: boolean
    medical_history_icd10?: string
    medical_history_notes?: string
    family_history_icd10?: string
    family_history_notes?: string
    epidemiological_history?: string
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
    clinical_examination?: string
    paraclinical_results?: string
    treatment_regimen?: string
    clinical_evolution?: string
    medical_services_used?: string
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
  if (response.status === 401 && getRefreshToken() && !path.includes('/auth/') && !path.includes('/files/')) {
    try {
      const refRes = await fetch(`${API}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: getRefreshToken() })
      })
      if (refRes.ok) {
        const data = await refRes.json()
        localStorage.setItem('tm_token', data.access_token)
        if (data.refresh_token) {
          // Backend rotate refresh token — lưu token mới, token cũ vô hiệu
          localStorage.setItem('tm_refresh_token', data.refresh_token)
        }
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
      let detailMsg = ''
      if (typeof body.detail === 'string') {
        detailMsg = body.detail
      } else if (Array.isArray(body.detail)) {
        detailMsg = body.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ')
      } else if (body.detail) {
        detailMsg = JSON.stringify(body.detail)
      }
      throw new Error(detailMsg || body.message || `Yêu cầu thất bại (${response.status})`)
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

// ---------------------------------------------------------------------------
// File đính kèm chat: backend không phục vụ /uploads công khai nữa.
// resolveAuthedMediaUrl: /uploads/{name} -> /api/v1/files/{name} (yêu cầu Authorization)
// objectUrlForMedia: fetch có auth -> blob URL dùng cho <img> / download
// ---------------------------------------------------------------------------
const isUploadPath = (url: string) => url && url.startsWith('/uploads/')

export function resolveAuthedMediaUrl(fileUrl: string): string {
  if (!isUploadPath(fileUrl)) return fileUrl
  return `${API}/api/v1/files/${fileUrl.replace('/uploads/', '')}`
}

const objectUrlCache = new Map<string, string>()

export async function objectUrlForMedia(fileUrl: string): Promise<string> {
  const url = resolveAuthedMediaUrl(fileUrl)
  const cached = objectUrlCache.get(url)
  if (cached) return cached
  const token = getToken()
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error(`Không tải được tệp (${res.status})`)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  objectUrlCache.set(url, objectUrl)
  return objectUrl
}

export async function downloadAuthedFile(fileUrl: string, fileName: string) {
  const objectUrl = await objectUrlForMedia(fileUrl)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = fileName || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
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

export async function loginWithFirebaseToken(id_token: string, full_name?: string) {
  const result = await request<{ access_token: string; refresh_token?: string; user: User }>(
    '/api/v1/auth/firebase/verify-token',
    { method: 'POST', body: JSON.stringify({ id_token, full_name }) }
  )
  localStorage.setItem('tm_token', result.access_token)
  if (result.refresh_token) {
    localStorage.setItem('tm_refresh_token', result.refresh_token)
  }
  return result.user
}

export async function getFirebaseConfig() {
  return request<{
    apiKey: string
    projectId: string
    authDomain: string
    appId: string
    storageBucket: string
    messagingSenderId: string
    enabled: boolean
  }>('/api/v1/auth/firebase-config')
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
  triage_status: 'pending' | 'assessed' | 'dispatched' | 'waiting_room'
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
  firebase_project_id?: string
  firebase_api_key?: string
  firebase_auth_domain?: string
  firebase_app_id?: string
  gemini_api_key?: string
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

export interface PermissionItem {
  code: string
  name: string
  module: string
  description: string
}

export interface RoleDefinition {
  role: string
  name: string
  badge_color: string
  description: string
  permissions: string[]
}

export interface PermissionsMatrixData {
  roles: Record<string, RoleDefinition>
  permissions: PermissionItem[]
  current_user_role: string
  current_user_permissions: string[]
}

export async function getPermissionsMatrix() {
  return request<PermissionsMatrixData>('/api/v1/auth/permissions-matrix')
}

export async function updatePermissionsMatrix(matrix: Record<string, string[]>) {
  return request<PermissionsMatrixData>('/api/v1/admin/permissions-matrix', {
    method: 'PUT',
    body: JSON.stringify(matrix)
  })
}

export async function resetPermissionsMatrix() {
  return request<PermissionsMatrixData>('/api/v1/admin/permissions-matrix/reset', {
    method: 'POST'
  })
}

export async function updateUserRole(
  userId: number,
  data: { role: string; is_active?: boolean; doctor_cchn?: string; bhyt_code?: string }
) {
  return request<{ success: boolean; message: string; user: any }>(`/api/v1/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
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

export interface PatientProfile {
  id: number
  full_name: string
  phone_number?: string
  email: string
  role: string
  bhyt_code?: string
  external_patient_id?: string
  date_of_birth?: string
  gender?: string
  identity_card?: string
  address?: string
  province_code?: string
  district_code?: string
  ward_code?: string
  ethnicity?: string
  blood_type?: string
  allergies?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  companion_name?: string
  companion_id_card?: string
  companion_phone?: string
  companion_relationship?: string
  has_medical_history?: boolean
  medical_history_icd10?: string
  medical_history_notes?: string
  family_history_icd10?: string
  family_history_notes?: string
  epidemiological_history?: string
  consent_agreed: boolean
  consent_agreed_at?: string
  total_appointments: number
  completed_appointments: number
  total_prescriptions: number
}

export async function getMyProfile(): Promise<PatientProfile> {
  return request<PatientProfile>('/api/v1/patients/me/profile')
}

export async function updateMyProfile(data: Partial<PatientProfile>): Promise<PatientProfile> {
  return request<PatientProfile>('/api/v1/patients/me/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export interface PatientHisCheckRequest {
  full_name: string
  phone_number: string
  identity_card: string
}

export interface PatientHisCheckResponse {
  exists_in_his: boolean
  external_patient_id?: string
  full_name?: string
  dob?: string
  gender?: string
  bhyt_no?: string
  address?: string
  blood_type?: string
  conditions: Array<{ code?: string; display?: string; note?: string }>
  allergies: Array<{ substance?: string; severity?: string }>
  already_registered_in_app: boolean
  message: string
}

export interface PatientRegisterRequest {
  full_name: string
  phone_number: string
  identity_card: string
  password: string
  email?: string
  dob?: string
  gender?: string
  bhyt_code?: string
  address?: string
  blood_type?: string
  allergies?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
}

export interface PatientRegisterResponse {
  access_token: string
  refresh_token: string
  user: User
  external_patient_id: string
  his_action: 'linked_existing' | 'created_new_his'
  message: string
}

export async function checkPatientHis(data: PatientHisCheckRequest): Promise<PatientHisCheckResponse> {
  return request<PatientHisCheckResponse>('/api/v1/auth/check-patient-his', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function registerPatientAccount(data: PatientRegisterRequest): Promise<PatientRegisterResponse> {
  const result = await request<PatientRegisterResponse>('/api/v1/auth/patient-register', {
    method: 'POST',
    body: JSON.stringify(data)
  })
  localStorage.setItem('tm_token', result.access_token)
  if (result.refresh_token) {
    localStorage.setItem('tm_refresh_token', result.refresh_token)
  }
  return result
}

// =========================================================================
// AI CLINICAL & ADMINISTRATIVE SUITE (CARECONNECT AI)
// =========================================================================

export type TriageSymptomResult = {
  urgency_level: 'EMERGENCY' | 'HIGH' | 'ROUTINE'
  urgency_label: string
  emergency_alert?: string | null
  recommended_department_code: string
  recommended_department_name: string
  explanation: string
  suggested_questions: string[]
}

export async function checkTriageSymptoms(symptoms: string, patientAge: number = 30, gender: string = 'male') {
  return request<TriageSymptomResult>('/api/v1/ai/triage-symptom-check', {
    method: 'POST',
    body: JSON.stringify({ symptoms, patient_age: patientAge, gender })
  })
}

export type OcrResult = {
  success: boolean
  doc_type_detected: string
  confidence: number
  extracted_data: {
    full_name?: string
    cccd_number?: string
    bhyt_code?: string
    dob?: string
    gender?: string
    address?: string
    hospital_code?: string
    exp_date?: string
    diagnosis?: string
    medicines?: string[]
    [key: string]: any
  }
  raw_text?: string
  note?: string
}

export async function ocrMedicalDocument(imageBase64: string, docType: string = 'AUTO') {
  return request<OcrResult>('/api/v1/ai/ocr-document', {
    method: 'POST',
    body: JSON.stringify({ image_base64: imageBase64, doc_type: docType })
  })
}

export type Icd10Suggestion = {
  code: string
  name: string
  confidence: number
  differential_diagnosis: string
}

export async function suggestIcd10(symptoms: string, clinicalNotes?: string) {
  return request<{ suggestions: Icd10Suggestion[] }>('/api/v1/ai/suggest-icd10', {
    method: 'POST',
    body: JSON.stringify({ symptoms, clinical_notes: clinicalNotes })
  })
}

export type DrugSafetyResult = {
  is_safe: boolean
  risk_level: 'SAFE' | 'WARNING' | 'DANGER'
  summary: string
  interactions: Array<{
    pair: string
    severity: string
    title: string
    description: string
    recommendation: string
  }>
  allergy_alerts: Array<{
    medicine: string
    severity: string
    reason: string
  }>
  dosage_warnings: string[]
}

export async function checkDrugSafety(medicines: string[], patientAllergies?: string, patientAge?: number) {
  return request<DrugSafetyResult>('/api/v1/ai/check-drug-safety', {
    method: 'POST',
    body: JSON.stringify({ medicines, patient_allergies: patientAllergies, patient_age: patientAge })
  })
}

export type PacsAnalysisResult = {
  study_id: string
  modality: string
  body_part: string
  abnormal: boolean
  abnormality_score: number
  finding: string
  impression: string
  suggested_conditions: Array<{ condition: string; probability: number }>
  annotated_regions: Array<{ label: string; x: number; y: number; width: number; height: number; confidence: number; status: string }>
  recommendation: string
  ai_model_version: string
}

export async function analyzePacsImage(studyId?: string, modality: string = 'CR', bodyPart: string = 'CHEST', imageUrl?: string) {
  return request<PacsAnalysisResult>('/api/v1/ai/analyze-pacs-image', {
    method: 'POST',
    body: JSON.stringify({ study_id: studyId, modality, body_part: bodyPart, image_url: imageUrl })
  })
}

export type LabInterpretResult = {
  overall_status: 'NORMAL' | 'ATTENTION' | 'ALERT'
  abnormal_count: number
  patient_friendly_summary: string
  lifestyle_advice: string[]
  items: Array<{
    test_name: string
    result: string
    unit: string
    reference_range: string
    status: string
    insight: string
  }>
}

export async function interpretLabResults(labItems: any[], clinicalSummary?: string) {
  return request<LabInterpretResult>('/api/v1/ai/interpret-lab-results', {
    method: 'POST',
    body: JSON.stringify({ lab_items: labItems, clinical_summary: clinicalSummary })
  })
}

export type FollowupPlanResult = {
  diagnosis: string
  medication_schedule: Array<{
    time_of_day: string
    medicine: string
    instruction: string
    with_food: boolean
  }>
  monitoring_metrics: Array<{
    metric: string
    frequency: string
    target_range: string
  }>
  red_flags: string[]
  re_examination_days: number
  advice: string
}

export async function generateFollowupPlan(diagnosis: string, prescriptionText: string, doctorNotes?: string) {
  return request<FollowupPlanResult>('/api/v1/ai/generate-followup-plan', {
    method: 'POST',
    body: JSON.stringify({ diagnosis, prescription_text: prescriptionText, doctor_notes: doctorNotes })
  })
}

export type BhytAuditResult = {
  audit_passed: boolean
  risk_score: number
  status_label: string
  warnings: Array<{
    category: string
    severity: string
    description: string
    regulation_reference: string
    fix_suggestion: string
  }>
  recommendations: string[]
}

export async function auditBhytClaim(icd10Code: string, servicesOrdered: string[] = [], medicinesOrdered: string[] = [], isInpatient: boolean = false) {
  return request<BhytAuditResult>('/api/v1/ai/audit-bhyt-claim', {
    method: 'POST',
    body: JSON.stringify({ icd10_code: icd10Code, services_ordered: servicesOrdered, medicines_ordered: medicinesOrdered, is_inpatient: isInpatient })
  })
}

export type DeidentifyResult = {
  sanitized_text: string
  detected_pii_count: number
  pii_types_found: string[]
  compliance: string
}

export async function deidentifyRecord(text: string, maskType: string = 'ANONYMIZE') {
  return request<DeidentifyResult>('/api/v1/ai/de-identify-record', {
    method: 'POST',
    body: JSON.stringify({ text, mask_type: maskType })
  })
}

// ==================== NOTIFICATION CENTER MODULE ====================

export type NotificationItem = {
  id: number
  user_id?: number | null
  target_role?: string | null
  title: string
  message: string
  category: 'appointment' | 'prescription' | 'paraclinical' | 'ai_alert' | 'system' | 'payment' | string
  priority: 'urgent' | 'high' | 'normal' | 'info' | string
  action_url?: string | null
  is_read: boolean
  created_at?: string | null
}

export async function fetchNotifications(category?: string, unreadOnly: boolean = false) {
  const params = new URLSearchParams()
  if (category && category !== 'all') params.append('category', category)
  if (unreadOnly) params.append('unread_only', 'true')
  const query = params.toString() ? `?${params.toString()}` : ''
  return request<NotificationItem[]>(`/api/v1/notifications${query}`)
}

export async function fetchUnreadNotificationCount() {
  return request<{ unread_count: number }>('/api/v1/notifications/unread-count')
}

export async function markNotificationRead(notificationId: number) {
  return request<{ success: boolean; id: number }>(`/api/v1/notifications/${notificationId}/read`, {
    method: 'POST'
  })
}

export async function markAllNotificationsRead() {
  return request<{ success: boolean; marked_count: number }>('/api/v1/notifications/mark-all-read', {
    method: 'POST'
  })
}

export async function createNotification(data: Partial<NotificationItem>) {
  return request<NotificationItem>('/api/v1/notifications', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export interface AppointmentEventItem {
  id: number
  appointment_id: number
  action: string
  from_status?: string | null
  to_status?: string | null
  actor_id?: number | null
  actor_name?: string | null
  actor_role?: string | null
  notes?: string | null
  created_at?: string | null
}

export interface ConsultationHistoryItem {
  appointment_id: number
  starts_at?: string | null
  status: string
  reason: string
  doctor_id: number
  doctor_name: string
  diagnosis?: string | null
  icd10_code?: string | null
  is_signed: boolean
  signer_name?: string | null
  prescription_status?: string | null
  national_code?: string | null
  events_count: number
  events: AppointmentEventItem[]
}

export async function getAppointmentHistory(appointmentId: number) {
  return request<AppointmentEventItem[]>(`/api/v1/appointments/${appointmentId}/history`)
}

export async function getPatientConsultationHistory(patientId: number) {
  return request<ConsultationHistoryItem[]>(`/api/v1/patients/${patientId}/consultation-history`)
}

export async function shareLabResult(appointmentId: number, data: {
  report_id: string
  report_name: string
  category_name: string
  conclusion?: string
  summary_text?: string
}) {
  return request<{ success: boolean; message: string; message_id?: number; notification_id?: number }>(
    `/api/v1/appointments/${appointmentId}/share-lab-result`,
    {
      method: 'POST',
      body: JSON.stringify(data)
    }
  )
}

// -------------------------------------------------------------
// 1. Cổng Giám định BHYT Quốc gia (XML 4210 / QĐ 130)
// -------------------------------------------------------------
export interface BHYTClaimItem {
  id: number
  appointment_id: number
  patient_id: number
  ma_lk: string
  ma_the_bhyt: string
  ma_dkbd: string
  muc_huong: number
  ma_benh_chinh: string
  ma_benh_kem?: string | null
  t_tongchi: number
  t_bntt: number
  t_bhyttt: number
  status: string
  gdbhyt_code?: string | null
  submitted_at?: string | null
  created_at: string
}

export interface BHYTXML4210Package {
  appointment_id: number
  ma_lk: string
  patient_name: string
  ma_the_bhyt: string
  muc_huong: number
  xml1_tonghop: string
  xml2_chitietthuoc: string
  xml3_chitietdvkt: string
  xml4_chitietcls: string
  xml5_dienbien: string
  summary_financials: {
    t_tongchi: number
    t_bhyttt: number
    t_bntt: number
    status: string
    gdbhyt_code?: string | null
  }
}

export async function getBHYTClaim(appointmentId: number) {
  return request<BHYTClaimItem>(`/api/v1/bhyt/claims/${appointmentId}`)
}

export async function getBHYTXML4210(appointmentId: number) {
  return request<BHYTXML4210Package>(`/api/v1/bhyt/xml4210/${appointmentId}`)
}

export async function submitBHYTClaim(appointmentId: number) {
  return request<{
    success: boolean
    message: string
    gdbhyt_code: string
    status: string
    t_bhyttt: number
    t_bntt: number
  }>(`/api/v1/bhyt/claims/${appointmentId}/submit`, { method: 'POST' })
}

export async function listBHYTClaims() {
  return request<BHYTClaimItem[]>(`/api/v1/bhyt/claims`)
}

// -------------------------------------------------------------
// 2. Hội chẩn Liên viện & Đa chuyên khoa (Multi-Doctor)
// -------------------------------------------------------------
export interface ConsultationMemberItem {
  id: number
  appointment_id: number
  doctor_id?: number | null
  doctor_name: string
  hospital_name: string
  specialty: string
  role: string
  status: string
  clinical_opinion?: string | null
  joined_at?: string | null
  created_at: string
}

export async function getConsultationMembers(appointmentId: number) {
  return request<ConsultationMemberItem[]>(`/api/v1/appointments/${appointmentId}/multi-doctor/members`)
}

export async function inviteConsultationMember(appointmentId: number, data: {
  doctor_name: string
  hospital_name?: string
  specialty: string
  role?: string
}) {
  return request<ConsultationMemberItem>(`/api/v1/appointments/${appointmentId}/multi-doctor/invite`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function submitConsultationOpinion(appointmentId: number, memberId: number, opinion: string) {
  return request<{ success: boolean; message: string }>(
    `/api/v1/appointments/${appointmentId}/multi-doctor/opinion?member_id=${memberId}`,
    {
      method: 'POST',
      body: JSON.stringify({ clinical_opinion: opinion })
    }
  )
}

// -------------------------------------------------------------
// 3. Giám sát Sinh hiệu Từ xa (RPM IoT)
// -------------------------------------------------------------
export interface RPMVitalItem {
  id: number
  patient_id: number
  device_type: string
  device_name: string
  connection_method: string
  systolic?: number | null
  diastolic?: number | null
  pulse?: number | null
  glucose_value?: number | null
  glucose_context?: string | null
  spo2_percent?: number | null
  temperature_celsius?: number | null
  weight_kg?: number | null
  is_warning: boolean
  warning_message?: string | null
  measured_at: string
  created_at: string
}

export interface RPMDevice {
  name: string
  category: string
  device_type: string
  fda_clearance: string
  connectivity: string
  price_vnd: number
  price_str: string
  origin: string
  accuracy: string
  highlight: string
}

export interface RPMPackage {
  id: string
  name: string
  subtitle: string
  badge: string
  badge_color: string
  total_price_vnd: number
  total_price_str: string
  target_patients: string
  clinical_benefits: string[]
  devices: RPMDevice[]
}

export async function getRPMPackages() {
  return request<RPMPackage[]>(`/api/v1/rpm/packages`)
}

export async function recordRPMVitals(data: {
  patient_id?: number
  device_type: string
  device_name?: string
  connection_method?: string
  systolic?: number
  diastolic?: number
  pulse?: number
  glucose_value?: number
  glucose_context?: string
  spo2_percent?: number
  temperature_celsius?: number
  weight_kg?: number
}) {
  return request<RPMVitalItem>(`/api/v1/rpm/vitals`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function getPatientRPMVitals(patientId: number) {
  return request<RPMVitalItem[]>(`/api/v1/rpm/vitals/${patientId}`)
}

// -------------------------------------------------------------
// 4. Hồ sơ Sức khỏe Gia đình (Family Health Vault)
// -------------------------------------------------------------
export interface FamilyMemberItem {
  id: number
  owner_user_id: number
  full_name: string
  relationship: string
  gender: string
  date_of_birth: string
  phone_number?: string | null
  national_id?: string | null
  bhyt_code?: string | null
  blood_group?: string | null
  allergies?: string | null
  chronic_conditions?: string | null
  created_at: string
}

export async function getFamilyMembers() {
  return request<FamilyMemberItem[]>(`/api/v1/family-members`)
}

export async function createFamilyMember(data: Partial<FamilyMemberItem>) {
  return request<FamilyMemberItem>(`/api/v1/family-members`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function updateFamilyMember(id: number, data: Partial<FamilyMemberItem>) {
  return request<FamilyMemberItem>(`/api/v1/family-members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function deleteFamilyMember(id: number) {
  return request<{ success: boolean; message: string }>(`/api/v1/family-members/${id}`, {
    method: 'DELETE'
  })
}

// -------------------------------------------------------------
// 5. AI PACS Hỗ trợ Chẩn đoán Hình ảnh
// -------------------------------------------------------------
export interface AIPACSConsultationItem {
  id: number
  appointment_id: number
  dicom_study_id?: string | null
  modality: string
  body_part: string
  ai_model_name: string
  primary_finding: string
  confidence_score: number
  findings: Array<{
    pathology: string
    probability: number
    severity: string
    location: string
  }>
  heatmap_regions: Array<{
    box_id: string
    label: string
    x: number
    y: number
    width: number
    height: number
    color: string
    confidence: number
  }>
  doctor_concurrence?: string | null
  doctor_feedback?: string | null
  created_at: string
}

export async function analyzePACSDicom(data: {
  appointment_id: number
  dicom_study_id?: string
  modality?: string
  body_part?: string
  image_url?: string
}) {
  return request<AIPACSConsultationItem>(`/api/v1/pacs/ai-analyze`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function submitPACSFeedback(consultationId: number, data: {
  doctor_concurrence: string
  doctor_feedback?: string
}) {
  return request<{ success: boolean; message: string }>(`/api/v1/pacs/ai-feedback/${consultationId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  })
}











// --- NHẬN DIỆN BỆNH NHÂN ĐÃ CÓ HỒ SƠ KHÁM BỆNH BẰNG CCCD / VNeID (ĐỀ ÁN 06) ---

export interface PreviousVisitSummary {
  appointment_id: number
  date: string
  doctor_name: string
  department_name: string
  status: string
  reason: string
  diagnosis?: string
  icd10_code?: string
  has_prescription: boolean
  has_pacs: boolean
  has_lab: boolean
}

export interface PatientIdentifyResult {
  found: boolean
  patient_type: 'existing_with_history' | 'existing_no_history' | 'his_only' | 'new'
  patient_id?: number
  pid?: string
  full_name?: string
  date_of_birth?: string
  gender?: string
  identity_card?: string
  vneid_level: number
  is_vneid_verified: boolean
  phone_number?: string
  bhyt_code?: string
  address?: string
  blood_type?: string
  allergies?: string
  chronic_conditions: { code: string; display: string }[]
  total_visits: number
  last_visit?: {
    date: string
    doctor_name: string
    department_name: string
    diagnosis_icd10?: string
    diagnosis_text?: string
    prescription_count: number
  }
  visit_history: PreviousVisitSummary[]
  message: string
}

export async function identifyPatientByCCCD(identityCard: string, phoneNumber?: string) {
  return request<PatientIdentifyResult>('/api/v1/patients/identify-by-cccd', {
    method: 'POST',
    body: JSON.stringify({
      identity_card: identityCard,
      phone_number: phoneNumber
    })
  })
}

// --- BƯỚC PHÒNG CHỜ ẢO (VIRTUAL WAITING ROOM) ---

export interface WaitingRoomStatus {
  appointment_id: number
  status: string
  triage_status: string
  queue_number?: number
  patients_ahead: number
  estimated_wait_minutes: number
  doctor_id: number
  doctor_name: string
  doctor_title?: string
  department_name?: string
  patient_name?: string
  vitals?: {
    blood_pressure?: string
    pulse?: number
    temperature?: number
    spo2?: number
    weight?: number
    height?: number
    triage_level?: string
  }
  triage_notes?: string
  entered_waiting_at?: string
  is_called: boolean
  called_at?: string
  room_name?: string
  message: string
}

export async function getWaitingRoomStatus(appointmentId: number): Promise<WaitingRoomStatus> {
  return request<WaitingRoomStatus>(`/api/v1/appointments/${appointmentId}/waiting-status`)
}

export async function sendToWaitingRoom(appointmentId: number): Promise<{ success: boolean; message: string }> {
  return request(`/api/v1/triage/${appointmentId}/send-to-waiting-room`, { method: 'POST' })
}
