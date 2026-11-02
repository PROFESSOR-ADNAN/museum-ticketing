import { Router } from 'express';
import { runNoShowJob } from '../services/noShowJob.js';
import { reconcileRefunds } from '../services/refundService.js';
import { asyncHandler as handle } from '../utils/AppError.js';

const r = Router();

// Verify authorization if CRON_SECRET is configured
function verifyCronAuth(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return next();
  const authHeader = req.headers['authorization'];
  if (authHeader === `Bearer ${secret}`) return next();
  return res.status(401).json({ error: 'UNAUTHORIZED_CRON', message: 'Invalid cron secret.' });
}

r.use(verifyCronAuth);

r.get('/no-show', handle(async (_req, res) => {
  const result = await runNoShowJob();
  res.json({ ok: true, job: 'no-show', result, timestamp: new Date().toISOString() });
}));

r.get('/reconcile-refunds', handle(async (_req, res) => {
  const result = await reconcileRefunds();
  res.json({ ok: true, job: 'reconcile-refunds', result, timestamp: new Date().toISOString() });
}));

export default r;
