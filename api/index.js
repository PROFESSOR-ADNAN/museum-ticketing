import app from '../backend/src/app.js';

export default function handler(req, res) {
  const matched = req.headers['x-matched-path'] || req.headers['x-invoke-path'];
  if (matched && typeof matched === 'string') {
    req.url = matched;
  }
  return app(req, res);
}
