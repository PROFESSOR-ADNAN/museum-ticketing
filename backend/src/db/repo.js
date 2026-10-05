import { getDb, sql, placeholders } from './index.js';
import { fromCents } from '../utils/money.js';

const bool = (v) => !!v;

// ---------- users ----------
export const mapUser = (r, secrets = false) => r && ({
  id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role,
  emailVerified: bool(r.email_verified), phoneVerified: bool(r.phone_verified), language: r.language, active: bool(r.active),
  ...(secrets ? { passwordHash: r.password_hash, emailCode: r.email_code, phoneCode: r.phone_code, codeExpiresAt: r.code_expires_at, codeAttempts: r.code_attempts } : {}),
});
export const Users = {
  byId: (id, secrets = false) => mapUser(sql('SELECT * FROM users WHERE id = ?').get(id), secrets),
  byEmail: (email, secrets = false) => mapUser(sql('SELECT * FROM users WHERE email = ?').get(String(email).trim()), secrets),
};

// ---------- categories ----------
export const mapCategory = (r) => r && ({
  id: r.id, key: r.key, name: { en: r.name_en, am: r.name_am }, description: { en: r.desc_en, am: r.desc_am },
  price: fromCents(r.price_cents), onlineBookable: bool(r.online_bookable), active: bool(r.active), sortOrder: r.sort_order,
});
export const Categories = {
  all: () => sql('SELECT * FROM categories ORDER BY sort_order, price_cents').all().map(mapCategory),
  active: () => sql('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, price_cents').all().map(mapCategory),
  byId: (id) => mapCategory(sql('SELECT * FROM categories WHERE id = ?').get(id)),
};

// ---------- bookings ----------
const mapLine = (l) => ({
  category: l.category_id, key: l.key, name: { en: l.name_en, am: l.name_am },
  unitPrice: fromCents(l.unit_price_cents), quantity: l.quantity, attendedQuantity: l.attended_quantity,
});
export function mapBooking(r, lines = [], visitor = null) {
  return {
    id: r.id, ref: r.ref,
    visitor: visitor ? { id: visitor.id, name: visitor.name, email: visitor.email, phone: visitor.phone } : { id: r.visitor_id },
    kind: r.kind, visitDate: r.visit_date, timeSlot: r.time_slot, organization: r.organization,
    contactName: r.contact_name, contactPhone: r.contact_phone,
    lines: lines.map(mapLine), bookedQuantity: r.booked_quantity, amount: fromCents(r.amount_cents),
    status: r.status, channel: r.channel,
    decision: r.decision_at ? { by: r.decision_by, at: r.decision_at, note: r.decision_note } : null,
    paidAt: r.paid_at, paymentRef: r.payment_ref, tempReceiptNo: r.temp_receipt_no, aggregatorFee: fromCents(r.aggregator_fee_cents),
    rescheduleCount: r.reschedule_count, originalVisitDate: r.original_visit_date, noShowNoticeAt: r.no_show_notice_at,
    attendedQuantity: r.attended_quantity, attendedAmount: fromCents(r.attended_amount_cents),
    visitedAt: r.visited_at, visitedBy: r.visited_by,
    refundedAmount: fromCents(r.refunded_cents), shortfallRefunded: bool(r.shortfall_refunded), settlementId: r.settlement_id,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
/** Attach lines and visitor details to many bookings with two queries (not 2 per booking). */
export function hydrateBookings(rows) {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map((r) => r.id);
  const lines = db.prepare(`SELECT * FROM booking_lines WHERE booking_id IN (${placeholders(ids.length)}) ORDER BY id`).all(...ids);
  const vids = [...new Set(rows.map((r) => r.visitor_id))];
  const visitors = db.prepare(`SELECT id, name, email, phone FROM users WHERE id IN (${placeholders(vids.length)})`).all(...vids);
  const lineBy = new Map(), visBy = new Map(visitors.map((v) => [v.id, v]));
  for (const l of lines) (lineBy.get(l.booking_id) || lineBy.set(l.booking_id, []).get(l.booking_id)).push(l);
  return rows.map((r) => mapBooking(r, lineBy.get(r.id) || [], visBy.get(r.visitor_id)));
}
export const Bookings = {
  row: (id) => sql('SELECT * FROM bookings WHERE id = ?').get(id),
  rowByRef: (ref) => sql('SELECT * FROM bookings WHERE ref = ?').get(String(ref).trim().toUpperCase()),
  lines: (id) => sql('SELECT * FROM booking_lines WHERE booking_id = ? ORDER BY id').all(id),
  get: (id) => { const r = Bookings.row(id); return r ? hydrateBookings([r])[0] : null; },
  getByRef: (ref) => { const r = Bookings.rowByRef(ref); return r ? hydrateBookings([r])[0] : null; },
};

// ---------- payments / refunds / settlements ----------
export const mapPayment = (p) => p && ({
  id: p.id, bookingId: p.booking_id, provider: p.provider, providerRef: p.provider_ref, providerReference: p.provider_txn_id,
  amount: fromCents(p.amount_cents), fee: fromCents(p.fee_cents), status: p.status, note: p.note, checkoutUrl: p.checkout_url,
  paidAt: p.paid_at, createdAt: p.created_at,
});
export const Payments = {
  byRef: (ref) => sql('SELECT * FROM payments WHERE provider_ref = ?').get(ref),
  latestForBooking: (bookingId) => sql('SELECT * FROM payments WHERE booking_id = ? ORDER BY id DESC LIMIT 1').get(bookingId),
};
export const mapRefund = (r) => r && ({
  id: r.id, bookingId: r.booking_id, reason: r.reason, grossAmount: fromCents(r.gross_cents), aggregatorFeeShare: fromCents(r.fee_share_cents),
  netToVisitor: fromCents(r.net_cents), status: r.status, providerRefundRef: r.provider_refund_ref, needsReview: bool(r.needs_review),
  lastError: r.last_error, settlementId: r.settlement_id, createdAt: r.created_at,
});
export const Refunds = { byId: (id) => sql('SELECT * FROM refunds WHERE id = ?').get(id) };

export function mapSettlement(s) {
  if (!s) return null;
  const refs = sql('SELECT ref FROM bookings WHERE settlement_id = ? ORDER BY visited_at').all(s.id).map((x) => x.ref);
  const refundIds = sql('SELECT id FROM refunds WHERE settlement_id = ?').all(s.id).map((x) => x.id);
  return {
    id: s.id, ref: s.ref, cashier: s.cashier_id, bookingRefs: refs, refunds: refundIds,
    grossAmount: fromCents(s.gross_cents), refundDeduction: fromCents(s.refund_deduction_cents), netAmount: fromCents(s.net_cents),
    amountInWords: { en: s.words_en, am: s.words_am }, purpose: { en: s.purpose_en, am: s.purpose_am }, createdAt: s.created_at,
  };
}
export const Settlements = { row: (id) => sql('SELECT * FROM settlements WHERE id = ?').get(id) };

// ---------- audit ----------
export function audit({ actor = null, action, entity = null, entityId = null, amountCents = null, bookingRefs = null, meta = null }) {
  sql(`INSERT INTO audit_logs (actor_id, action, entity, entity_id, amount_cents, booking_refs, meta) VALUES (?,?,?,?,?,?,?)`)
    .run(actor, action, entity, entityId, amountCents, bookingRefs ? JSON.stringify(bookingRefs) : null, meta ? JSON.stringify(meta) : null);
}
