import './support/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { openDb, closeDb, sql } from '../src/db/index.js';
import { login, register } from '../src/services/authService.js';
import { ROOT } from '../src/config.js';

test('accounts survive a restart: the SQLite file really stores the data', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'museum-db-')), 'museum.sqlite');
  openDb(file);
  const out = await register({ name: 'Persist Me', email: 'persist@t.test', phone: '+251933000001', password: 'Passw0rd!', language: 'en' });
  assert.ok(out.token);
  closeDb();                                                          // "stop the server"
  assert.ok(fs.statSync(file).size > 0);
  openDb(file);                                                       // "start it again"
  assert.equal(sql('SELECT COUNT(*) AS n FROM users').get().n, 1);
  assert.equal((await login('PERSIST@t.test', 'Passw0rd!')).user.email, 'persist@t.test');      // e-mail is not case-sensitive
  await assert.rejects(() => login('persist@t.test', 'wrong-password'), { code: 'BAD_CREDENTIALS' });
  closeDb();
});

test('the database file is the same wherever the server is started from', () => {
  const dbPathFrom = (cwd) => execFileSync(process.execPath, ['--input-type=module', '-e',
    `import { config } from ${JSON.stringify(path.join(ROOT, 'src/config.js'))}; console.log(config.dbPath)`],
  { cwd, env: { ...process.env, DB_PATH: '' }, encoding: 'utf8' }).trim();
  const fromElsewhere = dbPathFrom(os.tmpdir()), fromBackend = dbPathFrom(ROOT);
  assert.equal(fromElsewhere, fromBackend);
  assert.equal(fromElsewhere, path.join(ROOT, 'data', 'museum.sqlite'));
});
