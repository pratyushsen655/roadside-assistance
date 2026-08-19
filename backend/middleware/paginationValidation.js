const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid page parameter: must be a positive integer (e.g. ?page=1)',
        statusCode: 400
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit parameter: must be an integer between 1 and 100 (e.g. ?limit=20)',
        statusCode: 400
      });
    }
  }

  next();
};

module.exports = validatePagination;
