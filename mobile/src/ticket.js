import nacl from 'tweetnacl';

/**
 * Offline ticket check. Pure JavaScript (no phone APIs), so it is unit-testable in Node.
 * A receipt QR is  MSB1.<payload>.<signature>  — Ed25519 over the payload bytes, signed by the server.
 * The phone only holds the PUBLIC key: it can prove a QR is genuine, never create one.
 */
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function decode(str, last2) {
  const map = {}; [...A + last2].forEach((c, i) => { map[c] = i; });
  const clean = str.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let bits = 0, acc = 0, o = 0;
  for (const c of clean) {
    if (!(c in map)) throw new Error('bad base64');
    acc = (acc << 6) | map[c]; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 0xff; }
  }
  return out;
}
export const b64urlDecode = (s) => decode(s, '-_');
export const b64Decode = (s) => decode(s, '+/');

const REF = /^MSB-[A-Z0-9]{6}$/i;
/** What did the scanner read? a signed token, a typed booking reference, or junk. */
export function parseCode(code) {
  const v = String(code || '').trim();
  if (/^MSB1\./.test(v)) return { kind: 'token', token: v };
  if (REF.test(v)) return { kind: 'ref', ref: v.toUpperCase() };
  return { kind: 'bad' };
}

export function verifyToken(token, publicKeyB64) {
  const m = /^MSB1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(String(token).trim());
  if (!m) return { ok: false, reason: 'FORMAT' };
  try {
    const payload = b64urlDecode(m[1]), sig = b64urlDecode(m[2]), pub = b64Decode(publicKeyB64);
    if (sig.length !== 64 || pub.length !== 32) return { ok: false, reason: 'FORMAT' };
    if (!nacl.sign.detached.verify(payload, sig, pub)) return { ok: false, reason: 'SIGNATURE' };
    const p = JSON.parse(String.fromCharCode(...payload));          // payload is ASCII (reference, date, number)
    return typeof p?.r === 'string' ? { ok: true, payload: p } : { ok: false, reason: 'FORMAT' };
  } catch { return { ok: false, reason: 'FORMAT' }; }
}
