import cron from 'node-cron';
import { runNoShowJob } from './noShowJob.js';
import { reconcileRefunds } from './refundService.js';
import { runBackup } from './backup.js';

export function scheduleJobs() {
  const guard = (name, fn) => () => Promise.resolve(fn()).catch((e) => console.error(`[job ${name}]`, e));
  cron.schedule('0 6 * * *', guard('no-show', () => runNoShowJob()), { timezone: 'Africa/Addis_Ababa' });
  cron.schedule('*/10 * * * *', guard('refunds', () => reconcileRefunds()));
  cron.schedule('0 2 * * *', guard('backup', async () => console.log('[backup]', await runBackup())), { timezone: 'Africa/Addis_Ababa' });
}
