-- Science Museum Ticketing — PostgreSQL Schema v1
-- Money is stored as INTEGER santim (1 ETB = 100 santim)
-- Dates: visit_date is DATE; timestamps are TIMESTAMPTZ

-- Drop views first
DROP VIEW IF EXISTS v_scans CASCADE;
DROP VIEW IF EXISTS v_daily_revenue CASCADE;
DROP VIEW IF EXISTS v_settlements CASCADE;
DROP VIEW IF EXISTS v_refunds CASCADE;
DROP VIEW IF EXISTS v_payments CASCADE;
DROP VIEW IF EXISTS v_booking_lines CASCADE;
DROP VIEW IF EXISTS v_bookings CASCADE;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'visitor' CHECK (role IN ('visitor','cashier','manager','admin')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_code VARCHAR(20),
  phone_code VARCHAR(20),
  code_expires_at TIMESTAMPTZ,
  code_attempts INT NOT NULL DEFAULT 0,
  language VARCHAR(10) NOT NULL DEFAULT 'en' CHECK (language IN ('en','am')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) NOT NULL UNIQUE,
  name_en VARCHAR(255) NOT NULL,
  name_am VARCHAR(255) NOT NULL,
  desc_en TEXT,
  desc_am TEXT,
  price_cents INT NOT NULL CHECK (price_cents >= 0),
  online_bookable BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Settlements
CREATE TABLE IF NOT EXISTS settlements (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(50) NOT NULL UNIQUE,
  cashier_id INT NOT NULL REFERENCES users(id),
  gross_cents INT NOT NULL,
  refund_deduction_cents INT NOT NULL,
  net_cents INT NOT NULL,
  words_en TEXT NOT NULL,
  words_am TEXT NOT NULL,
  purpose_en TEXT NOT NULL,
  purpose_am TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(50) NOT NULL UNIQUE,
  visitor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind VARCHAR(20) NOT NULL DEFAULT 'individual' CHECK (kind IN ('individual','group')),
  visit_date DATE NOT NULL,
  time_slot VARCHAR(50),
  organization VARCHAR(255),
  contact_name VARCHAR(255),
  contact_phone VARCHAR(50),
  booked_quantity INT NOT NULL CHECK (booked_quantity > 0),
  amount_cents INT NOT NULL CHECK (amount_cents >= 0),
  status VARCHAR(50) NOT NULL CHECK (status IN ('PendingApproval','Declined','AwaitingPayment','Pending','Visited','Cancelled','Refunded')),
  channel VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (channel IN ('online','manager')),
  decision_by INT REFERENCES users(id) ON DELETE SET NULL,
  decision_at TIMESTAMPTZ,
  decision_note TEXT,
  paid_at TIMESTAMPTZ,
  payment_ref VARCHAR(100),
  temp_receipt_no VARCHAR(100),
  aggregator_fee_cents INT NOT NULL DEFAULT 0,
  reschedule_count INT NOT NULL DEFAULT 0,
  original_visit_date DATE,
  no_show_notice_at TIMESTAMPTZ,
  attended_quantity INT,
  attended_amount_cents INT,
  visited_at TIMESTAMPTZ,
  visited_by INT REFERENCES users(id) ON DELETE SET NULL,
  refunded_cents INT NOT NULL DEFAULT 0,
  shortfall_refunded BOOLEAN NOT NULL DEFAULT FALSE,
  settlement_id INT REFERENCES settlements(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_visitor ON bookings(visitor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(visit_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON bookings(status, visit_date);
CREATE INDEX IF NOT EXISTS idx_bookings_settlement ON bookings(settlement_id);

-- 5. Booking Lines
CREATE TABLE IF NOT EXISTS booking_lines (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id),
  key VARCHAR(50) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  name_am VARCHAR(255) NOT NULL,
  unit_price_cents INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  attended_quantity INT,
  UNIQUE (booking_id, category_id)
);

-- 6. Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_ref VARCHAR(100) NOT NULL UNIQUE,
  provider_txn_id VARCHAR(100),
  amount_cents INT NOT NULL,
  fee_cents INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','succeeded','failed')),
  checkout_url TEXT,
  client_return_url TEXT,
  paid_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

-- 7. Refunds
CREATE TABLE IF NOT EXISTS refunds (
  id SERIAL PRIMARY KEY,
  booking_id INT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('cancel','shortfall','no_response','orphan')),
  payment_id INT REFERENCES payments(id) ON DELETE SET NULL,
  gross_cents INT NOT NULL,
  fee_share_cents INT NOT NULL DEFAULT 0,
  net_cents INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','done','failed')),
  provider_refund_ref VARCHAR(100),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  requested_by INT REFERENCES users(id) ON DELETE SET NULL,
  settlement_id INT REFERENCES settlements(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, reason)
);

-- 8. Date Closures
CREATE TABLE IF NOT EXISTS date_closures (
  date DATE PRIMARY KEY,
  reason TEXT,
  closed_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entity_id INT,
  amount_cents INT,
  booking_refs TEXT,
  meta TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- 10. Notices
CREATE TABLE IF NOT EXISTS notices (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('email','sms')),
  recipient VARCHAR(255),
  subject TEXT,
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'logged' CHECK (status IN ('sent','failed','logged')),
  kind VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Ticket Scans
CREATE TABLE IF NOT EXISTS ticket_scans (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
  ref VARCHAR(50),
  result VARCHAR(50) NOT NULL,
  cashier_id INT REFERENCES users(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'online' CHECK (source IN ('online','offline-sync')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_scans_booking ON ticket_scans(booking_id);

-- Views for Reports
CREATE OR REPLACE VIEW v_bookings AS
SELECT b.id, b.ref, b.status, b.kind, b.channel, b.visit_date, b.time_slot, b.organization,
       u.name AS visitor_name, u.email AS visitor_email, u.phone AS visitor_phone,
       b.booked_quantity, b.attended_quantity,
       b.amount_cents / 100.0 AS amount_etb,
       b.attended_amount_cents / 100.0 AS attended_amount_etb,
       b.aggregator_fee_cents / 100.0 AS provider_fee_etb,
       b.refunded_cents / 100.0 AS refunded_etb,
       b.paid_at, b.visited_at, b.reschedule_count, b.temp_receipt_no,
       s.ref AS settlement_ref, b.created_at
FROM bookings b
JOIN users u ON u.id = b.visitor_id
LEFT JOIN settlements s ON s.id = b.settlement_id;

CREATE OR REPLACE VIEW v_booking_lines AS
SELECT b.ref AS booking_ref, b.visit_date, b.status, l.key AS category, l.name_en, l.name_am,
       l.unit_price_cents / 100.0 AS unit_price_etb, l.quantity AS booked, l.attended_quantity AS attended,
       (l.quantity * l.unit_price_cents) / 100.0 AS booked_value_etb,
       (COALESCE(l.attended_quantity, 0) * l.unit_price_cents) / 100.0 AS attended_value_etb
FROM booking_lines l JOIN bookings b ON b.id = l.booking_id;

CREATE OR REPLACE VIEW v_payments AS
SELECT p.id, p.created_at, p.paid_at, b.ref AS booking_ref, p.provider, p.provider_ref AS tx_ref, p.provider_txn_id AS provider_reference,
       p.status, p.amount_cents / 100.0 AS amount_etb, p.fee_cents / 100.0 AS provider_fee_etb, p.note
FROM payments p JOIN bookings b ON b.id = p.booking_id;

CREATE OR REPLACE VIEW v_refunds AS
SELECT r.id, r.created_at, b.ref AS booking_ref, r.reason, r.status,
       r.gross_cents / 100.0 AS gross_etb, r.fee_share_cents / 100.0 AS provider_fee_withheld_etb, r.net_cents / 100.0 AS paid_to_visitor_etb,
       r.provider_refund_ref, r.needs_review, r.last_error, s.ref AS deducted_in_settlement
FROM refunds r JOIN bookings b ON b.id = r.booking_id LEFT JOIN settlements s ON s.id = r.settlement_id;

CREATE OR REPLACE VIEW v_settlements AS
SELECT s.id, s.ref, s.created_at, u.name AS cashier, s.gross_cents / 100.0 AS gross_etb,
       s.refund_deduction_cents / 100.0 AS refund_deduction_etb, s.net_cents / 100.0 AS net_etb, s.words_en, s.words_am,
       (SELECT COUNT(*) FROM bookings b WHERE b.settlement_id = s.id) AS bookings_covered
FROM settlements s JOIN users u ON u.id = s.cashier_id;

CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT (visited_at AT TIME ZONE 'Africa/Addis_Ababa')::date AS day,
       SUM(attended_quantity) AS visitors,
       SUM(CASE WHEN kind = 'individual' THEN attended_quantity ELSE 0 END) AS individual_visitors,
       SUM(CASE WHEN kind = 'group' THEN attended_quantity ELSE 0 END) AS group_visitors,
       SUM(attended_amount_cents) / 100.0 AS earned_etb,
       COUNT(*) AS bookings
FROM bookings WHERE status = 'Visited' GROUP BY (visited_at AT TIME ZONE 'Africa/Addis_Ababa')::date;

CREATE OR REPLACE VIEW v_scans AS
SELECT t.id, t.scanned_at, t.ref, t.result, t.source, u.name AS cashier, t.note
FROM ticket_scans t LEFT JOIN users u ON u.id = t.cashier_id;
