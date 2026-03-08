# Komponenten: Importera användare (CSV)

Syfte: Låta admin importera användare från CSV med mappning, preview och kontroll.

## Layout
- Stegvis modal eller wizard:
  1) Välj fil
  2) Fältmappning
  3) Avancerat
  4) Förhandsgranskning
  5) Import‑status

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
  - Lägenhetsnummer från Identitet
- Mall för unikt ID (t.ex. `{hus}-{lägenhetsnummer}`)
- Separator för Behörigheter (t.ex. `|`)

### Förhandsgranskning
- Tabell med användare som kommer importeras
- Summering av:
  - Nya rader
  - Oförändrade rader
  - Rader som tas bort
- Val:
  - Lägg till nya
  - Radera borttagna
  - **Importera**

### Import‑status
- Statusbar/progress
- Visar antal bearbetade rader

## Interaktion
- Inställningar sparas och förinställs nästa gång.
- Import kan avbrytas innan den startas (Avbryt‑knapp i varje steg).
