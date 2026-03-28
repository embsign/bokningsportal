CREATE TABLE IF NOT EXISTS booking_screens (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pairing_code TEXT NOT NULL UNIQUE,
  screen_token TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paired_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  last_verified_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS kiosk_pairing_codes (
  code TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  paired_screen_id TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  paired_at TEXT,
  FOREIGN KEY (paired_screen_id) REFERENCES booking_screens(id)
);

CREATE INDEX IF NOT EXISTS idx_booking_screens_tenant_active ON booking_screens(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_booking_screens_tenant_name ON booking_screens(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_kiosk_pairing_codes_status_expires ON kiosk_pairing_codes(status, expires_at);
