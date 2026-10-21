import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import {
  Patient, RoleType, CpoeOrderItem, PrescriptionItem,
  DrugCatalogItem, DicomAnnotation, BluetoothDeviceInfo,
  AuditLogItem, ChatMessage, PreTriageQuestionnaire, PostCareReport,
  Appointment, CallSignalingState, DoctorProfile
} from '../types/telemedicine';
import {
  INITIAL_PATIENTS, PHARMACY_INVENTORY, CPOE_CATALOG,
  INITIAL_BLUETOOTH_DEVICES, INITIAL_AUDIT_LOGS, ICD10_CATALOG,
  INITIAL_APPOINTMENTS, DOCTOR_PROFILES
} from '../data/mockData';
import { webSocketSync } from '../services/websocketService';
import { RingtoneService } from '../services/ringtoneService';
import { webrtcService } from '../services/webrtcService';

interface TelemedicineContextType {
  // Global & Navigation
  role: RoleType;
  setRole: (role: RoleType) => void;
  patients: Patient[];
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;
  currentPatient: Patient;
  isLowBandwidth: boolean;
  setIsLowBandwidth: (val: boolean | ((prev: boolean) => boolean)) => void;
  isAuditModalOpen: boolean;
  setIsAuditModalOpen: (open: boolean) => void;
  isEConsentModalOpen: boolean;
  setIsEConsentModalOpen: (open: boolean) => void;
  isNationalRxModalOpen: boolean;
  setIsNationalRxModalOpen: (open: boolean) => void;
  isBhytXmlModalOpen: boolean;
  setIsBhytXmlModalOpen: (open: boolean) => void;
  auditLogs: AuditLogItem[];
  addAuditLog: (action: string, resource: string, details: string, status?: 'SUCCESS' | 'WARN' | 'BLOCKED') => void;
  toastMessage: { text: string; type: 'success' | 'warning' | 'info' | 'error' } | null;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  hisSyncState: { isSyncing: boolean; lastSyncTime: string };
  syncWithHis: () => void;

  // Video Call & Consultation
  callState: {
    isConnected: boolean;
    isMicMuted: boolean;
    isCamOff: boolean;
    isScreenSharing: boolean;
    useRealWebcam: boolean;
    callSeconds: number;
  };
  setCallState: React.Dispatch<React.SetStateAction<{
    isConnected: boolean;
    isMicMuted: boolean;
    isCamOff: boolean;
    isScreenSharing: boolean;
    useRealWebcam: boolean;
    callSeconds: number;
  }>>;
  activeConsultationSpecialist: 'cardiologist' | 'pharmacist' | null;
  setActiveConsultationSpecialist: (specialist: 'cardiologist' | 'pharmacist' | null) => void;
  isConsultModalOpen: boolean;
  setIsConsultModalOpen: (open: boolean) => void;
  inviteSpecialist: (specialist: 'cardiologist' | 'pharmacist') => void;
  removeSpecialist: () => void;

  // Telemetry & Waves
  telemetry: {
    signalType: 'ecg' | 'stethoscope';
    stethoscopeFilter: 'cardiac' | 'pulmonary';
    isRecordingAuscultation: boolean;
    recordingCountdown: number;
    auscultationClips: { id: string; timestamp: string; filter: string; duration: string; title: string }[];
    isTriggeringRemoteBP: boolean;
    remoteBpCountdown: number;
  };
  setTelemetrySignalType: (type: 'ecg' | 'stethoscope') => void;
  setStethoscopeFilter: (filter: 'cardiac' | 'pulmonary') => void;
  triggerRemoteBPMeasurement: () => void;
  trigger15sAuscultationRecording: () => void;

  // AI Medical Scribe
  aiScribe: {
    isListening: boolean;
    transcript: { id: string; speaker: string; text: string; time: string }[];
    isExtractingSoap: boolean;
  };
  toggleAiListening: () => void;
  triggerAiExtractSoap: () => void;

  // EMR Workspace (Doctor 5 Tabs)
  activeEmrTab: 'triage' | 'pacs' | 'cpoe' | 'soap' | 'prescription';
  setActiveEmrTab: (tab: 'triage' | 'pacs' | 'cpoe' | 'soap' | 'prescription') => void;
  
  // Tab 2: DICOM PACS Viewer & Annotation Sync
  dicomState: {
    selectedStudyId: string;
    windowLevel: number; // Brightness
    windowWidth: number; // Contrast
    zoom: number;
    pan: { x: number; y: number };
    activeTool: 'pan' | 'pen' | 'box' | 'ruler';
    annotations: DicomAnnotation[];
  };
  setDicomSelectedStudyId: (id: string) => void;
  setDicomWindowLevel: (wl: number) => void;
  setDicomWindowWidth: (ww: number) => void;
  setDicomZoom: (zoom: number) => void;
  setDicomPan: (pan: { x: number; y: number }) => void;
  setDicomActiveTool: (tool: 'pan' | 'pen' | 'box' | 'ruler') => void;
  addDicomAnnotation: (annotation: DicomAnnotation) => void;
  clearDicomAnnotations: () => void;

  // Tab 3: CPOE Orders
  cpoeOrders: CpoeOrderItem[];
  toggleCpoeOrder: (id: string) => void;
  cpoeFulfillmentMode: 'fast_track_hospital' | 'home_sampling';
  setCpoeFulfillmentMode: (mode: 'fast_track_hospital' | 'home_sampling') => void;
  isCpoeSubmitted: boolean;
  cpoePaymentStatus: 'unpaid' | 'paid';
  submitCpoeOrders: () => void;
  simulatePaymentSuccess: () => void;

  // Tab 4: SOAP & ICD-10
  soapNote: {
    subjective: string;
    objective: string;
    primaryIcd: string;
    secondaryIcd: string;
    diagnosisText: string;
    treatmentPlan: string;
    followUpDate: string;
    isPublishedToPatient: boolean;
  };
  updateSoapField: (field: string, value: string | boolean) => void;
  saveSoapNote: () => void;

  // Tab 5: e-Prescription & CDS Blocker
  prescriptions: PrescriptionItem[];
  selectedDrugCatalogId: string;
  setSelectedDrugCatalogId: (id: string) => void;
  addPrescriptionDrug: (drugId?: string) => void;
  removePrescriptionDrug: (id: string) => void;
  updatePrescriptionField: (id: string, field: string, value: any) => void;
  allergyBlockerModal: { drug: DrugCatalogItem; allergen: string } | null;
  setAllergyBlockerModal: (data: { drug: DrugCatalogItem; allergen: string } | null) => void;
  overrideAllergyBlocker: (reason: string) => void;
  isSmartCASigned: boolean;
  nationalPrescriptionCode: string;
  signSmartCAAndPublish: () => void;

  // Patient Portal
  patientCurrentStep: 1 | 2 | 3 | 4;
  setPatientCurrentStep: (step: 1 | 2 | 3 | 4) => void;
  bluetoothDevices: BluetoothDeviceInfo[];
  toggleBluetoothDevice: (deviceId: string) => void;
  simulateBleReading: (deviceId: string) => void;
  submitPatientQuestionnaire: (answers: PreTriageQuestionnaire) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string, attachment?: any) => void;
  medicationAdherence: { [rxId: string]: { morning: boolean; noon: boolean; evening: boolean; night: boolean } };
  toggleMedicationDoseTaken: (rxId: string, dose: 'morning' | 'noon' | 'evening' | 'night') => void;
  submitPostCareSurvey: (report: PostCareReport) => void;

  // Quy trình: Dashboard Lịch Hẹn & Tín hiệu Gọi Khám
  activeView: 'dashboard' | 'consultation';
  setActiveView: (view: 'dashboard' | 'consultation') => void;
  appointments: Appointment[];
  callSignaling: CallSignalingState;
  startDoctorCall: (appointmentId: string) => void;
  recallPatient: (appointmentId: string) => void;
  acceptIncomingCall: () => void;
  declineIncomingCall: () => void;
  endCallAndReturnToDashboard: () => void;

  // Module Đặt Lịch Khám (Appointment Booking Module)
  isBookingModalOpen: boolean;
  setIsBookingModalOpen: (open: boolean) => void;
  doctorProfiles: DoctorProfile[];
  selectedDoctorForBooking: DoctorProfile | null;
  setSelectedDoctorForBooking: (doc: DoctorProfile | null) => void;
  bookAppointment: (data: Omit<Appointment, 'id'>) => Appointment;
  cancelAppointment: (id: string) => void;
}

const TelemedicineContext = createContext<TelemedicineContextType | undefined>(undefined);

export const TelemedicineProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Global & Navigation State
  const [role, setRoleState] = useState<RoleType>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('role');
      if (p === 'patient') return 'patient';
      if (p === 'doctor') return 'doctor';
    }
    return 'doctor';
  });

  const [activeView, setActiveView] = useState<'dashboard' | 'consultation'>('dashboard');
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [callSignaling, setCallSignaling] = useState<CallSignalingState>({
    status: 'idle',
    callerName: 'BS.CKII Vũ Minh Đức',
    callerTitle: 'Bác sĩ phụ trách - Khoa Nội',
    patientId: 'HIS-2026-0892',
    patientName: 'Nguyễn Văn An',
    channelId: 'telehealth-room-04'
  });

  const setRole = (newRole: RoleType) => {
    setRoleState(newRole);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('role', newRole);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('HIS-2026-0892');
  const currentPatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  
  const [isLowBandwidth, setIsLowBandwidth] = useState<boolean>(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isEConsentModalOpen, setIsEConsentModalOpen] = useState<boolean>(false);
  const [isNationalRxModalOpen, setIsNationalRxModalOpen] = useState<boolean>(false);
  const [isBhytXmlModalOpen, setIsBhytXmlModalOpen] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [doctorProfiles] = useState<DoctorProfile[]>(DOCTOR_PROFILES);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<DoctorProfile | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' | 'error' } | null>(null);
  const [hisSyncState, setHisSyncState] = useState<{ isSyncing: boolean; lastSyncTime: string }>({
    isSyncing: false,
    lastSyncTime: '09:30:15'
  });

  const showToast = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const addAuditLog = (action: string, resource: string, details: string, status: 'SUCCESS' | 'WARN' | 'BLOCKED' = 'SUCCESS') => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const newLog: AuditLogItem = {
      id: `LOG-${Date.now().toString().slice(-4)}`,
      timestamp: timeStr,
      actorId: role === 'doctor' ? 'BS-004821' : currentPatient.id,
      actorName: role === 'doctor' ? 'BS.CKII Vũ Minh Đức' : `BN. ${currentPatient.name}`,
      role: role === 'doctor' ? 'Bác sĩ lâm sàng' : 'Bệnh nhân (e-Portal)',
      action,
      resource,
      details,
      consentStatus: 'Đã xác thực đồng thuận (e-Consent)',
      status
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const syncWithHis = () => {
    setHisSyncState(prev => ({ ...prev, isSyncing: true }));
    addAuditLog('HL7_FHIR_RESYNC', `Patient/${currentPatient.id}`, 'Yêu cầu đồng bộ hai chiều gói FHIR Bundle R4 với máy chủ HIS Bệnh viện');
    setTimeout(() => {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      setHisSyncState({ isSyncing: false, lastSyncTime: timeStr });
      showToast(`Đã đồng bộ thành công dữ liệu HL7 FHIR cho bệnh nhân ${currentPatient.name}!`, 'success');
    }, 700);
  };

  // Video Call State
  const [callState, setCallState] = useState({
    isConnected: true,
    isMicMuted: false,
    isCamOff: false,
    isScreenSharing: false,
    useRealWebcam: false,
    callSeconds: 862 // 14:22
  });

  useEffect(() => {
    if (!callState.isConnected) return;
    const interval = setInterval(() => {
      setCallState(prev => ({ ...prev, callSeconds: prev.callSeconds + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [callState.isConnected]);

  // Multi-doctor Consultation State
  const [activeConsultationSpecialist, setActiveConsultationSpecialist] = useState<'cardiologist' | 'pharmacist' | null>(null);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState<boolean>(false);

  const inviteSpecialist = (specialist: 'cardiologist' | 'pharmacist') => {
    setActiveConsultationSpecialist(specialist);
    setIsConsultModalOpen(false);
    const specialistName = specialist === 'cardiologist' ? 'BS.CKII Trần Minh Hoàng (Tim mạch)' : 'Dược sĩ Lâm sàng Lê Thu Thảo';
    showToast(`Đã kết nối phiên hội chẩn 3 bên với ${specialistName}!`, 'info');
    addAuditLog('MULTI_CONSULT_INVITE', `Practitioner/${specialist}`, `Mời hội chẩn đa chuyên khoa liên viện: ${specialistName}`);
  };

  const removeSpecialist = () => {
    setActiveConsultationSpecialist(null);
    showToast('Đã kết thúc phiên hội chẩn liên chuyên khoa.', 'info');
  };

  // Telemetry & Waves
  const [telemetry, setTelemetry] = useState({
    signalType: 'ecg' as 'ecg' | 'stethoscope',
    stethoscopeFilter: 'cardiac' as 'cardiac' | 'pulmonary',
    isRecordingAuscultation: false,
    recordingCountdown: 15,
    auscultationClips: [
      { id: 'clip-01', timestamp: '09:18:22', filter: 'Chế độ Tim (20-200Hz)', duration: '15s', title: 'Tiếng T1-T2 rõ, không âm thổi bệnh lý' }
    ],
    isTriggeringRemoteBP: false,
    remoteBpCountdown: 5
  });

  const setTelemetrySignalType = (type: 'ecg' | 'stethoscope') => {
    setTelemetry(prev => ({ ...prev, signalType: type }));
    addAuditLog('TELEMETRY_SWITCH_MODE', 'DeviceComponent/Waveform', `Bác sĩ chuyển sang chế độ đo sóng: ${type === 'ecg' ? 'Điện tim ECG Lead II' : 'Ống nghe điện tử'}`);
  };

  const setStethoscopeFilter = (filter: 'cardiac' | 'pulmonary') => {
    setTelemetry(prev => ({ ...prev, stethoscopeFilter: filter }));
    showToast(`Đã chuyển bộ lọc âm thanh: ${filter === 'cardiac' ? 'Chế độ Tim (20-200Hz)' : 'Chế độ Phổi (100-1000Hz)'}`, 'info');
  };

  const triggerRemoteBPMeasurement = () => {
    if (telemetry.isTriggeringRemoteBP) return;
    setTelemetry(prev => ({ ...prev, isTriggeringRemoteBP: true, remoteBpCountdown: 5 }));
    webSocketSync.send('TRIGGER_REMOTE_BP', null, 'doctor');
    showToast('Đã gửi tín hiệu bơm đo huyết áp từ xa tới máy Omron BLE của bệnh nhân!', 'info');
    addAuditLog('REMOTE_DEVICE_TRIGGER', 'Device/Omron-BLE-0x1810', 'Bác sĩ kích hoạt lệnh đo Huyết áp & Nhịp tim từ xa');

    const countdownTimer = setInterval(() => {
      setTelemetry(prev => {
        if (prev.remoteBpCountdown <= 1) {
          clearInterval(countdownTimer);
          // Cập nhật số đo sinh hiệu mới
          const newSys = Math.floor(138 + Math.random() * 8);
          const newDia = Math.floor(86 + Math.random() * 6);
          const newHr = Math.floor(80 + Math.random() * 6);
          const bpStr = `${newSys}/${newDia}`;

          setPatients(pts => pts.map(p => {
            if (p.id !== currentPatient.id) return p;
            return {
              ...p,
              vitals: {
                ...p.vitals,
                bp: { value: bpStr, unit: 'mmHg', status: newSys > 140 ? 'warning' : 'normal', time: 'Vừa đo tức thì', source: 'Omron HEM-7361T (Remote)' },
                heartRate: { value: newHr, unit: 'BPM', status: 'normal', time: 'Vừa đo tức thì', source: 'Omron Connect BLE' }
              }
            };
          }));

          showToast(`Đã nhận chỉ số huyết áp mới: ${bpStr} mmHg, Mạch: ${newHr} BPM!`, 'success');
          return { ...prev, isTriggeringRemoteBP: false, remoteBpCountdown: 5 };
        }
        return { ...prev, remoteBpCountdown: prev.remoteBpCountdown - 1 };
      });
    }, 1000);
  };

  const trigger15sAuscultationRecording = () => {
    if (telemetry.isRecordingAuscultation) return;
    setTelemetry(prev => ({ ...prev, isRecordingAuscultation: true, recordingCountdown: 15 }));
    showToast('Bắt đầu ghi âm 15 giây âm thanh Tim/Phổi độ phân giải cao...', 'info');
    addAuditLog('AUSCULTATION_RECORD_START', 'Media/AuscultationWave', `Bác sĩ ghi âm 15s ống nghe Littmann CORE (${telemetry.stethoscopeFilter})`);

    const timer = setInterval(() => {
      setTelemetry(prev => {
        if (prev.recordingCountdown <= 1) {
          clearInterval(timer);
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          const newClip = {
            id: `clip-${Date.now().toString().slice(-4)}`,
            timestamp: timeStr,
            filter: prev.stethoscopeFilter === 'cardiac' ? 'Chế độ Tim (20-200Hz)' : 'Chế độ Phổi (100-1000Hz)',
            duration: '15s',
            title: prev.stethoscopeFilter === 'cardiac' ? 'Tiếng tim T1-T2 đều rõ, không ghi nhận rù tâm trương' : 'Rì rào phế nang êm dịu 2 phế trường, không rale rít'
          };
          showToast('Đã hoàn tất ghi âm 15s tiếng tim/phổi và lưu vào kho lưu trữ EMR!', 'success');
          addAuditLog('AUSCULTATION_RECORD_SAVED', `Observation/${newClip.id}`, `Đã lưu bản ghi âm ống nghe vào hồ sơ bệnh án`);
          return {
            ...prev,
            isRecordingAuscultation: false,
            recordingCountdown: 15,
            auscultationClips: [newClip, ...prev.auscultationClips]
          };
        }
        return { ...prev, recordingCountdown: prev.recordingCountdown - 1 };
      });
    }, 1000);
  };

  // AI Medical Scribe State
  const [aiScribe, setAiScribe] = useState({
    isListening: true,
    transcript: [
      { id: 't1', speaker: 'Bác sĩ Đức', text: 'Chào anh An, tôi xem kết quả đo huyết áp sáng nay trên app Omron là 145/92 mmHg. Vùng thượng vị còn đau tức nhiều không?', time: '09:20' },
      { id: 't2', speaker: 'Bệnh nhân An', text: 'Chào bác sĩ, bụng trên rốn tôi đau âm ỉ rát rát, sau khi ăn thì ợ chua lên họng khó chịu lắm. Tối nằm xuống là bị trào ngược.', time: '09:21' },
      { id: 't3', speaker: 'Bác sĩ Đức', text: 'Triệu chứng này phù hợp đợt tái phát của trào ngược dạ dày thực quản GERD kết hợp đợt tăng huyết áp nhẹ. Anh có dùng thuốc kháng sinh nào không?', time: '09:22' },
      { id: 't4', speaker: 'Bệnh nhân An', text: 'Dạ không bác sĩ, hồi năm 2018 tôi từng bị dị ứng Penicillin tiêm ở trạm xá nổi mề đay khó thở nên sợ lắm, không dám tự ý uống thuốc.', time: '09:23' },
      { id: 't5', speaker: 'Bác sĩ Đức', text: 'Đúng rồi, hồ sơ bệnh viện đã khóa cảnh báo đỏ dị ứng Penicillin nhóm Beta-lactam. Tôi sẽ kê thuốc kháng tiết axit nhóm PPI chuẩn và thuốc bao niêm mạc.', time: '09:24' }
    ],
    isExtractingSoap: false
  });

  const toggleAiListening = () => {
    setAiScribe(prev => ({ ...prev, isListening: !prev.isListening }));
    showToast(aiScribe.isListening ? 'Đã tạm dừng AI Medical Scribe' : 'AI Medical Scribe đang lắng nghe hội thoại lâm sàng', 'info');
  };

  // SOAP & ICD-10 State
  const [soapNote, setSoapNote] = useState({
    subjective: 'Bệnh nhân nam 48 tuổi, tiền sử THA và GERD. Khai báo đau rát âm ỉ thượng vị 3 ngày nay, tăng sau ăn và về đêm kèm ợ nóng, ợ chua trào ngược lên cổ họng. Có cảm giác nặng đầu nhẹ khi thức dậy.',
    objective: 'Bệnh nhân tỉnh táo, tiếp xúc tốt qua Telehealth. Da niêm hồng, không khó thở. Sinh hiệu IoT Omron ghi nhận: HA 145/92 mmHg, Mạch 88 bpm, SpO2 98%, Nhiệt độ 37.8°C. Không phù ngoại biên.',
    primaryIcd: 'K21.0',
    secondaryIcd: 'I10',
    diagnosisText: 'Trào ngược dạ dày - thực quản đợt cấp (GERD) / Bệnh tăng huyết áp vô căn độ 1 đang điều trị / Tiền sử dị ứng Penicillin nặng',
    treatmentPlan: '1. Điều trị ức chế bơm proton: Esomeprazole (Nexium) 40mg uống sáng trước ăn 30p trong 14 ngày.\n2. Trung hòa acid & ngăn trào ngược: Gaviscon Dual Action uống sau ăn và trước ngủ.\n3. Duy trì thuốc hạ áp Amlodipine 5mg buổi sáng; đo HA định kỳ 2 lần/ngày qua app.\n4. Kiêng rượu bia, cà phê, dầu mỡ cay nóng. Không nằm ngay sau ăn tối thiểu 2 giờ.\n5. Tái khám sau 14 ngày.',
    followUpDate: '30/10/2026',
    isPublishedToPatient: true
  });

  const updateSoapField = (field: string, value: string | boolean) => {
    setSoapNote(prev => ({ ...prev, [field]: value }));
  };

  const saveSoapNote = () => {
    setSoapNote(prev => ({ ...prev, isPublishedToPatient: true }));
    webSocketSync.send('SYNC_SOAP', soapNote, 'doctor');
    syncWithHis();
    addAuditLog('UPDATE_EMR_SOAP', `Encounter/ENC-${Date.now().toString().slice(-4)}`, `Lưu bệnh án SOAP và cập nhật mã ICD-10 [${soapNote.primaryIcd}]`);
    showToast('Đã lưu bệnh án điện tử SOAP và gửi tóm tắt chẩn đoán sang Cổng Bệnh nhân!', 'success');
  };

  const triggerAiExtractSoap = () => {
    setAiScribe(prev => ({ ...prev, isExtractingSoap: true }));
    showToast('AI đang phân tích giọng nói hội thoại & sinh hiệu IoT để trích xuất SOAP...', 'info');

    setTimeout(() => {
      const extractedNote = {
        subjective: 'Bệnh nhân đau tức vùng thượng vị lan lên sau xương ức, ợ nóng nhiều về đêm, sốt nhẹ 37.8°C. Tiền sử dị ứng Penicillin ghi nhận rõ trong lời thoại.',
        objective: 'Tiếp xúc tốt, không suy hô hấp. Sinh hiệu IoT tức thì: HA 145/92 mmHg (Tăng nhẹ độ 1), Mạch 88 BPM, SpO2 98%. Âm phế nang êm.',
        primaryIcd: 'K21.0',
        secondaryIcd: 'I10',
        diagnosisText: 'Bệnh trào ngược dạ dày-thực quản có viêm thực quản (GERD K21.0) / Tăng huyết áp vô căn (I10) / Dị ứng Penicillin',
        treatmentPlan: '1. Kháng tiết axit: Nexium Mups 40mg x 14 ngày.\n2. Thuốc tráng bảo vệ niêm mạc: Gaviscon Dual Action x 10 ngày.\n3. Duy trì huyết áp: Amlor 5mg x 14 ngày.\n4. Tuyệt đối không dùng kháng sinh nhóm Penicillin/Beta-lactam.\n5. Tái khám sau 2 tuần.',
        followUpDate: '30/10/2026',
        isPublishedToPatient: true
      };
      setSoapNote(extractedNote);
      webSocketSync.send('SYNC_SOAP', extractedNote, 'doctor');
      setAiScribe(prev => ({ ...prev, isExtractingSoap: false }));
      showToast('AI Scribe đã tự động điền đầy đủ cấu trúc SOAP và mã bệnh ICD-10 chuẩn!', 'success');
      addAuditLog('AI_SOAP_EXTRACTION', 'ClinicalDocument/SOAP', 'Hệ thống AI NLP hoàn tất trích xuất tự động hồ sơ lâm sàng');
    }, 1200);
  };

  // EMR Tabs
  const [activeEmrTab, setActiveEmrTab] = useState<'triage' | 'pacs' | 'cpoe' | 'soap' | 'prescription'>('triage');

  // DICOM PACS Viewer State
  const [dicomState, setDicomState] = useState({
    selectedStudyId: 'IMG-2026-88',
    windowLevel: 128,
    windowWidth: 256,
    zoom: 1,
    pan: { x: 0, y: 0 },
    activeTool: 'pen' as 'pan' | 'pen' | 'box' | 'ruler',
    annotations: [
      {
        id: 'ann-init-1',
        type: 'box' as const,
        points: [{ x: 310, y: 180 }, { x: 420, y: 260 }],
        color: '#ef4444',
        label: 'Vùng quai động mạch chủ hơi giãn'
      }
    ]
  });

  const setDicomSelectedStudyId = (id: string) => setDicomState(prev => ({ ...prev, selectedStudyId: id }));
  const setDicomWindowLevel = (wl: number) => {
    setDicomState(prev => ({ ...prev, windowLevel: wl }));
    webSocketSync.send('SYNC_DICOM_VIEWPORT', { windowLevel: wl }, 'doctor');
  };
  const setDicomWindowWidth = (ww: number) => {
    setDicomState(prev => ({ ...prev, windowWidth: ww }));
    webSocketSync.send('SYNC_DICOM_VIEWPORT', { windowWidth: ww }, 'doctor');
  };
  const setDicomZoom = (zoom: number) => {
    setDicomState(prev => ({ ...prev, zoom }));
    webSocketSync.send('SYNC_DICOM_VIEWPORT', { zoom }, 'doctor');
  };
  const setDicomPan = (pan: { x: number; y: number }) => {
    setDicomState(prev => ({ ...prev, pan }));
    webSocketSync.send('SYNC_DICOM_VIEWPORT', { pan }, 'doctor');
  };
  const setDicomActiveTool = (tool: 'pan' | 'pen' | 'box' | 'ruler') => setDicomState(prev => ({ ...prev, activeTool: tool }));

  const addDicomAnnotation = (ann: DicomAnnotation) => {
    setDicomState(prev => ({ ...prev, annotations: [...prev.annotations, ann] }));
    webSocketSync.send('SYNC_DICOM_ANNOTATION', ann, 'doctor');
    addAuditLog('PACS_ANNOTATION_SYNC', `Study/${dicomState.selectedStudyId}`, `Bác sĩ vẽ chú thích (${ann.type}) trên ảnh DICOM và đồng bộ tức thì sang người bệnh`);
  };

  const clearDicomAnnotations = () => {
    setDicomState(prev => ({ ...prev, annotations: [] }));
    webSocketSync.send('CLEAR_DICOM_ANNOTATIONS', null, 'doctor');
    showToast('Đã xóa tất cả nét vẽ chú thích trên phim DICOM', 'info');
  };

  // CPOE Orders
  const [cpoeOrders, setCpoeOrders] = useState<CpoeOrderItem[]>([
    { ...CPOE_CATALOG[0], selected: true }, // CBC
    { ...CPOE_CATALOG[1], selected: true }, // Lipid
    { ...CPOE_CATALOG[3], selected: true }, // HP test
    { ...CPOE_CATALOG[6], selected: false }, // X-Ray
    { ...CPOE_CATALOG[7], selected: false } // US Abdomen
  ]);
  const [cpoeFulfillmentMode, setCpoeFulfillmentMode] = useState<'fast_track_hospital' | 'home_sampling'>('fast_track_hospital');
  const [isCpoeSubmitted, setIsCpoeSubmitted] = useState<boolean>(true);
  const [cpoePaymentStatus, setCpoePaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');

  const toggleCpoeOrder = (id: string) => {
    setCpoeOrders(prev => prev.map(o => o.id === id ? { ...o, selected: !o.selected } : o));
  };

  const submitCpoeOrders = () => {
    setIsCpoeSubmitted(true);
    setCpoePaymentStatus('unpaid');
    const selectedCount = cpoeOrders.filter(o => o.selected).length;
    showToast(`Đã chỉ định ${selectedCount} dịch vụ cận lâm sàng! Đã tạo hóa đơn & mã Barcode cho Bệnh nhân.`, 'success');
    addAuditLog('CPOE_ORDER_SUBMIT', `ServiceRequest/CPOE-${Date.now().toString().slice(-4)}`, `Bác sĩ ban hành chỉ định CPOE: ${selectedCount} khoản`);
  };

  const simulatePaymentSuccess = () => {
    setCpoePaymentStatus('paid');
    webSocketSync.send('PAYMENT_RECONCILED', { status: 'PAID' }, 'patient');
    showToast('Xác nhận thanh toán VietQR thành công! Hệ thống HIS đã tự động gạch nợ (Auto-Reconciled).', 'success');
    addAuditLog('BILLING_RECONCILED', `PaymentNotice/Napas247-${Date.now().toString().slice(-4)}`, 'Hệ thống ngân hàng & HIS đối soát thanh toán tự động: ĐÃ THU TIỀN');
  };

  // e-Prescription & CDS Blocker State
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      id: 'RX-001',
      drugId: 'DRG-001',
      name: 'Nexium Mups 40mg (Esomeprazole)',
      activeIngredient: 'Esomeprazole 40mg',
      category: 'Dạ dày - PPI',
      unit: 'Viên',
      morning: '1',
      noon: '0',
      evening: '0',
      night: '0',
      days: 14,
      quantity: 14,
      route: 'Uống',
      usage: 'Uống trước bữa ăn sáng 30 - 60 phút',
      isPenicillinClass: false
    },
    {
      id: 'RX-002',
      drugId: 'DRG-002',
      name: 'Gaviscon Dual Action (Gói 10ml)',
      activeIngredient: 'Natri alginat + Calci carbonat',
      category: 'Kháng acid & chống trào ngược',
      unit: 'Gói',
      morning: '1',
      noon: '1',
      evening: '1',
      night: '1',
      days: 10,
      quantity: 30,
      route: 'Uống',
      usage: 'Uống sau các bữa ăn 30 phút và trước khi đi ngủ',
      isPenicillinClass: false
    },
    {
      id: 'RX-003',
      drugId: 'DRG-003',
      name: 'Amlor 5mg (Amlodipine - Pfizer)',
      activeIngredient: 'Amlodipine 5mg',
      category: 'Hạ áp chẹn kênh calci',
      unit: 'Viên',
      morning: '1',
      noon: '0',
      evening: '0',
      night: '0',
      days: 14,
      quantity: 14,
      route: 'Uống',
      usage: 'Uống buổi sáng sau ăn, theo dõi huyết áp hàng ngày',
      isPenicillinClass: false
    }
  ]);

  const [selectedDrugCatalogId, setSelectedDrugCatalogId] = useState<string>('DRG-PEN-01'); // Mặc định là Augmentin để sẵn sàng kiểm tra CDS Blocker
  const [allergyBlockerModal, setAllergyBlockerModal] = useState<{ drug: DrugCatalogItem; allergen: string } | null>(null);
  const [isSmartCASigned, setIsSmartCASigned] = useState<boolean>(true);
  const [nationalPrescriptionCode, setNationalPrescriptionCode] = useState<string>('DT-2026-89410294');

  const addPrescriptionDrug = (drugId?: string) => {
    const targetId = drugId || selectedDrugCatalogId;
    const drug = PHARMACY_INVENTORY.find(d => d.id === targetId);
    if (!drug) return;

    // KIỂM TRA CDS (CLINICAL DECISION SUPPORT) ALLERGY BLOCKER
    const hasPenicillinAllergy = currentPatient.allergies.some(a => a.toLowerCase().includes('penicillin'));
    if (drug.isPenicillinClass && hasPenicillinAllergy) {
      setAllergyBlockerModal({
        drug,
        allergen: 'Penicillin (Tiền sử Sốc phản vệ độ III)'
      });
      addAuditLog('CDS_ALLERGY_BLOCKED', `MedicationRequest/${drug.id}`, `CẢNH BÁO ĐỎ: Hệ thống CDS chặn kê đơn thuốc ${drug.name} do bệnh nhân dị ứng Penicillin`, 'BLOCKED');
      return;
    }

    // Nếu an toàn, thêm vào đơn
    const totalDaily = (parseInt(drug.defaultMorning) || 0) + (parseInt(drug.defaultNoon) || 0) + (parseInt(drug.defaultEvening) || 0) + (parseInt(drug.defaultNight) || 0);
    const qty = Math.max(1, totalDaily * drug.defaultDays);
    const newItem: PrescriptionItem = {
      id: `RX-${Date.now().toString().slice(-4)}`,
      drugId: drug.id,
      name: drug.name,
      activeIngredient: drug.activeIngredient,
      category: drug.category,
      unit: drug.unit,
      morning: drug.defaultMorning,
      noon: drug.defaultNoon,
      evening: drug.defaultEvening,
      night: drug.defaultNight,
      days: drug.defaultDays,
      quantity: qty,
      route: drug.defaultRoute,
      usage: drug.defaultUsage,
      isPenicillinClass: drug.isPenicillinClass
    };

    setPrescriptions(prev => [...prev, newItem]);
    showToast(`Đã thêm "${drug.name}" vào đơn thuốc điện tử.`, 'success');
    addAuditLog('MEDICATION_ADD', `MedicationRequest/${drug.id}`, `Kê thêm thuốc: ${drug.name} (${qty} ${drug.unit})`);
  };

  const overrideAllergyBlocker = (reason: string) => {
    if (!allergyBlockerModal) return;
    const drug = allergyBlockerModal.drug;
    const totalDaily = (parseInt(drug.defaultMorning) || 0) + (parseInt(drug.defaultNoon) || 0) + (parseInt(drug.defaultEvening) || 0) + (parseInt(drug.defaultNight) || 0);
    const qty = Math.max(1, totalDaily * drug.defaultDays);
    const newItem: PrescriptionItem = {
      id: `RX-OVERRIDE-${Date.now().toString().slice(-4)}`,
      drugId: drug.id,
      name: `${drug.name} [GHI ĐÈ CDS]`,
      activeIngredient: drug.activeIngredient,
      category: drug.category,
      unit: drug.unit,
      morning: drug.defaultMorning,
      noon: drug.defaultNoon,
      evening: drug.defaultEvening,
      night: drug.defaultNight,
      days: drug.defaultDays,
      quantity: qty,
      route: drug.defaultRoute,
      usage: drug.defaultUsage,
      isPenicillinClass: drug.isPenicillinClass
    };

    setPrescriptions(prev => [...prev, newItem]);
    setAllergyBlockerModal(null);
    showToast(`Đã ghi đè cảnh báo CDS với lý do: "${reason}". Đơn thuốc đã ghi nhận nhật ký an toàn.`, 'warning');
    addAuditLog('CDS_ALLERGY_OVERRIDDEN', `MedicationRequest/${drug.id}`, `Bác sĩ ghi đè cảnh báo dị ứng: ${reason}`, 'WARN');
  };

  const removePrescriptionDrug = (id: string) => {
    setPrescriptions(prev => prev.filter(p => p.id !== id));
    showToast('Đã xóa thuốc khỏi đơn.', 'info');
  };

  const updatePrescriptionField = (id: string, field: string, value: any) => {
    setPrescriptions(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      if (['morning', 'noon', 'evening', 'night', 'days'].includes(field)) {
        const m = parseInt(updated.morning) || 0;
        const n = parseInt(updated.noon) || 0;
        const e = parseInt(updated.evening) || 0;
        const ni = parseInt(updated.night) || 0;
        const d = parseInt(updated.days as any) || 1;
        updated.quantity = Math.max(1, (m + n + e + ni) * d);
      }
      return updated;
    }));
  };

  const signSmartCAAndPublish = () => {
    setIsSmartCASigned(true);
    const newCode = `DT-2026-${Math.floor(10000000 + Math.random() * 90000000)}`;
    setNationalPrescriptionCode(newCode);
    webSocketSync.send('SYNC_PRESCRIPTIONS', { rxCode: newCode, items: prescriptions }, 'doctor');
    showToast(`Ký số SmartCA thành công! Đơn thuốc đã liên thông Cổng Đơn thuốc Quốc gia (Mã: ${newCode})`, 'success');
    addAuditLog('SMARTCA_SIGN_RX', `MedicationPrescription/${newCode}`, `Ký số PKI Cloud và gửi đơn sang Hệ thống Quốc gia & Bệnh nhân`);
  };

  // Patient Portal State
  const [patientCurrentStep, setPatientCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDeviceInfo[]>(INITIAL_BLUETOOTH_DEVICES);

  const toggleBluetoothDevice = (deviceId: string) => {
    setBluetoothDevices(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      const nextConnected = !d.connected;
      showToast(nextConnected ? `Đã kết nối Bluetooth thiết bị ${d.name}` : `Đã ngắt kết nối ${d.name}`, 'info');
      addAuditLog('BLE_DEVICE_TOGGLE', `Device/${d.serviceUuid}`, `${nextConnected ? 'Ghép nối BLE thành công' : 'Ngắt kết nối'}: ${d.name}`);
      return { ...d, connected: nextConnected };
    }));
  };

  const simulateBleReading = (deviceId: string) => {
    const dev = bluetoothDevices.find(d => d.id === deviceId);
    if (!dev) return;

    if (dev.type === 'bp') {
      const newSys = Math.floor(135 + Math.random() * 10);
      const newDia = Math.floor(85 + Math.random() * 8);
      const newHr = Math.floor(82 + Math.random() * 8);
      const bpStr = `${newSys}/${newDia}`;
      
      setPatients(pts => pts.map(p => {
        if (p.id !== currentPatient.id) return p;
        return {
          ...p,
          vitals: {
            ...p.vitals,
            bp: { value: bpStr, unit: 'mmHg', status: newSys > 140 ? 'warning' : 'normal', time: 'Vừa đo BLE', source: dev.name },
            heartRate: { value: newHr, unit: 'BPM', status: 'normal', time: 'Vừa đo BLE', source: dev.name }
          }
        };
      }));
      webSocketSync.send('SYNC_VITALS', { bp: bpStr, pulseRate: newHr }, 'patient');
      showToast(`Đã nhận chỉ số từ ${dev.name}: ${bpStr} mmHg, Mạch ${newHr} BPM! Đã đồng bộ sang Trạm Bác sĩ.`, 'success');
    } else if (dev.type === 'spo2') {
      const newSpo2 = 98 + Math.floor(Math.random() * 2);
      setPatients(pts => pts.map(p => {
        if (p.id !== currentPatient.id) return p;
        return {
          ...p,
          vitals: {
            ...p.vitals,
            spo2: { value: newSpo2, unit: '%', status: 'normal', time: 'Vừa đo BLE', source: dev.name }
          }
        };
      }));
      webSocketSync.send('SYNC_VITALS', { spo2: newSpo2 }, 'patient');
      showToast(`Đã nhận dữ liệu SpO2: ${newSpo2}% từ ${dev.name}!`, 'success');
    } else if (dev.type === 'glucose') {
      const newGlu = (5.6 + Math.random() * 1.2).toFixed(1);
      setPatients(pts => pts.map(p => {
        if (p.id !== currentPatient.id) return p;
        return {
          ...p,
          vitals: {
            ...p.vitals,
            bloodGlucose: { value: Number(newGlu), unit: 'mmol/L', status: 'normal', time: 'Vừa đo BLE', source: dev.name }
          }
        };
      }));
      showToast(`Đã nhận chỉ số Đường huyết: ${newGlu} mmol/L từ ${dev.name}!`, 'success');
    } else if (dev.type === 'stethoscope') {
      showToast(`Ống nghe điện tử ${dev.name} đang truyền luồng âm thanh trực tiếp sang Trạm Bác sĩ!`, 'info');
    }
  };

  const submitPatientQuestionnaire = (answers: PreTriageQuestionnaire) => {
    setPatients(pts => pts.map(p => {
      if (p.id !== currentPatient.id) return p;
      return {
        ...p,
        preTriageQuestionnaire: {
          ...answers,
          submittedAt: 'Vừa cập nhật'
        }
      };
    }));
    webSocketSync.send('SYNC_PRE_TRIAGE', answers, 'patient');
    showToast('Đã gửi thông tin sàng lọc và triệu chứng ban đầu lên Trạm làm việc của Bác sĩ!', 'success');
    addAuditLog('SUBMIT_PRE_TRIAGE', `QuestionnaireResponse/PT-${currentPatient.id}`, 'Bệnh nhân hoàn thành Phiếu câu hỏi thích ứng tiền khám');
  };

  // Chat messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'patient',
      senderName: 'BN. Nguyễn Văn An',
      time: '09:26',
      text: 'Chào bác sĩ, sáng nay tôi tự đo huyết áp tại nhà thấy báo 145/92 và vùng bụng trên rốn hơi đau rát.'
    },
    {
      id: 'm2',
      sender: 'patient',
      senderName: 'BN. Nguyễn Văn An',
      time: '09:27',
      text: 'Tôi gửi bác sĩ ảnh màn hình máy đo Omron lúc 8h30 sáng nay ạ.',
      attachment: {
        type: 'image',
        title: 'Ảnh chụp máy đo huyết áp Omron (145/92 mmHg - 88 bpm)',
        tag: 'Dữ liệu IoT gia đình'
      }
    },
    {
      id: 'm3',
      sender: 'doctor',
      senderName: 'BS.CKII Vũ Minh Đức',
      time: '09:28',
      text: 'Chào anh An, tôi đã nhận được ảnh máy đo huyết áp và hồ sơ xét nghiệm ngày 14/10 từ hệ thống HIS bệnh viện. Anh ấn nhẹ vùng trên rốn xem đau tức nhiều không nhé?'
    }
  ]);

  const sendChatMessage = (text: string, attachment?: any) => {
    if (!text.trim() && !attachment) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: role === 'doctor' ? 'doctor' : 'patient',
      senderName: role === 'doctor' ? 'BS.CKII Vũ Minh Đức' : `BN. ${currentPatient.name}`,
      time: timeStr,
      text,
      attachment
    };
    setChatMessages(prev => [...prev, newMsg]);
    if (attachment) {
      showToast('Đã tải hình ảnh lâm sàng lên phiên khám và đồng bộ vào EMR!', 'success');
      addAuditLog('UPLOAD_CLINICAL_IMAGE', `Media/Attachment-${newMsg.id}`, `Tải ảnh lâm sàng: ${attachment.title}`);
    }
  };

  // Medication Adherence Checklist
  const [medicationAdherence, setMedicationAdherence] = useState<{ [rxId: string]: { morning: boolean; noon: boolean; evening: boolean; night: boolean } }>({
    'RX-001': { morning: true, noon: false, evening: false, night: false },
    'RX-002': { morning: true, noon: false, evening: false, night: false },
    'RX-003': { morning: true, noon: false, evening: false, night: false }
  });

  const toggleMedicationDoseTaken = (rxId: string, dose: 'morning' | 'noon' | 'evening' | 'night') => {
    setMedicationAdherence(prev => {
      const current = prev[rxId] || { morning: false, noon: false, evening: false, night: false };
      const nextState = !current[dose];
      showToast(`Đã đánh dấu ${nextState ? 'ĐÃ UỐNG' : 'CHƯA UỐNG'} liều ${dose === 'morning' ? 'Sáng' : dose === 'noon' ? 'Trưa' : dose === 'evening' ? 'Chiều' : 'Tối'}`, 'info');
      return {
        ...prev,
        [rxId]: {
          ...current,
          [dose]: nextState
        }
      };
    });
  };

  // Post-Care Report
  const submitPostCareSurvey = (report: PostCareReport) => {
    setPatients(pts => pts.map(p => {
      if (p.id !== currentPatient.id) return p;
      return {
        ...p,
        postCareReport: {
          ...report,
          submitted: true,
          submittedAt: 'Vừa gửi báo cáo'
        }
      };
    }));
    showToast('Báo cáo theo dõi sau khám (3-5 ngày) đã được gửi trực tiếp vào bệnh án EMR của Bác sĩ!', 'success');
    addAuditLog('POST_CARE_SUBMISSION', `Observation/PostCare-${currentPatient.id}`, `Bệnh nhân gửi báo cáo diễn tiến lâm sàng sau khám (Mức phục hồi: ${report.recoveryStatus})`);
  };

  // HÀM ĐIỀU KHIỂN QUY TRÌNH CUỘC GỌI VÀ ĐIỀU HƯỚNG DASHBOARD
  const startDoctorCall = (appointmentId: string) => {
    const apt = appointments.find(a => a.id === appointmentId);
    if (!apt) return;

    setSelectedPatientId(apt.patientId);
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: 'calling' } : a));
    
    setCallSignaling({
      status: 'calling',
      callerName: 'BS.CKII Vũ Minh Đức',
      callerTitle: 'Bác sĩ phụ trách - Khoa Nội',
      patientId: apt.patientId,
      patientName: apt.patientName,
      channelId: `telehealth-${apt.id}`,
      startedAt: new Date().toLocaleTimeString('vi-VN')
    });

    // Khởi tạo âm thanh chuông chờ và chuẩn bị WebRTC phía Bác sĩ
    RingtoneService.startOutgoingDialtone();
    webrtcService.setRole('doctor', apt.patientId);
    webrtcService.initLocalMedia().catch(console.warn);

    // Bắn sự kiện WebSocket INCOMING_CALL sang Cổng Bệnh nhân
    webSocketSync.send('INCOMING_CALL', {
      appointmentId: apt.id,
      patientId: apt.patientId,
      patientName: apt.patientName,
      doctorName: 'BS.CKII Vũ Minh Đức',
      doctorTitle: 'Bác sĩ phụ trách - Khoa Nội',
      specialty: apt.specialty,
      roomName: `telehealth-${apt.id}`
    }, 'doctor');

    showToast(`Đang gọi tới bệnh nhân ${apt.patientName}... Đang đổ chuông.`, 'info');
    addAuditLog('START_TELEHEALTH_CALL', `Appointment/${apt.id}`, `Bác sĩ khởi tạo cuộc gọi khám từ xa cho bệnh nhân ${apt.patientName}`);
  };

  const recallPatient = (appointmentId: string) => {
    startDoctorCall(appointmentId);
  };

  const acceptIncomingCall = () => {
    RingtoneService.stopAllTones();
    RingtoneService.playCallConnectedChime();

    setCallSignaling(prev => ({ ...prev, status: 'connected' }));
    setActiveView('consultation');
    setCallState(prev => ({ ...prev, isConnected: true, callSeconds: 0, useRealWebcam: true }));

    // Chuẩn bị camera & micro phía Bệnh nhân
    webrtcService.setRole('patient', callSignaling.patientId);
    webrtcService.initLocalMedia().catch(console.warn);

    // Bắn sự kiện CALL_ACCEPTED
    webSocketSync.send('CALL_ACCEPTED', {
      patientId: callSignaling.patientId,
      acceptedAt: new Date().toISOString()
    }, 'patient');

    showToast('Đã kết nối cuộc gọi! Chào mừng bạn vào phòng khám trực tuyến.', 'success');
    addAuditLog('ACCEPT_INCOMING_CALL', `Patient/${callSignaling.patientId}`, 'Bệnh nhân chấp nhận cuộc gọi khám từ xa và vào phòng khám');
  };

  const declineIncomingCall = () => {
    RingtoneService.stopAllTones();
    RingtoneService.playCallEndChime();
    webrtcService.endCall();

    setCallSignaling(prev => ({ ...prev, status: 'declined' }));
    webSocketSync.send('CALL_DECLINED', {
      patientId: callSignaling.patientId,
      declinedAt: new Date().toISOString()
    }, role);

    showToast('Đã từ chối cuộc gọi.', 'warning');
    setTimeout(() => {
      setCallSignaling(prev => ({ ...prev, status: 'idle' }));
    }, 1500);
  };

  const endCallAndReturnToDashboard = () => {
    RingtoneService.stopAllTones();
    RingtoneService.playCallEndChime();
    webrtcService.endCall();

    setCallState(prev => ({ ...prev, isConnected: false }));
    setCallSignaling(prev => ({ ...prev, status: 'idle' }));
    setAppointments(prev => prev.map(a => a.patientId === selectedPatientId ? { ...a, status: 'completed' } : a));
    
    // Tự động lưu cuộc khám vừa xong vào Lịch sử khám bệnh của Bệnh nhân
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newSession = {
      id: `ENC-${now.getFullYear()}-${Date.now().toString().slice(-4)}`,
      date: `${dateStr} (${timeStr})`,
      department: 'Khoa Nội Tổng Hợp',
      doctor: 'BS.CKII Vũ Minh Đức',
      icd10: soapNote.primaryIcd ? `${soapNote.primaryIcd} - ${soapNote.diagnosisText}` : 'K21.9 - Trào ngược dạ dày thực quản / I10 - Tăng huyết áp',
      summary: soapNote.treatmentPlan || 'Kê đơn thuốc Nexium 40mg, Phosphalugel, Amlodipine 5mg. Tránh đồ cay nóng, không nằm ngay sau ăn no, theo dõi huyết áp sáng tối.',
      type: 'Khám từ xa Telemedicine'
    };

    setPatients(pts => pts.map(p => {
      if (p.id !== selectedPatientId) return p;
      const alreadyHasToday = p.emrHistory.some(e => e.date.includes(dateStr) && e.type.includes('Khám từ xa'));
      if (alreadyHasToday) return p;
      return {
        ...p,
        status: 'Đã hoàn thành',
        emrHistory: [newSession, ...p.emrHistory]
      };
    }));

    setActiveView('dashboard');

    webSocketSync.send('CALL_ENDED', {
      endedAt: new Date().toISOString()
    }, role);

    showToast('Đã hoàn tất phiên khám bệnh! Hồ sơ bệnh án và đơn thuốc đã được lưu vào Lịch sử khám bệnh của bạn.', 'success');
    addAuditLog('END_TELEHEALTH_CALL', `Patient/${selectedPatientId}`, 'Kết thúc phiên tư vấn video từ xa và lưu hồ sơ vào Lịch sử khám bệnh');
  };

  // Module Đặt Lịch Khám (Appointment Booking Functions)
  const bookAppointment = (data: Omit<Appointment, 'id'>): Appointment => {
    const newId = `APT-2026-${String(appointments.length + 1).padStart(3, '0')}`;
    const newApt: Appointment = {
      ...data,
      id: newId,
      status: 'waiting',
      qrCheckinCode: `CHECKIN-${newId}-${Date.now().toString().slice(-4)}`
    };

    setAppointments(prev => [newApt, ...prev]);

    // Bắn sự kiện WebSocket cho Trạm Bác sĩ đồng bộ tức thì
    webSocketSync.send('NEW_APPOINTMENT', newApt, role);

    addAuditLog('BOOK_APPOINTMENT', `Appointment/${newId}`, `Đặt lịch khám thành công: ${newApt.patientName} hẹn khám với ${newApt.doctorName} lúc ${newApt.appointmentTime} (${newApt.date})`);
    showToast(`Đặt lịch khám thành công! Mã hẹn: ${newId} (${newApt.doctorName})`, 'success');

    return newApt;
  };

  const cancelAppointment = (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'missed' as const } : a));
    webSocketSync.send('CANCEL_APPOINTMENT', { id }, role);
    addAuditLog('CANCEL_APPOINTMENT', `Appointment/${id}`, `Hủy lịch hẹn khám ${id}`);
    showToast('Đã hủy lịch hẹn khám thành công.', 'info');
  };

  // LẮNG NGHE ĐỒNG BỘ HAI CHIỀU THỜI GIAN THỰC QUA WEBSOCKET TỪ SERVER
  useEffect(() => {
    webSocketSync.connect(selectedPatientId);
    const unsubscribe = webSocketSync.subscribe((msg) => {
      console.log('[TelemedicineContext] Nhận sự kiện đồng bộ WebSocket:', msg.event, msg.senderRole);

      // 1. Tín hiệu Gọi đến (Incoming Call)
      if (msg.event === 'INCOMING_CALL' && msg.payload) {
        if (role === 'patient') {
          setCallSignaling({
            status: 'incoming',
            callerName: msg.payload.doctorName || 'BS.CKII Vũ Minh Đức',
            callerTitle: msg.payload.doctorTitle || 'Bác sĩ phụ trách - Khoa Nội',
            patientId: msg.payload.patientId || selectedPatientId,
            patientName: msg.payload.patientName || currentPatient.name,
            channelId: msg.payload.roomName || 'telehealth-room'
          });
          // Bắt đầu đổ chuông Web Audio API!
          RingtoneService.startRingtone();
          showToast(`Cuộc gọi đến từ ${msg.payload.doctorName || 'Bác sĩ phụ trách'}!`, 'warning');
        }
      } 
      // 2. Tín hiệu Chấp nhận cuộc gọi (Call Accepted)
      else if (msg.event === 'CALL_ACCEPTED') {
        RingtoneService.stopAllTones();
        RingtoneService.playCallConnectedChime();
        setCallSignaling(prev => ({ ...prev, status: 'connected' }));
        setActiveView('consultation');
        setCallState(prev => ({ ...prev, isConnected: true, callSeconds: 0, useRealWebcam: true }));
        // Khởi động WebRTC P2P Video & Audio
        webrtcService.startCall().catch(console.warn);
        showToast('Bệnh nhân đã nhấc máy! Đang kết nối luồng Video HD & Âm thanh...', 'success');
      } 
      // 3. Tín hiệu Từ chối cuộc gọi (Call Declined)
      else if (msg.event === 'CALL_DECLINED') {
        RingtoneService.stopAllTones();
        RingtoneService.playCallEndChime();
        webrtcService.endCall();
        setCallSignaling(prev => ({ ...prev, status: 'declined' }));
        showToast('Cuộc gọi đã bị từ chối hoặc bận.', 'error');
        setTimeout(() => {
          setCallSignaling(prev => ({ ...prev, status: 'idle' }));
        }, 2000);
      } 
      // 4. Tín hiệu Kết thúc cuộc gọi (Call Ended)
      else if (msg.event === 'CALL_ENDED') {
        RingtoneService.stopAllTones();
        RingtoneService.playCallEndChime();
        webrtcService.endCall();
        setCallState(prev => ({ ...prev, isConnected: false }));
        setCallSignaling(prev => ({ ...prev, status: 'idle' }));
        setActiveView('dashboard');
        showToast('Cuộc gọi đã kết thúc. Trở về Bảng điều khiển.', 'info');
      }
      else if (msg.event === 'SYNC_SOAP' && msg.payload) {
        setSoapNote(prev => ({ ...prev, ...msg.payload }));
        if (role === 'patient') {
          showToast('Bác sĩ vừa cập nhật Bệnh án điện tử SOAP & Chẩn đoán ICD-10!', 'info');
        }
      } else if (msg.event === 'SYNC_DICOM_ANNOTATION' && msg.payload) {
        setDicomState(prev => ({
          ...prev,
          annotations: [...prev.annotations, msg.payload]
        }));
      } else if (msg.event === 'CLEAR_DICOM_ANNOTATIONS') {
        setDicomState(prev => ({ ...prev, annotations: [] }));
      } else if (msg.event === 'SYNC_DICOM_VIEWPORT' && msg.payload) {
        setDicomState(prev => ({
          ...prev,
          windowLevel: msg.payload.windowLevel ?? prev.windowLevel,
          windowWidth: msg.payload.windowWidth ?? prev.windowWidth,
          zoom: msg.payload.zoom ?? prev.zoom,
          pan: msg.payload.pan ?? prev.pan
        }));
      } else if (msg.event === 'TRIGGER_REMOTE_BP') {
        if (role === 'patient') {
          showToast('Bác sĩ vừa kích hoạt đo Huyết áp từ xa qua máy Omron BLE!', 'warning');
          triggerRemoteBPMeasurement();
        }
      } else if (msg.event === 'PAYMENT_RECONCILED') {
        setCpoePaymentStatus('paid');
        showToast('Hệ thống HIS đã ghi nhận đối soát viện phí thành công qua VietQR!', 'success');
      } else if (msg.event === 'SYNC_PRE_TRIAGE' && msg.payload) {
        setPatients(pts => pts.map(p => p.id === (msg.patientId || selectedPatientId) ? { ...p, preTriageQuestionnaire: msg.payload } : p));
        if (role === 'doctor') {
          showToast('Bệnh nhân vừa cập nhật Phiếu triệu chứng tiền khám!', 'info');
        }
      } else if (msg.event === 'SYNC_PRESCRIPTIONS' && msg.payload) {
        setNationalPrescriptionCode(msg.payload.rxCode || 'DT-2026-89410294');
        showToast(`Đơn thuốc mới đã được cấp mã quốc gia ${msg.payload.rxCode}!`, 'success');
      } else if (msg.event === 'SYNC_VITALS' && msg.payload) {
        setPatients(pts => pts.map(p => {
          if (p.id === (msg.patientId || selectedPatientId)) {
            return {
              ...p,
              vitals: {
                ...p.vitals,
                bp: msg.payload.bp ? { ...p.vitals.bp, value: msg.payload.bp } : p.vitals.bp,
                spo2: msg.payload.spo2 ? { ...p.vitals.spo2, value: msg.payload.spo2 } : p.vitals.spo2
              }
            };
          }
          return p;
        }));
        if (role === 'doctor') {
          showToast('Dữ liệu sinh hiệu IoT vừa được bệnh nhân truyền tới tức thì!', 'info');
        }
      } else if (msg.event === 'NEW_APPOINTMENT' && msg.payload) {
        setAppointments(prev => {
          if (prev.some(a => a.id === msg.payload.id)) return prev;
          return [msg.payload, ...prev];
        });
        if (role === 'doctor') {
          showToast(`Lịch hẹn mới: ${msg.payload.patientName} (${msg.payload.appointmentTime})!`, 'info');
        }
      } else if (msg.event === 'CANCEL_APPOINTMENT' && msg.payload) {
        setAppointments(prev => prev.map(a => a.id === msg.payload.id ? { ...a, status: 'missed' as const } : a));
      }
    });

    return () => unsubscribe();
  }, [selectedPatientId, role]);

  return (
    <TelemedicineContext.Provider
      value={{
        role,
        setRole,
        patients,
        selectedPatientId,
        setSelectedPatientId,
        currentPatient,
        isLowBandwidth,
        setIsLowBandwidth,
        isAuditModalOpen,
        setIsAuditModalOpen,
        isEConsentModalOpen,
        setIsEConsentModalOpen,
        isNationalRxModalOpen,
        setIsNationalRxModalOpen,
        isBhytXmlModalOpen,
        setIsBhytXmlModalOpen,
        auditLogs,
        addAuditLog,
        toastMessage,
        showToast,
        hisSyncState,
        syncWithHis,

        callState,
        setCallState,
        activeConsultationSpecialist,
        setActiveConsultationSpecialist,
        isConsultModalOpen,
        setIsConsultModalOpen,
        inviteSpecialist,
        removeSpecialist,

        telemetry,
        setTelemetrySignalType,
        setStethoscopeFilter,
        triggerRemoteBPMeasurement,
        trigger15sAuscultationRecording,

        aiScribe,
        toggleAiListening,
        triggerAiExtractSoap,

        activeEmrTab,
        setActiveEmrTab,

        dicomState,
        setDicomSelectedStudyId,
        setDicomWindowLevel,
        setDicomWindowWidth,
        setDicomZoom,
        setDicomPan,
        setDicomActiveTool,
        addDicomAnnotation,
        clearDicomAnnotations,

        cpoeOrders,
        toggleCpoeOrder,
        cpoeFulfillmentMode,
        setCpoeFulfillmentMode,
        isCpoeSubmitted,
        cpoePaymentStatus,
        submitCpoeOrders,
        simulatePaymentSuccess,

        soapNote,
        updateSoapField,
        saveSoapNote,

        prescriptions,
        selectedDrugCatalogId,
        setSelectedDrugCatalogId,
        addPrescriptionDrug,
        removePrescriptionDrug,
        updatePrescriptionField,
        allergyBlockerModal,
        setAllergyBlockerModal,
        overrideAllergyBlocker,
        isSmartCASigned,
        nationalPrescriptionCode,
        signSmartCAAndPublish,

        patientCurrentStep,
        setPatientCurrentStep,
        bluetoothDevices,
        toggleBluetoothDevice,
        simulateBleReading,
        submitPatientQuestionnaire,
        chatMessages,
        sendChatMessage,
        medicationAdherence,
        toggleMedicationDoseTaken,
        submitPostCareSurvey,

        // Quy trình: Dashboard Lịch Hẹn & Tín hiệu Gọi Khám
        activeView,
        setActiveView,
        appointments,
        callSignaling,
        startDoctorCall,
        recallPatient,
        acceptIncomingCall,
        declineIncomingCall,
        endCallAndReturnToDashboard,

        // Module Đặt Lịch Khám (Appointment Booking Module)
        isBookingModalOpen,
        setIsBookingModalOpen,
        doctorProfiles,
        selectedDoctorForBooking,
        setSelectedDoctorForBooking,
        bookAppointment,
        cancelAppointment
      }}
    >
      {children}
    </TelemedicineContext.Provider>
  );
};

export const useTelemedicine = (): TelemedicineContextType => {
  const context = useContext(TelemedicineContext);
  if (!context) {
    throw new Error('useTelemedicine must be used within a TelemedicineProvider');
  }
  return context;
};
