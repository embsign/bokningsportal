# Flow: Generera QR‑kod

Syfte: Skapa en ny personlig bokningslänk för mobil.

1. Användaren är i översikten (Service selection) i kiosk‑läge.
2. Under sektionen **Boka med mobilen** klickar användaren på **Generera QR kod**.
3. En varnings‑modal visas:
   - Informerar att befintlig QR‑kod blir ogiltig.
   - Användaren kan välja **Avbryt** eller **Generera**.
4. Vid **Generera**:
   - Ny QR‑kod skapas.
   - En modal med stor QR‑kod visas.
   - Text informerar att QR‑koden bara visas en gång och bör sparas (t.ex. som bokmärke).
5. Användaren stänger modalen.

Regler:
- Knappen **Generera QR kod** visas endast i kiosk‑läge (ej på mobil).
- Ny QR‑kod ersätter tidigare kod.
