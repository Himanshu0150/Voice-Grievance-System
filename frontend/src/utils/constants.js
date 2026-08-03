export const COMPLAINT_CATEGORIES = [
  'Road', 'Water Supply', 'Drainage', 'Street Light', 'Electricity',
  'Garbage', 'Sanitation', 'Health', 'Education', 'Agriculture',
  'Public Property', 'Government Office', 'Traffic', 'Environment', 'Others'
]

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
