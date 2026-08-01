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

from fastapi import APIRouter

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
    "/score",
    response_model=ContentScoreResult,
    summary="Score a piece of content against a brand identity card",
    description=(
        "Real pipeline: embed content → compute Consistency + Distinctiveness vs brand "
        "& generic centroids → classify quadrant → run Critic + Suggestion agents in "
        "parallel → return full Content Score Result (TRD section 4.2)."
    ),
)
async def score(payload: ScoreRequest) -> ContentScoreResult:
    """
    Real scoring pipeline (Prompt 13).

    Steps:
      1. Embed content text via sentence-transformers.
      2. Compute Consistency  = cosine_sim(content_vec, brand_centroid).
      3. Compute Distinctiveness = 1 – cosine_sim(content_vec, generic_centroid).
         Generic centroid is the average of all per-category generic centroids.
      4. Classify quadrant using 0.5 threshold on each axis.
      5. Run Critic Agent + Suggestion Agent in parallel (asyncio.gather).
      6. Return full TRD 4.2 ContentScoreResult.
    """
    import asyncio
    import numpy as np
    from app.scoring.embedder import embed_texts
    from app.scoring.vector_store import search_nearest, list_owners

    brand_id = payload.brand_identity_card.get("brand_id", str(uuid.uuid4()))

    # ── 1. Embed content ──────────────────────────────────────────────────────
    content_vec: np.ndarray = embed_texts([payload.content])[0]  # shape (384,)

    # ── 2. Consistency — cosine sim vs brand centroid ─────────────────────────
    brand_owner = f"brand_centroid:{brand_id}"
    brand_distances, _ = search_nearest(brand_owner, content_vec, k=1)
    if brand_distances.size > 0 and brand_distances[0].size > 0:
        consistency_score = float(np.clip(brand_distances[0][0], 0.0, 1.0))
    else:
        # No brand centroid stored yet — treat as fully inconsistent
        consistency_score = 0.0

    # ── 3. Distinctiveness — 1 – cosine sim vs generic centroid ──────────────
    # Aggregate all generic_centroid:* owners into a mean generic centroid.
    all_owners = list_owners()
    generic_owners = [o for o in all_owners if o.startswith("generic_centroid:")]

    # Also check disk-persisted indexes for any generic_centroid keys not yet
    # loaded in-memory (the store lazy-loads on first access, so one search
    # per key is enough to trigger the load).
    from app.scoring.vector_store import INDEX_DIR, _sanitize_owner
    for fpath in INDEX_DIR.glob("generic_centroid_*.bin"):
        key = fpath.stem.replace("_", ":", 1)  # reverse sanitise first colon only
        # normalise: generic_centroid_saas -> generic_centroid:saas
        key = key.replace("generic_centroid_", "generic_centroid:", 1)
        if key not in all_owners:
            generic_owners.append(key)

    generic_sims: list[float] = []
    for owner in generic_owners:
        dists, _ = search_nearest(owner, content_vec, k=1)
        if dists.size > 0 and dists[0].size > 0:
            generic_sims.append(float(dists[0][0]))

    if generic_sims:
        max_generic_sim = float(np.max(generic_sims))
        distinctiveness_score = float(np.clip(1.0 - max_generic_sim, 0.0, 1.0))
    else:
        # No generic centroids seeded yet — assume maximally distinctive
        distinctiveness_score = 1.0

    # ── 4. Classify quadrant (threshold = 0.5 on each axis) ──────────────────
    THRESHOLD = 0.5
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

    # ── 5. Critic + Suggestion agents in parallel ─────────────────────────────
    from app.agents.critic_agent import critique_content
    from app.agents.suggestion_agent import suggest_rewrite

    def _run_critic() -> list:
        return critique_content(
            content=payload.content,
            consistency_score=consistency_score,
            distinctiveness_score=distinctiveness_score,
            identity_card=payload.brand_identity_card,
        )

    def _run_suggestion(flagged: list) -> str:
        return suggest_rewrite(
            content=payload.content,
            flagged_phrases=flagged,
            identity_card=payload.brand_identity_card,
        )

    loop = asyncio.get_event_loop()

    # Run Critic in a thread (blocking LLM call) without blocking the event loop
    flagged_phrases_raw = await loop.run_in_executor(None, _run_critic)

    # Run Suggestion in parallel while Critic result is already available
    # (Suggestion needs the critic output, so it runs after but still async)
    suggested_rewrite_text = await loop.run_in_executor(
        None, _run_suggestion, flagged_phrases_raw
    )

    # ── 6. Build response ─────────────────────────────────────────────────────
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
        modality="text",
        consistency_score=consistency_score,
        distinctiveness_score=distinctiveness_score,
        quadrant=quadrant,
        flagged_phrases=flagged_phrase_models,
        suggested_rewrite=suggested_rewrite_text,
        scored_at=datetime.now(timezone.utc),
    )
