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
   - Regex: maska ut **Lägenhetsnummer** från Identitet
   - Mall för unikt ID (t.ex. `{hus}-{lägenhetsnummer}`)
   - Separator för **Behörigheter** (lista, t.ex. `|`)

5. **Förhandsgranskning**
   - Visa lista över användare som skulle läsas in.
   - Tydlig sammanfattning:
     - Nya rader
     - Oförändrade rader
     - Rader som tas bort
   - Val:
     - Lägg till nya
     - Radera borttagna
     - **Importera**

6. **Import**
   - Statusbar visar progress under importen.

Regler:
- Systemet sparar inställningar från importen och förinställer dem vid nästa import.
