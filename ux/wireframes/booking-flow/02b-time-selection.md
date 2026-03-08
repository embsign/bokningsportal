# 03 - Date selection

Syfte: Välja dag & tid för tidslslot

Layout (wireframe):

[Header]
- Tillbaka
- Inloggningsindikator: "Lägenhet"
- Hjälp / Logga ut

[Main]
- Ingen rubrik / text mellan Header och huvudyta
- Huvudyta: Tidspass (veckovy)
  - Veckonavigering: "< Föregående vecka" och "Nästa vecka >"
    - På mobil / smal skärm kan inte en hel vecka visas - då får navigering ändras till det antal dagar som får plats i bredd
  - Veckor får bara stegas enligt bokningsregler
  - Rubrik med veckonummer "Vecka 36"
  - Tydlig centrerad rubrik äver tidspassen med veckodagarnas namn samt datum. Söndag i rött
  - Kolumner per dag (Mån-Sön)
  - Rader per tidsblock (t.ex. 30 min)
  - Varje ruta visar:
    - Tid (t.ex. 14-16)
    - Debitering (om relevant)
    - CTA: Hela rutan är klickbar
    - Status/visualisering:
      - Utgråad/disabled: passerad tid (grå)
        Visualiseras endast med färg
      - Upptagen: bokad av annan (röd)
      - Bokad: Bokad av användaren (gul)
      - Ledig: valbar (grön)
  - Legend för status (färg/ikon)

[Footer]
- Tillbaka

Regler:
- Dagar utanför bokningsregler är disabled.
- Tidigare datum är disabled.
