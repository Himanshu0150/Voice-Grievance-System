import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import ProfileCard from '../../components/cards/ProfileCard'
import StatisticCard from '../../components/cards/StatisticCard'
import Loader from '../../components/common/Loader'
import ErrorState from '../../components/common/ErrorState'
import { useNotification } from '../../context/NotificationContext'
import userService from '../../services/userService'
import complaintService from '../../services/complaintService'

export default function Profile() {
  const { success, error: showError } = useNotification()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [profileData, statsData] = await Promise.all([
        userService.getProfile(),
        complaintService.getStats()
      ])
      setProfile(profileData)
      setStats(statsData)
      setForm({
        fullName: profileData.fullName || '',
        phone: profileData.phone || '',
        village: profileData.village || ''
      })
    } catch {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const updated = await userService.updateProfile(form)
      setProfile(updated)
      setEditing(false)
      success('Profile updated successfully')
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader />
  if (error) return <ErrorState message={error} onRetry={loadData} />
  if (!profile) return null

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>My Profile</h2>
      </div>

      <div className="profile-layout">
        <div className="profile-main">
          {editing ? (
            <Card>
              <h3>Edit Profile</h3>
              <div className="mobile-input-group" style={{ marginBottom: 16 }}>
                <label className="mobile-label">Full Name</label>
                <input type="text" className="mobile-input" value={form.fullName} onChange={(e) => setForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div className="mobile-input-group" style={{ marginBottom: 16 }}>
                <label className="mobile-label">Mobile Number</label>
                <div className="mobile-input-wrapper">
                  <span className="mobile-prefix">+91</span>
                  <input type="tel" className="mobile-input" value={form.phone} onChange={(e) => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
                </div>
              </div>
              <div className="mobile-input-group" style={{ marginBottom: 16 }}>
                <label className="mobile-label">Village</label>
                <input type="text" className="mobile-input" value={form.village} onChange={(e) => setForm(p => ({ ...p, village: e.target.value }))} />
              </div>
              <div className="form-actions">
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                <Button onClick={handleSaveProfile} loading={saving}>Save Changes</Button>
              </div>
            </Card>
          ) : (
            <ProfileCard user={profile} onEdit={() => setEditing(true)} />
          )}
        </div>

        <div className="profile-sidebar">
          <div className="stats-grid-cards">
            <StatisticCard title="Total" value={stats?.total || 0} color="#0B5ED7" icon={<span>T</span>} />
            <StatisticCard title="Resolved" value={stats?.resolved || 0} color="#198754" icon={<span>R</span>} />
            <StatisticCard title="Pending" value={stats?.pending || 0} color="#FFC107" icon={<span>P</span>} />
          </div>
        </div>
      </div>
    </div>
  )
}
