# Miljövariabler

Det här är de miljövariabler som används i nuvarande implementation.

## Frontend (runtime, i webbläsaren)

Frontend använder same-origin API under `/api` (Pages Functions).

## Backend (Node lokalt)

Inga **krävda** miljövariabler just nu.

Valfria:
- **PORT**: lyssnande port (default `8787`).

### E-post (Resend)

E-post skickas via Resend (HTTP API) från Workern.

- **RESEND_API_KEY**: API‑nyckel för Resend.
- **MAIL_FROM**: avsändaradress (t.ex. `noreply@embsign.app`).
- **FRONTEND_BASE_URL**: valfri fallback om `frontend_base_url` inte skickas från klienten.

### Cloudflare Turnstile (registrering av ny BRF)

- **TURNSTILE_SECRET**: hemlig nyckel från Turnstile (backend/Worker).
- **TURNSTILE_SITE_KEY**: publik site key som frontend använder för att rendera widget.

Frontend läser `TURNSTILE_SITE_KEY` via API:
1) `GET /api/public-config` (Pages Functions)
2) svarsfältet `turnstile_site_key`

Mottagare för beställningar är hårdkodad till `info@embsign.se`.

## Produktion (Pages Functions + D1)

### Frontend build (Pages)

Inga API‑base‑variabler behövs för frontend eftersom API körs same-origin via `/api`.
