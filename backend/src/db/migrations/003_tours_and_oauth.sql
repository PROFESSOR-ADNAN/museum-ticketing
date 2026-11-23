-- Migration 003: Tours (guided vs self-guided) and Google OAuth
ALTER TABLE bookings ADD COLUMN is_guided INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
