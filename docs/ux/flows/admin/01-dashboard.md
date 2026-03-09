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
  2) **Bokningsobjekt**
     - Kort beskrivning
     - Knappar: **Redigera**, **Lägg till**
     - Tabellöversikt visar status (aktiv/inaktiv)
     - Modal för redigera/kopiera: se `docs/ux/components/booking-object-modal.md`
  3) **Debiteringsunderlag / Rapporter**
     - Kort beskrivning
     - Knappar: **Öppna rapporter**, **Exportera**

Regler:
- Desktop‑first (mus/tangentbord).
- Responsivt så att det fungerar på mobil.
