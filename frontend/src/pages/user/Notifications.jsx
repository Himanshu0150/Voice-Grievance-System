import { useState, useEffect } from 'react'
import Button from '../../components/common/Button'
import NotificationCard from '../../components/cards/NotificationCard'
import Pagination from '../../components/common/Pagination'
import EmptyState from '../../components/common/EmptyState'
import ErrorState from '../../components/common/ErrorState'
import Loader from '../../components/common/Loader'
import { useNotification } from '../../context/NotificationContext'
import notificationService from '../../services/notificationService'

export default function Notifications() {
  const { success, error: showError } = useNotification()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadNotifications()
  }, [page])

  const loadNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await notificationService.getAll({ page, limit: 10 })
      setNotifications(data.notifications || data.data || data || [])
      setTotalPages(data.totalPages || Math.ceil((data.total || 0) / 10) || 1)
    } catch {
      setError('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {
      showError('Failed to mark notification as read')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      success('All notifications marked as read')
    } catch {
      showError('Failed to mark all as read')
    }
  }

  if (error) return <div className="page-container"><ErrorState message={error} onRetry={loadNotifications} /></div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Notifications</h2>
        <p>Stay updated on your complaint status</p>
      </div>

      {notifications.length > 0 && (
        <div className="notifications-actions">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Mark All as Read
          </Button>
        </div>
      )}

      <div className="notifications-list">
        {loading ? (
          <Loader />
        ) : notifications.length === 0 ? (
          <EmptyState title="No Notifications" message="You don't have any notifications yet." />
        ) : (
          <>
            {notifications.map(n => (
              <NotificationCard key={n.id} notification={n} onMarkRead={handleMarkRead} />
            ))}
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
