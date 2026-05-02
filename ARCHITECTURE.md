# Tamil Nadu Election Live Results — Architecture

## Overview

This document describes the technical architecture for fetching live election results from the Election Commission of India (ECI) website and displaying them in the Tamil Nadu Election Intelligence Portal.

**Goal:** Provide real-time constituency-level vote counts, leading candidates, margins, and declared winners to website visitors.

**Constraint:** ECI blocks headless browser scraping. We use a real browser (Playwright with visible window via xvfb) running on a cloud server.

---

## High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ECI WEBSITE (results.eci.gov.in)                                           │
│  • Static HTML tables, no public API                                        │
│  • ~12 "statewise" summary pages (20 constituencies each)                   │
│  • Individual "Constituencywise" detail pages                               │
│  • Anti-bot: Cloudflare/WAF blocks headless browsers & datacenter IPs       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼ HTTPS (real Chrome browser)
┌─────────────────────────────────────────────────────────────────────────────┐
│  RAILWAY VPS — PYTHON BACKEND                                               │
│  Cost: ~$5–10/month  |  RAM: 1 GB+  |  Never sleeps                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Playwright + Chromium (headless=False with xvfb virtual display)   │    │
│  │  • Looks like a normal Windows/Mac user to ECI                      │    │
│  │  • Fetches ~12 statewise pages in parallel every 5 minutes          │    │
│  │  • Parses HTML tables with BeautifulSoup                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  FastAPI Server                                                     │    │
│  │  • In-memory cache (Python dict)                                    │    │
│  │  • APScheduler triggers scraper every 5 minutes                     │    │
│  │  • Serves 3 endpoints + health check                                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼ HTTPS (CORS-enabled)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  VERCEL — REACT FRONTEND (Static SPA)                                       │
│  • Already hosted                                                           │
│  • Polls Railway API every 60 seconds                                       │
│  • Merges live vote data with existing candidate metadata                   │
│  • Falls back to nomination data if API is unavailable                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  VISITORS                                                                   │
│  • See live vote counts, margins, status badges, seat tallies              │
│  • Map colors update by leading alliance                                    │
│  • Zero direct load on ECI (all traffic goes to Railway cache)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Scraper (`server/scraper.py`)

**Technology:** Playwright (async) + BeautifulSoup4

**Responsibilities:**
- Launch a real Chromium browser with anti-detection measures
- Navigate to ECI homepage and discover the active election folder
- Fetch statewise summary pages in parallel
- Parse constituency tables to extract: name, leading candidate, leading party, trailing candidate, trailing party, margin, status, round
- Fetch individual constituency detail pages on demand

**Anti-Detection Measures:**
- `headless=False` with xvfb virtual display (looks like real user)
- Realistic viewport (1920x1080)
- Real User-Agent string
- `navigator.webdriver` property masked
- `--disable-blink-features=AutomationControlled` flag

### 2. API Server (`server/main.py`)

**Technology:** FastAPI + Uvicorn + APScheduler

**Endpoints:**

| Endpoint | Method | Description | ECI Requests |
|----------|--------|-------------|--------------|
| `/health` | GET | Server status, cache age, counts | 0 |
| `/results/summary` | GET | Overall seat tally by party/alliance, counting progress | 0 |
| `/results/constituencies` | GET | All 234 constituencies with lead/margin/status | 0 |
| `/results/constituency/{id}` | GET | Full candidate vote breakdown for one constituency | 0 if cached, 1 if not |
| `/admin/refresh` | POST | Force immediate ECI refresh (protected by secret) | ~12 |

**Cache Structure:**
```python
{
  "last_updated": datetime,
  "status": "awaiting" | "counting" | "completed",
  "constituencies": {
    "1": {
      "id": "1",
      "name": "Gummidipoondi",
      "status": "counting",
      "round": 8,
      "leading_candidate": "...",
      "leading_party": "DMK",
      "leading_alliance": "DMK Alliance",
      "trailing_candidate": "...",
      "trailing_party": "AIADMK",
      "margin": 5420,
      "margin_pct": 3.2
    }
  },
  "detail_cache": { /* on-demand fetched details */ },
  "party_tally": { "DMK": 98, "AIADMK": 45, ... },
  "alliance_tally": { "DMK Alliance": 125, "AIADMK": 60, ... },
  "declared": 45,
  "counting": 189,
  "awaiting": 0
}
```

### 3. Frontend Integration (`src/context/LiveResultsContext.jsx`)

**Data Sources:**
1. `/live_candidates_2026.json` — Static candidate metadata (names, parties, alliances, symbols)
2. `VITE_API_URL/results/constituencies` — Live vote data from Railway

**Merge Strategy:**
- Static data is loaded once on mount
- API data is polled every 60 seconds
- For each constituency, live data is merged into the existing candidate structure via `_live` field
- Pages check `liveMeta.status` to determine whether to show live results or nomination fallback

### 4. Docker Deployment (`Dockerfile`)

**Base Image:** `mcr.microsoft.com/playwright/python:v1.40.0-jammy`
- Pre-installed Chromium + system dependencies
- Eliminates complex manual Chrome setup

**Key Feature:** `xvfb-run -a`
- Provides a virtual X11 display
- Allows Playwright to run `headless=False` on a headless server
- ECI sees a normal browser session, not a headless bot

---

## Data Flow

### Routine Refresh (Every 5 Minutes)

```
APScheduler ──→ scraper.discover_election()
                    │
                    ▼
              ECI homepage ──→ election folder name
                    │
                    ▼
              scraper.fetch_statewise_page(1)
                    │
                    ▼
              Parse "Page 1 of 12" ──→ total_pages = 12
                    │
                    ▼
              asyncio.gather(pages 2..12)
                    │
                    ▼
              Parse all tables ──→ constituency dict
                    │
                    ▼
              Compute tallies ──→ Update cache
```

### Visitor Request

```
Visitor ──→ Vercel CDN ──→ React App ──→ GET /results/summary
                                              │
                                              ▼
                                        Railway cache (0 ECI requests)
                                              │
                                              ▼
                                        React renders instantly
```

### Constituency Detail Click

```
Visitor clicks constituency ──→ GET /results/constituency/42
                                    │
                                    ▼
                              Check detail_cache
                                    │
                              ┌─────┴─────┐
                              ▼           ▼
                           Cached      Not cached
                              │           │
                              ▼           ▼
                           Return    Fetch ConstituencywiseS2242.htm
                                        │
                                        ▼
                                     Parse candidate votes
                                        │
                                        ▼
                                     Cache & return
```

---

## Security & Reliability

| Concern | Mitigation |
|---------|------------|
| ECI blocks Railway IP | Real browser + xvfb; if blocked, manual fallback via laptop script |
| CAPTCHA | Usually clears after initial traffic spike; `/admin/refresh` for manual retry |
| Cache lost on restart | Rebuilds automatically within 5 minutes; max 1-minute downtime |
| CORS | Restricted to Vercel domain only |
| Admin endpoint abuse | Protected by `ADMIN_SECRET` environment variable |
| High frontend traffic | Cache is in-memory and tiny; FastAPI handles thousands of requests |

---

## Cost Breakdown

| Component | Service | Cost |
|-----------|---------|------|
| Frontend hosting | Vercel | $0 |
| Backend + Scraper | Railway | ~$5–10/month |
| Cron keep-alive | cron-job.org | $0 |
| **Total** | | **~$5–10/month** |

---

## Files Reference

```
myelection/
├── server/
│   ├── main.py              # FastAPI app + scheduler
│   ├── scraper.py           # Playwright ECI scraper
│   ├── models.py            # Pydantic data models
│   ├── config.py            # Environment settings
│   └── requirements.txt     # Python dependencies
├── Dockerfile               # Railway deployment image
├── .dockerignore            # Excludes node_modules, src, etc.
├── src/
│   ├── utils/api.js         # Frontend API client
│   ├── context/
│   │   └── LiveResultsContext.jsx   # Merges static + live data
│   └── pages/
│       ├── LiveDashboard.jsx
│       ├── LiveConstituencies.jsx
│       ├── LiveConstituency.jsx
│       ├── LiveMapView.jsx
│       ├── LiveDistricts.jsx
│       └── LiveDistrictDetail.jsx
└── public/
    └── live_candidates_2026.json    # Static candidate metadata
```
