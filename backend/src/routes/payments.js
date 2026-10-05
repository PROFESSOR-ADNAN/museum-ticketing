import { Router } from 'express';
import * as C from '../controllers/paymentController.js';

const r = Router();
r.post(['/chapa/webhook', '/webhook'], C.chapaWebhook);
r.get('/chapa/callback', C.chapaCallback);
r.get('/return/:ref', C.paymentReturn);
export default r;
