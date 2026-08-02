import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

const VILLAGE_MAP = {
  'Mumbai': { taluka: 'Mumbai City', district: 'Mumbai City', state: 'Maharashtra', pincode: '400001' },
  'Pune': { taluka: 'Haveli', district: 'Pune', state: 'Maharashtra', pincode: '411001' },
  'Nagpur': { taluka: 'Nagpur', district: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
  'Nashik': { taluka: 'Nashik', district: 'Nashik', state: 'Maharashtra', pincode: '422001' },
  'Aurangabad': { taluka: 'Aurangabad', district: 'Aurangabad', state: 'Maharashtra', pincode: '431001' },
  'Solapur': { taluka: 'Solapur North', district: 'Solapur', state: 'Maharashtra', pincode: '413001' },
  'Kolhapur': { taluka: 'Karvir', district: 'Kolhapur', state: 'Maharashtra', pincode: '416001' },
  'Ahmednagar': { taluka: 'Nagar', district: 'Ahmednagar', state: 'Maharashtra', pincode: '414001' },
  'Thane': { taluka: 'Thane', district: 'Thane', state: 'Maharashtra', pincode: '400601' },
  'Satara': { taluka: 'Satara', district: 'Satara', state: 'Maharashtra', pincode: '415001' },
  'Ratnagiri': { taluka: 'Ratnagiri', district: 'Ratnagiri', state: 'Maharashtra', pincode: '415612' },
  'Sangli': { taluka: 'Miraj', district: 'Sangli', state: 'Maharashtra', pincode: '416416' },
  'Amravati': { taluka: 'Amravati', district: 'Amravati', state: 'Maharashtra', pincode: '444601' },
  'Nanded': { taluka: 'Nanded', district: 'Nanded', state: 'Maharashtra', pincode: '431601' },
  'Jalgaon': { taluka: 'Jalgaon', district: 'Jalgaon', state: 'Maharashtra', pincode: '425001' },
  'Akola': { taluka: 'Akola', district: 'Akola', state: 'Maharashtra', pincode: '444001' },
  'Latur': { taluka: 'Latur', district: 'Latur', state: 'Maharashtra', pincode: '413512' },
  'Dhule': { taluka: 'Dhule', district: 'Dhule', state: 'Maharashtra', pincode: '424001' },
  'Chandrapur': { taluka: 'Chandrapur', district: 'Chandrapur', state: 'Maharashtra', pincode: '442401' },
  'Parbhani': { taluka: 'Parbhani', district: 'Parbhani', state: 'Maharashtra', pincode: '431401' }
}

export default function Register() {
  const { user, register, isAuthenticated, loading: authLoading, error: authError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, authLoading, navigate])
  const [form, setForm] = useState({ fullName: '', phone: '', village: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [geoStatus, setGeoStatus] = useState('')
  const geoAttempted = useRef(false)

  useEffect(() => {
    if (geoAttempted.current) return
    geoAttempted.current = true
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGeoStatus('Detecting your location...')
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data = await res.json()
          const addr = data.address || {}
          let village = addr.village || addr.town || addr.city || addr.municipality || ''
          if (village) {
            setForm(p => ({ ...p, village }))
          }
        } catch {
          // Geolocation lookup failed silently
        }
        setGeoStatus('')
      },
      () => { setGeoStatus('') },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'phone') {
      const digits = value.replace(/\D/g, '').slice(0, 10)
      setForm(prev => ({ ...prev, phone: digits }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.fullName.trim()) errs.fullName = 'Name is required'
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) errs.phone = 'Enter a valid 10-digit mobile number'
    if (!form.village.trim()) errs.village = 'Village is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setLoading(true)
    try {
      const location = VILLAGE_MAP[form.village.trim()] || {}
      const { taluka, district, state, pincode } = location
      const data = await register({
        fullName: form.fullName.trim(),
        phone: form.phone,
        village: form.village.trim(),
        taluka: taluka || '',
        district: district || '',
        state: state || '',
        pincode: pincode || ''
      })
      navigate(data.user?.role === 'admin' ? '/admin/dashboard' : '/dashboard')
    } catch (err) {
      setErrors({ form: err.response?.data?.message || 'Registration failed' })
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
                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Register in under 30 seconds</p>
          </div>
          <form onSubmit={handleSubmit} className="auth-form-mobile">
            {errors.form && <div className="alert alert-error" role="alert">{errors.form}</div>}
            {(authError) && <div className="alert alert-error" role="alert">{authError}</div>}

            <div className="mobile-input-group">
              <label className="mobile-label" htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="mobile-input"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                autoComplete="name"
              />
              {errors.fullName && <span className="mobile-error">{errors.fullName}</span>}
            </div>

            <div className="mobile-input-group">
              <label className="mobile-label" htmlFor="phone">Mobile Number</label>
              <div className="mobile-input-wrapper">
                <span className="mobile-prefix">+91</span>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="mobile-input"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </div>
              {errors.phone && <span className="mobile-error">{errors.phone}</span>}
            </div>

            <div className="mobile-input-group">
              <label className="mobile-label" htmlFor="village">Village / Town</label>
              <input
                id="village"
                name="village"
                type="text"
                className="mobile-input"
                value={form.village}
                onChange={handleChange}
                placeholder="Your village or town name"
                autoComplete="address-level2"
              />
              {errors.village && <span className="mobile-error">{errors.village}</span>}
              {geoStatus && <span className="mobile-hint">{geoStatus}</span>}
            </div>

            <Button type="submit" fullWidth loading={loading} className="mobile-btn">
              Register
            </Button>
          </form>
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="auth-link">Login</Link></p>
          </div>
        </Card>
      </div>
    </div>
  )
}
