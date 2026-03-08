# Booking Rules

Regler för bokning som ska följas av både UI och backend.

## Grundregler
- En bokning måste ha `start_time < end_time`.
- Bokningar får inte överlappa:
  - befintliga bokningar för samma resurs,
  - bokningsblock för samma resurs,
  - lägenhetens egna bokningar.
- Endast aktiva resurser (`is_active = 1`) är bokningsbara för vanliga användare.
- Autentisering sker via session skapad av RFID‑login eller access‑token‑login.

## Åtkomst
- Resurser kan begränsas via `allow_houses` och `deny_apartment_ids`.
- Admin får alltid tillgång till resursen.

## Bokningsfönster
- `min_future_days` och `max_future_days` styr vilka datum som är bokningsbara.
- Dagar utanför fönster ska inte presenteras som bokningsbara.

## Maxbokningar
- `max_bookings` begränsar antalet framtida bokningar per lägenhet.
- Om resurs har `category`, används lägsta `max_bookings` i kategorin som gräns.

## Full‑day vs time‑slot
- `time-slot` genererar slots inom `[slot_start_hour, slot_end_hour]` med
  `slot_duration_minutes`.
- `full-day` använder heldagsintervall per datum och använder `availability-range`
  för markering av `is_available`.

## Avbokning och blockering
- Vanlig användare kan bara avboka sina egna bokningar.
- Admin kan avboka alla bokningar.
- Admin kan skapa/tar bort blockeringar, som inte får överlappa bokningar/block.

## Felkoder (översikt)
- `invalid_time_range`
- `overlap`
- `outside_booking_window`
- `max_bookings_reached`
- `forbidden_resource`

## Missing Information / Open Questions
- Avbokningsfönster (senast X timmar före) är inte definierat.
- Prislogik (billable) är inte kopplad till fakturering i dokumentationen.
