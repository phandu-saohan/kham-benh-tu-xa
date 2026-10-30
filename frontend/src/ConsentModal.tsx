import { useState } from 'react'
import { ShieldCheck, AlertTriangle, FileText, X, CheckCircle2 } from 'lucide-react'
import { agreeConsent } from './api'

export function ConsentModal({
  appointmentId,
  onClose,
  onAgreed
}: {
  appointmentId: number
  onClose: () => void
  onAgreed: () => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState(false)

  async function handleAgree() {
    if (!checked) {
      setError('Vui lòng tích chọn xác nhận đã đọc và hiểu rõ nội dung đồng thuận')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await agreeConsent(appointmentId)
      onAgreed()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không ghi nhận được đồng thuận')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal consent-modal">
        <div className="panel-heading">
          <div className="consent-title-box">
            <ShieldCheck size={26} color="#0f766e" />
            <div>
              <h3>Văn bản Đồng thuận Khám bệnh từ xa</h3>
              <p>Tuân thủ Nghị định 13/2023/NĐ-CP & Luật Khám bệnh, chữa bệnh</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        <div className="consent-scroll-box">
          <div className="consent-badge">
            <FileText size={15} /> Phiên bản: 2026.1-ND13 (Bộ Y tế)
          </div>

          <h4>1. Mục đích & Phạm vi xử lý dữ liệu y tế cá nhân:</h4>
          <p>
            Người bệnh đồng ý cho Bệnh viện CareConnect và Bác sĩ chuyên khoa phụ trách được phép thu thập, lưu trữ và xử lý các thông tin sức khỏe (triệu chứng lâm sàng, tiền sử dị ứng, video/audio hội chẩn, hình ảnh cận lâm sàng) phục vụ duy nhất cho công tác chẩn đoán, điều trị và kê đơn thuốc từ xa.
          </p>

          <div className="warning-box">
            <AlertTriangle size={18} />
            <div>
              <b>2. Giới hạn quan trọng của Khám bệnh từ xa:</b>
              <p>
                Khám bệnh từ xa <strong>KHÔNG DÙNG CHO CÁC TRƯỜNG HỢP CẤP CỨU NGUY KỊCH</strong> (nhồi máu cơ tim, đột quỵ, khó thở cấp, đa chấn thương). Khi gặp tình huống khẩn cấp, vui lòng gọi 115 hoặc di chuyển ngay đến phòng cấp cứu gần nhất.
              </p>
            </div>
          </div>

          <h4>3. Bảo mật đường truyền & Quyền chủ thể dữ liệu:</h4>
          <p>
            Dữ liệu hội chẩn video được mã hóa đầu cuối (E2EE WebRTC). Hồ sơ bệnh án sau khi kết thúc được ký số xác thực và lưu trữ theo thời hạn quy định của Bộ Y tế.
          </p>
        </div>

        <label className="consent-checkbox-row">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => {
              setChecked(e.target.checked)
              if (e.target.checked) setError('')
            }}
          />
          <span>
            Tôi xác nhận đã đọc, hiểu rõ các quyền lợi, nghĩa vụ và tự nguyện đồng thuận tham gia buổi khám bệnh trực tuyến này.
          </span>
        </label>

        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>
            Hủy bỏ
          </button>
          <button
            className="primary"
            onClick={handleAgree}
            disabled={submitting || !checked}
          >
            <CheckCircle2 size={16} />
            {submitting ? 'Đang xác nhận...' : 'Tôi đồng ý & Vào phòng khám'}
          </button>
        </div>
      </div>
    </div>
  )
}
