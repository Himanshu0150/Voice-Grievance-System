import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

export default function AdminLogin() {
  const { user, loginAdmin, isAuthenticated, loading: authLoading, error: authError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, authLoading, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('Please enter email and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      await loginAdmin(email.trim(), password)
      navigate('/admin/dashboard')
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Card className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#1565C0">
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="auth-title">Admin Portal</h2>
            <p className="auth-subtitle">Panchayati Raj Administration</p>
          </div>
          <form onSubmit={handleLogin} className="auth-form-mobile">
            {(error || authError) && (
              <div className="alert alert-error" role="alert">{error || authError}</div>
            )}
            <div className="mobile-input-group">
              <label className="mobile-label" htmlFor="admin-email">Email</label>
              <input
                id="admin-email"
                type="email"
                className="mobile-input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                placeholder="admin@panchayat.gov.in"
                autoComplete="email"
              />
            </div>
            <div className="mobile-input-group">
              <label className="mobile-label" htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                className="mobile-input"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" fullWidth loading={loading} className="mobile-btn">
              Login
            </Button>
          </form>
          <div className="auth-footer">
            <Link to="/login" className="auth-link">User Login</Link>
            <span className="sep"> | </span>
            <Link to="/" className="auth-link">Home</Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
