import { AppError } from '../utils/AppError.js';
import { readToken } from '../utils/jwt.js';
import { Users } from '../db/repo.js';

export function requireAuth(req, _res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) throw new AppError('UNAUTHENTICATED', 401);
    let payload;
    try { payload = readToken(token); } catch { throw new AppError('UNAUTHENTICATED', 401); }
    const user = Users.byId(payload.sub);
    if (!user || !user.active) throw new AppError('UNAUTHENTICATED', 401);
    req.user = user;
    next();
  } catch (e) { next(e); }
}

/** FR-ACC-002: role scoping. Admin is system-level and is NOT implicitly a cashier/manager. */
export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new AppError('FORBIDDEN', 403));
