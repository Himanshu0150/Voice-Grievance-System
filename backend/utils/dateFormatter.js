function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function formatDateTime(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().replace('T', ' ').substring(0, 19);
}

function formatDateForSQL(date) {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
}

module.exports = { formatDate, formatDateTime, formatDateForSQL };
