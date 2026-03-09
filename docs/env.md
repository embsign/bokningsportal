# Miljövariabler

Det här är de miljövariabler som används i nuvarande implementation.

## Frontend (runtime, i webbläsaren)

Frontend är statisk och kan inte läsa OS‑env direkt. Värden injiceras via HTML eller inline‑script.

- **API_BASE** (rekommenderad)
  - Syfte: bas‑URL till backend‑API.
  - Sätts via `window.API_BASE` eller `<meta name="api-base" ...>`.
  - Default: `/api`.

Exempel:
```html
<meta name="api-base" content="https://api.example.com/api" />
```
eller
```html
<script>
  window.API_BASE = "https://api.example.com/api";
</script>
```

## Backend (Node lokalt)

Inga **krävda** miljövariabler just nu.

Valfria:
- **PORT**: lyssnande port (default `8787`).

## Produktion (Pages/Workers)

I nuläget används inga obligatoriska env‑variabler i koden.
Eventuella production‑specifika värden (t.ex. API‑bas) behöver injiceras i frontend som ovan.
