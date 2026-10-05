import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import * as C from '../controllers/authController.js';

const r = Router();
// brute-force protection for credential / OTP endpoints (off in tests)
if (config.env !== 'test') r.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }));

r.post('/register', C.register);
r.post('/verify', C.verify);
r.post('/resend', C.resend);
r.post('/login', C.login);
r.get('/me', requireAuth, C.me);
r.patch('/me', requireAuth, C.updateMe);
export default r;
