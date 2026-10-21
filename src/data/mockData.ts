import { Patient, DrugCatalogItem, Icd10Item, CpoeOrderItem, BluetoothDeviceInfo, AuditLogItem, Appointment, DoctorProfile } from '../types/telemedicine';

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'HIS-2026-0892',
    name: 'Nguyễn Văn An',
    dob: '15/05/1978',
    age: 48,
    gender: 'Nam',
    bhyt: 'DN4790123894512',
    bloodType: 'O+',
    phone: '0903 812 456',
    address: 'Số 142 Võ Thị Sáu, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
    appointmentTime: '09:30 - Hôm nay',
    status: 'Đang khám',
    triagePriority: 'Cấp 2 - Vàng',
    allergies: ['Penicillin (Sốc phản vệ độ III - 2018)', 'Hải sản vỏ cứng'],
    chronicConditions: ['Tăng huyết áp vô căn độ 1 (I10)', 'Rối loạn chuyển hóa lipid máu (E78.2)'],
    vitals: {
      heartRate: { value: 88, unit: 'BPM', status: 'normal', time: '09:15', source: 'Omron Connect BLE' },
      bp: { value: '145/92', unit: 'mmHg', status: 'warning', time: '09:15', source: 'Omron HEM-7361T' },
      spo2: { value: 98, unit: '%', status: 'normal', time: '09:15', source: 'Wellue FS20F' },
      temp: { value: 37.8, unit: '°C', status: 'warning', time: '09:15', source: 'Nhiệt kế hồng ngoại' },
      weight: { value: 74, unit: 'kg', bmi: 25.6 },
      bloodGlucose: { value: 6.1, unit: 'mmol/L', status: 'normal', time: '07:30', source: 'Accu-Chek Instant' }
    },
    reasonForVisit: 'Đau tức vùng thượng vị kèm ợ nóng, ợ chua nhiều về đêm, sốt nhẹ 2 ngày nay, huyết áp buổi sáng đo tại nhà dao động 145/92 mmHg.',
    reportedSymptoms: ['Đau thượng vị âm ỉ', 'Ợ hơi, ợ chua sau ăn', 'Cảm giác nóng rát sau xương ức', 'Chóng mặt nhẹ khi đứng dậy'],
    preTriageQuestionnaire: {
      chiefComplaint: 'Đau rát vùng thượng vị, ợ chua và sốt nhẹ',
      durationDays: 3,
      painScale: 6,
      feverLevel: '37.8°C (Sốt nhẹ)',
      symptoms: ['Đau thượng vị', 'Ợ nóng sau ăn', 'Đắng miệng buổi sáng', 'Mệt mỏi'],
      pastMedsTaken: 'Đã tự uống 1 viên Paracetamol 500mg sáng nay nhưng chưa bớt đau dạ dày.',
      submittedAt: '09:10 - Hôm nay'
    },
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
      { id: 'LAB-01', code: 'GLU', name: 'Glucose máu lúc đói', category: 'Sinh hóa', result: '5.8', unit: 'mmol/L', ref: '3.9 - 6.4', status: 'normal', date: '14/10/2026' },
      { id: 'LAB-02', code: 'HBA1C', name: 'HbA1c định lượng', category: 'Sinh hóa', result: '5.9', unit: '%', ref: '4.0 - 6.0', status: 'normal', date: '14/10/2026' },
      { id: 'LAB-03', code: 'CHOL', name: 'Cholesterol toàn phần', category: 'Sinh hóa', result: '6.4', unit: 'mmol/L', ref: '< 5.2', status: 'high', date: '14/10/2026' },
      { id: 'LAB-04', code: 'TRIG', name: 'Triglyceride', category: 'Sinh hóa', result: '2.68', unit: 'mmol/L', ref: '< 1.7', status: 'high', date: '14/10/2026' },
      { id: 'LAB-05', code: 'CRP', name: 'hs-CRP (C-Reactive Protein định lượng cao)', category: 'Miễn dịch', result: '9.2', unit: 'mg/L', ref: '< 5.0', status: 'high', date: '14/10/2026' },
      { id: 'LAB-06', code: 'CREAT', name: 'Creatinin huyết thanh', category: 'Sinh hóa', result: '88', unit: 'µmol/L', ref: '62 - 106', status: 'normal', date: '14/10/2026' },
      { id: 'LAB-07', code: 'ALT', name: 'ALT (SGPT) Men gan', category: 'Sinh hóa', result: '36', unit: 'U/L', ref: '< 40', status: 'normal', date: '14/10/2026' },
      { id: 'LAB-08', code: 'WBC', name: 'Số lượng Bạch cầu (WBC)', category: 'Huyết học', result: '11.4', unit: 'G/L', ref: '4.0 - 10.0', status: 'high', date: '14/10/2026' }
    ],
    imaging: [
      {
        id: 'IMG-2026-88',
        modality: 'X-Quang Ngực Thẳng Kỹ Thuật Số (Digital Radiography)',
        bodyPart: 'Lồng ngực',
        date: '14/10/2026',
        performer: 'BS.CKI Đặng Văn Khoa',
        conclusion: 'Cung động mạch chủ hơi vồng nhẹ phù hợp tiền sử tăng huyết áp. Hai phế trường thông khí tốt, không thấy tổn thương thâm nhiễm nhu mô phổi khu trú.',
        pacsCode: 'PACS-XR-88912',
        imageUrl: 'xray-chest'
      },
      {
        id: 'IMG-2026-41',
        modality: 'Điện tâm đồ vi tính (ECG 12 Chuyển Đạo)',
        bodyPart: 'Tim',
        date: '10/02/2026',
        performer: 'CN. Vũ Thị Ngọc',
        conclusion: 'Nhịp xoang đều 80 lần/phút. Trục trung gian. Dày thất trái nhẹ theo tiêu chuẩn Sokolow-Lyon (SV1 + RV5 = 36mm).',
        pacsCode: 'PACS-ECG-44102',
        imageUrl: 'ecg-12lead'
      }
    ],
    postCareReport: {
      submitted: false,
      recoveryStatus: 'significant_improvement',
      painScaleNow: 2,
      sideEffects: [],
      patientNotes: ''
    }
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
    address: '280 Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    appointmentTime: '10:00 - Hôm nay',
    status: 'Đang chờ',
    triagePriority: 'Cấp 3 - Xanh',
    allergies: ['Không ghi nhận dị ứng thuốc'],
    chronicConditions: ['Viêm mũi dị ứng thời tiết (J30.4)'],
    vitals: {
      heartRate: { value: 76, unit: 'BPM', status: 'normal', time: '09:25', source: 'Apple Watch Series 9' },
      bp: { value: '115/75', unit: 'mmHg', status: 'normal', time: '09:25', source: 'Omron Connect BLE' },
      spo2: { value: 99, unit: '%', status: 'normal', time: '09:25', source: 'Wellue FS20F' },
      temp: { value: 36.7, unit: '°C', status: 'normal', time: '09:25', source: 'Cảm biến IoT trán' },
      weight: { value: 52, unit: 'kg', bmi: 20.3 },
      bloodGlucose: { value: 5.2, unit: 'mmol/L', status: 'normal', time: '08:00', source: 'Máy đo tại nhà' }
    },
    reasonForVisit: 'Ho khan từng cơn kéo dài 10 ngày sau đợt cảm cúm, ngứa họng về đêm gây mất ngủ.',
    reportedSymptoms: ['Ho khan nhiều về đêm', 'Ngứa rát cổ họng', 'Nghẹt mũi vào sáng sớm'],
    preTriageQuestionnaire: {
      chiefComplaint: 'Ho khan kéo dài sau nhiễm siêu vi',
      durationDays: 10,
      painScale: 3,
      feverLevel: '36.7°C (Không sốt)',
      symptoms: ['Ho khan kích ứng', 'Khô rát họng', 'Chảy dịch mũi sau'],
      pastMedsTaken: 'Đã ngậm viên kẹo ho thảo dược nhưng chỉ đỡ ngứa tạm thời.',
      submittedAt: '09:20 - Hôm nay'
    },
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
      { id: 'LAB-21', code: 'WBC', name: 'Số lượng Bạch cầu (WBC)', category: 'Huyết học', result: '6.8', unit: 'G/L', ref: '4.0 - 10.0', status: 'normal', date: '15/01/2026' }
    ],
    imaging: [
      {
        id: 'IMG-2026-12',
        modality: 'X-Quang Ngực thẳng (Kỹ thuật số)',
        bodyPart: 'Lồng ngực',
        date: '15/01/2026',
        performer: 'BS. Nguyễn Hữu Nghĩa',
        conclusion: 'Hai phế trường sáng, bóng tim không to.',
        pacsCode: 'PACS-XR-11029',
        imageUrl: 'xray-chest'
      }
    ],
    postCareReport: {
      submitted: false,
      recoveryStatus: 'moderate',
      painScaleNow: 1,
      sideEffects: [],
      patientNotes: ''
    }
  },
  {
    id: 'HIS-2026-1044',
    name: 'Lê Hoàng Minh',
    dob: '08/11/1964',
    age: 62,
    gender: 'Nam',
    bhyt: 'HT3791145890214',
    bloodType: 'B+',
    phone: '0983 456 712',
    address: '56 Nguyễn Đình Chiểu, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh',
    appointmentTime: '10:30 - Hôm nay',
    status: 'Đang chờ',
    triagePriority: 'Cấp 1 - Đỏ',
    allergies: ['Aspirin (Co thắt phế quản cấp)', 'Ibuprofen (NSAIDs)'],
    chronicConditions: ['Bệnh tim thiếu máu cục bộ mạn (I25.9)', 'Đái tháo đường typ 2 (E11.9)'],
    vitals: {
      heartRate: { value: 96, unit: 'BPM', status: 'warning', time: '09:00', source: 'Omron Connect BLE' },
      bp: { value: '152/98', unit: 'mmHg', status: 'critical', time: '09:00', source: 'Omron HEM-7361T' },
      spo2: { value: 95, unit: '%', status: 'warning', time: '09:00', source: 'Wellue FS20F' },
      temp: { value: 37.1, unit: '°C', status: 'normal', time: '09:00', source: 'Cảm biến IoT' },
      weight: { value: 78, unit: 'kg', bmi: 26.9 },
      bloodGlucose: { value: 9.4, unit: 'mmol/L', status: 'high', time: '07:15', source: 'Accu-Chek Instant' }
    },
    reasonForVisit: 'Nặng ngực âm ỉ sau xương ức khi đi bộ cầu thang, hồi hộp đánh trống ngực, đường huyết buổi sáng đo tại nhà 9.4 mmol/L.',
    reportedSymptoms: ['Đau nặng ngực khi gắng sức', 'Hồi hộp đánh trống ngực', 'Mệt mỏi, khó thở nhẹ'],
    preTriageQuestionnaire: {
      chiefComplaint: 'Nặng ngực sau xương ức, huyết áp tăng cao',
      durationDays: 2,
      painScale: 7,
      feverLevel: '37.1°C (Bình thường)',
      symptoms: ['Nặng ngực', 'Khó thở khi gắng sức', 'Đánh trống ngực', 'Tê tay'],
      pastMedsTaken: 'Đang duy trì Metformin 850mg và Bisoprolol 2.5mg hàng ngày.',
      submittedAt: '09:05 - Hôm nay'
    },
    emrHistory: [
      {
        id: 'ENC-2026-0105',
        date: '05/01/2026',
        department: 'Khoa Can Thiệp Tim Mạch',
        doctor: 'PGS.TS Nguyễn Thế Hùng',
        icd10: 'I25.1 - Bệnh xơ vữa tim mạch',
        summary: 'Sau can thiệp đặt stent LAD năm 2024. Chức năng thất trái EF 55%.',
        type: 'Tái khám chuyên khoa'
      }
    ],
    labs: [
      { id: 'LAB-31', code: 'TROP', name: 'Troponin T hs (high-sensitivity)', category: 'Miễn dịch', result: '18.4', unit: 'ng/L', ref: '< 14.0', status: 'high', date: '05/01/2026' }
    ],
    imaging: [
      {
        id: 'IMG-2026-05',
        modality: 'Siêu âm tim Doppler màu (Transthoracic Echocardiography)',
        bodyPart: 'Tim',
        date: '05/01/2026',
        performer: 'BS.CKII Vũ Minh Đức',
        conclusion: 'Giảm động nhẹ thành trước mỏm. EF 55%. Hở van 2 lá 1.5/4.',
        pacsCode: 'PACS-ECHO-192',
        imageUrl: 'echo-heart'
      }
    ],
    postCareReport: {
      submitted: false,
      recoveryStatus: 'unchanged',
      painScaleNow: 5,
      sideEffects: [],
      patientNotes: ''
    }
  }
];

export const ICD10_CATALOG: Icd10Item[] = [
  { code: 'K21.0', name: 'Bệnh trào ngược dạ dày-thực quản có viêm thực quản (GERD)', category: 'Tiêu hóa' },
  { code: 'K29.7', name: 'Viêm dạ dày – tá tràng cấp, không đặc hiệu', category: 'Tiêu hóa' },
  { code: 'I10', name: 'Bệnh tăng huyết áp vô căn (nguyên phát)', category: 'Tim mạch' },
  { code: 'I25.9', name: 'Bệnh tim thiếu máu cục bộ mạn tính', category: 'Tim mạch' },
  { code: 'E78.2', name: 'Tăng lipid máu hỗn hợp (Rối loạn chuyển hóa lipoprotein)', category: 'Nội tiết - Chuyển hóa' },
  { code: 'E11.9', name: 'Đái tháo đường týp 2 không có biến chứng', category: 'Nội tiết - Chuyển hóa' },
  { code: 'J02.9', name: 'Viêm họng cấp, không đặc hiệu', category: 'Hô hấp' },
  { code: 'J06.9', name: 'Nhiễm khuẩn đường hô hấp trên cấp tính, không đặc hiệu', category: 'Hô hấp' },
  { code: 'J30.4', name: 'Viêm mũi dị ứng, không đặc hiệu', category: 'Dị ứng - Miễn dịch' },
  { code: 'R51', name: 'Đau đầu vận mạch / Đau nửa đầu Migraine', category: 'Thần kinh' }
];

export const PHARMACY_INVENTORY: DrugCatalogItem[] = [
  // --- NHÓM PENICILLIN & BETA-LACTAM (GÂY CHẶN BỞI HỆ THỐNG CDS NẾU BỆNH NHÂN DỊ ỨNG PENICILLIN) ---
  {
    id: 'DRG-PEN-01',
    name: 'Augmentin 1g (Amoxicillin 875mg + Acid Clavulanic 125mg)',
    activeIngredient: 'Amoxicillin + Acid Clavulanic',
    category: 'Kháng sinh Nhóm Beta-lactam / Penicillin',
    unit: 'Viên',
    stock: 580,
    defaultMorning: '1',
    defaultNoon: '0',
    defaultEvening: '1',
    defaultNight: '0',
    defaultDays: 7,
    defaultRoute: 'Uống (Đầu bữa ăn)',
    defaultUsage: 'Uống ngay đầu bữa ăn để giảm kích ứng dạ dày',
    isPenicillinClass: true,
    contraindications: 'Penicillin'
  },
  {
    id: 'DRG-PEN-02',
    name: 'Amoxicillin 500mg (Mekophar)',
    activeIngredient: 'Amoxicillin trihydrat',
    category: 'Kháng sinh Nhóm Aminopenicillin',
    unit: 'Viên',
    stock: 1200,
    defaultMorning: '1',
    defaultNoon: '1',
    defaultEvening: '1',
    defaultNight: '0',
    defaultDays: 7,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống cách đều mỗi 8 giờ',
    isPenicillinClass: true,
    contraindications: 'Penicillin'
  },

  // --- NHÓM KHÁNG SINH THAY THẾ AN TOÀN CHO DỊ ỨNG PENICILLIN (MACROLIDE, FLUOROQUINOLONE) ---
  {
    id: 'DRG-ALT-01',
    name: 'Zithromax 500mg (Azithromycin dihydrate)',
    activeIngredient: 'Azithromycin',
    category: 'Kháng sinh Nhóm Macrolide (An toàn cho dị ứng Penicillin)',
    unit: 'Viên',
    stock: 420,
    defaultMorning: '1',
    defaultNoon: '0',
    defaultEvening: '0',
    defaultNight: '0',
    defaultDays: 3,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống 1 lần duy nhất trong ngày, trước ăn 1 giờ hoặc sau ăn 2 giờ',
    isPenicillinClass: false,
    contraindications: ''
  },
  {
    id: 'DRG-ALT-02',
    name: 'Ciprobay 500mg (Ciprofloxacin)',
    activeIngredient: 'Ciprofloxacin hydrochloride',
    category: 'Kháng sinh Nhóm Fluoroquinolone',
    unit: 'Viên',
    stock: 350,
    defaultMorning: '1',
    defaultNoon: '0',
    defaultEvening: '1',
    defaultNight: '0',
    defaultDays: 7,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống với nhiều nước, cách xa các thuốc kháng acid',
    isPenicillinClass: false,
    contraindications: ''
  },

  // --- CÁC THUỐC ĐIỀU TRỊ TIÊU HÓA, DẠ DÀY & TRÀO NGƯỢC (GERD) ---
  {
    id: 'DRG-001',
    name: 'Nexium Mups 40mg (Esomeprazole magnesium)',
    activeIngredient: 'Esomeprazole',
    category: 'Thuốc Ức chế Bơm Proton (PPI) - Tiêu hóa',
    unit: 'Viên',
    stock: 1420,
    defaultMorning: '1',
    defaultNoon: '0',
    defaultEvening: '0',
    defaultNight: '0',
    defaultDays: 14,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống nguyên viên trước bữa ăn sáng 30 - 60 phút',
    isPenicillinClass: false,
    contraindications: ''
  },
  {
    id: 'DRG-002',
    name: 'Gaviscon Dual Action (Hỗn dịch gói 10ml)',
    activeIngredient: 'Natri alginat + Calci carbonat',
    category: 'Thuốc Chống Trào Ngược & Kháng Acid',
    unit: 'Gói',
    stock: 850,
    defaultMorning: '1',
    defaultNoon: '1',
    defaultEvening: '1',
    defaultNight: '1',
    defaultDays: 10,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống sau các bữa ăn 30 phút và trước khi đi ngủ',
    isPenicillinClass: false,
    contraindications: ''
  },
  {
    id: 'DRG-006',
    name: 'Gasmotin 5mg (Mosapride Citrate)',
    activeIngredient: 'Mosapride citrate',
    category: 'Thuốc Tăng Vận Động Đường Tiêu Hóa (Prokinetic)',
    unit: 'Viên',
    stock: 620,
    defaultMorning: '1',
    defaultNoon: '1',
    defaultEvening: '1',
    defaultNight: '0',
    defaultDays: 14,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống trước bữa ăn 15 phút',
    isPenicillinClass: false,
    contraindications: ''
  },

  // --- THUỐC TIM MẠCH & MỠ MÁU ---
  {
    id: 'DRG-003',
    name: 'Amlor 5mg (Amlodipine besylate - Pfizer)',
    activeIngredient: 'Amlodipine',
    category: 'Thuốc Hạ Áp Chẹn Kênh Calci - Tim mạch',
    unit: 'Viên',
    stock: 2300,
    defaultMorning: '1',
    defaultNoon: '0',
    defaultEvening: '0',
    defaultNight: '0',
    defaultDays: 14,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống buổi sáng sau ăn, đo huyết áp cố định mỗi ngày',
    isPenicillinClass: false,
    contraindications: ''
  },
  {
    id: 'DRG-004',
    name: 'Lipitor 10mg (Atorvastatin calcium)',
    activeIngredient: 'Atorvastatin',
    category: 'Thuốc Hạ Lipid Máu Nhóm Statin',
    unit: 'Viên',
    stock: 910,
    defaultMorning: '0',
    defaultNoon: '0',
    defaultEvening: '1',
    defaultNight: '0',
    defaultDays: 14,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống sau bữa ăn tối 30 phút',
    isPenicillinClass: false,
    contraindications: ''
  },
  {
    id: 'DRG-007',
    name: 'Concor 2.5mg (Bisoprolol fumarate)',
    activeIngredient: 'Bisoprolol',
    category: 'Thuốc Chẹn Beta Chọn Lọc - Tim mạch',
    unit: 'Viên',
    stock: 750,
    defaultMorning: '1',
    defaultNoon: '0',
    defaultEvening: '0',
    defaultNight: '0',
    defaultDays: 14,
    defaultRoute: 'Uống',
    defaultUsage: 'Uống buổi sáng, theo dõi mạch không để dưới 55 bpm',
    isPenicillinClass: false,
    contraindications: ''
  }
];

export const CPOE_CATALOG: CpoeOrderItem[] = [
  // Cận lâm sàng Xét nghiệm (LIS)
  { id: 'CPOE-LIS-01', type: 'lis', code: 'XN-CBC', name: 'Tổng phân tích tế bào máu ngoại vi (24 thông số Laser)', department: 'Khoa Huyết học', price: 110000, sampleType: 'Máu tĩnh mạch (Ống EDTA tím)', fastTrackAvailable: true },
  { id: 'CPOE-LIS-02', type: 'lis', code: 'XN-LIPID', name: 'Bộ mỡ máu toàn phần (Cholesterol, Triglyceride, HDL, LDL)', department: 'Khoa Sinh hóa', price: 185000, sampleType: 'Máu tĩnh mạch (Ống Heparin xanh)', fastTrackAvailable: true },
  { id: 'CPOE-LIS-03', type: 'lis', code: 'XN-GLU-HBA1C', name: 'Bộ đường huyết (Glucose đói + HbA1c định lượng chuẩn HPLC)', department: 'Khoa Sinh hóa', price: 195000, sampleType: 'Máu tĩnh mạch', fastTrackAvailable: true },
  { id: 'CPOE-LIS-04', type: 'lis', code: 'XN-HP-TEST', name: 'Xét nghiệm kháng thể Helicobacter Pylori (HP) huyết thanh', department: 'Khoa Vi sinh', price: 210000, sampleType: 'Máu tĩnh mạch', fastTrackAvailable: true },
  { id: 'CPOE-LIS-05', type: 'lis', code: 'XN-TROP-HS', name: 'hs-Troponin T định lượng siêu nhạy (Đánh giá tổn thương cơ tim)', department: 'Khoa Miễn dịch', price: 320000, sampleType: 'Máu tĩnh mạch', fastTrackAvailable: true },
  { id: 'CPOE-LIS-06', type: 'lis', code: 'XN-URINE-10', name: 'Tổng phân tích nước tiểu 10 thông số (Que nhúng tự động)', department: 'Khoa Sinh hóa', price: 65000, sampleType: 'Nước tiểu giữa dòng', fastTrackAvailable: true },

  // Cận lâm sàng Chẩn đoán hình ảnh (RIS / PACS)
  { id: 'CPOE-RIS-01', type: 'ris', code: 'HA-XR-CHEST', name: 'Chụp X-quang Ngực thẳng kỹ thuật số (DR Chest)', department: 'Khoa CĐHA', price: 160000, fastTrackAvailable: true },
  { id: 'CPOE-RIS-02', type: 'ris', code: 'HA-US-ABDOMEN', name: 'Siêu âm Doppler Ổ bụng tổng quát cao cấp (Màu 4D)', department: 'Khoa Thăm dò Chức năng', price: 250000, fastTrackAvailable: true },
  { id: 'CPOE-RIS-03', type: 'ris', code: 'HA-ECG-12', name: 'Điện tim đồ vi tính 12 chuyển đạo kỹ thuật số (ECG Lead II + 12L)', department: 'Khoa Thăm dò Chức năng', price: 95000, fastTrackAvailable: true },
  { id: 'CPOE-RIS-04', type: 'ris', code: 'HA-ECHO-HEART', name: 'Siêu âm Doppler tim chuyên sâu màu qua thành ngực', department: 'Khoa Thăm dò Chức năng', price: 450000, fastTrackAvailable: false },
  { id: 'CPOE-RIS-05', type: 'ris', code: 'HA-ENDO-GI', name: 'Nội soi Thực quản - Dạ dày - Tá tràng NBI không đau (Gây mê)', department: 'Trung tâm Nội soi', price: 1650000, fastTrackAvailable: false }
];

export const INITIAL_BLUETOOTH_DEVICES: BluetoothDeviceInfo[] = [
  { id: 'dev-bp', name: 'Máy đo Huyết áp Omron HEM-7361T', serviceUuid: '0x1810', type: 'bp', connected: true, battery: 85, lastReading: '145/92 mmHg • 88 BPM' },
  { id: 'dev-spo2', name: 'Máy đo nồng độ oxy Wellue FS20F', serviceUuid: '0x1822', type: 'spo2', connected: true, battery: 92, lastReading: 'SpO2: 98% • PR: 86 BPM' },
  { id: 'dev-steth', name: 'Ống nghe điện tử 3M Littmann CORE BLE', serviceUuid: '0xFFE0', type: 'stethoscope', connected: false, battery: 74, lastReading: 'Tần số 20-200Hz (Tiếng Tim T1-T2)' },
  { id: 'dev-glucose', name: 'Máy đo Đường huyết Accu-Chek Instant', serviceUuid: '0x1808', type: 'glucose', connected: true, battery: 68, lastReading: '6.1 mmol/L (Sau nhịn ăn 8h)' }
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'LOG-001',
    timestamp: '09:15:02',
    actorId: 'BS-004821',
    actorName: 'BS.CKII Vũ Minh Đức',
    role: 'Bác sĩ phiên khám',
    action: 'READ_EMR_RECORD',
    resource: 'Patient/HIS-2026-0892',
    details: 'Truy xuất hồ sơ bệnh án EMR, kết quả xét nghiệm LIS và chẩn đoán hình ảnh PACS',
    consentStatus: 'Đã xác thực đồng thuận (e-Consent)',
    status: 'SUCCESS'
  },
  {
    id: 'LOG-002',
    timestamp: '09:15:20',
    actorId: 'IOT-BLE-GW',
    actorName: 'Cổng IoT Bluetooth Gia đình',
    role: 'Hệ thống Telemetry',
    action: 'WRITE_VITALS_STREAM',
    resource: 'Observation/Vitals-BP-HR',
    details: 'Đồng bộ kết quả HA 145/92 mmHg, SpO2 98% từ Omron BLE vào kho dữ liệu HL7 FHIR',
    consentStatus: 'Đã xác thực đồng thuận (e-Consent)',
    status: 'SUCCESS'
  },
  {
    id: 'LOG-003',
    timestamp: '09:20:45',
    actorId: 'AI-SCRIBE-01',
    actorName: 'AI Medical Scribe Vietnamese Engine',
    role: 'Hệ thống Hỗ trợ AI',
    action: 'PROCESS_STT_AUDIO',
    resource: 'ClinicalImpression/AudioTranscript',
    details: 'Phân tích bản ghi âm hội thoại lâm sàng, bóc tách cấu trúc SOAP & đối chiếu ICD-10',
    consentStatus: 'Đã xác thực đồng thuận (e-Consent)',
    status: 'SUCCESS'
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'APT-2026-001',
    patientId: 'HIS-2026-0892',
    patientName: 'Nguyễn Văn An',
    patientAge: 48,
    patientGender: 'Nam',
    patientPhone: '0903 812 456',
    appointmentTime: '09:30',
    date: '16/10/2026',
    doctorName: 'BS.CKII Vũ Minh Đức',
    doctorTitle: 'Bác sĩ phụ trách - Khoa Nội',
    specialty: 'Khoa Nội Tổng Quát',
    status: 'waiting',
    triagePriority: 'Cấp 2 - Vàng',
    reason: 'Đau rát vùng thượng vị lan sau lưng, ợ nóng nhiều về đêm, huyết áp 145/92',
    symptoms: ['Đau rát thượng vị', 'Ợ nóng sau ăn', 'Mệt mỏi'],
    vitals: { bp: '145/92', hr: 88, spo2: 98 }
  },
  {
    id: 'APT-2026-002',
    patientId: 'HIS-2026-0893',
    patientName: 'Trần Thị Mai',
    patientAge: 62,
    patientGender: 'Nữ',
    patientPhone: '0918 234 567',
    appointmentTime: '10:00',
    date: '16/10/2026',
    doctorName: 'BS.CKII Vũ Minh Đức',
    doctorTitle: 'Bác sĩ phụ trách - Khoa Nội',
    specialty: 'Nội Tiết & Tim Mạch',
    status: 'waiting',
    triagePriority: 'Cấp 3 - Xanh',
    reason: 'Tái khám định kỳ Đái tháo đường Type 2 & Tăng huyết áp, xin cấp đơn thuốc BHYT',
    symptoms: ['Khát nước', 'Tiểu đêm', 'Tê bì đầu ngón chân'],
    vitals: { bp: '125/80', hr: 72, spo2: 99 }
  },
  {
    id: 'APT-2026-003',
    patientId: 'HIS-2026-0894',
    patientName: 'Lê Hoàng Long',
    patientAge: 55,
    patientGender: 'Nam',
    patientPhone: '0988 776 655',
    appointmentTime: '10:30',
    date: '16/10/2026',
    doctorName: 'BS.CKII Vũ Minh Đức',
    doctorTitle: 'Bác sĩ phụ trách - Khoa Nội',
    specialty: 'Tim Mạch Can Thiệp',
    status: 'waiting',
    triagePriority: 'Cấp 1 - Đỏ',
    reason: 'Nặng ngực âm ỉ sau xương ức khi đi bộ cầu thang, hồi hộp đánh trống ngực',
    symptoms: ['Đau nặng ngực', 'Đánh trống ngực', 'Khó thở khi gắng sức'],
    vitals: { bp: '152/98', hr: 96, spo2: 95 }
  },
  {
    id: 'APT-2026-004',
    patientId: 'HIS-2026-0895',
    patientName: 'Phạm Thị Hương',
    patientAge: 35,
    patientGender: 'Nữ',
    patientPhone: '0934 567 890',
    appointmentTime: '08:30',
    date: '16/10/2026',
    doctorName: 'BS.CKII Vũ Minh Đức',
    doctorTitle: 'Bác sĩ phụ trách - Khoa Nội',
    specialty: 'Khoa Nội Tổng Quát',
    status: 'completed',
    triagePriority: 'Cấp 3 - Xanh',
    reason: 'Đau họng, sốt nhẹ 38°C, ho khan nhiều',
    symptoms: ['Đau họng', 'Ho khan', 'Sốt nhẹ'],
    vitals: { bp: '115/75', hr: 78, spo2: 99 }
  }
];

export const DOCTOR_PROFILES: DoctorProfile[] = [
  {
    id: 'DOC-001',
    name: 'BS.CKII Vũ Minh Đức',
    title: 'Trưởng khoa Nội Tổng Hợp',
    specialty: 'Khoa Nội Tổng Quát & Lão Khoa',
    department: 'Khoa Nội Tổng Hợp - Tầng 3, Khu A',
    experienceYears: 18,
    rating: 4.9,
    totalConsultations: 1280,
    consultationFee: 200000,
    bhytCoveredAmount: 100000,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=260',
    about: 'Chuyên gia đầu ngành về điều trị Tăng huyết áp, Đái tháo đường, Trào ngược dạ dày thực quản GERD và các bệnh lý mạn tính phức tạp.',
    availableDays: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'],
    timeSlots: ['08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '14:00 - 14:30', '14:30 - 15:00', '15:00 - 15:30']
  },
  {
    id: 'DOC-002',
    name: 'BS.CKII Trần Minh Hoàng',
    title: 'Phó GĐ Trung tâm Tim Mạch',
    specialty: 'Nội Tim Mạch & Can Thiệp',
    department: 'Trung tâm Tim Mạch - Tầng 2, Khu B',
    experienceYears: 20,
    rating: 4.95,
    totalConsultations: 950,
    consultationFee: 250000,
    bhytCoveredAmount: 100000,
    avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=260',
    about: 'Chuyên sâu chẩn đoán và điều trị Bệnh mạch vành, Rối loạn nhịp tim, Suy tim, Đau thắt ngực gắng sức, theo dõi sau can thiệp Stent.',
    availableDays: ['Thứ 2', 'Thứ 4', 'Thứ 6'],
    timeSlots: ['08:30 - 09:00', '09:30 - 10:00', '10:30 - 11:00', '14:00 - 14:30', '15:30 - 16:00']
  },
  {
    id: 'DOC-003',
    name: 'ThS.BS Lê Thị Mai Hương',
    title: 'Trưởng Đơn vị Nội soi Tiêu Hóa',
    specialty: 'Tiêu Hóa & Gan Mật',
    department: 'Khoa Tiêu Hóa - Tầng 4, Khu A',
    experienceYears: 14,
    rating: 4.88,
    totalConsultations: 1420,
    consultationFee: 200000,
    bhytCoveredAmount: 100000,
    avatar: 'https://images.unsplash.com/photo-1594824813576-2f69486c478d?auto=format&fit=crop&q=80&w=260',
    about: 'Chuyên gia chẩn đoán bệnh lý Viêm loét dạ dày - tá tràng, Viêm đại tràng co thắt IBS, Viêm gan B/C, Hội chứng trào ngược GERD.',
    availableDays: ['Thứ 3', 'Thứ 5', 'Thứ 7'],
    timeSlots: ['08:00 - 08:30', '09:00 - 09:30', '10:00 - 10:30', '14:00 - 14:30', '15:00 - 15:30']
  },
  {
    id: 'DOC-004',
    name: 'BS.CKI Nguyễn Quốc Tuấn',
    title: 'Bác sĩ Cấp cứu & Khám Bệnh',
    specialty: 'Tai Mũi Họng & Hô Hấp',
    department: 'Khoa Khám Bệnh - Tầng 1, Khu C',
    experienceYears: 10,
    rating: 4.85,
    totalConsultations: 870,
    consultationFee: 150000,
    bhytCoveredAmount: 80000,
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=260',
    about: 'Khám và tư vấn từ xa Viêm mũi xoang, Viêm amidan, Viêm phế quản cấp, Ho kéo dài sau nhiễm siêu vi, hen phế quản nhẹ.',
    availableDays: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6'],
    timeSlots: ['08:00 - 08:30', '08:30 - 09:00', '09:00 - 09:30', '13:30 - 14:00', '14:00 - 14:30', '16:00 - 16:30']
  },
  {
    id: 'DOC-005',
    name: 'ThS.BS Nguyễn Thu Hà',
    title: 'Phó Trưởng Khoa Nội Tiết',
    specialty: 'Nội Tiết & Đái Tháo Đường',
    department: 'Khoa Nội Tiết - Tầng 3, Khu B',
    experienceYears: 12,
    rating: 4.92,
    totalConsultations: 1110,
    consultationFee: 200000,
    bhytCoveredAmount: 100000,
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=260',
    about: 'Kiểm soát đường huyết, tư vấn chế độ dinh dưỡng và insulin cho bệnh nhân Tiểu đường Type 1 & 2, Bệnh tuyến giáp, Rối loạn mỡ máu.',
    availableDays: ['Thứ 2', 'Thứ 4', 'Thứ 6', 'Thứ 7'],
    timeSlots: ['08:30 - 09:00', '09:30 - 10:00', '10:30 - 11:00', '14:30 - 15:00', '15:30 - 16:00']
  }
];
