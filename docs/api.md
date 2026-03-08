# API Specification

## Conventions
- Base path: `/api`
- Auth: HttpOnly `session` cookie for authenticated endpoints.
- Tenant resolution (API): UUID access‑token for web access, RFID UID lookup for kiosk login.
- Query‑parametrar `brf_id`/`brf` används inte längre för tenant‑resolution.
- Error format: `{ "detail": "error_code" }`

## Missing Information / Open Questions
- Eventuella rate limits eller abuse‑skydd (ej explicit i koden).

## Endpoint

GET /api/health

Description
Health check for the Worker API.

Request body
None.

Response
`{ "status": "ok" }`

Errors
- `500 internal_error` (unexpected server error)

Auth requirements
None.

## Endpoint

GET /api/public/tenants

Description
List active tenants.

Request body
None.

Response
`{ "tenants": [{ "id": "...", "name": "..." }] }`

Errors
- `500 internal_error`

Auth requirements
None.

## Endpoint

GET /api/public/captcha-config

Description
Return captcha provider settings for registration.

Request body
None.

Response
`{ "provider": "turnstile", "enabled": true, "site_key": "...", "reason": "ok", "manual_fallback_allowed": false }`

Errors
- `500 internal_error`

Auth requirements
None.

## Endpoint

GET /api/public/subdomain-availability

Description
Deprecated (subdomains are not used for tenant selection).

Request body
None.

Response
`{ "subdomain": "min-brf", "available": true, "reason": "available" }`

Errors
- `500 internal_error`

Auth requirements
None.

## Endpoint

POST /api/public/tenants

Description
Create a tenant directly (admin access token returned in response).

Request body
`{ "tenant_id": "min-brf", "name": "Min BRF", "config": { "some_key": "value" } }`

Response
`{ "tenant_id": "min-brf", "name": "Min BRF", "admin_apartment_id": "admin", "admin_access_token": "uuid", "admin_login_url": "https://min-brf.example.org?access_token=uuid" }`

Errors
- `400 invalid_tenant_id`
- `400 invalid_tenant_name`
- `409 tenant_exists`
- `500 internal_error`

Auth requirements
None.

## Endpoint

POST /api/public/register

Description
Register a new tenant and return admin access token (shown once in setup).

Request body
`{ "subdomain": "min-brf", "association_name": "Min BRF", "name": "Min BRF", "organization_number": "5566778899", "captcha_token": "..." }`

Response
`{ "status": "ok", "tenant_id": "min-brf", "login_url": "https://min-brf.example.org", "admin_access_token": "uuid", "admin_login_url": "https://min-brf.example.org?access_token=uuid" }`

Errors
- `400 invalid_subdomain`
- `400 invalid_association_name`
- `400 invalid_organization_number`
- `400 captcha_failed:<reason>`
- `409 subdomain_taken`
- `500 internal_error`

Auth requirements
None.

## Endpoint

POST /api/access-token-login

Description
Login with a UUID access token (from QR link). Sets `session` cookie.

Request body
`{ "access_token": "uuid" }`

Response
`{ "booking_url": "/", "apartment_id": "1001", "is_admin": false }`

Errors
- `400 invalid_access_token`
- `401 invalid_access_token`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
None (token resolves tenant/apartment).

## Endpoint

POST /api/rfid-login

Description
Login with RFID tag UID. Sets `session` cookie.

Request body
`{ "uid": "A1B2C3D4" }`

Response
`{ "booking_url": "/", "apartment_id": "1001", "is_admin": false }`

Errors
- `400 invalid_rfid`
- `401 invalid_rfid`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
None. Tenant is resolved via UID lookup in RFID tags.

## Endpoint

POST /api/kiosk/access-token

Description
Generate/rotate access token for the current session (kiosk user). Returns URL used for QR login.
Calling again invalidates the previous token for the same apartment.
Token is long‑lived and remains valid until rotation.

Request body
None.

Response
`{ "access_token": "uuid", "login_url": "https://min-brf.example.org?access_token=uuid" }`

Errors
- `401 unauthorized`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + session cookie.

## Endpoint

GET /api/resources

Description
List active resources. Non-admins only see resources they can access.

Request body
None.

Response
`{ "resources": [{ "id": 1, "name": "...", "booking_type": "time-slot", "category": "", "slot_duration_minutes": 60, "slot_start_hour": 6, "slot_end_hour": 22, "max_future_days": 30, "min_future_days": 0, "max_bookings": 2, "allow_houses": "", "deny_apartment_ids": "", "price_weekday_cents": 0, "price_weekend_cents": 0, "price_cents": 0, "is_billable": 0 }] }`

Errors
- `401 unauthorized`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + session cookie.

## Endpoint

GET /api/bookings

Description
List bookings for the current user; admins receive full calendar (bookings + blocks).

Request body
None.

Response
- Non-admin: `{ "bookings": [{ "id": 1, "resource_id": 1, "start_time": "...", "end_time": "...", "is_billable": 0, "resource_name": "...", "booking_type": "time-slot", "price_cents": 0 }] }`
- Admin: `{ "bookings": [{ "id": 1, "apartment_id": "1001", "resource_id": 1, "start_time": "...", "end_time": "...", "is_billable": 0, "resource_name": "...", "booking_type": "time-slot", "price_cents": 0, "entry_type": "booking", "blocked_reason": "" }] }`

Errors
- `401 unauthorized`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + session cookie.

## Endpoint

GET /api/admin/calendar

Description
Admin calendar with bookings and blocks.

Request body
None.

Response
`{ "bookings": [{ "id": 1, "apartment_id": "1001", "resource_id": 1, "start_time": "...", "end_time": "...", "is_billable": 0, "resource_name": "...", "booking_type": "time-slot", "price_cents": 0, "entry_type": "booking", "blocked_reason": "" }] }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

GET /api/slots

Description
List bookable slots for a date (time-slot or full-day). If `resource_id` is omitted, returns slots across all resources.

Request body
None.

Response
`{ "slots": [{ "resource_id": 1, "start_time": "...", "end_time": "...", "is_booked": false, "is_past": false }] }`

Errors
- `401 unauthorized`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + session cookie.

## Endpoint

GET /api/availability-range

Description
Full-day availability for a resource within a date range.

Request body
None.

Response
`{ "availability": [{ "date": "2030-01-15", "resource_id": 1, "start_time": "...", "end_time": "...", "is_booked": false, "is_past": false, "is_available": true }] }`

Errors
- `400 invalid_date`
- `400 invalid_date_range`
- `400 date_range_too_large`
- `401 unauthorized`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + session cookie.

## Endpoint

POST /api/book

Description
Create a booking for a resource.

Request body
`{ "apartment_id": "1001", "resource_id": 1, "start_time": "...", "end_time": "...", "is_billable": false }`

Response
`{ "booking_id": 123 }`

Errors
- `400 invalid_payload`
- `400 invalid_time_range`
- `403 forbidden`
- `403 forbidden_resource`
- `409 outside_booking_window`
- `409 max_bookings_reached`
- `409 overlap`
- `401 unauthorized`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + session cookie (admins may book on behalf of others).

## Endpoint

DELETE /api/cancel

Description
Cancel an existing booking. Non-admins can only cancel their own bookings.

Request body
`{ "booking_id": 123 }`

Response
`204 No Content`

Errors
- `400 invalid_payload`
- `404 not_found`
- `401 unauthorized`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + session cookie.

## Endpoint

POST /api/admin/block

Description
Create a booking block for a resource.

Request body
`{ "resource_id": 1, "start_time": "...", "end_time": "...", "reason": "Underhall" }`

Response
`{ "block_id": 123 }`

Errors
- `400 resource_not_found`
- `400 invalid_time_range`
- `404 resource_not_found`
- `409 overlap`
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

DELETE /api/admin/block

Description
Remove a booking block.

Request body
`{ "block_id": 123 }`

Response
`{ "status": "ok" }`

Errors
- `400 invalid_payload`
- `404 not_found`
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

GET /api/admin/config

Description
Fetch tenant configuration key/values.

Request body
None.

Response
`{ "tenant_id": "min-brf", "configs": { "key": "value" } }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

PUT /api/admin/config

Description
Upsert tenant configuration key/values.

Request body
`{ "configs": { "key": "value" } }`

Response
`{ "status": "ok" }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

GET /api/admin/users

Description
List apartments and house groups.

Request body
None.

Response
`{ "users": [{ "id": "1001", "house": "A" }], "houses": ["A"], "apartments": ["1001"] }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

GET /api/admin/axema/rules

Description
Fetch Axema CSV import rules.

Request body
None.

Response
`{ "rules": { ... } }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

PUT /api/admin/axema/rules

Description
Save Axema CSV import rules.

Request body
`{ "rules": { ... } }`

Response
`{ "status": "ok", "rules": { ... } }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

GET /api/admin/axema/import-status

Description
Fetch import status for the latest Axema import, optionally filtered by `import_id`.

Request body
None.

Response
`{ "status": null }` or `{ "status": { "import_id": "...", "phase": "running", "processed": 0, "total": 10, "done": false, "error": "import_failed", "added": 0, "updated": 0, "removed": 0, "updated_at": "..." } }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

POST /api/admin/axema/preview

Description
Parse Axema CSV and preview changes without applying them.

Request body
`{ "csv_text": "...", "rules": { ... } }`

Response
`{ "rules": { ... }, "headers": ["..."], "parsed_rows": [...], "available_access_groups": ["..."], "diff": { ... } }`

Errors
- `400 missing_csv`
- `400 invalid_regex:<reason>`
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

POST /api/admin/axema/apply

Description
Apply Axema CSV import actions.

Request body
`{ "csv_text": "...", "import_id": "...", "rules": { ... }, "actions": { "add_new": true, "update_existing": true, "remove_missing": true } }`

Response
`{ "status": "ok", "import_id": "...", "applied": { "add_new": true, "update_existing": true, "remove_missing": true, "added": 0, "updated": 0, "removed": 0 }, "summary": { ... }, "progress": { "processed": 0, "total": 0, "done": true } }`

Errors
- `400 missing_csv`
- `400 invalid_regex:<reason>`
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

GET /api/admin/resources

Description
List resources (optionally include inactive).

Request body
None.

Response
`{ "resources": [{ "id": 1, "name": "...", "booking_type": "time-slot", "category": "", "slot_duration_minutes": 60, "slot_start_hour": 6, "slot_end_hour": 22, "max_future_days": 30, "min_future_days": 0, "max_bookings": 2, "allow_houses": "", "deny_apartment_ids": "", "is_active": 1, "price_weekday_cents": 0, "price_weekend_cents": 0, "price_cents": 0, "is_billable": 0 }] }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

POST /api/admin/resources

Description
Create a resource.

Request body
`{ "name": "...", "booking_type": "time-slot", "category": "", "slot_duration_minutes": 60, "slot_start_hour": 6, "slot_end_hour": 22, "max_future_days": 30, "min_future_days": 0, "max_bookings": 2, "allow_houses": "A|B", "deny_apartment_ids": "1001|1002", "price_weekday": "50", "price_weekend": "75", "is_billable": true, "is_active": true }`

Response
`{ "status": "ok", "resource_id": 1 }`

Errors
- `400 invalid_resource_payload`
- `400 invalid_resource_name`
- `400 invalid_booking_type`
- `400 invalid_slot_hours`
- `400 invalid_booking_window`
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

PUT /api/admin/resources/:id

Description
Update an existing resource.

Request body
Same as create.

Response
`{ "status": "ok", "resource_id": 1 }`

Errors
- `400 invalid_resource_id`
- `404 resource_not_found`
- `400 invalid_resource_payload`
- `400 invalid_resource_name`
- `400 invalid_booking_type`
- `400 invalid_slot_hours`
- `400 invalid_booking_window`
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

DELETE /api/admin/resources/:id

Description
Soft-delete a resource (sets `is_active = 0`).

Request body
None.

Response
`{ "status": "ok" }`

Errors
- `400 invalid_resource_id`
- `404 resource_not_found`
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.

## Endpoint

POST /api/admin/rfid-tags

Description
Upsert RFID tags in bulk.

Request body
`{ "tags": [{ "uid": "A1B2C3", "apartment_id": "1001", "house": "A", "lgh_internal": "1", "skv_lgh": "1", "access_groups": "Admin", "is_admin": false, "is_active": true }] }`

Response
`{ "status": "ok", "count": 1 }`

Errors
- `401 unauthorized`
- `403 forbidden`
- `400 invalid_tenant`
- `500 internal_error`

Auth requirements
Valid tenant + admin session cookie.
