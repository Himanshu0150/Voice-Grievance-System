import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

export default function Login() {
  const { user, sendOtp, verifyOtp, isAuthenticated, loading: authLoading, error: authError } = useAuth()
  const navigate = useNavigate()
  const otpRefs = useRef([])

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, authLoading, navigate])

  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(prev => prev - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [resendTimer])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '')
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number')
      return
    }
    setLoading(true)
    setError('')
    setDevOtp('')
    try {
      const res = await sendOtp(digits)
      const payload = res.data || res
      setMaskedPhone(payload.maskedPhone || digits.slice(0, 2) + '****' + digits.slice(-2))
      if (payload.otp) setDevOtp(payload.otp)
      setStep('otp')
      setResendTimer(30)
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP'
      if (msg.toLowerCase().includes('admin')) {
        setError('Administrator account detected.')
        navigate('/admin/login', { replace: true })
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError('')
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (paste.length === 6) {
      setOtp(paste.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otpStr = otp.join('')
    if (otpStr.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }
    setLoading(true)
    setError('')
    try {
      const digits = phone.replace(/\D/g, '')
      const data = await verifyOtp(digits, otpStr)
      if (data.user?.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP'
      setError(msg)
      if (!msg.toLowerCase().includes('remaining')) {
        setOtp(['', '', '', '', '', ''])
        otpRefs.current[0]?.focus()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return
    setLoading(true)
    setError('')
    setOtp(['', '', '', '', '', ''])
    setDevOtp('')
    try {
      const digits = phone.replace(/\D/g, '')
      const res = await sendOtp(digits)
      const payload = res.data || res
      if (payload.otp) setDevOtp(payload.otp)
      setResendTimer(30)
      otpRefs.current[0]?.focus()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToPhone = () => {
    setStep('phone')
    setError('')
    setOtp(['', '', '', '', '', ''])
  }

  if (step === 'otp') {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <Card className="auth-card">
            <div className="auth-header">
              <div className="auth-logo">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#1565C0">
                  <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                </svg>
              </div>
              <h2 className="auth-title">Verify OTP</h2>
              <p className="auth-subtitle">Enter the 6-digit code sent to <strong>+91 {maskedPhone}</strong></p>
              {devOtp && (
                <div className="dev-otp-box">
                  <span className="dev-otp-label">Development OTP</span>
                  <span className="dev-otp-value">{devOtp}</span>
                </div>
              )}
            </div>
            <form onSubmit={handleVerifyOtp} className="auth-form-mobile">
              {error && (
                <div className="alert alert-error" role="alert">{error}</div>
              )}
              <div className="otp-input-group">
                <label className="mobile-label">One-Time Password</label>
                <div className="otp-input-row">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => otpRefs.current[i] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="otp-input-box"
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>
              <Button type="submit" fullWidth loading={loading} className="mobile-btn">
                Verify & Login
              </Button>
              <div className="otp-resend-row">
                <button type="button" className="otp-back-btn" onClick={handleBackToPhone}>
                  Change Number
                </button>
                {resendTimer > 0 ? (
                  <span className="otp-timer">Resend in {resendTimer}s</span>
                ) : (
                  <button type="button" className="otp-resend-btn" onClick={handleResend} disabled={loading}>
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
            <div className="auth-footer">
              <p>New user? <Link to="/register" className="auth-link">Create Account</Link></p>
              <p className="admin-link"><Link to="/admin/login" className="auth-link">Admin Login</Link></p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <Card className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="#1565C0">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
              </svg>
            </div>
            <h2 className="auth-title">Welcome</h2>
            <p className="auth-subtitle">Enter your mobile number to receive an OTP</p>
          </div>
          <form onSubmit={handleSendOtp} className="auth-form-mobile">
            {(error || authError) && (
              <div className="alert alert-error" role="alert">{error || authError}</div>
            )}
            <div className="mobile-input-group">
              <label className="mobile-label" htmlFor="phone">Mobile Number</label>
              <div className="mobile-input-wrapper">
                <span className="mobile-prefix">+91</span>
                <input
                  id="phone"
                  type="tel"
                  className="mobile-input"
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setPhone(val)
                    setError('')
                  }}
                  placeholder="9876543210"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength="14"
                />
              </div>
            </div>
            <Button type="submit" fullWidth loading={loading} className="mobile-btn">
              Send OTP
            </Button>
          </form>
          <div className="auth-footer">
            <p>New user? <Link to="/register" className="auth-link">Create Account</Link></p>
            <p className="admin-link"><Link to="/admin/login" className="auth-link">Admin Login</Link></p>
          </div>
        </Card>
      </div>
    </div>
  )
}
