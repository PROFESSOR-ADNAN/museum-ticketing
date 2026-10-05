import { sql } from '../db/index.js';
import { Bookings, hydrateBookings } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { msg } from '../i18n/messages.js';
import { addisDateOf } from '../utils/dates.js';
import { verifyTicket as checkToken, publicKeyBase64 } from './ticketToken.js';
import { recordAttendance } from './bookingService.js';

/**
 * The gate: "has this visitor paid, and have they already been let in?"
 * The QR holds a signed token; the answer always comes from the booking record (never from the QR alone).
 */
const REF = /^MSB-[A-Z0-9]{6}$/i;
const NOT_ADMITTABLE = { Visited: 'ALREADY_USED', Cancelled: 'CANCELLED', Refunded: 'REFUNDED', AwaitingPayment: 'UNPAID', PendingApproval: 'UNPAID', Declined: 'DECLINED' };
const bi = (code, params) => ({ en: msg(`GATE_${code}`, 'en', params), am: msg(`GATE_${code}`, 'am', params) });

function logScan({ bookingId = null, ref = null, result, cashierId, source = 'online', at, note = null }) {
  sql(`INSERT INTO ticket_scans (booking_id, ref, result, cashier_id, source, scanned_at, note) VALUES (?,?,?,?,?,?,?)`)
    .run(bookingId, ref, result, cashierId, source, at ?? new Date().toISOString(), note);
}
const reject = (result, today) => ({ result, paid: false, canAdmit: false, signatureVerified: false, message: bi(result), today });

/** Scan result for a QR token or a typed booking reference. */
export function checkTicket(code, cashier, today = addisDateOf()) {
  const input = String(code || '').trim();
  let ref, signed = false;
  if (/^MSB1\./.test(input)) {
    const t = checkToken(input);
    if (!t.ok) { logScan({ result: 'INVALID', cashierId: cashier.id, note: t.reason }); return reject('INVALID', today); }
    ref = t.payload.r; signed = true;
  } else if (REF.test(input)) ref = input.toUpperCase();
  else { logScan({ result: 'INVALID', cashierId: cashier.id, note: 'format' }); return reject('INVALID', today); }

  const row = Bookings.rowByRef(ref);
  if (!row) { logScan({ ref, result: 'NOT_FOUND', cashierId: cashier.id }); return { ...reject('NOT_FOUND', today), signatureVerified: signed }; }
  const result = NOT_ADMITTABLE[row.status] || (row.visit_date === today ? 'VALID' : 'WRONG_DATE');
  logScan({ bookingId: row.id, ref, result, cashierId: cashier.id });
  return {
    result, paid: ['Pending', 'Visited'].includes(row.status), canAdmit: row.status === 'Pending', signatureVerified: signed,
    message: bi(result, { date: row.visit_date }), today, booking: hydrateBookings([row])[0],
  };
}

export function lookup({ ref, q }) {
  if (ref) { const r = Bookings.rowByRef(ref); return r ? hydrateBookings([r]) : []; }
  if (!q) throw new AppError('VALIDATION');
  const like = `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`;
  const rows = sql(`SELECT b.* FROM bookings b JOIN users u ON u.id = b.visitor_id
                    WHERE b.status IN ('Pending','Visited') AND (u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.phone LIKE ? ESCAPE '\\')
                    ORDER BY b.visit_date DESC LIMIT 20`).all(like, like, like);
  return hydrateBookings(rows);
}

export function todaysBookings() {
  return hydrateBookings(sql(`SELECT * FROM bookings WHERE visit_date = ? AND status IN ('Pending','Visited') ORDER BY time_slot, id`).all(addisDateOf()));
}

/** Downloaded by the cashier's phone while online so the gate can still check tickets when the internet drops. */
export function gateList(date = addisDateOf()) {
  const rows = sql(`SELECT * FROM bookings WHERE visit_date = ? AND status IN ('Pending','Visited') ORDER BY time_slot, id`).all(date);
  return { date, generatedAt: new Date().toISOString(), publicKey: publicKeyBase64(), bookings: hydrateBookings(rows) };
}

const requested = (it) => (Array.isArray(it.attended) ? it.attended.reduce((s, a) => s + a.quantity, 0) : it.attendedQuantity);

/**
 * Admissions recorded on a phone while offline are applied here when it reconnects. Each item is independent and idempotent:
 * re-sending an item that was already applied is reported as applied; anything that no longer fits (cancelled, used by someone else) is a conflict.
 */
export function syncAttendance(items, cashier) {
  return items.map((it) => {
    const base = { clientId: it.clientId, ref: it.ref };
    try {
      const row = Bookings.rowByRef(it.ref);
      if (!row) { logScan({ ref: it.ref, result: 'SYNC_NOT_FOUND', cashierId: cashier.id, source: 'offline-sync', at: it.scannedAt }); return { ...base, status: 'conflict', code: 'NOT_FOUND' }; }
      if (row.status === 'Visited' && row.visited_by === cashier.id && row.attended_quantity === requested(it)) return { ...base, status: 'applied', duplicate: true };
      recordAttendance(row, { attended: it.attended, attendedQuantity: it.attendedQuantity }, cashier);
      logScan({ bookingId: row.id, ref: it.ref, result: 'ADMITTED', cashierId: cashier.id, source: 'offline-sync', at: it.scannedAt });
      return { ...base, status: 'applied' };
    } catch (e) {
      const code = e.code === 'BAD_STATE' ? (Bookings.rowByRef(it.ref)?.status === 'Visited' ? 'ALREADY_USED' : 'BAD_STATE') : (e.code || 'ERROR');
      logScan({ ref: it.ref, result: `SYNC_${code}`, cashierId: cashier.id, source: 'offline-sync', at: it.scannedAt });
      return { ...base, status: 'conflict', code, message: { en: msg(e.code || 'VALIDATION', 'en'), am: msg(e.code || 'VALIDATION', 'am') } };
    }
  });
}
