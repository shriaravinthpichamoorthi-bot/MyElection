# Configuration Guide

> All time-dependent settings are configurable via environment variables. You never need to edit code to change timings.

---

## Backend Settings (Railway Environment Variables)

Set these in your Railway project dashboard under **Variables**.

| Variable | Default | What It Controls |
|----------|---------|------------------|
| `REFRESH_INTERVAL_MINUTES` | `5` | How often the scraper fetches fresh summary data from ECI |
| `DETAIL_CACHE_TTL` | `300` | How long a constituency detail stays cached before re-fetching (**seconds**) |
| `PAGE_LOAD_DELAY_SECONDS` | `3` | How long the browser waits after navigating to a page before reading the HTML |
| `BROWSER_TIMEOUT` | `30000` | Maximum time to wait for a page to load before giving up (**milliseconds**) |
| `CORS_ORIGIN` | `*` | Which website is allowed to call the API (set to your Vercel URL) |
| `ADMIN_SECRET` | `dev-secret-change-me` | Password for the `/admin/refresh` endpoint |
| `HEADLESS` | `false` | `false` = real browser window (recommended). `true` = invisible browser (likely blocked by ECI) |

### Quick Examples

**Faster updates during peak counting:**
```
REFRESH_INTERVAL_MINUTES=2
DETAIL_CACHE_TTL=120
PAGE_LOAD_DELAY_SECONDS=2
```

**Slower updates to reduce ECI load:**
```
REFRESH_INTERVAL_MINUTES=10
DETAIL_CACHE_TTL=600
PAGE_LOAD_DELAY_SECONDS=5
```

**Stricter security:**
```
CORS_ORIGIN=https://myelection.vercel.app
ADMIN_SECRET=your-random-long-password-here
```

---

## Frontend Settings (Vercel Environment Variables)

Set these in your Vercel project dashboard under **Settings → Environment Variables**.

| Variable | Default | What It Controls |
|----------|---------|------------------|
| `VITE_API_URL` | *(none)* | URL of your Railway API (required) |
| `VITE_POLL_INTERVAL_SECONDS` | `60` | How often the dashboard asks Railway for new data |
| `VITE_MAP_TICK_SECONDS` | `10` | How often the "Updated X ago" text refreshes on the map |

### Quick Examples

**More frequent dashboard updates:**
```
VITE_POLL_INTERVAL_SECONDS=30
```

**Less frequent map time updates:**
```
VITE_MAP_TICK_SECONDS=30
```

---

## How Frontend Auto-Discovers Backend Timing

The frontend is smart — it reads your Railway config automatically:

1. On page load, the frontend calls `GET /config` on your Railway API
2. Railway responds with its actual settings:
   ```json
   {
     "refresh_interval_minutes": 5,
     "detail_cache_ttl_seconds": 300,
     "page_load_delay_seconds": 3,
     "browser_timeout_ms": 30000
   }
   ```
3. The frontend uses `refresh_interval_minutes` to calculate its own polling rate:
   - Formula: `poll_interval = backend_refresh_interval × 30 seconds`
   - Example: backend refreshes every 5 min → frontend polls every 30 sec
   - Clamped between 10 seconds and 2 minutes

This means if you change `REFRESH_INTERVAL_MINUTES` on Railway, the frontend automatically adjusts — no need to redeploy Vercel.

**Override:** If you set `VITE_POLL_INTERVAL_SECONDS` explicitly, it takes priority over auto-discovery.

---

## Recommended Configurations by Scenario

### Before Election Day (Testing)
```
REFRESH_INTERVAL_MINUTES=60
DETAIL_CACHE_TTL=3600
VITE_POLL_INTERVAL_SECONDS=300
```
*Minimal load. API stays warm but barely touches ECI.*

### Election Morning (First Results)
```
REFRESH_INTERVAL_MINUTES=2
DETAIL_CACHE_TTL=120
PAGE_LOAD_DELAY_SECONDS=2
VITE_POLL_INTERVAL_SECONDS=30
```
*Fast updates when every vote matters.*

### Mid-Day Steady State
```
REFRESH_INTERVAL_MINUTES=5
DETAIL_CACHE_TTL=300
PAGE_LOAD_DELAY_SECONDS=3
VITE_POLL_INTERVAL_SECONDS=60
```
*Balanced. The default settings.*

### Late Evening (Most Results Declared)
```
REFRESH_INTERVAL_MINUTES=15
DETAIL_CACHE_TTL=900
VITE_POLL_INTERVAL_SECONDS=120
```
*Most constituencies are final. Check occasionally for stragglers.*

---

## Changing Config Without Redeploying

### Railway (Backend)
1. Go to railway.app → your project → **Variables** tab
2. Edit or add a variable
3. Click **Redeploy** (or wait for auto-redeploy)
4. New settings take effect immediately

### Vercel (Frontend)
1. Go to vercel.com → your project → **Settings → Environment Variables**
2. Edit or add a variable
3. Go to **Deployments** tab → click latest deployment → **Redeploy**
4. New settings take effect after ~1 minute

---

## Config Endpoint

You can inspect the current backend config anytime by visiting:

```
https://your-railway-url.up.railway.app/config
```

Response:
```json
{
  "refresh_interval_minutes": 5,
  "detail_cache_ttl_seconds": 300,
  "page_load_delay_seconds": 3,
  "browser_timeout_ms": 30000
}
```

No secret required. This is useful for debugging.
