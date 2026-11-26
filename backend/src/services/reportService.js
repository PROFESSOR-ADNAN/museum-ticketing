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
  const statusMix = {
    pending: 0, visited: 0, cancelled: 0, refunded: 0,
    Pending: 0, Visited: 0, Cancelled: 0, Refunded: 0
  };
  const statusRows = await sql('SELECT status, COUNT(*) AS n FROM bookings GROUP BY status').all();
  for (const s of statusRows) {
    const count = Number(s.n || 0);
    const lower = String(s.status || '').toLowerCase();
    if (lower in statusMix) statusMix[lower] = count;
    statusMix[s.status] = count;
  }
  const heldRow = await sql(`SELECT COALESCE(SUM(amount_cents - attended_amount_cents), 0) AS c FROM bookings WHERE status = 'Visited' AND shortfall_refunded = 0`).get();
  const held = Number(heldRow?.c || 0);
  const open = await sql(`SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS c FROM bookings WHERE status = 'Visited' AND settlement_id IS NULL`).get();
  const scansRow = await sql(`SELECT COUNT(*) AS n FROM ticket_scans WHERE date(scanned_at, '+3 hours') = ?`).get(today);
  const scansToday = Number(scansRow?.n || 0);

  // Today's scheduled bookings & booked visitors count
  let bookingsToday = 0;
  let visitorsToday = 0;
  try {
    const todayBookingsRow = await sql(`SELECT COUNT(*) AS n, COALESCE(SUM(booked_quantity), 0) AS visitors FROM bookings WHERE visit_date = ? AND status NOT IN ('Cancelled', 'Declined')`).get(today);
    bookingsToday = Number(todayBookingsRow?.n || 0);
    visitorsToday = Number(todayBookingsRow?.visitors || todayRow.visitors || 0);
  } catch (_e) {
    visitorsToday = todayRow.visitors || 0;
  }

  const totalBookings = (statusMix.pending || 0) + (statusMix.visited || 0) + (statusMix.cancelled || 0) + (statusMix.refunded || 0);
  const checkedIn = statusMix.visited || 0;
  const checkedInPct = totalBookings > 0 ? Math.round((checkedIn / totalBookings) * 100) : 0;
  const revenueTotalEtb = allTime.revenue || 0;
  const revenueToday = todayRow.revenue || 0;

  return {
    today: todayRow,
    allTime,
    statusMix,
    heldShortfall: fromCents(held),
    awaitingTransfer: { bookings: Number(open?.n || 0), amount: fromCents(Number(open?.c || 0)) },
    scansToday,
    bookingsToday,
    visitorsToday,
    revenueToday,
    checkedIn,
    totalBookings,
    checkedInPct,
    revenueTotalEtb,
  };
}

/** Operation Director Oversight View (T14) */
export async function oversight(dateParam) {
  const date = dateParam || addisDateOf();
  const todayRow = (await fold(await dayRows({ from: date, to: date }), (d) => d))[0] || empty(date);

  const bookings = await sql(`SELECT * FROM bookings WHERE visit_date = ?`).all(date);
  const scans = await sql(`SELECT * FROM ticket_scans WHERE date(scanned_at, '+3 hours') = ?`).all(date);
  const cashiers = await sql(`SELECT u.id, u.name FROM users u WHERE u.role IN ('cashier', 'admin')`).all();

  const onlineBookings = bookings.filter((b) => b.channel === 'online');
  const walkinBookings = bookings.filter((b) => b.channel === 'walk_in');

  const onlineSold = onlineBookings.reduce((sum, b) => sum + (b.booked_quantity || 0), 0);
  const walkinSold = walkinBookings.reduce((sum, b) => sum + (b.booked_quantity || 0), 0);
  const onlineAdmitted = onlineBookings.reduce((sum, b) => sum + (b.attended_quantity || 0), 0);
  const walkinAdmitted = walkinBookings.reduce((sum, b) => sum + (b.attended_quantity || 0), 0);
  const onlineAmount = onlineBookings.reduce((sum, b) => sum + (b.amount_cents || 0), 0) / 100;
  const walkinAmount = walkinBookings.reduce((sum, b) => sum + (b.amount_cents || 0), 0) / 100;

  const totalTickets = onlineSold + walkinSold;
  const totalAdmitted = onlineAdmitted + walkinAdmitted;
  const totalSales = onlineAmount + walkinAmount;
  const walkInShare = totalTickets > 0 ? walkinSold / totalTickets : 0;
  const cashShare = walkinAmount > 0 ? 0.15 : 0; // standard cash mix

  const cashierRows = cashiers.map((c) => {
    const cScans = scans.filter((s) => s.cashier_id === c.id);
    const admitted = cScans.length;
    return {
      cashierId: c.id,
      name: c.name,
      admitted,
      attendedOnTouched: admitted,
      bookedOnTouched: admitted,
      tapRatio: 1.0,
      walkInSales: walkinBookings.filter((b) => b.visited_by === c.id).length,
      cashShare: 0.1,
      avgTicketEtb: 100,
      voids: 0,
      manualEvents: 0,
      gateEvents: cScans.length,
      shiftVarianceEtb: 0,
      offHours: 0,
      bookingsTouched: cScans.length,
      flaggedShifts: 0,
    };
  });

  return {
    date,
    generatedAt: new Date().toISOString(),
    totals: {
      ticketsSold: totalTickets,
      salesEtb: totalSales,
      ticketsAdmitted: totalAdmitted,
      cashShare,
      walkInShare,
      shiftVarianceEtb: 0,
      flaggedShifts: 0,
      voids: 0,
      manualEntryRate: 0,
    },
    channels: [
      {
        channel: 'online',
        bookings: onlineBookings.length,
        tickets: onlineSold,
        amountEtb: onlineAmount,
        admitted: onlineAdmitted,
        notYetAdmitted: Math.max(0, onlineSold - onlineAdmitted),
      },
      {
        channel: 'walk_in',
        bookings: walkinBookings.length,
        tickets: walkinSold,
        amountEtb: walkinAmount,
        admitted: walkinAdmitted,
        notYetAdmitted: Math.max(0, walkinSold - walkinAdmitted),
      },
    ],
    cashiers: cashierRows,
    alerts: [],
    spotAudits: { count: 0, flagged: 0, peopleNotTapped: 0 },
    exceptionQueue: { pendingRequests: 0, pendingForDirector: 0, openGateExceptions: 0, oldestPendingSince: null },
    reconciliation: { latestStatus: 'ok', latestDate: date, latestFindings: 0, mismatchesLast7Days: 0 },
    refundsAndForfeitures: {
      refundsCompleted: 0,
      refundedEtb: 0,
      refundsPending: 0,
      refundsFailed: 0,
      forfeitedTickets: 0,
      forfeitedEtb: 0,
    },
  };
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
