import requests
import json
from datetime import datetime, timezone

# Inject mock constituency data
mock_constituencies = {
    "1": {
        "id": "1",
        "name": "Gummidipoondi",
        "status": "counting",
        "round": 12,
        "leading_candidate": "K. S. Vijayakumar",
        "leading_party": "DMK",
        "leading_alliance": "DMK Alliance",
        "trailing_candidate": "R. Manimaran",
        "trailing_party": "AIADMK",
        "margin": 5420,
        "margin_pct": 3.2,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "candidates": [
            {"name": "K. S. Vijayakumar", "party": "DMK", "alliance": "DMK Alliance", "votes": 78000, "vote_share": 53.7, "status": "leading"},
            {"name": "R. Manimaran", "party": "AIADMK", "alliance": "AIADMK", "votes": 53000, "vote_share": 36.5, "status": "trailing"},
            {"name": "Third Candidate", "party": "NTK", "alliance": "NTK", "votes": 12000, "vote_share": 8.2, "status": "trailing"},
        ]
    },
    "2": {
        "id": "2",
        "name": "Ponneri",
        "status": "declared",
        "leading_candidate": "Winner Name",
        "leading_party": "DMK",
        "leading_alliance": "DMK Alliance",
        "trailing_candidate": "Loser Name",
        "trailing_party": "AIADMK",
        "margin": 25000,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "candidates": [
            {"name": "Winner Name", "party": "DMK", "alliance": "DMK Alliance", "votes": 95000, "vote_share": 58.0, "status": "won"},
            {"name": "Loser Name", "party": "AIADMK", "alliance": "AIADMK", "votes": 70000, "vote_share": 42.0, "status": "trailing"},
        ]
    }
}

# This is a simplified mock — for full testing, restart backend with mock data
print("Mock data prepared. Restart backend with --mock flag for full testing.")
```
