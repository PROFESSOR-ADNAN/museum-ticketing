// Proves the phone can verify a QR that the SERVER signed (same bytes, same key) — and rejects forgeries.
//   npm test      (from the mobile folder; needs `npm install` in ../backend first)
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.NODE_ENV = 'test';
process.env.TICKET_KEY_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mobile-ticket-')), 'key.pem');
const server = await import('../../backend/src/services/ticketToken.js');
const phone = await import('../src/ticket.js');

const key = server.publicKeyBase64();
const token = server.signTicket({ ref: 'MSB-K4T9QW', visitDate: '2026-10-10', bookedQuantity: 22 });

test('the phone verifies a server-signed QR with only the public key', () => {
  const v = phone.verifyToken(token, key);
  assert.ok(v.ok);
  assert.deepEqual(v.payload, { r: 'MSB-K4T9QW', d: '2026-10-10', q: 22 });
});

test('the phone rejects altered, forged and malformed codes', () => {
  const [h, payload, sig] = token.split('.');
  const otherPayload = Buffer.from(JSON.stringify({ r: 'MSB-K4T9QW', d: '2026-10-10', q: 999 })).toString('base64url');
  assert.deepEqual(phone.verifyToken(`${h}.${otherPayload}.${sig}`, key), { ok: false, reason: 'SIGNATURE' });
  assert.deepEqual(phone.verifyToken(`${h}.${payload}.${sig.slice(0, 10)}${sig[10] === 'A' ? 'B' : 'A'}${sig.slice(11)}`, key), { ok: false, reason: 'SIGNATURE' });
  assert.equal(phone.verifyToken('hello', key).ok, false);
  assert.equal(phone.verifyToken(token, Buffer.alloc(32, 1).toString('base64')).ok, false);   // a different key
});

test('scanner input is classified: token, typed reference, or junk', () => {
  assert.equal(phone.parseCode(token).kind, 'token');
  assert.deepEqual(phone.parseCode(' msb-k4t9qw '), { kind: 'ref', ref: 'MSB-K4T9QW' });
  assert.equal(phone.parseCode('https://example.org').kind, 'bad');
  assert.equal(phone.parseCode('').kind, 'bad');
});
