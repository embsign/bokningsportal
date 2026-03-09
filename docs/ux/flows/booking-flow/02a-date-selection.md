# 02 - Date selection

Syfte: Välja datum för full-day

Återanvända komponenter:
- Header
- Calendar (Month View)
- DayCard
- CancelBookingModal

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
  - Tydlig centrerad rubrik över dagkorten med veckodagarnas namn. Söndag i rött
  - [DayCard component] (Mån-Sön)
    - Statusfärger och klickbeteende: se `docs/design/components.md` (DayCard)
  - Legend för status (färg/ikon) visas under kalendern

Regler:
- Dagar utanför bokningsregler är disabled.
- Tidigare datum är disabled.
- Klick på dag med status **Bokad** öppnar CancelBookingModal.
- I mobilvy filtreras dagar utan bokningsbara slots bort (endast dagar med minst en aktiv slot visas).
