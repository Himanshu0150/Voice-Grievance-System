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
  { code: 'en', label: 'English', native: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', speech: 'hi-IN' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', speech: 'mr-IN' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', speech: 'gu-IN' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', speech: 'pa-IN' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', speech: 'bn-IN' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', speech: 'ta-IN' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', speech: 'te-IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', speech: 'kn-IN' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം', speech: 'ml-IN' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ', speech: 'or-IN' },
  { code: 'as', label: 'Assamese', native: 'অসমীয়া', speech: 'as-IN' },
  { code: 'ur', label: 'Urdu', native: 'اردو', speech: 'ur-IN' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृतम्', speech: 'sa-IN' },
  { code: 'kok', label: 'Konkani', native: 'कोंकणी', speech: 'kok-IN' },
  { code: 'ne', label: 'Nepali', native: 'नेपाली', speech: 'ne-IN' },
  { code: 'mai', label: 'Maithili', native: 'मैथिली', speech: 'mai-IN' },
  { code: 'doi', label: 'Dogri', native: 'डोगरी', speech: 'doi-IN' },
  { code: 'brx', label: 'Bodo', native: 'बर', speech: 'brx-IN' },
  { code: 'sat', label: 'Santali', native: 'ᱥᱟᱱᱛᱟᱲᱤ', speech: 'sat-IN' },
  { code: 'ks', label: 'Kashmiri', native: 'कॉशुर', speech: 'ks-IN' },
  { code: 'mni', label: 'Manipuri (Meitei)', native: 'ꯃꯤꯇꯩꯂꯣꯟ', speech: 'mni-IN' },
  { code: 'sd', label: 'Sindhi', native: 'سنڌي', speech: 'sd-IN' }
]

export const RECOMMENDED_LANGUAGES = ['en', 'hi', 'mr']

export const COMPLAINT_STATUS = {
  PENDING: 'Pending',
  ASSIGNED: 'Assigned',
  ACCEPTED: 'Accepted',
  WORK_STARTED: 'Work Started',
  INSPECTION: 'Inspection',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected'
}

export const STATUS_COLORS = {
  'Pending': '#FFC107',
  'Assigned': '#6F42C1',
  'Accepted': '#0DCAF0',
  'Work Started': '#0B5ED7',
  'Inspection': '#20C997',
  'In Progress': '#0B5ED7',
  'Resolved': '#198754',
  'Rejected': '#DC3545'
}

export const STATUS_LABELS = {
  'Pending': 'Pending',
  'Assigned': 'Assigned',
  'Accepted': 'Accepted',
  'Work Started': 'Work Started',
  'Inspection': 'Inspection',
  'In Progress': 'In Progress',
  'Resolved': 'Resolved',
  'Rejected': 'Rejected'
}

export const TIMELINE_EVENTS = [
  { key: 'Submitted', label: 'Complaint Submitted' },
  { key: 'AI Processed', label: 'AI Processed' },
  { key: 'Assigned', label: 'Assigned' },
  { key: 'Accepted', label: 'Accepted' },
  { key: 'Work Started', label: 'Work Started' },
  { key: 'Inspection', label: 'Inspection' },
  { key: 'In Progress', label: 'In Progress' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Rejected', label: 'Rejected' },
  { key: 'Escalated', label: 'Escalated' }
]

export const PRIORITY_LEVELS = ['Critical', 'High', 'Medium', 'Low']

export const PRIORITY_COLORS = {
  'Critical': '#DC3545',
  'High': '#FD7E14',
  'Medium': '#FFC107',
  'Low': '#6B7280'
}

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Admin',
  department_admin: 'Department Admin',
  officer: 'Officer',
  user: 'Citizen'
}

export const ALL_ROLES = Object.keys(ROLE_LABELS)
