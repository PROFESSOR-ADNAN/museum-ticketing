// Calendar helpers — plain JavaScript (no phone APIs) so they can be unit-tested in Node.
// Dates are 'YYYY-MM-DD' strings (the museum's calendar day); weeks start on Monday.
export const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  am: ['ጃንዩወሪ', 'ፌብሩወሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር'],
};
export const WEEKDAYS = { // Monday first
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  am: ['ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓር', 'ቅዳ', 'እሑ'],
};
const WEEKDAYS_LONG = { // Sunday first (matches Date#getUTCDay)
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  am: ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'],
};

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;                     // m is 0-11
export const parseISO = (s) => { const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return r ? { y: +r[1], m: +r[2] - 1, d: +r[3] } : null; };
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
export const firstWeekday = (y, m) => (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;   // Monday = 0 … Sunday = 6
export const addMonths = (y, m, n) => { const t = y * 12 + m + n; return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; };
/** Today in Addis Ababa (UTC+3), used only until the server tells us its own "today". */
export const addisToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * One month as weeks of 7 cells. A cell is null (blank) or
 * { iso, day, disabled, closed, isToday, selected }.  `disabled` covers: before min, after max, closed by the museum, or explicitly blocked.
 */
export function monthGrid(y, m, { min, max, closed = [], blocked = [], today, selected } = {}) {
  const cells = Array(firstWeekday(y, m)).fill(null);
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const iso = toISO(y, m, d);
    const isClosed = closed.includes(iso);
    cells.push({ iso, day: d, closed: isClosed, isToday: iso === today, selected: iso === selected,
      disabled: isClosed || blocked.includes(iso) || !!(min && iso < min) || !!(max && iso > max) });
  }
  while (cells.length % 7) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Can the user page to this month at all? (any day of it within min..max) */
export const monthAllowed = (y, m, { min, max } = {}) =>
  (!min || toISO(y, m, daysInMonth(y, m)) >= min) && (!max || toISO(y, m, 1) <= max);

export function formatLong(iso, lang = 'en') {
  const p = parseISO(iso);
  if (!p) return '';
  const wd = new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay();
  return `${WEEKDAYS_LONG[lang][wd]}, ${p.d} ${MONTHS[lang][p.m]} ${p.y}`;
}
