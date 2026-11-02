import React, { useEffect, useState, useRef } from 'react'
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationItem
} from './api'
import { Pagination } from './Pagination'

interface NotificationCenterProps {
  onNavigate?: (actionUrl: string) => void
  userRole?: string
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onNavigate, userRole }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)
  const [notifPage, setNotifPage] = useState(1)
  const [notifPageSize, setNotifPageSize] = useState(5)
  const [toastNotification, setToastNotification] = useState<NotificationItem | null>(null)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  // Polling unread count
  const checkUnread = async () => {
    try {
      const res = await fetchUnreadNotificationCount()
      const newCount = res.unread_count || 0
      
      // If count increased and not first load, show toast for the newest notification
      if (newCount > prevCountRef.current && prevCountRef.current !== 0) {
        const notifs = await fetchNotifications(undefined, true)
        if (notifs && notifs.length > 0) {
          setToastNotification(notifs[0])
          setTimeout(() => setToastNotification(null), 6000)
        }
      }
      prevCountRef.current = newCount
      setUnreadCount(newCount)
    } catch {
      // ignore network errors during background poll
    }
  }

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications(
        filterCategory === 'all' ? undefined : filterCategory,
        filterUnreadOnly
      )
      setNotifications(data || [])
    } catch (err) {
      console.error('Failed to load notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkUnread()
    const interval = setInterval(checkUnread, 20000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, filterCategory, filterUnreadOnly])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkAsRead = async (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.is_read) return
    try {
      await markNotificationRead(item.id)
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error(err)
    }
  }

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await handleMarkAsRead(item, { stopPropagation: () => {} } as any)
    }
    if (item.action_url && onNavigate) {
      onNavigate(item.action_url)
      setIsOpen(false)
    }
  }

  const formatRelativeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Vừa xong'
    try {
      const now = new Date()
      const d = new Date(dateStr)
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000)
      if (diffSec < 60) return 'Vừa xong'
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} ngày trước`
      return d.toLocaleDateString('vi-VN')
    } catch {
      return 'Gần đây'
    }
  }

  const getCategoryMeta = (category: string) => {
    switch (category) {
      case 'appointment':
        return { icon: '🩺', label: 'Khám bệnh', color: '#0f766e', bg: '#ccfbf1' }
      case 'prescription':
        return { icon: '💊', label: 'Toa thuốc', color: '#2563eb', bg: '#dbeafe' }
      case 'paraclinical':
        return { icon: '🔬', label: 'Cận lâm sàng', color: '#7c3aed', bg: '#ede9fe' }
      case 'ai_alert':
        return { icon: '🛡️', label: 'AI Cảnh báo', color: '#b45309', bg: '#fef3c7' }
      case 'payment':
        return { icon: '💳', label: 'Thanh toán', color: '#059669', bg: '#d1fae5' }
      case 'system':
      default:
        return { icon: '⚡', label: 'Hệ thống', color: '#475569', bg: '#f1f5f9' }
    }
  }

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgent') {
      return <span className="notif-priority-badge urgent">Khẩn cấp</span>
    }
    if (priority === 'high') {
      return <span className="notif-priority-badge high">Ưu tiên</span>
    }
    return null
  }

  return (
    <div className="notif-center-wrapper" ref={dropdownRef}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        className={`notif-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Trung tâm Thông báo"
        aria-label="Thông báo"
      >
        <span className="notif-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notif-counter-badge animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* FLOATING TOAST NOTIFICATION */}
      {toastNotification && (
        <div className="notif-floating-toast shadow-2xl" onClick={() => handleItemClick(toastNotification)}>
          <div className="toast-left-icon">{getCategoryMeta(toastNotification.category).icon}</div>
          <div className="toast-content">
            <div className="toast-title">
              <strong>{toastNotification.title}</strong>
              {getPriorityBadge(toastNotification.priority)}
            </div>
            <div className="toast-message">{toastNotification.message}</div>
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={(e) => { e.stopPropagation(); setToastNotification(null) }}
          >
            ✕
          </button>
        </div>
      )}

      {/* DROPDOWN / POPOVER PANEL */}
      {isOpen && (
        <div className="notif-panel-popover shadow-2xl">
          {/* HEADER */}
          <div className="notif-panel-header">
            <div className="notif-title-area">
              <span className="notif-header-icon">🔔</span>
              <h3>Trung tâm Thông báo</h3>
              {unreadCount > 0 && (
                <span className="notif-unread-pill">{unreadCount} mới</span>
              )}
            </div>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-mark-all-btn"
                  onClick={handleMarkAllRead}
                  title="Đánh dấu tất cả là đã đọc"
                >
                  ✓ Đã đọc tất cả
                </button>
              )}
              <button
                type="button"
                className="notif-close-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Đóng"
              >
                ✕
              </button>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="notif-filter-tabs">
            <button
              type="button"
              className={`filter-tab ${filterCategory === 'all' && !filterUnreadOnly ? 'active' : ''}`}
              onClick={() => { setFilterCategory('all'); setFilterUnreadOnly(false); }}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={`filter-tab ${filterUnreadOnly ? 'active' : ''}`}
              onClick={() => { setFilterUnreadOnly(true); }}
            >
              Chưa đọc {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              type="button"
              className={`filter-tab ${filterCategory === 'appointment' && !filterUnreadOnly ? 'active' : ''}`}
              onClick={() => { setFilterCategory('appointment'); setFilterUnreadOnly(false); }}
            >
              🩺 Khám
            </button>
            <button
              type="button"
              className={`filter-tab ${filterCategory === 'ai_alert' && !filterUnreadOnly ? 'active' : ''}`}
              onClick={() => { setFilterCategory('ai_alert'); setFilterUnreadOnly(false); }}
            >
              🛡️ AI
            </button>
            <button
              type="button"
              className={`filter-tab ${filterCategory === 'prescription' && !filterUnreadOnly ? 'active' : ''}`}
              onClick={() => { setFilterCategory('prescription'); setFilterUnreadOnly(false); }}
            >
              💊 Thuốc
            </button>
          </div>

          {/* NOTIFICATION ITEMS LIST */}
          <div className="notif-items-list">
            {loading ? (
              <div className="notif-loading-state">
                <div className="notif-spinner"></div>
                <span>Đang tải thông báo...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty-state">
                <span className="notif-empty-icon">🎉</span>
                <strong>Bạn đã đọc hết mọi thông báo!</strong>
                <p>Không có thông báo mới nào cần xử lý vào lúc này.</p>
              </div>
            ) : (
              notifications.slice((notifPage - 1) * notifPageSize, notifPage * notifPageSize).map((item) => {
                const meta = getCategoryMeta(item.category)
                return (
                  <div
                    key={item.id}
                    className={`notif-card-item ${!item.is_read ? 'unread' : 'read'} ${item.priority === 'urgent' ? 'border-urgent' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div
                      className="notif-badge-icon"
                      style={{ backgroundColor: meta.bg, color: meta.color }}
                    >
                      {meta.icon}
                    </div>
                    <div className="notif-details">
                      <div className="notif-row-top">
                        <span className="notif-category-name" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {getPriorityBadge(item.priority)}
                        <span className="notif-time">{formatRelativeTime(item.created_at)}</span>
                      </div>
                      <h4 className="notif-item-title">{item.title}</h4>
                      <p className="notif-item-message">{item.message}</p>
                      
                      <div className="notif-footer-row">
                        {item.action_url && (
                          <span className="notif-action-chip">
                            Xem ngay →
                          </span>
                        )}
                        {!item.is_read && (
                          <button
                            type="button"
                            className="notif-mark-single-read"
                            onClick={(e) => handleMarkAsRead(item, e)}
                            title="Đánh dấu đã đọc"
                          >
                            ✓ Đã đọc
                          </button>
                        )}
                      </div>
                    </div>
                    {!item.is_read && <span className="notif-unread-dot" />}
                  </div>
                )
              })
            )}
          </div>

          {notifications.length > notifPageSize && (
            <div style={{ padding: '0 12px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <Pagination
                currentPage={notifPage}
                totalItems={notifications.length}
                pageSize={notifPageSize}
                onPageChange={setNotifPage}
                onPageSizeChange={setNotifPageSize}
                pageSizeOptions={[5, 10]}
              />
            </div>
          )}

          {/* FOOTER */}
          <div className="notif-panel-footer">
            <span className="notif-security-badge">
              🔒 Thông báo y tế bảo mật chuẩn HIPAA & Nghị định 13
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
export default NotificationCenter
