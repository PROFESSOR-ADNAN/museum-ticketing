import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as C from '../controllers/reportController.js';

const r = Router();
r.use(requireAuth, requireRole('manager', 'museum_manager', 'director', 'operation_director', 'admin'));

r.get('/dashboard', C.dashboardReport);
r.get('/summary', C.summaryReport);
r.get('/oversight', C.oversightReport);
r.post('/oversight/scan', C.runAnomalyScan);
r.get('/export', C.exportKinds);
r.get('/export/:kind', C.exportData);
export default r;
