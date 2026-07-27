import Card from '../common/Card'
import { getInitials, formatDate } from '../../utils/helpers'

export default function ProfileCard({ user, onEdit }) {
  return (
    <Card className="profile-card">
      <div className="profile-card-content">
        <div className="profile-avatar-large">
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.fullName} />
          ) : (
            getInitials(user?.fullName)
          )}
        </div>
        <div className="profile-card-info">
          <h3>{user?.fullName}</h3>
          <p className="profile-detail"><strong>Phone:</strong> {user?.phone}</p>
          <p className="profile-detail"><strong>Village:</strong> {user?.village}</p>
          {user?.email && <p className="profile-detail"><strong>Email:</strong> {user?.email}</p>}
          {user?.taluka && <p className="profile-detail"><strong>Taluka:</strong> {user?.taluka}</p>}
          {user?.district && <p className="profile-detail"><strong>District:</strong> {user?.district}</p>}
          {user?.state && <p className="profile-detail"><strong>State:</strong> {user?.state}</p>}
          {user?.pincode && <p className="profile-detail"><strong>Pincode:</strong> {user?.pincode}</p>}
          <p className="profile-detail"><strong>Role:</strong> {user?.role === 'admin' ? 'Administrator' : 'Citizen'}</p>
          {user?.createdAt && <p className="profile-detail"><strong>Member since:</strong> {formatDate(user.createdAt)}</p>}
        </div>
      </div>
      {onEdit && (
        <button className="profile-edit-btn" onClick={onEdit}>Edit Profile</button>
      )}
    </Card>
  )
}
