export default function PieChart({ data, title, size = 180 }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data available</div>
  }

  const total = data.reduce((sum, d) => sum + d.value, 0)
  let cumulativePercent = 0

  const slices = data.map((item, index) => {
    const percent = total > 0 ? (item.value / total) * 100 : 0
    const startPercent = cumulativePercent
    cumulativePercent += percent
    const endPercent = cumulativePercent

    const startX = Math.cos(2 * Math.PI * startPercent / 100) * (size / 2)
    const startY = Math.sin(2 * Math.PI * startPercent / 100) * (size / 2)
    const endX = Math.cos(2 * Math.PI * endPercent / 100) * (size / 2)
    const endY = Math.sin(2 * Math.PI * endPercent / 100) * (size / 2)

    const largeArc = percent > 50 ? 1 : 0

    const path = percent === 100
      ? `M 0 0 L ${size / 2} 0 A ${size / 2} ${size / 2} 0 1 1 ${-size / 2} 0 A ${size / 2} ${size / 2} 0 1 1 ${size / 2} 0 Z`
      : `M 0 0 L ${startX} ${startY} A ${size / 2} ${size / 2} 0 ${largeArc} 1 ${endX} ${endY} Z`

    return { ...item, path, percent: percent.toFixed(1), color: item.color || `hsl(${index * 45}, 70%, 50%)` }
  })

  const legends = data.map((item, index) => ({
    label: item.label,
    value: item.value,
    color: item.color || `hsl(${index * 45}, 70%, 50%)`
  }))

  return (
    <div className="chart-container">
      {title && <h4 className="chart-title">{title}</h4>}
      <div className="pie-chart-wrapper">
        <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}>
          {slices.map((slice, i) => (
            <path key={i} d={slice.path} fill={slice.color} stroke="white" strokeWidth="2" />
          ))}
          <text x="0" y="5" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#333">
            {total}
          </text>
        </svg>
        <div className="pie-legend">
          {legends.map((l, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: l.color }} />
              <span className="legend-label">{l.label}</span>
              <span className="legend-value">{l.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
