import './support/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { openDb, sql } from '../src/db/index.js';
import { Users } from '../src/db/repo.js';
import { buildLines, createBooking } from '../src/services/bookingService.js';
import { addDays, addisDateOf } from '../src/utils/dates.js';

function seedData() {
  const cats = [
    ['student', 'Student', 'ተማሪ', 50, 1, 1],
    ['adult', 'Adult / Teacher', 'አዋቂ / መምህር', 100, 1, 2],
    ['foreign_resident', 'Foreign Resident', 'ነዋሪ የውጭ ዜጋ', 300, 1, 3],
    ['non_resident', 'Non-Resident', 'ነዋሪ ያልሆነ', 500, 1, 4],
    ['exempt', 'Exempt / Free (AAU staff)', 'ነጻ (የአዲስ አበባ ዩኒቨርሲቲ ሠራተኛ)', 0, 0, 5],
  ];
  for (const [key, en, am, price, online, order] of cats) {
    sql(`INSERT OR IGNORE INTO categories (key, name_en, name_am, price_cents, online_bookable, sort_order) VALUES (?,?,?,?,?,?)`)
      .run(key, en, am, price * 100, online, order);
  }
  const hash = bcrypt.hashSync('admin1234', 4);
  sql(`INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, email_verified, phone_verified) VALUES (?,?,?,?,?,1,1)`)
    .run('Demo Visitor', 'visitor@museum.test', '+251911000004', hash, 'visitor');
}

test('tours: buildLines applies guided surcharge when isGuided is true', async () => {
  openDb(':memory:');
  seedData();
  const normal = await buildLines([{ categoryId: 1, quantity: 2 }], false);
  const guided = await buildLines([{ categoryId: 1, quantity: 2 }], true);

  // Category 1 is student (50 ETB = 5000 santim)
  assert.equal(normal.amountCents, 10000); // 2 * 50 = 100 ETB
  // Guided adds 50 ETB per ticket = 100 ETB per ticket = 200 ETB = 20000 santim
  assert.equal(guided.amountCents, 20000);
});

test('tours: createBooking records is_guided and time_slot', async () => {
  openDb(':memory:');
  seedData();
  const visitor = await Users.byEmail('visitor@museum.test');
  const date = addDays(addisDateOf(), 3);

  const b = await createBooking({
    visitor,
    kind: 'individual',
    visitDate: date,
    isGuided: true,
    timeSlot: '10:30',
    lines: [{ categoryId: 2, quantity: 1 }], // Adult (100 ETB + 50 guided surcharge = 150 ETB)
  });

  assert.equal(b.isGuided, true);
  assert.equal(b.timeSlot, '10:30');
  assert.equal(b.amount, 150);
});

test('auth: googleAuth creates visitor and returns JWT', async () => {
  openDb(':memory:');
  const app = createApp();

  // Create a base64 encoded dummy JWT claim
  const payload = Buffer.from(JSON.stringify({
    sub: 'google-test-sub-12345',
    email: 'scholar@aau.edu.et',
    name: 'AAU Scholar',
    email_verified: true,
  })).toString('base64');
  const mockJwt = `eyJhbGciOiJIUzI1NiJ9.${payload}.mockSignature`;

  const server = app.listen(0);
  const port = server.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: mockJwt }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.token);
    assert.equal(data.user.email, 'scholar@aau.edu.et');
    assert.equal(data.user.role, 'visitor');
    assert.equal(data.user.emailVerified, true);
  } finally {
    server.close();
  }
});
