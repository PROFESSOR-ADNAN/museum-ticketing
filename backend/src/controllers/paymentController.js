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
  const out = txRef && (await Payments.byRef(txRef)) ? await tryConfirm(txRef) : null;     // payouts / refund events / other apps' payments: acknowledge and ignore
  res.json({ ok: true, applied: !!out?.applied });
});

// Chapa also calls `callback_url` with GET ?trx_ref=…&ref_id=…&status=… (docs: always verify) — used only as a nudge to verify.
export const chapaCallback = handle(async (req, res) => {
  const txRef = String(req.query.trx_ref || req.query.tx_ref || '');
  if (txRef && (await Payments.byRef(txRef))) await tryConfirm(txRef);
  res.json({ ok: true });
});

// Where Chapa sends the customer's browser: verify first, then forward to the web page or mobile app that started the payment.
export const paymentReturn = handle(async (req, res) => {
  const p = await Payments.byRef(req.params.ref);
  if (!p) return res.redirect(302, config.webUrl);
  const out = await tryConfirm(p.provider_ref);
  const fresh = await Payments.byRef(p.provider_ref);
  const outcome = out?.outcome || (fresh?.status === 'succeeded' ? 'success' : 'pending');
  const back = p.client_return_url || `${config.webUrl}/bookings/${p.booking_id}`;
  const target = `${back}${back.includes('?') ? '&' : '?'}payment=${outcome}`;
  if (!/^(museum|exp|exps):\/\//.test(back)) return res.redirect(302, target);      // web: unchanged
  res.type('html').send(appReturnPage(outcome, target));                              // phone app: a page with a button (browsers block automatic jumps to app links)
});

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PAGE = {
  success: ['✓ Payment received', 'ክፍያ ደርሷል', 'Your booking is confirmed. Go back to the app to see your ticket and QR code.', 'ቦታ ማስያዣዎ ተረጋግጧል። ትኬትዎን እና QR ኮድዎን ለማየት ወደ መተግበሪያው ይመለሱ።', '#0b7a75'],
  pending: ['… Confirming your payment', 'ክፍያዎን በማረጋገጥ ላይ', 'Chapa has not confirmed it yet. Go back to the app and pull down to refresh in a moment.', 'Chapa ገና አላረጋገጠውም። ወደ መተግበሪያው ተመልሰው ከጥቂት ጊዜ በኋላ ወደ ታች ጎትተው ያድሱ።', '#b27a00'],
  failed: ['✗ Payment not completed', 'ክፍያው አልተጠናቀቀም', 'You have not been charged. Go back to the app and try again.', 'ገንዘብ አልተቀነሰብዎትም። ወደ መተግበሪያው ተመልሰው እንደገና ይሞክሩ።', '#bf3f2b'],
};
function appReturnPage(outcome, target) {
  const [h1, h2, p1, p2, color] = PAGE[outcome] || PAGE.pending;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Science Museum</title></head>
<body style="font-family:system-ui,sans-serif;max-width:440px;margin:10vh auto;padding:0 22px;text-align:center;color:#14303a">
<h1 style="color:${color};margin-bottom:4px">${h1}</h1><h2 style="margin-top:0;font-weight:600">${h2}</h2>
<p>${p1}</p><p>${p2}</p>
<p style="margin-top:28px"><a href="${esc(target)}" style="display:inline-block;padding:16px 28px;border-radius:10px;background:#0b7a75;color:#fff;font-weight:700;text-decoration:none;font-size:18px">Open the app / መተግበሪያውን ክፈት</a></p>
<p style="color:#4b6670;font-size:14px">If the button does nothing, just close this page and open the app. / ቁልፉ ካልሠራ ይህን ገጽ ዘግተው መተግበሪያውን ይክፈቱ።</p></body></html>`;
}
