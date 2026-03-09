# Överblick

BRF Bokningsportal är ett multi‑tenant bokningssystem för bostadsrättsföreningar (BRF) byggt på
Cloudflare (Pages + Worker + D1).

## Syfte (för LLM‑agenter)
Dokumenten i `docs/` är skrivna för att ge en komplett, källnära beskrivning av systemet så att en
LLM‑agent ska kunna återskapa applikationen (funktion, regler, API, data och arkitektur).

## Snabb navigation
- Produkt och målgrupp: `docs/product.md`
- Arkitektur och dataflöde: `docs/architecture.md`
- API‑spec: `docs/api.md`
- Bokningslogik: `docs/booking-logic.md`
- Databas (D1): `docs/database.md`
- Miljövariabler: `docs/env.md`
- Deployments: `docs/deployments.md`
- Features: `docs/features/`
- Regler: `docs/rules/`

## Features‑index
- Bokning: `docs/features/booking.md`
- Avbokning: `docs/features/cancellations.md`
- Tillgänglighet: `docs/features/availability.md`
- Kiosk‑app: `docs/features/kiosk.md`

## Rekommenderad läsordning (LLM)
1. `docs/README.md`
2. `docs/product.md`
3. `docs/architecture.md`
4. `docs/api.md`
5. `docs/booking-logic.md`
6. `docs/database.md`
7. `docs/features/`
8. `docs/rules/`

## Ändringsregler
- Följ `docs/api.md` när du modifierar endpoints.
- Följ `docs/database.md` när du modifierar modeller/tabeller.
- Följ `docs/booking-logic.md` när du ändrar bokningsbeteende.

## Nyckelfakta
- Web‑access använder UUID‑access‑token som avgör tenant automatiskt.
- Kiosk‑läge körs som Android‑app som resolve:ar tenant via RFID UID‑uppslag.
- API ligger under `/api` och proxas via Pages Function i produktion.
- Autentisering är sessionsbaserad (HttpOnly cookie).
- Systemet använder UTC utan hantering av lokala tidszoner.

## Missing Information / Open Questions
- Operativa rutiner (backup/restore av D1, loggning/monitorering, incident‑flöde).
- Operativa rutiner (backup/restore av D1, loggning/monitorering, incident‑flöde).
- Eventuella SLA:er/uppsatta krav på svarstider och kapacitet.