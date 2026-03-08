# Booking Logic

## Concepts

- **Tenant**: varje BRF har en egen tenant och all data filtreras per tenant.
- **Resource**: bokningsobjekt (t.ex. tvättstuga, gästlägenhet) med typ `time-slot` eller `full-day`.
- **Booking**: reserverad tid mellan `start_time` och `end_time` kopplad till en lägenhet.
- **Block**: administrativ blockering av tid på en resurs som fungerar som upptagen tid.
- **Access rules**: resurser kan begränsas via `allow_houses` och `deny_apartment_ids`.
- **Booking window**: `min_future_days` och `max_future_days` per resurs.
- **Max bookings**: max antal framtida bokningar per resurs eller kategori.

## Booking Flow

1. **Autentisering**: kräver aktiv session (RFID‑login eller access‑token‑login).
2. **Resursåtkomst**: kontroll att resursen är aktiv och att lägenheten får boka den.
3. **Tidsintervall**: validera att `start_time < end_time` och att tiderna går att tolka som ISO‑strängar.
4. **Konfliktkontroll**:
   - Krockar med befintliga bokningar för resursen.
   - Krockar med blockeringar för resursen.
   - Krockar med lägenhetens egna bokningar.
5. **Bokningsfönster**: bokning måste ligga inom resursens min/max‑fönster.
6. **Maxbokningar**: kontroll av antal framtida bokningar (per resurs eller kategori).
7. **Skapa bokning**: skriva bokningsrad med ev. `is_billable`.

## Availability Rules

- **Resurslista**: bara aktiva resurser (`is_active = 1`) exponeras till vanliga användare.
- **Åtkomstfilter**: icke‑admin filtreras bort om resursen inte tillåter deras hus/lägenhet.
- **Tidspass (`time-slot`)**:
  - Skapas mellan `slot_start_hour` och `slot_end_hour` i steg om `slot_duration_minutes`.
  - Slot markeras `is_booked` om det överlappar bokning eller block.
  - Slot markeras `is_past` om sluttid är i dåtid.
- **Heldag (`full-day`)**:
  - Ett intervall per dag; `is_booked` om det överlappar bokning eller block.
  - Range‑endpoint kan returnera `is_available` per dag (inkluderar fönster och dåtid).
- **Bokningsfönster**:
  - Dagar utanför `min_future_days` och `max_future_days` visas inte som bokningsbara.
  - För heldag markeras dag som ej tillgänglig om den är utanför fönstret.

## Cancellation Rules

- **Vanlig användare**: kan endast avboka sina egna bokningar.
- **Admin**: kan avboka vilken bokning som helst.
- **Blockeringar**: admin kan skapa och ta bort blockeringar; block får inte överlappa befintliga bokningar eller block.

## Edge Cases

- Ogiltiga datum/tidsintervall returnerar fel (`invalid_time_range`, `invalid_date`, `invalid_date_range`).
- Bokning utanför fönster ger konflikt (`outside_booking_window`).
- Max antal framtida bokningar ger konflikt (`max_bookings_reached`).
- Överlapp ger konflikt (`overlap`).
- Resurs saknas eller är otillåten ger `forbidden_resource`.
- Slot/heldag i dåtid markeras som `is_past`.
- Full‑day‑availability har max spann (upp till 366 dagar) för att skydda systemet.

## Invariants

- En bokning har alltid `start_time < end_time`.
- Ingen bokning får överlappa en annan bokning eller blockering på samma resurs.
- En lägenhet får inte ha överlappande bokningar.
- Endast aktiva resurser är bokningsbara för vanliga användare.
- All bokningsdata är isolerad per tenant.

## Time & Format Notes
- API:t accepterar ISO‑datum/tid som kan tolkas av JavaScript `Date`.
- Systemet arbetar konsekvent i UTC och hanterar inte lokala tidszoner.
- Intern normalisering returnerar tider i UTC (`YYYY-MM-DDTHH:mm:ssZ`).

## Missing Information / Open Questions
- Finns inga explicita regler för avbokningsfönster (t.ex. "måste avbokas X timmar före").
