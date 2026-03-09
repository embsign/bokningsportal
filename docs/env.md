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

### Frontend build (Pages)

Följande variabler används av `scripts/prepare_pages_api_base.mjs`:
- **WORKER_BASE_DOMAIN** (krävs om `API_BASE` inte sätts)
  - Exempel: `embsign.workers.dev`
- **WORKER_NAME_PREFIX** (valfri, default `booking-api`)
- **API_BASE** (valfri override, högsta prioritet)
- **CF_PAGES_PULL_REQUEST_ID** / **PULL_REQUEST_NUMBER** / **PR_NUMBER** (för PR‑preview)
- **CF_PAGES_BRANCH** / **GITHUB_HEAD_REF** / **GITHUB_REF_NAME** (branchdetektion)

Om inget explicit `API_BASE` sätts byggs URL automatiskt:
- `main`/`master` → `https://booking-api.<WORKER_BASE_DOMAIN>/api`
- PR preview → `https://booking-api-pr-<PR_NUMBER>.<WORKER_BASE_DOMAIN>/api`
