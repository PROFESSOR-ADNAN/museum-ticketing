import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as C from '../controllers/bookingController.js';

const r = Router();
const visitor = requireRole('visitor');
r.use(requireAuth);

r.post('/', visitor, C.create);
r.post('/group', visitor, C.createGroup);
r.get('/', C.list);
r.get('/:id', C.get);
r.get('/:id/receipt', C.receipt);
r.post('/:id/pay', visitor, C.pay);
r.get('/:id/payment-status', C.paymentStatus);
r.post('/:id/cancel', visitor, C.cancel);
r.post('/:id/reschedule', visitor, C.rescheduleBooking);
r.post('/:id/refund-request', visitor, C.refundRequest);
export default r;
