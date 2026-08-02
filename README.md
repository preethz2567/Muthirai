# ⌘ Muthirai
> **முத்திரை** • */mu-thi-rai/*  
> *noun* : A seal, signet, or cryptographic mark of authenticity.

Muthirai is an enterprise-grade brand identity enforcement and drift analytics platform. In an era where AI-generated content can dilute brand voice, Muthirai acts as a cryptographic seal of authenticity ensuring that every piece of outbound content adheres to your established brand identity while maintaining distinctiveness against generic industry baselines.



## ⌘ Architecture & Technical Stack

Muthirai is built on a decoupled microservices architecture designed for both local development and scalable cloud deployment.

### 1. Frontend Client
- **Framework:** React + TypeScript (Vite)
- **Styling:** Custom CSS (Premium Notary/Ledger aesthetic)
- **Data Visualization:** Recharts (Drift Analytics & Trajectory Compass)
- **State Management:** React Router DOM, contextual local storage

### 2. Core API Service (`services/api`)
- **Runtime:** Python 3.11, FastAPI
- **Database:** SQLite (via SQLAlchemy & Alembic Migrations)
- **Purpose:** Owns the primary business logic, database state, and routing. Exposes REST endpoints to the frontend and delegates heavy machine-learning workloads to the Agent Worker.

### 3. Agent Worker (`services/agent-worker`)
- **Runtime:** Python 3.11, FastAPI
- **Machine Learning:** PyTorch, `sentence-transformers` (`all-MiniLM-L6-v2`), `clip-vit-base-patch32` (image embeddings)
- **Vector Storage:** FAISS (In-memory/Disk inner-product index for centroid calculation)
- **LLM Integration:** Anthropic Claude (via native API) / OpenRouter (fallback)
- **Purpose:** Stateless worker service that runs the scoring engine, semantic embedding extraction, and multi-agent systems (Ingestion Agent, Critic Agent, Suggestion Agent, Trajectory Agent).



## ⎈ Core Features

- **Automated Brand Ingestion:** Supply raw text or URLs; the Ingestion Agent extracts a structured *Brand Identity Card* encompassing tone words, signature vocabulary, core values, and visual tokens.
- **Bivariate Content Scoring:** New content is embedded and measured against two axes:
  - `Consistency`: Cosine similarity to the brand's established centroid.
  - `Distinctiveness`: Inverse distance to a composite "generic industry" centroid.
- **Quadrant Classification:** Content is automatically classified into *On Brand*, *Safe Generic*, *Bold Off Brand*, or *Off Brand*.
- **Agentic Critique & Auto-Rewrite:** If content drifts, the Critic Agent flags specific offending phrases, and the Suggestion Agent generates an on-brand rewrite.
- **Drift Analytics:** A chronological dashboard tracking the brand's consistency and distinctiveness health over time.
- **Trajectory Compass:** An interactive chat interface to purposefully evolve the brand's baseline (e.g., "Make us sound more approachable") without breaking historical continuity.
- **Multi-Modal Support:** Full support for both textual copy and visual image validation.



## ⌗ API Endpoints Reference

### Public API (`services/api`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/brands` | List all tracked brands. |
| `POST` | `/brands` | Ingest raw text and generate a new Brand Identity Card. |
| `GET` | `/brands/{id}` | Retrieve a specific brand and its current Identity Card. |
| `PATCH` | `/brands/{id}` | Update an existing Brand Identity Card (manual overrides). |
| `POST` | `/brands/{id}/score` | Validate new content (text or image) against the brand. Returns quadrant mapping, flags, and suggested rewrites. |
| `GET` | `/brands/{id}/history` | Retrieve chronological scoring history for Drift Analytics. |
| `GET` | `/brands/{id}/trace/{c_id}` | Retrieve internal agent execution traces for a specific validation. |
| `POST` | `/brands/{id}/trajectory/chat` | Chat with the Trajectory Agent to propose an evolution to the brand's identity. |
| `POST` | `/brands/{id}/trajectory/confirm` | Apply a proposed trajectory update, calculating a weighted centroid blend. |
| `POST` | `/brands/{id}/reference-images` | Upload image assets to establish the brand's visual centroid. |

### Internal Worker (`services/agent-worker`)
*(Accessed exclusively by the API service)*
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/internal/ingest` | Executes the Ingestion LLM pipeline on raw source text. |
| `POST` | `/internal/score` | Calculates FAISS distances and triggers the Critic & Suggestion LLMs. |
| `POST` | `/internal/embed` | Generates text embeddings and commits them to FAISS. |
| `POST` | `/internal/embed-image-centroid` | Generates CLIP embeddings for visual assets. |
| `POST` | `/internal/trajectory/chat` | Processes trajectory evolution requests. |



## ⚙️ Local Setup & Deployment

### Prerequisites
- Python 3.11+
- Node.js 18+
- Anthropic API Key (or OpenRouter API Key)

### 1. Agent Worker Setup
```bash
cd services/agent-worker
python -m venv .venv
source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt

# Create .env file with ANTHROPIC_API_KEY
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### 2. Core API Setup
```bash
cd services/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### ☁️ Cloud Deployment (Render Blueprint)
A `render.yaml` blueprint is included for 1-click deployment to Render on the Free Tier.
1. Connect your GitHub repository to Render.
2. Select **New** > **Blueprint**.
3. Supply your `ANTHROPIC_API_KEY` and preferred `LLM_MODEL` when prompted.
4. Render will automatically provision the SQLite API, the ML-powered Agent Worker, and the Static Site frontend.


*Muthirai — The Cryptographic Seal of Brand Authenticity.*
