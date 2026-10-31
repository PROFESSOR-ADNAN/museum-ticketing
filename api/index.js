import app from '../backend/src/app.js';

export default function handler(req, res) {
  if (req.url.includes('debug')) {
    return res.json({
      url: req.url,
      originalUrl: req.originalUrl,
      matched: req.headers['x-matched-path'],
      invokePath: req.headers['x-invoke-path'],
    });
  }
  const matched = req.headers['x-matched-path'] || req.headers['x-invoke-path'];
  if (matched && typeof matched === 'string') {
    req.url = matched;
  }
  return app(req, res);
}
