# Komponenten: Bokningsobjekt‑modal

Syfte: Skapa, kopiera eller redigera bokningsobjekt.

## Layout
- Modal med vänsterställda etiketter och fält.
- Sektioner grupperas visuellt (ram + bakgrund).
- Footer med **Spara** / **Avbryt**.

## Fält
- **Namn** (text)
- **Typ** (radio): Tidspass / Heldag
- **Bokningslängd (minuter)** (text/nummer)
  - Inaktiveras när **Heldag** är valt
- **Bokningsfönster** (grupp)
  - Minsta tid innan bokning (dagar)
  - Maximal framförhållning (dagar)
- **Max bokningar** (per bokningsgrupp)
  - Input för maxvärde
  - Dropdown för bokningsgrupp
    - Ingen
    - Befintliga grupper
    - Skapa bokningsgrupp…
- **Pris** (grupp)
  - Pris per bokning på vardag (kr)
  - Pris per bokning på helg (kr)
- **Behörigheter** (grupp)
  - **Allow**: Hus / Trappuppgång, Behörighetsgrupp, Enskilda lägenheter
  - **Deny**: Hus / Trappuppgång, Behörighetsgrupp, Enskilda lägenheter
  - Varje fält har **Välj**‑knapp som öppnar en scrollbar popup med checkboxar
  - Valda alternativ visas i modalen och kan avmarkeras direkt
- **Status** (radio): Aktiv / Inaktiv

## Interaktion
- **Lägg till** öppnar modal i tomt läge.
- **Kopiera** öppnar modal förifylld med vald rad.
- **Redigera** öppnar modal förifylld med vald rad.
- **Bokningsgrupp**:
  - Välj grupp fyller max‑fältet med gruppens värde.
  - Ändring av max‑fältet uppdaterar gruppens värde.
  - Skapa ny grupp öppnar namn‑popup.
- Hjälptext visas via hover på `?`.
