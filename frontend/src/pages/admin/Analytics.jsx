import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import BarChart from '../../components/charts/BarChart'
import PieChart from '../../components/charts/PieChart'
import LineChart from '../../components/charts/LineChart'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import adminService from '../../services/adminService'

const STATUS_COLORS = { Pending: '#FFC107', 'In Progress': '#0B5ED7', Resolved: '#198754', Rejected: '#DC3545' }
const PRIORITY_COLORS = { Critical: '#DC3545', High: '#FD7E14', Medium: '#FFC107', Low: '#6B7280' }

export default function AdminAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const analyticsData = await adminService.getAnalytics()
      setData(analyticsData)
    } catch {
      setError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorState message={error} onRetry={loadAnalytics} />

  const statusPieData = [
    { label: 'Pending', value: data?.pending || 0, color: STATUS_COLORS.Pending },
    { label: 'In Progress', value: data?.inProgress || data?.in_progress || 0, color: STATUS_COLORS['In Progress'] },
    { label: 'Resolved', value: data?.resolved || 0, color: STATUS_COLORS.Resolved },
    { label: 'Rejected', value: data?.rejected || 0, color: STATUS_COLORS.Rejected }
  ].filter(d => d.value > 0)

  const priorityPieData = (data?.priorityDistribution || []).map(p => ({
    label: p.label,
    value: p.value,
    color: PRIORITY_COLORS[p.label] || '#6C757D'
  })).filter(d => d.value > 0)

  const categoryData = (data?.categoryStats || []).map((c, i) => ({
    ...c,
    color: ['#0B5ED7','#198754','#FFC107','#DC3545','#6F42C1','#FD7E14','#20C997','#E83E8C','#17A2B8','#6610F2','#D63384','#FFC107'][i % 12]
  }))

  const officerPerformance = data?.officerPerformance?.officers || []
  const departmentRanking = data?.departmentRanking || []
  const aiAccuracy = data?.aiAccuracy || {}

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Analytics</h2>
        <p>Comprehensive analytics and insights</p>
      </div>

      <div className="stats-grid">
        <Card><div className="stat-card"><h3>Total</h3><p className="stat-value">{data?.total || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Pending</h3><p className="stat-value pending">{data?.pending || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>In Progress</h3><p className="stat-value in-progress">{data?.inProgress || data?.in_progress || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Resolved</h3><p className="stat-value resolved">{data?.resolved || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Rejected</h3><p className="stat-value rejected">{data?.rejected || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>AI Accuracy</h3><p className="stat-value">{aiAccuracy.accuracyRate != null ? `${aiAccuracy.accuracyRate}%` : '-'}</p></div></Card>
        <Card><div className="stat-card"><h3>Avg Resolution</h3><p className="stat-value">{data?.avgResolutionDays != null ? `${data.avgResolutionDays}d` : '-'}</p></div></Card>
        <Card><div className="stat-card"><h3>Supporters</h3><p className="stat-value">{data?.supporterStats?.total || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Distress</h3><p className="stat-value" style={{ color: '#DC3545' }}>{data?.emotionAnalytics?.distress || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Panic</h3><p className="stat-value" style={{ color: '#B91C1C' }}>{data?.emotionAnalytics?.panic || 0}</p></div></Card>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card-wide">
          <Card>
            <LineChart
              title="Monthly Trend"
              data={(data?.monthlyTrend || data?.monthlyStats || []).map(m => ({
                label: m.month || m.label,
                value: m.total != null ? m.total : m.value
              }))}
              height={250}
            />
          </Card>
        </div>

        <div className="analytics-card">
          <Card>
            <PieChart
              title="By Status"
              data={statusPieData}
              size={200}
            />
          </Card>
        </div>

        <div className="analytics-card-wide">
          <Card>
            <BarChart
              title="By Category"
              data={categoryData}
              height={300}
            />
          </Card>
        </div>

        <div className="analytics-card">
          <Card>
            <PieChart
              title="By Priority"
              data={priorityPieData}
              size={200}
            />
          </Card>
        </div>

        <div className="analytics-card-wide">
          <Card>
            <PieChart
              title="Emotion Distribution"
              data={(data?.emotionAnalytics?.distribution || []).map(e => ({
                label: e.label,
                value: e.value,
                color: EMOTION_COLORS[e.label]
              })).filter(d => d.value > 0)}
              size={200}
            />
          </Card>
        </div>

        <div className="analytics-card">
          <Card>
            <h4>Most Common Emotion</h4>
            {data?.emotionAnalytics?.mostCommon ? (
              <div className="emotion-insight-list">
                {(() => {
                  const top = data.emotionAnalytics.mostCommon
                  const meta = EMOTION_META[top.emotion] || { icon: '😐', color: '#6B7280' }
                  return (
                    <div className="emotion-insight-item">
                      <span className="emotion-insight-icon" style={{ color: meta.color }}>{meta.icon}</span>
                      <div>
                        <strong style={{ color: meta.color }}>{top.emotion}</strong>
                        <small>{top.count} complaint{top.count === 1 ? '' : 's'}</small>
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <p className="emotion-empty-hint">No emotion data yet.</p>
            )}
          </Card>
        </div>

        <div className="analytics-card-wide">
          <Card>
            <BarChart
              title="By Department"
              data={data?.departmentStats || []}
              height={300}
            />
          </Card>
        </div>

        <div className="analytics-card-wide">
          <Card>
            <BarChart
              title="Escalation Trend (6 months)"
              data={(data?.escalationTrend || []).map(e => ({ label: e.month, value: e.total }))}
              height={220}
            />
          </Card>
        </div>

        <div className="analytics-card-wide">
          <Card>
            <BarChart
              title="By Village"
              data={data?.villageStats || []}
              height={300}
            />
          </Card>
        </div>
      </div>

      {officerPerformance.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h3>Officer Performance</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Officer</th>
                  <th>Department</th>
                  <th>Assigned</th>
                  <th>Resolved</th>
                  <th>Open</th>
                  <th>Resolution Rate</th>
                  <th>Avg Days</th>
                </tr>
              </thead>
              <tbody>
                {officerPerformance.map(o => (
                  <tr key={o.userId}>
                    <td>{o.fullName}</td>
                    <td>{o.departmentName}</td>
                    <td>{o.totalAssigned}</td>
                    <td className="text-success">{o.resolved}</td>
                    <td>{o.open}</td>
                    <td>{o.resolutionRate}%</td>
                    <td>{o.avgResolutionDays > 0 ? `${o.avgResolutionDays}d` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {departmentRanking.length > 0 && (
        <div className="section-card">
          <div className="section-card-header">
            <h3>Department Ranking</h3>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Department</th>
                  <th>Complaints</th>
                  <th>Resolved</th>
                  <th>Pending</th>
                  <th>Resolution Rate</th>
                  <th>Avg Days</th>
                  <th>Supporters</th>
                </tr>
              </thead>
              <tbody>
                {departmentRanking.map((d, i) => (
                  <tr key={d.id}>
                    <td>{i + 1}</td>
                    <td><strong>{d.departmentName}</strong></td>
                    <td>{d.total}</td>
                    <td className="text-success">{d.resolved}</td>
                    <td>{d.pending}</td>
                    <td>{d.resolutionRate}%</td>
                    <td>{d.avgResolutionDays > 0 ? `${d.avgResolutionDays}d` : '-'}</td>
                    <td>{d.totalSupporters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
