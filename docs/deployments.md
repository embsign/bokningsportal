# Deployments (Pages Functions + D1)

## Översikt
- Backend API körs som Cloudflare Pages Functions.
- D1 används som databas.
- Produktion använder `booking-prod`.
- Preview för PR använder `booking-pr-{PR_NUMBER}`.
- D1-binding för Pages sätts i Cloudflare Dashboard (Settings → Bindings), inte via placeholder i `wrangler.toml`.

## Preview vs Production

### Produktion
- Pages project: `bokningsportal`
- DB‑namn: `booking-prod`
- Deploy triggas på `main`.

### Preview (PR)
- Pages preview för branch/PR
- DB‑namn: `booking-{BRANCH_SLUG}` (fallback `booking-pr-{PR_NUMBER}`)
- Deploy triggas på `pull_request`.
- Branch‑namn används primärt för att matcha Pages preview‑builds.

## Provisionering (idempotent)

`scripts/provision_d1.mjs`:
1) `wrangler d1 list`
2) Skapar DB om den saknas (`--location weur` för Västeuropa)
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

Frontend använder `/api` (same-origin) för API-anrop.

### Auto‑resolution i build

Ingen API-base-injektion krävs i build när backend körs som Pages Functions.

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

## Pages bindings (Cloudflare Dashboard)

För deploy i Pages måste D1 bindas i projektets settings:

1) **Workers & Pages** → välj projektet  
2) **Settings** → **Bindings**  
3) **Add** → **D1 database bindings**  
4) Variable name: `DB`  
5) Välj rätt databas för miljön (Production/Preview)

Detta ersätter tidigare Worker-flöde där `database_id` kunde injiceras i `wrangler.generated.toml`.

## Automatiserad preview-D1 (PR)

Workflow: `.github/workflows/pages-preview.yml`

Vid varje PR (`opened`, `synchronize`, `reopened`) gör workflowen:
1) Skapar/hittar databas `booking-pr-<PR_NUMBER>`
2) Kör migrations
3) Kör `db/seed.sql`
4) Skriver korrekt D1-binding direkt i `wrangler.toml` i CI-jobbet
5) Publicerar preview via `wrangler pages deploy frontend ...` (utan `--config`, eftersom Pages deploy inte stöder custom config path)

När PR stängs (`closed`) tas preview-databasen bort automatiskt.

### Nödvändiga GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Rekommenderat i Cloudflare Pages Settings

- Root directory: `frontend`
- Build command: tom
- Build output directory: `.`
- Functions directory: `functions`

Workflowen hanterar D1-provisionering och deploy till preview, så manual DB-hantering för preview behövs inte.
