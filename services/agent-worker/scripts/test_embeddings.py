"""
scripts/test_embeddings.py
──────────────────────────
Standalone test script that confirms embedding and scoring behaviour is sane.
Run from the services/agent-worker directory:

    python scripts/test_embeddings.py

Expected output shows:
  1. Primitive test: sentences about similar topics score higher than unrelated ones.
  2. Centroid test: a corpus average is closer to its own members than to strangers.
  3. Full pipeline test (score_content): scores and quadrant classification printed.
  4. Quadrant boundary test: verifies threshold logic for all four quadrants.

No pytest dependency — runs with plain python.
"""
import sys
import os

# Allow running from the services/agent-worker/ directory without installing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import numpy as np
from app.scoring.embedder import embed_texts, compute_centroid
from app.scoring.engine import cosine_similarity, classify_quadrant, score_content

# ── ANSI colours for terminal readability ──────────────────────────────────────

GREEN  = "\033[32m"
YELLOW = "\033[33m"
CYAN   = "\033[36m"
RESET  = "\033[0m"
BOLD   = "\033[1m"


def section(title: str) -> None:
    print(f"\n{BOLD}{CYAN}{'─'*60}{RESET}")
    print(f"{BOLD}{CYAN}  {title}{RESET}")
    print(f"{BOLD}{CYAN}{'─'*60}{RESET}")


def check(label: str, condition: bool, detail: str = "") -> None:
    icon = f"{GREEN}✓{RESET}" if condition else f"\033[31m✗{RESET}"
    detail_str = f"  {YELLOW}{detail}{RESET}" if detail else ""
    print(f"  {icon}  {label}{detail_str}")
    if not condition:
        sys.exit(1)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Primitive similarity test
# ─────────────────────────────────────────────────────────────────────────────

section("1 · Primitive cosine_similarity")

sentences = [
    "Our brand stands for craft, authenticity, and accountability.",   # S0 — on-brand
    "We are built for the long game — no shortcuts, just results.",    # S1 — on-brand variant
    "Best-in-class innovative solutions leveraging cutting-edge AI.",  # S2 — generic
    "Fresh pasta recipes with garlic and olive oil.",                  # S3 — totally unrelated
]

vecs = embed_texts(sentences)
print(f"\n  Embedding shape: {vecs.shape}  (expect (4, 384))")
check("Shape is (4, 384)", vecs.shape == (4, 384), str(vecs.shape))

sim_01 = cosine_similarity(vecs[0], vecs[1])  # both on-brand → high
sim_02 = cosine_similarity(vecs[0], vecs[2])  # on-brand vs generic → medium
sim_03 = cosine_similarity(vecs[0], vecs[3])  # on-brand vs pasta → low

print(f"\n  Similarity S0↔S1 (on-brand pair):      {sim_01:.4f}  (expect high, > 0.5)")
print(f"  Similarity S0↔S2 (on-brand vs generic): {sim_02:.4f}  (expect medium)")
print(f"  Similarity S0↔S3 (on-brand vs pasta):   {sim_03:.4f}  (expect low, < S0↔S2)")

check("S0↔S1 > S0↔S2 (similar > dissimilar)", sim_01 > sim_02,
      f"{sim_01:.4f} > {sim_02:.4f}")
check("S0↔S2 > S0↔S3 (medium > unrelated)", sim_02 > sim_03,
      f"{sim_02:.4f} > {sim_03:.4f}")
check("All similarities in [0, 1]",
      all(0.0 <= s <= 1.0 for s in [sim_01, sim_02, sim_03]))


# ─────────────────────────────────────────────────────────────────────────────
# 2. Centroid test
# ─────────────────────────────────────────────────────────────────────────────

section("2 · compute_centroid")

brand_corpus = [
    "The seal of authenticity is at the heart of everything we make.",
    "Built for the long game — craft and accountability, not shortcuts.",
    "Unmistakably ours: editorial, precise, warm.",
]
generic_corpus = [
    "Leverage cutting-edge synergies for best-in-class results.",
    "Our innovative solutions deliver seamless experiences at scale.",
    "Disrupting the market with next-generation AI-powered platforms.",
]

brand_centroid   = compute_centroid(brand_corpus)
generic_centroid = compute_centroid(generic_corpus)
content_vec      = embed_texts(["Built for the long game, earned not borrowed."])[0]

brand_sim   = cosine_similarity(content_vec, brand_centroid)
generic_sim = cosine_similarity(content_vec, generic_centroid)

print(f"\n  On-brand content vs brand centroid:   {brand_sim:.4f}  (expect higher)")
print(f"  On-brand content vs generic centroid: {generic_sim:.4f}  (expect lower)")

check("Brand centroid closer to on-brand content", brand_sim > generic_sim,
      f"{brand_sim:.4f} > {generic_sim:.4f}")

# Also check centroid shape
check("Centroid shape is (384,)", brand_centroid.shape == (384,), str(brand_centroid.shape))
check("Centroid is L2-normalised (norm ≈ 1)",
      abs(float(np.linalg.norm(brand_centroid)) - 1.0) < 1e-5,
      f"norm = {float(np.linalg.norm(brand_centroid)):.6f}")


# ─────────────────────────────────────────────────────────────────────────────
# 3. Full pipeline — score_content (TRD §6 steps 1–6)
# ─────────────────────────────────────────────────────────────────────────────

section("3 · score_content — full pipeline (TRD §6)")

test_cases = [
    {
        "label": "On-brand content (expect on_brand or safe_generic)",
        "content": "Built for the long game — earned, not borrowed. The seal of accountability.",
        "expect_quadrants": ["on_brand", "safe_generic"],
    },
    {
        "label": "Generic buzzword content (expect safe_generic or off_brand)",
        "content": "Our cutting-edge, best-in-class solution delivers seamless experiences.",
        "expect_quadrants": ["safe_generic", "off_brand", "bold_off_brand"],
    },
]

for tc in test_cases:
    result = score_content(
        content_text=tc["content"],
        brand_corpus=brand_corpus,
        generic_corpus=generic_corpus,
    )
    d = result.to_dict()
    print(f"\n  [{tc['label']}]")
    print(f"    consistency    = {d['consistency_score']:.4f}")
    print(f"    distinctiveness = {d['distinctiveness_score']:.4f}")
    print(f"    quadrant        = {d['quadrant']}")
    check(
        f"Quadrant is one of {tc['expect_quadrants']}",
        d["quadrant"] in tc["expect_quadrants"],
        d["quadrant"],
    )
    check("Scores in [0, 1]",
          0.0 <= d["consistency_score"] <= 1.0 and 0.0 <= d["distinctiveness_score"] <= 1.0)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Quadrant boundary / classify_quadrant unit tests
# ─────────────────────────────────────────────────────────────────────────────

section("4 · classify_quadrant — boundary cases")

boundary_cases = [
    (0.8, 0.8, "on_brand"),
    (0.8, 0.2, "safe_generic"),
    (0.2, 0.8, "bold_off_brand"),
    (0.2, 0.2, "off_brand"),
    # Edge: exactly on threshold → high side
    (0.5, 0.5, "on_brand"),
]

for cons, dist, expected in boundary_cases:
    got = classify_quadrant(cons, dist, threshold=0.5)
    check(
        f"classify_quadrant({cons}, {dist}) == '{expected}'",
        got == expected,
        f"got '{got}'",
    )


# ─────────────────────────────────────────────────────────────────────────────

print(f"\n{BOLD}{GREEN}All checks passed.{RESET}\n")
