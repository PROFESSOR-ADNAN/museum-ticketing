import { z } from 'zod';
import { sql } from '../db/index.js';
import { Bookings, Payments, hydrateBookings } from '../db/repo.js';
import { AppError, asyncHandler as handle } from '../utils/AppError.js';
import { cancelBooking, createBooking, receiptFor, reschedule } from '../services/bookingService.js';
import { initiatePayment, refreshStatus } from '../services/paymentService.js';
import { ProviderError } from '../services/payments/chapa.js';
import { issueRefund } from '../services/refundService.js';
import { config } from '../config.js';

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const lineSchema = z.object({ categoryId: z.number().int().positive(), quantity: z.number().int().min(1).max(config.maxQuantityPerLine) });
const individualSchema = z.object({ visitDate: dateStr, lines: z.array(lineSchema).min(1).max(10) });
const groupSchema = individualSchema.extend({
  organization: z.string().min(2).max(150), timeSlot: z.string().min(3).max(40),
  contactName: z.string().min(2).max(100).optional(), contactPhone: z.string().min(6).max(20).optional(),
});
const paySchema = z.object({ returnUrl: z.string().max(500).optional() });
const rescheduleSchema = z.object({ visitDate: dateStr });

// ---- authorization helpers: a booking is visible to its owner and to cashiers/managers; only the owner may change it ----
const isStaff = (u) => ['cashier', 'manager'].includes(u.role);
function loadRow(req) {                                           // :id is the numeric id or the MSB-… reference
  const id = req.params.id;
  const row = /^\d+$/.test(id) ? Bookings.row(Number(id)) : Bookings.rowByRef(id);
  if (!row || (row.visitor_id !== req.user.id && !isStaff(req.user))) throw new AppError('NOT_FOUND', 404);
  return row;
}
function loadOwned(req) {
  const row = loadRow(req);
  if (row.visitor_id !== req.user.id) throw new AppError('FORBIDDEN', 403);
  return row;
}
const paymentUnavailable = (e) => {
  if (!(e instanceof ProviderError)) return e;
  console.error('[payment provider]', e.message);
  return new AppError('PAYMENT_UNAVAILABLE', 502);
};

export const create = handle((req, res) =>                        // FR-BOOK-001
  res.status(201).json({ booking: createBooking({ visitor: req.user, kind: 'individual', ...individualSchema.parse(req.body) }) }));

export const createGroup = handle((req, res) =>                   // FR-BOOK-003 (goes to the Manager for approval)
  res.status(201).json({ booking: createBooking({ visitor: req.user, kind: 'group', ...groupSchema.parse(req.body) }) }));

export const list = handle((req, res) => {                        // FR-ACC-004
  const all = isStaff(req.user) && req.query.all === '1';
  const status = req.query.status ? String(req.query.status) : null;
  const rows = sql(`SELECT * FROM bookings WHERE (? = 1 OR visitor_id = ?) AND (? IS NULL OR status = ?) ORDER BY id DESC LIMIT 100`)
    .all(all ? 1 : 0, req.user.id, status, status);
  res.json({ bookings: hydrateBookings(rows) });
});

export const get = handle((req, res) => {
  const row = loadRow(req);
  const p = Payments.latestForBooking(row.id);
  res.json({ booking: hydrateBookings([row])[0], payment: p && { status: p.status, providerRef: p.provider_ref } });
});

export const receipt = handle((req, res) => res.json({ receipt: receiptFor(loadRow(req)) }));

export const pay = handle(async (req, res) => {                   // FR-PAY-001/002
  const row = loadOwned(req);
  const { returnUrl } = paySchema.parse(req.body || {});
  try {
    const p = await initiatePayment(row, req.user, returnUrl);
    res.json({ checkoutUrl: p.checkoutUrl, providerRef: p.providerRef });
  } catch (e) { throw paymentUnavailable(e); }
});

// The app polls this after the checkout page: the answer comes from the payment provider, never from the client.
export const paymentStatus = handle(async (req, res) => {
  try { res.json(await refreshStatus(loadRow(req))); } catch (e) { throw paymentUnavailable(e); }
});

export const cancel = handle(async (req, res) => {               // FR-BOOK-005/006
  const out = await cancelBooking(loadOwned(req), req.user);
  res.json({ booking: out.booking, refund: out.refund });
});

export const rescheduleBooking = handle((req, res) =>            // FR-BOOK-007
  res.json({ booking: reschedule(loadOwned(req), rescheduleSchema.parse(req.body).visitDate) }));

export const refundRequest = handle(async (req, res) => {        // FR-TICKET-002: refund of the unattended part
  const row = loadOwned(req);
  const refund = await issueRefund(row.id, 'shortfall', req.user);
  res.json({ booking: Bookings.get(row.id), refund });
});
