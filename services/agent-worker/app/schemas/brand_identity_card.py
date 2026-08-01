"""
BrandIdentityCard — TRD.md section 4.1

Output of the Ingestion Agent. Enforces the exact JSON shape that api
will receive from POST /internal/ingest.
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class VisualTokens(BaseModel):
    """Nested visual identity tokens within a Brand Identity Card."""
    primary_colors: List[str] = Field(
        description="Hex color codes for the brand's primary palette, e.g. ['#1A1A2E', '#E94560']"
    )
    style_descriptors: List[str] = Field(
        description="Visual style keywords, e.g. ['minimal', 'high-contrast']"
    )


class BrandIdentityCard(BaseModel):
    """
    TRD section 4.1 — exact JSON shape.
    Returned by POST /internal/ingest.
    Stored once per brand; user-editable after extraction.
    """
    brand_id: str = Field(description="UUID of the brand this card belongs to")
    brand_name: str = Field(description="Display name of the brand")
    tone_words: List[str] = Field(
        description="Adjectives describing the brand's voice, e.g. ['confident', 'warm', 'precise']"
    )
    vocabulary: List[str] = Field(
        description="Signature phrases the brand actually uses in its own content"
    )
    banned_generic_phrases: List[str] = Field(
        description="Phrases flagged as generic for this brand, e.g. ['cutting-edge', 'seamless experience']"
    )
    core_values: List[str] = Field(
        description="The brand's stated values"
    )
    visual_tokens: Optional[VisualTokens] = Field(
        default=None,
        description="Visual identity tokens — colors and style descriptors"
    )
    source_urls: List[str] = Field(
        default_factory=list,
        description="URLs used as source material for identity extraction"
    )
    created_at: datetime = Field(description="ISO-8601 creation timestamp")
