import { sql, tx, placeholders } from '../db/index.js';
import { Bookings } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { addisDateOf, daysBetween, isValidDateStr } from '../utils/dates.js';
import { bookingRef } from '../utils/refs.js';
import { config } from '../config.js';
import { Users } from '../db/repo.js';
import { addDays } from '../utils/dates.js';
import { issueRefund } from './refundService.js';
import { temporaryReceipt } from './documents.js';
import { signTicket } from './ticketToken.js';

/** Visit date must be today or later, within the advance window, and not closed by the Manager (FR-BOOK-008). */
export function assertBookableDate(date) {
  const today = addisDateOf();
  if (!isValidDateStr(date) || date < today || daysBetween(today, date) > config.maxAdvanceDays) throw new AppError('BAD_DATE');
  if (sql('SELECT 1 FROM date_closures WHERE date = ?').get(date)) throw new AppError('DATE_CLOSED');
}

/** Prices always come from the server-side categories, never from the client. Returns amounts in santim. */
export function buildLines(inputLines) {
  const ids = [...new Set(inputLines.map((l) => l.categoryId))];
  const cats = sql(`SELECT * FROM categories WHERE active = 1 AND online_bookable = 1 AND id IN (${placeholders(ids.length)})`).all(...ids);
  const byId = new Map(cats.map((c) => [c.id, c]));
  const merged = new Map();
  for (const l of inputLines) {
    if (!byId.has(l.categoryId)) throw new AppError('BAD_CATEGORY');
    merged.set(l.categoryId, (merged.get(l.categoryId) || 0) + l.quantity);
  }
  const lines = [...merged].map(([id, quantity]) => {
    const c = byId.get(id);
    return { categoryId: id, key: c.key, nameEn: c.name_en, nameAm: c.name_am, unitPriceCents: c.price_cents, quantity };
  });
  return {
    lines,
    bookedQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    amountCents: lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0),
  };
}

export function createBooking({ visitor, kind, visitDate, timeSlot, organization, contactName, contactPhone, lines, channel = 'online', status }) {
  assertBookableDate(visitDate);
  const built = buildLines(lines);
  const st = status || (kind === 'group' ? 'PendingApproval' : 'AwaitingPayment');
  for (let i = 0; i < 5; i++) {
    try {
      const id = tx(() => {
        const info = sql(`INSERT INTO bookings (ref, visitor_id, kind, visit_date, time_slot, organization, contact_name, contact_phone,
            booked_quantity, amount_cents, status, channel) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(bookingRef(), visitor.id, kind, visitDate, timeSlot ?? null, organization ?? null, contactName ?? null, contactPhone ?? null,
            built.bookedQuantity, built.amountCents, st, channel);
        for (const l of built.lines) {
          sql(`INSERT INTO booking_lines (booking_id, category_id, key, name_en, name_am, unit_price_cents, quantity) VALUES (?,?,?,?,?,?,?)`)
            .run(info.lastInsertRowid, l.categoryId, l.key, l.nameEn, l.nameAm, l.unitPriceCents, l.quantity);
        }
        return Number(info.lastInsertRowid);
      });
      return Bookings.get(id);
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' && /bookings\.ref/.test(e.message)) continue;   // reference collision: draw another
      throw e;
    }
  }
  throw new Error('could not allocate a booking reference');
}

/** FR-BOOK-007: one reschedule only, Pending only, to a different open future date. */
export function reschedule(row, newDate) {
  if (row.status !== 'Pending') throw new AppError('BAD_STATE');
  if (row.reschedule_count >= 1) throw new AppError('ALREADY_RESCHEDULED');
  assertBookableDate(newDate);
  if (newDate === row.visit_date) throw new AppError('BAD_DATE');
  const r = sql(`UPDATE bookings SET visit_date = ?, original_visit_date = ?, no_show_notice_at = NULL, reschedule_count = reschedule_count + 1
                 WHERE id = ? AND status = 'Pending' AND reschedule_count = 0`).run(newDate, row.visit_date, row.id);
  if (r.changes === 0) throw new AppError('ALREADY_RESCHEDULED');
  return Bookings.get(row.id);
}

/**
 * FR-TICKET-001..003, 005: record how many actually arrived; Pending -> Visited.
 * `attended`: [{categoryId, quantity}] (mixed groups) or `attendedQuantity` for a single-category booking.
 */
export function recordAttendance(row, { attended, attendedQuantity }, cashier) {
  if (row.status !== 'Pending') throw new AppError('BAD_STATE');
  const lines = Bookings.lines(row.id);
  let counts;                                                    // Map categoryId -> attended
  if (Array.isArray(attended) && attended.length) counts = new Map(attended.map((a) => [a.categoryId, a.quantity]));
  else if (typeof attendedQuantity === 'number') {
    if (lines.length !== 1) throw new AppError('VALIDATION');    // mixed categories need a count per category
    counts = new Map([[lines[0].category_id, attendedQuantity]]);
  } else throw new AppError('VALIDATION');

  let total = 0, amountCents = 0;
  for (const [categoryId, q] of counts) {
    const line = lines.find((l) => l.category_id === categoryId);
    if (!line) throw new AppError('VALIDATION');
    if (q > line.quantity) throw new AppError('OVER_BOOKED');    // FR-TICKET-005
    total += q; amountCents += q * line.unit_price_cents;
  }
  tx(() => {
    const u = sql(`UPDATE bookings SET status = 'Visited', attended_quantity = ?, attended_amount_cents = ?, visited_at = ?, visited_by = ?
                   WHERE id = ? AND status = 'Pending'`).run(total, amountCents, new Date().toISOString(), cashier.id, row.id);
    if (u.changes === 0) throw new AppError('BAD_STATE');
    for (const l of lines) sql('UPDATE booking_lines SET attended_quantity = ? WHERE id = ?').run(counts.get(l.category_id) ?? 0, l.id);
  });
  return Bookings.get(row.id);
}

/** Public: which dates the Manager closed, and how far ahead people can book. */
export function availability() {
  const today = addisDateOf();
  return { today, maxDate: addDays(today, config.maxAdvanceDays), closedDates: sql('SELECT date FROM date_closures WHERE date >= ? ORDER BY date').all(today).map((r) => r.date) };
}

/** FR-BOOK-005/006: before payment nothing was charged (no refund); while Pending the full amount (minus the provider's charge) is refunded. */
export async function cancelBooking(row, actor) {
  if (['PendingApproval', 'AwaitingPayment'].includes(row.status)) {
    const u = sql(`UPDATE bookings SET status = 'Cancelled' WHERE id = ? AND status IN ('PendingApproval','AwaitingPayment')`).run(row.id);
    if (!u.changes) throw new AppError('BAD_STATE');
    return { booking: Bookings.get(row.id), refund: null };
  }
  const refund = await issueRefund(row.id, 'cancel', actor);
  return { booking: Bookings.get(row.id), refund };
}

/** The temporary receipt. The QR (signed token) is only shown while the booking can still be used at the gate. */
export function receiptFor(row) {
  if (!row.temp_receipt_no) throw new AppError('BAD_STATE');
  const booking = Bookings.get(row.id);
  const usable = ['Pending', 'Visited'].includes(booking.status);
  const token = usable ? signTicket({ ref: booking.ref, visitDate: booking.visitDate, bookedQuantity: booking.bookedQuantity }) : null;
  return temporaryReceipt(booking, Users.byId(row.visitor_id), token);
}
