import { sql } from '../db/index.js';
import { addisDateOf, periodKey } from '../utils/dates.js';
import { fromCents } from '../utils/money.js';

const DAY = `date(b.visited_at, '+3 hours')`;          // Addis Ababa calendar day of the visit
const empty = (period) => ({ period, visitors: 0, revenue: 0, individual: 0, group: 0, byCategory: {}, bySchool: {} });

/** Visited bookings, grouped by day first (3 small SQL queries), then folded into any period in JS (week / month / fiscal year). */
function dayRows({ from, to }) {
  const range = `AND ${DAY} >= COALESCE(?, '0000-00-00') AND ${DAY} <= COALESCE(?, '9999-99-99')`;
  const args = [from ?? null, to ?? null];
  const byKind = sql(`SELECT ${DAY} AS day, b.kind, SUM(b.attended_quantity) AS visitors, SUM(b.attended_amount_cents) AS cents
                      FROM bookings b WHERE b.status = 'Visited' ${range} GROUP BY day, b.kind`).all(...args);
  const byCat = sql(`SELECT ${DAY} AS day, l.key, l.name_en, l.name_am, SUM(l.attended_quantity) AS visitors, SUM(l.attended_quantity * l.unit_price_cents) AS cents
                     FROM booking_lines l JOIN bookings b ON b.id = l.booking_id WHERE b.status = 'Visited' ${range} GROUP BY day, l.key`).all(...args);
  const bySchool = sql(`SELECT ${DAY} AS day, b.organization AS org, SUM(b.attended_quantity) AS visitors
                        FROM bookings b WHERE b.status = 'Visited' AND b.kind = 'group' AND b.organization IS NOT NULL ${range} GROUP BY day, org`).all(...args);
  return { byKind, byCat, bySchool };
}

function fold({ byKind, byCat, bySchool }, keyFn) {
  const rows = new Map();
  const row = (k) => rows.get(k) || rows.set(k, empty(k)).get(k);
  for (const r of byKind) { const x = row(keyFn(r.day)); x.visitors += r.visitors; x.revenue += fromCents(r.cents); x[r.kind] += r.visitors; }
  for (const r of byCat) {
    const x = row(keyFn(r.day)); const c = (x.byCategory[r.key] ||= { visitors: 0, revenue: 0, name: { en: r.name_en, am: r.name_am } });
    c.visitors += r.visitors; c.revenue += fromCents(r.cents);
  }
  for (const r of bySchool) { const x = row(keyFn(r.day)); (x.bySchool[r.org] ||= { visitors: 0 }).visitors += r.visitors; }
  return [...rows.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export function summary({ granularity = 'day', from, to }) {
  return fold(dayRows({ from, to }), (day) => periodKey(day, granularity));
}

/** FR-REPORT-001 */
export function dashboard() {
  const today = addisDateOf();
  const days = dayRows({});
  const allTime = fold(days, () => 'all')[0] || empty('all');
  const todayRow = fold(days, (d) => d).find((r) => r.period === today) || empty(today);
  const statusMix = Object.fromEntries(['Pending', 'Visited', 'Cancelled', 'Refunded'].map((s) => [s, 0]));
  for (const s of sql('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status').all()) if (s.status in statusMix) statusMix[s.status] = s.n;
  const held = sql(`SELECT COALESCE(SUM(amount_cents - attended_amount_cents), 0) AS c FROM bookings WHERE status = 'Visited' AND shortfall_refunded = 0`).get().c;
  const open = sql(`SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS c FROM bookings WHERE status = 'Visited' AND settlement_id IS NULL`).get();
  const scansToday = sql(`SELECT COUNT(*) AS n FROM ticket_scans WHERE date(scanned_at, '+3 hours') = ?`).get(today).n;
  return { today: todayRow, allTime, statusMix, heldShortfall: fromCents(held), awaitingTransfer: { bookings: open.n, amount: fromCents(open.c) }, scansToday };
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
export function exportCsv(kind, { from, to } = {}) {
  const e = EXPORTS[kind];
  if (!e) return null;
  const rows = sql(`SELECT * FROM ${e.view} WHERE ${e.dateExpr} >= COALESCE(?, '0000-00-00') AND ${e.dateExpr} <= COALESCE(?, '9999-99-99') ORDER BY ${e.order}`).all(from ?? null, to ?? null);
  const cols = rows.length ? Object.keys(rows[0]) : (sql(`SELECT * FROM ${e.view} LIMIT 0`).columns().map((c) => c.name));
  const csv = '\uFEFF' + [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n') + '\r\n';
  return { filename: `museum-${kind}-${from || 'start'}_to_${to || addisDateOf()}.csv`, csv, count: rows.length };
}
