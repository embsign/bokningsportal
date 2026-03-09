# Flow: Admin Dashboard

Syfte: Ge kontoägare/admin en översikt och åtkomst till administration.

Wireframe: `docs/ux/flows/admin/01-dashboard.md`

1. **Inloggning**
   - Kontoägaren loggar in via `/admin/{UUID-token}`.
2. **Admin Dashboard**
   - Tre huvudsektioner visas:
     - **Användare** → `docs/ux/flows/admin/edit-user.md`, `docs/ux/flows/admin/import-users-csv.md`
     - **Bokningsobjekt** → `docs/ux/flows/admin/add-booking-object.md`
     - **Debiteringsunderlag / Rapporter** → `docs/ux/flows/admin/create-report.md`
   - Se wireframe för layout: `docs/ux/flows/admin/01-dashboard.md`.

Regler:
- Alla sektioner ska vara åtkomliga utan att lämna dashboarden.
- Primärt desktop‑gränssnitt (mus/tangentbord), men ska fungera på mobil.
