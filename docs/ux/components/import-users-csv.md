# Komponenten: Importera användare (CSV)

Syfte: Låta admin importera användare från CSV med mappning, preview och kontroll.

## Layout
- Stegvis modal eller wizard:
  1) Välj fil
  2) Fältmappning
  3) Avancerat
  4) Adminbehörigheter
  5) Förhandsgranskning
  6) Import‑status

## Delkomponenter

### Filväljare
- Välj CSV‑fil
- Visar filnamn och antal rader (efter analys)

### Fältmappning
- Dropdown per fält:
  - Identitet
  - Behörigheter (valfritt)
  - RFID‑tagg (valfritt)
  - Aktiv (valfritt)

### Avancerat
- Regex‑fält:
  - Hus/Trapphus från Identitet
  - Unik lägenhetsidentitet från Identitet
- Separator för Behörigheter (t.ex. `|`)
- Live‑feedback visar hur regex‑grupper 1‑2‑3 blir till filtrerat värde.

### Adminbehörigheter
- Välj vilka behörighetsgrupper som får administratörsbehörighet.
- Välj‑popup med checkboxar.
- Valfritt steg.

### Förhandsgranskning
- Tabell med användare som kommer importeras
- Summering av:
  - Nya rader
  - Oförändrade rader
  - Rader som uppdateras
  - Rader som tas bort
- Val:
  - Lägg till nya
  - Uppdatera rader som ändrats
  - Radera borttagna
  - **Importera**
 - Kolumner:
   - Identitet
   - Lägenhets ID
   - Hus/Trapphus
   - Admin (Ja/Nej)
   - Status

### Import‑status
- Statusbar/progress
- Visar antal bearbetade rader

## Interaktion
- Inställningar sparas och förinställs nästa gång.
- **Avbryt** visas i steg 1, övriga steg använder **Tillbaka**.
