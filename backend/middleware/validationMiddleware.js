const { validationResult } = require('express-validator');

/**
 * Validation result middleware for express-validator.
 * If validation fails, responds with the global error format:
 *   { success: false, message, errors, statusCode }
 */
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => {
        const fieldName = err.path || err.param || err.type || 'unknown';
        return {
          field: fieldName,
          param: fieldName,
          message: err.msg,
          msg: err.msg
        };
      }),
      statusCode: 400,
    });
  }
  next();
};
