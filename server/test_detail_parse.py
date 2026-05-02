"""Test detail parser on saved Bihar HTML."""
import re
from bs4 import BeautifulSoup

with open("../constituency.html", "r", encoding="utf-8") as f:
    html = f.read()

def _clean_name(text):
    if not text:
        return text
    return re.sub(r'^[-–—•·►▸\s*]+', '', text).strip()

candidates = []
soup = BeautifulSoup(html, "html.parser")

for table in soup.find_all("table"):
    rows = table.find_all("tr")  # recursive=True needed for <thead>/<tbody>
    if len(rows) < 2:
        continue

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
        if row.find_parent("tfoot"):
            continue
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) < 3:
            continue

        texts = [c.get_text(strip=True) for c in cells]
        cand = {"name": "", "party": "", "votes": 0, "vote_share": 0.0,
                "evm_votes": None, "postal_votes": None, "status": "trailing"}
        for i, text in enumerate(texts):
            h = headers[i] if i < len(headers) else ""
            if "candidate" in h:
                cand["name"] = _clean_name(text)
            elif "party" in h:
                cand["party"] = text
            elif "evm" in h:
                try:
                    cand["evm_votes"] = int(text.replace(",", ""))
                except ValueError:
                    pass
            elif "postal" in h:
                try:
                    cand["postal_votes"] = int(text.replace(",", ""))
                except ValueError:
                    pass
            elif "total" in h and "votes" in h:
                try:
                    cand["votes"] = int(text.replace(",", ""))
                except ValueError:
                    pass
            elif "%" in h or "percent" in h or "vote %" in h:
                try:
                    cand["vote_share"] = float(text.replace("%", ""))
                except ValueError:
                    pass

        if cand["name"] and cand["name"].lower() != "total":
            candidates.append(cand)

candidates.sort(key=lambda x: x["votes"], reverse=True)
if candidates:
    candidates[0]["status"] = "leading"

print(f"Parsed {len(candidates)} candidates:")
for c in candidates:
    share = f"{c['vote_share']}"
    print(f"  {c['name']} ({c['party']}): {c['votes']} votes ({share}%) - {c['status']}")
