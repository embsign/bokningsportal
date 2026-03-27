# Flow: Skapa ny BRF

Syfte: Låta en förening registrera sig och skapa ett konto för admin.

1. **Landningssida**
   - Amvändaren klickar på Skapa er bokningssida på landningssidan /

2. **Registreringsmodal – Steg 1**
   - Modal visar vilket steg man är på.
   - Cloudflare turnstile för att hindra bottar
   - Användaren anger föreningens namn.

3. **Registreringsmodal – Steg 2**
   - Användaren anger föreningens e‑postadress.
   - En knapp för registrera
   - Inget sparas i databasen än!

4. **Bekräftelse och mail**
   - Systemet skickar ett mail till angiven adress.
   - Mailet innehåller en länk för att slutföra setup.
   - Länken genereras med följande information
     - en base64 enkodad json-dict med följande information
       - föreningens namn
       - unik uuid
       - mottagarens epost
       - sha1hash över föreningens namn, mottagarens epost, uuid, salt

5. **Slutför setup - Steg 1**
   - Kontoägaren klickar på länken i mailet.
   - Länken öppnar en ny helskärmssida (inte modal) för resten av flödet.
   - Systemet verifierar sha1hash
   - Skapa föreningen om den inte redan finns i databasen
   - Skapa bokningsobjekt - förenklad modal med möjlighet att expandera med Avancerat. Den förenklade delen gör att man kan välja längd på bokning (heldag, eller minuter för pass) samt vid pass tidigast tid och senaste tid. Avancerat visar hela formuläret med alla inställnigar
   - Knapp för nästa när man lagt till alla bokningsobjekt
  
6. **Slutför setup - Steg 2**
   - Lägg till / Importera användare
   - Ge möjlighet att importera CSV med användare, öppna då samma modal som i admininterfacet för import eller gör det möjligt att manuellt lägga in användare
   - Knapp för att ladda hem CSV-mall med fält:
     - Lägenhet, Hus/Trappuppgång, RFID UID, Behörigheter (separera med |), 
   - Knappar för Nästa / Föregående
  
7. **Slutför setup - Steg 3**
   - Möjlighet att beställa bokningstavla
   - Dropdown för att välja antal - och knapp för beställ (Detta skickar ett mail till info@embsign.se med beställningsinfo)
   - Knappar för Nästa / Föregående
  
8. **Slutför setup - Steg 3**
   - Information om att boende loggar in med QR-kod och om de har bokningstavla och RFID taggar kan de genrera en QR-kod på den - annars måste de distribueras till boende
   - Knapp för att ladda ned PDF-fil med QR-koder till alla lägenheter
   - Knappar för Klar / Föregående
  
9. **Klart**
    - När man klickat klar på sista steget så öppnas admininterfacet
  

Regler:
- Modaler för redigering / lägga till - skall vara samma kod som används i admininterfacet så att framtida justeringar endast görs på ett ställe
- Salt för sha1hash lagras i databasen vid db-setup
- Man blir inte inloggad direkt till admininterfacet förrän denna setup är genomförd en gång
