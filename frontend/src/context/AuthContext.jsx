import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import authService from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const userData = await authService.getProfile()
      setUser(userData)
    } catch {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const sendOtp = async (phone) => {
    setError(null)
    try {
      const data = await authService.sendOtp(phone)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP')
      throw err
    }
  }

  const loginAdmin = async (email, password) => {
    setError(null)
    try {
      const data = await authService.loginAdmin(email, password)
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      throw err
    }
  }

  const verifyOtp = async (phone, otp) => {
    setError(null)
    try {
      const data = await authService.verifyOtp(phone, otp)
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed')
      throw err
    }
  }

  const verifyAdminOtp = async (phone, otp) => {
    setError(null)
    try {
      const data = await authService.verifyAdminOtp(phone, otp)
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed')
      throw err
    }
  }

  const register = async (userData) => {
    setError(null)
    try {
      const data = await authService.register(userData)
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
      return data
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setError(null)
  }

  const value = {
    user,
    token,
    loading,
    error,
    sendOtp,
    loginAdmin,
    verifyOtp,
    register,
    logout,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isUser: user?.role === 'user'
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
