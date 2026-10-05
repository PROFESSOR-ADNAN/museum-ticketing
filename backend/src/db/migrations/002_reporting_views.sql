-- Read-only views for reports. Open the .sqlite file in "DB Browser for SQLite", Excel (ODBC) or Power BI and query these directly.
-- Money columns are in ETB (santim / 100). Dates in Addis Ababa time (UTC+3).

CREATE VIEW v_bookings AS
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

CREATE VIEW v_booking_lines AS
SELECT b.ref AS booking_ref, b.visit_date, b.status, l.key AS category, l.name_en, l.name_am,
       l.unit_price_cents / 100.0 AS unit_price_etb, l.quantity AS booked, l.attended_quantity AS attended,
       (l.quantity * l.unit_price_cents) / 100.0 AS booked_value_etb,
       (COALESCE(l.attended_quantity, 0) * l.unit_price_cents) / 100.0 AS attended_value_etb
FROM booking_lines l JOIN bookings b ON b.id = l.booking_id;

CREATE VIEW v_payments AS
SELECT p.id, p.created_at, p.paid_at, b.ref AS booking_ref, p.provider, p.provider_ref AS tx_ref, p.provider_txn_id AS provider_reference,
       p.status, p.amount_cents / 100.0 AS amount_etb, p.fee_cents / 100.0 AS provider_fee_etb, p.note
FROM payments p JOIN bookings b ON b.id = p.booking_id;

CREATE VIEW v_refunds AS
SELECT r.id, r.created_at, b.ref AS booking_ref, r.reason, r.status,
       r.gross_cents / 100.0 AS gross_etb, r.fee_share_cents / 100.0 AS provider_fee_withheld_etb, r.net_cents / 100.0 AS paid_to_visitor_etb,
       r.provider_refund_ref, r.needs_review, r.last_error, s.ref AS deducted_in_settlement
FROM refunds r JOIN bookings b ON b.id = r.booking_id LEFT JOIN settlements s ON s.id = r.settlement_id;

CREATE VIEW v_settlements AS
SELECT s.id, s.ref, s.created_at, u.name AS cashier, s.gross_cents / 100.0 AS gross_etb,
       s.refund_deduction_cents / 100.0 AS refund_deduction_etb, s.net_cents / 100.0 AS net_etb, s.words_en, s.words_am,
       (SELECT COUNT(*) FROM bookings b WHERE b.settlement_id = s.id) AS bookings_covered
FROM settlements s JOIN users u ON u.id = s.cashier_id;

-- Earned revenue = money for people who actually visited, per Addis Ababa day
CREATE VIEW v_daily_revenue AS
SELECT date(visited_at, '+3 hours') AS day,
       SUM(attended_quantity) AS visitors,
       SUM(CASE WHEN kind = 'individual' THEN attended_quantity ELSE 0 END) AS individual_visitors,
       SUM(CASE WHEN kind = 'group' THEN attended_quantity ELSE 0 END) AS group_visitors,
       SUM(attended_amount_cents) / 100.0 AS earned_etb,
       COUNT(*) AS bookings
FROM bookings WHERE status = 'Visited' GROUP BY day;

CREATE VIEW v_scans AS
SELECT t.id, t.scanned_at, t.ref, t.result, t.source, u.name AS cashier, t.note
FROM ticket_scans t LEFT JOIN users u ON u.id = t.cashier_id;
