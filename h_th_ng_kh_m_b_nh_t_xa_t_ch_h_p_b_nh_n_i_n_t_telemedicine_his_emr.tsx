import React, { useState, useEffect, useRef } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MonitorUp, CircleDot,
  MessageSquare, FileText, Activity, Clock, ShieldCheck, AlertTriangle,
  RefreshCw, User, Calendar, Pill, Plus, Trash2, CheckCircle2,
  Send, Image as ImageIcon, Stethoscope, FileSpreadsheet,
  Search, ChevronRight, Download, Heart, Thermometer, Wind,
  Droplets, Scale, Building2, Bell, Sparkles, Check, Eye,
  ArrowUpRight, ClipboardList, Hospital, Wifi, Camera, HelpCircle,
  Printer, Share2, Layers
} from 'lucide-react';

// --- DỮ LIỆU MẪU TỪ HỆ THỐNG HIS / EMR ---
const INITIAL_PATIENTS = [
  {
    id: 'HIS-2026-0892',
    name: 'Nguyễn Văn An',
    dob: '15/05/1978',
    age: 48,
    gender: 'Nam',
    bhyt: 'DN4790123894512',
    bloodType: 'O+',
    phone: '0903 812 456',
    address: 'Quận 3, TP. Hồ Chí Minh',
    appointmentTime: '09:30 - Hôm nay',
    status: 'Đang khám',
    allergies: ['Penicillin', 'Hải sản vỏ cứng'],
    chronicConditions: ['Tăng huyết áp vô căn (I10)', 'Rối loạn chuyển hóaพรপ্রোটিন máu (E78)'],
    vitals: {
      heartRate: { value: 88, unit: 'bpm', status: 'normal', time: '09:15 (Thiết bị IoT tại nhà)' },
      bp: { value: '145/92', unit: 'mmHg', status: 'warning', time: '09:15 (Thiết bị IoT tại nhà)' },
      spo2: { value: 98, unit: '%', status: 'normal', time: '09:15' },
      temp: { value: 37.8, unit: '°C', status: 'warning', time: '09:15' },
      weight: { value: 74, unit: 'kg', bmi: 25.6 },
    },
    reasonForVisit: 'Đau tức vùng thượng vị kèm ợ chua, sốt nhẹ 2 ngày nay, huyết áp buổi sáng đo tại nhà hơi cao.',
    reportedSymptoms: ['Đau thượng vị âm ỉ', 'Ợ hơi, ợ chua sau ăn', 'Chóng mặt nhẹ khi đứng lên', 'Mệt mỏi'],
    emrHistory: [
      {
        id: 'ENC-2026-0211',
        date: '10/02/2026',
        department: 'Khoa Nội Tim Mạch',
        doctor: 'BS.CKII Trần Minh Hoàng',
        icd10: 'I10 - Tăng huyết áp vô căn (nguyên phát)',
        summary: 'Huyết áp ổn định mức 130/80 mmHg. Tiếp tục duy trì Amlor 5mg và điều chỉnh chế độ ăn giảm muối.',
        type: 'Khám ngoại trú'
      },
      {
        id: 'ENC-2025-1104',
        date: '18/11/2025',
        department: 'Khoa Nội Tiêu Hóa',
        doctor: 'ThS.BS Lê Thị Mai Hương',
        icd10: 'K21.0 - Trào ngược dạ dày-thực quản có viêm thực quản',
        summary: 'Nội soi dạ dày có xung huyết hang vị mức độ vừa, HP âm tính. Điều trị Esomeprazole 4 tuần.',
        type: 'Khám ngoại trú'
      },
      {
        id: 'ENC-2025-0620',
        date: '22/06/2025',
        department: 'Khoa Khám Bệnh Tổng Quát',
        doctor: 'BS.CKI Nguyễn Quốc Tuấn',
        icd10: 'E78.2 - Tăng lipid máu hỗn hợp',
        summary: 'Khám sức khỏe định kỳ. Phát hiện Cholesterol và Triglyceride tăng nhẹ. Tư vấn tập luyện và dùng Atorvastatin 10mg.',
        type: 'Khám định kỳ'
      }
    ],
    labs: [
      { id: 'LAB-01', name: 'Glucose máu lúc đói', result: '5.6', unit: 'mmol/L', ref: '3.9 - 6.4', status: 'normal', date: '14/10/2026' },
      { id: 'LAB-02', name: 'HbA1c', result: '5.8', unit: '%', ref: '4.0 - 6.0', status: 'normal', date: '14/10/2026' },
      { id: 'LAB-03', name: 'Cholesterol toàn phần', result: '6.2', unit: 'mmol/L', ref: '< 5.2', status: 'high', date: '14/10/2026' },
      { id: 'LAB-04', name: 'Triglyceride', result: '2.45', unit: 'mmol/L', ref: '< 1.7', status: 'high', date: '14/10/2026' },
      { id: 'LAB-05', name: 'CRP định lượng (hs-CRP)', result: '8.4', unit: 'mg/L', ref: '< 5.0', status: 'high', date: '14/10/2026' },
      { id: 'LAB-06', name: 'Creatinin huyết thanh', result: '84', unit: 'µmol/L', ref: '62 - 106', status: 'normal', date: '14/10/2026' },
      { id: 'LAB-07', name: 'AST (GOT) / ALT (GPT)', result: '28 / 32', unit: 'U/L', ref: '< 40', status: 'normal', date: '14/10/2026' },
    ],
    imaging: [
      {
        id: 'IMG-2026-88',
        modality: 'Siêu âm ổ bụng tổng quát',
        date: '14/10/2026',
        performer: 'BS.CKI Đặng Văn Khoa',
        conclusion: 'Gan nhiễm mỡ độ I. Đường mật, túi mật, tụy, lách, hai thận chưa ghi nhận bất thường trên siêu âm.',
        pacsCode: 'PACS-US-99201'
      },
      {
        id: 'IMG-2026-41',
        modality: 'Điện tâm đồ (ECG 12 chuyển đạo)',
        date: '10/02/2026',
        performer: 'CN. Vũ Thị Ngọc',
        conclusion: 'Nhịp xoang đều, tần số 78 chu kỳ/phút. Trục trung gian. Không có dấu hiệu thiếu máu cơ tim cục bộ.',
        pacsCode: 'PACS-ECG-44102'
      }
    ]
  },
  {
    id: 'HIS-2026-0915',
    name: 'Trần Thị Bích Ngọc',
    dob: '22/09/1992',
    age: 34,
    gender: 'Nữ',
    bhyt: 'GD4790987123654',
    bloodType: 'A+',
    phone: '0918 234 990',
    address: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
    appointmentTime: '10:00 - Phòng chờ',
    status: 'Đang chờ',
    allergies: ['Không ghi nhận dị ứng thuốc'],
    chronicConditions: ['Viêm mũi dị ứng thời tiết (J30.4)'],
    vitals: {
      heartRate: { value: 76, unit: 'bpm', status: 'normal', time: '09:25' },
      bp: { value: '115/75', unit: 'mmHg', status: 'normal', time: '09:25' },
      spo2: { value: 99, unit: '%', status: 'normal', time: '09:25' },
      temp: { value: 36.7, unit: '°C', status: 'normal', time: '09:25' },
      weight: { value: 52, unit: 'kg', bmi: 20.3 },
    },
    reasonForVisit: 'Ho khan kéo dài sau đợt cảm cúm, ngứa cổ họng về đêm.',
    reportedSymptoms: ['Ho khan về đêm', 'Đau rát họng nhẹ', 'Nghẹt mũi buổi sáng'],
    emrHistory: [
      {
        id: 'ENC-2026-0115',
        date: '15/01/2026',
        department: 'Khoa Tai Mũi Họng',
        doctor: 'BS.CKI Phạm Anh Tuấn',
        icd10: 'J02.9 - Viêm họng cấp, không đặc hiệu',
        summary: 'Điều trị nội khoa 5 ngày đáp ứng tốt.',
        type: 'Khám ngoại trú'
      }
    ],
    labs: [
      { id: 'LAB-21', name: 'Bạch cầu (WBC)', result: '7.2', unit: 'G/L', ref: '4.0 - 10.0', status: 'normal', date: '15/01/2026' }
    ],
    imaging: [
      {
        id: 'IMG-2026-12',
        modality: 'X-Quang Ngực thẳng (Kỹ thuật số)',
        date: '15/01/2026',
        performer: 'BS. Nguyễn Hữu Nghĩa',
        conclusion: 'Hai phế trường sáng, bóng tim không to.',
        pacsCode: 'PACS-XR-11029'
      }
    ]
  }
];

const ICD10_CATALOG = [
  { code: 'K21.0', name: 'Bệnh trào ngược dạ dày-thực quản có viêm thực quản (GERD)' },
  { code: 'K29.7', name: 'Viêm dạ dày – tá tràng cấp, không đặc hiệu' },
  { code: 'I10', name: 'Bệnh tăng huyết áp vô căn (nguyên phát)' },
  { code: 'E78.2', name: 'Tăng lipid máu hỗn hợp' },
  { code: 'J06.9', name: 'Nhiễm trùng đường hô hấp trên cấp, không đặc hiệu' },
  { code: 'R51', name: 'Đau đầu vận mạch / Căng thẳng' }
];

const PHARMACY_INVENTORY = [
  { id: 'DRG-001', name: 'Nexium Mups 40mg (Esomeprazole)', unit: 'Viên', stock: 1420, defaultMorning: '1', defaultNoon: '0', defaultAfternoon: '0', defaultEvening: '0', defaultUsage: 'Uống trước ăn sáng 30 phút', category: 'Dạ dày', contraindication: '' },
  { id: 'DRG-002', name: 'Gaviscon Dual Action (Hỗn dịch)', unit: 'Gói', stock: 850, defaultMorning: '1', defaultNoon: '1', defaultAfternoon: '0', defaultEvening: '1', defaultUsage: 'Uống sau các bữa ăn và trước khi đi ngủ', category: 'Dạ dày', contraindication: '' },
  { id: 'DRG-003', name: 'Amlor 5mg (Amlodipine)', unit: 'Viên', stock: 2300, defaultMorning: '1', defaultNoon: '0', defaultAfternoon: '0', defaultEvening: '0', defaultUsage: 'Uống buổi sáng sau ăn, theo dõi huyết áp hàng ngày', category: 'Tim mạch', contraindication: '' },
  { id: 'DRG-004', name: 'Lipitor 10mg (Atorvastatin)', unit: 'Viên', stock: 910, defaultMorning: '0', defaultNoon: '0', defaultAfternoon: '0', defaultEvening: '1', defaultUsage: 'Uống sau ăn tối', category: 'Mỡ máu', contraindication: '' },
  { id: 'DRG-005', name: 'Augmentin 1g (Amoxicillin + Acid Clavulanic)', unit: 'Viên', stock: 540, defaultMorning: '1', defaultNoon: '0', defaultAfternoon: '0', defaultEvening: '1', defaultUsage: 'Uống ngay đầu bữa ăn', category: 'Kháng sinh Nhóm Beta-lactam', contraindication: 'Penicillin' },
  { id: 'DRG-006', name: 'Mosapride Citrate 5mg (Gasmotin)', unit: 'Viên', stock: 620, defaultMorning: '1', defaultNoon: '1', defaultAfternoon: '0', defaultEvening: '1', defaultUsage: 'Uống trước bữa ăn 15 phút', category: 'Tiêu hóa', contraindication: '' }
];

export default function App() {
  // Chuyển đổi vai trò: 'doctor' | 'patient'
  const [activeRole, setActiveRole] = useState('doctor');
  
  // Danh sách bệnh nhân & bệnh nhân đang chọn
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState('HIS-2026-0892');
  const currentPatient = patients.find(p => p.id === selectedPatientId) || patients[0];

  // Trạng thái cuộc gọi Video
  const [callState, setCallState] = useState({
    isConnected: true,
    isMicMuted: false,
    isCamOff: false,
    isScreenSharing: false,
    isRecording: true,
    useRealWebcam: false,
    callSeconds: 432, // 07:12
  });
  const webcamVideoRef = useRef(null);

  // Trạng thái Tab EMR bên màn hình Bác sĩ
  const [activeEmrTab, setActiveEmrTab] = useState('soap'); // 'vitals' | 'history' | 'labs' | 'soap' | 'prescription'
  
  // Trạng thái đồng bộ HIS
  const [hisSyncing, setHisSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('09:32:18');
  const [toastMessage, setToastMessage] = useState(null);

  // Dữ liệu Khám & Chẩn đoán (SOAP Notes) - Chia sẻ thời gian thực giữa Bác sĩ và Bệnh nhân
  const [soapNote, setSoapNote] = useState({
    subjective: 'Bệnh nhân khai đau âm ỉ vùng thượng vị 2 ngày nay, tăng lên sau khi ăn đồ chua cay, kèm ợ hơi, ợ chua nhiều về đêm. Sáng nay đo huyết áp tại nhà 145/92 mmHg, có cảm giác nặng đầu nhẹ.',
    objective: 'Bệnh nhân tỉnh, tiếp xúc tốt qua video. Niêm mạc hồng, không phù, nhịp thở đều 18 lần/phút. Quan sát họng qua camera không thấy giả mạc. HA đo bằng máy tự động đạt chuẩn: 145/92 mmHg, Nhiệt độ 37.8°C.',
    primaryIcd: 'K21.0',
    secondaryIcd: 'I10',
    diagnosisText: 'Trào ngược dạ dày-thực quản đợt cấp (GERD) / Tăng huyết áp vô căn đang điều trị / Rối loạn lipid máu',
    treatmentPlan: '1. Điều chỉnh thuốc ức chế bơm proton (PPI) liều chuẩn trong 14 ngày.\n2. Duy trì thuốc hạ áp Amlodipine 5mg buổi sáng, theo dõi HA sáng - chiều trên ứng dụng.\n3. Kiêng rượu bia, cà phê, thức ăn cay nóng; không nằm ngay sau khi ăn trong 2 giờ.\n4. Tái khám trực tiếp hoặc từ xa sau 2 tuần.',
    followUpDate: '30/10/2026',
    isPublishedToPatient: true
  });

  // Dữ liệu Đơn thuốc điện tử (E-Prescription)
  const [prescriptions, setPrescriptions] = useState([
    {
      id: 'RX-1',
      drugId: 'DRG-001',
      name: 'Nexium Mups 40mg (Esomeprazole)',
      unit: 'Viên',
      morning: '1',
      noon: '0',
      afternoon: '0',
      evening: '0',
      days: 14,
      quantity: 14,
      usage: 'Uống nguyên viên trước ăn sáng 30 phút'
    },
    {
      id: 'RX-2',
      drugId: 'DRG-002',
      name: 'Gaviscon Dual Action (Hỗn dịch 10ml)',
      unit: 'Gói',
      morning: '1',
      noon: '1',
      afternoon: '0',
      evening: '1',
      days: 10,
      quantity: 30,
      usage: 'Uống sau ăn 30 phút và trước khi ngủ'
    },
    {
      id: 'RX-3',
      drugId: 'DRG-003',
      name: 'Amlor 5mg (Amlodipine)',
      unit: 'Viên',
      morning: '1',
      noon: '0',
      afternoon: '0',
      evening: '0',
      days: 14,
      quantity: 14,
      usage: 'Uống buổi sáng sau ăn, kiểm tra huyết áp mỗi ngày'
    }
  ]);

  const [selectedNewDrugId, setSelectedNewDrugId] = useState('DRG-006');
  const [allergyWarningModal, setAllergyWarningModal] = useState(null);

  // Tin nhắn & Hình ảnh chia sẻ trong cuộc gọi
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'm1',
      sender: 'patient',
      senderName: 'BN. Nguyễn Văn An',
      time: '09:26',
      text: 'Chào bác sĩ, sáng nay tôi tự đo huyết áp tại nhà thấy báo 145/92 và vùng bụng trên rốn hơi đau rát.',
      attachment: null
    },
    {
      id: 'm2',
      sender: 'patient',
      senderName: 'BN. Nguyễn Văn An',
      time: '09:27',
      text: 'Tôi gửi bác sĩ hình chụp màn hình máy đo huyết áp Omron lúc 8h30 sáng nay ạ.',
      attachment: {
        type: 'image',
        title: 'Ảnh máy đo HA tại nhà (145/92 mmHg - 88 bpm)',
        tag: 'Chỉ số thiết bị y tế gia đình',
        previewType: 'bp_monitor'
      }
    },
    {
      id: 'm3',
      sender: 'doctor',
      senderName: 'BS.CKII Vũ Minh Đức',
      time: '09:28',
      text: 'Chào anh An, tôi đã nhận được ảnh máy đo huyết áp và hồ sơ xét nghiệm ngày 14/10 từ hệ thống HIS bệnh viện. Anh ấn nhẹ vùng trên rốn xem đau tức nhiều không nhé?',
      attachment: null
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showChatDrawer, setShowChatDrawer] = useState(true);

  // Bộ đếm thời gian cuộc gọi
  useEffect(() => {
    if (!callState.isConnected) return;
    const timer = setInterval(() => {
      setCallState(prev => ({ ...prev, callSeconds: prev.callSeconds + 1 }));
    }, 1000);
    return () => clearInterval(timer);
  }, [callState.isConnected]);

  // Xử lý bật/tắt Webcam thật nếu người dùng muốn trải nghiệm
  useEffect(() => {
    let stream = null;
    if (callState.useRealWebcam && !callState.isCamOff) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: false })
        .then(s => {
          stream = s;
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          showToast('Không tìm thấy thiết bị Camera thật hoặc bị từ chối quyền. Đang dùng luồng Video mô phỏng Y tế.', 'warning');
          setCallState(prev => ({ ...prev, useRealWebcam: false }));
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [callState.useRealWebcam, callState.isCamOff, activeRole]);

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSyncHIS = () => {
    setHisSyncing(true);
    setTimeout(() => {
      const now = new Date();
      setLastSyncTime(now.toTimeString().split(' ')[0]);
      setHisSyncing(false);
      showToast(`Đã đồng bộ hai chiều chuẩn HL7 FHIR với HIS Bệnh viện cho mã BN ${currentPatient.id}!`, 'success');
    }, 800);
  };

  const handleSaveSoapAndPublish = () => {
    setHisSyncing(true);
    setTimeout(() => {
      const now = new Date();
      setLastSyncTime(now.toTimeString().split(' ')[0]);
      setSoapNote(prev => ({ ...prev, isPublishedToPatient: true }));
      setHisSyncing(false);
      showToast('Đã lưu Bệnh án điện tử (EMR) lên hệ thống HIS và gửi Tóm tắt khám sang Cổng Bệnh nhân!', 'success');
    }, 600);
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: activeRole,
      senderName: activeRole === 'doctor' ? 'BS.CKII Vũ Minh Đức' : `BN. ${currentPatient.name}`,
      time: timeStr,
      text: chatInput,
      attachment: null
    };
    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
  };

  const handleSendSampleSymptomImage = (type) => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const imgData = type === 'throat'
      ? {
          title: 'Ảnh chụp niêm mạc họng & lưỡi của bệnh nhân',
          tag: 'Ảnh triệu chứng lâm sàng',
          previewType: 'throat_photo'
        }
      : {
          title: 'Ảnh chụp toa thuốc cũ tháng trước',
          tag: 'Tài liệu y tế bệnh nhân tải lên',
          previewType: 'old_rx'
        };

    const newMsg = {
      id: `m-${Date.now()}`,
      sender: 'patient',
      senderName: `BN. ${currentPatient.name}`,
      time: timeStr,
      text: type === 'throat' ? 'Bác sĩ xem giúp em ảnh chụp cổ họng vừa chụp bằng điện thoại ạ.' : 'Em gửi thêm ảnh vỏ hộp thuốc đang uống ở nhà ạ.',
      attachment: imgData
    };
    setChatMessages(prev => [...prev, newMsg]);
    showToast('Đã gửi hình ảnh triệu chứng cho Bác sĩ trong phiên khám!', 'success');
  };

  // Thêm thuốc vào đơn có kiểm tra Dị ứng thuốc tự động (CDS - Clinical Decision Support)
  const handleAddDrug = () => {
    const drug = PHARMACY_INVENTORY.find(d => d.id === selectedNewDrugId);
    if (!drug) return;

    // Kiểm tra cảnh báo dị ứng với tiền sử bệnh nhân
    if (drug.contraindication && currentPatient.allergies.some(a => a.toLowerCase().includes(drug.contraindication.toLowerCase()))) {
      setAllergyWarningModal({
        drugName: drug.name,
        allergen: drug.contraindication,
        patientName: currentPatient.name
      });
      return;
    }

    const dailyDose =
      (parseInt(drug.defaultMorning) || 0) +
      (parseInt(drug.defaultNoon) || 0) +
      (parseInt(drug.defaultAfternoon) || 0) +
      (parseInt(drug.defaultEvening) || 0);
    const defaultDays = 14;

    const newItem = {
      id: `RX-${Date.now()}`,
      drugId: drug.id,
      name: drug.name,
      unit: drug.unit,
      morning: drug.defaultMorning,
      noon: drug.defaultNoon,
      afternoon: drug.defaultAfternoon,
      evening: drug.defaultEvening,
      days: defaultDays,
      quantity: Math.max(1, dailyDose * defaultDays),
      usage: drug.defaultUsage
    };

    setPrescriptions(prev => [...prev, newItem]);
    showToast(`Đã thêm "${drug.name}" vào đơn thuốc điện tử.`, 'success');
  };

  const handleUpdatePrescriptionField = (id, field, value) => {
    setPrescriptions(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (['morning', 'noon', 'afternoon', 'evening', 'days'].includes(field)) {
          const perDay =
            (parseFloat(updated.morning) || 0) +
            (parseFloat(updated.noon) || 0) +
            (parseFloat(updated.afternoon) || 0) +
            (parseFloat(updated.evening) || 0);
          updated.quantity = Math.max(1, Math.ceil(perDay * (parseInt(updated.days) || 1)));
        }
        return updated;
      })
    );
  };

  const handleRemoveDrug = (id) => {
    setPrescriptions(prev => prev.filter(item => item.id !== id));
  };

  const handlePublishPrescription = () => {
    setHisSyncing(true);
    setTimeout(() => {
      const now = new Date();
      setLastSyncTime(now.toTimeString().split(' ')[0]);
      setSoapNote(prev => ({ ...prev, isPublishedToPatient: true }));
      setHisSyncing(false);
      showToast('Đã ký số Đơn thuốc điện tử, đồng bộ Kho Dược HIS & gửi tới ứng dụng của Bệnh nhân!', 'success');
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* THÔNG BÁO TOAST NỔI */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce">
          <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl border ${
            toastMessage.type === 'warning'
              ? 'bg-amber-950 text-amber-100 border-amber-700'
              : 'bg-teal-950 text-teal-50 border-teal-700'
          }`}>
            {toastMessage.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
            )}
            <span className="text-sm font-medium leading-snug">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* MODAL CẢNH BÁO TƯƠNG TÁC / DỊ ỨNG THUỐC TỪ HIS CDS */}
      {allergyWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border-2 border-red-500 shadow-2xl overflow-hidden">
            <div className="bg-red-600 px-6 py-4 flex items-center gap-3 text-white">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">CẢNH BÁO DỊ ỨNG THUỐC NGHIÊM TRỌNG (HIS-CDS)</h3>
                <p className="text-xs text-red-100">Hệ thống Hỗ trợ Quyết định Lâm sàng tự động chặn lệnh kê đơn</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Bệnh nhân <strong className="text-slate-900">{allergyWarningModal.patientName}</strong> có tiền sử dị ứng mức độ cao đã ghi nhận trên HIS với hoạt chất nhóm:{' '}
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded">
                  {allergyWarningModal.allergen}
                </span>
              </p>
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                <div className="font-semibold">Thuốc vừa chọn: {allergyWarningModal.drugName}</div>
                <div>Nguy cơ: Sốc phản vệ, phù Quincke, mề đay cấp tính. Khuyến cáo đổi sang nhóm Macrolid hoặc Quinolon nếu cần kháng sinh.</div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setAllergyWarningModal(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Đã hiểu & Hủy chọn thuốc này
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOP NAVIGATION BAR & CHUYỂN ĐỔI VAI TRÒ DEMO */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Tên hệ thống */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">VietMed TeleHealth</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  HIS / HL7 FHIR v4.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hệ thống Khám chữa bệnh Từ xa tích hợp Bệnh án Điện tử (EMR)
              </p>
            </div>
          </div>

          {/* Bộ chuyển đổi Giao diện Bác sĩ / Bệnh nhân */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveRole('doctor')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeRole === 'doctor'
                  ? 'bg-teal-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>1. Giao diện Bác sĩ (Telemedicine + HIS/EMR)</span>
            </button>
            <button
              onClick={() => setActiveRole('patient')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                activeRole === 'patient'
                  ? 'bg-cyan-400 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>2. Giao diện Bệnh nhân (Telehealth Portal)</span>
              {soapNote.isPublishedToPatient && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          </div>

          {/* Trạng thái HIS & Tài khoản */}
          <div className="hidden xl:flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-lg text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Cổng HIS/PACS:</span>
              <span className="text-emerald-400 font-semibold">Trực tuyến ({lastSyncTime})</span>
            </div>
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
              <div className="text-right">
                <div className="text-xs font-semibold text-white">
                  {activeRole === 'doctor' ? 'BS.CKII Vũ Minh Đức' : `BN. ${currentPatient.name}`}
                </div>
                <div className="text-[11px] text-slate-400">
                  {activeRole === 'doctor' ? 'Khoa Nội Tổng Quát - Mã CCHN: 004821/BYT' : `Mã BN: ${currentPatient.id}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH: PHÂN NHÁNH THEO VAI TRÒ */}
      {activeRole === 'doctor' ? (
        /* =======================================================================
           1. GIAO DIỆN BÁC SĨ (40% TRÁI: VIDEO CALL & CHAT | 60% PHẢI: BỆNH ÁN HIS/EMR)
           ======================================================================= */
        <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* CỘT TRÁI (40% ~ 5/12 cols): KHUNG GỌI VIDEO, HÀNG ĐỢI PHÒNG CHỜ & CHAT TRỰC TIẾP */}
          <section className="lg:col-span-5 flex flex-col gap-3">
            
            {/* Thanh hàng đợi phòng chờ khám từ xa */}
            <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <UsersQueueIcon /> Hàng đợi Telehealth (2)
                </span>
                <div className="flex items-center gap-1.5">
                  {patients.map(pt => (
                    <button
                      key={pt.id}
                      onClick={() => setSelectedPatientId(pt.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        pt.id === currentPatient.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pt.name} ({pt.status === 'Đang khám' ? 'Đang gọi' : '10:00'})
                    </button>
                  ))}
                </div>
              </div>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Tiếp theo: <strong>Trần Thị Bích Ngọc - 10:00</strong>
              </span>
            </div>

            {/* Khung Video Call chính với Bệnh nhân */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl aspect-[16/10] flex flex-col justify-between">
              {/* Top Overlay thông tin cuộc gọi */}
              <div className="relative z-20 p-3.5 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    REC {formatTime(callState.callSeconds)}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    HD 1080p • 42ms
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCallState(prev => ({ ...prev, useRealWebcam: !prev.useRealWebcam }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                      callState.useRealWebcam
                        ? 'bg-teal-500 text-slate-950 border-teal-400 font-semibold'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {callState.useRealWebcam ? 'Đang bật Webcam thật' : 'Dùng Webcam thật'}
                  </button>
                </div>
              </div>

              {/* Luồng hình ảnh Video mô phỏng hoặc Webcam thật */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950">
                {!callState.isConnected ? (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                      <PhoneOff className="w-8 h-8" />
                    </div>
                    <p className="text-white font-semibold">Phiên gọi khám từ xa đã tạm dừng</p>
                    <button
                      onClick={() => setCallState(prev => ({ ...prev, isConnected: true }))}
                      className="px-4 py-2 bg-teal-500 text-slate-950 font-semibold text-xs rounded-xl hover:bg-teal-400 transition cursor-pointer"
                    >
                      Kết nối lại với bệnh nhân
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Hình ảnh mô phỏng bệnh nhân đang nói chuyện trực tuyến */}
                    <div className="w-full h-full relative flex flex-col items-center justify-center p-6 select-none">
                      {/* Sóng âm thanh giọng nói */}
                      <div className="relative">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-500 p-1 shadow-2xl shadow-teal-500/20">
                          <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                            {/* Avatar SVG trực quan của Bệnh nhân */}
                            <svg className="w-24 h-24 text-teal-300 mt-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" />
                            </svg>
                          </div>
                        </div>
                        <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-bold shadow">
                          Đang nói...
                        </span>
                      </div>

                      <div className="mt-3 text-center">
                        <h3 className="text-white font-bold text-base sm:text-lg flex items-center justify-center gap-2">
                          BN. {currentPatient.name} ({currentPatient.age} tuổi)
                        </h3>
                        <p className="text-teal-300/90 text-xs mt-0.5">
                          Mã HIS: {currentPatient.id} • Thiết bị: iPhone 16 Pro (5G)
                        </p>
                      </div>

                      {/* Overlay Sinh hiệu IoT thời gian thực trên góc trái dưới Video */}
                      <div className="absolute bottom-16 left-3.5 bg-slate-950/75 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 text-xs text-white space-y-1 hidden sm:block">
                        <div className="text-[10px] uppercase tracking-wider text-teal-400 font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Sinh hiệu từ xa (IoT Sync)
                        </div>
                        <div className="flex items-center gap-3">
                          <span>Nhịp tim: <strong className="text-emerald-400">{currentPatient.vitals.heartRate.value} bpm</strong></span>
                          <span>HA: <strong className="text-amber-400">{currentPatient.vitals.bp.value}</strong></span>
                          <span>SpO2: <strong className="text-cyan-300">{currentPatient.vitals.spo2.value}%</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Khung Picture-in-Picture (PiP) của Bác sĩ */}
                    <div className="absolute bottom-16 right-3.5 w-36 sm:w-44 aspect-video bg-slate-900 rounded-xl border-2 border-teal-500/60 shadow-2xl overflow-hidden flex items-center justify-center">
                      {callState.isCamOff ? (
                        <div className="text-center text-slate-400 text-[11px] p-2">
                          <VideoOff className="w-5 h-5 mx-auto mb-1 text-red-400" />
                          Camera Bác sĩ tắt
                        </div>
                      ) : callState.useRealWebcam ? (
                        <video
                          ref={webcamVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center relative">
                          <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300 font-bold text-xs">
                            BS.Đức
                          </div>
                          <span className="text-[10px] text-slate-300 mt-1">BS.CKII Vũ Minh Đức</span>
                        </div>
                      )}
                      <span className="absolute bottom-1 left-1.5 px-1.5 py-0.2 bg-slate-950/80 rounded text-[9px] text-teal-300">
                        Bạn (Bác sĩ)
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Thanh điều khiển cuộc gọi dưới đáy Video */}
              <div className="relative z-20 p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-center gap-2.5">
                <button
                  onClick={() => setCallState(prev => ({ ...prev, isMicMuted: !prev.isMicMuted }))}
                  title={callState.isMicMuted ? 'Bật Micro' : 'Tắt Micro'}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    callState.isMicMuted
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {callState.isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setCallState(prev => ({ ...prev, isCamOff: !prev.isCamOff }))}
                  title={callState.isCamOff ? 'Bật Camera' : 'Tắt Camera'}
                  className={`p-2.5 rounded-xl border transition cursor-pointer ${
                    callState.isCamOff
                      ? 'bg-red-500/20 border-red-500/50 text-red-400'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {callState.isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                    setCallState(prev => ({ ...prev, isScreenSharing: !prev.isScreenSharing }));
                    showToast('Đã bật chế độ chia sẻ màn hình Kết quả Xét nghiệm & Hình ảnh PACS cho bệnh nhân.', 'success');
                  }}
                  title="Chia sẻ màn hình bệnh án/kết quả cận lâm sàng"
                  className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    callState.isScreenSharing
                      ? 'bg-teal-500 text-slate-950 border-teal-400 font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <MonitorUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Chia sẻ KQ CLS</span>
                </button>

                <button
                  onClick={() => setShowChatDrawer(!showChatDrawer)}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    showChatDrawer
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Chat & Ảnh ({chatMessages.length})</span>
                </button>

                <button
                  onClick={() => setCallState(prev => ({ ...prev, isConnected: !prev.isConnected }))}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    callState.isConnected
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>{callState.isConnected ? 'Kết thúc' : 'Gọi lại'}</span>
                </button>
              </div>
            </div>

            {/* Khung Chat Trực tuyến & Nhận ảnh Triệu chứng từ Bệnh nhân */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[290px]">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800">
                    Trao đổi Lâm sàng & Hình ảnh Triệu chứng Bệnh nhân gửi
                  </h3>
                </div>
                <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-medium border border-teal-200">
                  Tự động lưu đính kèm vào EMR
                </span>
              </div>

              {/* Danh sách tin nhắn & tệp đính kèm */}
              <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[260px] bg-slate-50/50">
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender === 'doctor' ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-semibold text-slate-600">{msg.senderName}</span>
                      <span className="text-[10px] text-slate-400">{msg.time}</span>
                    </div>
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                        msg.sender === 'doctor'
                          ? 'bg-teal-600 text-white rounded-br-xs shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                      {msg.attachment && (
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-400/40 flex flex-col items-center justify-center shrink-0 text-teal-300 font-bold text-[10px]">
                              {msg.attachment.previewType === 'bp_monitor' ? '145/92' : 'IMG'}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white">{msg.attachment.title}</div>
                              <div className="text-[10px] text-teal-300">{msg.attachment.tag}</div>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 shrink-0">
                            Đã đồng bộ PACS
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ô nhập tin nhắn của Bác sĩ */}
              <form onSubmit={handleSendChat} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Nhập hướng dẫn cho bệnh nhân hoặc yêu cầu chụp thêm ảnh triệu chứng..."
                  className="flex-1 text-xs sm:text-sm px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi</span>
                </button>
              </form>
            </div>
          </section>

          {/* CỘT PHẢI (60% ~ 7/12 cols): BẢNG ĐIỀU KHIỂN BỆNH ÁN ĐIỆN TỬ (INTEGRATED HIS / EMR WORKSPACE) */}
          <section className="lg:col-span-7 flex flex-col gap-3">
            
            {/* 1. PATIENT HEADER BANNER (THÔNG TIN HÀNH CHÍNH, BHYT, CẢNH BÁO DỊ ỨNG ĐỎ & BỆNH NỀN) */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-700 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                    {currentPatient.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-lg sm:text-xl font-bold text-slate-900">{currentPatient.name}</h1>
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-800 text-xs font-mono font-bold">
                        Mã BN: {currentPatient.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold">
                        Nhóm máu: {currentPatient.bloodType}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                      <span><strong>Giới tính:</strong> {currentPatient.gender}</span>
                      <span><strong>Ngày sinh:</strong> {currentPatient.dob} ({currentPatient.age} tuổi)</span>
                      <span><strong>Thẻ BHYT:</strong> <span className="font-mono text-slate-800">{currentPatient.bhyt}</span> (Mức hưởng 80%)</span>
                    </div>
                  </div>
                </div>

                {/* Nút Đồng bộ HIS / HL7 FHIR */}
                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Đã đồng bộ HIS/HL7 FHIR - Thời gian thực
                    </div>
                  </div>
                  <button
                    onClick={handleSyncHIS}
                    disabled={hisSyncing}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${hisSyncing ? 'animate-spin text-teal-600' : ''}`} />
                    <span>Đồng bộ HIS</span>
                  </button>
                </div>
              </div>

              {/* Dải Cảnh báo Dị ứng (Đỏ nổi bật) & Bệnh nền mãn tính */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Dị ứng: {currentPatient.allergies.join(', ')}</span>
                </div>
                {currentPatient.chronicConditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Bệnh nền: {cond}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. THANH CHUYỂN TAB WORKSPACE BỆNH ÁN ĐIỆN TỬ (5 TABS) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80 px-2 pt-2 flex items-center gap-1 overflow-x-auto">
                {[
                  { id: 'vitals', label: '1. Tổng quan & Sinh hiệu', icon: Activity },
                  { id: 'history', label: '2. Lịch sử khám (HIS)', icon: Clock },
                  { id: 'labs', label: '3. Cận lâm sàng (XN/CĐHA)', icon: FileSpreadsheet, badge: '3 Bất thường' },
                  { id: 'soap', label: '4. Ghi chú khám & ICD-10', icon: ClipboardList },
                  { id: 'prescription', label: '5. Kê đơn điện tử', icon: Pill, badge: `${prescriptions.length} thuốc` }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeEmrTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveEmrTab(tab.id)}
                      className={`px-3.5 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-white text-teal-700 border-teal-600 shadow-2xs'
                          : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-400'}`} />
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          tab.id === 'labs'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* NỘI DUNG CHI TIẾT CỦA TỪNG TAB TRONG BỆNH ÁN */}
              <div className="p-4 sm:p-5 flex-1 overflow-y-auto">
                
                {/* TAB 1: TỔNG QUAN & SINH HIỆU (VITALS & TRIAGE) */}
                {activeEmrTab === 'vitals' && (
                  <div className="space-y-5">
                    {/* Thẻ chỉ số sinh tồn */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Heart className="w-4 h-4 text-teal-600" />
                          Chỉ số Sinh hiệu (Đồng bộ từ thiết bị Y tế gia đình & Điều dưỡng phân loại)
                        </h3>
                        <span className="text-xs text-slate-500">Cập nhật lúc: 09:15 hôm nay</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-xs text-slate-500 flex items-center justify-between">
                            <span>Mạch / Nhịp tim</span>
                            <Heart className="w-3.5 h-3.5 text-rose-500" />
                          </div>
                          <div className="text-xl font-bold text-slate-900 mt-1">
                            {currentPatient.vitals.heartRate.value} <span className="text-xs font-normal text-slate-500">bpm</span>
                          </div>
                          <span className="inline-block mt-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            Bình thường
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300">
                          <div className="text-xs text-amber-900 font-medium flex items-center justify-between">
                            <span>Huyết áp</span>
                            <Activity className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <div className="text-xl font-bold text-amber-950 mt-1">
                            {currentPatient.vitals.bp.value} <span className="text-xs font-normal text-amber-800">mmHg</span>
                          </div>
                          <span className="inline-block mt-1 text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                            Tăng nhẹ độ 1
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                          <div className="text-xs text-slate-500 flex items-center justify-between">
                            <span>SpO2</span>
                            <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                          </div>
                          <div className="text-xl font-bold text-slate-900 mt-1">
                            {currentPatient.vitals.spo2.value} <span className="text-xs font-normal text-slate-500">%</span>
                          </div>
                          <span className="inline-block mt-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            Tốt (Khí phòng)
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-300">
                          <div className="text-xs text-amber-900 font-medium flex items-center justify-between">
                            <span>Nhiệt độ</span>
                            <Thermometer className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                          <div className="text-xl font-bold text-amber-950 mt-1">
                            {currentPatient.vitals.temp.value} <span className="text-xs font-normal text-amber-800">°C</span>
                          </div>
                          <span className="inline-block mt-1 text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-semibold">
                            Sốt nhẹ
                          </span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                          <div className="text-xs text-slate-500 flex items-center justify-between">
                            <span>Cân nặng / BMI</span>
                            <Scale className="w-3.5 h-3.5 text-teal-600" />
                          </div>
                          <div className="text-xl font-bold text-slate-900 mt-1">
                            {currentPatient.vitals.weight.value} <span className="text-xs font-normal text-slate-500">kg</span>
                          </div>
                          <span className="inline-block mt-1 text-[11px] text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded font-medium">
                            BMI: {currentPatient.vitals.weight.bmi}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lý do khám & Triệu chứng ban đầu bệnh nhân khai báo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                          Lý do đăng ký khám từ xa (Triage Note)
                        </h4>
                        <p className="text-sm text-slate-800 leading-relaxed font-medium">
                          "{currentPatient.reasonForVisit}"
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Triệu chứng ban đầu bệnh nhân đánh dấu trên App
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {currentPatient.reportedSymptoms.map((sym, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs"
                            >
                              • {sym}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setActiveEmrTab('soap')}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <span>Chuyển sang Ghi chú khám & Chẩn đoán (SOAP)</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: LỊCH SỬ KHÁM & BỆNH ÁN (EMR HISTORY TIMELINE TỪ HIS) */}
                {activeEmrTab === 'history' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Dòng thời gian Lịch sử Khám chữa bệnh trên HIS ({currentPatient.emrHistory.length} đợt khám gần nhất)
                      </h3>
                      <span className="text-xs text-teal-700 font-medium">Nguồn: Kho dữ liệu EMR Tập trung</span>
                    </div>

                    <div className="relative pl-6 border-l-2 border-teal-500/40 space-y-4">
                      {currentPatient.emrHistory.map((enc, idx) => (
                        <div key={enc.id} className="relative bg-slate-50 rounded-xl p-4 border border-slate-200/90 hover:border-teal-400 transition">
                          <span className="absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full bg-teal-600 border-2 border-white shadow" />
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-md">
                                Ngày {enc.date}
                              </span>
                              <span className="text-xs font-semibold text-slate-900">{enc.department}</span>
                              <span className="text-[11px] text-slate-500">({enc.id})</span>
                            </div>
                            <span className="text-xs font-medium text-slate-600">Bác sĩ: <strong>{enc.doctor}</strong></span>
                          </div>
                          <div className="text-xs font-bold text-slate-900 mb-1">
                            Chẩn đoán ICD-10: <span className="text-teal-700">{enc.icd10}</span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">{enc.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: CẬN LÂM SÀNG (XÉT NGHIỆM LIS & CHẨN ĐOÁN HÌNH ẢNH PACS) */}
                {activeEmrTab === 'labs' && (
                  <div className="space-y-5">
                    {/* Bảng kết quả xét nghiệm máu */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                          Kết quả Xét nghiệm Sinh hóa - Huyết học (Hệ thống LIS)
                        </h3>
                        <span className="text-xs text-red-600 font-semibold">
                          * Các chỉ số bất thường được tô đỏ/cam tự động
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                              <th className="py-2.5 px-3 font-bold">Tên xét nghiệm</th>
                              <th className="py-2.5 px-3 font-bold">Kết quả</th>
                              <th className="py-2.5 px-3 font-bold">Đơn vị</th>
                              <th className="py-2.5 px-3 font-bold">Khoảng tham chiếu</th>
                              <th className="py-2.5 px-3 font-bold">Đánh giá</th>
                              <th className="py-2.5 px-3 font-bold">Ngày thực hiện</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {currentPatient.labs.map(lab => {
                              const isAbnormal = lab.status !== 'normal';
                              return (
                                <tr
                                  key={lab.id}
                                  className={isAbnormal ? 'bg-red-50/70 font-semibold text-red-950' : 'bg-white text-slate-700'}
                                >
                                  <td className="py-2.5 px-3">{lab.name}</td>
                                  <td className={`py-2.5 px-3 font-bold ${isAbnormal ? 'text-red-600 text-sm' : 'text-slate-900'}`}>
                                    {lab.result} {isAbnormal && '↑'}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{lab.unit}</td>
                                  <td className="py-2.5 px-3 font-mono">{lab.ref}</td>
                                  <td className="py-2.5 px-3">
                                    {isAbnormal ? (
                                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 text-[11px] font-bold">
                                        Cao bất thường
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px]">
                                        Bình thường
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{lab.date}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Báo cáo Chẩn đoán hình ảnh PACS */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-teal-600" />
                        Chẩn đoán Hình ảnh & Thăm dò Chức năng (RIS / PACS)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {currentPatient.imaging.map(img => (
                          <div key={img.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-2">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-xs text-teal-900">{img.modality}</span>
                                <span className="text-[11px] font-mono text-slate-500">{img.date}</span>
                              </div>
                              <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                                <strong>Kết luận:</strong> {img.conclusion}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-500">
                              <span>BS đọc KQ: {img.performer}</span>
                              <button
                                onClick={() => showToast(`Đã mở trình xem DICOM PACS cho mã ca chụp ${img.pacsCode}`, 'success')}
                                className="text-teal-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Mở ảnh DICOM
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: GHI CHÚ KHÁM & CHẨN ĐOÁN (SOAP NOTES & ICD-10) */}
                {activeEmrTab === 'soap' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                          1. Triệu chứng Cơ năng (Subjective - S)
                        </label>
                        <textarea
                          rows={3}
                          value={soapNote.subjective}
                          onChange={e => setSoapNote({ ...soapNote, subjective: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 bg-slate-50/50 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                          2. Triệu chứng Thực thể qua Video & IoT (Objective - O)
                        </label>
                        <textarea
                          rows={3}
                          value={soapNote.objective}
                          onChange={e => setSoapNote({ ...soapNote, objective: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 bg-slate-50/50 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    {/* Mã bệnh ICD-10 & Chẩn đoán xác định */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-teal-50/40 p-3.5 rounded-xl border border-teal-200/80">
                      <div>
                        <label className="block text-xs font-bold text-teal-950 uppercase mb-1.5">
                          3. Mã bệnh chính (Danh mục ICD-10 Bộ Y Tế)
                        </label>
                        <select
                          value={soapNote.primaryIcd}
                          onChange={e => {
                            const found = ICD10_CATALOG.find(item => item.code === e.target.value);
                            setSoapNote({
                              ...soapNote,
                              primaryIcd: e.target.value,
                              diagnosisText: found ? `${found.name} / Tăng huyết áp vô căn` : soapNote.diagnosisText
                            });
                          }}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-teal-600"
                        >
                          {ICD10_CATALOG.map(item => (
                            <option key={item.code} value={item.code}>
                              [{item.code}] - {item.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-teal-950 uppercase mb-1.5">
                          Chẩn đoán lâm sàng chi tiết (Assessment - A)
                        </label>
                        <input
                          type="text"
                          value={soapNote.diagnosisText}
                          onChange={e => setSoapNote({ ...soapNote, diagnosisText: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-600"
                        />
                      </div>
                    </div>

                    {/* Hướng xử trí & Dặn dò */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        4. Hướng xử trí & Lời dặn của Bác sĩ (Plan - P)
                      </label>
                      <textarea
                        rows={3}
                        value={soapNote.treatmentPlan}
                        onChange={e => setSoapNote({ ...soapNote, treatmentPlan: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-600 bg-slate-50/50 focus:bg-white transition"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>Hẹn tái khám:</span>
                        <input
                          type="text"
                          value={soapNote.followUpDate}
                          onChange={e => setSoapNote({ ...soapNote, followUpDate: e.target.value })}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 w-28"
                        />
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => setActiveEmrTab('prescription')}
                          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Pill className="w-4 h-4 text-teal-600" />
                          <span>Sang Kê đơn thuốc</span>
                        </button>
                        <button
                          onClick={handleSaveSoapAndPublish}
                          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Lưu & Đồng bộ về HIS</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: KÊ ĐƠN ĐIỆN TỬ (E-PRESCRIPTION TÍCH HỢP KHO DƯỢC HIS) */}
                {activeEmrTab === 'prescription' && (
                  <div className="space-y-4">
                    {/* Thanh tìm kiếm & thêm thuốc từ Kho Dược Bệnh viện */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex-1 min-w-[240px]">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Chọn thuốc từ Tồn kho Dược Bệnh viện (HIS Pharmacy Inventory)
                        </label>
                        <select
                          value={selectedNewDrugId}
                          onChange={e => setSelectedNewDrugId(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:border-teal-600"
                        >
                          {PHARMACY_INVENTORY.map(drug => (
                            <option key={drug.id} value={drug.id}>
                              {drug.name} — [Tồn kho: {drug.stock} {drug.unit}] {drug.contraindication ? `⚠️ Cảnh báo nhóm ${drug.contraindication}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAddDrug}
                        className="mt-4 sm:mt-5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-teal-400" />
                        <span>Thêm vào đơn</span>
                      </button>
                    </div>

                    {/* Bảng kê đơn thuốc tương tác */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                            <th className="py-2.5 px-3 font-bold">Tên thuốc & Hàm lượng</th>
                            <th className="py-2.5 px-2 font-bold text-center w-14">Sáng</th>
                            <th className="py-2.5 px-2 font-bold text-center w-14">Trưa</th>
                            <th className="py-2.5 px-2 font-bold text-center w-14">Chiều</th>
                            <th className="py-2.5 px-2 font-bold text-center w-14">Tối</th>
                            <th className="py-2.5 px-2 font-bold text-center w-16">Số ngày</th>
                            <th className="py-2.5 px-2 font-bold text-center w-20">Tổng SL</th>
                            <th className="py-2.5 px-2 font-bold text-center w-10">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {prescriptions.map((item, idx) => (
                            <React.Fragment key={item.id}>
                              <tr className="bg-white">
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {idx + 1}. {item.name}
                                  <div className="mt-1">
                                    <input
                                      type="text"
                                      value={item.usage}
                                      onChange={e => handleUpdatePrescriptionField(item.id, 'usage', e.target.value)}
                                      placeholder="Cách dùng..."
                                      className="w-full text-[11px] font-normal text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200"
                                    />
                                  </div>
                                </td>
                                {['morning', 'noon', 'afternoon', 'evening'].map(timeKey => (
                                  <td key={timeKey} className="py-2 px-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      max="10"
                                      value={item[timeKey]}
                                      onChange={e => handleUpdatePrescriptionField(item.id, timeKey, e.target.value)}
                                      className="w-12 text-center py-1 rounded border border-slate-300 font-semibold text-slate-800"
                                    />
                                  </td>
                                ))}
                                <td className="py-2 px-1.5 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={item.days}
                                    onChange={e => handleUpdatePrescriptionField(item.id, 'days', e.target.value)}
                                    className="w-14 text-center py-1 rounded border border-slate-300 font-semibold text-slate-800"
                                  />
                                </td>
                                <td className="py-2 px-2 text-center font-bold text-teal-800 bg-teal-50/40">
                                  {item.quantity} {item.unit}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <button
                                    onClick={() => handleRemoveDrug(item.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Nút Ký số & Gửi đơn thuốc sang màn hình Bệnh nhân */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <span>Tự động kiểm tra tương tác thuốc & tiền sử dị ứng ({currentPatient.allergies.join(', ')})</span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={handlePublishPrescription}
                          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                          <span>Lưu & Gửi đơn thuốc về HIS / Bệnh nhân</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </section>
        </main>
      ) : (
        /* =======================================================================
           2. GIAO DIỆN BỆNH NHÂN (PATIENT TELEHEALTH PORTAL)
           ======================================================================= */
        <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* CỘT TRÁI (7/12 cols): MÀN HÌNH VIDEO VỚI BÁC SĨ & THÔNG TIN PHIÊN KHÁM */}
          <section className="lg:col-span-7 flex flex-col gap-4">
            {/* Banner thông tin Lịch hẹn & Bác sĩ phụ trách */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Phòng khám Từ xa số 04
                    </span>
                    <span className="text-xs text-slate-500">Mã hồ sơ: {currentPatient.id}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    Bác sĩ khám: BS.CKII Vũ Minh Đức — Khoa Nội Tổng Quát
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Đang trong cuộc gọi khám
                </span>
              </div>
            </div>

            {/* Khung Video Call lớn nhìn thấy Bác sĩ */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl aspect-video flex flex-col justify-between">
              <div className="relative z-20 p-4 bg-gradient-to-b from-slate-950/80 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-white text-xs font-semibold">
                    BS.CKII Vũ Minh Đức (Bệnh viện Đa khoa Quốc tế)
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-300 text-xs font-mono">
                  Thời lượng: {formatTime(callState.callSeconds)}
                </span>
              </div>

              {/* Hình ảnh mô phỏng Bác sĩ đang tư vấn cho Bệnh nhân */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-6 select-none">
                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-teal-400 to-cyan-600 p-1 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center text-white">
                    <Stethoscope className="w-14 h-14 text-teal-400 mb-1" />
                    <span className="text-[11px] font-bold text-teal-200">BS.CKII Vũ Minh Đức</span>
                  </div>
                </div>
                <p className="mt-4 text-white font-semibold text-base text-center">
                  "Anh An yên tâm, kết quả siêu âm ổ bụng và điện tim trên HIS đều ổn định..."
                </p>
                <p className="text-xs text-teal-300 mt-1">
                  Phụ đề trực tiếp (Live AI Medical Caption) đang bật
                </p>

                {/* Khung PiP của Bệnh nhân */}
                <div className="absolute bottom-20 right-4 w-36 sm:w-44 aspect-video rounded-xl bg-slate-900 border-2 border-cyan-400 overflow-hidden shadow-xl flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-white">BN. {currentPatient.name}</span>
                  <span className="text-[10px] text-cyan-300 mt-0.5">Camera của bạn</span>
                </div>
              </div>

              {/* Điều khiển cuộc gọi phía Bệnh nhân */}
              <div className="relative z-20 p-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-center gap-3">
                <button
                  onClick={() => setCallState(prev => ({ ...prev, isMicMuted: !prev.isMicMuted }))}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    callState.isMicMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {callState.isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{callState.isMicMuted ? 'Bật tiếng' : 'Tắt tiếng'}</span>
                </button>
                <button
                  onClick={() => setCallState(prev => ({ ...prev, isCamOff: !prev.isCamOff }))}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    callState.isCamOff ? 'bg-red-600 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {callState.isCamOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  <span>{callState.isCamOff ? 'Bật Camera' : 'Tắt Camera'}</span>
                </button>
              </div>
            </div>

            {/* Khung Gửi ảnh Triệu chứng nhanh & Chat với Bác sĩ */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-600" />
                    Gửi Hình ảnh Triệu chứng / Kết quả đo tại nhà cho Bác sĩ
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ảnh gửi tại đây sẽ hiển thị ngay lập tức trên màn hình Trạm làm việc của Bác sĩ
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendSampleSymptomImage('throat')}
                    className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>+ Gửi ảnh chụp vùng đau / Họng</span>
                  </button>
                  <button
                    onClick={() => handleSendSampleSymptomImage('rx')}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>+ Gửi ảnh vỏ thuốc đang dùng</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSendChat} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Nhắn tin hỏi thêm bác sĩ..."
                  className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:border-teal-600 focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi tin nhắn</span>
                </button>
              </form>
            </div>
          </section>

          {/* CỘT PHẢI (5/12 cols): NHẬN KẾT QUẢ KHÁM & ĐƠN THUỐC ĐIỆN TỬ TRỰC TIẾP TỪ BÁC SĨ */}
          <section className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="bg-gradient-to-r from-teal-700 to-cyan-700 px-5 py-4 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-white/20">
                    Đồng bộ trực tiếp từ HIS
                  </span>
                  <h3 className="text-base font-bold mt-1">
                    Phiếu Tóm tắt Khám & Đơn thuốc Điện tử
                  </h3>
                </div>
                <ShieldCheck className="w-7 h-7 text-teal-200" />
              </div>

              <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
                {/* Chẩn đoán của Bác sĩ vừa cập nhật */}
                <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase text-teal-800">
                    Chẩn đoán của Bác sĩ ({soapNote.primaryIcd})
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {soapNote.diagnosisText}
                  </div>
                  <div className="text-xs text-slate-600 pt-1 border-t border-teal-200/60 whitespace-pre-line">
                    <strong>Lời dặn & Hướng điều trị:</strong>{'\n'}
                    {soapNote.treatmentPlan}
                  </div>
                  <div className="text-xs font-semibold text-teal-800 pt-1">
                    📅 Lịch hẹn tái khám: {soapNote.followUpDate}
                  </div>
                </div>

                {/* Danh sách Đơn thuốc Điện tử nhận thời gian thực */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-teal-600" />
                      Đơn thuốc Điện tử đã kê ({prescriptions.length} khoản)
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-semibold">Đã ký số BS. Vũ Minh Đức</span>
                  </div>

                  <div className="space-y-2">
                    {prescriptions.map((rx, index) => (
                      <div
                        key={rx.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {index + 1}. {rx.name}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold text-xs shrink-0">
                            SL: {rx.quantity} {rx.unit} ({rx.days} ngày)
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 mt-1">
                          {Number(rx.morning) > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium">
                              Sáng: <strong>{rx.morning}</strong> {rx.unit}
                            </span>
                          )}
                          {Number(rx.noon) > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium">
                              Trưa: <strong>{rx.noon}</strong> {rx.unit}
                            </span>
                          )}
                          {Number(rx.afternoon) > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium">
                              Chiều: <strong>{rx.afternoon}</strong> {rx.unit}
                            </span>
                          )}
                          {Number(rx.evening) > 0 && (
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200 font-medium">
                              Tối: <strong>{rx.evening}</strong> {rx.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5">
                          Cách dùng: {rx.usage}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Các nút tiện ích cho Bệnh nhân */}
                <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => showToast('Đã gửi yêu cầu Giao thuốc tận nhà từ Nhà thuốc Bệnh viện (Dự kiến giao trong 2 giờ).', 'success')}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Nhận thuốc BHYT / Giao tận nhà</span>
                  </button>
                  <button
                    onClick={() => showToast('Đã tải về tệp PDF Đơn thuốc điện tử có mã QR Liên thông Đơn thuốc Quốc gia.', 'success')}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Tải PDF Đơn thuốc (QR Quốc gia)</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

// Icon phụ trợ cho hàng đợi
function UsersQueueIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}