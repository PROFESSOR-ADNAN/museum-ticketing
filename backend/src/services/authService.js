import bcrypt from 'bcryptjs';
import { sql } from '../db/index.js';
import { Users } from '../db/repo.js';
import { AppError } from '../utils/AppError.js';
import { signToken } from '../utils/jwt.js';
import { otp } from '../utils/refs.js';
import { config } from '../config.js';
import { sendEmail, sendSms } from './notifier.js';
import { bilingual } from './documents.js';

const MAX_OTP_ATTEMPTS = 5;
const uniqueToTaken = (e) => { if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new AppError('EMAIL_TAKEN', 409); throw e; };

async function issueCodes(user) {
  const emailCode = otp(), phoneCode = otp();
  await sql(`UPDATE users SET email_code = ?, phone_code = ?, code_expires_at = ?, code_attempts = 0 WHERE id = ?`)
    .run(emailCode, phoneCode, new Date(Date.now() + 15 * 60 * 1000).toISOString(), user.id);
  const text = (c) => bilingual({ en: `Your Science Museum verification code is ${c} (valid 15 minutes).`, am: `የሳይንስ ሙዚየም የማረጋገጫ ኮድዎ ${c} ነው (ለ15 ደቂቃ የሚያገለግል)።` });
  await sendEmail({ user, to: user.email, subject: 'Verification code / የማረጋገጫ ኮድ', body: text(emailCode), kind: 'verify' });
  await sendSms({ user, to: user.phone, body: text(phoneCode), kind: 'verify' });
  return { emailCode, phoneCode };
}

// FR-ACC-001
export async function register(d) {
  const hash = await bcrypt.hash(d.password, 10);
  let id;
  try {
    const info = await sql(`INSERT INTO users (name, email, phone, password_hash, role, language) VALUES (?,?,?,?, 'visitor', ?)`)
      .run(d.name.trim(), d.email.trim(), d.phone.trim(), hash, d.language);
    id = Number(info.lastInsertRowid);
  } catch (e) { uniqueToTaken(e); }
  const user = await Users.byId(id);
  const codes = await issueCodes(user);
  return { user, token: signToken(user), ...(config.exposeOtp ? { devCodes: codes } : {}) };
}

// FR-ACC-003: both channels must be verified before paying. Five wrong guesses void the codes.
export async function verifyContacts({ email, emailCode, phoneCode }) {
  const u = await Users.byEmail(email, true);
  if (!u?.emailCode || !u.codeExpiresAt || new Date(u.codeExpiresAt).getTime() < Date.now()) throw new AppError('BAD_CODE');
  if ((emailCode && emailCode !== u.emailCode) || (phoneCode && phoneCode !== u.phoneCode)) {
    const attempts = u.codeAttempts + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) await sql(`UPDATE users SET email_code = NULL, phone_code = NULL, code_expires_at = NULL, code_attempts = 0 WHERE id = ?`).run(u.id);
    else await sql('UPDATE users SET code_attempts = ? WHERE id = ?').run(attempts, u.id);
    throw new AppError('BAD_CODE');
  }
  if (emailCode) await sql('UPDATE users SET email_verified = true WHERE id = ?').run(u.id);
  if (phoneCode) await sql('UPDATE users SET phone_verified = true WHERE id = ?').run(u.id);
  return { user: await Users.byId(u.id) };
}

export async function resend(email) {
  const u = await Users.byEmail(email);
  const codes = u && (!u.emailVerified || !u.phoneVerified) ? await issueCodes(u) : null;
  return { ok: true, ...(config.exposeOtp && codes ? { devCodes: codes } : {}) };
}

export async function login(email, password) {
  const u = await Users.byEmail(email, true);
  if (!u || !u.active || !(await bcrypt.compare(password, u.passwordHash))) throw new AppError('BAD_CREDENTIALS', 401);
  const user = await Users.byId(u.id);
  return { user, token: signToken(user) };
}

export async function updateMe(user, d) {
  if (d.language) await sql('UPDATE users SET language = ? WHERE id = ?').run(d.language, user.id);
  if (d.name) await sql('UPDATE users SET name = ? WHERE id = ?').run(d.name.trim(), user.id);
  return { user: await Users.byId(user.id) };
}

export { uniqueToTaken };
