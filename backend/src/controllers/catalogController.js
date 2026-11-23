import { Categories } from '../db/repo.js';
import { availability } from '../services/bookingService.js';
import { publicKeyBase64 } from '../services/ticketToken.js';

export const categories = async (_req, res, next) => {
  try { res.json({ categories: await Categories.active() }); } catch (e) { next(e); }
};
export const dates = async (_req, res, next) => {
  try { res.json(await availability()); } catch (e) { next(e); }
};
export const tourSlots = async (_req, res) => {
  res.json({
    guidedSurchargeEtb: 50,
    slots: [
      { slot: '09:00', labelEn: '09:00 AM (Morning Tour)', labelAm: 'ጠዋት 3:00 (የጠዋት ጉብኝት)', capacity: 25, remaining: 25 },
      { slot: '10:30', labelEn: '10:30 AM (Mid-Morning Tour)', labelAm: 'ጠዋት 4:30 (የረፋድ ጉብኝት)', capacity: 25, remaining: 25 },
      { slot: '13:00', labelEn: '01:00 PM (Afternoon Tour)', labelAm: 'ከሰዓት 7:00 (የከሰዓት ጉብኝት)', capacity: 25, remaining: 25 },
      { slot: '14:30', labelEn: '02:30 PM (Late Afternoon Tour)', labelAm: 'ከሰዓት 8:30 (የማምሻ ጉብኝት)', capacity: 25, remaining: 25 },
    ],
  });
};
// Public key that proves a receipt QR was issued by this system (phones cache it for offline checks)
export const ticketKey = (_req, res) => res.json({ algorithm: 'ed25519', publicKey: publicKeyBase64() });
