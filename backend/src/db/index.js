import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { INIT_SQL, VIEWS_SQL } from './schema_sql.js';

let current = null;
export const getDb = () => { if (!current) throw new Error('Database not opened: call openDb() first'); return current; };

/**
 * Open (and migrate) the SQLite database. WAL mode lets readers (reports, dashboards) run while a write happens;
 * foreign keys are enforced; busy_timeout makes a second process wait instead of failing.
 */
export function openDb(file = config.dbPath) {
  if (current) return current;
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
  current = db;
  return db;
}
export function closeDb() { if (current) { current.close(); current = null; } }

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
    db.transaction(() => {                      // each migration is all-or-nothing
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
    if (userCount === 0) {
      // bcrypt hash for 'Passw0rd!'
      const hash = '$2a$10$2ypm8ItKrQHTGMJZHazQguRLR7UPz/O41ByhHlroHy.E9CBrB56Qm';
      const users = [
        ['Platform Admin', 'admin@museum.test', '+251911000001', 'admin'],
        ['Museum Manager', 'manager@museum.test', '+251911000002', 'manager'],
        ['Front Cashier', 'cashier@museum.test', '+251911000003', 'cashier'],
        ['Demo Visitor', 'visitor@museum.test', '+251911000004', 'visitor'],
      ];
      const insUser = db.prepare('INSERT OR IGNORE INTO users (name, email, phone, password_hash, role, email_verified, phone_verified) VALUES (?,?,?,?,?,1,1)');
      db.transaction(() => {
        for (const [name, email, phone, role] of users) insUser.run(name, email, phone, hash, role);
      })();
      console.log('[db] seeded default users');
    }
  } catch (err) {
    console.warn('[db] auto-seed notice:', err.message);
  }
}

// Prepared statements are cached per database handle.
const caches = new WeakMap();
export function sql(text) {
  const db = getDb();
  let m = caches.get(db);
  if (!m) caches.set(db, (m = new Map()));
  let s = m.get(text);
  if (!s) m.set(text, (s = db.prepare(text)));
  return s;
}

/**
 * NFR-CONSIST-001: run `fn` as ONE atomic transaction. SQLite gives real ACID transactions in a single file —
 * no replica set needed. `.immediate()` takes the write lock up front, so two writers can never interleave.
 * Everything inside must be synchronous (do network calls before or after, never inside).
 */
export const tx = (fn) => getDb().transaction(fn).immediate();
export const placeholders = (n) => Array.from({ length: n }, () => '?').join(',');
