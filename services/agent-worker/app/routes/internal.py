"""
Internal HTTP endpoints called exclusively by services/api.
No database access — pure request-in, response-out (TRD section 2.1).

Routes:
  POST /internal/ingest  — returns a Brand Identity Card (TRD 4.1 shape)
  POST /internal/score   — returns a Content Score Result (TRD 4.2 shape)

Currently returns realistic fixture data. Real logic (embedding + LLM calls)
will be wired in subsequent prompts without changing the response contracts.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter

from app.schemas.brand_identity_card import BrandIdentityCard, VisualTokens
from app.schemas.content_score_result import ContentScoreResult, FlaggedPhrase

router = APIRouter()


# ── Request models ─────────────────────────────────────────────────────────────

from pydantic import BaseModel, Field
from typing import Any


class IngestRequest(BaseModel):
    """Input for POST /internal/ingest."""
    source_text: str = Field(
        description="Raw text extracted from the brand's website or uploaded content"
    )


class ScoreRequest(BaseModel):
    """Input for POST /internal/score."""
    content: str = Field(description="The text content to be scored")
    brand_identity_card: dict[str, Any] = Field(
        description="The brand's identity card (TRD 4.1 shape) to score against"
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/ingest",
    response_model=BrandIdentityCard,
    summary="Extract a Brand Identity Card from source text",
    description=(
        "Ingestion Agent endpoint. Receives raw source text and returns a structured "
        "Brand Identity Card (TRD section 4.1). "
        "Uses the LLM client to parse the text. On failure, returns a fallback fixture."
    ),
)
async def ingest(payload: IngestRequest) -> BrandIdentityCard:
    from app.agents.ingestion_agent import extract_brand_identity
    
    return extract_brand_identity(payload.source_text)


@router.post(
    "/score",
    response_model=ContentScoreResult,
    summary="Score a piece of content against a brand identity card",
    description=(
        "Scoring Engine + Critic + Suggestion Agent endpoint. Receives content and "
        "a Brand Identity Card, returns a full Content Score Result (TRD section 4.2). "
        "Currently returns realistic fixture data — real embedding + LLM logic wired in next."
    ),
)
async def score(payload: ScoreRequest) -> ContentScoreResult:
    """
    Fixture: returns a realistic score result in the 'safe_generic' quadrant.
    Demonstrates the full response shape including flagged phrases and a rewrite.
    The api can parse, persist, and display this immediately.
    """
    return ContentScoreResult(
        content_id=str(uuid.uuid4()),
        brand_id=str(uuid.uuid4()),
        modality="text",
        consistency_score=0.71,
        distinctiveness_score=0.38,
        quadrant="safe_generic",
        flagged_phrases=[
            FlaggedPhrase(
                phrase="cutting-edge technology",
                reason="Used verbatim in 74% of sampled category content — zero differentiation.",
            ),
            FlaggedPhrase(
                phrase="seamless experience",
                reason="Category cliché with near-zero distinctiveness signal in SaaS verticals.",
            ),
        ],
        suggested_rewrite=(
            "Built for the long game — our approach doesn't chase trends, "
            "it earns trust through craft and consistency. "
            "Every decision carries the seal of accountability."
        ),
        scored_at=datetime.now(timezone.utc),
    )
