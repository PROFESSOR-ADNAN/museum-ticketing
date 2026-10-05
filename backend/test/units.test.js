import './support/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { amountInWords, numberToWordsEn, numberToWordsAm, round2, toCents, fromCents } from '../src/utils/money.js';
import { fiscalYearOf, periodKey, weekStartOf, isValidDateStr, addDays } from '../src/utils/dates.js';
import { calculateRefund } from '../src/services/refundService.js';
import { computeSettlement } from '../src/services/settlementService.js';
import { noShowNotice } from '../src/services/documents.js';
import { ChapaProvider, toChapaPhone, splitName, safeText } from '../src/services/payments/chapa.js';
import { signTicket, verifyTicket } from '../src/services/ticketToken.js';

test('amount in words: English + Amharic (FR-LOC-003)', () => {
  assert.equal(numberToWordsEn(0), 'zero');
  assert.equal(numberToWordsEn(1250), 'one thousand two hundred fifty');
  assert.equal(numberToWordsEn(21), 'twenty-one');
  assert.equal(amountInWords(100).en, 'one hundred Birr only');
  assert.equal(amountInWords(100).am, 'መቶ ብር ብቻ');
  assert.equal(amountInWords(250.5).en, 'two hundred fifty Birr and fifty cents only');
  assert.equal(numberToWordsAm(2500), 'ሁለት ሺህ አምስት መቶ');
  assert.equal(numberToWordsAm(23), 'ሃያ ሦስት');
});

test('money is exact: santim integers, no floating-point drift', () => {
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents(246.25), 24625);
  assert.equal(fromCents(24625), 246.25);
  assert.equal(round2(0.1 + 0.2), 0.3);
});

test('fiscal year boundaries (NFR-RETENTION-001)', () => {
  assert.equal(fiscalYearOf('2026-07-07'), 'FY 2025/26');
  assert.equal(fiscalYearOf('2026-07-08'), 'FY 2026/27');
  assert.equal(fiscalYearOf('2027-01-15'), 'FY 2026/27');
});

test('period keys & date helpers', () => {
  assert.equal(periodKey('2026-10-01', 'month'), '2026-10');
  assert.equal(weekStartOf('2026-10-01'), '2026-09-28');
  assert.equal(periodKey('2026-10-01', 'year'), 'FY 2026/27');
  assert.ok(isValidDateStr('2026-02-28'));
  assert.ok(!isValidDateStr('2026-02-30'));
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

const base = { status: 'Pending', amount_cents: 100000, aggregator_fee_cents: 1500, attended_amount_cents: 0, shortfall_refunded: 0 };

test('refund: cancel is full amount minus aggregator fee (FR-REFUND-003)', () => {
  assert.deepEqual(calculateRefund(base, 'cancel'), { gross: 100000, feeShare: 1500, net: 98500 });
});

test('refund: partial attendance refunds only the unattended portion, fee pro-rated', () => {
  // booked 20 students (1000 ETB), 15 came (750 ETB) -> 250 ETB shortfall, fee share 15 * 250 / 1000 = 3.75
  assert.deepEqual(calculateRefund({ ...base, status: 'Visited', attended_amount_cents: 75000 }, 'shortfall'), { gross: 25000, feeShare: 375, net: 24625 });
});

test('refund failure paths: wrong state, nothing to refund, already refunded', () => {
  assert.throws(() => calculateRefund({ ...base, status: 'Visited', attended_amount_cents: 100000 }, 'cancel'), { code: 'BAD_STATE' });
  assert.throws(() => calculateRefund(base, 'shortfall'), { code: 'BAD_STATE' });
  assert.throws(() => calculateRefund({ ...base, status: 'Visited', attended_amount_cents: 100000 }, 'shortfall'), { code: 'NO_SHORTFALL' });
  assert.throws(() => calculateRefund({ ...base, status: 'Visited', attended_amount_cents: 50000, shortfall_refunded: 1 }, 'shortfall'), { code: 'NO_SHORTFALL' });
  assert.throws(() => calculateRefund({ ...base, status: 'Refunded' }, 'no_response'), { code: 'BAD_STATE' });
});

test('settlement is always net of refunds, incl. refunds on earlier-settled bookings (FR-REFUND-005)', () => {
  assert.deepEqual(computeSettlement([{ amount_cents: 50000 }, { amount_cents: 30000 }], [{ gross_cents: 10000 }, { gross_cents: 5050 }]), { gross: 80000, deduction: 15050, net: 64950 });
  assert.equal(computeSettlement([], [{ gross_cents: 1000 }]).net, -1000);   // the service rejects negatives (NEGATIVE_SETTLEMENT)
});

test('no-show notice is bilingual and drops the reschedule option after one reschedule (FR-PAY-005, FR-BOOK-007)', () => {
  const first = noShowNotice({ ref: 'MSB-AAAAAA', visitDate: '2026-10-01', rescheduleCount: 0 }, 7);
  assert.match(first.body.en, /reschedule it/);
  assert.match(first.body.am, /MSB-AAAAAA/);
  assert.match(noShowNotice({ ref: 'MSB-AAAAAA', visitDate: '2026-10-01', rescheduleCount: 1 }, 7).body.en, /cannot be moved again/);
});

test('Chapa request helpers: phone, name and text are shaped the way Chapa validates them', () => {
  assert.equal(toChapaPhone('+251911000001'), '0911000001');
  assert.equal(toChapaPhone('0911000001'), '0911000001');
  assert.equal(toChapaPhone('911000001'), '0911000001');
  assert.equal(toChapaPhone('+251700112233'), '0700112233');
  assert.equal(toChapaPhone('+251811000001'), undefined);
  assert.equal(toChapaPhone('12345'), undefined);
  assert.deepEqual(splitName('Hana Tesfaye Bekele'), { first: 'Hana', last: 'Tesfaye Bekele' });
  assert.deepEqual(splitName('Hana'), { first: 'Hana', last: 'Visitor' });
  assert.ok(!/[<>$]/.test(safeText('Museum visit MSB-ABC123 <b>$', 50)));
  assert.ok(safeText('x'.repeat(100), 16).length <= 16);
});

test('Chapa webhook signatures: valid accepted, forged/missing rejected (NFR-SEC-001)', () => {
  const p = new ChapaProvider({ secretKey: 'CHASECK_TEST-abc', webhookSecret: 'my-hash' });
  const raw = JSON.stringify({ event: 'charge.success', tx_ref: 'MSB-AAAAAA-1234abcd' });
  const hmac = (k, m) => crypto.createHmac('sha256', k).update(m).digest('hex');
  assert.ok(p.verifyWebhookSignature(raw, { 'x-chapa-signature': hmac('my-hash', raw) }, JSON.parse(raw)));      // payload signed with the secret hash
  assert.ok(p.verifyWebhookSignature(raw, { 'x-chapa-signature': hmac('CHASECK_TEST-abc', raw) }, JSON.parse(raw)));   // ... or with the API secret
  assert.ok(p.verifyWebhookSignature(raw, { 'chapa-signature': hmac('my-hash', 'my-hash') }, JSON.parse(raw)));   // static signature header
  assert.ok(!p.verifyWebhookSignature(raw, { 'x-chapa-signature': hmac('wrong', raw) }, JSON.parse(raw)));
  assert.ok(!p.verifyWebhookSignature(raw + ' ', { 'x-chapa-signature': hmac('my-hash', raw) }, null));
  assert.ok(!p.verifyWebhookSignature(raw, {}, JSON.parse(raw)));
  assert.ok(!p.verifyWebhookSignature(raw, { 'x-chapa-signature': 'short' }, JSON.parse(raw)));
  assert.equal(p.mode, 'test');
});

test('QR tickets: signed token round-trips; tampering and garbage are rejected', () => {
  const token = signTicket({ ref: 'MSB-K4T9QW', visitDate: '2026-10-10', bookedQuantity: 22 });
  assert.match(token, /^MSB1\.[\w-]+\.[\w-]+$/);
  assert.ok(token.length < 200);                                       // small enough for an easy-to-scan QR
  const ok = verifyTicket(token);
  assert.ok(ok.ok); assert.deepEqual(ok.payload, { r: 'MSB-K4T9QW', d: '2026-10-10', q: 22 });
  const [h, payload, sig] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ r: 'MSB-K4T9QW', d: '2026-10-10', q: 999 })).toString('base64url');
  assert.deepEqual(verifyTicket(`${h}.${forged}.${sig}`), { ok: false, reason: 'SIGNATURE' });
  assert.deepEqual(verifyTicket('hello'), { ok: false, reason: 'FORMAT' });
  assert.deepEqual(verifyTicket(`${h}.${payload}.AAAA`), { ok: false, reason: 'SIGNATURE' });
});
