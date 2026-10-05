import { Payments } from '../db/repo.js';
import { AppError, asyncHandler as handle } from '../utils/AppError.js';
import { getProvider } from '../services/payments/index.js';
import { confirmPayment } from '../services/paymentService.js';
import { config } from '../config.js';

/** Confirm without ever failing the caller: Chapa must always get a 200 so it stops retrying; the real work is the server-to-server verify. */
async function tryConfirm(txRef) {
  try { return await confirmPayment(txRef); }
  catch (e) { console.error('[payment confirm]', txRef, e.message); return null; }
}

/**
 * Chapa webhook (Dashboard → Settings → Webhooks: URL = {PUBLIC_API_URL}/api/payments/chapa/webhook, secret hash = CHAPA_WEBHOOK_SECRET).
 * The signature is checked on the raw body, then the payment is re-verified with Chapa before anything changes (NFR-SEC-001).
 */
export const chapaWebhook = handle(async (req, res) => {
  if (!getProvider().verifyWebhookSignature(req.rawBody || '', req.headers, req.body)) {
    console.warn('[chapa webhook] signature mismatch — rejected');
    throw new AppError('BAD_SIGNATURE', 401);
  }
  const txRef = req.body?.tx_ref || req.body?.trx_ref;
  const out = txRef && Payments.byRef(txRef) ? await tryConfirm(txRef) : null;     // payouts / refund events / other apps' payments: acknowledge and ignore
  res.json({ ok: true, applied: !!out?.applied });
});

// Chapa also calls `callback_url` with GET ?trx_ref=…&ref_id=…&status=… (docs: always verify) — used only as a nudge to verify.
export const chapaCallback = handle(async (req, res) => {
  const txRef = String(req.query.trx_ref || req.query.tx_ref || '');
  if (txRef && Payments.byRef(txRef)) await tryConfirm(txRef);
  res.json({ ok: true });
});

// Where Chapa sends the customer's browser: verify first, then forward to the web page or mobile app that started the payment.
export const paymentReturn = handle(async (req, res) => {
  const p = Payments.byRef(req.params.ref);
  if (!p) return res.redirect(302, config.webUrl);
  const out = await tryConfirm(p.provider_ref);
  const outcome = out?.outcome || (Payments.byRef(p.provider_ref).status === 'succeeded' ? 'success' : 'pending');
  const back = p.client_return_url || `${config.webUrl}/bookings/${p.booking_id}`;
  res.redirect(302, `${back}${back.includes('?') ? '&' : '?'}payment=${outcome}`);
});
