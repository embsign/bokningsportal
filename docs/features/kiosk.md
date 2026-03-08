# Kiosk Feature

Den här sidan beskriver Android‑kioskappen och dess flöde.

## Syfte
- Erbjuda en enkel RFID‑inloggning via NFC på kiosk‑enhet.
- Öppna bokningsportalen i WebView med korrekt tenant (`X-BRF-ID`).

## App‑flöde (loop)
1. **Idle**: Svart bakgrund med instruktion om att blippa bricka.
2. **NFC read**: NFC‑tagg läses och UID används för login i webbappen.
3. **WebView**: Bokningsportalen öppnas med `X-BRF-ID` satt i header.
4. **Reset**: Vid utlogg eller session timeout återgår appen till Idle.

## Konfiguration
- Appen är konfigurerad med BRF‑id (tenant‑id).
- BRF‑id skickas i `X-BRF-ID` header för alla WebView‑requests.

## Integration (API)
- `POST /api/rfid-login` används för att skapa session.
- `POST /api/kiosk/access-token` kan användas för att generera QR‑länk.

## Missing Information / Open Questions
- Exakt timeout‑policy för session och kiosk‑reset.
- Hur appen hanterar offline‑läge eller nätverksfel.
