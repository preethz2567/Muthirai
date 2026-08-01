"""
scoring/vector_store.py
───────────────────────
In-process FAISS vector store (TRD §3 — "FAISS (in-process) or ChromaDB").

Responsibilities:
  • Hold a FAISS IndexFlatIP index per named corpus (brand centroid, generic
    centroid, and individual content embeddings).
  • Provide add() / search() helpers used by the scoring engine.

Design notes:
  • IndexFlatIP (inner product) works correctly with L2-normalised vectors:
    inner_product(a, b) == cosine_similarity(a, b) when ‖a‖=‖b‖=1.
  • A separate index is kept per owner_id string so different brands don't
    share index state.  For the hackathon scale this is perfectly fine; a
    production version would shard by brand and persist the index to disk.
  • No persistence is implemented here (in-process only) — matches TRD §8
    "Local dev: FAISS, in-process, index file on disk" but that serialisation
    is left for a later prompt.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Dict, List

import numpy as np
import faiss

from app.scoring.embedder import EMBEDDING_DIM

logger = logging.getLogger(__name__)

# ── In-memory registry of named FAISS indexes ─────────────────────────────────

# Each key is an arbitrary owner string, e.g. "brand:<brand_id>" or "generic".
_indexes: Dict[str, faiss.IndexFlatIP] = {}

INDEX_DIR = Path(os.getenv("FAISS_INDEX_DIR", "indexes"))
INDEX_DIR.mkdir(parents=True, exist_ok=True)

def _sanitize_owner(owner: str) -> str:
    return owner.replace(":", "_").replace("/", "_")

def _get_or_create(owner: str) -> faiss.IndexFlatIP:
    """Return the existing index for `owner`, load from disk if present, or create a new one."""
    if owner not in _indexes:
        file_path = INDEX_DIR / f"{_sanitize_owner(owner)}.bin"
        if file_path.exists():
            _indexes[owner] = faiss.read_index(str(file_path))
            logger.debug("Loaded FAISS index for owner '%s' from disk", owner)
        else:
            _indexes[owner] = faiss.IndexFlatIP(EMBEDDING_DIM)
            logger.debug("Created FAISS index for owner '%s'", owner)
    return _indexes[owner]

def _save_index(owner: str) -> None:
    if owner in _indexes:
        file_path = INDEX_DIR / f"{_sanitize_owner(owner)}.bin"
        faiss.write_index(_indexes[owner], str(file_path))
        logger.debug("Saved FAISS index for owner '%s' to disk", owner)


# ── Public helpers ─────────────────────────────────────────────────────────────

def add_vectors(owner: str, vectors: np.ndarray) -> None:
    """
    Add one or more L2-normalised vectors to the named index.

    Args:
        owner:   Arbitrary string key (e.g. "brand:abc", "generic:saas").
        vectors: np.ndarray of shape (N, EMBEDDING_DIM), dtype float32.
    """
    idx = _get_or_create(owner)
    idx.add(vectors)
    _save_index(owner)
    logger.debug("Added %d vector(s) to index '%s' (total: %d)", len(vectors), owner, idx.ntotal)


def search_nearest(owner: str, query: np.ndarray, k: int = 5):
    """
    Return the k nearest vectors in the named index to `query`.

    Args:
        owner: Index key.
        query: np.ndarray of shape (EMBEDDING_DIM,) or (1, EMBEDDING_DIM).
        k:     Number of results.

    Returns:
        (distances, indices) — FAISS standard output.
        distances are inner-product scores (= cosine similarity for normalised vecs).
    """
    idx = _get_or_create(owner)
    if idx.ntotal == 0:
        return np.array([[]], dtype=np.float32), np.array([[]], dtype=np.int64)

    q = query.reshape(1, -1).astype(np.float32)
    k = min(k, idx.ntotal)
    distances, indices = idx.search(q, k)
    return distances, indices


def index_size(owner: str) -> int:
    """Return the number of vectors stored under `owner`."""
    if owner not in _indexes:
        return 0
    return _indexes[owner].ntotal


def clear_index(owner: str) -> None:
    """Remove all vectors from the named index (useful in tests)."""
    if owner in _indexes:
        _indexes[owner].reset()
        _save_index(owner)
        logger.debug("Cleared index '%s'", owner)


def list_owners() -> List[str]:
    """Return all currently registered index keys."""
    return list(_indexes.keys())
