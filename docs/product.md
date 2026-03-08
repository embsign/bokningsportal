# Product Overview

## Purpose

Provide a multi-tenant booking portal for housing associations (BRFs) where residents can book
shared resources (such as laundry rooms or guest apartments) and administrators can manage
resources, bookings, and access.

## Target Users

- Residents who book and cancel time slots.
- BRF administrators/boards who manage resources, rules, and the calendar.
- On-site kiosk/POS users who log in with RFID tags via Android kiosk app.
- New BRFs registering a tenant.

## Core Features

- Multi‑tenant onboarding (tenant id, captcha, admin‑åtkomsttoken).
- Inloggning via RFID (kiosk/POS) och mobilt via QR‑länk med access‑token.
- Resurser med tidspass eller heldag, bokning/avbokning, pris‑markering.
- Admin‑flöden: kalender, blockeringar, resurs‑ och användarhantering.
- Import av RFID‑taggar (Axema CSV).

Detaljerad logik finns i `docs/booking-logic.md`, API‑ytor i `docs/api.md`.

## User Flows

1. **Tenant registration:** besök landningssida, välj tenant‑id, skicka registrering med captcha,
   spara kontakt‑email, få admin‑åtkomsttoken i sista steget av setup.
2. **Resident booking:** logga in via RFID på kiosk, generera QR‑länk för mobil inloggning,
   boka, granska bokningar och avboka vid behov.
3. **POS RFID login:** skanna tagg i Android‑appen, resolve tenant via UID‑uppslag, öppna WebView efter login, generera QR‑länk vid behov.
4. **Admin operations:** log in as admin, review calendar, block slots, manage resources, import RFID tags, review user list.

## Non Goals

- Payment processing or invoicing.
- Personal profiles beyond apartment identifiers.
- External calendar integrations.
- Notifications (email/SMS/push) utöver kontakt‑email.

## Assumptions

- Each BRF has a dedicated tenant with its own tenant‑id.
- Apartment ID is the primary resident identity.
- RFID tags can be imported and mapped to apartments.
- Bookings follow window and max-booking constraints.
- Resources can be time-slot based or full-day.
- Captcha is required for tenant registration when configured in the backend.
- Lösenord hanteras inte; access‑token används för mobila inloggningar.
- Kontakt‑email lagras endast för drift/uppföljning, inte för inloggning.

## Missing Information / Open Questions
- UX‑beskrivning av onboarding‑skärmar och admin‑verktyg.
- Prislogik/billable‑flöde (faktura/intern rapportering) är inte beskrivet.
