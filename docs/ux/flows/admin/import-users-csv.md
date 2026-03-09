# Flow: Importera användare från CSV

Syfte: Importera användare från CSV med förhandsgranskning och kontroll.

Se komponentbeskrivning: `docs/ux/components/import-users-csv.md`.

1. **Start**
   - Admin klickar **Importera** i sektionen Användare.

2. **Välj fil**
   - Dialog för att välja CSV‑fil.

3. **Fältmappning**
   - Systemet analyserar CSV‑headers.
   - Admin mappar fält via dropdown:
     - **Identitet**
     - **Behörigheter** (valfritt)
     - **RFID‑tagg** (valfritt)
     - **Aktiv** (valfritt)

4. **Avancerat**
   - Regex: maska ut **Hus/Trapphus** från Identitet
   - Regex: maska ut **Unik lägenhetsidentitet** från Identitet
   - Separator för **Behörigheter** (lista, t.ex. `|`)
   - Visa exempelrader med regex‑effekt (grupper 1‑2‑3)

5. **Adminbehörigheter**
   - Välj vilka behörighetsgrupper som får administratörsbehörighet
   - Välj‑popup med checkboxar
   - Valfritt (kan lämnas tomt)

6. **Förhandsgranskning**
   - Visa lista över användare som skulle läsas in.
   - Tydlig sammanfattning:
     - Nya rader
     - Oförändrade rader
     - Rader med ändringar (behörigheter ex.)
     - Rader som tas bort
   - Val:
     - Lägg till nya (checkbox)
     - Radera borttagna (checkbox)
     - Uppdatera ändrade (checkbox)
     - **Importera** (VIsa tydligt hur många som läggs till / uppdateras / raderas)

   - Kolumner:
     - Identitet
     - Lägenhets ID
     - Hus/Trapphus
     - Admin (Ja/Nej)
     - Status

7. **Import**
   - Statusbar visar progress under importen.

Regler:
- Systemet sparar inställningar från importen och förinställer dem vid nästa import.
