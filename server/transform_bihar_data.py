"""Transform Bihar candidate data into frontend-compatible format."""
import json
from collections import defaultdict

# ── Load source data ──
with open("bihar_candidates_2025.json", encoding="utf-8") as f:
    candidates = json.load(f)

with open("parties_alliances.json", encoding="utf-8") as f:
    alliances = json.load(f)

with open("bihar-consti", encoding="utf-8") as f:
    district_constituencies = json.load(f)

# ── Build party → alliance & color maps from explicit definitions ──
party_to_alliance = {}
party_to_color = {}
for alliance in alliances["alliances"]:
    for p in alliance["parties"]:
        # Map by both full name and short code
        party_to_alliance[p["name"]] = alliance["name"]
        party_to_alliance[p["short"]] = alliance["name"]
        party_to_color[p["short"]] = p["color"] or alliance["color"]
        party_to_color[p["name"]] = p["color"] or alliance["color"]

# ── Additional known Bihar party mappings (not in alliances.json) ──
KNOWN_MAPPINGS = {
    # Left / MGB aligned
    "CPI(ML)(L)": "MGB",
    "CPI(ML) Liberation": "MGB",
    "Communist Party of India (Marxist-Leninist) Liberation": "MGB",
    # NDA aligned
    "NCP": "NDA",  # In Bihar 2025, NCP was with NDA
    "Rashtriya Lok Janshakti Party": "NDA",
    "Suheldev Bharatiya Samaj Party": "NDA",
    "Vikassheel Insaan Party": "NDA",
    # Others / Third Front
    "All India Majlis-E-Ittehadul Muslimeen": "Others",
    "All India Majlis-E-Inquilab-E-Millat": "Others",
    "Jan Suraaj Party": "Others",
    "Aam Aadmi Party": "Others",
    "AAP": "Others",
    "Bahujan Samaj Party": "Others",
    "BSP": "Others",
    "Samajwadi Party": "Others",
    # Independents
    "IND": "IND",
    "Independents": "IND",
}

for party, alliance in KNOWN_MAPPINGS.items():
    party_to_alliance.setdefault(party, alliance)

# ── Build uppercase → title-case constituency name map ──
# The candidate data uses UPPERCASE names; ECI API uses Title Case
upper_to_title = {}
for district, consts in district_constituencies.items():
    for c in consts:
        upper_to_title[c.upper()] = c

# Also add candidates' own constituency names (they might differ slightly)
for cand in candidates:
    cname = cand["constituency"]
    upper = cname.upper()
    if upper not in upper_to_title:
        upper_to_title[upper] = cname.title()

# ── Group candidates by normalized constituency ──
constituency_map = defaultdict(list)
unmapped_parties = set()

for cand in candidates:
    raw_const = cand["constituency"]
    normalized_const = upper_to_title.get(raw_const.upper(), raw_const.title())
    party = cand["party"]
    alliance = party_to_alliance.get(party)

    if not alliance:
        unmapped_parties.add(party)
        alliance = "Others"  # Default fallback

    constituency_map[normalized_const].append({
        "name": cand["candidate"],
        "party": party,
        "alliance": alliance,
        "criminal_cases": cand.get("criminal_cases"),
        "education": cand.get("education"),
        "assets": cand.get("assets"),
        "liabilities": cand.get("liabilities"),
    })

# ── Build output in frontend format ──
output = {"constituencies": {}}
for const_name, cands in sorted(constituency_map.items()):
    # Sort by some stable order (party prominence) — keep original order for now
    output["constituencies"][const_name] = cands

# ── Report stats ──
print(f"Total candidates: {len(candidates)}")
print(f"Constituencies: {len(output['constituencies'])}")
print(f"Unmapped parties defaulted to 'Others': {len(unmapped_parties)}")
print()
print("Alliance breakdown:")
alliance_counts = defaultdict(int)
for cands in output["constituencies"].values():
    for c in cands:
        alliance_counts[c["alliance"]] += 1
for a, cnt in sorted(alliance_counts.items(), key=lambda x: -x[1]):
    print(f"  {a}: {cnt} candidates")
print()
print(f"Saved to bihar_candidates_frontend.json")

with open("bihar_candidates_frontend.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)
