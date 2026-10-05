import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as C from '../controllers/adminController.js';

const r = Router();
r.use(requireAuth, requireRole('admin'));

r.get('/categories', C.listCategories);
r.post('/categories', C.createCategory);
r.patch('/categories/:id', C.updateCategory);
r.delete('/categories/:id', C.retireCategory);
r.get('/staff', C.listStaff);
r.post('/staff', C.createStaff);
r.patch('/staff/:id', C.updateStaff);
r.get('/audit', C.auditLog);
r.get('/refunds', C.listRefunds);
r.post('/refunds/:id/retry', C.retryRefund);
r.post('/refunds/:id/resolve', C.resolveRefund);
r.get('/backup', C.downloadBackup);
r.post('/jobs/no-show', C.runNoShow);
export default r;
