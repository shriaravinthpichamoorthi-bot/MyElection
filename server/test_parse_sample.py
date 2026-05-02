from bs4 import BeautifulSoup
import re

with open("sample.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
tables = soup.find_all("table")
print(f"Found {len(tables)} tables total")

results = []
for idx, table in enumerate(tables):
    rows = [r for r in table.find_all("tr") if r.find_parent("table") == table]
    if len(rows) < 2:
        continue

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

    print(f"Table {idx}: Header row {best_idx} - {headers}")

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
        elif "trailing" in h and "candidate" in h:
            col_map["trailing_candidate"] = i
        elif "trailing" in h and "party" in h:
            col_map["trailing_party"] = i
        elif "margin" in h:
            col_map["margin"] = i
        elif "status" in h:
            col_map["status"] = i
        elif "round" in h:
            col_map["round"] = i

    print(f"  Column map: {col_map}")

    for row in rows[best_idx + 1:]:
        cells = row.find_all(["td", "th"], recursive=False)
        if len(cells) < 3:
            continue

        texts = [c.get_text(strip=True) for c in cells]
        result = {
            "id": "", "name": "", "status": "counting",
            "leading_candidate": None, "leading_party": None,
            "trailing_candidate": None, "trailing_party": None,
            "margin": 0, "round": None, "total_rounds": None,
        }

        if "id" in col_map and col_map["id"] < len(texts):
            result["id"] = texts[col_map["id"]]
        if "name" in col_map and col_map["name"] < len(texts):
            result["name"] = texts[col_map["name"]]
        if "leading_candidate" in col_map and col_map["leading_candidate"] < len(texts):
            result["leading_candidate"] = texts[col_map["leading_candidate"]]
        if "leading_party" in col_map and col_map["leading_party"] < len(texts):
            result["leading_party"] = texts[col_map["leading_party"]]
        if "trailing_candidate" in col_map and col_map["trailing_candidate"] < len(texts):
            result["trailing_candidate"] = texts[col_map["trailing_candidate"]]
        if "trailing_party" in col_map and col_map["trailing_party"] < len(texts):
            result["trailing_party"] = texts[col_map["trailing_party"]]
        if "margin" in col_map and col_map["margin"] < len(texts):
            try:
                result["margin"] = int(texts[col_map["margin"]].replace(",", ""))
            except ValueError:
                pass
        if "status" in col_map and col_map["status"] < len(texts):
            result["status"] = texts[col_map["status"]].lower()
        if "round" in col_map and col_map["round"] < len(texts):
            round_text = texts[col_map["round"]]
            m = re.search(r"(\d+)\s*[/of]+\s*(\d+)", round_text, re.IGNORECASE)
            if m:
                result["round"] = int(m.group(1))
                result["total_rounds"] = int(m.group(2))

        if not result["name"]:
            if len(texts) > 1:
                result["name"] = texts[1]
        if not result["id"]:
            if texts[0].isdigit():
                result["id"] = texts[0]

        if result["name"]:
            results.append(result)

    print(f"  Parsed {len(results)} total rows from this table")

print(f"FINAL: {len(results)} constituency rows parsed")
for r in results[:5]:
    print(f"  {r['name']} (#{r['id']}): {r['leading_candidate']} ({r['leading_party']}) vs {r['trailing_candidate']} ({r['trailing_party']}) - margin {r['margin']}, {r['status']}")
if len(results) > 5:
    print(f"  ... and {len(results) - 5} more")
