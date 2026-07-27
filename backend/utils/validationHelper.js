function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/<[^>]*>/g, '');
}

function sanitizeObject(obj, fields) {
  const sanitized = {};
  for (const key of fields) {
    if (obj[key] !== undefined) {
      sanitized[key] = typeof obj[key] === 'string' ? sanitizeString(obj[key]) : obj[key];
    }
  }
  return sanitized;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

function isValidCoordinates(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

module.exports = { sanitizeString, sanitizeObject, isValidEmail, isValidPhone, isValidCoordinates };
