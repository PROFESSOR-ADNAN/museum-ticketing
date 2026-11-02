import { z } from 'zod';
import { asyncHandler as handle } from '../utils/AppError.js';
import * as Manager from '../services/managerService.js';

const closeSchema = z.object({ date: z.string(), reason: z.string().max(200).optional() });
const noteSchema = z.object({ note: z.string().max(300).optional() });
const recordSchema = z.object({
  visitorEmail: z.string().email(), visitDate: z.string(), timeSlot: z.string().min(3), organization: z.string().min(2),
  lines: z.array(z.object({ categoryId: z.number().int().positive(), quantity: z.number().int().min(1) })).min(1),
  contactName: z.string().optional(), contactPhone: z.string().optional(), approve: z.boolean().default(true),
});

export const listClosures = handle(async (_req, res) => res.json({ closures: await Manager.listClosures() }));
export const closeDate = handle(async (req, res) => res.status(201).json({ closure: await Manager.closeDate(closeSchema.parse(req.body), req.user) }));
export const reopenDate = handle(async (req, res) => { await Manager.reopenDate(req.params.date, req.user); res.json({ ok: true }); });

export const listGroupRequests = handle(async (req, res) => res.json({ bookings: await Manager.listGroupRequests(req.query.status ? String(req.query.status) : undefined) }));
const decide = (approve) => handle(async (req, res) =>
  res.json({ booking: await Manager.decideGroup(Number(req.params.id), approve, noteSchema.parse(req.body || {}).note, req.user) }));
export const approveGroup = decide(true);
export const declineGroup = decide(false);
export const recordGroup = handle(async (req, res) => res.status(201).json({ booking: await Manager.createGroupOnBehalf(recordSchema.parse(req.body), req.user) }));
