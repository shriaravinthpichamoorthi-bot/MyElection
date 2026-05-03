import os
import sys
from dotenv import load_dotenv

# Load .env file from the same directory as this script
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# ── Environment ──
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# ── ECI Website ──
ECI_BASE_URL = os.getenv("ECI_BASE_URL", "https://results.eci.gov.in")
STATE_CODE = os.getenv("STATE_CODE", "S22")
STATE_NAME = os.getenv("STATE_NAME", "tamil nadu")
TOTAL_CONSTITUENCIES = int(os.getenv("TOTAL_CONSTITUENCIES", "234"))

# Optional: hardcode election folder instead of auto-discovering
# Example: ResultAcGenNov2025 (Bihar), ResultAcGenMay2026 (TN)
ELECTION_FOLDER = os.getenv("ELECTION_FOLDER", "")

# ── Feature Toggles ──
ENABLE_MOCK_DATA = os.getenv("ENABLE_MOCK_DATA", "false").lower() == "true"

if ENABLE_MOCK_DATA and ENVIRONMENT == "production":
    print("ERROR: ENABLE_MOCK_DATA cannot be true when ENVIRONMENT=production", flush=True)
    sys.exit(1)

# ── Scraper Timing ──
# How often the background scraper refreshes summary data from ECI
REFRESH_INTERVAL_MINUTES = int(os.getenv("REFRESH_INTERVAL_MINUTES", "5"))

# How long to wait after page navigation for JavaScript tables to render
PAGE_LOAD_DELAY_SECONDS = int(os.getenv("PAGE_LOAD_DELAY_SECONDS", "3"))

# ── API Settings ──
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
_raw_admin_secret = os.getenv("ADMIN_SECRET", "")
ADMIN_SECRET = _raw_admin_secret if _raw_admin_secret else None

_BANNED_SECRETS = {"secret", "changeme", "dev-secret-change-me", "password", "admin", "test"}
if ENVIRONMENT == "production":
    if not ADMIN_SECRET or len(ADMIN_SECRET) < 32 or ADMIN_SECRET.lower() in _BANNED_SECRETS:
        print("ERROR: ADMIN_SECRET must be at least 32 characters and not a default value in production", flush=True)
        sys.exit(1)

# ── Playwright Settings ──
# Timeout for each page navigation (milliseconds)
BROWSER_TIMEOUT = int(os.getenv("BROWSER_TIMEOUT", "30000"))
# headless=True uses invisible browser (may be blocked by ECI)
# headless=False uses real window via xvfb (recommended)
HEADLESS = os.getenv("HEADLESS", "false").lower() == "true"

# ── Cache Settings ──
# How long a constituency detail page stays cached before re-fetching (seconds)
DETAIL_CACHE_TTL_SECONDS = int(os.getenv("DETAIL_CACHE_TTL", "900"))  # 15 minutes

# ── Concurrency Limits ──
# Max parallel browser tabs for statewise summary scraping
STATEWISE_CONCURRENCY = int(os.getenv("STATEWISE_CONCURRENCY", "15"))
# Max parallel browser tabs for on-demand detail fetching
DETAIL_CONCURRENCY = int(os.getenv("DETAIL_CONCURRENCY", "5"))

# ── Supabase ──
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# ── Startup validation ──
assert 1 <= DETAIL_CONCURRENCY <= 20, f"DETAIL_CONCURRENCY must be 1–20, got {DETAIL_CONCURRENCY}"
assert 1 <= STATEWISE_CONCURRENCY <= 30, f"STATEWISE_CONCURRENCY must be 1–30, got {STATEWISE_CONCURRENCY}"
assert 1 <= REFRESH_INTERVAL_MINUTES <= 60, f"REFRESH_INTERVAL_MINUTES must be 1–60, got {REFRESH_INTERVAL_MINUTES}"
assert 1 <= TOTAL_CONSTITUENCIES <= 600, f"TOTAL_CONSTITUENCIES out of range: {TOTAL_CONSTITUENCIES}"
