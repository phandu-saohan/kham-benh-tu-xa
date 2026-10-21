// Định nghĩa các cấu trúc dữ liệu cho Hệ thống Khám Bệnh Từ Xa & HIS/EMR

export type RoleType = 'doctor' | 'patient';

export interface VitalSignItem {
  value: string | number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  time: string;
  source?: string;
}

export interface PatientVitals {
  heartRate: VitalSignItem;
  bp: VitalSignItem;
  spo2: VitalSignItem;
  temp: VitalSignItem;
  weight: { value: number; unit: string; bmi: number };
  bloodGlucose?: VitalSignItem;
}

export interface LabResult {
  id: string;
  code: string;
  name: string;
  category: 'Huyết học' | 'Sinh hóa' | 'Miễn dịch' | 'Đông máu';
  result: string;
  unit: string;
  ref: string;
  status: 'normal' | 'high' | 'low';
  date: string;
}

export interface ImagingStudy {
  id: string;
  modality: string;
  bodyPart: string;
  date: string;
  performer: string;
  conclusion: string;
  pacsCode: string;
  imageUrl: string;
}

export interface DicomAnnotation {
  id: string;
  type: 'pen' | 'box' | 'ruler';
  points: { x: number; y: number }[];
  color: string;
  label?: string;
  measurementMm?: number;
}

export interface EmrHistoryItem {
  id: string;
  date: string;
  department: string;
  doctor: string;
  icd10: string;
  summary: string;
  type: string;
}

export interface CpoeOrderItem {
  id: string;
  type: 'lis' | 'ris';
  code: string;
  name: string;
  department: string;
  price: number;
  sampleType?: string;
  fastTrackAvailable: boolean;
  selected?: boolean;
}

export interface PrescriptionItem {
  id: string;
  drugId: string;
  name: string;
  activeIngredient: string;
  category: string;
  unit: string;
  morning: string;
  noon: string;
  evening: string;
  night: string;
  days: number;
  quantity: number;
  route: string;
  usage: string;
  isPenicillinClass?: boolean;
}

export interface DrugCatalogItem {
  id: string;
  name: string;
  activeIngredient: string;
  category: string;
  unit: string;
  stock: number;
  defaultMorning: string;
  defaultNoon: string;
  defaultEvening: string;
  defaultNight: string;
  defaultDays: number;
  defaultRoute: string;
  defaultUsage: string;
  isPenicillinClass: boolean;
  contraindications: string;
}

export interface Icd10Item {
  code: string;
  name: string;
  category: string;
}

export interface PreTriageQuestionnaire {
  chiefComplaint: string;
  durationDays: number;
  painScale: number; // 1-10
  feverLevel: string;
  symptoms: string[];
  pastMedsTaken: string;
  submittedAt?: string;
}

export interface PostCareReport {
  submitted: boolean;
  recoveryStatus: 'significant_improvement' | 'moderate' | 'unchanged' | 'worsened';
  painScaleNow: number;
  sideEffects: string[];
  patientNotes: string;
  submittedAt?: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: 'Nam' | 'Nữ';
  bhyt: string;
  bloodType: string;
  phone: string;
  address: string;
  appointmentTime: string;
  status: 'Đang khám' | 'Đang chờ' | 'Đã hoàn thành';
  triagePriority: 'Cấp 1 - Đỏ' | 'Cấp 2 - Vàng' | 'Cấp 3 - Xanh';
  allergies: string[];
  chronicConditions: string[];
  vitals: PatientVitals;
  reasonForVisit: string;
  reportedSymptoms: string[];
  emrHistory: EmrHistoryItem[];
  labs: LabResult[];
  imaging: ImagingStudy[];
  preTriageQuestionnaire: PreTriageQuestionnaire;
  postCareReport: PostCareReport;
}

export interface BluetoothDeviceInfo {
  id: string;
  name: string;
  serviceUuid: string;
  type: 'bp' | 'spo2' | 'stethoscope' | 'glucose';
  connected: boolean;
  battery: number;
  lastReading?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  role: string;
  action: string;
  resource: string;
  details: string;
  consentStatus: 'Đã xác thực đồng thuận (e-Consent)' | 'Quyền Bác sĩ phiên trực' | 'Tự động hệ thống';
  status: 'SUCCESS' | 'WARN' | 'BLOCKED';
}

export interface ChatMessage {
  id: string;
  sender: 'doctor' | 'patient' | 'specialist';
  senderName: string;
  time: string;
  text: string;
  attachment?: {
    type: 'image' | 'vital_snapshot' | 'lab_snapshot' | 'link';
    title: string;
    tag: string;
    url?: string;
    previewType?: string;
  } | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Nam' | 'Nữ';
  patientPhone: string;
  appointmentTime: string;
  date: string;
  doctorName: string;
  doctorTitle: string;
  specialty: string;
  status: 'waiting' | 'calling' | 'in_consultation' | 'completed' | 'missed';
  triagePriority: 'Cấp 1 - Đỏ' | 'Cấp 2 - Vàng' | 'Cấp 3 - Xanh';
  reason: string;
  symptoms: string[];
  vitals?: { bp: string; hr: number; spo2: number };
  consultationType?: 'telehealth' | 'in_person';
  cost?: number;
  bhytCovered?: number;
  patientPaid?: number;
  paymentStatus?: 'unpaid' | 'paid_vietqr' | 'covered_by_bhyt';
  qrCheckinCode?: string;
}

export interface DoctorProfile {
  id: string;
  name: string;
  title: string;
  specialty: string;
  department: string;
  experienceYears: number;
  rating: number;
  totalConsultations: number;
  consultationFee: number;
  bhytCoveredAmount: number;
  avatar: string;
  about: string;
  availableDays: string[];
  timeSlots: string[];
}

export interface CallSignalingState {
  status: 'idle' | 'calling' | 'incoming' | 'connected' | 'declined' | 'ended';
  callerName: string;
  callerTitle: string;
  patientId: string;
  patientName: string;
  channelId: string;
  startedAt?: string;
}
