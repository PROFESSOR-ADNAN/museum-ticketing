import { z } from 'zod';
import { sql } from '../db/index.js';
import { Bookings, Settlements, Users, hydrateBookings, mapRefund, mapSettlement } from '../db/repo.js';
import { AppError, asyncHandler as handle } from '../utils/AppError.js';
import { isValidDateStr } from '../utils/dates.js';
import { correctCategory, createWalkInSale, recordAttendance } from '../services/bookingService.js';
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
const walkInSchema = z.object({
  lines: z.array(z.object({
    categoryId: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1),
  paymentMethod: z.enum(['cash', 'qr']).default('cash'),
  cashReason: z.string().optional(),
  buyerName: z.string().optional(),
  buyerPhone: z.string().optional(),
  admitImmediately: z.boolean().default(true),
});
const correctionSchema = z.object({
  fromCategoryId: z.number().int().positive(),
  toCategoryId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  reason: z.enum(['wrong_category', 'wrong_headcount', 'walk_up_addition', 'other']).default('wrong_category'),
  evidence: z.string().optional(),
});

// FR-TICKET-001 / 004: by reference, or by name / email / phone when the visitor lost the reference
export const lookupBookings = handle(async (req, res) => res.json({ bookings: await lookup(lookupSchema.parse(req.query)) }));
export const todayBookings = handle(async (_req, res) => res.json({ bookings: await todaysBookings() }));

// QR / reference check: "has this visitor paid, and were they already let in?"
export const verifyTicket = handle(async (req, res) => res.json(await checkTicket(verifySchema.parse(req.body).code, req.user)));

// FR-TICKET-001..003, 005
export const attendance = handle(async (req, res) => {
  const d = attendanceSchema.parse(req.body);
  const row = await Bookings.rowByRef(req.params.ref);
  if (!row) throw new AppError('NOT_FOUND', 404);
  const b = await recordAttendance(row, d, req.user);
  res.json({ booking: b, shortfall: b.amount - b.attendedAmount });
});

// Offline support for the mobile app: download today's list while online ...
export const downloadGateList = handle(async (req, res) => {
  const date = req.query.date ? String(req.query.date) : undefined;
  if (date && !isValidDateStr(date)) throw new AppError('BAD_DATE');
  res.json(await gateList(date));
});
// ... and upload admissions that were recorded without internet.
export const syncAdmissions = handle(async (req, res) => res.json({ results: await syncAttendance(syncSchema.parse(req.body).items, req.user) }));

// FR-REPORT-003: what a transfer would include right now
export const pendingTransfer = handle(async (_req, res) => {
  const p = await pendingSettlement();
  res.json({ bookings: await hydrateBookings(p.bookings), refundDeductions: p.refunds.map(mapRefund), gross: p.gross / 100, deduction: p.deduction / 100, net: p.net / 100 });
});
export const transfer = handle(async (req, res) => {                     // FR-SETTLE-001/002
  const s = await createSettlement(req.user);
  res.status(201).json({ settlement: s, receipt: transferReceipt(s, req.user) });
});
export const listTransfers = handle(async (_req, res) => {
  const rows = await sql('SELECT * FROM settlements ORDER BY id DESC LIMIT 50').all();
  const settlements = await Promise.all(rows.map((r) => mapSettlement(r)));
  res.json({ settlements });
});
export const getTransfer = handle(async (req, res) => {
  const row = await Settlements.row(Number(req.params.id));
  if (!row) throw new AppError('NOT_FOUND', 404);
  const mapped = await mapSettlement(row);
  const cashier = await Users.byId(row.cashier_id);
  res.json({ settlement: mapped, receipt: transferReceipt(mapped, cashier) });
});

export const walkIn = handle(async (req, res) => {
  const d = walkInSchema.parse(req.body);
  const result = await createWalkInSale({ ...d, cashier: req.user });
  res.status(201).json(result);
});

export const categoryCorrection = handle(async (req, res) => {
  const d = correctionSchema.parse(req.body);
  const result = await correctCategory(req.params.ref, { ...d, cashier: req.user });
  res.json(result);
});
