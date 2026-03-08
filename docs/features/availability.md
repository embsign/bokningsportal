#+#+#+#+## Availability Feature

Den här sidan beskriver hur tillgänglighet för resurser exponeras och används av klienten.

## Syfte
- Visa bokningsbara tider för en resurs (tidspass eller heldag).
- Respektera bokningsfönster, överlapp och åtkomstregler.
  (autentisering: se `docs/rules/backend-rules.md`).

## Data Sources (API)
- `GET /api/resources`
- `GET /api/slots?resource_id=&date=YYYY-MM-DD`
- `GET /api/availability-range?resource_id=&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `POST /api/access-token-login` (web‑login via token)

## Regler (källnära)
- Resurser måste vara aktiva (`is_active = 1`) för vanliga användare.
- Åtkomst filtreras via `allow_houses` och `deny_apartment_ids` för icke‑admin.
- `time-slot`:
  - Slots genereras mellan `slot_start_hour` och `slot_end_hour`.
  - Steg = `slot_duration_minutes`.
  - Slot markeras `is_booked` om den överlappar bokning eller block.
  - Slot markeras `is_past` om sluttid är i dåtid.
- `full-day`:
  - Ett intervall per dag.
  - `availability-range` returnerar `is_available` som tar hänsyn till dåtid, bokning/block och
    bokningsfönster.
- Bokningsfönster styrs av `min_future_days` och `max_future_days`.

## Output‑fält som klienten använder
- `slots`: `resource_id`, `start_time`, `end_time`, `is_booked`, `is_past`
- `availability`: `date`, `resource_id`, `start_time`, `end_time`, `is_booked`, `is_past`, `is_available`

## Missing Information / Open Questions
- Hur availability presenteras för flera resurser samtidigt (design/UX) saknas.
