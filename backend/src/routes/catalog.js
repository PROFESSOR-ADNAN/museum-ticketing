import { Router } from 'express';
import * as C from '../controllers/catalogController.js';

const r = Router();
r.get('/categories', C.categories);
r.get('/availability', C.dates);
r.get('/ticket-key', C.ticketKey);
export default r;
