import { z } from 'zod';
import { sql } from '../db/index.js';
import { Bookings, Settlements, Users, hydrateBookings, mapRefund, mapSettlement } from '../db/repo.js';
import { AppError, asyncHandler as handle } from '../utils/AppError.js';
import { isValidDateStr } from '../utils/dates.js';
import { recordAttendance } from '../services/bookingService.js';
import { checkTicket, gateList, lookup, syncAttendance, todaysBookings } from '../services/gateService.js';
import { createSettlement, pendingSettlement } from '../services/settlementService.js';
import { transferReceipt } from '../services/documents.js';

const attended = z.array(z.object({ categoryId: z.number().int().positive(), quantity: z.number().int().min(0) })).min(1);
const lookupSchema = z.object({ ref: z.string().optional(), q: z.string().min(2).optional() });
const verifySchema = z.object({ code: z.string().min(3).max(600) });
const attendanceSchema = z.object({ attendedQuantity: z.number().int().min(1).optional(), attended: attended.optional() });
const syncSchema = z.object({
  items: z.array(z.object({
    clientId: z.string().max(80), ref: z.string().max(20), scannedAt: z.string().max(40).optional(),
    attendedQuantity: z.number().int().min(1).optional(), attended: attended.optional(),
  })).max(500),
});

// FR-TICKET-001 / 004: by reference, or by name / email / phone when the visitor lost the reference
export const lookupBookings = handle((req, res) => res.json({ bookings: lookup(lookupSchema.parse(req.query)) }));
export const todayBookings = (_req, res) => res.json({ bookings: todaysBookings() });

// QR / reference check: "has this visitor paid, and were they already let in?"
export const verifyTicket = handle((req, res) => res.json(checkTicket(verifySchema.parse(req.body).code, req.user)));

// FR-TICKET-001..003, 005
export const attendance = handle((req, res) => {
  const d = attendanceSchema.parse(req.body);
  const row = Bookings.rowByRef(req.params.ref);
  if (!row) throw new AppError('NOT_FOUND', 404);
  const b = recordAttendance(row, d, req.user);
  res.json({ booking: b, shortfall: b.amount - b.attendedAmount });
});

// Offline support for the mobile app: download today's list while online ...
export const downloadGateList = handle((req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  if (date && !isValidDateStr(date)) throw new AppError('BAD_DATE');
  res.json(gateList(date));
});
// ... and upload admissions that were recorded without internet.
export const syncAdmissions = handle((req, res) => res.json({ results: syncAttendance(syncSchema.parse(req.body).items, req.user) }));

// FR-REPORT-003: what a transfer would include right now
export const pendingTransfer = (_req, res) => {
  const p = pendingSettlement();
  res.json({ bookings: hydrateBookings(p.bookings), refundDeductions: p.refunds.map(mapRefund), gross: p.gross / 100, deduction: p.deduction / 100, net: p.net / 100 });
};
export const transfer = handle((req, res) => {                     // FR-SETTLE-001/002
  const s = createSettlement(req.user);
  res.status(201).json({ settlement: s, receipt: transferReceipt(s, req.user) });
});
export const listTransfers = (_req, res) =>
  res.json({ settlements: sql('SELECT * FROM settlements ORDER BY id DESC LIMIT 50').all().map(mapSettlement) });
export const getTransfer = handle((req, res) => {
  const row = Settlements.row(Number(req.params.id));
  if (!row) throw new AppError('NOT_FOUND', 404);
  res.json({ settlement: mapSettlement(row), receipt: transferReceipt(mapSettlement(row), Users.byId(row.cashier_id)) });
});
