import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import StatisticCard from '../../components/cards/StatisticCard'
import ComplaintCard from '../../components/cards/ComplaintCard'
import ProfileCard from '../../components/cards/ProfileCard'
import ErrorState from '../../components/common/ErrorState'
import notificationService from '../../services/notificationService'
import complaintService from '../../services/complaintService'

const quickActions = [
  { to: '/new-complaint', label: 'New Complaint', color: '#0B5ED7', icon: '+' },
  { to: '/complaints', label: 'Complaint History', color: '#198754', icon: 'L' },
  { to: '/notifications', label: 'Notifications', color: '#FFC107', icon: 'N' },
  { to: '/feedback', label: 'Feedback', color: '#6F42C1', icon: 'F' },
  { to: '/profile', label: 'Profile', color: '#DC3545', icon: 'P' }
]

export default function UserDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentComplaints, setRecentComplaints] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, complaintsData, notifData] = await Promise.all([
        complaintService.getStats(),
        complaintService.getUserComplaints({ limit: 5 }),
        notificationService.getAll({ limit: 3 })
      ])
      setStats(statsData)
      setRecentComplaints(complaintsData.complaints || complaintsData.data || complaintsData || [])
      setNotifications(notifData.notifications || notifData.data || notifData || [])
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={loadData} />

  return (
    <div className="page-container">
      <div className="welcome-card">
        <div className="welcome-content">
          <h2>Welcome, {user?.fullName || 'User'}!</h2>
          <p>Manage your complaints and track their resolution status.</p>
        </div>
        <Link to="/new-complaint" className="welcome-action">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Complaint
        </Link>
      </div>

      <div className="quick-actions-grid">
        {quickActions.map(action => (
          <button key={action.to} className="quick-action-card" onClick={() => navigate(action.to)}>
            <div className="quick-action-icon" style={{ backgroundColor: action.color }}>{action.icon}</div>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <div className="stats-grid-cards">
        <StatisticCard title="Total" value={stats?.total || 0} color="#0B5ED7" icon={<span>T</span>} />
        <StatisticCard title="Pending" value={stats?.pending || 0} color="#FFC107" icon={<span>P</span>} />
        <StatisticCard title="In Progress" value={stats?.inProgress || 0} color="#0B5ED7" icon={<span>I</span>} />
        <StatisticCard title="Resolved" value={stats?.resolved || 0} color="#198754" icon={<span>R</span>} />
      </div>

      <div className="dashboard-grid">
        <div className="section-card">
          <div className="section-card-header">
            <h3>Recent Complaints</h3>
            <Link to="/complaints" className="view-all">View All</Link>
          </div>
          {loading ? (
            <div className="skeleton-list">
              {[1, 2, 3].map(i => <div key={i} className="skeleton-item" />)}
            </div>
          ) : recentComplaints.length === 0 ? (
            <div className="empty-section">
              <p>No complaints yet.</p>
              <Link to="/new-complaint" className="btn btn-primary">Submit Complaint</Link>
            </div>
          ) : (
            <div className="complaint-grid">
              {recentComplaints.map(c => <ComplaintCard key={c.id} complaint={c} />)}
            </div>
          )}
        </div>

        <div>
          <div className="section-card">
            <div className="section-card-header">
              <h3>Notifications</h3>
              <Link to="/notifications" className="view-all">View All</Link>
            </div>
            {notifications.length === 0 ? (
              <div className="empty-section">
                <p>No notifications yet.</p>
              </div>
            ) : (
              <div className="notification-mini-list">
                {notifications.map(n => (
                  <div key={n.id} className={`notification-mini-item ${n.isRead ? '' : 'unread'}`}>
                    <p className="notification-mini-message">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <h3>Profile Summary</h3>
              <Link to="/profile" className="view-all">Edit</Link>
            </div>
            <ProfileCard user={user} />
          </div>
        </div>
      </div>
    </div>
  )
}
