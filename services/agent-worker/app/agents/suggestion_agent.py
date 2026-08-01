"""
agents/suggestion_agent.py
──────────────────────────
Suggestion Agent — rewrites flagged spans using the brand's own vocabulary.

Responsibilities (TRD §2.1 — Suggestion Agent):
  • LLM call with brand identity card as RAG context (prompt-level, no vector retrieval).
  • Rewrite ONLY the flagged spans; preserve all non-flagged text exactly.
  • Ground rewrites in the brand's own vocabulary list and tone_words.
"""

import json
import logging
from typing import List, Dict, Any

from app.agents.llm_client import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite, highly creative Brand Copywriter.

Your sole job is to rewrite flagged spans in marketing content so that they:
  1. Strip away all generic, safe, or AI-sounding marketing fluff.
  2. Sound fiercely authentic to the brand's voice, strictly using its vocabulary and reflecting its unique tone.

RULES:
- Only rewrite the exact flagged spans. Keep surrounding non-flagged text intact.
- DO NOT use generic corporate speak. Be direct, distinctive, and punchy.
- You MUST draw heavily from the brand's vocabulary list. If the brand says "Mac", don't say "computer".
- Match the brand's tone perfectly.
- If a flagged phrase is just empty marketing fluff (e.g. "maximize your productivity"), rewrite it to be concrete and specific to the brand, or remove it entirely if it adds no value.
- NEVER sound like a generic LLM. Be creative and opinionated.

You MUST return ONLY a JSON object with a single key "rewritten_content" containing the full rewritten text.
Do not include markdown formatting or any other keys.
"""


def suggest_rewrite(content: str, flagged_phrases: List[Dict[str, Any]], identity_card: dict) -> str:
    """
    Rewrite the flagged spans in 'content' using the brand's own vocabulary and tone.

    Uses prompt-level RAG: the identity card's vocabulary and tone_words are injected
    directly into the prompt as reference material — no separate vector retrieval step
    is needed given the corpus size.

    Args:
        content:          The original text content to rewrite.
        flagged_phrases:  List of dicts with 'phrase' and 'reason' keys (from the Critic Agent).
        identity_card:    The brand's identity card dict.

    Returns:
        The rewritten content as a plain string.
        Falls back to the original content if the LLM call fails.
    """
    if not flagged_phrases:
        # Nothing to rewrite.
        return content

    # Build the vocabulary/tone block for grounding (prompt-level RAG)
    tone_words:    list = identity_card.get("tone_words", [])
    vocabulary:    list = identity_card.get("vocabulary", [])
    core_values:   list = identity_card.get("core_values", [])
    banned_phrases: list = identity_card.get("banned_generic_phrases", [])

    brand_context = (
        f"Brand Voice Reference\n"
        f"────────────────────\n"
        f"Tone words (how the brand sounds): {', '.join(tone_words) if tone_words else 'N/A'}\n"
        f"Vocabulary (phrases the brand actually uses): {json.dumps(vocabulary) if vocabulary else '[]'}\n"
        f"Core values: {', '.join(core_values) if core_values else 'N/A'}\n"
        f"Banned generic phrases (never use these): {json.dumps(banned_phrases) if banned_phrases else '[]'}"
    )

    flagged_list_text = "\n".join(
        f"  - \"{fp['phrase']}\": {fp.get('reason', '')}"
        for fp in flagged_phrases
    )

    user_prompt = (
        f"{brand_context}\n\n"
        f"Original Content:\n{content}\n\n"
        f"Flagged Spans to Rewrite:\n{flagged_list_text}\n\n"
        "Return ONLY a JSON object: {{\"rewritten_content\": \"<full rewritten text>\"}}"
    )

    try:
        response = call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format="json",
        )

        if isinstance(response, dict):
            rewritten = response.get("rewritten_content")
            if isinstance(rewritten, str) and rewritten.strip():
                return rewritten.strip()

        logger.warning("suggest_rewrite: unexpected LLM response structure — falling back to original.")
        return content

    except Exception as exc:
        logger.error(f"suggest_rewrite: LLM call failed ({exc}) — returning original content.")
        return content

def suggest_image_rewrite(identity_card: dict) -> str:
    """
    For images, we do not rewrite the image. Instead, we return a simple tip
    pulled from the brand's visual tokens.
    """
    visual_tokens = identity_card.get("visual_tokens", {})
    
    # Can be dict if passed as dict, or object if pydantic model
    if isinstance(visual_tokens, dict):
        primary_colors = visual_tokens.get("primary_colors", [])
    else:
        primary_colors = getattr(visual_tokens, "primary_colors", [])
        
    if primary_colors:
        return f"Consider using colors from your brand palette: {', '.join(primary_colors)}"
    return "Consider using colors from your brand palette."
