/**
 * A small stand-in for the Chapa API, used ONLY by the automated tests and for trying the app without keys.
 * It mirrors what the Chapa docs describe (developer.chapa.co): initialize / verify / refund / refund-verify / banks,
 * the hosted checkout page, `callback_url`, `return_url` and signed webhooks (x-chapa-signature / chapa-signature).
 * It is NOT Chapa: the real behaviour must be confirmed with your test keys (`npm run chapa:check`).
 *
 *   npm run chapa:simulator      then set  CHAPA_BASE_URL=http://127.0.0.1:4010/v1  CHAPA_SECRET_KEY=CHASECK_TEST-simulator
 *                                          CHAPA_WEBHOOK_SECRET=simulator-webhook-secret
 */
import http from 'node:http';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const round2 = (n) => Math.round(n * 100) / 100;
const rand = (n) => crypto.randomBytes(n).toString('hex').slice(0, n);

export async function startFakeChapa({ port = 0, secretKey = 'CHASECK_TEST-simulator', webhookSecret = 'simulator-webhook-secret', webhookUrl = null, feePercent = 3 } = {}) {
  const state = { tx: new Map(), refunds: new Map(), refundReferences: new Set(), requests: [], webhookUrl, rejectRefunds: false, lastWebhook: null };
  let base = '';

  const readBody = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(d)); });
  const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const fail = (res, code, message) => send(res, code, { message, status: 'failed', data: null });

  function webhookBody(t) {
    return JSON.stringify({ event: t.status === 'success' ? 'charge.success' : 'charge.failed/cancelled', first_name: t.first_name, last_name: t.last_name, email: t.email,
      mobile: t.phone, currency: t.currency, amount: t.amount.toFixed(2), charge: t.charge.toFixed(2), status: t.status, mode: 'test', reference: t.reference,
      created_at: t.created_at, updated_at: new Date().toISOString(), type: 'API', tx_ref: t.txRef, payment_method: 'telebirr', customization: t.customization, meta: null });
  }
  async function sendWebhook(t) {
    if (!state.webhookUrl) return null;
    const body = webhookBody(t);
    const send1 = async (overrideSig) => {
      const res = await fetch(state.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json',
        'x-chapa-signature': overrideSig ?? crypto.createHmac('sha256', webhookSecret).update(body).digest('hex'),
        'chapa-signature': crypto.createHmac('sha256', webhookSecret).update(webhookSecret).digest('hex') }, body });
      return { status: res.status, body: await res.json().catch(() => null) };
    };
    state.lastWebhook = { body, resend: () => send1() };
    return send1();
  }
  /** Simulates the customer finishing (or failing) payment on Chapa's hosted page, then Chapa notifying the merchant. */
  async function completePayment(txRef, outcome = 'success') {
    const t = state.tx.get(txRef);
    if (!t) throw new Error('unknown tx_ref ' + txRef);
    t.status = outcome === 'success' ? 'success' : 'failed';
    const webhook = await sendWebhook(t);
    if (t.callbackUrl) await fetch(`${t.callbackUrl}?trx_ref=${txRef}&ref_id=${t.reference}&status=${t.status}`).catch(() => {});
    return { webhook, replay: state.lastWebhook?.resend };
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const raw = await readBody(req);
    const p = url.pathname;
    state.requests.push({ method: req.method, path: p, headers: req.headers, raw });

    // ---- hosted checkout (what the customer sees) ----
    let m;
    if (req.method === 'GET' && (m = /^\/checkout\/(.+)$/.exec(p))) {
      const t = state.tx.get(decodeURIComponent(m[1]));
      if (!t) { res.writeHead(404); return res.end('unknown payment'); }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>Chapa simulator</title><body style="font-family:system-ui;max-width:420px;margin:12vh auto;padding:0 20px">
<h2>Chapa simulator</h2><p>Test checkout — no real money.</p><p style="font-size:2rem"><b>${t.amount.toFixed(2)} ETB</b></p><p>${t.txRef}</p>
<form method=post action="/checkout/${encodeURIComponent(t.txRef)}/complete" style="display:flex;gap:10px"><button name=outcome value=success style="flex:1;padding:14px;background:#7dc400;border:0;border-radius:8px;font-size:1rem">Pay</button>
<button name=outcome value=failed style="flex:1;padding:14px;border:0;border-radius:8px;font-size:1rem">Cancel</button></form>`);
    }
    if (req.method === 'POST' && (m = /^\/checkout\/(.+)\/complete$/.exec(p))) {
      const txRef = decodeURIComponent(m[1]);
      const outcome = new URLSearchParams(raw).get('outcome') === 'success' ? 'success' : 'failed';
      await completePayment(txRef, outcome);
      const t = state.tx.get(txRef);
      res.writeHead(303, { Location: `${t.returnUrl}${t.returnUrl.includes('?') ? '&' : '?'}trx_ref=${txRef}&status=${t.status}` });
      return res.end();
    }

    // ---- API (needs the secret key) ----
    if (req.headers.authorization !== `Bearer ${secretKey}`) return fail(res, 401, 'Invalid API Key or User not found');
    let body = {};
    try { body = (req.headers['content-type'] || '').includes('json') ? JSON.parse(raw || '{}') : Object.fromEntries(new URLSearchParams(raw)); } catch { return fail(res, 400, 'Invalid body'); }

    if (req.method === 'POST' && p === '/v1/transaction/initialize') {
      const errs = {};
      if (!(Number(body.amount) > 0)) errs.amount = ['The amount must be greater than 0'];
      if (!['ETB', 'USD'].includes(body.currency)) errs.currency = ['The currency is invalid'];
      if (!body.tx_ref) errs.tx_ref = ['The tx ref field is required'];
      if (state.tx.has(body.tx_ref)) errs.tx_ref = ['The tx ref has already been taken'];
      if (!body.first_name) errs.first_name = ['The first name field is required'];
      if (!/^\S+@\S+\.\S+$/.test(body.email || '')) errs.email = ['The email must be a valid email address'];
      if (body.phone_number != null && !/^(09|07)\d{8}$/.test(body.phone_number)) errs.phone_number = ['The phone number must be 10 digits (09xxxxxxxx or 07xxxxxxxx)'];
      if ((body.customization?.title || '').length > 16) errs['customization.title'] = ['The customization title may not be greater than 16 characters'];
      if (body.customization?.description && !/^[\p{L}\p{N} _.-]+$/u.test(body.customization.description)) errs['customization.description'] = ['Description has invalid characters'];
      for (const k of ['return_url', 'callback_url']) if (body[k] && !/^https?:\/\//.test(body[k])) errs[k] = [`The ${k} must be a valid URL`];
      if (Object.keys(errs).length) return send(res, 400, { message: errs, status: 'failed', data: null });
      const amount = Number(body.amount);
      state.tx.set(body.tx_ref, { txRef: body.tx_ref, amount, currency: body.currency, charge: round2((amount * feePercent) / 100), status: 'pending', reference: 'AP' + rand(10),
        first_name: body.first_name, last_name: body.last_name, email: body.email, phone: body.phone_number, returnUrl: body.return_url, callbackUrl: body.callback_url,
        customization: body.customization ?? null, created_at: new Date().toISOString() });
      return send(res, 200, { message: 'Hosted Link', status: 'success', data: { checkout_url: `${base}/checkout/${encodeURIComponent(body.tx_ref)}` } });
    }
    if (req.method === 'GET' && (m = /^\/v1\/transaction\/verify\/(.+)$/.exec(p))) {
      const t = state.tx.get(decodeURIComponent(m[1]));
      if (!t) return fail(res, 404, 'Transaction not found');
      return send(res, 200, { message: t.status === 'success' ? 'Payment details' : 'Payment is not completed yet', status: 'success', data: {
        first_name: t.first_name, last_name: t.last_name, email: t.email, currency: t.currency, amount: t.amount, charge: t.charge, mode: 'test', method: 'telebirr', type: 'API',
        status: t.status, reference: t.reference, tx_ref: t.txRef, customization: t.customization, meta: null, created_at: t.created_at, updated_at: new Date().toISOString() } });
    }
    if (req.method === 'POST' && (m = /^\/v1\/refund\/(.+)$/.exec(p))) {
      const id = decodeURIComponent(m[1]);
      const t = [...state.tx.values()].find((x) => x.reference === id);       // the docs' example uses Chapa's own reference
      if (state.rejectRefunds) return fail(res, 400, 'Refund not allowed in this test');
      if (!t) return fail(res, 404, 'Transaction not found');
      if (t.status !== 'success') return fail(res, 400, 'Only successful transactions can be refunded');
      const amount = body.amount != null ? Number(body.amount) : t.amount;
      if (!(amount > 0) || amount > t.amount) return fail(res, 400, 'Invalid refund amount');
      if (body.reference && state.refundReferences.has(body.reference)) return fail(res, 400, 'The reference has already been taken.');
      if (body.reference) state.refundReferences.add(body.reference);
      const refId = 'MERC-DIS-REF-' + rand(11);
      state.refunds.set(refId, { refId, amount, reference: body.reference, reason: body.reason, tx: t.txRef, polls: 0 });
      return send(res, 200, { message: 'Refund initiated successfully', status: 'success', data: { ref_id: refId, amount, currency: t.currency, payment_reference: t.reference, status: 'initiated' } });
    }
    if (req.method === 'GET' && (m = /^\/v1\/refund\/(.+)\/verify$/.exec(p))) {
      const r = state.refunds.get(decodeURIComponent(m[1]));
      if (!r) return fail(res, 404, 'Refund not found');
      r.polls += 1;
      return send(res, 200, { message: 'Refund verified successfully', status: 'success', data: { amount: r.amount, currency: 'ETB', ref_id: r.refId, status: r.polls < 2 ? 'processing' : 'refunded' } });
    }
    if (req.method === 'GET' && p === '/v1/banks') return send(res, 200, { message: 'Banks retrieved', status: 'success', data: [{ id: 855, name: 'telebirr' }] });
    return fail(res, 404, 'Not found');
  });

  await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}`;
  return { url: base, apiUrl: `${base}/v1`, secretKey, webhookSecret, state, completePayment, close: () => new Promise((ok) => server.close(ok)) };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const f = await startFakeChapa({ port: 4010, secretKey: process.env.FAKE_CHAPA_SECRET || 'CHASECK_TEST-simulator',
    webhookSecret: process.env.FAKE_WEBHOOK_SECRET || 'simulator-webhook-secret', webhookUrl: process.env.FAKE_WEBHOOK_URL || 'http://127.0.0.1:4000/api/payments/chapa/webhook' });
  console.log(`Chapa SIMULATOR on ${f.url}\n  CHAPA_BASE_URL=${f.apiUrl}\n  CHAPA_SECRET_KEY=${f.secretKey}\n  CHAPA_WEBHOOK_SECRET=${f.webhookSecret}`);
}
