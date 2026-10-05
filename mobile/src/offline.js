import { api, isNetworkError } from './api';
import { cacheGet, cacheSet, localDb } from './db';
import { dict } from './strings';
import { parseCode, verifyToken } from './ticket';

/** Network first; if the server cannot be reached, fall back to the last saved copy. -> { data, offline, savedAt } */
export async function cached(key, fetcher) {
  try {
    const data = await fetcher();
    await cacheSet(key, data);
    return { data, offline: false, savedAt: null };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const hit = await cacheGet(key);
    if (hit) return { data: hit.data, offline: true, savedAt: hit.savedAt };
    throw e;
  }
}

// ------------------------------------------------------------------ cashier: today's list
export async function downloadGateList() {
  const list = await api('/cashier/gate-list');
  const db = await localDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM gate_bookings WHERE visit_date = ?', [list.date]);
    for (const b of list.bookings) {
      await db.runAsync('INSERT OR REPLACE INTO gate_bookings (ref, visit_date, status, json, saved_at) VALUES (?,?,?,?,?)',
        [b.ref, b.visitDate, b.status, JSON.stringify(b), list.generatedAt]);
    }
  });
  await cacheSet('ticketKey', list.publicKey);
  await cacheSet('gateListInfo', { date: list.date, count: list.bookings.length, savedAt: list.generatedAt });
  return { date: list.date, count: list.bookings.length, savedAt: list.generatedAt };
}
export const gateListInfo = async () => (await cacheGet('gateListInfo'))?.data ?? null;

// ------------------------------------------------------------------ cashier: admissions recorded offline
export async function queueAdmission(userId, { ref, attended, attendedQuantity }) {
  const db = await localDb();
  await db.runAsync('INSERT INTO outbox (client_id, user_id, ref, payload, scanned_at) VALUES (?,?,?,?,?)',
    [`${userId}-${ref}-${Date.now()}`, userId, ref, JSON.stringify({ attended, attendedQuantity }), new Date().toISOString()]);
  await db.runAsync("UPDATE gate_bookings SET status = 'Visited' WHERE ref = ?", [ref]);    // so this phone refuses a second admission
}
export async function outboxCounts(userId) {
  const db = await localDb();
  const rows = await db.getAllAsync('SELECT * FROM outbox WHERE user_id = ? ORDER BY id', [userId]);
  return { pending: rows.filter((r) => r.state === 'pending').length, conflicts: rows.filter((r) => r.state === 'conflict') };
}
export async function dismissConflict(id) { const db = await localDb(); await db.runAsync('DELETE FROM outbox WHERE id = ?', [id]); }

/** Send queued admissions. If the server cannot be reached the items simply stay queued (the error propagates). */
export async function syncOutbox(userId) {
  const db = await localDb();
  const rows = await db.getAllAsync("SELECT * FROM outbox WHERE user_id = ? AND state = 'pending' ORDER BY id", [userId]);
  if (!rows.length) return { sent: 0, applied: 0, conflicts: 0 };
  const items = rows.map((r) => ({ clientId: r.client_id, ref: r.ref, scannedAt: r.scanned_at, ...JSON.parse(r.payload) }));
  const { results } = await api('/cashier/sync', { method: 'POST', body: { items }, timeoutMs: 30000 });
  let applied = 0, conflicts = 0;
  for (const res of results) {
    if (res.status === 'applied') { applied++; await db.runAsync('DELETE FROM outbox WHERE client_id = ?', [res.clientId]); }
    else { conflicts++; await db.runAsync("UPDATE outbox SET state = 'conflict', error = ? WHERE client_id = ?", [res.code || 'ERROR', res.clientId]); }
  }
  return { sent: rows.length, applied, conflicts };
}

// ------------------------------------------------------------------ cashier: ticket check with no internet
const bi = (key) => ({ en: dict.en[key], am: dict.am[key] });
const reject = (key, result) => ({ result, paid: false, canAdmit: false, signatureVerified: false, message: bi(key), offline: true });

/** Same question as the server's /cashier/verify, answered from what this phone saved. Cancellations after the last download are unknown. */
export async function offlineCheck(code) {
  const parsed = parseCode(code);
  if (parsed.kind === 'bad') return reject('off_INVALID', 'INVALID');
  let ref = parsed.ref;
  if (parsed.kind === 'token') {
    const key = (await cacheGet('ticketKey'))?.data;
    if (!key) return reject('off_NO_DATA', 'NO_OFFLINE_DATA');
    const v = verifyToken(parsed.token, key);
    if (!v.ok) return reject('off_INVALID', 'INVALID');
    ref = v.payload.r;
  }
  const db = await localDb();
  const row = await db.getFirstAsync('SELECT json, status, saved_at FROM gate_bookings WHERE ref = ?', [ref]);
  const queued = await db.getFirstAsync("SELECT 1 AS x FROM outbox WHERE ref = ? AND state = 'pending'", [ref]);
  if (!row) {
    if (!(await cacheGet('gateListInfo'))) return reject('off_NO_DATA', 'NO_OFFLINE_DATA');
    return { ...reject('off_UNLISTED', 'UNLISTED'), signatureVerified: parsed.kind === 'token', ref };
  }
  const booking = JSON.parse(row.json);
  const used = !!queued || row.status === 'Visited';
  return {
    result: used ? 'ALREADY_USED' : 'VALID', paid: true, canAdmit: !used, signatureVerified: parsed.kind === 'token',
    message: bi(used ? 'off_ALREADY_USED' : 'off_VALID'), booking: { ...booking, status: used ? 'Visited' : booking.status }, offline: true, savedAt: row.saved_at,
  };
}

/** Online check first; if the server cannot be reached, answer from the phone. */
export async function checkTicket(code) {
  try { return { ...(await api('/cashier/verify', { method: 'POST', body: { code }, timeoutMs: 8000 })), offline: false }; }
  catch (e) { if (!isNetworkError(e)) throw e; return offlineCheck(code); }
}
