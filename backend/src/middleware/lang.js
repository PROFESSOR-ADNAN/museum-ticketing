export function lang(req, _res, next) {
  const h = (req.headers['x-lang'] || req.headers['accept-language'] || 'en').toString().toLowerCase();
  req.lang = h.startsWith('am') ? 'am' : 'en';
  next();
}
