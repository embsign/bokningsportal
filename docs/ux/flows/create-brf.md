# Flow: Skapa ny BRF

Syfte: Låta en förening registrera sig och skapa ett konto för admin.

1. **Landningssida**
   - Se `docs/ux/landing.md`.
   - Länk: **Registrera förening**.

2. **Registreringsmodal – Steg 1**
   - Modal visar vilket steg man är på.
   - Användaren anger föreningens namn.

3. **Registreringsmodal – Steg 2**
   - Användaren anger föreningens e‑postadress.

4. **Bekräftelse och mail**
   - Systemet skickar ett mail till angiven adress.
   - Mailet innehåller en länk för att slutföra setup.
   - Länken innehåller en account‑owner UUID‑token som används för inloggning.
   - Mailet informerar om att länken inte får tappas bort.

5. **Slutför setup**
   - Kontoägaren klickar på länken.
   - Kontoägaren loggas in och hamnar i Admin Dashboard.

Regler:
- Registreringsflödet sker via modal.
- Kontoägare loggar in via account‑owner UUID‑token.
