# Test Plan — Pre-Election Day

> How to test the live results system **right now**, before ECI has any live data.

---

## What We're Testing

Since ECI doesn't have live Tamil Nadu results yet, we test by:
1. Running the backend locally with **mock data**
2. Pointing the frontend at your local backend
3. Verifying all pages show live-style UI correctly
4. Confirming the Docker image builds

---

## Step 1: Install Python Dependencies

Open PowerShell/Terminal in your project folder:

```powershell
cd server
pip install -r requirements.txt
playwright install chromium
```

**Expected result:** No errors. Chromium downloads (~150 MB).

---

## Step 2: Start the Backend Locally

```powershell
cd server
uvicorn main:app --reload --port 8000
```

**Expected result:**
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Starting up...
INFO:     Scheduler started: refresh every 5 minutes
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Note:** The scraper will fail to find ECI data (expected). The API still works — it just returns empty/default data.

---

## Step 3: Test the API Endpoints

Open your browser and check these URLs:

| URL | Expected Result |
|-----|----------------|
| `http://localhost:8000/health` | `{"status": "ok", "cache_count": 0, "declared": 0}` |
| `http://localhost:8000/config` | `{"refresh_interval_minutes": 5, "detail_cache_ttl_seconds": 300, ...}` |
| `http://localhost:8000/results/summary` | `{"meta": {"status": "awaiting", ...}, "party_tally": {}, ...}` |
| `http://localhost:8000/results/constituencies` | `{"meta": {...}, "constituencies": {}}` |

If all return JSON without errors, your backend is running correctly.

---

## Step 4: Point Frontend at Local Backend

Create a `.env` file in your project root (same folder as `package.json`):

```
VITE_API_URL=http://localhost:8000
```

Then start the frontend dev server (in a new terminal):

```powershell
npm run dev
```

---

## Step 5: Test the Frontend Live Pages

Open `http://localhost:5173` (or whatever Vite shows) and navigate through all live pages:

### `/live` — Dashboard
- [ ] Shows "Results will appear here on election day" banner
- [ ] Shows nomination data (candidate counts, alliance bars)
- [ ] No errors in browser console (F12 → Console)

### `/live/constituencies` — All Constituencies
- [ ] Table loads with all 234 constituencies
- [ ] Status dots are gray (awaiting)
- [ ] Shows "Awaiting results" in status column
- [ ] Search and filters work

### `/live/:slug` — Single Constituency
- [ ] Pick any constituency (e.g., `/live/poonamallee`)
- [ ] Shows candidate list with "Awaiting" badges
- [ ] Shows 2021 historical context if available
- [ ] No errors in console

### `/live-map` — Map View
- [ ] Map renders with constituency shapes
- [ ] Colors show nomination alliances (not live)
- [ ] Clicking a constituency shows detail panel
- [ ] "Results will appear here on election day" banner visible

### `/live/districts` — Districts
- [ ] All 38 districts show as cards
- [ ] Shows nomination counts per district
- [ ] "Awaiting results" text on cards

### `/live/district/:slug` — District Detail
- [ ] Pick any district
- [ ] Constituency table loads
- [ ] Shows gray status dots

---

## Step 6: Inject Mock Live Data (The Fun Part)

We need to see what the pages look like WITH live data. We'll manually add fake data to the backend cache.

**While the backend is running**, open a new terminal:

```powershell
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:8000/admin/refresh" -Method POST
```

This won't do much (ECI has no data), so let's inject mock data directly.

### Option A: Simple Mock (Recommended)

Create a file `test_mock.py` in the `server/` folder:

```python
import requests
import json
from datetime import datetime, timezone

# Inject mock constituency data
mock_constituencies = {
    "1": {
        "id": "1",
        "name": "Gummidipoondi",
        "status": "counting",
        "round": 12,
        "leading_candidate": "K. S. Vijayakumar",
        "leading_party": "DMK",
        "leading_alliance": "DMK Alliance",
        "trailing_candidate": "R. Manimaran",
        "trailing_party": "AIADMK",
        "margin": 5420,
        "margin_pct": 3.2,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "candidates": [
            {"name": "K. S. Vijayakumar", "party": "DMK", "alliance": "DMK Alliance", "votes": 78000, "vote_share": 53.7, "status": "leading"},
            {"name": "R. Manimaran", "party": "AIADMK", "alliance": "AIADMK", "votes": 53000, "vote_share": 36.5, "status": "trailing"},
            {"name": "Third Candidate", "party": "NTK", "alliance": "NTK", "votes": 12000, "vote_share": 8.2, "status": "trailing"},
        ]
    },
    "2": {
        "id": "2",
        "name": "Ponneri",
        "status": "declared",
        "leading_candidate": "Winner Name",
        "leading_party": "DMK",
        "leading_alliance": "DMK Alliance",
        "trailing_candidate": "Loser Name",
        "trailing_party": "AIADMK",
        "margin": 25000,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "candidates": [
            {"name": "Winner Name", "party": "DMK", "alliance": "DMK Alliance", "votes": 95000, "vote_share": 58.0, "status": "won"},
            {"name": "Loser Name", "party": "AIADMK", "alliance": "AIADMK", "votes": 70000, "vote_share": 42.0, "status": "trailing"},
        ]
    }
}

# This is a simplified mock — for full testing, restart backend with mock data
print("Mock data prepared. Restart backend with --mock flag for full testing.")
```

### Option B: Full Mock (More Realistic)

The backend currently doesn't have a `--mock` flag. For quick visual testing, the easiest way is to temporarily modify `server/main.py` to inject mock data on startup.

**After testing, remember to revert the changes.**

Add this inside the `lifespan` function, right after `await refresh_data()`:

```python
# TEMPORARY: Inject mock data for testing
from datetime import datetime, timezone
_cache["status"] = "counting"
_cache["declared"] = 1
_cache["counting"] = 1
_cache["awaiting"] = 232
_cache["last_updated"] = datetime.now(timezone.utc)
_cache["party_tally"] = {"DMK": 2, "AIADMK": 0}
_cache["alliance_tally"] = {"DMK Alliance": 2, "AIADMK": 0}
_cache["constituencies"] = {
    "1": {
        "id": "1", "name": "Gummidipoondi", "status": "counting", "round": 12,
        "leading_candidate": "K. S. Vijayakumar", "leading_party": "DMK",
        "leading_alliance": "DMK Alliance", "trailing_candidate": "R. Manimaran",
        "trailing_party": "AIADMK", "margin": 5420, "margin_pct": 3.2
    },
    "2": {
        "id": "2", "name": "Ponneri", "status": "declared",
        "leading_candidate": "Winner Name", "leading_party": "DMK",
        "leading_alliance": "DMK Alliance", "trailing_candidate": "Loser Name",
        "trailing_party": "AIADMK", "margin": 25000
    }
}
logger.info("MOCK DATA INJECTED FOR TESTING")
```

Restart the backend (`Ctrl+C` then `uvicorn main:app --reload --port 8000`).

Refresh your frontend. You should now see:
- **Dashboard:** "Counting in Progress · 1 of 234 Declared" banner
- **Constituencies:** Status badges showing "Counting" and "Declared"
- **Single constituency:** Vote bars, margins, "Updated Xm ago" timestamps
- **Map:** Constituencies colored by leading alliance

---

## Step 7: Test Docker Build

This verifies Railway will be able to build your app.

```powershell
# You need Docker Desktop installed for this
docker build -t tn-election-api .
```

**Expected result:** Build succeeds with no errors. It will take 3–5 minutes (downloads Playwright image).

If you don't have Docker, skip this step — Railway handles the build for you.

---

## Step 8: Verify Frontend Build

```powershell
npm run build
```

**Expected result:**
```
dist/index.html
dist/assets/index-xxx.js
dist/assets/index-xxx.css
✓ built in 1.xx s
```

No red errors. Yellow warnings about chunk size are normal.

---

## Step 9: Clean Up

After testing:

1. **Remove mock data** from `server/main.py` if you added it
2. **Delete** `.env` file (or keep it for local development)
3. **Stop** local backend (`Ctrl+C` in the terminal)
4. **Commit** your code: `git add . && git commit -m "Add live results backend"`

---

## Test Checklist Summary

| # | Test | How | Expected |
|---|------|-----|----------|
| 1 | Python installs | `pip install -r requirements.txt` | No errors |
| 2 | Backend starts | `uvicorn main:app --reload --port 8000` | Server running on :8000 |
| 3 | API endpoints | Browser → `localhost:8000/health` | JSON response |
| 4 | Frontend loads | `npm run dev` → open browser | No console errors |
| 5 | Live pages render | Navigate all `/live/*` routes | Shows nomination data |
| 6 | Mock data display | Inject mock data → refresh | Shows vote bars, margins, status |
| 7 | Detail cache TTL | View constituency, wait 5 min, refresh | Re-fetches (check backend logs) |
| 8 | Frontend build | `npm run build` | Success, no errors |
| 9 | Docker build | `docker build -t tn-election-api .` | Success (if Docker installed) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `pip` not found | Install Python from python.org, check "Add to PATH" |
| `playwright install chromium` fails | Run `pip install playwright` first |
| Port 8000 already in use | Change port: `uvicorn main:app --port 8001` |
| Frontend can't connect to backend | Check `VITE_API_URL=http://localhost:8000` in `.env` |
| CORS errors in browser | Backend `CORS_ORIGIN` is `*` by default — should work locally |
| Console shows API errors | Expected before mock data — not a bug |

---

## What We Haven't Tested (Election Day Only)

These require actual ECI data and can only be verified on May 4, 2026:

- Scraper discovering the election folder automatically
- Parsing actual ECI HTML table structure
- Handling CAPTCHA
- Parallel fetch of ~12 statewise pages
- Real vote counts and margins
- Performance under high traffic

These are inherently untestable now, but the code is designed to be robust. See `ARCHITECTURE.md` for fallback plans.
