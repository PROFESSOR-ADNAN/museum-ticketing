import bcrypt from 'bcryptjs';
import { sql } from '../db/index.js';
import { Categories, Users, audit } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { toCents } from '../utils/money.js';
import { uniqueToTaken } from './authService.js';
import { dispatchRefund } from './refundService.js';

// ---- categories (FR-CAT-002, FR-LOC-004: each language edited independently) ----
export const listCategories = async () => await Categories.all();
export async function createCategory(d, actor) {
  try {
    const info = await sql(`INSERT INTO categories (key, name_en, name_am, desc_en, desc_am, price_cents, online_bookable, sort_order) VALUES (?,?,?,?,?,?,?,?)`)
      .run(d.key, d.name.en, d.name.am, d.description?.en ?? null, d.description?.am ?? null, toCents(d.price), d.onlineBookable ? true : false, d.sortOrder);
    const c = await Categories.byId(Number(info.lastInsertRowid));
    await audit({ actor: actor.id, action: 'category.created', entity: 'Category', entityId: c.id, meta: d });
    return c;
  } catch (e) { return uniqueToTaken(e); }
}
export async function updateCategory(id, d, actor) {
  const cur = await Categories.byId(id);
  if (!cur) throw new AppError('NOT_FOUND', 404);
  await sql(`UPDATE categories SET name_en = ?, name_am = ?, desc_en = ?, desc_am = ?, price_cents = ?, online_bookable = ?, active = ?, sort_order = ? WHERE id = ?`)
    .run(d.name?.en ?? cur.name.en, d.name?.am ?? cur.name.am, d.description?.en ?? cur.description.en, d.description?.am ?? cur.description.am,
      d.price != null ? toCents(d.price) : toCents(cur.price), (d.onlineBookable ?? cur.onlineBookable) ? true : false, (d.active ?? cur.active) ? true : false, d.sortOrder ?? cur.sortOrder, id);
  await audit({ actor: actor.id, action: 'category.updated', entity: 'Category', entityId: id, meta: d });
  return await Categories.byId(id);
}
export const retireCategory = async (id, actor) => await updateCategory(id, { active: false }, actor);

// ---- staff (FR-ACC-002) ----
export const listStaff = async () => {
  const rows = await sql(`SELECT id FROM users WHERE role != 'visitor' ORDER BY role, name`).all();
  return Promise.all(rows.map((r) => Users.byId(r.id)));
};
export async function createStaff(d, actor) {
  try {
    const info = await sql(`INSERT INTO users (name, email, phone, password_hash, role, email_verified, phone_verified) VALUES (?,?,?,?,?,true,true)`)
      .run(d.name.trim(), d.email.trim(), d.phone.trim(), await bcrypt.hash(d.password, 10), d.role);
    await audit({ actor: actor.id, action: 'staff.created', entity: 'User', entityId: Number(info.lastInsertRowid), meta: { role: d.role } });
    return await Users.byId(Number(info.lastInsertRowid));
  } catch (e) { return uniqueToTaken(e); }
}
export async function updateStaff(id, d, actor) {
  const u = await Users.byId(id);
  if (!u || u.role === 'visitor') throw new AppError('NOT_FOUND', 404);
  if (u.id === actor.id && d.active === false) throw new AppError('FORBIDDEN', 403);
  if (typeof d.active === 'boolean') await sql('UPDATE users SET active = ? WHERE id = ?').run(d.active ? true : false, id);
  if (d.password) await sql('UPDATE users SET password_hash = ? WHERE id = ?').run(await bcrypt.hash(d.password, 10), id);
  await audit({ actor: actor.id, action: 'staff.updated', entity: 'User', entityId: id, meta: { active: d.active, passwordReset: !!d.password } });
  return await Users.byId(id);
}

// ---- audit log ----
export async function auditLogs(prefix) {
  const like = prefix ? `${String(prefix).replace(/[^a-z._]/gi, '')}%` : '%';
  const rows = await sql(`SELECT a.*, u.name AS actor_name, u.role AS actor_role FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
              WHERE a.action LIKE ? ORDER BY a.id DESC LIMIT 200`).all(like);
  return rows.map((a) => ({
    id: a.id, at: a.at, actor: a.actor_id ? { name: a.actor_name, role: a.actor_role } : null, action: a.action, entity: a.entity,
    amount: a.amount_cents == null ? null : a.amount_cents / 100, bookingRefs: a.booking_refs ? JSON.parse(a.booking_refs) : [],
  }));
}

// ---- refunds that need a person (Chapa rejected the call, duplicate reference, provider reversed it) ----
export async function listRefunds(filter = 'attention') {
  const where = filter === 'all' ? '1=1' : `(r.status != 'done' OR r.needs_review = true)`;
  const rows = await sql(`SELECT r.*, b.ref AS booking_ref, u.name AS visitor_name, u.phone AS visitor_phone FROM refunds r
              JOIN bookings b ON b.id = r.booking_id JOIN users u ON u.id = b.visitor_id WHERE ${where} ORDER BY r.id DESC LIMIT 200`).all();
  return rows.map((r) => ({
    id: r.id, bookingRef: r.booking_ref, visitor: r.visitor_name, phone: r.visitor_phone, reason: r.reason, status: r.status, needsReview: !!r.needs_review,
    gross: r.gross_cents / 100, feeWithheld: r.fee_share_cents / 100, netToVisitor: r.net_cents / 100, providerRefundRef: r.provider_refund_ref,
    attempts: r.attempts, lastError: r.last_error, createdAt: r.created_at,
  }));
}
export async function retryRefund(id, actor) {
  const r = await sql('SELECT * FROM refunds WHERE id = ?').get(id);
  if (!r) throw new AppError('NOT_FOUND', 404);
  if (r.status === 'done') throw new AppError('BAD_STATE');
  await sql('UPDATE refunds SET needs_review = false WHERE id = ?').run(id);
  await audit({ actor: actor.id, action: 'refund.retry', entity: 'Refund', entityId: id });
  await dispatchRefund(id);
  return (await listRefunds('all')).find((x) => x.id === id);
}
/** The refund was paid by hand (e.g. from the Chapa dashboard): record the reference and close it. */
export async function resolveRefund(id, reference, actor) {
  const r = await sql('SELECT * FROM refunds WHERE id = ?').get(id);
  if (!r) throw new AppError('NOT_FOUND', 404);
  await sql(`UPDATE refunds SET status = 'done', needs_review = false, provider_refund_ref = ?, last_error = NULL WHERE id = ?`).run(reference, id);
  await audit({ actor: actor.id, action: 'refund.resolved_manually', entity: 'Refund', entityId: id, amountCents: r.net_cents, meta: { reference } });
  return (await listRefunds('all')).find((x) => x.id === id);
}
