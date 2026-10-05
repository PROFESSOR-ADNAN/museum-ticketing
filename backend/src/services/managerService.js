import { sql } from '../db/index.js';
import { Bookings, Users, audit, hydrateBookings } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { isValidDateStr } from '../utils/dates.js';
import { createBooking } from './bookingService.js';
import { sendEmail, sendSms } from './notifier.js';
import { bilingual } from './documents.js';

const mapClosure = (r) => ({ id: r.date, date: r.date, reason: r.reason });

// FR-BOOK-008: the Manager alone decides date availability. Bookings already made for a closed date are untouched.
export const listClosures = () => sql('SELECT * FROM date_closures ORDER BY date').all().map(mapClosure);
export function closeDate({ date, reason }, actor) {
  if (!isValidDateStr(date)) throw new AppError('BAD_DATE');
  sql(`INSERT INTO date_closures (date, reason, closed_by) VALUES (?,?,?) ON CONFLICT(date) DO UPDATE SET reason = excluded.reason, closed_by = excluded.closed_by`).run(date, reason ?? null, actor.id);
  audit({ actor: actor.id, action: 'date.closed', entity: 'DateClosure', meta: { date } });
  return mapClosure(sql('SELECT * FROM date_closures WHERE date = ?').get(date));
}
export function reopenDate(date, actor) {
  sql('DELETE FROM date_closures WHERE date = ?').run(date);
  audit({ actor: actor.id, action: 'date.reopened', entity: 'DateClosure', meta: { date } });
}

// FR-BOOK-003
export const listGroupRequests = (status = 'PendingApproval') =>
  hydrateBookings(sql(`SELECT * FROM bookings WHERE kind = 'group' AND status = ? ORDER BY visit_date`).all(status));

export async function decideGroup(id, approve, note, actor) {
  const u = sql(`UPDATE bookings SET status = ?, decision_by = ?, decision_at = ?, decision_note = ? WHERE id = ? AND kind = 'group' AND status = 'PendingApproval'`)
    .run(approve ? 'AwaitingPayment' : 'Declined', actor.id, new Date().toISOString(), note ?? null, id);
  if (!u.changes) throw new AppError('BAD_STATE');
  const b = Bookings.get(id);
  const user = Users.byId(b.visitor.id);
  const text = approve
    ? bilingual({ en: `Your group visit ${b.ref} on ${b.visitDate} was approved. Please sign in and pay online to confirm it.`, am: `የቡድን ጉብኝትዎ ${b.ref} በ${b.visitDate} ጸድቋል። ለማረጋገጥ እባክዎ ይግቡ እና በመስመር ላይ ይክፈሉ።` })
    : bilingual({ en: `Your group visit request ${b.ref} was declined. ${note || ''}`, am: `የቡድን ጉብኝት ጥያቄዎ ${b.ref} ተቀባይነት አላገኘም። ${note || ''}` });
  await sendEmail({ user, booking: b, to: user.email, subject: 'Group booking / የቡድን ጉብኝት', body: text, kind: 'group_decision' });
  await sendSms({ user, booking: b, to: user.phone, body: text, kind: 'group_decision' });
  audit({ actor: actor.id, action: approve ? 'group.approved' : 'group.declined', entity: 'Booking', entityId: b.id, bookingRefs: [b.ref] });
  return b;
}

/** Requests that arrived by phone call / official letter: the Manager records them for a registered visitor. */
export function createGroupOnBehalf(d, actor) {
  const visitor = Users.byEmail(d.visitorEmail);
  if (!visitor || visitor.role !== 'visitor') throw new AppError('NOT_FOUND', 404);
  const b = createBooking({ ...d, visitor, kind: 'group', channel: 'manager', status: d.approve ? 'AwaitingPayment' : 'PendingApproval' });
  audit({ actor: actor.id, action: 'group.recorded', entity: 'Booking', entityId: b.id, bookingRefs: [b.ref] });
  return b;
}
