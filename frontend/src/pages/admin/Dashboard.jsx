import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatisticCard from '../../components/cards/StatisticCard'
import ComplaintCard from '../../components/cards/ComplaintCard'
import BarChart from '../../components/charts/BarChart'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import adminService from '../../services/adminService'
import { formatDate } from '../../utils/helpers'

const quickActions = [
  { to: '/admin/complaints', label: 'All Complaints', color: '#0B5ED7', icon: 'C' },
  { to: '/admin/heatmap', label: 'Heatmap', color: '#20C997', icon: 'H' },
  { to: '/admin/users', label: 'Manage Users', color: '#198754', icon: 'U' },
  { to: '/admin/analytics', label: 'Analytics', color: '#6F42C1', icon: 'A' },
  { to: '/admin/reports', label: 'Reports', color: '#FD7E14', icon: 'R' },
  { to: '/admin/settings', label: 'Settings', color: '#DC3545', icon: 'S' }
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [escalations, setEscalations] = useState([])
  const [performance, setPerformance] = useState([])

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const [dashboardData, escalationData, performanceData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getEscalations({ limit: 5 }),
        adminService.getPerformance()
      ])
      setData(dashboardData)
      setEscalations(escalationData.escalations || escalationData.data || escalationData || [])
      setPerformance(performanceData.performance || performanceData.data || performanceData || [])
    } catch {
      setError('Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (error) return <ErrorState message={error} onRetry={loadDashboard} />

  const aiReviewCount = data?.aiPendingReview || 0
  const highPriorityCount = data?.highPriority || 0
  const avgConfidence = data?.avgConfidence ? (data.avgConfidence * 100).toFixed(0) : 'N/A'

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Admin Dashboard</h2>
        <p>AI-Powered Grievance Management System</p>
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
        <StatisticCard title="Total Complaints" value={data?.totalComplaints || 0} color="#6F42C1" icon={<span>C</span>} />
        <StatisticCard title="Pending" value={data?.pending || 0} color="#FFC107" icon={<span>P</span>} />
        <StatisticCard title="In Progress" value={data?.inProgress || 0} color="#0B5ED7" icon={<span>I</span>} />
        <StatisticCard title="Resolved" value={data?.resolved || 0} color="#198754" icon={<span>R</span>} />
        <StatisticCard title="Critical" value={data?.critical || 0} color="#DC3545" icon={<span>!</span>} />
        <StatisticCard title="High Priority" value={highPriorityCount} color="#FD7E14" icon={<span>H</span>} />
        <StatisticCard title="Open Escalations" value={data?.openEscalations || 0} color="#6F42C1" icon={<span>E</span>} />
        <StatisticCard title="Total Supporters" value={data?.totalSupporters || 0} color="#20C997" icon={<span>S</span>} />
        <StatisticCard title="AI Pending Review" value={aiReviewCount} color="#FD7E14" icon={<span>AI</span>} />
        <StatisticCard title="Avg AI Confidence" value={`${avgConfidence}%`} color="#0DCAF0" icon={<span>%</span>} />
      </div>

      {aiReviewCount > 0 && (
        <div className="alert alert-warning ai-review-alert">
          <span>{aiReviewCount} complaint(s) need manual review (AI confidence below threshold).</span>
          <button className="btn btn-sm btn-outline" onClick={() => navigate('/admin/complaints')}>Review Now</button>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-chart-card">
          <BarChart title="Department-wise Complaints" data={data?.departmentStats || []} height={250} />
        </div>
        <div className="dashboard-chart-card">
          <BarChart title="Monthly Complaints" data={data?.monthlyStats || []} height={250} />
        </div>
      </div>

      {escalations.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h3>Open Escalations</h3>
            <button className="view-all" onClick={() => navigate('/admin/complaints')}>View All</button>
          </div>
          <div className="escalation-mini-list">
            {escalations.map(e => (
              <div key={e.id} className="escalation-mini-item" onClick={() => navigate(`/admin/complaints/${e.complaintId}`)}>
                <span className="escalation-level-badge">L{e.level}</span>
                <div>
                  <strong>{e.complaintRef} - {e.complaintTitle}</strong>
                  <small>Escalated to {e.escalatedToRole} &middot; {formatDate(e.escalatedAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {performance.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h3>Officer Performance</h3>
            <button className="view-all" onClick={() => navigate('/admin/analytics')}>View All</button>
          </div>
          <div className="performance-mini-grid">
            {performance.slice(0, 5).map(o => (
              <div key={o.officerId} className="performance-mini-item">
                <strong>{o.officerName}</strong>
                <small>{o.solvedCount || 0} solved &middot; {o.avgResolutionDays ? `${o.avgResolutionDays.toFixed(1)}d avg` : '-'}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="section-card">
        <div className="section-card-header">
          <h3>Latest Complaints</h3>
        </div>
        {loading ? (
          <Loader />
        ) : (
          <div className="complaint-grid">
            {(data?.latestComplaints || []).map(c => (
              <ComplaintCard key={c.id} complaint={c} isAdmin />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
