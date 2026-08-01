"""
scoring/__init__.py
───────────────────
FastAPI router for the /scoring prefix.

Exposes one endpoint:
    POST /scoring/score — runs the full two-axis scoring pipeline (TRD §6)

This replaces the previous stub implementation.  The engine is imported lazily
inside the endpoint handler so the model only loads once (module-level singleton
in embedder.py) and FastAPI startup remains fast.
"""
from __future__ import annotations

from typing import Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


# ── Request / response models ──────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    content_text: str = Field(
        description="The text content to be scored."
    )
    brand_corpus: List[str] = Field(
        description=(
            "One or more text strings representing the brand's historical content. "
            "Used to build the brand centroid (TRD §6 step 1)."
        )
    )
    generic_corpus: List[str] = Field(
        description=(
            "One or more text strings representing generic / category content. "
            "Used to build the generic centroid (TRD §6 step 2)."
        )
    )
    threshold: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Quadrant classification threshold (default 0.5).",
    )


class ScoreResponse(BaseModel):
    consistency_score:    float = Field(description="Similarity to brand centroid (0–1).")
    distinctiveness_score: float = Field(description="1 − similarity to generic centroid (0–1).")
    quadrant:             str   = Field(
        description="on_brand | safe_generic | bold_off_brand | off_brand"
    )


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post(
    "/score",
    response_model=ScoreResponse,
    summary="Two-axis brand consistency + distinctiveness scoring",
    description=(
        "Runs the full scoring pipeline from TRD §6 steps 1–6:\n"
        "1. Build brand centroid from brand_corpus\n"
        "2. Build generic centroid from generic_corpus\n"
        "3. Embed content_text\n"
        "4. consistency = cosine_similarity(content, brand_centroid)\n"
        "5. distinctiveness = 1 − cosine_similarity(content, generic_centroid)\n"
        "6. Classify quadrant using threshold\n\n"
        "No external API key required — all-MiniLM-L6-v2 runs locally."
    ),
)
async def score_content_endpoint(payload: ScoreRequest) -> ScoreResponse:
    from app.scoring.engine import score_content

    try:
        result = score_content(
            content_text=payload.content_text,
            brand_corpus=payload.brand_corpus,
            generic_corpus=payload.generic_corpus,
            threshold=payload.threshold,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return ScoreResponse(
        consistency_score=result.consistency_score,
        distinctiveness_score=result.distinctiveness_score,
        quadrant=result.quadrant,
    )
