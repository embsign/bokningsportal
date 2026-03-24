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

### E-post (Resend)

E-post skickas via Resend (HTTP API) från Workern.

- **RESEND_API_KEY**: API‑nyckel för Resend.
- **MAIL_FROM**: avsändaradress (t.ex. `noreply@embsign.app`).

Mottagare för beställningar är hårdkodad till `info@embsign.se`.

## Produktion (Pages/Workers)

### Frontend build (Pages)

Följande variabler används av `scripts/prepare_pages_api_base.mjs`:
- **WORKER_BASE_DOMAIN** (valfri, default `embsign.workers.dev`)
- **WORKER_NAME_PREFIX** (valfri, default `bokningsportal`)
- **API_BASE** (valfri override, högsta prioritet)
- **CF_PAGES_PULL_REQUEST_ID** / **PULL_REQUEST_NUMBER** / **PR_NUMBER** (för PR‑preview)
- **CF_PAGES_BRANCH** / **GITHUB_HEAD_REF** / **GITHUB_REF_NAME** (branchdetektion)

Om inget explicit `API_BASE` sätts byggs URL automatiskt:
- `main`/`master` → `https://bokningsportal.<WORKER_BASE_DOMAIN>/api`
- Preview branch → `https://<BRANCH_SLUG>-bokningsportal.<WORKER_BASE_DOMAIN>/api`
- PR fallback → `https://pr-<PR_NUMBER>-bokningsportal.<WORKER_BASE_DOMAIN>/api`
- Om preview‑suffix saknas failar builden (ingen fallback till production).
