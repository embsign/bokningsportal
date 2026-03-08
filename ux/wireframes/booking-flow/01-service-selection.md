# 01 - Service selection

Syfte: Låta användaren välja service (om flera finns).

Layout (wireframe):

[Header]
- Logotyp + portalnamn
- Inloggningsindikator: "Lägenhets ID"
- Hjälp / Logga ut

[Stegindikator]
- Steg 1 av 3: Service

[Main]
- Rubrik: "Välj service"
- Grid med servicekort (2-4 kolumner beroende på skärm)

Servicekort (komponenter):
- Servicenamn
- Kort beskrivning
- Varaktighet
- Nästa lediga tid (t.ex. "Nästa: tis 14:30")
- Debitering (t.ex. "Debiteras: 200-300 kr" Visas ej om ingen debitering är aktuell)
- Hela kortet är klickbart

[Footer]
- Tillbaka (om möjligt)

Regler:
- Om användaren endast har tillgång till en service, autovälj och hoppa över steget.
