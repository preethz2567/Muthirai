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

SYSTEM_PROMPT = """You are Muthirai's Suggestion Agent — a specialist brand copywriter.

Your sole job is to rewrite flagged spans in a piece of marketing content so that they:
  1. No longer use generic or off-brand language.
  2. Sound natural in the brand's voice, using words from the brand's own vocabulary list and reflecting its tone_words.

RULES:
- Only rewrite the exact flagged spans. Keep ALL surrounding text character-for-character.
- Do NOT paraphrase or restructure sentences that contain no flagged spans.
- You MUST draw from the brand's vocabulary list — use the brand's own phrases and terminology.
- Match the brand's tone_words (e.g. if tone is "confident", do not write apologetically).
- Do NOT introduce new claims that were not implied by the original content.
- If a flagged phrase has no good brand-aligned substitute, remove it cleanly rather than replacing it with something equally generic.

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
