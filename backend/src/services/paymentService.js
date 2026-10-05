import { sql, tx } from '../db/index.js';
import { Bookings, Payments, Users, audit, mapPayment } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { receiptNo, txRef as makeTxRef } from '../utils/refs.js';
import { config } from '../config.js';
import { getProvider } from './payments/index.js';
import { sendEmail, sendSms } from './notifier.js';
import { temporaryReceipt, bilingual } from './documents.js';
import { signTicket } from './ticketToken.js';
import { issueOrphanRefund } from './refundService.js';

/** Where the customer's browser/app should land after Chapa's page. Only our own web origin or our app schemes are accepted. */
const allowedReturn = (url) => !!url && (url.startsWith(config.webUrl) || /^(museum|exp|exps):\/\//.test(url));

export async function initiatePayment(row, user, clientReturnUrl) {
  if (!(user.emailVerified && user.phoneVerified)) throw new AppError('NOT_VERIFIED', 403);   // FR-ACC-003
  if (row.status !== 'AwaitingPayment') throw new AppError('BAD_STATE');
  const recent = sql(`SELECT * FROM payments WHERE booking_id = ? AND status = 'initiated' AND created_at > ? ORDER BY id DESC LIMIT 1`)
    .get(row.id, new Date(Date.now() - 30 * 60 * 1000).toISOString());
  if (recent?.checkout_url) return mapPayment(recent);                    // never open two parallel charges for one booking

  const provider = getProvider();
  const ref = makeTxRef(row.ref);
  const { checkoutUrl } = await provider.initiate({
    txRef: ref, amountCents: row.amount_cents, currency: config.chapa.currency,
    email: user.email, name: user.name, phone: user.phone,
    returnUrl: `${config.publicApiUrl}/api/payments/return/${ref}`,      // Chapa -> our API -> app/web (we verify before redirecting)
    callbackUrl: `${config.publicApiUrl}/api/payments/chapa/callback`,
    title: 'Science Museum', description: `Museum visit ${row.ref}`,
  });
  const ret = allowedReturn(clientReturnUrl) ? clientReturnUrl : `${config.webUrl}/bookings/${row.id}`;
  const info = sql(`INSERT INTO payments (booking_id, provider, provider_ref, amount_cents, checkout_url, client_return_url) VALUES (?,?,?,?,?,?)`)
    .run(row.id, provider.name, ref, row.amount_cents, checkoutUrl, ret);
  return mapPayment(sql('SELECT * FROM payments WHERE id = ?').get(info.lastInsertRowid));
}

/**
 * FR-PAY-002 / NFR-SEC-001 / NFR-IDEMPOTENT-001. Called from Chapa's webhook, its callback, the return redirect and the app's status poll.
 * It never trusts the caller: the provider is asked server-to-server (network, *outside* any DB transaction), then ONE atomic
 * transaction marks the payment succeeded AND the booking Pending. A repeat finds the payment already applied and does nothing.
 */
export async function confirmPayment(providerRef) {
  const payment = Payments.byRef(providerRef);
  if (!payment) throw new AppError('NOT_FOUND', 404);
  if (payment.status !== 'initiated') return { payment: mapPayment(payment), applied: false, outcome: payment.status === 'succeeded' ? 'success' : 'failed' };

  const result = await getProvider().verify(providerRef);
  if (result.status === 'pending') return { payment: mapPayment(payment), applied: false, outcome: 'pending' };
  if (result.status === 'failed') {
    sql(`UPDATE payments SET status = 'failed' WHERE id = ? AND status = 'initiated'`).run(payment.id);
    return { payment: mapPayment(Payments.byRef(providerRef)), applied: false, outcome: 'failed' };
  }

  const bad = result.amountCents !== payment.amount_cents || (result.currency && result.currency !== config.chapa.currency) || (result.txRef && result.txRef !== providerRef);
  const now = new Date().toISOString();
  const out = tx(() => {
    const cur = sql('SELECT * FROM payments WHERE id = ?').get(payment.id);
    if (cur.status !== 'initiated') return { applied: false };                              // lost the race: already applied
    if (bad) {                                                                              // amount/currency/reference tampering guard
      sql(`UPDATE payments SET status = 'failed', note = 'mismatch' WHERE id = ?`).run(cur.id);
      audit({ action: 'payment.mismatch', entity: 'Payment', entityId: cur.id, amountCents: result.amountCents, meta: { expected: cur.amount_cents, got: result.amountCents, currency: result.currency } });
      return { applied: false, mismatch: true };
    }
    sql(`UPDATE payments SET status = 'succeeded', fee_cents = ?, provider_txn_id = ?, paid_at = ? WHERE id = ?`).run(result.feeCents ?? 0, result.reference ?? null, now, cur.id);
    const upd = sql(`UPDATE bookings SET status = 'Pending', paid_at = ?, payment_ref = ?, aggregator_fee_cents = ?, temp_receipt_no = ?
                     WHERE id = ? AND status = 'AwaitingPayment'`).run(now, providerRef, result.feeCents ?? 0, receiptNo(), cur.booking_id);
    if (upd.changes === 0) {                                                                // paid twice, or the booking was cancelled meanwhile
      sql(`UPDATE payments SET note = 'orphan' WHERE id = ?`).run(cur.id);
      audit({ action: 'payment.orphan', entity: 'Payment', entityId: cur.id, amountCents: cur.amount_cents });
      return { applied: false, orphan: cur.id };
    }
    const b = Bookings.row(cur.booking_id);
    audit({ action: 'payment.confirmed', entity: 'Booking', entityId: b.id, amountCents: b.amount_cents, bookingRefs: [b.ref] });
    return { applied: true, bookingId: b.id };
  });

  if (out.applied) notifyPaid(out.bookingId).catch((e) => console.error('[notify]', e.message));
  if (out.orphan) issueOrphanRefund(out.orphan).catch((e) => console.error('[orphan refund]', e.message));   // give the money back automatically
  return { payment: mapPayment(Payments.byRef(providerRef)), applied: !!out.applied, outcome: out.applied ? 'success' : out.orphan ? 'success' : 'failed' };
}

async function notifyPaid(bookingId) {
  const booking = Bookings.get(bookingId);
  const user = Users.byId(booking.visitor.id);
  const receipt = temporaryReceipt(booking, user, signTicket({ ref: booking.ref, visitDate: booking.visitDate, bookedQuantity: booking.bookedQuantity }));
  const link = `${config.webUrl}/bookings/${booking.id}`;
  const text = bilingual({
    en: `Payment received. Booking ${booking.ref} for ${booking.visitDate} is confirmed. Receipt ${booking.tempReceiptNo}. Show the QR code on your receipt at the gate: ${link}`,
    am: `ክፍያ ደርሶናል። የቦታ ማስያዣ ${booking.ref} ለ${booking.visitDate} ተረጋግጧል። ደረሰኝ ${booking.tempReceiptNo}። በበር ላይ በደረሰኝዎ ላይ ያለውን QR ኮድ ያሳዩ፦ ${link}`,
  });
  await sendEmail({ user, booking, to: user.email, subject: `${receipt.title.en} / ${receipt.title.am}`, body: text, kind: 'payment_confirmed' });
  await sendSms({ user, booking, to: user.phone, body: text, kind: 'payment_confirmed' });
}

/** The app polls this after Chapa's page: ask the provider (not the client) what happened, then report the booking's real status. */
export async function refreshStatus(row) {
  const p = Payments.latestForBooking(row.id);
  let outcome = p?.status === 'succeeded' ? 'success' : p?.status === 'failed' ? 'failed' : 'pending';
  if (p?.status === 'initiated') outcome = (await confirmPayment(p.provider_ref)).outcome;
  const fresh = Bookings.row(row.id);
  return { status: fresh.status, payment: Payments.latestForBooking(row.id)?.status ?? null, outcome };
}
