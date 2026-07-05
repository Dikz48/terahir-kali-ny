const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: {
    error: 'Terlalu banyak request. Silakan tunggu beberapa saat.',
    status: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = limiter;