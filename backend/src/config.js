import 'dotenv/config';

const env = process.env;
const nodeEnv = env.NODE_ENV || 'development';

export const config = {
  env: nodeEnv,
  isProd: nodeEnv === 'production',
  port: Number(env.PORT || 4000),
  dbPath: env.DB_PATH || './data/museum.sqlite',
  backupDir: env.BACKUP_DIR || './data/backups',
  backupKeep: Number(env.BACKUP_KEEP || 30),
  ticketKeyPath: env.TICKET_KEY_PATH || './data/ticket-signing-key.pem',
  jwtSecret: env.JWT_SECRET || 'dev-only-secret',
  jwtExpires: '7d',
  corsOrigins: (env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  publicApiUrl: (env.PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, ''),
  webUrl: (env.WEB_URL || 'http://localhost:5173').replace(/\/$/, ''),
  payment: { provider: env.PAYMENT_PROVIDER || 'chapa' },
  chapa: {
    secretKey: env.CHAPA_SECRET_KEY || '',
    webhookSecret: env.CHAPA_WEBHOOK_SECRET || '',
    baseUrl: (env.CHAPA_BASE_URL || 'https://api.chapa.co/v1').replace(/\/$/, ''),
    currency: 'ETB',
    strictWebhook: env.CHAPA_WEBHOOK_STRICT !== 'false',
  },
  mail: { host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), user: env.SMTP_USER, pass: env.SMTP_PASS,
    from: env.MAIL_FROM || 'Science Museum <no-reply@example.org>' },
  sms: { url: env.SMS_API_URL, key: env.SMS_API_KEY },
  trustProxy: Number(env.TRUST_PROXY || 0),   // 1 when behind ngrok / nginx so rate limits see the real client address
  noShowGraceDays: 7,          // FR-PAY-005: one week after the notice
  maxAdvanceDays: 180,
  maxQuantityPerLine: 500,
  exposeOtp: !(nodeEnv === 'production'),
};

/** Fail fast with a readable message instead of failing mysteriously at the first payment. */
export function assertConfig() {
  const problems = [];
  if (config.payment.provider === 'chapa') {
    if (!config.chapa.secretKey) problems.push('CHAPA_SECRET_KEY is empty (Chapa dashboard → Settings → API).');
    else if (!/^CHASECK(_TEST)?-/.test(config.chapa.secretKey)) problems.push('CHAPA_SECRET_KEY should start with CHASECK_TEST- (test) or CHASECK- (live).');
    if (!config.chapa.webhookSecret) problems.push('CHAPA_WEBHOOK_SECRET is empty: set the same string in Chapa dashboard → Settings → Webhooks.');
  }
  if (config.isProd) {
    if (config.jwtSecret === 'dev-only-secret' || config.jwtSecret.length < 24) problems.push('JWT_SECRET must be a long random value in production.');
    if (!config.publicApiUrl.startsWith('https://')) problems.push('PUBLIC_API_URL must be an https address in production (Chapa redirects and webhooks need it).');
    if (config.corsOrigins.includes('*')) problems.push('CORS_ORIGINS must list your real web address(es) in production.');
  }
  if (problems.length) throw new Error('Configuration problem(s):\n - ' + problems.join('\n - '));
}
