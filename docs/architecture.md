# Architecture

BRF Bokningsportal är ett multi‑tenant bokningssystem byggt för Cloudflare. Frontend är en Vite‑byggd
Alpine.js‑app på Cloudflare Pages. Backend är en Cloudflare Worker som exponerar JSON‑API och lagrar
data i Cloudflare D1 (SQLite).

## Components

### Frontend
Frontend använder Vite för build/dev och Alpine.js för UI‑state. Appen är implementerad som en
Alpine‑store i `frontend/src/app.js`, med hjälpfiler för API‑anrop (`frontend/src/api.js`) och
datumlogik. Web‑inloggning sker via UUID‑access‑token och behöver inte välja tenant manuellt.

### Kiosk App
Kiosk‑läget körs som en minimal Android‑app (Kotlin) i samma repo. Appen läser NFC‑taggar, skickar UID
för `/api/rfid-login` och öppnar bokningsportalen i en WebView efter att session skapats. Appen har
ingen statisk BRF‑konfiguration utan tenant löses via UID‑uppslag.

### Backend
Backend är en ensam Cloudflare Worker med en egen router i `cloudflare/worker/src/index.js`. Den
exponerar publika endpoints (health, tenant‑lista, captcha‑config, registrering) och autentiserade
endpoints för bokningar, resurser, admin‑konfiguration, RFID‑login, access‑token‑login och Axema
CSV‑import. Affärsregler (bokningsfönster, överlapp, åtkomstkontroll) körs helt i Workern.

### Database
Cloudflare D1 (SQLite) lagrar all data. Centrala tabeller är `tenants`, `apartments`, `resources`,
`bookings`, `booking_blocks`, `sessions`, `rfid_tags`, och `tenant_configs`. Schemat ligger i
`docs/database.md` och tenant‑isolering sker via `tenant_id` i varje domäntabell.

### External Services
- Cloudflare Turnstile for registration captcha verification.

### Data Flow
1. Browser loads the Alpine.js app from Cloudflare Pages.
2. Web‑klient använder access‑token för auto‑login. Kiosk‑läge använder RFID UID för `/api/rfid-login`
   som sätter session och tenant.
3. API‑anrop går till `/api/*`:
   - Lokal dev: Vite proxy till Workern (`http://127.0.0.1:8787`).
   - Production/preview: Pages Function (`frontend/functions/api/[[path]].js`) proxyar till Worker‑URL.
4. Workern validerar tenant, session‑cookie och åtkomstregler, sedan läser/skriv från D1.

### Security Model
- Session-based authentication with HttpOnly, SameSite=Lax cookies stored in D1 (`sessions` table).
- Tenant‑isolering enforced via `tenant_id` i varje query, härledd från access‑token eller session som
  skapats via RFID‑login (UID‑uppslag).
- Server-side captcha verification (Turnstile) for tenant registration.
- CORS responses allow credentials and echo the request origin.

## Access‑token Flows
- RFID‑inloggning på kiosk kan generera en QR‑länk för mobil inloggning.
- QR‑länken innehåller en UUID‑baserad access‑token som skapar session automatiskt.
- Ny generering invaliderar tidigare token för samma lägenhet.
- Admin‑token skapas en gång vid setup och visas i sista steget (ingen email‑leverans).
- Tenant‑email lagras endast för drift/uppföljning, inte för autentisering.

## Tenant Resolution (API vs Frontend)
- **Web**: UUID access‑token avgör tenant och lägenhet.
- **Kiosk**: RFID UID avgör tenant genom `/api/rfid-login`.