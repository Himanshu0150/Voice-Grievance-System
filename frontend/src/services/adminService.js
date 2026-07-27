import api from './api'

const adminService = {
  getDashboardStats: async () => {
    const res = await api.get('/admin/dashboard')
    return res.data
  },

  getAllUsers: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value)
    })
    const res = await api.get(`/admin/users?${query.toString()}`)
    return res.data
  },

  getUserById: async (id) => {
    const res = await api.get(`/admin/users/${id}`)
    return res.data
  },

  toggleUserStatus: async (id) => {
    const res = await api.put(`/admin/users/${id}/toggle-status`)
    return res.data
  },

  deleteUser: async (id) => {
    const res = await api.delete(`/admin/users/${id}`)
    return res.data
  },

  getComplaints: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value)
    })
    const res = await api.get(`/admin/complaints?${query.toString()}`)
    return res.data
  },

  getComplaintById: async (id) => {
    const res = await api.get(`/admin/complaints/${id}`)
    return res.data
  },

  updateComplaintStatus: async (id, data) => {
    const res = await api.put(`/admin/complaints/${id}/status`, data)
    return res.data
  },

  resolveComplaint: async (id, formData) => {
    const res = await api.put(`/admin/complaints/${id}/resolve`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return res.data
  },

  getAnalytics: async () => {
    const res = await api.get('/admin/analytics')
    return res.data
  },

  getReports: async (params = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, value)
    })
    const res = await api.get(`/admin/reports?${query.toString()}`)
    return res.data
  },

  getSettings: async () => {
    const res = await api.get('/admin/settings')
    return res.data
  },

  updateSettings: async (data) => {
    const res = await api.put('/admin/settings', data)
    return res.data
  },

  updateAiPrediction: async (id, data) => {
    const res = await api.put(`/admin/complaints/${id}/ai-prediction`, data)
    return res.data
  },

  getDepartments: async () => {
    const res = await api.get('/admin/departments')
    return res.data
  },

  createDepartment: async (data) => {
    const res = await api.post('/admin/departments', data)
    return res.data
  },

  updateDepartment: async (id, data) => {
    const res = await api.put(`/admin/departments/${id}`, data)
    return res.data
  },

  deleteDepartment: async (id) => {
    const res = await api.delete(`/admin/departments/${id}`)
    return res.data
  }
}

export default adminService
