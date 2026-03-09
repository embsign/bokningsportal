# Datamodell (uppdaterad)

Denna modell speglar nuvarande frontend‑implementation och UX‑flöden.

## Översikt

Huvuddomäner:
- **Boende/användare** (user)
- **Bokningsobjekt** (booking object)
- **Bokningar** (bookings)
- **Behörighetsgrupper** (access groups)
- **Inloggning** (access tokens, sessions, RFID)
- **Adminflöden** (importregler, rapporter)

## Entiteter

### tenants
- **Syfte**: BRF/tenant.
- **Fält**:
  - `id` (TEXT, PK)
  - `name` (TEXT, NOT NULL)
  - `is_active` (INTEGER, NOT NULL, default `1`)
  - `created_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)
  - `organization_number` (TEXT, nullable)
  - `admin_email` (TEXT, nullable)

### users
- **Syfte**: Boende/användare (lägenhet/identitet).
- **Fält**:
  - `id` (TEXT, PK) — intern unik identifierare
  - `tenant_id` (TEXT, NOT NULL)
  - `identity` (TEXT, NOT NULL) — visningsidentitet (t.ex. "1-LGH1001 /1001")
  - `apartment_id` (TEXT, NOT NULL) — lägenhets‑ID
  - `house` (TEXT, nullable)
  - `is_active` (INTEGER, NOT NULL, default `1`)
  - `is_admin` (INTEGER, NOT NULL, default `0`) — manuellt admin‑flagga
  - `created_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)
  - `updated_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)

### access_groups
- **Syfte**: Behörighetsgrupper som kan tilldelas användare.
- **Fält**:
  - `id` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `name` (TEXT, NOT NULL)

### user_access_groups
- **Syfte**: Many‑to‑many mellan users och access_groups.
- **Fält**:
  - `user_id` (TEXT, NOT NULL)
  - `group_id` (TEXT, NOT NULL)
- **Constraints**: PK (`user_id`, `group_id`)

### rfid_tags
- **Syfte**: Koppling RFID‑UID → user.
- **Fält**:
  - `tenant_id` (TEXT, NOT NULL)
  - `uid` (TEXT, NOT NULL)
  - `user_id` (TEXT, NOT NULL)
  - `is_active` (INTEGER, NOT NULL, default `1`)
- **Constraints**: PK (`tenant_id`, `uid`)

### access_tokens
- **Syfte**: QR‑/kiosk‑inloggning via UUID‑token.
- **Fält**:
  - `token` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `user_id` (TEXT, NOT NULL)
  - `created_at` (TEXT, NOT NULL)
  - `last_used_at` (TEXT, nullable)
  - `revoked_at` (TEXT, nullable)
  - `source` (TEXT, NOT NULL) — `kiosk`, `user`, `admin`

### sessions
- **Syfte**: Server‑session (cookie).
- **Fält**:
  - `token` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `user_id` (TEXT, NOT NULL)
  - `is_admin` (INTEGER, NOT NULL, default `0`)
  - `created_at` (TEXT, NOT NULL)
  - `last_seen_at` (TEXT, NOT NULL)
  - `expires_at` (TEXT, NOT NULL)

### booking_groups
- **Syfte**: Samlar max‑regler för bokningsobjekt.
- **Fält**:
  - `id` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `name` (TEXT, NOT NULL)
  - `max_bookings` (INTEGER, NOT NULL)

### booking_objects
- **Syfte**: Resurser som kan bokas.
- **Fält**:
  - `id` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT, nullable)
  - `booking_type` (TEXT, NOT NULL) — `time-slot` | `full-day`
  - `slot_duration_minutes` (INTEGER, nullable) — endast för `time-slot`
  - `window_min_days` (INTEGER, NOT NULL, default `0`)
  - `window_max_days` (INTEGER, NOT NULL, default `30`)
  - `price_weekday_cents` (INTEGER, NOT NULL, default `0`)
  - `price_weekend_cents` (INTEGER, NOT NULL, default `0`)
  - `is_active` (INTEGER, NOT NULL, default `1`)
  - `group_id` (TEXT, nullable) — FK till `booking_groups`
  - `max_bookings_override` (INTEGER, nullable)

### booking_object_permissions
- **Syfte**: Allow/Deny‑regler per bokningsobjekt.
- **Fält**:
  - `booking_object_id` (TEXT, NOT NULL)
  - `mode` (TEXT, NOT NULL) — `allow` | `deny`
  - `scope` (TEXT, NOT NULL) — `house` | `group` | `apartment`
  - `value` (TEXT, NOT NULL)
- **Constraints**: index på (`booking_object_id`, `mode`, `scope`)

### bookings
- **Syfte**: Bokningar gjorda av användare.
- **Fält**:
  - `id` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `user_id` (TEXT, NOT NULL)
  - `booking_object_id` (TEXT, NOT NULL)
  - `start_time` (TEXT, NOT NULL)
  - `end_time` (TEXT, NOT NULL)
  - `price_cents` (INTEGER, NOT NULL, default `0`)
  - `created_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)
  - `cancelled_at` (TEXT, nullable)

### booking_blocks
- **Syfte**: Admin‑blockeringar av tider/dagar.
- **Fält**:
  - `id` (TEXT, PK)
  - `tenant_id` (TEXT, NOT NULL)
  - `booking_object_id` (TEXT, NOT NULL)
  - `start_time` (TEXT, NOT NULL)
  - `end_time` (TEXT, NOT NULL)
  - `reason` (TEXT, nullable)
  - `created_by` (TEXT, NOT NULL)
  - `created_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)

### user_import_rules
- **Syfte**: Sparade inställningar för CSV‑import.
- **Fält**:
  - `tenant_id` (TEXT, NOT NULL)
  - `identity_field` (TEXT, NOT NULL)
  - `groups_field` (TEXT, nullable)
  - `rfid_field` (TEXT, nullable)
  - `active_field` (TEXT, nullable)
  - `house_field` (TEXT, nullable)
  - `apartment_field` (TEXT, nullable)
  - `house_regex` (TEXT, nullable)
  - `apartment_regex` (TEXT, nullable)
  - `group_separator` (TEXT, nullable)
  - `admin_groups` (TEXT, nullable) — lista, t.ex. "Styrelse|Jour"
  - `updated_at` (TEXT, NOT NULL, default `CURRENT_TIMESTAMP`)
- **Constraints**: PK (`tenant_id`)

## Viktiga constraints
- **Bokningsfönster**: `window_min_days`/`window_max_days` styr tillgänglighet.
- **Maxbokningar**: från `booking_groups.max_bookings` eller `max_bookings_override`.
- **Behörigheter**: allow/deny‑regler filtrerar vilka användare som kan boka objektet.
- **Admin**: `users.is_admin` styr admin‑åtkomst; även admin‑grupper kan sätta flaggan vid import.

## Indexförslag
- `users`: `idx_users_tenant_active` på (`tenant_id`, `is_active`)
- `bookings`: `idx_bookings_object_time`, `idx_bookings_user_time`
- `booking_blocks`: `idx_blocks_object_time`
- `rfid_tags`: `idx_rfid_tags_tenant_uid`
