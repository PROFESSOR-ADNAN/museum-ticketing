import { sql } from '../db/index.js';
import { Bookings, Users, audit } from '../db/repo.js';
import { config } from '../config.js';
import { addisDateOf } from '../utils/dates.js';
import { sendEmail, sendSms } from './notifier.js';
import { noShowNotice, bilingual } from './documents.js';
import { issueRefund, reconcileRefunds } from './refundService.js';

/**
 * FR-PAY-005, in three passes:
 *  1. Pending bookings whose date has passed get a notice (email primary, SMS too) — once.
 *  2. Bookings still Pending one week after the notice are fully auto-refunded -> status Refunded.
 *  3. Refund housekeeping: ask the provider how in-flight refunds ended; retry the ones that failed temporarily.
 */
export async function runNoShowJob(now = new Date()) {
  const today = addisDateOf(now);
  const report = { noticed: 0, refunded: 0, retried: 0, errors: 0 };

  for (const { id } of sql(`SELECT id FROM bookings WHERE status = 'Pending' AND visit_date < ? AND no_show_notice_at IS NULL`).all(today)) {
    const claimed = sql(`UPDATE bookings SET no_show_notice_at = ? WHERE id = ? AND status = 'Pending' AND no_show_notice_at IS NULL`).run(now.toISOString(), id);
    if (!claimed.changes) continue;
    const b = Bookings.get(id);
    const user = Users.byId(b.visitor.id);
    const n = noShowNotice(b, config.noShowGraceDays);
    await sendEmail({ user, booking: b, to: user.email, subject: `${n.subject.en} / ${n.subject.am}`, body: bilingual(n.body), kind: 'no_show_notice' });
    await sendSms({ user, booking: b, to: user.phone, body: bilingual(n.body), kind: 'no_show_notice' });
    report.noticed++;
  }

  const cutoff = new Date(now.getTime() - config.noShowGraceDays * 86400000).toISOString();
  for (const { id } of sql(`SELECT id FROM bookings WHERE status = 'Pending' AND no_show_notice_at IS NOT NULL AND no_show_notice_at <= ?`).all(cutoff)) {
    try { await issueRefund(id, 'no_response', null); report.refunded++; }
    catch (e) { report.errors++; console.error('[no-show refund]', id, e.message); }
  }
  report.retried = (await reconcileRefunds()).retried;
  if (report.noticed || report.refunded) audit({ action: 'job.no_show', meta: report });
  return report;
}
