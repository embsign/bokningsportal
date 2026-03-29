# Frontend Rules

Regler och konventioner för frontend (LLM‑agentens referens).

## Tenant‑detektion
- Web‑access använder UUID‑access‑token och behöver inte välja tenant manuellt.
- Kiosk‑läge får tenant via RFID‑login där UID resolves i backend.

## API‑anrop
- Bas‑URL: `/api` (same-origin via Pages Functions).
- Alla anrop använder `credentials: "include"`.
- `Content-Type: application/json` används för JSON‑payloads.

## Login‑flöden
- Kiosk‑inloggning sker via RFID.
- QR‑länk innehåller `access_token` och ska auto‑logga in användaren.
- Om QR‑länk genereras igen ska en ny token användas och den gamla blir ogiltig.

## Kiosk‑app (Android)
- Se `docs/features/kiosk.md` för app‑flöde och UX.

## Felhantering
- Vid fel används `detail` i JSON‑svaret som felmeddelande.
- Klienten bör hantera `401 unauthorized` genom att visa inloggning.

## Hälsokoll
- Frontend loggar `GET /api/health` en gång per session (diagnostik).

## Test‑beteende
- Vid test (`VITEST`/`MODE=test`) används fallback‑tenant `test-brf`.

## Missing Information / Open Questions
- Exakta UI‑routes och vyer saknas i dokumentation.
- Det finns inga explicita krav på i18n eller tillgänglighet.
