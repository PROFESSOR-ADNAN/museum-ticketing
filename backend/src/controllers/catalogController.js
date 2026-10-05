import { Categories } from '../db/repo.js';
import { availability } from '../services/bookingService.js';
import { publicKeyBase64 } from '../services/ticketToken.js';

export const categories = (_req, res) => res.json({ categories: Categories.active() });            // FR-CAT-001
export const dates = (_req, res) => res.json(availability());                                       // FR-BOOK-008
// Public key that proves a receipt QR was issued by this system (phones cache it for offline checks)
export const ticketKey = (_req, res) => res.json({ algorithm: 'ed25519', publicKey: publicKeyBase64() });
