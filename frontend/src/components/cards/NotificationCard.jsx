import Card from '../common/Card'
import { formatDateTime } from '../../utils/helpers'

export default function NotificationCard({ notification, onMarkRead }) {
  return (
    <Card className={`notification-card ${notification.isRead ? '' : 'unread'}`}>
      <div className="notification-card-content">
        <div className="notification-card-icon">
          {notification.type === 'success' && <span className="notif-icon success">✓</span>}
          {notification.type === 'info' && <span className="notif-icon info">ℹ</span>}
          {notification.type === 'warning' && <span className="notif-icon warning">⚠</span>}
        </div>
        <div className="notification-card-text">
          <p>{notification.message}</p>
          <span className="notification-card-time">{formatDateTime(notification.createdAt)}</span>
        </div>
        {!notification.isRead && (
          <button className="notification-mark-read" onClick={() => onMarkRead?.(notification.id)}>
            Mark Read
          </button>
        )}
      </div>
    </Card>
  )
}
