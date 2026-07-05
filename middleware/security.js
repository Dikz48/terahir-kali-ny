const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

function sanitizeInput(req, res, next) {
  // Sanitize request body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = purify.sanitize(req.body[key].trim());
      }
    }
  }

  // Sanitize query params
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = purify.sanitize(req.query[key].trim());
      }
    }
  }

  next();
}

function validateInput(req, res, next) {
  // Validate content length
  if (req.body && req.body.message) {
    if (req.body.message.length > 10000) {
      return res.status(413).json({ error: 'Pesan terlalu panjang (maks 10000 karakter)' });
    }
  }

  next();
}

module.exports = [sanitizeInput, validateInput];