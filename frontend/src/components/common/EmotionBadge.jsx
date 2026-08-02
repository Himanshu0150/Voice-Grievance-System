import { EMOTION_META } from '../../utils/constants'

export default function EmotionBadge({ emotion, confidence }) {
  if (!emotion) return null
  const meta = EMOTION_META[emotion] || { icon: '😐', color: '#6B7280', label: emotion }
  const conf = confidence != null ? Math.round(confidence * 100) : null

  return (
    <span
      className="emotion-badge"
      style={{
        backgroundColor: `${meta.color}1f`,
        color: meta.color,
        borderColor: meta.color
      }}
      title={conf != null ? `${meta.label} (${conf}% confidence)` : meta.label}
    >
      <span className="emotion-icon">{meta.icon}</span>
      {meta.label}
      {conf != null && <span className="emotion-confidence">{conf}%</span>}
    </span>
  )
}
