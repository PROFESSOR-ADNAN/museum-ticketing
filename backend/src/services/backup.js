import fs from 'node:fs';
import path from 'node:path';
import { getDb, isPgActive } from '../db/index.js';
import { config } from '../config.js';

/** Consistent online snapshot of the live SQLite database (WAL-aware). No-op when PostgreSQL is active. */
export async function backupTo(file) {
  if (isPgActive()) return null; // PostgreSQL is managed externally; skip SQLite backup
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  await getDb().backup(file);
  return file;
}

export async function runBackup() {
  if (isPgActive()) return null; // PostgreSQL is managed externally; skip SQLite backup
  const stamp = new Date().toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-');
  const file = path.resolve(config.backupDir, `museum-${stamp}.sqlite`);
  await backupTo(file);
  const old = fs.readdirSync(config.backupDir).filter((f) => /^museum-.*\.sqlite$/.test(f)).sort().reverse().slice(config.backupKeep);
  for (const f of old) fs.unlinkSync(path.join(config.backupDir, f));
  return file;
}
