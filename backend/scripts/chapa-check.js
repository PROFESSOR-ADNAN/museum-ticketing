// Run:  npm run chapa:check     — proves your Chapa key works and prints what to configure in the Chapa dashboard.
import { assertConfig, config } from '../src/config.js';
import { getProvider } from '../src/services/payments/index.js';

try { assertConfig(); } catch (e) { console.error('✗', e.message); process.exit(1); }
const p = getProvider();
console.log(`Chapa key mode : ${p.mode.toUpperCase()}  (${p.mode === 'test' ? 'no real money moves' : 'REAL MONEY'})`);
const r = await p.ping();
console.log(`Chapa API      : ${r.ok ? '✓ key accepted' : '✗ ' + r.message}`);
if (!r.ok && r.status === 0) console.log('                 (could not reach Chapa: check the internet connection, or CHAPA_BASE_URL if you use the simulator)');
if (!r.ok && r.status === 401) console.log('                 (Chapa rejected the key: copy it again from Dashboard → Settings → API; test and live keys differ)');
console.log('\nIn the Chapa dashboard → Settings → Webhooks enter:');
console.log(`  Webhook URL : ${config.publicApiUrl}/api/payments/chapa/webhook`);
console.log(`  Secret hash : (the value of CHAPA_WEBHOOK_SECRET — ${config.chapa.webhookSecret ? 'set ✓' : 'NOT SET ✗'})`);
if (!config.publicApiUrl.startsWith('https://')) console.log('\n⚠ PUBLIC_API_URL is not https. Chapa can still complete payments, but it cannot call your webhook or redirect people back here until the API has a public https address (ngrok / cloudflared).');
process.exit(r.ok ? 0 : 1);
