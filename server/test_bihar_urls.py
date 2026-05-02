"""Standalone diagnostic script for Bihar scraping.

Run this to verify URLs and parser behavior without starting FastAPI:
    cd server
    python test_bihar_urls.py
"""
import asyncio
import logging
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from config import STATE_CODE, ELECTION_FOLDER, ECI_BASE_URL, PAGE_LOAD_DELAY_SECONDS

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)


def _clean_name(text):
    if not text:
        return text
    return re.sub(r'^[-–—•·►▸\s*]+', '', text).strip()


def _clean_party(text):
    if not text:
        return text
    text = re.split(r'\s*Party Wise State Trends', text, flags=re.IGNORECASE)[0]
    text = re.sub(r'[\s#►▸•·\-\—]+$', '', text).strip()
    return text


def diagnose():
    folder = ELECTION_FOLDER or "ResultAcGenNov2025"
    state = STATE_CODE or "S04"

    print("=" * 60)
    print("DIAGNOSTIC: Bihar URL Verification")
    print("=" * 60)
    print(f"Config STATE_CODE     : {state}")
    print(f"Config ELECTION_FOLDER: {folder}")
    print()

    summary_url = f"{ECI_BASE_URL}/{folder}/statewise{state}1.htm"
    detail_url = f"{ECI_BASE_URL}/{folder}/Constituencywise{state}195.htm"

    print("URLs the scraper will hit:")
    print(f"  Summary Page 1 : {summary_url}")
    print(f"  Detail (AGIAON): {detail_url}")
    print()

    # Expected correct URLs based on your confirmation
    expected_summary = "https://results.eci.gov.in/ResultAcGenNov2025/statewiseS041.htm"
    expected_detail = "https://results.eci.gov.in/ResultAcGenNov2025/ConstituencywiseS04195.htm"

    if summary_url != expected_summary:
        print(f"⚠️  MISMATCH! Expected: {expected_summary}")
        print(f"   Fix: Set STATE_CODE=S04  (not S041)")
        print()
        return
    else:
        print("✅ Summary URL matches expected")

    if detail_url != expected_detail:
        print(f"⚠️  MISMATCH! Expected: {expected_detail}")
        print(f"   Fix: Set STATE_CODE=S04  (not S041)")
        print()
        return
    else:
        print("✅ Detail URL matches expected")

    print()
    print("=" * 60)
    print("LIVE SCRAPE TEST (Page 1)")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-blink-features=AutomationControlled",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            locale="en-IN",
            timezone_id="Asia/Kolkata",
        )
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """)
        page = context.new_page()

        try:
            print(f"Navigating: {summary_url}")
            response = page.goto(summary_url, wait_until="domcontentloaded", timeout=30000)
            print(f"HTTP Status: {response.status if response else 'No response'}")

            if response and response.status >= 400:
                print("❌ ECI returned an error. Possible causes:")
                print("   - IP blocking (403)")
                print("   - Wrong URL (404)")
                return

            page.wait_for_timeout(PAGE_LOAD_DELAY_SECONDS * 1000)
            html = page.content()
            print(f"HTML length: {len(html)} chars")

            # Check for access denied
            if "Access Denied" in html or "access denied" in html.lower():
                print("❌ ECI returned ACCESS DENIED — Playwright is being blocked")
                return

            soup = BeautifulSoup(html, "html.parser")
            tables = soup.find_all("table")
            print(f"Tables found: {len(tables)}")

            results = []
            for table in tables:
                rows = table.find_all("tr")
                if len(rows) < 2:
                    continue

                header_cells = rows[0].find_all(["th", "td"])
                headers = [h.get_text(strip=True).lower() for h in header_cells]
                header_text = " ".join(headers)

                if "constituency" not in header_text:
                    continue

                print(f"\n✅ Found results table!")
                print(f"   Headers: {headers}")
                print(f"   Data rows: {len(rows) - 1}")

                for row in rows[1:5]:  # Just first 4 rows for demo
                    cells = row.find_all(["td", "th"])
                    texts = [c.get_text(strip=True) for c in cells]
                    if len(texts) >= 3:
                        name = _clean_name(texts[1] if len(texts) > 1 else "")
                        leading = _clean_name(texts[2] if len(texts) > 2 else "")
                        party = _clean_party(texts[3] if len(texts) > 3 else "")
                        print(f"   → {name} | Leading: {leading} | Party: {party}")
                        results.append({"name": name, "leading": leading, "party": party})

            print(f"\n📊 Parsed {len(results)} sample rows from page 1")

            # Pagination check
            page_text = soup.get_text()
            match = re.search(r"Page\s+\d+\s+of\s+(\d+)", page_text, re.IGNORECASE)
            if match:
                print(f"📄 Pagination detected: {match.group(1)} total pages")
            else:
                links = soup.find_all("a", href=re.compile(r"statewise\w+\d+\.htm"))
                nums = []
                for link in links:
                    m = re.search(r"statewise\w+(\d+)\.htm", link.get("href", ""))
                    if m:
                        nums.append(int(m.group(1)))
                if nums:
                    print(f"📄 Page links found up to: {max(nums)}")
                else:
                    print("⚠️  No pagination detected — might be a single page or parser needs adjustment")

        except Exception as e:
            print(f"❌ Error during scrape: {e}")
        finally:
            browser.close()


if __name__ == "__main__":
    diagnose()
