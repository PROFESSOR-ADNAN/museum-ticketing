import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { msg } from '../i18n/messages.js';

export function notFound(_req, _res, next) { next(new AppError('NOT_FOUND', 404)); }

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(422).json({ error: 'VALIDATION', message: msg('VALIDATION', req.lang), details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.code, message: msg(err.code, req.lang, err.params) });
  }
  if (err?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ error: 'DUPLICATE', message: msg('DUPLICATE', req.lang) });
  }
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'INTERNAL', message: 'Internal server error' });
}
