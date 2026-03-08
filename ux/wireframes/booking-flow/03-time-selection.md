# 03 - Date selection

Syfte: Välja dag & tid för tidslslot

Layout (wireframe):

[Header]
- Logotyp + portalnamn
- Inloggningsindikator: "Lägenhets ID"
- Hjälp / Logga ut

[Stegindikator]
- Steg 2 av 3: Datum & Tid (tidspass)

[Main]

- Huvudyta: Tidspass (veckovy)
  - Veckonavigering: "< Föregående vecka" och "Nästa vecka >"
  - Veckor får bara stegas enligt bokningsregler
  - Rubrik med veckonummer
  - Kolumner per dag (Mån-Sön)
  - Rader per tidsblock (t.ex. 30 min)
  - Varje ruta visar:
    - Tid (t.ex. 14-16)
    - Debitering (om relevant)
  - Status/visualisering:
    - Utgråad/disabled: passerad tid
    - Upptagen: bokad av annan
    - Bokad: bokad av användaren
    - Ledig: valbar
  - Legend för status (färg/ikon)

[Footer]
- Tillbaka

Regler:
- Dagar utanför bokningsregler är disabled.
- Tidigare datum är disabled.
