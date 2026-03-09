# Komponenten: Admin Dashboard

Syfte: Samla administrativa genvägar och ge överblick.

## Layout
- Header med admin‑identitet.
- Tre sektioner med tydliga rubriker och CTA‑knappar.
- Primärt desktop‑layout (ej touch‑first), men responsivt så att det fungerar på mobil.

## Sektioner och element

### Användare
- Rubrik: **Användare**
- Knappar:
  - **Redigera**
  - **Importera**
 - Redigera öppnar användarlista (UserPickerModal) och därefter EditUserModal.
 - Importera öppnar ImportUsersModal.

### Bokningsobjekt
- Rubrik: **Bokningsobjekt**
- Knappar:
  - **Lägg till**
  - Radåtgärder: **Redigera**, **Kopiera**
- Tabellöversikt visar status (aktiv/inaktiv) och konfiguration.

### Debiteringsunderlag / Rapporter
- Rubrik: **Debiteringsunderlag / Rapporter**
- Knappar:
  - **Skapa rapport**
 - Skapa rapport öppnar ReportModal.

## Interaktion
- Knappar öppnar respektive vy eller modal.
- Konsekvent knappstil; fokus på mus/tangentbord.
 - Se komponentdetaljer i `docs/design/components.md`.
