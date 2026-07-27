const COMPLAINT_CATEGORIES = [
  'Road', 'Water Supply', 'Sanitation', 'Electricity', 'Street Light',
  'Drainage', 'Public Building', 'Health', 'Education', 'Agriculture',
  'Forest', 'Revenue', 'Other'
];

const COMPLAINT_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  REJECTED: 'rejected'
};

const ROLES = {
  USER: 'user',
  ADMIN: 'admin'
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

module.exports = {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  ROLES,
  PAGINATION
};
