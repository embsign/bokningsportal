PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_accessed_at TEXT,
  account_owner_token TEXT,
  organization_number TEXT,
  admin_email TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  apartment_id TEXT NOT NULL,
  house TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (tenant_id, apartment_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS access_groups (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS user_access_groups (
  user_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  PRIMARY KEY (user_id, group_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES access_groups(id)
);

CREATE TABLE IF NOT EXISTS rfid_tags (
  uid TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, uid),
  CHECK (uid = UPPER(uid)),
  CHECK (uid NOT GLOB '*[^0-9A-F]*'),
  CHECK (LENGTH(uid) >= 4),
  CHECK (LENGTH(REPLACE(uid, '0', '')) >= 1),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS access_tokens (
  token TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  source TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS booking_groups (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  max_bookings INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS booking_objects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  booking_type TEXT NOT NULL,
  slot_duration_minutes INTEGER,
  full_day_start_time TEXT NOT NULL DEFAULT '12:00',
  full_day_end_time TEXT NOT NULL DEFAULT '12:00',
  time_slot_start_time TEXT NOT NULL DEFAULT '08:00',
  time_slot_end_time TEXT NOT NULL DEFAULT '20:00',
  window_min_days INTEGER NOT NULL DEFAULT 0,
  window_max_days INTEGER NOT NULL DEFAULT 30,
  price_weekday_cents INTEGER NOT NULL DEFAULT 0,
  price_weekend_cents INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  group_id TEXT,
  max_bookings_override INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (group_id) REFERENCES booking_groups(id)
);

CREATE TABLE IF NOT EXISTS booking_object_permissions (
  booking_object_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  scope TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (booking_object_id) REFERENCES booking_objects(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  booking_object_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (booking_object_id) REFERENCES booking_objects(id)
);

CREATE TABLE IF NOT EXISTS booking_blocks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  booking_object_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (booking_object_id) REFERENCES booking_objects(id)
);

CREATE TABLE IF NOT EXISTS user_import_rules (
  tenant_id TEXT PRIMARY KEY,
  identity_field TEXT NOT NULL,
  groups_field TEXT,
  rfid_field TEXT,
  active_field TEXT,
  house_field TEXT,
  apartment_field TEXT,
  house_regex TEXT,
  apartment_regex TEXT,
  group_separator TEXT,
  admin_groups TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
