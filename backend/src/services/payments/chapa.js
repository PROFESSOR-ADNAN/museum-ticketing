import crypto from 'node:crypto';
import { PaymentProvider } from './provider.js';
import { toCents } from '../../utils/money.js';

/**
 * Chapa (https://developer.chapa.co) adapter. Endpoints used, all with `Authorization: Bearer <secret key>`:
 *   POST {base}/transaction/initialize        -> data.checkout_url
 *   GET  {base}/transaction/verify/{tx_ref}   -> data.status/amount/charge/reference/currency/mode
 *   POST {base}/refund/{reference}            (form body: reason, amount, reference)  -> data.ref_id
 *   GET  {base}/refund/{ref_id}/verify        -> data.status: initiated | processing | refunded | reversed
 *   GET  {base}/banks                         (only used by `npm run chapa:check` to prove the key works)
 * Webhooks: Chapa POSTs the event with `x-chapa-signature` / `chapa-signature` headers (HMAC-SHA256).
 */
export class ProviderError extends Error {
  constructor(message, { status, body, retryable = false, duplicate = false } = {}) {
    super(message); this.name = 'ProviderError'; this.status = status; this.body = body; this.retryable = retryable; this.duplicate = duplicate;
  }
}

/** Chapa wants a 10-digit local number (09xxxxxxxx / 07xxxxxxxx). Returns undefined when it cannot be made valid. */
export function toChapaPhone(phone) {
  let n = String(phone || '').replace(/\D/g, '');
  if (n.startsWith('251') && n.length === 12) n = '0' + n.slice(3);
  else if (n.length === 9 && /^[79]/.test(n)) n = '0' + n;
  return /^0[79]\d{8}$/.test(n) ? n : undefined;
}
export function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || 'Museum', last: parts.slice(1).join(' ') || 'Visitor' };
}
/** Chapa restricts the free-text description to letters, digits, space, - _ . */
export const safeText = (s, max = 50) => String(s || '').replace(/[^\p{L}\p{N} _.-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

const describe = (r) => `HTTP ${r?.status} ${typeof r?.data?.message === 'string' ? r.data.message : JSON.stringify(r?.data?.message ?? r?.text ?? '').slice(0, 300)}`;
const safeEqual = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

export class ChapaProvider extends PaymentProvider {
  constructor({ secretKey, webhookSecret, baseUrl = 'https://api.chapa.co/v1', timeoutMs = 20000, strictWebhook = true }) {
    super();
    if (!secretKey) throw new Error('CHAPA_SECRET_KEY is not set');
    Object.assign(this, { secretKey, webhookSecret, baseUrl: baseUrl.replace(/\/$/, ''), timeoutMs, strictWebhook });
  }
  get name() { return 'chapa'; }
  get mode() { return this.secretKey.startsWith('CHASECK_TEST-') ? 'test' : 'live'; }

  async request(method, path, { json, form } = {}) {
    const headers = { Authorization: `Bearer ${this.secretKey}`, Accept: 'application/json' };
    let body;
    if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) { headers['Content-Type'] = 'application/x-www-form-urlencoded'; body = new URLSearchParams(form).toString(); }
    let res;
    try { res = await fetch(this.baseUrl + path, { method, headers, body, signal: AbortSignal.timeout(this.timeoutMs) }); }
    catch (e) { throw new ProviderError(`Chapa is unreachable: ${e.message}`, { retryable: true }); }
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON error page */ }
    return { status: res.status, ok: res.ok, data, text };
  }

  async initiate({ txRef, amountCents, currency = 'ETB', email, name, phone, returnUrl, callbackUrl, title, description }) {
    const { first, last } = splitName(name);
    const body = {
      amount: (amountCents / 100).toFixed(2), currency, email, first_name: first, last_name: last, tx_ref: txRef,
      callback_url: callbackUrl, return_url: returnUrl,
      customization: { title: safeText(title, 16), description: safeText(description, 50) },
      meta: { source: 'museum-ticketing' },
    };
    const p = toChapaPhone(phone);
    if (p) body.phone_number = p;
    const r = await this.request('POST', '/transaction/initialize', { json: body });
    const url = r.data?.data?.checkout_url;
    if (!r.ok || r.data?.status !== 'success' || !url) throw new ProviderError(`Chapa refused the payment request: ${describe(r)}`, { status: r.status, body: r.data });
    return { providerRef: txRef, checkoutUrl: url };
  }

  async verify(txRef) {
    const r = await this.request('GET', `/transaction/verify/${encodeURIComponent(txRef)}`);
    if (r.status === 404 || (r.status === 400 && /not found|no transaction|invalid transaction/i.test(r.text))) return { status: 'pending', notFound: true };
    if (!r.ok) throw new ProviderError(`Chapa verify failed: ${describe(r)}`, { status: r.status, body: r.data, retryable: r.status >= 500 || r.status === 429 });
    const d = r.data?.data;
    if (!d) throw new ProviderError(`Chapa verify returned no data: ${describe(r)}`, { status: r.status, body: r.data });
    const s = String(d.status || '').toLowerCase();
    const status = s === 'success' ? 'success' : ['failed', 'cancelled', 'canceled', 'rejected', 'expired'].includes(s) ? 'failed' : 'pending';
    return { status, amountCents: toCents(d.amount), feeCents: toCents(d.charge ?? 0), currency: d.currency, txRef: d.tx_ref, reference: d.reference, mode: d.mode, raw: d };
  }

  /**
   * Chapa signs webhooks two ways (see developer.chapa.co/integrations/webhooks): `x-chapa-signature` = HMAC-SHA256 of the payload,
   * `chapa-signature` = HMAC-SHA256 of the secret itself. The docs say "secret key"; the dashboard calls the value you type
   * the "secret hash". We therefore accept a match under either secret and either body form (raw text or re-serialised JSON).
   * Either valid header is enough, as the docs state. The payment itself is ALWAYS re-verified through the API afterwards.
   */
  verifyWebhookSignature(rawBody, headers = {}, parsedBody) {
    const sigs = [headers['x-chapa-signature'], headers['chapa-signature']].filter(Boolean).map((s) => String(s).trim().toLowerCase());
    if (!sigs.length) return !this.strictWebhook && false;
    const hmac = (key, msg) => crypto.createHmac('sha256', key).update(msg).digest('hex');
    const candidates = new Set();
    for (const k of [this.webhookSecret, this.secretKey].filter(Boolean)) {
      if (rawBody) candidates.add(hmac(k, rawBody));
      if (parsedBody) candidates.add(hmac(k, JSON.stringify(parsedBody)));
      candidates.add(hmac(k, k));
    }
    return sigs.some((s) => [...candidates].some((c) => safeEqual(c, s)));
  }

  /** Chapa takes the amount back from our balance; its own charge is not refundable, so callers pass the net amount. */
  async refund({ txRef, providerTxnId, amountCents, reason, reference }) {
    let last;
    for (const id of [providerTxnId, txRef].filter(Boolean)) {      // docs example uses Chapa's reference; fall back to ours on "not found"
      const r = await this.request('POST', `/refund/${encodeURIComponent(id)}`, { form: { reason: reason || 'Refund', amount: (amountCents / 100).toFixed(2), reference } });
      const d = r.data?.data;
      if (r.ok && r.data?.status !== 'failed') return { refundRef: d?.ref_id || d?.refund_id || reference, status: mapRefundStatus(d?.status) };
      last = r;
      if (r.status !== 404 && !/not found/i.test(r.text)) break;
    }
    throw new ProviderError(`Chapa refund failed: ${describe(last)}`, {
      status: last?.status, body: last?.data, retryable: !last?.status || last.status >= 500 || last.status === 429,
      duplicate: /duplicate|already|unique/i.test(last?.text || ''),
    });
  }

  async verifyRefund(refundRef) {
    const r = await this.request('GET', `/refund/${encodeURIComponent(refundRef)}/verify`);
    if (!r.ok) throw new ProviderError(`Chapa refund verify failed: ${describe(r)}`, { status: r.status, body: r.data, retryable: r.status >= 500 });
    return { status: mapRefundStatus(r.data?.data?.status) };
  }

  /** Cheap authenticated call used by `npm run chapa:check`. */
  async ping() {
    try { const r = await this.request('GET', '/banks'); return { ok: r.ok, status: r.status, message: r.ok ? 'authenticated' : describe(r) }; }
    catch (e) { return { ok: false, status: 0, message: e.message }; }
  }
}

function mapRefundStatus(s) {
  s = String(s || '').toLowerCase();
  if (s === 'refunded') return 'done';
  if (s === 'reversed') return 'failed';
  return 'processing';                              // initiated | processing | unknown
}
