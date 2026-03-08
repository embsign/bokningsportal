# 02 - Date selection

Syfte: Välja datum för full-day

Layout (wireframe):

[Header]
- Logotyp + portalnamn
- Inloggningsindikator: "Lägenhets ID"
- Hjälp / Logga ut

[Stegindikator]
- Steg 2 av 3: Datum (dagpass)

[Main]

- Huvudyta: Datumval (månadsvy)
  - Månadsnavigering: "< Januari" och "Mars >"
  - Månader får bara stegas enligt bokningsregler
  - Rubrik med månadens namn
  - Rubrik äver dagkorten med veckodagarnas namn
  - Dagkort (Mån-Sön)
    - Datum 1/3
    - CTA: Hela rutan är klickbar
    - Status/visualisering:
      - Utgråad/disabled: passerad tid
      - Upptagen: bokad av annan
      - Bokad: bokad av användaren
      - Ledig: valbar
  - Legend för status (färg/ikon)
[Footer]
- Tillbaka om möjligt

Regler:
- Dagar utanför bokningsregler är disabled.
- Tidigare datum är disabled.
