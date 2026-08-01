"""
agents/ingestion_agent.py
─────────────────────────
Ingestion agent logic for extracting a Brand Identity Card from raw text.
Uses the LLM client to parse unstructured brand guidelines or website copy 
into a structured TRD §4.1 shape.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from app.agents.llm_client import call_llm
from app.schemas.brand_identity_card import BrandIdentityCard, VisualTokens

logger = logging.getLogger(__name__)

# Fallback fixture used if LLM parsing fails completely
_FALLBACK_FIXTURE = {
    "brand_name": "Muthirai Demo Brand",
    "tone_words": ["confident", "warm", "precise"],
    "vocabulary": [
        "the seal of authenticity",
        "built for the long game",
        "unmistakably ours",
    ],
    "banned_generic_phrases": [
        "cutting-edge",
        "seamless experience",
        "best-in-class",
        "innovative solution",
        "leverage synergies",
    ],
    "core_values": ["authenticity", "craft", "accountability"],
    "visual_tokens": {
        "primary_colors": ["#1A1A2E", "#E94560", "#F5F5F5"],
        "style_descriptors": ["minimal", "high-contrast", "editorial"],
    },
    "source_urls": [],
}

SYSTEM_PROMPT = """You are an expert Brand Strategist AI.
Your task is to extract brand identity elements from the provided source text and return them as structured JSON.
Analyze the tone, vocabulary, stated values, and any visual design tokens mentioned.

You MUST return ONLY valid JSON matching this exact structure (all fields are required, use empty arrays if no data is found):
{
  "brand_name": "extracted brand name, or generic name if unknown",
  "tone_words": ["adjective1", "adjective2"],
  "vocabulary": ["signature phrase 1", "signature phrase 2"],
  "banned_generic_phrases": ["cliché 1", "cliché 2"],
  "core_values": ["value 1", "value 2"],
  "visual_tokens": {
    "primary_colors": ["#hexcode1", "#hexcode2"],
    "style_descriptors": ["style 1", "style 2"]
  },
  "source_urls": []
}

Do not include any explanation, markdown formatting outside of the JSON block, or extra keys."""

def extract_brand_identity(source_text: str) -> BrandIdentityCard:
    """
    Extract a structured BrandIdentityCard from raw text.
    On failure (API error, invalid JSON, or Pydantic validation failure), 
    returns a fallback fixture to prevent crashing the flow.
    """
    try:
        raw_json = call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=f"Extract the brand identity from the following text:\n\n{source_text}",
            response_format="json"
        )
        
        # Merge in generated fields not expected from the LLM
        raw_json["brand_id"] = str(uuid.uuid4())
        raw_json["created_at"] = datetime.now(timezone.utc)
        
        # Ensure visual_tokens is parsed into the Pydantic model correctly
        if "visual_tokens" in raw_json and isinstance(raw_json["visual_tokens"], dict):
            raw_json["visual_tokens"] = VisualTokens(**raw_json["visual_tokens"])
            
        # Validate against the Pydantic model
        card = BrandIdentityCard(**raw_json)
        logger.info(f"Successfully extracted BrandIdentityCard for '{card.brand_name}' via LLM.")
        return card
        
    except Exception as e:
        logger.error(f"Failed to extract brand identity via LLM: {e}. Using fallback fixture.")
        
        fallback_data = dict(_FALLBACK_FIXTURE)
        fallback_data["brand_id"] = str(uuid.uuid4())
        fallback_data["created_at"] = datetime.now(timezone.utc)
        fallback_data["visual_tokens"] = VisualTokens(**fallback_data["visual_tokens"])
        
        return BrandIdentityCard(**fallback_data)
