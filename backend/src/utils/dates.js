/** Dates: visit dates are plain 'YYYY-MM-DD' strings in Africa/Addis_Ababa (UTC+3). */
const OFFSET_MS = 3 * 3600 * 1000;
export const addisDateOf = (d = new Date()) => new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
export const isValidDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))
  && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
export const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

/**
 * NFR-RETENTION-001 / FR-REPORT-002: fiscal year. Ethiopian federal FY is Hamle 1 - Sene 30,
 * approximated here as Jul 8 - Jul 7 (Gregorian). CONFIRM with Finance Office (SRS open question 1).
 */
export const FISCAL_START = { month: 7, day: 8 };
export function fiscalYearOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const startYear = (m > FISCAL_START.month || (m === FISCAL_START.month && d >= FISCAL_START.day)) ? y : y - 1;
  return `FY ${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}
export function weekStartOf(dateStr) { // Monday
  const d = new Date(dateStr + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}
export function periodKey(dateStr, granularity) {
  switch (granularity) {
    case 'day': return dateStr;
    case 'week': return weekStartOf(dateStr);
    case 'month': return dateStr.slice(0, 7);
    case 'year': return fiscalYearOf(dateStr);
    default: throw new Error('bad granularity');
  }
}
