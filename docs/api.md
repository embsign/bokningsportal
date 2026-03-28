# API Specification (uppdaterad)

Denna API‑spec följer nuvarande frontend‑implementation och UX‑flöden.

## Konventioner
- Baspath: `/api`
- Autentisering: `Authorization: Bearer <access_token>`.
- Tenant‑resolution:
  - Web: UUID‑token (QR‑länk).
  - Kiosk: RFID‑UID lookup → tenant + user.
- Felformat: `{ "detail": "error_code" }`
- Datumformat: ISO 8601 (`YYYY-MM-DD` / `YYYY-MM` / ISO‑datetime).

## Publika endpoints

### POST /api/brf/register
Registrera ny BRF och skicka setup‑länk via e‑post.

**Body**:
`{ "association_name": "BRF Exempel", "email": "styrelsen@brf.se", "turnstile_token": "..." }`

**Notering**:
- `turnstile_token` är obligatorisk och verifieras server-side via Cloudflare Turnstile.
- Returnerar `400 turnstile_invalid[:codes]` om token är ogiltig/utgången.
- Returnerar `500 missing_turnstile_secret` om backend saknar Turnstile‑secret.
- Returnerar `502 turnstile_unavailable` om verifieringstjänsten inte går att nå.

**Response**:
`{ "setup_url": "https://.../setup/{payload}" }`

### POST /api/brf/setup/verify
Verifiera setup‑payload och skapa tenant om den inte redan finns.

**Body**:
`{ "payload": "{base64url-json}" }`

**Response**:
`{ "association_name": "...", "email": "...", "uuid": "...", "account_owner_token": "...", "is_setup_complete": false }`

### POST /api/brf/setup/complete
Markera setup som slutförd och skicka admin‑länk.

**Body**:
`{ "account_owner_token": "...", "email": "..." }`

**Response**:
`{ "ok": true, "admin_url": "https://.../admin/{token}" }`

### POST /api/rfid-login
Logga in via RFID‑UID (kiosk).

**Body**:
`{ "uid": "A1B2C3D4" }`

**Notering**:
- Returnerar befintlig access‑token för användaren om den finns.
- Skapar en ny access‑token endast om ingen finns.
- Sätter ingen session‑cookie; `booking_url` innehåller token som används i `Authorization`.

**Response**:
`{ "booking_url": "/user/{UUID-token}", "user": { "id": "...", "apartment_id": "1001", "is_admin": false } }`

### POST /api/kiosk/access-token
Generera/rotera QR‑token för inloggning från kiosk.

**Notering**:
- Roterar access‑token för användaren och returnerar alltid en ny token.
- Kräver `Authorization: Bearer <access_token>`.

**Response**:
`{ "access_token": "uuid", "login_url": "/user/{UUID-token}" }`

## Allmänna endpoints (inloggad)

### GET /api/session
Returnerar aktuell användare och tenant.

**Auth**: `Authorization: Bearer <access_token>`

**Response**:
`{ "tenant": { "id": "...", "name": "..." }, "user": { "id": "...", "apartment_id": "1001", "is_admin": false } }`

### GET /api/services
Lista bokningsobjekt som användaren får boka.

**Response**:
`{ "services": [{ "id": "obj-1", "name": "...", "description": "...", "booking_type": "time-slot", "slot_duration_minutes": 120, "next_available": "2026-03-12", "price_weekday_cents": 5000, "price_weekend_cents": 7500 }] }`

### GET /api/bookings/current
Användarens aktuella bokningar (för listan "Aktuella bokningar").

**Response**:
`{ "bookings": [{ "id": "...", "service_name": "...", "date": "2026-03-12", "time_label": "08:00-10:00", "status": "mine" }] }`

### POST /api/bookings
Skapa bokning.

**Body**:
`{ "booking_object_id": "...", "start_time": "...", "end_time": "..." }`

**Response**:
`{ "booking_id": "..." }`

### DELETE /api/bookings/:id
Avboka bokning (endast egna bokningar om inte admin).

**Response**:
`204 No Content`

## Tillgänglighet

### GET /api/availability/month
Månads‑vy för heldag.

**Query**: `booking_object_id`, `month=YYYY-MM`

**Response**:
`{ "days": [{ "date": "2026-03-12", "status": "available" | "booked" | "mine" | "disabled" }] }`

### GET /api/availability/week
Vecko‑vy för tidspass.

**Query**: `booking_object_id`, `week_start=YYYY-MM-DD`

**Response**:
`{ "days": [{ "label": "Mån 12/3", "date": "2026-03-12", "slots": [{ "id": "...", "label": "08:00-10:00", "status": "available" | "booked" | "mine" | "disabled", "price_cents": 5000 }] }] }`

## Admin endpoints

### GET /api/admin/booking-objects
Lista bokningsobjekt (inkl. inaktiva).

### POST /api/admin/booking-objects
Skapa bokningsobjekt.

### PUT /api/admin/booking-objects/:id
Uppdatera bokningsobjekt.

### GET /api/admin/booking-groups
Lista bokningsgrupper.

### POST /api/admin/booking-groups
Skapa bokningsgrupp.

### GET /api/admin/users
Lista användare (för UserPickerModal).

**Response**:
`{ "users": [{ "id": "...", "identity": "...", "apartment_id": "...", "house": "...", "groups": ["..."], "rfid": "...", "is_admin": false, "is_active": true }] }`

### PUT /api/admin/users/:id
Uppdatera användare.

**Body**:
`{ "identity": "...", "apartment_id": "...", "house": "...", "groups": ["..."], "rfid": "...", "is_admin": false, "is_active": true }`

### GET /api/admin/users/import/rules
Hämta sparade import‑regler.

### PUT /api/admin/users/import/rules
Spara import‑regler.

### POST /api/admin/users/import/preview
CSV‑preview för import.

**Body**:
`{ "csv_text": "...", "rules": { ... } }`

**Response**:
`{ "headers": ["..."], "rows": [{ "identity": "...", "apartment_id": "...", "house": "...", "admin": true, "status": "Ny" }], "summary": { "new": 0, "updated": 0, "unchanged": 0, "removed": 0 } }`

### POST /api/admin/users/import/apply
Utför import.

**Body**:
`{ "csv_text": "...", "rules": { ... }, "actions": { "add_new": true, "update_existing": true, "remove_missing": true } }`

### GET /api/admin/reports/csv
Ladda ner debiteringsunderlag.

**Query**: `month=YYYY-MM`, `booking_object_id=...`

**Response**:
`text/csv`

## Felhantering
- `401 unauthorized`
- `403 forbidden`
- `404 not_found`
- `409 conflict`
- `500 internal_error`
