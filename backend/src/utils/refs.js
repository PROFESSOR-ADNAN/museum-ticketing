import crypto from 'node:crypto';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export function randomCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}
export const bookingRef = () => `MSB-${randomCode(6)}`;
export const settlementRef = (dateStr) => `TRF-${dateStr.replaceAll('-', '')}-${randomCode(4)}`;
export const receiptNo = () => `TMP-${randomCode(8)}`;
/** Provider transaction reference: unique, short, URL-safe (Chapa tx_ref). e.g. MSB-K4T9QW-a1b2c3d4 */
export const txRef = (bookingRef) => `${bookingRef}-${crypto.randomBytes(4).toString('hex')}`;
export const otp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
