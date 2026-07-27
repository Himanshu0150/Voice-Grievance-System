import Card from '../common/Card'

export default function StatisticCard({ title, value, icon, color = '#0B5ED7', subtitle }) {
  return (
    <Card className="stat-card" hover>
      <div className="stat-card-content">
        <div className="stat-card-info">
          <p className="stat-card-label">{title}</p>
          <h3 className="stat-card-value">{value}</h3>
          {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
        </div>
        <div className="stat-card-icon" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
