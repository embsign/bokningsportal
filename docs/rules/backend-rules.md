# Backend Rules

Regler och konventioner för backend (LLM‑agentens referens).

## API‑konventioner
- Bas‑path: `/api`
- Fel format: `{ "detail": "error_code" }`
- CORS: tillåter credentials och speglar request‑origin.

## Tenant‑resolution (API)
- Web‑access: tenant härleds från UUID access‑token (auto‑login).
- Kiosk‑läge: tenant kommer från `X-BRF-ID` (eller motsvarande header) satt av Android‑appens WebView.

Om tenant saknas eller är inaktiv returneras `400 invalid_tenant`.

## Autentisering
- Session‑cookie: `session` (HttpOnly, SameSite=Lax, Secure när https).
- Session lagras i D1 (`sessions`).
- `401 unauthorized` om session saknas/ogiltig.
- Admin kontrolleras via `is_admin` i sessionen.

## Access‑token (UUID)
- Skapas via kiosk‑flöde efter RFID‑inloggning.
- Token används i QR‑länk för mobil auto‑login.
- Ny generering invalidierar tidigare token för samma lägenhet.
- Admin‑token skapas en gång vid setup och visas i sista steget.
- Token är långlivad och gäller tills den roteras.

## Endpoints
- Se `docs/api.md` för komplett API‑spec (inkl. deprecated endpoints).

## Captcha & registrering
- Turnstile används om `TURNSTILE_SITE_KEY` och `TURNSTILE_SECRET` är satta.
- Dev‑bypass: `DEV_CAPTCHA_BYPASS=true` och token `dev-ok`.
- Inga email‑flöden används vid registrering (kontakt‑email sparas enbart för drift/uppföljning).

## Missing Information / Open Questions
- Rate limiting/abuse‑skydd är inte definierat.
- Loggning/monitorering och incident‑flöden saknas i dokumentation.
