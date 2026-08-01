"""
ContentScoreResult — TRD.md section 4.2

Output of the Scoring Engine + Critic Agent + Suggestion Agent.
Returned by POST /internal/score.
"""
from datetime import datetime
from typing import List, Literal
from pydantic import BaseModel, Field


class FlaggedPhrase(BaseModel):
    """One phrase flagged by the Critic Agent with an explanation."""
    phrase: str = Field(description="The specific flagged text span")
    reason: str = Field(description="Critic Agent's explanation for the flag")


class ContentScoreResult(BaseModel):
    """
    TRD section 4.2 — exact JSON shape.
    Returned by POST /internal/score.
    """
    content_id: str = Field(description="UUID of the scored content item")
    brand_id: str = Field(description="UUID of the brand this content was scored against")
    modality: Literal["text", "image"] = Field(
        description="Content type: 'text' or 'image'"
    )
    consistency_score: float = Field(
        ge=0.0, le=1.0,
        description="Cosine similarity of content embedding vs brand centroid (0–1)"
    )
    distinctiveness_score: float = Field(
        ge=0.0, le=1.0,
        description="1 − cosine similarity of content embedding vs generic centroid (0–1)"
    )
    quadrant: Literal["on_brand", "safe_generic", "bold_off_brand", "off_brand"] = Field(
        description="Derived quadrant classification from the two-axis model"
    )
    flagged_phrases: List[FlaggedPhrase] = Field(
        description="Phrases identified by the Critic Agent as hurting the score"
    )
    suggested_rewrite: str = Field(
        description="Suggestion Agent's rewritten version of the content"
    )
    scored_at: datetime = Field(description="ISO-8601 timestamp when scoring completed")
