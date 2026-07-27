import { useNotification } from '../../context/NotificationContext'

const icons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
}

export default function NotificationToast() {
  const { notifications, removeNotification } = useNotification()

  if (notifications.length === 0) return null

  return (
    <div className="toast-container" aria-live="polite" role="status">
      {notifications.map(n => (
        <div key={n.id} className={`toast toast-${n.type}`} role="alert">
          <div className="toast-content">
            <span className="toast-icon" aria-hidden="true">
              {icons[n.type] || 'ℹ'}
            </span>
            <p>{n.message}</p>
          </div>
          <button
            className="toast-dismiss"
            onClick={() => removeNotification(n.id)}
            aria-label="Dismiss notification"
            type="button"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
