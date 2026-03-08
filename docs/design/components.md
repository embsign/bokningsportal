# UI Components

Denna fil beskriver återanvändbara UI‑komponenter som används i bokningsflödet.
Komponenterna ska spegla den faktiska implementationen i `frontend/`.

## Wireframe‑principer
- Wireframes ska referera till återanvändbara komponenter (t.ex. "Header", "FooterNavigation").
- Upprepad UI‑layout ska beskrivas via komponenter och får inte dupliceras mellan wireframes.

## Header
- Syfte: Visar app‑identitet och inloggad lägenhet.
- Layout: Horisontell bar med logotyp/namn till vänster, lägenhetsindikator i mitten och hjälp/logga ut till höger.
  - logotype/namn byts till en Tillbaka-knapp när man klickar sig bort från overviewn
- Innehåll:
  - Logotyp + portalnamn
  - Inloggningsindikator: "Lägenhet {id}"
  - Hjälp / Logga ut
- Interaktion: Hjälp/Logga ut är klickbara.
- Används i: Service selection, Date selection, Time selection, Confirmation.

## FooterNavigation
- Syfte: Standardnavigering (Tillbaka / Nästa / Boka).
- Layout: Ligger längst ned; kan visa enbart Tillbaka eller enbart Boka beroende på steg.
- Innehåll:
  - Tillbaka (sekundär)
  - Nästa eller Boka (primär)
- Interaktion: Tillbaka går till föregående steg; primär CTA går vidare eller bekräftar.
- Används i: Service selection, Date selection, Time selection, Confirmation (i modal).

## ServiceCard
- Syfte: Visa bokningsbar service.
- Layout: Kort med namn, beskrivning, varaktighet, nästa lediga tid och ev. debitering.
- Innehåll:
  - Servicenamn
  - Kort beskrivning
  - Varaktighet
  - Nästa lediga tid
  - Debitering (om aktuell)
- Interaktion: Hela kortet är klickbart.
- Används i: Service selection.

## ServiceGrid
- Syfte: Layout för flera ServiceCard.
- Layout: Grid med 2–4 kolumner beroende på skärmbredd.
- Innehåll:
  - Samling av ServiceCard.
- Interaktion: Inga egna, delegerar till ServiceCard.
- Används i: Service selection.

## Calendar (Month View)
- Syfte: Datumval för heldag.
- Layout: Månadsvy med månadsnavigering och dagkort i grid.
- Innehåll:
  - Månadsnavigering (föregående/nästa)
  - Rubrik med månadens namn
  - Veckodagsrad (synlig på breda skärmar)
  - DayCard för varje dag
  - Legend för statusfärger
- Interaktion: Dagkort är klickbara om de inte är disabled.
- Används i: Date selection (full‑day).

## DayCard
- Syfte: Visa ett datum i månadsvy.
- Layout: Klickbart kort med datum, centrerat.
- Innehåll:
  - Datum (t.ex. 1/3)
  - Veckodag inuti kort på smala skärmar
- Interaktion: Klickbar om status inte är disabled.
- Statusfärger:
  - Grå: passerad/disabled
  - Röd: upptagen
  - Gul: bokad av användaren
  - Grön: ledig
- Används i: Calendar.

## TimeslotButton
- Syfte: Visa och välja tidspass.
- Layout: Klickbar ruta med tid (stor text) och ev. debitering under.
- Innehåll:
  - Tid (t.ex. 08:00-10:00)
  - Debitering (om aktuell)
- Interaktion: Klickbar om status inte är disabled.
- Statusfärger:
  - Grå: passerad/disabled
  - Röd: upptagen
  - Gul: bokad av användaren
  - Grön: ledig
- Används i: Time selection.

## TimeslotGrid (Week View)
- Syfte: Visa tidspass över en vecka i ett gemensamt grid.
- Layout: Kolumner per dag (Mån–Sön), rader per tidsblock.
- Innehåll:
  - Veckonavigering (föregående/nästa)
  - Veckorubrik (t.ex. "Vecka 36")
  - Veckodag + datum per kolumn
  - TimeslotButton i varje cell
  - Legend för status (färg/ikon)
- Interaktion: Navigering byter vecka inom bokningsregler; slot väljs via TimeslotButton.
- Används i: Time selection.

## BookingSummary
- Syfte: Sammanfatta bokningsdetaljer.
- Layout: Kort med rader för service, datum/tid, varaktighet och ev. debitering.
- Innehåll:
  - Servicenamn
  - Datum & tid
  - Varaktighet
  - Debitering (om aktuell)
- Interaktion: Ingen.
- Används i: Confirmation.

## CancelBookingModal
- Syfte: Bekräfta avbokning av användarens egna bokning.
- Layout: Modal med rubrik, sammanfattning av bokningen och två knappar.
- Innehåll:
  - Rubrik: "Avboka bokning"
  - Bokningssammanfattning (service, dag/datum, tid)
  - Knappar: Avbryt / Avboka
- Interaktion:
  - Avbryt stänger modal
  - Avboka bekräftar avbokning
- Används i: Service selection (aktuella bokningar).

## QRCodeFlow (kiosk)
- Syfte: Generera ny QR‑kod för personlig mobil‑inloggning.
- Layout: Sektion i Service selection samt två modaler (varning + QR‑visning).
- Innehåll:
  - Sektionstitel: "Boka med mobilen"
  - Beskrivningstext
  - Knapp: "Generera QR kod" (kiosk‑läge)
  - Varnings‑modal: information + Avbryt / Generera
  - QR‑modal: stor QR‑kod + information om engångsvisning + Stäng
- Interaktion:
  - Generera öppnar varning.
  - Bekräfta genererar ny QR och öppnar QR‑modal.
  - Stäng stänger QR‑modal.
- Används i: Service selection (endast kiosk‑läge).

## Modal (Confirmation)
- Syfte: Bekräfta bokning i dialog.
- Layout: Popup med rubrik, sammanfattning och footer‑knappar.
- Innehåll:
  - Rubrik: "Bekräfta bokning"
  - BookingSummary
  - FooterNavigation (Tillbaka / Boka)
  - Efter bekräftelse: "Bokning klar" + kalender‑åtgärd
- Interaktion: Tillbaka stänger modal och går tillbaka; Boka bekräftar.
- Används i: Confirmation.
