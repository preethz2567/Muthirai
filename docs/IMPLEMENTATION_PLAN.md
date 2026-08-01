# MUTHIRAI — Implementation Plan
v1.0, 2-Day Hackathon Build

---

## 1. Build Philosophy

Three people, one new to this stack, building in 2 days with AI coding assistance (Antigravity / Claude Code). The biggest risk isn't any individual feature — it's three people editing overlapping code and losing hours to merge conflicts.

> **The core rule:** Lock the contracts first (schema + API shape), then let all three people build against those contracts in parallel, in separate files/folders, integrating at scheduled sync points — never continuously.

## 2. Architecture Note (current)

The build uses a **3-container microservice layout**, not a monolith:
- `frontend/` — React app
- `services/api/` — FastAPI, owns the database, public-facing routes
- `services/agent-worker/` — FastAPI, stateless, runs embedding + agent logic, called by `api` over HTTP inside docker-compose

This gives a real, defensible "microservices" story for the pitch (independently dockerized, separable, individually deployable) without the operational risk of full distributed systems (no message broker, no service mesh, no multiple databases) — appropriate for a 2-day build with a newbie teammate.

## 3. Whole-App Build Order

1. Data contracts locked: DB schema (Backend Schema doc) + API endpoint shapes (TRD §5) agreed by all three before anyone writes feature code.
2. Skeletons stood up in parallel: 3 empty dockerized services with stub routes returning fixture data; React app with routing and empty screens; docker-compose brings all three up together.
3. Core text pipeline built: Ingestion → Embedding → Scoring → Critic → Suggestion, wired to real routes inside `agent-worker`, called by `api`, replacing fixtures one endpoint at a time.
4. Frontend wired to real data: mocked responses swapped for live API calls, screen by screen, starting with Brand Setup.
5. Image modality layered in: added to the already-working text pipeline.
6. Drift dashboard + agent trace: both read from data the pipeline is already producing, so they're additive, not blocking.
7. Polish, seed demo data, rehearse: last block on Day 2, no new features.

## 4. Timeline (Whole Team)

Five sync checkpoints across 24 working hours.

| Checkpoint | Hour | What must be true by then |
|---|---|---|
| Sync 1 (Review 1) | H4 | Schema + contracts locked; 3 services deployed together via docker-compose; Ingestion Agent producing a real (or placeholder) Identity Card |
| Sync 2 (Review 2 / EOD1) | H8 | Full text scoring pipeline working end-to-end across services; frontend showing real (not mocked) scores |
| Sync 3 | H12 | Image modality functional; Drift Dashboard reading real history |
| Sync 4 (feature freeze) | H16 | No new features after this point — only bug fixes and polish |
| Sync 5 (final build lock) | H20 | App frozen, deployed, demo data seeded, only rehearsal left |

## 5. Per-Person Plan

### Person A — Backend / Agent Pipeline lead
Owns everything inside `services/agent-worker/app/agents/` and `services/agent-worker/app/scoring/`.

| Hours | Task | Output / deliverable | Depends on |
|---|---|---|---|
| 0–1 | Kickoff: agree schema + API contracts | Signed-off data model | Backend Schema doc |
| 1–4 | Build Ingestion Agent + Brand Identity Card extraction (placeholder logic until Claude API key available) | `/internal/ingest` returns a real card | Schema lock |
| 4–8 | Build Embedding layer + Two-Axis Scoring Engine | `/internal/score` returns real scores | Ingestion Agent |
| 8–12 | Build Critic Agent + Suggestion Agent | Score response includes flagged phrases + rewrite | Scoring engine |
| 12–16 | Add image modality (CLIP embeddings) | Image content scoreable end-to-end | Text pipeline stable |
| 16–19 | Agent trace logging + response polish | Trace steps returned correctly | All agents working |
| 19–22 | Bug fixes + cached fallback responses | Demo-safe fallback data in place | Feature freeze (Sync 4) |
| 22–24 | Demo rehearsal | Comfortable narrating the pipeline live | – |

### Person B — Full-stack / Infra / Integration
Owns `services/api/app/routes/`, deployment config (docker-compose, Railway, Vercel), and `frontend/src/lib/api.ts`.

| Hours | Task | Output / deliverable | Depends on |
|---|---|---|---|
| 0–1 | Repo init, docker-compose skeleton, branch protection, CI, secrets | 3 services deploy empty, `docker-compose up` works | – |
| 1–4 | Scaffold DB schema in `api`; stub routes in `agent-worker` returning fixtures | All endpoints exist, contract-matching fake data | Schema lock |
| 4–8 | Wire `api` → `agent-worker` HTTP calls; deploy both to Railway | Real service-to-service calls persist to DB | Person A's ingest/score endpoints |
| 8–12 | Replace frontend mocks with real API calls, screen by screen | Brand Setup → Results flow working live | Person A + Person C's screens |
| 12–16 | Build Drift Dashboard API (history queries) + deploy frontend to Vercel | `/history` returns real data, full app live on a URL | Score results accumulating |
| 16–19 | End-to-end testing across all 3 services | Full user journey works without errors | Feature freeze (Sync 4) |
| 19–22 | Bug fixes + seed realistic demo data | 3–4 clean demo-ready examples across all quadrants | – |
| 22–24 | Demo rehearsal | Comfortable handling live technical Q&A | – |

### Person C — Frontend / Demo (newbie-friendly track)
Owns `frontend/src/pages/` and `frontend/src/components/`. Fully scoped UI work that starts immediately against mocked data and never blocks on anyone else.

| Hours | Task | Output / deliverable | Depends on |
|---|---|---|---|
| 0–1 | Review API contract; scaffold routing + empty screens | App shell with all 7 screens navigable | API contract |
| 1–4 | Build Brand Setup + Identity Card Review screens against mock data | Editable card UI, fully clickable with fake data | Mocked API shape |
| 4–8 | Build Score Content + Results screens + Quadrant chart (Recharts) | Quadrant visually renders a mock scored point | Mocked API shape |
| 8–12 | Build Agent Trace panel UI | Expandable step list renders mock trace data | Mocked API shape |
| 12–16 | Build Drift Dashboard UI + image upload component | Trend chart + upload dropzone functional | Mocked API shape |
| 16–19 | Visual polish pass + start pitch deck | Consistent styling across all screens; deck skeleton | Feature freeze (Sync 4) |
| 19–22 | Finalize demo script + slides | Full narrated walkthrough script ready | App Flow doc §6 |
| 22–24 | Demo rehearsal | Comfortable presenting the product story | – |

## 6. Interdependency Map

| This... | ...blocks | So it must land by |
|---|---|---|
| DB schema + API contract | Everyone's real feature work | End of Hour 1, non-negotiable |
| Person A's Ingestion Agent | Person B's real Brand Setup wiring | Hour 4 (Sync 1) |
| Person A's Scoring Engine | Person B's Results wiring + Person C's live Quadrant chart | Hour 8 (Sync 2) |
| Person C's screen scaffolding | Person B having anything to wire real data into | Hour 4 (Sync 1) |
| Text pipeline being stable | Image modality work starting | Hour 12 (Sync 3) |

Everything else — UI polish, agent trace logging, dashboard queries — has no hard dependency on a teammate and can be built any time in its assigned block.

## 7. Git Workflow

### 7.1 Branching model
- `main` is protected — no direct pushes, only merges via PR, and `main` must always be deployable.
- One short-lived branch per task, named by owner + scope: `feat/a-ingestion-agent`, `feat/b-api-routes`, `feat/c-results-screen`.
- Branches live a few hours at most — open a PR as soon as a task deliverable is done.

### 7.2 File ownership (the actual conflict-prevention mechanism)
| Path | Owner | Others touch it only if… |
|---|---|---|
| `services/agent-worker/app/agents/**` | Person A | Announced first — rare |
| `services/agent-worker/app/scoring/**` | Person A | Announced first — rare |
| `services/api/app/routes/**` | Person B | Person A adds a new internal endpoint, then hands off |
| `frontend/src/pages/**`, `components/**` | Person C | Person B only touches `lib/api.ts` |
| `frontend/src/lib/api.ts` | Person B | Shared contract file — small, isolated commits only |
| Schema / migration files | Person B | Frozen after Hour 1 — changes need a verbal heads-up to all three first |
| `docker-compose.yml`, Dockerfiles | Person B | Announced first |

> **Why this works:** Merge conflicts happen when two people edit the same file. If each person's tasks keep them in their own folder/service, there's structurally almost nothing to conflict on.

### 7.3 When to commit
- Commit every 30–60 minutes, at any point the code runs — small, working, atomic commits.
- Never end a work session with uncommitted local changes. Commit and push before stepping away, even with a WIP commit if needed.
- Push to the remote branch at least once per hour, and always immediately before a sync checkpoint.

### 7.4 When to merge
- Open a PR the moment a task deliverable is actually true, not at a fixed time.
- Rebase onto latest `main` before opening the PR.
- At each of the 5 sync checkpoints, merge open PRs in dependency order: Person A's agent/scoring PRs first, then Person B's integration PRs, then Person C's UI PRs.
- A merged PR that breaks the deployed app is reverted immediately, not debugged live on `main`.

### Suggested commit message format
```
feat(agent): ingestion agent extracts tone_words + vocabulary
feat(api): add POST /brands/{id}/score stub returning fixture
feat(ui): quadrant chart renders mock scored point
fix(scoring): cosine similarity direction was inverted
chore(schema): add generic_corpus_items table
```

## 8. Risk & Fallback

| If this happens… | …do this |
|---|---|
| Person A falls behind on an agent by a sync checkpoint | Person B wires the frontend to a cached/mocked version of that agent's output so downstream work isn't blocked; real integration lands at the next sync |
| A merge conflict does happen | Whoever opened the PR second resolves it locally against latest `main` before re-requesting merge — never resolve conflicts by editing directly on GitHub's web UI under time pressure |
| Image modality isn't ready by Sync 3 | Cut it per PRD §9 — it was always scoped as a stretch goal, ship text-only and show image as a roadmap slide |
| Deployed app breaks close to Sync 5 | Roll back to the last known-good tag immediately; debug on a branch, never on `main` this close to submission |
