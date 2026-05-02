# Code & Security Review

> Review date: 2026-05-01  
> Scope: Live voting display system (backend + frontend)  
> Focus: Security vulnerabilities, code quality issues, architectural risks

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 2 | **FIXED** |
| High | 4 | **FIXED** |
| Medium | 6 | **FIXED** |
| Low | 5 | Acknowledged / deferred |

---

## Resolved Issues

### C1. Default Admin Secret in Source Control
**Status: FIXED**

- `config.py`: Removed fallback secret. `ADMIN_SECRET` is now `None` if not set.
- `main.py`: `/admin/refresh` returns **503** when `ADMIN_SECRET` is not configured.

### C2. CORS Wildcard in Production
**Status: FIXED**

- `main.py`: `allow_credentials=False` when `CORS_ORIGIN` is `*` or not set.
- Methods restricted to `GET, POST`.
- Warning logged when running with open CORS.

### H1. No Input Sanitization on Constituency ID
**Status: FIXED**

- `main.py` `get_constituency()`: Added `const_id.isdigit()` validation.
- Returns **400 Bad Request** for non-numeric IDs.

### H2. Missing Authentication/Rate Limiting on Detail Endpoint
**Status: FIXED**

- `main.py`: Simple in-memory rate limiter. 10 requests/minute per IP.
- Returns **429 Too Many Requests** when exceeded.

### H3. Cache Poisoning via Detail Responses
**Status: FIXED**

- `main.py`: Replaced `**raw_detail` with explicit field merge.
- Only `candidates` is extracted from detail response.

### M1. Race Condition in Cache Access
**Status: FIXED**

- `main.py`: Per-constituency `asyncio.Lock()` prevents duplicate fetches.
- Global `asyncio.Semaphore(DETAIL_CONCURRENCY)` limits concurrent Playwright tabs.

### M2. Memory Leak: Browser Context Never Closed
**Status: ALREADY HANDLED**

- `scraper.py`: `stop()` method closes browser, context, and playwright.
- `main.py` lifespan: Calls `await _scraper.stop()` on shutdown.

### M3. Supabase Schema Drift Causes Silent Failures
**Status: FIXED**

- `db.py`: `_filter_row()` strips unknown columns before upsert.
- `db.py`: `_SAFE_CONSTITUENCY_COLUMNS` whitelist ensures only known columns are sent.
- Created `server/supabase/migrations/001_add_live_columns.sql` for full schema setup.

### M4. nameToIdMap is a Mutable Object, Not State
**Status: FIXED**

- `LiveResultsContext.jsx`: Converted to `useState({})`.
- Properly triggers re-renders when populated.

### M5. Frontend Detail Fetching Lacks Error Boundaries
**Status: FIXED**

- `LiveDistrictDetail.jsx`: Replaced `Promise.all` with `Promise.allSettled`.
- Individual fetch failures no longer kill the entire batch.

### M6. Infinite Re-render Risk in LiveConstituency
**Status: FIXED**

- `LiveConstituency.jsx`: Wrapped in `useMemo`.
- Sorts on `[...rows].copy()` instead of mutating in-place.

### A1/A2. Single-Process Scraper + Health Check
**Status: FIXED**

- `main.py`: `_refresh_lock` prevents parallel scraper calls.
- `scraper.py`: `STATEWISE_SEM` caps parallel statewise tabs.
- `main.py`: `/health` returns `"degraded"` if data >10 min stale or <50% parsed.

---

## Acknowledged / Deferred Issues

### L1. Hardcoded Year Strings
**Status: Deferred**
- Most hardcoded years already replaced with `isBiharMode ? '2025' : '2026'`.
- Full cleanup not critical for functionality.

### L2. No Frontend Tests
**Status: Deferred**
- Recommendation: Add Jest + React Testing Library before TN election.
- Priority: Medium. Start with `parse_statewise_page` and `slugify` tests.

### L3. Missing Type Safety
**Status: Deferred**
- Recommendation: Migrate `utils/helpers.js` and `utils/api.js` to TypeScript.
- Priority: Low. Nice-to-have but not blocking.

### L4. Inline Styles Everywhere
**Status: Deferred**
- Creates new object references on every render.
- Recommendation: Migrate to Tailwind utility classes gradually.
- Priority: Low (performance impact is minimal at current scale).

### L5. Sensitive File Access
**Status: Verified**
- `.gitignore` properly excludes `.env` files.
- No secrets committed in current working tree.

---

## Architecture Notes

### RAM Optimization (2 GB Budget)

| Setting | Value | Reason |
|---------|-------|--------|
| STATEWISE_CONCURRENCY | 15 | Fast pages, low RAM per tab |
| DETAIL_CONCURRENCY | 5 | Slow pages, ~200 MB per tab |
| DETAIL_CACHE_TTL | 900s (15 min) | Reduces Playwright calls |

Peak RAM estimate: ~15 x 50MB + ~5 x 200MB = ~1.75 GB. Safe for Railway Basic.

### AWS vs Railway

See `AWS_VS_RAILWAY.md` for full comparison.

Verdict: **Stay on Railway.** AWS is overkill and over-budget for current needs. Move only if you need >2,000 concurrent users or auto-scaling.

---

## Remaining Recommendations

1. **Set a strong ADMIN_SECRET** in Railway production environment.
2. **Set CORS_ORIGIN** to your exact Vercel domain (not `*`).
3. **Run Supabase migration** before first deployment if using Supabase.
4. **Monitor RAM** on Railway during first few scrapes.
5. **Add uptime monitoring** (UptimeRobot free tier is sufficient).
6. **Test rate limiting** by hammering the detail endpoint from multiple IPs.
