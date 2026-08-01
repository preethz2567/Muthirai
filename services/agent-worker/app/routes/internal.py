"""
Internal HTTP endpoints called exclusively by services/api.
No database access — pure request-in, response-out (TRD section 2.1).

Routes:
  POST /internal/ingest  — returns a Brand Identity Card (TRD 4.1 shape)
  POST /internal/score   — returns a Content Score Result (TRD 4.2 shape)

Currently returns realistic fixture data. Real logic (embedding + LLM calls)
will be wired in subsequent prompts without changing the response contracts.
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from app.schemas.brand_identity_card import BrandIdentityCard, VisualTokens
from app.schemas.content_score_result import ContentScoreResult, FlaggedPhrase

router = APIRouter()


# ── Request models ─────────────────────────────────────────────────────────────

from pydantic import BaseModel, Field
from typing import Any, List, Dict


class IngestRequest(BaseModel):
    """Input for POST /internal/ingest."""
    source_text: str = Field(
        description="Raw text extracted from the brand's website or uploaded content"
    )


class ScoreRequest(BaseModel):
    """Input for POST /internal/score."""
    content: str = Field(description="The text content to be scored")
    brand_identity_card: dict[str, Any] = Field(
        description="The brand's identity card (TRD 4.1 shape) to score against"
    )
    target_identity_card: dict[str, Any] | None = Field(
        default=None,
        description="The brand's target identity card, if a trajectory is active"
    )
    blend_weight: float = Field(
        default=0.0,
        description="Weight of the target identity card in the centroid (0 to 1)"
    )

class TrajectoryChatRequest(BaseModel):
    """Input for POST /internal/trajectory/chat."""
    chat_history: List[Dict[str, str]] = Field(description="Chat messages")
    current_identity_card: dict[str, Any] = Field(description="The brand's current identity card")

class EmbedRequest(BaseModel):
    """Input for POST /internal/embed."""
    text: str = Field(description="The text to embed")
    owner: str = Field(description="Owner string (e.g. brand_centroid:uuid)")

class EmbedResponse(BaseModel):
    """Output for POST /internal/embed."""
    vector_ref: str
    dimension: int
    model_name: str



# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post(
    "/ingest",
    response_model=BrandIdentityCard,
    summary="Extract a Brand Identity Card from source text",
    description=(
        "Ingestion Agent endpoint. Receives raw source text and returns a structured "
        "Brand Identity Card (TRD section 4.1). "
        "Uses the LLM client to parse the text. On failure, returns a fallback fixture."
    ),
)
async def ingest(payload: IngestRequest) -> BrandIdentityCard:
    from app.agents.ingestion_agent import extract_brand_identity
    
    return extract_brand_identity(payload.source_text)

@router.post(
    "/trajectory/chat",
    summary="Propose an updated trajectory card based on chat",
    description="Trajectory Agent endpoint. Interprets user request to evolve the brand identity.",
)
async def trajectory_chat(payload: TrajectoryChatRequest) -> dict:
    from app.agents.trajectory_agent import propose_trajectory
    
    return propose_trajectory(payload.chat_history, payload.current_identity_card)

@router.post(
    "/embed",
    response_model=EmbedResponse,
    summary="Compute and persist an embedding to FAISS",
)
async def embed_text(payload: EmbedRequest) -> EmbedResponse:
    from app.scoring.embedder import embed_texts, EMBEDDING_DIM
    from app.scoring.vector_store import add_vectors

    # Generate single embedding, shape (1, D)
    vec = embed_texts([payload.text])
    
    # Store in FAISS
    add_vectors(payload.owner, vec)

    return EmbedResponse(
        vector_ref=payload.owner,
        dimension=EMBEDDING_DIM,
        model_name="all-MiniLM-L6-v2"
    )

@router.post(
    "/embed-image-centroid",
    response_model=EmbedResponse,
    summary="Compute and persist an image centroid to FAISS",
)
async def embed_image_centroid(owner: str, files: List[UploadFile] = File(...)) -> EmbedResponse:
    from app.scoring.image_embedder import compute_image_centroid, EMBEDDING_DIM as IMG_DIM
    from app.scoring.vector_store import add_vectors

    # Read all files to bytes
    images_bytes = []
    for f in files:
        images_bytes.append(await f.read())

    # Generate single centroid vector, shape (1, D)
    vec = compute_image_centroid(images_bytes)
    import numpy as np
    vec_2d = np.array([vec], dtype=np.float32)
    
    # Store in FAISS
    add_vectors(owner, vec_2d)

    return EmbedResponse(
        vector_ref=owner,
        dimension=IMG_DIM,
        model_name="clip-vit-base-patch32"
    )





@router.post(
    "/score",
    response_model=ContentScoreResult,
    summary="Score a piece of content against a brand identity card",
)
async def score(
    content: str = Form(None),
    modality: str = Form("text"),
    brand_identity_card: str = Form(...),
    target_identity_card: str = Form(None),
    blend_weight: float = Form(0.0),
    file: UploadFile = File(None)
) -> ContentScoreResult:
    import json
    import asyncio
    import numpy as np
    from app.scoring.vector_store import search_nearest, list_owners
    
    brand_card_dict = json.loads(brand_identity_card)
    brand_id = brand_card_dict.get("brand_id", str(uuid.uuid4()))

    if modality == "image":
        if not file:
            raise HTTPException(status_code=400, detail="file is required for image modality")
        image_bytes = await file.read()
        from app.scoring.image_embedder import compute_image_centroid
        content_vec = compute_image_centroid([image_bytes]) # shape (512,)
        brand_prefix = "brand_centroid_image:"
        generic_prefix = "generic_centroid_image:"
        content_for_response = file.filename or "image.jpg"
    else:
        from app.scoring.embedder import embed_texts
        content_vec = embed_texts([content])[0]  # shape (384,)
        brand_prefix = "brand_centroid:"
        generic_prefix = "generic_centroid:"
        content_for_response = content

    brand_owner = f"{brand_prefix}{brand_id}"
    brand_distances, _ = search_nearest(brand_owner, content_vec, k=1)
    if brand_distances.size > 0 and brand_distances[0].size > 0:
        consistency_score = float(np.clip(brand_distances[0][0], 0.0, 1.0))
    else:
        raise HTTPException(
            status_code=500, 
            detail=f"Missing brand centroid for brand {brand_id}."
        )

    all_owners = list_owners()
    
    if modality == "image":
        generic_owners = [o for o in all_owners if o.startswith(generic_prefix)]
    else:
        generic_owners = [o for o in all_owners if o.startswith(generic_prefix) and not o.startswith("generic_centroid_image")]

    from app.scoring.vector_store import INDEX_DIR
    
    prefix_underscore = generic_prefix.replace(':', '_')
    for fpath in INDEX_DIR.glob(f"{prefix_underscore}*.bin"):
        # For text: we don't want to include generic_centroid_image when globbing generic_centroid_*
        if modality == "text" and fpath.stem.startswith("generic_centroid_image"):
            continue
        key = fpath.stem.replace(prefix_underscore, generic_prefix, 1)
        if key not in all_owners:
            generic_owners.append(key)

    generic_sims: list[float] = []
    for owner in generic_owners:
        dists, _ = search_nearest(owner, content_vec, k=1)
        if dists.size > 0 and dists[0].size > 0:
            generic_sims.append(float(dists[0][0]))

    if not generic_sims:
        raise HTTPException(
            status_code=500,
            detail="Missing generic centroids: database must be seeded before scoring content."
        )
    max_generic_sim = float(np.max(generic_sims))
    distinctiveness_score = float(np.clip(1.0 - max_generic_sim, 0.0, 1.0))

    THRESHOLD = 0.40
    high_consistency   = consistency_score   >= THRESHOLD
    high_distinctiveness = distinctiveness_score >= THRESHOLD

    if high_consistency and high_distinctiveness:
        quadrant = "on_brand"
    elif high_consistency and not high_distinctiveness:
        quadrant = "safe_generic"
    elif not high_consistency and high_distinctiveness:
        quadrant = "bold_off_brand"
    else:
        quadrant = "off_brand"

    from app.agents.critic_agent import critique_content, critique_image
    from app.agents.suggestion_agent import suggest_rewrite, suggest_image_rewrite

    def _run_critic() -> list:
        if modality == "image":
            return critique_image(image_bytes, brand_card_dict)
        return critique_content(
            content=content,
            consistency_score=consistency_score,
            distinctiveness_score=distinctiveness_score,
            identity_card=brand_card_dict,
        )

    def _run_suggestion(flagged: list) -> str:
        if modality == "image":
            return suggest_image_rewrite(brand_card_dict)
        return suggest_rewrite(
            content=content,
            flagged_phrases=flagged,
            identity_card=brand_card_dict,
        )

    loop = asyncio.get_event_loop()

    flagged_phrases_raw = await loop.run_in_executor(None, _run_critic)
    suggested_rewrite_text = await loop.run_in_executor(
        None, _run_suggestion, flagged_phrases_raw
    )

    flagged_phrase_models = [
        FlaggedPhrase(
            phrase=fp.get("phrase", ""),
            reason=fp.get("reason", ""),
        )
        for fp in flagged_phrases_raw
        if isinstance(fp, dict) and fp.get("phrase")
    ]

    return ContentScoreResult(
        content_id=str(uuid.uuid4()),
        brand_id=brand_id,
        modality=modality,
        consistency_score=consistency_score,
        distinctiveness_score=distinctiveness_score,
        quadrant=quadrant,
        flagged_phrases=flagged_phrase_models,
        suggested_rewrite=suggested_rewrite_text,
        scored_at=datetime.now(timezone.utc),
    )
