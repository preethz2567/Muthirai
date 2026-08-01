# MUTHIRAI — Backend Schema Document
v1.0, Hackathon Build — companion to the TRD

---

## 1. Purpose & Storage Strategy

Relational schema backing Muthirai, plus how it hands off to the vector store. Persistence uses SQLite locally / lightweight Postgres on Railway for structured data, and FAISS or ChromaDB in-process for embeddings — linked by a thin embeddings metadata table so the relational side never stores raw vectors.

> **Design principle:** Keep vectors out of the relational database entirely. Postgres/SQLite stores facts and relationships; FAISS/Chroma stores math. The embeddings table is just the bridge — an id and a reference, nothing heavier.

## 2. Entity-Relationship Overview

A brand has one identity card and many content items. Each content item has exactly one score result, which in turn has many flagged phrases and one suggested rewrite. Every content item also generates a chain of agent trace steps for demo transparency. Embeddings metadata references brands (centroid), content items, and the shared generic corpus.

## 3. Table Definitions

### TABLE: brands (one row per brand profile)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| name | TEXT | NOT NULL | Brand display name |
| source_urls | JSON | NULLABLE | URLs used for identity extraction |
| created_at | TIMESTAMP | NOT NULL, default now() | Row creation time |
| updated_at | TIMESTAMP | NOT NULL, default now() | Last modification time |

### TABLE: brand_identity_cards (1:1 with brands)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| brand_id | UUID | FK → brands.id, UNIQUE | Owning brand |
| tone_words | JSON (array) | NOT NULL, default [] | e.g. ["confident", "warm", "precise"] |
| vocabulary | JSON (array) | NOT NULL, default [] | Signature phrases the brand actually uses |
| banned_generic_phrases | JSON (array) | NOT NULL, default [] | Phrases flagged as generic for this brand |
| core_values | JSON (array) | NOT NULL, default [] | Brand's stated values |
| visual_tokens | JSON (object) | NULLABLE | { primary_colors: [], style_descriptors: [] } |
| created_at | TIMESTAMP | NOT NULL, default now() | Row creation time |
| updated_at | TIMESTAMP | NOT NULL, default now() | Last edit time (user or agent) |

### TABLE: content_items (one row per piece of content submitted for scoring)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| brand_id | UUID | FK → brands.id | Owning brand |
| modality | ENUM('text','image') | NOT NULL | Content type submitted |
| raw_content | TEXT | NOT NULL | Raw text, or storage URL/key for images |
| submitted_at | TIMESTAMP | NOT NULL, default now() | Submission time |

### TABLE: score_results (1:1 with content_items)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| content_id | UUID | FK → content_items.id, UNIQUE | Scored content item |
| consistency_score | FLOAT | NOT NULL, range 0–1 | Similarity to brand centroid |
| distinctiveness_score | FLOAT | NOT NULL, range 0–1 | 1 − similarity to generic centroid |
| quadrant | ENUM('on_brand','safe_generic','bold_off_brand','off_brand') | NOT NULL | Derived quadrant classification |
| scored_at | TIMESTAMP | NOT NULL, default now() | Scoring completion time |

### TABLE: flagged_phrases (N:1 into score_results)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| score_result_id | UUID | FK → score_results.id | Owning score result |
| phrase | TEXT | NOT NULL | The specific flagged span |
| reason | TEXT | NOT NULL | Critic Agent's explanation for the flag |

### TABLE: suggested_rewrites (1:1 with score_results)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| score_result_id | UUID | FK → score_results.id, UNIQUE | Owning score result |
| rewrite_text | TEXT | NOT NULL | Suggestion Agent's rewritten content |
| applied | BOOLEAN | NOT NULL, default false | Whether user copied/applied the rewrite |

### TABLE: agent_trace_steps (N:1 into content_items)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| content_id | UUID | FK → content_items.id | Related content item |
| agent_name | ENUM('ingestion','embedding','scoring','critic','suggestion') | NOT NULL | Which pipeline stage |
| input_snippet | TEXT | NULLABLE | Truncated input shown in the trace UI |
| output_snippet | TEXT | NULLABLE | Truncated output shown in the trace UI |
| status | ENUM('pending','running','done','error') | NOT NULL, default 'pending' | Step status |
| started_at | TIMESTAMP | NULLABLE | Step start time |
| completed_at | TIMESTAMP | NULLABLE | Step completion time |

### TABLE: generic_corpus_items (shared reference corpus, not brand-owned)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| category | TEXT | NOT NULL | e.g. 'saas', 'fashion', 'fmcg' — scopes the generic centroid |
| source | TEXT | NULLABLE | Where the example came from |
| content_text | TEXT | NOT NULL | Raw generic/competitor content |
| created_at | TIMESTAMP | NOT NULL, default now() | Row creation time |

### TABLE: embeddings (metadata bridge to the vector store — no raw vectors stored here)
| Column | Type | Constraints | Description |
|---|---|---|---|
| id | UUID | PK | Primary identifier |
| owner_type | ENUM('brand_centroid','generic_centroid','content') | NOT NULL | What this embedding represents |
| owner_id | UUID | NOT NULL | brands.id, category key, or content_items.id depending on owner_type |
| vector_ref | TEXT | NOT NULL | Key/index position in FAISS or Chroma |
| model_name | TEXT | NOT NULL | e.g. 'all-MiniLM-L6-v2', 'clip-vit-b32' |
| dimension | INTEGER | NOT NULL | Vector dimensionality |
| created_at | TIMESTAMP | NOT NULL, default now() | Row creation time |

## 4. Relationships Summary

| Relationship | Cardinality |
|---|---|
| brands → brand_identity_cards | 1 : 1 |
| brands → content_items | 1 : N |
| content_items → score_results | 1 : 1 |
| score_results → flagged_phrases | 1 : N |
| score_results → suggested_rewrites | 1 : 1 |
| content_items → agent_trace_steps | 1 : N |
| brands / content_items / generic_corpus_items → embeddings | 1 : N (polymorphic via owner_type) |

## 5. Indexes

- `content_items(brand_id)` — drives the Brand Dashboard's recent-scores list and Drift Dashboard history.
- `score_results(content_id)` — unique index, enforces the 1:1 relationship.
- `score_results(quadrant)` — supports the Drift Dashboard's quadrant filter.
- `embeddings(owner_type, owner_id)` — composite index for fast centroid lookups during scoring.
- `agent_trace_steps(content_id)` — drives the Agent Trace panel's ordered step list.

## 6. Sample Queries

**Drift history for a brand (Screen 07):**
```sql
SELECT sr.scored_at, sr.consistency_score, sr.distinctiveness_score, sr.quadrant
FROM score_results sr
JOIN content_items ci ON ci.id = sr.content_id
WHERE ci.brand_id = :brand_id
ORDER BY sr.scored_at ASC;
```

**Full result bundle for the Results screen (Screen 06):**
```sql
SELECT sr.*,
       json_agg(DISTINCT fp.*) AS flagged_phrases,
       rw.rewrite_text
FROM score_results sr
LEFT JOIN flagged_phrases fp ON fp.score_result_id = sr.id
LEFT JOIN suggested_rewrites rw ON rw.score_result_id = sr.id
WHERE sr.content_id = :content_id
GROUP BY sr.id, rw.rewrite_text;
```

**Ordered agent trace for a content item (Screen 06a):**
```sql
SELECT agent_name, input_snippet, output_snippet, status, started_at, completed_at
FROM agent_trace_steps
WHERE content_id = :content_id
ORDER BY started_at ASC;
```

## 7. Migration & Versioning Notes

- Use a lightweight migration tool (Alembic for Postgres, or plain versioned SQL files for SQLite) from the first commit.
- `brand_identity_cards` is intentionally editable in place (no versioning table) for v1 — keeps the Identity Card Review screen simple.
- `generic_corpus_items` is seeded once via a setup script before Day 1 scoring work begins, not created through the API.

## 8. Environment Notes

| Environment | Relational store | Vector store |
|---|---|---|
| Local dev | SQLite file | FAISS, in-process, index file on disk |
| Railway (hackathon deploy) | Railway Postgres add-on (or SQLite volume if time-constrained) | FAISS/Chroma in-process within the same backend service |
| AWS (production roadmap) | RDS Postgres | Chroma or a managed vector DB, decoupled service |

## 9. Microservices Note (current architecture)

The system runs as 3 dockerized services (see Implementation Plan): `frontend`, `services/api`, `services/agent-worker`. **Only `services/api` owns a database connection.** `services/agent-worker` is stateless — it receives content/context over HTTP from `api` and returns results, but never reads or writes this schema directly. All tables above live inside `services/api`.
