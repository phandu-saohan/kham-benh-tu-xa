import { useEffect, useState, useRef } from 'react'
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  Download,
  Eye,
  UploadCloud,
  Check,
  Sparkles,
  Maximize2
} from 'lucide-react'
import {
  type ConsultationMessage,
  getConsultationMessages,
  sendConsultationMessage,
  objectUrlForMedia,
  downloadAuthedFile,
  type User
} from './api'
import { webrtcService } from './webrtcService'

export function ConsultationChat({
  appointmentId,
  currentUser,
  onClose,
  title = 'Trao đổi & Gửi tệp bệnh án'
}: {
  appointmentId: number
  currentUser: User
  onClose?: () => void
  title?: string
}) {
  const [messages, setMessages] = useState<ConsultationMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<{ url: string; name: string } | null>(null)
  const [uploadError, setUploadError] = useState('')
  // file_url backend bây giờ cần Authorization — ánh xạ tới blob URL để <img>/<a> hiển thị
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Resolve media đã xác thực cho mọi tin nhắn có file
  useEffect(() => {
    let cancelled = false
    const withFile = messages.filter(m => m.file_url && !mediaUrls[m.file_url])
    withFile.forEach(m => {
      objectUrlForMedia(m.file_url!)
        .then(objectUrl => {
          if (!cancelled) setMediaUrls(prev => ({ ...prev, [m.file_url!]: objectUrl }))
        })
        .catch(() => {})
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  // 1. Tải danh sách tin nhắn ban đầu
  useEffect(() => {
    getConsultationMessages(appointmentId)
      .then(setMessages)
      .catch(console.warn)
  }, [appointmentId])

  // 2. Lắng nghe tin nhắn mới thời gian thực từ WebSocket
  useEffect(() => {
    const unbind = webrtcService.onChatMessage((msg: ConsultationMessage) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })
    return () => unbind()
  }, [])

  // 3. Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 4. Gửi tin nhắn văn bản
  async function handleSendText(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const trimmed = inputText.trim()
    if (!trimmed || isSending) return

    setIsSending(true)
    setUploadError('')
    try {
      const msg = await sendConsultationMessage(appointmentId, {
        content: trimmed,
        message_type: 'text'
      })
      setInputText('')
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
    } catch (err: any) {
      setUploadError(err.message || 'Không thể gửi tin nhắn')
    } finally {
      setIsSending(false)
    }
  }

  // 5. Chọn và gửi tệp hình ảnh / bệnh án (PDF, hình ảnh, tài liệu)
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Giới hạn 15MB
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Tệp quá lớn (Tối đa 15MB)')
      return
    }

    setIsSending(true)
    setUploadError('')

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string
        const isImg = file.type.startsWith('image/')
        const msg = await sendConsultationMessage(appointmentId, {
          content: isImg ? `Đã gửi hình ảnh: ${file.name}` : `Đã gửi tài liệu: ${file.name}`,
          message_type: isImg ? 'image' : 'file',
          file_name: file.name,
          file_size: file.size,
          file_data: base64Data
        })
        setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
      } catch (err: any) {
        setUploadError(err.message || 'Lỗi tải tệp lên')
      } finally {
        setIsSending(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    reader.onerror = () => {
      setUploadError('Không thể đọc tệp tin')
      setIsSending(false)
    }

    reader.readAsDataURL(file)
  }

  function formatFileSize(bytes?: number) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatTime(iso: string) {
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="consultation-chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title-info">
          <b>{title}</b>
          <span className="chat-sub">Mã hoá E2EE · Lưu trữ trực tiếp hồ sơ ca khám</span>
        </div>
        {onClose && (
          <button type="button" className="chat-close-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Quick suggestions cho bệnh nhân */}
      {currentUser.role === 'patient' && (
        <div className="chat-quick-actions">
          <button
            type="button"
            className="quick-chip"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon size={13} /> Gửi ảnh vùng bệnh
          </button>
          <button
            type="button"
            className="quick-chip"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileText size={13} /> Gửi phiếu khám cũ
          </button>
        </div>
      )}

      {/* Message List */}
      <div className="chat-messages-container">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <UploadCloud size={32} color="#0d9488" />
            <p>Chưa có tin nhắn hoặc tệp đính kèm nào.</p>
            <small>Bệnh nhân có thể gửi ảnh chụp vết thương, kết quả xét nghiệm hoặc đơn thuốc cũ để bác sĩ xem trực tiếp.</small>
          </div>
        )}

        {messages.map(msg => {
          const isMe = msg.sender_id === currentUser.id
          const isDoctor = msg.sender_role === 'doctor'

          return (
            <div
              key={msg.id}
              className={`chat-bubble-row ${isMe ? 'outgoing' : 'incoming'}`}
            >
              <div className="chat-bubble-wrapper">
                <div className="chat-sender-tag">
                  {isDoctor ? '👨‍⚕️ Bác sĩ' : '🧑‍💼 Bệnh nhân'} · {msg.sender_name}
                </div>

                {/* Nội dung dạng Text */}
                {msg.message_type === 'text' && (
                  <div className="chat-bubble text-bubble">
                    {msg.content}
                  </div>
                )}

                {/* Nội dung dạng Hình ảnh */}
                {msg.message_type === 'image' && (
                  <div className="chat-bubble image-bubble">
                    {msg.file_url && (
                      <div
                        className="chat-image-preview-wrapper"
                        onClick={() => setPreviewMedia({ url: mediaUrls[msg.file_url!] || msg.file_url!, name: msg.file_name || 'Ảnh đính kèm' })}
                        title="Bấm để xem ảnh lớn"
                      >
                        <img
                          src={mediaUrls[msg.file_url!] || msg.file_url}
                          alt={msg.file_name || 'Ảnh bệnh án'}
                          className="chat-image-preview"
                          loading="lazy"
                        />
                        <div className="image-expand-overlay">
                          <Maximize2 size={16} /> Xem ảnh lớn
                        </div>
                      </div>
                    )}
                    {msg.content && <p className="image-caption">{msg.content}</p>}
                  </div>
                )}

                {/* Nội dung dạng File Tài liệu / PDF */}
                {msg.message_type === 'file' && (
                  <div className="chat-bubble file-bubble">
                    <div className="file-item-box">
                      <FileText size={28} className="file-icon" />
                      <div className="file-info-col">
                        <span className="file-name" title={msg.file_name}>{msg.file_name}</span>
                        <span className="file-size">{formatFileSize(msg.file_size)}</span>
                      </div>
                      {msg.file_url && (
                        <button
                          type="button"
                          className="file-download-link"
                          title="Tải về tệp"
                          onClick={() => downloadAuthedFile(msg.file_url!, msg.file_name || 'download')}
                        >
                          <Download size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="chat-time-tag">
                  {formatTime(msg.created_at)}
                  {isMe && <Check size={11} className="delivered-icon" />}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {uploadError && <div className="chat-error-alert">{uploadError}</div>}

      {/* Input Bar */}
      <form className="chat-input-bar" onSubmit={handleSendText}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
        />

        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Đính kèm ảnh hoặc tệp bệnh án"
          disabled={isSending}
        >
          <Paperclip size={19} />
        </button>

        <input
          type="text"
          className="chat-text-input"
          placeholder="Nhập tin nhắn..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          disabled={isSending}
        />

        <button
          type="submit"
          className="send-btn"
          disabled={!inputText.trim() || isSending}
          title="Gửi tin nhắn"
        >
          <Send size={17} />
        </button>
      </form>

      {/* Image Lightbox Modal xem ảnh lớn */}
      {previewMedia && (
        <div className="media-lightbox-overlay" onClick={() => setPreviewMedia(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <div className="lightbox-top-bar">
              <span>{previewMedia.name}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={previewMedia.url}
                  download={previewMedia.name}
                  className="icon-button-light"
                  title="Tải ảnh về máy"
                >
                  <Download size={18} />
                </a>
                <button
                  type="button"
                  className="icon-button-light"
                  onClick={() => setPreviewMedia(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <img src={previewMedia.url} alt={previewMedia.name} className="lightbox-image" />
          </div>
        </div>
      )}
    </div>
  )
}
