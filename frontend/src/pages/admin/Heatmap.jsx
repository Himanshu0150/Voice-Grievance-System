import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/common/Card'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import Select from '../../components/common/Select'
import complaintService from '../../services/complaintService'
import { COMPLAINT_CATEGORIES, PRIORITY_COLORS } from '../../utils/constants'

const CATEGORY_COLORS = {
  'Road': '#0B5ED7',
  'Water Supply': '#0DCAF0',
  'Drainage': '#198754',
  'Street Light': '#FFC107',
  'Electricity': '#FD7E14',
  'Garbage': '#6F42C1',
  'Sanitation': '#20C997',
  'Health': '#DC3545',
  'Education': '#0D6EFD',
  'Agriculture': '#63E6BE',
  'Public Property': '#6C757D',
  'Government Office': '#495057',
  'Traffic': '#D63384',
  'Environment': '#12B886',
  'Others': '#868E96'
}

function getColor(item) {
  if (item.priority === 'Critical') return PRIORITY_COLORS['Critical']
  if (item.priority === 'High') return PRIORITY_COLORS['High']
  return CATEGORY_COLORS[item.category] || '#6C757D'
}

export default function AdminHeatmap() {
  const navigate = useNavigate()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAll, setShowAll] = useState(true)

  useEffect(() => {
    loadHeatmap()
  }, [categoryFilter])

  const loadHeatmap = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (categoryFilter) params.category = categoryFilter
      const data = await complaintService.getHeatmap(params)
      setComplaints(Array.isArray(data) ? data : data.complaints || [])
    } catch (err) {
      setError('Failed to load heatmap data')
    } finally {
      setLoading(false)
    }
  }

  const withCoords = complaints.filter(c => c.latitude && c.longitude)
  const lats = withCoords.map(c => c.latitude)
  const lngs = withCoords.map(c => c.longitude)
  const minLat = lats.length ? Math.min(...lats) : 0
  const maxLat = lats.length ? Math.max(...lats) : 0
  const minLng = lngs.length ? Math.min(...lngs) : 0
  const maxLng = lngs.length ? Math.max(...lngs) : 0
  const latSpan = Math.max(maxLat - minLat, 0.001)
  const lngSpan = Math.max(maxLng - minLng, 0.001)

  const W = 900
  const H = 500

  const toPoint = (lat, lng) => ({
    x: 40 + ((lng - minLng) / lngSpan) * (W - 80),
    y: H - 40 - ((lat - minLat) / latSpan) * (H - 80)
  })

  const groups = {}
  withCoords.forEach(c => {
    const key = `${c.latitude.toFixed(4)},${c.longitude.toFixed(4)}`
    if (!groups[key]) groups[key] = { latitude: c.latitude, longitude: c.longitude, count: 0, items: [] }
    groups[key].count += 1
    groups[key].items.push(c)
  })

  const getRadius = (count) => Math.min(32, 8 + count * 5)

  if (loading) return <Loader />
  if (error) return <ErrorState message={error} onRetry={loadHeatmap} />

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Grievance Heatmap</h2>
        <p>Geographic distribution of reported complaints</p>
      </div>

      <div className="heatmap-toolbar">
        <Select
          name="category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            ...COMPLAINT_CATEGORIES.map(c => ({ value: c, label: c }))
          ]}
        />
        <button className={`heatmap-toggle ${showAll ? 'active' : ''}`} onClick={() => setShowAll(true)}>
          All Complaints ({complaints.length})
        </button>
        <button className={`heatmap-toggle ${!showAll ? 'active' : ''}`} onClick={() => setShowAll(false)}>
          With Location ({withCoords.length})
        </button>
      </div>

      {withCoords.length === 0 ? (
        <Card>
          <div className="empty-section">
            <p>No complaints with location data available.</p>
          </div>
        </Card>
      ) : (
        <Card className="heatmap-card">
          <svg viewBox={`0 0 ${W} ${H}`} className="heatmap-svg">
            <rect x="0" y="0" width={W} height={H} rx="12" className="heatmap-bg" />
            <g className="heatmap-grid">
              {Array.from({ length: 9 }, (_, i) => (
                <line key={`v${i}`} x1={(i + 1) * (W / 10)} y1="0" x2={(i + 1) * (W / 10)} y2={H} />
              ))}
              {Array.from({ length: 5 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={(i + 1) * (H / 6)} x2={W} y2={(i + 1) * (H / 6)} />
              ))}
            </g>
            {Object.entries(groups).map(([key, group]) => {
              const p = toPoint(group.latitude, group.longitude)
              const radius = getRadius(group.count)
              return (
                <g
                  key={key}
                  className="heatmap-point"
                  onClick={() => setShowAll(false)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radius}
                    fill={getColor(group.items[0])}
                    opacity="0.35"
                  />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={Math.max(4, radius * 0.45)}
                    fill={getColor(group.items[0])}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {group.count > 1 && (
                    <text x={p.x} y={p.y + 4} textAnchor="middle" className="heatmap-count">
                      {group.count}
                    </text>
                  )}
                  <title>
                    {group.count} complaint{group.count > 1 ? 's' : ''} at {group.latitude.toFixed(4)}, {group.longitude.toFixed(4)}
                    {group.items.map(i => `\n${i.complaintId} - ${i.title} (${i.status})`).join('')}
                  </title>
                </g>
              )
            })}
          </svg>
          <div className="heatmap-legend">
            {Object.entries(CATEGORY_COLORS).slice(0, 8).map(([cat, color]) => (
              <span key={cat} className="heatmap-legend-item">
                <span className="heatmap-legend-dot" style={{ backgroundColor: color }} />
                {cat}
              </span>
            ))}
            <span className="heatmap-legend-item">
              <span className="heatmap-legend-dot" style={{ backgroundColor: PRIORITY_COLORS['Critical'] }} />
              Critical/High
            </span>
          </div>
        </Card>
      )}

      {withCoords.length > 0 && (
        <Card className="heatmap-list-card">
          <h3>Located Complaints</h3>
          <div className="heatmap-list">
            {withCoords.map(c => (
              <div key={c.id} className="heatmap-list-item" onClick={() => navigate(`/admin/complaints/${c.id}`)}>
                <span className="heatmap-list-dot" style={{ backgroundColor: getColor(c) }} />
                <div className="heatmap-list-info">
                  <strong>{c.complaintId || `#${c.id}`} - {c.title}</strong>
                  <small>
                    {c.category} &middot; {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)} &middot; {c.status}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
