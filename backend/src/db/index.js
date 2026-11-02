import Database from 'better-sqlite3';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import { config } from '../config.js';
import { INIT_SQL, VIEWS_SQL } from './schema_sql.js';

let currentSqlite = null;
let currentPgPool = null;
const txStorage = new AsyncLocalStorage();
const caches = new WeakMap();

export const isPgActive = () => Boolean(config.databaseUrl && config.env !== 'test');

export const getDb = () => {
  if (isPgActive()) throw new Error('PostgreSQL pool is active: use sql() or getPgPool()');
  if (!currentSqlite) throw new Error('Database not opened: call openDb() first');
  return currentSqlite;
};

export const getPgPool = () => {
  if (!currentPgPool) {
    pg.types.setTypeParser(20, (val) => Number(val));
    pg.types.setTypeParser(1082, (val) => val);
    pg.types.setTypeParser(1114, (val) => val);
    pg.types.setTypeParser(1184, (val) => val);
    currentPgPool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
      max: 10,
    });
  }
  return currentPgPool;
};

export function openDb(file = config.dbPath) {
  if (isPgActive()) {
    const pool = getPgPool();
    ensurePg(pool).catch((e) => console.warn('[db:pg] ensure schema notice:', e.message));
    return pool;
  }
  if (currentSqlite) return currentSqlite;
  let targetFile = file;
  if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && file !== ':memory:' && !file.startsWith('/tmp')) {
    targetFile = path.join('/tmp', 'museum.sqlite');
  }
  if (targetFile !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(targetFile)), { recursive: true });
  const db = new Database(targetFile);
  try { db.pragma('journal_mode = WAL'); } catch { /* in-memory or read-only fallback */ }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  migrate(db);
  currentSqlite = db;
  return db;
}

export async function closeDb() {
  if (currentPgPool) {
    await currentPgPool.end();
    currentPgPool = null;
  }
  if (currentSqlite) {
    currentSqlite.close();
    currentSqlite = null;
  }
}

async function ensurePg(pool) {
  try {
    const res = await pool.query(`SELECT to_regclass('public.users') AS exists`);
    if (!res.rows[0]?.exists) {
      console.log('[db:pg] applying schema...');
      const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'postgres_schema.sql');
      if (fs.existsSync(schemaPath)) {
        await pool.query(fs.readFileSync(schemaPath, 'utf8'));
      }
    }
  } catch (err) {
    console.warn('[db:pg] ensure schema notice:', err.message);
  }
}

function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));

  let items = [];
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
      items.push({ version: f, sql: fs.readFileSync(path.join(dir, f), 'utf8') });
    }
  } else {
    items = [
      { version: '001_init.sql', sql: INIT_SQL },
      { version: '002_reporting_views.sql', sql: VIEWS_SQL },
    ];
  }

  for (const item of items) {
    if (done.has(item.version)) continue;
    db.transaction(() => {
      db.exec(item.sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(item.version, new Date().toISOString());
    })();
    console.log(`[db] applied migration ${item.version}`);
  }
  if (config.env !== 'test') {
    seedDefaults(db);
  }
}

function seedDefaults(db) {
  try {
    const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get()?.c || 0;
    if (catCount === 0) {
      const cats = [
        ['student', 'Student', 'ተማሪ', 5000, 1, 1, 'Valid student ID required at gate.', 'በበር ላይ ተቀባይነት ያለው የተማሪ መታወቂያ ያስፈልጋል።'],
        ['adult', 'Adult / Teacher', 'አዋቂ / መምህር', 10000, 1, 2, 'Resident adult admission.', 'የነዋሪ አዋቂ መግቢያ።'],
        ['foreign_resident', 'Foreign Resident', 'ነዋሪ የውጭ ዜጋ', 30000, 1, 3, 'Proof of Ethiopian residency required.', 'የኢትዮጵያ ነዋሪነት ማረጋገጫ ያስፈልጋል።'],
        ['non_resident', 'Non-Resident', 'ነዋሪ ያልሆነ', 50000, 1, 4, 'International tourist admission.', 'ዓለም አቀፍ የቱሪስት መግቢያ።'],
        ['exempt', 'Exempt / Free (AAU staff)', 'ነጻ (የአዲስ አበባ ዩኒቨርሲቲ ሠራተኛ)', 0, 0, 5, 'Counter only, on presentation of ID.', 'በቆጣሪ ላይ ብቻ፣ መታወቂያ በማሳየት።'],
      ];
      const ins = db.prepare('INSERT OR IGNORE INTO categories (key, name_en, name_am, price_cents, online_bookable, sort_order, desc_en, desc_am) VALUES (?,?,?,?,?,?,?,?)');
      db.transaction(() => {
        for (const c of cats) ins.run(...c);
      })();
      console.log('[db] seeded default ticket categories');
    }

    const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get()?.c || 0;
    const admin1234Hash = '$2a$10$8R4V9wBS1D1/VnEFoTGfyeJKiuOLKZM3QvnePP.yS./h7FRvrOyoq';
    if (userCount === 0) {
      const users = [
        ['Platform Admin', 'admin@museum.test', '+251911000001', 'admin'],
        ['Museum Manager', 'manager@museum.test', '+251911000002', 'manager'],
        ['Front Cashier', 'cashier@museum.test', '+251911000003', 'cashier'],
        ['Demo Visitor', 'visitor@museum.test', '+251911000004', 'visitor'],
      ];
      const insUser = db.prepare('INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, email_verified, phone_verified) VALUES (?,?,?,?,?,1,1)');
      db.transaction(() => {
        for (const [name, email, phone, role] of users) insUser.run(name, email, phone, admin1234Hash, role);
      })();
      console.log('[db] seeded default users (password: admin1234)');
    } else {
      db.prepare(`UPDATE users SET password_hash = ? WHERE email IN ('admin@museum.test', 'manager@museum.test', 'cashier@museum.test', 'visitor@museum.test')`).run(admin1234Hash);
    }
  } catch (err) {
    console.warn('[db] auto-seed notice:', err.message);
  }
}

export function translateSql(text) {
  let paramIdx = 0;
  let s = text.replace(/\?/g, () => `$${++paramIdx}`);
  s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  // Date helpers
  s = s.replace(/date\s*\(\s*scanned_at\s*,\s*'\+3 hours'\s*\)/gi, "(scanned_at AT TIME ZONE 'Africa/Addis_Ababa')::date::text");
  s = s.replace(/date\s*\(\s*b\.visited_at\s*,\s*'\+3 hours'\s*\)/gi, "(b.visited_at AT TIME ZONE 'Africa/Addis_Ababa')::date::text");
  s = s.replace(/date\s*\(\s*created_at\s*,\s*'\+3 hours'\s*\)/gi, "(created_at AT TIME ZONE 'Africa/Addis_Ababa')::date::text");
  // Boolean assignments in UPDATE
  s = s.replace(/\bemail_verified\s*=\s*1\b/gi, 'email_verified = true');
  s = s.replace(/\bemail_verified\s*=\s*0\b/gi, 'email_verified = false');
  s = s.replace(/\bphone_verified\s*=\s*1\b/gi, 'phone_verified = true');
  s = s.replace(/\bphone_verified\s*=\s*0\b/gi, 'phone_verified = false');
  s = s.replace(/\bactive\s*=\s*1\b/gi, 'active = true');
  s = s.replace(/\bactive\s*=\s*0\b/gi, 'active = false');
  s = s.replace(/\bonline_bookable\s*=\s*1\b/gi, 'online_bookable = true');
  s = s.replace(/\bonline_bookable\s*=\s*0\b/gi, 'online_bookable = false');
  s = s.replace(/\bshortfall_refunded\s*=\s*1\b/gi, 'shortfall_refunded = true');
  s = s.replace(/\bshortfall_refunded\s*=\s*0\b/gi, 'shortfall_refunded = false');
  s = s.replace(/\bneeds_review\s*=\s*1\b/gi, 'needs_review = true');
  s = s.replace(/\bneeds_review\s*=\s*0\b/gi, 'needs_review = false');
  // Boolean conditions in WHERE
  s = s.replace(/\bWHERE\s+active\s*=\s*1\b/gi, 'WHERE active = true');
  s = s.replace(/\bAND\s+active\s*=\s*1\b/gi, 'AND active = true');
  s = s.replace(/\bWHERE\s+online_bookable\s*=\s*1\b/gi, 'WHERE online_bookable = true');
  s = s.replace(/\bAND\s+online_bookable\s*=\s*1\b/gi, 'AND online_bookable = true');
  s = s.replace(/\bAND\s+shortfall_refunded\s*=\s*0\b/gi, 'AND shortfall_refunded = false');
  s = s.replace(/\bAND\s+needs_review\s*=\s*0\b/gi, 'AND needs_review = false');

  if (/^\s*insert\s+into/i.test(s) && !/returning/i.test(s) && !/ON\s+CONFLICT\s+DO\s+NOTHING/i.test(s)) {
    s += ' RETURNING id';
  }
  return s;
}

async function execPg(sqlText, args = []) {
  const pool = getPgPool();
  const client = txStorage.getStore()?.client || pool;
  const pgSql = translateSql(sqlText);
  const cleanArgs = args.map((a) => (a === undefined ? null : a));
  try {
    return await client.query(pgSql, cleanArgs);
  } catch (err) {
    if (err.code === '23505') {
      err.code = 'SQLITE_CONSTRAINT_UNIQUE';
    }
    throw err;
  }
}

export function sql(text) {
  if (isPgActive()) {
    return {
      async get(...args) {
        const res = await execPg(text, args);
        return res.rows[0];
      },
      async all(...args) {
        const res = await execPg(text, args);
        return res.rows;
      },
      async run(...args) {
        const res = await execPg(text, args);
        return {
          changes: res.rowCount,
          lastInsertRowid: res.rows[0]?.id,
        };
      },
      columns() {
        return [];
      },
    };
  }

  const db = getDb();
  let m = caches.get(db);
  if (!m) caches.set(db, (m = new Map()));
  let s = m.get(text);
  if (!s) m.set(text, (s = db.prepare(text)));
  const cleanSqliteArgs = (args) => args.map((a) => (typeof a === 'boolean' ? (a ? 1 : 0) : (a === undefined ? null : a)));
  return {
    get: (...args) => s.get(...cleanSqliteArgs(args)),
    all: (...args) => s.all(...cleanSqliteArgs(args)),
    run: (...args) => s.run(...cleanSqliteArgs(args)),
    columns: () => s.columns(),
  };
}

export async function tx(fn) {
  if (isPgActive()) {
    const pool = getPgPool();
    const existing = txStorage.getStore()?.client;
    if (existing) {
      return await fn();
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await txStorage.run({ client }, () => fn());
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const db = getDb();
    const outer = !db.inTransaction;
    if (outer) db.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn();
      if (outer) db.exec('COMMIT');
      return result;
    } catch (err) {
      if (outer) {
        try { db.exec('ROLLBACK'); } catch {}
      }
      throw err;
    }
  }
}

export const placeholders = (n) => Array.from({ length: n }, () => '?').join(',');
