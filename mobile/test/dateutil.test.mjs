// The calendar's date maths (pure JavaScript). npm test (in the mobile folder)
import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, daysInMonth, firstWeekday, formatLong, monthAllowed, monthGrid } from '../src/dateutil.js';

test('October 2026 starts on a Thursday and has 31 days; weeks run Monday to Sunday', () => {
  assert.equal(daysInMonth(2026, 9), 31);
  assert.equal(firstWeekday(2026, 9), 3);                                   // Mon = 0 … Thu = 3
  const weeks = monthGrid(2026, 9, {});
  assert.ok(weeks.every((w) => w.length === 7));
  assert.deepEqual(weeks[0].slice(0, 3), [null, null, null]);
  assert.equal(weeks[0][3].iso, '2026-10-01');
  assert.equal(weeks.flat().filter(Boolean).length, 31);
});

test('leap years and month arithmetic', () => {
  assert.equal(daysInMonth(2028, 1), 29);
  assert.equal(daysInMonth(2027, 1), 28);
  assert.deepEqual(addMonths(2026, 11, 1), { y: 2027, m: 0 });
  assert.deepEqual(addMonths(2026, 0, -1), { y: 2025, m: 11 });
});

test('past, too-far, closed and blocked days cannot be picked; today and the selection are marked', () => {
  const weeks = monthGrid(2026, 9, { min: '2026-10-08', max: '2026-10-20', closed: ['2026-10-12'], blocked: ['2026-10-15'], today: '2026-10-08', selected: '2026-10-09' });
  const day = (n) => weeks.flat().find((c) => c?.day === n);
  assert.equal(day(7).disabled, true);                                      // past
  assert.deepEqual([day(8).disabled, day(8).isToday], [false, true]);
  assert.equal(day(9).selected, true);
  assert.deepEqual([day(12).disabled, day(12).closed], [true, true]);       // closed by the museum
  assert.deepEqual([day(15).disabled, day(15).closed], [true, false]);      // blocked (e.g. the current visit date when rescheduling)
  assert.deepEqual([day(20).disabled, day(21).disabled], [false, true]);    // booking window ends
});

test('paging limits and long date text in both languages', () => {
  assert.equal(monthAllowed(2026, 8, { min: '2026-10-08' }), false);        // September is entirely in the past
  assert.equal(monthAllowed(2026, 9, { min: '2026-10-08' }), true);
  assert.equal(monthAllowed(2027, 5, { min: '2026-10-08', max: '2027-04-06' }), false);
  assert.equal(formatLong('2026-10-12', 'en'), 'Monday, 12 October 2026');
  assert.equal(formatLong('2026-10-12', 'am'), 'ሰኞ, 12 ኦክቶበር 2026');
  assert.equal(formatLong('nonsense'), '');
});
