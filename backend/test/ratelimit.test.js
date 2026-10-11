import test from 'node:test';
import assert from 'node:assert/strict';

// development-like settings: the limiter is active here (it is switched off in the other tests)
Object.assign(process.env, { NODE_ENV: 'development', DB_PATH: ':memory:', AUTH_RATE_LIMIT: '3', JWT_SECRET: 'x'.repeat(32) });
const { openDb, closeDb } = await import('../src/db/index.js');
const { createApp } = await import('../src/app.js');

test('rate limit: guessing is limited with a readable JSON answer, but /me (called on every app start) is never counted', async () => {
  openDb(':memory:');
  const server = createApp().listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, init) => { const r = await fetch(base + path, init); return { status: r.status, body: await r.json().catch(() => null) }; };
  for (let i = 0; i < 10; i++) assert.equal((await call('/api/auth/me')).status, 401);                       // not counted
  const attempt = () => call('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-lang': 'am' }, body: JSON.stringify({ email: 'a@b.co', password: 'nope' }) });
  assert.deepEqual([(await attempt()).status, (await attempt()).status, (await attempt()).status], [401, 401, 401]);
  const blocked = await attempt();
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, 'RATE_LIMITED');
  assert.match(blocked.body.message, /ብዙ ሙከራዎች/);                                                            // in the user's language
  server.close(); closeDb();
});
