export interface DrugInfo {
  id: string
  name: string
  activeIngredient: string
  dosageForm: string
  strength: string
  defaultUnit: string
  defaultRoute: string
  defaultInstructions: string
  category: string
}

export interface PrescriptionItem {
  id: string
  drugName: string
  activeIngredient?: string
  strength?: string
  quantity: number
  unit: string
  route: string
  instructions: string
  durationDays?: number
  note?: string
}

export interface PrescriptionTemplate {
  id: string
  title: string
  specialty: string
  icd10Hint: string
  diagnosis: string
  items: Omit<PrescriptionItem, 'id'>[]
  doctorAdvice: string
}

export const VIETNAM_DRUG_CATALOG: DrugInfo[] = [
  // --- Kháng sinh & Kháng khuẩn ---
  {
    id: 'augmentin-1g',
    name: 'Augmentin 1000mg',
    activeIngredient: 'Amoxicillin 875mg + Acid Clavulanic 125mg',
    dosageForm: 'Viên nén bao phim',
    strength: '1000mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên x 2 lần/ngày sau ăn (cách 12 giờ)',
    category: 'Kháng sinh'
  },
  {
    id: 'klamentin-625',
    name: 'Klamentin 625mg',
    activeIngredient: 'Amoxicillin 500mg + Acid Clavulanic 125mg',
    dosageForm: 'Viên nén bao phim',
    strength: '625mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên x 2 lần/ngày sau ăn',
    category: 'Kháng sinh'
  },
  {
    id: 'zinnat-500',
    name: 'Zinnat 500mg',
    activeIngredient: 'Cefuroxime axetil 500mg',
    dosageForm: 'Viên nén bao phim',
    strength: '500mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên x 2 lần/ngày ngay sau bữa ăn',
    category: 'Kháng sinh'
  },
  {
    id: 'azithromycin-500',
    name: 'Azithromycin 500mg',
    activeIngredient: 'Azithromycin dihydrat 500mg',
    dosageForm: 'Viên nén bao phim',
    strength: '500mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên/ngày trước ăn 1 giờ hoặc sau ăn 2 giờ trong 3 ngày',
    category: 'Kháng sinh'
  },
  {
    id: 'clarithromycin-500',
    name: 'Clarithromycin 500mg',
    activeIngredient: 'Clarithromycin 500mg',
    dosageForm: 'Viên nén bao phim',
    strength: '500mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên x 2 lần/ngày sau ăn',
    category: 'Kháng sinh'
  },

  // --- Hạ sốt - Giảm đau - Kháng viêm ---
  {
    id: 'panadol-extra',
    name: 'Panadol Extra 500mg/65mg',
    activeIngredient: 'Paracetamol 500mg + Caffeine 65mg',
    dosageForm: 'Viên nén',
    strength: '500mg/65mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1-2 viên khi đau hoặc sốt > 38.5°C (cách ít nhất 4-6 giờ, tối đa 8 viên/ngày)',
    category: 'Hạ sốt - Giảm đau'
  },
  {
    id: 'efferalgan-500',
    name: 'Efferalgan 500mg',
    activeIngredient: 'Paracetamol 500mg',
    dosageForm: 'Viên sủi bọt',
    strength: '500mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Hòa tan 1 viên trong 150ml nước khi sốt > 38.5°C (cách ít nhất 4-6 giờ)',
    category: 'Hạ sốt - Giảm đau'
  },
  {
    id: 'hapacol-650',
    name: 'Hapacol 650mg',
    activeIngredient: 'Paracetamol 650mg',
    dosageForm: 'Viên nén',
    strength: '650mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên khi sốt > 38.5°C hoặc đau nhức nhiều (cách nhau 6 giờ)',
    category: 'Hạ sốt - Giảm đau'
  },
  {
    id: 'hapacol-250-kid',
    name: 'Hapacol 250mg (Trẻ em)',
    activeIngredient: 'Paracetamol 250mg',
    dosageForm: 'Gói bột sủi bọt',
    strength: '250mg',
    defaultUnit: 'Gói',
    defaultRoute: 'Uống',
    defaultInstructions: 'Pha 1 gói vào nước uống khi trẻ sốt > 38.5°C (liều 10-15mg/kg, cách 4-6h)',
    category: 'Hạ sốt - Giảm đau'
  },
  {
    id: 'ibuprofen-400',
    name: 'Ibuprofen 400mg',
    activeIngredient: 'Ibuprofen 400mg',
    dosageForm: 'Viên nén bao phim',
    strength: '400mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên x 2-3 lần/ngày sau khi ăn no',
    category: 'Kháng viêm NSAID'
  },

  // --- Hô hấp, Ho, Cảm cúm, Long đờm ---
  {
    id: 'acetylcystein-200',
    name: 'Acetylcystein 200mg',
    activeIngredient: 'Acetylcystein 200mg',
    dosageForm: 'Gói bột uống',
    strength: '200mg',
    defaultUnit: 'Gói',
    defaultRoute: 'Uống',
    defaultInstructions: 'Hòa tan 1 gói trong nửa cốc nước, uống 1 gói x 2-3 lần/ngày sau ăn',
    category: 'Hô hấp'
  },
  {
    id: 'ambroxol-30',
    name: 'Ambroxol 30mg',
    activeIngredient: 'Ambroxol HCl 30mg',
    dosageForm: 'Viên nén',
    strength: '30mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên x 3 lần/ngày sau bữa ăn',
    category: 'Hô hấp'
  },
  {
    id: 'prospan-siro',
    name: 'Siro Ho Prospan 100ml',
    activeIngredient: 'Cao khô lá thường xuân 0.7g/100ml',
    dosageForm: 'Siro uống',
    strength: '100ml',
    defaultUnit: 'Chai',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 5ml x 3 lần/ngày (người lớn) hoặc 2.5ml x 3 lần/ngày (trẻ em)',
    category: 'Hô hấp'
  },
  {
    id: 'decolgen-forte',
    name: 'Decolgen Forte',
    activeIngredient: 'Paracetamol 500mg + Phenylephrine HCl 10mg + Chlorpheniramine 2mg',
    dosageForm: 'Viên nén',
    strength: 'Hộp 10 vỉ',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1-2 viên x 3 lần/ngày sau ăn (giảm nghẹt mũi, sổ mũi)',
    category: 'Cảm cúm - Sổ mũi'
  },
  {
    id: 'xisat-spray',
    name: 'Xịt mũi Xisat người lớn 75ml',
    activeIngredient: 'Nước biển sâu đẳng trương tinh chiết',
    dosageForm: 'Dung dịch xịt mũi',
    strength: '75ml',
    defaultUnit: 'Chai',
    defaultRoute: 'Xịt mũi',
    defaultInstructions: 'Xịt 2-3 nhát mỗi bên mũi x 3-4 lần/ngày, hỉ sạch dịch mũi',
    category: 'Tai Mũi Họng'
  },

  // --- Tiêu hóa & Dạ dày - Ruột ---
  {
    id: 'nexium-40',
    name: 'Nexium 40mg (Esomeprazole)',
    activeIngredient: 'Esomeprazole 40mg',
    dosageForm: 'Viên nén kháng dịch dạ dày',
    strength: '40mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống nguyên viên 1 viên/ngày trước bữa ăn sáng 30 - 60 phút',
    category: 'Tiêu hóa - Dạ dày'
  },
  {
    id: 'omeprazole-20',
    name: 'Omeprazole 20mg',
    activeIngredient: 'Omeprazole 20mg',
    dosageForm: 'Viên nang giải phóng chậm',
    strength: '20mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên/ngày trước ăn sáng 30 phút',
    category: 'Tiêu hóa - Dạ dày'
  },
  {
    id: 'phosphalugel',
    name: 'Phosphalugel (Gel nhôm phosphat)',
    activeIngredient: 'Aluminium phosphate gel 20% 12.38g',
    dosageForm: 'Hỗn dịch uống',
    strength: 'Gói 20g',
    defaultUnit: 'Gói',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 gói khi có cơn đau thượng vị hoặc sau bữa ăn 1-2 giờ',
    category: 'Tiêu hóa - Dạ dày'
  },
  {
    id: 'gaviscon-dual',
    name: 'Gaviscon Dual Action',
    activeIngredient: 'Natri alginate + Natri bicarbonat + Calci carbonat',
    dosageForm: 'Hỗn dịch uống gói 10ml',
    strength: '10ml',
    defaultUnit: 'Gói',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 gói sau bữa ăn chính và trước khi đi ngủ (chống trào ngược)',
    category: 'Tiêu hóa - Trào ngược'
  },
  {
    id: 'motilium-m',
    name: 'Motilium-M 10mg',
    activeIngredient: 'Domperidone 10mg',
    dosageForm: 'Viên nén',
    strength: '10mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên x 3 lần/ngày trước bữa ăn 15-30 phút (chống nôn, đầy bụng)',
    category: 'Tiêu hóa'
  },
  {
    id: 'berberin-100',
    name: 'Berberin 100mg',
    activeIngredient: 'Berberin clorid 100mg',
    dosageForm: 'Viên nén',
    strength: '100mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 2 viên x 2 lần/ngày sau ăn',
    category: 'Tiêu hóa - Kháng khuẩn'
  },
  {
    id: 'enterogermina',
    name: 'Enterogermina 2 tỷ bào tử/5ml',
    activeIngredient: 'Bacillus clausii đa kháng kháng sinh 2 tỷ bào tử',
    dosageForm: 'Hỗn dịch uống dạng ống',
    strength: '5ml',
    defaultUnit: 'Ống',
    defaultRoute: 'Uống',
    defaultInstructions: 'Lắc đều trước khi dùng, uống 1 ống x 2 lần/ngày cách xa bữa kháng sinh',
    category: 'Men vi sinh'
  },
  {
    id: 'oresol-245',
    name: 'Oresol 245 (WHO)',
    activeIngredient: 'Glucose, Natri clorid, Kali clorid, Natri citrat',
    dosageForm: 'Gói bột pha dung dịch uống',
    strength: 'Gói 4.1g',
    defaultUnit: 'Gói',
    defaultRoute: 'Uống',
    defaultInstructions: 'Pha đúng 1 gói trong chính xác 200ml nước đun sôi để nguội, uống rải rác trong ngày bù nước',
    category: 'Bù nước - Điện giải'
  },
  {
    id: 'smecta-3g',
    name: 'Smecta 3g',
    activeIngredient: 'Diosmectite 3g',
    dosageForm: 'Bột pha hỗn dịch uống',
    strength: '3g',
    defaultUnit: 'Gói',
    defaultRoute: 'Uống',
    defaultInstructions: 'Hòa 1 gói với 50ml nước uống giữa các bữa ăn (1 gói x 3 lần/ngày)',
    category: 'Tiêu chảy'
  },

  // --- Dị ứng & Da liễu ---
  {
    id: 'telfast-180',
    name: 'Telfast 180mg (Fexofenadine)',
    activeIngredient: 'Fexofenadine HCl 180mg',
    dosageForm: 'Viên nén bao phim',
    strength: '180mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên/ngày sau bữa ăn (không gây buồn ngủ)',
    category: 'Chống dị ứng - Kháng Histamin'
  },
  {
    id: 'cetirizine-10',
    name: 'Cetirizine 10mg',
    activeIngredient: 'Cetirizine dihydrochloride 10mg',
    dosageForm: 'Viên nén bao phim',
    strength: '10mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên vào buổi tối trước khi đi ngủ',
    category: 'Chống dị ứng - Kháng Histamin'
  },
  {
    id: 'loratadine-10',
    name: 'Loratadine 10mg',
    activeIngredient: 'Loratadine 10mg',
    dosageForm: 'Viên nén',
    strength: '10mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên/ngày vào buổi sáng hoặc tối',
    category: 'Chống dị ứng - Kháng Histamin'
  },
  {
    id: 'fucidin-cream',
    name: 'Fucidin Cream 15g (Acid Fusidic)',
    activeIngredient: 'Acid Fusidic 20mg/g',
    dosageForm: 'Kem bôi ngoài da',
    strength: '15g',
    defaultUnit: 'Tuýp',
    defaultRoute: 'Bôi ngoài da',
    defaultInstructions: 'Rửa sạch vùng tổn thương, thoa một lớp mỏng ngày 2-3 lần',
    category: 'Thuốc bôi da liễu'
  },
  {
    id: 'bepanthen-ointment',
    name: 'Bepanthen Ointment 30g',
    activeIngredient: 'Dexpanthenol 5%',
    dosageForm: 'Thuốc mỡ bôi ngoài da',
    strength: '30g',
    defaultUnit: 'Tuýp',
    defaultRoute: 'Bôi ngoài da',
    defaultInstructions: 'Bôi một lớp mỏng lên vùng da khô rát, tổn thương 2-3 lần/ngày',
    category: 'Phục hồi da'
  },

  // --- Tim mạch & Huyết áp ---
  {
    id: 'amlor-5',
    name: 'Amlor 5mg (Amlodipine)',
    activeIngredient: 'Amlodipine besylate 5mg',
    dosageForm: 'Viên nang cứng',
    strength: '5mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên vào buổi sáng (cố định một khung giờ mỗi ngày)',
    category: 'Tim mạch - Huyết áp'
  },
  {
    id: 'micardis-40',
    name: 'Micardis 40mg (Telmisartan)',
    activeIngredient: 'Telmisartan 40mg',
    dosageForm: 'Viên nén',
    strength: '40mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên vào buổi sáng, có thể cùng hoặc không cùng thức ăn',
    category: 'Tim mạch - Huyết áp'
  },
  {
    id: 'coversyl-5',
    name: 'Coversyl 5mg (Perindopril)',
    activeIngredient: 'Perindopril arginine 5mg',
    dosageForm: 'Viên nén bao phim',
    strength: '5mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên vào buổi sáng trước bữa ăn',
    category: 'Tim mạch - Huyết áp'
  },
  {
    id: 'lipitor-20',
    name: 'Lipitor 20mg (Atorvastatin)',
    activeIngredient: 'Atorvastatin calcium 20mg',
    dosageForm: 'Viên nén bao phim',
    strength: '20mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên vào buổi tối trước khi đi ngủ',
    category: 'Mỡ máu - Tim mạch'
  },
  {
    id: 'aspirin-81',
    name: 'Aspirin pH8 81mg',
    activeIngredient: 'Acid acetylsalicylic 81mg',
    dosageForm: 'Viên bao tan trong ruột',
    strength: '81mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1 viên/ngày sau bữa ăn trưa no với nhiều nước',
    category: 'Tim mạch - Chống kết tập tiểu cầu'
  },

  // --- Chuyên khoa Tâm thần & Giấc ngủ ---
  {
    id: 'rotunda-30',
    name: 'Rotunda 30mg',
    activeIngredient: 'Rotundin 30mg (Củ bình vôi)',
    dosageForm: 'Viên nén',
    strength: '30mg',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 1-2 viên trước khi đi ngủ 30-60 phút',
    category: 'Tâm thần - An thần thảo dược'
  },
  {
    id: 'magne-b6',
    name: 'Magne-B6 Corbiere',
    activeIngredient: 'Magnesi lactat dihydrat 470mg + Vitamin B6 5mg',
    dosageForm: 'Viên bao đường',
    strength: 'Hộp 50 viên',
    defaultUnit: 'Viên',
    defaultRoute: 'Uống',
    defaultInstructions: 'Uống 2 viên x 2 lần/ngày sau các bữa ăn chính',
    category: 'Khoáng chất & Thần kinh'
  }
]

export const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'tpl-gerd',
    title: 'Viêm dạ dày - Trào ngược GERD',
    specialty: 'Khoa Nội tổng quát',
    icd10Hint: 'K21.9',
    diagnosis: 'Bệnh trào ngược dạ dày - thực quản không viêm (GERD)',
    items: [
      {
        drugName: 'Nexium 40mg (Esomeprazole)',
        activeIngredient: 'Esomeprazole 40mg',
        strength: '40mg',
        quantity: 14,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên/ngày trước bữa ăn sáng 30 - 60 phút',
        durationDays: 14,
        note: 'Uống nguyên viên, không bẻ hoặc nhai'
      },
      {
        drugName: 'Gaviscon Dual Action',
        activeIngredient: 'Natri alginate + Calci carbonat',
        strength: '10ml',
        quantity: 28,
        unit: 'Gói',
        route: 'Uống',
        instructions: 'Uống 1 gói sau bữa ăn chính 1 giờ và trước khi đi ngủ',
        durationDays: 14,
        note: 'Dùng khi ợ nóng, cồn cào tức ngực'
      },
      {
        drugName: 'Motilium-M 10mg',
        activeIngredient: 'Domperidone 10mg',
        strength: '10mg',
        quantity: 28,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên x 2 lần/ngày trước bữa ăn trưa và tối 15-30 phút',
        durationDays: 14,
        note: 'Hỗ trợ làm rỗng dạ dày, chống đầy bụng'
      }
    ],
    doctorAdvice: 'Tránh ăn no quá, không nằm ngay sau ăn (chờ ít nhất 2-3 tiếng). Kiêng bia rượu, cà phê đặc, đồ chua cay, dầu mỡ. Kê cao đầu giường khi ngủ 15cm. Tái khám sau 2 tuần.'
  },
  {
    id: 'tpl-resp-infection',
    title: 'Viêm họng cấp / Nhiễm khuẩn hô hấp trên',
    specialty: 'Khoa Tai Mũi Họng',
    icd10Hint: 'J02.9',
    diagnosis: 'Viêm họng cấp tính không đặc hiệu',
    items: [
      {
        drugName: 'Augmentin 1000mg',
        activeIngredient: 'Amoxicillin 875mg + Acid Clavulanic 125mg',
        strength: '1000mg',
        quantity: 14,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên x 2 lần/ngày sau bữa ăn sáng và tối (cách 12 giờ)',
        durationDays: 7,
        note: 'Dùng liên tục đủ 7 ngày, không tự ý ngừng thuốc'
      },
      {
        drugName: 'Efferalgan 500mg',
        activeIngredient: 'Paracetamol 500mg',
        strength: '500mg',
        quantity: 10,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Hòa tan 1 viên trong 150ml nước khi đau rát họng nhiều hoặc sốt > 38.5°C (cách ít nhất 4-6h)',
        durationDays: 5,
        note: 'Chỉ dùng khi sốt hoặc đau'
      },
      {
        drugName: 'Acetylcystein 200mg',
        activeIngredient: 'Acetylcystein 200mg',
        strength: '200mg',
        quantity: 14,
        unit: 'Gói',
        route: 'Uống',
        instructions: 'Hòa tan 1 gói với nước ấm, uống sáng 1 gói - chiều 1 gói sau ăn',
        durationDays: 7,
        note: 'Giúp loãng đờm, dễ tống xuất'
      },
      {
        drugName: 'Xịt mũi Xisat người lớn 75ml',
        activeIngredient: 'Nước biển sâu tự nhiên',
        strength: '75ml',
        quantity: 1,
        unit: 'Chai',
        route: 'Xịt mũi',
        instructions: 'Xịt 2 nhát mỗi bên mũi x 3-4 lần/ngày sau đó hỉ sạch mũi',
        durationDays: 7,
        note: 'Vệ sinh niêm mạc mũi họng'
      }
    ],
    doctorAdvice: 'Uống đủ 2 - 2.5 lít nước ấm mỗi ngày, súc họng bằng nước muối sinh lý ấm 3-4 lần/ngày. Giữ ấm cổ ngực, tránh tiếp xúc gió lạnh, bụi khói thuốc lá. Tái khám sau 5-7 ngày hoặc khám lại ngay nếu sốt cao liên tục không hạ, khó thở.'
  },
  {
    id: 'tpl-flu',
    title: 'Cảm cúm - Sốt siêu vi (Điều trị triệu chứng)',
    specialty: 'Khoa Nội tổng quát',
    icd10Hint: 'J10.1',
    diagnosis: 'Cúm do virus không xác định, có biểu hiện hô hấp',
    items: [
      {
        drugName: 'Panadol Extra 500mg/65mg',
        activeIngredient: 'Paracetamol 500mg + Caffeine 65mg',
        strength: '500mg/65mg',
        quantity: 15,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên khi sốt > 38.5°C hoặc nhức đầu mình mẩy (cách nhau ít nhất 4-6 giờ)',
        durationDays: 5,
        note: 'Không uống quá 6 viên/ngày'
      },
      {
        drugName: 'Decolgen Forte',
        activeIngredient: 'Paracetamol + Phenylephrine + Chlorpheniramine',
        strength: 'Viên nén',
        quantity: 10,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên x 2 lần/ngày (sáng 1 viên, tối 1 viên) sau ăn',
        durationDays: 5,
        note: 'Thuốc có thể gây hơi buồn ngủ nhẹ'
      },
      {
        drugName: 'Oresol 245 (WHO)',
        activeIngredient: 'Glucose và các chất điện giải',
        strength: '4.1g',
        quantity: 5,
        unit: 'Gói',
        route: 'Uống',
        instructions: 'Pha 1 gói trong chính xác 200ml nước đun sôi để nguội, uống rải rác bù nước điện giải',
        durationDays: 3,
        note: 'Không pha với nước khoáng hay sữa'
      }
    ],
    doctorAdvice: 'Nghỉ ngơi tại phòng thoáng khí, dinh dưỡng thức ăn lỏng dễ tiêu (cháo hành, tía tô, súp gà). Uống nhiều nước ấm, nước cam chanh. Theo dõi nhiệt độ cơ thể thường xuyên.'
  },
  {
    id: 'tpl-allergy-skin',
    title: 'Viêm da dị ứng - Mề đay cấp',
    specialty: 'Khoa Da liễu',
    icd10Hint: 'L50.0',
    diagnosis: 'Mày đay dị ứng cấp tính',
    items: [
      {
        drugName: 'Telfast 180mg (Fexofenadine)',
        activeIngredient: 'Fexofenadine HCl 180mg',
        strength: '180mg',
        quantity: 10,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên vào buổi sáng sau ăn no',
        durationDays: 10,
        note: 'Kháng histamin thế hệ mới, không gây buồn ngủ'
      },
      {
        drugName: 'Bepanthen Ointment 30g',
        activeIngredient: 'Dexpanthenol 5%',
        strength: '30g',
        quantity: 1,
        unit: 'Tuýp',
        route: 'Bôi ngoài da',
        instructions: 'Vệ sinh vùng da sạch sẽ, thoa một lớp mỏng 2-3 lần/ngày',
        durationDays: 10,
        note: 'Làm dịu ngứa, phục hồi hàng rào bảo vệ da'
      }
    ],
    doctorAdvice: 'Tuyệt đối không cào gãi gây trầy xước bội nhiễm. Tạm ngưng các loại hải sản lạ, rượu bia, hóa mỹ phẩm mới dùng. Mặc quần áo cotton rộng rãi, thoáng mát. Tắm nước ấm vừa phải, không dùng xà phòng tẩy rửa mạnh.'
  },
  {
    id: 'tpl-gastroenteritis',
    title: 'Rối loạn tiêu hóa / Tiêu chảy cấp',
    specialty: 'Khoa Nội tổng quát',
    icd10Hint: 'A09',
    diagnosis: 'Viêm dạ dày - ruột và viêm đại tràng nghi do nhiễm khuẩn',
    items: [
      {
        drugName: 'Oresol 245 (WHO)',
        activeIngredient: 'Dung dịch bù nước và điện giải áp lực thẩm thấu thấp',
        strength: '4.1g',
        quantity: 10,
        unit: 'Gói',
        route: 'Uống',
        instructions: 'Pha đúng 1 gói trong đúng 200ml nước nguội, uống 100-200ml sau mỗi lần đi ngoài',
        durationDays: 3,
        note: 'Quan trọng nhất để chống mất nước'
      },
      {
        drugName: 'Berberin 100mg',
        activeIngredient: 'Berberin clorid 100mg',
        strength: '100mg',
        quantity: 20,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 2 viên x 2 lần/ngày sau khi ăn',
        durationDays: 5,
        note: 'Kháng khuẩn đường ruột nguồn gốc thực vật'
      },
      {
        drugName: 'Enterogermina 2 tỷ bào tử/5ml',
        activeIngredient: 'Bacillus clausii 2 tỷ bào tử',
        strength: '5ml',
        quantity: 10,
        unit: 'Ống',
        route: 'Uống',
        instructions: 'Lắc đều, uống trực tiếp 1 ống x 2 lần/ngày',
        durationDays: 5,
        note: 'Tái lập cân bằng vi sinh đường ruột'
      }
    ],
    doctorAdvice: 'Ăn cháo loãng với muối, thịt nạc băm nhỏ. Tránh sữa tươi, nước ngọt có ga, dầu mỡ, đồ sống lạnh. Nếu nôn liên tục, sốt cao hoặc phân có nhầy máu cần đến viện ngay.'
  },
  {
    id: 'tpl-hypertension',
    title: 'Tăng huyết áp nguyên phát (Ngoại trú ổn định)',
    specialty: 'Khoa Tim mạch',
    icd10Hint: 'I10',
    diagnosis: 'Tăng huyết áp vô căn (nguyên phát)',
    items: [
      {
        drugName: 'Amlor 5mg (Amlodipine)',
        activeIngredient: 'Amlodipine besylate 5mg',
        strength: '5mg',
        quantity: 30,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên vào 08:00 sáng mỗi ngày cố định một giờ',
        durationDays: 30,
        note: 'Duy trì uống đều đặn hàng ngày kể cả khi huyết áp đã ổn định'
      },
      {
        drugName: 'Micardis 40mg (Telmisartan)',
        activeIngredient: 'Telmisartan 40mg',
        strength: '40mg',
        quantity: 30,
        unit: 'Viên',
        route: 'Uống',
        instructions: 'Uống 1 viên vào buổi sáng cùng Amlor 5mg',
        durationDays: 30,
        note: 'Bảo vệ tim mạch và thận'
      }
    ],
    doctorAdvice: 'Ăn nhạt (dưới 5g muối/ngày, giảm nước mắm, dưa cà muối). Hạn chế mỡ động vật, rượu bia, bỏ thuốc lá. Đo và ghi nhật ký huyết áp sáng - tối mỗi ngày. Tái khám định kỳ sau 30 ngày hoặc khi huyết áp > 160/100 mmHg kèm đau đầu chóng mặt.'
  },
  {
    id: 'tpl-pediatric-fever',
    title: 'Sốt ho sổ mũi trẻ em (Ngoại trú)',
    specialty: 'Khoa Nhi',
    icd10Hint: 'J06.9',
    diagnosis: 'Nhiễm khuẩn hô hấp trên cấp tính ở trẻ em',
    items: [
      {
        drugName: 'Hapacol 250mg (Trẻ em)',
        activeIngredient: 'Paracetamol 250mg',
        strength: '250mg',
        quantity: 10,
        unit: 'Gói',
        route: 'Uống',
        instructions: 'Hòa 1 gói với nước ấm khi bé sốt > 38.5°C (liều 10-15mg/kg/lần, cách ít nhất 4-6 giờ)',
        durationDays: 5,
        note: 'Không quá 4 lần/ngày'
      },
      {
        drugName: 'Siro Ho Prospan 100ml',
        activeIngredient: 'Cao khô lá thường xuân',
        strength: '100ml',
        quantity: 1,
        unit: 'Chai',
        route: 'Uống',
        instructions: 'Uống 2.5ml x 3 lần/ngày sau các cữ ăn',
        durationDays: 7,
        note: 'Dịu ho, làm loãng đờm tự nhiên an toàn cho trẻ'
      },
      {
        drugName: 'Oresol 245 (WHO)',
        activeIngredient: 'Bột pha bù nước điện giải',
        strength: '4.1g',
        quantity: 4,
        unit: 'Gói',
        route: 'Uống',
        instructions: 'Pha 1 gói với 200ml nước nguội, cho bé uống từng thìa nhỏ rải rác trong ngày',
        durationDays: 3,
        note: 'Chống mất nước khi bé sốt'
      }
    ],
    doctorAdvice: 'Mặc quần áo thoáng mát, chườm ấm trán nách bẹn khi sốt. Cho bé bú mẹ nhiều cữ hơn hoặc uống nước ấm. Đưa trẻ đi viện ngay nếu: sốt cao liên tục > 39.5°C không hạ, co giật, thở khò khè rút lõm lồng ngực, li bì bú kém.'
  }
]

// Hàm chuyển danh sách thuốc có cấu trúc và lời dặn thành văn bản đơn thuốc chuẩn Bộ Y Tế
export function compilePrescriptionToText(
  items: PrescriptionItem[],
  doctorAdvice: string = ''
): string {
  if (!items.length && !doctorAdvice.trim()) return ''

  const lines: string[] = []
  lines.push('ĐƠN THUỐC ĐIỀU TRỊ NGOẠI TRÚ')
  lines.push('----------------------------------------')

  items.forEach((item, index) => {
    const num = index + 1
    const activeText = item.activeIngredient ? ` (${item.activeIngredient})` : ''
    const strengthText = item.strength && !item.drugName.includes(item.strength) ? ` - ${item.strength}` : ''
    lines.push(`${num}. ${item.drugName}${strengthText}${activeText}`)
    lines.push(`   - Số lượng: ${item.quantity} ${item.unit}`)
    lines.push(`   - Đường dùng & Cách dùng: [${item.route}] ${item.instructions}`)
    if (item.durationDays) {
      lines.push(`   - Thời gian sử dụng: Dùng trong ${item.durationDays} ngày`)
    }
    if (item.note && item.note.trim()) {
      lines.push(`   - Lưu ý: ${item.note.trim()}`)
    }
    lines.push('')
  })

  if (doctorAdvice && doctorAdvice.trim()) {
    lines.push('----------------------------------------')
    lines.push('* Lời dặn của Bác sĩ điều trị:')
    lines.push(doctorAdvice.trim())
  }

  return lines.join('\n').trim()
}
