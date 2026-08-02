import { SPEECH_LANGUAGES } from './constants'

const STORAGE_KEY = 'selectedLanguage'
const RECENT_KEY = 'recentLanguages'

export function getBrowserLanguageCode() {
  try {
    const browserLang = navigator.language || 'en-IN'
    const match = SPEECH_LANGUAGES.find(l => browserLang.toLowerCase().startsWith(l.code))
    return match ? match.code : 'en'
  } catch {
    return 'en'
  }
}

export function getSelectedLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && SPEECH_LANGUAGES.some(l => l.code === stored)) return stored
  } catch {
    // ignore storage errors
  }
  return getBrowserLanguageCode()
}

export function saveSelectedLanguage(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    // ignore storage errors
  }
  saveRecentLanguage(code)
}

export function getRecentLanguages() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    const list = raw ? JSON.parse(raw) : []
    return list.filter(code => SPEECH_LANGUAGES.some(l => l.code === code)).slice(0, 5)
  } catch {
    return []
  }
}

function saveRecentLanguage(code) {
  try {
    const list = getRecentLanguages().filter(c => c !== code)
    list.unshift(code)
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)))
  } catch {
    // ignore storage errors
  }
}

export function getLanguageObject(code) {
  return SPEECH_LANGUAGES.find(l => l.code === code) || SPEECH_LANGUAGES[0]
}
