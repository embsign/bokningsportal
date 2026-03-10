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
   npx wrangler d1 execute booking-prod --local --config ../wrangler.toml --file ../db/migrations/002_indexes.sql
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

### Demo access tokens (from seed data)

| Role | URL path | Token |
|---|---|---|
| Admin | `/admin/admin-demo-token` | `admin-demo-token` |
| User Anna | `/user/user-demo-token-anna` | `user-demo-token-anna` |
| User Erik | `/user/user-demo-token-erik` | `user-demo-token-erik` |
