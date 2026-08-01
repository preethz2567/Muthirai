"""
scoring/image_embedder.py
─────────────────────────
Image Embedding layer — wraps huggingface transformers (CLIP ViT-B/32).

Responsibilities (TRD §2.1 — Embedding Layer):
  • Convert images into 512-dim vectors.
  • Provide compute_image_centroid() to average a list of image vectors into a single
    representative centroid (used for both brand centroid and generic centroid).

Design notes:
  • The model is loaded once at module import time (singleton pattern).
  • Output vectors are L2-normalised so every output vector has L2
    norm = 1, which makes cosine_similarity reducible to a plain dot product
    (no division needed).
"""
from __future__ import annotations

import io
import logging
from typing import List

import numpy as np
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

logger = logging.getLogger(__name__)

# ── Model singleton ────────────────────────────────────────────────────────────

MODEL_NAME = "openai/clip-vit-base-patch32"
EMBEDDING_DIM = 512  # fixed for clip-vit-base-patch32

logger.info("Loading CLIP model: %s", MODEL_NAME)
# Note: we disable gradient computation completely since this is inference-only
_model = CLIPModel.from_pretrained(MODEL_NAME).eval()
_processor = CLIPProcessor.from_pretrained(MODEL_NAME)
logger.info("CLIP Model loaded. Embedding dimension: %d", EMBEDDING_DIM)


# ── Public functions ───────────────────────────────────────────────────────────

def embed_images(images: List[bytes]) -> np.ndarray:
    """
    Embed a list of raw image bytes into L2-normalised 512-dim vectors.

    Args:
        images: Non-empty list of image bytes to encode.

    Returns:
        np.ndarray of shape (len(images), 512), dtype float32, L2-normalised.

    Raises:
        ValueError: If images list is empty or an image cannot be parsed.
    """
    if not images:
        raise ValueError("embed_images: images list must not be empty.")

    pil_images = []
    for i, img_bytes in enumerate(images):
        try:
            image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            pil_images.append(image)
        except Exception as e:
            raise ValueError(f"embed_images: failed to decode image at index {i}. {e}")

    # Process and encode
    inputs = _processor(images=pil_images, return_tensors="pt")
    
    # We do not need gradients for inference
    outputs = _model.get_image_features(**inputs)
    vectors = outputs.detach().numpy()

    # L2-normalise → cosine ≡ dot product
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    
    # Avoid division by zero for completely blank/black vectors (rare but possible)
    norms[norms < 1e-10] = 1e-10
    
    vectors_normalized = vectors / norms
    
    return vectors_normalized.astype(np.float32)


def compute_image_centroid(images: List[bytes]) -> np.ndarray:
    """
    Embed a list of images and average them into a single centroid vector.

    TRD §6, steps 1–2:
        "Embed the brand's historical content → average into a single brand
         centroid vector."
        "Embed a small curated generic/competitor corpus → average into a
         generic centroid vector."

    The resulting vector is re-normalised after averaging so it stays on the
    unit hypersphere (required for cosine_similarity to remain in [0, 1]).

    Args:
        images: One or more raw image bytes representing the corpus to average.

    Returns:
        np.ndarray of shape (512,), dtype float32, L2-normalised.

    Raises:
        ValueError: If images list is empty.
    """
    if not images:
        raise ValueError("compute_image_centroid: images must not be empty.")

    vectors = embed_images(images)            # (N, 512)
    centroid = vectors.mean(axis=0)           # (512,) — arithmetic mean

    # Re-normalise after averaging
    norm = float(np.linalg.norm(centroid))
    if norm < 1e-10:
        raise ValueError("compute_image_centroid: degenerate centroid (near-zero norm).")
    centroid = centroid / norm                # L2-normalise

    return centroid.astype(np.float32)
