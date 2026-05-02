import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from supabase import create_client

from config import SUPABASE_URL, SUPABASE_KEY, TOTAL_CONSTITUENCIES

logger = logging.getLogger(__name__)


def _serialize_for_json(obj: Any) -> Any:
    """Recursively convert datetime objects to ISO strings for JSON serialization."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k: _serialize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_for_json(v) for v in obj]
    return obj


# Columns known to exist in the live_constituencies table.
# If your Supabase table is missing any of these, run the migration in
# supabase/migrations/001_add_live_columns.sql
_SAFE_CONSTITUENCY_COLUMNS = {
    "id",
    "name",
    "status",
    "round",
    "total_rounds",
    "leading_candidate",
    "leading_party",
    "leading_alliance",
    "leading_votes",
    "trailing_candidate",
    "trailing_party",
    "trailing_votes",
    "margin",
    "margin_pct",
    "total_votes",
    "total_electors",
    "turnout",
    "candidates",
}


class SupabaseDB:
    """Persists live results to Supabase (PostgreSQL).

    The backend keeps an in-memory cache for fast API reads.
    This class is used to:
      1. Hydrate the cache on startup (so data survives restarts)
      2. Save scraped results after every refresh
    """

    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY env vars are required. "
                "Set them in your .env file or Railway variables."
            )
        self.client = create_client(SUPABASE_URL, SUPABASE_KEY)

    def _filter_row(self, row: dict) -> dict:
        """Strip unknown columns so upsert never fails on schema mismatch."""
        return {k: v for k, v in row.items() if k in _SAFE_CONSTITUENCY_COLUMNS or k == "id"}

    # ── synchronous helpers (run in thread pool) ──

    def _load_meta_sync(self) -> Optional[dict]:
        resp = self.client.table("live_meta").select("*").limit(1).execute()
        return resp.data[0] if resp.data else None

    def _load_constituencies_sync(self) -> Dict[str, dict]:
        resp = self.client.table("live_constituencies").select("*").execute()
        return {row["id"]: row for row in resp.data} if resp.data else {}

    def _save_meta_sync(self, meta: dict):
        payload = _serialize_for_json({
            "id": 1,
            "status": meta.get("status", "awaiting"),
            "declared": meta.get("declared", 0),
            "counting": meta.get("counting", 0),
            "awaiting": meta.get("awaiting", TOTAL_CONSTITUENCIES),
            "last_updated": meta.get("last_updated"),
            "party_tally": meta.get("party_tally", {}),
            "alliance_tally": meta.get("alliance_tally", {}),
        })
        self.client.table("live_meta").upsert(payload).execute()

    def _save_constituencies_sync(self, constituencies: Dict[str, dict]):
        rows = []
        for cid, c in constituencies.items():
            row = dict(c)
            row["id"] = cid
            # Ensure jsonb columns are dicts/lists, not model instances
            if hasattr(row.get("candidates"), "dict"):
                row["candidates"] = row["candidates"].dict()
            rows.append(_serialize_for_json(self._filter_row(row)))
        if rows:
            self.client.table("live_constituencies").upsert(rows).execute()

    def _save_detail_sync(self, const_id: str, detail: dict):
        row = dict(detail)
        row["id"] = const_id
        if hasattr(row.get("candidates"), "dict"):
            row["candidates"] = row["candidates"].dict()
        self.client.table("live_constituencies").upsert(_serialize_for_json(self._filter_row(row))).execute()

    # ── public async API ──

    async def load_cache(self) -> Tuple[Optional[dict], Dict[str, dict]]:
        """Return (meta_dict, constituencies_dict) from Supabase."""

        def _load():
            meta = self._load_meta_sync()
            constituencies = self._load_constituencies_sync()
            return meta, constituencies

        return await asyncio.to_thread(_load)

    async def save_meta(self, meta: dict):
        def _save():
            self._save_meta_sync(meta)
            logger.info("Saved live_meta to Supabase")

        await asyncio.to_thread(_save)

    async def save_constituencies(self, constituencies: Dict[str, dict]):
        def _save():
            self._save_constituencies_sync(constituencies)
            logger.info(f"Saved {len(constituencies)} constituencies to Supabase")

        await asyncio.to_thread(_save)

    async def save_constituency_detail(self, const_id: str, detail: dict):
        def _save():
            self._save_detail_sync(const_id, detail)
            logger.info(f"Saved detail for constituency {const_id} to Supabase")

        await asyncio.to_thread(_save)
