# Flow: Admin Dashboard

Syfte: Ge kontoägare/admin en översikt och åtkomst till administration.

Wireframe: `docs/ux/flows/admin/01-dashboard.md`

1. **Inloggning**
   - Kontoägaren loggar in via `/admin/{UUID-token}`.
2. **Admin Dashboard**
   - Tre huvudsektioner visas:
     - **Användare**
       - Knappar: **Redigera**, **Importera**
     - **Bokningsobjekt**
       - Knappar: **Redigera**, **Lägg till**
       - Visar tabellöversikt av befintliga bokningsobjekt (inkl. status)
     - **Debiteringsunderlag / Rapporter**
       - Länk/knapp till rapporter och export.

Regler:
- Alla sektioner ska vara åtkomliga utan att lämna dashboarden.
- Primärt desktop‑gränssnitt (mus/tangentbord), men ska fungera på mobil.
