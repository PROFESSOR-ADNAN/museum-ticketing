-- Science Museum Ticketing — schema v1 (SQLite). Money is stored as INTEGER santim (1 ETB = 100 santim): no floating-point drift.
-- Dates: visit_date is 'YYYY-MM-DD' (Africa/Addis_Ababa); *_at columns are UTC ISO-8601 strings.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor','cashier','manager','admin')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  phone_verified INTEGER NOT NULL DEFAULT 0,
  email_code TEXT, phone_code TEXT, code_expires_at TEXT,
  code_attempts INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en','am')),
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name_en TEXT NOT NULL, name_am TEXT NOT NULL,
  desc_en TEXT, desc_am TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  online_bookable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  cashier_id INTEGER NOT NULL REFERENCES users(id),
  gross_cents INTEGER NOT NULL,
  refund_deduction_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  words_en TEXT NOT NULL, words_am TEXT NOT NULL,
  purpose_en TEXT NOT NULL, purpose_am TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL UNIQUE,
  visitor_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual','group')),
  visit_date TEXT NOT NULL,
  time_slot TEXT, organization TEXT, contact_name TEXT, contact_phone TEXT,
  booked_quantity INTEGER NOT NULL CHECK (booked_quantity > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  status TEXT NOT NULL CHECK (status IN ('PendingApproval','Declined','AwaitingPayment','Pending','Visited','Cancelled','Refunded')),
  channel TEXT NOT NULL DEFAULT 'online' CHECK (channel IN ('online','manager')),
  decision_by INTEGER REFERENCES users(id), decision_at TEXT, decision_note TEXT,
  paid_at TEXT, payment_ref TEXT, temp_receipt_no TEXT,
  aggregator_fee_cents INTEGER NOT NULL DEFAULT 0,
  reschedule_count INTEGER NOT NULL DEFAULT 0,
  original_visit_date TEXT,
  no_show_notice_at TEXT,
  attended_quantity INTEGER, attended_amount_cents INTEGER,
  visited_at TEXT, visited_by INTEGER REFERENCES users(id),
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  shortfall_refunded INTEGER NOT NULL DEFAULT 0,
  settlement_id INTEGER REFERENCES settlements(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_bookings_visitor ON bookings(visitor_id);
CREATE INDEX idx_bookings_date ON bookings(visit_date);
CREATE INDEX idx_bookings_status_date ON bookings(status, visit_date);
CREATE INDEX idx_bookings_settlement ON bookings(settlement_id);

-- A booking keeps a SNAPSHOT of each category's name and price at booking time (FR-CAT-002).
CREATE TABLE booking_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  key TEXT NOT NULL, name_en TEXT NOT NULL, name_am TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  attended_quantity INTEGER,
  UNIQUE (booking_id, category_id)
);

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  provider TEXT NOT NULL,
  provider_ref TEXT NOT NULL UNIQUE,          -- our tx_ref sent to the provider (FR-PAY-004)
  provider_txn_id TEXT,                       -- the provider's own reference (Chapa "reference"), needed for refunds
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','succeeded','failed')),
  checkout_url TEXT,
  client_return_url TEXT,
  paid_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- FR-REFUND-004: every refund is its own record; at most one per booking and reason.
CREATE TABLE refunds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL REFERENCES bookings(id),
  reason TEXT NOT NULL CHECK (reason IN ('cancel','shortfall','no_response','orphan')),
  payment_id INTEGER REFERENCES payments(id),
  gross_cents INTEGER NOT NULL,
  fee_share_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','done','failed')),
  provider_refund_ref TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  needs_review INTEGER NOT NULL DEFAULT 0,
  requested_by INTEGER REFERENCES users(id),
  settlement_id INTEGER REFERENCES settlements(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (booking_id, reason)
);

CREATE TABLE date_closures (
  date TEXT PRIMARY KEY, reason TEXT, closed_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id),      -- NULL = the system
  action TEXT NOT NULL, entity TEXT, entity_id INTEGER,
  amount_cents INTEGER, booking_refs TEXT, meta TEXT,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_audit_action ON audit_logs(action);

CREATE TABLE notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id), booking_id INTEGER REFERENCES bookings(id),
  channel TEXT NOT NULL CHECK (channel IN ('email','sms')),
  recipient TEXT, subject TEXT, body TEXT,
  status TEXT NOT NULL DEFAULT 'logged' CHECK (status IN ('sent','failed','logged')),
  kind TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Every QR / reference check at the gate (online or synced from an offline phone)
CREATE TABLE ticket_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER REFERENCES bookings(id),
  ref TEXT, result TEXT NOT NULL,
  cashier_id INTEGER REFERENCES users(id),
  source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','offline-sync')),
  scanned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  note TEXT
);
CREATE INDEX idx_scans_booking ON ticket_scans(booking_id);

CREATE TRIGGER trg_users_updated AFTER UPDATE ON users BEGIN UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id; END;
CREATE TRIGGER trg_categories_updated AFTER UPDATE ON categories BEGIN UPDATE categories SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id; END;
CREATE TRIGGER trg_bookings_updated AFTER UPDATE ON bookings BEGIN UPDATE bookings SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id; END;
CREATE TRIGGER trg_payments_updated AFTER UPDATE ON payments BEGIN UPDATE payments SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id; END;
CREATE TRIGGER trg_refunds_updated AFTER UPDATE ON refunds BEGIN UPDATE refunds SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = NEW.id; END;
