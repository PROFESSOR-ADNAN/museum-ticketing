import { createApp } from './app.js';
import { openDb } from './db/index.js';
import { assertConfig, config } from './config.js';
import { getProvider } from './services/payments/index.js';
import { publicKeyBase64 } from './services/ticketToken.js';
import { scheduleJobs } from './services/jobs.js';

try { assertConfig(); } catch (e) { console.error(`\n✗ ${e.message}\n\nFix backend/.env and start again (see docs/14-chapa-setup-and-testing.md).`); process.exit(1); }
openDb();
publicKeyBase64();                       // creates the QR signing key on first start
scheduleJobs();
createApp().listen(config.port, () => {
  const p = getProvider();
  console.log(`[api] listening on :${config.port}   database: ${config.dbPath}`);
  console.log(`[chapa] ${p.mode.toUpperCase()} mode.  Webhook URL to enter in the Chapa dashboard: ${config.publicApiUrl}/api/payments/chapa/webhook`);
  if (!config.publicApiUrl.startsWith('https://')) console.log('[chapa] NOTE: PUBLIC_API_URL is not https — Chapa cannot reach webhooks/redirects here. Use ngrok/cloudflared (see README).');
});
