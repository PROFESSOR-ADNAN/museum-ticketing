import { sql, tx, placeholders } from '../db/index.js';
import { Bookings } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { addisDateOf, daysBetween, isValidDateStr } from '../utils/dates.js';
import { bookingRef } from '../utils/refs.js';
import { config } from '../config.js';
import { Users, audit } from '../db/repo.js';
import { addDays } from '../utils/dates.js';
import { issueRefund } from './refundService.js';
import { temporaryReceipt } from './documents.js';
import { signTicket } from './ticketToken.js';

/** Visit date must be today or later, within the advance window, and not closed by the Manager (FR-BOOK-008). */
export async function assertBookableDate(date) {
  const today = addisDateOf();
  if (!isValidDateStr(date) || date < today || daysBetween(today, date) > config.maxAdvanceDays) throw new AppError('BAD_DATE');
  if (await sql('SELECT 1 FROM date_closures WHERE date = ?').get(date)) throw new AppError('DATE_CLOSED');
}

/** Prices always come from the server-side categories, never from the client. Returns amounts in santim. */
export async function buildLines(inputLines) {
  const ids = [...new Set(inputLines.map((l) => l.categoryId))];
  const cats = await sql(`SELECT * FROM categories WHERE active = 1 AND online_bookable = 1 AND id IN (${placeholders(ids.length)})`).all(...ids);
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

export async function createBooking({ visitor, kind, visitDate, timeSlot, organization, contactName, contactPhone, lines, channel = 'online', status }) {
  await assertBookableDate(visitDate);
  const built = await buildLines(lines);
  const st = status || 'AwaitingPayment';
  for (let i = 0; i < 5; i++) {
    try {
      const id = await tx(async () => {
        const info = await sql(`INSERT INTO bookings (ref, visitor_id, kind, visit_date, time_slot, organization, contact_name, contact_phone,
            booked_quantity, amount_cents, status, channel) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(bookingRef(), visitor.id, kind, visitDate, timeSlot ?? null, organization ?? null, contactName ?? null, contactPhone ?? null,
            built.bookedQuantity, built.amountCents, st, channel);
        for (const l of built.lines) {
          await sql(`INSERT INTO booking_lines (booking_id, category_id, key, name_en, name_am, unit_price_cents, quantity) VALUES (?,?,?,?,?,?,?)`)
            .run(info.lastInsertRowid, l.categoryId, l.key, l.nameEn, l.nameAm, l.unitPriceCents, l.quantity);
        }
        return Number(info.lastInsertRowid);
      });
      return await Bookings.get(id);
    } catch (e) {
      if ((e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === '23505') && /ref/i.test(e.message)) continue;   // reference collision: draw another
      throw e;
    }
  }
  throw new Error('could not allocate a booking reference');
}

/** FR-BOOK-007: one reschedule only, Pending only, to a different open future date. */
export async function reschedule(row, newDate) {
  if (row.status !== 'Pending') throw new AppError('BAD_STATE');
  if (row.reschedule_count >= 1) throw new AppError('ALREADY_RESCHEDULED');
  await assertBookableDate(newDate);
  if (newDate === row.visit_date) throw new AppError('BAD_DATE');
  const r = await sql(`UPDATE bookings SET visit_date = ?, original_visit_date = ?, no_show_notice_at = NULL, reschedule_count = reschedule_count + 1
                 WHERE id = ? AND status = 'Pending' AND reschedule_count = 0`).run(newDate, row.visit_date, row.id);
  if (r.changes === 0) throw new AppError('ALREADY_RESCHEDULED');
  return await Bookings.get(row.id);
}

/**
 * FR-TICKET-001..003, 005: record how many actually arrived; Pending -> Visited.
 * `attended`: [{categoryId, quantity}] (mixed groups) or `attendedQuantity` for a single-category booking.
 */
export async function recordAttendance(row, { attended, attendedQuantity }, cashier) {
  if (row.status !== 'Pending') throw new AppError('BAD_STATE');
  const lines = await Bookings.lines(row.id);
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
  await tx(async () => {
    const u = await sql(`UPDATE bookings SET status = 'Visited', attended_quantity = ?, attended_amount_cents = ?, visited_at = ?, visited_by = ?
                   WHERE id = ? AND status = 'Pending'`).run(total, amountCents, new Date().toISOString(), cashier.id, row.id);
    if (u.changes === 0) throw new AppError('BAD_STATE');
    for (const l of lines) await sql('UPDATE booking_lines SET attended_quantity = ? WHERE id = ?').run(counts.get(l.category_id) ?? 0, l.id);
  });
  return await Bookings.get(row.id);
}

/** Public: which dates the Manager closed, and how far ahead people can book. */
export async function availability() {
  const today = addisDateOf();
  const rows = await sql('SELECT date FROM date_closures WHERE date >= ? ORDER BY date').all(today);
  return { today, maxDate: addDays(today, config.maxAdvanceDays), closedDates: rows.map((r) => r.date) };
}

/** FR-BOOK-005/006: before payment nothing was charged (no refund); while Pending the full amount (minus the provider's charge) is refunded. */
export async function cancelBooking(row, actor) {
  if (['PendingApproval', 'AwaitingPayment'].includes(row.status)) {
    const u = await sql(`UPDATE bookings SET status = 'Cancelled' WHERE id = ? AND status IN ('PendingApproval','AwaitingPayment')`).run(row.id);
    if (!u.changes) throw new AppError('BAD_STATE');
    return { booking: await Bookings.get(row.id), refund: null };
  }
  const refund = await issueRefund(row.id, 'cancel', actor);
  return { booking: await Bookings.get(row.id), refund };
}

/** The temporary receipt. The QR (signed token) is only shown while the booking can still be used at the gate. */
export async function receiptFor(row) {
  if (!row.temp_receipt_no) throw new AppError('BAD_STATE');
  const booking = await Bookings.get(row.id);
  const user = await Users.byId(row.visitor_id);
  const usable = ['Pending', 'Visited'].includes(booking.status);
  const token = usable ? signTicket({ ref: booking.ref, visitDate: booking.visitDate, bookedQuantity: booking.bookedQuantity }) : null;
  return temporaryReceipt(booking, user, token);
}

/**
 * FR-BOOK-002, T10: Walk-in POS sale created at ticket desk.
 * Uses current catalog prices. Accepts cash or QR.
 */
export async function createWalkInSale({ cashier, lines, paymentMethod = 'cash', cashReason = '', buyerName = '', buyerPhone = '', admitImmediately = true }) {
  const today = addisDateOf();
  const built = await buildLines(lines);

  let walkInUser = await Users.byEmail('walk-in@pos.museum.invalid');
  if (!walkInUser) {
    const res = await sql(`INSERT INTO users (name, email, phone, password_hash, role, email_verified, phone_verified, active)
             VALUES ('Walk-in Visitor', 'walk-in@pos.museum.invalid', '+251900000000', 'unusable_hash', 'visitor', 1, 1, 1)`).run();
    walkInUser = await Users.byId(Number(res.lastInsertRowid));
  }

  const status = admitImmediately ? 'Visited' : 'Pending';
  const receiptNo = 'TMP-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const paidAt = new Date().toISOString();

  let bookingId;
  for (let i = 0; i < 5; i++) {
    try {
      bookingId = await tx(async () => {
        const ref = bookingRef();
        const info = await sql(`INSERT INTO bookings (ref, visitor_id, kind, visit_date, booked_quantity, amount_cents, status, channel, paid_at, temp_receipt_no, attended_quantity, attended_amount_cents, visited_at, visited_by)
             VALUES (?, ?, 'individual', ?, ?, ?, ?, 'walk_in', ?, ?, ?, ?, ?, ?)`)
          .run(ref, walkInUser.id, today, built.bookedQuantity, built.amountCents, status, paidAt, receiptNo,
               admitImmediately ? built.bookedQuantity : null,
               admitImmediately ? built.amountCents : null,
               admitImmediately ? paidAt : null,
               admitImmediately ? cashier.id : null);
        const bId = Number(info.lastInsertRowid);
        for (const l of built.lines) {
          await sql(`INSERT INTO booking_lines (booking_id, category_id, key, name_en, name_am, unit_price_cents, quantity, attended_quantity)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(bId, l.categoryId, l.key, l.nameEn, l.nameAm, l.unitPriceCents, l.quantity, admitImmediately ? l.quantity : 0);
        }
        await sql(`INSERT INTO payments (booking_id, provider, provider_ref, status, amount_cents, fee_cents, paid_at, note)
                   VALUES (?, 'pos', ?, 'succeeded', ?, 0, ?, ?)`).run(bId, `${paymentMethod}-${ref}`, built.amountCents, paidAt, `Walk-in POS: ${paymentMethod} ${cashReason || ''}`);
        if (admitImmediately) {
          await sql(`INSERT INTO ticket_scans (booking_id, cashier_id, ref, result, source, scanned_at, note)
                     VALUES (?, ?, ?, 'VALID', 'online', ?, 'Walk-in admission at desk')`).run(bId, cashier.id, ref, paidAt);
        }
        await audit({ actor: cashier.id, action: 'pos.sale_created', entity: 'booking', entityId: bId, amountCents: built.amountCents, bookingRefs: [ref], meta: { paymentMethod, cashReason } });
        return bId;
      });
      break;
    } catch (e) {
      if ((e.code === 'SQLITE_CONSTRAINT_UNIQUE' || e.code === '23505') && /ref/i.test(e.message)) continue;
      throw e;
    }
  }

  const booking = await Bookings.get(bookingId);
  const receipt = temporaryReceipt(booking, { name: buyerName || 'Walk-in Visitor', phone: buyerPhone }, null);
  return { booking, receipt };
}

/**
 * FR-TICKET-006: Category Correction at counter.
 * Adjusts line items and updates total amount.
 */
export async function correctCategory(bookingRef, { fromCategoryId, toCategoryId, quantity, reason, cashier }) {
  const row = await Bookings.rowByRef(bookingRef);
  if (!row) throw new AppError('NOT_FOUND', 404);
  if (row.status !== 'Pending' && row.status !== 'Visited') throw new AppError('BAD_STATE');

  const lines = await Bookings.lines(row.id);
  const fromLine = lines.find((l) => l.category_id === fromCategoryId);
  if (!fromLine || fromLine.quantity < quantity) throw new AppError('VALIDATION', 400, 'Invalid from category or quantity exceeds booked quantity');

  const toCat = await sql('SELECT * FROM categories WHERE id = ?').get(toCategoryId);
  if (!toCat) throw new AppError('BAD_CATEGORY', 400, 'Destination category not found');

  const deltaCents = (toCat.price_cents - fromLine.unit_price_cents) * quantity;

  await tx(async () => {
    if (fromLine.quantity === quantity) {
      await sql('DELETE FROM booking_lines WHERE id = ?').run(fromLine.id);
    } else {
      await sql('UPDATE booking_lines SET quantity = quantity - ? WHERE id = ?').run(quantity, fromLine.id);
    }

    const existingToLine = lines.find((l) => l.category_id === toCategoryId && l.id !== fromLine.id);
    if (existingToLine) {
      await sql('UPDATE booking_lines SET quantity = quantity + ? WHERE id = ?').run(quantity, existingToLine.id);
    } else {
      await sql(`INSERT INTO booking_lines (booking_id, category_id, key, name_en, name_am, unit_price_cents, quantity, attended_quantity)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0)`).run(row.id, toCat.id, toCat.key, toCat.name_en, toCat.name_am, toCat.price_cents, quantity);
    }

    await sql('UPDATE bookings SET amount_cents = amount_cents + ? WHERE id = ?').run(deltaCents, row.id);

    await audit({ actor: cashier.id, action: 'booking.category_correction', entity: 'booking', entityId: row.id, amountCents: deltaCents, bookingRefs: [bookingRef], meta: { fromCategory: fromLine.key, toCategory: toCat.key, quantity, reason } });
  });

  return { ok: true, deltaCents, deltaEtb: deltaCents / 100, booking: await Bookings.get(row.id) };
}
