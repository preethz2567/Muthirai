"""
Pydantic schemas for the /brands public routes.

These are distinct from the SQLAlchemy ORM models (app/models/) and from the
agent-worker's internal schemas (app/schemas/ inside agent-worker).  They
define the API contract that external callers see.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


# ── Shared sub-objects ────────────────────────────────────────────────────────

class VisualTokens(BaseModel):
    primary_colors: List[str] = Field(default_factory=list)
    style_descriptors: List[str] = Field(default_factory=list)


class FlaggedPhraseOut(BaseModel):
    id: str
    phrase: str
    reason: str

    model_config = {"from_attributes": True}


# ── POST /brands ──────────────────────────────────────────────────────────────

class BrandCreateRequest(BaseModel):
    """
    Body for POST /brands.
    At minimum the caller must supply a name plus either source_urls or
    source_text so the Ingestion Agent has something to work with.
    """
    name: str = Field(description="Display name of the brand")
    source_urls: Optional[List[str]] = Field(
        default=None,
        description="One or more URLs to crawl for brand content",
    )
    source_text: Optional[str] = Field(
        default=None,
        description="Pre-fetched raw text extracted from the brand's website",
    )


class IdentityCardOut(BaseModel):
    id: str
    brand_id: str
    tone_words: List[str]
    vocabulary: List[str]
    banned_generic_phrases: List[str]
    core_values: List[str]
    visual_tokens: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BrandOut(BaseModel):
    id: str
    name: str
    source_urls: Optional[Any] = None
    created_at: datetime
    updated_at: datetime
    identity_card: Optional[IdentityCardOut] = None

    model_config = {"from_attributes": True}


# ── PATCH /brands/{id} ────────────────────────────────────────────────────────

class BrandPatchRequest(BaseModel):
    """
    Body for PATCH /brands/{id}.
    All fields optional — only supplied fields are written.
    Allows editing both the brand row and its identity card in one call.
    """
    name: Optional[str] = None
    source_urls: Optional[List[str]] = None
    # Identity card fields
    tone_words: Optional[List[str]] = None
    vocabulary: Optional[List[str]] = None
    banned_generic_phrases: Optional[List[str]] = None
    core_values: Optional[List[str]] = None
    visual_tokens: Optional[VisualTokens] = None


# ── POST /brands/{id}/score ───────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    """Body for POST /brands/{id}/score."""
    content: str = Field(description="Text content to be scored")
    modality: str = Field(default="text", description="'text' or 'image'")


class ScoreResultOut(BaseModel):
    id: str
    content_id: str
    consistency_score: float
    distinctiveness_score: float
    quadrant: str
    scored_at: datetime
    flagged_phrases: List[FlaggedPhraseOut] = Field(default_factory=list)
    suggested_rewrite: Optional[str] = None

    model_config = {"from_attributes": True}


# ── GET /brands/{id}/history ──────────────────────────────────────────────────

class DriftHistoryItem(BaseModel):
    """One row from the drift-history query (BACKEND_SCHEMA.md §6)."""
    scored_at: datetime
    consistency_score: float
    distinctiveness_score: float
    quadrant: str
    content_id: str


# ── GET /brands/{id}/trace/{content_id} ──────────────────────────────────────

class AgentTraceStepOut(BaseModel):
    id: str
    agent_name: str
    input_snippet: Optional[str] = None
    output_snippet: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── GET /brands/{id}/trajectory ──────────────────────────────────────────────

class TrajectoryChatRequest(BaseModel):
    chat_history: List[dict] = Field(description="List of chat messages: [{'role': 'user', 'content': '...'}]")

class TrajectoryChatResponse(BaseModel):
    response_message: str
    target_card: dict

class TrajectoryConfirmRequest(BaseModel):
    chat_transcript: List[dict] = Field(description="Final chat history")
    target_tone_words: Optional[List[str]] = Field(default_factory=list)
    target_vocabulary: Optional[List[str]] = Field(default_factory=list)
    target_core_values: Optional[List[str]] = Field(default_factory=list)

class BrandTrajectoryOut(BaseModel):
    id: str
    brand_id: str
    target_tone_words: Optional[List[str]] = None
    target_vocabulary: Optional[List[str]] = None
    target_core_values: Optional[List[str]] = None
    blend_weight: float
    chat_transcript: Optional[List[dict]] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
