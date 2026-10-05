// Import this FIRST in every test file: it points the app at a throw-away in-memory database and temp key files.
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'museum-test-'));
Object.assign(process.env, {
  NODE_ENV: 'test', DB_PATH: ':memory:', TICKET_KEY_PATH: path.join(dir, 'ticket-key.pem'), BACKUP_DIR: path.join(dir, 'backups'),
  CHAPA_SECRET_KEY: 'CHASECK_TEST-unit-secret', CHAPA_WEBHOOK_SECRET: 'unit-webhook-secret', JWT_SECRET: 'test-jwt-secret-test-jwt-secret',
});
