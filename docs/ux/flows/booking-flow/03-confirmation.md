# 04 - Booking confirmation

Syfte: Bekräfta bokningsdetaljer innan slutlig bokning.

Återanvända komponenter:
- Header
- Modal (Confirmation)
- BookingSummary

Standardlayout:
- Baslayout och gemensamma komponenter beskrivs i `docs/design/components.md`.

Layout (wireframe):

[Header component]

[Main]
- Detta är en pop-up modal
- [Modal component] "Bekräfta bokning"
- [BookingSummary component]
  - Servicenamn
  - Datum & Tid
  - Varaktighet
  - Eventuell Debitering

Modal‑footer:
- Knappar: **Tillbaka** / **Boka**

Efter bekräftelse (state):
- Bekräftelsemeddelande: "Bokning klar"
- Detaljer + möjlighet att lägga till i kalender (om mobil-läge länk till calenderfil, om kiosk QR-kod med länk till calenderfil)
