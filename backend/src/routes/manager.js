import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as C from '../controllers/managerController.js';

const r = Router();
r.use(requireAuth, requireRole('manager'));

r.get('/closures', C.listClosures);
r.post('/closures', C.closeDate);
r.delete('/closures/:date', C.reopenDate);
r.get('/group-requests', C.listGroupRequests);
r.post('/group-requests', C.recordGroup);
r.post('/group-requests/:id/approve', C.approveGroup);
r.post('/group-requests/:id/decline', C.declineGroup);
export default r;
