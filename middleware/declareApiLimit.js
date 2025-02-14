const rateLimit = require('express-rate-limit');
// Rate limiter configuration
exports.declareApiLimiter = rateLimit({
    windowMs: process.env.API_LIMIT ?? 1000, // 1 second window
    max: 1, // limit each IP to 1 request per windowMs
    message: 'Too many requests from this IP, please try again after a second',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers,
    keyGenerator: (req, res) => req.body.matchOddId || req.body.betId || req.body.matchId,
});
