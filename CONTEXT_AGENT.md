# Agent Context: Tamil Nadu Election Intelligence Portal

## Project Summary
A comprehensive analytics dashboard and live results tracker for **Tamil Nadu Assembly Elections (2001–2026)**. Now also supports **Bihar Assembly Elections** as a secondary live state for testing and multi-state reuse.

## Architecture
```
ECI Website ←── Playwright (real browser + xvfb) ──→ Railway FastAPI ←── polling ──→ Vercel React SPA
                                                          ↓
                                                    Supabase (optional persistence)
```

## Tech Stack
- **Frontend**: React 19 + Vite 8 + Tailwind CSS 4 + React Router DOM 7 + Recharts + Framer Motion
- **Backend**: Python FastAPI + Uvicorn + APScheduler
- **Scraper**: Playwright (async) + BeautifulSoup4
- **Database**: Supabase (optional persistence)
- **Hosting**: Vercel (frontend) + Railway (backend)

## Key Features
1. Historical Data (2001–2021) — constituency results, swing analysis, incumbency, party performance, maps
2. 2026 Candidate Data — curated + raw nomination data
3. Live 2026 Election Results — real-time vote counts, margins, seat tallies, maps
4. **Multi-State Support** — parameterized frontend now supports Bihar live results using same codebase

## Recent Changes (Bihar Support)
- **Parameterized `LiveResultsContext`** — accepts `config` prop with TN defaults; existing `/live/*` routes unchanged
- **Bihar candidate data** — `public/bihar_candidates_2025.json` (2,601 candidates, 242 constituencies)
- **Bihar API routes** — `/bihar/live/*` wired to local backend on port 8000
- **`createApiClient()` factory** — in `api.js` for multiple backend endpoints
- **Dynamic `LiveTabBar`** — auto-detects Bihar from URL path
- **Alliance/party color maps** — extended in `helpers.js` with Bihar parties
- **Bug fix**: `db.py` datetime serialization for Supabase

## File Structure (Key)
| Directory | Purpose |
|-----------|---------|
| `src/pages/` | 17 page components (historical + live) |
| `src/context/` | `DataContext` + `LiveResultsContext` (now parameterized) |
| `src/utils/` | Helpers, map assets, API client (now with factory) |
| `server/` | FastAPI app, Playwright scraper, Pydantic models, config, Supabase DB client |
| `public/` | Static JSON data files (historical dataset, TN 2026 candidates, **Bihar 2025 candidates**, GeoJSON maps) |
| `Dockerfile` | Playwright base image + xvfb for Railway |

## Current Status
- Code is complete; deployment is pending (GitHub → Railway → Vercel)
- Mock data system exists for pre-election testing (`ENABLE_MOCK_DATA=true`)
- **Bihar testing active** — backend scrapes Bihar results, frontend displays them at `/bihar/live/*`
- Election day referenced in docs: **May 4, 2026**
