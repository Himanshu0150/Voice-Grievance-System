import api from './api'

const authService = {
  sendOtp: async (phone) => {
    const res = await api.post('/auth/send-otp', { phone })
    return res.data
  },

  verifyOtp: async (phone, otp) => {
    const res = await api.post('/auth/verify-otp', { phone, otp })
    return res.data
  },

  loginAdmin: async (email, password) => {
    const res = await api.post('/auth/admin/login', { email, password })
    return res.data
  },

  register: async (userData) => {
    const res = await api.post('/auth/register', userData)
    return res.data
  },

  getProfile: async () => {
    const res = await api.get('/auth/me')
    return res.data
  }
}

export default authService
