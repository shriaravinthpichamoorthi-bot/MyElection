import asyncio
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from functools import partial
from typing import Dict, List, Optional
from dotenv import load_dotenv

from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from config import PAGE_LOAD_DELAY_SECONDS, STATE_NAME, TOTAL_CONSTITUENCIES, ELECTION_FOLDER, STATEWISE_CONCURRENCY

# Concurrency limit for statewise page fetching (configurable via env)
_STATEWISE_SEM = asyncio.Semaphore(STATEWISE_CONCURRENCY)

logger = logging.getLogger(__name__)
load_dotenv()


def _clean_name(text):
    if not text:
        return text
    text = re.sub(r'<[^>]+>', '', text)  # strip HTML tags
    return re.sub(r'^[-–—•·►▸\s*]+', '', text).strip()


def _clean_party(text):
    """Extract clean party name from cells that contain nested trend tables.

    Some ECI state pages (e.g., Bihar) embed 'Party Wise State Trends'
    inside the party cell. This strips that noise.
    """
    if not text:
        return text
    text = re.sub(r'<[^>]+>', '', text)  # strip HTML tags
    # Split on the nested trend heading and keep only the party name
    text = re.split(r'\s*Party Wise State Trends', text, flags=re.IGNORECASE)[0]
    # Strip trailing non-word chars (icons, separators) but keep ) for abbreviations
    text = re.sub(r'[^\w)]+$', '', text).strip()
    # The tooltip icon text 'i' sometimes attaches directly to the party name
    # e.g., "Bharatiya Janata Partyi" or "Janata Dal (United)i"
    text = re.sub(r'i$', '', text).strip()
    return text


class ECIScraper:
    """Scrapes ECI results website using a real browser."""

    def __init__(self, base_url: str = "https://results.eci.gov.in"):
        self.base_url = base_url
        self.browser = None
        self.context = None
        self.playwright = None
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="pw")

    async def _call(self, fn, *args, **kwargs):
        """Run a sync function inside the dedicated Playwright thread."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, partial(fn, *args, **kwargs))

    async def start(self, headless: bool = False):
        logger.info(f"Starting browser (headless={headless})")

        def _start():
            pw = sync_playwright().start()
            browser = pw.chromium.launch(
                headless=headless,
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
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined
                });
            """)
            return pw, browser, context

        self.playwright, self.browser, self.context = await self._call(_start)

    async def stop(self):
        def _stop():
            if self.context:
                self.context.close()
            if self.browser:
                self.browser.close()
            if self.playwright:
                self.playwright.stop()
            logger.info("Browser stopped")

        if self.playwright:
            await self._call(_stop)

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._executor.shutdown)
        self.playwright = None
        self.browser = None
        self.context = None

    async def discover_election(self, state_code: str = "S00") -> Optional[str]:
        """Find the active election folder name from the ECI homepage."""
        # If a folder is hardcoded in config, use it directly
        if ELECTION_FOLDER:
            logger.info(f"Using configured election folder: {ELECTION_FOLDER}")
            return ELECTION_FOLDER

        page = await self._call(self.context.new_page)
        try:
            logger.info(f"Navigating to {self.base_url}")
            await self._call(
                page.goto, self.base_url, wait_until="domcontentloaded", timeout=30000
            )
            await asyncio.sleep(PAGE_LOAD_DELAY_SECONDS)

            content = await self._call(page.content)
            soup = BeautifulSoup(content, "html.parser")

            # Strategy 1: Look for state-specific assembly links
            for link in soup.find_all("a", href=True):
                href = link.get("href", "")
                text = link.get_text(strip=True).lower()
                if STATE_NAME in text and "assembly" in text:
                    parts = href.strip("/").split("/")
                    if parts:
                        folder = parts[0]
                        logger.info(f"Discovered folder (state link): {folder}")
                        return folder

            # Strategy 2: Look for any ResultAcGen link
            for link in soup.find_all("a", href=True):
                href = link.get("href", "")
                if "ResultAcGen" in href:
                    parts = href.strip("/").split("/")
                    if parts:
                        folder = parts[0]
                        logger.info(f"Discovered folder (fallback): {folder}")
                        return folder

            # Strategy 3: Search page text for folder names
            text = soup.get_text()
            matches = re.findall(r"(ResultAcGen\w+)", text)
            if matches:
                folder = matches[0]
                logger.info(f"Discovered folder (text search): {folder}")
                return folder

            logger.warning("Could not auto-discover election folder")
            return None
        finally:
            await self._call(page.close)

    async def fetch_statewise_page(self, folder: str, state_code: str, page_num: int) -> str:
        url = f"{self.base_url}/{folder}/statewise{state_code}{page_num}.htm"
        page = await self._call(self.context.new_page)
        try:
            logger.info(f"Fetching statewise page {page_num}: {url}")
            response = await self._call(
                page.goto, url, wait_until="domcontentloaded", timeout=30000
            )
            if response and response.status >= 400:
                logger.warning(f"HTTP {response.status} for {url}")
                return ""
            await asyncio.sleep(PAGE_LOAD_DELAY_SECONDS)
            html = await self._call(page.content)

            # ECI sometimes returns 200 with an Access Denied page (Akamai/EdgeSuite)
            if "Access Denied" in html or "access denied" in html.lower():
                logger.warning(f"ECI returned Access Denied for {url}")
                return ""

            return html
        except Exception as e:
            logger.error(f"Error fetching page {page_num}: {e}")
            return ""
        finally:
            await self._call(page.close)

    def parse_statewise_page(self, html: str, page_num: int) -> List[Dict]:
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        results = []

        tables = soup.find_all("table")
        logger.info(f"Page {page_num}: found {len(tables)} tables")

        found_results_table = False
        for table in tables:
            # Only use top-level rows (ignore rows from nested tooltip tables)
            rows = [r for r in table.find_all("tr") if r.find_parent("table") == table]
            if len(rows) < 2:
                continue

            # Some ECI pages (e.g., Bihar) have a title row before the actual
            # column headers. Find the row with the most direct cells — header.
            best_idx = -1
            best_cells = []
            for i, row in enumerate(rows):
                cells = row.find_all(["th", "td"], recursive=False)
                if len(cells) >= 6 and len(cells) > len(best_cells):
                    best_idx = i
                    best_cells = cells

            if best_idx == -1:
                continue

            headers = [h.get_text(strip=True).lower() for h in best_cells]
            header_text = " ".join(headers)
            if "constituency" not in header_text:
                continue

            found_results_table = True
            logger.info(f"Page {page_num} table headers: {headers}")

            # Build column index map
            col_map = {}
            for i, h in enumerate(headers):
                if ("constituency" in h or "const." in h) and "no" in h.replace(" ", ""):
                    col_map["id"] = i
                elif "constituency" in h or h == "constituency":
                    col_map["name"] = i
                elif ("leading" in h or "winning" in h) and "candidate" in h:
                    col_map["leading_candidate"] = i
                elif ("leading" in h or "winning" in h) and "party" in h:
                    col_map["leading_party"] = i
                elif ("leading" in h or "winning" in h) and "votes" in h:
                    col_map["leading_votes"] = i
                elif "trailing" in h and "candidate" in h:
                    col_map["trailing_candidate"] = i
                elif "trailing" in h and "party" in h:
                    col_map["trailing_party"] = i
                elif "trailing" in h and "votes" in h:
                    col_map["trailing_votes"] = i
                elif "margin" in h:
                    col_map["margin"] = i
                elif "status" in h:
                    col_map["status"] = i
                elif "round" in h:
                    col_map["round"] = i

            # Parse data rows (skip rows up to and including the header)
            for row in rows[best_idx + 1:]:
                cells = row.find_all(["td", "th"], recursive=False)
                if len(cells) < 3:
                    continue

                texts = [c.get_text(strip=True) for c in cells]
                result = {
                    "id": "",
                    "name": "",
                    "status": "counting",
                    "leading_candidate": None,
                    "leading_party": None,
                    "leading_votes": None,
                    "trailing_candidate": None,
                    "trailing_party": None,
                    "trailing_votes": None,
                    "margin": 0,
                    "round": None,
                    "total_rounds": None,
                }

                # Extract by mapped columns
                if "id" in col_map and col_map["id"] < len(texts):
                    result["id"] = texts[col_map["id"]]
                if "name" in col_map and col_map["name"] < len(texts):
                    result["name"] = texts[col_map["name"]]
                if "leading_candidate" in col_map and col_map["leading_candidate"] < len(texts):
                    result["leading_candidate"] = _clean_name(texts[col_map["leading_candidate"]])
                if "leading_party" in col_map and col_map["leading_party"] < len(texts):
                    result["leading_party"] = _clean_party(texts[col_map["leading_party"]])
                if "leading_votes" in col_map and col_map["leading_votes"] < len(texts):
                    try:
                        result["leading_votes"] = int(texts[col_map["leading_votes"]].replace(",", ""))
                    except ValueError:
                        pass
                if "trailing_candidate" in col_map and col_map["trailing_candidate"] < len(texts):
                    result["trailing_candidate"] = _clean_name(texts[col_map["trailing_candidate"]])
                if "trailing_party" in col_map and col_map["trailing_party"] < len(texts):
                    result["trailing_party"] = _clean_party(texts[col_map["trailing_party"]])
                if "trailing_votes" in col_map and col_map["trailing_votes"] < len(texts):
                    try:
                        result["trailing_votes"] = int(texts[col_map["trailing_votes"]].replace(",", ""))
                    except ValueError:
                        pass
                if "margin" in col_map and col_map["margin"] < len(texts):
                    try:
                        result["margin"] = int(texts[col_map["margin"]].replace(",", ""))
                    except ValueError:
                        pass
                if "status" in col_map and col_map["status"] < len(texts):
                    status_raw = texts[col_map["status"]].lower().strip()
                    # Normalize ECI status strings — use substring checks to handle
                    # variations like "Counting Completed", "Result Declared", etc.
                    if "declared" in status_raw or "completed" in status_raw:
                        result["status"] = "declared"
                    elif "counting" in status_raw or "progress" in status_raw:
                        result["status"] = "counting"
                    elif "awaiting" in status_raw:
                        result["status"] = "awaiting"
                    else:
                        result["status"] = status_raw
                if "round" in col_map and col_map["round"] < len(texts):
                    try:
                        result["round"] = int(texts[col_map["round"]])
                    except ValueError:
                        pass
                # Try to extract total rounds from round text like "12 / 15" or "12 of 15"
                if "round" in col_map and col_map["round"] < len(texts):
                    round_text = texts[col_map["round"]]
                    m = re.search(r'(\d+)\s*[/of]+\s*(\d+)', round_text, re.IGNORECASE)
                    if m:
                        try:
                            result["round"] = int(m.group(1))
                            result["total_rounds"] = int(m.group(2))
                        except ValueError:
                            pass

                # Fallback positional extraction if headers weren't clear
                if not result["name"]:
                    # Usually column 1 is name
                    if len(texts) > 1:
                        result["name"] = _clean_name(texts[1])
                if not result["id"]:
                    if texts[0].isdigit():
                        result["id"] = texts[0]

                if result["name"]:
                    results.append(result)

        if not found_results_table:
            logger.warning(f"Page {page_num}: No constituency results table found in HTML")
        logger.info(f"Page {page_num}: parsed {len(results)} constituencies")
        return results

    async def fetch_all_summaries(self, folder: str, state_code: str) -> Dict[str, Dict]:
        html1 = await self.fetch_statewise_page(folder, state_code, 1)
        if not html1:
            logger.error("Failed to fetch statewise page 1")
            return {}

        results = {}
        for r in self.parse_statewise_page(html1, 1):
            results[r["id"]] = r

        # Discover total pages
        soup = BeautifulSoup(html1, "html.parser")
        total_pages = 1

        # Look for "Page 1 of 12" text
        page_text = soup.get_text()
        match = re.search(r"Page\s+\d+\s+of\s+(\d+)", page_text, re.IGNORECASE)
        if match:
            total_pages = int(match.group(1))
            logger.info(f"Pagination detected: {total_pages} pages")
        else:
            # Look for page number links
            page_links = soup.find_all("a", href=re.compile(rf"statewise{re.escape(state_code)}\d+\.htm"))
            nums = []
            for link in page_links:
                href = link.get("href", "")
                m = re.search(rf"statewise{re.escape(state_code)}(\d+)\.htm", href)
                if m:
                    nums.append(int(m.group(1)))
            if nums:
                total_pages = max(nums)
                logger.info(f"Found page links up to {total_pages}")

        if total_pages > 1:
            async def _fetch_with_sem(p):
                async with _STATEWISE_SEM:
                    return await self.fetch_statewise_page(folder, state_code, p)

            tasks = [
                _fetch_with_sem(p)
                for p in range(2, total_pages + 1)
            ]
            pages_html = await asyncio.gather(*tasks)

            for i, html in enumerate(pages_html):
                page_num = i + 2
                for r in self.parse_statewise_page(html, page_num):
                    results[r["id"]] = r

        logger.info(f"Total constituencies from all pages: {len(results)}")
        return results

    async def fetch_constituency_detail(self, folder: str, state_code: str, const_no: str) -> Optional[Dict]:
        url = f"{self.base_url}/{folder}/Constituencywise{state_code}{const_no}.htm"
        page = await self._call(self.context.new_page)
        try:
            logger.info(f"Fetching constituency detail: {url}")
            await self._call(
                page.goto, url, wait_until="domcontentloaded", timeout=30000
            )
            await asyncio.sleep(PAGE_LOAD_DELAY_SECONDS)
            content = await self._call(page.content)

            soup = BeautifulSoup(content, "html.parser")
            candidates = []
            tables = soup.find_all("table")

            for table in tables:
                # Use recursive=True for rows because <tr> lives inside <thead>/<tbody>/<tfoot>
                rows = table.find_all("tr")
                if len(rows) < 2:
                    continue

                # Find header row: first row with at least 4 direct th/td cells
                header_idx = -1
                headers = []
                for idx, row in enumerate(rows):
                    cells = row.find_all(["th", "td"], recursive=False)
                    if len(cells) >= 4:
                        header_idx = idx
                        headers = [h.get_text(strip=True).lower() for h in cells]
                        break
                if header_idx == -1:
                    continue

                header_text = " ".join(headers)
                if "candidate" not in header_text and "votes" not in header_text:
                    continue

                for row in rows[header_idx + 1:]:
                    # Skip total/summary rows in <tfoot>
                    if row.find_parent("tfoot"):
                        continue
                    cells = row.find_all(["td", "th"], recursive=False)
                    if len(cells) < 3:
                        continue

                    texts = [c.get_text(strip=True) for c in cells]
                    candidate = {
                        "name": "",
                        "party": "",
                        "votes": 0,
                        "vote_share": 0.0,
                        "evm_votes": None,
                        "postal_votes": None,
                        "status": "trailing",
                    }

                    for i, text in enumerate(texts):
                        h = headers[i] if i < len(headers) else ""
                        if "candidate" in h:
                            candidate["name"] = _clean_name(text)
                        elif "party" in h:
                            candidate["party"] = text
                        elif "evm" in h:
                            try:
                                candidate["evm_votes"] = int(text.replace(",", ""))
                            except ValueError:
                                pass
                        elif "postal" in h:
                            try:
                                candidate["postal_votes"] = int(text.replace(",", ""))
                            except ValueError:
                                pass
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

                    if candidate["name"] and candidate["name"].lower() != "total":
                        candidates.append(candidate)

            # Sort and mark leader
            candidates.sort(key=lambda x: x["votes"], reverse=True)
            if candidates:
                candidates[0]["status"] = "leading"
                # Mark winner if constituency is declared
                # (This will be handled by the caller based on summary status)

            return {"candidates": candidates}
        except Exception as e:
            logger.exception(f"Error fetching detail for {const_no}: {e}")
            return None
        finally:
            await self._call(page.close)
