import { useNavigate } from 'react-router-dom'
import Card from '../common/Card'
import StatusChip from '../common/StatusChip'
import EmotionBadge from '../common/EmotionBadge'
import { formatDate, truncateText } from '../../utils/helpers'
import { PRIORITY_COLORS } from '../../utils/constants'

export default function ComplaintCard({ complaint, isAdmin = false }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (isAdmin) {
      navigate(`/admin/complaints/${complaint.id}`)
    } else {
      navigate(`/complaints/${complaint.id}`)
    }
  }

  return (
    <Card className="complaint-card" hover onClick={handleClick}>
      <div className="complaint-card-header">
        <span className="complaint-id">{complaint.complaintId || `#${complaint.id}`}</span>
        <div className="complaint-card-chips">
          {complaint.priority && (
            <span
              className="priority-badge"
              style={{
                backgroundColor: `${PRIORITY_COLORS[complaint.priority] || '#6c757d'}1f`,
                color: PRIORITY_COLORS[complaint.priority] || '#6c757d',
                borderColor: PRIORITY_COLORS[complaint.priority] || '#6c757d'
              }}
            >
              {complaint.priority}
            </span>
          )}
          <EmotionBadge emotion={complaint.emotion} confidence={complaint.emotionConfidence} />
          <StatusChip status={complaint.status} />
        </div>
      </div>
      <h4 className="complaint-card-title">{truncateText(complaint.title, 60)}</h4>
      <p className="complaint-card-category">{complaint.category}</p>
      <p className="complaint-card-desc">{truncateText(complaint.description, 100)}</p>
      <div className="complaint-card-footer">
        <span className="complaint-card-date">{formatDate(complaint.createdAt)}</span>
        {complaint.supporterCount > 0 && (
          <span className="complaint-card-supporters" title={`${complaint.supporterCount} supporters`}>
            &#9733; {complaint.supporterCount}
          </span>
        )}
        {complaint.userName && <span className="complaint-card-user">{complaint.userName}</span>}
      </div>
    </Card>
  )
}
