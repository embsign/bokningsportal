# 01 - Admin Dashboard

Syfte: Ge kontoägare/admin en tydlig översikt och snabba genvägar.

Layout (wireframe):

[Header]
- Admin‑identifiering (kontoägare)
- Logga ut

[Main]
- Sektioner i tre kolumner (desktop), staplade på mobil:
  1) **Användare**
     - Kort beskrivning
     - Knappar: **Redigera**, **Importera**
     - Redigera‑flöde: se `docs/ux/flows/admin/edit-user.md`
  2) **Bokningsobjekt**
     - Kort beskrivning
     - Knappar: **Lägg till**
     - Radåtgärder: **Redigera**, **Kopiera**
     - Tabellöversikt visar status (aktiv/inaktiv) och konfiguration
     - Modal för redigera/kopiera: se `docs/ux/components/booking-object-modal.md`
  3) **Debiteringsunderlag / Rapporter**
     - Kort beskrivning
     - Knappar: **Skapa rapport**
     - Rapport‑flöde: se `docs/ux/flows/admin/create-report.md`

Regler:
- Desktop‑first (mus/tangentbord).
- Responsivt så att det fungerar på mobil.
