# Booking Feature

Den här sidan beskriver bokningsflödet ur ett feature‑perspektiv.

## Syfte
- Låta boende (eller admin) skapa bokningar för resurser.
  (autentisering: se `docs/rules/backend-rules.md`).

## Data Sources (API)
- `POST /api/book`
- `GET /api/slots`
- `GET /api/resources`
- `GET /api/bookings` (visar egna bokningar; admin får kalender)
- `POST /api/access-token-login` (web‑login via token)

## Flöde (hög nivå)
1. Användaren loggar in via access‑token (web) eller RFID‑session (kiosk).
2. Användaren väljer resurs och tid.
3. Klienten skickar bokning via `POST /api/book`.
4. Servern validerar åtkomst, överlapp och bokningsfönster.
5. Klienten uppdaterar vyer via `GET /api/bookings` och/eller `GET /api/slots`.

## Validering och fel
Vanliga felkoder:
- `invalid_payload`, `invalid_time_range`
- `forbidden`, `forbidden_resource`
- `outside_booking_window`
- `max_bookings_reached`
- `overlap`

## Admin‑specifikt
- Admin kan boka åt andra genom att skicka `apartment_id` för annan lägenhet.

## Missing Information / Open Questions
- UI‑krav för bekräftelse/återkoppling på bokning (t.ex. modal eller toast).
- Hur prissättning/billable‑flagga ska användas i UI.
