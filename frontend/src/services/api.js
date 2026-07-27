import axios from 'axios'

const API_BASE_URL = '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined) {
      const payload = response.data.data !== undefined ? response.data.data : response.data
      if (response.data.pagination) {
        Object.assign(payload, response.data.pagination)
      }
      response.data = payload
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      const isAdminPath = window.location.pathname.startsWith('/admin/')
      window.location.href = isAdminPath ? '/admin/login' : '/login'
    }
    return Promise.reject(error)
  }
)

export default api
