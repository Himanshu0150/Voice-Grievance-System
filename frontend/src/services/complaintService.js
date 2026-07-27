import api from './api'

const complaintService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value)
    })
    const res = await api.get(`/complaints?${query.toString()}`)
    return res.data
  },

  getById: async (id) => {
    const res = await api.get(`/complaints/${id}`)
    return res.data
  },

  create: async (formData) => {
    const res = await api.post('/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  createVoice: async (formData) => {
    const res = await api.post('/complaints/voice', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    })
    return res.data
  },

  updateStatus: async (id, data) => {
    const res = await api.put(`/complaints/${id}/status`, data)
    return res.data
  },

  addRemark: async (id, data) => {
    const res = await api.post(`/complaints/${id}/remarks`, data)
    return res.data
  },

  getStats: async () => {
    const res = await api.get('/complaints/stats')
    return res.data
  },

  getUserComplaints: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value)
    })
    const res = await api.get(`/complaints?${query.toString()}`)
    return res.data
  }
}

export default complaintService
