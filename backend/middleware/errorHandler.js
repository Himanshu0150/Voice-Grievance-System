const logger = require('../utils/logger');

function ts() {
  return new Date().toISOString();
}

function errorHandler(err, req, res, next) {
  logger.error(`${err.name}: ${err.message}`, { stack: err.stack, url: req.originalUrl });

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors || [err.message],
      timestamp: ts()
    });
  }

  if (err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'File size exceeds maximum limit',
      LIMIT_FILE_COUNT: 'Too many files',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field'
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || 'File upload error',
      errors: [{ field: err.field, message: err.message }],
      timestamp: ts()
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      timestamp: ts()
    });
  }

  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Invalid image') || err.message.includes('Invalid audio'))) {
    return res.status(400).json({
      success: false,
      message: err.message,
      timestamp: ts()
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack }),
    timestamp: ts()
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    timestamp: ts()
  });
}

module.exports = { errorHandler, notFoundHandler };
