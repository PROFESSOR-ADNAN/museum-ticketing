import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { sql } from '../db/index.js';

let transporter;
const mailer = () => {
  if (!config.mail.host) return null;
  transporter ||= nodemailer.createTransport({ host: config.mail.host, port: config.mail.port,
    auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined });
  return transporter;
};
const log = (n, status) => sql(`INSERT INTO notices (user_id, booking_id, channel, recipient, subject, body, status, kind) VALUES (?,?,?,?,?,?,?,?)`)
  .run(n.user?.id ?? null, n.booking?.id ?? null, n.channel, n.to, n.subject ?? null, n.body, status, n.kind ?? null);

/** Every send is recorded in `notices`. Falls back to console output when no gateway is configured. */
export async function sendEmail({ user, booking, to, subject, body, kind }) {
  let status = 'logged';
  try {
    const m = mailer();
    if (m) { await m.sendMail({ from: config.mail.from, to, subject, text: body }); status = 'sent'; }
    else console.log(`[email -> ${to}] ${subject}\n${body}\n`);
  } catch (e) { console.error('[email failed]', e.message); status = 'failed'; }
  log({ user, booking, channel: 'email', to, subject, body, kind }, status);
}

export async function sendSms({ user, booking, to, body, kind }) {
  let status = 'logged';
  try {
    if (config.sms.url) {
      const r = await fetch(config.sms.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.sms.key}` },
        body: JSON.stringify({ to, message: body }) });
      status = r.ok ? 'sent' : 'failed';
    } else console.log(`[sms -> ${to}] ${body}\n`);
  } catch (e) { console.error('[sms failed]', e.message); status = 'failed'; }
  log({ user, booking, channel: 'sms', to, body, kind }, status);
}
