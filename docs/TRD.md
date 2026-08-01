# MUTHIRAI — Technical Requirements Document
v1.0, Hackathon Build — companion to the PRD

---

## 1. Purpose & Scope

Defines the technical architecture, data models, APIs, and deployment plan for Muthirai's 2-day hackathon build. Scope: full text pipeline, basic image modality, drift dashboard, agent trace UI. Video analysis and enterprise account management are explicitly out of scope (see PRD §9).

## 2. System Architecture

Two inputs feed the system: brand assets (used once per brand to build the fingerprint) and new content (scored on demand, potentially many times per brand). Both converge at the embedding layer, which writes to a shared vector store holding the brand centroid and the generic/category centroid. The Scoring Engine reads both centroids to compute the two-axis result, then fans out to the Critic Agent (explanation) and Suggestion Agent (rewrite), while logging every score to the Drift Dashboard.

**Pipeline:** `Brand Assets / New Content → Ingestion Agent / Embedding Layer → Vector Store → Two-Axis Scoring Engine → Critic Agent + Suggestion Agent → Drift Dashboard`

### 2.1 Component Responsibilities

| Component | Responsibility |
|---|---|
| Ingestion Agent | LLM call that reads brand website/content and outputs a structured Brand Identity Card (JSON). |
| Embedding Layer | Converts text/image into vectors. Text: all-MiniLM-L6-v2. Image: CLIP ViT-B/32. |
| Vector Store | Holds brand centroid vector, generic centroid vector, and raw content embeddings for the drift history. |
| Scoring Engine | Pure computation: cosine similarity math to produce Consistency and Distinctiveness scores + quadrant label. |
| Critic Agent | LLM call that takes the score + content and names specific generic phrases / drift points. |
| Suggestion Agent | LLM call with RAG context (brand's own past phrasing) that rewrites flagged spans. |
| Drift Dashboard API | Stores and serves score history per brand for the trend chart. |

## 3. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend | Python 3.11, FastAPI | Async endpoints |
| LLM | Claude API (Sonnet) | Ingestion, Critic, and Suggestion agents |
| Text embeddings | sentence-transformers, all-MiniLM-L6-v2 | Local, free, no API key needed |
| Image embeddings | CLIP ViT-B/32 (open_clip or transformers) | Stretch scope |
| Vector store | FAISS (in-process) or ChromaDB | No external DB service needed |
| Persistence | SQLite or lightweight Postgres (Railway addon) | Brand profiles + score history |
| Frontend | React + Vite, Tailwind, Recharts | Recharts for quadrant scatter + drift line chart |
| Deployment | Vercel (frontend) + Railway (backend) | See §7 |
| Auth (if needed) | Simple API key / session | Full auth system out of scope |

## 4. Data Models

### 4.1 Brand Identity Card
Output of the Ingestion Agent. Stored once per brand, editable by the user.

```json
{
  "brand_id": "uuid",
  "brand_name": "string",
  "tone_words": ["confident", "warm", "precise"],
  "vocabulary": ["signature phrases the brand actually uses"],
  "banned_generic_phrases": ["cutting-edge", "seamless experience"],
  "core_values": ["string", "string"],
  "visual_tokens": {
    "primary_colors": ["#HEX", "#HEX"],
    "style_descriptors": ["minimal", "high-contrast"]
  },
  "source_urls": ["https://..."],
  "created_at": "ISO-8601"
}
```

### 4.2 Content Score Result
Output of the Scoring Engine + Critic Agent + Suggestion Agent, returned per scored content item.

```json
{
  "content_id": "uuid",
  "brand_id": "uuid",
  "modality": "text | image",
  "consistency_score": 0.0,
  "distinctiveness_score": 0.0,
  "quadrant": "on_brand | safe_generic | bold_off_brand | off_brand",
  "flagged_phrases": [
    { "phrase": "cutting-edge", "reason": "used by 70% of category content" }
  ],
  "suggested_rewrite": "string",
  "scored_at": "ISO-8601"
}
```

## 5. API Endpoints

| Method & Path | Purpose |
|---|---|
| POST /brands | Create a brand profile from a URL or uploaded content → triggers Ingestion Agent |
| GET /brands/{id} | Retrieve the Brand Identity Card |
| PATCH /brands/{id} | Edit the Brand Identity Card manually |
| POST /brands/{id}/score | Submit new content (text/image) for scoring → runs full pipeline |
| GET /brands/{id}/history | Retrieve score history for the Drift Dashboard |
| GET /brands/{id}/trace/{content_id} | Retrieve the agent reasoning trace for a specific scored item |

## 6. Scoring Logic

No custom model training is required for v1 — this keeps the build achievable in 2 days while still being technically defensible.

1. Embed the brand's historical content → average into a single brand centroid vector.
2. Embed a small curated generic/competitor corpus → average into a generic centroid vector.
3. Embed the new content item.
4. Consistency = cosine_similarity(content_vector, brand_centroid).
5. Distinctiveness = 1 − cosine_similarity(content_vector, generic_centroid).
6. Classify into one of four quadrants using a threshold (e.g. 0.5) on each axis.
7. Critic Agent receives both scores plus the raw content and produces named, specific reasons — this is what makes the score explainable rather than a black-box number.

> **Why this is stronger than it sounds:** No fine-tuned classifier is needed to make this credible — the Critic Agent's qualitative LLM reasoning on top of the embedding math is what makes the score explainable and defensible in front of judges, not the raw cosine similarity alone.

## 7. Deployment Architecture

### 7.1 Hackathon build: Vercel + Railway
Chosen deliberately for demo reliability under a 2-day constraint with a newbie team member — push-to-deploy, near-zero config.
- Frontend → Vercel, auto-deployed from GitHub on push to main.
- Backend (FastAPI + agent pipeline) → Railway, auto-deployed from GitHub.
- Vector store runs in-process inside the Railway backend service — no separate DB service needed.
- Environment secrets stored in Railway/Vercel project settings, never committed.

### 7.2 Production roadmap: AWS
Documented for the pitch and future scaling, not built during the hackathon:
- Backend → AWS ECS Fargate, containerized, provisioned via Terraform.
- Frontend → S3 + CloudFront or Amplify Hosting.
- Persistence → RDS Postgres.
- Identity card + embedding artifacts → S3.
- Infra state → Terraform remote state in S3.

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Scoring latency | Under 10 seconds end-to-end per content item |
| Identity card extraction | Under 60 seconds from URL submission |
| Demo resilience | Cached fallback results for at least one example per quadrant |
| Secrets handling | No credentials committed to git; .env used locally, platform secrets in Vercel/Railway |

## 9. Repository Structure

```
muthirai/
├─ backend/
│  ├─ app/
│  │  ├─ agents/          # ingestion, critic, suggestion agent modules
│  │  ├─ scoring/         # embedding + cosine similarity + quadrant logic
│  │  ├─ routes/          # FastAPI routers per resource
│  │  └─ models/          # pydantic schemas
│  ├─ requirements.txt
│  └─ Dockerfile
├─ frontend/
│  ├─ src/
│  │  ├─ pages/           # BrandSetup, ScoreContent, Dashboard
│  │  ├─ components/      # QuadrantChart, AgentTrace, DriftChart
│  │  └─ lib/api.ts
│  └─ package.json
└─ README.md
```

> **Note:** This repo layout was later restructured into a 3-container microservice layout (`frontend`, `services/api`, `services/agent-worker`) — see Implementation Plan / build chat for the current authoritative structure. `agents/` and `scoring/` now live inside `services/agent-worker`; `routes/` and `models/` live inside `services/api`.

## 10. Build Plan — Task Ownership (3-person team)

| Owner | Track | Key deliverables |
|---|---|---|
| Backend lead | Agent pipeline + scoring | Ingestion, Critic, Suggestion agents; embedding + scoring engine; API routes |
| Full-stack / DevOps | Infra + integration | Vector store wiring, Vercel/Railway deploy, API↔frontend integration, image modality |
| Newbie teammate | Frontend + demo | Quadrant chart, Drift dashboard UI, Agent Trace panel, pitch deck / demo narrative |

## 11. Open Technical Risks

| Risk | Mitigation |
|---|---|
| Generic corpus too small → noisy centroid | Curate at least 15–20 category examples per vertical before Day 1 scoring work starts |
| LLM latency stacking across 3 agent calls | Run Critic and Suggestion agents in parallel, not sequential, once scoring completes |
| Image modality slips into Day 2 evening | Treated as a stretch goal; text pipeline alone is a complete, demoable product |
