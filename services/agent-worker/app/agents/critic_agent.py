import json
import logging
from typing import List, Dict, Any

from app.agents.llm_client import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an elite, ruthless Brand Copy Critic. Your job is to analyze marketing content against a brand's Identity Card and aggressively flag ANY generic, safe, or boilerplate marketing fluff.

You will be provided with:
1. The raw content text.
2. Mathematical Consistency and Distinctiveness scores.
3. The Brand Identity Card.

Your task is to identify specific generic phrases or off-brand language. 
BE RUTHLESS. Flag phrases like "innovative solutions," "synergize," "high quality," "state-of-the-art," "unlock potential," or any other tired marketing clichés. If the text sounds like an AI wrote it or a generic corporate brochure, flag the offending sentences.

For each flagged phrase, provide a concrete reason (e.g., "Generic corporate fluff - brand is meant to be direct and punchy", "Uses banned cliché X", "Tone is too passive and safe").

You MUST return ONLY a JSON array containing the flagged phrases exactly matching this schema:
[
  {
    "phrase": "the exact text from the content",
    "reason": "explanation of why it is flagged, referencing the identity card or its generic nature"
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

def critique_image(image_bytes: bytes, identity_card: dict) -> List[Dict[str, Any]]:
    """
    Critique an image by comparing its dominant colors to the brand palette.
    """
    import io
    from PIL import Image
    
    flagged = []
    
    visual_tokens = identity_card.get("visual_tokens", {})
    if not visual_tokens:
        return flagged
    
    # Can be dict if passed as dict, or object if pydantic model. Handle both.
    if isinstance(visual_tokens, dict):
        primary_colors = visual_tokens.get("primary_colors", [])
    else:
        primary_colors = getattr(visual_tokens, "primary_colors", [])
        
    if not primary_colors:
        return flagged
        
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert("RGB")
        img = img.resize((150, 150))
        q = img.quantize(colors=3, method=2)
        palette = q.getpalette()
        
        dominant_colors = []
        for i in range(3):
            if palette and len(palette) >= i * 3 + 3:
                r, g, b = palette[i*3:i*3+3]
                hex_val = f"#{r:02x}{g:02x}{b:02x}".lower()
                dominant_colors.append(hex_val)
                
        def hex_to_rgb(hx):
            hx = hx.lstrip('#')
            if len(hx) != 6: return (0,0,0)
            return tuple(int(hx[i:i+2], 16) for i in (0, 2, 4))
            
        def color_dist(c1, c2):
            r1, g1, b1 = hex_to_rgb(c1)
            r2, g2, b2 = hex_to_rgb(c2)
            return ((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2) ** 0.5
            
        for dom_hex in dominant_colors:
            valid_brand_colors = [bc for bc in primary_colors if isinstance(bc, str) and bc.startswith("#") and len(bc) in (4,7)]
            if not valid_brand_colors:
                break
                
            min_dist = min([color_dist(dom_hex, bc) for bc in valid_brand_colors], default=0)
            
            # If distance is large, flag it
            if min_dist > 100:
                flagged.append({
                    "phrase": f"Color {dom_hex}",
                    "reason": f"Dominant color {dom_hex} doesn't match brand palette."
                })
                break
                
    except Exception as e:
        logger.error(f"Failed to critique image: {e}")
        
    return flagged
