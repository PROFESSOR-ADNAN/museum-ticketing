import { Categories } from '../db/repo.js';
import { availability } from '../services/bookingService.js';
import { publicKeyBase64 } from '../services/ticketToken.js';

export const categories = async (_req, res, next) => {
  try { res.json({ categories: await Categories.active() }); } catch (e) { next(e); }
};
export const dates = async (_req, res, next) => {
  try { res.json(await availability()); } catch (e) { next(e); }
};
// Public key that proves a receipt QR was issued by this system (phones cache it for offline checks)
export const ticketKey = (_req, res) => res.json({ algorithm: 'ed25519', publicKey: publicKeyBase64() });
