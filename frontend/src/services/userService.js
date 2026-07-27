import api from './api'

const userService = {
  getProfile: async () => {
    const res = await api.get('/users/profile')
    return res.data
  },

  updateProfile: async (data) => {
    const res = await api.put('/users/profile', data)
    return res.data
  },

  getFeedback: async () => {
    const res = await api.get('/users/feedback')
    return res.data
  },

  submitFeedback: async (data) => {
    const res = await api.post('/users/feedback', data)
    return res.data
  }
}

export default userService
