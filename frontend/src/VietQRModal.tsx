import { useEffect, useState } from 'react'
import { X, QrCode, Copy, Check, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react'
import { type Appointment, type VietQRData, getVietQR, simulatePayment } from './api'

export function VietQRModal({
  appointment,
  onClose,
  onPaymentSuccess
}: {
  appointment: Appointment
  onClose: () => void
  onPaymentSuccess: () => void
}) {
  const [data, setData] = useState<VietQRData | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')

  function loadQR() {
    setLoading(true)
    getVietQR(appointment.id)
      .then(res => {
        setData(res)
        if (res.appointment_status === 'confirmed' || res.payment_status === 'paid') {
          onPaymentSuccess()
        }
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Không tải được mã VietQR'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadQR()
    // Tự động kiểm tra trạng thái mỗi 5 giây
    const timer = setInterval(() => {
      getVietQR(appointment.id).then(res => {
        if (res.appointment_status === 'confirmed' || res.payment_status === 'paid') {
          clearInterval(timer)
          onPaymentSuccess()
        }
      }).catch(() => {})
    }, 5000)
    return () => clearInterval(timer)
  }, [appointment.id])

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSimulate() {
    setSimulating(true)
    try {
      await simulatePayment(appointment.id)
      loadQR()
      onPaymentSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giả lập lỗi')
    } finally {
      setSimulating(false)
    }
  }

  const money = (n: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="modal-backdrop">
      <div className="modal vietqr-modal">
        <div className="panel-heading">
          <div className="qr-title-box">
            <QrCode size={22} className="qr-icon" />
            <div>
              <h3>Thanh toán chuyển khoản VietQR</h3>
              <p>Chuẩn Napas247 tự động khớp giao dịch</p>
            </div>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}

        {loading && !data && (
          <div className="qr-loading">
            <RefreshCw size={28} className="spin" />
            <p>Đang tạo mã VietQR chuẩn...</p>
          </div>
        )}

        {data && (
          <div className="vietqr-body">
            {/* Ảnh mã VietQR động */}
            <div className="qr-image-wrapper">
              <img
                src={data.qr_image_url}
                alt="VietQR Chuyển khoản khám bệnh"
                className="vietqr-img"
              />
              <div className="qr-badge">
                <ShieldCheck size={14} /> Tự động duyệt sau khi chuyển
              </div>
            </div>

            {/* Chi tiết chuyển khoản */}
            <div className="qr-info-list">
              <div className="info-item">
                <span>Số tiền thanh toán:</span>
                <strong className="amount-highlight">{money(data.amount)}</strong>
              </div>

              <div className="info-item">
                <span>Ngân hàng thụ hưởng:</span>
                <b>{data.bank_name} ({data.bank_id})</b>
              </div>

              <div className="info-item">
                <span>Số tài khoản:</span>
                <div className="copy-row">
                  <code>{data.account_no}</code>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(data.account_no)}
                    title="Sao chép số tài khoản"
                  >
                    {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="info-item">
                <span>Tên chủ tài khoản:</span>
                <b>{data.account_name}</b>
              </div>

              <div className="info-item highlight-box">
                <span>Nội dung chuyển khoản (Bắt buộc):</span>
                <div className="copy-row">
                  <code className="memo-code">{data.transfer_content}</code>
                  <button
                    className="copy-btn"
                    onClick={() => handleCopy(data.transfer_content)}
                    title="Sao chép nội dung"
                  >
                    {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Hướng dẫn & Nút giả lập test */}
            <div className="qr-actions">
              <p className="tiny muted" style={{ textAlign: 'center', margin: '0' }}>
                Mở app ngân hàng bất kỳ (Vietcombank, MB, Techcombank, MoMo...) và quét mã trên.
              </p>
              <button
                type="button"
                className="secondary full"
                onClick={handleSimulate}
                disabled={simulating}
              >
                {simulating ? 'Đang kích hoạt...' : 'Giả lập thanh toán tức thì (Demo Mode)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
