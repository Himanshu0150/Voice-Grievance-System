import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getInitials } from '../../utils/helpers'

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleMobile = () => setMobileOpen(prev => !prev)
  const toggleProfile = () => setProfileOpen(prev => !prev)

  return (
    <nav className="navbar" role="navigation">
      <div className="navbar-container">
        <Link to={isAdmin ? '/admin/dashboard' : '/'} className="navbar-brand">
          <div className="navbar-logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M19 9.3V4h-3v2.6L12 3 2 12h3v8h5v-6h4v6h5v-8h3l-3-2.7zm-9 .7c0-1.1.9-2 2-2s2 .9 2 2h-4z" />
            </svg>
          </div>
          <div className="navbar-title">
            <span className="brand-main">Panchayati Raj</span>
            <span className="brand-sub">Grievance System</span>
          </div>
        </Link>

        <button className="navbar-toggle" onClick={toggleMobile} aria-label="Toggle menu">
          <span className={`hamburger ${mobileOpen ? 'active' : ''}`} />
        </button>

        <div className={`navbar-menu ${mobileOpen ? 'open' : ''}`}>
          {!isAuthenticated ? (
            <div className="navbar-links">
              <Link to="/" className="nav-link" onClick={toggleMobile}>Home</Link>
              <Link to="/login" className="nav-link" onClick={toggleMobile}>Login</Link>
              <Link to="/register" className="nav-link" onClick={toggleMobile}>Register</Link>
            </div>
          ) : (
            <div className="navbar-links">
              {!isAdmin && (
                <>
                  <Link to="/dashboard" className="nav-link" onClick={toggleMobile}>Dashboard</Link>
                  <Link to="/new-complaint" className="nav-link" onClick={toggleMobile}>New Complaint</Link>
                  <Link to="/complaints" className="nav-link" onClick={toggleMobile}>My Complaints</Link>
                  <Link to="/notifications" className="nav-link" onClick={toggleMobile}>Notifications</Link>
                </>
              )}
              {isAdmin && (
                <>
                  <Link to="/admin/dashboard" className="nav-link" onClick={toggleMobile}>Dashboard</Link>
                  <Link to="/admin/complaints" className="nav-link" onClick={toggleMobile}>Complaints</Link>
                  <Link to="/admin/users" className="nav-link" onClick={toggleMobile}>Users</Link>
                  <Link to="/admin/analytics" className="nav-link" onClick={toggleMobile}>Analytics</Link>
                </>
              )}
            </div>
          )}

          {isAuthenticated && user && (
            <div className="navbar-profile">
              <button className="profile-trigger" onClick={toggleProfile}>
                <span className="profile-avatar">{getInitials(user.fullName)}</span>
                <span className="profile-name">{user.fullName}</span>
              </button>
              {profileOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{user.fullName}</p>
                    <p className="dropdown-email">{user.email}</p>
                  </div>
                  <div className="dropdown-divider" />
                  <Link to={isAdmin ? '/admin/settings' : '/profile'} className="dropdown-item" onClick={toggleProfile}>
                    Profile
                  </Link>
                  <Link to="/feedback" className="dropdown-item" onClick={toggleProfile}>
                    Feedback
                  </Link>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
