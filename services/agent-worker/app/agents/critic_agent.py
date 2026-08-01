import json
import logging
from typing import List, Dict, Any

from app.agents.llm_client import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are Muthirai's Critic Agent. Your job is to analyze a piece of marketing content against a brand's Identity Card and identify generic or off-brand phrases.

You will be provided with:
1. The raw content text.
2. The mathematical Consistency score (0.0 to 1.0) comparing it to the brand.
3. The mathematical Distinctiveness score (0.0 to 1.0) comparing it to generic category language.
4. The Brand Identity Card.

Your task is to name specific generic phrases or brand-inconsistent language in the content. For each flagged phrase, provide a concrete reason referencing the identity card (e.g., "uses banned phrase X", "doesn't match tone_words: confident", "generic category boilerplate").

You MUST return ONLY a JSON array containing the flagged phrases exactly matching this schema:
[
  {
    "phrase": "the exact text from the content",
    "reason": "explanation of why it is flagged, referencing the identity card"
  }
]

Do not return a JSON object wrapping the array. Return the array directly. Do not include markdown formatting.
"""

def critique_content(content: str, consistency_score: float, distinctiveness_score: float, identity_card: dict) -> List[Dict[str, Any]]:
    """
    Critique content against a brand identity card using an LLM.
    
    Args:
        content: The text content to analyze.
        consistency_score: The mathematical consistency score.
        distinctiveness_score: The mathematical distinctiveness score.
        identity_card: The brand's identity card dict.
        
    Returns:
        A list of dicts with 'phrase' and 'reason' keys.
    """
    user_prompt = f"""Content:
{content}

Scores:
- Consistency: {consistency_score:.2f}
- Distinctiveness: {distinctiveness_score:.2f}

Brand Identity Card:
{json.dumps(identity_card, indent=2)}

Remember to return ONLY a JSON array of flagged phrases.
"""

    try:
        response = call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format="json"
        )
        
        # Depending on how the LLM formats the JSON, it might return a list directly, 
        # or an object with a 'flagged_phrases' key. Handle both gracefully.
        if isinstance(response, list):
            return response
        elif isinstance(response, dict):
            # Sometimes LLMs wrap the array in a dict even when told not to
            for key, val in response.items():
                if isinstance(val, list):
                    return val
            return []
        else:
            logger.warning("LLM returned non-list/dict for critique_content. Falling back to empty list.")
            return []
            
    except Exception as e:
        logger.error(f"Failed to critique content: {e}")
        return []
