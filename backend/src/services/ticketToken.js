import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

/**
 * QR codes on receipts carry a SIGNED token (Ed25519): MSB1.<payload>.<signature>.
 * The server holds the private key. Phones only get the public key, so a scanner can prove a QR is genuine
 * even with no internet — but whether it is still valid/used is always decided from the booking record.
 */
let keys = null;
function load() {
  if (keys) return keys;
  const file = path.resolve(config.ticketKeyPath);
  let privateKey;
  if (fs.existsSync(file)) privateKey = crypto.createPrivateKey(fs.readFileSync(file));
  else {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const kp = crypto.generateKeyPairSync('ed25519');
    fs.writeFileSync(file, kp.privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
    privateKey = kp.privateKey;
    console.log(`[tickets] created the QR signing key at ${file} — back it up together with the database`);
  }
  const publicKey = crypto.createPublicKey(privateKey);
  keys = { privateKey, publicKey, publicKeyB64: publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64') };
  return keys;
}
export const resetTicketKeys = () => { keys = null; };
export const publicKeyBase64 = () => load().publicKeyB64;

const b64u = (buf) => Buffer.from(buf).toString('base64url');

/** Compact payload: r = booking reference, d = visit date, q = booked quantity (for display; the database is the truth). */
export function signTicket({ ref, visitDate, bookedQuantity }) {
  const payload = JSON.stringify({ r: ref, d: visitDate, q: bookedQuantity });
  return `MSB1.${b64u(payload)}.${b64u(crypto.sign(null, Buffer.from(payload), load().privateKey))}`;
}

export function verifyTicket(token) {
  const m = /^MSB1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(token || '').trim());
  if (!m) return { ok: false, reason: 'FORMAT' };
  const payloadBuf = Buffer.from(m[1], 'base64url');
  let valid = false;
  try { valid = crypto.verify(null, payloadBuf, load().publicKey, Buffer.from(m[2], 'base64url')); } catch { valid = false; }
  if (!valid) return { ok: false, reason: 'SIGNATURE' };
  try {
    const p = JSON.parse(payloadBuf.toString('utf8'));
    if (typeof p?.r !== 'string') return { ok: false, reason: 'FORMAT' };
    return { ok: true, payload: p };
  } catch { return { ok: false, reason: 'FORMAT' }; }
}
