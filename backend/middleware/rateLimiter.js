const rateLimitModule = require('express-rate-limit');
const rateLimit = typeof rateLimitModule === 'function' ? rateLimitModule : rateLimitModule.default;

// General API rate limiter with JSON response format
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // 2000 requests per 15 minutes
  skip: (req) => {
    const path = req.originalUrl || req.url || '';
    return path.includes('/api/mechanic/requests/pending') || path.includes('/api/mechanic/requests/nearby');
  },
  handler: (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dedicated rate limiter specifically for polling endpoints
const pollingRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Allow up to 120 requests per minute per IP
  handler: (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(429).json({
      success: false,
      message: 'Too many polling requests, please slow down.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Dedicated rate limiter specifically for authentication & sensitive login endpoints
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Allow max 15 login/auth attempts per 15 minutes per IP
  handler: (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts from this IP, please try again in 15 minutes.'
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  rateLimiter,
  pollingRateLimiter,
  authRateLimiter
};
