import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { asyncHandler as handle } from '../utils/AppError.js';
import * as Admin from '../services/adminService.js';
import { runNoShowJob } from '../services/noShowJob.js';
import { backupTo } from '../services/backup.js';
import { addisDateOf } from '../utils/dates.js';

const bi = z.object({ en: z.string().min(1), am: z.string().min(1) });
const biOptional = z.object({ en: z.string(), am: z.string() });
const createCategorySchema = z.object({
  key: z.string().min(2).max(40).regex(/^[a-z0-9_]+$/), name: bi, description: biOptional.optional(), price: z.number().min(0),
  onlineBookable: z.boolean().default(true), sortOrder: z.number().default(0),
});
const updateCategorySchema = z.object({
  name: bi.optional(), description: biOptional.optional(), price: z.number().min(0).optional(),
  onlineBookable: z.boolean().optional(), active: z.boolean().optional(), sortOrder: z.number().optional(),
});
const createStaffSchema = z.object({
  name: z.string().min(2), email: z.string().email(), phone: z.string().regex(/^\+?[0-9]{9,15}$/),
  password: z.string().min(8), role: z.enum(['cashier', 'manager', 'admin']),
});
const updateStaffSchema = z.object({ active: z.boolean().optional(), password: z.string().min(8).optional() });
const resolveSchema = z.object({ reference: z.string().min(3).max(100) });

// ---- categories (FR-CAT-002: only the Admin changes prices; issued bookings keep their snapshot) ----
export const listCategories = (_req, res) => res.json({ categories: Admin.listCategories() });
export const createCategory = handle((req, res) => res.status(201).json({ category: Admin.createCategory(createCategorySchema.parse(req.body), req.user) }));
export const updateCategory = handle((req, res) => res.json({ category: Admin.updateCategory(Number(req.params.id), updateCategorySchema.parse(req.body), req.user) }));
export const retireCategory = (req, res) => res.json({ category: Admin.retireCategory(Number(req.params.id), req.user) });   // "retire", never delete

// ---- staff accounts (FR-ACC-002) ----
export const listStaff = (_req, res) => res.json({ staff: Admin.listStaff() });
export const createStaff = handle(async (req, res) => res.status(201).json({ user: await Admin.createStaff(createStaffSchema.parse(req.body), req.user) }));
export const updateStaff = handle(async (req, res) => res.json({ user: await Admin.updateStaff(Number(req.params.id), updateStaffSchema.parse(req.body), req.user) }));

// ---- audit log and refunds that need a person ----
export const auditLog = (req, res) => res.json({ logs: Admin.auditLogs(req.query.action ? String(req.query.action) : undefined) });
export const listRefunds = (req, res) => res.json({ refunds: Admin.listRefunds(req.query.filter === 'all' ? 'all' : 'attention') });
export const retryRefund = handle(async (req, res) => res.json({ refund: await Admin.retryRefund(Number(req.params.id), req.user) }));
export const resolveRefund = handle((req, res) => res.json({ refund: Admin.resolveRefund(Number(req.params.id), resolveSchema.parse(req.body).reference, req.user) }));

// A consistent copy of the whole database (contains personal data and password hashes: admin only)
export const downloadBackup = handle(async (_req, res) => {
  const tmp = path.join(os.tmpdir(), `museum-backup-${Date.now()}.sqlite`);
  await backupTo(tmp);
  res.download(tmp, `museum-backup-${addisDateOf()}.sqlite`, () => fs.unlink(tmp, () => {}));
});
export const runNoShow = handle(async (_req, res) => res.json({ result: await runNoShowJob() }));
