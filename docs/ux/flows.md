# Flöden

## Bokningsflöde

Inloggning sker på två sätt:
- Mobiltelefon via personlig länk med UUID-token
- Kiosk via RFID/NFC-tag

Steg:
1. Service selection  
   - Visas bara om användaren har fler än en tillgänglig service.
2a. Date selection (heldag)  
2b. Time selection (tidspass)
3. Booking confirmation

Filer:
- `docs/ux/flows/booking-flow/01-service-selection.md`
- `docs/ux/flows/booking-flow/02a-date-selection.md`
- `docs/ux/flows/booking-flow/02b-time-selection.md`
- `docs/ux/flows/booking-flow/03-confirmation.md`

## Övriga flöden
- `docs/ux/flows/cancel-booking.md`
- `docs/ux/flows/generate-qr.md`
- `docs/ux/flows/create-brf.md`
- `docs/ux/landing.md`
- `docs/ux/flows/admin-dashboard.md`

## Admin (översikt)
- `docs/ux/flows/admin/01-dashboard.md`
- `docs/ux/flows/admin/add-booking-object.md`
- `docs/ux/flows/admin/import-users-csv.md`
- `docs/ux/flows/admin/edit-user.md`
- `docs/ux/flows/admin/create-report.md`
