# Deployments (Workers + D1)

## Översikt
- Backend API körs som Cloudflare Worker.
- D1 används som databas.
- Produktion använder `booking-prod`.
- Preview för PR använder `booking-pr-{PR_NUMBER}`.

## Preview vs Production

### Produktion
- Worker‑namn: `bokningsportal`
- DB‑namn: `booking-prod`
- Deploy triggas på `main`.

### Preview (PR)
- Worker‑namn: `bokningsportal-pr-{PR_NUMBER}`
- DB‑namn: `booking-pr-{PR_NUMBER}`
- Deploy triggas på `pull_request`.
- **PR_NUMBER måste vara satt** (annars failar deploy).

## Provisionering (idempotent)

`scripts/provision_d1.mjs`:
1) `wrangler d1 list`
2) Skapar DB om den saknas
3) Kör migrations
4) Kör demo‑seed

Sätt `PRINT_ENV=1` för att lista env‑variabler (hjälper att hitta PR‑nummer).

## Migrations
- Ligger i `db/migrations/`
- Körs via `wrangler d1 migrations apply`

## Demo‑seed
- Ligger i `db/seed.sql`
- Körs vid varje deploy, idempotent med `INSERT OR IGNORE`
- Demo‑konton:
  - Admin: `/admin/admin-demo-token`
  - Boende: `/user/user-demo-token-anna`, `/user/user-demo-token-erik`

## Backend URL discovery

Frontend läser API‑bas från:
1) `window.API_BASE` (runtime)
2) `<meta name="api-base" content="...">`
3) fallback `/api`

I produktion/preview bör `API_BASE` injiceras i HTML.
Exempel:
```html
<meta name="api-base" content="https://bokningsportal.example.workers.dev/api" />
```

### Auto‑resolution i build

`scripts/prepare_pages_api_base.mjs` räknar ut rätt API‑bas automatiskt:
- Production (`main`/`master`) → `https://bokningsportal.<WORKER_BASE_DOMAIN>/api`
- PR preview (`CF_PAGES_PULL_REQUEST_ID`, `PULL_REQUEST_NUMBER`, `PR_NUMBER`, eller branchformat `pr-123`) → `https://bokningsportal-pr-123.<WORKER_BASE_DOMAIN>/api`
- Fallback utan PR‑nummer → production‑worker

Detta gör att frontend kan deployas med rätt worker‑namn även för PR‑previews.

## Lokalt
- Backend (Node): `npm run dev` i `backend/`
- Frontend: `npx serve -s -l 5173` i `frontend/`
