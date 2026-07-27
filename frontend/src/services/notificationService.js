import api from './api'

const notificationService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value)
    })
    const res = await api.get(`/notifications?${query.toString()}`)
    return res.data
  },

  markRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`)
    return res.data
  },

  markAllRead: async () => {
    const res = await api.put('/notifications/read-all')
    return res.data
  },

  getUnreadCount: async () => {
    const res = await api.get('/notifications/unread-count')
    return res.data
  }
}

export default notificationService
