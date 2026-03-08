# Database Schema

Schema is defined by D1 migrations in `cloudflare/worker/migrations`.

## Tables

### tenants
- **Fields**:
  - `id` (TEXT, PK)
  - `name` (TEXT, NOT NULL)
  - `admin_apartment_id` (TEXT, NOT NULL, default `admin`)
  - `is_active` (INTEGER, NOT NULL, default `1`)
  - `created_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)
  - `admin_email` (TEXT, nullable) — contact email only (not for auth)
  - `organization_number` (TEXT, nullable)
- **Relationships**: has many `tenant_configs`, `apartments`, `resources`, `bookings`,
  `booking_blocks`, `sessions`, `rfid_tags`.

### tenant_configs
- **Fields**:
  - `tenant_id` (TEXT, NOT NULL)
  - `key` (TEXT, NOT NULL)
  - `value` (TEXT, NOT NULL)
  - `updated_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)
- **Constraints**: PK (`tenant_id`, `key`), FK to `tenants`.

### apartments
- **Fields**:
  - `tenant_id` (TEXT, NOT NULL)
  - `id` (TEXT, NOT NULL)
  - `is_active` (INTEGER, NOT NULL, default `1`)
  - `house` (TEXT, nullable)
  - `lgh_internal` (TEXT, nullable)
  - `skv_lgh` (TEXT, nullable)
  - `access_groups` (TEXT, nullable)
- **Constraints**: PK (`tenant_id`, `id`), FK to `tenants`.

### resources
- **Fields**:
  - `id` (INTEGER, PK, autoincrement)
  - `tenant_id` (TEXT, NOT NULL)
  - `name` (TEXT, NOT NULL)
  - `booking_type` (TEXT, NOT NULL, default `time-slot`)
  - `category` (TEXT, NOT NULL, default `""`)
  - `slot_duration_minutes` (INTEGER, NOT NULL, default `60`)
  - `slot_start_hour` (INTEGER, NOT NULL, default `6`)
  - `slot_end_hour` (INTEGER, NOT NULL, default `22`)
  - `max_future_days` (INTEGER, NOT NULL, default `30`)
  - `min_future_days` (INTEGER, NOT NULL, default `0`)
  - `max_bookings` (INTEGER, NOT NULL, default `2`)
  - `allow_houses` (TEXT, NOT NULL, default `""`)
  - `deny_apartment_ids` (TEXT, NOT NULL, default `""`)
  - `is_active` (INTEGER, NOT NULL, default `1`)
  - `price_weekday_cents` (INTEGER, NOT NULL, default `0`)
  - `price_weekend_cents` (INTEGER, NOT NULL, default `0`)
  - `price_cents` (INTEGER, NOT NULL, default `0`)
  - `is_billable` (INTEGER, NOT NULL, default `0`)
- **Constraints**: FK to `tenants`.

### bookings
- **Fields**:
  - `id` (INTEGER, PK, autoincrement)
  - `tenant_id` (TEXT, NOT NULL)
  - `apartment_id` (TEXT, NOT NULL)
  - `resource_id` (INTEGER, NOT NULL)
  - `start_time` (TEXT, NOT NULL)
  - `end_time` (TEXT, NOT NULL)
  - `is_billable` (INTEGER, NOT NULL, default `0`)
- **Constraints**: FK to `tenants`, FK to `resources`.

### booking_blocks
- **Fields**:
  - `id` (INTEGER, PK, autoincrement)
  - `tenant_id` (TEXT, NOT NULL)
  - `resource_id` (INTEGER, NOT NULL)
  - `start_time` (TEXT, NOT NULL)
  - `end_time` (TEXT, NOT NULL)
  - `reason` (TEXT, NOT NULL, default `""`)
  - `created_by` (TEXT, NOT NULL, default `admin`)
  - `created_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)
- **Constraints**: FK to `tenants`, FK to `resources`.

### sessions
- **Fields**:
  - `token` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `apartment_id` (TEXT, NOT NULL)
  - `is_admin` (INTEGER, NOT NULL, default `0`)
  - `created_at` (TEXT, NOT NULL)
  - `last_seen_at` (TEXT, NOT NULL)
  - `expires_at` (TEXT, NOT NULL)
- **Constraints**: FK to `tenants`.

### access_tokens
- **Fields**:
  - `token` (TEXT, PK) — UUID access token
  - `tenant_id` (TEXT, NOT NULL)
  - `apartment_id` (TEXT, NOT NULL)
  - `is_admin` (INTEGER, NOT NULL, default `0`)
  - `created_at` (TEXT, NOT NULL)
  - `last_used_at` (TEXT, nullable)
  - `revoked_at` (TEXT, nullable)
  - `source` (TEXT, nullable) — e.g. `kiosk`, `setup`
- **Constraints**: FK to `tenants`.

### rfid_tags
- **Fields**:
  - `tenant_id` (TEXT, NOT NULL)
  - `uid` (TEXT, NOT NULL)
  - `apartment_id` (TEXT, NOT NULL)
  - `house` (TEXT, NOT NULL, default `""`)
  - `lgh_internal` (TEXT, NOT NULL, default `""`)
  - `skv_lgh` (TEXT, NOT NULL, default `""`)
  - `access_groups` (TEXT, NOT NULL, default `""`)
  - `is_admin` (INTEGER, NOT NULL, default `0`)
  - `is_active` (INTEGER, NOT NULL, default `1`)
- **Constraints**: PK (`tenant_id`, `uid`), FK to `tenants`.

## Indexes
- `resources`: `idx_resources_tenant_active` on (`tenant_id`, `is_active`, `id`)
- `bookings`: `idx_bookings_resource_time`, `idx_bookings_apartment_time`
- `booking_blocks`: `idx_booking_blocks_resource_time`
- `sessions`: `idx_sessions_tenant_token`
- `rfid_tags`: `idx_rfid_tags_tenant_apartment`

## Missing Information / Open Questions
- Uttalad strategi för datamigrering/backups (t.ex. D1 export/restore).
- Eventuella constraints i applikationskod som inte uttrycks i DB (t.ex. unika regler per tenant).
- D1‑migreringar behöver uppdateras för att ta bort lösenordsfält och lägga till `access_tokens`.
