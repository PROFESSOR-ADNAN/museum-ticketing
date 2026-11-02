import { z } from 'zod';
import { AppError, asyncHandler as handle } from '../utils/AppError.js';
import { EXPORT_KINDS, dashboard, exportCsv, summary } from '../services/reportService.js';

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const summarySchema = z.object({ granularity: z.enum(['day', 'week', 'month', 'year']).default('day'), from: day.optional(), to: day.optional() });
const rangeSchema = z.object({ from: day.optional(), to: day.optional() });

export const dashboardReport = handle(async (_req, res) => res.json(await dashboard()));
export const summaryReport = handle(async (req, res) => {
  const q = summarySchema.parse(req.query);
  res.json({ granularity: q.granularity, rows: await summary(q) });
});
export const exportKinds = (_req, res) => res.json({ kinds: EXPORT_KINDS });
export const exportData = handle(async (req, res) => {
  const out = await exportCsv(req.params.kind, rangeSchema.parse(req.query));
  if (!out) throw new AppError('NOT_FOUND', 404);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${out.filename}"`, 'X-Row-Count': String(out.count) }).send(out.csv);
});
