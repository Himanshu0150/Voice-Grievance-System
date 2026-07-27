export default function LineChart({ data, title, height = 200 }) {
  if (!data || data.length === 0) {
    return <div className="chart-empty">No data available</div>
  }

  const maxValue = Math.max(...data.map(d => d.value), 1)
  const minValue = 0
  const range = maxValue - minValue || 1
  const width = 100
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width
    const y = 100 - ((d.value - minValue) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="chart-container">
      {title && <h4 className="chart-title">{title}</h4>}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, overflow: 'visible' }}>
        <polyline fill="none" stroke="#0B5ED7" strokeWidth="2" points={points} />
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * 100
          const y = 100 - ((d.value - minValue) / range) * 80 - 10
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="2" fill="#0B5ED7" />
              <text x={x} y={y - 5} textAnchor="middle" fontSize="4" fill="#666">{d.value}</text>
              <text x={x} y={105} textAnchor="middle" fontSize="3.5" fill="#999">{d.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
