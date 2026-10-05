import * as SQLite from 'expo-sqlite';

/**
 * The phone's OWN small database (a cache + a waiting queue). It is NOT the museum's database — that lives on the server.
 *   cache         last good answer for each screen, so tickets and prices can be shown with no internet
 *   gate_bookings today's bookings downloaded by a cashier, for offline ticket checks
 *   outbox        admissions recorded without internet, sent to the server when it is reachable again
 */
let opening;
export const localDb = () => (opening ||= open());

async function open() {
  const db = await SQLite.openDatabaseAsync('museum-local.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, json TEXT NOT NULL, saved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS gate_bookings (ref TEXT PRIMARY KEY, visit_date TEXT NOT NULL, status TEXT NOT NULL, json TEXT NOT NULL, saved_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, ref TEXT NOT NULL,
      payload TEXT NOT NULL, scanned_at TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', error TEXT);
  `);
  return db;
}

export async function cacheSet(key, value) {
  const db = await localDb();
  await db.runAsync('INSERT OR REPLACE INTO cache (key, json, saved_at) VALUES (?,?,?)', [key, JSON.stringify(value), new Date().toISOString()]);
}
export async function cacheGet(key) {
  const db = await localDb();
  const r = await db.getFirstAsync('SELECT json, saved_at FROM cache WHERE key = ?', [key]);
  return r ? { data: JSON.parse(r.json), savedAt: r.saved_at } : null;
}
/** On sign-out: forget personal data but KEEP unsent admissions (they belong to the cashier who recorded them). */
export async function clearUserData() {
  const db = await localDb();
  await db.execAsync('DELETE FROM cache; DELETE FROM gate_bookings;');
}
