import asyncio
import json
import logging
import os
import re
import sys
from difflib import SequenceMatcher
from contextlib import asynccontextmanager

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from datetime import datetime, timezone
import time
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from cachetools import TTLCache
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import (
    ADMIN_SECRET,
    BROWSER_TIMEOUT,
    CORS_ORIGIN,
    DETAIL_CACHE_TTL_SECONDS,
    DETAIL_CONCURRENCY,
    ECI_BASE_URL,
    ELECTION_FOLDER,
    ENABLE_MOCK_DATA,
    HEADLESS,
    PAGE_LOAD_DELAY_SECONDS,
    REFRESH_INTERVAL_MINUTES,
    STATE_CODE,
    STATE_NAME,
    TOTAL_CONSTITUENCIES,
)
from models import (
    ConstituencyDetail,
    ConstituencyDetailResponse,
    ConstituencySummary,
    LiveConstituenciesResponse,
    LiveMeta,
    LiveSummary,
)
from scraper import ECIScraper
from db import SupabaseDB

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# In-memory cache (fast reads)
_cache = {
    "last_updated": None,
    "status": "awaiting",
    "constituencies": {},
    "detail_cache": {},
    "party_tally": {},
    "alliance_tally": {},
    "declared": 0,
    "counting": 0,
    "awaiting": TOTAL_CONSTITUENCIES,
}

_scraper: Optional[ECIScraper] = None
_scheduler: Optional[AsyncIOScheduler] = None
_db: Optional[SupabaseDB] = None
_folder: Optional[str] = None

# ── Concurrency controls ──
_detail_locks: dict = {}
_detail_sem = asyncio.Semaphore(DETAIL_CONCURRENCY)  # Configurable via env
_refresh_lock = asyncio.Lock()      # Prevent parallel refresh calls

# ── Simple in-memory rate limiter ──
# TTLCache auto-evicts entries after 120s, bounding memory usage
_rate_limit_store: TTLCache = TTLCache(maxsize=10_000, ttl=120)
_rate_limit_lock = asyncio.Lock()
_last_admin_refresh: float = 0.0


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _check_rate_limit(client_ip: str, key_prefix: str = "global", limit: int = 120, window: int = 60) -> bool:
    """Return True if request is allowed, False if rate limited."""
    now = time.time()
    key = f"{key_prefix}:{client_ip}"
    async with _rate_limit_lock:
        timestamps = list(_rate_limit_store.get(key, []))
        timestamps = [t for t in timestamps if now - t < window]
        if len(timestamps) >= limit:
            return False
        timestamps.append(now)
        _rate_limit_store[key] = timestamps
    return True


def _norm(name: str) -> str:
    """Strip all non-alphanumeric chars and lowercase for fuzzy comparison."""
    return re.sub(r'[^a-z0-9]', '', name.lower()) if name else ''


def _load_party_to_alliance_map():
    """Build exact and normalized maps from party name/short to alliance name."""
    map_path = os.path.join(os.path.dirname(__file__), "parties_alliances.json")
    if not os.path.exists(map_path):
        return {}, {}
    try:
        with open(map_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return {}, {}
    exact, normalized = {}, {}
    for alliance in data.get("alliances", []):
        alliance_name = alliance.get("name", "")
        for party in alliance.get("parties", []):
            for key in (party.get("name", ""), party.get("short", "")):
                if key:
                    exact[key.lower().strip()] = alliance_name
                    nk = _norm(key)
                    if nk:
                        normalized[nk] = alliance_name
    return exact, normalized


_party_exact_map, _party_norm_map = _load_party_to_alliance_map()


def _alliance_for_party(party: Optional[str]) -> Optional[str]:
    if not party:
        return None
    key = party.lower().strip()
    # Pass 1: exact match
    if key in _party_exact_map:
        return _party_exact_map[key]
    # Pass 2: normalized match — handles punctuation/spacing variations
    # e.g. "CPI (M)" matches "CPI(M)", "D.M.K" matches "DMK"
    nk = _norm(party)
    if nk in _party_norm_map:
        return _party_norm_map[nk]
    # Pass 3: difflib similarity — handles minor spelling differences
    # e.g. "Munnettra" vs "Munnetra", threshold 0.88 avoids false positives
    best_ratio, best_alliance = 0.0, None
    for known, alliance in _party_exact_map.items():
        ratio = SequenceMatcher(None, key, known).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_alliance = alliance
    if best_ratio >= 0.88:
        logger.debug("Fuzzy party match: %r → %r (%.2f)", party, best_alliance, best_ratio)
        return best_alliance
    return None


def _normalize_constituency_alliances(constituencies: dict):
    """Derive leading_alliance from leading_party when missing."""
    for c in constituencies.values():
        if not c.get("leading_alliance") and c.get("leading_party"):
            c["leading_alliance"] = _alliance_for_party(c["leading_party"])


def _hydrate_cache_from_db(meta: Optional[dict], constituencies: dict):
    """Copy DB rows into the in-memory _cache."""
    global _cache
    if meta:
        _cache["status"] = meta.get("status", "awaiting")
        _cache["declared"] = meta.get("declared", 0)
        _cache["counting"] = meta.get("counting", 0)
        _cache["awaiting"] = meta.get("awaiting", TOTAL_CONSTITUENCIES)
        _cache["last_updated"] = meta.get("last_updated")
        _cache["party_tally"] = meta.get("party_tally", {})
        _cache["alliance_tally"] = meta.get("alliance_tally", {})
    _cache["constituencies"] = constituencies
    _normalize_constituency_alliances(_cache["constituencies"])


def _compute_tallies(constituencies: dict) -> tuple:
    party_tally = {}
    alliance_tally = {}
    for c in constituencies.values():
        lp = c.get("leading_party")
        la = c.get("leading_alliance")
        if not la and lp:
            la = _alliance_for_party(lp)
            c["leading_alliance"] = la
        if lp:
            party_tally[lp] = party_tally.get(lp, 0) + 1
        if la:
            alliance_tally[la] = alliance_tally.get(la, 0) + 1
    return party_tally, alliance_tally


async def refresh_data():
    global _scraper, _cache, _db, _folder
    if _scraper is None:
        logger.error("Scraper not initialized")
        return

    async with _refresh_lock:
        try:
            logger.info("Starting data refresh...")
            folder = await _scraper.discover_election(STATE_CODE)
            if not folder:
                logger.warning("Could not discover election folder, skipping refresh")
                return
            _folder = folder

            results = await _scraper.fetch_all_summaries(folder, STATE_CODE)

            constituencies = {}
            for const_id, data in results.items():
                constituencies[const_id] = ConstituencySummary(
                    id=const_id,
                    name=data.get("name", ""),
                    status=data.get("status", "counting"),
                    round=data.get("round"),
                    total_rounds=data.get("total_rounds"),
                    leading_candidate=data.get("leading_candidate"),
                    leading_party=data.get("leading_party"),
                    leading_alliance=data.get("leading_alliance"),
                    leading_votes=data.get("leading_votes"),
                    trailing_candidate=data.get("trailing_candidate"),
                    trailing_party=data.get("trailing_party"),
                    trailing_votes=data.get("trailing_votes"),
                    margin=data.get("margin", 0),
                ).dict()

            _normalize_constituency_alliances(constituencies)
            party_tally, alliance_tally = _compute_tallies(constituencies)
            declared = sum(1 for c in constituencies.values() if c.get("status") == "declared")
            counting = sum(1 for c in constituencies.values() if c.get("status") == "counting")
            awaiting = TOTAL_CONSTITUENCIES - declared - counting

            overall_status = (
                "completed"
                if declared == TOTAL_CONSTITUENCIES
                else ("counting" if declared > 0 or counting > 0 else "awaiting")
            )

            _cache.update({
                "last_updated": datetime.now(timezone.utc),
                "status": overall_status,
                "constituencies": constituencies,
                "party_tally": party_tally,
                "alliance_tally": alliance_tally,
                "declared": declared,
                "counting": counting,
                "awaiting": awaiting,
            })

            # Persist to Supabase so data survives restarts
            if _db:
                try:
                    await _db.save_meta({
                        "status": _cache["status"],
                        "declared": _cache["declared"],
                        "counting": _cache["counting"],
                        "awaiting": _cache["awaiting"],
                        "last_updated": _cache["last_updated"],
                        "party_tally": _cache["party_tally"],
                        "alliance_tally": _cache["alliance_tally"],
                    })
                    await _db.save_constituencies(_cache["constituencies"])
                except Exception:
                    logger.exception("Failed to save results to Supabase")

            logger.info(
                f"Refresh complete: {len(constituencies)} constituencies, "
                f"{declared} declared, {counting} counting, {awaiting} awaiting"
            )
        except Exception:
            logger.exception("Refresh failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scraper, _scheduler, _db

    logger.info("Starting up...")

    # Init Supabase (optional — app works without it for local dev)
    try:
        _db = SupabaseDB()
        meta, constituencies = await _db.load_cache()
        if meta or constituencies:
            _hydrate_cache_from_db(meta, constituencies)
            logger.info(f"Hydrated cache from Supabase: {len(constituencies)} constituencies")
    except Exception:
        logger.info("Supabase not configured or empty — starting with empty cache")
        _db = None

    _scraper = ECIScraper(ECI_BASE_URL)
    await _scraper.start(headless=HEADLESS)

    # Initial refresh
    await refresh_data()

    # Optional mock data for frontend testing (disabled by default)
    if ENABLE_MOCK_DATA:
        from datetime import datetime, timezone

        _cache["status"] = "counting"
        _cache["declared"] = 1
        _cache["counting"] = 1
        _cache["awaiting"] = TOTAL_CONSTITUENCIES - 2
        _cache["last_updated"] = datetime.now(timezone.utc)
        _cache["party_tally"] = {"DMK": 2, "AIADMK": 0}
        _cache["alliance_tally"] = {"DMK Alliance": 2, "AIADMK": 0}
        _cache["constituencies"] = {
            "1": {
                "id": "1",
                "name": "Gummidipoondi",
                "status": "counting",
                "round": 12,
                "total_rounds": 15,
                "leading_candidate": "K. S. Vijayakumar",
                "leading_party": "DMK",
                "leading_alliance": "DMK Alliance",
                "leading_votes": 78000,
                "trailing_candidate": "R. Manimaran",
                "trailing_party": "AIADMK",
                "trailing_votes": 53000,
                "margin": 5420,
            },
            "2": {
                "id": "2",
                "name": "Ponneri",
                "status": "declared",
                "round": 15,
                "total_rounds": 15,
                "leading_candidate": "Winner Name",
                "leading_party": "DMK",
                "leading_alliance": "DMK Alliance",
                "leading_votes": 95000,
                "trailing_candidate": "Loser Name",
                "trailing_party": "AIADMK",
                "trailing_votes": 70000,
                "margin": 25000,
            },
        }
        logger.info("MOCK DATA INJECTED FOR TESTING")

        if _db:
            try:
                await _db.save_meta({
                    "status": _cache["status"],
                    "declared": _cache["declared"],
                    "counting": _cache["counting"],
                    "awaiting": _cache["awaiting"],
                    "last_updated": _cache["last_updated"],
                    "party_tally": _cache["party_tally"],
                    "alliance_tally": _cache["alliance_tally"],
                })
                await _db.save_constituencies(_cache["constituencies"])
            except Exception:
                logger.exception("Failed to save mock data to Supabase")

    # Start scheduler
    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        refresh_data,
        IntervalTrigger(minutes=REFRESH_INTERVAL_MINUTES),
        id="refresh",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"Scheduler started: refresh every {REFRESH_INTERVAL_MINUTES} minutes")

    yield

    # Shutdown
    logger.info("Shutting down...")
    if _scheduler:
        _scheduler.shutdown()
    if _scraper:
        await _scraper.stop()


app = FastAPI(title="Election Live API", lifespan=lifespan)

# CORS — never allow credentials with wildcard
if CORS_ORIGIN and CORS_ORIGIN != "*":
    origins = [o.strip() for o in CORS_ORIGIN.split(",") if o.strip()]
    allow_creds = True
else:
    origins = ["*"]
    allow_creds = False
    logger.warning("CORS_ORIGIN not set — allowing all origins WITHOUT credentials")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.middleware("http")
async def global_rate_limit(request: Request, call_next):
    # /health is exempt — Railway uses it for health checks
    if request.url.path == "/health":
        return await call_next(request)
    client_ip = _get_client_ip(request)
    if not await _check_rate_limit(client_ip, key_prefix="global", limit=120, window=60):
        return JSONResponse({"detail": "Rate limit exceeded — try again later"}, status_code=429)
    return await call_next(request)


@app.get("/health")
async def health():
    last = _cache.get("last_updated")
    age = (datetime.now(timezone.utc) - last).total_seconds() if last else None
    cache_count = len(_cache["constituencies"])
    # Degraded if data is stale or incomplete
    is_degraded = (
        age is not None and age > 600  # > 10 min stale
    ) or (
        cache_count < TOTAL_CONSTITUENCIES * 0.5  # < 50% constituencies
    )
    return {
        "status": "degraded" if is_degraded else "ok",
        "cache_age_seconds": age,
        "cache_count": cache_count,
        "expected_count": TOTAL_CONSTITUENCIES,
        "declared": _cache.get("declared", 0),
        "counting": _cache.get("counting", 0),
    }


@app.get("/results/summary", response_model=LiveSummary)
async def get_summary():
    meta = LiveMeta(
        last_updated=_cache.get("last_updated"),
        status=_cache.get("status", "awaiting"),
        total_constituencies=TOTAL_CONSTITUENCIES,
        declared=_cache.get("declared", 0),
        counting=_cache.get("counting", 0),
        awaiting=_cache.get("awaiting", TOTAL_CONSTITUENCIES),
    )
    return LiveSummary(
        meta=meta,
        party_tally=_cache.get("party_tally", {}),
        alliance_tally=_cache.get("alliance_tally", {}),
    )


@app.get("/results/constituencies", response_model=LiveConstituenciesResponse)
async def get_constituencies():
    meta = LiveMeta(
        last_updated=_cache.get("last_updated"),
        status=_cache.get("status", "awaiting"),
        total_constituencies=TOTAL_CONSTITUENCIES,
        declared=_cache.get("declared", 0),
        counting=_cache.get("counting", 0),
        awaiting=_cache.get("awaiting", TOTAL_CONSTITUENCIES),
    )
    return LiveConstituenciesResponse(
        meta=meta,
        constituencies=_cache.get("constituencies", {}),
    )


@app.get("/results/constituency/{const_id}", response_model=ConstituencyDetailResponse)
async def get_constituency(const_id: str, request: Request):
    # H1: Validate constituency ID
    if not const_id.isdigit():
        raise HTTPException(status_code=400, detail="Invalid constituency ID")

    # Stricter per-detail rate limit (10/min) on top of the global middleware limit
    client_ip = _get_client_ip(request)
    if not await _check_rate_limit(client_ip, key_prefix="detail", limit=10, window=60):
        raise HTTPException(status_code=429, detail="Rate limit exceeded — try again later")

    summary = _cache["constituencies"].get(const_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Constituency not found")

    # Check detail cache with TTL
    cached = _cache["detail_cache"].get(const_id)
    now = time.time()
    if cached:
        age = now - cached["timestamp"]
        if age < DETAIL_CACHE_TTL_SECONDS:
            logger.debug(f"Constituency {const_id}: cache hit ({age:.0f}s old)")
            return ConstituencyDetailResponse(constituency=cached["data"])
        else:
            logger.info(f"Constituency {const_id}: cache expired ({age:.0f}s old), re-fetching")
            del _cache["detail_cache"][const_id]

    # M1: Async lock per constituency ID
    if const_id not in _detail_locks:
        _detail_locks[const_id] = asyncio.Lock()

    async with _detail_locks[const_id]:
        # Double-check cache after acquiring lock
        cached = _cache["detail_cache"].get(const_id)
        if cached:
            return ConstituencyDetailResponse(constituency=cached["data"])

        # Fetch on demand with semaphore
        if _scraper:
            try:
                async with _detail_sem:
                    folder = _folder or await _scraper.discover_election(STATE_CODE)
                    if folder:
                        raw_detail = await _scraper.fetch_constituency_detail(
                            folder, STATE_CODE, const_id
                        )
                        if raw_detail:
                            # H3: Explicit field merge instead of **raw_detail
                            detail_data = {
                                **summary,
                                "candidates": raw_detail.get("candidates", []),
                                "last_updated": datetime.now(timezone.utc),
                            }
                            # Compute leading_votes and trailing_votes from candidates
                            candidates = detail_data.get("candidates", [])
                            if candidates and detail_data.get("leading_votes") is None:
                                detail_data["leading_votes"] = candidates[0].get("votes") if len(candidates) > 0 else None
                            if candidates and detail_data.get("trailing_votes") is None:
                                detail_data["trailing_votes"] = candidates[1].get("votes") if len(candidates) > 1 else None
                            detail = ConstituencyDetail(**detail_data).dict()
                            _cache["detail_cache"][const_id] = {"timestamp": now, "data": detail}
                            if _db:
                                try:
                                    await _db.save_constituency_detail(const_id, detail)
                                except Exception:
                                    logger.exception(f"Failed to save detail for {const_id} to Supabase")
                            return ConstituencyDetailResponse(constituency=detail)
            except Exception:
                logger.exception(f"On-demand detail fetch failed for {const_id}")

    # Return summary-only if detail fetch fails
    summary_with_time = {**summary, "last_updated": _cache.get("last_updated")}
    return ConstituencyDetailResponse(
        constituency=ConstituencyDetail(**summary_with_time).dict()
    )


@app.get("/config")
async def get_config(authorization: Optional[str] = Header(None)):
    if not ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Admin endpoints disabled")
    if authorization != f"Bearer {ADMIN_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {
        "state_code": STATE_CODE,
        "state_name": STATE_NAME,
        "total_constituencies": TOTAL_CONSTITUENCIES,
        "election_folder_env": ELECTION_FOLDER or "(not set — auto-discover)",
        "election_folder_runtime": _folder or "(not yet discovered)",
        "refresh_interval_minutes": REFRESH_INTERVAL_MINUTES,
        "detail_cache_ttl_seconds": DETAIL_CACHE_TTL_SECONDS,
        "page_load_delay_seconds": PAGE_LOAD_DELAY_SECONDS,
        "browser_timeout_ms": BROWSER_TIMEOUT,
    }


@app.post("/admin/refresh")
async def admin_refresh(authorization: Optional[str] = Header(None)):
    global _last_admin_refresh
    if not ADMIN_SECRET:
        raise HTTPException(status_code=503, detail="Admin endpoints disabled")
    if authorization != f"Bearer {ADMIN_SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    # Global cooldown: no more than 1 forced scrape per 2 minutes
    now = time.time()
    if now - _last_admin_refresh < 120:
        remaining = int(120 - (now - _last_admin_refresh))
        raise HTTPException(status_code=429, detail=f"Cooldown active — retry in {remaining}s")
    _last_admin_refresh = now

    await refresh_data()
    return {
        "ok": True,
        "count": len(_cache["constituencies"]),
        "last_updated": _cache["last_updated"],
    }
