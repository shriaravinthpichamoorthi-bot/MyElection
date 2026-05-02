"""Save a constituency detail page HTML for debugging."""
from playwright.sync_api import sync_playwright
from config import STATE_CODE, ELECTION_FOLDER, ECI_BASE_URL, PAGE_LOAD_DELAY_SECONDS

folder = ELECTION_FOLDER or "ResultAcGenNov2025"
state = STATE_CODE or "S04"
const_no = "195"
url = f"{ECI_BASE_URL}/{folder}/Constituencywise{state}{const_no}.htm"

print(f"Fetching: {url}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=[
        "--no-sandbox", "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled",
    ])
    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        locale="en-IN", timezone_id="Asia/Kolkata",
    )
    context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
    page = context.new_page()

    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=30000)
        print(f"Status: {response.status if response else 'No response'}")
        page.wait_for_timeout(PAGE_LOAD_DELAY_SECONDS * 1000)
        html = page.content()

        with open("detail_sample.html", "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Saved detail_sample.html ({len(html)} chars)")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
