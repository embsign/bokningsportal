# Landningssida (/)

Syfte: Informera om tjänsten och guida användare till rätt inloggning eller registrering.

## Innehåll
- Tjänsten är gratis och används för bokning av t.ex. tvättstuga och gästlägenhet i BRF:er.
- För boende:
  - Inloggning sker via personlig QR‑kod.
  - QR‑kod fås från bokningstavla eller via styrelsen om bokningstavla saknas.
- Länk/CTA: **Registrera förening**.

## Routes
- `/` = landningssida.
- `/user/{UUID-token}` = boende‑inloggning via personlig QR‑kod.
- `/admin/{UUID-token}` = kontoägare/admin‑inloggning via account‑owner‑token.
