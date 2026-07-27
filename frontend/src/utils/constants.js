export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const COMPLAINT_CATEGORIES = [
  'Road', 'Water Supply', 'Drainage', 'Street Light', 'Electricity',
  'Garbage', 'Sanitation', 'Health', 'Education', 'Agriculture',
  'Public Property', 'Government Office', 'Traffic', 'Environment', 'Others'
]

export const CATEGORY_DEPARTMENT_MAP = {
  'Road': 1,
  'Water Supply': 1,
  'Drainage': 7,
  'Street Light': 3,
  'Electricity': 3,
  'Garbage': 7,
  'Sanitation': 7,
  'Health': 4,
  'Education': 5,
  'Agriculture': 6,
  'Public Property': 8,
  'Government Office': 8,
  'Traffic': 8,
  'Environment': 8,
  'Others': 8
}

export const SPEECH_LANGUAGES = [
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr-IN', label: 'Marathi', native: 'मराठी' },
  { code: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml-IN', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { code: 'pa-IN', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'en-IN', label: 'English', native: 'English' }
]

export const COMPLAINT_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected'
}

export const STATUS_COLORS = {
  'Pending': '#FFC107',
  'In Progress': '#0B5ED7',
  'Resolved': '#198754',
  'Rejected': '#DC3545'
}

export const STATUS_LABELS = {
  'Pending': 'Pending',
  'In Progress': 'In Progress',
  'Resolved': 'Resolved',
  'Rejected': 'Rejected'
}

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High']

export const PRIORITY_COLORS = {
  'Low': '#6B7280',
  'Medium': '#FFC107',
  'High': '#DC3545'
}
