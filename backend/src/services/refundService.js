import { sql, tx } from '../db/index.js';
import { Bookings, Refunds, Users, audit, mapRefund } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { getProvider } from './payments/index.js';
import { sendEmail, sendSms } from './notifier.js';
import { bilingual } from './documents.js';

const REASON_TEXT = { cancel: 'Booking cancelled by visitor', shortfall: 'Fewer visitors attended than booked', no_response: 'Booking not used', orphan: 'Duplicate or late payment' };

/** FR-REFUND-002: pure calculation from the recorded booking status (all amounts in santim). Never a hand-typed figure. */
export function calculateRefund(b, reason) {
  let gross;
  if (reason === 'cancel' || reason === 'no_response') {
    if (b.status !== 'Pending') throw new AppError('BAD_STATE');
    gross = b.amount_cents;
  } else if (reason === 'shortfall') {
    if (b.status !== 'Visited') throw new AppError('BAD_STATE');
    if (b.shortfall_refunded) throw new AppError('NO_SHORTFALL');
    gross = b.amount_cents - (b.attended_amount_cents ?? 0);
    if (gross <= 0) throw new AppError('NO_SHORTFALL');
  } else throw new AppError('VALIDATION');
  // FR-REFUND-003: the provider's charge is not recoverable, so the visitor's share of it is withheld.
  const feeShare = b.amount_cents > 0 ? Math.round(((b.aggregator_fee_cents || 0) * gross) / b.amount_cents) : 0;
  return { gross, feeShare, net: gross - feeShare };
}

/** Create the refund exactly once (conditional update + UNIQUE(booking, reason)) in one transaction, then ask the provider to pay it out. */
export async function issueRefund(bookingId, reason, actor = null) {
  const refundId = tx(() => {
    const b = Bookings.row(bookingId);
    if (!b) throw new AppError('NOT_FOUND', 404);
    const calc = calculateRefund(b, reason);
    const u = reason === 'shortfall'
      ? sql(`UPDATE bookings SET shortfall_refunded = 1, refunded_cents = ? WHERE id = ? AND status = 'Visited' AND shortfall_refunded = 0`).run(calc.gross, b.id)
      : sql(`UPDATE bookings SET status = ?, refunded_cents = ? WHERE id = ? AND status = 'Pending'`).run(reason === 'cancel' ? 'Cancelled' : 'Refunded', calc.gross, b.id);
    if (u.changes === 0) throw new AppError('BAD_STATE');
    const pay = sql('SELECT id FROM payments WHERE provider_ref = ?').get(b.payment_ref);
    const info = sql(`INSERT INTO refunds (booking_id, reason, gross_cents, fee_share_cents, net_cents, payment_id, requested_by) VALUES (?,?,?,?,?,?,?)`)
      .run(b.id, reason, calc.gross, calc.feeShare, calc.net, pay?.id ?? null, actor?.id ?? null);
    audit({ actor: actor?.id ?? null, action: `refund.${reason}`, entity: 'Refund', entityId: Number(info.lastInsertRowid), amountCents: calc.net,
      bookingRefs: [b.ref], meta: { gross: calc.gross, feeShare: calc.feeShare } });
    return Number(info.lastInsertRowid);
  });
  await dispatchRefund(refundId);
  return mapRefund(Refunds.byId(refundId));
}

/** A payment that arrived for a booking that can no longer use it (paid twice / cancelled meanwhile): return it automatically. */
export async function issueOrphanRefund(paymentId) {
  let refundId = null;
  try {
    refundId = tx(() => {
      const p = sql('SELECT * FROM payments WHERE id = ?').get(paymentId);
      const feeShare = p.fee_cents || 0;
      const info = sql(`INSERT INTO refunds (booking_id, reason, gross_cents, fee_share_cents, net_cents, payment_id) VALUES (?, 'orphan', ?, ?, ?, ?)`)
        .run(p.booking_id, p.amount_cents, feeShare, p.amount_cents - feeShare, p.id);
      audit({ action: 'refund.orphan', entity: 'Refund', entityId: Number(info.lastInsertRowid), amountCents: p.amount_cents - feeShare });
      return Number(info.lastInsertRowid);
    });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') { sql(`UPDATE payments SET note = 'orphan_needs_manual_refund' WHERE id = ?`).run(paymentId); return null; }
    throw e;
  }
  await dispatchRefund(refundId);
  return refundId;
}

export async function dispatchRefund(refundId) {
  const refund = Refunds.byId(refundId);
  if (!refund || refund.status === 'done' || refund.provider_refund_ref) return;
  const booking = Bookings.row(refund.booking_id);
  const payment = refund.payment_id ? sql('SELECT * FROM payments WHERE id = ?').get(refund.payment_id) : null;
  if (!payment) { sql(`UPDATE refunds SET status = 'failed', needs_review = 1, last_error = 'no confirming payment found' WHERE id = ?`).run(refundId); return; }
  if (refund.net_cents <= 0) { sql(`UPDATE refunds SET status = 'done', last_error = 'nothing to pay out (fee covers the amount)' WHERE id = ?`).run(refundId); return; }

  sql('UPDATE refunds SET attempts = attempts + 1 WHERE id = ?').run(refundId);
  try {
    const out = await getProvider().refund({
      txRef: payment.provider_ref, providerTxnId: payment.provider_txn_id, amountCents: refund.net_cents,
      reason: REASON_TEXT[refund.reason], reference: `RFD-${refund.id}-${booking.ref}`,          // unique per refund => the provider rejects a duplicate
    });
    sql(`UPDATE refunds SET provider_refund_ref = ?, status = ?, last_error = NULL, needs_review = 0 WHERE id = ?`).run(out.refundRef, out.status, refundId);
    await notifyRefund(refund, booking);
  } catch (e) {
    const permanent = !e.retryable;                                  // a 4xx means retrying blindly will not help — a person must look
    console.error('[refund dispatch failed]', refund.id, e.message);
    sql(`UPDATE refunds SET status = 'failed', last_error = ?, needs_review = ? WHERE id = ?`).run(String(e.message).slice(0, 500), permanent || e.duplicate ? 1 : 0, refundId);
  }
}

async function notifyRefund(refund, booking) {
  const user = Users.byId(booking.visitor_id);
  const etb = (c) => (c / 100).toFixed(2);
  const text = bilingual({
    en: `A refund of ${etb(refund.net_cents)} ETB for booking ${booking.ref} has been started to your original payment method (the payment provider's charge of ${etb(refund.fee_share_cents)} ETB is not refundable). It may take some time to appear in your account.`,
    am: `ለቦታ ማስያዣ ${booking.ref} የ${etb(refund.net_cents)} ብር ተመላሽ ወደ ዋናው የክፍያ መንገድዎ ተጀምሯል (የክፍያ አቅራቢው ${etb(refund.fee_share_cents)} ብር የግብይት ክፍያ አይመለስም)። በሂሳብዎ ላይ እስኪታይ ጊዜ ሊወስድ ይችላል።`,
  });
  await sendEmail({ user, booking: { id: booking.id }, to: user.email, subject: 'Refund / ተመላሽ ገንዘብ', body: text, kind: 'refund' });
  await sendSms({ user, booking: { id: booking.id }, to: user.phone, body: text, kind: 'refund' });
}

/**
 * Housekeeping (run every 10 minutes): 1) ask the provider how in-flight refunds ended; 2) retry refunds that failed for a
 * temporary reason (network, 5xx). Refunds that failed permanently are flagged `needs_review` for a person.
 */
export async function reconcileRefunds() {
  const out = { checked: 0, retried: 0 };
  for (const r of sql(`SELECT * FROM refunds WHERE status = 'processing' AND provider_refund_ref IS NOT NULL`).all()) {
    try {
      const v = await getProvider().verifyRefund(r.provider_refund_ref);
      out.checked++;
      if (v.status === 'done') sql(`UPDATE refunds SET status = 'done' WHERE id = ?`).run(r.id);
      else if (v.status === 'failed') sql(`UPDATE refunds SET status = 'failed', needs_review = 1, last_error = 'provider reversed the refund' WHERE id = ?`).run(r.id);
    } catch (e) { console.error('[refund verify]', r.id, e.message); }
  }
  for (const r of sql(`SELECT id FROM refunds WHERE status = 'failed' AND needs_review = 0 AND attempts < 5 AND provider_refund_ref IS NULL`).all()) {
    await dispatchRefund(r.id); out.retried++;
  }
  return out;
}
