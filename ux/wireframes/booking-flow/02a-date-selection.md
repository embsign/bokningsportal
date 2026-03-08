# 02 - Date selection

Syfte: Välja datum för full-day

Layout (wireframe):

[Header]
- Tillbaka
- Inloggningsindikator: "Lägenhet"
- Hjälp / Logga ut

[Main]
- Ingen rubrik / text mellan Header och huvudyta
- Huvudyta: Datumval (månadsvy)
  - Månadsnavigering: "< Januari" och "Mars >"
  - Månader får bara stegas enligt bokningsregler
  - Rubrik med månadens namn
  - Tydlig centrerad rubrik äver dagkorten med veckodagarnas namn. Söndag i rött
  - Dagkort (Mån-Sön)
    - Datum 1/3
    - CTA: Hela rutan är klickbar
    - Status/visualisering:
      - Utgråad/disabled: passerad tid (grå)
        Visualiseras endast med färg
      - Upptagen: bokad av annan (röd)
      - Bokad: Bokad av användaren (gul)
      - Ledig: valbar (grön)
  - Legend för status (färg/ikon)
[Footer]
- Tillbaka om möjligt

Regler:
- Dagar utanför bokningsregler är disabled.
- Tidigare datum är disabled.
