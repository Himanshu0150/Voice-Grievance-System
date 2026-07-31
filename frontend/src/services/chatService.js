import api from './api'

const chatService = {
  sendMessage: async (message) => {
    const res = await api.post('/chat', { message })
    return res.data
  }
}

export default chatService
