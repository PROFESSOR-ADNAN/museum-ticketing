import './support/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { openDb } from '../src/db/index.js';
import { createWalkInSale, correctCategory } from '../src/services/bookingService.js';
import { sql } from '../src/db/index.js';

function seedData() {
  const hash = bcrypt.hashSync('Passw0rd!', 4);
  for (const [k, en, am, price, online] of [
    ['adult_local', 'Resident Adult', 'አዋቂ ነዋሪ', 100, 1],
    ['child_local', 'Resident Child', 'ህጻን ነዋሪ', 50, 1],
  ]) {
    sql(`INSERT OR IGNORE INTO categories (key, name_en, name_am, price_cents, online_bookable) VALUES (?,?,?,?,?)`)
      .run(k, en, am, price * 100, online);
  }
  sql(`INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, email_verified, phone_verified) VALUES (?,?,?,?,?,1,1)`)
    .run('Cashier', 'cashier_pos@t.test', '+251911999999', hash, 'cashier');
}

test('Walk-in POS creates booking, records immediate admission, and updates ledger', async () => {
  openDb(':memory:');
  seedData();
  const cashier = await sql("SELECT * FROM users WHERE role = 'cashier'").get();
  const cat = await sql("SELECT * FROM categories WHERE key = 'adult_local'").get();

  const sale = await createWalkInSale({
    cashier,
    lines: [{ categoryId: cat.id, quantity: 2 }],
    paymentMethod: 'cash',
    cashReason: 'no_phone',
    buyerName: 'Abebe Bikila',
    buyerPhone: '+251911223344',
    admitImmediately: true,
  });

  assert.ok(sale.booking.ref.startsWith('MSB-'));
  assert.equal(sale.booking.status, 'Visited');
  assert.equal(sale.booking.channel, 'walk_in');
  assert.equal(sale.booking.bookedQuantity, 2);
  assert.equal(sale.booking.attendedQuantity, 2);
  assert.equal(sale.booking.amount, (cat.price_cents * 2) / 100);
  assert.ok(sale.receipt);
  assert.equal(sale.receipt.type, 'temporary_receipt');
});

test('Category correction at desk adjusts line items and updates total amount', async () => {
  openDb(':memory:');
  seedData();
  const cashier = await sql("SELECT * FROM users WHERE role = 'cashier'").get();
  const adultCat = await sql("SELECT * FROM categories WHERE key = 'adult_local'").get();
  const childCat = await sql("SELECT * FROM categories WHERE key = 'child_local'").get();

  const sale = await createWalkInSale({
    cashier,
    lines: [{ categoryId: childCat.id, quantity: 2 }],
    paymentMethod: 'cash',
    admitImmediately: false,
  });

  // Visitor needs 1 child ticket upgraded to adult ticket
  const correction = await correctCategory(sale.booking.ref, {
    fromCategoryId: childCat.id,
    toCategoryId: adultCat.id,
    quantity: 1,
    reason: 'wrong_category',
    cashier,
  });

  assert.equal(correction.ok, true);
  const expectedDelta = (adultCat.price_cents - childCat.price_cents) / 100;
  assert.equal(correction.deltaEtb, expectedDelta);
  assert.equal(correction.booking.amount, ((childCat.price_cents * 1) + (adultCat.price_cents * 1)) / 100);
});
