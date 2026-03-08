# 02 - Date selection

Syfte: Välja datum för full-day

Återanvända komponenter:
- Header
- Calendar (Month View)
- DayCard
- FooterNavigation

Standardlayout:
- Baslayout och gemensamma komponenter beskrivs i `docs/design/components.md`.

Layout (wireframe):

[Header component]

[Main]
- Ingen rubrik / text mellan Header och huvudyta
- [Calendar component] (månadsvy)
  - Månadsnavigering: "< Januari" och "Mars >"
  - Månader får bara stegas enligt bokningsregler
  - Rubrik med månadens namn
  - Tydlig centrerad rubrik äver dagkorten med veckodagarnas namn. Söndag i rött
  - [DayCard component] (Mån-Sön)
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
- [FooterNavigation component] (Tillbaka om möjligt, om renderad)

Regler:
- Dagar utanför bokningsregler är disabled.
- Tidigare datum är disabled.
