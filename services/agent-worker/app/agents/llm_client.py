"""
agents/llm_client.py
────────────────────
Provider-agnostic LLM client routing through OpenRouter (https://openrouter.ai).

Responsibilities:
  • Execute LLM calls using the model specified in LLM_MODEL env var.
  • Parse and validate JSON responses if response_format="json".
  • Provide 1 retry if JSON parsing fails.
  • All agents (ingestion, critic, suggestion) MUST use this client and NEVER 
    call a provider SDK directly.
"""

import os
import json
import logging
import httpx
from typing import Dict, Any

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

def call_llm(system_prompt: str, user_prompt: str, response_format: str = "json") -> Dict[str, Any]:
    """
    Call the LLM via OpenRouter.

    Args:
        system_prompt: The system prompt instructions.
        user_prompt: The user's input/query.
        response_format: "json" or "text". If "json", the response is parsed into a dict. 
                         If parsing fails, it retries exactly once.

    Returns:
        dict: The parsed JSON object if response_format="json", 
              or a dict {"text": "<raw_response>"} if response_format="text".
              
    Raises:
        ValueError: If OPENROUTER_API_KEY is not set.
        RuntimeError: If the API call fails or JSON parsing fails after retry.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable is not set.")

    model = os.getenv("LLM_MODEL", "anthropic/claude-sonnet-4.5")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:8000", # Required by OpenRouter for ranking
        "X-Title": "Muthirai Agent Worker",      # Optional, for display on OpenRouter
        "Content-Type": "application/json"
    }
    
    # Force JSON mode in OpenRouter if supported by the model (though we also parse manually)
    model_params = {}
    if response_format == "json":
        model_params["response_format"] = {"type": "json_object"}

    def _attempt(sys_prompt: str, usr_prompt: str) -> str:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": usr_prompt}
            ],
            **model_params
        }
        
        logger.debug(f"Calling OpenRouter model '{model}'")
        
        with httpx.Client(timeout=120.0) as client:
            response = client.post(OPENROUTER_URL, headers=headers, json=payload)
            response.raise_for_status()
            
            data = response.json()
            return data["choices"][0]["message"]["content"]

    # First attempt
    content = _attempt(system_prompt, user_prompt)
    
    if response_format != "json":
        return {"text": content}
        
    # JSON Parsing logic
    try:
        # Strip potential markdown code blocks
        clean_content = content.strip()
        if clean_content.startswith("```json"):
            clean_content = clean_content[7:]
        elif clean_content.startswith("```"):
            clean_content = clean_content[3:]
        if clean_content.endswith("```"):
            clean_content = clean_content[:-3]
            
        return json.loads(clean_content.strip())
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse LLM response as JSON. Retrying once. Error: {e}")
        logger.debug(f"Failed content was: {content}")
        
        # Retry once with explicit instruction
        retry_sys_prompt = system_prompt + "\n\nCRITICAL: Your previous response was not valid JSON. You MUST return ONLY valid JSON without any markdown formatting or extra text."
        
        content_retry = _attempt(retry_sys_prompt, user_prompt)
        
        try:
            clean_content_retry = content_retry.strip()
            if clean_content_retry.startswith("```json"):
                clean_content_retry = clean_content_retry[7:]
            elif clean_content_retry.startswith("```"):
                clean_content_retry = clean_content_retry[3:]
            if clean_content_retry.endswith("```"):
                clean_content_retry = clean_content_retry[:-3]
                
            return json.loads(clean_content_retry.strip())
        except json.JSONDecodeError as e2:
            logger.error(f"Failed to parse LLM response as JSON on retry. Error: {e2}")
            raise RuntimeError(f"LLM failed to return valid JSON after retry. Raw response: {content_retry}") from e2
