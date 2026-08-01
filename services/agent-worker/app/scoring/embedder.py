"""
scoring/embedder.py
───────────────────
Embedding layer — wraps sentence-transformers (all-MiniLM-L6-v2).

Responsibilities (TRD §2.1 — Embedding Layer):
  • Convert text into 384-dim vectors.
  • Provide compute_centroid() to average a list of vectors into a single
    representative centroid (used for both brand centroid and generic centroid).

Design notes:
  • The model is loaded once at module import time (singleton pattern).
    Cold start takes ~2 s on first container boot; subsequent calls are fast.
  • encode() uses normalize_embeddings=True so every output vector has L2
    norm = 1, which makes cosine_similarity reducible to a plain dot product
    (no division needed).  This is important for the FAISS IndexFlatIP index.
  • numpy is the only dependency beyond sentence-transformers — no torch
    import needed explicitly (sentence-transformers pulls it in).
"""
from __future__ import annotations

import logging
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# ── Model singleton ────────────────────────────────────────────────────────────

MODEL_NAME = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384  # fixed for all-MiniLM-L6-v2

logger.info("Loading sentence-transformer model: %s", MODEL_NAME)
_model = SentenceTransformer(MODEL_NAME)
logger.info("Model loaded. Embedding dimension: %d", EMBEDDING_DIM)


# ── Public functions ───────────────────────────────────────────────────────────

def embed_texts(texts: List[str]) -> np.ndarray:
    """
    Embed a list of strings into L2-normalised 384-dim vectors.

    Args:
        texts: Non-empty list of strings to encode.

    Returns:
        np.ndarray of shape (len(texts), 384), dtype float32, L2-normalised.

    Raises:
        ValueError: If texts is empty.
    """
    if not texts:
        raise ValueError("embed_texts: texts list must not be empty.")

    vectors: np.ndarray = _model.encode(
        texts,
        normalize_embeddings=True,   # L2-normalise → cosine ≡ dot product
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return vectors.astype(np.float32)


def compute_centroid(text_list: List[str]) -> np.ndarray:
    """
    Embed a list of texts and average them into a single centroid vector.

    TRD §6, steps 1–2:
        "Embed the brand's historical content → average into a single brand
         centroid vector."
        "Embed a small curated generic/competitor corpus → average into a
         generic centroid vector."

    The resulting vector is re-normalised after averaging so it stays on the
    unit hypersphere (required for cosine_similarity to remain in [0, 1]).

    Args:
        text_list: One or more strings representing the corpus to average.

    Returns:
        np.ndarray of shape (384,), dtype float32, L2-normalised.

    Raises:
        ValueError: If text_list is empty.
    """
    if not text_list:
        raise ValueError("compute_centroid: text_list must not be empty.")

    vectors = embed_texts(text_list)          # (N, 384)
    centroid = vectors.mean(axis=0)           # (384,) — arithmetic mean

    # Re-normalise after averaging (the mean of unit vectors is not itself
    # a unit vector unless all vectors are identical).
    norm = float(np.linalg.norm(centroid))
    if norm < 1e-10:
        raise ValueError("compute_centroid: degenerate centroid (near-zero norm).")
    centroid = centroid / norm                # L2-normalise

    return centroid.astype(np.float32)
