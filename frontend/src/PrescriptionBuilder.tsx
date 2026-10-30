import React, { useState, useEffect } from 'react'
import {
  Pill,
  Plus,
  Trash2,
  FileText,
  Save,
  Share2,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Edit3
} from 'lucide-react'
import {
  DrugInfo,
  PrescriptionItem,
  VIETNAM_DRUG_CATALOG,
  PRESCRIPTION_TEMPLATES,
  compilePrescriptionToText
} from './medicationData'

interface PrescriptionBuilderProps {
  prescriptionText: string
  onChange: (newText: string) => void
  onSave: () => Promise<void>
  onSyncNational?: () => Promise<void>
  onDownloadPdf?: () => Promise<void>
  isLocked?: boolean
  isSaving?: boolean
  isSyncing?: boolean
  isDownloadingPdf?: boolean
  nationalPrescription?: {
    national_code: string
    qr_url: string
    synced_at?: string
  } | null
  aiScribeDraft?: string | null
  onApplyAiDraft?: (draft: string) => void
}

export const PrescriptionBuilder: React.FC<PrescriptionBuilderProps> = ({
  prescriptionText,
  onChange,
  onSave,
  onSyncNational,
  onDownloadPdf,
  isLocked = false,
  isSaving = false,
  isSyncing = false,
  isDownloadingPdf = false,
  nationalPrescription,
  aiScribeDraft
}) => {
  const [mode, setMode] = useState<'structured' | 'freetext'>('structured')
  const [items, setItems] = useState<PrescriptionItem[]>([])
  const [doctorAdvice, setDoctorAdvice] = useState<string>('')
  
  // New drug input form states
  const [searchQuery, setSearchQuery] = useState('')
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [selectedDrug, setSelectedDrug] = useState<DrugInfo | null>(null)
  
  const [customDrugName, setCustomDrugName] = useState('')
  const [activeIngredient, setActiveIngredient] = useState('')
  const [strength, setStrength] = useState('')
  const [quantity, setQuantity] = useState<number>(1)
  const [unit, setUnit] = useState('Viên')
  const [route, setRoute] = useState('Uống')
  const [instructions, setInstructions] = useState('')
  const [durationDays, setDurationDays] = useState<number | undefined>(undefined)
  const [note, setNote] = useState('')

  // Filter drug catalog
  const filteredDrugs = VIETNAM_DRUG_CATALOG.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.activeIngredient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8)

  // Handle drug select from catalog
  const handleSelectDrug = (drug: DrugInfo) => {
    setSelectedDrug(drug)
    setCustomDrugName(drug.name)
    setActiveIngredient(drug.activeIngredient)
    setStrength(drug.strength)
    setUnit(drug.defaultUnit)
    setRoute(drug.defaultRoute)
    setInstructions(drug.defaultInstructions)
    setDurationDays(7)
    setSearchQuery('')
    setShowCatalogDropdown(false)
  }

  // Quick instruction chips
  const quickInstructionChips = [
    'Uống 1 viên x 2 lần/ngày sau ăn (sáng - tối)',
    'Uống 1 viên khi sốt > 38.5°C (cách ít nhất 4-6h)',
    'Uống 1 viên vào buổi sáng trước ăn 30-60 phút',
    'Uống 1 viên vào buổi tối trước khi đi ngủ',
    'Hòa tan 1 gói với 200ml nước đun sôi để nguội',
    'Xịt mỗi bên mũi 2 nhát x 3 lần/ngày',
    'Bôi một lớp mỏng lên vùng da tổn thương ngày 2 lần'
  ]

  // Add item to prescription list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    const finalDrugName = customDrugName.trim() || searchQuery.trim()
    if (!finalDrugName) return

    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      drugName: finalDrugName,
      activeIngredient: activeIngredient.trim() || undefined,
      strength: strength.trim() || undefined,
      quantity: quantity > 0 ? quantity : 1,
      unit: unit || 'Viên',
      route: route || 'Uống',
      instructions: instructions.trim() || 'Dùng theo chỉ dẫn của bác sĩ',
      durationDays: durationDays && durationDays > 0 ? durationDays : undefined,
      note: note.trim() || undefined
    }

    const updated = [...items, newItem]
    setItems(updated)
    const compiled = compilePrescriptionToText(updated, doctorAdvice)
    onChange(compiled)

    // Reset input fields
    setSelectedDrug(null)
    setCustomDrugName('')
    setActiveIngredient('')
    setStrength('')
    setQuantity(1)
    setInstructions('')
    setNote('')
    setSearchQuery('')
  }

  // Remove item
  const handleRemoveItem = (id: string) => {
    const updated = items.filter(it => it.id !== id)
    setItems(updated)
    const compiled = compilePrescriptionToText(updated, doctorAdvice)
    onChange(compiled)
  }

  // Update doctor advice
  const handleAdviceChange = (advice: string) => {
    setDoctorAdvice(advice)
    const compiled = compilePrescriptionToText(items, advice)
    onChange(compiled)
  }

  // Apply clinical template
  const handleApplyTemplate = (tpl: typeof PRESCRIPTION_TEMPLATES[0]) => {
    if (items.length > 0) {
      const confirmReplace = window.confirm(
        `Bạn có muốn thay thế các thuốc hiện tại bằng đơn mẫu "${tpl.title}" không?`
      )
      if (!confirmReplace) return
    }

    const newItems: PrescriptionItem[] = tpl.items.map(it => ({
      ...it,
      id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    }))

    setItems(newItems)
    setDoctorAdvice(tpl.doctorAdvice)
    const compiled = compilePrescriptionToText(newItems, tpl.doctorAdvice)
    onChange(compiled)
  }

  // Clear all items
  const handleResetPrescription = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới toàn bộ đơn thuốc?')) {
      setItems([])
      setDoctorAdvice('')
      onChange('')
    }
  }

  return (
    <div className="prescription-builder-container">
      {/* Top Banner: National Prescription Code or Sync CTA */}
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
            <span className="tag-national">CỔNG ĐƠN THUỐC QUỐC GIA (BỘ Y TẾ)</span>
            <h3>{nationalPrescription.national_code}</h3>
            <p className="tiny muted">
              Đơn thuốc đã được mã hóa và xác thực theo chuẩn Thông tư 04/2022/TT-BYT. Bệnh nhân có thể quét mã QR tại các nhà thuốc GPP trên toàn quốc để mua thuốc an toàn.
            </p>
            {nationalPrescription.synced_at && (
              <span className="tiny muted" style={{ display: 'block', marginTop: '4px' }}>
                Thời gian đồng bộ: {new Date(nationalPrescription.synced_at).toLocaleString('vi-VN')}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="sync-prompt-card">
          <div>
            <b>Đồng bộ Đơn thuốc điện tử Quốc gia</b>
            <p className="tiny muted">
              Tự động cấp mã định danh quốc gia và mã QR tra cứu trên hệ thống <code>donthuocquocgia.vn</code>.
            </p>
          </div>
          {onSyncNational && (
            <button
              type="button"
              className="primary"
              onClick={onSyncNational}
              disabled={isSyncing || isLocked || !prescriptionText.trim()}
              title="Đẩy đơn thuốc lên Cổng quản lý Kê đơn điện tử Quốc gia"
            >
              <Share2 size={16} /> {isSyncing ? 'Đang đồng bộ...' : 'Đẩy lên Cổng Quốc gia'}
            </button>
          )}
        </div>
      )}

      {/* AI Scribe Suggestion Alert (if available) */}
      {aiScribeDraft && !items.length && (
        <div className="ai-scribe-prescription-alert">
          <div className="alert-content">
            <Sparkles size={18} className="text-teal" />
            <div>
              <b>Trợ lý AI Scribe đã đề xuất đơn thuốc dự thảo:</b>
              <p className="tiny" style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{aiScribeDraft}</p>
            </div>
          </div>
          <button
            type="button"
            className="secondary-btn small-btn"
            onClick={() => {
              onChange(aiScribeDraft)
              setMode('freetext')
            }}
          >
            Áp dụng dự thảo AI
          </button>
        </div>
      )}

      {/* Navigation Toolbar & Mode Switcher */}
      <div className="rx-toolbar">
        <div className="rx-mode-tabs">
          <button
            type="button"
            className={`mode-tab-btn ${mode === 'structured' ? 'active' : ''}`}
            onClick={() => setMode('structured')}
          >
            <Layers size={15} /> Kê đơn tương tác (Chuẩn Bộ Y Tế)
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${mode === 'freetext' ? 'active' : ''}`}
            onClick={() => setMode('freetext')}
          >
            <Edit3 size={15} /> Soạn thảo tự do (Văn bản)
          </button>
        </div>

        <div className="rx-actions-right">
          <button
            type="button"
            className="btn-rx-action save-btn"
            onClick={onSave}
            disabled={isSaving || isLocked || !prescriptionText.trim()}
            title="Lưu đơn thuốc vào hồ sơ khám"
          >
            <Save size={15} /> {isSaving ? 'Đang lưu...' : 'Lưu đơn thuốc'}
          </button>

          {onDownloadPdf && (
            <button
              type="button"
              className="btn-rx-action pdf-btn"
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf || !prescriptionText.trim()}
              title="Tải xuống phiếu khám & đơn thuốc định dạng PDF"
            >
              <Download size={15} /> {isDownloadingPdf ? 'Đang xuất PDF...' : 'Xuất PDF'}
            </button>
          )}

          {items.length > 0 && !isLocked && (
            <button
              type="button"
              className="btn-rx-action reset-btn"
              onClick={handleResetPrescription}
              title="Xóa toàn bộ thuốc để kê lại"
            >
              <RotateCcw size={14} /> Làm mới
            </button>
          )}
        </div>
      </div>

      {mode === 'structured' ? (
        <div className="structured-prescription-workspace">
          {/* Section 1: Clinical Presets */}
          {!isLocked && (
            <div className="rx-presets-card">
              <div className="presets-header">
                <span className="presets-title">⚡ Đơn thuốc mẫu chuẩn lâm sàng (1-click):</span>
                <span className="tiny muted">Ngoại trú theo phác đồ Bộ Y Tế</span>
              </div>
              <div className="presets-pill-list">
                {PRESCRIPTION_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="preset-pill-btn"
                    onClick={() => handleApplyTemplate(tpl)}
                    title={`${tpl.title} (${tpl.specialty})`}
                  >
                    <span>{tpl.title}</span>
                    <small className="tpl-count">{tpl.items.length} thuốc</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Add Medication Form */}
          {!isLocked && (
            <div className="add-drug-card">
              <h4 className="card-sub-title">
                <Plus size={16} /> Thêm thuốc vào đơn điều trị
              </h4>

              {/* Drug Search / Autocomplete */}
              <div className="drug-search-wrapper">
                <label className="field-label">Tìm kiếm thuốc theo tên, hoạt chất hoặc biệt dược:</label>
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder="Gõ để tìm nhanh (vd: Augmentin, Paracetamol, Nexium, Amlodipine...)"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value)
                      setShowCatalogDropdown(true)
                    }}
                    onFocus={() => setShowCatalogDropdown(true)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="clear-search-btn"
                      onClick={() => setSearchQuery('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Dropdown Suggestions */}
                {showCatalogDropdown && searchQuery.trim() && (
                  <div className="drug-dropdown-menu">
                    {filteredDrugs.length > 0 ? (
                      filteredDrugs.map(drug => (
                        <div
                          key={drug.id}
                          className="drug-dropdown-item"
                          onClick={() => handleSelectDrug(drug)}
                        >
                          <div className="drug-item-primary">
                            <span className="drug-name">{drug.name}</span>
                            <span className="drug-badge">{drug.category}</span>
                          </div>
                          <div className="drug-item-secondary">
                            <span>{drug.activeIngredient}</span>
                            <span>• {drug.dosageForm}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="drug-dropdown-empty">
                        <span>Không tìm thấy trong danh mục gợi ý. Bạn có thể tự nhập tên thuốc bên dưới.</span>
                        <button
                          type="button"
                          className="use-custom-btn"
                          onClick={() => {
                            setCustomDrugName(searchQuery)
                            setShowCatalogDropdown(false)
                          }}
                        >
                          Sử dụng "{searchQuery}"
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drug Details Form Fields */}
              <form onSubmit={handleAddItem} className="drug-fields-grid">
                <div className="field-col col-name">
                  <label>Tên biệt dược / Thuốc: <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Augmentin 1000mg"
                    value={customDrugName}
                    onChange={e => setCustomDrugName(e.target.value)}
                  />
                </div>

                <div className="field-col col-active">
                  <label>Hoạt chất & Hàm lượng:</label>
                  <input
                    type="text"
                    placeholder="vd: Amoxicillin 875mg + Acid Clavulanic 125mg"
                    value={activeIngredient}
                    onChange={e => setActiveIngredient(e.target.value)}
                  />
                </div>

                <div className="field-col col-qty">
                  <label>Số lượng: <span className="req">*</span></label>
                  <div className="qty-controls">
                    <button
                      type="button"
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      required
                      value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(q => q + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="field-col col-unit">
                  <label>Đơn vị: <span className="req">*</span></label>
                  <select value={unit} onChange={e => setUnit(e.target.value)}>
                    <option value="Viên">Viên</option>
                    <option value="Gói">Gói</option>
                    <option value="Chai">Chai</option>
                    <option value="Lọ">Lọ</option>
                    <option value="Ống">Ống</option>
                    <option value="Tuýp">Tuýp</option>
                    <option value="Vỉ">Vỉ</option>
                    <option value="Liều">Liều</option>
                  </select>
                </div>

                <div className="field-col col-route">
                  <label>Đường dùng:</label>
                  <select value={route} onChange={e => setRoute(e.target.value)}>
                    <option value="Uống">Uống</option>
                    <option value="Bôi ngoài da">Bôi ngoài da</option>
                    <option value="Xịt mũi">Xịt mũi</option>
                    <option value="Nhỏ mắt">Nhỏ mắt</option>
                    <option value="Nhỏ tai">Nhỏ tai</option>
                    <option value="Ngậm dưới lưỡi">Ngậm dưới lưỡi</option>
                    <option value="Hít">Hít</option>
                    <option value="Đặt hậu môn">Đặt hậu môn</option>
                  </select>
                </div>

                <div className="field-col col-duration">
                  <label>Thời gian (Ngày):</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="vd: 5, 7, 10"
                    value={durationDays || ''}
                    onChange={e => setDurationDays(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>

                <div className="field-col col-full col-instructions">
                  <label>Liều lượng & Hướng dẫn sử dụng: <span className="req">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="vd: Uống 1 viên x 2 lần/ngày sau bữa ăn sáng và chiều (cách 12 giờ)"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                  />

                  {/* Instruction Chips Helper */}
                  <div className="instruction-chips-container">
                    <span className="tiny muted">Gợi ý cách dùng:</span>
                    {quickInstructionChips.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="chip-btn"
                        onClick={() => setInstructions(chip)}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field-col col-full col-note">
                  <label>Lưu ý riêng khi dùng thuốc (tùy chọn):</label>
                  <input
                    type="text"
                    placeholder="vd: Uống nhiều nước ấm, không dùng cùng sữa hoặc nước ép bưởi..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>

                <div className="field-col col-full submit-row">
                  <button type="submit" className="primary btn-add-drug">
                    <Plus size={16} /> Thêm thuốc này vào đơn
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section 3: Prescribed Medications List */}
          <div className="prescribed-list-card">
            <div className="list-heading">
              <h4>
                <Pill size={16} className="text-teal" /> Danh mục thuốc đã kê ({items.length} thuốc)
              </h4>
              {items.length > 0 && (
                <span className="badge-count-rx">Hợp lệ chuẩn TT 04/2022/TT-BYT</span>
              )}
            </div>

            {items.length === 0 ? (
              <div className="empty-rx-state">
                <FileText size={32} className="muted" />
                <b>Chưa có thuốc nào trong đơn</b>
                <p className="tiny muted">
                  Chọn đơn thuốc mẫu phía trên hoặc dùng thanh tìm kiếm để thêm từng loại thuốc vào đơn.
                </p>
              </div>
            ) : (
              <div className="rx-items-table-wrapper">
                <table className="rx-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>STT</th>
                      <th>Tên thuốc & Hoạt chất</th>
                      <th style={{ width: '120px' }}>Số lượng</th>
                      <th style={{ width: '100px' }}>Đường dùng</th>
                      <th>Cách dùng & Liều lượng</th>
                      <th style={{ width: '90px' }}>Thời gian</th>
                      {!isLocked && <th style={{ width: '60px' }}>Xóa</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="rx-item-row">
                        <td className="text-center font-bold">{index + 1}</td>
                        <td>
                          <div className="rx-table-drug-name">
                            <b>{item.drugName}</b>
                            {item.strength && !item.drugName.includes(item.strength) && (
                              <span className="rx-table-strength">{item.strength}</span>
                            )}
                          </div>
                          {item.activeIngredient && (
                            <small className="rx-table-active">{item.activeIngredient}</small>
                          )}
                          {item.note && (
                            <small className="rx-table-note">⚠️ {item.note}</small>
                          )}
                        </td>
                        <td>
                          <span className="rx-table-qty">
                            <b>{item.quantity}</b> {item.unit}
                          </span>
                        </td>
                        <td>
                          <span className="rx-table-route">{item.route}</span>
                        </td>
                        <td>
                          <span className="rx-table-instructions">{item.instructions}</span>
                        </td>
                        <td>
                          {item.durationDays ? `${item.durationDays} ngày` : '—'}
                        </td>
                        {!isLocked && (
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn-delete-item"
                              onClick={() => handleRemoveItem(item.id)}
                              title="Xóa thuốc này khỏi đơn"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Doctor Advice */}
          <div className="doctor-advice-card">
            <label className="field-label">
              <b>* Lời dặn của Bác sĩ điều trị & Chế độ chăm sóc:</b>
            </label>
            <textarea
              rows={3}
              placeholder="Chế độ ăn uống, sinh hoạt, theo dõi nhiệt độ, tái khám khi có dấu hiệu bất thường..."
              value={doctorAdvice}
              onChange={e => handleAdviceChange(e.target.value)}
              disabled={isLocked}
            />
            {!isLocked && (
              <div className="advice-chips-container">
                <span className="tiny muted">Gợi ý lời dặn nhanh:</span>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    handleAdviceChange(
                      doctorAdvice ? `${doctorAdvice}\n- Uống đủ 2 - 2.5 lít nước ấm mỗi ngày, nghỉ ngơi hợp lý.` : '- Uống đủ 2 - 2.5 lít nước ấm mỗi ngày, nghỉ ngơi hợp lý.'
                    )
                  }
                >
                  + Uống đủ 2L nước ấm
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    handleAdviceChange(
                      doctorAdvice ? `${doctorAdvice}\n- Kiêng đồ chua cay, dầu mỡ, bia rượu và chất kích thích.` : '- Kiêng đồ chua cay, dầu mỡ, bia rượu và chất kích thích.'
                    )
                  }
                >
                  + Kiêng đồ cay nóng/rượu bia
                </button>
                <button
                  type="button"
                  className="chip-btn"
                  onClick={() =>
                    handleAdviceChange(
                      doctorAdvice ? `${doctorAdvice}\n- Tái khám sau 5 - 7 ngày hoặc khám lại ngay nếu sốt cao liên tục không hạ, khó thở.` : '- Tái khám sau 5 - 7 ngày hoặc khám lại ngay nếu sốt cao liên tục không hạ, khó thở.'
                    )
                  }
                >
                  + Tái khám sau 5-7 ngày
                </button>
              </div>
            )}
          </div>

          {/* Section 5: Standard Prescription Preview */}
          {prescriptionText.trim() && (
            <div className="prescription-preview-paper">
              <div className="paper-header">
                <div className="hospital-seal">
                  <span>BỆNH VIỆN ĐA KHOA QUỐC TẾ TELEMEDICINE</span>
                  <small>Cổng Đơn thuốc điện tử Quốc gia - Mã CSKCB: 79001</small>
                </div>
                <div className="rx-symbol">Rx</div>
              </div>
              <h3 className="paper-title">ĐƠN THUỐC ĐIỀU TRỊ NGOẠI TRÚ</h3>
              <pre className="paper-body">{prescriptionText}</pre>
            </div>
          )}
        </div>
      ) : (
        /* Free-Text Raw Mode */
        <div className="freetext-prescription-workspace">
          <div className="field-group">
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Nội dung văn bản đơn thuốc ngoại trú:</span>
              <span className="tiny muted">Bạn có thể chỉnh sửa tự do từng dòng thuốc</span>
            </label>
            <textarea
              rows={14}
              placeholder="1. Augmentin 1000mg - SL: 14 Viên&#10;   HDSD: Uống 1 viên x 2 lần/ngày sau ăn&#10;2. Paracetamol 500mg - SL: 10 Viên..."
              value={prescriptionText}
              onChange={e => onChange(e.target.value)}
              disabled={isLocked}
              style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.6 }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
