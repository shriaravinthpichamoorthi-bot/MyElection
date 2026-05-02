# Live Voting Display - Implementation Guide

> This document explains how the live election results display was built for Bihar 2025, so you can replicate and adapt it for Tamil Nadu 2026 (or any other Indian state).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Backend: ECI Scraper](#2-backend-eci-scraper)
3. [Backend: API & Caching](#3-backend-api--caching)
4. [Frontend: Data Context](#4-frontend-data-context)
5. [Frontend: Pages & Visualization](#5-frontend-pages--visualization)
6. [Multi-State Parameterization](#6-multi-state-parameterization)
7. [Data Flow: End-to-End](#7-data-flow-end-to-end)
8. [Replicating for Tamil Nadu](#8-replicating-for-tamil-nadu)
9. [Troubleshooting Checklist](#9-troubleshooting-checklist)
10. [Post-Implementation Fixes](#10-post-implementation-fixes)
11. [Deployment Plan](#11-deployment-plan)

---

## 1. Architecture Overview

```
ECI Website
  |
  v  Playwright scraping
FastAPI Backend (Railway)
  - APScheduler (5 min poll)
  - In-Memory Cache
  - Detail Cache (15 min TTL)
  - Supabase (backup)
  |
  v  fetch() polling every 30s
React 19 Frontend (Vercel)
  - LiveResultsContext
  - Dashboard / Constituencies / Districts
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate static + live data | Static JSON is committed to git. Live data is scraped and volatile. |
| Two-level scraping | Statewise summary pages polled every 5 min. Detail pages fetched on-demand with 15-min cache. |
| headless=False | ECI blocks headless browsers. Real window via xvfb works reliably. |
| In-memory cache + Supabase | Fast reads from RAM. Supabase hydrates on startup and persists across restarts. |
| Frontend polling | React context polls every 30s. |
| Concurrency limits | Statewise capped at 15 tabs, detail capped at 5 tabs - protects 2 GB RAM budget. |

---

## 2. Backend: ECI Scraper

### File: server/scraper.py

#### 2.1 Election Folder Discovery

The scraper auto-discovers the election folder by hitting the ECI homepage and looking for links matching state codes. You can also hardcode ELECTION_FOLDER in .env to skip discovery.

#### 2.2 Statewise Summary Scraping

The statewise pages contain a table with one row per constituency:
- Constituency, Const. No., Leading Candidate, Leading Party, Trailing Candidate, Trailing Party, Margin, Round, Status

**Important**: Bihar statewise pages do not include vote counts (only margin). Tamil Nadu pages might - check the actual HTML.

The scraper fetches pages in parallel, capped by STATEWISE_CONCURRENCY env var (default 15).

#### 2.3 Constituency Detail Scraping

Detail pages contain a candidate-level table with votes, EVM votes, postal votes, vote share. The scraper parses this into a candidates array.

#### 2.4 Key Scraping Constants

```
REFRESH_INTERVAL_MINUTES = 5
PAGE_LOAD_DELAY_SECONDS = 3
DETAIL_CACHE_TTL_SECONDS = 900    # 15 minutes
HEADLESS = false
BROWSER_TIMEOUT = 30000
STATEWISE_CONCURRENCY = 15
DETAIL_CONCURRENCY = 5
```

---

## 3. Backend: API & Caching

### File: server/main.py

#### 3.1 In-Memory Cache Structure

```python
_cache = {
    "constituencies": {},      # id -> ConstituencySummary
    "detail_cache": {},        # id -> {timestamp, data}
    "last_updated": None,
    "status": "awaiting",
    "declared": 0,
    "counting": 0,
    "awaiting": TOTAL_CONSTITUENCIES,
    "party_tally": {},
    "alliance_tally": {},
}
```

#### 3.2 Data Refresh Flow

Protected by _refresh_lock (asyncio.Lock) to prevent parallel refresh calls:
1. Scrape all statewise pages
2. Normalize alliances from leading_party
3. Compute party_tally and alliance_tally
4. Update cache counts
5. Persist to Supabase (gracefully handles schema mismatches)

#### 3.3 API Endpoints

| Endpoint | Description | Rate Limit |
|----------|-------------|------------|
| GET /health | Health check (degraded if stale) | - |
| GET /results/summary | Meta + tallies | - |
| GET /results/constituencies | All summaries | - |
| GET /results/constituency/{id} | Detail for one | 10/min per IP |
| GET /config | Frontend config | - |
| POST /admin/refresh | Force re-scrape | Admin secret required |

#### 3.4 Security Hardening

- const_id validated with .isdigit() -> 400 for non-numeric
- Rate limiting: 10 detail requests/minute per IP
- Admin endpoint disabled if ADMIN_SECRET not set -> 503
- CORS allow_credentials=False when origin is wildcard
- Detail fetch protected by per-constituency Lock + global Semaphore(5)

---

## 4. Frontend: Data Context

### File: src/context/LiveResultsContext.jsx

#### 4.1 Config Prop

```jsx
const biharConfig = {
  candidateJson: '/bihar_candidates_2025.json',
  districtJson: '/bihar_districts.json',
  apiClient: biharApiClient,
  allianceColors: { NDA: '#2E8B57', MGB: '#228B22' },
};
```

#### 4.2 Three-Load Architecture

1. Static candidate JSON -> allResults
2. District mapping JSON -> districtMap
3. Live API (poll loop) -> liveData

#### 4.3 Name-to-ID Matching

Pass 1: Exact name match (case-insensitive)
Pass 2: Fuzzy normalized match (strip SC/ST, non-alpha chars)
Pass 3: Manual overrides for edge cases

#### 4.4 Polling Strategy

Default interval: 30 seconds. loadData callback reloads static JSON, fetches live API, merges data, updates nameToIdMap state.

---

## 5. Frontend: Pages & Visualization

### 5.1 Live Dashboard (src/pages/LiveDashboard.jsx)

Props: title, year, totalConstituencies, alliancesOrder, showAllianceChart, declaredTitle

Components: StatusCard grid, SeatChart (Recharts), Party Breakdown pane, stacked bar, Quick Links

### 5.2 Constituency Table (src/pages/LiveConstituencies.jsx)

13 columns with sticky first 2 columns. Filters: Alliance, Party, Status, District, Search. Sorting enabled.

### 5.3 District Pages

LiveDistricts.jsx: Card grid with top alliance and live status bar.
LiveDistrictDetail.jsx: Table with on-demand detail fetching (Promise.allSettled).

### 5.4 Individual Constituency (src/pages/LiveConstituency.jsx)

Fetches detail data via API. Shows candidate vote bars, counts, percentages. Winner badge if declared.

---

## 6. Multi-State Parameterization

### 6.1 Routing

Default /live/* routes use TN config.
/bihar/live/* routes wrap LiveResultsProvider with biharConfig.

### 6.2 Dynamic Base Path

useLiveBasePath() returns /live or /bihar/live based on URL.
All links use ${basePath}/... instead of hardcoded /live/...

### 6.3 API Client Factory

createApiClient(baseUrl) returns { getSummary, getConstituencies, getConstituencyDetail, getConfig }.

---

## 7. Data Flow: End-to-End

### User opens Dashboard
1. React app loads from Vercel
2. LiveResultsContext mounts -> fetches static JSON, district map, live API
3. Name-to-ID matching runs
4. Live data merged into allResults
5. Dashboard renders with charts and status cards
6. Polling starts every 30s

### User clicks a constituency
1. Navigate to /{basePath}/constituency-slug
2. Resolve slug to name, lookup ID via nameToIdMap
3. Fetch /results/constituency/{id} for vote counts
4. Render candidate list with vote bars

### User visits a district page
1. Navigate to /{basePath}/district/district-slug
2. Find all constituencies for this district
3. Fetch detail data for any missing vote counts (parallel with allSettled)
4. Cache locally, render table

---

## 8. Replicating for Tamil Nadu

### Backend Setup

1. Create server/.env for TN:
   STATE_CODE=S22
   STATE_NAME=tamil nadu
   TOTAL_CONSTITUENCIES=234
   ELECTION_FOLDER=ResultAcGenMay2026

2. Create server/parties_alliances.json with TN alliances

3. Run Supabase migration: server/supabase/migrations/001_add_live_columns.sql

4. Deploy backend to Railway

### Frontend Setup

5. Create public/tn_candidates_2026.json
6. Create public/tn_districts.json (optional)
7. Update src/utils/helpers.js with TN party colors and mappings
8. Default /live/* routes already use TN config - no App.jsx changes needed

### Name Matching Validation

9. Run backend and verify 234 constituencies parsed
10. Test exact and fuzzy name matching
11. Fix mismatches via manual overrides or corrected static JSON

---

## 9. Troubleshooting Checklist

| Symptom | Fix |
|---------|-----|
| 0 constituencies parsed | Set HEADLESS=false |
| Page 1: found 0 tables | Inspect HTML, update parse_statewise_page() |
| Missing vote counts | Fetch detail data on-demand |
| Wrong alliance colors | Add missing party variants to parties_alliances.json |
| Constituency not found | Check exact ECI name, add manual override |
| Duplicate names | Use stable matching + manual override |
| District page shows TN data | Check districtJson config |
| Supabase save fails | Run migration 001_add_live_columns.sql |
| CORS errors | Update CORS_ORIGIN env var |
| Rate limited (429) | Wait 1 minute |
| Admin endpoint disabled (503) | Set ADMIN_SECRET env var |

---

## 10. Post-Implementation Fixes

### Security Fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| Default admin secret in source | Critical | ADMIN_SECRET=None if not set. Returns 503 when disabled. |
| CORS wildcard with credentials | Critical | allow_credentials=False when CORS_ORIGIN not set. |
| No input sanitization on const_id | High | .isdigit() validation -> 400 Bad Request. |
| No rate limiting on detail | High | 10 requests/minute per IP -> 429. |
| Cache poisoning via **raw_detail | High | Explicit field merge instead of dict unpacking. |

### Concurrency & Performance Fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| Race condition in detail cache | Medium | Per-constituency asyncio.Lock + global Semaphore. |
| Background scrape + admin overlap | Medium | _refresh_lock prevents parallel refresh. |
| Statewise scraper RAM spike | Medium | STATEWISE_SEM caps parallel tabs (default 15). |
| Detail fetch RAM spike | Medium | DETAIL_SEM caps parallel tabs (default 5). |
| Detail cache too short | Medium | TTL increased from 5 min to 15 min. |
| Health check too basic | Medium | Returns degraded if stale or <50% constituencies. |

### Frontend Fixes

| Issue | Severity | Fix |
|-------|----------|-----|
| nameToIdMap not React state | Medium | Converted to useState({}). |
| Promise.all failure cascade | Medium | Replaced with Promise.allSettled. |
| In-place array sort mutation | Medium | Wrapped in useMemo + [...rows].sort(). |

### Supabase Resilience

| Issue | Severity | Fix |
|-------|----------|-----|
| Schema drift crashes persistence | Medium | db.py filters rows to safe columns before upsert. |
| No migration script | Medium | Created 001_add_live_columns.sql. |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| ADMIN_SECRET | (none) | Bearer token for /admin/refresh. Must be set in production. |
| CORS_ORIGIN | * | Comma-separated allowed origins. |
| DETAIL_CACHE_TTL | 900 | Detail cache TTL in seconds. |
| STATEWISE_CONCURRENCY | 15 | Max parallel statewise tabs. |
| DETAIL_CONCURRENCY | 5 | Max parallel detail tabs. |
| HEADLESS | false | MUST be false for ECI. |

---

## 11. Deployment Plan

### Railway Backend

Dockerfile: server/Dockerfile (uses mcr.microsoft.com/playwright/python with xvfb)

Required env vars:
- STATE_CODE, STATE_NAME, TOTAL_CONSTITUENCIES, ELECTION_FOLDER
- ADMIN_SECRET (strong random string)
- CORS_ORIGIN (your Vercel domain)
- SUPABASE_URL, SUPABASE_KEY (optional but recommended)

RAM: Railway Basic - 2 GB RAM (~$10-15/mo)
- With STATEWISE_CONCURRENCY=15 + DETAIL_CONCURRENCY=5, peak RAM stays under 2 GB.
- Upgrade to 4 GB on election day if traffic spikes.

### Vercel Frontend

1. Push code to GitHub
2. Connect repo to Vercel
3. Set VITE_API_URL to your Railway backend URL
4. Deploy

### Supabase Setup

1. Create Supabase project
2. Open SQL Editor
3. Run server/supabase/migrations/001_add_live_columns.sql
4. Copy Project URL and Service Role Key to Railway env vars

### Pre-Election Checklist

- [ ] Backend deployed with correct STATE_CODE and ELECTION_FOLDER
- [ ] ADMIN_SECRET set to strong random string
- [ ] CORS_ORIGIN set to Vercel domain
- [ ] Supabase migration applied
- [ ] Frontend deployed
- [ ] Static candidate JSON uploaded
- [ ] parties_alliances.json updated
- [ ] Name matching verified
- [ ] Rate limits tested
- [ ] Health endpoint returning ok
- [ ] Uptime monitoring configured

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| server/scraper.py | Playwright ECI scraper |
| server/main.py | FastAPI app with security hardening |
| server/models.py | Pydantic data models |
| server/config.py | Environment config |
| server/db.py | Supabase persistence with schema-safe filtering |
| server/parties_alliances.json | Party->alliance mapping |
| server/supabase/migrations/001_add_live_columns.sql | Schema migration |
| src/context/LiveResultsContext.jsx | Live data loading, merging, polling |
| src/pages/LiveDashboard.jsx | Dashboard with charts |
| src/pages/LiveConstituencies.jsx | Constituency table |
| src/pages/LiveConstituency.jsx | Individual constituency detail |
| src/pages/LiveDistricts.jsx | District card grid |
| src/pages/LiveDistrictDetail.jsx | District constituency table |
| src/utils/api.js | API client factory |
| src/utils/helpers.js | Colors, formatting, slugify |
| src/hooks/useLiveBasePath.js | Dynamic route base path |
| src/components/LiveTabBar.jsx | Navigation tabs |
| public/*_candidates_*.json | Static candidate data |
| public/*_districts.json | Constituency->district mapping |
