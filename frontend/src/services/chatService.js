import api from './api'
import { getSelectedLanguage } from '../utils/language'

const chatService = {
  sendMessage: async (message) => {
    const res = await api.post('/chat', { message, language: getSelectedLanguage() })
    return res.data
  }
}

export default chatService
