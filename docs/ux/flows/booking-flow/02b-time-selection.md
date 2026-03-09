# 02b - Time selection

Syfte: Välja dag & tid för tidsslot

Återanvända komponenter:
- Header
- TimeslotGrid (Week View)
- TimeslotButton
- CancelBookingModal

Standardlayout:
- Baslayout och gemensamma komponenter beskrivs i `docs/design/components.md`.

Layout (wireframe):

[Header component]

[Main]
- Ingen rubrik / text mellan Header och huvudyta
- Huvudyta: [TimeslotGrid (Week View) component]
  - Veckonavigering: "‹ Föregående vecka" och "Nästa vecka ›" visas i headern
  - Veckor får bara stegas enligt bokningsregler
  - Rubrik med veckonummer "Vecka 36" visas i headern
  - Tydlig centrerad rubrik över tidspassen med veckodagarnas namn samt datum. Söndag i rött
  - Kolumner per dag (Mån-Sön)
  - Rader per tidsblock (t.ex. 30 min)
  - Varje ruta visar:
    - Tid (t.ex. 08:00-10:00)
    - Debitering (om relevant)
    - Statusfärger och klickbeteende: se `docs/design/components.md` (TimeslotButton)
  - Legend för status (färg/ikon) visas under grid
  - [TimeslotButton component] används i varje tidspass

Regler:
- Dagar utanför bokningsregler är disabled.
- Tidigare datum är disabled.
- Klick på slot med status **Bokad** öppnar CancelBookingModal.
- I mobilvy filtreras dagar utan bokningsbara slots bort.
