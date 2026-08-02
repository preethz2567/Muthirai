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
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.brand import Brand
from app.models.brand_identity_card import BrandIdentityCard
from app.models.brand_trajectory import BrandTrajectory
from app.models.content_item import ContentItem
from app.models.embedding import Embedding
from app.models.score_result import ScoreResult
from app.models.flagged_phrase import FlaggedPhrase
from app.models.suggested_rewrite import SuggestedRewrite
from app.models.agent_trace_step import AgentTraceStep
from app.utils.pdf import extract_text_from_pdf
from app.schemas.brands import (
    AgentTraceStepOut,
    BrandCreateRequest,
    BrandOut,
    BrandListOut,
    BrandPatchRequest,
    DriftHistoryItem,
    ScoreRequest,
    ScoreResultOut,
    TrajectoryChatRequest,
    TrajectoryChatResponse,
    TrajectoryConfirmRequest,
    BrandTrajectoryOut,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/brands", tags=["Brands"])

# ── Internal HTTP client config ───────────────────────────────────────────────

AGENT_WORKER_BASE = os.getenv("AGENT_WORKER_URL", "http://agent-worker:8001")
if not AGENT_WORKER_BASE.startswith("http"):
    AGENT_WORKER_BASE = f"http://{AGENT_WORKER_BASE}"

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


# ── GET /brands ───────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=List[BrandListOut],
    summary="List all brands",
    description="Returns a list of all brands, ordered by creation date descending.",
)
def list_brands(db: Session = Depends(get_db)) -> List[BrandListOut]:
    brands = db.query(Brand).order_by(Brand.created_at.desc()).all()
    return [BrandListOut.model_validate(b) for b in brands]


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

    # ── 3. Build brand centroid from identity card vocabulary ─────────────────
    # We embed multiple representative texts from the brand identity card
    # (vocabulary phrases, tone words, core values) rather than the raw source
    # text alone. This makes the brand centroid semantically rich so that
    # cosine similarity scores vary meaningfully between on-brand and off-brand content.
    brand_texts_to_embed: list[str] = []
    
    # Add vocabulary phrases (most specific brand signals)
    vocabulary = card_data.get("vocabulary", [])
    brand_texts_to_embed.extend(vocabulary)
    
    # Add tone words as short brand-characterizing phrases
    tone_words = card_data.get("tone_words", [])
    if tone_words:
        brand_texts_to_embed.append(", ".join(tone_words))
    
    # Add core values
    core_values = card_data.get("core_values", [])
    brand_texts_to_embed.extend(core_values)
    
    # Always include the source text too
    brand_texts_to_embed.append(source_text)
    
    # Embed each text and add to the FAISS index for this brand
    embed_errors = 0
    for text in brand_texts_to_embed:
        if not text or not text.strip():
            continue
        try:
            async with _worker_client() as client:
                embed_resp = await client.post(
                    "/internal/embed",
                    json={
                        "text": text.strip(),
                        "owner": f"brand_centroid:{brand_id}"
                    },
                )
            if embed_resp.status_code == 200 and embed_errors == 0:
                # Only persist DB record once (first successful embed)
                embed_data = embed_resp.json()
                embedding_record = Embedding(
                    id=str(uuid.uuid4()),
                    owner_type="brand_centroid",
                    owner_id=brand_id,
                    vector_ref=embed_data["vector_ref"],
                    model_name=embed_data["model_name"],
                    dimension=embed_data["dimension"],
                    created_at=datetime.now(timezone.utc)
                )
                db.add(embedding_record)
                db.commit()
        except (httpx.ConnectError, httpx.TimeoutException) as exc:
            logger.warning(f"Failed to embed brand centroid text for {brand_id}: {exc}")
            embed_errors += 1

    db.refresh(brand)

    return BrandOut.model_validate(brand)

@router.post(
    "/{brand_id}/reference-images",
    status_code=status.HTTP_201_CREATED,
    summary="Upload brand reference images to form an image centroid",
)
async def upload_reference_images(
    brand_id: str,
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if brand is None:
        raise HTTPException(status_code=404, detail="Brand not found.")

    files = []
    for f in images:
        content = await f.read()
        files.append(("files", (f.filename, content, f.content_type)))

    owner_type = "brand_centroid_image"
    faiss_owner = f"{owner_type}:{brand_id}"

    try:
        async with _worker_client() as client:
            resp = await client.post(
                "/internal/embed-image-centroid",
                params={"owner": faiss_owner},
                files=files
            )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        _handle_worker_error(exc, "embed-image-centroid")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"agent-worker returned {resp.status_code}: {resp.text}",
        )

    embed_data = resp.json()

    # Clear old brand image centroid if it exists
    db.query(Embedding).filter(Embedding.owner_id == brand_id, Embedding.owner_type == owner_type).delete()

    embedding_record = Embedding(
        id=str(uuid.uuid4()),
        owner_type=owner_type,
        owner_id=brand_id,
        vector_ref=embed_data["vector_ref"],
        model_name=embed_data["model_name"],
        dimension=embed_data["dimension"],
        created_at=datetime.now(timezone.utc)
    )
    db.add(embedding_record)
    db.commit()

    return {"status": "success", "vector_ref": faiss_owner}



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
    content: Optional[str] = Form(None),
    modality: str = Form("text"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
) -> ScoreResultOut:
    import json
    
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

    # Fetch active trajectory if it exists
    active_trajectory = db.query(BrandTrajectory).filter(
        BrandTrajectory.brand_id == brand_id,
        BrandTrajectory.status == "active"
    ).first()

    target_identity_card_dict = None
    blend_weight = 0.0

    if active_trajectory:
        target_identity_card_dict = {
            "tone_words": active_trajectory.target_tone_words or [],
            "vocabulary": active_trajectory.target_vocabulary or [],
            "core_values": active_trajectory.target_core_values or []
        }
        blend_weight = active_trajectory.blend_weight

    if modality == "pdf":
        if not file:
            raise HTTPException(status_code=400, detail="No PDF file provided.")
        pdf_bytes = await file.read()
        extracted_text = extract_text_from_pdf(pdf_bytes)
        if not extracted_text:
            raise HTTPException(
                status_code=400,
                detail="This PDF has no extractable text — try uploading it as an image instead"
            )
        content = extracted_text

    # ── 2. Call agent-worker /internal/score ──────────────────────────────────
    try:
        async with _worker_client() as client:
            form_data = {
                "modality": "text" if modality == "pdf" else modality,
                "brand_identity_card": json.dumps(identity_card_dict),
                "blend_weight": str(blend_weight),
            }
            if content:
                form_data["content"] = content
            if target_identity_card_dict:
                form_data["target_identity_card"] = json.dumps(target_identity_card_dict)
                
            files = None
            if modality == "image" and file:
                image_bytes = await file.read()
                files = {"file": (file.filename, image_bytes, file.content_type)}
            
            resp = await client.post(
                "/internal/score",
                data=form_data,
                files=files
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
        modality=modality if modality in ("text", "image", "pdf") else "text",
        raw_content=file.filename if (modality == "image" and file) else (content or ""),
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

    # ── 4. Persist agent trace steps (one per stage) ──────────────────────────
    now = datetime.now(timezone.utc)
    content_snippet = (file.filename if (modality == "image" and file) else (content or ""))
    content_snippet = content_snippet[:120] + ("…" if len(content_snippet) > 120 else "")
    flagged_count   = len(result_data.get("flagged_phrases", []))
    rewrite_snippet = rewrite_text[:120] + ("…" if len(rewrite_text) > 120 else "") if rewrite_text else ""

    trace_steps = [
        AgentTraceStep(
            id=str(uuid.uuid4()),
            content_id=content_id,
            agent_name="embedding",
            input_snippet=content_snippet,
            output_snippet=f"Embedded {len(content_snippet)} chars → 384-dim vector (all-MiniLM-L6-v2)",
            status="done",
            started_at=now,
            completed_at=now,
        ),
        AgentTraceStep(
            id=str(uuid.uuid4()),
            content_id=content_id,
            agent_name="scoring",
            input_snippet=f"brand_id={brand_id}",
            output_snippet=(
                f"consistency={result_data.get('consistency_score', 0):.2f}, "
                f"distinctiveness={result_data.get('distinctiveness_score', 0):.2f}, "
                f"quadrant={result_data.get('quadrant', 'unknown')}"
            ),
            status="done",
            started_at=now,
            completed_at=now,
        ),
        AgentTraceStep(
            id=str(uuid.uuid4()),
            content_id=content_id,
            agent_name="critic",
            input_snippet=content_snippet,
            output_snippet=f"Flagged {flagged_count} phrase(s): " + ", ".join(
                f"\"{fp.get('phrase', '')}\"" for fp in result_data.get("flagged_phrases", [])[:3]
            ),
            status="done",
            started_at=now,
            completed_at=now,
        ),
        AgentTraceStep(
            id=str(uuid.uuid4()),
            content_id=content_id,
            agent_name="suggestion",
            input_snippet=f"Rewriting {flagged_count} flagged span(s)",
            output_snippet=rewrite_snippet or "No rewrite generated",
            status="done",
            started_at=now,
            completed_at=now,
        ),
    ]

    for step in trace_steps:
        db.add(step)

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


# ── POST /brands/{id}/trajectory/chat ────────────────────────────────────────

@router.post(
    "/{brand_id}/trajectory/chat",
    response_model=TrajectoryChatResponse,
    summary="Chat with the Trajectory Agent",
)
async def trajectory_chat(
    brand_id: str,
    payload: TrajectoryChatRequest,
    db: Session = Depends(get_db),
) -> TrajectoryChatResponse:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand or not brand.identity_card:
        raise HTTPException(status_code=404, detail="Brand or identity card not found.")
    
    card = brand.identity_card
    identity_card_dict = {
        "tone_words": card.tone_words,
        "vocabulary": card.vocabulary,
        "core_values": card.core_values,
    }

    try:
        async with _worker_client() as client:
            resp = await client.post(
                "/internal/trajectory/chat",
                json={
                    "chat_history": payload.chat_history,
                    "current_identity_card": identity_card_dict,
                },
            )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        _handle_worker_error(exc, "trajectory/chat")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"agent-worker returned {resp.status_code} during trajectory chat.",
        )

    data = resp.json()
    return TrajectoryChatResponse(**data)


# ── POST /brands/{id}/trajectory/confirm ─────────────────────────────────────

@router.post(
    "/{brand_id}/trajectory/confirm",
    response_model=BrandTrajectoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Confirm and start a new brand trajectory",
)
def trajectory_confirm(
    brand_id: str,
    payload: TrajectoryConfirmRequest,
    db: Session = Depends(get_db),
) -> BrandTrajectoryOut:
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found.")

    # Mark existing active trajectories as abandoned
    existing_active = db.query(BrandTrajectory).filter(
        BrandTrajectory.brand_id == brand_id,
        BrandTrajectory.status == "active"
    ).all()
    for traj in existing_active:
        traj.status = "abandoned"
        traj.updated_at = datetime.now(timezone.utc)

    # Create new active trajectory
    new_trajectory = BrandTrajectory(
        id=str(uuid.uuid4()),
        brand_id=brand_id,
        target_tone_words=payload.target_tone_words,
        target_vocabulary=payload.target_vocabulary,
        target_core_values=payload.target_core_values,
        blend_weight=0.2, # Start blended slightly towards the target
        chat_transcript=payload.chat_transcript,
        status="active",
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_trajectory)
    db.commit()
    db.refresh(new_trajectory)

    return BrandTrajectoryOut.model_validate(new_trajectory)
