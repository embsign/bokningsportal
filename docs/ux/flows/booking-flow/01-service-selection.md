# 01 - Service selection

Syfte: Låta användaren välja service (om flera finns).

Återanvända komponenter:
- Header
- ServiceGrid
- ServiceCard
- CurrentBookingsSection
- BookingCard
- QRSection (kiosk)
- CancelBookingModal

Standardlayout:
- Baslayout och gemensamma komponenter beskrivs i `docs/design/components.md`.

Layout (wireframe):

[Header component]

[Main]
- Ingen rubrik / text mellan Header och huvudyta
- [ServiceGrid component] med ServiceCard (2-4 kolumner beroende på skärm)
- Sektion: **Aktuella bokningar**
  - Lista med BookingCard
  - Klick på egna bokningar öppnar CancelBookingModal
- Sektion: **Boka med mobilen** (endast kiosk‑läge)
  - Beskrivning + knapp **Generera QR kod**
  - Varnings‑modal → QR‑modal

Servicekort:
- Se [ServiceCard component]

Regler:
- Om användaren endast har tillgång till en service, autovälj och hoppa över steget.
