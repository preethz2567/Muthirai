from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Any

router = APIRouter()


class ScoreRequest(BaseModel):
    candidates: List[Any]
    query: str


class ScoreResponse(BaseModel):
    scores: List[float]


@router.post("/score", response_model=ScoreResponse)
async def score_candidates(payload: ScoreRequest):
    """
    Score a list of candidates against a query.
    Replace the stub with real ranking / scoring logic.
    """
    # Stub — returns uniform scores
    scores = [1.0 / (i + 1) for i in range(len(payload.candidates))]
    return ScoreResponse(scores=scores)
