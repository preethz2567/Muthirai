# MUTHIRAI — Product Requirements Document
*the seal of a brand's true voice*
AI System for Brand Distinctiveness Validation — v1.0, Hackathon Build

---

## 1. Problem Statement

Multiple teams at this hackathon will build against the same brief: an AI system that measures and validates brand distinctiveness in AI-generated content, scoring text (and eventually images and video) against a brand's identity, and suggesting improvements.

The unspoken problem underneath the brief: generative AI is trained to produce statistically average output. Left unchecked, AI-assisted content production quietly erodes what makes a brand recognizable — not through any single bad post, but through a slow drift toward generic marketing language that could belong to any competitor in the category.

> **The real question Muthirai answers:** Not "is this content good?" but "does this content carry OUR seal, or could it belong to anyone?"

## 2. Vision & Product Thesis

Muthirai is an agentic AI system that ingests a brand's existing identity, builds a living fingerprint of its voice and visual language, and scores any new piece of content — human-written or AI-generated — on two independent axes grounded in established marketing science (Distinctive Brand Assets theory, Byron Sharp / Ehrenberg-Bass Institute), rather than a single opaque "brand score."

### Grounding theory
Marketing science draws a hard line between two properties brands need, and most AI content tools conflate them into one blurry score:
- **Distinctiveness** — does the content stand out from the category and competitors? Is it ownable and memorable?
- **Consistency** — does the content stay true to the brand's own established identity over time?

Muthirai measures both, separately, and plots content on a quadrant instead of a single number — because "safe but generic" and "bold but off-brand" are different failure modes that need different fixes.

## 3. Target Users

| User | Need |
|---|---|
| Brand / Marketing Managers | Verify AI-generated campaign content before it ships, without manually re-reading every style guide. |
| Content & Copywriting Teams | Get specific, actionable rewrite suggestions instead of a vague "this doesn't feel on-brand" note. |
| Agencies managing multiple clients | Switch context between very different brand voices without identity bleed between accounts. |
| Brand / Creative Directors | Track brand consistency and drift over time across an entire content pipeline, not just one asset. |

## 4. The Core Framework — Two-Axis Model

Every scored piece of content is placed on a quadrant defined by two independently computed axes:
1. **Consistency Score** — cosine similarity between the content's embedding and the brand's own historical content centroid (the "brand fingerprint").
2. **Distinctiveness Score** — the content's embedding distance from a "generic / category centroid" built from competitor and boilerplate marketing content.

### The four zones
| Zone | Meaning |
|---|---|
| On Brand (high / high) | Distinct from competitors AND true to the brand. The target zone. |
| Safe but Generic (low distinct. / high consist.) | Sounds like the brand, but so bland it could be anyone — the most common AI-content failure mode. |
| Bold but Off-Brand (high distinct. / low consist.) | Memorable, but has drifted from the brand's actual identity. |
| Off Brand (low / low) | Generic AND inconsistent — the worst outcome, flagged for full rewrite. |

## 5. Core Features

| Feature | What it does | Why it wins |
|---|---|---|
| Brand Identity Card (Auto-Extraction) | User pastes a website URL or uploads past content/style guide; an LLM agent extracts a structured identity: tone words, vocabulary, values, banned generic phrases, visual tokens. | Removes the tedious manual-questionnaire step every competing team will require — a strong live-demo moment ("brand identity in 60 seconds"). |
| Brand Fingerprint Engine | Embeds the brand's historical content into a vector centroid representing its authentic voice. | Turns abstract "brand voice" into a concrete, reusable mathematical object the rest of the system can score against. |
| Two-Axis Scoring Engine | Computes Distinctiveness and Consistency independently; plots content on the quadrant. | Grounded in real marketing science, not a made-up rubric — defensible in Q&A. |
| Critic Agent | LLM agent qualitatively reviews flagged content, naming the exact generic phrases dragging the score down. | Explainable, not a black box — judges can see *why*, not just *what*. |
| Suggestion / Rewrite Agent | Retrieves the brand's own lexicon via RAG and rewrites flagged passages to be more distinctive and consistent. | Closes the loop — Muthirai doesn't just diagnose, it prescribes. |
| Agent Trace View | UI panel showing the live multi-agent pipeline reasoning step by step. | Makes the technical depth visible during the demo instead of hidden behind an API call. |
| Brand Drift Dashboard | Tracks distinctiveness/consistency scores across multiple content pieces over time. | Reframes Muthirai from a one-off checker into an ongoing brand governance tool — the enterprise story. |
| Multimodal Scope (Image) | CLIP-based check of color palette, logo usage and visual style consistency for images. | Directly answers the brief's "potential to evaluate images and video" without overreaching the 2-day timeline. |

## 6. Unique Selling Points

- Two-axis quadrant model grounded in actual marketing science, not a single arbitrary "brand score."
- Zero manual setup — Brand Identity Card is auto-extracted from existing assets, not filled in by hand.
- Fully explainable — every score is traceable to specific flagged phrases and a visible agent reasoning trail.
- Closes the loop with actionable rewrites in the brand's own voice, not generic "improve your tone" advice.
- Positioned as an ongoing brand governance layer (drift dashboard, pipeline-gate potential) — not just a single-shot checker.
- Honest, staged multimodal scope: text rigorous and complete, image as a working demo, video explicitly scoped as roadmap.

## 7. User Flow

1. User creates a brand profile by pasting a URL or uploading past content → Muthirai auto-generates the Brand Identity Card.
2. User reviews / edits the extracted identity card (tone words, banned phrases, visual tokens).
3. User pastes or uploads new content (text, optionally image) for scoring.
4. Muthirai's agent pipeline scores the content on both axes and plots it on the quadrant.
5. Critic Agent lists the specific phrases/elements hurting the score.
6. Suggestion Agent proposes a rewrite in the brand's authentic voice.
7. Score is logged to the Drift Dashboard for that brand's ongoing history.

## 8. Success Metrics (Demo & Beyond)

| Metric | Target for demo |
|---|---|
| Brand Identity Card extraction time | Under 60 seconds from URL paste to structured card |
| Scoring latency per content piece | Under 10 seconds end-to-end |
| Explainability | Every score accompanied by at least one specific, named reason |
| Quadrant differentiation | Demo set includes at least one example in each of the 4 zones |
| Rewrite quality | Suggested rewrite visibly moves the content toward the "On Brand" zone on re-scoring |

## 9. Scope for the 2-Day Build

**In scope:**
- Text: full pipeline — ingestion, fingerprinting, two-axis scoring, critic, rewrite suggestions.
- Image: basic CLIP-based palette/style/logo consistency check.
- Drift dashboard with sample historical data.
- Agent trace UI for live demo transparency.

**Explicitly out of scope (roadmap only):**
- Video analysis — shown as an architecture/roadmap slide, not built live.
- Multi-brand enterprise account management, billing, SSO.
- Fine-tuned/custom classifiers — v1 uses embeddings + LLM-as-judge, no model training required.

## 10. Technical Approach (Summary)

- Multi-agent pipeline: Ingestion → Fingerprint → Scoring → Critic → Suggestion agents, orchestrated end-to-end.
- Embeddings: sentence-transformers (all-MiniLM-L6-v2) for text; CLIP for image.
- LLM reasoning layer: Claude API for extraction, critique and rewrite generation.
- Vector store: FAISS / ChromaDB, in-process.
- Backend: Python FastAPI. Frontend: React + Tailwind + Recharts.
- Deployment: Vercel (frontend) + Railway (backend); AWS ECS Fargate + Terraform documented as the production path.

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Newbie team member blocked on complex backend work | Owns frontend dashboard / quadrant visualization + demo narrative, a scoped and achievable track |
| Video modality eats build time | Explicitly scoped out of the live build; shown as a roadmap slide only |
| Embedding similarity alone feels shallow to judges | Critic Agent adds qualitative, explainable reasoning on top of the raw score |
| Live demo API/latency failures | Pre-computed fallback examples cached for each quadrant zone before presenting |

## 12. Review Checkpoints

| Checkpoint | Deliverable |
|---|---|
| Review 1 — Day 1, early | Ingestion pipeline + Brand Identity Card extraction demoable; basic single-content scoring live |
| Review 2 — Day 1, night | Full two-axis scoring engine, Critic Agent, rewrite suggestions; end-to-end text pipeline working |
| Review 3 / Finals — Day 2 | Image modality added, Drift Dashboard with sample data, Agent Trace UI polished, pitch deck with video as roadmap slide |

## 13. Closing Note

Muthirai's pitch in one line: every brand has a seal — a way of speaking and looking that's unmistakably theirs. AI content generation, left unchecked, quietly wears that seal down into something generic. Muthirai is the system that checks whether the seal is still there, explains exactly where it's fading, and hands back content that carries it again.
