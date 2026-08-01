"""
scoring/engine.py
─────────────────
Full scoring engine — implements TRD §6, steps 1–6.

Public API:
    cosine_similarity(vec_a, vec_b) -> float
    classify_quadrant(consistency, distinctiveness, threshold) -> str
    score_content(content_text, brand_corpus, generic_corpus) -> ScoringResult

TRD §6 steps implemented here:
  1. Embed brand corpus → average → brand centroid          (compute_centroid)
  2. Embed generic corpus → average → generic centroid      (compute_centroid)
  3. Embed the new content item                             (embed_texts)
  4. consistency    = cosine_similarity(content, brand_centroid)
  5. distinctiveness = 1 − cosine_similarity(content, generic_centroid)
  6. Classify into one of four quadrants using threshold=0.5

No external API keys needed for any of the above.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import List

import numpy as np

from app.scoring.embedder import embed_texts, compute_centroid

logger = logging.getLogger(__name__)

# ── Quadrant classification ────────────────────────────────────────────────────

QUADRANT_THRESHOLD = 0.5  # TRD §6: "using a threshold (e.g. 0.5) on each axis"

# Quadrant layout (TRD §4.2):
#
#                 High distinctiveness
#                        │
#        bold_off_brand  │  on_brand
#  ─────────────────────┼─────────────── High consistency
#        off_brand       │  safe_generic
#                        │
#                 Low distinctiveness


def classify_quadrant(
    consistency: float,
    distinctiveness: float,
    threshold: float = QUADRANT_THRESHOLD,
) -> str:
    """
    Map the two-axis scores to one of four quadrant labels.

    TRD §6, step 6:
        "Classify into one of four quadrants using a threshold (e.g. 0.5)
         on each axis."

    Args:
        consistency:     Cosine similarity vs brand centroid (0–1).
        distinctiveness: 1 − cosine similarity vs generic centroid (0–1).
        threshold:       Decision boundary on each axis (default 0.5).

    Returns:
        One of: "on_brand" | "safe_generic" | "bold_off_brand" | "off_brand"
    """
    high_consistency    = consistency    >= threshold
    high_distinctiveness = distinctiveness >= threshold

    if high_consistency and high_distinctiveness:
        return "on_brand"
    elif high_consistency and not high_distinctiveness:
        return "safe_generic"
    elif not high_consistency and high_distinctiveness:
        return "bold_off_brand"
    else:
        return "off_brand"


# ── Cosine similarity primitive ────────────────────────────────────────────────

def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.

    Because embed_texts() always L2-normalises its output, this is mathematically
    equivalent to a plain dot product for vectors coming from the embedder.
    The full formula is implemented here anyway for correctness when called with
    arbitrary (non-normalised) vectors.

    Args:
        vec_a: 1-D numpy array.
        vec_b: 1-D numpy array of the same dimensionality.

    Returns:
        Float in [−1, 1]; clamped to [0, 1] for score reporting.

    Raises:
        ValueError: If either vector has near-zero norm.
    """
    a = vec_a.ravel().astype(np.float64)
    b = vec_b.ravel().astype(np.float64)

    norm_a = float(np.linalg.norm(a))
    norm_b = float(np.linalg.norm(b))

    if norm_a < 1e-10 or norm_b < 1e-10:
        raise ValueError(
            "cosine_similarity: one or both input vectors have near-zero norm."
        )

    sim = float(np.dot(a, b) / (norm_a * norm_b))
    # Clamp floating-point noise to valid range
    return float(np.clip(sim, -1.0, 1.0))


# ── Result dataclass ───────────────────────────────────────────────────────────

@dataclass
class ScoringResult:
    """
    Full output of score_content().  Mirrors TRD §4.2 Content Score Result
    for the fields that are computable without LLM calls (flagged_phrases and
    suggested_rewrite are added later by the Critic / Suggestion agents).
    """
    consistency_score:    float
    distinctiveness_score: float
    quadrant:             str
    # Intermediate vectors stored for debugging / logging
    content_vector:       np.ndarray = field(repr=False)
    brand_centroid:       np.ndarray = field(repr=False)
    generic_centroid:     np.ndarray = field(repr=False)

    def to_dict(self) -> dict:
        """Serialisable summary (vectors excluded)."""
        return {
            "consistency_score":    round(self.consistency_score, 4),
            "distinctiveness_score": round(self.distinctiveness_score, 4),
            "quadrant":             self.quadrant,
        }


# ── Full scoring function ──────────────────────────────────────────────────────

def score_content(
    content_text: str,
    brand_corpus: List[str],
    generic_corpus: List[str],
    threshold: float = QUADRANT_THRESHOLD,
) -> ScoringResult:
    """
    Run the full two-axis scoring pipeline from TRD §6, steps 1–6.

    Step 1: Embed brand corpus, average → brand centroid.
    Step 2: Embed generic corpus, average → generic centroid.
    Step 3: Embed the content item.
    Step 4: consistency    = cosine_similarity(content_vector, brand_centroid).
    Step 5: distinctiveness = 1 − cosine_similarity(content_vector, generic_centroid).
    Step 6: Classify quadrant using threshold on each axis.

    Args:
        content_text:    The new content item to evaluate (text string).
        brand_corpus:    List of text strings representing the brand's own past
                         content (used to build the brand centroid).
        generic_corpus:  List of text strings representing generic / category
                         content (used to build the generic centroid).
        threshold:       Quadrant classification threshold (default 0.5).

    Returns:
        ScoringResult with consistency, distinctiveness, quadrant, and the
        intermediate vectors for debugging.

    Raises:
        ValueError: If either corpus is empty, or content_text is blank.
    """
    if not content_text or not content_text.strip():
        raise ValueError("score_content: content_text must not be empty.")
    if not brand_corpus:
        raise ValueError("score_content: brand_corpus must not be empty.")
    if not generic_corpus:
        raise ValueError("score_content: generic_corpus must not be empty.")

    logger.info(
        "Scoring content (%d chars) against brand corpus (%d docs) "
        "and generic corpus (%d docs)",
        len(content_text), len(brand_corpus), len(generic_corpus),
    )

    # ── Step 1: Brand centroid ────────────────────────────────────────────────
    brand_centroid = compute_centroid(brand_corpus)
    logger.debug("Brand centroid computed. Shape: %s", brand_centroid.shape)

    # ── Step 2: Generic centroid ──────────────────────────────────────────────
    generic_centroid = compute_centroid(generic_corpus)
    logger.debug("Generic centroid computed. Shape: %s", generic_centroid.shape)

    # ── Step 3: Embed the content item ────────────────────────────────────────
    content_vectors = embed_texts([content_text])   # shape (1, 384)
    content_vector  = content_vectors[0]            # shape (384,)
    logger.debug("Content vector computed. Shape: %s", content_vector.shape)

    # ── Step 4: Consistency score ─────────────────────────────────────────────
    raw_consistency = cosine_similarity(content_vector, brand_centroid)
    # Clamp to [0, 1] — cosine can technically be negative, but for
    # human-written text it is almost always positive.
    consistency = float(np.clip(raw_consistency, 0.0, 1.0))

    # ── Step 5: Distinctiveness score ─────────────────────────────────────────
    raw_generic_sim = cosine_similarity(content_vector, generic_centroid)
    raw_generic_sim = float(np.clip(raw_generic_sim, 0.0, 1.0))
    # TRD §6 step 5: "Distinctiveness = 1 − cosine_similarity(content_vector, generic_centroid)"
    distinctiveness = 1.0 - raw_generic_sim

    # ── Step 6: Quadrant classification ──────────────────────────────────────
    quadrant = classify_quadrant(consistency, distinctiveness, threshold)

    logger.info(
        "Score result — consistency=%.4f, distinctiveness=%.4f, quadrant=%s",
        consistency, distinctiveness, quadrant,
    )

    return ScoringResult(
        consistency_score=consistency,
        distinctiveness_score=distinctiveness,
        quadrant=quadrant,
        content_vector=content_vector,
        brand_centroid=brand_centroid,
        generic_centroid=generic_centroid,
    )
