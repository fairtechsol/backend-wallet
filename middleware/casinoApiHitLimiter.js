const rateLimit = require('express-rate-limit');

// Rate limiter configuration
const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2-minute window
  max: 1, // Allow 1 request per 2 minutes
  message: 'Too many requests, please wait 2 minutes before trying again',
  standardHeaders: true,
  legacyHeaders: false,
  
  // Use user ID instead of IP for rate limiting
  keyGenerator: (req) => req.body?.mid,
});

module.exports = apiLimiter;
