import bcrypt from 'bcryptjs';
import { openDb, closeDb, sql } from './db/index.js';

const pw = process.env.SEED_PASSWORD || 'Passw0rd!';
openDb();

// FR-CAT-001: seeded from current policy (stakeholder interview Q3). Prices in santim (ETB x 100).
const cats = [
  ['student', 'Student', 'ተማሪ', 50, 1, 1], ['adult', 'Adult / Teacher', 'አዋቂ / መምህር', 100, 1, 2],
  ['foreign_resident', 'Foreign Resident', 'ነዋሪ የውጭ ዜጋ', 300, 1, 3], ['non_resident', 'Non-Resident', 'ነዋሪ ያልሆነ', 500, 1, 4],
  ['exempt', 'Exempt / Free (AAU staff)', 'ነጻ (የአዲስ አበባ ዩኒቨርሲቲ ሠራተኛ)', 0, 0, 5],
];
for (const [key, en, am, price, online, order] of cats) {
  sql(`INSERT OR IGNORE INTO categories (key, name_en, name_am, price_cents, online_bookable, sort_order) VALUES (?,?,?,?,?,?)`).run(key, en, am, price * 100, online, order);
}
sql(`UPDATE categories SET desc_en = 'Counter only, on presentation of ID.', desc_am = 'በቆጣሪ ላይ ብቻ፣ መታወቂያ በማሳየት።' WHERE key = 'exempt' AND desc_en IS NULL`).run();

const users = [
  ['Platform Admin', 'admin@museum.test', '+251911000001', 'admin'], ['Museum Manager', 'manager@museum.test', '+251911000002', 'manager'],
  ['Front Cashier', 'cashier@museum.test', '+251911000003', 'cashier'], ['Demo Visitor', 'visitor@museum.test', '+251911000004', 'visitor'],
];
const hash = await bcrypt.hash(pw, 10);
for (const [name, email, phone, role] of users) {
  sql(`INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, email_verified, phone_verified) VALUES (?,?,?,?,?,1,1)`).run(name, email, phone, hash, role);
}
console.log(`[seed] done. Accounts: ${users.map((u) => u[1]).join(', ')} — password: ${pw}`);
closeDb();
