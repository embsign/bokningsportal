# AGENTS.md

## Cursor Cloud specific instructions

### Architecture overview

BRF Bokningsportal is a serverless Cloudflare-native booking system for Swedish housing associations. See `docs/README.md` for detailed documentation.

| Component | Technology | Location |
|---|---|---|
| Backend | Cloudflare Worker (TypeScript) via Wrangler | `backend/` |
| Frontend | Vanilla JS (no build step) | `frontend/` |
| Database | Cloudflare D1 (SQLite, local via Miniflare) | `db/migrations/`, `db/seed.sql` |

### Running the development environment

**Backend** (port 8787):
```sh
cd backend && npm run dev
```

**Frontend + API proxy** (port 5173): The frontend has an `api/` directory containing JS modules. A reverse proxy is needed so that `/api/*` routes (without `.js` extension) go to the backend while static files (including `api/*.js`) are served from the frontend directory. Use Caddy:

```sh
# Install once: sudo apt-get install -y caddy
# Caddyfile at /tmp/Caddyfile:
cat > /tmp/Caddyfile << 'CADDYEOF'
:5173 {
    @api_calls {
        path /api/*
        not path *.js *.css *.map
    }
    handle @api_calls {
        reverse_proxy localhost:8787
    }
    handle {
        root * /workspace/frontend
        file_server
        try_files {path} /index.html
    }
}
CADDYEOF
caddy start --config /tmp/Caddyfile
```

Then open `http://localhost:5173` in the browser.

### Critical gotchas

1. **D1 PRAGMA bug**: The `initDb()` function in `backend/src/worker/db/init.ts` runs `db.exec(migration001)` which starts with `PRAGMA foreign_keys = ON;`. D1's local `exec()` fails on this PRAGMA. **Workaround**: Pre-populate the D1 database before/after starting the backend:
   ```sh
   cd backend
   npx wrangler d1 execute booking-prod --local --config ../wrangler.toml --file ../db/migrations/001_initial_schema.sql
   npx wrangler d1 execute booking-prod --local --config ../wrangler.toml --file ../db/seed.sql
   ```
   The first HTTP request to the backend will fail (PRAGMA error), but it sets `initialized = true` in the worker. All subsequent requests work because the tables already exist from pre-population.

2. **Set-Cookie header bug**: The `json()` helper in `router.ts` uses `{ ...init.headers }` which fails for `Headers` objects (they don't spread into plain objects). This causes the `Set-Cookie` header to be lost in login responses. A fix has been applied to properly iterate `Headers` instances.

3. **Frontend `api-base` meta tag**: Changed from `http://localhost:8787/api` (cross-origin, no CORS) to `/api` (same-origin via Caddy proxy). This is required for the proxy-based dev setup.

### Lint / Type checking

```sh
cd backend && npx tsc --noEmit
```
No ESLint config exists. TypeScript checking is the primary static analysis tool.

### Backend performance guardrails (DB calls)

When changing backend endpoints (`backend/src/worker/router.ts` and related helpers), always optimize for as few D1 queries as possible.

Rules:
- No DB queries inside loops (`for`, `for...of`, `map`, `filter`, `reduce`) for per-item processing.
- No helper design that causes hidden N+1 queries per item.
- Batch reads with `IN (...)`, `JOIN`, `GROUP BY`, or equivalent set-based queries.
- Preload related data once, store in in-memory `Map`/objects, and reuse during iteration.
- Batch writes with `db.batch(...)` when multiple rows are inserted/updated/deleted in one flow.
- Prefer one joined query over multiple sequential lookups when fetching related entities.

PR/change expectations for backend endpoint work:
- Briefly document query count strategy in the change summary (what was batched/preloaded).
- Validate touched endpoint flows with real HTTP calls locally (not only static/type checks).
- If a loop remains, explicitly justify why no additional DB call is performed in that loop.

### Android build in Cursor Cloud

Android-kioskappen finns i `android/` och kan byggas i cloud-miljön om SDK installeras först.

1. Installera Android command-line tools:
```sh
sudo mkdir -p /opt/android-sdk/cmdline-tools
cd /tmp
wget -q https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip -O cmdline-tools.zip
unzip -q -o cmdline-tools.zip -d /tmp/android-cmdline-tools
sudo rm -rf /opt/android-sdk/cmdline-tools/latest
sudo mv /tmp/android-cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest
sudo chown -R ubuntu:ubuntu /opt/android-sdk
```

2. Acceptera licenser och installera SDK-komponenter:
```sh
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/opt/android-sdk --licenses < <(yes)
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/opt/android-sdk \
  "platform-tools" \
  "platforms;android-36" \
  "build-tools;36.0.0"
```

3. Konfigurera projektet och bygg:
```sh
echo "sdk.dir=/opt/android-sdk" > /workspace/android/local.properties
cd /workspace/android && ./gradlew :app:assembleDebug
```

Verifierad fungerande build-output:
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### Demo access tokens (from seed data)

| Role | URL path | Token |
|---|---|---|
| Admin | `/admin/admin-demo-token` | `admin-demo-token` |
| User Anna | `/user/user-demo-token-anna` | `user-demo-token-anna` |
| User Erik | `/user/user-demo-token-erik` | `user-demo-token-erik` |
