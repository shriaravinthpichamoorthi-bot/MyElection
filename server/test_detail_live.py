"""Test constituency detail extraction with a real browser window.

ECI blocks headless requests, so this uses headless=False just like main.py.
Run from the server/ directory:
    python test_detail_live.py
"""
import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from config import STATE_CODE, ELECTION_FOLDER, ECI_BASE_URL, PAGE_LOAD_DELAY_SECONDS, HEADLESS
from scraper import ECIScraper


async def main():
    folder = ELECTION_FOLDER or "ResultAcGenNov2025"
    state = STATE_CODE or "S04"
    const_no = "195"  # AGIAON

    print(f"STATE_CODE: {state}")
    print(f"ELECTION_FOLDER: {folder}")
    print(f"HEADLESS: {HEADLESS}")
    print(f"Testing constituency: {const_no}")
    print("-" * 50)

    scraper = ECIScraper(ECI_BASE_URL)
    await scraper.start(headless=HEADLESS)

    try:
        print("Fetching detail page...")
        detail = await scraper.fetch_constituency_detail(folder, state, const_no)

        if detail:
            candidates = detail.get("candidates", [])
            print(f"SUCCESS: Parsed {len(candidates)} candidates")
            print()
            for c in candidates[:5]:
                status = c.get("status", "trailing")
                print(f"  {c['name']} ({c['party']}): {c['votes']} votes ({c['vote_share']}%) -- {status}")
        else:
            print("FAILED: No detail returned")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        await scraper.stop()


if __name__ == "__main__":
    asyncio.run(main())
