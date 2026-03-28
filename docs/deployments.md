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
- Worker‑namn: `{BRANCH_SLUG}-bokningsportal` (fallback `pr-{PR_NUMBER}-bokningsportal`)
- DB‑namn: `booking-{BRANCH_SLUG}` (fallback `booking-pr-{PR_NUMBER}`)
- Deploy triggas på `pull_request`.
- Branch‑namn används primärt för att matcha Pages preview‑builds.

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
- Preview branch → `https://<branch-slug>-bokningsportal.<WORKER_BASE_DOMAIN>/api`
- PR fallback (`CF_PAGES_PULL_REQUEST_ID`, `PULL_REQUEST_NUMBER`, `PR_NUMBER`) → `https://pr-123-bokningsportal.<WORKER_BASE_DOMAIN>/api`
- Om preview‑namn inte kan härledas failar builden (ingen fallback till production).

Detta gör att frontend kan deployas med rätt worker‑namn även för PR‑previews.

## Cloudflare Turnstile (registrering av ny BRF)

För att registreringsflödet ska fungera måste Turnstile vara konfigurerad både i frontend och backend.

### 1) Skapa Turnstile‑widget i Cloudflare

- Gå till **Cloudflare Dashboard → Turnstile**.
- Skapa en ny widget och välj lämplig widgettyp (Managed är oftast bäst).
- Spara:
  - **Site key** (publik, används i frontend).
  - **Secret key** (hemlig, används i backend).

### 2) Lägg till tillåtna hostnames/domäner

Ja, du behöver lägga till domäner/hostnames i Turnstile‑widgeten. Minst:

- Produktionsdomän för frontend (t.ex. `bokningar.dindoman.se`).
- Eventuella preview‑domäner som används i CI/PR‑preview.
- Lokalt för utveckling (t.ex. `localhost`).

Om hostnamen inte finns med i widgetens tillåtna lista kommer verifieringen att fallera.

### 3) Konfigurera frontend med Site key

Sätt site key i `frontend/index.html`:

```html
<meta name="turnstile-site-key" content="0x4AAAAA..." />
```

Alternativt kan den injiceras via:

```html
<script>window.TURNSTILE_SITE_KEY = "0x4AAAAA...";</script>
```

### 4) Konfigurera backend med Secret key

Sätt `TURNSTILE_SECRET` som Worker‑secret i Cloudflare.

Exempel:

```sh
wrangler secret put TURNSTILE_SECRET
```

Backend verifierar token mot:
`https://challenges.cloudflare.com/turnstile/v0/siteverify`

och blockerar registreringen om verifieringen misslyckas.

## Lokalt
- Backend (Node): `npm run dev` i `backend/`
- Frontend: `npx serve -s -l 5173` i `frontend/`
