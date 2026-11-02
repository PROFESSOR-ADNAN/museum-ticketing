import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dir, '../.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is required to seed PostgreSQL.');
  process.exit(1);
}

const pw = process.env.SEED_PASSWORD || 'admin1234';
const pool = new pg.Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

async function run() {
  console.log('[pg:seed] connecting to postgresql...');
  const client = await pool.connect();
  try {
    const cats = [
      ['student', 'Student', 'ተማሪ', 50, true, 1],
      ['adult', 'Adult / Teacher', 'አዋቂ / መምህር', 100, true, 2],
      ['foreign_resident', 'Foreign Resident', 'ነዋሪ የውጭ ዜጋ', 300, true, 3],
      ['non_resident', 'Non-Resident', 'ነዋሪ ያልሆነ', 500, true, 4],
      ['exempt', 'Exempt / Free (AAU staff)', 'ነጻ (የአዲስ አበባ ዩኒቨርሲቲ ሠራተኛ)', 0, false, 5],
    ];

    for (const [key, en, am, price, online, order] of cats) {
      await client.query(
        `INSERT INTO categories (key, name_en, name_am, price_cents, online_bookable, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (key) DO NOTHING`,
        [key, en, am, price * 100, online, order]
      );
    }

    await client.query(
      `UPDATE categories SET desc_en = 'Counter only, on presentation of ID.', desc_am = 'በቆጣሪ ላይ ብቻ፣ መታወቂያ በማሳየት።'
       WHERE key = 'exempt' AND desc_en IS NULL`
    );

    const users = [
      ['Platform Admin', 'admin@museum.test', '+251911000001', 'admin'],
      ['Museum Manager', 'manager@museum.test', '+251911000002', 'manager'],
      ['Front Cashier', 'cashier@museum.test', '+251911000003', 'cashier'],
      ['Demo Visitor', 'visitor@museum.test', '+251911000004', 'visitor'],
    ];

    const hash = await bcrypt.hash(pw, 10);
    for (const [name, email, phone, role] of users) {
      await client.query(
        `INSERT INTO users (name, email, phone, password_hash, role, email_verified, phone_verified)
         VALUES ($1, $2, $3, $4, $5, true, true)
         ON CONFLICT (email) DO NOTHING`,
        [name, email, phone, hash, role]
      );
    }

    console.log(`[pg:seed] completed. Accounts: ${users.map((u) => u[1]).join(', ')} — password: ${pw}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[pg:seed] failed:', err);
  process.exit(1);
});
