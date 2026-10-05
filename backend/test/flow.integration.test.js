/**
 * End-to-end API flow on a real (in-memory) SQLite database, talking to a local Chapa simulator over HTTP.
 * No external services needed:  npm test
 */
import './support/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { startFakeChapa } from './support/fakeChapa.js';
import { config } from '../src/config.js';
import { openDb, getDb, sql, closeDb } from '../src/db/index.js';
import { createApp } from '../src/app.js';
import { resetProvider } from '../src/services/payments/index.js';
import { runNoShowJob } from '../src/services/noShowJob.js';
import { reconcileRefunds } from '../src/services/refundService.js';
import { addDays, addisDateOf } from '../src/utils/dates.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('visitor -> Chapa payment -> QR check -> visit -> refund -> transfer -> no-show -> reports', async () => {
  openDb(':memory:');
  const chapa = await startFakeChapa({ secretKey: process.env.CHAPA_SECRET_KEY, webhookSecret: process.env.CHAPA_WEBHOOK_SECRET });
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  Object.assign(config, { publicApiUrl: base });
  config.chapa.baseUrl = chapa.apiUrl; resetProvider();
  chapa.state.webhookUrl = `${base}/api/payments/chapa/webhook`;

  // ---------- seed ----------
  const hash = bcrypt.hashSync('Passw0rd!', 4);
  for (const [k, en, am, price, online] of [['student', 'Student', 'ተማሪ', 50, 1], ['adult', 'Adult', 'አዋቂ', 100, 1], ['exempt', 'Free', 'ነጻ', 0, 0]])
    sql(`INSERT INTO categories (key, name_en, name_am, price_cents, online_bookable) VALUES (?,?,?,?,?)`).run(k, en, am, price * 100, online);
  [['cashier', 'cashier'], ['cashier2', 'cashier'], ['manager', 'manager'], ['admin', 'admin']].forEach(([name, role], i) =>
    sql(`INSERT INTO users (name, email, phone, password_hash, role, email_verified, phone_verified) VALUES (?,?,?,?,?,1,1)`).run(name, `${name}@t.test`, `+25191100000${i + 1}`, hash, role));
  const cat = (key) => sql('SELECT id FROM categories WHERE key = ?').get(key).id;
  const [student, adult, exempt] = [cat('student'), cat('adult'), cat('exempt')];

  const api = async (method, path, body, token) => {
    const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  const login = async (name) => (await api('POST', '/api/auth/login', { email: `${name}@t.test`, password: 'Passw0rd!' })).body.token;
  const [cashier, cashier2, manager, admin] = [await login('cashier'), await login('cashier2'), await login('manager'), await login('admin')];
  const today = addisDateOf();
  const date = addDays(today, 3);

  // ---------- register + verification gate (FR-ACC-001/003) ----------
  const reg = await api('POST', '/api/auth/register', { name: 'Hana T', email: 'hana@t.test', phone: '+251922000001', password: 'Passw0rd!', language: 'am' });
  assert.equal(reg.status, 201);
  const vt = reg.body.token;
  assert.equal((await api('POST', '/api/auth/register', { name: 'Hana T', email: 'HANA@t.test', phone: '+251922000009', password: 'Passw0rd!' })).body.error, 'EMAIL_TAKEN');
  const book = async (lines, d = date, token = vt) => (await api('POST', '/api/bookings', { visitDate: d, lines }, token)).body.booking;
  const b1 = await book([{ categoryId: student, quantity: 20 }]);
  assert.equal(b1.amount, 1000);
  assert.equal(b1.status, 'AwaitingPayment');
  assert.equal((await api('POST', `/api/bookings/${b1.id}/pay`, {}, vt)).body.error, 'NOT_VERIFIED');
  assert.equal((await api('POST', '/api/auth/verify', { email: 'hana@t.test', ...reg.body.devCodes })).status, 200);
  assert.equal((await api('POST', '/api/bookings', { visitDate: date, lines: [{ categoryId: exempt, quantity: 1 }] }, vt)).body.error, 'BAD_CATEGORY');
  assert.equal((await api('POST', '/api/bookings', { visitDate: '2020-01-01', lines: [{ categoryId: student, quantity: 1 }] }, vt)).body.error, 'BAD_DATE');
  assert.equal((await api('POST', '/api/bookings', { visitDate: date, lines: [{ categoryId: 'x', quantity: 1 }] }, vt)).body.error, 'VALIDATION');

  // ---------- Chapa: the request we send matches what Chapa validates ----------
  const payBooking = async (b, token = vt, outcome = 'success') => {
    const p = await api('POST', `/api/bookings/${b.id}/pay`, { returnUrl: `http://localhost:5173/bookings/${b.id}` }, token);
    assert.equal(p.status, 200, JSON.stringify(p.body));
    return { txRef: p.body.providerRef, ...(await chapa.completePayment(p.body.providerRef, outcome)) };
  };
  const p1 = await api('POST', `/api/bookings/${b1.id}/pay`, { returnUrl: `http://localhost:5173/bookings/${b1.id}` }, vt);
  assert.equal(p1.status, 200);
  assert.match(p1.body.checkoutUrl, /\/checkout\//);
  const init = chapa.state.requests.filter((r) => r.path === '/v1/transaction/initialize').map((r) => ({ ...r, json: JSON.parse(r.raw) })).at(-1);
  assert.equal(init.headers.authorization, `Bearer ${process.env.CHAPA_SECRET_KEY}`);
  assert.deepEqual([init.json.amount, init.json.currency, init.json.phone_number, init.json.first_name, init.json.last_name], ['1000.00', 'ETB', '0922000001', 'Hana', 'T']);
  assert.ok(init.json.tx_ref.startsWith(b1.ref));
  assert.equal(init.json.return_url, `${base}/api/payments/return/${init.json.tx_ref}`);
  assert.equal(init.json.callback_url, `${base}/api/payments/chapa/callback`);
  assert.equal(init.json.customization.title, 'Science Museum');
  assert.equal((await api('POST', `/api/bookings/${b1.id}/pay`, {}, vt)).body.providerRef, p1.body.providerRef);          // second tap re-uses the open payment
  const early = await api('GET', `/api/bookings/${b1.id}/payment-status`, null, vt);
  assert.deepEqual([early.body.status, early.body.outcome], ['AwaitingPayment', 'pending']);                              // not paid yet -> still waiting

  // a wrong secret key must surface as a friendly 502, not a crash
  config.chapa.secretKey = 'CHASECK_TEST-wrong'; resetProvider();
  const bx = await book([{ categoryId: student, quantity: 1 }]);
  assert.equal((await api('POST', `/api/bookings/${bx.id}/pay`, {}, vt)).status, 502);
  config.chapa.secretKey = process.env.CHAPA_SECRET_KEY; resetProvider();
  assert.equal((await api('POST', `/api/bookings/${bx.id}/cancel`, {}, vt)).body.booking.status, 'Cancelled');             // before payment: no refund

  // ---------- webhook: forged rejected, real one applied once (NFR-SEC-001, NFR-IDEMPOTENT-001) ----------
  const forged = await fetch(`${base}/api/payments/chapa/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-chapa-signature': 'nope' }, body: JSON.stringify({ tx_ref: p1.body.providerRef }) });
  assert.equal(forged.status, 401);
  const done1 = await chapa.completePayment(p1.body.providerRef);
  assert.equal(done1.webhook.status, 200);
  assert.equal(done1.webhook.body.applied, true);
  assert.equal((await done1.replay()).body.applied, false);                                                                 // duplicate delivery changes nothing
  let cur = (await api('GET', `/api/bookings/${b1.id}`, null, vt)).body.booking;
  assert.equal(cur.status, 'Pending');
  assert.equal(cur.aggregatorFee, 30);                                                                                      // Chapa charge (3%) recorded
  assert.equal(sql(`SELECT COUNT(*) n FROM payments WHERE booking_id = ? AND status = 'succeeded'`).get(b1.id).n, 1);
  assert.equal(sql('SELECT provider_txn_id FROM payments WHERE provider_ref = ?').get(p1.body.providerRef).provider_txn_id.startsWith('AP'), true);
  const ret = await fetch(`${base}/api/payments/return/${p1.body.providerRef}`, { redirect: 'manual' });
  assert.equal(ret.status, 302);
  assert.match(ret.headers.get('location'), /^http:\/\/localhost:5173\/bookings\/\d+\?payment=success$/);

  // ---------- receipt carries a signed QR; amounts in words, both languages ----------
  const rc = (await api('GET', `/api/bookings/${b1.id}/receipt`, null, vt)).body.receipt;
  assert.match(rc.qr.token, /^MSB1\./);
  assert.ok(rc.amountInWords.en.length && rc.amountInWords.am.length);

  // ---------- atomicity: if anything fails while applying a payment, NOTHING is applied ----------
  const ba = await book([{ categoryId: student, quantity: 1 }]);
  const pa = await api('POST', `/api/bookings/${ba.id}/pay`, {}, vt);
  getDb().exec(`CREATE TRIGGER t_fail BEFORE INSERT ON audit_logs WHEN NEW.action = 'payment.confirmed' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END`);
  const failed = await chapa.completePayment(pa.body.providerRef);
  assert.equal(failed.webhook.body.applied, false);
  assert.equal(sql('SELECT status FROM payments WHERE provider_ref = ?').get(pa.body.providerRef).status, 'initiated');
  assert.equal(sql('SELECT status FROM bookings WHERE id = ?').get(ba.id).status, 'AwaitingPayment');
  getDb().exec('DROP TRIGGER t_fail');
  assert.equal((await api('GET', `/api/bookings/${ba.id}/payment-status`, null, vt)).body.status, 'Pending');               // the next check completes it

  // ---------- reschedule once only ----------
  assert.equal((await api('POST', `/api/bookings/${b1.id}/reschedule`, { visitDate: date }, vt)).body.error, 'BAD_DATE');
  assert.equal((await api('POST', `/api/bookings/${b1.id}/reschedule`, { visitDate: addDays(date, 1) }, vt)).status, 200);
  assert.equal((await api('POST', `/api/bookings/${b1.id}/reschedule`, { visitDate: addDays(date, 2) }, vt)).body.error, 'ALREADY_RESCHEDULED');

  // ---------- attendance (FR-TICKET-*) ----------
  assert.equal((await api('POST', `/api/cashier/bookings/${b1.ref}/attendance`, { attendedQuantity: 21 }, cashier)).body.error, 'OVER_BOOKED');
  const att = await api('POST', `/api/cashier/bookings/${b1.ref}/attendance`, { attendedQuantity: 15 }, cashier);
  assert.equal(att.body.booking.status, 'Visited');
  assert.equal(att.body.shortfall, 250);
  assert.equal((await api('POST', `/api/bookings/${b1.id}/cancel`, {}, vt)).body.error, 'BAD_STATE');
  assert.equal((await api('POST', `/api/cashier/bookings/${b1.ref}/attendance`, { attendedQuantity: 15 }, cashier)).body.error, 'BAD_STATE');

  // ---------- refund of the unattended part: net of Chapa's charge, sent through Chapa's refund API ----------
  const rf = await api('POST', `/api/bookings/${b1.id}/refund-request`, {}, vt);
  assert.deepEqual([rf.body.refund.grossAmount, rf.body.refund.aggregatorFeeShare, rf.body.refund.netToVisitor], [250, 7.5, 242.5]);
  assert.equal(rf.body.refund.status, 'processing');
  assert.match(rf.body.refund.providerRefundRef, /^MERC-DIS-REF-/);
  const refundCall = chapa.state.requests.filter((r) => r.path.startsWith('/v1/refund/') && r.method === 'POST').at(-1);
  const form = Object.fromEntries(new URLSearchParams(refundCall.raw));
  assert.deepEqual([form.amount, form.reference], ['242.50', `RFD-${rf.body.refund.id}-${b1.ref}`]);
  assert.equal((await api('POST', `/api/bookings/${b1.id}/refund-request`, {}, vt)).body.error, 'NO_SHORTFALL');
  await reconcileRefunds(); await reconcileRefunds();                                                                        // Chapa: processing -> refunded
  assert.equal(sql('SELECT status FROM refunds WHERE id = ?').get(rf.body.refund.id).status, 'done');

  // ---------- settlement: net of the refund, repeat-safe (FR-SETTLE-*) ----------
  const pend = await api('GET', '/api/cashier/settlements/pending', null, cashier);
  assert.equal(pend.body.net, 750);
  assert.equal(pend.body.bookings.length, 1);
  const st = await api('POST', '/api/cashier/settlements', {}, cashier);
  assert.equal(st.status, 201);
  assert.equal(st.body.settlement.netAmount, 750);
  assert.match(st.body.receipt.amountInWords.en, /seven hundred fifty/);
  assert.equal((await api('POST', '/api/cashier/settlements', {}, cashier)).body.error, 'NOTHING_TO_SETTLE');
  assert.equal((await api('POST', '/api/cashier/settlements', {}, vt)).status, 403);

  // ---------- cancel a Pending booking: full refund minus fee; QR disappears (FR-BOOK-006) ----------
  const b2 = await book([{ categoryId: student, quantity: 2 }]);
  await payBooking(b2);
  const tokenB2 = (await api('GET', `/api/bookings/${b2.id}/receipt`, null, vt)).body.receipt.qr.token;
  const cx = await api('POST', `/api/bookings/${b2.id}/cancel`, {}, vt);
  assert.equal(cx.body.booking.status, 'Cancelled');
  assert.equal(cx.body.refund.netToVisitor, 97);
  assert.equal((await api('GET', `/api/bookings/${b2.id}/receipt`, null, vt)).body.receipt.qr, null);

  // ---------- manager: close a date; group requests need approval before payment ----------
  const closed = addDays(date, 5);
  await api('POST', '/api/manager/closures', { date: closed, reason: 'full' }, manager);
  assert.equal((await api('POST', '/api/bookings', { visitDate: closed, lines: [{ categoryId: student, quantity: 1 }] }, vt)).body.error, 'DATE_CLOSED');
  const g = (await api('POST', '/api/bookings/group', { visitDate: date, organization: 'Bole School', timeSlot: '09:00-10:30', lines: [{ categoryId: student, quantity: 30 }] }, vt)).body.booking;
  assert.equal(g.status, 'PendingApproval');
  assert.equal((await api('POST', `/api/bookings/${g.id}/pay`, {}, vt)).body.error, 'BAD_STATE');
  assert.equal((await api('POST', `/api/manager/group-requests/${g.id}/approve`, {}, manager)).body.booking.status, 'AwaitingPayment');

  // ---------- mixed-category group, per-category attendance, two cashiers press Transfer at once ----------
  const g2 = (await api('POST', '/api/bookings/group', { visitDate: date, organization: 'Kirkos School', timeSlot: '11:00-12:30',
    lines: [{ categoryId: student, quantity: 10 }, { categoryId: adult, quantity: 2 }] }, vt)).body.booking;
  assert.equal(g2.amount, 700);
  await api('POST', `/api/manager/group-requests/${g2.id}/approve`, {}, manager);
  await payBooking(g2);
  assert.equal((await api('POST', `/api/cashier/bookings/${g2.ref}/attendance`, { attendedQuantity: 5 }, cashier)).body.error, 'VALIDATION');
  const att2 = await api('POST', `/api/cashier/bookings/${g2.ref}/attendance`, { attended: [{ categoryId: student, quantity: 8 }, { categoryId: adult, quantity: 2 }] }, cashier);
  assert.equal(att2.body.booking.attendedAmount, 600);
  assert.equal((await api('POST', `/api/bookings/${g2.id}/refund-request`, {}, vt)).body.refund.grossAmount, 100);
  const [t1, t2] = await Promise.all([api('POST', '/api/cashier/settlements', {}, cashier), api('POST', '/api/cashier/settlements', {}, cashier2)]);
  assert.deepEqual([t1.status, t2.status].sort(), [201, 400]);
  assert.equal((t1.status === 201 ? t1 : t2).body.settlement.netAmount, 600);

  // ---------- no-show: notice, then automatic refund a week later (FR-PAY-005) ----------
  const b3 = await book([{ categoryId: student, quantity: 4 }]);
  await payBooking(b3);
  sql(`UPDATE bookings SET visit_date = '2020-01-01' WHERE id = ?`).run(b3.id);
  assert.ok((await runNoShowJob()).noticed >= 1);
  assert.equal(sql('SELECT status FROM bookings WHERE id = ?').get(b3.id).status, 'Pending');
  sql(`UPDATE bookings SET no_show_notice_at = ? WHERE id = ?`).run(new Date(Date.now() - 8 * 86400000).toISOString(), b3.id);
  assert.equal((await runNoShowJob()).refunded, 1);
  assert.equal(sql('SELECT status FROM bookings WHERE id = ?').get(b3.id).status, 'Refunded');

  // ---------- THE QR CHECK AT THE GATE ----------
  const bT = await book([{ categoryId: adult, quantity: 1 }], today);                                                         // visit is today
  assert.equal((await api('POST', '/api/cashier/verify', { code: bT.ref }, cashier)).body.result, 'UNPAID');                  // not paid yet
  await payBooking(bT);
  const tokenT = (await api('GET', `/api/bookings/${bT.id}/receipt`, null, vt)).body.receipt.qr.token;
  const v1 = await api('POST', '/api/cashier/verify', { code: tokenT }, cashier);
  assert.deepEqual([v1.body.result, v1.body.paid, v1.body.canAdmit, v1.body.signatureVerified, v1.body.booking.ref], ['VALID', true, true, true, bT.ref]);
  assert.ok(v1.body.message.en.startsWith('PAID') && v1.body.message.am.length > 0);
  assert.equal((await api('POST', '/api/cashier/verify', { code: bT.ref.toLowerCase() }, cashier)).body.result, 'VALID');     // typed reference works too
  const bW = await book([{ categoryId: student, quantity: 2 }]);                                                              // paid, but for another day
  await payBooking(bW);
  const vw = (await api('POST', '/api/cashier/verify', { code: bW.ref }, cashier)).body;
  assert.deepEqual([vw.result, vw.paid, vw.canAdmit], ['WRONG_DATE', true, true]);
  assert.equal((await api('POST', `/api/cashier/bookings/${bT.ref}/attendance`, { attendedQuantity: 1 }, cashier)).body.booking.status, 'Visited');
  const used = (await api('POST', '/api/cashier/verify', { code: tokenT }, cashier)).body;
  assert.deepEqual([used.result, used.paid, used.canAdmit], ['ALREADY_USED', true, false]);                                  // the same QR cannot be used twice
  assert.deepEqual([(await api('POST', '/api/cashier/verify', { code: tokenB2 }, cashier)).body.result, (await api('POST', '/api/cashier/verify', { code: b3.ref }, cashier)).body.result], ['CANCELLED', 'REFUNDED']);
  const [h, pl, sig] = tokenT.split('.');
  const bad = `${h}.${pl}.${sig.slice(0, 10)}${sig[10] === 'A' ? 'B' : 'A'}${sig.slice(11)}`;
  assert.equal((await api('POST', '/api/cashier/verify', { code: bad }, cashier)).body.result, 'INVALID');                    // forged / altered QR
  assert.equal((await api('POST', '/api/cashier/verify', { code: 'hello world' }, cashier)).body.result, 'INVALID');
  assert.equal((await api('POST', '/api/cashier/verify', { code: 'MSB-ZZZZZZ' }, cashier)).body.result, 'NOT_FOUND');
  assert.equal((await api('POST', '/api/cashier/verify', { code: tokenT }, vt)).status, 403);
  assert.ok(sql('SELECT COUNT(*) n FROM ticket_scans').get().n >= 10);                                                         // every check is logged

  // ---------- offline phone: download today's list, admit without internet, sync later ----------
  const bS = await book([{ categoryId: adult, quantity: 1 }], today);
  await payBooking(bS);
  const gl = await api('GET', '/api/cashier/gate-list', null, cashier);
  assert.ok(gl.body.bookings.some((b) => b.ref === bS.ref));
  assert.equal(gl.body.publicKey, (await api('GET', '/api/ticket-key')).body.publicKey);
  const item = { clientId: 'phone-1', ref: bS.ref, attendedQuantity: 1, scannedAt: new Date().toISOString() };
  const s1 = await api('POST', '/api/cashier/sync', { items: [item, { clientId: 'phone-2', ref: 'MSB-NOPE22', attendedQuantity: 1 }] }, cashier);
  assert.deepEqual(s1.body.results.map((x) => [x.status, x.code]), [['applied', undefined], ['conflict', 'NOT_FOUND']]);
  assert.equal((await api('POST', '/api/cashier/sync', { items: [item] }, cashier)).body.results[0].duplicate, true);          // re-sending is harmless
  assert.equal((await api('POST', '/api/cashier/sync', { items: [item] }, cashier2)).body.results[0].code, 'ALREADY_USED');   // someone else already admitted them
  assert.equal(sql('SELECT COUNT(*) n FROM ticket_scans WHERE source = ?').get('offline-sync').n >= 2, true);

  // ---------- a payment that arrives for a booking that can no longer use it is refunded automatically ----------
  const bo = await book([{ categoryId: student, quantity: 1 }]);
  const po = await api('POST', `/api/bookings/${bo.id}/pay`, {}, vt);
  await api('POST', `/api/bookings/${bo.id}/cancel`, {}, vt);                                                                  // visitor cancels while Chapa is still open...
  await chapa.completePayment(po.body.providerRef);                                                                            // ...then pays anyway
  for (let i = 0; i < 40 && !sql(`SELECT 1 FROM refunds WHERE booking_id = ? AND reason = 'orphan' AND provider_refund_ref IS NOT NULL`).get(bo.id); i++) await sleep(50);
  const orphan = sql(`SELECT * FROM refunds WHERE booking_id = ? AND reason = 'orphan'`).get(bo.id);
  assert.ok(orphan?.provider_refund_ref);
  assert.equal(orphan.net_cents, 4850);                                                                                        // 50.00 minus the 1.50 Chapa charge

  // ---------- a refund Chapa rejects is flagged for a person, then fixed from the admin screen ----------
  chapa.state.rejectRefunds = true;
  const br = await book([{ categoryId: student, quantity: 1 }]);
  await payBooking(br);
  await api('POST', `/api/bookings/${br.id}/cancel`, {}, vt);
  const stuck = (await api('GET', '/api/admin/refunds', null, admin)).body.refunds.find((r) => r.bookingRef === br.ref);
  assert.deepEqual([stuck.status, stuck.needsReview], ['failed', true]);
  assert.match(stuck.lastError, /Chapa refund failed/);
  chapa.state.rejectRefunds = false;
  assert.equal((await api('POST', `/api/admin/refunds/${stuck.id}/retry`, {}, admin)).body.refund.status, 'processing');
  assert.equal((await api('POST', `/api/admin/refunds/${stuck.id}/resolve`, { reference: 'MANUAL-001' }, admin)).body.refund.status, 'done');

  // ---------- price change is not retroactive (FR-CAT-002) ----------
  await api('PATCH', `/api/admin/categories/${student}`, { price: 60 }, admin);
  assert.equal((await book([{ categoryId: student, quantity: 1 }])).amount, 60);
  assert.equal((await api('GET', `/api/bookings/${b1.id}`, null, vt)).body.booking.amount, 1000);
  assert.equal((await api('PATCH', `/api/admin/categories/${student}`, { price: 60 }, manager)).status, 403);

  // ---------- reports, CSV exports, backup ----------
  const dash = (await api('GET', '/api/reports/dashboard', null, manager)).body;
  assert.ok(dash.statusMix.Visited >= 3 && dash.allTime.visitors >= 15 && dash.scansToday > 0);
  assert.equal((await api('GET', '/api/reports/summary?granularity=year', null, manager)).body.rows.length, 1);
  assert.equal((await api('GET', '/api/reports/dashboard', null, vt)).status, 403);
  const csv = await fetch(`${base}/api/reports/export/bookings`, { headers: { Authorization: `Bearer ${manager}` } });
  const bytes = Buffer.from(await csv.arrayBuffer());
  const text = bytes.toString('utf8').replace(/^\uFEFF/, '');
  assert.equal(csv.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);                                                              // UTF-8 BOM: Excel shows Amharic correctly
  assert.ok(text.startsWith('id,ref,status'));
  assert.ok(text.includes(b1.ref) && Number(csv.headers.get('x-row-count')) > 5);
  assert.equal((await fetch(`${base}/api/reports/export/payments`, { headers: { Authorization: `Bearer ${admin}` } })).status, 200);
  assert.equal((await fetch(`${base}/api/reports/export/nope`, { headers: { Authorization: `Bearer ${manager}` } })).status, 404);
  const bk = await fetch(`${base}/api/admin/backup`, { headers: { Authorization: `Bearer ${admin}` } });
  assert.equal(Buffer.from(await bk.arrayBuffer()).subarray(0, 15).toString(), 'SQLite format 3');
  assert.equal((await fetch(`${base}/api/admin/backup`, { headers: { Authorization: `Bearer ${manager}` } })).status, 403);
  assert.ok((await api('GET', '/api/admin/audit?action=refund', null, admin)).body.logs.length >= 4);

  // ---------- OTP guess cap ----------
  const reg2 = await api('POST', '/api/auth/register', { name: 'Sam K', email: 'sam@t.test', phone: '+251922000002', password: 'Passw0rd!' });
  for (let i = 0; i < 5; i++) await api('POST', '/api/auth/verify', { email: 'sam@t.test', emailCode: '000000' });
  assert.equal((await api('POST', '/api/auth/verify', { email: 'sam@t.test', ...reg2.body.devCodes })).body.error, 'BAD_CODE');

  server.close(); await chapa.close(); closeDb();
});
