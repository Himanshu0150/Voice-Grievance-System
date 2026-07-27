import { useNavigate } from 'react-router-dom'
import Card from '../common/Card'
import StatusChip from '../common/StatusChip'
import { formatDate, truncateText } from '../../utils/helpers'

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
        <span className="complaint-id">#{complaint.id}</span>
        <StatusChip status={complaint.status} />
      </div>
      <h4 className="complaint-card-title">{truncateText(complaint.title, 60)}</h4>
      <p className="complaint-card-category">{complaint.category}</p>
      <p className="complaint-card-desc">{truncateText(complaint.description, 100)}</p>
      <div className="complaint-card-footer">
        <span className="complaint-card-date">{formatDate(complaint.createdAt)}</span>
        {complaint.userName && <span className="complaint-card-user">{complaint.userName}</span>}
      </div>
    </Card>
  )
}
