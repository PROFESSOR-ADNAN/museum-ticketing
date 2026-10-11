import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { msg } from '../i18n/messages.js';
import { requireAuth } from '../middleware/auth.js';
import * as C from '../controllers/authController.js';

const r = Router();

// Brute-force protection for the endpoints that can be guessed at. `GET /me` (called on every app start) is NOT counted.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: config.authRateLimit, standardHeaders: true, legacyHeaders: false,
  handler: (req, res) => res.status(429).json({ error: 'RATE_LIMITED', message: msg('RATE_LIMITED', req.lang) }),
});
const guard = config.env === 'test' ? [] : [limiter];

r.post('/register', ...guard, C.register);
r.post('/verify', ...guard, C.verify);
r.post('/resend', ...guard, C.resend);
r.post('/login', ...guard, C.login);
r.get('/me', requireAuth, C.me);
r.patch('/me', requireAuth, C.updateMe);
export default r;
