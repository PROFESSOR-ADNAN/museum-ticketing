import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import dotenv from 'dotenv';

const dir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(dir, '../.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL or POSTGRES_URL environment variable is required to migrate PostgreSQL.');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
});

async function run() {
  console.log('[pg:migrate] connecting to postgresql...');
  const client = await pool.connect();
  try {
    const sqlFile = path.join(dir, '../src/db/postgres_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log('[pg:migrate] applying schema and views...');
    await client.query(sql);
    console.log('[pg:migrate] PostgreSQL schema and views applied successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[pg:migrate] failed:', err);
  process.exit(1);
});
