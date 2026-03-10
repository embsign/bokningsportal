# Cancellations Feature

Den här sidan beskriver avbokning ur ett feature‑perspektiv.

## Syfte
- Låta användare avboka sina egna bokningar.
- Låta admin avboka vilken bokning som helst.
  (autentisering: se `docs/rules/backend-rules.md`).

## Data Sources (API)
- `DELETE /api/cancel`
- `GET /api/bookings`
- Autentisering: `Authorization: Bearer <access_token>`

## Flöde (hög nivå)
1. Användaren autentiseras via access‑token (web) eller RFID‑login (kiosk).
2. Användaren väljer en befintlig bokning.
3. Klienten skickar `DELETE /api/cancel` med `booking_id`.
4. Servern tar bort bokningen om användaren har rätt.
5. Klienten uppdaterar listor/kalender.

## Fel och status
- `400 invalid_payload`
- `404 not_found` (bokning saknas eller tillhör annan lägenhet)
- `401 unauthorized`

## Missing Information / Open Questions
- Finns det avbokningsfönster (t.ex. senast X timmar före start)?
- UI‑krav för bekräftelse och återkoppling.
