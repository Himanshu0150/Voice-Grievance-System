import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import BarChart from '../../components/charts/BarChart'
import PieChart from '../../components/charts/PieChart'
import LineChart from '../../components/charts/LineChart'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import adminService from '../../services/adminService'

const STATUS_COLORS = { Pending: '#FFC107', 'In Progress': '#0B5ED7', Resolved: '#198754', Rejected: '#DC3545' }

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
    { label: 'In Progress', value: data?.in_progress || 0, color: STATUS_COLORS['In Progress'] },
    { label: 'Resolved', value: data?.resolved || 0, color: STATUS_COLORS.Resolved },
    { label: 'Rejected', value: data?.rejected || 0, color: STATUS_COLORS.Rejected }
  ].filter(d => d.value > 0)

  const categoryData = (data?.categoryStats || []).map((c, i) => ({
    ...c,
    color: ['#0B5ED7','#198754','#FFC107','#DC3545','#6F42C1','#FD7E14','#20C997','#E83E8C','#17A2B8','#6610F2','#D63384','#FFC107'][i % 12]
  }))

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Analytics</h2>
        <p>Comprehensive analytics and insights</p>
      </div>

      <div className="stats-grid">
        <Card><div className="stat-card"><h3>Total</h3><p className="stat-value">{data?.total || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Pending</h3><p className="stat-value pending">{data?.pending || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>In Progress</h3><p className="stat-value in-progress">{data?.in_progress || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Resolved</h3><p className="stat-value resolved">{data?.resolved || 0}</p></div></Card>
        <Card><div className="stat-card"><h3>Rejected</h3><p className="stat-value rejected">{data?.rejected || 0}</p></div></Card>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card-wide">
          <Card>
            <LineChart
              title="Monthly Trend"
              data={data?.monthlyStats || []}
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
              title="By Village"
              data={data?.villageStats || []}
              height={300}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}
