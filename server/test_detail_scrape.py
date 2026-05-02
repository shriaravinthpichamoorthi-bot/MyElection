"""Test detail page scraping for a single Bihar constituency."""
import asyncio
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from config import STATE_CODE, ELECTION_FOLDER, ECI_BASE_URL, PAGE_LOAD_DELAY_SECONDS


def _clean_name(text):
    if not text:
        return text
    return re.sub(r'^[-–—•·►▸\s*]+', '', text).strip()


def parse_detail(html: str):
    soup = BeautifulSoup(html, "html.parser")
    candidates = []
    tables = soup.find_all("table")
    print(f"Found {len(tables)} tables")

    for table in tables:
        # Only use top-level rows (ignore nested table rows)
        rows = [r for r in table.find_all("tr") if r.find_parent("table") == table]
        if len(rows) < 2:
            continue

        # Find header row
        header_row = None
        for row in rows:
            cells = row.find_all(["th", "td"], recursive=False)
            if len(cells) >= 4:
                header_row = row
                break

        if not header_row:
            continue

        headers = [h.get_text(strip=True).lower() for h in header_row.find_all(["th", "td"], recursive=False)]
        header_text = " ".join(headers)

        if "candidate" not in header_text and "votes" not in header_text:
            continue

        print(f"Detail table headers: {headers}")
        header_idx = rows.index(header_row)

        for row in rows[header_idx + 1:]:
            cells = row.find_all(["td", "th"], recursive=False)
            if len(cells) < 3:
                continue

            texts = [c.get_text(strip=True) for c in cells]
            candidate = {
                "name": "",
                "party": "",
                "votes": 0,
                "vote_share": 0.0,
                "status": "trailing",
            }

            for i, text in enumerate(texts):
                h = headers[i] if i < len(headers) else ""
                if "candidate" in h and "name" in h:
                    candidate["name"] = _clean_name(text)
                elif "party" in h:
                    candidate["party"] = text
                elif "total" in h and "votes" in h:
                    try:
                        candidate["votes"] = int(text.replace(",", ""))
                    except ValueError:
                        pass
                elif "%" in h or "percent" in h or "vote %" in h:
                    try:
                        candidate["vote_share"] = float(text.replace("%", ""))
                    except ValueError:
                        pass

            if candidate["name"]:
                candidates.append(candidate)

    candidates.sort(key=lambda x: x["votes"], reverse=True)
    if candidates:
        candidates[0]["status"] = "leading"

    return {"candidates": candidates}


def main():
    folder = ELECTION_FOLDER or "ResultAcGenNov2025"
    state = STATE_CODE or "S04"
    const_no = "195"  # AGIAON
    url = f"{ECI_BASE_URL}/{folder}/Constituencywise{state}{const_no}.htm"

    print(f"Fetching detail: {url}")

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
            response = page.goto(url, wait_until="domcontentloaded", timeout=30000)
            print(f"HTTP Status: {response.status if response else 'No response'}")
            page.wait_for_timeout(PAGE_LOAD_DELAY_SECONDS * 1000)
            html = page.content()
            print(f"HTML length: {len(html)} chars")

            if "Access Denied" in html or "access denied" in html.lower():
                print("❌ ECI returned Access Denied")
                return

            result = parse_detail(html)
            print(f"\n✅ Parsed {len(result['candidates'])} candidates")
            for c in result["candidates"][:5]:
                print(f"  {c['name']} ({c['party']}): {c['votes']} votes ({c['vote_share']}%) — {c['status']}")
        except Exception as e:
            print(f"❌ Error: {e}")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
