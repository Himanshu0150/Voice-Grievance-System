import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants'

export default function StatusChip({ status }) {
  const color = STATUS_COLORS[status] || '#6c757d'
  const label = STATUS_LABELS[status] || status

  return (
    <span
      className="status-chip"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color
      }}
    >
      <span className="status-dot" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
