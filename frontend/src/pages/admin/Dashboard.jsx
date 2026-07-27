import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatisticCard from '../../components/cards/StatisticCard'
import ComplaintCard from '../../components/cards/ComplaintCard'
import BarChart from '../../components/charts/BarChart'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import adminService from '../../services/adminService'

const quickActions = [
  { to: '/admin/complaints', label: 'All Complaints', color: '#0B5ED7', icon: 'C' },
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

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const dashboardData = await adminService.getDashboardStats()
      setData(dashboardData)
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
        <StatisticCard title="High Priority" value={highPriorityCount} color="#DC3545" icon={<span>!</span>} />
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
