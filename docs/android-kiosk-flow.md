# Android kiosk-flode

Denna fil beskriver flodet for Android-appen som fungerar som kiosk for bokningsportalen.

## Oversikt
- Appen startar i vilolage med svart bakgrund och instruktionstext.
- En RFID-tagg lases och UID skickas till API.
- API svarar med `booking_url` som oppnas i WebView.
- Vid utloggning eller utgangen session atergar appen till vilolage.

## Flode (mermaid)
```mermaid
flowchart TD
    A[Starta app] --> B[Vilolage: svart skarm + instruktionstext]
    B -->|RFID UID| C[POST /api/rfid-login]
    C -->|booking_url| D[Oppna WebView med booking_url]
    D -->|Utloggning / session slut| B
```
