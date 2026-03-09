# Kiosk Feature

Den här sidan beskriver Android‑kioskappen och dess flöde.

## Syfte
- Erbjuda en enkel RFID‑inloggning via NFC på kiosk‑enhet.
- Låta kiosken vara tenant‑neutral och först lösa BRF via UID‑uppslag.

## App‑flöde (loop)
1. **Idle**: Svart bakgrund med instruktion om att blippa bricka.
2. **NFC read**: NFC‑tagg läses och UID används för `/api/rfid-login`.
3. **WebView**: Bokningsportalen öppnas efter att session skapats (tenant härledd från UID).
4. **Reset**: Vid utlogg eller session timeout återgår appen till Idle.

## Konfiguration
- Appen har ingen statisk BRF‑konfiguration.
- Tenant löses dynamiskt via UID‑uppslag i backend.

## Integration (API)
- `POST /api/rfid-login` används för att skapa session och resolve tenant via UID.
- `POST /api/kiosk/access-token` kan användas för att generera QR‑länk.

## Missing Information / Open Questions
- Exakt timeout‑policy för session och kiosk‑reset.
- Hur appen hanterar offline‑läge eller nätverksfel.
