"""
agents/llm_client.py
────────────────────
Provider-agnostic LLM client.

Routing priority:
  1. ANTHROPIC_API_KEY → call Anthropic Claude directly via httpx
  2. OPENROUTER_API_KEY → route through OpenRouter

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
from pathlib import Path

# Auto-load .env from the agent-worker root so keys are available outside Docker
_env_path = Path(__file__).parent.parent.parent / ".env"
if _env_path.exists():
    with open(_env_path) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip())


logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
ANTHROPIC_URL  = "https://api.anthropic.com/v1/messages"


def _call_anthropic(system_prompt: str, user_prompt: str, model: str) -> str:
    """Call Anthropic Messages API directly."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": 2048,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    with httpx.Client(timeout=120.0) as client:
        response = client.post(ANTHROPIC_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]


def _call_openrouter(system_prompt: str, user_prompt: str, model: str, json_mode: bool) -> str:
    """Call via OpenRouter."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": "http://localhost:8000",
        "X-Title": "Muthirai Agent Worker",
        "Content-Type": "application/json",
    }
    model_params: dict = {}
    if json_mode:
        model_params["response_format"] = {"type": "json_object"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        **model_params,
    }
    with httpx.Client(timeout=120.0) as client:
        response = client.post(OPENROUTER_URL, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def _attempt(system_prompt: str, user_prompt: str, json_mode: bool) -> str:
    """Route to the appropriate provider based on available env vars."""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()

    # Default model — strip provider prefix if using Anthropic directly
    model_env = os.getenv("LLM_MODEL", "claude-sonnet-4-5")
    # OpenRouter uses "anthropic/claude-..." prefix; Anthropic API uses "claude-..."
    anthropic_model = model_env.replace("anthropic/", "")
    
    # Use the exact model name extracted from the .env file
    # This allows users to specify custom or mocked models (e.g. claude-sonnet-4-6)

    if anthropic_key:
        logger.error(f"DEBUG: Using Anthropic API directly with model '{anthropic_model}' (from env '{model_env}')")
        return _call_anthropic(system_prompt, user_prompt, anthropic_model)

    if openrouter_key:
        logger.error(f"DEBUG: Using OpenRouter with model '{model_env}'")
        return _call_openrouter(system_prompt, user_prompt, model_env, json_mode)

    raise ValueError(
        "No LLM API key found. Set ANTHROPIC_API_KEY or OPENROUTER_API_KEY in the environment."
    )


def _parse_json(content: str) -> Dict[str, Any]:
    """Strip markdown fences and parse JSON."""
    clean = content.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return json.loads(clean.strip())


def call_llm(
    system_prompt: str,
    user_prompt: str,
    response_format: str = "json",
) -> Dict[str, Any]:
    """
    Call the LLM via the best available provider.

    Args:
        system_prompt: The system prompt instructions.
        user_prompt:   The user's input/query.
        response_format: "json" or "text".

    Returns:
        dict: Parsed JSON if response_format="json", or {"text": raw} if "text".

    Raises:
        ValueError: If no API key is configured.
        RuntimeError: If JSON parsing fails after retry.
    """
    json_mode = response_format == "json"

    # First attempt
    content = _attempt(system_prompt, user_prompt, json_mode)

    if not json_mode:
        return {"text": content}

    # JSON parsing
    try:
        return _parse_json(content)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse LLM JSON response, retrying once. Error: {e}")

        retry_sys = (
            system_prompt
            + "\n\nCRITICAL: Your previous response was not valid JSON. "
            "Return ONLY valid JSON with no markdown or extra text."
        )
        content_retry = _attempt(retry_sys, user_prompt, json_mode)

        try:
            return _parse_json(content_retry)
        except json.JSONDecodeError as e2:
            logger.error(f"JSON parsing failed on retry: {e2}")
            raise RuntimeError(
                f"LLM failed to return valid JSON after retry. Raw: {content_retry}"
            ) from e2
