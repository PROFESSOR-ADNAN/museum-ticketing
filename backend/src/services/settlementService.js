import { sql, tx } from '../db/index.js';
import { Settlements, mapSettlement, audit } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { amountInWords } from '../utils/money.js';
import { addisDateOf } from '../utils/dates.js';
import { settlementRef } from '../utils/refs.js';

/** Pure math (unit-tested), santim in / santim out: FR-SETTLE-002 + FR-REFUND-005. Finance always sees net. */
export function computeSettlement(visitedBookings, openShortfallRefunds) {
  const gross = visitedBookings.reduce((s, b) => s + b.amount_cents, 0);
  const deduction = openShortfallRefunds.reduce((s, r) => s + r.gross_cents, 0);
  return { gross, deduction, net: gross - deduction };
}

/** FR-REPORT-003: what a transfer would contain right now. */
export function pendingSettlement() {
  const bookings = sql(`SELECT * FROM bookings WHERE status = 'Visited' AND settlement_id IS NULL ORDER BY visited_at`).all();
  // shortfall refunds not yet deducted — includes those on bookings settled in an earlier transfer
  const refunds = sql(`SELECT * FROM refunds WHERE reason = 'shortfall' AND settlement_id IS NULL`).all();
  return { bookings, refunds, ...computeSettlement(bookings, refunds) };
}

/**
 * FR-SETTLE-001/002: one action, a batch of everything not yet transferred. It runs in ONE write transaction, so two cashiers pressing
 * the button together are serialised: the second sees nothing pending. If anything fails, nothing is recorded.
 */
export function createSettlement(cashier) {
  const id = tx(() => {
    const p = pendingSettlement();
    if (!p.bookings.length && !p.refunds.length) throw new AppError('NOTHING_TO_SETTLE');
    if (p.net < 0) throw new AppError('NEGATIVE_SETTLEMENT');
    if (!p.bookings.length) throw new AppError('NOTHING_TO_SETTLE');
    const w = amountInWords(p.net / 100);
    const info = sql(`INSERT INTO settlements (ref, cashier_id, gross_cents, refund_deduction_cents, net_cents, words_en, words_am, purpose_en, purpose_am)
                      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(settlementRef(addisDateOf()), cashier.id, p.gross, p.deduction, p.net, w.en, w.am,
        'Digital ticket revenue — museum visitors (net of refunds)', 'የዲጂታል ትኬት ገቢ — የሙዚየም ጎብኚዎች (ተመላሽ ተቀንሶ)');
    const sid = Number(info.lastInsertRowid);
    sql(`UPDATE bookings SET settlement_id = ? WHERE status = 'Visited' AND settlement_id IS NULL`).run(sid);
    sql(`UPDATE refunds SET settlement_id = ? WHERE reason = 'shortfall' AND settlement_id IS NULL`).run(sid);
    audit({ actor: cashier.id, action: 'settlement.created', entity: 'Settlement', entityId: sid, amountCents: p.net,
      bookingRefs: p.bookings.map((b) => b.ref), meta: { gross: p.gross, deduction: p.deduction } });
    return sid;
  });
  return mapSettlement(Settlements.row(id));
}
