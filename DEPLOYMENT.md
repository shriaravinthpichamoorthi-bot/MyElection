# Deployment Configuration

## Railway (Backend / Python scraper)

Set these in Railway → your service → **Variables**.

### Required

| Variable | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://your-project.supabase.co` | From Supabase → Settings → API |
| `SUPABASE_KEY` | `eyJ...` (service_role key) | From Supabase → Settings → API → service_role |
| `STATE_CODE` | `S04` (Bihar) / `S22` (Tamil Nadu) | ECI state code |
| `STATE_NAME` | `bihar` / `tamil nadu` | Lowercase |
| `TOTAL_CONSTITUENCIES` | `243` (Bihar) / `234` (TN) | |
| `ADMIN_SECRET` | _(generate below)_ | Min 32 chars, not a default value |
| `ENVIRONMENT` | `production` | Enables all production-mode guards |

Generate a strong `ADMIN_SECRET`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Optional (override defaults)

| Variable | Default | Notes |
|---|---|---|
| `ELECTION_FOLDER` | _(auto-discover)_ | e.g. `ResultAcGenNov2025` — set only if auto-discovery fails |
| `CORS_ORIGIN` | `*` | **Set this to your Vercel URL** e.g. `https://myelection.vercel.app` |
| `REFRESH_INTERVAL_MINUTES` | `5` | How often to scrape ECI — keep ≥ 3 |
| `PAGE_LOAD_DELAY_SECONDS` | `3` | Wait time after page load for JS to render |
| `HEADLESS` | `false` | `false` = real Chrome via xvfb (recommended, less likely to be blocked) |
| `BROWSER_TIMEOUT` | `30000` | Page load timeout in ms |
| `DETAIL_CACHE_TTL` | `900` | Seconds to cache constituency detail pages (15 min) |
| `DETAIL_CONCURRENCY` | `5` | Max parallel browser tabs for detail pages (1–20) |
| `STATEWISE_CONCURRENCY` | `15` | Max parallel browser tabs for summary pages (1–30) |
| `ENABLE_MOCK_DATA` | `false` | Never set to `true` in production — server will refuse to start |

### Do NOT set in Railway

These are frontend-only (`VITE_*`) variables and have no effect on the server:

- `VITE_API_URL`
- `VITE_BIHAR_API_URL`
- `VITE_POLL_INTERVAL_SECONDS`
- `VITE_MAP_TICK_SECONDS`

---

## Vercel (Frontend / Vite React app)

Set these in Vercel → your project → **Settings → Environment Variables**.

### Required

| Variable | Value | Notes |
|---|---|---|
| `VITE_BIHAR_API_URL` | `https://your-railway-app.railway.app` | Your Railway public URL — no trailing slash |

### Optional (override defaults)

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://127.0.0.1:8000` | Same Railway URL as above — used by some pages |
| `VITE_POLL_INTERVAL_SECONDS` | _(app default)_ | How often the frontend polls the API |
| `VITE_MAP_TICK_SECONDS` | _(app default)_ | Map animation tick interval |

### Do NOT set in Vercel

Never put these in Vercel — they are server secrets and would be exposed in the browser bundle:

- `SUPABASE_KEY`
- `ADMIN_SECRET`
- `STATE_CODE` / `STATE_NAME` (without `VITE_` prefix — they won't be bundled anyway, but no need)

---

## Checklist before going live

- [ ] `SUPABASE_KEY` rotated (if the old key was ever exposed)
- [ ] `ADMIN_SECRET` is 32+ random characters
- [ ] `CORS_ORIGIN` is set to your exact Vercel URL (not `*`)
- [ ] `ENVIRONMENT=production` is set in Railway
- [ ] `VITE_BIHAR_API_URL` is set in Vercel and points to Railway
- [ ] Test `/health` endpoint on Railway returns `{"status":"ok"}`
- [ ] Test that `/config` returns 401 without the Bearer token
- [ ] Test that the frontend loads and polls data correctly
