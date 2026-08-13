const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // Log full error details server-side via Winston (never lose debug context)
  logger.error(`${req.method} ${req.originalUrl} - ${statusCode} - ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user ? req.user.id : null,
    stack: err.stack,
    body: (req.originalUrl.includes('auth') || req.originalUrl.includes('payment') || req.originalUrl.includes('password'))
      ? '[REDACTED]'
      : req.body,
  });

  // Handle Mongoose Validation Error (Zod / Mongoose schema validation)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors || {}).map(e => e.message || String(e));
  }

  // Handle Mongoose Duplicate Key Error (Code 11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account or record with this ${field} already exists.`;
    errors = [];
  }

  // Handle Mongoose CastError (Invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found or invalid ID format.';
    errors = [];
  }

  // Handle Auth Failures (401/403) — uniform message to prevent enumeration
  if (statusCode === 401 && !err.isOperational) {
    message = 'Invalid credentials or expired session.';
  } else if (statusCode === 403 && !err.isOperational) {
    message = 'Access denied. You do not have permission to perform this action.';
  }

  // Sanitized production response for unhandled server errors (500)
  const isProduction = process.env.NODE_ENV === 'production';
  if (statusCode === 500 && isProduction) {
    message = 'Something went wrong. Please try again.';
    errors = [];
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
    ...(errors.length > 0 && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
