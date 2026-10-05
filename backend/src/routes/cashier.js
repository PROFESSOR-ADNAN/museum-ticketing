import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as C from '../controllers/cashierController.js';

const r = Router();
r.use(requireAuth, requireRole('cashier'));

r.get('/bookings/lookup', C.lookupBookings);
r.get('/bookings/today', C.todayBookings);
r.post('/bookings/:ref/attendance', C.attendance);
r.post('/verify', C.verifyTicket);
r.get('/gate-list', C.downloadGateList);
r.post('/sync', C.syncAdmissions);
r.get('/settlements/pending', C.pendingTransfer);
r.post('/settlements', C.transfer);
r.get('/settlements', C.listTransfers);
r.get('/settlements/:id', C.getTransfer);
export default r;
