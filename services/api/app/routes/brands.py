"""
Public /brands routes — TRD §5.

Implements all six endpoints described in TRD.md section 5 and uses the
drift-history and trace queries from BACKEND_SCHEMA.md section 6.

Service-to-service calls (ingest / score) are made over HTTP using httpx.
The agent-worker base URL is read from the AGENT_WORKER_URL environment
variable (default: http://agent-worker:8001), matching docker-compose.yml.

Error handling
--------------
- httpx.ConnectError / httpx.TimeoutException  → 502 Bad Gateway
- 4xx/5xx from agent-worker                    → forwarded as-is or wrapped in 502
- Missing DB records                           → 404
"""
from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.brand import Brand
from app.models.brand_identity_card import BrandIdentityCard
from app.models.content_item import ContentItem
from app.models.score_result import ScoreResult
from app.models.flagged_phrase import FlaggedPhrase
from app.models.suggested_rewrite import SuggestedRewrite
from app.models.agent_trace_step import AgentTraceStep
from app.schemas.brands import (
    AgentTraceStepOut,
    BrandCreateRequest,
    BrandOut,
    BrandPatchRequest,
    DriftHistoryItem,
    ScoreRequest,
    ScoreResultOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/brands", tags=["Brands"])

# ── Internal HTTP client config ───────────────────────────────────────────────

AGENT_WORKER_BASE = os.getenv("AGENT_WORKER_URL", "http://agent-worker:8001")

# Timeout: connect 5 s, read 120 s (LLM calls can be slow).
_TIMEOUT = httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0)


def _worker_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=AGENT_WORKER_BASE, timeout=_TIMEOUT)


def _handle_worker_error(exc: Exception, operation: str) -> None:
    """Convert any httpx transport error into a clean 502."""
    logger.error("agent-worker unreachable during %s: %s", operation, exc)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"agent-worker is unreachable ({operation}). Try again shortly.",
    )


# ── POST /brands ──────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=BrandOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a brand profile",
    description=(
        "Calls agent-worker POST /internal/ingest to extract a Brand Identity Card "
        "from the supplied source text or URL list, then persists the brand row and "
        "identity card to the database."
    ),
)
async def create_brand(
    payload: BrandCreateRequest,
    db: Session = Depends(get_db),
) -> BrandOut:
    # Build source text to send to the worker.
    # For now we forward whatever the caller supplies; URL fetching is the
    # worker's (or a future ingest step's) concern.
    source_text = payload.source_text or (
        f"Brand: {payload.name}. Sources: {', '.join(payload.source_urls or [])}"
    )

    # ── 1. Call agent-worker /internal/ingest ─────────────────────────────────
    try:
        async with _worker_client() as client:
            resp = await client.post(
                "/internal/ingest",
                json={"source_text": source_text},
            )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        _handle_worker_error(exc, "ingest")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"agent-worker returned {resp.status_code} during ingest.",
        )

    card_data: dict = resp.json()

    # ── 2. Persist to DB ──────────────────────────────────────────────────────
    brand_id = str(uuid.uuid4())

    brand = Brand(
        id=brand_id,
        name=payload.name,
        source_urls=payload.source_urls,
    )
    db.add(brand)
    db.flush()  # get brand.id without committing

    visual_tokens_raw = card_data.get("visual_tokens")

    identity_card = BrandIdentityCard(
        id=str(uuid.uuid4()),
        brand_id=brand_id,
        tone_words=card_data.get("tone_words", []),
        vocabulary=card_data.get("vocabulary", []),
        banned_generic_phrases=card_data.get("banned_generic_phrases", []),
        core_values=card_data.get("core_values", []),
        visual_tokens=visual_tokens_raw if isinstance(visual_tokens_raw, dict) else None,
    )
    db.add(identity_card)
    db.commit()
    db.refresh(brand)

    return BrandOut.model_validate(brand)


# ── GET /brands/{id} ──────────────────────────────────────────────────────────

@router.get(
    "/{brand_id}",
    response_model=BrandOut,
    summary="Retrieve a Brand Identity Card",
)
def get_brand(brand_id: str, db: Session = Depends(get_db)) -> BrandOut:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand not found.")
    return BrandOut.model_validate(brand)


# ── PATCH /brands/{id} ────────────────────────────────────────────────────────

@router.patch(
    "/{brand_id}",
    response_model=BrandOut,
    summary="Edit a Brand Identity Card manually",
    description=(
        "Updates the brand row and/or its identity card in-place. "
        "Only fields present in the request body are written; omitted fields are left unchanged."
    ),
)
def patch_brand(
    brand_id: str,
    payload: BrandPatchRequest,
    db: Session = Depends(get_db),
) -> BrandOut:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand not found.")

    # Update brand-level fields
    if payload.name is not None:
        brand.name = payload.name
    if payload.source_urls is not None:
        brand.source_urls = payload.source_urls
    brand.updated_at = datetime.now(timezone.utc)

    # Update identity card fields if card exists
    card = brand.identity_card
    if card is not None:
        if payload.tone_words is not None:
            card.tone_words = payload.tone_words
        if payload.vocabulary is not None:
            card.vocabulary = payload.vocabulary
        if payload.banned_generic_phrases is not None:
            card.banned_generic_phrases = payload.banned_generic_phrases
        if payload.core_values is not None:
            card.core_values = payload.core_values
        if payload.visual_tokens is not None:
            card.visual_tokens = payload.visual_tokens.model_dump()
        card.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(brand)
    return BrandOut.model_validate(brand)


# ── POST /brands/{id}/score ───────────────────────────────────────────────────

@router.post(
    "/{brand_id}/score",
    response_model=ScoreResultOut,
    status_code=status.HTTP_201_CREATED,
    summary="Score a content item against a brand",
    description=(
        "Calls agent-worker POST /internal/score with the content and the brand's "
        "identity card, then persists ContentItem, ScoreResult, FlaggedPhrases, "
        "and SuggestedRewrite to the database."
    ),
)
async def score_content(
    brand_id: str,
    payload: ScoreRequest,
    db: Session = Depends(get_db),
) -> ScoreResultOut:
    # ── 1. Load brand + identity card ─────────────────────────────────────────
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand not found.")

    card = brand.identity_card
    if card is None:
        raise HTTPException(
            status_code=422,
            detail="Brand has no identity card yet. Run POST /brands first.",
        )

    # Serialize the identity card into the shape the worker expects
    identity_card_dict = {
        "brand_id": brand_id,
        "brand_name": brand.name,
        "tone_words": card.tone_words,
        "vocabulary": card.vocabulary,
        "banned_generic_phrases": card.banned_generic_phrases,
        "core_values": card.core_values,
        "visual_tokens": card.visual_tokens,
        "source_urls": brand.source_urls or [],
        "created_at": card.created_at.isoformat(),
    }

    # ── 2. Call agent-worker /internal/score ──────────────────────────────────
    try:
        async with _worker_client() as client:
            resp = await client.post(
                "/internal/score",
                json={
                    "content": payload.content,
                    "brand_identity_card": identity_card_dict,
                },
            )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        _handle_worker_error(exc, "score")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"agent-worker returned {resp.status_code} during scoring.",
        )

    result_data: dict = resp.json()

    # ── 3. Persist results ────────────────────────────────────────────────────
    content_id = str(uuid.uuid4())

    content_item = ContentItem(
        id=content_id,
        brand_id=brand_id,
        modality=payload.modality if payload.modality in ("text", "image") else "text",
        raw_content=payload.content,
    )
    db.add(content_item)
    db.flush()

    score_result_id = str(uuid.uuid4())
    score_result = ScoreResult(
        id=score_result_id,
        content_id=content_id,
        consistency_score=result_data.get("consistency_score", 0.0),
        distinctiveness_score=result_data.get("distinctiveness_score", 0.0),
        quadrant=result_data.get("quadrant", "off_brand"),
        scored_at=datetime.now(timezone.utc),
    )
    db.add(score_result)
    db.flush()

    # Persist flagged phrases (N rows)
    for fp in result_data.get("flagged_phrases", []):
        db.add(FlaggedPhrase(
            id=str(uuid.uuid4()),
            score_result_id=score_result_id,
            phrase=fp.get("phrase", ""),
            reason=fp.get("reason", ""),
        ))

    # Persist suggested rewrite (1 row, optional)
    rewrite_text = result_data.get("suggested_rewrite", "")
    if rewrite_text:
        db.add(SuggestedRewrite(
            id=str(uuid.uuid4()),
            score_result_id=score_result_id,
            rewrite_text=rewrite_text,
        ))

    db.commit()
    db.refresh(score_result)

    # Build response manually to include nested objects
    flagged_out = [
        {"id": fp.id, "phrase": fp.phrase, "reason": fp.reason}
        for fp in score_result.flagged_phrases
    ]
    rewrite_out = (
        score_result.suggested_rewrite.rewrite_text
        if score_result.suggested_rewrite
        else None
    )

    return ScoreResultOut(
        id=score_result.id,
        content_id=content_id,
        consistency_score=score_result.consistency_score,
        distinctiveness_score=score_result.distinctiveness_score,
        quadrant=score_result.quadrant,
        scored_at=score_result.scored_at,
        flagged_phrases=flagged_out,
        suggested_rewrite=rewrite_out,
    )


# ── GET /brands/{id}/history ──────────────────────────────────────────────────

@router.get(
    "/{brand_id}/history",
    response_model=List[DriftHistoryItem],
    summary="Drift score history for a brand",
    description=(
        "Returns the full score history ordered by time ascending — "
        "used by the Drift Dashboard chart (BACKEND_SCHEMA.md §6).\n\n"
        "SQL: SELECT sr.scored_at, sr.consistency_score, sr.distinctiveness_score, "
        "sr.quadrant FROM score_results sr JOIN content_items ci ON ci.id = sr.content_id "
        "WHERE ci.brand_id = :brand_id ORDER BY sr.scored_at ASC"
    ),
)
def get_brand_history(
    brand_id: str,
    db: Session = Depends(get_db),
) -> List[DriftHistoryItem]:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand not found.")

    # Drift history query — BACKEND_SCHEMA.md §6
    rows = (
        db.query(ScoreResult, ContentItem)
        .join(ContentItem, ContentItem.id == ScoreResult.content_id)
        .filter(ContentItem.brand_id == brand_id)
        .order_by(ScoreResult.scored_at.asc())
        .all()
    )

    return [
        DriftHistoryItem(
            scored_at=sr.scored_at,
            consistency_score=sr.consistency_score,
            distinctiveness_score=sr.distinctiveness_score,
            quadrant=sr.quadrant,
            content_id=ci.id,
        )
        for sr, ci in rows
    ]


# ── GET /brands/{id}/trace/{content_id} ──────────────────────────────────────

@router.get(
    "/{brand_id}/trace/{content_id}",
    response_model=List[AgentTraceStepOut],
    summary="Agent reasoning trace for a scored content item",
    description=(
        "Returns the ordered list of agent pipeline steps for a specific content item "
        "(BACKEND_SCHEMA.md §6 — 'Ordered agent trace for a content item').\n\n"
        "SQL: SELECT agent_name, input_snippet, output_snippet, status, started_at, "
        "completed_at FROM agent_trace_steps WHERE content_id = :content_id "
        "ORDER BY started_at ASC"
    ),
)
def get_trace(
    brand_id: str,
    content_id: str,
    db: Session = Depends(get_db),
) -> List[AgentTraceStepOut]:
    # Verify the content item belongs to this brand (prevents info-leak across brands)
    content_item = (
        db.query(ContentItem)
        .filter(ContentItem.id == content_id, ContentItem.brand_id == brand_id)
        .first()
    )
    if content_item is None:
        raise HTTPException(
            status_code=404,
            detail="Content item not found for this brand.",
        )

    # Ordered trace query — BACKEND_SCHEMA.md §6
    steps = (
        db.query(AgentTraceStep)
        .filter(AgentTraceStep.content_id == content_id)
        .order_by(AgentTraceStep.started_at.asc())
        .all()
    )

    return [AgentTraceStepOut.model_validate(step) for step in steps]
