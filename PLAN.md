# Tamil Nadu Election Live Results — Implementation Plan

## Objective
Add live election result tracking from `results.eci.gov.in` to the existing Tamil Nadu Election Intelligence Portal.

## Constraints
- ECI website blocks headless browser scraping
- No official API exists
- User has zero coding/devops experience
- Frontend is already hosted on Vercel
- Budget: $5–10/month

## Decisions Made

### Hosting Platform: Railway
**Why:** Zero Linux admin required. Connect GitHub repo → auto-deploys. HTTPS included. ~$5–10/month.

### Scraping Strategy: Real Browser on Server
**Why:** ECI's Cloudflare blocks headless browsers. Running Chrome with `headless=False` inside a virtual display (xvfb) appears as a real human visitor.

### Data Architecture: Smart Parallel Fetching
**Why:** Instead of scraping 234 individual constituency pages sequentially (~10–15 min), we discovered ECI provides ~12 "statewise" summary pages that each contain ~20 constituencies. This reduces ECI requests from 234 to ~12 per refresh cycle.

### API Design: In-Memory Cache + On-Demand Detail
**Why:** Keeps the backend stateless and simple. Summary data is refreshed every 5 minutes. Full candidate-level detail is fetched only when a user clicks a specific constituency, then cached for 5 minutes.

## Implementation Steps

### Phase 1: Backend (Completed)

| Step | File | Description |
|------|------|-------------|
| 1.1 | `server/config.py` | Environment variables: ECI URL, state code, refresh interval, CORS origin, admin secret |
| 1.2 | `server/models.py` | Pydantic models: CandidateResult, ConstituencySummary, ConstituencyDetail, LiveMeta, LiveSummary |
| 1.3 | `server/scraper.py` | Playwright scraper: auto-discovers election folder, fetches statewise pages in parallel, parses HTML tables, fetches constituency detail on demand |
| 1.4 | `server/main.py` | FastAPI app: 4 endpoints, APScheduler (5-min refresh), in-memory cache, CORS, health check |
| 1.5 | `server/requirements.txt` | fastapi, uvicorn, playwright, beautifulsoup4, pydantic, apscheduler |
| 1.6 | `Dockerfile` | Playwright base image + xvfb-run for virtual display |
| 1.7 | `.dockerignore` | Excludes node_modules, frontend source, build artifacts |

### Phase 2: Frontend API Client (Completed)

| Step | File | Description |
|------|------|-------------|
| 2.1 | `src/utils/api.js` | Fetch wrapper for Railway API: getHealth, getSummary, getConstituencies, getConstituencyDetail, triggerRefresh |

### Phase 3: Frontend Context Update (Completed)

| Step | File | Description |
|------|------|-------------|
| 3.1 | `src/context/LiveResultsContext.jsx` | Fetches static JSON + API data, merges them, polls API every 60 seconds, exposes `liveMeta`, `liveData`, `getLiveStatus()` |

### Phase 4: Page Updates (Completed)

| Step | File | Changes |
|------|------|---------|
| 4.1 | `LiveDashboard.jsx` | Show live seat tally, declared/counting/awaiting counts, "Counting in Progress" banner when live data available |
| 4.2 | `LiveConstituencies.jsx` | Status badges (Declared/Counting/Leading), leading candidate, margin, colored dots |
| 4.3 | `LiveConstituency.jsx` | Vote bars per candidate, winner trophy, margin display, round number |
| 4.4 | `LiveMapView.jsx` | Color constituencies by leading alliance from live data, show live detail in side panel |
| 4.5 | `LiveDistricts.jsx` | Show declared/counting counts on district cards |
| 4.6 | `LiveDistrictDetail.jsx` | Live status per constituency in district table |

### Phase 5: Testing & Deployment (Pending User)

| Step | Action | Who |
|------|--------|-----|
| 5.1 | Push code to GitHub | User |
| 5.2 | Create Railway project from GitHub repo | User |
| 5.3 | Add `CORS_ORIGIN` environment variable | User |
| 5.4 | Copy Railway URL | User |
| 5.5 | Add `VITE_API_URL` to Vercel environment variables | User |
| 5.6 | Redeploy Vercel frontend | User |
| 5.7 | Set up cron-job.org to ping `/health` every 10 min | User |
| 5.8 | Verify `/results/summary` returns data | User |

## Fallback Plan

If ECI blocks Railway's IP address on election day:

1. **Run scraper locally:** `python server/scraper.py` on your laptop (home IP is never blocked)
2. **Push data manually:** Send POST request to `/admin/refresh` or directly inject data
3. **Laptop as bridge:** Run the scraper on your laptop every 15 minutes and push JSON to Railway

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| ECI blocks Railway IP | Medium | Real browser + xvfb; fallback to local scraping |
| CAPTCHA appears | Low-Medium | Usually clears after initial rush; manual refresh endpoint |
| HTML structure changes | Low | Parser uses header names, not fixed indices; logs extensively |
| Railway service restarts | Low | Cache rebuilds automatically; max 5-min data gap |
| Chrome OOM on Railway | Low | 1 GB is sufficient; monitored via logs |

## Post-Election Cleanup

After election day, you can:
- **Pause** the Railway project (stops billing, keeps settings)
- **Delete** the Railway project (permanent)
- **Remove** `VITE_API_URL` from Vercel to revert to static data only
