# Tamil Nadu Election Intelligence Portal — Context Document

> Generated for agent context preservation. Read this before making any code changes.

---

## 1. Project Overview

A comprehensive analytics dashboard for **Tamil Nadu Assembly Elections (2001–2026)**. It provides historical election data, candidate profiles, swing analysis, incumbency stats, stronghold detection, party/alliance performance, women participation metrics, interactive maps, and live 2026 election tracking.

- **Repository root:** `C:\ai-pro\MyElection\myelection`
- **Current branch:** `new-ui` (recent work: "New UI and live election" + "premium SaaS UI redesign")
- **Frontend hosting:** Vercel (static SPA)
- **Backend hosting:** Railway (Python FastAPI + Playwright scraper)
- **Build output:** Static site in `dist/` (deployed as a SPA)

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 (StrictMode) |
| Bundler | Vite 8 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) + custom CSS (`src/index.css`) |
| Routing | React Router DOM 7 (`BrowserRouter`) |
| Charts | Recharts |
| Animation | Framer Motion |
| Icons | Lucide React + custom SVG party icons (`PartyIcon.jsx`) |
| Linting | ESLint 10 |
| Data scraper (nominations) | Python + Selenium + BeautifulSoup (standalone) |
| **Live results backend** | **Python + FastAPI + Playwright + APScheduler + Docker** |

---

## 3. Directory Structure

```
myelection/
├── public/                          # Static assets served at /
│   ├── output.json                  # Historical election data (2001–2021) — LARGE
│   ├── candidates_2026.json         # Curated 2026 candidate nominations
│   ├── live_candidates_2026.json    # Live/raw 2026 nomination data
│   ├── tamil-nadu-assembly-constituencies.geojson
│   ├── tamil-nadu-districts.geojson
│   └── ... (favicon, icons, svg maps)
├── server/                          # NEW: Python backend for live results
│   ├── main.py                      # FastAPI app + scheduler + cache
│   ├── scraper.py                   # Playwright ECI scraper
│   ├── models.py                    # Pydantic data models
│   ├── config.py                    # Environment variable settings
│   └── requirements.txt             # Python dependencies
├── src/
│   ├── main.jsx                     # React entry point
│   ├── App.jsx                      # Router + global providers
│   ├── index.css                    # Global styles, design system classes
│   ├── data/
│   │   └── loader.js                # Core data processor
│   ├── context/
│   │   ├── DataContext.jsx          # Historical data provider
│   │   └── LiveResultsContext.jsx   # Live 2026 data provider (polls API)
│   ├── components/
│   │   ├── Layout.jsx
│   │   ├── LiveResultsBanner.jsx
│   │   ├── LiveTabBar.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── MapFragmentIcon.jsx
│   │   ├── PartyBadge.jsx
│   │   ├── PartyIcon.jsx
│   │   ├── SortTh.jsx
│   │   ├── StatCard.jsx
│   │   └── YearBadge.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Districts.jsx
│   │   ├── DistrictDetail.jsx
│   │   ├── Constituencies.jsx
│   │   ├── ConstituencyDetail.jsx
│   │   ├── Analytics.jsx
│   │   ├── Compare.jsx
│   │   ├── Candidates.jsx
│   │   ├── CandidateProfile.jsx
│   │   ├── MapView.jsx
│   │   ├── Predictions.jsx
│   │   ├── LiveDashboard.jsx        # Shows live tally when API active
│   │   ├── LiveConstituencies.jsx   # Status badges, margins
│   │   ├── LiveDistricts.jsx        # Declared/counting counts
│   │   ├── LiveDistrictDetail.jsx   # Live status per constituency
│   │   ├── LiveConstituency.jsx     # Vote bars, timestamps
│   │   └── LiveMapView.jsx          # Colored by leading alliance
│   ├── hooks/
│   │   └── useSortable.js
│   └── utils/
│       ├── helpers.js
│       ├── mapAssets.js
│       └── api.js                   # NEW: API client for Railway backend
├── candidatescrapper.py
├── TN_2026_Candidates.csv
├── TN_2026_Candidates.xlsx
├── Dockerfile                       # NEW: Railway deployment
├── .dockerignore
├── ARCHITECTURE.md                  # NEW: Live results architecture
├── PLAN.md                          # NEW: Implementation plan
├── NEXT_STEPS.md                    # NEW: Deployment checklist
├── CONFIG.md                        # NEW: Environment variable reference
├── package.json
├── vite.config.js
├── index.html
└── eslint.config.js
```

---

## 4. Data Architecture

### 4.1 Data Sources

| File/Source | What | Format |
|-------------|------|--------|
| `public/output.json` | Historical results 2001–2021 | JSON (~209k lines) |
| `public/candidates_2026.json` | Curated 2026 nominations | JSON |
| `public/live_candidates_2026.json` | Rawer 2026 nomination data | JSON |
| Railway API `/results/summary` | Live seat tally, counting progress | JSON (dynamic) |
| Railway API `/results/constituencies` | All 234 with lead/margin/status | JSON (dynamic) |
| Railway API `/results/constituency/{id}` | Full candidate vote breakdown | JSON (on-demand) |

### 4.2 Data Flow

#### Historical Data (Unchanged)
```
Browser
  └─ DataContext ──→ fetch /output.json + /candidates_2026.json
       └── loader.js (processData)
            └── Returns processed dataset to all historical pages
```

#### Live Results Data (New)
```
ECI Website (results.eci.gov.in)
  │
  ▼ Playwright real browser (headless=False + xvfb)
Railway VPS — Python Backend
  │
  ├─ APScheduler: fetches ~12 statewise pages every 5 min
  │   └── Parses HTML tables → in-memory cache
  │
  ├─ FastAPI: serves /results/summary, /results/constituencies
  │   └── Instant responses from cache (0 ECI requests)
  │
  └─ On-demand: /results/constituency/{id}
      └── Fetches detail page if not in cache or cache expired
          └── 5-minute TTL on detail cache
  │
  ▼ HTTPS (CORS-restricted)
Vercel — React Frontend
  │
  └─ LiveResultsContext
      ├── Fetches /live_candidates_2026.json (static candidate metadata)
      ├── Polls Railway API every 60 seconds (configurable)
      ├── Auto-discovers backend config via /config endpoint
      └── Merges static + live data for all live pages
```

### 4.3 Key Data Structures

**Railway API `/results/constituencies` response:**
```js
{
  meta: {
    last_updated: "2026-05-04T09:30:00+05:30",
    status: "counting",
    total_constituencies: 234,
    declared: 45,
    counting: 189,
    awaiting: 0
  },
  constituencies: {
    "1": {
      id: "1",
      name: "Gummidipoondi",
      status: "counting",
      round: 8,
      leading_candidate: "...",
      leading_party: "DMK",
      leading_alliance: "DMK Alliance",
      trailing_candidate: "...",
      trailing_party: "AIADMK",
      margin: 5420,
      margin_pct: 3.2
    }
  }
}
```

**Railway API `/results/constituency/1` response:**
```js
{
  constituency: {
    id: "1",
    name: "Gummidipoondi",
    status: "counting",
    margin: 5420,
    last_updated: "2026-05-04T09:30:00+05:30",
    candidates: [
      { name: "...", party: "DMK", votes: 78000, vote_share: 53.7, status: "leading" },
      { name: "...", party: "AIADMK", votes: 53000, vote_share: 36.5, status: "trailing" }
    ]
  }
}
```

### 4.4 Pre-2008 Delimitation Handling

`loader.js` contains a massive hardcoded mapping `PRE2008_NO_TO_DISTRICT` that maps old constituency numbers (used in 2001 & 2006) to modern district names. This is critical.

---

## 5. Frontend Architecture

### 5.1 Component Hierarchy

```
App (BrowserRouter)
├── DataProvider
│   └── LiveResultsProvider
│       └── Layout
│           ├── SidebarContent
│           ├── Top Bar
│           ├── LiveResultsBanner
│           └── <Routes> → Page components
```

### 5.2 State Management

- **No Redux**. Two React Contexts:
  1. **`DataContext`** — heavy historical dataset.
  2. **`LiveResultsContext`** — merges static candidate metadata with live API data.
- **Local state** handles UI concerns.

### 5.3 Context APIs

**`useData()` returns:** `{ data, loading, error }`

**`useLiveResults()` returns:**
```js
{
  loading,
  allResults,        // Static metadata merged with live data (_live field)
  liveData,          // Raw API constituency data
  liveMeta,          // API meta (declared, counting, awaiting, last_updated)
  lastUpdated,       // Date object from API
  apiError,          // Error message if API unreachable
  backendConfig,     // Config from /config endpoint
  mapTickMs,         // Configured map tick interval
  pollIntervalMs,    // Configured frontend poll interval
  getConstituency(name),
  getLiveStatus(name),
  nameToIdMap,
}
```

**Graceful fallback:** If Railway API is unreachable, loads static `live_candidates_2026.json` and shows nomination data.

---

## 6. Routing

All routes in `src/App.jsx` under `BrowserRouter`.

| Route | Page |
|-------|------|
| `/` | `Home` |
| `/districts` | `Districts` |
| `/district/:slug` | `DistrictDetail` |
| `/constituencies` | `Constituencies` |
| `/constituency/:slug` | `ConstituencyDetail` |
| `/analytics` | `Analytics` |
| `/compare` | `Compare` |
| `/candidates` | `Candidates` |
| `/candidate/:slug` | `CandidateProfile` |
| `/map` | `MapView` |
| `/predictions` | `Predictions` |
| `/live` | `LiveDashboard` |
| `/live/constituencies` | `LiveConstituencies` |
| `/live/districts` | `LiveDistricts` |
| `/live/district/:slug` | `LiveDistrictDetail` |
| `/live/:slug` | `LiveConstituency` |
| `/live-map` | `LiveMapView` |

**Slug resolution:** Use `slugify()` from `utils/helpers.js`.

---

## 7. Styling & Design System

Dark "SaaS intelligence" aesthetic:
- Background: `#020617` (slate-950)
- Cards: `#0f172a` (slate-900) with `#1e293b` borders
- Accent: Indigo/Violet gradient (`#4f46e5` → `#7c3aed`)
- Fonts: `Inter` (body), `Space Grotesk` (headings)

Custom CSS classes in `src/index.css`: `.app-bg`, `.sidebar`, `.topbar`, `.card`, `.card-hover`, `.text-gradient`, `.nav-active`, `.nav-idle`, `.pill-active`, `.pill-idle`, `.field`, `.tbl-head`, `.tbl-row`, `.skeleton`, `.live-dot`.

Tailwind CSS 4 imported via `@import "tailwindcss"` in `index.css`.

---

## 8. Key Utilities & Helpers

### `src/utils/helpers.js`

`PARTY_COLORS`, `ALLIANCE_COLORS`, `partyColor()`, `allianceColor()`, `formatNumber()`, `formatPct()`, `slugify()`, `formatName()`, `marginClass()`, `YEARS`, `YEAR_COLORS`.

### `src/utils/mapAssets.js`

Lazy GeoJSON fetchers: `loadDistrictAsset()`, `loadConstituencyAsset()`, `normalizeGeoDistrict()`.

### `src/utils/api.js`

API client for Railway backend: `getHealth()`, `getSummary()`, `getConstituencies()`, `getConstituencyDetail(id)`, `getConfig()`, `triggerRefresh(secret)`.

Uses `VITE_API_URL` environment variable.

### `src/hooks/useSortable.js`

```js
const { sorted, col, dir, toggle } = useSortable(data, defaultCol, defaultDir);
```

---

## 9. Backend Architecture

### 9.1 Components

| File | Purpose |
|------|---------|
| `server/main.py` | FastAPI app: 5 endpoints, APScheduler, in-memory cache, CORS |
| `server/scraper.py` | Playwright scraper: discovers election folder, fetches statewise pages in parallel, parses HTML, fetches detail on demand |
| `server/models.py` | Pydantic models |
| `server/config.py` | Environment variables |
| `Dockerfile` | Playwright base image + xvfb-run |

### 9.2 API Endpoints

| Method | Endpoint | Description | ECI Requests |
|--------|----------|-------------|--------------|
| GET | `/health` | Server status | 0 |
| GET | `/results/summary` | Overall tally | 0 |
| GET | `/results/constituencies` | All 234 with leads | 0 |
| GET | `/results/constituency/{id}` | Full candidate breakdown | 0 if cached, 1 if not |
| GET | `/config` | Public config values | 0 |
| POST | `/admin/refresh` | Force refresh (protected) | ~12 |

### 9.3 Detail Cache TTL

Each constituency detail cached for `DETAIL_CACHE_TTL_SECONDS` (default: 300 = 5 minutes). Cache stores `{timestamp, data}`. If age >= TTL, deletes and re-fetches from ECI.

### 9.4 Anti-Detection Measures

- `headless=False` with xvfb virtual display
- Realistic viewport (1920x1080)
- Real User-Agent
- `navigator.webdriver` masked
- `--disable-blink-features=AutomationControlled`

---

## 10. Configurable Settings

### Backend (Railway Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `REFRESH_INTERVAL_MINUTES` | `5` | Scraper refresh interval |
| `DETAIL_CACHE_TTL` | `300` | Detail cache TTL in seconds |
| `PAGE_LOAD_DELAY_SECONDS` | `3` | Browser wait after page load |
| `BROWSER_TIMEOUT` | `30000` | Page load timeout in ms |
| `HEADLESS` | `false` | `false`=real browser, `true`=invisible |
| `CORS_ORIGIN` | `*` | Allowed website |
| `ADMIN_SECRET` | `dev-secret-change-me` | Admin password |

### Frontend (Vercel Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | *(none)* | Railway API URL |
| `VITE_POLL_INTERVAL_SECONDS` | `60` | Dashboard poll interval |
| `VITE_MAP_TICK_SECONDS` | `10` | Map tick interval |

**Auto-discovery:** Frontend reads `/config` from Railway and auto-calculates poll interval. `VITE_POLL_INTERVAL_SECONDS` overrides this.

Full reference in `CONFIG.md`.

---

## 11. Build & Development

```bash
npm run dev      # Start Vite dev server
npm run build    # Production build → dist/
npm run preview  # Preview production build
npm run lint     # ESLint
```

---

## 12. Data Pipeline

### Nomination Scraper: `candidatescrapper.py`

- Target: `https://erolls.tn.gov.in/acwithcandidate_tnla2026/AC_List.aspx`
- Stack: Selenium + BeautifulSoup
- Output: `TN_2026_Candidates.csv` + `.xlsx`
- Run manually when needed

### Live Results Scraper: `server/scraper.py`

- Target: `https://results.eci.gov.in`
- Stack: Playwright (async) + BeautifulSoup4
- Strategy: ~12 statewise summary pages in parallel (covers all 234)
- Deployment: Docker on Railway, triggered by APScheduler every 5 minutes
- On-demand: Individual constituency detail pages when requested

---

## 13. Important Implementation Details

1. **Candidate deduplication** in `loader.js` — handles initials like "M.K. Stalin". Be careful modifying.
2. **Two 2026 candidate files** — `candidates_2026.json` (curated) vs `live_candidates_2026.json` (raw).
3. **Live data merge** — `LiveResultsContext.jsx` matches constituency names (exact + fuzzy) to merge static metadata with live API data.
4. **Map rendering** — Custom SVG polygons from GeoJSON coordinates, not Leaflet/D3.
5. **Predictions model** — Rule-based heuristic, not ML.
6. **Detail cache in-memory** — Lost on restart, rebuilds within 5 minutes.
7. **Frontend graceful fallback** — If Railway is down, live pages show nomination data.
8. **Dark mode only** — No light mode toggle.

---

## 14. How to Make Common Changes

### Add a new page
1. Create `src/pages/MyPage.jsx`
2. Add route in `src/App.jsx`
3. Add nav link in `src/components/Layout.jsx`

### Change refresh timings
1. Edit environment variables in Railway/Vercel dashboards
2. See `CONFIG.md` for full reference
3. Redeploy

### Modify table sorting
1. Use `useSortable(data, defaultKey, 'desc')`
2. Use `<SortTh col="myKey" active={col} dir={dir} onClick={toggle}>`

### Add a new chart
1. Import from `recharts`
2. Use `ResponsiveContainer`

---

*End of context document. When modifying this project, always check `CONTEXT.md` first for architectural guidance.*
