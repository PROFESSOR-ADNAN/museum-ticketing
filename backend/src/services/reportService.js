import { sql } from '../db/index.js';
import { addisDateOf, periodKey } from '../utils/dates.js';
import { fromCents } from '../utils/money.js';

const DAY = `date(b.visited_at, '+3 hours')`;          // Addis Ababa calendar day of the visit
const empty = (period) => ({ period, visitors: 0, revenue: 0, individual: 0, group: 0, byCategory: {}, bySchool: {} });

/** Visited bookings, grouped by day first (3 small SQL queries), then folded into any period in JS (week / month / fiscal year). */
async function dayRows({ from, to } = {}) {
  let range = '';
  const args = [];
  if (from) {
    range += ` AND ${DAY} >= ?`;
    args.push(from);
  }
  if (to) {
    range += ` AND ${DAY} <= ?`;
    args.push(to);
  }
  const byKind = await sql(`SELECT ${DAY} AS day, b.kind, SUM(b.attended_quantity) AS visitors, SUM(b.attended_amount_cents) AS cents
                      FROM bookings b WHERE b.status = 'Visited'${range} GROUP BY ${DAY}, b.kind`).all(...args);
  const byCat = await sql(`SELECT ${DAY} AS day, l.key, l.name_en, l.name_am, SUM(l.attended_quantity) AS visitors, SUM(l.attended_quantity * l.unit_price_cents) AS cents
                     FROM booking_lines l JOIN bookings b ON b.id = l.booking_id WHERE b.status = 'Visited'${range} GROUP BY ${DAY}, l.key, l.name_en, l.name_am`).all(...args);
  const bySchool = await sql(`SELECT ${DAY} AS day, b.organization AS org, SUM(b.attended_quantity) AS visitors
                        FROM bookings b WHERE b.status = 'Visited' AND b.kind = 'group' AND b.organization IS NOT NULL${range} GROUP BY ${DAY}, b.organization`).all(...args);
  return { byKind, byCat, bySchool };
}

function fold({ byKind, byCat, bySchool }, keyFn) {
  const rows = new Map();
  const row = (k) => rows.get(k) || rows.set(k, empty(k)).get(k);
  for (const r of byKind) { const x = row(keyFn(r.day)); x.visitors += Number(r.visitors || 0); x.revenue += fromCents(Number(r.cents || 0)); x[r.kind] += Number(r.visitors || 0); }
  for (const r of byCat) {
    const x = row(keyFn(r.day)); const c = (x.byCategory[r.key] ||= { visitors: 0, revenue: 0, name: { en: r.name_en, am: r.name_am } });
    c.visitors += Number(r.visitors || 0); c.revenue += fromCents(Number(r.cents || 0));
  }
  for (const r of bySchool) { const x = row(keyFn(r.day)); (x.bySchool[r.org] ||= { visitors: 0 }).visitors += Number(r.visitors || 0); }
  return [...rows.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export async function summary({ granularity = 'day', from, to }) {
  return fold(await dayRows({ from, to }), (day) => periodKey(day, granularity));
}

/** FR-REPORT-001 */
export async function dashboard() {
  const today = addisDateOf();
  const days = await dayRows({});
  const allTime = fold(days, () => 'all')[0] || empty('all');
  const todayRow = fold(days, (d) => d).find((r) => r.period === today) || empty(today);
  const statusMix = Object.fromEntries(['Pending', 'Visited', 'Cancelled', 'Refunded'].map((s) => [s, 0]));
  const statusRows = await sql('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status').all();
  for (const s of statusRows) if (s.status in statusMix) statusMix[s.status] = Number(s.n || 0);
  const heldRow = await sql(`SELECT COALESCE(SUM(amount_cents - attended_amount_cents), 0) AS c FROM bookings WHERE status = 'Visited' AND shortfall_refunded = 0`).get();
  const held = Number(heldRow?.c || 0);
  const open = await sql(`SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS c FROM bookings WHERE status = 'Visited' AND settlement_id IS NULL`).get();
  const scansRow = await sql(`SELECT COUNT(*) AS n FROM ticket_scans WHERE date(scanned_at, '+3 hours') = ?`).get(today);
  const scansToday = Number(scansRow?.n || 0);
  return { today: todayRow, allTime, statusMix, heldShortfall: fromCents(held), awaitingTransfer: { bookings: Number(open?.n || 0), amount: fromCents(Number(open?.c || 0)) }, scansToday };
}

// ---------- CSV export (opens in Excel; UTF-8 BOM so Amharic text displays correctly) ----------
const EXPORTS = {
  bookings: { view: 'v_bookings', dateExpr: 'visit_date', order: 'visit_date, id' },
  'booking-lines': { view: 'v_booking_lines', dateExpr: 'visit_date', order: 'visit_date, booking_ref' },
  payments: { view: 'v_payments', dateExpr: `date(created_at, '+3 hours')`, order: 'id' },
  refunds: { view: 'v_refunds', dateExpr: `date(created_at, '+3 hours')`, order: 'id' },
  settlements: { view: 'v_settlements', dateExpr: `date(created_at, '+3 hours')`, order: 'id' },
  'daily-revenue': { view: 'v_daily_revenue', dateExpr: 'day', order: 'day' },
  scans: { view: 'v_scans', dateExpr: `date(scanned_at, '+3 hours')`, order: 'id' },
};
export const EXPORT_KINDS = Object.keys(EXPORTS);

const cell = (v) => {
  if (v == null) return '';
  let s = String(v);
  if (/^[=@\t\r]|^[+-](?!\d)/.test(s)) s = `'${s}`;                // stop spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export async function exportCsv(kind, { from, to } = {}) {
  const e = EXPORTS[kind];
  if (!e) return null;
  let q = `SELECT * FROM ${e.view}`;
  const conditions = [];
  const args = [];
  if (from) {
    conditions.push(`${e.dateExpr} >= ?`);
    args.push(from);
  }
  if (to) {
    conditions.push(`${e.dateExpr} <= ?`);
    args.push(to);
  }
  if (conditions.length) {
    q += ' WHERE ' + conditions.join(' AND ');
  }
  q += ` ORDER BY ${e.order}`;
  const rows = await sql(q).all(...args);
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const csv = '\uFEFF' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
  return { filename: `museum-${kind}-${from || 'start'}_to_${to || addisDateOf()}.csv`, csv, count: rows.length };
}
