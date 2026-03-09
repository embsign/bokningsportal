# UI Components

Denna fil beskriver återanvändbara UI‑komponenter som används i bokningsflödet.
Komponenterna ska spegla den faktiska implementationen i `frontend/`.

## Wireframe‑principer
- Wireframes ska referera till återanvändbara komponenter (t.ex. "Header", "FooterNavigation").
- Upprepad UI‑layout ska beskrivas via komponenter och får inte dupliceras mellan wireframes.

## Header
- Syfte: Visar app‑identitet och inloggad lägenhet.
- Layout: Horisontell bar med tre områden (vänster/mitten/höger).
  - Vänster visar logotyp/namn eller **⟵ Tillbaka** när användaren inte är på första steget.
  - Mitten visar "Lägenhet {id}".
  - Höger visar Hjälp/Logga ut.
- Interaktion:
  - Tillbaka går ett steg tillbaka i bokningsflödet.
  - Hjälp/Logga ut är klickbara (mock).
- Används i: Service selection, Date selection, Time selection, Confirmation, Admin dashboard.

## FooterNavigation
- Syfte: Standardnavigering (Tillbaka / Nästa / Boka).
- Status: Finns i kod men används inte i nuvarande UI.

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
  - Veckodagsrad (alltid synlig, Söndag i rött)
  - DayCard för varje dag
- Interaktion: Dagkort är klickbara om de inte är disabled.
- Används i: Date selection (full‑day).

## DayCard
- Syfte: Visa ett datum i månadsvy.
- Layout: Klickbart kort med veckodag + datum.
- Innehåll:
  - Datum (t.ex. 1/3)
  - Veckodag (förkortning) inuti kort
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
  - Veckonavigering (föregående/nästa) visas i Time selection‑headern
  - Veckorubrik (t.ex. "Vecka 36") visas i Time selection‑headern
  - Veckodag + datum per kolumn
  - TimeslotButton i varje cell
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
-- Används i: Service selection, Date selection, Time selection.

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

## CurrentBookingsSection
- Syfte: Visa användarens aktuella bokningar på servicesidan.
- Innehåll:
  - Rubrik: "Aktuella bokningar"
  - Lista med BookingCard
  - Tomt‑läge: "Inga aktiva bokningar."
- Interaktion: Bokningskort med status "mine" är klickbara och öppnar CancelBookingModal.
- Används i: Service selection.

## BookingCard
- Syfte: Sammanfatta en bokning i listvy.
- Innehåll:
  - Servicenamn
  - Veckodag + datum
  - Tid/heldag
- Statusfärger: samma färglogik som bokningsstatus (ledigt/upptaget/bokat/egna).

## QRSection (kiosk)
- Syfte: Ge länk för mobilbokning via QR‑kod.
- Innehåll:
  - Rubrik: "Boka med mobilen"
  - Beskrivningstext
  - Knapp: "Generera QR kod"
- Interaktion: Öppnar varnings‑modal och därefter QR‑modal.

## AdminDashboard
- Syfte: Samlad administration i tre sektioner.
- Sektioner:
  - Användare: **Redigera**, **Importera**
  - Bokningsobjekt: **Lägg till**, radåtgärder **Redigera**/**Kopiera**
  - Debiteringsunderlag / Rapporter: **Skapa rapport**
- Används i: Admin dashboard.

## BookingObjectModal
- Syfte: Skapa, kopiera eller redigera bokningsobjekt.
- Se detaljer i `docs/ux/components/booking-object-modal.md`.

## ImportUsersModal
- Syfte: Importera användare via CSV i flera steg.
- Se detaljer i `docs/ux/components/import-users-csv.md`.

## UserPickerModal
- Syfte: Välja användare att redigera.
- Innehåll: Sökfält + lista med användarrader och "Välj".

## EditUserModal
- Syfte: Redigera användarens fält.
- Fält: Identitet, Lägenhets ID, Hus/Trapphus, RFID‑tagg, Behörighetsgrupper, Admin, Status.

## ReportModal
- Syfte: Skapa debiteringsrapport.
- Steg: Välj månad → Välj bokningsobjekt → Ladda ner CSV.
