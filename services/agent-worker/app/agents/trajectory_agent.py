"""
agents/trajectory_agent.py
──────────────────────────
Trajectory Agent logic for iterating on a brand's identity target via chat.
"""

import json
import logging
from typing import Dict, List, Any
from app.agents.llm_client import call_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert Brand Strategist AI helping a user evolve their brand identity.
You are given the user's current Brand Identity Card and the recent chat history.
Your job is to respond conversationally AND output an updated Target Brand Identity Card.

The Target Brand Identity Card MUST contain exactly these fields (use empty arrays if no data):
{
  "tone_words": ["adjective1", "adjective2"],
  "vocabulary": ["signature phrase 1", "signature phrase 2"],
  "core_values": ["value 1", "value 2"]
}

Your final output MUST be a JSON object with two top-level keys:
{
  "response_message": "Your conversational response to the user's latest request.",
  "target_card": {
     "tone_words": [...],
     "vocabulary": [...],
     "core_values": [...]
  }
}

Do not include any explanation or markdown formatting outside of the JSON block. Ensure valid JSON."""

def propose_trajectory(chat_history: List[Dict[str, str]], current_identity_card: Dict[str, Any]) -> Dict[str, Any]:
    """
    Given the current card and chat history, call the LLM to propose an updated trajectory.
    """
    user_prompt = f"Current Identity Card:\n{json.dumps(current_identity_card, indent=2)}\n\n"
    user_prompt += "Chat History:\n"
    for msg in chat_history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        user_prompt += f"[{role.upper()}]: {content}\n"
    
    user_prompt += "\nPlease provide your response and updated target_card in JSON format."
    
    try:
        result = call_llm(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_format="json"
        )
        return result
    except Exception as e:
        logger.error(f"Trajectory agent failed: {e}")
        # Graceful fallback so UI doesn't crash during demo
        return {
            "response_message": "I'm having trouble connecting right now, but I can help you update your brand identity once the connection is restored.",
            "target_card": {
                "tone_words": current_identity_card.get("tone_words", []),
                "vocabulary": current_identity_card.get("vocabulary", []),
                "core_values": current_identity_card.get("core_values", []),
            }
        }
