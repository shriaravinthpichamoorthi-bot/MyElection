from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime


class CandidateResult(BaseModel):
    name: str
    party: str
    alliance: Optional[str] = None
    votes: int = 0
    vote_share: float = 0.0
    evm_votes: Optional[int] = None
    postal_votes: Optional[int] = None
    status: str = "awaiting"  # leading, won, trailing, awaiting


class ConstituencySummary(BaseModel):
    id: str
    name: str
    status: str = "awaiting"  # awaiting, counting, declared
    round: Optional[int] = None
    total_rounds: Optional[int] = None
    leading_candidate: Optional[str] = None
    leading_party: Optional[str] = None
    leading_alliance: Optional[str] = None
    leading_votes: Optional[int] = None
    trailing_candidate: Optional[str] = None
    trailing_party: Optional[str] = None
    trailing_votes: Optional[int] = None
    margin: int = 0
    margin_pct: float = 0.0
    total_votes: Optional[int] = None
    total_electors: Optional[int] = None
    turnout: Optional[float] = None


class ConstituencyDetail(ConstituencySummary):
    candidates: List[CandidateResult] = []
    last_updated: Optional[datetime] = None


class LiveMeta(BaseModel):
    last_updated: Optional[datetime] = None
    status: str = "awaiting"
    source: str = "eci.gov.in"
    total_constituencies: int = 0
    declared: int = 0
    counting: int = 0
    awaiting: int = 0


class LiveSummary(BaseModel):
    meta: LiveMeta
    party_tally: Dict[str, int] = {}
    alliance_tally: Dict[str, int] = {}


class LiveConstituenciesResponse(BaseModel):
    meta: LiveMeta
    constituencies: Dict[str, ConstituencySummary] = {}


class ConstituencyDetailResponse(BaseModel):
    constituency: Optional[ConstituencyDetail] = None
